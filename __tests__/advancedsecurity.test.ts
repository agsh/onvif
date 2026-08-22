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
    it('should return empty lists from a clean mock keystore', async () => {
      expect(await cam.advancedSecurity.getAllKeys()).toEqual([]);
      expect(await cam.advancedSecurity.getAllCertificates()).toEqual([]);
      expect(await cam.advancedSecurity.getAllCertificationPaths()).toEqual([]);
      expect(await cam.advancedSecurity.getAllPassphrases()).toEqual([]);
      expect(await cam.advancedSecurity.getAllCRLs()).toEqual([]);
      expect(await cam.advancedSecurity.getAssignedServerCertificates()).toEqual([]);
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
});
