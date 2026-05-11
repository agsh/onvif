import { Onvif, ConfigurationRefExtended, AudioOutputConfigurationExtended } from '../src';
import { ReferenceToken } from '../src/interfaces/common';
import { ConfigurationEnumeration, MediaProfile } from '../src/interfaces/media.2';
import {
  AudioEncoder2Configuration,
  AudioSourceConfiguration,
  ConfigurationEntity,
  MetadataConfiguration,
  VideoEncoder2Configuration,
  VideoSourceConfiguration,
} from '../src/interfaces/onvif';

const configurationEntityFields = {
  VideoEncoder: ['encoding', 'resolution', 'quality'],
  AudioEncoder: ['encoding', 'bitrate', 'sampleRate'],
  VideoSource: ['sourceToken', 'bounds'],
  AudioSource: ['sourceToken'],
  Analytics: ['analyticsEngineConfiguration', 'ruleEngineConfiguration'],
  Metadata: ['multicast', 'sessionTimeout'],
  AudioOutput: ['outputToken', 'outputLevel'],
  AudioDecoder: [],
  WebRTC: [],
} as const;

function assertMedia2ConfigurationList(
  entityKey: keyof typeof configurationEntityFields,
  configurations: unknown[],
): void {
  expect(Array.isArray(configurations)).toBe(true);
  const properties = configurationEntityFields[entityKey];
  (configurations as Record<string, unknown>[]).forEach((configuration) => {
    expect(configuration.name).toBeDefined();
    expect(configuration.token).toBeDefined();
    expect(configuration.useCount).toBeDefined();
    properties.forEach((property) => {
      expect(configuration).toHaveProperty(property);
    });
  });
}

async function assertConfigurationsFilterByProfileAndToken(
  fetchAll: () => Promise<{ token: string }[]>,
  fetchFiltered: (profileToken: string, configurationToken: string) => Promise<{ token: string }[]>,
): Promise<void> {
  const list = await fetchAll();
  if (list.length === 0) {
    return;
  }
  const configurationToken = list[0].token;
  const profileToken = cam.activeSource!.profileToken;
  const filtered = await fetchFiltered(profileToken, configurationToken);
  expect(filtered.length).toBeGreaterThanOrEqual(1);
  expect(filtered.some((configuration) => configuration.token === configurationToken)).toBe(true);
}

let cam: Onvif;
beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
});

describe('Profiles', () => {
  let basicProfile: MediaProfile;

  describe('getProfiles', () => {
    it('should return media profiles ver20', async () => {
      const result = await cam.media2.getProfiles();
      expect(result.length).toBeGreaterThan(0);
      [basicProfile] = result;
      expect(basicProfile).toHaveProperty('token');
      expect(basicProfile).toHaveProperty('fixed');
      expect(basicProfile).toHaveProperty('name');
      expect(basicProfile).toHaveProperty('configurations');
    });

    it('should return one profile when token is passed', async () => {
      const token = basicProfile.token;
      const result = await cam.media2.getProfiles({ token });
      expect(result).toHaveLength(1);
      expect(result[0].token).toBe(token);
    });

    it('should pass explicit configuration types to GetProfiles', async () => {
      const result = await cam.media2.getProfiles({
        type: ['VideoSource', 'VideoEncoder'],
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('configurations');
    });

    it('should fail if media ver20 is not supported', async () => {
      cam.device.media2Support = false;
      expect(() => cam.media2.getProfiles()).toThrow();
      cam.device.media2Support = true;
    });
  });

  let newProfileToken: ReferenceToken;

  describe('createProfile', () => {
    it('should create a new blank profile and return it', async () => {
      let currentProfiles = await cam.media2.getProfiles();
      const profileCount = currentProfiles.length;
      const videoEncoderToken = basicProfile.configurations?.videoEncoder?.token;
      expect(videoEncoderToken).toBeDefined();
      const result = await cam.media2.createProfile({
        name: 'test2',
        configuration: [{ type: 'VideoEncoder', token: videoEncoderToken }],
      });
      expect(typeof result).toBe('string');
      newProfileToken = result;
      currentProfiles = await cam.media2.getProfiles();
      expect(currentProfiles.length).toBe(profileCount + 1);
    });

    it('should create a profile without optional configuration refs', async () => {
      const token = await cam.media2.createProfile({ name: 'test-no-config-refs' });
      expect(typeof token).toBe('string');
      await cam.media2.deleteProfile({ token });
    });

    it('should create a profile with configuration types but omitting optional tokens', async () => {
      const token = await cam.media2.createProfile({
        name: 'test-types-only',
        configuration: [{ type: 'VideoEncoder' }],
      });
      expect(typeof token).toBe('string');
      await cam.media2.deleteProfile({ token });
    });
  });

  describe('addConfiguration', () => {
    it('should add a configuration to the profile', async () => {
      const newConfiguration: ConfigurationRefExtended[] = Object.entries(basicProfile.configurations!).map(
        ([name, configuration]: [string, any]) => ({
          type: name as ConfigurationEnumeration,
          token: configuration.token as ReferenceToken,
        }),
      );
      const result = await cam.media2.addConfiguration({
        profileToken: newProfileToken,
        name: 'test',
        configuration: newConfiguration,
      });
      expect(result).toBeUndefined();
      const [profile] = await cam.media2.getProfiles({ token: newProfileToken });
      expect(
        Object.values(profile.configurations!).map((configuration) => (configuration as ConfigurationEntity).token),
      ).toStrictEqual(
        Object.values(basicProfile.configurations!).map(
          (configuration) => (configuration as ConfigurationEntity).token,
        ),
      );
    });

    it('should throw an error requested profile token does not exist', async () => {
      await expect(cam.media2.addConfiguration({ profileToken: '???' })).rejects.toThrow('Profile Not Exist');
    });

    it('should add configuration when only type is given without configuration token', async () => {
      const profileToken = await cam.media2.createProfile({ name: 'test-add-type-only' });
      await expect(
        cam.media2.addConfiguration({
          profileToken,
          configuration: [{ type: 'VideoEncoder' }],
        }),
      ).resolves.toBeUndefined();
      await cam.media2.deleteProfile({ token: profileToken });
    });
  });

  describe('removeConfiguration', () => {
    it('should remove one configuration from the profile', async () => {
      let [profile] = await cam.media2.getProfiles({ token: newProfileToken });
      const oldConfigurationsLength = Object.keys(profile.configurations!).length;
      await cam.media2.removeConfiguration({
        profileToken: newProfileToken,
        configuration: [
          {
            type: 'VideoEncoder',
          },
        ],
      });
      [profile] = await cam.media2.getProfiles({ token: newProfileToken });
      const newConfigurationLength = Object.keys(profile.configurations!).length;
      expect(newConfigurationLength).toBe(oldConfigurationsLength - 1);
    });

    it('should remove all configuration from the profile', async () => {
      await cam.media2.removeConfiguration({
        profileToken: newProfileToken,
        configuration: [
          {
            type: 'All',
          },
        ],
      });
      const [profile] = await cam.media2.getProfiles({ token: newProfileToken });
      const newConfigurationLength = Object.keys(profile.configurations!).length;
      expect(newConfigurationLength).toBe(0);
    });

    it('should throw an error requested profile token does not exist', async () => {
      await expect(cam.media2.removeConfiguration({ profileToken: '???' })).rejects.toThrow('Profile Not Exist');
    });
  });

  describe('deleteProfile', () => {
    it('should delete the profile', async () => {
      const result = await cam.media2.deleteProfile({ token: newProfileToken });
      expect(result).toBeUndefined();
    });

    it('should throw an error requested profile token does not exist', async () => {
      await expect(cam.media2.deleteProfile({ token: '???' })).rejects.toThrow('Profile Not Exist');
    });
  });
});

describe('getVideoSourceConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getVideoSourceConfigurations({});
    assertMedia2ConfigurationList('VideoSource', result);
  });

  it('should filter by profileToken and configurationToken', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getVideoSourceConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getVideoSourceConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('getVideoEncoderConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getVideoEncoderConfigurations({});
    assertMedia2ConfigurationList('VideoEncoder', result);
  });

  it('should filter by profileToken and configurationToken when configurations exist', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getVideoEncoderConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getVideoEncoderConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('setVideoEncoderConfiguration', () => {
  it('should accept an existing video encoder configuration unchanged', async () => {
    const [configuration] = await cam.media2.getVideoEncoderConfigurations({});
    expect(configuration).toBeDefined();
    await expect(cam.media2.setVideoEncoderConfiguration(configuration)).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit rate control and multicast', async () => {
    const [base] = await cam.media2.getVideoEncoderConfigurations({});
    expect(base).toBeDefined();
    const configuration: VideoEncoder2Configuration = {
      ...base,
      rateControl: {
        constantBitRate: false,
        frameRateLimit: base.rateControl?.frameRateLimit ?? 25,
        bitrateLimit: base.rateControl?.bitrateLimit ?? 2048,
      },
      multicast: base.multicast ?? {
        address: { type: 'IPv4', IPv4Address: '0.0.0.0' },
        port: 0,
        TTL: 1,
        autoStart: false,
      },
    };
    await expect(cam.media2.setVideoEncoderConfiguration(configuration)).resolves.toBeUndefined();
  });
});

describe('getAudioSourceConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getAudioSourceConfigurations({});
    assertMedia2ConfigurationList('AudioSource', result);
  });

  it('should filter by profileToken and configurationToken when configurations exist', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getAudioSourceConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioSourceConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('setAudioSourceConfiguration', () => {
  it('should accept an existing audio source configuration unchanged', async () => {
    const [configuration] = await cam.media2.getAudioSourceConfigurations({});
    expect(configuration).toBeDefined();
    await expect(cam.media2.setAudioSourceConfiguration(configuration)).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit source token matching the device', async () => {
    const [base] = await cam.media2.getAudioSourceConfigurations({});
    expect(base).toBeDefined();
    const configuration: AudioSourceConfiguration = {
      ...base,
      sourceToken: base.sourceToken,
    };
    await expect(cam.media2.setAudioSourceConfiguration(configuration)).resolves.toBeUndefined();
  });
});

describe('getAudioEncoderConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getAudioEncoderConfigurations({});
    assertMedia2ConfigurationList('AudioEncoder', result);
  });

  it('should filter by profileToken and configurationToken when configurations exist', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getAudioEncoderConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioEncoderConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('setAudioEncoderConfiguration', () => {
  it('should accept an existing audio encoder configuration unchanged', async () => {
    const [configuration] = await cam.media2.getAudioEncoderConfigurations({});
    expect(configuration).toBeDefined();
    await expect(cam.media2.setAudioEncoderConfiguration(configuration)).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit multicast', async () => {
    const [base] = await cam.media2.getAudioEncoderConfigurations({});
    expect(base).toBeDefined();
    const configuration: AudioEncoder2Configuration = {
      ...base,
      multicast: base.multicast ?? {
        address: { type: 'IPv4', IPv4Address: '0.0.0.0' },
        port: 8000,
        TTL: 1,
        autoStart: false,
      },
    };
    await expect(cam.media2.setAudioEncoderConfiguration(configuration)).resolves.toBeUndefined();
  });
});

describe('getAnalyticsConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getAnalyticsConfigurations({});
    assertMedia2ConfigurationList('Analytics', result);
  });

  it('should filter by profileToken and configurationToken when configurations exist', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getAnalyticsConfigurations({}),
      (profileToken, configurationToken) => cam.media2.getAnalyticsConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('getMetadataConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getMetadataConfigurations({});
    assertMedia2ConfigurationList('Metadata', result);
  });

  it('should filter by profileToken and configurationToken when configurations exist', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getMetadataConfigurations({}),
      (profileToken, configurationToken) => cam.media2.getMetadataConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('setMetadataConfiguration', () => {
  it('should accept an existing metadata configuration unchanged', async () => {
    const [configuration] = await cam.media2.getMetadataConfigurations({});
    expect(configuration).toBeDefined();
    await expect(cam.media2.setMetadataConfiguration(configuration)).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit multicast and session timeout', async () => {
    const [base] = await cam.media2.getMetadataConfigurations({});
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
    await expect(cam.media2.setMetadataConfiguration(configuration)).resolves.toBeUndefined();
  });
});

describe('getAudioOutputConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getAudioOutputConfigurations({});
    assertMedia2ConfigurationList('AudioOutput', result);
  });

  it('should filter by profileToken and configurationToken when configurations exist', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getAudioOutputConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioOutputConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('setAudioOutputConfiguration', () => {
  it('should accept an existing audio output configuration unchanged', async () => {
    const [configuration] = await cam.media2.getAudioOutputConfigurations({});
    expect(configuration).toBeDefined();
    await expect(cam.media2.setAudioOutputConfiguration(configuration!)).resolves.toBeUndefined();
  });

  it('should accept configuration with explicit output token matching the device', async () => {
    const [base] = await cam.media2.getAudioOutputConfigurations({});
    expect(base).toBeDefined();
    const configuration: AudioOutputConfigurationExtended = {
      ...base,
      outputToken: base.outputToken,
    };
    await expect(cam.media2.setAudioOutputConfiguration(configuration)).resolves.toBeUndefined();
  });

  it('should set SendPrimacy to HalfDuplex Server on the configuration object before applying', async () => {
    const [base] = await cam.media2.getAudioOutputConfigurations({});
    expect(base).toBeDefined();
    const configuration: AudioOutputConfigurationExtended = {
      ...base,
      sendPrimacy: 'www.onvif.org/ver20/HalfDuplex/Client',
    };
    await cam.media2.setAudioOutputConfiguration(configuration);
    expect(configuration.sendPrimacy).toBe('www.onvif.org/ver20/HalfDuplex/Server');
  });
});

describe('getAudioDecoderConfigurations', () => {
  it('should return a list with expected fields', async () => {
    const result = await cam.media2.getAudioDecoderConfigurations({});
    assertMedia2ConfigurationList('AudioDecoder', result);
  });

  it('should filter by profileToken and configurationToken when configurations exist', async () => {
    await assertConfigurationsFilterByProfileAndToken(
      () => cam.media2.getAudioDecoderConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioDecoderConfigurations({ profileToken, configurationToken }),
    );
  });
});

describe('setVideoSourceConfiguration', () => {
  it('should accept SetVideoSourceConfiguration for an existing video source configuration', async () => {
    const [configuration] = await cam.media2.getVideoSourceConfigurations({});
    expect(configuration).toBeDefined();
    await expect(cam.media2.setVideoSourceConfiguration(configuration)).resolves.toBeUndefined();
  });

  it('should include extension payload when rotate and nested extension are provided', async () => {
    const [base] = await cam.media2.getVideoSourceConfigurations({});
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
    await expect(cam.media2.setVideoSourceConfiguration(configuration)).resolves.toBeUndefined();
  });
});

describe('getStreamUri', () => {
  const protocol = 'RtspUnicast';

  it('should return a stream URI for the given protocol and profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    const result = await cam.media2.getStreamUri({ protocol, profileToken });
    expect(result).toHaveProperty('uri');
    expect(typeof result.uri).toBe('string');
    expect(result.uri!.length).toBeGreaterThan(0);
  });

  it('should default profile token from activeSource when omitted', async () => {
    const withExplicit = await cam.media2.getStreamUri({
      protocol,
      profileToken: cam.activeSource!.profileToken,
    });
    const withDefault = await cam.media2.getStreamUri({ protocol });
    expect(withDefault.uri).toBe(withExplicit.uri);
  });

  it('should accept alternate stream protocols', async () => {
    const profileToken = cam.activeSource!.profileToken;
    const rtspTcp = await cam.media2.getStreamUri({ protocol: 'RTSP', profileToken });
    expect(rtspTcp.uri).toBeDefined();
  });

  it('should default protocol to RtspUnicast when omitted', async () => {
    const profileToken = cam.activeSource!.profileToken;
    const explicit = await cam.media2.getStreamUri({ protocol: 'RtspUnicast', profileToken });
    const defaulted = await cam.media2.getStreamUri({ profileToken });
    expect(defaulted.uri).toBe(explicit.uri);
  });

  it('should fail if media ver20 is not supported', () => {
    cam.device.media2Support = false;
    try {
      expect(() => cam.media2.getStreamUri({ protocol, profileToken: cam.activeSource!.profileToken })).toThrow(
        'Media2 profile is not supported for this device',
      );
    } finally {
      cam.device.media2Support = true;
    }
  });
});

describe('getSnapshotUri', () => {
  it('should return a snapshot URI for the given profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    const result = await cam.media2.getSnapshotUri({ profileToken });
    expect(result).toHaveProperty('uri');
    expect(typeof result.uri).toBe('string');
    expect(result.uri!.length).toBeGreaterThan(0);
  });

  it('should default profile token from activeSource when omitted', async () => {
    const withExplicit = await cam.media2.getSnapshotUri({
      profileToken: cam.activeSource!.profileToken,
    });
    const withDefault = await cam.media2.getSnapshotUri();
    expect(withDefault.uri).toBe(withExplicit.uri);
  });

  it('should treat an empty options object like omitted profile token', async () => {
    const withDefault = await cam.media2.getSnapshotUri();
    const withEmptyOptions = await cam.media2.getSnapshotUri({});
    expect(withEmptyOptions.uri).toBe(withDefault.uri);
  });

  it('should fail if media ver20 is not supported', () => {
    cam.device.media2Support = false;
    try {
      expect(() => cam.media2.getSnapshotUri({ profileToken: cam.activeSource!.profileToken })).toThrow(
        'Media2 profile is not supported for this device',
      );
    } finally {
      cam.device.media2Support = true;
    }
  });
});
