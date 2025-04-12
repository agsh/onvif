import { Onvif } from '../src';
import { ReferenceToken } from '../src/interfaces/common';

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

describe('Configurations', () => {
  let profileToken: ReferenceToken;
  const camel = (name: string) => (name.charAt(1).toLowerCase() === name.charAt(1)
    ? name.charAt(0).toLowerCase() + name.slice(1) : name);
  const configurationNames = [
    'VideoEncoderConfiguration',
    'AudioEncoderConfiguration',
    'VideoSourceConfiguration',
    'AudioSourceConfiguration',
    'VideoAnalyticsConfiguration',
    'PTZConfiguration',
    'MetadataConfiguration',
    'AudioDecoderConfiguration',
    'AudioOutputConfiguration',
  ];
  describe('Startup', () => {
    it('should create a new profile for the tests', async () => {
      const testProfile = await cam.media.createProfile({
        name : 'test_configurations_profile',
      });
      profileToken = testProfile.token;
      configurationNames.forEach((configurationName) => {
        // @ts-expect-error check that no configurations added
        expect(testProfile[camel(configurationName)]).toBeUndefined();
      });
    });
  });

  configurationNames.forEach((configurationName) => {
    describe(`add${configurationName}`, () => {
      it('should throw an error if configuration token does not exist', async () => {
        // @ts-expect-error just
        await expect(cam.media[`add${configurationName}`]({
          profileToken,
          configurationToken : '???',
        })).rejects.toThrow('Config Not Exist');
      });

      it('should throw an error if profile token does not exist', async () => {
        // @ts-expect-error just
        await expect(cam.media[`add${configurationName}`]({
          profileToken       : '???',
          configurationToken : '???',
        })).rejects.toThrow('Profile Not Exist');
      });

      it('should add a new configuration to the existing profile', async () => {
        // @ts-expect-error just
        const result = await cam.media[`add${configurationName}`]({
          profileToken,
          configurationToken : `${configurationName}Token_1`,
        });
        expect(result).toBeUndefined();
        const profile = await cam.media.getProfile({ profileToken });
        const methodName = camel(configurationName);
        // @ts-expect-error just
        expect(profile[methodName] ?? profile.extension[methodName]).toBeDefined();
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
        await expect(cam.media[`remove${configurationName}`]({
          profileToken : '???',
        })).rejects.toThrow('Profile Not Exist');
      });

      it('should remove a configuration from the existing profile', async () => {
        // @ts-expect-error just
        const result = await cam.media[`remove${configurationName}`]({
          profileToken,
        });
        expect(result).toBeUndefined();
        const profile = await cam.media.getProfile({ profileToken });
        const methodName = camel(configurationName);
        // @ts-expect-error just
        expect(profile[methodName] ?? profile.extension?.[methodName]).toBeUndefined();
      });
    });
  });

  describe('Shutdown', () => {
    it('should remove test profile', async () => {
      const profiles = await cam.media.getProfiles();
      await cam.media.deleteProfile({ profileToken });
    });
  });
});
