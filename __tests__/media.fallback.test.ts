/**
 * Media1 / Media2 connect fallback and stable return shapes.
 * Guards against routing Media2 through media.* or changing unwrap contracts.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import { connectSteps, getVideoSources, media2ProfileToMedia1, probeMedia2Profiles } from '../src/connection';
import Media from '../src/media';
import Media2 from '../src/media2';

describe('Media1 / Media2 connect fallback', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function dualStackServices(cam: Onvif) {
    cam.media2Support = true;
    cam.uri.media = new URL('http://127.0.0.1/onvif/media');
    cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
    cam.services = [];
  }

  it('prefers Media1 profiles when both Media1 and Media2 are advertised', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const media1 = [{ token: 'm1', name: 'Media1' }] as never;
    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      dualStackServices(cam);
      return [] as never;
    });
    const probeMedia2 = jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue([
      { token: 'm2', name: 'Media2' } as never,
    ]);
    jest.spyOn(connectSteps, 'getMediaProfiles').mockImplementation(async (cam) => {
      cam.profiles = media1;
      return media1;
    });
    jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
      cam.videoSources = [];
      return [];
    });
    jest.spyOn(connectSteps, 'getActiveMediaProfiles').mockResolvedValue(undefined as never);

    await onvif.connect();
    expect(onvif.profiles).toEqual(media1);
    expect(probeMedia2).not.toHaveBeenCalled();
  });

  it('falls back to Media2 profiles when Media1 GetProfiles fails', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const media2 = [
      {
        token: 'm2',
        name: 'Fallback',
        videoSourceConfiguration: { token: 'vsc1', sourceToken: 'src1' },
        videoEncoderConfiguration: { token: 'vec1', encoding: 'H264' },
      },
    ] as never;
    const warnings: Error[] = [];
    onvif.on('warn', (err) => warnings.push(err));

    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      dualStackServices(cam);
      return [] as never;
    });
    jest.spyOn(connectSteps, 'getMediaProfiles').mockRejectedValue(new Error('Media1 GetProfiles failed'));
    jest
      .spyOn(connectSteps, 'getVideoSources')
      .mockRejectedValueOnce(new Error('Media1 GetVideoSources failed'))
      .mockImplementation(async (cam) => {
        cam.videoSources = [{ token: 'src1', framerate: 0, resolution: { width: 640, height: 480 } }];
        return cam.videoSources;
      });
    jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue(media2);

    await onvif.connect();
    expect(onvif.profiles).toEqual(media2);
    expect(onvif.activeMediaProfile?.profileToken).toBe('m2');
    expect(warnings).toHaveLength(1);
  });

  it('Media2-only devices never call Media1 GetProfiles', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      cam.media2Support = true;
      cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
      return [] as never;
    });
    jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue([
      {
        token: 'only2',
        name: 'T',
        videoSourceConfiguration: { token: 'vsc', sourceToken: 'src' },
      } as never,
    ]);
    jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
      cam.videoSources = [{ token: 'src', framerate: 0, resolution: { width: 1, height: 1 } }];
      return cam.videoSources;
    });
    const getMediaProfiles = jest.spyOn(connectSteps, 'getMediaProfiles');

    await onvif.connect();
    expect(getMediaProfiles).not.toHaveBeenCalled();
    expect(onvif.profiles[0]?.token).toBe('only2');
  });
});

describe('getVideoSources Media2 fallback responses', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back when Media1 returns an empty videoSources list', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
    onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
    onvif.media2Support = true;

    jest.spyOn(onvif, 'request').mockImplementation(async ({ body }) => {
      const root = Object.keys(body as object)[0];
      if (root === 'GetVideoSources') {
        return [{ getVideoSourcesResponse: { videoSources: [] } }, ''] as never;
      }
      if (root === 'GetVideoSourceConfigurations') {
        return [
          {
            getVideoSourceConfigurationsResponse: {
              configurations: [
                {
                  token: 'cfg1',
                  name: 'Main',
                  useCount: 1,
                  sourceToken: 'from-media2',
                  bounds: { x: 0, y: 0, width: 1280, height: 720 },
                },
              ],
            },
          },
          '',
        ] as never;
      }
      throw new Error(`unexpected ${root}`);
    });

    const sources = await getVideoSources(onvif);
    expect(sources).toHaveLength(1);
    expect(sources[0].token).toBe('from-media2');
    expect(sources[0].resolution).toEqual({ width: 1280, height: 720 });
  });

  it('keeps Media1 sources when the list is non-empty (no Media2 call)', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
    onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
    onvif.media2Support = true;

    const request = jest.spyOn(onvif, 'request').mockResolvedValue([
      {
        getVideoSourcesResponse: {
          videoSources: [{ token: 'vs1', framerate: 25, resolution: { width: 1920, height: 1080 } }],
        },
      },
      '',
    ] as never);

    const sources = await getVideoSources(onvif);
    expect(sources.map((s) => s.token)).toEqual(['vs1']);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        service: 'media',
        body: expect.objectContaining({ GetVideoSources: expect.any(Object) }),
      }),
    );
  });
});

describe('media2ProfileToMedia1 / probeMedia2Profiles shape', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('flattens configurations and drops the Media2 configurations bag', () => {
    const mapped = media2ProfileToMedia1({
      token: 'p1',
      name: 'Main',
      fixed: false,
      configurations: {
        videoSource: { token: 'vsc1', sourceToken: 'src1' } as never,
        videoEncoder: { token: 'vec1', encoding: 'H265' } as never,
        PTZ: { token: 'ptz1' } as never,
        audioOutput: { token: 'aout1' } as never,
      },
    } as never);

    expect(mapped).toMatchObject({
      token: 'p1',
      name: 'Main',
      videoSourceConfiguration: { token: 'vsc1', sourceToken: 'src1' },
      videoEncoderConfiguration: { token: 'vec1', encoding: 'H265' },
      PTZConfiguration: { token: 'ptz1' },
      extension: { audioOutputConfiguration: { token: 'aout1' } },
    });
    expect((mapped as { configurations?: unknown }).configurations).toBeUndefined();
  });

  it('probeMedia2Profiles skips bad entries and keeps valid Media1-shaped rows', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
    jest.spyOn(onvif, 'request').mockResolvedValue([
      {
        getProfilesResponse: {
          profiles: [
            null,
            { name: 'no-token' },
            {
              token: 'ok',
              name: 'Good',
              configurations: {
                videoSource: { token: 'vsc', sourceToken: 'src' },
              },
            },
          ],
        },
      },
    ] as never);

    const profiles = await probeMedia2Profiles(onvif);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      token: 'ok',
      videoSourceConfiguration: { token: 'vsc', sourceToken: 'src' },
    });
  });
});

describe('stream/snapshot return contracts (no Media1<->Media2 routing)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('media.getStreamUri / getSnapshotUri return MediaUri objects, never bare strings', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
    onvif.activeMediaProfile = { profileToken: 'p1', sourceToken: 's1' } as never;
    const media = new Media(onvif);

    jest.spyOn(onvif, 'request').mockImplementation(async ({ body }) => {
      const root = Object.keys(body as object)[0];
      if (root === 'GetStreamUri') {
        return [
          {
            getStreamUriResponse: {
              mediaUri: {
                uri: 'rtsp://cam/stream',
                invalidAfterConnect: false,
                invalidAfterReboot: false,
                timeout: 'PT60S',
              },
            },
          },
          '',
        ] as never;
      }
      if (root === 'GetSnapshotUri') {
        return [
          {
            getSnapshotUriResponse: {
              mediaUri: {
                uri: 'http://cam/snap',
                invalidAfterConnect: true,
                invalidAfterReboot: false,
                timeout: 'PT30S',
              },
            },
          },
          '',
        ] as never;
      }
      throw new Error(`unexpected ${root}`);
    });

    const stream = await media.getStreamUri({ protocol: 'RTSP', profileToken: 'p1' });
    expect(typeof stream).toBe('object');
    expect(stream).toEqual(
      expect.objectContaining({
        uri: 'rtsp://cam/stream',
        invalidAfterConnect: false,
        timeout: 'PT60S',
      }),
    );

    const snap = await media.getSnapshotUri({ profileToken: 'p1' });
    expect(typeof snap).toBe('object');
    expect(snap).toEqual(
      expect.objectContaining({
        uri: 'http://cam/snap',
        invalidAfterConnect: true,
      }),
    );

    expect(onvif.request).toHaveBeenCalledWith(expect.objectContaining({ service: 'media' }));
    expect(onvif.request).not.toHaveBeenCalledWith(expect.objectContaining({ service: 'media2' }));
  });

  it('media2.getStreamUri / getSnapshotUri return AnyURI strings, never MediaUri objects', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
    onvif.media2Support = true;
    onvif.activeMediaProfile = { profileToken: 'p1', sourceToken: 's1' } as never;
    const media2 = new Media2(onvif);

    jest.spyOn(onvif, 'request').mockImplementation(async ({ body }) => {
      const root = Object.keys(body as object)[0];
      if (root === 'GetStreamUri') {
        return [{ getStreamUriResponse: { uri: 'rtsp://cam/media2' } }, ''] as never;
      }
      if (root === 'GetSnapshotUri') {
        return [{ getSnapshotUriResponse: { uri: 'http://cam/media2-snap' } }, ''] as never;
      }
      throw new Error(`unexpected ${root}`);
    });

    const stream = await media2.getStreamUri({ protocol: 'RtspUnicast', profileToken: 'p1' });
    expect(typeof stream).toBe('string');
    expect(stream).toBe('rtsp://cam/media2');

    const snap = await media2.getSnapshotUri({ profileToken: 'p1' });
    expect(typeof snap).toBe('string');
    expect(snap).toBe('http://cam/media2-snap');

    expect(onvif.request).toHaveBeenCalledWith(expect.objectContaining({ service: 'media2' }));
    expect(onvif.request).not.toHaveBeenCalledWith(expect.objectContaining({ service: 'media' }));
  });
});
