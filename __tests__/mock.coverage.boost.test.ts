/**
 * Mocked request paths to exercise builders / service methods HappyTime does not cover.
 * @jest-environment node
 */

import AdvancedSecurity from '../src/advancedsecurity';
import Device from '../src/device';
import DeviceIO from '../src/deviceio';
import DoorControl from '../src/doorcontrol';
import Events from '../src/events';
import Recording from '../src/recording';
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

describe('Mock coverage boost', () => {
  it('covers device password/cert/dot1x/storage helpers via mocked request', async () => {
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

  it('covers advancedsecurity builders and upload/create helpers', async () => {
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

  it('covers events filter/broker/subscribe paths via mocked onvif.request', async () => {
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

  it('covers doorcontrol builders and CRUD via mocked request', async () => {
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

  it('covers recording and deviceio builders plus export helpers', async () => {
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
  });
});
