import { Onvif } from '../src';

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&\/\/=]*)/;

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

describe('Getters', () => {
  it('should returns private properties from the class', () => {
    expect(cam.device.services).toBeDefined();
    expect(cam.device.scopes).toBeDefined();
    expect(cam.device.serviceCapabilities).toBeDefined();
  });
});

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

describe('getDeviceInformation', () => {
  it('should return an information about device', async () => {
    const result = await cam.device.getDeviceInformation();
    expect(result.manufacturer).toBeDefined();
    expect(result.model).toBeDefined();
    expect(result.firmwareVersion).toBeDefined();
    expect(result.serialNumber).toBeDefined();
    expect(result.hardwareId).toBeDefined();
  });
});

describe('getHostname', () => {
  it('should return an information about device', async () => {
    const result = await cam.device.getHostname();
    expect(result.name).toBeDefined();
    expect(result.fromDHCP).toBeDefined();
  });
});

describe('getScopes', () => {
  it('should return device scopes', async () => {
    const result = await cam.device.getScopes();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return device scopes as an array if there is only one scope', async () => {
    jest.spyOn(cam as any, 'request').mockReturnValueOnce([[{
      getScopesResponse : [{
        scopes : [{
          'scopeDef' : [
            'Fixed',
          ],
          'scopeItem' : [
            'onvif://www.onvif.org/type/audio_encoder',
          ],
        }],
      }],
    }], '<Scopes><Scope>scope</Scope></Scopes>']);
    const result = await cam.device.getScopes();
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(1);
  });

  it('should return empty array if there are no scopes', async () => {
    jest.spyOn(cam as any, 'request').mockReturnValueOnce([[{
      getScopesResponse : [],
    }], '<Scopes><Scope>scope</Scope></Scopes>']);
    const result = await cam.device.getScopes();
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(0);
  });
});
