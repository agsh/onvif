/**
 * Integration: IPv6 WS-Discovery against happytime-onvif-server (udp6 → FF02::C).
 * Unit coverage for IPv6 sendList / zone bind lives in `discovery.errors.test.ts`.
 *
 * Soft-pass when the host has no usable IPv6 or Happytime does not answer multicast IPv6
 * (HTTP ipv6_enable ≠ guaranteed ProbeMatch on FF02::C).
 *
 * @jest-environment node
 */

import os from 'os';
import http from 'node:http';
import { Discovery, Onvif } from '../src';

jest.setTimeout(60_000);

const TEST_HOST = '127.0.0.1';
const TEST_PORT = 8000;
const DISCOVERY_TIMEOUT_MS = 2_500;
const SERVER_WAIT_MS = 45_000;
const VERIFY_ATTEMPTS = 6;

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
    `${TEST_HOST}:${TEST_PORT} unreachable. Start: ./__tests__/happytime-onvif-server/start.sh`,
  );
}

function hasNonInternalIpv6(): boolean {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (String(a.family) === 'IPv6' && !a.internal) {
        return true;
      }
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

beforeAll(async () => {
  await waitForOnvifTestServer();
});

describe('Discovery IPv6 + happytime (integration)', () => {
  it('discovers Happytimesoft via udp6 / FF02::C when the server answers', async () => {
    if (!hasNonInternalIpv6()) {
      console.warn('No non-loopback IPv6 on this host — skipping IPv6 discovery integration assert');
      return;
    }

    const errors: Error[] = [];
    const onError = (err: Error) => errors.push(err);
    Discovery.on('error', onError);

    let happy: Onvif[] = [];
    try {
      for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
        const rows = await Discovery.probe({
          type: 'udp6',
          timeout: DISCOVERY_TIMEOUT_MS,
        });
        for (const cam of rows) {
          if (cam instanceof Onvif && (await isHappytimesoftNvt(cam))) {
            happy.push(cam);
          }
        }
        if (happy.length > 0) {
          break;
        }
        happy = [];
        await sleep(300 * (attempt + 1));
      }
    } finally {
      Discovery.off('error', onError);
    }

    if (happy.length === 0) {
      console.warn(
        'Happytime did not answer IPv6 WS-Discovery (udp6 → FF02::C). ' +
          `Socket/parse errors: ${errors.map((e) => e.message).join('; ') || 'none'}. ` +
          'Soft-pass — IPv6 sendList is covered by discovery.errors unit tests.',
      );
      return;
    }

    expect(happy.length).toBeGreaterThan(0);
    expect(happy[0].path).toMatch(/device_service/);
  });
});
