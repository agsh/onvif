import { Onvif } from '../src';

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
  describe('getProfilesV2', () => {
    it('should return media profiles ver20', async () => {
      const result = await cam.media2.getProfiles();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('token');
      expect(result[0]).toHaveProperty('fixed');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('configurations');
    });
  });
});
