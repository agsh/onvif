import { Onvif } from '../src';
import { OnvifValidationError } from '../src/utils';
import { setActiveMediaProfile, activeMediaProfileFromProfile } from '../src/connection';
import happytimeOnvifOptions from './happytime.json';

/**
 * Happytime (after hydrate-profiles.sh) exposes two media profiles on one video source:
 * ProfileToken_1 → VideoEncoderConfigurationToken_1
 * ProfileToken_2 → VideoEncoderConfigurationToken_2
 * plus shared audio / analytics / metadata / PTZ configuration tokens.
 */

let cam: Onvif;

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

afterAll(async () => {
  // Leave the bag on ProfileToken_1 for other suites that share the process.
  if (cam?.profiles.some((p) => p.token === 'ProfileToken_1')) {
    await cam.setActiveMediaProfile('ProfileToken_1').catch(() => undefined);
  }
  await cam?.close().catch(() => undefined);
});

describe('activeMediaProfile (happytime)', () => {
  describe('connect fills the token bag', () => {
    it('selects ProfileToken_1 and copies all available configuration tokens', () => {
      expect(cam.profiles.map((p) => p.token)).toEqual(
        expect.arrayContaining(['ProfileToken_1', 'ProfileToken_2']),
      );
      expect(cam.videoSources.map((v) => v.token)).toContain('VideoSourceToken_1');
      expect(cam.activeMediaProfile).toMatchObject({
        profileToken: 'ProfileToken_1',
        sourceToken: 'VideoSourceToken_1',
        videoSourceToken: 'VideoSourceToken_1',
        videoSourceConfigurationToken: 'VideoSourceConfigurationToken_1',
        videoEncoderConfigurationToken: 'VideoEncoderConfigurationToken_1',
        audioSourceConfigurationToken: 'AudioSourceConfigurationToken_1',
        audioEncoderConfigurationToken: 'AudioEncoderConfigurationToken_1',
        videoAnalyticsConfigurationToken: 'VideoAnalyticsConfigurationToken_1',
        metadataConfigurationToken: 'MetadataConfigurationToken_1',
        ptzConfigurationToken: 'PTZConfigurationToken_1',
      });
      expect(cam.defaultProfile?.token).toBe('ProfileToken_1');
      expect(cam.activeMediaProfiles).toHaveLength(1);
    });

    it('keeps encoder metadata on defaultProfile, not on the bag', () => {
      expect(cam.activeMediaProfile).not.toHaveProperty('encoding');
      expect(cam.defaultProfile?.videoEncoderConfiguration?.encoding).toBe('H264');
      expect(cam.defaultProfile?.videoEncoderConfiguration?.token).toBe(
        cam.activeMediaProfile?.videoEncoderConfigurationToken,
      );
    });
  });

  describe('setActiveMediaProfile', () => {
    afterEach(async () => {
      await cam.setActiveMediaProfile('ProfileToken_1');
    });

    it('switches the bag to ProfileToken_2 (different video encoder token)', async () => {
      const bag = await cam.setActiveMediaProfile('ProfileToken_2');
      expect(bag.profileToken).toBe('ProfileToken_2');
      expect(bag.videoEncoderConfigurationToken).toBe('VideoEncoderConfigurationToken_2');
      expect(bag.videoSourceConfigurationToken).toBe('VideoSourceConfigurationToken_1');
      expect(cam.activeMediaProfile).toBe(bag);
      expect(cam.defaultProfile?.token).toBe('ProfileToken_2');
      expect(cam.defaultProfile?.videoEncoderConfiguration?.token).toBe(
        'VideoEncoderConfigurationToken_2',
      );
      expect(cam.activeMediaProfiles[0]?.profileToken).toBe('ProfileToken_2');
    });

    it('rejects an unknown profile token', async () => {
      await expect(cam.setActiveMediaProfile('ProfileToken_???')).rejects.toBeInstanceOf(
        OnvifValidationError,
      );
      await expect(cam.setActiveMediaProfile('ProfileToken_???')).rejects.toThrow(
        /Unknown media profile token/,
      );
      expect(cam.activeMediaProfile?.profileToken).toBe('ProfileToken_1');
    });

    it('rejects an empty profile token', async () => {
      await expect(cam.setActiveMediaProfile('')).rejects.toBeInstanceOf(OnvifValidationError);
    });
  });

  describe('service methods default tokens from the bag', () => {
    afterEach(async () => {
      await cam.setActiveMediaProfile('ProfileToken_1');
    });

    it('media get*Configuration omit configurationToken', async () => {
      const vsc = await cam.media.getVideoSourceConfiguration();
      const vec = await cam.media.getVideoEncoderConfiguration();
      const asc = await cam.media.getAudioSourceConfiguration();
      const aec = await cam.media.getAudioEncoderConfiguration();
      const vac = await cam.media.getVideoAnalyticsConfiguration();
      const meta = await cam.media.getMetadataConfiguration();

      expect(vsc.token).toBe('VideoSourceConfigurationToken_1');
      expect(vec.token).toBe('VideoEncoderConfigurationToken_1');
      expect(asc.token).toBe('AudioSourceConfigurationToken_1');
      expect(aec.token).toBe('AudioEncoderConfigurationToken_1');
      expect(vac.token).toBe('VideoAnalyticsConfigurationToken_1');
      expect(meta.token).toBe('MetadataConfigurationToken_1');
    });

    it('media stream / snapshot / OSD omit profile and configuration tokens', async () => {
      const stream = await cam.media.getStreamUri({ protocol: 'RTSP' });
      const snap = await cam.media.getSnapshotUri();
      const osd = await cam.media.getOSDOptions();

      expect(stream.uri).toMatch(/^rtsp:/i);
      expect(snap.uri).toMatch(/^https?:/i);
      expect(osd).toBeDefined();
    });

    it('media2 stream / snapshot / OSD omit tokens', async () => {
      expect(cam.uri.media2).toBeDefined();
      const stream = await cam.media2.getStreamUri({ protocol: 'RtspUnicast' });
      const snap = await cam.media2.getSnapshotUri();
      const osd = await cam.media2.getOSDOptions();

      expect(stream.uri).toMatch(/^rtsp:/i);
      expect(snap.uri).toMatch(/^https?:/i);
      expect(osd).toBeDefined();
    });

    it('analytics methods omit configurationToken', async () => {
      expect(cam.uri.analytics).toBeDefined();
      const supported = await cam.analytics.getSupportedRules();
      const rules = await cam.analytics.getRules();
      const modules = await cam.analytics.getAnalyticsModules();

      expect(supported.ruleDescription?.length).toBeGreaterThanOrEqual(1);
      expect(rules.length).toBeGreaterThanOrEqual(1);
      expect(modules.length).toBeGreaterThanOrEqual(1);
    });

    it('ptz status / configuration omit profile and PTZ configuration tokens', async () => {
      expect(cam.uri.ptz).toBeDefined();
      const status = await cam.ptz.getStatus();
      const configuration = await cam.ptz.getConfiguration();
      const options = await cam.ptz.getConfigurationOptions();

      expect(status).toHaveProperty('position');
      expect(configuration.token).toBe('PTZConfigurationToken_1');
      expect(options).toBeDefined();
    });

    it('imaging settings omit videoSourceToken', async () => {
      expect(cam.uri.imaging).toBeDefined();
      const settings = await cam.imaging.getImagingSettings();
      expect(settings).toHaveProperty('brightness');
    });

    it('thermal configuration omit videoSourceToken', async () => {
      expect(cam.uri.thermal).toBeDefined();
      const configuration = await cam.thermal.getConfiguration();
      const options = await cam.thermal.getConfigurationOptions();
      expect(configuration).toHaveProperty('polarity');
      expect(options).toBeDefined();
    });

    it('switching profile changes the default video encoder configuration', async () => {
      const vec1 = await cam.media.getVideoEncoderConfiguration();
      expect(vec1.token).toBe('VideoEncoderConfigurationToken_1');

      await cam.setActiveMediaProfile('ProfileToken_2');
      const vec2 = await cam.media.getVideoEncoderConfiguration();
      expect(vec2.token).toBe('VideoEncoderConfigurationToken_2');

      const stream = await cam.media.getStreamUri({ protocol: 'RTSP' });
      expect(stream.uri).toMatch(/^rtsp:/i);
    });
  });
});

describe('setActiveMediaProfile validation (unit)', () => {
  it('builds a bag from a profile via activeMediaProfileFromProfile', () => {
    const bag = activeMediaProfileFromProfile({
      token: 'p1',
      name: 'Main',
      videoSourceConfiguration: { token: 'vsc1', sourceToken: 'vs1', name: 's', useCount: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } },
      videoEncoderConfiguration: { token: 'vec1' } as never,
      audioSourceConfiguration: { token: 'asc1' } as never,
      PTZConfiguration: { token: 'ptz1', name: 'PTZ' } as never,
      extension: {
        audioOutputConfiguration: { token: 'aoc1' } as never,
      },
    });
    expect(bag).toEqual({
      sourceToken: 'vs1',
      profileToken: 'p1',
      videoSourceConfigurationToken: 'vsc1',
      videoSourceToken: 'vs1',
      videoEncoderConfigurationToken: 'vec1',
      audioSourceConfigurationToken: 'asc1',
      audioEncoderConfigurationToken: undefined,
      videoAnalyticsConfigurationToken: undefined,
      metadataConfigurationToken: undefined,
      audioOutputConfigurationToken: 'aoc1',
      audioDecoderConfigurationToken: undefined,
      ptzConfigurationToken: 'ptz1',
    });
  });

  it('throws when the profile has no video source token', () => {
    expect(() =>
      activeMediaProfileFromProfile({ token: 'p1', name: 'Empty' } as never),
    ).toThrow(/no VideoSourceConfiguration.sourceToken/);
  });

  it('throws when profileToken is unknown on the device', () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.profiles = [
      {
        token: 'p1',
        name: 'Main',
        videoSourceConfiguration: {
          token: 'vsc1',
          sourceToken: 'vs1',
          name: 's',
          useCount: 1,
          bounds: { x: 0, y: 0, width: 1, height: 1 },
        },
      } as never,
    ];
    onvif.videoSources = [{ token: 'vs1' } as never];
    expect(() => setActiveMediaProfile(onvif, 'missing')).toThrow(/Unknown media profile token/);
  });

  it('throws when the profile references a video source not in videoSources', () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.profiles = [
      {
        token: 'p1',
        name: 'Main',
        videoSourceConfiguration: {
          token: 'vsc1',
          sourceToken: 'vs-other',
          name: 's',
          useCount: 1,
          bounds: { x: 0, y: 0, width: 1, height: 1 },
        },
      } as never,
    ];
    onvif.videoSources = [{ token: 'vs1' } as never];
    expect(() => setActiveMediaProfile(onvif, 'p1')).toThrow(/unknown video source/);
  });

  it('updates activeMediaProfile and the matching activeMediaProfiles slot', () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const p1 = {
      token: 'p1',
      name: 'Main',
      videoSourceConfiguration: {
        token: 'vsc1',
        sourceToken: 'vs1',
        name: 's',
        useCount: 1,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      },
      videoEncoderConfiguration: { token: 'vec1' },
    } as never;
    const p2 = {
      token: 'p2',
      name: 'Sub',
      videoSourceConfiguration: {
        token: 'vsc1',
        sourceToken: 'vs1',
        name: 's',
        useCount: 1,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      },
      videoEncoderConfiguration: { token: 'vec2' },
    } as never;
    onvif.profiles = [p1, p2];
    onvif.videoSources = [{ token: 'vs1' } as never];
    setActiveMediaProfile(onvif, 'p1');
    expect(onvif.activeMediaProfile?.videoEncoderConfigurationToken).toBe('vec1');
    setActiveMediaProfile(onvif, 'p2');
    expect(onvif.activeMediaProfile?.profileToken).toBe('p2');
    expect(onvif.activeMediaProfile?.videoEncoderConfigurationToken).toBe('vec2');
    expect(onvif.defaultProfile?.token).toBe('p2');
    expect(onvif.activeMediaProfiles).toHaveLength(1);
    expect(onvif.activeMediaProfiles[0]?.videoEncoderConfigurationToken).toBe('vec2');
  });

  it('deviceIO getVideoSourceConfiguration defaults VideoSourceToken from the bag', async () => {
    // Happytime does not implement DeviceIO GetVideoSourceConfiguration; assert the SOAP body instead.
    const DeviceIO = (await import('../src/deviceio')).default;
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.activeMediaProfile = {
      sourceToken: 'vs1',
      profileToken: 'p1',
      videoSourceConfigurationToken: 'vsc1',
      videoSourceToken: 'vs1',
    };
    const deviceIO = new DeviceIO(onvif);
    const request = jest.spyOn(deviceIO as any, 'request').mockResolvedValue({
      getVideoSourceConfigurationResponse: {
        videoSourceConfiguration: {
          token: 'vsc1',
          name: 'vs',
          useCount: 1,
          sourceToken: 'vs1',
          bounds: { x: 0, y: 0, width: 1, height: 1 },
        },
      },
    });

    await deviceIO.getVideoSourceConfiguration();
    expect(request).toHaveBeenCalledWith({
      GetVideoSourceConfiguration: { VideoSourceToken: 'vs1' },
    });
  });
});
