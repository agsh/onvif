import { Onvif, ConfigurationRefExtended, AudioOutputConfigurationExtended } from '../src';
import { ReferenceToken } from '../src/interfaces/common';
import {
  Capabilities2,
  ConfigurationEnumeration,
  CreateOSDResponse,
  Mask,
  MediaProfile,
  VideoSourceMode,
} from '../src/interfaces/media.2';
import {
  AudioDecoderConfiguration,
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

async function assertConfigurationOptionsFilterByProfileAndToken(
  fetchConfigurations: () => Promise<{ token: string }[]>,
  fetchOptions: (profileToken: string, configurationToken: string) => Promise<unknown>,
): Promise<void> {
  const list = await fetchConfigurations();
  if (list.length === 0) {
    return;
  }
  const configurationToken = list[0].token;
  const profileToken = cam.activeSource!.profileToken;
  const options = await fetchOptions(profileToken, configurationToken);
  expect(options).toBeDefined();
  expect(typeof options).toBe('object');
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

describe('getVideoSourceConfigurationOptions', () => {
  it('should return options when called with empty filter', async () => {
    const result = await cam.media2.getVideoSourceConfigurationOptions({});
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('boundsRange');
  });

  it('should return options when profileToken and configurationToken are set', async () => {
    await assertConfigurationOptionsFilterByProfileAndToken(
      () => cam.media2.getVideoSourceConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getVideoSourceConfigurationOptions({ profileToken, configurationToken }),
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

describe('getVideoEncoderConfigurationOptions', () => {
  it('should return options when called with empty filter', async () => {
    const result = await cam.media2.getVideoEncoderConfigurationOptions({});
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('qualityRange');
  });

  it('should return options when profileToken and configurationToken are set', async () => {
    await assertConfigurationOptionsFilterByProfileAndToken(
      () => cam.media2.getVideoEncoderConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getVideoEncoderConfigurationOptions({ profileToken, configurationToken }),
    );
  });
});

describe('getVideoEncoderInstances', () => {
  it('should return encoder instance info with total for a video source configuration token', async () => {
    const configurations = await cam.media2.getVideoSourceConfigurations({});
    expect(configurations.length).toBeGreaterThan(0);
    const configurationToken = configurations[0].token;
    const info = await cam.media2.getVideoEncoderInstances({ configurationToken });
    expect(info).toBeDefined();
    expect(typeof info).toBe('object');
    expect(typeof info.total).toBe('number');
    expect(info.total).toBeGreaterThanOrEqual(0);
  });

  it('should return per-codec entries when the device reports codec limits', async () => {
    const configurations = await cam.media2.getVideoSourceConfigurations({});
    if (configurations.length === 0) {
      return;
    }
    const info = await cam.media2.getVideoEncoderInstances({ configurationToken: configurations[0].token });
    if (info.codec === undefined) {
      return;
    }
    expect(Array.isArray(info.codec)).toBe(true);
    info.codec.forEach((instance) => {
      expect(typeof instance.encoding).toBe('string');
      expect(instance.encoding.length).toBeGreaterThan(0);
      expect(typeof instance.number).toBe('number');
      expect(instance.number).toBeGreaterThanOrEqual(0);
    });
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

describe('getAudioSourceConfigurationOptions', () => {
  it('should return options when called with empty filter', async () => {
    const result = await cam.media2.getAudioSourceConfigurationOptions({});
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('inputTokensAvailable');
  });

  it('should return options when profileToken and configurationToken are set', async () => {
    await assertConfigurationOptionsFilterByProfileAndToken(
      () => cam.media2.getAudioSourceConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioSourceConfigurationOptions({ profileToken, configurationToken }),
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

describe('getAudioEncoderConfigurationOptions', () => {
  it('should return options when called with empty filter', async () => {
    const result = await cam.media2.getAudioEncoderConfigurationOptions({});
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return options when profileToken and configurationToken are set', async () => {
    await assertConfigurationOptionsFilterByProfileAndToken(
      () => cam.media2.getAudioEncoderConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioEncoderConfigurationOptions({ profileToken, configurationToken }),
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

describe('getMetadataConfigurationOptions', () => {
  it('should return options when called with empty filter', async () => {
    const result = await cam.media2.getMetadataConfigurationOptions({});
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('PTZStatusFilterOptions');
  });

  it('should return options when profileToken and configurationToken are set', async () => {
    await assertConfigurationOptionsFilterByProfileAndToken(
      () => cam.media2.getMetadataConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getMetadataConfigurationOptions({ profileToken, configurationToken }),
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

describe('getAudioOutputConfigurationOptions', () => {
  it('should return options when called with empty filter', async () => {
    const result = await cam.media2.getAudioOutputConfigurationOptions({});
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('outputLevelRange');
  });

  it('should return options when profileToken and configurationToken are set', async () => {
    await assertConfigurationOptionsFilterByProfileAndToken(
      () => cam.media2.getAudioOutputConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioOutputConfigurationOptions({ profileToken, configurationToken }),
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

describe('getAudioDecoderConfigurationOptions', () => {
  it('should return options when called with empty filter', async () => {
    const result = await cam.media2.getAudioDecoderConfigurationOptions({});
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should return options when profileToken and configurationToken are set', async () => {
    await assertConfigurationOptionsFilterByProfileAndToken(
      () => cam.media2.getAudioDecoderConfigurations({}),
      (profileToken, configurationToken) =>
        cam.media2.getAudioDecoderConfigurationOptions({ profileToken, configurationToken }),
    );
  });
});

describe('setAudioDecoderConfiguration', () => {
  it('should accept an existing audio decoder configuration unchanged', async () => {
    const [configuration] = await cam.media2.getAudioDecoderConfigurations({});
    expect(configuration).toBeDefined();
    await expect(cam.media2.setAudioDecoderConfiguration(configuration!)).resolves.toBeUndefined();
  });

  it('should set SendPrimacy to HalfDuplex Server on the configuration object before applying', async () => {
    const [base] = await cam.media2.getAudioDecoderConfigurations({});
    expect(base).toBeDefined();
    const configuration: AudioDecoderConfiguration = {
      ...base,
      sendPrimacy: 'www.onvif.org/ver20/HalfDuplex/Client',
    };
    await cam.media2.setAudioDecoderConfiguration(configuration);
    expect(configuration.sendPrimacy).toBe('www.onvif.org/ver20/HalfDuplex/Server');
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

describe('setSynchronizationPoint', () => {
  it('should set a synchronization point for the active profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media2.setSynchronizationPoint({ profileToken })).resolves.toBeUndefined();
  });

  it('should set a synchronization point for any existing profile token', async () => {
    const profiles = await cam.media2.getProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      await expect(cam.media2.setSynchronizationPoint({ profileToken: profile.token })).resolves.toBeUndefined();
    }
  });

  it('should set a synchronization point for a newly created profile', async () => {
    const token = await cam.media2.createProfile({ name: 'test-set-sync-point' });
    try {
      await expect(cam.media2.setSynchronizationPoint({ profileToken: token })).resolves.toBeUndefined();
    } finally {
      await cam.media2.deleteProfile({ token });
    }
  });

  it('should throw an error when the requested profile token does not exist', async () => {
    await expect(cam.media2.setSynchronizationPoint({ profileToken: '???' })).rejects.toThrow();
  });
});

describe('startMulticastStreaming', () => {
  it('should start multicast streaming for the active profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media2.startMulticastStreaming({ profileToken })).resolves.toBeUndefined();
  });

  it('should default profile token from activeSource when omitted', async () => {
    const withExplicit = await cam.media2.startMulticastStreaming({
      profileToken: cam.activeSource!.profileToken,
    });
    expect(withExplicit).toBeUndefined();
    const withDefault = await cam.media2.startMulticastStreaming();
    expect(withDefault).toBeUndefined();
  });

  it('should treat an empty options object like omitted profile token', async () => {
    const withDefault = await cam.media2.startMulticastStreaming();
    const withEmptyOptions = await cam.media2.startMulticastStreaming({});
    expect(withDefault).toBeUndefined();
    expect(withEmptyOptions).toBeUndefined();
  });

  it('should start multicast streaming for any existing profile token', async () => {
    const profiles = await cam.media2.getProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      await expect(cam.media2.startMulticastStreaming({ profileToken: profile.token })).resolves.toBeUndefined();
    }
  });

  it('should start multicast streaming for a newly created profile', async () => {
    const token = await cam.media2.createProfile({ name: 'test-start-multicast' });
    try {
      await expect(cam.media2.startMulticastStreaming({ profileToken: token })).resolves.toBeUndefined();
    } finally {
      await cam.media2.deleteProfile({ token });
    }
  });

  it('should throw an error when the requested profile token does not exist', async () => {
    await expect(cam.media2.startMulticastStreaming({ profileToken: '???' })).rejects.toThrow();
  });
});

describe('stopMulticastStreaming', () => {
  it('should stop multicast streaming for the active profile token', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media2.stopMulticastStreaming({ profileToken })).resolves.toBeUndefined();
  });

  it('should default profile token from activeSource when omitted', async () => {
    const withExplicit = await cam.media2.stopMulticastStreaming({
      profileToken: cam.activeSource!.profileToken,
    });
    expect(withExplicit).toBeUndefined();
    const withDefault = await cam.media2.stopMulticastStreaming();
    expect(withDefault).toBeUndefined();
  });

  it('should treat an empty options object like omitted profile token', async () => {
    const withDefault = await cam.media2.stopMulticastStreaming();
    const withEmptyOptions = await cam.media2.stopMulticastStreaming({});
    expect(withDefault).toBeUndefined();
    expect(withEmptyOptions).toBeUndefined();
  });

  it('should stop multicast streaming for any existing profile token', async () => {
    const profiles = await cam.media2.getProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      await expect(cam.media2.stopMulticastStreaming({ profileToken: profile.token })).resolves.toBeUndefined();
    }
  });

  it('should stop multicast streaming for a newly created profile', async () => {
    const token = await cam.media2.createProfile({ name: 'test-stop-multicast' });
    try {
      await expect(cam.media2.stopMulticastStreaming({ profileToken: token })).resolves.toBeUndefined();
    } finally {
      await cam.media2.deleteProfile({ token });
    }
  });

  it('should throw an error when the requested profile token does not exist', async () => {
    await expect(cam.media2.stopMulticastStreaming({ profileToken: '???' })).rejects.toThrow();
  });
});

describe('startMulticastStreaming / stopMulticastStreaming', () => {
  it('should allow start then stop for the same profile', async () => {
    const profileToken = cam.activeSource!.profileToken;
    await expect(cam.media2.startMulticastStreaming({ profileToken })).resolves.toBeUndefined();
    await expect(cam.media2.stopMulticastStreaming({ profileToken })).resolves.toBeUndefined();
  });
});

describe('getVideoSourceModes', () => {
  function assertVideoSourceModeShape(mode: VideoSourceMode): void {
    expect(mode.token).toBeDefined();
    expect(typeof mode.maxFramerate).toBe('number');
    expect(mode.maxResolution).toBeDefined();
    expect(typeof mode.maxResolution.width).toBe('number');
    expect(typeof mode.maxResolution.height).toBe('number');
    expect(mode.encodings).toBeDefined();
    expect(Array.isArray(mode.encodings)).toBe(true);
    expect(typeof mode.reboot).toBe('boolean');
  }

  it('should return video source modes for an explicit video source token', async () => {
    const videoSourceToken = cam.activeSource!.sourceToken;
    const modes = await cam.media2.getVideoSourceModes({ videoSourceToken });
    expect(Array.isArray(modes)).toBe(true);
    expect(modes.length).toBeGreaterThan(0);
    modes.forEach(assertVideoSourceModeShape);
  });

  it('should default video source token from activeSource when options are omitted', async () => {
    const explicit = await cam.media2.getVideoSourceModes({
      videoSourceToken: cam.activeSource!.sourceToken,
    });
    const defaulted = await cam.media2.getVideoSourceModes();
    expect(defaulted).toEqual(explicit);
  });
});

describe('setVideoSourceMode', () => {
  it('should accept a valid video source and mode token pair', async () => {
    const videoSourceToken = cam.activeSource!.sourceToken;
    const modes = await cam.media2.getVideoSourceModes({ videoSourceToken });
    expect(modes.length).toBeGreaterThan(0);
    const videoSourceModeToken = modes[0].token;
    await expect(cam.media2.setVideoSourceMode({ videoSourceToken, videoSourceModeToken })).resolves.toBeUndefined();
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

describe('OSD', () => {
  const videoSourceConfigurationToken = 'VideoSourceConfigurationToken_1';

  describe('getOSDs', () => {
    it('should return an array of OSD configurations', async () => {
      const result = await cam.media2.getOSDs();
      expect(Array.isArray(result ?? [])).toBe(true);
    });

    it('should accept a video source configuration token filter', async () => {
      const result = await cam.media2.getOSDs({
        configurationToken: videoSourceConfigurationToken as ReferenceToken,
      });
      expect(Array.isArray(result ?? [])).toBe(true);
    });

    it('should return a single OSD when OSDToken is set', async () => {
      const all = await cam.media2.getOSDs();
      if (!all?.length) {
        return;
      }
      const token = all[0].token;
      const filtered = await cam.media2.getOSDs({ OSDToken: token });
      expect(filtered?.length).toBe(1);
      expect(filtered![0].token).toBe(token);
    });

    it('should fail if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() => cam.media2.getOSDs()).toThrow('Media2 profile is not supported for this device');
      } finally {
        cam.device.media2Support = true;
      }
    });
  });

  describe('getOSDOptions', () => {
    it('should return OSD capability options for a video source configuration', async () => {
      const options = await cam.media2.getOSDOptions({ configurationToken: videoSourceConfigurationToken });
      expect(options).toBeDefined();
      expect(options.maximumNumberOfOSDs).toBeDefined();
      expect(typeof options.maximumNumberOfOSDs.total).toBe('number');
    });

    it('should fail if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() => cam.media2.getOSDOptions({ configurationToken: videoSourceConfigurationToken })).toThrow(
          'Media2 profile is not supported for this device',
        );
      } finally {
        cam.device.media2Support = true;
      }
    });
  });

  describe('setOSD', () => {
    it('should accept updating an existing OSD configuration', async () => {
      const list = await cam.media2.getOSDs({ configurationToken: videoSourceConfigurationToken });
      const osd = list?.find((o) => o.type === 'Text') ?? list?.[0];
      if (!osd) {
        return;
      }
      await expect(cam.media2.setOSD(osd)).resolves.toBeUndefined();
    });

    it('should fail if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() =>
          cam.media2.setOSD({
            token: 'x',
            videoSourceConfigurationToken,
            type: 'Text',
            position: { type: 'UpperLeft' },
            textString: { type: 'Plain', plainText: 'x' },
          }),
        ).toThrow('Media2 profile is not supported for this device');
      } finally {
        cam.device.media2Support = true;
      }
    });
  });

  describe('createOSD / deleteOSD', () => {
    it('should create an OSD then remove it by the token assigned by the device', async () => {
      const caps = await cam.media2.getOSDOptions({ configurationToken: videoSourceConfigurationToken });
      if (caps.maximumNumberOfOSDs.total === 0) {
        return;
      }

      const createResponse: CreateOSDResponse = await cam.media2.createOSD({
        token: `jest_req_${Date.now()}`,
        videoSourceConfigurationToken,
        type: 'Text',
        position: { type: 'UpperLeft' },
        textString: { type: 'Plain', plainText: 'jest osd' },
      });

      expect(createResponse.OSDToken).toBeDefined();

      await cam.media2.deleteOSD({ OSDToken: createResponse.OSDToken });

      const afterDelete = await cam.media2.getOSDs();
      expect(afterDelete?.some((o) => o.token === createResponse.OSDToken)).toBe(false);
    });

    it('should fail createOSD if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() =>
          cam.media2.createOSD({
            token: 'x',
            videoSourceConfigurationToken,
            type: 'Text',
            position: { type: 'UpperLeft' },
            textString: { type: 'Plain', plainText: 'x' },
          }),
        ).toThrow('Media2 profile is not supported for this device');
      } finally {
        cam.device.media2Support = true;
      }
    });

    it('should fail deleteOSD if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() => cam.media2.deleteOSD({ OSDToken: 'x' })).toThrow(
          'Media2 profile is not supported for this device',
        );
      } finally {
        cam.device.media2Support = true;
      }
    });
  });
});

describe('getServiceCapabilities', () => {
  it('should return Media2 capabilities with profile and streaming sections', async () => {
    const caps = await cam.media2.getServiceCapabilities();
    expect(caps).toBeDefined();
    expect(typeof caps).toBe('object');
    expect(caps.profileCapabilities).toBeDefined();
    expect(typeof caps.profileCapabilities).toBe('object');
    expect(caps.streamingCapabilities).toBeDefined();
    expect(typeof caps.streamingCapabilities).toBe('object');
  });

  it('should expose optional mask flags as booleans when present', async () => {
    const caps: Capabilities2 = await cam.media2.getServiceCapabilities();
    expect(caps.mask === undefined || typeof caps.mask === 'boolean').toBe(true);
    expect(caps.sourceMask === undefined || typeof caps.sourceMask === 'boolean').toBe(true);
  });

  it('should fail if media ver20 is not supported', () => {
    cam.device.media2Support = false;
    try {
      expect(() => cam.media2.getServiceCapabilities()).toThrow('Media2 profile is not supported for this device');
    } finally {
      cam.device.media2Support = true;
    }
  });
});

describe('Masks', () => {
  let videoSourceConfigurationToken: ReferenceToken;

  beforeAll(async () => {
    const configurations = await cam.media2.getVideoSourceConfigurations({});
    if (configurations.length === 0) {
      throw new Error('getVideoSourceConfigurations returned no configurations for mask tests');
    }
    videoSourceConfigurationToken = configurations[0].token;
  });
  describe('getMasks', () => {
    it('should return an array (possibly empty)', async () => {
      const masks = await cam.media2.getMasks();
      expect(Array.isArray(masks)).toBe(true);
    });

    it('should accept configurationToken filter', async () => {
      const masks = await cam.media2.getMasks({
        configurationToken: videoSourceConfigurationToken,
      });
      expect(Array.isArray(masks)).toBe(true);
    });

    it('should return a single mask when token filter matches an existing mask', async () => {
      const all = await cam.media2.getMasks();
      if (all.length === 0) {
        return;
      }
      const maskToken = all[0].token!;
      const filtered = await cam.media2.getMasks({ token: maskToken });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].token).toBe(maskToken);
    });

    it('should fail if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() => cam.media2.getMasks()).toThrow('Media2 profile is not supported for this device');
      } finally {
        cam.device.media2Support = true;
      }
    });
  });

  describe('getMaskOptions', () => {
    it('should return mask options when masking is supported', async () => {
      const caps = await cam.media2.getServiceCapabilities();
      if (!caps.mask) {
        return;
      }
      const options = await cam.media2.getMaskOptions({
        configurationToken: videoSourceConfigurationToken,
      });
      expect(options).toBeDefined();
      expect(typeof options.maxMasks).toBe('number');
      expect(options.maxMasks).toBeGreaterThanOrEqual(0);
      expect(typeof options.maxPoints).toBe('number');
      expect(options.maxPoints).toBeGreaterThanOrEqual(0);
      expect(options.color).toBeDefined();
    });

    it('should fail if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() => cam.media2.getMaskOptions({ configurationToken: videoSourceConfigurationToken })).toThrow(
          'Media2 profile is not supported for this device',
        );
      } finally {
        cam.device.media2Support = true;
      }
    });
  });

  describe('createMask / setMask / deleteMask', () => {
    function rectanglePolygon(pointCount: number): Mask['polygon'] {
      if (pointCount >= 4) {
        return {
          point: [
            { x: 0.05, y: 0.05 },
            { x: 0.25, y: 0.05 },
            { x: 0.25, y: 0.25 },
            { x: 0.05, y: 0.25 },
          ],
        };
      }
      return {
        point: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.1 },
          { x: 0.15, y: 0.2 },
        ],
      };
    }

    it('should accept setMask for an existing mask unchanged', async () => {
      const list = await cam.media2.getMasks({ configurationToken: videoSourceConfigurationToken });
      if (list.length === 0) {
        return;
      }
      const mask = list[0];
      await expect(cam.media2.setMask(mask)).resolves.toBeUndefined();
    });

    it('should reject createMask for a non-existent video source configuration token', async () => {
      await expect(
        cam.media2.createMask({
          token: `jest_bad_${Date.now()}`,
          configurationToken: '___nonexistent_configuration_token___' as ReferenceToken,
          type: 'Blurred',
          enabled: true,
          polygon: {
            point: [
              { x: 0.1, y: 0.1 },
              { x: 0.2, y: 0.1 },
              { x: 0.15, y: 0.2 },
            ],
          },
        }),
      ).rejects.toThrow();
    });

    it('should create a mask, update it with setMask, then delete it', async () => {
      const caps = await cam.media2.getServiceCapabilities();
      if (!caps.mask) {
        return;
      }
      const options = await cam.media2.getMaskOptions({
        configurationToken: videoSourceConfigurationToken,
      });
      if (options.maxMasks === 0 || options.maxPoints < 3) {
        return;
      }
      expect(options.maxMasks).toBeGreaterThan(0);
      expect(options.maxPoints).toBeGreaterThanOrEqual(3);

      const maskType = options.types?.includes('Blurred')
        ? 'Blurred'
        : options.types?.includes('Color')
          ? 'Color'
          : (options.types?.[0] ?? 'Pixelated');
      const pointCount = options.rectangleOnly ? 4 : Math.min(3, options.maxPoints);
      const polygon = rectanglePolygon(pointCount);

      const requestedToken = `jest_mask_${Date.now()}`;
      const maskPayload: Mask = {
        token: requestedToken,
        configurationToken: videoSourceConfigurationToken,
        type: maskType,
        enabled: true,
        polygon,
        ...(maskType === 'Color'
          ? {
              color: {
                x: 0.5,
                y: 0.5,
                z: 0.5,
                colorspace: 'http://www.onvif.org/ver10/colorspace/YCbCr',
              },
            }
          : {}),
      };

      let maskToken: ReferenceToken;
      try {
        const createResponse = await cam.media2.createMask(maskPayload);
        expect(createResponse.token).toBeDefined();
        maskToken = createResponse.token;

        const updated: Mask = {
          token: maskToken,
          configurationToken: videoSourceConfigurationToken,
          type: maskType,
          enabled: false,
          polygon,
        };
        await cam.media2.setMask(updated);

        await cam.media2.deleteMask({ token: maskToken });

        const after = await cam.media2.getMasks({ token: maskToken });
        expect(after.length).toBe(0);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/config not exist|not implemented|action not supported|invalid/i.test(msg)) {
          return;
        }
        throw e;
      }
    });

    it('should fail deleteMask if media ver20 is not supported', () => {
      cam.device.media2Support = false;
      try {
        expect(() => cam.media2.deleteMask({ token: 'x' })).toThrow('Media2 profile is not supported for this device');
      } finally {
        cam.device.media2Support = true;
      }
    });
  });
});
