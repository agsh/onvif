/**
 * Architectural contract for v1 lazy loading (RC gate).
 *
 *   new Onvif()
 *      ↓
 *   connect()
 *      ↓
 *   device / media / media2 NOT loaded
 *      ↓
 *   onvif.media.getProfiles()
 *      ↓
 *   media loaded (device / media2 still not)
 */

import { Onvif } from '../src';
import { connectSteps } from '../src/connection';

const SERVICE_MODULE_RE = {
  device: /[/\\]device\.(ts|js)$/,
  media: /[/\\]media\.(ts|js)$/,
  media2: /[/\\]media2\.(ts|js)$/,
} as const;

function cachedServiceModules(service: keyof typeof SERVICE_MODULE_RE): string[] {
  return Object.keys(require.cache).filter((id) => SERVICE_MODULE_RE[service].test(id));
}

function isServiceModuleLoaded(service: keyof typeof SERVICE_MODULE_RE): boolean {
  return cachedServiceModules(service).length > 0;
}

/** Drop warm modules so this contract can assert absolute load state in a shared Jest worker. */
function unloadServiceModules() {
  for (const service of Object.keys(SERVICE_MODULE_RE) as Array<keyof typeof SERVICE_MODULE_RE>) {
    for (const id of cachedServiceModules(service)) {
      delete require.cache[id];
    }
  }
}

describe('v1 lazy-loading contract', () => {
  beforeEach(() => {
    unloadServiceModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('new Onvif → connect keeps device/media/media2 unloaded; media.getProfiles loads only media', async () => {
    unloadServiceModules();
    expect(isServiceModuleLoaded('device')).toBe(false);
    expect(isServiceModuleLoaded('media')).toBe(false);
    expect(isServiceModuleLoaded('media2')).toBe(false);

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });

    // Proxies are not backed by real classes yet.
    expect('getProfiles' in onvif.media).toBe(false);
    expect('getDeviceInformation' in onvif.device).toBe(false);
    expect('getProfiles' in onvif.media2).toBe(false);

    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      cam.uri.media = new URL('http://127.0.0.1/onvif/media');
      cam.services = [];
      return { service: [] } as never;
    });
    jest.spyOn(connectSteps, 'getMediaProfiles').mockImplementation(async (cam) => {
      cam.profiles = [{ token: 'p1' } as never];
      return cam.profiles;
    });
    jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
      cam.videoSources = [];
      return [];
    });

    await onvif.connect();

    // Handshake populated connect cache without loading service class modules.
    expect(onvif.profiles).toEqual([{ token: 'p1' }]);
    expect(isServiceModuleLoaded('device')).toBe(false);
    expect(isServiceModuleLoaded('media')).toBe(false);
    expect(isServiceModuleLoaded('media2')).toBe(false);
    expect('getProfiles' in onvif.media).toBe(false);
    expect('getDeviceInformation' in onvif.device).toBe(false);

    jest.spyOn(onvif, 'request').mockResolvedValue([{ getProfilesResponse: { profiles: [] } }, ''] as never);
    await expect(onvif.media.getProfiles()).resolves.toEqual([]);

    expect(isServiceModuleLoaded('media')).toBe(true);
    expect('getProfiles' in onvif.media).toBe(true);
    expect(isServiceModuleLoaded('device')).toBe(false);
    expect(isServiceModuleLoaded('media2')).toBe(false);
    expect('getDeviceInformation' in onvif.device).toBe(false);
  });
});
