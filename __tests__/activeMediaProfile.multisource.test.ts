/**
 * activeMediaProfile consistency across multi-source bags and service SOAP tokens.
 *
 * @jest-environment node
 */

import { Onvif, type ActiveMediaProfile } from '../src';
import { getActiveMediaProfiles, setActiveMediaProfile } from '../src/connection';
import Media from '../src/media';
import Imaging from '../src/imaging';
import PTZ from '../src/ptz';
import Analytics from '../src/analytics';

function profile(opts: {
  token: string;
  sourceToken: string;
  vsc: string;
  vec: string;
  asc?: string;
  aec?: string;
  vac?: string;
  meta?: string;
  ptz?: string;
}): never {
  return {
    token: opts.token,
    name: opts.token,
    videoSourceConfiguration: {
      token: opts.vsc,
      sourceToken: opts.sourceToken,
      name: 'vsc',
      useCount: 1,
      bounds: { x: 0, y: 0, width: 640, height: 480 },
    },
    videoEncoderConfiguration: { token: opts.vec, encoding: 'H264' },
    ...(opts.asc && { audioSourceConfiguration: { token: opts.asc } }),
    ...(opts.aec && { audioEncoderConfiguration: { token: opts.aec } }),
    ...(opts.vac && { videoAnalyticsConfiguration: { token: opts.vac } }),
    ...(opts.meta && { metadataConfiguration: { token: opts.meta } }),
    ...(opts.ptz && { PTZConfiguration: { token: opts.ptz, name: 'PTZ' } }),
  } as never;
}

function dualSourceOnvif(): Onvif {
  const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
  onvif.videoSources = [
    { token: 'vs1', framerate: 25, resolution: { width: 1920, height: 1080 } } as never,
    { token: 'vs2', framerate: 15, resolution: { width: 1280, height: 720 } } as never,
  ];
  onvif.profiles = [
    profile({
      token: 'p1-main',
      sourceToken: 'vs1',
      vsc: 'vsc1',
      vec: 'vec1a',
      asc: 'asc1',
      aec: 'aec1',
      vac: 'vac1',
      meta: 'meta1',
      ptz: 'ptz1',
    }),
    profile({
      token: 'p1-sub',
      sourceToken: 'vs1',
      vsc: 'vsc1',
      vec: 'vec1b',
      asc: 'asc1',
      vac: 'vac1',
      ptz: 'ptz1',
    }),
    profile({
      token: 'p2-main',
      sourceToken: 'vs2',
      vsc: 'vsc2',
      vec: 'vec2a',
      asc: 'asc2',
      aec: 'aec2',
      vac: 'vac2',
      meta: 'meta2',
      ptz: 'ptz2',
    }),
    profile({
      token: 'p2-sub',
      sourceToken: 'vs2',
      vsc: 'vsc2',
      vec: 'vec2b',
      ptz: 'ptz2',
    }),
  ];
  return onvif;
}

function assertBagMatchesProfile(bag: ActiveMediaProfile, profileToken: string, onvif: Onvif) {
  const p = onvif.profiles.find((row) => row.token === profileToken);
  expect(p).toBeDefined();
  expect(bag.profileToken).toBe(profileToken);
  expect(bag.sourceToken).toBe(p!.videoSourceConfiguration!.sourceToken);
  expect(bag.videoSourceToken).toBe(bag.sourceToken);
  expect(bag.videoSourceConfigurationToken).toBe(p!.videoSourceConfiguration!.token);
  expect(bag.videoEncoderConfigurationToken).toBe(p!.videoEncoderConfiguration?.token);
  expect(bag.audioSourceConfigurationToken).toBe(p!.audioSourceConfiguration?.token);
  expect(bag.audioEncoderConfigurationToken).toBe(p!.audioEncoderConfiguration?.token);
  expect(bag.videoAnalyticsConfigurationToken).toBe(p!.videoAnalyticsConfiguration?.token);
  expect(bag.metadataConfigurationToken).toBe(p!.metadataConfiguration?.token);
  expect(bag.ptzConfigurationToken).toBe(p!.PTZConfiguration?.token);
}

describe('activeMediaProfile multi-source bags', () => {
  it('builds one bag per video source aligned with matching profiles', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);

    expect(onvif.activeMediaProfiles).toHaveLength(2);
    expect(onvif.defaultProfiles).toHaveLength(2);
    expect(onvif.activeMediaProfile).toBe(onvif.activeMediaProfiles[0]);
    expect(onvif.defaultProfile).toBe(onvif.defaultProfiles[0]);

    expect(onvif.activeMediaProfiles[0].videoSourceToken).toBe('vs1');
    expect(onvif.activeMediaProfiles[1].videoSourceToken).toBe('vs2');
    expect(onvif.activeMediaProfiles[0].profileToken).toBe('p1-main');
    expect(onvif.activeMediaProfiles[1].profileToken).toBe('p2-main');

    assertBagMatchesProfile(onvif.activeMediaProfiles[0], 'p1-main', onvif);
    assertBagMatchesProfile(onvif.activeMediaProfiles[1], 'p2-main', onvif);
  });

  it('setActiveMediaProfile updates only the matching source slot', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);
    const slot1Before = { ...onvif.activeMediaProfiles[1] };

    setActiveMediaProfile(onvif, 'p1-sub');
    expect(onvif.activeMediaProfile?.profileToken).toBe('p1-sub');
    expect(onvif.activeMediaProfiles[0].videoEncoderConfigurationToken).toBe('vec1b');
    expect(onvif.activeMediaProfiles[1]).toEqual(slot1Before);
    assertBagMatchesProfile(onvif.activeMediaProfiles[0], 'p1-sub', onvif);

    setActiveMediaProfile(onvif, 'p2-sub');
    expect(onvif.activeMediaProfile?.profileToken).toBe('p2-sub');
    expect(onvif.activeMediaProfiles[0].profileToken).toBe('p1-sub');
    expect(onvif.activeMediaProfiles[1].profileToken).toBe('p2-sub');
    expect(onvif.activeMediaProfiles[1].videoEncoderConfigurationToken).toBe('vec2b');
    assertBagMatchesProfile(onvif.activeMediaProfiles[1], 'p2-sub', onvif);
  });

  it('prefers encoder-bearing profile for each source when several match', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.videoSources = [{ token: 'vs1' } as never, { token: 'vs2' } as never];
    onvif.profiles = [
      {
        token: 'p1-no-enc',
        videoSourceConfiguration: { token: 'vsc1', sourceToken: 'vs1' },
      } as never,
      profile({ token: 'p1-enc', sourceToken: 'vs1', vsc: 'vsc1', vec: 'vec1' }),
      profile({ token: 'p2-enc', sourceToken: 'vs2', vsc: 'vsc2', vec: 'vec2' }),
    ];

    await getActiveMediaProfiles(onvif);
    expect(onvif.activeMediaProfiles[0].profileToken).toBe('p1-enc');
    expect(onvif.activeMediaProfiles[1].profileToken).toBe('p2-enc');
  });

  it('keeps same-source profiles without encoder (HikVision-style stubs)', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.videoSources = [
      { token: 'VideoSourceToken001' } as never,
      { token: 'VideoSourceToken006' } as never,
      { token: 'VideoSourceToken007' } as never,
    ];
    onvif.profiles = [
      {
        token: 'ProfileToken001',
        videoSourceConfiguration: { token: 'VSC001', sourceToken: 'VideoSourceToken001' },
      } as never,
      profile({
        token: 'ProfileToken006',
        sourceToken: 'VideoSourceToken006',
        vsc: 'VSC006',
        vec: 'VEC006',
      }),
      {
        token: 'ProfileToken007',
        videoSourceConfiguration: { token: 'VSC007', sourceToken: 'VideoSourceToken007' },
      } as never,
    ];

    await getActiveMediaProfiles(onvif);

    expect(onvif.activeMediaProfiles[0].profileToken).toBe('ProfileToken001');
    expect(onvif.activeMediaProfiles[0].videoSourceToken).toBe('VideoSourceToken001');
    expect(onvif.activeMediaProfiles[0].videoEncoderConfigurationToken).toBeUndefined();

    expect(onvif.activeMediaProfiles[1].profileToken).toBe('ProfileToken006');
    expect(onvif.activeMediaProfiles[1].videoSourceToken).toBe('VideoSourceToken006');
    expect(onvif.activeMediaProfiles[1].videoEncoderConfigurationToken).toBe('VEC006');

    expect(onvif.activeMediaProfiles[2].profileToken).toBe('ProfileToken007');
    expect(onvif.activeMediaProfiles[2].videoSourceToken).toBe('VideoSourceToken007');

    // Process-wide default prefers the first bag that has an encoder.
    expect(onvif.activeMediaProfile?.profileToken).toBe('ProfileToken006');
    expect(onvif.defaultProfile?.token).toBe('ProfileToken006');
  });

  it('does not borrow another source encoder profile on multi-source devices', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.videoSources = [{ token: 'vs1' } as never, { token: 'vs2' } as never];
    onvif.profiles = [profile({ token: 'p2', sourceToken: 'vs2', vsc: 'vsc2', vec: 'vec2' })];

    await getActiveMediaProfiles(onvif);

    expect(onvif.activeMediaProfiles[0]).toBeUndefined();
    expect(onvif.activeMediaProfiles[1].profileToken).toBe('p2');
    expect(onvif.activeMediaProfile?.profileToken).toBe('p2');
    expect(onvif.defaultProfile?.token).toBe('p2');
  });

  it('single-source last resort may use any encoder profile', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.videoSources = [{ token: 'vs-broken' } as never];
    onvif.profiles = [profile({ token: 'p-other', sourceToken: 'vs-other', vsc: 'vsc', vec: 'vec' })];

    await getActiveMediaProfiles(onvif);

    expect(onvif.activeMediaProfiles).toHaveLength(1);
    expect(onvif.activeMediaProfiles[0].profileToken).toBe('p-other');
    expect(onvif.activeMediaProfiles[0].videoSourceToken).toBe('vs-other');
    expect(onvif.activeMediaProfile?.profileToken).toBe('p-other');
  });
});

describe('activeMediaProfile concurrent multi-source switches', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  it('omit-token call snapshots activeMediaProfile before await (in-flight switch is safe)', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);
    const media = new Media(onvif);

    const gate = deferred<{ getStreamUriResponse: { mediaUri: { uri: string } } }>();
    const seen: unknown[] = [];
    jest.spyOn(media as any, 'request').mockImplementation(async (body: unknown) => {
      seen.push(body);
      return gate.promise;
    });

    const pending = media.getStreamUri({ protocol: 'RTSP' });
    // Switch while the first call is still awaiting transport.
    setActiveMediaProfile(onvif, 'p2-main');
    expect(onvif.activeMediaProfile?.profileToken).toBe('p2-main');

    gate.resolve({ getStreamUriResponse: { mediaUri: { uri: 'rtsp://x' } } });
    await pending;

    expect(seen).toEqual([
      expect.objectContaining({
        GetStreamUri: expect.objectContaining({ ProfileToken: 'p1-main' }),
      }),
    ]);
  });

  it('parallel omit-token calls race if setActiveMediaProfile runs between them', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);
    const media = new Media(onvif);

    const tokens: string[] = [];
    jest.spyOn(media as any, 'request').mockImplementation(async (body: any) => {
      tokens.push(body.GetStreamUri.ProfileToken);
      return { getStreamUriResponse: { mediaUri: { uri: 'rtsp://x' } } };
    });

    // Single-threaded: first omit-token call captures p1-main, then we switch, then second captures p2-main.
    const first = media.getStreamUri({ protocol: 'RTSP' });
    setActiveMediaProfile(onvif, 'p2-main');
    const second = media.getStreamUri({ protocol: 'RTSP' });
    await Promise.all([first, second]);

    expect(tokens).toEqual(['p1-main', 'p2-main']);
  });

  it('explicit profileToken is immune to concurrent setActiveMediaProfile', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);
    const media = new Media(onvif);

    const tokens: string[] = [];
    const gates = [deferred<any>(), deferred<any>()];
    let call = 0;
    jest.spyOn(media as any, 'request').mockImplementation(async (body: any) => {
      tokens.push(body.GetStreamUri.ProfileToken);
      const idx = call;
      call += 1;
      return gates[idx].promise;
    });

    const a = media.getStreamUri({ protocol: 'RTSP', profileToken: 'p1-main' });
    const b = media.getStreamUri({ protocol: 'RTSP', profileToken: 'p2-main' });
    setActiveMediaProfile(onvif, 'p1-sub');
    setActiveMediaProfile(onvif, 'p2-sub');

    gates[0].resolve({ getStreamUriResponse: { mediaUri: { uri: 'rtsp://1' } } });
    gates[1].resolve({ getStreamUriResponse: { mediaUri: { uri: 'rtsp://2' } } });
    await Promise.all([a, b]);

    expect(tokens).toEqual(['p1-main', 'p2-main']);
    expect(onvif.activeMediaProfile?.profileToken).toBe('p2-sub');
  });

  it('switching one source does not rewrite the other source slot under parallel reads', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);

    const reads: Array<{ slot0: string; slot1: string; active: string }> = [];
    const workers = Array.from({ length: 20 }, async (_, i) => {
      if (i % 2 === 0) {
        setActiveMediaProfile(onvif, i % 4 === 0 ? 'p1-main' : 'p1-sub');
      } else {
        setActiveMediaProfile(onvif, i % 4 === 1 ? 'p2-main' : 'p2-sub');
      }
      reads.push({
        slot0: onvif.activeMediaProfiles[0].profileToken,
        slot1: onvif.activeMediaProfiles[1].profileToken,
        active: onvif.activeMediaProfile!.profileToken,
      });
    });
    await Promise.all(workers);

    for (const row of reads) {
      expect(['p1-main', 'p1-sub']).toContain(row.slot0);
      expect(['p2-main', 'p2-sub']).toContain(row.slot1);
      expect([row.slot0, row.slot1]).toContain(row.active);
      // Slots stay source-aligned: vs1 profiles never land in slot1 and vice versa.
      expect(row.slot0.startsWith('p1-')).toBe(true);
      expect(row.slot1.startsWith('p2-')).toBe(true);
    }
  });

  it('parallel multi-source work should pass explicit tokens (not rely on shared active bag)', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);
    const media = new Media(onvif);
    const imaging = new Imaging(onvif);

    const mediaTokens: string[] = [];
    const imagingTokens: string[] = [];
    jest.spyOn(media as any, 'request').mockImplementation(async (body: any) => {
      mediaTokens.push(body.GetStreamUri.ProfileToken);
      return { getStreamUriResponse: { mediaUri: { uri: 'rtsp://x' } } };
    });
    jest.spyOn(imaging as any, 'request').mockImplementation(async (body: any) => {
      imagingTokens.push(body.GetImagingSettings.VideoSourceToken);
      return { getImagingSettingsResponse: { imagingSettings: {} } };
    });

    // Correct pattern for concurrent multi-source: explicit tokens from activeMediaProfiles slots.
    await Promise.all([
      media.getStreamUri({ protocol: 'RTSP', profileToken: onvif.activeMediaProfiles[0].profileToken }),
      media.getStreamUri({ protocol: 'RTSP', profileToken: onvif.activeMediaProfiles[1].profileToken }),
      imaging.getImagingSettings({ videoSourceToken: onvif.activeMediaProfiles[0].videoSourceToken }),
      imaging.getImagingSettings({ videoSourceToken: onvif.activeMediaProfiles[1].videoSourceToken }),
      (async () => {
        setActiveMediaProfile(onvif, 'p1-sub');
        setActiveMediaProfile(onvif, 'p2-sub');
      })(),
    ]);

    expect(mediaTokens.sort()).toEqual(['p1-main', 'p2-main']);
    expect(imagingTokens.sort()).toEqual(['vs1', 'vs2']);
  });
});

describe('activeMediaProfile service SOAP token consistency', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('media / imaging / ptz / analytics omit-token calls use the active bag', async () => {
    const onvif = dualSourceOnvif();
    await getActiveMediaProfiles(onvif);
    onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
    onvif.uri.imaging = new URL('http://127.0.0.1/onvif/imaging');
    onvif.uri.ptz = new URL('http://127.0.0.1/onvif/ptz');
    onvif.uri.analytics = new URL('http://127.0.0.1/onvif/analytics');

    const media = new Media(onvif);
    const imaging = new Imaging(onvif);
    const ptz = new PTZ(onvif);
    const analytics = new Analytics(onvif);

    const mediaReq = jest.spyOn(media as any, 'request').mockResolvedValue({
      getVideoEncoderConfigurationResponse: { configuration: { token: 'vec1a' } },
      getStreamUriResponse: { mediaUri: { uri: 'rtsp://x' } },
    });
    const imagingReq = jest.spyOn(imaging as any, 'request').mockResolvedValue({
      getImagingSettingsResponse: { imagingSettings: { brightness: 1 } },
    });
    const ptzReq = jest.spyOn(ptz as any, 'request').mockResolvedValue({
      getConfigurationResponse: { PTZConfiguration: { token: 'ptz1' } },
      getStatusResponse: { PTZStatus: { position: {} } },
    });
    const analyticsReq = jest.spyOn(analytics as any, 'request').mockResolvedValue({
      getRulesResponse: { rule: [] },
    });

    await media.getVideoEncoderConfiguration();
    await media.getStreamUri({ protocol: 'RTSP' });
    await imaging.getImagingSettings();
    await ptz.getConfiguration();
    await ptz.getStatus();
    await analytics.getRules();

    expect(mediaReq.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining([
        { GetVideoEncoderConfiguration: { ConfigurationToken: 'vec1a' } },
        expect.objectContaining({
          GetStreamUri: expect.objectContaining({ ProfileToken: 'p1-main' }),
        }),
      ]),
    );
    expect(imagingReq.mock.calls.map((c) => c[0])).toContainEqual({
      GetImagingSettings: { VideoSourceToken: 'vs1' },
    });
    expect(ptzReq.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining([
        { GetConfiguration: { PTZConfigurationToken: 'ptz1' } },
        { GetStatus: { ProfileToken: 'p1-main' } },
      ]),
    );
    expect(analyticsReq.mock.calls.map((c) => c[0])).toContainEqual({
      GetRules: { ConfigurationToken: 'vac1' },
    });

    mediaReq.mockClear();
    imagingReq.mockClear();
    ptzReq.mockClear();
    analyticsReq.mockClear();

    setActiveMediaProfile(onvif, 'p2-main');
    expect(onvif.activeMediaProfile?.videoSourceToken).toBe('vs2');

    await media.getVideoEncoderConfiguration();
    await media.getStreamUri({ protocol: 'RTSP' });
    await imaging.getImagingSettings();
    await ptz.getConfiguration();
    await ptz.getStatus();
    await analytics.getRules();

    expect(mediaReq.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining([
        { GetVideoEncoderConfiguration: { ConfigurationToken: 'vec2a' } },
        expect.objectContaining({
          GetStreamUri: expect.objectContaining({ ProfileToken: 'p2-main' }),
        }),
      ]),
    );
    expect(imagingReq.mock.calls.map((c) => c[0])).toContainEqual({
      GetImagingSettings: { VideoSourceToken: 'vs2' },
    });
    expect(ptzReq.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining([
        { GetConfiguration: { PTZConfigurationToken: 'ptz2' } },
        { GetStatus: { ProfileToken: 'p2-main' } },
      ]),
    );
    expect(analyticsReq.mock.calls.map((c) => c[0])).toContainEqual({
      GetRules: { ConfigurationToken: 'vac2' },
    });
  });
});
