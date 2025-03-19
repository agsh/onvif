import { Onvif } from '../src';

describe('Onvif base methods', () => {
  let cam: Onvif;
  beforeAll(async () => {
    cam = new Onvif({
      hostname      : '192.168.0.149',
      username      : 'admin',
      password      : 'admin',
      port          : 8000,
      // useSecure : true,
      useWSSecurity : false,
    });
    await cam.connect();
  });

  it('should connect to the cam, fill startup properties', async () => {
    const dt = await cam.device.getSystemDateAndTime();
    expect(dt).toBeInstanceOf(Date);
    // if (synthTest) {
    //   assert.ok(cam.uri.ptz);
    // }
    // assert.ok(cam.uri.media);
    // assert.ok(cam.videoSources);
    // assert.ok(cam.profiles);
    // assert.ok(cam.defaultProfile);
    // assert.ok(cam.activeSource);
    // done();
  });
});
