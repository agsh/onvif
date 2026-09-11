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

describe('parseSOAPString empty / non-SOAP responses', () => {
  it('rejects an empty response body', async () => {
    await expect(parseSOAPString('')).rejects.toMatchObject({
      message: expect.stringContaining('Empty ONVIF SOAP response'),
      xml: '',
    });
  });
});
