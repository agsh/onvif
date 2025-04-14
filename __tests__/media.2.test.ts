import { Onvif, ConfigurationRefExtended } from '../src';
import { ReferenceToken } from '../src/interfaces/common';
import {
  ConfigurationEnumeration,
  MediaProfile,
} from '../src/interfaces/media.2';

const configurationEntityFields = {
  'VideoEncoder' : ['encoding', 'resolution', 'quality'],
  'AudioEncoder' : ['encoding', 'bitrate', 'sampleRate'],
  'VideoSource'  : ['sourceToken', 'bounds'],
  'AudioSource'  : ['sourceToken'],
  'Analytics'    : ['analyticsEngineConfiguration', 'ruleEngineConfiguration'],
  'Metadata'     : ['multicast', 'sessionTimeout'],
  'AudioOutput'  : ['outputToken', 'outputLevel'],
  'AudioDecoder' : [],
  'WebRTC'       : [],
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
      // console.log(currentProfiles.map((profile) => profile.name).join(', '));
      const profileCount = currentProfiles.length;
      const result = await cam.media2.createProfile({ name : 'test2', configuration : [{ type : 'VideoEncoder' }] });
      expect(typeof result).toBe('string');
      newProfileToken = result;
      currentProfiles = await cam.media2.getProfiles();
      // console.log(currentProfiles.map((profile) => profile.name).join(', '));
      expect(currentProfiles.length).toBe(profileCount + 1);
    });
  });

  describe('addConfiguration', () => {
    it('should add a configuration to the profile', async () => {
      const newConfiguration: ConfigurationRefExtended[] = Object.entries(basicProfile.configurations!)
        .map(([name, configuration]): ConfigurationRefExtended => ({
          type  : name as ConfigurationEnumeration,
          token : configuration.token,
        }));
      const result = await cam.media2.addConfiguration({
        profileToken  : newProfileToken,
        name          : 'test',
        configuration : newConfiguration,
      });
      expect(result).toBeUndefined();
      const [profile] = (await cam.media2.getProfiles({ token : newProfileToken }));
      expect(Object.values(profile.configurations!).map((configuration) => configuration.token))
        .toStrictEqual(Object.values(basicProfile.configurations!).map((configuration) => configuration.token));
    });

    it('should throw an error requested profile token does not exist', async () => {
      await expect(cam.media2.addConfiguration({ profileToken : '???' })).rejects.toThrow('Profile Not Exist');
    });
  });

  describe('removeConfiguration', () => {
    it('should remove one configuration from the profile', async () => {
      let [profile] = (await cam.media2.getProfiles({ token : newProfileToken }));
      const oldConfigurationsLength = Object.keys(profile.configurations!).length;
      await cam.media2.removeConfiguration({
        profileToken  : newProfileToken,
        configuration : [{
          type : 'VideoEncoder',
        }],
      });
      [profile] = (await cam.media2.getProfiles({ token : newProfileToken }));
      const newConfigurationLength = Object.keys(profile.configurations!).length;
      expect(newConfigurationLength).toBe(oldConfigurationsLength - 1);
    });

    it('should remove all configuration from the profile', async () => {
      await cam.media2.removeConfiguration({
        profileToken  : newProfileToken,
        configuration : [{
          type : 'All',
        }],
      });
      const [profile] = (await cam.media2.getProfiles({ token : newProfileToken }));
      const newConfigurationLength = Object.keys(profile.configurations!).length;
      expect(newConfigurationLength).toBe(0);
    });

    it('should throw an error requested profile token does not exist', async () => {
      await expect(cam.media2.removeConfiguration({ profileToken : '???' })).rejects.toThrow('Profile Not Exist');
    });
  });

  describe('deleteProfile', () => {
    it('should delete the profile', async () => {
      const result = await cam.media2.deleteProfile({ token : newProfileToken });
      expect(result).toBeUndefined();
    });

    it('should throw an error requested profile token does not exist', async () => {
      await expect(cam.media2.deleteProfile({ token : '???' })).rejects.toThrow('Profile Not Exist');
    });
  });
});

describe('get<Entity>Configurations', () => {
  Object.entries(configurationEntityFields).forEach(([entityName, properties]) => {
    describe(entityName, () => {
      it('should return a list of configurations from the profile', async () => {
        // @ts-expect-error just
        const result = await cam.media2[`get${entityName}Configurations`]({
        });
        expect(Array.isArray(result)).toBe(true);
        result.forEach((configuration: any) => {
          expect(configuration.name).toBeDefined();
          expect(configuration.token).toBeDefined();
          expect(configuration.useCount).toBeDefined();
          properties.forEach((property) => {
            expect(configuration).toHaveProperty(property);
          });
        });
      });
    });
  });
});
