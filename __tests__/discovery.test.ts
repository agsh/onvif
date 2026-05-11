/**
 * Integration tests for WS-Discovery against the Happytimesoft ONVIF reference server.
 * Expects the server from `./__tests__/happytime-onvif-server/start.sh` (see `npm test`).
 * Mocked error-path coverage: `discovery.errors.test.ts`.
 *
 * @jest-environment node
 */

import http from 'node:http';
import { Discovery, Onvif } from '../src';

jest.setTimeout(60_000);

const TEST_HOST = '127.0.0.1';
const TEST_PORT = 8000;
const DISCOVERY_TIMEOUT_MS = 1_000;
const SERVER_WAIT_MS = 45_000;

function httpPing(hostname: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname, port, path: '/', timeout: 4000 },
      (res) => {
        res.resume();
        resolve();
      },
    );
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
    `${TEST_HOST}:${TEST_PORT} unreachable. Start the test server first: `
    + './__tests__/happytime-onvif-server/start.sh (npm test runs this before jest).',
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

async function filterHappytimesoftDevices(
  cams: readonly (Onvif | Record<string, unknown>)[],
): Promise<Onvif[]> {
  const out: Onvif[] = [];
  for (const cam of cams) {
    if (cam instanceof Onvif && await isHappytimesoftNvt(cam)) {
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
    const cams = await Discovery.probe({ timeout : DISCOVERY_TIMEOUT_MS });
    expect(cams.length).toBeGreaterThan(0);
    const happy = await filterHappytimesoftDevices(cams);
    expect(happy.length).toBeGreaterThan(0);
    for (const cam of happy) {
      expect(cam).toBeInstanceOf(Onvif);
      expect(cam.path).toMatch(/device_service/);
      expect(cam.hostname).toBeTruthy();
    }
  });

  it('resolve: false returns raw SOAP body objects with probeMatches', async () => {
    const cams = await Discovery.probe({ timeout : DISCOVERY_TIMEOUT_MS, resolve : false });
    expect(cams.length).toBeGreaterThan(0);
    for (const row of cams) {
      expect(row).toEqual(
        expect.objectContaining({
          probeMatches : expect.objectContaining({
            probeMatch : expect.objectContaining({
              XAddrs : expect.any(String),
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
      await Discovery.probe({ timeout : DISCOVERY_TIMEOUT_MS });
    } finally {
      Discovery.off('device', onDevice);
    }
    expect(devices.length).toBeGreaterThan(0);
    const happy = await filterHappytimesoftDevices(devices);
    expect(happy.length).toBeGreaterThan(0);
  });

  it('accepts a custom WS-Discovery messageId', async () => {
    const cams = await Discovery.probe({
      timeout   : DISCOVERY_TIMEOUT_MS,
      messageId : 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
    const happy = await filterHappytimesoftDevices(cams);
    expect(happy.length).toBeGreaterThan(0);
  });
});
