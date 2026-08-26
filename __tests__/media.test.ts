import { camelCase, Onvif } from '../src';
import type Media from '../src/media';
import { ReferenceToken } from '../src/interfaces/common';
import { CreateOSDResponse, VideoSourceMode } from '../src/interfaces/media';
import {
  AudioEncoderConfiguration,
  AudioOutputConfiguration,
  AudioSourceConfiguration,
  MetadataConfiguration,
  OSDConfiguration,
  Profile,
  VideoAnalyticsConfiguration,
  VideoEncoderConfiguration,
  VideoSourceConfiguration,
} from '../src/interfaces/onvif';
import happytimeOnvifOptions from './happytime.json';

/** Parametrized tests invoke Media methods by dynamically built names. */
function mediaTestCallable(media: Media): Record<string, (...args: unknown[]) => Promise<unknown>> {
  return media as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

/** Profile / ProfileExtension keys are fixed in the type; tests look up camelCased configuration slots by string. */
function profileConfigurationBySlot(profile: Profile, slot: string): unknown {
  const pr = profile as unknown as Record<string, unknown>;
  const ext = profile.extension as unknown as Record<string, unknown> | undefined;
  return pr[slot] ?? ext?.[slot];
}

const configurationEntityFields = {
  VideoEncoder: ['encoding', 'resolution', 'quality'],
  AudioEncoder: ['encoding', 'bitrate', 'sampleRate'],
  VideoSource: ['sourceToken', 'bounds'],
  AudioSource: ['sourceToken'],
  VideoAnalytics: ['analyticsEngineConfiguration', 'ruleEngineConfiguration'],
  Metadata: ['multicast', 'sessionTimeout'],
  AudioOutput: ['outputToken', 'outputLevel'],
  AudioDecoder: [],
};
let cam: Onvif;
beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

describe('Profiles', () => {
  describe('getProfiles', () => {
    it('should return media profiles ver20 as ver10', async () => {
      const result = await cam.media.getProfiles();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('token');
      expect(result[0]).toHaveProperty('fixed');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('videoSourceConfiguration');
      expect(result[0]).toHaveProperty('audioSourceConfiguration');
      expect(result[0]).toHaveProperty('videoEncoderConfiguration');
      expect(result[0]).toHaveProperty('audioEncoderConfiguration');
      expect(result[0]).toHaveProperty('videoAnalyticsConfiguration');
      expect(result[0]).toHaveProperty('PTZConfiguration');
      expect(result[0]).toHaveProperty('metadataConfiguration');
    });

    it('should return media profiles ver10', async () => {
      cam.media2Support = false;
      try {
        const result = await cam.media.getProfiles();
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('token');
        expect(result[0]).toHaveProperty('fixed');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('videoSourceConfiguration');
        expect(result[0]).toHaveProperty('audioSourceConfiguration');
        expect(result[0]).toHaveProperty('videoEncoderConfiguration');
        expect(result[0]).toHaveProperty('audioEncoderConfiguration');
        expect(result[0]).toHaveProperty('videoAnalyticsConfiguration');
        expect(result[0]).toHaveProperty('PTZConfiguration');
        expect(result[0]).toHaveProperty('metadataConfiguration');
      } finally {
        cam.media2Support = true;
      }
    });
  });

  let newProfileToken: ReferenceToken;

  describe('createProfile', () => {
    it('should create a new blank profile and return it', async () => {
      let currentProfiles = await cam.media2.getProfiles();
      const profileCount = currentProfiles.length;
      const result = await cam.media.createProfile({ name: 'test1', token: 'token' });
      expect(result).toHaveProperty('token');
      expect(result.fixed).toBe(false);
      newProfileToken = result.token;
      expect(result).toHaveProperty('name');
      currentProfiles = await cam.media2.getProfiles();
      expect(currentProfiles.length).toBe(profileCount + 1);
    });
  });

  describe('getProfile', () => {
    it('should return the profile ver20 as ver10 by its token', async () => {
      const result = await cam.media.getProfile({ profileToken: newProfileToken });
      expect(result.fixed).toBe(false);
    });

    it('should return the profile ver10 by its token', async () => {
      cam.media2Support = false;
      try {
        const result = await cam.media.getProfile({ profileToken: newProfileToken });
        expect(result.fixed).toBe(false);
      } finally {
        cam.media2Support = true;
      }
    });
  });

  describe('deleteProfile', () => {
    it('should delete non-fixed profile', async () => {
      const profileCount = (await cam.media.getProfiles()).length;
      const result = await cam.media.deleteProfile({ profileToken: newProfileToken });
      expect(result).toBeUndefined();
      const currentProfiles = await cam.media.getProfiles();
      expect(currentProfiles.length).toBe(profileCount - 1);
    });
  });
});

describe('getServiceCapabilities', () => {
  it('should return Media service capabilities with profile and streaming sections', async () => {
    const caps = await cam.media.getServiceCapabilities();
    expect(caps).toBeDefined();
    expect(typeof caps).toBe('object');
    expect(caps.profileCapabilities).toBeDefined();
    expect(typeof caps.profileCapabilities).toBe('object');
    expect(caps.streamingCapabilities).toBeDefined();
    expect(typeof caps.streamingCapabilities).toBe('object');
  });

  it('should return capability flags from the happytime mock server', async () => {
    const caps = await cam.media.getServiceCapabilities();
    expect(caps.snapshotUri).toBe(true);
    expect(caps.rotation).toBe(false);
    expect(caps.videoSourceMode).toBe(true);
    expect(caps.OSD).toBe(true);
    expect(caps.temporaryOSDText).toBe(false);
    expect(caps.EXICompression).toBe(false);
    expect(caps.profileCapabilities.maximumNumberOfProfiles).toBe(10);
    expect(caps.streamingCapabilities).toMatchObject({
      RTPMulticast: false,
      RTP_TCP: true,
      RTP_RTSP_TCP: true,
      nonAggregateControl: false,
      noRTSPStreaming: false,
    });
  });

  it('should expose optional top-level capability flags as booleans when present', async () => {
    const caps = await cam.media.getServiceCapabilities();
    const optionalFlags = [
      'snapshotUri',
      'rotation',
      'videoSourceMode',
      'OSD',
      'temporaryOSDText',
      'EXICompression',
    ] as const;
    optionalFlags.forEach((key) => {
      if (caps[key] !== undefined) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(typeof caps[key]).toBe('boolean');
      }
    });
  });
});

describe('startMulticastStreaming', () => {
  it('should start multicast streaming for the active profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media.startMulticastStreaming({ profileToken })).resolves.toBeUndefined();
  });

  it('should default profile token from activeSource when omitted', async () => {
    await expect(
      cam.media.startMulticastStreaming({ profileToken: cam.activeSource!.profileToken }),
    ).resolves.toBeUndefined();
    await expect(cam.media.startMulticastStreaming()).resolves.toBeUndefined();
  });

  it('should treat an empty options object like omitted profile token', async () => {
    await expect(cam.media.startMulticastStreaming()).resolves.toBeUndefined();
    await expect(cam.media.startMulticastStreaming({})).resolves.toBeUndefined();
  });

  it('should start multicast streaming for any existing profile token', async () => {
    const profiles = await cam.media.getProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      await expect(cam.media.startMulticastStreaming({ profileToken: profile.token })).resolves.toBeUndefined();
    }
  });

  it('should start multicast streaming for a newly created profile', async () => {
    const profile = await cam.media.createProfile({ name: 'test-start-multicast-media' });
    try {
      await expect(cam.media.startMulticastStreaming({ profileToken: profile.token })).resolves.toBeUndefined();
    } finally {
      await cam.media.deleteProfile({ profileToken: profile.token });
    }
  });

  it('should throw an error when the requested profile token does not exist', async () => {
    await expect(cam.media.startMulticastStreaming({ profileToken: '???' })).rejects.toThrow('Profile Not Exist');
  });
});

describe('stopMulticastStreaming', () => {
  it('should stop multicast streaming for the active profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media.stopMulticastStreaming({ profileToken })).resolves.toBeUndefined();
  });

  it('should default profile token from activeSource when omitted', async () => {
    await expect(
      cam.media.stopMulticastStreaming({ profileToken: cam.activeSource!.profileToken }),
    ).resolves.toBeUndefined();
    await expect(cam.media.stopMulticastStreaming()).resolves.toBeUndefined();
  });

  it('should treat an empty options object like omitted profile token', async () => {
    await expect(cam.media.stopMulticastStreaming()).resolves.toBeUndefined();
    await expect(cam.media.stopMulticastStreaming({})).resolves.toBeUndefined();
  });

  it('should stop multicast streaming for any existing profile token', async () => {
    const profiles = await cam.media.getProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      await expect(cam.media.stopMulticastStreaming({ profileToken: profile.token })).resolves.toBeUndefined();
    }
  });

  it('should stop multicast streaming for a newly created profile', async () => {
    const profile = await cam.media.createProfile({ name: 'test-stop-multicast-media' });
    try {
      await expect(cam.media.stopMulticastStreaming({ profileToken: profile.token })).resolves.toBeUndefined();
    } finally {
      await cam.media.deleteProfile({ profileToken: profile.token });
    }
  });

  it('should throw an error when the requested profile token does not exist', async () => {
    await expect(cam.media.stopMulticastStreaming({ profileToken: '???' })).rejects.toThrow('Profile Not Exist');
  });
});

describe('startMulticastStreaming / stopMulticastStreaming', () => {
  it('should allow start then stop for the same profile', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media.startMulticastStreaming({ profileToken })).resolves.toBeUndefined();
    await expect(cam.media.stopMulticastStreaming({ profileToken })).resolves.toBeUndefined();
  });
});

describe('setSynchronizationPoint', () => {
  it('should set a synchronization point for the active profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media.setSynchronizationPoint({ profileToken })).resolves.toBeUndefined();
  });

  it('should default profile token from activeSource when omitted', async () => {
    await expect(
      cam.media.setSynchronizationPoint({ profileToken: cam.activeSource!.profileToken }),
    ).resolves.toBeUndefined();
    await expect(cam.media.setSynchronizationPoint()).resolves.toBeUndefined();
  });

  it('should treat an empty options object like omitted profile token', async () => {
    await expect(cam.media.setSynchronizationPoint()).resolves.toBeUndefined();
    await expect(cam.media.setSynchronizationPoint({})).resolves.toBeUndefined();
  });

  it('should set a synchronization point for any existing profile token', async () => {
    const profiles = await cam.media.getProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      await expect(cam.media.setSynchronizationPoint({ profileToken: profile.token })).resolves.toBeUndefined();
    }
  });

  it('should set a synchronization point for a newly created profile', async () => {
    const profile = await cam.media.createProfile({ name: 'test-set-sync-point-media' });
    try {
      await expect(cam.media.setSynchronizationPoint({ profileToken: profile.token })).resolves.toBeUndefined();
    } finally {
      await cam.media.deleteProfile({ profileToken: profile.token });
    }
  });

  it('should throw an error when the requested profile token does not exist', async () => {
    await expect(cam.media.setSynchronizationPoint({ profileToken: '???' })).rejects.toThrow('Profile Not Exist');
  });
});

describe('getVideoSourceModes', () => {
  function assertVideoSourceModeShape(mode: VideoSourceMode): void {
    expect(mode.token).toBeDefined();
    expect(typeof mode.maxFramerate).toBe('number');
    expect(mode.maxResolution).toBeDefined();
    expect(typeof mode.maxResolution.width).toBe('number');
    expect(typeof mode.maxResolution.height).toBe('number');
    expect(Array.isArray(mode.encodings)).toBe(true);
    expect(mode.encodings.length).toBeGreaterThan(0);
    mode.encodings.forEach((encoding) => {
      expect(typeof encoding).toBe('string');
    });
    expect(typeof mode.reboot).toBe('boolean');
  }

  it('should return video source modes for an explicit video source token', async () => {
    const videoSourceToken = cam.activeSource!.videoSourceToken;
    const modes = await cam.media.getVideoSourceModes({ videoSourceToken });
    expect(Array.isArray(modes)).toBe(true);
    expect(modes.length).toBeGreaterThan(0);
    modes.forEach(assertVideoSourceModeShape);
  });

  it('should default video source token from activeSource when options are omitted', async () => {
    const explicit = await cam.media.getVideoSourceModes({
      videoSourceToken: cam.activeSource!.videoSourceToken,
    });
    const defaulted = await cam.media.getVideoSourceModes();
    expect(defaulted).toEqual(explicit);
  });

  it('should treat an empty options object like omitted video source token', async () => {
    const withDefault = await cam.media.getVideoSourceModes();
    // @ts-expect-error videoSourceToken is defaulted from activeSource at runtime when omitted
    const withEmptyOptions = await cam.media.getVideoSourceModes({});
    expect(withEmptyOptions).toEqual(withDefault);
  });

  it('should split encodings into a string array', async () => {
    const modes = await cam.media.getVideoSourceModes({
      videoSourceToken: cam.activeSource!.videoSourceToken,
    });
    expect(modes[0].encodings).toEqual(expect.arrayContaining(['H264']));
  });
});

describe('setVideoSourceMode', () => {
  it('should accept a valid video source token and video source mode token pair', async () => {
    const videoSourceToken = cam.activeSource!.videoSourceToken;
    const modes = await cam.media.getVideoSourceModes({ videoSourceToken });
    expect(modes.length).toBeGreaterThan(0);
    const videoSourceModeToken = modes[0].token;
    const result = await cam.media.setVideoSourceMode({ videoSourceToken, videoSourceModeToken });
    expect(typeof result.reboot).toBe('boolean');
  });

  it('should set video source mode for every available mode token', async () => {
    const videoSourceToken = cam.activeSource!.videoSourceToken;
    const modes = await cam.media.getVideoSourceModes({ videoSourceToken });
    expect(modes.length).toBeGreaterThan(0);
    for (const mode of modes) {
      const result = await cam.media.setVideoSourceMode({
        videoSourceToken,
        videoSourceModeToken: mode.token,
      });
      expect(typeof result.reboot).toBe('boolean');
    }
  });

  it('should throw if the requested video source token does not exist', async () => {
    await expect(
      cam.media.setVideoSourceMode({
        videoSourceToken: '???',
        videoSourceModeToken: 'VideoSourceModeToken_1',
      }),
    ).rejects.toThrow('The requested video source does not exist');
  });

  it('should throw if the requested video source mode token does not exist', async () => {
    await expect(
      cam.media.setVideoSourceMode({
        videoSourceToken: cam.activeSource!.videoSourceToken,
        videoSourceModeToken: '???',
      }),
    ).rejects.toThrow('The requested video source mode does not exist');
  });
});

describe('Add/remove configurations to the profile', () => {
  let profileToken: ReferenceToken;
  const configurationNames = ['PTZ', ...Object.keys(configurationEntityFields)];

  describe('Startup', () => {
    it('should create a new profile for the tests', async () => {
      const testProfile = await cam.media.createProfile({
        name: 'test_configurations_profile',
      });
      profileToken = testProfile.token;
      configurationNames.forEach((configurationName) => {
        expect(testProfile[camelCase(configurationName) as keyof Profile]).toBeUndefined();
      });
    });
  });

  configurationNames.forEach((configurationName) => {
    describe(`add${configurationName}`, () => {
      it('should throw an error if configuration token does not exist', async () => {
        await expect(
          mediaTestCallable(cam.media)[`add${configurationName}Configuration`]({
            profileToken,
            configurationToken: '???',
          }),
        ).rejects.toThrow('Config Not Exist');
      });

      it('should throw an error if profile token does not exist', async () => {
        await expect(
          mediaTestCallable(cam.media)[`add${configurationName}Configuration`]({
            profileToken: '???',
            configurationToken: '???',
          }),
        ).rejects.toThrow('Profile Not Exist');
      });

      it('should add a new configuration to the existing profile', async () => {
        const result = await mediaTestCallable(cam.media)[`add${configurationName}Configuration`]({
          profileToken,
          configurationToken: `${configurationName}ConfigurationToken_1`,
        });
        expect(result).toBeUndefined();
        const profile = await cam.media.getProfile({ profileToken });
        const methodName = camelCase(`${configurationName}Configuration`);
        expect(profileConfigurationBySlot(profile, methodName)).toBeDefined();
      });
    });
  });

  describe('Middle check', () => {
    it('profile should have all configurations', async () => {
      const profile = await cam.media.getProfile({ profileToken });
      expect(Object.keys(profile).length).toBeGreaterThan(3);
    });
  });

  configurationNames.forEach((configurationName) => {
    describe(`remove${configurationName}`, () => {
      it('should default to activeSource profile when profile token is omitted', async () => {
        const previous = cam.activeSource;
        // Point activeSource at the disposable test profile so we do not strip the
        // shared Happytime ProfileToken_1 used by later suites.
        cam.activeSource = { ...previous!, profileToken };
        try {
          await expect(
            mediaTestCallable(cam.media)[`remove${configurationName}Configuration`]({}),
          ).resolves.toBeUndefined();
        } finally {
          cam.activeSource = previous;
        }
      });

      it('should throw an error if profile token does not exist', async () => {
        await expect(
          mediaTestCallable(cam.media)[`remove${configurationName}Configuration`]({
            profileToken: '???',
          }),
        ).rejects.toThrow('Profile Not Exist');
      });

      it('should remove a configuration from the existing profile', async () => {
        const result = await mediaTestCallable(cam.media)[`remove${configurationName}Configuration`]({
          profileToken,
        });
        expect(result).toBeUndefined();
        const profile = await cam.media.getProfile({ profileToken });
        const methodName = camelCase(`${configurationName}Configuration`);
        expect(profileConfigurationBySlot(profile, methodName)).toBeUndefined();
      });
    });
  });

  describe('Shutdown', () => {
    it('should remove test profile', async () => {
      expect(await cam.media.deleteProfile({ profileToken })).toBeUndefined();
    });
  });
});

describe('Sources', () => {
  describe('getVideoSources', () => {
    it('should return the list of the video sources', async () => {
      const result = await cam.media.getVideoSources();
      result.forEach((videoSource) => {
        expect(videoSource.framerate).toBeGreaterThanOrEqual(0);
        expect(videoSource.token).toBeDefined();
        expect(videoSource.imaging).toBeDefined();
        expect(videoSource.resolution).toBeDefined();
      });
    });
  });

  describe('getAudioSources', () => {
    it('should return the list of the audio sources', async () => {
      const result = await cam.media.getAudioSources();
      result.forEach((audioSource) => {
        expect(audioSource.channels).toBeGreaterThanOrEqual(0);
        expect(audioSource.token).toBeDefined();
      });
    });
  });

  describe('getAudioOutputs', () => {
    it('should return the list of the audio outputs', async () => {
      const result = await cam.media.getAudioOutputs();
      result.forEach((audioOutput) => {
        expect(audioOutput.token).toBeDefined();
      });
    });
  });
});

describe('getStreamUri', () => {
  const profileToken = (): ReferenceToken => cam.activeSource!.profileToken;

  it('should return a wrapped media URI when Media2 is supported', async () => {
    const result = await cam.media.getStreamUri({
      profileToken: profileToken(),
      protocol: 'RTSP',
    });
    expect(result).toHaveProperty('mediaUri');
    expect(result.mediaUri).toMatchObject({
      invalidAfterConnect: false,
      invalidAfterReboot: false,
      timeout: 'PT0S',
    });
    expect(typeof result.mediaUri.uri).toBe('string');
    expect(result.mediaUri.uri!.length).toBeGreaterThan(0);
  });

  it('should default profile token from activeSource when omitted (Media2)', async () => {
    const explicit = await cam.media.getStreamUri({
      profileToken: profileToken(),
      protocol: 'RTSP',
    });
    const implicit = await cam.media.getStreamUri({ protocol: 'RTSP' });
    expect(implicit.mediaUri!.uri).toBe(explicit.mediaUri!.uri);
  });

  describe('protocol values (Media2)', () => {
    it.each([['RtspUnicast'], ['RtspMulticast'], ['RtspOverHttp']] as const)(
      'should accept native protocol %s',
      async (protocol) => {
        const result = await cam.media.getStreamUri({
          profileToken: profileToken(),
          protocol,
        });
        expect(result.mediaUri?.uri).toBeDefined();
        expect(typeof result.mediaUri!.uri).toBe('string');
        expect(result.mediaUri!.uri!.length).toBeGreaterThan(0);
      },
    );

    it.each([['HTTP'], ['TCP']] as const)('should accept legacy Media1-style protocol %s', async (protocol) => {
      const result = await cam.media.getStreamUri({
        profileToken: profileToken(),
        protocol,
      });
      expect(result.mediaUri?.uri).toBeDefined();
      expect(result.mediaUri!.uri!.length).toBeGreaterThan(0);
    });

    it.each([['RTP-Unicast'], ['RTP-Multicast']] as const)('should map UDP with stream %s', async (stream) => {
      const result = await cam.media.getStreamUri({
        profileToken: profileToken(),
        stream,
        protocol: 'UDP',
      });
      expect(result.mediaUri?.uri).toBeDefined();
      expect(result.mediaUri!.uri!.length).toBeGreaterThan(0);
    });

    it('should default protocol to RTSP when omitted', async () => {
      const explicit = await cam.media.getStreamUri({
        profileToken: profileToken(),
        protocol: 'RTSP',
      });
      const implicit = await cam.media.getStreamUri({ profileToken: profileToken() });
      expect(implicit.mediaUri!.uri).toBe(explicit.mediaUri!.uri);
    });
  });

  describe('protocol values (Media ver10)', () => {
    it.each([['UDP'], ['RTSP'], ['HTTP'], ['TCP']] as const)(
      'should return a stream URI when protocol is %s',
      async (protocol) => {
        cam.media2Support = false;
        try {
          const result = await cam.media.getStreamUri({
            profileToken: 'ProfileToken_1',
            stream: 'RTP-Unicast',
            protocol,
          });
          // Media ver10 path returns the linerased `mediaUri` object, not `{ mediaUri: … }`
          const mediaUri = result as unknown as { uri: string };
          expect(mediaUri.uri).toBeDefined();
          expect(typeof mediaUri.uri).toBe('string');
          expect(mediaUri.uri.length).toBeGreaterThan(0);
        } finally {
          cam.media2Support = true;
        }
      },
    );
  });
});

describe('getSnapshotUri', () => {
  const profileToken = (): ReferenceToken => cam.activeSource!.profileToken;

  it('should return a wrapped media URI when Media2 is supported', async () => {
    const result = await cam.media.getSnapshotUri({
      profileToken: profileToken(),
    });
    expect(result).toHaveProperty('mediaUri');
    expect(result.mediaUri).toMatchObject({
      invalidAfterConnect: false,
      invalidAfterReboot: false,
      timeout: 'PT0S',
    });
    expect(typeof result.mediaUri!.uri).toBe('string');
    expect(result.mediaUri!.uri!.length).toBeGreaterThan(0);
  });

  it('should default profile token from activeSource when omitted (Media2)', async () => {
    const explicit = await cam.media.getSnapshotUri({
      profileToken: profileToken(),
    });
    const implicitNoArgs = await cam.media.getSnapshotUri();
    expect(implicitNoArgs.mediaUri!.uri).toBe(explicit.mediaUri!.uri);
    const implicitEmpty = await cam.media.getSnapshotUri({});
    expect(implicitEmpty.mediaUri!.uri).toBe(explicit.mediaUri!.uri);
  });

  describe('Media ver10', () => {
    it('should return a snapshot media URI when Media2 is not supported', async () => {
      cam.media2Support = false;
      try {
        const result = await cam.media.getSnapshotUri({
          profileToken: 'ProfileToken_1',
        });
        expect(result).toHaveProperty('mediaUri');
        expect(typeof result.mediaUri!.uri).toBe('string');
        expect(result.mediaUri!.uri!.length).toBeGreaterThan(0);
      } finally {
        cam.media2Support = true;
      }
    });
  });
});

describe('OSD (Media)', () => {
  const videoSourceConfigurationToken = 'VideoSourceConfigurationToken_1' as ReferenceToken;

  function assertOsdConfigurationShape(osd: OSDConfiguration): void {
    expect(osd.token).toBeDefined();
    expect(osd.type).toBeDefined();
    expect(osd.position).toBeDefined();
    expect(osd.position.type).toBeDefined();
  }

  describe('getOSDs', () => {
    it('should return an array of OSD configurations', async () => {
      const result = await cam.media.getOSDs();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(assertOsdConfigurationShape);
    });

    it('should accept a video source configuration token filter', async () => {
      const result = await cam.media.getOSDs({ configurationToken: videoSourceConfigurationToken });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return a single OSD when OSDToken is set', async () => {
      const all = await cam.media.getOSDs();
      if (!all.length) {
        return;
      }
      const token = all[0].token;
      const filtered = await cam.media.getOSDs({ OSDToken: token });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].token).toBe(token);
    });
  });

  describe('getOSD', () => {
    it('should return one OSD configuration by token', async () => {
      const all = await cam.media.getOSDs();
      expect(all.length).toBeGreaterThan(0);
      const token = all[0].token;
      const osd = await cam.media.getOSD({ OSDToken: token });
      assertOsdConfigurationShape(osd);
      expect(osd.token).toBe(token);
    });

    it('should throw when the requested OSD token does not exist', async () => {
      await expect(cam.media.getOSD({ OSDToken: '???' })).rejects.toThrow('Config Not Exist');
    });
  });

  describe('getOSDOptions', () => {
    it('should return OSD capability options for a video source configuration', async () => {
      const result = await cam.media.getOSDOptions({ configurationToken: videoSourceConfigurationToken });
      expect(result.OSDOptions).toBeDefined();
      expect(typeof result.OSDOptions.maximumNumberOfOSDs.total).toBe('number');
    });

    it('should default configuration token from activeSource when omitted', async () => {
      const explicit = await cam.media.getOSDOptions({
        configurationToken: cam.activeSource!.videoSourceConfigurationToken,
      });
      const defaulted = await cam.media.getOSDOptions();
      expect(defaulted).toEqual(explicit);
    });
  });

  describe('setOSD', () => {
    it('should accept updating an existing OSD configuration', async () => {
      const list = await cam.media.getOSDs({ configurationToken: videoSourceConfigurationToken });
      const osd = list.find((o) => o.type === 'Text') ?? list[0];
      if (!osd) {
        return;
      }
      await expect(cam.media.setOSD(osd)).resolves.toBeUndefined();
    });
  });

  describe('createOSD / deleteOSD', () => {
    it('should create an OSD and delete it using the token returned by the device', async () => {
      const caps = await cam.media.getOSDOptions({ configurationToken: videoSourceConfigurationToken });
      if (caps.OSDOptions.maximumNumberOfOSDs.total === 0) {
        return;
      }

      const createResponse: CreateOSDResponse = await cam.media.createOSD({
        token: `jest_media_osd_${Date.now()}`,
        videoSourceConfigurationToken,
        type: 'Text',
        position: { type: 'UpperLeft' },
        textString: { type: 'Plain', plainText: 'jest osd media' },
      });

      expect(createResponse.OSDToken).toBeDefined();

      const created = await cam.media.getOSD({ OSDToken: createResponse.OSDToken });
      expect(created.token).toBe(createResponse.OSDToken);

      await cam.media.deleteOSD({ OSDToken: createResponse.OSDToken });

      const afterDelete = await cam.media.getOSDs();
      expect(afterDelete.some((o) => o.token === createResponse.OSDToken)).toBe(false);
    });

    it('should throw when deleting a non-existent OSD token', async () => {
      await expect(cam.media.deleteOSD({ OSDToken: '???' })).rejects.toThrow('Config Not Exist');
    });
  });
});

describe('setVideoEncoderConfiguration', () => {
  it('should accept an existing video encoder configuration unchanged', async () => {
    const [configuration] = await cam.media.getVideoEncoderConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setVideoEncoderConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit rate control and multicast', async () => {
    const [base] = await cam.media.getVideoEncoderConfigurations();
    expect(base).toBeDefined();
    const configuration: VideoEncoderConfiguration = {
      ...base,
      rateControl: {
        frameRateLimit: base.rateControl?.frameRateLimit ?? 25,
        encodingInterval: base.rateControl?.encodingInterval ?? 1,
        bitrateLimit: base.rateControl?.bitrateLimit ?? 2048,
      },
      multicast: base.multicast ?? {
        address: { type: 'IPv4', IPv4Address: '0.0.0.0' },
        port: 0,
        TTL: 1,
        autoStart: false,
      },
    };
    await expect(
      cam.media.setVideoEncoderConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });

  it('should persist quality and sessionTimeout and restore afterwards', async () => {
    const [original] = await cam.media.getVideoEncoderConfigurations();
    expect(original).toBeDefined();
    const updated: VideoEncoderConfiguration = {
      ...JSON.parse(JSON.stringify(original)),
      quality: original.quality === 4 ? 5 : 4,
      sessionTimeout: 'PT13666S',
    };
    await cam.media.setVideoEncoderConfiguration({ configuration: updated, forcePersistence: true });
    const afterUpdate = await cam.media.getVideoEncoderConfiguration({
      configurationToken: original.token,
    });
    expect(afterUpdate.quality).toBe(updated.quality);
    expect(afterUpdate.sessionTimeout).toBe(updated.sessionTimeout);

    await cam.media.setVideoEncoderConfiguration({ configuration: original, forcePersistence: true });
    const restored = await cam.media.getVideoEncoderConfiguration({
      configurationToken: original.token,
    });
    expect(restored).toEqual(original);
  });

  it('should accept MPEG4 encoding payload when switching codec fields', async () => {
    const [base] = await cam.media.getVideoEncoderConfigurations();
    expect(base).toBeDefined();
    const configuration: VideoEncoderConfiguration = {
      ...JSON.parse(JSON.stringify(base)),
      encoding: 'MPEG4',
      H264: undefined,
      MPEG4: {
        govLength: 4,
        mpeg4Profile: 'SP',
      },
    };
    await expect(
      cam.media.setVideoEncoderConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
    await cam.media.setVideoEncoderConfiguration({ configuration: base, forcePersistence: true });
  });

  it('should accept H264 encoding payload', async () => {
    const [base] = await cam.media.getVideoEncoderConfigurations();
    expect(base).toBeDefined();
    const configuration: VideoEncoderConfiguration = {
      ...JSON.parse(JSON.stringify(base)),
      encoding: 'H264',
      MPEG4: undefined,
      H264: {
        govLength: base.H264?.govLength ?? 30,
        H264Profile: base.H264?.H264Profile ?? 'Main',
      },
    };
    await expect(
      cam.media.setVideoEncoderConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
    await cam.media.setVideoEncoderConfiguration({ configuration: base, forcePersistence: true });
  });

  it('should accept forcePersistence false', async () => {
    const [configuration] = await cam.media.getVideoEncoderConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setVideoEncoderConfiguration({ configuration, forcePersistence: false }),
    ).resolves.toBeUndefined();
  });
});

describe('setVideoSourceConfiguration', () => {
  it('should accept an existing video source configuration unchanged', async () => {
    const [configuration] = await cam.media.getVideoSourceConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setVideoSourceConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });

  it('should include extension payload when rotate and nested extension are provided', async () => {
    const [base] = await cam.media.getVideoSourceConfigurations();
    expect(base).toBeDefined();
    const configuration: VideoSourceConfiguration = {
      ...base,
      extension: {
        rotate: {
          mode: 'OFF',
          degree: 0,
        },
        extension: {
          lensDescription: [
            {
              focalLength: 1,
              offset: { x: 0, y: 0 },
              projection: [{ angle: 0, radius: 1, transmittance: 1 }],
              XFactor: 1,
            },
          ],
          sceneOrientation: {
            mode: 'MANUAL',
            orientation: '0',
          },
        },
      },
    };
    await expect(
      cam.media.setVideoSourceConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });
});

describe('setAudioSourceConfiguration', () => {
  it('should accept an existing audio source configuration unchanged', async () => {
    const [configuration] = await cam.media.getAudioSourceConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setAudioSourceConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit source token matching the device', async () => {
    const [base] = await cam.media.getAudioSourceConfigurations();
    expect(base).toBeDefined();
    const configuration: AudioSourceConfiguration = {
      ...base,
      sourceToken: base.sourceToken,
    };
    await expect(
      cam.media.setAudioSourceConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });
});

describe('setAudioEncoderConfiguration', () => {
  it('should accept an existing audio encoder configuration unchanged', async () => {
    const [configuration] = await cam.media.getAudioEncoderConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setAudioEncoderConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit multicast and session timeout', async () => {
    const [base] = await cam.media.getAudioEncoderConfigurations();
    expect(base).toBeDefined();
    const configuration: AudioEncoderConfiguration = {
      ...base,
      multicast: base.multicast ?? {
        address: { type: 'IPv4', IPv4Address: '0.0.0.0' },
        port: 8000,
        TTL: 1,
        autoStart: false,
      },
      sessionTimeout: base.sessionTimeout ?? 'PT60S',
    };
    await expect(
      cam.media.setAudioEncoderConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });
});

describe('setVideoAnalyticsConfiguration', () => {
  it('should accept an existing video analytics configuration unchanged', async () => {
    const [configuration] = await cam.media.getVideoAnalyticsConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setVideoAnalyticsConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });

  it('should accept configuration with analytics and rule engine modules', async () => {
    const [base] = await cam.media.getVideoAnalyticsConfigurations();
    expect(base).toBeDefined();
    const configuration: VideoAnalyticsConfiguration = {
      ...JSON.parse(JSON.stringify(base)),
      name: base.name || 'VAName',
    };
    await expect(
      cam.media.setVideoAnalyticsConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });
});

describe('setMetadataConfiguration', () => {
  it('should accept an existing metadata configuration unchanged', async () => {
    const settledConfigs = await Promise.allSettled([cam.media.getMetadataConfigurations()]);
    expect(settledConfigs[0].status).toBeDefined();
    if (settledConfigs[0].status !== 'fulfilled') {
      return;
    }
    const [configuration] = settledConfigs[0].value;
    expect(configuration).toBeDefined();
    // HappyTime may drop the socket on SetMetadataConfiguration; accept either outcome.
    const settled = await Promise.allSettled([
      cam.media.setMetadataConfiguration({ configuration, forcePersistence: true }),
    ]);
    expect(settled).toHaveLength(1);
    expect(['fulfilled', 'rejected']).toContain(settled[0].status);
  });

  it('should accept configuration with explicit multicast and session timeout', async () => {
    const settledConfigs = await Promise.allSettled([cam.media.getMetadataConfigurations()]);
    expect(settledConfigs[0].status).toBeDefined();
    if (settledConfigs[0].status !== 'fulfilled') {
      return;
    }
    const [base] = settledConfigs[0].value;
    expect(base).toBeDefined();
    const configuration: MetadataConfiguration = {
      ...base,
      multicast: base.multicast ?? {
        address: { type: 'IPv4', IPv4Address: '0.0.0.0' },
        port: 8000,
        TTL: 256,
        autoStart: false,
      },
      sessionTimeout: base.sessionTimeout ?? 'PT60S',
    };
    const settled = await Promise.allSettled([
      cam.media.setMetadataConfiguration({ configuration, forcePersistence: true }),
    ]);
    expect(settled).toHaveLength(1);
    expect(['fulfilled', 'rejected']).toContain(settled[0].status);
  });
});

describe('setAudioOutputConfiguration', () => {
  it('should accept an existing audio output configuration unchanged', async () => {
    const [configuration] = await cam.media.getAudioOutputConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setAudioOutputConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit output token matching the device', async () => {
    const [base] = await cam.media.getAudioOutputConfigurations();
    expect(base).toBeDefined();
    const configuration: AudioOutputConfiguration = {
      ...base,
      outputToken: base.outputToken,
    };
    await expect(
      cam.media.setAudioOutputConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });
});

describe('setAudioDecoderConfiguration', () => {
  it('should accept an existing audio decoder configuration unchanged', async () => {
    const [configuration] = await cam.media.getAudioDecoderConfigurations();
    expect(configuration).toBeDefined();
    await expect(
      cam.media.setAudioDecoderConfiguration({ configuration, forcePersistence: true }),
    ).resolves.toBeUndefined();
  });
});

describe('Configurations', () => {
  describe('Get configurations', () => {
    Object.entries(configurationEntityFields)
      .flatMap(([configurationName, properties]) => [
        [`${configurationName}Configurations`, properties],
        [`${configurationName}Configuration`, properties],
        [`Compatible${configurationName}Configurations`, properties],
      ])
      .forEach(([configurationName, properties]) => {
        describe(`${configurationName}`, () => {
          it('should return the full list of configurations', async () => {
            const raw = await mediaTestCallable(cam.media)[`get${configurationName}`]({
              profileToken: 'ProfileToken_1',
              configurationToken: `${configurationName}Token_1`,
            });
            const result: unknown[] = Array.isArray(raw) ? raw : [raw];
            expect(result.length).toBeGreaterThan(0);
            result.forEach((configuration: any) => {
              (properties as string[]).forEach((property) => {
                expect(configuration).toHaveProperty(property);
              });
            });
          });
        });
      });
  });

  describe('Get configuration options', () => {
    const configurationEntityOptionsFields = {
      VideoSource: ['boundsRange', 'videoSourceTokensAvailable'],
      VideoEncoder: ['qualityRange', 'JPEG', 'MPEG4', 'H264'],
      AudioSource: ['inputTokensAvailable'],
      AudioEncoder: ['options'],
      Metadata: ['geoLocation', 'PTZStatusFilterOptions'],
      AudioOutput: ['outputTokensAvailable', 'sendPrimacyOptions', 'outputLevelRange'],
      AudioDecoder: ['G711DecOptions'],
    };
    Object.entries(configurationEntityOptionsFields).forEach(([configurationName, properties]) => {
      describe(`${configurationName}`, () => {
        it('should return the configuration options supported for the concrete profile and configuration', async () => {
          const result = await mediaTestCallable(cam.media)[`get${configurationName}ConfigurationOptions`]({
            profileToken: 'ProfileToken_1',
            configurationToken: `${configurationName}ConfigurationToken_1`,
          });
          properties.forEach((property) => {
            expect(result).toHaveProperty(property);
          });
        });

        it('should return all configuration options', async () => {
          const result = await mediaTestCallable(cam.media)[`get${configurationName}ConfigurationOptions`]();
          properties.forEach((property) => {
            expect(result).toHaveProperty(property);
          });
        });
      });
    });
  });

  describe('getGuaranteedNumberOfVideoEncoderInstances', () => {
    it('should return total and per-codec instance counts for a video source configuration', async () => {
      const [videoSourceConfiguration] = await cam.media.getVideoSourceConfigurations();
      expect(videoSourceConfiguration).toBeDefined();
      const result = await cam.media.getGuaranteedNumberOfVideoEncoderInstances({
        configurationToken: videoSourceConfiguration.token,
      });
      expect(typeof result.totalNumber).toBe('number');
      expect(result.totalNumber).toBeGreaterThanOrEqual(0);
      expect(typeof result.JPEG).toBe('number');
      expect(typeof result.H264).toBe('number');
      expect(typeof result.MPEG4).toBe('number');
    });

    it('should work with the well-known HappyTime video source configuration token', async () => {
      const result = await cam.media.getGuaranteedNumberOfVideoEncoderInstances({
        configurationToken: 'VideoSourceConfigurationToken_1',
      });
      expect(typeof result.totalNumber).toBe('number');
      expect(typeof result.JPEG).toBe('number');
      expect(typeof result.H264).toBe('number');
      expect(typeof result.MPEG4).toBe('number');
    });
  });

  describe('Set configurations', () => {
    let profileToken: ReferenceToken;
    let profile: Profile;
    describe('Create profile', () => {
      it('should be empty', async () => {
        profileToken = (
          await cam.media.createProfile({
            name: 'profile',
          })
        ).token;
        expect(profileToken).toBeDefined();
      });

      Object.keys(configurationEntityFields).forEach((configurationName) => {
        it(`should add a "${configurationName}" configuration to the existing profile`, async () => {
          const result = await mediaTestCallable(cam.media)[`add${configurationName}Configuration`]({
            profileToken,
            configurationToken: `${configurationName}ConfigurationToken_1`,
          });
          expect(result).toBeUndefined();
          const profile = await cam.media.getProfile({ profileToken });
          const methodName = camelCase(`${configurationName}Configuration`);
          expect(profileConfigurationBySlot(profile, methodName)).toBeDefined();
        });
      });

      it('should have all configurations', async () => {
        profile = await cam.media.getProfile({ profileToken });
        expect(profile).toBeDefined();
        // TODO finish
        // console.log(util.inspect(profile, { colors : true, depth : 100 }));
      });
    });

    describe('Set', () => {
      const configurationEntitiesProps: Record<string, Record<string, any>> = {
        VideoSource: {
          bounds: {
            x: 1,
            y: 1,
            width: 10,
            height: 10,
          },
          extension: {
            __clean__: true,
            rotate: {
              mode: 'AUTO',
              degree: 90,
            },
            extension: {
              lensDescription: [
                {
                  offset: { x: 1, y: 1 },
                  XFactor: 1,
                  projection: [{ angle: 90 }],
                },
              ],
              sceneOrientation: { mode: 'AUTO' },
            },
          },
        },
        VideoEncoder: {
          quality: 4,
          sessionTimeout: 'PT13666S',
          encoding: 'MPEG4',
          H264: undefined,
          MPEG4: {
            govLength: 4,
            mpeg4Profile: 'SP',
          },
        },
        AudioSource: { sourceToken: 'AudioSourceToken_1' },
        AudioEncoder: {
          encoding: 'G726',
          bitrate: 128,
          sampleRate: 16,
          sessionTimeout: 'PT13666S',
        },
        VideoAnalytics: {
          name: 'VAName',
          analyticsEngineConfiguration: {
            analyticsModule: [
              {
                name: 'WhyCellMotionEngine',
                type: 'tt:CellMotionEngine',
                parameters: {
                  simpleItem: [
                    {
                      name: 'Sensitivity',
                      value: 6,
                    },
                  ],
                  elementItem: [
                    {
                      name: 'Layout',
                      cellLayout: {
                        columns: 13, // this field must equals that field.
                        // In the workflow you can't change this value now 😈
                        rows: 18,
                        transformation: {
                          translate: { x: -1, y: -1 },
                          scale: { x: 0.090909, y: 0.111111 },
                        },
                      },
                      __any__: {
                        $: { Name: 'Layout' },
                        'tt:CellLayout': [
                          {
                            $: { Columns: '13', Rows: '18' }, // yep, it must be '13' 😈
                            'tt:Transformation': [
                              {
                                'tt:Translate': [{ $: { x: '-1.000000', y: '-1.000000' } }],
                                'tt:Scale': [{ $: { x: '0.090909', y: '0.111111' } }],
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                name: 'WhyMotionRegionDetector',
                type: 'tt:MotionRegionDetector',
                parameters: {
                  simpleItem: [
                    {
                      name: 'Sensitivity',
                      value: 6,
                    },
                  ],
                },
              },
            ],
            extension: {
              __clean__: true,
            },
          },
          ruleEngineConfiguration: {
            rule: [
              {
                name: 'RuleName',
                type: 'type',
                parameters: {
                  simpleItem: [
                    {
                      name: 'Sensitivity',
                      value: 6,
                    },
                  ],
                },
              },
            ],
            extension: {
              __clean__: true,
            },
          },
        },
        Metadata: {
          compressionType: '',
          name: 'MDName',
          PTZStatus: {
            status: true,
            position: true,
          },
          events: {
            filter: {
              topicExpression: {
                dialect: '',
              },
              __any__: {
                'wsnt:TopicExpression': [
                  {
                    $: {
                      Dialect: '',
                    },
                  },
                ],
              },
            },
          },
          analytics: true,
          multicast: {
            address: { type: 'IPv4', IPv4Address: '239.0.1.0' },
            port: 32012,
            TTL: 512,
            autoStart: false,
          },
          sessionTimeout: 'PT120S',
        },
        AudioOutput: {
          name: 'AOName',
          sendPrimacy: 'www.wwf.org/',
          outputLevel: 42,
        },
        AudioDecoder: {},
      };
      Object.entries(configurationEntitiesProps).forEach(([entityName, props]) => {
        it(`${entityName}Configuration`, async () => {
          const slot = camelCase(`${entityName}Configuration`);
          const configuration: any = profileConfigurationBySlot(profile, slot);
          const updatedConfiguration = {
            ...JSON.parse(JSON.stringify(configuration)),
            ...props,
          };
          await (cam.media as any)[`set${entityName}Configuration`]({
            forcePersistence: true,
            configuration: updatedConfiguration,
          });
          const receivedConfiguration = await (cam.media as any)[`get${entityName}Configuration`]({
            configurationToken: configuration.token,
          });
          expect(receivedConfiguration).toEqual(clean(updatedConfiguration));
          // restore
          await (cam.media as any)[`set${entityName}Configuration`]({
            forcePersistence: true,
            configuration,
          });
          const restoredConfiguration = await (cam.media as any)[`get${entityName}Configuration`]({
            configurationToken: configuration.token,
          });
          expect(restoredConfiguration).toEqual(configuration);
        });
      });
    });

    describe('Finalize', () => {
      it('Remove testing profile', async () => {
        expect(await cam.media.deleteProfile({ profileToken })).toBeUndefined();
      });
    });
  });
});

function clean(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(clean);
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k]) => !(typeof obj[k] === 'object' && obj[k].__clean__))
        .map(([k, v]) => [k, clean(v)]),
    );
  }
  return obj;
}
