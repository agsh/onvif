import { Onvif } from '../src';
import { SetDNS } from '../src/interfaces/devicemgmt';

const URL_REGEX =
  // eslint-disable-next-line no-useless-escape
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&\/\/=]*)/;

const RELAY_OUTPUT_TOKEN = 'RelayOutputToken_1';
const TEST_SCOPE = 'onvif://www.onvif.org/type/test';

let cam: Onvif;

/**
 * Device management tests do not require media profiles.
 * Happytime mock server currently returns profiles without VideoSourceConfiguration,
 * so full connect() fails in getActiveSources().
 */
async function initDeviceClient(onvif: Onvif) {
  await onvif.getSystemDateAndTime();
  try {
    await onvif.device.getServices();
  } catch {
    await onvif.device.getCapabilities();
  }
}

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await initDeviceClient(cam);
});

describe('Getters', () => {
  it('should returns private properties from the class', async () => {
    await cam.device.getScopes();
    expect(cam.device.services).toBeDefined();
    expect(cam.device.scopes).toBeDefined();
  });
});

describe('getServices', () => {
  it('should return services and populate device uri', async () => {
    const result = await cam.device.getServices();
    expect(result.service?.length).toBeGreaterThan(0);
    expect(cam.device.services.length).toBeGreaterThan(0);
    expect(cam.uri.device?.href).toContain('device_service');
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
    jest.spyOn(cam as any, 'request').mockImplementationOnce(async (options) => {
      const [data, xml] = await (cam as any).request(options);
      delete data['tds:GetCapabilitiesResponse'][0]['tds:Capabilities'][0]['tt:Extension'][0]['tt:Recording'];
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
      jest.spyOn(cam as any, 'request').mockReturnValueOnce([
        [
          {
            getScopesResponse: [
              {
                scopes: [
                  {
                    scopeDef: ['Fixed'],
                    scopeItem: ['onvif://www.onvif.org/type/audio_encoder'],
                  },
                ],
              },
            ],
          },
        ],
        '<Scopes><Scope>scope</Scope></Scopes>',
      ]);
      const result = await cam.device.getScopes();
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
    });

    it('should return empty array if there are no scopes', async () => {
      jest.spyOn(cam as any, 'request').mockReturnValueOnce([
        [
          {
            getScopesResponse: [],
          },
        ],
        '<Scopes><Scope>scope</Scope></Scopes>',
      ]);
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

    it('should throw an error when the response from the device is not empty string', async () => {
      jest
        .spyOn(cam as any, 'request')
        .mockReturnValueOnce([[{ setScopesResponse: ['whatever'] }], '<Scopes><Scope>scope</Scope></Scopes>']);
      await expect(cam.device.setScopes(['onvif://www.onvif.org/type/error'])).rejects.toThrow();
    });
  });
});

describe('getServiceCapabilities', () => {
  it('should return a service capabilities object', async () => {
    const result = await cam.device.getServiceCapabilities();
    expect(Object.keys(result).sort()).toEqual(['misc', 'network', 'security', 'system']);
  });

  it('should return a service capabilities object from the property', async () => {
    await cam.device.getServiceCapabilities();
    const result = cam.device.serviceCapabilities!;
    expect(Object.keys(result).sort()).toEqual(['misc', 'network', 'security', 'system']);
  });
});

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
        fromDHCP: false,
        NTPManual: [
          {
            DNSname: '8.8.4.4',
            type: 'DNS',
            IPv4Address: '8.8.4.4',
          },
        ],
      });
      expect(typeof result.fromDHCP).toBe('boolean');
      expect(result.NTPManual).toBeInstanceOf(Array);
    });

    it('should throw an error when the response from the device is not empty string', async () => {
      jest.spyOn(cam as any, 'request').mockReturnValueOnce([[{ setNTPResponse: ['whatever'] }], '<SetNTPResponse />']);
      await expect(
        // @ts-expect-error fromDCHP is required in the interface
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
        fromDHCP: false,
        searchDomain: ['8.8.4.4', '1.1.1.1'],
        DNSManual: [
          {
            IPv4Address: '8.8.4.4',
            IPv6Address: '2560:d0c2:9d26:eb77:f3d5:8ca3:2069:7783',
            type: 'IPv4',
          },
        ],
      };
      const result = await cam.device.setDNS(options);
      expect(typeof result.fromDHCP).toBe('boolean');
      expect(result.searchDomain).toStrictEqual(options.searchDomain);
      expect(result.DNSManual).toBeInstanceOf(Array);
    });

    it('should throw an error when the response from the device is not empty string', async () => {
      jest.spyOn(cam as any, 'request').mockReturnValueOnce([[{ setDNSResponse: ['whatever'] }], '<SetDNSResponse />']);
      await expect(
        // @ts-expect-error fromDCHP is required in the interface
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

  describe('setNetworkInterfaces', () => {
    it('should set network interfaces settings and return network interfaces information', async () => {
      await cam.device.getNetworkInterfaces(); // to ensure we have cam.device.networkInterfaces
      const result = await cam.device.setNetworkInterfaces({
        interfaceToken: cam.device.networkInterfaces![0].token,
        networkInterface: {
          enabled: true,
          MTU: 1500,
          IPv4: {
            enabled: true,
            DHCP: false,
            manual: [
              { address: cam.device.networkInterfaces![0].IPv4!.config!.manual![0].address, prefixLength: 24 },
              { address: '127.0.0.1', prefixLength: 24 },
            ],
          },
          IPv6: {
            enabled: false,
            acceptRouterAdvert: false,
            DHCP: 'Off',
            manual: [{ address: '::1', prefixLength: 24 }],
          },
        },
      });
      expect(result).toHaveProperty('rebootNeeded');
      expect(typeof result.rebootNeeded).toBe('boolean');
    });

    it('should do nothing when there is no network interfaces in options', async () => {
      // @ts-expect-error interfaceToken, networkInterface are required in the interface
      const result = await cam.device.setNetworkInterfaces({});
      expect(result.rebootNeeded).toBe(false);
    });
  });
});

describe('Discovery and scopes', () => {
  it('should return and update discovery mode', async () => {
    const mode = await cam.device.getDiscoveryMode();
    expect(['Discoverable', 'NonDiscoverable']).toContain(mode);
    await expect(cam.device.setDiscoveryMode({ discoveryMode: mode })).resolves.toBeUndefined();
  });

  it('should add and remove configurable scopes', async () => {
    await expect(cam.device.addScopes({ scopeItem: [TEST_SCOPE] })).resolves.toBeUndefined();
    const scopes = await cam.device.getScopes();
    expect(scopes.some((scope) => scope.scopeItem === TEST_SCOPE)).toBe(true);

    const removed = await cam.device.removeScopes({ scopeItem: [TEST_SCOPE] });
    expect(removed).toContain(TEST_SCOPE);
  });
});

describe('Endpoint and WSDL', () => {
  it('should return endpoint reference GUID', async () => {
    const result = await cam.device.getEndpointReference();
    expect(result.GUID).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('should return WSDL url', async () => {
    const result = await cam.device.getWsdlUrl();
    expect(result).toMatch(URL_REGEX);
  });
});

describe('Users', () => {
  const testUsername = 'device_test_user';

  it('should return users from the mock server', async () => {
    const users = await cam.device.getUsers();
    expect(users.length).toBeGreaterThanOrEqual(2);
    expect(users.some((user) => user.username === 'admin' && user.userLevel === 'Administrator')).toBe(true);
    expect(users.some((user) => user.username === 'user' && user.userLevel === 'User')).toBe(true);
  });

  it('should create and delete a user', async () => {
    await expect(
      cam.device.createUsers({
        user: [{ username: testUsername, password: 'testpass', userLevel: 'User' }],
      }),
    ).resolves.toBeUndefined();

    const users = await cam.device.getUsers();
    expect(users.some((user) => user.username === testUsername)).toBe(true);

    await expect(cam.device.deleteUsers({ username: [testUsername] })).resolves.toBeUndefined();
    const usersAfterDelete = await cam.device.getUsers();
    expect(usersAfterDelete.some((user) => user.username === testUsername)).toBe(false);
  });
});

describe('Remote user', () => {
  it('should return and update remote user settings', async () => {
    // Happytime returns an empty GetRemoteUser response until remote user is configured.
    await expect(
      cam.device.setRemoteUser({
        remoteUser: { username: 'admin', useDerivedPassword: false },
      }),
    ).resolves.toBeUndefined();

    const remoteUser = await cam.device.getRemoteUser();
    expect(remoteUser?.username).toBe('admin');
    expect(remoteUser?.useDerivedPassword).toBe(false);
  });
});

describe('Hostname and dynamic DNS', () => {
  it('should set hostname and hostname from DHCP', async () => {
    await expect(cam.device.setHostname({ name: 'happytime-test' })).resolves.toBeUndefined();
    const rebootNeeded = await cam.device.setHostnameFromDHCP({ fromDHCP: false });
    expect(typeof rebootNeeded).toBe('boolean');
  });

  it('should return and update dynamic DNS settings', async () => {
    const dynamicDNS = await cam.device.getDynamicDNS();
    expect(dynamicDNS.type).toBeDefined();
    await expect(cam.device.setDynamicDNS({ type: dynamicDNS.type })).resolves.toBeUndefined();
  });
});

describe('Network protocols and gateway', () => {
  it('should return network protocols from the mock server', async () => {
    const protocols = await cam.device.getNetworkProtocols();
    expect(protocols.length).toBeGreaterThanOrEqual(3);
    expect(protocols.find((protocol) => protocol.name === 'HTTP')?.enabled).toBe(true);
    expect(protocols.find((protocol) => protocol.name === 'RTSP')?.port).toBe(554);
  });

  it('should update network protocols', async () => {
    const protocols = await cam.device.getNetworkProtocols();
    await expect(cam.device.setNetworkProtocols({ networkProtocols: protocols })).resolves.toBeUndefined();
  });

  it('should return and update network default gateway', async () => {
    const gateway = await cam.device.getNetworkDefaultGateway();
    expect(gateway.IPv4Address).toBeDefined();
    await expect(cam.device.setNetworkDefaultGateway({ IPv4Address: gateway.IPv4Address })).resolves.toBeUndefined();
  });
});

describe('Zero configuration', () => {
  it('should return and update zero configuration', async () => {
    const zeroConfiguration = await cam.device.getZeroConfiguration();
    expect(zeroConfiguration.interfaceToken).toBeDefined();
    expect(typeof zeroConfiguration.enabled).toBe('boolean');
    await expect(
      cam.device.setZeroConfiguration({
        interfaceToken: zeroConfiguration.interfaceToken,
        enabled: zeroConfiguration.enabled,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('IP address filter', () => {
  const filter = {
    type: 'Allow' as const,
    IPv4Address: [{ address: '192.168.1.0', prefixLength: 24 }],
  };

  it('should return IP address filter', async () => {
    const result = await cam.device.getIPAddressFilter();
    expect(result.type).toBe('Allow');
  });

  it('should set, add and remove IP address filter rules', async () => {
    await expect(cam.device.setIPAddressFilter({ IPAddressFilter: { type: 'Allow' } })).resolves.toBeUndefined();
    await expect(cam.device.addIPAddressFilter({ IPAddressFilter: filter })).resolves.toBeUndefined();
    await expect(cam.device.removeIPAddressFilter({ IPAddressFilter: filter })).resolves.toBeUndefined();
  });
});

describe('Certificates', () => {
  it('should return certificates and certificate status', async () => {
    const certificates = await cam.device.getCertificates();
    const status = await cam.device.getCertificatesStatus();
    expect(certificates).toBeInstanceOf(Array);
    expect(status).toBeInstanceOf(Array);
  });
});

describe('Relay outputs', () => {
  it('should return relay outputs from the mock server', async () => {
    const relays = await cam.device.getRelayOutputs();
    expect(relays.length).toBeGreaterThanOrEqual(1);
    expect(relays[0].token).toBe(RELAY_OUTPUT_TOKEN);
    expect(relays[0].properties.mode).toBe('Monostable');
  });

  it('should update relay output settings and state', async () => {
    const relays = await cam.device.getRelayOutputs();
    const properties = relays[0].properties;
    await expect(
      cam.device.setRelayOutputSettings({ relayOutputToken: RELAY_OUTPUT_TOKEN, properties }),
    ).resolves.toBeUndefined();
    await expect(
      cam.device.setRelayOutputState({ relayOutputToken: RELAY_OUTPUT_TOKEN, logicalState: 'active' }),
    ).resolves.toBeUndefined();
    await expect(
      cam.device.setRelayOutputState({ relayOutputToken: RELAY_OUTPUT_TOKEN, logicalState: 'inactive' }),
    ).resolves.toBeUndefined();
  });
});

describe('Dot11', () => {
  it('should return dot11 capabilities', async () => {
    const capabilities = await cam.device.getDot11Capabilities();
    expect(capabilities.TKIP).toBe(true);
    expect(capabilities.scanAvailableNetworks).toBe(true);
  });

  it('should return dot11 status and scan available networks', async () => {
    await cam.device.getNetworkInterfaces();
    const interfaceToken = cam.device.networkInterfaces![0].token;
    const status = await cam.device.getDot11Status({ interfaceToken });
    expect(status).toBeDefined();
    const networks = await cam.device.scanAvailableDot11Networks({ interfaceToken });
    expect(networks).toBeInstanceOf(Array);
  });
});

describe('System information', () => {
  it('should return system URIs', async () => {
    const uris = await cam.device.getSystemUris();
    expect(uris.systemLogUris?.systemLog?.length).toBeGreaterThanOrEqual(1);
    expect(uris.supportInfoUri).toMatch(URL_REGEX);
    expect(uris.systemBackupUri).toMatch(URL_REGEX);
  });

  it('should return system log', async () => {
    const systemLog = await cam.device.getSystemLog({ logType: 'System' });
    expect(systemLog.string).toBeDefined();
  });

  it('should return firmware and restore upload URIs', async () => {
    const firmware = await cam.device.startFirmwareUpgrade();
    expect(firmware.uploadUri).toMatch(URL_REGEX);
    expect(firmware.uploadDelay).toBeDefined();
    expect(firmware.expectedDownTime).toBeDefined();

    const restore = await cam.device.startSystemRestore();
    expect(restore.uploadUri).toMatch(URL_REGEX);
    expect(restore.expectedDownTime).toBeDefined();
  });

  it('should accept setSystemFactoryDefault without error', async () => {
    await expect(cam.device.setSystemFactoryDefault({ factoryDefault: 'Soft' })).resolves.toBeUndefined();
    // Soft reset detaches Happytime media configs; restore for later suites.
    const { execFileSync } = await import('node:child_process');
    const { join } = await import('node:path');
    execFileSync(join(__dirname, 'happytime-onvif-server', 'hydrate-profiles.sh'), {
      stdio: 'inherit',
    });
  });

  it('should accept setHashingAlgorithm without error', async () => {
    await expect(cam.device.setHashingAlgorithm({ algorithm: ['MD5'] })).resolves.toBeUndefined();
  });
});

describe('Storage configuration', () => {
  it('should create, read, update and delete storage configuration', async () => {
    const configurationsBefore = await cam.device.getStorageConfigurations();
    expect(configurationsBefore).toBeInstanceOf(Array);

    const token = await cam.device.createStorageConfiguration({
      storageConfiguration: {
        type: 'NFS',
        storageUri: 'nfs://127.0.0.1/share',
      },
    });
    expect(token).toBeDefined();

    const configuration = await cam.device.getStorageConfiguration({ token });
    expect(configuration.token).toBe(token);
    expect(configuration.data.storageUri).toBe('nfs://127.0.0.1/share');

    await expect(
      cam.device.setStorageConfiguration({
        storageConfiguration: {
          token,
          data: {
            type: 'NFS',
            storageUri: 'nfs://127.0.0.1/share-updated',
          },
        },
      }),
    ).resolves.toBeUndefined();

    await expect(cam.device.deleteStorageConfiguration({ token })).resolves.toBeUndefined();
  });
});

describe('Geo location', () => {
  it('should set, return and delete geo location entries', async () => {
    const locationsBefore = await cam.device.getGeoLocation();
    expect(locationsBefore).toBeInstanceOf(Array);

    await expect(
      cam.device.setGeoLocation({
        location: [{ entity: 'Device', geoLocation: { latitude: 55.75, longitude: 37.62 } }],
      }),
    ).resolves.toBeUndefined();

    const locations = await cam.device.getGeoLocation();
    expect(locations.length).toBeGreaterThanOrEqual(1);

    await expect(cam.device.deleteGeoLocation({ location: [{ entity: 'Device' }] })).resolves.toBeUndefined();
  });
});

describe('systemReboot', () => {
  it('should return reboot message', async () => {
    // Do not reboot the shared Happytime process — that takes the server down for later suites.
    jest.spyOn(cam.device as any, 'request').mockResolvedValueOnce({
      systemRebootResponse: { message: 'Rebooting' },
    });
    const result = await cam.device.systemReboot();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
