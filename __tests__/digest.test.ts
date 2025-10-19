import { Onvif } from '../src';

let cam: Onvif;
beforeAll(async () => {
  cam = new Onvif({
    hostname      : 'localhost',
    username      : 'admin',
    password      : 'admin',
    port          : 8000,
    useWSSecurity : false, // force disable WSSecurity (specs 1.1 and 1.2)
  });
  await cam.connect();
});

describe('Digest Auth (without WSSecurity headers, only HTTP-Digest)', () => {
  it('should connect to the cam, fill startup properties', () => {
    expect(cam.uri.PTZ?.href).toBeDefined();
    expect(cam.uri.media).toBeDefined();
    expect(cam.media.videoSources).toBeDefined();
    expect(cam.media.profiles).toBeDefined();
    expect(cam.defaultProfile).toBeDefined();
    expect(cam.activeSource).toBeDefined();
  });
});
