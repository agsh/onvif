/**
 * Unit coverage for utils edge branches (errors, SOAP action/faults, digest, dates).
 * @jest-environment node
 */

import {
  OnvifError,
  OnvifSoapFaultError,
  OnvifTransportError,
  assignErrorContext,
  coerceAppInfoList,
  coerceCertificateInformation,
  coerceCredentialEntityList,
  coerceNotificationMessages,
  parseSOAPString,
  soapActionFromBody,
  soapActionFromXml,
} from '../src/utils';
import {
  digestAuth,
  digestHashName,
  parseChallenge,
  preferredDigestChallenge,
} from '../src/utils/auth';
import { toError } from '../src/utils/errors';

describe('assignErrorContext / toError / OnvifTransportError', () => {
  it('leaves non-Errors unchanged and fills missing host/service/action', () => {
    expect(assignErrorContext('raw', { host: 'h' })).toBe('raw');
    const err = new Error('x') as Error & { host?: string; service?: string; action?: string };
    err.host = 'keep';
    assignErrorContext(err, { host: 'h2', service: 'media', action: 'Act' });
    expect(err.host).toBe('keep');
    expect(err.service).toBe('media');
    expect(err.action).toBe('Act');

    const bare = new Error('y') as Error & { host?: string; service?: string; action?: string };
    assignErrorContext(bare, {});
    expect(bare.host).toBeUndefined();
    expect(bare.service).toBeUndefined();
    expect(bare.action).toBeUndefined();
  });

  it('toError wraps non-Errors and passes Error through', () => {
    expect(toError(new Error('e'))).toMatchObject({ message: 'e' });
    expect(toError(42)).toMatchObject({ message: '42' });
  });

  it('OnvifTransportError reads code from options or cause', () => {
    expect(new OnvifTransportError('a', { code: 'ECONNRESET' }).code).toBe('ECONNRESET');
    expect(new OnvifTransportError('b', { cause: { code: 'ENOTFOUND' } }).code).toBe('ENOTFOUND');
    expect(new OnvifTransportError('c', { cause: { code: undefined } }).code).toBeUndefined();
    expect(new OnvifTransportError('d', { cause: 'nope' }).code).toBeUndefined();
  });

  it('OnvifError constructor accepts cause and copies optional fields', () => {
    const err = new OnvifError('m', {
      xml: '<x/>',
      statusCode: 500,
      cause: new Error('root'),
      host: 'cam',
      service: 'device',
      action: 'Get',
    });
    expect(err).toMatchObject({
      xml: '<x/>',
      statusCode: 500,
      host: 'cam',
      service: 'device',
      action: 'Get',
    });
    expect(err.cause).toBeInstanceOf(Error);
  });
});

describe('parseSOAPString fault edge shapes', () => {
  it('rejects empty / whitespace-only / nullish bodies', async () => {
    await expect(parseSOAPString('')).rejects.toMatchObject({ name: 'OnvifResponseError' });
    await expect(parseSOAPString('   ')).rejects.toMatchObject({ name: 'OnvifResponseError' });
    await expect(parseSOAPString(undefined as unknown as string)).rejects.toMatchObject({
      name: 'OnvifResponseError',
      xml: '',
    });
  });

  it('reads numeric Detail, multi Text Reason arrays, and object Code Value', async () => {
    const withDetailNumber =
      '<?xml version="1.0"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
      '<s:Body><s:Fault>' +
      '<s:Code><s:Value>s:Receiver</s:Value></s:Code>' +
      '<s:Detail>99</s:Detail>' +
      '</s:Fault></s:Body></s:Envelope>';
    await expect(parseSOAPString(withDetailNumber)).rejects.toMatchObject({
      name: 'OnvifSoapFaultError',
      faultCode: 's:Receiver',
      faultDetail: '99',
    });

    const withTextArray =
      '<?xml version="1.0"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
      '<s:Body><s:Fault>' +
      '<s:Code><s:Value><wrap/></s:Value></s:Code>' +
      '<s:Reason><s:Text>first</s:Text><s:Text>second</s:Text></s:Reason>' +
      '</s:Fault></s:Body></s:Envelope>';
    await expect(parseSOAPString(withTextArray)).rejects.toMatchObject({
      name: 'OnvifSoapFaultError',
      faultReason: 'first',
    });
  });

  it('falls back to faultCode when Reason/Detail are empty', async () => {
    const xml =
      '<?xml version="1.0"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:ter="http://www.onvif.org/ver10/error">' +
      '<s:Body><s:Fault>' +
      '<s:Code><s:Value>s:Sender</s:Value></s:Code>' +
      '<s:Detail><ter:NotAuthorized/><ter:Empty/></s:Detail>' +
      '</s:Fault></s:Body></s:Envelope>';
    const err = await parseSOAPString(xml).then(
      () => undefined,
      (e) => e,
    );
    expect(err).toBeInstanceOf(OnvifSoapFaultError);
    expect(err.message).toContain('s:Sender');
  });

  it('uses unknown when fault has no code/reason/detail text', async () => {
    const xml =
      '<?xml version="1.0"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
      '<s:Body><s:Fault><s:Code/></s:Fault></s:Body></s:Envelope>';
    await expect(parseSOAPString(xml)).rejects.toMatchObject({
      message: 'ONVIF SOAP Fault: unknown',
    });
  });

  it('soapFaultText skips empty array entries before a usable value', async () => {
    const xml =
      '<?xml version="1.0"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
      '<s:Body><s:Fault>' +
      '<s:Code><s:Value>s:Receiver</s:Value></s:Code>' +
      '<s:Reason><s:Text></s:Text><s:Text>later</s:Text></s:Reason>' +
      '</s:Fault></s:Body></s:Envelope>';
    await expect(parseSOAPString(xml)).rejects.toMatchObject({ faultReason: 'later' });
  });

  it('accepts SOAP 1.1 detail child objects for subcodes via toPascalCase', async () => {
    const xml =
      '<?xml version="1.0"?>' +
      '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ter="http://www.onvif.org/ver10/error">' +
      '<s:Body><s:Fault>' +
      '<faultcode>s:Client</faultcode>' +
      '<faultstring>denied</faultstring>' +
      '<detail><ter:notAuthorized><extra/></ter:notAuthorized></detail>' +
      '</s:Fault></s:Body></s:Envelope>';
    await expect(parseSOAPString(xml)).rejects.toMatchObject({
      faultSubcode: 'NotAuthorized',
      faultReason: 'denied',
    });
  });
});

describe('soapActionFromBody / soapActionFromXml edges', () => {
  it('soapActionFromBody handles empty body, fallback xmlns, and missing xmlns', () => {
    expect(soapActionFromBody({})).toBeUndefined();
    expect(soapActionFromBody({ $: { a: 1 } })).toBeUndefined();
    expect(soapActionFromBody({ GetFoo: {} }, 'http://ns')).toBe('http://ns/GetFoo');
    expect(soapActionFromBody({ GetFoo: 'x' })).toBeUndefined();
  });

  it('soapActionFromXml returns undefined without Body, operation, or xmlns', () => {
    expect(soapActionFromXml('<root/>')).toBeUndefined();
    expect(soapActionFromXml('<s:Body xmlns:s="urn:s"></s:Body>')).toBeUndefined();
    expect(
      soapActionFromXml(
        '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
          '<s:Body><GetFoo/></s:Body></s:Envelope>',
      ),
    ).toBeUndefined();
    expect(
      soapActionFromXml(
        '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
          '<s:Body><tds:GetFoo xmlns:tds="http://ns"/></s:Body></s:Envelope>',
      ),
    ).toBe('http://ns/GetFoo');
  });
});

describe('digest auth edges', () => {
  it('parseChallenge accepts headers without Digest prefix and skips bad tokens', () => {
    expect(parseChallenge('realm="r", nonce="n", junk')).toEqual({ realm: 'r', nonce: 'n' });
  });

  it('digestHashName rejects unknown algorithms', () => {
    expect(digestHashName('SHA3-256')).toBeUndefined();
    expect(digestHashName('')).toBeUndefined();
    expect(digestHashName(undefined)).toBe('md5');
  });

  it('preferredDigestChallenge skips incomplete / unsupported challenges', () => {
    expect(preferredDigestChallenge(['Digest realm="r"', 'not-digest'])).toBeUndefined();
    expect(
      preferredDigestChallenge([
        'Digest realm="r", nonce="n", algorithm="SHA-256-sess"',
        'Digest realm="r", nonce="n2", algorithm="MD5"',
      ])?.nonce,
    ).toBe('n2');
  });

  it('digestAuth includes opaque and defaults empty username / path', () => {
    const header = digestAuth(
      ['Digest realm="r", nonce="n", opaque="op", algorithm="MD5"'],
      { method: 'POST', path: undefined },
      { username: undefined, password: 'p' },
      () => '00000001',
    );
    expect(header).toContain('opaque="op"');
    expect(header).toContain('username=""');
    expect(header).toContain('uri=""');
  });
});

describe('coerce list / certificate nullish edges', () => {
  it('list helpers return [] for null / undefined', () => {
    expect(coerceAppInfoList(null)).toEqual([]);
    expect(coerceAppInfoList(undefined)).toEqual([]);
    expect(coerceCredentialEntityList(null)).toEqual([]);
    expect(coerceNotificationMessages(undefined)).toEqual([]);
  });

  it('coerceCertificateInformation converts alternate notValid* field names', () => {
    const iso = '2024-01-01T00:00:00.000Z';
    const out = coerceCertificateInformation({
      notValidBefore: iso,
      notValidAfter: iso,
    }) as unknown as { notValidBefore: Date; notValidAfter: Date };
    expect(out.notValidBefore).toBeInstanceOf(Date);
    expect(out.notValidAfter).toBeInstanceOf(Date);
  });
});
