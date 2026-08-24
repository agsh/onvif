import { Onvif } from '../src';
import { Credential as CredentialEntity } from '../src/interfaces/credential';

const CREDENTIAL_TOKEN_1 = 'CredentialToken_1';
const ACCESS_PROFILE_TOKEN_1 = 'AccessProfileToken_1';

let cam: Onvif;
const createdCredentialTokens: string[] = [];

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
  while (createdCredentialTokens.length > 0) {
    const token = createdCredentialTokens.pop()!;
    try {
      await cam.credential.deleteCredential({ token });
    } catch {
      // already deleted
    }
  }
});

describe('Credential', () => {
  beforeAll(() => {
    if (!cam.uri.credential) {
      throw new Error('Credential service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return credential service capabilities as an object', async () => {
      const caps = await cam.credential.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.credential.getServiceCapabilities();
      expect(caps.maxLimit).toBeGreaterThan(0);
      expect(caps.maxCredentials).toBe(10);
      expect(caps.credentialValiditySupported).toBe(true);
      expect(caps.resetAntipassbackSupported).toBe(true);
      expect(caps.clientSuppliedTokenSupported).toBe(true);
      expect(caps.supportedIdentifierType).toEqual(
        expect.arrayContaining(['pt:Card', 'pt:PIN', 'pt:Fingerprint']),
      );
    });
  });

  describe('getSupportedFormatTypes', () => {
    it('should return format types for a card identifier', async () => {
      const formats = await cam.credential.getSupportedFormatTypes({
        credentialIdentifierTypeName: 'pt:Card',
      });
      expect(formats.length).toBeGreaterThanOrEqual(1);
      expect(formats[0]).toHaveProperty('formatType');
      expect(formats[0]).toHaveProperty('description');
    });
  });

  describe('getCredentialInfoList / getCredentialInfo', () => {
    it('should return credential info list from the mock server', async () => {
      const list = await cam.credential.getCredentialInfoList();
      expect(list.credentialInfo?.length).toBeGreaterThanOrEqual(1);
      expect(list.credentialInfo?.[0]).toHaveProperty('token');
      expect(list.credentialInfo?.[0]).toHaveProperty('credentialHolderReference');
      expect(list.credentialInfo?.[0].token).toBe(CREDENTIAL_TOKEN_1);
    });

    it('should return credential info for requested tokens', async () => {
      const response = await cam.credential.getCredentialInfo({ token: [CREDENTIAL_TOKEN_1] });
      expect(response.credentialInfo?.length).toBe(1);
      expect(response.credentialInfo?.[0].token).toBe(CREDENTIAL_TOKEN_1);
      expect(response.credentialInfo?.[0].credentialHolderReference).toBe('testuser');
    });
  });

  describe('getCredentialList / getCredentials', () => {
    it('should return credential list from the mock server', async () => {
      const list = await cam.credential.getCredentialList();
      expect(list.credential?.length).toBeGreaterThanOrEqual(1);
      expect(list.credential?.[0].credentialIdentifier?.length).toBeGreaterThanOrEqual(1);
      expect(list.credential?.[0].credentialIdentifier?.[0].type.name).toBe('pt:Card');
    });

    it('should return credentials for requested tokens', async () => {
      const response = await cam.credential.getCredentials({ token: [CREDENTIAL_TOKEN_1] });
      expect(response.credential?.length).toBe(1);
      expect(response.credential?.[0].token).toBe(CREDENTIAL_TOKEN_1);
      expect(response.credential?.[0].description).toBe('Credentia');
      expect(response.credential?.[0].credentialAccessProfile?.[0].accessProfileToken).toBe(
        ACCESS_PROFILE_TOKEN_1,
      );
    });
  });

  describe('getCredentialState', () => {
    it('should return credential state for a valid token', async () => {
      const state = await cam.credential.getCredentialState({ token: CREDENTIAL_TOKEN_1 });
      expect(typeof state.enabled).toBe('boolean');
      if (state.antipassbackState) {
        expect(typeof state.antipassbackState.antipassbackViolated).toBe('boolean');
      }
    });

    it('should reject an invalid credential token', async () => {
      await expect(cam.credential.getCredentialState({ token: 'InvalidToken' })).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('enableCredential / disableCredential', () => {
    afterEach(async () => {
      await cam.credential.enableCredential({ token: CREDENTIAL_TOKEN_1 });
    });

    it('should disable and enable a credential', async () => {
      await cam.credential.disableCredential({ token: CREDENTIAL_TOKEN_1, reason: 'test' });
      let state = await cam.credential.getCredentialState({ token: CREDENTIAL_TOKEN_1 });
      expect(state.enabled).toBe(false);
      expect(state.reason).toBe('test');

      await cam.credential.enableCredential({ token: CREDENTIAL_TOKEN_1 });
      state = await cam.credential.getCredentialState({ token: CREDENTIAL_TOKEN_1 });
      expect(state.enabled).toBe(true);
    });
  });

  describe('getCredentialIdentifiers / getCredentialAccessProfiles', () => {
    it('should return identifiers for a credential', async () => {
      const identifiers = await cam.credential.getCredentialIdentifiers({
        credentialToken: CREDENTIAL_TOKEN_1,
      });
      expect(identifiers?.length).toBeGreaterThanOrEqual(1);
      expect(identifiers?.[0].type.name).toBe('pt:Card');
      expect(identifiers?.[0].type.formatType).toBe('GUID');
      expect(identifiers?.[0].exemptedFromAuthentication).toBe(false);
    });

    it('should return access profiles for a credential', async () => {
      const profiles = await cam.credential.getCredentialAccessProfiles({
        credentialToken: CREDENTIAL_TOKEN_1,
      });
      expect(profiles?.length).toBeGreaterThanOrEqual(1);
      expect(profiles?.[0].accessProfileToken).toBe(ACCESS_PROFILE_TOKEN_1);
    });
  });

  describe('resetAntipassbackViolation', () => {
    it('should reset antipassback violation for a credential', async () => {
      await expect(
        cam.credential.resetAntipassbackViolation({ credentialToken: CREDENTIAL_TOKEN_1 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('whitelist and blacklist', () => {
    it('should manage whitelist entries', async () => {
      const before = await cam.credential.getWhitelist();
      expect(before).toBeDefined();
      await cam.credential.addToWhitelist({
        identifier: [
          {
            type: { name: 'pt:Card', formatType: 'GUID' },
            value: 'WL001',
          },
        ],
      } as any);
      const afterAdd = await cam.credential.getWhitelist();
      expect(afterAdd).toBeDefined();
      await cam.credential.removeFromWhitelist({
        identifier: [
          {
            type: { name: 'pt:Card', formatType: 'GUID' },
            value: 'WL001',
          },
        ],
      } as any);
      await expect(cam.credential.deleteWhitelist()).resolves.toBeUndefined();
    });

    it('should manage blacklist entries', async () => {
      const before = await cam.credential.getBlacklist();
      expect(before).toBeDefined();
      await cam.credential.addToBlacklist({
        identifier: [
          {
            type: { name: 'pt:Card', formatType: 'GUID' },
            value: 'BL001',
          },
        ],
      } as any);
      await cam.credential.removeFromBlacklist({
        identifier: [
          {
            type: { name: 'pt:Card', formatType: 'GUID' },
            value: 'BL001',
          },
        ],
      } as any);
      await expect(cam.credential.deleteBlacklist()).resolves.toBeUndefined();
    });
  });

  describe('setCredential and identifier helpers', () => {
    it('should set credential state/data helpers for existing token', async () => {
      const response = await cam.credential.getCredentials({ token: [CREDENTIAL_TOKEN_1] });
      const credential = response.credential?.[0];
      expect(credential).toBeDefined();
      await expect(
        cam.credential.setCredential({
          credentialData: {
            credential: credential!,
            credentialState: { enabled: true },
          },
        } as any),
      ).resolves.toBeUndefined();
    });
  });

  describe('createCredential / modifyCredential / deleteCredential', () => {
    it('should create, modify, and delete a credential', async () => {
      const credential: CredentialEntity = {
        token: '',
        description: 'Temp credential',
        credentialHolderReference: 'holder-temp',
        credentialIdentifier: [
          {
            type: { name: 'pt:Card', formatType: 'GUID' },
            exemptedFromAuthentication: false,
            value: 'AABBCC',
          },
        ],
      };

      const token = await cam.credential.createCredential({
        credential,
        state: { enabled: true },
      });
      createdCredentialTokens.push(token);
      expect(token).toBeDefined();

      await cam.credential.modifyCredential({
        credential: {
          ...credential,
          token,
          description: 'Temp credential modified',
        },
      });

      const response = await cam.credential.getCredentials({ token: [token] });
      expect(response.credential?.[0].description).toBe('Temp credential modified');
      expect(response.credential?.[0].credentialHolderReference).toBe('holder-temp');

      await cam.credential.deleteCredential({ token });
      createdCredentialTokens.pop();

      const afterDelete = await cam.credential.getCredentials({ token: [token] });
      expect(afterDelete.credential ?? []).toHaveLength(0);
    });
  });
});
