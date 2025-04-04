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
    it('should return media profiles', async () => {
      const result = await cam.media.getProfiles();
      console.log(result);
      // const result = await cam.media.getProfilesV2();
      // console.log(result);
    });
  });
});
