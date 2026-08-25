import { Onvif } from '../src';
import { AccessProfile } from '../src/interfaces/accessrules';
import happytimeOnvifOptions from './happytime.json';

const ACCESS_PROFILE_TOKEN_1 = 'AccessProfileToken_1';
const ACCESS_POINT_TOKEN_1 = 'AccessPointToken_1';

let cam: Onvif;
const createdAccessProfileTokens: string[] = [];

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

afterEach(async () => {
  while (createdAccessProfileTokens.length > 0) {
    const token = createdAccessProfileTokens.pop()!;
    try {
      await cam.accessRules.deleteAccessProfile({ token });
    } catch {
      // already deleted
    }
  }
});

describe('AccessRules', () => {
  beforeAll(() => {
    if (!cam.uri.accessrules) {
      throw new Error('AccessRules service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return access rules service capabilities as an object', async () => {
      const caps = await cam.accessRules.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.accessRules.getServiceCapabilities();
      expect(caps.maxLimit).toBe(10);
      expect(caps.maxAccessProfiles).toBe(10);
      expect(caps.maxAccessPoliciesPerAccessProfile).toBe(1);
      expect(caps.multipleSchedulesPerAccessPointSupported).toBe(true);
      expect(caps.clientSuppliedTokenSupported).toBe(true);
    });
  });

  describe('getAccessProfileInfoList / getAccessProfileInfo', () => {
    it('should return access profile info list from the mock server', async () => {
      const list = await cam.accessRules.getAccessProfileInfoList();
      expect(list.accessProfileInfo?.length).toBeGreaterThanOrEqual(1);
      expect(list.accessProfileInfo?.[0]).toHaveProperty('token');
      expect(list.accessProfileInfo?.[0]).toHaveProperty('name');
      expect(list.accessProfileInfo?.[0].token).toBe(ACCESS_PROFILE_TOKEN_1);
    });

    it('should return access profile info for requested tokens', async () => {
      const response = await cam.accessRules.getAccessProfileInfo({
        token: [ACCESS_PROFILE_TOKEN_1],
      });
      expect(response.accessProfileInfo?.length).toBe(1);
      expect(response.accessProfileInfo?.[0].token).toBe(ACCESS_PROFILE_TOKEN_1);
      expect(response.accessProfileInfo?.[0].name).toBe('AccessProfileName_1');
      expect(response.accessProfileInfo?.[0].description).toBe('test');
    });
  });

  describe('getAccessProfileList / getAccessProfiles', () => {
    it('should return access profile list from the mock server', async () => {
      const list = await cam.accessRules.getAccessProfileList();
      expect(list.accessProfile?.length).toBeGreaterThanOrEqual(1);
      expect(list.accessProfile?.[0].accessPolicy?.length).toBeGreaterThanOrEqual(1);
      expect(list.accessProfile?.[0].accessPolicy?.[0].entity).toBe(ACCESS_POINT_TOKEN_1);
    });

    it('should return access profiles for requested tokens', async () => {
      const response = await cam.accessRules.getAccessProfiles({
        token: [ACCESS_PROFILE_TOKEN_1],
      });
      expect(response.accessProfile?.length).toBe(1);
      expect(response.accessProfile?.[0].token).toBe(ACCESS_PROFILE_TOKEN_1);
      expect(response.accessProfile?.[0].name).toBe('AccessProfileName_1');
      expect(response.accessProfile?.[0].accessPolicy?.[0].scheduleToken).toBe('test');
    });

    it('should return empty list for an unknown token', async () => {
      const response = await cam.accessRules.getAccessProfiles({ token: ['InvalidToken'] });
      expect(response.accessProfile ?? []).toHaveLength(0);
    });
  });

  describe('createAccessProfile / modifyAccessProfile / deleteAccessProfile', () => {
    it('should create, modify, and delete an access profile', async () => {
      const accessProfile: AccessProfile = {
        token: '',
        name: 'TempAccessProfile',
        description: 'temp profile',
        accessPolicy: [
          {
            scheduleToken: 'ScheduleToken_1',
            entity: ACCESS_POINT_TOKEN_1,
          },
        ],
      };

      const token = await cam.accessRules.createAccessProfile({ accessProfile });
      createdAccessProfileTokens.push(token);
      expect(token).toBeDefined();

      await cam.accessRules.modifyAccessProfile({
        accessProfile: {
          ...accessProfile,
          token,
          name: 'TempAccessProfileModified',
          description: 'modified',
        },
      });

      const response = await cam.accessRules.getAccessProfiles({ token: [token] });
      expect(response.accessProfile?.[0].name).toBe('TempAccessProfileModified');
      expect(response.accessProfile?.[0].description).toBe('modified');
      expect(response.accessProfile?.[0].accessPolicy?.[0].entity).toBe(ACCESS_POINT_TOKEN_1);

      await cam.accessRules.deleteAccessProfile({ token });
      createdAccessProfileTokens.pop();

      const afterDelete = await cam.accessRules.getAccessProfiles({ token: [token] });
      expect(afterDelete.accessProfile ?? []).toHaveLength(0);
    });
  });

  describe('setAccessProfile', () => {
    it('should create or replace an access profile with a client-supplied token', async () => {
      const token = 'ClientSuppliedAccessProfileToken';
      createdAccessProfileTokens.push(token);

      await cam.accessRules.setAccessProfile({
        accessProfile: {
          token,
          name: 'SetAccessProfile',
          description: 'set via client token',
          accessPolicy: [
            {
              scheduleToken: 'ScheduleToken_1',
              entity: ACCESS_POINT_TOKEN_1,
            },
          ],
        },
      });

      const response = await cam.accessRules.getAccessProfiles({ token: [token] });
      expect(response.accessProfile?.[0].token).toBe(token);
      expect(response.accessProfile?.[0].name).toBe('SetAccessProfile');
    });
  });
});
