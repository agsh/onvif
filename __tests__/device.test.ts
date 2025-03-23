import { Onvif } from '../src';

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&\/\/=]*)/;

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
  describe('getCapabilities', () => {
    it('should return a result without options', async () => {
      const result = await cam.device.getCapabilities();
      ['PTZ', 'media', 'imaging', 'events', 'device', 'analytics'].forEach((name) => {
        expect((result as any)[name].XAddr).toMatch(URL_REGEX);
        expect(cam.uri[name]).toBeInstanceOf(URL);
      });
    });

    it('should reassign recording uri when profile G device has only replay uri', async () => {
      jest.spyOn(cam as any, 'request')
        .mockImplementationOnce(async (options) => {
          const [data, xml] = await (cam as any).request(options);
          delete data[0].getCapabilitiesResponse[0].capabilities[0].extension[0].recording;
          return [data, xml];
        });
      delete cam.uri.recording;
      const result = await cam.device.getCapabilities();
      expect(result.extension!.recording).toBeUndefined();
      expect(cam.uri.recording).toBeDefined();
    });
  });
});
