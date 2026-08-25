/**
 * Golden compatibility: same scenarios on npm onvif@0.8.2 Cam and master `onvif/compatibility` Cam.
 * Asserts callback arity (err, data, xml), key result fields, post-connect properties, and events.
 *
 * Requires happytime-onvif-server (same as other integration suites).
 */

import { Cam as V0Cam } from 'onvif-v0';
import { Cam as CompatCam } from '../src/compatibility';
import happytimeOnvifOptions from './happytime.json';

type AnyCam = {
  [key: string]: any;
  on(event: string, listener: (...args: unknown[]) => void): AnyCam;
  off?(event: string, listener: (...args: unknown[]) => void): AnyCam;
  removeListener?(event: string, listener: (...args: unknown[]) => void): AnyCam;
};

type CallbackShot = {
  err: Error | null;
  data: unknown;
  xml: unknown;
  /** Number of arguments the Cam passed to the callback (v0 always ≥ 3 on success). */
  argc: number;
};

const connectOpts = {
  ...happytimeOnvifOptions,
  // v0 uses autoconnect by default; keep both explicit for clarity
};

function connectCam(CamCtor: new (options: object, cb?: (err: Error | null) => void) => AnyCam): Promise<AnyCam> {
  return new Promise((resolve, reject) => {
    const cam = new CamCtor(connectOpts, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(cam);
    });
  });
}

/** Invoke a Cam method that ends with a Node-style callback; capture all callback args. */
function callMethod(cam: AnyCam, method: string, ...methodArgs: unknown[]): Promise<CallbackShot> {
  return new Promise((resolve, reject) => {
    const fn = cam[method];
    if (typeof fn !== 'function') {
      reject(new Error(`Missing method ${method}`));
      return;
    }
    fn.call(cam, ...methodArgs, (...cbArgs: unknown[]) => {
      const err = (cbArgs[0] as Error | null) ?? null;
      resolve({
        err,
        data: cbArgs[1],
        xml: cbArgs[2],
        argc: cbArgs.length,
      });
    });
  });
}

async function callBoth(
  v0: AnyCam,
  compat: AnyCam,
  method: string,
  ...methodArgs: unknown[]
): Promise<{ v0: CallbackShot; compat: CallbackShot }> {
  const [v0Shot, compatShot] = await Promise.all([
    callMethod(v0, method, ...methodArgs),
    callMethod(compat, method, ...methodArgs),
  ]);
  if (v0Shot.err) {
    throw v0Shot.err;
  }
  if (compatShot.err) {
    throw compatShot.err;
  }
  return { v0: v0Shot, compat: compatShot };
}

function expectSoapXml(xml: unknown, hint: string) {
  expect(typeof xml).toBe('string');
  expect(xml as string).toMatch(/Envelope|soap/i);
  expect((xml as string).length).toBeGreaterThan(40);
  // Hint keeps failures readable when several calls are compared
  expect(hint).toBeTruthy();
}

function pickDefined(obj: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
}

let v0: AnyCam;
let compat: AnyCam;

beforeAll(async () => {
  [v0, compat] = await Promise.all([connectCam(V0Cam as any), connectCam(CompatCam as any)]);
});

describe('Golden compatibility (0.8.2 Cam ↔ master compatibility Cam)', () => {
  describe('post-connect properties', () => {
    it('exposes the same connection and startup surface', () => {
      for (const cam of [v0, compat]) {
        expect(cam.hostname).toBe('127.0.0.1');
        expect(cam.port).toBe(8000);
        expect(cam.username).toBe('admin');
        expect(cam.password).toBe('admin');
        expect(typeof cam.media2Support).toBe('boolean');
        expect(cam.activeSource?.profileToken).toBeDefined();
        expect(cam.defaultProfile).toBeDefined();
        expect(Array.isArray(cam.profiles) ? cam.profiles.length : 0).toBeGreaterThan(0);
        expect(Array.isArray(cam.videoSources) ? cam.videoSources.length : 0).toBeGreaterThan(0);
        expect(cam.uri?.media || cam.uri?.Media).toBeDefined();
      }
      expect(compat.media2Support).toBe(v0.media2Support);
      expect(compat.activeSource.profileToken).toBe(v0.activeSource.profileToken);
    });
  });

  describe('callback contract (err, data, xml)', () => {
    it('getDeviceInformation: matching info fields + SOAP xml third arg', async () => {
      const { v0: a, compat: b } = await callBoth(v0, compat, 'getDeviceInformation');

      expect(a.argc).toBeGreaterThanOrEqual(3);
      expect(b.argc).toBeGreaterThanOrEqual(3);
      expectSoapXml(a.xml, 'v0 getDeviceInformation');
      expectSoapXml(b.xml, 'compat getDeviceInformation');

      const keys = ['manufacturer', 'model', 'firmwareVersion', 'serialNumber', 'hardwareId'];
      const va = pickDefined(a.data as Record<string, unknown>, keys);
      const vb = pickDefined(b.data as Record<string, unknown>, keys);
      expect(vb).toEqual(va);
      expect(compat.deviceInformation).toEqual(expect.objectContaining(va));
    });

    it('getHostname / getCapabilities / getServices: xml present on both', async () => {
      for (const method of ['getHostname', 'getCapabilities'] as const) {
        const { v0: a, compat: b } = await callBoth(v0, compat, method);
        expect(a.argc).toBeGreaterThanOrEqual(3);
        expect(b.argc).toBeGreaterThanOrEqual(3);
        expectSoapXml(a.xml, `v0 ${method}`);
        expectSoapXml(b.xml, `compat ${method}`);
        expect(a.data).toBeDefined();
        expect(b.data).toBeDefined();
      }

      const services = await callBoth(v0, compat, 'getServices', false);
      expectSoapXml(services.v0.xml, 'v0 getServices');
      expectSoapXml(services.compat.xml, 'compat getServices');
      expect(Array.isArray(services.v0.data)).toBe(true);
      expect(Array.isArray(services.compat.data)).toBe(true);
      expect((services.compat.data as unknown[]).length).toBeGreaterThan(0);
    });

    it('getStreamUri / getSnapshotUri: uri + xml on both; stream options preserved', async () => {
      const stream = await callBoth(v0, compat, 'getStreamUri', {
        stream: 'RTP-Unicast',
        protocol: 'RTSP',
      });
      expectSoapXml(stream.v0.xml, 'v0 getStreamUri');
      expectSoapXml(stream.compat.xml, 'compat getStreamUri');
      const v0Uri = (stream.v0.data as any)?.uri ?? (stream.v0.data as any)?.mediaUri?.uri;
      const compatUri = (stream.compat.data as any)?.uri ?? (stream.compat.data as any)?.mediaUri?.uri;
      expect(v0Uri).toMatch(/^rtsp:\/\//i);
      expect(compatUri).toMatch(/^rtsp:\/\//i);

      const snap = await callBoth(v0, compat, 'getSnapshotUri', {});
      expectSoapXml(snap.v0.xml, 'v0 getSnapshotUri');
      expectSoapXml(snap.compat.xml, 'compat getSnapshotUri');
      const v0Snap = (snap.v0.data as any)?.uri ?? (snap.v0.data as any)?.mediaUri?.uri;
      const compatSnap = (snap.compat.data as any)?.uri ?? (snap.compat.data as any)?.mediaUri?.uri;
      expect(v0Snap).toMatch(/^https?:\/\//i);
      expect(compatSnap).toMatch(/^https?:\/\//i);
    });

    it('getPresets: token → preset on both (0.8.1+), xml third arg', async () => {
      const { v0: a, compat: b } = await callBoth(v0, compat, 'getPresets');
      expectSoapXml(a.xml, 'v0 getPresets');
      expectSoapXml(b.xml, 'compat getPresets');

      const v0Map = a.data as Record<string, { token?: string; name?: string; $?: { token?: string } }>;
      const compatMap = b.data as Record<string, { token?: string; name?: string }>;
      expect(typeof v0Map).toBe('object');
      expect(typeof compatMap).toBe('object');

      // 0.8.1+: keys are tokens (not names). Happytime may have zero presets — still same shape.
      for (const [token, preset] of Object.entries(compatMap)) {
        expect(preset.token ?? token).toBe(token);
      }
      expect(Object.keys(compatMap).sort()).toEqual(Object.keys(v0Map).sort());
    });

    it('getStatus: both return position-like payload with xml', async () => {
      const { v0: a, compat: b } = await callBoth(v0, compat, 'getStatus');
      expectSoapXml(a.xml, 'v0 getStatus');
      expectSoapXml(b.xml, 'compat getStatus');
      expect(a.data).toBeDefined();
      expect(b.data).toBeDefined();
    });
  });

  describe('events', () => {
    it('emits rawRequest and rawResponse around a device call', async () => {
      const v0Req: unknown[][] = [];
      const v0Res: unknown[][] = [];
      const cReq: unknown[][] = [];
      const cRes: unknown[][] = [];

      const onV0Req = (...args: unknown[]) => v0Req.push(args);
      const onV0Res = (...args: unknown[]) => v0Res.push(args);
      const onCReq = (...args: unknown[]) => cReq.push(args);
      const onCRes = (...args: unknown[]) => cRes.push(args);

      v0.on('rawRequest', onV0Req);
      v0.on('rawResponse', onV0Res);
      compat.on('rawRequest', onCReq);
      compat.on('rawResponse', onCRes);

      try {
        await callBoth(v0, compat, 'getDeviceInformation');
      } finally {
        v0.removeListener?.('rawRequest', onV0Req);
        v0.removeListener?.('rawResponse', onV0Res);
        compat.removeListener?.('rawRequest', onCReq);
        compat.removeListener?.('rawResponse', onCRes);
      }

      expect(v0Req.length).toBeGreaterThan(0);
      expect(cReq.length).toBeGreaterThan(0);
      expect(v0Res.length).toBeGreaterThan(0);
      expect(cRes.length).toBeGreaterThan(0);

      expect(typeof cReq[0][0]).toBe('string');
      expect(typeof v0Req[0][0]).toBe('string');
      expect(typeof cRes[0][0]).toBe('string');
      expect(typeof v0Res[0][0]).toBe('string');
      // v0 rawResponse may pass statusCode as 2nd arg; compat may omit it — both OK
      expect(v0Res[0].length).toBeGreaterThanOrEqual(1);
      expect(cRes[0].length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sync digest helpers', () => {
    it('updateNC increments on both Cams', () => {
      const n1 = v0.updateNC();
      const n2 = v0.updateNC();
      const c1 = compat.updateNC();
      const c2 = compat.updateNC();
      expect(n1).toMatch(/^\d{8}$/);
      expect(n2).toMatch(/^\d{8}$/);
      expect(Number(n2)).toBe(Number(n1) + 1);
      expect(Number(c2)).toBe(Number(c1) + 1);
    });
  });
});
