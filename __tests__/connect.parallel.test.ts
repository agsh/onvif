/**
 * Artificial stress: many Onvif clients connect() in parallel, each against its
 * own mock device (separate port) that requires HTTP Digest, then media discovery.
 */

import http from 'http';
import { AddressInfo } from 'net';
import { Onvif } from '../src';

const PARALLEL = 666;
const USERNAME = 'admin';
const PASSWORD = 'secret';
const DEVICE_PATH = '/onvif/device_service';
const MEDIA_PATH = '/onvif/media_service';
const CHALLENGE =
  'Digest qop="auth", realm="IP Camera", nonce="parallelnonce000000000000000001", algorithm="MD5", stale="FALSE"';

function envelope(body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">${body}</s:Envelope>`
  );
}

function soapTime(): string {
  return envelope(
    `<s:Body xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">` +
      `<tds:GetSystemDateAndTimeResponse>` +
      `<tds:SystemDateAndTime>` +
      `<tt:DateTimeType>NTP</tt:DateTimeType>` +
      `<tt:DaylightSavings>false</tt:DaylightSavings>` +
      `<tt:UTCDateTime>` +
      `<tt:Time><tt:Hour>12</tt:Hour><tt:Minute>0</tt:Minute><tt:Second>0</tt:Second></tt:Time>` +
      `<tt:Date><tt:Year>2026</tt:Year><tt:Month>10</tt:Month><tt:Day>16</tt:Day></tt:Date>` +
      `</tt:UTCDateTime>` +
      `</tds:SystemDateAndTime>` +
      `</tds:GetSystemDateAndTimeResponse></s:Body>`,
  );
}

function soapServices(port: number): string {
  const host = `http://127.0.0.1:${port}`;
  return envelope(
    `<s:Body><tds:GetServicesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl">` +
      `<tds:Service>` +
      `<tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace>` +
      `<tds:XAddr>${host}${DEVICE_PATH}</tds:XAddr>` +
      `<tds:Version><tds:Major>2</tds:Major><tds:Minor>0</tds:Minor></tds:Version>` +
      `</tds:Service>` +
      `<tds:Service>` +
      `<tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace>` +
      `<tds:XAddr>${host}${MEDIA_PATH}</tds:XAddr>` +
      `<tds:Version><tds:Major>2</tds:Major><tds:Minor>0</tds:Minor></tds:Version>` +
      `</tds:Service>` +
      `</tds:GetServicesResponse></s:Body>`,
  );
}

function soapProfiles(): string {
  return envelope(
    `<s:Body xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">` +
      `<trt:GetProfilesResponse>` +
      `<trt:Profiles token="profile1" fixed="true">` +
      `<tt:Name>Main</tt:Name>` +
      `<tt:VideoSourceConfiguration token="vsc1">` +
      `<tt:Name>vsc</tt:Name><tt:SourceToken>vs1</tt:SourceToken>` +
      `<tt:Bounds x="0" y="0" width="1280" height="720"/>` +
      `</tt:VideoSourceConfiguration>` +
      `<tt:VideoEncoderConfiguration token="vec1">` +
      `<tt:Name>vec</tt:Name><tt:Encoding>H264</tt:Encoding>` +
      `<tt:Resolution><tt:Width>1280</tt:Width><tt:Height>720</tt:Height></tt:Resolution>` +
      `<tt:RateControl><tt:FrameRateLimit>25</tt:FrameRateLimit><tt:BitrateLimit>2000</tt:BitrateLimit></tt:RateControl>` +
      `</tt:VideoEncoderConfiguration>` +
      `</trt:Profiles>` +
      `</trt:GetProfilesResponse></s:Body>`,
  );
}

function soapVideoSources(): string {
  return envelope(
    `<s:Body xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">` +
      `<trt:GetVideoSourcesResponse>` +
      `<trt:VideoSources token="vs1">` +
      `<tt:Framerate>25</tt:Framerate>` +
      `<tt:Resolution><tt:Width>1280</tt:Width><tt:Height>720</tt:Height></tt:Resolution>` +
      `</trt:VideoSources>` +
      `</trt:GetVideoSourcesResponse></s:Body>`,
  );
}

function soapGetHostname(name: string): string {
  return envelope(
    `<s:Body xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">` +
      `<tds:GetHostnameResponse>` +
      `<tds:HostnameInformation>` +
      `<tt:FromDHCP>false</tt:FromDHCP>` +
      `<tt:Name>${name}</tt:Name>` +
      `</tds:HostnameInformation>` +
      `</tds:GetHostnameResponse></s:Body>`,
  );
}

function soapSetHostname(): string {
  return envelope(
    `<s:Body xmlns:tds="http://www.onvif.org/ver10/device/wsdl">` +
      `<tds:SetHostnameResponse/>` +
      `</s:Body>`,
  );
}

/** Pull `Name` from SetHostname SOAP (compact or namespaced). */
function hostnameFromSetBody(body: string): string | undefined {
  const match = body.match(/<(?:[\w-]+:)?Name>([^<]*)<\/(?:[\w-]+:)?Name>/);
  return match?.[1];
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

type MockDevice = {
  port: number;
  stats: { unauthorized: number; authorized: number };
  close: () => Promise<void>;
};

function startMockDevice(): Promise<MockDevice> {
  const stats = { unauthorized: 0, authorized: 0 };
  let port = 0;
  /** Per-device hostname; setHostname stores the port as a string. */
  let hostnameName = 'unset';

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (!req.headers.authorization) {
        stats.unauthorized += 1;
        res.writeHead(401, { 'WWW-Authenticate': CHALLENGE });
        res.end();
        return;
      }

      stats.authorized += 1;
      const body = Buffer.concat(chunks).toString('utf8');
      let xml: string;
      if (body.includes('GetSystemDateAndTime')) {
        xml = soapTime();
      } else if (body.includes('GetServices')) {
        xml = soapServices(port);
      } else if (body.includes('GetProfiles')) {
        xml = soapProfiles();
      } else if (body.includes('GetVideoSources')) {
        xml = soapVideoSources();
      } else if (body.includes('SetHostname')) {
        const name = hostnameFromSetBody(body);
        if (name === undefined) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('SetHostname without Name');
          return;
        }
        hostnameName = name;
        xml = soapSetHostname();
      } else if (body.includes('GetHostname')) {
        xml = soapGetHostname(hostnameName);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`unexpected SOAP op: ${body.slice(0, 200)}`);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/soap+xml; charset=utf-8' });
      res.end(xml);
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as AddressInfo).port;
      resolve({
        port,
        stats,
        close: () => closeServer(server),
      });
    });
    server.on('error', reject);
  });
}

describe(`parallel connect × ${PARALLEL} with Digest (one mock port each)`, () => {
  jest.setTimeout(180_000);

  it(`connects ${PARALLEL} clients to ${PARALLEL} distinct mock ports`, async () => {
    const mocks = await Promise.all(Array.from({ length: PARALLEL }, () => startMockDevice()));
    const ports = mocks.map((m) => m.port);
    expect(new Set(ports).size).toBe(PARALLEL);

    const clients: Onvif[] = [];

    try {
      for (const mock of mocks) {
        clients.push(
          new Onvif({
            hostname: '127.0.0.1',
            port: mock.port,
            path: DEVICE_PATH,
            username: USERNAME,
            password: PASSWORD,
            useWSSecurity: false,
            agent: false,
            autoConnect: false,
            timeout: 30_000,
          }),
        );
      }

      const connected = await Promise.all(clients.map((c) => c.connect()));
      expect(connected).toHaveLength(PARALLEL);

      for (let i = 0; i < PARALLEL; i += 1) {
        const c = clients[i];
        const mock = mocks[i];
        expect(c.port).toBe(mock.port);
        expect(c.uri.media?.port).toBe(String(mock.port));
        expect(c.profiles).toHaveLength(1);
        expect(c.profiles[0].token).toBe('profile1');
        expect(c.videoSources).toHaveLength(1);
        expect(c.activeMediaProfile?.profileToken).toBe('profile1');
        expect(c.defaultProfile?.videoEncoderConfiguration?.encoding).toBe('H264');
        expect(c.closed).toBe(false);
        // One Digest challenge, then 4 SOAP ops on that device.
        expect(mock.stats.unauthorized).toBe(1);
        expect(mock.stats.authorized).toBe(4);
      }

      // Per-device set/get: hostname := port, then read back (no cross-talk between instances).
      await Promise.all(
        clients.map((c) => c.device.setHostname({ name: String(c.port) })),
      );
      const hostnames = await Promise.all(clients.map((c) => c.device.getHostname()));
      for (let i = 0; i < PARALLEL; i += 1) {
        // Numeric-looking Name is coerced by formatXMLValues → compare as string.
        expect(String(hostnames[i].name)).toBe(String(mocks[i].port));
        expect(mocks[i].stats.authorized).toBe(6);
      }

      await Promise.all(clients.map((c) => c.close()));
      for (const c of clients) {
        expect(c.closed).toBe(true);
      }
    } finally {
      await Promise.allSettled(clients.map((c) => c.close()));
      await Promise.allSettled(mocks.map((m) => m.close()));
    }
  });
});
