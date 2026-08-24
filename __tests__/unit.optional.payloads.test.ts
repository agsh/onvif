/**
 * Unit tests for optional request fields and empty SOAP response fallbacks.
 * @jest-environment node
 */

import AccessControl from '../src/accesscontrol';
import AccessRules from '../src/accessrules';
import ActionEngine from '../src/actionengine';
import AdvancedSecurity from '../src/advancedsecurity';
import Analytics from '../src/analytics';
import Credential from '../src/credential';
import Device from '../src/device';
import DeviceIO from '../src/deviceio';
import Display from '../src/display';
import DoorControl from '../src/doorcontrol';
import Recording from '../src/recording';
import Schedule from '../src/schedule';
import Media from '../src/media';
import { Onvif } from '../src/onvif';

function mockEmpty(service: { request: (...args: any[]) => any }) {
  return jest.spyOn(service as any, 'request').mockImplementation(async (body: any) => {
    const root = Object.keys(body)[0];
    return { [`${root.charAt(0).toLowerCase()}${root.slice(1)}Response`]: {} };
  });
}

describe('Optional payloads and empty responses', () => {
  it('covers pagination options and empty-list fallbacks across access services', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const page = { limit: 5, startReference: 'ref-1' };

    const accessControl = new AccessControl(onvif);
    mockEmpty(accessControl);
    expect(await accessControl.getServiceCapabilities()).toEqual({});
    expect(await accessControl.getAccessPointInfoList(page)).toEqual({});
    expect(await accessControl.getAccessPointList(page)).toEqual({});
    expect(await accessControl.getAccessPointInfo({ token: ['ap1'] })).toEqual({});
    expect(await accessControl.getAccessPoints({ token: ['ap1'] })).toEqual({});
    expect(await accessControl.getAreaInfoList(page)).toEqual({});
    expect(await accessControl.getAreaList(page)).toEqual({});
    expect(await accessControl.getAreaInfo({ token: ['a1'] })).toEqual({});
    expect(await accessControl.getAreas({ token: ['a1'] })).toEqual({});

    const doorControl = new DoorControl(onvif);
    mockEmpty(doorControl);
    expect(await doorControl.getServiceCapabilities()).toEqual({});
    expect(await doorControl.getDoorInfoList(page)).toEqual({});
    expect(await doorControl.getDoorList(page)).toEqual({});
    expect(await doorControl.getDoorInfo({ token: ['d1'] })).toEqual({});
    expect(await doorControl.getDoors({ token: ['d1'] })).toEqual({});
    await doorControl.createDoor({
      door: {
        token: '',
        name: 'Door',
        doorType: 'pt:Door',
        timings: {
          releaseTime: 'PT3S',
          openTime: 'PT7S',
          extendedReleaseTime: 'PT10S',
          delayTimeBeforeRelock: 'PT1S',
          extendedOpenTime: 'PT30S',
          preAlarmTime: 'PT2S',
          extension: { vendor: true },
        },
        capabilities: { access: true, lock: true },
        extension: { extra: 1 },
        description: 'main',
      },
    } as any);
    await doorControl.accessDoor({
      token: 'd1',
      useExtendedTime: true,
      accessTime: 'PT5S',
      openTooLongTime: 'PT10S',
      preAlarmTime: 'PT1S',
      extension: {},
    } as any);

    const credential = new Credential(onvif);
    mockEmpty(credential);
    expect(await credential.getServiceCapabilities()).toEqual({});
    expect(await credential.getSupportedFormatTypes({ credentialIdentifierTypeName: 'pt:Card' })).toEqual([]);
    expect(await credential.getCredentialInfo({ token: ['c1'] })).toEqual({});
    expect(await credential.getCredentialInfoList(page)).toEqual({});
    expect(await credential.getCredentials({ token: ['c1'] })).toEqual({});
    expect(await credential.getCredentialList(page)).toEqual({});
    expect(await credential.getCredentialIdentifiers({ credentialToken: 'c1' })).toEqual([]);
    expect(await credential.getCredentialAccessProfiles({ credentialToken: 'c1' })).toEqual([]);

    const schedule = new Schedule(onvif);
    const ScheduleAny = Schedule as any;
    expect(
      ScheduleAny.timePeriodToBuild({ from: 'PT9H', until: 'PT17H', extension: { x: 1 } }),
    ).toMatchObject({ Extension: { x: 1 } });
    mockEmpty(schedule);
    expect(await schedule.getServiceCapabilities()).toEqual({});
    expect(await schedule.getScheduleInfoList(page)).toEqual({});
    expect(await schedule.getScheduleList(page)).toEqual({});
    expect(await schedule.getScheduleInfo({ token: ['s1'] })).toEqual({});
    expect(await schedule.getSchedules({ token: ['s1'] })).toEqual({});
    expect(await schedule.getSpecialDayGroupInfoList(page)).toEqual({});
    expect(await schedule.getSpecialDayGroupList(page)).toEqual({});
    expect(await schedule.getSpecialDayGroupInfo({ token: ['g1'] })).toEqual({});
    expect(await schedule.getSpecialDayGroups({ token: ['g1'] })).toEqual({});
    await schedule.createSchedule({
      schedule: {
        token: '',
        name: 'Work',
        standard: 'PT0S',
        specialDays: [
          {
            groupToken: 'g1',
            timeRange: [{ from: 'PT0S', until: 'PT1H', extension: {} }],
            extension: {},
          },
        ],
        extension: {},
      },
    } as any);

    const accessRules = new AccessRules(onvif);
    mockEmpty(accessRules);
    expect(await accessRules.getServiceCapabilities()).toEqual({});
    expect(await accessRules.getAccessProfileInfo({ token: ['ap1'] })).toEqual({});
    expect(await accessRules.getAccessProfiles({ token: ['ap1'] })).toEqual({});
  });

  it('covers Device builder optional fields and empty user/protocol responses', async () => {
    const DeviceAny = Device as any;
    expect(
      DeviceAny.networkHostToBuild({ type: 'DNS', DNSname: 'cam.local', extension: { e: 1 } }),
    ).toMatchObject({ Extension: { e: 1 } });
    expect(
      DeviceAny.ipAddressFilterToBuild({
        type: 'Deny',
        IPv4Address: [{ address: '10.0.0.0', prefixLength: 8 }],
        extension: {},
      }),
    ).toMatchObject({ Extension: {} });
    expect(
      DeviceAny.networkProtocolToBuild({
        name: 'HTTP',
        enabled: true,
        port: [80, 8080],
        extension: {},
      }),
    ).toMatchObject({ Port: [80, 8080], Extension: {} });
    expect(
      DeviceAny.userToBuild({
        username: 'u',
        password: 'p',
        userLevel: 'Administrator',
        extension: {},
      }),
    ).toMatchObject({ Extension: {} });
    expect(
      DeviceAny.dot1XConfigurationToBuild({
        dot1XConfigurationToken: 'd1',
        identity: 'user',
        anonymousID: 'anon',
        EAPMethod: 13,
        CACertificateID: ['ca1', 'ca2'],
        EAPMethodConfiguration: {
          TLSConfiguration: { certificateID: 'c1' },
          password: 'secret',
          extension: {},
        },
        extension: {},
      }),
    ).toMatchObject({
      AnonymousID: 'anon',
      EAPMethodConfiguration: {
        TLSConfiguration: { CertificateID: 'c1' },
        Password: 'secret',
        Extension: {},
      },
    });
    expect(
      DeviceAny.storageConfigurationDataToBuild({
        type: 'NAS',
        region: 'eu',
        localPath: '/tmp',
        storageUri: 'nfs://host/share',
        user: { userName: 'u', password: 'p', token: 't', extension: {} },
        extension: {},
        certPathValidationPolicyID: 'pol',
        configurationRenewal: {
          renewalEndpoint: 'https://renew',
          authorizationServer: 'as1',
          certPathValidationPolicyID: 'pol',
          error: 'none',
        },
      }),
    ).toMatchObject({
      Region: 'eu',
      ConfigurationRenewal: { Error: 'none' },
    });
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
      ]),
    ).toMatchObject([
      {
        Entity: 'Device',
        token: 't1',
        Fixed: true,
        GeoSource: true,
        AutoGeo: false,
      },
    ]);

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const device = new Device(onvif);
    mockEmpty(device);
    expect(await device.getUsers()).toEqual([]);
    expect(await device.getNetworkProtocols()).toEqual([]);
    expect(await device.getUserRoles({})).toEqual([]);
    expect(await device.getUserRoles({ userRole: 'Administrator' })).toEqual([]);
    await device.createCertificate({
      certificateID: 'c1',
      subject: 'CN=test',
      validNotBefore: '2020-01-01T00:00:00Z',
      validNotAfter: '2030-01-01T00:00:00Z',
    } as any);
    await device.setNetworkDefaultGateway({ IPv4Address: ['1.1.1.1'], IPv6Address: ['::1'] });
    await device.createDot1XConfiguration({
      dot1XConfiguration: {
        dot1XConfigurationToken: 'd1',
        identity: 'user',
        anonymousID: 'anon',
        EAPMethod: 13,
        CACertificateID: ['ca1'],
        EAPMethodConfiguration: {
          TLSConfiguration: { certificateID: 'c1' },
          password: 'p',
          extension: {},
        },
        extension: {},
      },
    } as any);
    await device.createStorageConfiguration({
      storageConfiguration: {
        type: 'NAS',
        region: 'eu',
        storageUri: 'nfs://x',
        user: { userName: 'u', password: 'p', token: 't', extension: {} },
        extension: {},
        certPathValidationPolicyID: 'pol',
        configurationRenewal: {
          renewalEndpoint: 'https://renew',
          authorizationServer: 'as1',
          certPathValidationPolicyID: 'pol',
          error: 'none',
        },
      },
    } as any);
  });

  it('covers Recording, Display, ActionEngine, Analytics, DeviceIO and Media optionals', async () => {
    const Rec = Recording as any;
    expect(
      Rec.recordingConfigurationToBuild({
        source: { sourceId: 'id', name: 'n', location: 'l', description: 'd', address: 'rtsp://x' },
        content: 'c',
        maximumRetentionTime: 'PT0S',
        target: 'NAS',
      }),
    ).toMatchObject({ Target: 'NAS' });
    expect(
      Rec.recordingJobSourceToBuild({
        sourceToken: { type: 'Profile', token: 'p1' },
        autoCreateReceiver: true,
        tracks: { sourceTag: 'Video', destination: 'VIDEO001' },
        extension: {},
      }),
    ).toMatchObject({ AutoCreateReceiver: true, Extension: {} });
    expect(
      Rec.recordingJobConfigurationToBuild({
        recordingToken: 'r1',
        mode: 'Idle',
        priority: 1,
        source: [
          { tracks: [{ sourceTag: 'V', destination: 'V1' }] },
          { tracks: [{ sourceTag: 'A', destination: 'A1' }] },
        ],
        extension: {},
        eventFilter: { topicExpression: 'tns1:Device' },
      }),
    ).toMatchObject({ Extension: {}, EventFilter: { topicExpression: 'tns1:Device' } });
    expect(
      Rec.searchScopeToBuild({
        includedRecordings: ['r1'],
        extension: {},
      }),
    ).toMatchObject({ Extension: {} });
    expect(
      Rec.storageDestinationToBuild({
        storageToken: 's1',
        relativePath: '/e',
        extension: {},
      }),
    ).toMatchObject({ Extension: {} });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const recording = new Recording(onvif);
    mockEmpty(recording);
    expect(await recording.getServiceCapabilities()).toEqual({});
    expect(await recording.getRecordings()).toEqual([]);
    expect(await recording.getRecordingJobs()).toEqual([]);
    await recording.createRecording({
      recordingConfiguration: {
        source: { sourceId: 'id', name: 'n', location: 'l', description: 'd', address: 'rtsp://x' },
        content: 'c',
        maximumRetentionTime: 'PT1H',
        target: 'NAS',
      },
    } as any);
    await recording.createRecordingJob({
      jobConfiguration: {
        recordingToken: 'r1',
        mode: 'Idle',
        priority: 1,
        source: {
          sourceToken: { type: 'Profile', token: 'p1' },
          autoCreateReceiver: false,
          tracks: { sourceTag: 'Video', destination: 'VIDEO001' },
          extension: {},
        },
        extension: {},
        eventFilter: {},
      },
    } as any);

    const DisplayAny = Display as any;
    expect(DisplayAny.paneConfigurationsToBuild(undefined)).toBeUndefined();
    expect(DisplayAny.paneConfigurationsToBuild([])).toBeUndefined();
    const pane = {
      token: 'p1',
      paneName: 'Main',
      audioOutputToken: 'ao1',
      audioSourceToken: 'as1',
      receiverToken: 'rx1',
      audioEncoderConfiguration: {
        token: 'ae1',
        name: 'ae',
        useCount: 1,
        encoding: 'G711',
        bitrate: 64,
        sampleRate: 8,
        multicast: {
          address: { type: 'IPv4', IPv4Address: '224.0.0.1' },
          port: 1234,
          TTL: 1,
          autoStart: false,
        },
        sessionTimeout: 'PT1S',
      },
    };
    expect(DisplayAny.paneConfigurationsToBuild([pane])).toHaveLength(1);

    const display = new Display(onvif);
    mockEmpty(display);
    expect(await display.getServiceCapabilities()).toEqual({});
    expect(await display.getPaneConfigurations({ videoOutput: 'vo1' })).toEqual([]);
    await display.setLayout({
      videoOutput: 'vo1',
      layout: {
        paneLayout: [
          { pane: 'p1', area: { bottom: 0, top: 1, left: 0, right: 1 } },
          { pane: 'p2', area: { bottom: 0, top: 0.5, left: 0, right: 0.5 } },
        ],
        extension: {},
      },
    } as any);
    await display.setLayout({
      videoOutput: 'vo1',
      layout: {
        paneLayout: [{ pane: 'p1', area: { bottom: 0, top: 1, left: 0, right: 1 } }],
      },
    } as any);
    await display.setPaneConfiguration({ videoOutput: 'vo1', paneConfiguration: pane as any });
    await display.setPaneConfigurations({ videoOutput: 'vo1', paneConfiguration: [pane as any] });

    const actionEngine = new ActionEngine(onvif);
    mockEmpty(actionEngine);
    expect(await actionEngine.getServiceCapabilities()).toEqual({});
    expect(await actionEngine.getActions()).toEqual([]);
    expect(await actionEngine.getActionTriggers()).toEqual([]);
    expect(await actionEngine.createActions({ action: [] })).toEqual([]);
    expect(await actionEngine.createActionTriggers({ actionTrigger: [] })).toEqual([]);
    await actionEngine.deleteActions({ token: ['a1'] });
    await actionEngine.deleteActions({ token: ['a1', 'a2'] });
    await actionEngine.createActionTriggers({
      actionTrigger: [
        {
          topicExpression: 'tns1:Device',
          contentExpression: 'true()',
          actionToken: ['a1'],
          extension: {},
        },
      ],
    } as any);

    const analytics = new Analytics(onvif);
    mockEmpty(analytics);
    expect(await analytics.getServiceCapabilities()).toEqual({});
    expect(await analytics.getRules({ configurationToken: 'c1' })).toEqual([]);
    expect(await analytics.getAnalyticsModules({ configurationToken: 'c1' })).toEqual([]);
    expect(await analytics.getRuleOptions({ configurationToken: 'c1', ruleType: 'tt:CellMotion' })).toEqual(
      [],
    );
    expect(
      await analytics.getAnalyticsModuleOptions({
        configurationToken: 'c1',
        type: 'tt:CellMotionEngine',
      }),
    ).toEqual([]);
    expect(await analytics.getSupportedMetadata({ type: 'tt:CellMotionEngine' })).toEqual([]);

    const Dio = DeviceIO as any;
    expect(Dio.serialDataToBuild({})).toEqual({});
    expect(Dio.serialDataToBuild(undefined)).toBeUndefined();
    expect(
      Dio.videoSourceConfigurationToBuild({
        token: 'v1',
        name: 'vs',
        useCount: 1,
        sourceToken: 's1',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        extension: {
          rotate: { mode: 'ON', degree: 90, mirror: true },
          extension: { vendor: true },
        },
      }),
    ).toMatchObject({
      Extension: {
        Rotate: { Mode: 'ON', Degree: 90, Mirror: true },
        Extension: { vendor: true },
      },
    });

    const deviceIO = new DeviceIO(onvif);
    mockEmpty(deviceIO);
    expect(await deviceIO.getServiceCapabilities()).toEqual({});
    expect(await deviceIO.getVideoSources()).toEqual([]);
    expect(await deviceIO.getAudioSources()).toEqual([]);
    expect(await deviceIO.getAudioOutputs()).toEqual([]);
    expect(await deviceIO.getRelayOutputs()).toEqual([]);
    expect(await deviceIO.getDigitalInputs()).toEqual([]);
    expect(await deviceIO.getSerialPorts()).toEqual([]);
    expect(await deviceIO.getRelayOutputOptions({})).toEqual([]);

    const AS = AdvancedSecurity as any;
    expect(
      AS.algorithmIdentifierToBuild({ algorithm: '1.2.3', parameters: 'p', anyParameters: {} }),
    ).toMatchObject({ anyParameters: {} });
    expect(
      AS.certificationPathToBuild({ certificateID: ['c1'], alias: 'a', anyElement: {} }),
    ).toMatchObject({ Alias: 'a', anyElement: {} });

    const security = new AdvancedSecurity(onvif);
    mockEmpty(security);
    await security.createPKCS10CSR({
      subject: { commonName: ['csr'] },
      keyID: 'k1',
      CSRAttribute: { challengePassword: 'x' },
      signatureAlgorithm: { algorithm: '1.2.840.113549.1.1.11', anyParameters: {} },
    } as any);
    await security.createSelfSignedCertificate({
      X509Version: 3,
      subject: { commonName: ['self'] },
      keyID: 'k1',
      alias: 'self',
      notValidBefore: '2020-01-01T00:00:00Z',
      notValidAfter: '2030-01-01T00:00:00Z',
      signatureAlgorithm: { algorithm: '1.2.840.113549.1.1.11', parameters: 'p' },
    } as any);
    await security.uploadCRL({ crl: 'crl', alias: 'crl', anyParameters: {} } as any);
    await security.createCertPathValidationPolicy({
      alias: 'pol',
      parameters: { requireTLSWWWClientAuthExtendedKeyUsage: true, useDeltaCRLs: true, anyParameters: {} },
      trustAnchor: [{ certificateID: 'c1' }],
      anyParameters: {},
    } as any);
    await security.getAuthorizationServerConfigurations({ token: 'as1' } as any);

    const media = new Media(onvif);
    onvif.device.media2Support = false;
    mockEmpty(media);
    await media.getOSDs({ configurationToken: 'vsc1', OSDToken: 'osd1' } as any);
    await media.setOSD({
      token: 'osd1',
      videoSourceConfigurationToken: 'vsc1',
      type: 'Text',
      position: { type: 'Custom', pos: { x: 0.1, y: 0.2 }, extension: {} },
      textString: {
        type: 'Plain',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: 'HH:mm:ss',
        fontSize: 16,
        fontColor: {
          color: { X: 0, Y: 0, Z: 0 },
          transparent: 0,
        },
        backgroundColor: {
          color: { X: 1, Y: 1, Z: 1 },
          transparent: 0,
        },
        plainText: 'hello',
      },
      image: { imgPath: '/tmp/a.png', extension: {} },
      extension: {},
    } as any);
    await media.setMetadataConfiguration({
      forcePersistence: true,
      configuration: {
        token: 'm1',
        name: 'md',
        useCount: 1,
        analytics: false,
        multicast: {
          address: { type: 'IPv4', IPv4Address: '224.0.0.1' },
          port: 1,
          TTL: 1,
          autoStart: false,
        },
        sessionTimeout: 'PT1S',
        events: { filter: {}, subscriptionPolicy: {} },
        analyticsEngineConfiguration: { analyticsModule: [], extension: {} },
        extension: {},
      },
    } as any);
  });
});
