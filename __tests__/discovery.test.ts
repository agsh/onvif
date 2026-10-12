/**
 * Integration tests for WS-Discovery against the Happytimesoft ONVIF reference server.
 * Expects the server from `./__tests__/happytime-onvif-server/start.sh` (see `npm test`).
 * Error paths for Discovery live in `discovery.errors.test.ts`.
 *
 * @jest-environment node
 */

import http from 'node:http';
import { Discovery, Onvif, type Scopes } from '../src';

jest.setTimeout(60_000);

const TEST_HOST = '127.0.0.1';
const TEST_PORT = 8000;
const DISCOVERY_TIMEOUT_MS = 1_000;
const SERVER_WAIT_MS = 45_000;

/** Scopes Happytime is known to match via WS-Discovery Probe (Profile/* often does not). */
const PREFERRED_MATCHABLE_SCOPES: Scopes[] = [
  'onvif://www.onvif.org/type/video_encoder',
  'onvif://www.onvif.org/type/awesome',
  'onvif://www.onvif.org/type',
  'onvif://www.onvif.org',
];

function httpPing(hostname: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname, port, path: '/', timeout: 4000 }, (res) => {
      res.resume();
      resolve();
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('http ping timeout'));
    });
  });
}

async function waitForOnvifTestServer(): Promise<void> {
  const deadline = Date.now() + SERVER_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      await httpPing(TEST_HOST, TEST_PORT);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `${TEST_HOST}:${TEST_PORT} unreachable. Start the test server first: ` +
      './__tests__/happytime-onvif-server/start.sh (npm test runs this before jest).',
  );
}

async function isHappytimesoftNvt(cam: Onvif): Promise<boolean> {
  cam.username = 'admin';
  cam.password = 'admin';
  try {
    await cam.connect();
    const info = await cam.device.getDeviceInformation();
    return (info.manufacturer ?? '').includes('Happytimesoft');
  } catch {
    return false;
  }
}

async function filterHappytimesoftDevices(cams: readonly (Onvif | Record<string, unknown>)[]): Promise<Onvif[]> {
  const out: Onvif[] = [];
  for (const cam of cams) {
    if (cam instanceof Onvif && (await isHappytimesoftNvt(cam))) {
      out.push(cam);
    }
  }
  return out;
}

beforeAll(async () => {
  await waitForOnvifTestServer();
});

describe('Discovery (happytime-onvif-server)', () => {
  it('discovers the Happytimesoft NVT via WS-Discovery (default resolve)', async () => {
    const cams = await Discovery.probe({ timeout: DISCOVERY_TIMEOUT_MS });
    expect(cams.length).toBeGreaterThan(0);
    const happy = await filterHappytimesoftDevices(cams);
    expect(happy.length).toBeGreaterThan(0);
    for (const cam of happy) {
      expect(cam).toBeInstanceOf(Onvif);
      expect(cam.path).toMatch(/device_service/);
      expect(cam.hostname).toBeTruthy();
      expect(Array.isArray(cam.xaddrs)).toBe(true);
      expect(cam.xaddrs!.length).toBeGreaterThan(0);
      expect(cam.xaddrs![0]).toBeInstanceOf(URL);
    }
  });

  it('resolve: false returns raw SOAP body objects with probeMatches', async () => {
    const cams = await Discovery.probe({ timeout: DISCOVERY_TIMEOUT_MS, resolve: false });
    expect(cams.length).toBeGreaterThan(0);
    for (const row of cams) {
      expect(row).toEqual(
        expect.objectContaining({
          probeMatches: expect.objectContaining({
            probeMatch: expect.objectContaining({
              XAddrs: expect.any(String),
            }),
          }),
        }),
      );
    }
  });

  it('emits device with an Onvif instance before probe resolves', async () => {
    const devices: Onvif[] = [];
    const onDevice = (cam: Onvif) => {
      if (cam instanceof Onvif) {
        devices.push(cam);
      }
    };
    Discovery.on('device', onDevice);
    try {
      await Discovery.probe({ timeout: DISCOVERY_TIMEOUT_MS });
    } finally {
      Discovery.off('device', onDevice);
    }
    expect(devices.length).toBeGreaterThan(0);
    const happy = await filterHappytimesoftDevices(devices);
    expect(happy.length).toBeGreaterThan(0);
  });

  it('accepts a custom WS-Discovery messageId', async () => {
    const cams = await Discovery.probe({
      timeout: DISCOVERY_TIMEOUT_MS,
      messageId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
    const happy = await filterHappytimesoftDevices(cams);
    expect(happy.length).toBeGreaterThan(0);
  });

  /**
   * Types / Scopes filters.
   *
   * Do not hardcode onvif.cfg scopes: `device.test.ts` runs earlier (alphabetically) and
   * `setScopes` replaces configurable scopes (location/name/hardware from cfg are wiped).
   * Read live scopes via GetScopes and probe with values Happytime still advertises/matches.
   */
  describe('types and scopes filters', () => {
    let liveScopes: Scopes[] = [];
    let matchableScope: Scopes = 'onvif://www.onvif.org';

    beforeAll(async () => {
      const cam = new Onvif({
        hostname: TEST_HOST,
        port: TEST_PORT,
        username: 'admin',
        password: 'admin',
      });
      await cam.connect();
      liveScopes = (await cam.device.getScopes())
        .map((scope) => scope.scopeItem)
        .filter((item): item is Scopes => typeof item === 'string' && item.length > 0);

      const preferred = PREFERRED_MATCHABLE_SCOPES.find(
        (scope) => scope === 'onvif://www.onvif.org' || liveScopes.includes(scope) || liveScopes.some((live) => live.startsWith(`${scope}/`)),
      );
      matchableScope = preferred ?? liveScopes[0] ?? 'onvif://www.onvif.org';
    });

    it('reads live scopes from Happytime for Probe filters', () => {
      expect(liveScopes.length).toBeGreaterThan(0);
      expect(matchableScope).toBeTruthy();
    });

    it.each([
      [['tds:Device'] as const],
      [['dn:NetworkVideoTransmitter'] as const],
      [['tds:Device', 'dn:NetworkVideoTransmitter'] as const],
    ])('discovers Happytimesoft with types %j', async (types) => {
      const cams = await Discovery.probe({ timeout: DISCOVERY_TIMEOUT_MS, types: [...types] });
      const happy = await filterHappytimesoftDevices(cams);
      expect(happy.length).toBeGreaterThan(0);
    });

    it('discovers Happytimesoft with a live matchable scope', async () => {
      const cams = await Discovery.probe({
        timeout: DISCOVERY_TIMEOUT_MS,
        scopes: [matchableScope],
      });
      const happy = await filterHappytimesoftDevices(cams);
      expect(happy.length).toBeGreaterThan(0);
    });

    it('discovers Happytimesoft with types and a live scope together', async () => {
      const cams = await Discovery.probe({
        timeout: DISCOVERY_TIMEOUT_MS,
        types: ['dn:NetworkVideoTransmitter'],
        scopes: [matchableScope],
      });
      const happy = await filterHappytimesoftDevices(cams);
      expect(happy.length).toBeGreaterThan(0);
    });

    it('ProbeMatch advertises Happytime Types and current Scopes', async () => {
      const rows = await Discovery.probe({
        timeout: DISCOVERY_TIMEOUT_MS,
        resolve: false,
        types: ['tds:Device'],
      });
      expect(rows.length).toBeGreaterThan(0);

      const match = (
        rows[0] as {
          probeMatches: { probeMatch: { types?: string; scopes?: string; XAddrs: string } };
        }
      ).probeMatches.probeMatch;

      expect(match.types).toEqual(expect.stringContaining('dn:NetworkVideoTransmitter'));
      expect(match.types).toEqual(expect.stringContaining('tds:Device'));
      expect(typeof match.scopes).toBe('string');
      expect(match.scopes!.length).toBeGreaterThan(0);
      // At least one scope currently configured on the device must appear in ProbeMatch.
      expect(liveScopes.some((scope) => match.scopes!.includes(scope))).toBe(true);
      expect(match.XAddrs).toMatch(/device_service/);
    });
  });
});
