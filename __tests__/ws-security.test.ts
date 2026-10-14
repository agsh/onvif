/**
 * WS-Security / SOAP request shape for #497 (Pelco empty body / Content-Type action).
 * @jest-environment node
 */

import http from 'http';
import { AddressInfo } from 'net';
import { Onvif } from '../src';
import { build, parseSOAPString, soapActionFromBody, soapActionFromXml } from '../src/utils';

const ENCODING_TYPE =
  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary';
const PASSWORD_TYPE =
  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest';
const DEVICE_NS = 'http://www.onvif.org/ver10/device/wsdl';

const NONCE_RE = new RegExp(
  `<Nonce EncodingType="${ENCODING_TYPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([A-Za-z0-9+/=]+)</Nonce>`,
);
const PASSWORD_RE = new RegExp(
  `<Password Type="${PASSWORD_TYPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([A-Za-z0-9+/=]+)</Password>`,
);

describe('WS-Security UsernameToken XML', () => {
  it('closes EncodingType and Type attribute quotes before Nonce/Password text', () => {
    const xml = build({
      Nonce: {
        $: { EncodingType: ENCODING_TYPE },
        _: '7Twd4BxrSFi2o1mvS8gmQ==',
      },
      Password: {
        $: { Type: PASSWORD_TYPE },
        _: 'd28eRQL+mEB4mDUwl22Xnt6eRRM=',
      },
    });

    expect(xml).toMatch(NONCE_RE);
    expect(xml).toMatch(PASSWORD_RE);
    expect(xml).not.toMatch(/EncodingType="[^"]*Base64Binary[A-Za-z0-9+/=]+</);
    expect(xml).not.toMatch(/Type="[^"]*PasswordDigest[A-Za-z0-9+/=]+</);
  });

  it('emits compact SOAP (no pretty-print) with well-formed Nonce/Password', async () => {
    const onvif = new Onvif({
      hostname: '127.0.0.1',
      username: 'onvif',
      password: 'secret',
      autoConnect: false,
      useWSSecurity: true,
    });

    let soap = '';
    onvif.on('requestBody', (body) => {
      soap = body;
    });
    jest.spyOn(onvif as any, 'rawRequest').mockResolvedValue([{}, '<ok/>']);

    await onvif.request({
      body: {
        GetServices: {
          $: { xmlns: DEVICE_NS },
          IncludeCapability: true,
        },
      },
    });

    expect(soap).not.toMatch(/\n\s+<UsernameToken>/);
    expect(soap).toContain('<UsernameToken>');
    expect(soap).toMatch(NONCE_RE);
    expect(soap).toMatch(PASSWORD_RE);
    expect(soap).toContain(`EncodingType="${ENCODING_TYPE}">`);
    expect(soap).toContain(`Type="${PASSWORD_TYPE}">`);
  });

  it('omits Security header when useWSSecurity is false', async () => {
    const onvif = new Onvif({
      hostname: '127.0.0.1',
      username: 'onvif',
      password: 'secret',
      autoConnect: false,
      useWSSecurity: false,
    });

    let soap = '';
    onvif.on('requestBody', (body) => {
      soap = body;
    });
    jest.spyOn(onvif as any, 'rawRequest').mockResolvedValue([{}, '<ok/>']);

    await onvif.request({
      body: {
        GetServices: {
          $: { xmlns: DEVICE_NS },
          IncludeCapability: true,
        },
      },
    });

    expect(soap).not.toContain('<Security');
    expect(soap).not.toContain('<Nonce');
  });

  it('keeps soapHeaders when useWSSecurity is false', async () => {
    const onvif = new Onvif({
      hostname: '127.0.0.1',
      username: 'onvif',
      password: 'secret',
      autoConnect: false,
      useWSSecurity: false,
    });

    let soap = '';
    onvif.on('requestBody', (body) => {
      soap = body;
    });
    jest.spyOn(onvif as any, 'rawRequest').mockResolvedValue([{}, '<ok/>']);

    await onvif.request({
      body: {
        Unsubscribe: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' } },
      },
      soapHeaders: {
        'a:Action': {
          $: { 's:mustUnderstand': '1' },
          _: 'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/UnsubscribeRequest',
        },
      },
    });

    expect(soap).not.toContain('<Security');
    expect(soap).toContain('UnsubscribeRequest');
    expect(soap).toContain('a:Action');
  });
});

describe('SOAP Content-Type action (#497 / v0 parity)', () => {
  it('soapActionFromBody builds namespace/Operation', () => {
    expect(
      soapActionFromBody({
        GetServices: { $: { xmlns: DEVICE_NS }, IncludeCapability: true },
      }),
    ).toBe(`${DEVICE_NS}/GetServices`);
  });

  it('soapActionFromXml reads operation xmlns from Body', () => {
    const xml =
      `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">` +
      `<s:Body>` +
      `<GetSystemDateAndTime xmlns="${DEVICE_NS}"/>` +
      `</s:Body></s:Envelope>`;
    expect(soapActionFromXml(xml)).toBe(`${DEVICE_NS}/GetSystemDateAndTime`);
  });

  it('sends Content-Type with charset and SOAP action like v0.x', async () => {
    let seenContentType = '';
    const server = http.createServer((req, res) => {
      seenContentType = String(req.headers['content-type'] ?? '');
      res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
      res.end(
        `<?xml version="1.0" encoding="UTF-8"?>` +
          `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">` +
          `<s:Body><tds:GetServicesResponse xmlns:tds="${DEVICE_NS}"/></s:Body></s:Envelope>`,
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    try {
      const onvif = new Onvif({
        hostname: '127.0.0.1',
        port,
        username: 'onvif',
        password: 'secret',
        autoConnect: false,
        agent: false,
      });
      await onvif.request({
        body: {
          GetServices: {
            $: { xmlns: DEVICE_NS },
            IncludeCapability: true,
          },
        },
      });
      expect(seenContentType).toBe(
        `application/soap+xml;charset=utf-8;action="${DEVICE_NS}/GetServices"`,
      );
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });

  it('rejects empty HTTP body with status code (Pelco-style #497)', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
      res.end('');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    try {
      const onvif = new Onvif({
        hostname: '127.0.0.1',
        port,
        username: 'onvif',
        password: 'secret',
        autoConnect: false,
        agent: false,
      });
      await expect(
        onvif.request({
          body: {
            GetServices: {
              $: { xmlns: DEVICE_NS },
              IncludeCapability: true,
            },
          },
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('Empty ONVIF SOAP response (HTTP 200)'),
        xml: '',
        statusCode: 200,
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});

describe('passwordDigest Created timestamp (timeShift)', () => {
  function createOnvif() {
    return new Onvif({
      hostname: '127.0.0.1',
      username: 'onvif',
      password: 'secret',
      autoConnect: false,
      useWSSecurity: true,
    });
  }

  function createdFromDigest(onvif: Onvif): string {
    return (onvif as any).passwordDigest().timestamp as string;
  }

  it('uses wall-clock Date.now() when timeShift is not yet known', () => {
    const onvif = createOnvif();
    expect(onvif.timeShift).toBeUndefined();

    const now = 1_700_000_000_000;
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      expect(createdFromDigest(onvif)).toBe(new Date(now).toISOString());
    } finally {
      dateNow.mockRestore();
    }
  });

  it('does not emit a ~1970 Created when timeShift is unset', () => {
    const onvif = createOnvif();
    const createdMs = Date.parse(createdFromDigest(onvif));
    // process.uptime()*1000 alone is only a few hours past epoch; wall clock is current.
    expect(createdMs).toBeGreaterThan(1_000_000_000_000);
  });

  it('uses monotonic uptime + timeShift once timeShift is known', () => {
    const onvif = createOnvif();
    const timeShift = 1_600_000_000_000;
    onvif.timeShift = timeShift;

    const uptimeSec = 42.5;
    const uptime = jest.spyOn(process, 'uptime').mockReturnValue(uptimeSec);
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(9_999_999_999_999);
    try {
      expect(createdFromDigest(onvif)).toBe(new Date(uptimeSec * 1000 + timeShift).toISOString());
    } finally {
      uptime.mockRestore();
      dateNow.mockRestore();
    }
  });

  it('puts the wall-clock Created into the Security header before time sync', async () => {
    const onvif = createOnvif();
    const now = 1_700_000_000_123;
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now);
    let soap = '';
    onvif.on('requestBody', (body) => {
      soap = body;
    });
    jest.spyOn(onvif as any, 'rawRequest').mockResolvedValue([{}, '<ok/>']);

    try {
      await onvif.request({
        body: {
          GetServices: {
            $: { xmlns: DEVICE_NS },
            IncludeCapability: true,
          },
        },
      });
      expect(soap).toContain(`<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">${new Date(now).toISOString()}</Created>`);
    } finally {
      dateNow.mockRestore();
    }
  });
});

describe('setupSystemDateAndTime timeShift updates', () => {
  function systemDatePayload(date: Date) {
    return {
      GetSystemDateAndTimeResponse: {
        SystemDateAndTime: {
          DateTimeType: 'Manual',
          DaylightSavings: false,
          UTCDateTime: {
            Time: {
              Hour: date.getUTCHours(),
              Minute: date.getUTCMinutes(),
              Second: date.getUTCSeconds(),
            },
            Date: {
              Year: date.getUTCFullYear(),
              Month: date.getUTCMonth() + 1,
              Day: date.getUTCDate(),
            },
          },
        },
      },
    };
  }

  it('always refreshes timeShift even when it was already set', () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.timeShift = 111;

    const first = new Date(Date.UTC(2020, 0, 1, 12, 0, 0));
    const uptimeSec = 10;
    const uptime = jest.spyOn(process, 'uptime').mockReturnValue(uptimeSec);
    try {
      (onvif as any).setupSystemDateAndTime(systemDatePayload(first));
      expect(onvif.timeShift).toBe(first.getTime() - uptimeSec * 1000);

      const second = new Date(Date.UTC(2024, 5, 15, 8, 30, 45));
      uptime.mockReturnValue(20);
      (onvif as any).setupSystemDateAndTime(systemDatePayload(second));
      expect(onvif.timeShift).toBe(second.getTime() - 20 * 1000);
    } finally {
      uptime.mockRestore();
    }
  });
});

describe('parseSOAPString empty / non-SOAP responses', () => {
  it('rejects an empty response body', async () => {
    await expect(parseSOAPString('')).rejects.toMatchObject({
      message: expect.stringContaining('Empty ONVIF SOAP response'),
      xml: '',
    });
  });
});
