import { Onvif } from '../src';
import { SetDNS } from '../src/interfaces/devicemgmt';

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

describe('Scopes', () => {
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

  describe('setScopes', () => {
    it('should set scopes as an array or uris', async () => {
      const result = await cam.device.setScopes([
        'onvif://www.onvif.org/type/awesome',
        'onvif://www.onvif.org/Profile/S',
      ]);
      expect(result).toBeInstanceOf(Array);
      expect(result.some((scope) => scope.scopeDef === 'Configurable')).toBe(true);
    });

    it('should throw an error when the response from the device is not empty string', () => {
      jest.spyOn(cam as any, 'request')
        .mockReturnValueOnce([[{ setScopesResponse : ['whatever'] }], '<Scopes><Scope>scope</Scope></Scopes>']);
      expect(
        cam.device.setScopes([
          'onvif://www.onvif.org/type/error',
        ]),
      ).rejects.toThrow();
    });
  });
});

describe('getServiceCapabilities', () => {
  it('should return a service capabilities object', async () => {
    const result = await cam.device.getServiceCapabilities();
    expect(Object.keys(result).sort()).toEqual(['misc', 'network', 'security', 'system']);
  });
});

// describe('systemReboot', () => {
//   it('should return message', async () => {
//     const result = await cam.device.systemReboot();
//     expect(typeof result).toBe('string');
//   });
// });

describe('NTP', () => {
  describe('getNTP', () => {
    it('should return NTP information', async () => {
      const result = await cam.device.getNTP();
      expect(typeof result.fromDHCP).toBe('boolean');
      expect(result.NTPManual).toBeInstanceOf(Array);
    });

    it('should return stored NTP information as a property', async () => {
      expect(typeof cam.device.NTP!.fromDHCP).toBe('boolean');
      expect(cam.device.NTP!.NTPManual).toBeInstanceOf(Array);
    });
  });

  describe('setNTP', () => {
    it('should set NTP settings and return NTP information', async () => {
      const result = await cam.device.setNTP({
        fromDHCP  : false,
        NTPManual : [{
          DNSname     : '8.8.4.4',
          type        : 'DNS',
          IPv4Address : '8.8.4.4',
        }],
      });
      expect(typeof result.fromDHCP).toBe('boolean');
      expect(result.NTPManual).toBeInstanceOf(Array);
    });

    it('should throw an error when the response from the device is not empty string', () => {
      jest.spyOn(cam as any, 'request')
        .mockReturnValueOnce([[{ setNTPResponse : ['whatever'] }], '<SetNTPResponse />']);
      expect(
        cam.device.setNTP({}),
      ).rejects.toThrow();
    });
  });
});

describe('DNS', () => {
  describe('getDNS', () => {
    it('should return an information about DNS', async () => {
      const result = await cam.device.getDNS();
      expect(typeof result.fromDHCP).toBe('boolean');
      expect(result.DNSManual).toBeInstanceOf(Array);
    });

    it('should return stored DNS information as a property', async () => {
      expect(typeof cam.device.DNS!.fromDHCP).toBe('boolean');
      expect(cam.device.DNS!.DNSManual).toBeInstanceOf(Array);
    });
  });

  describe('setDNS', () => {
    it('should set DNS settings and return DNS information', async () => {
      const options: SetDNS = {
        fromDHCP     : false,
        searchDomain : ['8.8.4.4', '1.1.1.1'],
        DNSManual    : [{
          IPv4Address : '8.8.4.4',
          IPv6Address : '2560:d0c2:9d26:eb77:f3d5:8ca3:2069:7783',
          type        : 'IPv4',
        }],
      };
      const result = await cam.device.setDNS(options);
      expect(typeof result.fromDHCP).toBe('boolean');
      expect(result.searchDomain).toStrictEqual(options.searchDomain);
      expect(result.DNSManual).toBeInstanceOf(Array);
    });

    it('should throw an error when the response from the device is not empty string', () => {
      jest.spyOn(cam as any, 'request')
        .mockReturnValueOnce([[{ setDNSResponse : ['whatever'] }], '<SetDNSResponse />']);
      expect(
        cam.device.setDNS({}),
      ).rejects.toThrow();
    });
  });
});

describe('Network interfaces', () => {
  describe('getNetworkInterfaces', () => {
    it('should return an information about network interfaces', async () => {
      const result = await cam.device.getNetworkInterfaces();
      expect(result).toBeInstanceOf(Array);
      result.forEach((networkInterface) => {
        expect(networkInterface).toHaveProperty('token');
        expect(networkInterface).toHaveProperty('info');
        expect(networkInterface).toHaveProperty('IPv4');
      });
    });

    it('should return stored network interfaces information as a property', async () => {
      expect(cam.device.networkInterfaces).toBeInstanceOf(Array);
    });
  });
});
