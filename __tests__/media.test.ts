import * as util from 'node:util';
import { build, camelCase, Onvif } from '../src';
import { ReferenceToken } from '../src/interfaces/common';
import { Profile, ProfileExtension } from '../src/interfaces/onvif';

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
      const result = await cam.media.createProfile({ name : 'test1', token : 'token' });
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
  const configurationNames = ['PTZ', ...Object.keys(configurationEntityFields)];

  describe('Startup', () => {
    it('should create a new profile for the tests', async () => {
      const testProfile = await cam.media.createProfile({
        name : 'test_configurations_profile',
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
        await expect(cam.media[`remove${configurationName}Configuration`]({})).rejects.toThrow();
      });

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

  describe('Get configuration options', () => {
    const configurationEntityOptionsFields = {
      'VideoSource'  : ['boundsRange', 'videoSourceTokensAvailable'],
      'VideoEncoder' : ['qualityRange', 'JPEG', 'MPEG4', 'H264'],
      'AudioSource'  : ['inputTokensAvailable'],
      'AudioEncoder' : ['options'],
      'Metadata'     : ['geoLocation', 'PTZStatusFilterOptions'],
      'AudioOutput'  : ['outputTokensAvailable', 'sendPrimacyOptions', 'outputLevelRange'],
      'AudioDecoder' : ['G711DecOptions'],
    };
    Object.entries(configurationEntityOptionsFields).forEach(([configurationName, properties]) => {
      describe(`${configurationName}`, () => {
        it('should return the configuration options supported for the concrete profile and configuration', async () => {
          // @ts-expect-error just
          const result = await cam.media[`get${configurationName}ConfigurationOptions`]({
            profileToken       : 'ProfileToken_1',
            configurationToken : `${configurationName}ConfigurationToken_1`,
          });
          properties.forEach((property) => {
            expect(result).toHaveProperty(property);
          });
        });

        it('should return all configuration options', async () => {
          // @ts-expect-error just
          const result = await cam.media[`get${configurationName}ConfigurationOptions`]();
          // console.log(util.inspect(result, { colors : true, depth : 100 }));
          properties.forEach((property) => {
            expect(result).toHaveProperty(property);
          });
        });
      });
    });
  });

  describe('getGuaranteedNumberOfVideoEncoderInstances', () => {
    it('should response', async () => {
      const result = await cam.media.getGuaranteedNumberOfVideoEncoderInstances({
        configurationToken : 'VideoSourceConfigurationToken_1',
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
        profileToken = (await cam.media.createProfile({
          name : 'profile',
        })).token;
      });

      Object.keys(configurationEntityFields).forEach((configurationName) => {
        it(`should add a "${configurationName}" configuration to the existing profile`, async () => {
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

      it('should have all configurations', async () => {
        profile = await cam.media.getProfile({ profileToken });
        // TODO finish
        // console.log(util.inspect(profile, { colors : true, depth : 100 }));
      });
    });

    describe('Set', () => {
      const configurationEntitiesProps: Record<string, Record<string, any>> = {
        'VideoSource'  : { bounds : { x : 1, y : 1, width : 10, height : 10 } },
        'VideoEncoder' : {
          quality        : 4,
          sessionTimeout : 'PT13666S',
          encoding       : 'MPEG4',
          H264           : undefined,
          MPEG4          : {
            govLength    : 4,
            mpeg4Profile : 'SP',
          },
        },
        'AudioSource'  : { sourceToken : 'AudioSourceToken_1' },
        'AudioEncoder' : {
          encoding       : 'G726',
          bitrate        : 128,
          sampleRate     : 16,
          sessionTimeout : 'PT13666S',
        },
        'VideoAnalytics' : {
          name                         : 'VAName',
          analyticsEngineConfiguration : {
            analyticsModule : [
              {
                'name'       : 'WhyCellMotionEngine',
                'type'       : 'tt:CellMotionEngine',
                'parameters' : {
                  'simpleItem' : [
                    {
                      'name'  : 'Sensitivity',
                      'value' : 6,
                    },
                  ],
                  'elementItem' : [
                    {
                      name       : 'Layout',
                      cellLayout : {
                        columns        : 13, // this field must equals that field.
                        // In the workflow you can't change this value now 😈
                        rows           : 18,
                        transformation : {
                          translate : { x : -1, y : -1 },
                          scale     : { x : 0.090909, y : 0.111111 },
                        },
                      },
                      __any__ : {
                        '$'             : { Name : 'Layout' },
                        'tt:CellLayout' : [
                          {
                            '$'                 : { Columns : '13', Rows : '18' }, // yep, it must be '13' 😈
                            'tt:Transformation' : [
                              {
                                'tt:Translate' : [{ '$' : { x : '-1.000000', y : '-1.000000' } }],
                                'tt:Scale'     : [{ '$' : { x : '0.090909', y : '0.111111' } }],
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
                'name'       : 'WhyMotionRegionDetector',
                'type'       : 'tt:MotionRegionDetector',
                'parameters' : {
                  'simpleItem' : [
                    {
                      'name'  : 'Sensitivity',
                      'value' : 6,
                    },
                  ],
                },
              },
            ],
          },
        },
        'Metadata' : {
          compressionType : '',
          name            : 'MDName',
          PTZStatus       : { status : true, position : true },
          analytics       : true,
          multicast       : {
            address   : { type : 'IPv4', IPv4Address : '239.0.1.0' },
            port      : 32012,
            TTL       : 512,
            autoStart : false,
          },
          sessionTimeout : 'PT120S',
        },
        'AudioOutput' : {
          name        : 'AOName',
          sendPrimacy : 'www.wwf.org/',
          outputLevel : 42,
        },
        'AudioDecoder' : {},
      };
      Object.entries(configurationEntitiesProps).forEach(([entityName, props]) => {
        it(`${entityName}Configuration`, async () => {
          const configuration: any = (profile[camelCase(`${entityName}Configuration`) as keyof Profile]
           ?? profile.extension![camelCase(`${entityName}Configuration`) as keyof ProfileExtension]);
          const updatedConfiguration = {
            ...JSON.parse(JSON.stringify(configuration)),
            ...props,
          };
          await (cam.media as any)[`set${entityName}Configuration`]({
            forcePersistence : true,
            configuration    : updatedConfiguration,
          });
          const receivedConfiguration = await (cam.media as any)[`get${entityName}Configuration`]({
            configurationToken : configuration.token,
          });
          expect(receivedConfiguration).toEqual(updatedConfiguration);
          // restore
          await (cam.media as any)[`set${entityName}Configuration`]({
            forcePersistence : true,
            configuration,
          });
          const restoredConfiguration = await (cam.media as any)[`get${entityName}Configuration`]({
            configurationToken : configuration.token,
          });
          expect(restoredConfiguration).toEqual(configuration);
        });
      });
    });

    describe('Finalize', () => {
      it('Remove testing profile', async () => {
        await cam.media.deleteProfile({ profileToken });
      });
    });
  });
});
