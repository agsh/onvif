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

  describe('media2.getProfiles', () => {
    it('should return media profiles ver20', async () => {
      const result = await cam.media2.getProfiles();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('token');
      expect(result[0]).toHaveProperty('fixed');
      expect(result[0]).toHaveProperty('name');
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
      console.log(currentProfiles.map((profile) => profile.name).join(', '));
      const result = await cam.media.createProfile({ name : 'test1' });
      expect(result).toHaveProperty('token');
      expect(result.fixed).toBe(false);
      newProfileToken = result.token;
      expect(result).toHaveProperty('name');
      currentProfiles = await cam.media2.getProfiles();
      console.log(currentProfiles.map((profile) => profile.name).join(', '));
      expect(currentProfiles.length).toBe(profileCount + 1);
    });
  });

  describe('getProfile', () => {
    it('should return the profile by its token', async () => {
      const result = await cam.media.getProfile({ profileToken : newProfileToken });
      expect(result.fixed).toBe(false);
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
