import { Onvif } from '../src';
import { ReferenceToken } from '../src/interfaces/common';
import { ConfigurationEnumeration, ConfigurationSet, MediaProfile } from '../src/interfaces/media.2';
import { ConfigurationRefExtended } from '../src/media2';

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
      const profileCount = (await cam.media2.getProfiles()).length;
      const result = await cam.media2.createProfile({ name : 'test2', configuration : [{ type : 'VideoEncoder' }] });
      expect(typeof result).toBe('string');
      newProfileToken = result;
      const currentProfiles = await cam.media2.getProfiles();
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
  });
});
