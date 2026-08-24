import { Onvif } from '../src';

const SIGNATURE_ALGORITHM = { algorithm: '1.2.840.113549.1.1.11' };

let cam: Onvif;
const createdKeyIDs: string[] = [];
const createdCertificateIDs: string[] = [];
const createdCertificationPathIDs: string[] = [];
const createdPassphraseIDs: string[] = [];

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
});

afterEach(async () => {
  while (createdCertificationPathIDs.length > 0) {
    const certificationPathID = createdCertificationPathIDs.pop()!;
    try {
      await cam.advancedSecurity.deleteCertificationPath({ certificationPathID });
    } catch {
      // already deleted
    }
  }
  while (createdCertificateIDs.length > 0) {
    const certificateID = createdCertificateIDs.pop()!;
    try {
      await cam.advancedSecurity.deleteCertificate({ certificateID });
    } catch {
      // already deleted
    }
  }
  while (createdKeyIDs.length > 0) {
    const keyID = createdKeyIDs.pop()!;
    try {
      await cam.advancedSecurity.deleteKey({ keyID });
    } catch {
      // already deleted
    }
  }
  while (createdPassphraseIDs.length > 0) {
    const passphraseID = createdPassphraseIDs.pop()!;
    try {
      await cam.advancedSecurity.deletePassphrase({ passphraseID });
    } catch {
      // already deleted
    }
  }
});

describe('AdvancedSecurity', () => {
  beforeAll(() => {
    if (!cam.uri.advancedsecurity) {
      throw new Error('AdvancedSecurity service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return advanced security service capabilities as an object', async () => {
      const caps = await cam.advancedSecurity.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return keystore and TLS capability flags from the happytime mock server', async () => {
      const caps = await cam.advancedSecurity.getServiceCapabilities();
      expect(caps.keystoreCapabilities).toBeDefined();
      expect(caps.keystoreCapabilities.maximumNumberOfKeys).toBe(16);
      expect(caps.keystoreCapabilities.RSAKeyPairGeneration).toBe(true);
      expect(caps.keystoreCapabilities.signatureAlgorithms?.length).toBeGreaterThanOrEqual(1);
      expect(caps.TLSServerCapabilities).toBeDefined();
      expect(caps.TLSServerCapabilities.enabledVersionsSupported).toBe(true);
    });
  });

  describe('getAllKeys / getAllCertificates / getAllCertificationPaths', () => {
    it('should return keystore listing arrays from the mock server', async () => {
      expect(Array.isArray(await cam.advancedSecurity.getAllKeys())).toBe(true);
      expect(Array.isArray(await cam.advancedSecurity.getAllCertificates())).toBe(true);
      expect(Array.isArray(await cam.advancedSecurity.getAllCertificationPaths())).toBe(true);
      expect(Array.isArray(await cam.advancedSecurity.getAllPassphrases())).toBe(true);
      expect(Array.isArray(await cam.advancedSecurity.getAllCRLs())).toBe(true);
      expect(Array.isArray(await cam.advancedSecurity.getAssignedServerCertificates())).toBe(true);
    });
  });

  describe('getEnabledTLSVersions', () => {
    it('should return enabled TLS versions from the mock server', async () => {
      const versions = await cam.advancedSecurity.getEnabledTLSVersions();
      expect(versions).toEqual(expect.arrayContaining(['1.0', '1.1', '1.2', '1.3']));
    });
  });

  describe('createRSAKeyPair / getKeyStatus / deleteKey', () => {
    it('should create an RSA key pair and report its status', async () => {
      const created = await cam.advancedSecurity.createRSAKeyPair({
        keyLength: 2048,
        alias: 'test-rsa-key',
      });
      createdKeyIDs.push(created.keyID);
      expect(created.keyID).toBeDefined();
      expect(created.estimatedCreationTime).toBeDefined();

      const status = await cam.advancedSecurity.getKeyStatus({ keyID: created.keyID });
      expect(status).toBe('ok');
      expect(await cam.advancedSecurity.getPrivateKeyStatus({ keyID: created.keyID })).toBe(true);

      const keys = await cam.advancedSecurity.getAllKeys();
      expect(keys?.map((k) => k.keyID)).toContain(created.keyID);
    });
  });

  describe('certificate and certification path flow', () => {
    it('should create a self-signed certificate and certification path', async () => {
      const created = await cam.advancedSecurity.createRSAKeyPair({
        keyLength: 2048,
        alias: 'cert-rsa-key',
      });
      createdKeyIDs.push(created.keyID);

      const certificateID = await cam.advancedSecurity.createSelfSignedCertificate({
        subject: { commonName: ['onvif.test'] },
        keyID: created.keyID,
        alias: 'selfsigned-cert',
        signatureAlgorithm: SIGNATURE_ALGORITHM,
      });
      createdCertificateIDs.push(certificateID);
      expect(certificateID).toBeDefined();

      const certificate = await cam.advancedSecurity.getCertificate({ certificateID });
      expect(certificate.certificateID).toBe(certificateID);
      expect(certificate.keyID).toBe(created.keyID);
      expect(certificate.alias).toBe('selfsigned-cert');
      expect(certificate.certificateContent).toBeDefined();

      const certificationPathID = await cam.advancedSecurity.createCertificationPath({
        certificateIDs: { certificateID: [certificateID] },
        alias: 'test-path',
      });
      createdCertificationPathIDs.push(certificationPathID);

      const path = await cam.advancedSecurity.getCertificationPath({ certificationPathID });
      expect(path.alias).toBe('test-path');
      expect(path.certificateID).toEqual([certificateID]);
      expect(await cam.advancedSecurity.getAllCertificationPaths()).toContain(certificationPathID);
    });
  });

  describe('uploadPassphrase / deletePassphrase', () => {
    it('should upload and delete a passphrase', async () => {
      const passphraseID = await cam.advancedSecurity.uploadPassphrase({
        passphrase: 'test-passphrase',
        passphraseAlias: 'test-pass',
      });
      createdPassphraseIDs.push(passphraseID);
      expect(passphraseID).toBeDefined();

      const passphrases = await cam.advancedSecurity.getAllPassphrases();
      expect(passphrases?.map((p) => p.passphraseID)).toContain(passphraseID);

      await cam.advancedSecurity.deletePassphrase({ passphraseID });
      createdPassphraseIDs.pop();
      expect(
        (await cam.advancedSecurity.getAllPassphrases())?.map((p) => p.passphraseID) ?? [],
      ).not.toContain(passphraseID);
    });
  });

  describe('TLS / client authentication settings', () => {
    it('should get and set TLS versions and client authentication flags when supported', async () => {
      const versions = await cam.advancedSecurity.getEnabledTLSVersions();
      const results = await Promise.allSettled([
        cam.advancedSecurity.setEnabledTLSVersions({ versions }),
        cam.advancedSecurity.setClientAuthenticationRequired({ clientAuthenticationRequired: false }),
        cam.advancedSecurity.setCnMapsToUser({ cnMapsToUser: false }),
      ]);
      expect(results).toHaveLength(3);
      for (const result of results) {
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('cert path validation policies and assignments', () => {
    it('should list validation policies and assignments from happytime', async () => {
      const results = await Promise.allSettled([
        cam.advancedSecurity.getAllCertPathValidationPolicies(),
        cam.advancedSecurity.getAssignedCertPathValidationPolicies(),
        cam.advancedSecurity.getAssignedMediaSigningCertificates(),
      ]);
      expect(results).toHaveLength(3);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          expect(Array.isArray(result.value)).toBe(true);
        } else {
          expect(result.reason).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Dot1X and authorization server listings', () => {
    it('should exercise Dot1X and authorization server list APIs', async () => {
      const results = await Promise.allSettled([
        cam.advancedSecurity.getAllDot1XConfigurations(),
        cam.advancedSecurity.getAuthorizationServerConfigurations(),
      ]);
      expect(results).toHaveLength(2);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          expect(Array.isArray(result.value)).toBe(true);
        } else {
          expect(result.reason).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('server certificate assignment', () => {
    it('should reject assigning a server certificate path on happytime', async () => {
      const created = await cam.advancedSecurity.createRSAKeyPair({
        keyLength: 2048,
        alias: 'server-assign-key',
      });
      createdKeyIDs.push(created.keyID);

      const certificateID = await cam.advancedSecurity.createSelfSignedCertificate({
        subject: { commonName: ['server.assign'] },
        keyID: created.keyID,
        alias: 'server-assign-cert',
        signatureAlgorithm: SIGNATURE_ALGORITHM,
      });
      createdCertificateIDs.push(certificateID);

      const certificationPathID = await cam.advancedSecurity.createCertificationPath({
        certificateIDs: { certificateID: [certificateID] },
        alias: 'server-assign-path',
      });
      createdCertificationPathIDs.push(certificationPathID);

      await expect(
        cam.advancedSecurity.addServerCertificateAssignment({ certificationPathID }),
      ).rejects.toThrow();
    });
  });
});
