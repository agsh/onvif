/**
 * Regression / breaking-change guards for the public API after lazy connect refactor.
 * Failures here usually mean a semver-major change for consumers.
 */

import Module from 'module';
import * as mainApi from '../src';
import { Onvif } from '../src';
import { connectSteps } from '../src/connection';
import { Cam as CallbackCam } from '../src/compatibility';
import { Cam as PromiseCam } from '../src/compatibility/promises';
import pkg from '../package.json';

/** Runtime value exports from `require('onvif')` / `import * as onvif`. Service classes are type-only. */
const MAIN_RUNTIME_EXPORTS = [
  'Discovery',
  'DiscoverySingleton',
  'Events',
  'Onvif',
  'OnvifError',
  'Subscription',
  'build',
  'camelCase',
  'formatXMLValues',
  'getDigestHeaders',
  'guid',
  'linerase',
  'parseSOAPString',
  'splitArgs',
  'struct',
  'toIsoDuration',
  'toMs',
  'xsany',
].sort();

const SERVICE_CLASS_EXPORTS = [
  'Device',
  'Media',
  'Media2',
  'PTZ',
  'Replay',
  'Imaging',
  'Recording',
  'DoorControl',
  'AccessControl',
  'Credential',
  'AccessRules',
  'Schedule',
  'Provisioning',
  'AdvancedSecurity',
  'Thermal',
  'Analytics',
  'DeviceIO',
  'Display',
  'ActionEngine',
  'Search',
  'AnalyticsDevice',
  'Receiver',
  'Service',
];

const ONVIF_INSTANCE_METHODS = [
  'connect',
  'getActiveSources',
  'getSystemDateAndTime',
  'getOnlySystemDateAndTime',
  'setSystemDateAndTime',
  'request',
  'digestAuth',
  'updateNC',
  'parseUrl',
] as const;

const ONVIF_LAZY_SERVICES = [
  'device',
  'media',
  'media2',
  'ptz',
  'replay',
  'imaging',
  'recording',
  'doorControl',
  'accessControl',
  'credential',
  'accessRules',
  'schedule',
  'provisioning',
  'advancedSecurity',
  'thermal',
  'analytics',
  'deviceIO',
  'display',
  'actionEngine',
  'search',
  'analyticsDevice',
  'receiver',
] as const;

function trackLoads(patterns: RegExp[]) {
  const loaded = new Set<string>();
  const orig = (Module as any)._load as (this: unknown, ...args: unknown[]) => unknown;
  (Module as any)._load = function (this: unknown, request: unknown, ...rest: unknown[]) {
    const name = String(request);
    if (patterns.some((re) => re.test(name))) {
      loaded.add(name);
    }
    return orig.call(this, request, ...rest);
  };
  return {
    loaded,
    restore() {
      (Module as any)._load = orig;
    },
  };
}

describe('public API regression (breaking changes)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('package entry surface', () => {
    it('keeps the main runtime export set stable', () => {
      expect(Object.keys(mainApi).sort()).toEqual(MAIN_RUNTIME_EXPORTS);
    });

    it('does not expose service classes as runtime values from the main entry', () => {
      for (const name of SERVICE_CLASS_EXPORTS) {
        expect(mainApi).not.toHaveProperty(name);
      }
    });

    it('keeps package.json export map for consumers', () => {
      expect(Object.keys(pkg.exports).sort()).toEqual(['.', './compatibility', './compatibility/promises']);
      expect(pkg.main).toBe('build/index.js');
      expect(pkg.types).toBe('build/index.d.ts');
    });

    it('exposes Cam via compatibility subpaths', () => {
      expect(typeof CallbackCam).toBe('function');
      expect(typeof PromiseCam).toBe('function');
    });
  });

  describe('Onvif instance contract', () => {
    it('exposes stable connect-related methods and lazy service namespaces', () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      for (const method of ONVIF_INSTANCE_METHODS) {
        expect(typeof onvif[method]).toBe('function');
      }
      for (const service of ONVIF_LAZY_SERVICES) {
        expect(onvif[service]).toBeDefined();
      }
      expect(onvif.events).toBeInstanceOf(mainApi.Events);
      expect(onvif.services).toEqual([]);
      expect(onvif.profiles).toEqual([]);
      expect(onvif.videoSources).toEqual([]);
      expect(onvif.media2Support).toBe(false);
      expect(onvif.activeSources).toEqual([]);
    });

    it('connect() returns the same instance and emits connect', async () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockResolvedValue({ service: [] } as never);

      const onConnect = jest.fn();
      onvif.on('connect', onConnect);

      await expect(onvif.connect()).resolves.toBe(onvif);
      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('connect() with Media fills profiles/videoSources and activeSource', async () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.uri.media = new URL('http://127.0.0.1/onvif/media');
        cam.uri.PTZ = new URL('http://127.0.0.1/onvif/ptz');
        cam.services = [{ namespace: 'http://www.onvif.org/ver10/media/wsdl', XAddr: 'http://127.0.0.1/onvif/media' } as never];
        return { service: cam.services } as never;
      });
      jest.spyOn(connectSteps, 'getMediaProfiles').mockImplementation(async (cam) => {
        cam.profiles = [
          {
            token: 'profile1',
            name: 'Main',
            videoSourceConfiguration: { token: 'vsc1', sourceToken: 'vs1' },
            videoEncoderConfiguration: {
              encoding: 'H264',
              resolution: { width: 1280, height: 720 },
              rateControl: { frameRateLimit: 25, bitrateLimit: 2000 },
            },
          } as never,
        ];
        return cam.profiles;
      });
      jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
        cam.videoSources = [{ token: 'vs1' } as never];
        return cam.videoSources;
      });

      await onvif.connect();

      expect(onvif.profiles).toHaveLength(1);
      expect(onvif.videoSources).toHaveLength(1);
      expect(onvif.defaultProfile?.token).toBe('profile1');
      expect(onvif.activeSource?.profileToken).toBe('profile1');
      expect(onvif.activeSource?.encoding).toBe('H264');
      expect(onvif.uri.media?.href).toContain('/onvif/media');
    });

    it('connect() without Media still succeeds (Profile C / doorcontrol)', async () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.uri.doorcontrol = new URL('http://127.0.0.1/onvif/door');
        return { service: [] } as never;
      });
      const mediaSpy = jest.spyOn(connectSteps, 'getMediaProfiles');
      const sourcesSpy = jest.spyOn(connectSteps, 'getVideoSources');

      await onvif.connect();

      expect(mediaSpy).not.toHaveBeenCalled();
      expect(sourcesSpy).not.toHaveBeenCalled();
      expect(onvif.profiles).toEqual([]);
      expect(onvif.videoSources).toEqual([]);
      expect(onvif.activeSource).toBeUndefined();
      expect(onvif.uri.doorcontrol).toBeDefined();
    });

    it('getActiveSources is a no-op without video sources', async () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.profiles = [{ token: 'p1' } as never];
      onvif.videoSources = [];
      await onvif.getActiveSources();
      expect(onvif.activeSource).toBeUndefined();
      expect(onvif.defaultProfile).toBeUndefined();
    });
  });

  describe('lazy service loading', () => {
    it('does not load device/media/media2 on construct or connect', async () => {
      const tracker = trackLoads([/(^|[\\/])(device|media|media2)(\.ts|\.js)?$/]);
      try {
        const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
        expect(tracker.loaded.size).toBe(0);

        jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
        jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
          cam.uri.media = new URL('http://127.0.0.1/onvif/media');
          return { service: [] } as never;
        });
        jest.spyOn(connectSteps, 'getMediaProfiles').mockResolvedValue([]);
        jest.spyOn(connectSteps, 'getVideoSources').mockResolvedValue([]);

        await onvif.connect();
        expect([...tracker.loaded]).toEqual([]);
      } finally {
        tracker.restore();
      }
    });

    it('loads a service module only when that namespace is first used', async () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      // Lazy proxy: methods are not own/prototype members until the class loads.
      expect('getNodes' in onvif.ptz).toBe(false);

      jest.spyOn(onvif, 'request').mockResolvedValue([{ getNodesResponse: [] }, ''] as never);
      await expect(onvif.ptz.getNodes()).resolves.toEqual([]);

      expect('getNodes' in onvif.ptz).toBe(true);
      expect(onvif.request).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'PTZ' }),
      );
    });
  });

  describe('compatibility Cam surface', () => {
    it('reads profiles/videoSources/services/media2Support from Onvif connect cache', () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.profiles = [{ token: 'p1', name: 'Main' } as never];
      onvif.videoSources = [{ token: 'vs1' } as never];
      onvif.services = [{ namespace: 'http://www.onvif.org/ver10/device/wsdl' } as never];
      onvif.media2Support = true;
      onvif.defaultProfile = onvif.profiles[0];
      onvif.activeSource = {
        sourceToken: 'vs1',
        profileToken: 'p1',
        videoSourceConfigurationToken: 'vsc1',
        videoSourceToken: 'vs1',
      };

      const cam = new CallbackCam({ hostname: '127.0.0.1', autoconnect: false } as never);
      (cam as any).onvif = onvif;

      expect(cam.profiles).toEqual(onvif.profiles);
      expect(cam.videoSources).toEqual(onvif.videoSources);
      expect(cam.services).toEqual(onvif.services);
      expect(cam.media2Support).toBe(true);
      expect(cam.defaultProfile).toBe(onvif.defaultProfile);
      expect(cam.activeSource).toBe(onvif.activeSource);
    });

    it('Promise Cam shares the same startup getters', () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.profiles = [{ token: 'p2' } as never];
      onvif.videoSources = [{ token: 'vs2' } as never];

      const cam = new PromiseCam({ hostname: '127.0.0.1', autoconnect: false } as never);
      (cam as any).onvif = onvif;

      expect(cam.profiles).toHaveLength(1);
      expect(cam.videoSources[0].token).toBe('vs2');
    });
  });
});
