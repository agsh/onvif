import Device from '../src/device';
import Imaging from '../src/imaging';
import { Onvif } from '../src/onvif';

const DeviceAny = Device as any;
const ImagingAny = Imaging as any;

describe('Device XML builders', () => {
  it('builds network hosts and address filters', () => {
    expect(
      DeviceAny.networkHostToBuild({
        type: 'IPv4',
        IPv4Address: '1.2.3.4',
        IPv6Address: '::1',
        DNSname: 'cam.local',
      }),
    ).toEqual({
      Type: 'IPv4',
      IPv4Address: '1.2.3.4',
      IPv6Address: '::1',
      DNSname: 'cam.local',
    });
    expect(DeviceAny.networkHostsToBuild([{ type: 'DNS', DNSname: 'a' }])).toHaveLength(1);
    expect(DeviceAny.networkHostsToBuild(undefined)).toBeUndefined();
    expect(DeviceAny.networkHostsToBuild([])).toBeUndefined();

    expect(
      DeviceAny.ipAddressFilterToBuild({
        type: 'Allow',
        IPv4Address: [
          { address: '10.0.0.0', prefixLength: 8 },
          { address: '11.0.0.0', prefixLength: 8 },
        ],
        IPv6Address: [
          { address: 'fe80::', prefixLength: 64 },
          { address: 'fe81::', prefixLength: 64 },
        ],
      }),
    ).toMatchObject({
      Type: 'Allow',
      IPv4Address: [
        { Address: '10.0.0.0', PrefixLength: 8 },
        { Address: '11.0.0.0', PrefixLength: 8 },
      ],
      IPv6Address: [
        { Address: 'fe80::', PrefixLength: 64 },
        { Address: 'fe81::', PrefixLength: 64 },
      ],
    });
  });

  it('builds users, roles, certificates and storage', () => {
    expect(DeviceAny.namesToBuild(['a', 'b'])).toEqual(['a', 'b']);
    expect(DeviceAny.namesToBuild(['only'])).toBe('only');
    expect(DeviceAny.namesToBuild(undefined)).toBeUndefined();
    expect(DeviceAny.userToBuild({ username: 'u', password: 'p', userLevel: 'Administrator' })).toEqual({
      Username: 'u',
      Password: 'p',
      UserLevel: 'Administrator',
    });
    expect(DeviceAny.userRoleToBuild({ name: 'r', functions: ['f1', 'f2'] })).toMatchObject({
      Name: 'r',
      Functions: ['f1', 'f2'],
    });
    expect(DeviceAny.remoteUserToBuild({ username: 'ru', password: 'rp', useDerivedPassword: true })).toEqual({
      Username: 'ru',
      Password: 'rp',
      UseDerivedPassword: true,
    });

    const binary = { data: 'YWJj' };
    expect(DeviceAny.binaryDataToBuild(binary)).toEqual({ _: 'YWJj' });
    expect(DeviceAny.binaryDataToBuild({ ...binary, contentType: 'text/plain' })).toEqual({
      ContentType: 'text/plain',
      _: 'YWJj',
    });
    expect(DeviceAny.certificateToBuild({ certificateID: 'c1', certificate: binary })).toMatchObject({
      CertificateID: 'c1',
    });
    expect(DeviceAny.certificatesToBuild([{ certificateID: 'c1', certificate: binary }])).toHaveLength(1);
    expect(DeviceAny.certificateStatusToBuild({ certificateID: 'c1', status: true })).toEqual({
      CertificateID: 'c1',
      Status: true,
    });
    expect(
      DeviceAny.certificateWithPrivateKeyToBuild({
        certificateID: 'c1',
        certificate: binary,
        privateKey: binary,
      }),
    ).toMatchObject({ CertificateID: 'c1' });

    expect(
      DeviceAny.storageConfigurationDataToBuild({
        type: 'NAS',
        localPath: '/tmp',
        user: { userName: 'u', password: 'p' },
      }),
    ).toMatchObject({
      Type: 'NAS',
      LocalPath: '/tmp',
      User: { UserName: 'u', Password: 'p' },
    });
    expect(
      DeviceAny.storageConfigurationToBuild({
        token: 's1',
        data: { type: 'NAS' },
      }),
    ).toMatchObject({ $: { token: 's1' } });
  });

  it('builds network protocols, relays, attachment and locations', () => {
    expect(
      DeviceAny.networkProtocolToBuild({
        name: 'HTTP',
        enabled: true,
        port: 80,
      }),
    ).toMatchObject({ Name: 'HTTP', Enabled: true, Port: 80 });

    expect(
      DeviceAny.relayOutputSettingsToBuild({
        mode: 'Monostable',
        delayTime: 'PT1S',
        idleState: 'open',
      }),
    ).toEqual({
      Mode: 'Monostable',
      DelayTime: 'PT1S',
      IdleState: 'open',
    });

    expect(
      DeviceAny.attachmentDataToBuild({
        include: { href: 'cid:1' },
        contentType: 'application/octet-stream',
      }),
    ).toEqual({
      ContentType: 'application/octet-stream',
      Include: { href: 'cid:1' },
    });

    expect(
      DeviceAny.backupFilesToBuild([
        {
          name: 'bak.bin',
          data: { include: { href: 'cid:bak' } },
        },
      ]),
    ).toHaveLength(1);

    expect(
      DeviceAny.dot1XConfigurationToBuild({
        dot1XConfigurationToken: 'd1',
        identity: 'user',
        EAPMethod: 13,
        CACertificateID: ['ca1'],
      }),
    ).toMatchObject({
      Dot1XConfigurationToken: 'd1',
      Identity: 'user',
      EAPMethod: 13,
      CACertificateID: 'ca1',
    });

    expect(
      DeviceAny.locationEntitiesToBuild([
        {
          type: 'Device',
          geo: { lon: 1, lat: 2 },
        },
      ]),
    ).toHaveLength(1);
    expect(DeviceAny.locationEntitiesToBuild(undefined)).toBeUndefined();
  });

  it('covers device request builders via mocked request', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const device = new Device(onvif);
    const calls: unknown[] = [];
    jest.spyOn(device as any, 'request').mockImplementation(async (body: unknown) => {
      calls.push(body);
      return {
        setNTPResponse: [],
        setDNSResponse: [],
      };
    });
    jest.spyOn(device, 'getNTP').mockResolvedValue({} as any);
    jest.spyOn(device, 'getDNS').mockResolvedValue({} as any);

    await device.setNTP({ fromDHCP: false, NTPManual: [{ type: 'IPv4', IPv4Address: '8.8.8.8' }] });
    await device.setDNS({ fromDHCP: false, searchDomain: ['lan'], DNSManual: [{ type: 'IPv4', IPv4Address: '1.1.1.1' }] });
    await device.createUsers({ user: [{ username: 'x', password: 'y', userLevel: 'User' }] });
    await device.deleteUsers({ username: ['x'] });
    await device.setUser({ user: [{ username: 'x', password: 'y', userLevel: 'User' }] });
    await device.setNetworkProtocols({ networkProtocols: [{ name: 'RTSP', enabled: true, port: [554] }] });
    await device.setHashingAlgorithm({ algorithm: ['SHA256'] });
    await device.setDPAddresses({ DPAddress: [{ type: 'IPv4', IPv4Address: '1.1.1.1' }] });

    expect(calls.length).toBeGreaterThanOrEqual(8);
    expect(calls.some((c) => c && typeof c === 'object' && 'SetNTP' in (c as object))).toBe(true);
    expect(calls.some((c) => c && typeof c === 'object' && 'CreateUsers' in (c as object))).toBe(true);
  });
});

describe('Imaging XML builders', () => {
  it('serializes imaging settings and focus move payloads', () => {
    expect(
      ImagingAny.imagingSettingsToBuild({
        brightness: 50,
        contrast: 40,
        colorSaturation: 30,
        sharpness: 20,
        irCutFilter: 'AUTO',
        backlightCompensation: { mode: 'ON', level: 1 },
        exposure: {
          mode: 'MANUAL',
          priority: 'LowNoise',
          window: { bottom: 1, top: 0, right: 1, left: 0 },
          minExposureTime: 1,
          maxExposureTime: 2,
          minGain: 1,
          maxGain: 2,
          minIris: 1,
          maxIris: 2,
          exposureTime: 1.5,
          gain: 1.2,
          iris: 0.5,
        },
        focus: {
          autoFocusMode: 'AUTO',
          AFMode: ['Wide'],
          defaultSpeed: 1,
          nearLimit: 0.1,
          farLimit: 10,
        },
        wideDynamicRange: { mode: 'ON', level: 2 },
        whiteBalance: { mode: 'AUTO', crGain: 1, cbGain: 2 },
      }),
    ).toMatchObject({
      Brightness: 50,
      Contrast: 40,
      Exposure: { Mode: 'MANUAL' },
      Focus: { AutoFocusMode: 'AUTO' },
    });

    expect(
      ImagingAny.focusMoveToBuild({
        absolute: { position: 0.5, speed: 1 },
        relative: { distance: 0.1, speed: 0.5 },
        continuous: { speed: 0.2 },
      }),
    ).toEqual({
      Absolute: { Position: 0.5, Speed: 1 },
      Relative: { Distance: 0.1, Speed: 0.5 },
      Continuous: { Speed: 0.2 },
    });
  });
});
