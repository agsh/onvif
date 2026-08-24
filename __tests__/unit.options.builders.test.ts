/**
 * Unit tests for optional request fields, XML builders, and edge-case client paths.
 * @jest-environment node
 */

import AccessRules from '../src/accessrules';
import Credential from '../src/credential';
import Device from '../src/device';
import { Onvif } from '../src/onvif';
import { lazyService } from '../src/service';
import Events from '../src/events';

describe('Service options and builders', () => {
  it('builds and manages AccessRules profiles with optional fields', async () => {
    const AR = AccessRules as any;
    expect(
      AR.accessProfileToBuild({
        token: 'ap1',
        name: 'Profile',
        description: 'd',
        accessPolicy: [
          { scheduleToken: 's1', entity: 'door1', entityType: 'Door', extension: { x: 1 } },
          { scheduleToken: 's2', entity: 'door2' },
        ],
        extension: {},
      }),
    ).toMatchObject({ Name: 'Profile' });
    expect(AR.accessProfileToBuild({ token: 'ap2', name: 'P2' })).toMatchObject({ Name: 'P2' });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const accessRules = new AccessRules(onvif);
    jest.spyOn(accessRules as any, 'request').mockImplementation(async (body: any) => {
      const root = Object.keys(body)[0];
      if (root === 'CreateAccessProfile') {
        return { createAccessProfileResponse: { token: 'ap1' } };
      }
      return { [`${root.charAt(0).toLowerCase()}${root.slice(1)}Response`]: {} };
    });

    await accessRules.getAccessProfileInfoList({ limit: 5, startReference: 'r' });
    await accessRules.getAccessProfileList({ limit: 3, startReference: 'r' });
    await accessRules.createAccessProfile({
      accessProfile: {
        token: '',
        name: 'P',
        description: 'd',
        accessPolicy: [{ scheduleToken: 's1', entity: 'e1', entityType: 'Door' }],
      },
    } as any);
    await accessRules.setAccessProfile({
      accessProfile: { token: 'ap1', name: 'P', extension: {} },
    } as any);
    await accessRules.modifyAccessProfile({
      accessProfile: { token: 'ap1', name: 'P2' },
    } as any);
    await accessRules.deleteAccessProfile({ token: 'ap1' });
  });

  it('filters credential whitelist and blacklist with optional query fields', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const credential = new Credential(onvif);
    jest.spyOn(credential as any, 'request').mockResolvedValue({
      getWhitelistResponse: {},
      getBlacklistResponse: {},
    });
    await credential.getWhitelist({
      limit: 10,
      startReference: 's',
      identifierType: 'pt:Card',
      formatType: 'GUID',
      value: '1',
    });
    await credential.getBlacklist({
      limit: 10,
      startReference: 's',
      identifierType: 'pt:Card',
      formatType: 'GUID',
      value: '1',
    });
    await credential.getWhitelist({});
    await credential.getBlacklist({});
  });

  it('applies Onvif constructor defaults, parseUrl preserveAddress, and digest NC wrap', async () => {
    const secure = new Onvif({
      hostname: 'cam.local',
      useSecure: true,
      port: 8443,
      path: '/custom',
      timeout: 1000,
      preserveAddress: true,
      useWSSecurity: false,
      urn: 'urn:uuid:test',
      autoConnect: false,
    });
    expect(secure.port).toBe(8443);
    expect(secure.useSecure).toBe(true);

    const defaultsHttp = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    expect(defaultsHttp.port).toBe(80);
    expect((defaultsHttp.agent as { keepAlive?: boolean }).keepAlive).toBe(true);
    const defaultsHttps = new Onvif({ hostname: '127.0.0.1', useSecure: true, autoConnect: false });
    expect(defaultsHttps.port).toBe(443);
    expect((defaultsHttps.agent as { keepAlive?: boolean }).keepAlive).toBe(true);

    const preserved = secure.parseUrl('http://other.host:8000/onvif/media_service');
    expect(preserved.hostname).toBe('cam.local');
    expect(preserved.port).toBe('8443');

    const unchanged = defaultsHttp.parseUrl('http://127.0.0.1/onvif/device_service');
    expect(unchanged.hostname).toBe('127.0.0.1');

    (secure as any).nc = 99999999;
    expect((secure as any).updateNC()).toBe('00000001');
    expect((secure as any).updateNC()).toBe('00000002');
  });

  it('serializes Device geo location entities with optional fields', () => {
    const DeviceAny = Device as any;
    expect(DeviceAny.locationEntitiesToBuild(undefined)).toBeUndefined();
    expect(DeviceAny.locationEntitiesToBuild([])).toBeUndefined();
    expect(
      DeviceAny.locationEntitiesToBuild([
        {
          entity: 'Device',
          token: 't1',
          fixed: true,
          geoSource: true,
          autoGeo: false,
          geoLocation: { lon: 1, lat: 2, elevation: 3 },
          geoOrientation: { roll: 1, pitch: 2, yaw: 3 },
          localLocation: { x: 1, y: 2, z: 3 },
          localOrientation: { pan: 1, tilt: 2, roll: 3 },
        },
        { entity: 'Device' },
      ]),
    ).toHaveLength(2);
  });

  it('loads lazyService proxies for methods, properties, and set/has', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    class Dummy {
      constructor(public onvif: Onvif) {}
      value = 42;
      async ping() {
        return 'pong';
      }
    }
    const proxy = lazyService(onvif, async () => ({ default: Dummy }));
    expect('ping' in proxy).toBe(false);
    await expect((proxy as any).value(1)).rejects.toThrow(/not a method/);
    expect(await (proxy as any).ping()).toBe('pong');
    expect('ping' in proxy).toBe(true);
    expect((proxy as any).value).toBe(42);
    (proxy as any).value = 7;
    expect((proxy as any).value).toBe(7);

    const unloaded = lazyService(onvif, async () => ({ default: Dummy }));
    expect(() => {
      (unloaded as any).value = 1;
    }).toThrow(/before class is loaded/);
  });

  it('builds event filters and event broker configs with optional fields', async () => {
    expect(Events.filterToBuild({ topicExpression: [] })).toBeUndefined();
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.events = new URL('http://127.0.0.1:8000/onvif/events_service');
    const events = new Events(onvif);
    jest.spyOn(onvif, 'request').mockResolvedValue([{ getEventBrokersResponse: {} }, ''] as any);
    await events.addEventBroker({
      eventBroker: {
        address: 'mqtts://broker',
        topicPrefix: 'onvif',
        userName: 'u',
        password: 'p',
        certificateID: 'c',
        publishFilter: {},
        qoS: 1,
        certPathValidationPolicyID: 'pol',
        metadataFilter: {},
      },
    } as any);
    await events.getEventBrokers();
  });

  it('maps Cam NTP, users, encoder, and stream helper overloads', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    Object.defineProperty(onvif, 'device', {
      value: {
        setNTP: jest.fn().mockResolvedValue({}),
        setUser: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
    Object.defineProperty(onvif, 'media', {
      value: {
        getVideoEncoderConfiguration: jest.fn().mockResolvedValue({ token: 've1' }),
        getVideoEncoderConfigurationOptions: jest.fn().mockResolvedValue({}),
        getStreamUri: jest.fn().mockResolvedValue({ uri: 'rtsp://x' }),
        getSnapshotUri: jest.fn().mockResolvedValue({ uri: 'http://x' }),
      },
      configurable: true,
    });
    const { Cam } = await import('../src/compatibility/cam');
    const cam = Object.create(Cam.prototype) as any;
    cam.onvif = onvif;
    cam.videoEncoderConfigurations = [{ $: { token: 've-from-$' } }];

    await new Promise<void>((resolve, reject) =>
      cam.setNTP({ type: 'IPv4', ipv4Address: '8.8.8.8' }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.setUsers([{ username: 'u' }], (e: Error | null) => {
        expect(e).toBeInstanceOf(Error);
        resolve();
      }),
    );
    await new Promise<void>((resolve, reject) =>
      cam.getVideoEncoderConfiguration((e: Error | null, result?: unknown) => (e ? reject(e) : resolve())),
    );
    expect(cam.getVideoEncoderConfigurationOptions()).toBeUndefined();
    expect(cam.getStreamUri({})).toBeUndefined();
    expect(cam.getSnapshotUri({})).toBeUndefined();
    await new Promise<void>((resolve, reject) =>
      cam.getStreamUri({}, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.getSnapshotUri({ profileToken: 'p1' }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
  });

  it('rejects invalid Device setScopes/setNTP/setDNS responses and empty networkInterface', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const device = new Device(onvif);
    jest.spyOn(device as any, 'request').mockImplementation(async (body: any) => {
      const root = Object.keys(body)[0];
      if (root === 'SetScopes') {
        return { setScopesResponse: ['not-empty'] };
      }
      if (root === 'SetNTP') {
        return { setNTPResponse: ['bad'] };
      }
      if (root === 'SetDNS') {
        return { setDNSResponse: ['bad'] };
      }
      if (root === 'GetNTP') {
        return {
          getNTPResponse: {
            NTPInformation: {
              NTPManual: { type: 'IPv4', IPv4Address: '1.1.1.1' },
              NTPFromDHCP: { type: 'IPv4', IPv4Address: '1.1.1.1' },
            },
          },
        };
      }
      if (root === 'GetDNS') {
        return {
          getDNSResponse: {
            DNSInformation: {
              DNSManual: { type: 'IPv4', IPv4Address: '1.1.1.1' },
              DNSFromDHCP: { type: 'IPv4', IPv4Address: '1.1.1.1' },
            },
          },
        };
      }
      if (root === 'GetNetworkInterfaces') {
        return { getNetworkInterfacesResponse: { networkInterfaces: { token: 'eth0' } } };
      }
      if (root === 'SetNetworkInterfaces') {
        return { setNetworkInterfacesResponse: { rebootNeeded: false } };
      }
      return {};
    });
    jest.spyOn(device, 'getNTP').mockResolvedValue({} as any);
    jest.spyOn(device, 'getDNS').mockResolvedValue({} as any);

    await expect(device.setScopes(['onvif://www.onvif.org/name/test'] as any)).rejects.toThrow(/Wrong `SetScopes`/);
    (device.getNTP as jest.Mock).mockRestore();
    (device.getDNS as jest.Mock).mockRestore();
    await device.getNTP();
    await device.getDNS();
    await expect(device.setNTP({ fromDHCP: false, NTPManual: [{ type: 'IPv4', IPv4Address: '8.8.8.8' }] })).rejects.toThrow(
      /Wrong `SetNTP`/,
    );
    await expect(
      device.setDNS({ fromDHCP: false, DNSManual: [{ type: 'IPv4', IPv4Address: '8.8.8.8' }] }),
    ).rejects.toThrow(/Wrong `SetDNS`/);
    await device.getNetworkInterfaces();
    await device.setNetworkInterfaces({ interfaceToken: 'eth0' } as any);
  });

  it('builds PTZ preset tours and Search request payloads with optional fields', async () => {
    const PTZ = (await import('../src/ptz')).default as any;
    expect(PTZ.PTZVectorToXML(undefined)).toBeUndefined();
    expect(PTZ.formatPTZSimpleVector({ x: 1, y: 2, zoom: 3 })).toMatchObject({ panTilt: { x: 1, y: 2 } });
    expect(PTZ.formatPTZSimpleVector({ pan: 1, tilt: 2, zoom: 3 })).toMatchObject({ panTilt: { x: 1, y: 2 } });
    expect(
      PTZ.presetTourPresetDetailToXML({
        presetToken: 'p1',
        home: true,
        PTZPosition: { panTilt: { x: 0, y: 0 }, zoom: { x: 0 } },
        extension: {},
      }),
    ).toMatchObject({ PresetToken: 'p1', Home: true });
    expect(PTZ.presetTourPresetDetailToXML({})).toEqual({});
    expect(
      PTZ.presetTourSpotToXML({
        presetDetail: { presetToken: 'p1' },
        speed: { panTilt: { x: 0.1, y: 0.1 }, zoom: { x: 0 } },
        stayTime: 'PT1S',
        extension: {},
      }),
    ).toMatchObject({ StayTime: 'PT1S' });
    expect(
      PTZ.presetTourToXML({
        token: 't1',
        name: 'Tour',
        status: {
          state: 'Idle',
          currentTourSpot: { presetDetail: { home: true } },
          extension: {},
        },
        autoStart: true,
        startingCondition: {
          randomPresetOrder: true,
          recurringTime: 1,
          recurringDuration: 'PT1H',
          direction: 'Forward',
          extension: {},
        },
        tourSpot: [{ presetDetail: { presetToken: 'p1' }, stayTime: 'PT2S' }],
        extension: {},
      }),
    ).toMatchObject({ Name: 'Tour', AutoStart: true });
    expect(PTZ.presetTourToXML({})).toEqual({});

    const Search = (await import('../src/search')).default as any;
    expect(Search.recordingTokensToBuild(undefined)).toBeUndefined();
    expect(Search.recordingTokensToBuild([])).toBeUndefined();
    expect(Search.recordingTokensToBuild(['r1'])).toBe('r1');
    expect(Search.recordingTokensToBuild(['r1', 'r2'])).toEqual(['r1', 'r2']);
    expect(
      Search.searchScopeToBuild({
        includedSources: [{ type: 'http://www.onvif.org/ver10/schema/Profile', token: 'p1' }],
        includedRecordings: ['r1'],
        recordingInformationFilter: 'true()',
        extension: {},
      }),
    ).toMatchObject({ IncludedRecordings: 'r1' });
    expect(
      Search.searchScopeToBuild({
        includedRecordings: ['r1', 'r2'],
      }),
    ).toMatchObject({ IncludedRecordings: ['r1', 'r2'] });
    expect(Search.searchScopeToBuild({})).toEqual({});
    expect(
      Search.ptzPositionFilterToBuild({
        minPosition: { panTilt: { x: 0, y: 0 }, zoom: { x: 0 } },
        maxPosition: { panTilt: { x: 1, y: 1 }, zoom: { x: 1 } },
        enterOrExit: true,
      }),
    ).toMatchObject({ EnterOrExit: true });
    expect(Search.metadataFilterToBuild({ metadataStreamFilter: 'true()' })).toMatchObject({
      MetadataStreamFilter: 'true()',
    });
    expect(
      Search.searchResultsRequestToBuild({
        searchToken: 's1',
        minResults: 1,
        maxResults: 10,
        waitTime: 'PT1S',
      }),
    ).toMatchObject({ SearchToken: 's1', MinResults: 1 });
    expect(Search.searchResultsRequestToBuild({ searchToken: 's1' })).toMatchObject({ SearchToken: 's1' });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const search = new (await import('../src/search')).default(onvif);
    jest.spyOn(search as any, 'request').mockResolvedValue({
      findRecordingsResponse: { searchToken: 's1' },
      findEventsResponse: { searchToken: 's1' },
      findPTZPositionResponse: { searchToken: 's1' },
      findMetadataResponse: { searchToken: 's1' },
      getRecordingSearchResultsResponse: {},
      getEventSearchResultsResponse: {},
      getPTZPositionSearchResultsResponse: {},
      getMetadataSearchResultsResponse: {},
      getMediaAttributesResponse: { mediaAttributes: [] },
    });
    await search.findRecordings({
      scope: { includedRecordings: ['r1'] },
      maxMatches: 10,
      keepAliveTime: 'PT60S',
    } as any);
    await search.findEvents({
      startPoint: new Date().toISOString(),
      scope: { includedRecordings: ['r1'] },
      searchFilter: { topicExpression: 'tns1:Device' },
      includeStartState: true,
      maxMatches: 5,
      keepAliveTime: 'PT60S',
    } as any);
    await search.findPTZPosition({
      startPoint: new Date().toISOString(),
      scope: {},
      searchFilter: {
        minPosition: { panTilt: { x: 0, y: 0 }, zoom: { x: 0 } },
        maxPosition: { panTilt: { x: 1, y: 1 }, zoom: { x: 1 } },
        enterOrExit: false,
      },
      maxMatches: 5,
      keepAliveTime: 'PT60S',
    } as any);
    await search.findMetadata({
      startPoint: new Date().toISOString(),
      scope: {},
      metadataFilter: { metadataStreamFilter: 'true()' },
      maxMatches: 5,
      keepAliveTime: 'PT60S',
    } as any);
    await search.getRecordingSearchResults({ searchToken: 's1', minResults: 1, maxResults: 2, waitTime: 'PT1S' });
    await search.getEventSearchResults({ searchToken: 's1' });
    await search.getPTZPositionSearchResults({ searchToken: 's1', maxResults: 1 });
    await search.getMetadataSearchResults({ searchToken: 's1', waitTime: 'PT1S' });
    await search.getMediaAttributes({ recordingTokens: ['r1', 'r2'], time: new Date().toISOString() } as any);
  });

  it('forwards Cam absolute move and imaging helpers with and without callbacks', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    Object.defineProperty(onvif, 'ptz', {
      value: {
        absoluteMove: jest.fn().mockResolvedValue(undefined),
        relativeMove: jest.fn().mockResolvedValue(undefined),
        continuousMove: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
    Object.defineProperty(onvif, 'imaging', {
      value: {
        getOptions: jest.fn().mockResolvedValue({}),
        getPresets: jest.fn().mockResolvedValue([]),
        getCurrentPreset: jest.fn().mockResolvedValue({}),
      },
      configurable: true,
    });
    onvif.activeSource = { videoSourceToken: 'vs1', profileToken: 'p1' } as any;
    const { Cam } = await import('../src/compatibility/cam');
    const cam = Object.create(Cam.prototype) as any;
    cam.onvif = onvif;
    cam.emit = jest.fn();

    cam.absoluteMove({ x: 0.1, y: 0.2, zoom: 0.3 });
    cam.absoluteMove({ x: 0.1, y: 0.2, zoom: 0.3, onlySendZoom: true } as any);
    await new Promise<void>((resolve, reject) =>
      cam.absoluteMove({ x: 0.1, y: 0.2, zoom: 0.3 }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    cam.getVideoSourceOptions();
    expect(cam.getVideoSourceOptions({ token: 'vs1' })).toBeUndefined();
    await new Promise<void>((resolve, reject) =>
      cam.getVideoSourceOptions({ token: 'vs1' }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.getCurrentImagingPreset({}, (e: Error | null) => (e ? reject(e) : resolve())),
    );
  });

  it('creates Media OSDs and validates Cam pull/renew without a subscription', async () => {
    const Media = (await import('../src/media')).default;
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.activeSource = {
      videoSourceToken: 'vs1',
      videoSourceConfigurationToken: 'vsc1',
      profileToken: 'p1',
    } as any;
    onvif.device.media2Support = false;
    const media = new Media(onvif);
    jest.spyOn(media as any, 'request').mockResolvedValue({
      createOSDResponse: { OSDToken: 'osd1' },
      getOSDOptionsResponse: { OSDOptions: {} },
    });
    await media.createOSD({
      token: 'osd1',
      videoSourceConfigurationToken: 'vsc1',
      type: 'Text',
      position: { type: 'Custom', pos: { x: 0.1, y: 0.2 }, extension: {} },
      textString: {
        isPersistentText: true,
        type: 'Plain',
        dateFormat: 'M/d/yyyy',
        timeFormat: 'h:mm:ss tt',
        fontSize: 16,
        fontColor: { color: { X: 0, Y: 0, Z: 0 }, transparent: 0 },
        backgroundColor: { color: { X: 1, Y: 1, Z: 1 }, transparent: 1 },
        plainText: 'hello',
        extension: {},
      },
      image: { imgPath: '/img.png', extension: {} },
      extension: {},
    } as any);
    await media.createOSD({
      token: 'osd2',
      videoSourceConfigurationToken: 'vsc1',
      type: 'Text',
      position: { type: 'UpperLeft' },
    } as any);
    await media.getOSDOptions({} as any);
    await media.getOSDOptions({ configurationToken: 'vsc1' });

    const PTZ = (await import('../src/ptz')).default as any;
    expect(PTZ.PTZVectorToXML({ x: 0.1, y: 0.2, zoom: 0.3 })).toBeDefined();
    expect(PTZ.PTZVectorToXML({ pan: 0.1, tilt: 0.2, zoom: 0.3 })).toBeDefined();
    expect(PTZ.PTZVectorToXML({ panTilt: { x: 0, y: 0 }, zoom: { x: 0 } })).toBeDefined();

    const { Cam } = await import('../src/compatibility/cam');
    const cam = Object.create(Cam.prototype) as any;
    cam.onvif = onvif;
    cam.events = {};
    cam.pullPointSubscription = undefined;
    await expect(
      new Promise((_, reject) => cam.pullMessages({}, (e: Error | null) => reject(e))),
    ).rejects.toBeInstanceOf(Error);
    expect(cam.pullMessages({})).toBeUndefined();
    await expect(new Promise((_, reject) => cam.renew((e: Error | null) => reject(e)))).rejects.toBeInstanceOf(
      Error,
    );
    expect(cam.renew()).toBeUndefined();
    cam.events = { subscription: { subscriptionReference: { address: 'http://x' } } };
    cam.pullPointSubscription = {
      subscription: {},
      pullMessages: jest.fn().mockResolvedValue({}),
      renew: jest.fn().mockResolvedValue({}),
    };
    await new Promise<void>((resolve, reject) =>
      cam.pullMessages({}, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.renew({}, (e: Error | null) => (e ? reject(e) : resolve())),
    );
  });
});
