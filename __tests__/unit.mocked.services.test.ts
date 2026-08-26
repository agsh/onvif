/**
 * Unit tests for service methods and XML builders using mocked SOAP responses.
 * @jest-environment node
 */

import AccessControl from '../src/accesscontrol';
import AdvancedSecurity from '../src/advancedsecurity';
import AnalyticsDevice from '../src/analyticsdevice';
import Credential from '../src/credential';
import Device from '../src/device';
import DeviceIO from '../src/deviceio';
import DoorControl from '../src/doorcontrol';
import Events from '../src/events';
import Recording from '../src/recording';
import Schedule from '../src/schedule';
import { Onvif } from '../src/onvif';

function mockServiceRequest(service: { request: (...args: any[]) => any }, impl?: (body: any) => any) {
  return jest.spyOn(service as any, 'request').mockImplementation(async (body: any) => {
    if (impl) {
      return impl(body);
    }
    const root = Object.keys(body)[0];
    const camel = root.charAt(0).toLowerCase() + root.slice(1) + 'Response';
    return { [camel]: {} };
  });
}

describe('Mocked service unit tests', () => {
  it('builds Device password, certificate, Dot1X, and storage requests', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const device = new Device(onvif);
    mockServiceRequest(device, (body) => {
      const root = Object.keys(body)[0];
      const map: Record<string, any> = {
        GetPasswordComplexityOptions: { getPasswordComplexityOptionsResponse: { minLen: 8 } },
        GetPasswordComplexityConfiguration: { getPasswordComplexityConfigurationResponse: { minLen: 8 } },
        GetPasswordHistoryConfiguration: { getPasswordHistoryConfigurationResponse: { enabled: true, length: 3 } },
        GetAuthFailureWarningOptions: { getAuthFailureWarningOptionsResponse: {} },
        GetAuthFailureWarningConfiguration: {
          getAuthFailureWarningConfigurationResponse: { enabled: false, monitorPeriod: 1, maxAuthFailures: 3 },
        },
        SetHostnameFromDHCP: { setHostnameFromDHCPResponse: { rebootNeeded: false } },
        GetDynamicDNS: { getDynamicDNSResponse: { dynamicDNSInformation: { type: 'NoUpdate' } } },
        GetAccessPolicy: { getAccessPolicyResponse: { policyFile: { data: 'eA==' } } },
        CreateCertificate: { createCertificateResponse: { nvtCertificate: { certificateID: 'c1' } } },
        GetCertificates: { getCertificatesResponse: { nvtCertificate: [] } },
        GetCertificatesStatus: { getCertificatesStatusResponse: { certificateStatus: [] } },
        GetPkcs10Request: { getPkcs10RequestResponse: { pkcs10Request: { data: 'eA==' } } },
        GetClientCertificateMode: { getClientCertificateModeResponse: { enabled: false } },
        GetCACertificates: { getCACertificatesResponse: { CACertificate: [] } },
        GetCertificateInformation: { getCertificateInformationResponse: { certificateInformation: {} } },
        GetDot1XConfiguration: { getDot1XConfigurationResponse: { dot1XConfiguration: { identity: 'u' } } },
        GetDot1XConfigurations: { getDot1XConfigurationsResponse: { dot1XConfiguration: [] } },
        GetRelayOutputs: { getRelayOutputsResponse: { relayOutputs: [] } },
        SendAuxiliaryCommand: { sendAuxiliaryCommandResponse: { auxiliaryCommandResponse: 'ok' } },
        GetDot11Capabilities: { getDot11CapabilitiesResponse: { capabilities: {} } },
        GetDot11Status: { getDot11StatusResponse: { status: {} } },
        ScanAvailableDot11Networks: { scanAvailableDot11NetworksResponse: { networks: [] } },
        GetSystemUris: { getSystemUrisResponse: {} },
        StartFirmwareUpgrade: { startFirmwareUpgradeResponse: {} },
        StartSystemRestore: { startSystemRestoreResponse: {} },
        GetStorageConfigurations: { getStorageConfigurationsResponse: { storageConfigurations: [] } },
        CreateStorageConfiguration: { createStorageConfigurationResponse: { token: 's1' } },
        GetStorageConfiguration: { getStorageConfigurationResponse: { storageConfiguration: { token: 's1' } } },
        GetGeoLocation: { getGeoLocationResponse: { location: [] } },
        GetSystemBackup: { getSystemBackupResponse: { backupFiles: [] } },
        GetSystemLog: { getSystemLogResponse: { systemLog: { string: 'log' } } },
        GetSystemSupportInformation: { getSystemSupportInformationResponse: { supportInformation: {} } },
        GetRemoteDiscoveryMode: { getRemoteDiscoveryModeResponse: { remoteDiscoveryMode: 'Discoverable' } },
        GetDPAddresses: { getDPAddressesResponse: { DPAddress: [] } },
        GetUserRoles: { getUserRolesResponse: { userRole: [] } },
        GetRemoteUser: { getRemoteUserResponse: {} },
        UpgradeSystemFirmware: { upgradeSystemFirmwareResponse: { message: 'ok' } },
        SystemReboot: { systemRebootResponse: { message: 'ok' } },
      };
      return map[root] ?? { [`${root.charAt(0).toLowerCase()}${root.slice(1)}Response`]: {} };
    });

    await device.getPasswordComplexityOptions();
    await device.getPasswordComplexityConfiguration();
    await device.setPasswordComplexityConfiguration({
      minLen: 8,
      uppercase: 1,
      number: 1,
      specialChars: 1,
      blockUsernameOccurrence: true,
      policyConfigurationLocked: false,
    });
    await device.getPasswordHistoryConfiguration();
    await device.setPasswordHistoryConfiguration({ enabled: true, length: 3 });
    await device.getAuthFailureWarningOptions();
    await device.getAuthFailureWarningConfiguration();
    await device.setAuthFailureWarningConfiguration({ enabled: true, monitorPeriod: 60, maxAuthFailures: 5 });
    await device.setHostname({ name: 'cam' });
    await device.setHostnameFromDHCP({ fromDHCP: true });
    await device.getDynamicDNS();
    await device.setDynamicDNS({ type: 'ClientUpdates', name: 'cam.local', TTL: 'PT1H' });
    await device.getAccessPolicy();
    await device.setAccessPolicy({ policyFile: { data: 'eA==' } });
    await device.createCertificate({ certificateID: 'c1', subject: 'CN=test' });
    await device.getCertificates();
    await device.getCertificatesStatus();
    await device.setCertificatesStatus({ certificateStatus: [{ certificateID: 'c1', status: true }] });
    await device.deleteCertificates({ certificateID: ['c1'] });
    await device.getPkcs10Request({ certificateID: 'c1', subject: 'CN=test', attributes: { data: 'eA==' } });
    await device.loadCertificates({ NVTCertificate: [{ certificateID: 'c1', certificate: { data: 'eA==' } }] });
    await device.getClientCertificateMode();
    await device.setClientCertificateMode({ enabled: false });
    await device.getCACertificates();
    await device.loadCertificateWithPrivateKey({
      certificateWithPrivateKey: [{ certificateID: 'c1', certificate: { data: 'eA==' }, privateKey: { data: 'eA==' } }],
    });
    await device.getCertificateInformation({ certificateID: 'c1' });
    await device.loadCACertificates({ CACertificate: [{ certificateID: 'ca1', certificate: { data: 'eA==' } }] });
    await device.createDot1XConfiguration({
      dot1XConfiguration: {
        dot1XConfigurationToken: 'd1',
        identity: 'user',
        EAPMethod: 13,
        CACertificateID: ['ca1', 'ca2'],
      },
    });
    await device.setDot1XConfiguration({
      dot1XConfiguration: { dot1XConfigurationToken: 'd1', identity: 'user', EAPMethod: 13 },
    });
    await device.getDot1XConfiguration({ dot1XConfigurationToken: 'd1' });
    await device.getDot1XConfigurations();
    await device.deleteDot1XConfiguration({ dot1XConfigurationToken: ['d1'] });
    await device.getRelayOutputs();
    await device.setRelayOutputSettings({
      relayOutputToken: 'r1',
      properties: { mode: 'Bistable', delayTime: 'PT1S', idleState: 'open' },
    });
    await device.setRelayOutputState({ relayOutputToken: 'r1', logicalState: 'active' });
    await device.sendAuxiliaryCommand({ auxiliaryCommand: 'tt:Wiper|On' });
    await device.getDot11Capabilities();
    await device.getDot11Status({ interfaceToken: 'eth0' });
    await device.scanAvailableDot11Networks({ interfaceToken: 'eth0' });
    await device.getSystemUris();
    await device.startFirmwareUpgrade();
    await device.startSystemRestore();
    await device.getStorageConfigurations();
    await device.createStorageConfiguration({
      storageConfiguration: { type: 'NAS', localPath: '/tmp', user: { userName: 'u', password: 'p' } },
    });
    await device.getStorageConfiguration({ token: 's1' });
    await device.setStorageConfiguration({
      storageConfiguration: { token: 's1', data: { type: 'NAS' } },
    } as any);
    await device.deleteStorageConfiguration({ token: 's1' });
    await device.getGeoLocation();
    await device.setGeoLocation({
      location: [{ type: 'Device', geoLocation: { lon: 1, lat: 2 } }],
    } as any);
    await device.deleteGeoLocation({
      location: [{ type: 'Device', geoLocation: { lon: 1, lat: 2 } }],
    } as any);
    await device.getSystemBackup();
    await device.restoreSystem({
      backupFiles: [{ name: 'bak.bin', data: { include: { href: 'cid:1' } } }],
    } as any);
    await device.getSystemLog({ logType: 'System' });
    await device.getSystemSupportInformation();
    await device.getRemoteDiscoveryMode();
    await device.setRemoteDiscoveryMode({ remoteDiscoveryMode: 'Discoverable' });
    await device.getDPAddresses();
    await device.getUserRoles();
    await device.setUserRole({ userRole: { name: 'r', functions: ['f1'] } });
    await device.deleteUserRole({ userRole: 'r' });
    await device.getRemoteUser();
    await device.setRemoteUser({ remoteUser: { username: 'ru', password: 'rp', useDerivedPassword: false } });
    await device.upgradeSystemFirmware({
      firmware: { include: { href: 'cid:fw' }, contentType: 'application/octet-stream' },
    } as any);
    await device.systemReboot();
    await device.setIPAddressFilter({
      IPAddressFilter: {
        type: 'Allow',
        IPv4Address: [{ address: '10.0.0.0', prefixLength: 8 }],
      },
    } as any);
    await device.addIPAddressFilter({
      IPAddressFilter: {
        type: 'Allow',
        IPv4Address: [{ address: '10.0.0.0', prefixLength: 8 }],
      },
    } as any);
    await device.removeIPAddressFilter({
      IPAddressFilter: {
        type: 'Deny',
        IPv6Address: [{ address: 'fe80::', prefixLength: 64 }],
      },
    } as any);
  });

  it('builds AdvancedSecurity distinguished names, policies, and upload helpers', async () => {
    const AS = AdvancedSecurity as any;
    expect(
      AS.distinguishedNameToBuild({
        country: ['US'],
        organization: ['Org'],
        organizationalUnit: ['OU'],
        distinguishedNameQualifier: ['q'],
        stateOrProvinceName: ['CA'],
        commonName: ['cn'],
        serialNumber: ['1'],
        locality: ['city'],
        title: ['t'],
        surname: ['s'],
        givenName: ['g'],
        initials: ['i'],
        pseudonym: ['p'],
        generationQualifier: ['jr'],
        genericAttribute: [{ type: 't', value: 'v' }],
        multiValuedRDN: [{ attribute: [{ type: 't2', value: 'v2' }] }],
        anyAttribute: { domainComponent: ['dc'] },
      }),
    ).toMatchObject({ CommonName: ['cn'] });
    expect(AS.algorithmIdentifierToBuild({ algorithm: '1.2.3', parameters: 'p' })).toMatchObject({
      algorithm: '1.2.3',
    });
    expect(AS.x509v3ExtensionToBuild({ extnOID: '1.2', critical: true, extnValue: 'x' })).toMatchObject({
      ExtnOID: '1.2',
    });
    expect(AS.certificationPathToBuild({ certificateID: ['c1'], alias: 'a' })).toMatchObject({ Alias: 'a' });
    expect(
      AS.certPathValidationPolicyToBuild({
        certPathValidationPolicyID: 'p1',
        alias: 'a',
        parameters: { requireTLSWWWClientAuthExtendedKeyUsage: true, useDeltaCRLs: false },
        trustAnchor: [{ certificateID: 'c1' }],
      }),
    ).toMatchObject({ CertPathValidationPolicyID: 'p1' });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const security = new AdvancedSecurity(onvif);
    mockServiceRequest(security, (body) => {
      const root = Object.keys(body)[0];
      const map: Record<string, any> = {
        CreateECCKeyPair: { createECCKeyPairResponse: { keyID: 'k1', estimatedCreationTime: 'PT1S' } },
        UploadKeyPairInPKCS8: { uploadKeyPairInPKCS8Response: { keyID: 'k2' } },
        UploadCertificateWithPrivateKeyInPKCS12: {
          uploadCertificateWithPrivateKeyInPKCS12Response: { certificateID: 'c1', keyID: 'k1' },
        },
        CreatePKCS10CSR: { createPKCS10CSRResponse: { PKCS10CSR: 'csr' } },
        UploadCertificate: { uploadCertificateResponse: { certificateID: 'c2' } },
        CreateCertPathValidationPolicy: { createCertPathValidationPolicyResponse: { certPathValidationPolicyID: 'p1' } },
        GetAllCertPathValidationPolicies: { getAllCertPathValidationPoliciesResponse: { certPathValidationPolicy: [] } },
        GetCertPathValidationPolicy: { getCertPathValidationPolicyResponse: { certPathValidationPolicy: {} } },
        CreateDot1XConfiguration: { createDot1XConfigurationResponse: { dot1XID: 'd1' } },
        GetAllDot1XConfigurations: { getAllDot1XConfigurationsResponse: { configuration: [] } },
        GetDot1XConfiguration: { getDot1XConfigurationResponse: { dot1XConfiguration: {} } },
        UploadCRL: { uploadCRLResponse: { CRLID: 'crl1' } },
        GetAllCRLs: { getAllCRLsResponse: { CRL: [] } },
        GetCRL: { getCRLResponse: { CRL: {} } },
      };
      return map[root] ?? { [`${root.charAt(0).toLowerCase()}${root.slice(1)}Response`]: {} };
    });

    await security.createECCKeyPair({ ellipticCurve: 'secp256r1', alias: 'ecc' });
    await security.uploadKeyPairInPKCS8({
      keyPair: 'kp',
      alias: 'a',
      encryptionPassphraseID: 'p1',
      encryptionPassphrase: 'pass',
    });
    await security.uploadCertificateWithPrivateKeyInPKCS12({
      certWithPrivateKey: 'pkcs12',
      certificationPathAlias: 'path',
      keyAlias: 'key',
      ignoreAdditionalCertificates: true,
      integrityPassphraseID: 'i1',
      encryptionPassphraseID: 'e1',
      passphrase: 'secret',
    });
    await security.createPKCS10CSR({
      subject: { commonName: ['csr'] },
      keyID: 'k1',
      signatureAlgorithm: { algorithm: '1.2.840.113549.1.1.11' },
    });
    await security.createSelfSignedCertificate({
      subject: { commonName: ['self'] },
      keyID: 'k1',
      alias: 'self',
      signatureAlgorithm: { algorithm: '1.2.840.113549.1.1.11' },
      extension: [{ extnOID: '2.5.29.17', critical: false, extnValue: 'dns' }],
    });
    await security.uploadCertificate({ certificate: 'cert', alias: 'a', keyAlias: 'k', privateKeyRequired: false });
    await security.createCertPathValidationPolicy({
      alias: 'pol',
      parameters: { requireTLSWWWClientAuthExtendedKeyUsage: true, useDeltaCRLs: false },
      trustAnchor: [{ certificateID: 'c1' }],
    });
    await security.getAllCertPathValidationPolicies();
    await security.getCertPathValidationPolicy({ certPathValidationPolicyID: 'p1' });
    await security.setCertPathValidationPolicy({
      certPathValidationPolicyID: 'p1',
      certPathValidationPolicy: {
        certPathValidationPolicyID: 'p1',
        parameters: { requireTLSWWWClientAuthExtendedKeyUsage: true },
        trustAnchor: [{ certificateID: 'c1' }],
      },
    });
    await security.deleteCertPathValidationPolicy({ certPathValidationPolicyID: 'p1' });
    await security.addDot1XConfiguration({
      dot1XConfiguration: {
        alias: 'dot1x',
        outer: {
          method: 'EAP-TLS',
          identity: 'u',
          certificationPathID: 'path1',
          passphraseID: 'pass1',
          inner: { method: 'EAP-MSCHAPv2', identity: 'inner' },
        },
      },
    });
    await security.getAllDot1XConfigurations();
    await security.getDot1XConfiguration({ dot1XID: 'd1' });
    await security.deleteDot1XConfiguration({ dot1XID: 'd1' });
    await security.uploadCRL({ crl: 'crl', alias: 'crl' });
    await security.getAllCRLs();
    await security.getCRL({ crlID: 'crl1' });
    await security.deleteCRL({ crlID: 'crl1' });
  });

  it('creates event pull-point and push subscriptions with filters and brokers', async () => {
    expect(
      Events.filterToBuild({
        topicExpression: [{ expression: 'tns1:Device', dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet' }],
        messageContent: '//*[local-name()="SimpleItem"]',
      }),
    ).toBeDefined();
    expect(Events.filterToBuild(undefined)).toBeUndefined();

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.events = new URL('http://127.0.0.1:8000/onvif/events_service');
    const events = new Events(onvif);
    const subscription = {
      subscriptionReference: {
        address: 'http://127.0.0.1:8000/Subscription?Idx=1',
        referenceParameters: { subscriptionId: 'axis-1' },
      },
    };

    jest.spyOn(onvif, 'request').mockImplementation(async (options: any) => {
      const root = Object.keys(options.body)[0].replace(/^[^:]+:/, '');
      if (root === 'Subscribe') {
        return [{ subscribeResponse: subscription }, ''];
      }
      if (root === 'CreatePullPointSubscription') {
        return [{ createPullPointSubscriptionResponse: subscription }, ''];
      }
      if (root === 'Renew') {
        return [{ renewResponse: { terminationTime: new Date().toISOString() } }, ''];
      }
      if (root === 'GetStatus') {
        return [{ getStatusResponse: { currentTime: new Date().toISOString() } }, ''];
      }
      if (root === 'GetEventBrokers') {
        return [{ getEventBrokersResponse: { eventBroker: [] } }, ''];
      }
      return [{}, ''];
    });

    await events.createPullPointSubscription({
      filter: {
        topicExpression: [
          {
            expression: 'tns1:Device/Trigger/Relay',
            dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
          },
        ],
      },
    });
    await events.addEventBroker({
      eventBroker: {
        address: 'mqtts://broker',
        topicPrefix: 'onvif',
        userName: 'u',
        password: 'p',
        certificateID: 'c1',
        qoS: 1,
      },
    });
    await events.deleteEventBroker({ address: 'mqtts://broker' });
    await events.getEventBrokers({ address: 'mqtts://broker' });
    await events.subscribe({ url: 'http://127.0.0.1:9999/notify', terminationTime: 'PT1M' });
    await events.unsubscribe(subscription as any);
    await events.renew(subscription as any, 'PT1M');
    await events.getStatus(subscription as any);
  });

  it('builds DoorControl doors and runs lock lifecycle commands', async () => {
    const Door = DoorControl as any;
    expect(Door.tokensToBuild(undefined)).toBeUndefined();
    expect(Door.tokensToBuild(['a'])).toBe('a');
    expect(Door.tokensToBuild(['a', 'b'])).toEqual(['a', 'b']);
    const door = {
      token: 'd1',
      name: 'Door',
      description: 'desc',
      doorType: 'pt:Door',
      capabilities: {
        access: true,
        accessTimingOverride: true,
        lock: true,
        unlock: true,
        block: true,
        doubleLock: true,
        lockDown: true,
        lockOpen: true,
        doorMonitor: true,
        lockMonitor: true,
        doubleLockMonitor: true,
        alarm: true,
        tamper: true,
        fault: true,
      },
      timings: {
        releaseTime: 'PT5S',
        openTime: 'PT10S',
        extendedReleaseTime: 'PT15S',
        delayTimeBeforeRelock: 'PT1S',
        extendedOpenTime: 'PT20S',
        preAlarmTime: 'PT2S',
      },
    };
    expect(Door.doorToBuild(door)).toMatchObject({ Name: 'Door', DoorType: 'pt:Door' });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const doorControl = new DoorControl(onvif);
    mockServiceRequest(doorControl, (body) => {
      if (body.CreateDoor) {
        return { createDoorResponse: { token: 'd1' } };
      }
      return { [`${Object.keys(body)[0].charAt(0).toLowerCase()}${Object.keys(body)[0].slice(1)}Response`]: {} };
    });

    await doorControl.createDoor({ door });
    await doorControl.setDoor({ door });
    await doorControl.modifyDoor({ door });
    await doorControl.deleteDoor({ token: 'd1' });
    await doorControl.accessDoor({
      token: 'd1',
      useExtendedTime: true,
      accessTime: 'PT5S',
      openTooLongTime: 'PT10S',
      preAlarmTime: 'PT1S',
    });
    await doorControl.blockDoor({ token: 'd1' });
    await doorControl.lockDownDoor({ token: 'd1' });
    await doorControl.lockDownReleaseDoor({ token: 'd1' });
    await doorControl.lockOpenDoor({ token: 'd1' });
    await doorControl.lockOpenReleaseDoor({ token: 'd1' });
    await doorControl.doubleLockDoor({ token: 'd1' });
  });

  it('builds Recording job/export payloads and DeviceIO configuration setters', async () => {
    const Rec = Recording as any;
    expect(
      Rec.recordingJobConfigurationToBuild({
        recordingToken: 'r1',
        mode: 'Idle',
        priority: 1,
        scheduleToken: 's1',
        source: {
          sourceToken: { type: 'http://www.onvif.org/ver10/schema/Profile', token: 'p1' },
          autoCreateReceiver: true,
          tracks: [{ sourceTag: 'Video', destination: 'VIDEO001' }],
        },
      }),
    ).toMatchObject({ RecordingToken: 'r1' });
    expect(
      Rec.searchScopeToBuild({
        includedSources: [{ type: 'http://www.onvif.org/ver10/schema/Profile', token: 'p1' }],
        includedRecordings: ['r1'],
        recordingInformationFilter: 'true()',
      }),
    ).toMatchObject({ IncludedRecordings: ['r1'] });
    expect(Rec.storageDestinationToBuild({ storageToken: 's1', relativePath: '/export' })).toMatchObject({
      StorageToken: 's1',
    });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const recording = new Recording(onvif);
    mockServiceRequest(recording, (body) => {
      if (body.ExportRecordedData) {
        return { exportRecordedDataResponse: { operationToken: 'op1', fileNames: ['a.mp4'] } };
      }
      if (body.StopExportRecordedData) {
        return { stopExportRecordedDataResponse: { progress: 1 } };
      }
      if (body.GetExportRecordedDataState) {
        return { getExportRecordedDataStateResponse: { progress: 0.5 } };
      }
      return {};
    });
    await recording.exportRecordedData({
      startPoint: new Date().toISOString(),
      endPoint: new Date().toISOString(),
      searchScope: { includedRecordings: ['r1'] },
      fileFormat: 'mp4',
      storageDestination: { storageToken: 's1' },
    } as any);
    await recording.stopExportRecordedData({ operationToken: 'op1' });
    await recording.getExportRecordedDataState({ operationToken: 'op1' });
    await recording.overrideSegmentDuration({
      targetSegmentDuration: 'PT1H',
      expiration: new Date().toISOString(),
      recordingConfiguration: {},
    } as any);

    const Dio = DeviceIO as any;
    expect(Dio.serialDataToBuild({ binary: 'YQ==' })).toEqual({ Binary: 'YQ==' });
    expect(Dio.serialDataToBuild({ string: 'hi' })).toEqual({ String: 'hi' });
    expect(Dio.serialDataToBuild(undefined)).toBeUndefined();
    expect(
      Dio.videoSourceConfigurationToBuild({
        token: 'v1',
        name: 'vs',
        useCount: 1,
        sourceToken: 's1',
        viewMode: 'normal',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        extension: { rotate: { mode: 'ON', degree: 90, mirror: true } },
      }),
    ).toMatchObject({ Name: 'vs' });
    expect(
      Dio.audioOutputConfigurationToBuild({
        token: 'a1',
        name: 'ao',
        useCount: 1,
        outputToken: 'o1',
        sendPrimacy: 'www.onvif.org/ver20/HalfDuplex/Server',
        outputLevel: 50,
      }),
    ).toMatchObject({ OutputLevel: 50 });

    const deviceIO = new DeviceIO(onvif);
    mockServiceRequest(deviceIO);
    await deviceIO.setAudioSourceConfiguration({
      configuration: { token: 'a1', name: 'as', useCount: 1, sourceToken: 's1' },
      forcePersistence: true,
    } as any);
    await deviceIO.setAudioOutputConfiguration({
      configuration: { token: 'a1', name: 'ao', useCount: 1, outputToken: 'o1', outputLevel: 10 },
      forcePersistence: true,
    } as any);
    await deviceIO.setVideoSourceConfiguration({
      configuration: {
        token: 'v1',
        name: 'vs',
        useCount: 1,
        sourceToken: 's1',
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      },
      forcePersistence: true,
    } as any);
    await deviceIO.setVideoOutputConfiguration({
      configuration: { token: 'vo1', name: 'vo', useCount: 1, outputToken: 'o1' },
      forcePersistence: true,
    } as any);
    await deviceIO.sendReceiveSerialCommand({
      token: 'SerialPortToken_1',
      serialData: { string: 'AT' },
      timeOut: 'PT1S',
      dataLength: 1,
      delimiter: '\r',
    });
    // optional serialData / timeout omitted branch
    await deviceIO.sendReceiveSerialCommand({});
  });

  it('builds AccessControl, Credential, and Schedule entities with optional fields', async () => {
    const AC = AccessControl as any;
    expect(
      AC.accessPointToBuild({
        token: 'ap1',
        name: 'AP',
        description: 'd',
        areaFrom: 'a1',
        areaTo: 'a2',
        entityType: 'Door',
        entity: 'door1',
        authenticationProfileToken: 'auth1',
        extension: { x: 1 },
        capabilities: {
          disableAccessPoint: true,
          duress: true,
          anonymousAccess: false,
          accessTaken: true,
          externalAuthorization: false,
          supportedRecognitionTypes: ['Card'],
          identifierAccess: true,
          supportedFeedbackTypes: ['Beep'],
          supportedSecurityLevels: ['Level1'],
          extension: { e: 1 },
        },
      }),
    ).toMatchObject({ Name: 'AP', AreaFrom: 'a1' });
    expect(
      AC.accessPointToBuild({
        token: 'ap2',
        name: 'AP2',
        entity: 'door2',
        capabilities: { disableAccessPoint: false },
      }),
    ).toMatchObject({ Name: 'AP2' });
    expect(AC.areaToBuild({ token: 'ar1', name: 'Area', description: 'd', extension: {} })).toMatchObject({
      Name: 'Area',
    });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const accessControl = new AccessControl(onvif);
    mockServiceRequest(accessControl, (body) => {
      if (body.CreateAccessPoint) {
        return { createAccessPointResponse: { token: 'ap1' } };
      }
      if (body.CreateArea) {
        return { createAreaResponse: { token: 'ar1' } };
      }
      if (body.GetAccessPointInfoList || body.GetAccessPointList || body.GetAreaInfoList || body.GetAreaList) {
        const key = Object.keys(body)[0];
        return { [`${key.charAt(0).toLowerCase()}${key.slice(1)}Response`]: {} };
      }
      return {};
    });
    await accessControl.getAccessPointInfoList({ limit: 10, startReference: 'ref' });
    await accessControl.getAccessPointList({ limit: 5 });
    await accessControl.createAccessPoint({
      accessPoint: {
        token: '',
        name: 'AP',
        entity: 'door1',
        capabilities: { disableAccessPoint: true, duress: true },
      },
    } as any);
    await accessControl.setAccessPoint({
      accessPoint: {
        token: 'ap1',
        name: 'AP',
        entity: 'door1',
        capabilities: { disableAccessPoint: true },
      },
    } as any);
    await accessControl.modifyAccessPoint({
      accessPoint: {
        token: 'ap1',
        name: 'AP',
        entity: 'door1',
        authenticationProfileToken: 'auth',
        capabilities: { disableAccessPoint: true },
      },
    } as any);
    await accessControl.deleteAccessPoint({ token: 'ap1' });
    await accessControl.setAccessPointAuthenticationProfile({
      token: 'ap1',
      authenticationProfileToken: 'auth',
    });
    await accessControl.deleteAccessPointAuthenticationProfile({ token: 'ap1' });
    await accessControl.createArea({ area: { token: '', name: 'A', description: 'd' } as any });
    await accessControl.setArea({ area: { token: 'ar1', name: 'A', extension: {} } as any });
    await accessControl.modifyArea({ area: { token: 'ar1', name: 'A' } as any });
    await accessControl.deleteArea({ token: 'ar1' });
    await accessControl.enableAccessPoint({ token: 'ap1' });
    await accessControl.disableAccessPoint({ token: 'ap1' });

    const Cred = Credential as any;
    expect(
      Cred.credentialToBuild({
        token: 'c1',
        description: 'd',
        credentialHolderReference: 'h1',
        validFrom: '2020-01-01T00:00:00Z',
        validTo: '2030-01-01T00:00:00Z',
        credentialIdentifier: [
          {
            type: { name: 'pt:Card', formatType: 'GUID' },
            value: 'AABB',
            exemptedFromAuthentication: false,
          },
        ],
        credentialAccessProfile: [
          {
            accessProfileToken: 'ap1',
            validFrom: '2020-01-01T00:00:00Z',
            validTo: '2030-01-01T00:00:00Z',
          },
        ],
        extendedGrantTime: true,
        attribute: [{ name: 'n', value: 'v' }],
        extension: {},
      }),
    ).toMatchObject({ CredentialHolderReference: 'h1' });
    expect(
      Cred.credentialStateToBuild({
        enabled: true,
        reason: 'ok',
        antipassbackState: { antipassbackViolated: false },
        extension: {},
      }),
    ).toMatchObject({ Enabled: true, Reason: 'ok' });
    expect(Cred.credentialStateToBuild({ enabled: false })).toEqual({ Enabled: false });

    const credential = new Credential(onvif);
    mockServiceRequest(credential, (body) => {
      if (body.CreateCredential) {
        return { createCredentialResponse: { token: 'c1' } };
      }
      if (body.GetCredentialInfoList || body.GetCredentialList) {
        const key = Object.keys(body)[0];
        return { [`${key.charAt(0).toLowerCase()}${key.slice(1)}Response`]: {} };
      }
      return {};
    });
    await credential.getCredentialInfoList({ limit: 2, startReference: 's' });
    await credential.createCredential({
      credential: {
        token: '',
        credentialHolderReference: 'h',
        credentialIdentifier: [
          { type: { name: 'pt:Card', formatType: 'GUID' }, value: '1', exemptedFromAuthentication: false },
        ],
      },
      state: { enabled: true, reason: 'new' },
    } as any);
    await credential.setCredential({
      credentialData: {
        credential: {
          token: 'c1',
          credentialHolderReference: 'h',
          credentialIdentifier: [
            { type: { name: 'pt:Card', formatType: 'GUID' }, value: '1', exemptedFromAuthentication: false },
          ],
          extension: {},
        },
        credentialState: { enabled: true },
        extension: {},
      },
    } as any);
    await credential.enableCredential({ token: 'c1', reason: 'manual' });
    await credential.setCredentialIdentifier({
      credentialToken: 'c1',
      credentialIdentifier: {
        type: { name: 'pt:Card', formatType: 'GUID' },
        value: '2',
        exemptedFromAuthentication: true,
      },
    } as any);
    await credential.deleteCredentialIdentifier({
      credentialToken: 'c1',
      credentialIdentifierTypeName: 'pt:Card',
    } as any);
    await credential.setCredentialAccessProfiles({
      credentialToken: 'c1',
      credentialAccessProfile: [{ accessProfileToken: 'ap1' }],
    } as any);
    await credential.deleteCredentialAccessProfiles({
      credentialToken: 'c1',
      accessProfileToken: ['ap1'],
    } as any);

    const Sch = Schedule as any;
    expect(
      Sch.scheduleToBuild({
        token: 's1',
        name: 'Sched',
        description: 'd',
        standard: '0 0 * * *',
        specialDays: [{ groupToken: 'g1', timeRange: [{ from: 'T08:00:00', until: 'T17:00:00' }], extension: {} }],
        extension: {},
      }),
    ).toMatchObject({ Name: 'Sched' });
    expect(
      Sch.specialDayGroupToBuild({
        token: 'g1',
        name: 'G',
        description: 'd',
        days: '2026-01-01',
        extension: {},
      }),
    ).toMatchObject({ Name: 'G' });

    const schedule = new Schedule(onvif);
    mockServiceRequest(schedule, (body) => {
      if (body.CreateSchedule) {
        return { createScheduleResponse: { token: 's1' } };
      }
      if (body.CreateSpecialDayGroup) {
        return { createSpecialDayGroupResponse: { token: 'g1' } };
      }
      return {};
    });
    await schedule.getScheduleInfoList({ limit: 1, startReference: 'r' });
    await schedule.createSchedule({
      schedule: { token: '', name: 'S', standard: '0 0 * * *', specialDays: [] } as any,
    });
    await schedule.setSchedule({
      schedule: { token: 's1', name: 'S', standard: '0 0 * * *', extension: {} } as any,
    });
    await schedule.modifySchedule({
      schedule: { token: 's1', name: 'S', standard: '0 0 * * *' } as any,
    });
    await schedule.deleteSchedule({ token: 's1' });
    await schedule.createSpecialDayGroup({
      specialDayGroup: { token: '', name: 'G', days: '2026-01-01' } as any,
    });
    await schedule.setSpecialDayGroup({
      specialDayGroup: { token: 'g1', name: 'G', extension: {} } as any,
    });
    await schedule.modifySpecialDayGroup({
      specialDayGroup: { token: 'g1', name: 'G' } as any,
    });
    await schedule.deleteSpecialDayGroup({ token: 'g1' });
  });

  it('builds AnalyticsDevice engines and AdvancedSecurity JWT/Dot1X payloads', async () => {
    const AD = AnalyticsDevice as any;
    expect(AD.tokensToBuild(undefined)).toBeUndefined();
    expect(AD.tokensToBuild([])).toBeUndefined();
    expect(AD.tokensToBuild(['a'])).toBe('a');
    expect(AD.tokensToBuild(['a', 'b'])).toEqual(['a', 'b']);
    expect(
      AD.analyticsEngineInputToBuild({
        token: 'i1',
        name: 'in',
        useCount: 1,
        sourceIdentification: { name: 'src', token: ['t1', 't2'], extension: {} },
        videoInput: {
          token: 'v1',
          name: 've',
          useCount: 1,
          encoding: 'H264',
          resolution: { width: 640, height: 480 },
          quality: 1,
          rateControl: { frameRateLimit: 25, encodingInterval: 1, bitrateLimit: 1000 },
          MPEG4: { govLength: 1, mpeg4Profile: 'SP' },
          H264: { govLength: 1, H264Profile: 'Baseline' },
          multicast: {
            address: { type: 'IPv4', IPv4Address: '0.0.0.0' },
            port: 0,
            TTL: 1,
            autoStart: false,
          },
          sessionTimeout: 'PT60S',
        },
        metadataInput: {
          metadataConfig: [{ name: 'm', type: 'string', parameters: { simpleItem: [{ name: 'a', value: 'b' }] } }],
          extension: {},
        },
      }),
    ).toMatchObject({ Name: 'in' });
    expect(
      AD.videoAnalyticsConfigurationToBuild({
        token: 'va1',
        name: 'va',
        useCount: 1,
        analyticsEngineConfiguration: {
          analyticsModule: [
            {
              name: 'm',
              type: 't',
              parameters: { simpleItem: [{ name: 'p', value: '1' }] },
            },
          ],
          extension: {},
        },
        ruleEngineConfiguration: {
          rule: [
            {
              name: 'r',
              type: 't',
              parameters: { simpleItem: [{ name: 'p', value: '1' }] },
            },
          ],
          extension: {},
        },
      }),
    ).toMatchObject({ Name: 'va' });

    const AS = AdvancedSecurity as any;
    expect(
      AS.jwtConfigurationToBuild({
        audiences: ['a'],
        trustedIssuers: ['iss'],
        keyID: ['k1'],
        validationPolicy: ['p1'],
        customClaims: [{ name: 'c', supportedValues: ['v'] }],
      }),
    ).toMatchObject({ Audiences: 'a' });
    expect(AS.jwtConfigurationToBuild({ audiences: ['a', 'b'] })).toMatchObject({ Audiences: 'a b' });
    expect(
      AS.dot1XStageToBuild({
        method: 'EAP-TLS',
        certPathValidationPolicyID: 'p',
        identity: 'u',
        certificationPathID: 'path',
        passphraseID: 'pass',
        extension: {},
      }),
    ).toMatchObject({ Identity: 'u' });
    expect(
      AS.authorizationServerConfigurationToBuild({
        token: 'as1',
        data: {
          type: 'OAuth2ClientCredentials',
          clientAuth: 'client_secret_basic',
          serverUri: 'https://auth',
          clientID: 'id',
          clientSecret: 'sec',
          scope: ['s'],
          keyID: 'k',
          certificateID: 'c',
          certPathValidationPolicyID: 'p',
        },
      }),
    ).toMatchObject({ $: { token: 'as1' } });
    expect(
      AS.certPathValidationPolicyToBuild({
        certPathValidationPolicyID: 'p1',
        alias: 'a',
        parameters: {},
        trustAnchor: [{ certificateID: 'c1' }],
        anyParameters: { x: 1 },
      }),
    ).toMatchObject({ Alias: 'a' });
    expect(
      AS.certPathValidationParametersToBuild({
        requireTLSWWWClientAuthExtendedKeyUsage: false,
        useDeltaCRLs: true,
        anyParameters: {},
      }),
    ).toMatchObject({ UseDeltaCRLs: true });

    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const security = new AdvancedSecurity(onvif);
    mockServiceRequest(security, () => ({
      getJWTConfigurationResponse: { configuration: { audiences: [] } },
      setJWTConfigurationResponse: {},
      createAuthorizationServerConfigurationResponse: { token: 'as1' },
      getAuthorizationServerConfigurationsResponse: { configuration: [] },
    }));
    await security.getJWTConfiguration();
    await security.setJWTConfiguration({
      configuration: {
        audiences: ['aud'],
        trustedIssuers: ['iss'],
        customClaims: [{ name: 'c', supportedValues: ['1', '2'] }],
      },
    } as any);

    expect(Events.filterToBuild({})).toBeUndefined();
    expect(Events.filterToBuild({ topicExpression: [] })).toBeUndefined();
    expect(Events.filterToBuild({ messageContent: 'true()' })).toBeDefined();

    onvif.uri.events = new URL('http://127.0.0.1:8000/onvif/events_service');
    const events = new Events(onvif);
    const subscription = {
      subscriptionReference: { address: 'http://127.0.0.1:8000/Subscription?Idx=2' },
    };
    jest.spyOn(onvif, 'request').mockImplementation(async (options: any) => {
      const root = Object.keys(options.body)[0].replace(/^[^:]+:/, '');
      if (root === 'Subscribe') {
        return [{ subscribeResponse: subscription }, ''];
      }
      if (root === 'CreatePullPointSubscription') {
        return [{ createPullPointSubscriptionResponse: subscription }, ''];
      }
      return [{}, ''];
    });
    await events.createPullPointSubscription({ filter: {} });
    await events.subscribe({
      url: 'http://127.0.0.1:9999/notify',
      terminationTime: 'PT30S',
      filter: { messageContent: '//SimpleItem' },
      renew: false,
    });
    // getSubscriptionUrlAndHeaders missing address branch
    await expect(events.unsubscribe({} as any)).rejects.toThrow(/working subscription/);
  });

  it('exercises AdvancedSecurity, Analytics, Media2, DeviceIO, and Cam helpers', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.media2Support = true;

    const security = new AdvancedSecurity(onvif);
    mockServiceRequest(security, (body) => {
      const root = Object.keys(body)[0];
      const map: Record<string, any> = {
        SetCertificationPath: {},
        RemoveServerCertificateAssignment: {},
        ReplaceServerCertificateAssignment: {},
        GetClientAuthenticationRequired: { getClientAuthenticationRequiredResponse: { clientAuthenticationRequired: false } },
        GetCnMapsToUser: { getCnMapsToUserResponse: { cnMapsToUser: false } },
        AddCertPathValidationPolicyAssignment: {},
        RemoveCertPathValidationPolicyAssignment: {},
        ReplaceCertPathValidationPolicyAssignment: {},
        SetNetworkInterfaceDot1XConfiguration: {
          setNetworkInterfaceDot1XConfigurationResponse: { rebootNeeded: false },
        },
        GetNetworkInterfaceDot1XConfiguration: {
          getNetworkInterfaceDot1XConfigurationResponse: { dot1XID: 'd1' },
        },
        DeleteNetworkInterfaceDot1XConfiguration: {
          deleteNetworkInterfaceDot1XConfigurationResponse: { rebootNeeded: false },
        },
        AddMediaSigningCertificateAssignment: {},
        RemoveMediaSigningCertificateAssignment: {},
        CreateAuthorizationServerConfiguration: {
          createAuthorizationServerConfigurationResponse: { token: 'as1' },
        },
        SetAuthorizationServerConfiguration: {},
        DeleteAuthorizationServerConfiguration: {},
      };
      return map[root] ?? { [`${root.charAt(0).toLowerCase()}${root.slice(1)}Response`]: {} };
    });

    await security.setCertificationPath({
      certificationPathID: 'p1',
      certificationPath: { certificateID: ['c1'], alias: 'a' },
    } as any);
    await security.removeServerCertificateAssignment({ certificationPathID: 'p1' });
    await security.replaceServerCertificateAssignment({
      oldCertificationPathID: 'p1',
      newCertificationPathID: 'p2',
    } as any);
    await security.getClientAuthenticationRequired();
    await security.getCnMapsToUser();
    await security.addCertPathValidationPolicyAssignment({ certPathValidationPolicyID: 'pol1' });
    await security.removeCertPathValidationPolicyAssignment({ certPathValidationPolicyID: 'pol1' });
    await security.replaceCertPathValidationPolicyAssignment({
      oldCertPathValidationPolicyID: 'pol1',
      newCertPathValidationPolicyID: 'pol2',
    } as any);
    await security.setNetworkInterfaceDot1XConfiguration({ token: 'eth0', dot1XID: 'd1' });
    await security.getNetworkInterfaceDot1XConfiguration({ token: 'eth0' });
    await security.deleteNetworkInterfaceDot1XConfiguration({ token: 'eth0' });
    await security.addMediaSigningCertificateAssignment({ certificationPathID: 'p1' });
    await security.removeMediaSigningCertificateAssignment({ certificationPathID: 'p1' });
    await security.createAuthorizationServerConfiguration({
      configuration: {
        type: 'OAuth2ClientCredentials',
        serverUri: 'https://auth',
        clientID: 'id',
      },
    } as any);
    await security.setAuthorizationServerConfiguration({
      configuration: {
        token: 'as1',
        data: {
          type: 'OAuth2ClientCredentials',
          clientAuth: 'client_secret_basic',
          serverUri: 'https://auth',
          clientID: 'id',
          clientSecret: 's',
          scope: ['a'],
          keyID: 'k',
          certificateID: 'c',
          certPathValidationPolicyID: 'p',
        },
      },
    } as any);
    await security.deleteAuthorizationServerConfiguration({ token: 'as1' });

    const Analytics = (await import('../src/analytics')).default;
    const analytics = new Analytics(onvif);
    const A = Analytics as any;
    expect(A.namesToBuild(undefined)).toBeUndefined();
    expect(A.namesToBuild([])).toBeUndefined();
    expect(A.namesToBuild(['a'])).toBe('a');
    expect(A.namesToBuild(['a', 'b'])).toEqual(['a', 'b']);
    expect(A.configsToBuild(undefined)).toBeUndefined();
    expect(
      A.configsToBuild([{ name: 'm', type: 't', parameters: { simpleItem: [{ name: 'p', value: '1' }] } }]),
    ).toHaveLength(1);
    mockServiceRequest(analytics);
    await analytics.createRules({
      configurationToken: 'c1',
      rule: [{ name: 'r', type: 't', parameters: { simpleItem: [{ name: 'p', value: '1' }] } }],
    } as any);
    await analytics.deleteRules({ configurationToken: 'c1', ruleName: ['r'] });
    await analytics.modifyRules({
      configurationToken: 'c1',
      rule: [{ name: 'r', type: 't', parameters: { simpleItem: [{ name: 'p', value: '1' }] } }],
    } as any);
    await analytics.createAnalyticsModules({
      configurationToken: 'c1',
      analyticsModule: [{ name: 'm', type: 't', parameters: { simpleItem: [{ name: 'p', value: '1' }] } }],
    } as any);
    await analytics.deleteAnalyticsModules({ configurationToken: 'c1', analyticsModuleName: ['m'] });
    await analytics.modifyAnalyticsModules({
      configurationToken: 'c1',
      analyticsModule: [{ name: 'm', type: 't', parameters: { simpleItem: [{ name: 'p', value: '1' }] } }],
    } as any);

    const Media2 = (await import('../src/media2')).default;
    const media2 = new Media2(onvif);
    mockServiceRequest(media2, () => ({
      getWebRTCConfigurationsResponse: { webRTCConfiguration: [] },
    }));
    await (media2 as any).getWebRTCConfigurations();

    const deviceIO = new DeviceIO(onvif);
    mockServiceRequest(deviceIO, (body) => {
      const root = Object.keys(body)[0];
      const map: Record<string, any> = {
        GetVideoSourceConfiguration: {
          getVideoSourceConfigurationResponse: {
            videoSourceConfiguration: {
              token: 'v1',
              name: 'vs',
              useCount: 1,
              sourceToken: 's1',
              bounds: { x: 0, y: 0, width: 1, height: 1 },
            },
          },
        },
        GetVideoOutputConfiguration: {
          getVideoOutputConfigurationResponse: { videoOutputConfiguration: { token: 'vo1' } },
        },
        GetVideoOutputConfigurationOptions: {
          getVideoOutputConfigurationOptionsResponse: { videoOutputConfigurationOptions: {} },
        },
        GetAudioSourceConfigurationOptions: {
          getAudioSourceConfigurationOptionsResponse: { audioSourceOptions: {} },
        },
      };
      return map[root] ?? {};
    });
    await deviceIO.getVideoSourceConfiguration({ videoSourceToken: 'v1' } as any);
    await deviceIO.getVideoOutputConfiguration({ videoOutputToken: 'vo1' } as any);
    await deviceIO.getVideoOutputConfigurationOptions({ videoOutputToken: 'vo1' } as any);
    await deviceIO.getAudioSourceConfigurationOptions({ audioSourceConfigurationToken: 'a1' } as any);

    // Replace lazy proxies with concrete instances so spies work without a live device.
    const PTZ = (await import('../src/ptz')).default;
    const Imaging = (await import('../src/imaging')).default;
    const EventsMod = (await import('../src/events')).default;
    const RecordingMod = (await import('../src/recording')).default;
    Object.defineProperty(onvif, 'ptz', { value: new PTZ(onvif), configurable: true });
    Object.defineProperty(onvif, 'imaging', { value: new Imaging(onvif), configurable: true });
    Object.defineProperty(onvif, 'events', { value: new EventsMod(onvif), configurable: true });
    Object.defineProperty(onvif, 'recording', { value: new RecordingMod(onvif), configurable: true });

    // Cam compatibility remaining methods via mocked onvif
    const { Cam } = await import('../src/compatibility/cam');
    const cam = Object.create(Cam.prototype) as any;
    cam.onvif = onvif;
    cam.emit = jest.fn();
    cam.storePullPointSubscription = jest.fn((s: unknown) => s);
    Object.defineProperty(onvif.ptz, 'presets', { configurable: true, get: () => [] });
    jest.spyOn(onvif.device, 'setSystemFactoryDefault').mockResolvedValue(undefined as any);
    jest.spyOn(onvif.device, 'systemReboot').mockResolvedValue('ok');
    jest.spyOn(onvif.device, 'createUsers').mockResolvedValue(undefined as any);
    jest.spyOn(onvif.device, 'deleteUsers').mockResolvedValue(undefined as any);
    jest.spyOn(onvif.device, 'sendAuxiliaryCommand').mockResolvedValue('ok' as any);
    jest.spyOn(onvif.ptz, 'gotoPreset').mockResolvedValue(undefined as any);
    jest.spyOn(onvif.ptz, 'gotoHomePosition').mockResolvedValue(undefined as any);
    jest.spyOn(onvif.imaging, 'setCurrentPreset').mockResolvedValue(undefined as any);
    jest.spyOn(onvif.events, 'subscribe').mockResolvedValue({
      subscriptionReference: { address: 'http://127.0.0.1/sub' },
    } as any);
    jest.spyOn(onvif.recording, 'createRecordingJob').mockResolvedValue('j1' as any);
    jest.spyOn(onvif.recording, 'deleteRecordingJob').mockResolvedValue(undefined as any);

    await new Promise<void>((resolve, reject) =>
      cam.setSystemFactoryDefault(true, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.setSystemFactoryDefault((e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.systemReboot((e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.createUsers(
        { user: [{ username: 'u', password: 'p', userLevel: 'User' }] },
        (e: Error | null) => (e ? reject(e) : resolve()),
      ),
    );
    await new Promise<void>((resolve, reject) =>
      cam.deleteUsers({ username: ['u'] }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.sendAuxiliaryCommand({ data: 'tt:Wiper|On' }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.gotoPreset({ presetToken: 'p1' }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.gotoHomePosition({}, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.setCurrentImagingPreset({ presetToken: 'i1', token: 'vs1' }, (e: Error | null) =>
        e ? reject(e) : resolve(),
      ),
    );
    await new Promise<void>((resolve, reject) =>
      cam.subscribe({ url: 'http://127.0.0.1/n' }, (e: Error | null) => (e ? reject(e) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      cam.createRecordingJob(
        {
          JobConfiguration: {
            RecordingToken: 'r1',
            Mode: 'Idle',
            Priority: 1,
          },
        },
        (e: Error | null) => (e ? reject(e) : resolve()),
      ),
    );
    await new Promise<void>((resolve, reject) =>
      cam.deleteRecordingJob({ JobToken: 'j1' }, (e: Error | null) => (e ? reject(e) : resolve())),
    );

    cam.onvif.defaultProfiles = [{ token: 'p' }];
    expect(cam.defaultProfiles).toBeDefined();
    expect(cam.presets).toBeDefined();
  });
});
