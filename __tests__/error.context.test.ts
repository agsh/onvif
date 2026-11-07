import http from 'http';
import { AddressInfo } from 'net';
import {
  Onvif,
  OnvifAuthError,
  OnvifSoapFaultError,
  parseSOAPString,
  requestContext,
} from '../src';

const PATH = '/onvif/device_service';
const DEVICE_NS = 'http://www.onvif.org/ver10/device/wsdl';

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe('OnvifError request context', () => {
  it('caller-owned requestContext store also receives host/service/action', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="x"' });
      res.end();
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    const { port } = server.address() as AddressInfo;
    try {
      const onvif = new Onvif({
        hostname: '127.0.0.1',
        port,
        path: PATH,
        username: 'admin',
        password: 'secret',
        useWSSecurity: false,
        agent: false,
        autoConnect: false,
      });
      const store: { requestXml?: string; host?: string; service?: string; action?: string } = {};
      await expect(
        requestContext.run(store, () =>
          onvif.request({
            service: 'device',
            body: { GetHostname: { $: { xmlns: DEVICE_NS } } },
          }),
        ),
      ).rejects.toMatchObject({
        name: 'OnvifAuthError',
        host: '127.0.0.1',
        service: 'device',
      });
      expect(store.requestXml).toEqual(expect.stringContaining('GetHostname'));
      expect(store.host).toBe('127.0.0.1');
      expect(store.service).toBe('device');
      expect(store.action).toBe(`${DEVICE_NS}/GetHostname`);
    } finally {
      await closeServer(server);
    }
  });

  it('sets host/service/action on Digest auth failure', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="x"' });
      res.end();
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    const { port } = server.address() as AddressInfo;
    try {
      const onvif = new Onvif({
        hostname: '127.0.0.1',
        port,
        path: PATH,
        username: 'admin',
        password: 'secret',
        useWSSecurity: false,
        agent: false,
        autoConnect: false,
      });
      await expect(
        onvif.request({
          service: 'device',
          body: { GetHostname: { $: { xmlns: DEVICE_NS } } },
        }),
      ).rejects.toMatchObject({
        name: 'OnvifAuthError',
        host: '127.0.0.1',
        service: 'device',
        action: `${DEVICE_NS}/GetHostname`,
      });
      await expect(
        onvif.request({
          service: 'device',
          body: { GetHostname: { $: { xmlns: DEVICE_NS } } },
        }),
      ).rejects.toBeInstanceOf(OnvifAuthError);
    } finally {
      await closeServer(server);
    }
  });

  it('sets host/service/action on SOAP Fault', async () => {
    const faultXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
      '<s:Body><s:Fault>' +
      '<s:Code><s:Value>s:Receiver</s:Value></s:Code>' +
      '<s:Reason><s:Text xml:lang="en">ter:ActionNotSupported</s:Text></s:Reason>' +
      '</s:Fault></s:Body></s:Envelope>';
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
      res.end(faultXml);
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    const { port } = server.address() as AddressInfo;
    try {
      const onvif = new Onvif({
        hostname: '127.0.0.1',
        port,
        path: PATH,
        useWSSecurity: false,
        agent: false,
        autoConnect: false,
      });
      await expect(
        onvif.request({
          service: 'media',
          body: { GetProfiles: { $: { xmlns: 'http://www.onvif.org/ver10/media/wsdl' } } },
        }),
      ).rejects.toMatchObject({
        name: 'OnvifSoapFaultError',
        host: '127.0.0.1',
        service: 'media',
        action: 'http://www.onvif.org/ver10/media/wsdl/GetProfiles',
      });
      await expect(
        onvif.request({
          service: 'media',
          body: { GetProfiles: { $: { xmlns: 'http://www.onvif.org/ver10/media/wsdl' } } },
        }),
      ).rejects.toBeInstanceOf(OnvifSoapFaultError);
    } finally {
      await closeServer(server);
    }
  });

  it('parseSOAPString faults inherit requestContext via ALS', async () => {
    const faultXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
      '<s:Body><s:Fault>' +
      '<s:Code><s:Value>s:Receiver</s:Value></s:Code>' +
      '<s:Reason><s:Text xml:lang="en">ter:ActionNotSupported</s:Text></s:Reason>' +
      '</s:Fault></s:Body></s:Envelope>';
    await expect(
      requestContext.run(
        {
          host: 'cam.example',
          service: 'media',
          action: 'http://www.onvif.org/ver10/media/wsdl/GetProfiles',
        },
        () => parseSOAPString(faultXml),
      ),
    ).rejects.toMatchObject({
      name: 'OnvifSoapFaultError',
      host: 'cam.example',
      service: 'media',
      action: 'http://www.onvif.org/ver10/media/wsdl/GetProfiles',
    });
  });

  it('attaches host to transport timeout errors', async () => {
    const server = http.createServer((req) => {
      req.resume();
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    const { port } = server.address() as AddressInfo;
    try {
      const onvif = new Onvif({
        hostname: '127.0.0.1',
        port,
        path: PATH,
        useWSSecurity: false,
        agent: false,
        autoConnect: false,
        timeout: 40,
      });
      await expect(
        onvif.request({
          service: 'device',
          body: { GetHostname: { $: { xmlns: DEVICE_NS } } },
        }),
      ).rejects.toMatchObject({
        code: 'ETIMEDOUT',
        host: '127.0.0.1',
        service: 'device',
      });
    } finally {
      await closeServer(server);
    }
  });
});
