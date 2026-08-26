import Module from 'module';
import { Onvif } from '../src';
import { connectSteps } from '../src/connection';

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
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue(undefined);
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
