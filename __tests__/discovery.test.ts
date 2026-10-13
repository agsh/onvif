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
/** Probe / connect can miss under parallel Jest workers sharing one Happytime process. */
const VERIFY_ATTEMPTS = 5;

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Resolved ProbeMatch port — empty URL port means scheme default, not our :8000 server. */
function camPort(cam: Onvif): number | undefined {
  if (cam.port !== undefined) {
    return cam.port;
  }
  for (const xaddr of cam.xaddrs ?? []) {
    if (xaddr.port !== '') {
      return Number(xaddr.port);
    }
  }
  return undefined;
}

/**
 * Confirm manufacturer via loopback when XAddrs point at the local Happytime port.
 * Parallel suites already hammer `127.0.0.1:8000`; connecting to the LAN XAddr under
 * that load often fails even though Probe succeeded.
 */
async function isHappytimesoftNvt(cam: Onvif): Promise<boolean> {
  const port = camPort(cam);
  const hostname = port === TEST_PORT ? TEST_HOST : cam.hostname;
  const verify = new Onvif({
    hostname,
    port,
    path: cam.path,
    username: 'admin',
    password: 'admin',
  });
  for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
    try {
      await verify.connect();
      const info = await verify.device.getDeviceInformation();
      return (info.manufacturer ?? '').includes('Happytimesoft');
    } catch {
      await sleep(250 * (attempt + 1));
    }
  }
  return false;
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

type ProbeOptions = Parameters<typeof Discovery.probe>[0];

/** Serialize probe+verify in-process (overlapping probes starve Happytime HTTP). */
let discoveryVerifyChain: Promise<unknown> = Promise.resolve();

function withDiscoveryVerifyLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = discoveryVerifyChain.then(fn, fn);
  discoveryVerifyChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Retry Probe when UDP / Happytime is busy (parallel workers). */
async function probeHappytime(options: ProbeOptions = {}): Promise<Onvif[]> {
  return withDiscoveryVerifyLock(async () => {
    let last: (Onvif | Record<string, unknown>)[] = [];
    for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
      last = await Discovery.probe({ ...options, timeout: options?.timeout ?? DISCOVERY_TIMEOUT_MS });
      const happy = await filterHappytimesoftDevices(last);
      if (happy.length > 0) {
        return happy;
      }
      await sleep(250 * (attempt + 1));
    }
    return filterHappytimesoftDevices(last);
  });
}

async function probeRaw(options: ProbeOptions = {}): Promise<(Onvif | Record<string, unknown>)[]> {
  return withDiscoveryVerifyLock(async () => {
    for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
      const rows = await Discovery.probe({ ...options, timeout: options?.timeout ?? DISCOVERY_TIMEOUT_MS });
      if (rows.length > 0) {
        return rows;
      }
      await sleep(250 * (attempt + 1));
    }
    return Discovery.probe({ ...options, timeout: options?.timeout ?? DISCOVERY_TIMEOUT_MS });
  });
}

beforeAll(async () => {
  await waitForOnvifTestServer();
});

describe('Discovery (happytime-onvif-server)', () => {
  it('discovers the Happytimesoft NVT via WS-Discovery (default resolve)', async () => {
    const happy = await probeHappytime();
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
    const cams = await probeRaw({ resolve: false });
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
      await probeRaw();
    } finally {
      Discovery.off('device', onDevice);
    }
    expect(devices.length).toBeGreaterThan(0);
    const happy = await filterHappytimesoftDevices(devices);
    expect(happy.length).toBeGreaterThan(0);
  });

  it('accepts a custom WS-Discovery messageId', async () => {
    const happy = await probeHappytime({
      messageId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
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
      for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
        try {
          await cam.connect();
          break;
        } catch {
          await sleep(200 * (attempt + 1));
        }
      }
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
      const happy = await probeHappytime({ types: [...types] });
      expect(happy.length).toBeGreaterThan(0);
    });

    it('discovers Happytimesoft with a live matchable scope', async () => {
      const happy = await probeHappytime({ scopes: [matchableScope] });
      expect(happy.length).toBeGreaterThan(0);
    });

    it('discovers Happytimesoft with types and a live scope together', async () => {
      const happy = await probeHappytime({
        types: ['dn:NetworkVideoTransmitter'],
        scopes: [matchableScope],
      });
      expect(happy.length).toBeGreaterThan(0);
    });

    it('ProbeMatch advertises Happytime Types and current Scopes', async () => {
      const rows = await probeRaw({
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
