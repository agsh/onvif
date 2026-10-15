import Module from 'module';
import { Onvif } from '../src';
import {
  connectSteps,
  getActiveSources,
  getCapabilities,
  getServices,
  resetConnectState,
  serviceUriKey,
} from '../src/connection';

function trackServiceLoads() {
  const loaded = new Set<string>();
  const orig = (Module as any)._load as (this: unknown, ...args: unknown[]) => unknown;
  (Module as any)._load = function (this: unknown, request: unknown, ...rest: unknown[]) {
    const name = String(request);
    if (
      /(^|[\\/])device(\.js)?$/.test(name) ||
      /(^|[\\/])media(\.js)?$/.test(name) ||
      /(^|[\\/])media2(\.js)?$/.test(name)
    ) {
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

describe('connection module isolation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connect() does not load device, media, or media2 modules', async () => {
    const tracker = trackServiceLoads();
    try {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      expect(tracker.loaded.size).toBe(0);

      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.media2Support = true;
        cam.uri.media = new URL('http://127.0.0.1/onvif/media');
        cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
        cam.services = [];
        return { service: [] } as never;
      });
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue([]);
      jest.spyOn(connectSteps, 'getMediaProfiles').mockImplementation(async (cam) => {
        cam.profiles = [];
        return [];
      });
      jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
        cam.videoSources = [];
        return [];
      });
      jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined);

      await onvif.connect();

      expect(tracker.loaded.size).toBe(0);
      expect(connectSteps.getServices).toHaveBeenCalled();
      expect(connectSteps.probeMedia2Profiles).toHaveBeenCalled();
      expect(connectSteps.getMediaProfiles).toHaveBeenCalled();
      expect(connectSteps.getVideoSources).toHaveBeenCalled();
    } finally {
      tracker.restore();
    }
  });

  it('Media2-only connect() does not load device, media, or media2 modules', async () => {
    const tracker = trackServiceLoads();
    try {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.media2Support = true;
        cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
        cam.services = [];
        return { service: [] } as never;
      });
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue([
        { token: 'p1', name: 'Main', videoSourceConfiguration: { token: 'vsc1', sourceToken: 'src1' } } as never,
      ]);
      jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
        cam.videoSources = [{ token: 'src1', framerate: 0, resolution: { width: 1, height: 1 } }];
        return cam.videoSources;
      });
      jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined);
      const getMediaProfiles = jest.spyOn(connectSteps, 'getMediaProfiles');

      await onvif.connect();

      expect(tracker.loaded.size).toBe(0);
      expect(getMediaProfiles).not.toHaveBeenCalled();
      expect(connectSteps.probeMedia2Profiles).toHaveBeenCalled();
      expect(connectSteps.getVideoSources).toHaveBeenCalled();
      expect(onvif.profiles[0]?.token).toBe('p1');
    } finally {
      tracker.restore();
    }
  });

  it('hydrates Media from Onvif cache when media module loads after connect', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.profiles = [{ token: 'p1', name: 'Profile1' } as never];
    onvif.videoSources = [{ token: 'vs1' } as never];

    const Media = (await import('../src/media')).default;
    const media = new Media(onvif);
    expect(media.profiles).toEqual(onvif.profiles);
    expect(media.videoSources).toEqual(onvif.videoSources);
  });
});

describe('serviceUriKey', () => {
  it('maps GetCapabilities / namespace aliases onto OnvifServices keys', () => {
    expect(serviceUriKey('PTZ')).toBe('ptz');
    expect(serviceUriKey('analyticsDevice')).toBe('analyticsdevice');
    expect(serviceUriKey('analyticsdevice')).toBe('analyticsdevice');
    expect(serviceUriKey('deviceIO')).toBe('deviceIO');
    expect(serviceUriKey('media')).toBe('media');
  });
});

describe('getCapabilities uri keys', () => {
  it('stores analyticsDevice extension XAddr under uri.analyticsdevice', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const xaddr = 'http://192.168.1.10/onvif/analyticsdevice_service';
    jest.spyOn(onvif, 'request').mockResolvedValueOnce([
      {
        getCapabilitiesResponse: {
          capabilities: {
            device: { XAddr: 'http://192.168.1.10/onvif/device_service' },
            extension: {
              analyticsDevice: { XAddr: xaddr },
              deviceIO: { XAddr: 'http://192.168.1.10/onvif/deviceIO' },
            },
          },
        },
      },
      '<mock/>',
    ] as never);

    await getCapabilities(onvif);

    expect(onvif.uri.analyticsdevice?.href).toBe(xaddr);
    expect((onvif.uri as Record<string, unknown>).analyticsDevice).toBeUndefined();
    expect(onvif.uri.deviceIO?.href).toContain('deviceIO');
    expect(onvif.request).toHaveBeenCalledWith(expect.objectContaining({ service: 'device' }));
  });

  it('applies preserveAddress to extension and synthetic recording XAddrs', async () => {
    const onvif = new Onvif({
      hostname: 'proxy.local',
      port: 8080,
      preserveAddress: true,
      autoConnect: false,
    });
    jest.spyOn(onvif, 'request').mockResolvedValueOnce([
      {
        getCapabilitiesResponse: {
          capabilities: {
            device: { XAddr: 'http://192.168.1.10/onvif/device_service' },
            extension: {
              replay: { XAddr: 'http://192.168.1.10/onvif/replay' },
              deviceIO: { XAddr: 'http://192.168.1.10:8000/onvif/deviceIO' },
            },
          },
        },
      },
      '<mock/>',
    ] as never);

    await getCapabilities(onvif);

    expect(onvif.uri.deviceIO?.hostname).toBe('proxy.local');
    expect(onvif.uri.deviceIO?.port).toBe('8080');
    expect(onvif.uri.deviceIO?.pathname).toBe('/onvif/deviceIO');
    expect(onvif.uri.replay?.hostname).toBe('proxy.local');
    expect(onvif.uri.replay?.port).toBe('8080');
    expect(onvif.uri.recording?.hostname).toBe('proxy.local');
    expect(onvif.uri.recording?.port).toBe('8080');
    expect(onvif.uri.recording?.pathname).toBe('/onvif/recording');
  });
});

describe('getServices uri keys', () => {
  it('normalizes analyticsDevice namespace path to uri.analyticsdevice', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const xaddr = 'http://192.168.1.10/onvif/analyticsdevice_service';
    jest.spyOn(onvif, 'request').mockResolvedValueOnce([
      {
        getServicesResponse: {
          service: [
            {
              namespace: 'http://www.onvif.org/ver10/analyticsDevice/wsdl',
              XAddr: xaddr,
              version: { major: 1, minor: 0 },
            },
          ],
        },
      },
      '<mock/>',
    ] as never);

    await getServices(onvif);

    expect(onvif.uri.analyticsdevice?.href).toBe(xaddr);
    expect((onvif.uri as Record<string, unknown>).analyticsDevice).toBeUndefined();
  });
});

describe('resetConnectState / reconnect', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears stale uri keys and media2Support before refill', () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.ptz = new URL('http://127.0.0.1/onvif/ptz');
    onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
    onvif.services = [{ namespace: 'x', XAddr: 'http://x' } as never];
    onvif.media2Support = true;
    onvif.capabilities = { device: { XAddr: 'http://old' } } as never;
    onvif.profiles = [{ token: 'old' } as never];
    onvif.videoSources = [{ token: 'old' } as never];
    onvif.activeSources = [{ sourceToken: 'old' } as never];
    onvif.defaultProfiles = [{ token: 'old' } as never];
    onvif.activeSource = onvif.activeSources[0];
    onvif.defaultProfile = onvif.defaultProfiles[0];
    onvif.deviceInformation = { manufacturer: 'Old', model: 'X' } as never;

    resetConnectState(onvif);

    expect(onvif.uri).toEqual({});
    expect(onvif.services).toEqual([]);
    expect(onvif.media2Support).toBe(false);
    expect(onvif.capabilities).toEqual({});
    expect(onvif.profiles).toEqual([]);
    expect(onvif.videoSources).toEqual([]);
    expect(onvif.activeSources).toEqual([]);
    expect(onvif.defaultProfiles).toEqual([]);
    expect(onvif.activeSource).toBeUndefined();
    expect(onvif.defaultProfile).toBeUndefined();
    expect(onvif.deviceInformation).toBeUndefined();
  });

  it('connect() drops previous uri.ptz when the device no longer advertises PTZ', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.ptz = new URL('http://127.0.0.1/onvif/ptz');
    onvif.media2Support = true;

    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      // Only media — no PTZ, no media2
      cam.uri.media = new URL('http://127.0.0.1/onvif/media');
      cam.services = [];
      return { service: [] } as never;
    });
    jest.spyOn(connectSteps, 'getMediaProfiles').mockImplementation(async (cam) => {
      cam.profiles = [];
      return [];
    });
    jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
      cam.videoSources = [];
      return [];
    });
    jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined);
    const probeMedia2 = jest.spyOn(connectSteps, 'probeMedia2Profiles');

    await onvif.connect();

    expect(onvif.uri.ptz).toBeUndefined();
    expect(onvif.uri.media).toBeDefined();
    expect(onvif.media2Support).toBe(false);
    expect(probeMedia2).not.toHaveBeenCalled();
  });
});

describe('getActiveSources reconnect', () => {
  it('clears stale activeSources / defaults when source count shrinks', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.videoSources = [{ token: 'vs1' } as never, { token: 'vs2' } as never];
    onvif.profiles = [
      {
        token: 'p1',
        videoSourceConfiguration: { token: 'vsc1', sourceToken: 'vs1' },
        videoEncoderConfiguration: { encoding: 'H264', resolution: { width: 640, height: 480 } },
      } as never,
      {
        token: 'p2',
        videoSourceConfiguration: { token: 'vsc2', sourceToken: 'vs2' },
        videoEncoderConfiguration: { encoding: 'H264', resolution: { width: 320, height: 240 } },
      } as never,
    ];

    await getActiveSources(onvif);
    expect(onvif.activeSources).toHaveLength(2);
    expect(onvif.defaultProfiles).toHaveLength(2);

    onvif.videoSources = [{ token: 'vs1' } as never];
    await getActiveSources(onvif);

    expect(onvif.activeSources).toHaveLength(1);
    expect(onvif.activeSources[0].sourceToken).toBe('vs1');
    expect(onvif.defaultProfiles).toHaveLength(1);
    expect(onvif.activeSource?.sourceToken).toBe('vs1');
  });

  it('clears prior activeSources when there are no video sources', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.activeSources = [{ sourceToken: 'old' } as never];
    onvif.defaultProfiles = [{ token: 'old' } as never];
    onvif.activeSource = onvif.activeSources[0];
    onvif.defaultProfile = onvif.defaultProfiles[0];
    onvif.videoSources = [];

    await getActiveSources(onvif);

    expect(onvif.activeSources).toEqual([]);
    expect(onvif.defaultProfiles).toEqual([]);
    expect(onvif.activeSource).toBeUndefined();
    expect(onvif.defaultProfile).toBeUndefined();
  });
});
