/**
 * requestContext under parallel SOAP: each caller-owned store keeps its own
 * requestXml / responseXml even when HTTP replies finish out of order.
 *
 * @jest-environment node
 */

import http from 'http';
import { AddressInfo } from 'net';
import { Onvif, requestContext, type OnvifRequestContext } from '../src';

const PATH = '/onvif/device_service';
const DEVICE_NS = 'http://www.onvif.org/ver10/device/wsdl';

function envelope(innerBody: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">` +
    `<s:Body>${innerBody}</s:Body></s:Envelope>`
  );
}

function hostnameResponse(name: string): string {
  return envelope(
    `<tds:GetHostnameResponse xmlns:tds="${DEVICE_NS}">` +
      `<tds:HostnameInformation><tds:FromDHCP>false</tds:FromDHCP>` +
      `<tds:Name>${name}</tds:Name></tds:HostnameInformation>` +
      `</tds:GetHostnameResponse>`,
  );
}

function deviceInfoResponse(manufacturer: string): string {
  return envelope(
    `<tds:GetDeviceInformationResponse xmlns:tds="${DEVICE_NS}">` +
      `<tds:Manufacturer>${manufacturer}</tds:Manufacturer>` +
      `<tds:Model>Model-X</tds:Model>` +
      `<tds:FirmwareVersion>1.0</tds:FirmwareVersion>` +
      `<tds:SerialNumber>SN</tds:SerialNumber>` +
      `<tds:HardwareId>HW</tds:HardwareId>` +
      `</tds:GetDeviceInformationResponse>`,
  );
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe('requestContext parallel XML pairing', () => {
  it('keeps request/response XML isolated when replies finish out of order', async () => {
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const isHostname = body.includes('GetHostname');
        const delayMs = isHostname ? 80 : 5;
        const xml = isHostname ? hostnameResponse('cam-hostname') : deviceInfoResponse('Maker-A');
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
          res.end(xml);
        }, delayMs);
      });
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
      onvif.uri.device = new URL(`http://127.0.0.1:${port}${PATH}`);

      const storeHostname: OnvifRequestContext = {};
      const storeInfo: OnvifRequestContext = {};

      const [hostnameResult, infoResult] = await Promise.all([
        requestContext.run(storeHostname, () =>
          onvif.request({
            service: 'device',
            body: { GetHostname: { $: { xmlns: DEVICE_NS } } },
          }),
        ),
        requestContext.run(storeInfo, () =>
          onvif.request({
            service: 'device',
            body: { GetDeviceInformation: { $: { xmlns: DEVICE_NS } } },
          }),
        ),
      ]);

      expect(storeHostname.requestXml).toEqual(expect.stringContaining('GetHostname'));
      expect(storeHostname.requestXml).not.toEqual(expect.stringContaining('GetDeviceInformation'));
      expect(storeHostname.responseXml).toEqual(expect.stringContaining('cam-hostname'));
      expect(storeHostname.responseXml).not.toEqual(expect.stringContaining('Maker-A'));
      expect(storeHostname.host).toBe('127.0.0.1');
      expect(storeHostname.service).toBe('device');
      expect(storeHostname.action).toBe(`${DEVICE_NS}/GetHostname`);

      expect(storeInfo.requestXml).toEqual(expect.stringContaining('GetDeviceInformation'));
      expect(storeInfo.requestXml).not.toEqual(expect.stringContaining('GetHostname'));
      expect(storeInfo.responseXml).toEqual(expect.stringContaining('Maker-A'));
      expect(storeInfo.responseXml).not.toEqual(expect.stringContaining('cam-hostname'));
      expect(storeInfo.action).toBe(`${DEVICE_NS}/GetDeviceInformation`);

      expect(hostnameResult[0].getHostnameResponse.hostnameInformation.name).toBe('cam-hostname');
      expect(infoResult[0].getDeviceInformationResponse.manufacturer).toBe('Maker-A');
    } finally {
      await closeServer(server);
    }
  });

  it('many overlapping stores stay paired under Promise.all', async () => {
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const match = /GetHostname.*?marker-(\d+)/s.exec(body) ?? /marker-(\d+)/.exec(body);
        const id = match?.[1] ?? '0';
        // Stagger so later requests can finish before earlier ones.
        const delayMs = (10 - Number(id)) * 8;
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
          res.end(hostnameResponse(`host-${id}`));
        }, Math.max(0, delayMs));
      });
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
      onvif.uri.device = new URL(`http://127.0.0.1:${port}${PATH}`);

      const n = 8;
      const stores: OnvifRequestContext[] = Array.from({ length: n }, () => ({}));
      await Promise.all(
        stores.map((store, i) =>
          requestContext.run(store, () =>
            onvif.request({
              service: 'device',
              // Unique token in the envelope so requestXml is distinguishable.
              body: {
                GetHostname: {
                  $: { xmlns: DEVICE_NS, 'xmlns:x': 'urn:test' },
                  'x:Marker': `marker-${i}`,
                },
              },
            }),
          ),
        ),
      );

      for (let i = 0; i < n; i++) {
        expect(stores[i].requestXml).toEqual(expect.stringContaining(`marker-${i}`));
        expect(stores[i].responseXml).toEqual(expect.stringContaining(`host-${i}`));
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          expect(stores[i].requestXml).not.toEqual(expect.stringContaining(`marker-${j}`));
          expect(stores[i].responseXml).not.toEqual(expect.stringContaining(`host-${j}`));
        }
      }
    } finally {
      await closeServer(server);
    }
  });
});
