import { camelCase, Onvif } from '../src';
import { ReferenceToken } from '../src/interfaces/common';

const configurationEntityFields = {
  'VideoEncoder'   : ['encoding', 'resolution', 'quality'],
  'AudioEncoder'   : ['encoding', 'bitrate', 'sampleRate'],
  'VideoSource'    : ['sourceToken', 'bounds'],
  'AudioSource'    : ['sourceToken'],
  'VideoAnalytics' : ['analyticsEngineConfiguration', 'ruleEngineConfiguration'],
  'Metadata'       : ['multicast', 'sessionTimeout'],
  'AudioOutput'    : ['outputToken', 'outputLevel'],
  'AudioDecoder'   : [],
};
let cam: Onvif;
beforeAll(async () => {
  cam = new Onvif({
    hostname : 'localhost',
    username : 'admin',
    password : 'admin',
    port     : 8000,
  });
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
      cam.device.media2Support = false;
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
      cam.device.media2Support = true;
    });
  });

  let newProfileToken: ReferenceToken;

  describe('createProfile', () => {
    it('should create a new blank profile and return it', async () => {
      let currentProfiles = await cam.media2.getProfiles();
      const profileCount = currentProfiles.length;
      // console.log(currentProfiles.map((profile) => profile.name).join(', '));
      const result = await cam.media.createProfile({ name : 'test1' });
      expect(result).toHaveProperty('token');
      expect(result.fixed).toBe(false);
      newProfileToken = result.token;
      expect(result).toHaveProperty('name');
      currentProfiles = await cam.media2.getProfiles();
      // console.log(currentProfiles.map((profile) => profile.name).join(', '));
      expect(currentProfiles.length).toBe(profileCount + 1);
    });
  });

  describe('getProfile', () => {
    it('should return the profile ver20 as ver10 by its token', async () => {
      const result = await cam.media.getProfile({ profileToken : newProfileToken });
      expect(result.fixed).toBe(false);
    });

    it('should return the profile ver10 by its token', async () => {
      cam.device.media2Support = false;
      const result = await cam.media.getProfile({ profileToken : newProfileToken });
      expect(result.fixed).toBe(false);
      cam.device.media2Support = true;
    });
  });

  describe('deleteProfile', () => {
    it('should delete non-fixed profile', async () => {
      const profileCount = (await cam.media.getProfiles()).length;
      const result = await cam.media.deleteProfile({ profileToken : newProfileToken });
      expect(result).toBeUndefined();
      const currentProfiles = await cam.media.getProfiles();
      expect(currentProfiles.length).toBe(profileCount - 1);
    });
  });
});

describe('Add/remove configurations to the profile', () => {
  let profileToken: ReferenceToken;
  const configurationNames = Object.keys(configurationEntityFields);

  describe('Startup', () => {
    it('should create a new profile for the tests', async () => {
      const testProfile = await cam.media.createProfile({
        name : 'test_configurations_profile',
      });
      profileToken = testProfile.token;
      configurationNames.forEach((configurationName) => {
        // @ts-expect-error check that no configurations added
        expect(testProfile[camelCase(configurationName)]).toBeUndefined();
      });
    });
  });

  configurationNames.forEach((configurationName) => {
    describe(`add${configurationName}`, () => {
      it('should throw an error if configuration token does not exist', async () => {
        // @ts-expect-error just
        await expect(cam.media[`add${configurationName}Configuration`]({
          profileToken,
          configurationToken : '???',
        })).rejects.toThrow('Config Not Exist');
      });

      it('should throw an error if profile token does not exist', async () => {
        // @ts-expect-error just
        await expect(cam.media[`add${configurationName}Configuration`]({
          profileToken       : '???',
          configurationToken : '???',
        })).rejects.toThrow('Profile Not Exist');
      });

      it('should add a new configuration to the existing profile', async () => {
        // @ts-expect-error just
        const result = await cam.media[`add${configurationName}Configuration`]({
          profileToken,
          configurationToken : `${configurationName}ConfigurationToken_1`,
        });
        expect(result).toBeUndefined();
        const profile = await cam.media.getProfile({ profileToken });
        const methodName = camelCase(`${configurationName}Configuration`);
        // @ts-expect-error just
        expect(profile[methodName] ?? profile.extension?.[methodName]).toBeDefined();
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
      it('should throw an error if profile token does not exist', async () => {
        // @ts-expect-error just
        await expect(cam.media[`remove${configurationName}Configuration`]({
          profileToken : '???',
        })).rejects.toThrow('Profile Not Exist');
      });

      it('should remove a configuration from the existing profile', async () => {
        // @ts-expect-error just
        const result = await cam.media[`remove${configurationName}Configuration`]({
          profileToken,
        });
        expect(result).toBeUndefined();
        const profile = await cam.media.getProfile({ profileToken });
        const methodName = camelCase(`${configurationName}Configuration`);
        // @ts-expect-error just
        expect(profile[methodName] ?? profile.extension?.[methodName]).toBeUndefined();
      });
    });
  });

  describe('Shutdown', () => {
    it('should remove test profile', async () => {
      await cam.media.deleteProfile({ profileToken });
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

describe('Configurations', () => {
  // describe('Preparation', () => {
  //   it('should create a profile with the full list of the configurations', async () => {
  //
  //   });
  // });

  describe('Get configurations', () => {
    Object
      .entries(configurationEntityFields)
      .flatMap(([configurationName, properties]) => [
        [`${configurationName}Configurations`, properties],
        [`${configurationName}Configuration`, properties],
        [`Compatible${configurationName}Configurations`, properties],
      ])
      .forEach(([configurationName, properties]) => {
        describe(`${configurationName}`, () => {
          it('should return the full list of configurations', async () => {
            // @ts-expect-error just
            let result = await cam.media[`get${configurationName}`]({
              profileToken       : 'ProfileToken_1',
              configurationToken : `${configurationName}Token_1`,
            });
            if (!Array.isArray(result)) { result = [result]; }
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
});
