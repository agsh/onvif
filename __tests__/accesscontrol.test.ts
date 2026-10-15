import { Onvif } from '../src';
import { AccessPoint, Area } from '../src/interfaces/accesscontrol';
import happytimeOnvifOptions from './happytime.json';

const ACCESS_POINT_TOKEN_1 = 'AccessPointToken_1';
const ACCESS_POINT_TOKEN_2 = 'AccessPointToken_2';
const AREA_TOKEN_1 = 'AreaToken_1';
const AREA_TOKEN_2 = 'AreaToken_2';
const DOOR_TOKEN_1 = 'DoorToken_1';

let cam: Onvif;
const createdAccessPointTokens: string[] = [];
const createdAreaTokens: string[] = [];

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

afterEach(async () => {
  while (createdAccessPointTokens.length > 0) {
    const token = createdAccessPointTokens.pop()!;
    try {
      await cam.accessControl.deleteAccessPoint({ token });
    } catch {
      // already deleted
    }
  }
  while (createdAreaTokens.length > 0) {
    const token = createdAreaTokens.pop()!;
    try {
      await cam.accessControl.deleteArea({ token });
    } catch {
      // already deleted
    }
  }
});

describe('AccessControl', () => {
  beforeAll(() => {
    if (!cam.uri.accesscontrol) {
      throw new Error('AccessControl service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return access control service capabilities as an object', async () => {
      const caps = await cam.accessControl.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.accessControl.getServiceCapabilities();
      expect(caps.maxLimit).toBe(10);
      expect(caps.maxAccessPoints).toBe(10);
      expect(caps.maxAreas).toBe(10);
      expect(caps.clientSuppliedTokenSupported).toBe(true);
      expect(caps.accessPointManagementSupported).toBe(true);
      expect(caps.areaManagementSupported).toBe(true);
    });
  });

  describe('getAccessPointInfoList / getAccessPointInfo', () => {
    it('should return access point info list from the mock server', async () => {
      const list = await cam.accessControl.getAccessPointInfoList();
      expect(list.accessPointInfo?.length).toBeGreaterThanOrEqual(2);
      expect(list.accessPointInfo?.[0]).toHaveProperty('token');
      expect(list.accessPointInfo?.[0]).toHaveProperty('name');
      expect(list.accessPointInfo?.[0]).toHaveProperty('capabilities');
      expect(list.accessPointInfo?.[0].token).toBe(ACCESS_POINT_TOKEN_1);
    });

    it('should return access point info for requested tokens', async () => {
      const accessPointInfo = await cam.accessControl.getAccessPointInfo({
        token: [ACCESS_POINT_TOKEN_1, ACCESS_POINT_TOKEN_2],
      });
      expect(accessPointInfo.length).toBe(2);
      expect(accessPointInfo.map((item) => item.token)).toEqual(
        expect.arrayContaining([ACCESS_POINT_TOKEN_1, ACCESS_POINT_TOKEN_2]),
      );
    });
  });

  describe('getAccessPointList / getAccessPoints', () => {
    it('should return access point list from the mock server', async () => {
      const list = await cam.accessControl.getAccessPointList();
      expect(list.accessPoint?.length).toBeGreaterThanOrEqual(2);
      expect(list.accessPoint?.[0]).toHaveProperty('entity');
      expect(list.accessPoint?.[0]).toHaveProperty('capabilities');
    });

    it('should return access points for requested tokens', async () => {
      const accessPoints = await cam.accessControl.getAccessPoints({ token: [ACCESS_POINT_TOKEN_1] });
      expect(accessPoints.length).toBe(1);
      expect(accessPoints[0].token).toBe(ACCESS_POINT_TOKEN_1);
      expect(accessPoints[0].name).toBe('AccessPointName_1');
      expect(accessPoints[0].entity).toBe(DOOR_TOKEN_1);
      expect(accessPoints[0].areaFrom).toBe(AREA_TOKEN_1);
      expect(accessPoints[0].areaTo).toBe(AREA_TOKEN_2);
    });
  });

  describe('getAreaInfoList / getAreaInfo', () => {
    it('should return area info list from the mock server', async () => {
      const list = await cam.accessControl.getAreaInfoList();
      expect(list.areaInfo?.length).toBeGreaterThanOrEqual(4);
      expect(list.areaInfo?.[0]).toHaveProperty('token');
      expect(list.areaInfo?.[0]).toHaveProperty('name');
    });

    it('should return area info for requested tokens', async () => {
      const areaInfo = await cam.accessControl.getAreaInfo({
        token: [AREA_TOKEN_1, AREA_TOKEN_2],
      });
      expect(areaInfo.length).toBe(2);
      expect(areaInfo.map((item) => item.token)).toEqual(
        expect.arrayContaining([AREA_TOKEN_1, AREA_TOKEN_2]),
      );
    });
  });

  describe('getAreaList / getAreas', () => {
    it('should return area list from the mock server', async () => {
      const list = await cam.accessControl.getAreaList();
      expect(list.area?.length).toBeGreaterThanOrEqual(4);
      expect(list.area?.[0].token).toBe(AREA_TOKEN_1);
      expect(list.area?.[0].name).toBe('AreaName_1');
    });

    it('should return areas for requested tokens', async () => {
      const areas = await cam.accessControl.getAreas({ token: [AREA_TOKEN_1] });
      expect(areas.length).toBe(1);
      expect(areas[0].token).toBe(AREA_TOKEN_1);
      expect(areas[0].description).toBe('Area 1');
    });
  });

  describe('getAccessPointState', () => {
    it('should return access point state for a valid token', async () => {
      const state = await cam.accessControl.getAccessPointState({ token: ACCESS_POINT_TOKEN_1 });
      expect(state.enabled).toBe(true);
    });

    it('should reject an invalid access point token', async () => {
      await expect(cam.accessControl.getAccessPointState({ token: 'InvalidToken' })).rejects.toThrow('Not found');
    });
  });

  describe('enableAccessPoint / disableAccessPoint', () => {
    afterEach(async () => {
      await cam.accessControl.enableAccessPoint({ token: ACCESS_POINT_TOKEN_1 });
    });

    it('should disable and enable an access point', async () => {
      await cam.accessControl.disableAccessPoint({ token: ACCESS_POINT_TOKEN_1 });
      let state = await cam.accessControl.getAccessPointState({ token: ACCESS_POINT_TOKEN_1 });
      expect(state.enabled).toBe(false);

      await cam.accessControl.enableAccessPoint({ token: ACCESS_POINT_TOKEN_1 });
      state = await cam.accessControl.getAccessPointState({ token: ACCESS_POINT_TOKEN_1 });
      expect(state.enabled).toBe(true);
    });
  });

  describe('createAccessPoint / modifyAccessPoint / deleteAccessPoint', () => {
    it('should create, modify, and delete an access point', async () => {
      const accessPoint: AccessPoint = {
        token: '',
        name: 'TempAccessPoint',
        description: 'temporary access point',
        entity: DOOR_TOKEN_1,
        entityType: 'tdc:Door',
        capabilities: {
          disableAccessPoint: true,
          duress: false,
          anonymousAccess: false,
          accessTaken: false,
          externalAuthorization: false,
        },
      };

      const token = await cam.accessControl.createAccessPoint({ accessPoint });
      createdAccessPointTokens.push(token);
      expect(token).toBeDefined();

      await cam.accessControl.modifyAccessPoint({
        accessPoint: {
          ...accessPoint,
          token,
          name: 'TempAccessPointModified',
          description: 'modified access point',
        },
      });

      const accessPoints = await cam.accessControl.getAccessPoints({ token: [token] });
      expect(accessPoints[0].name).toBe('TempAccessPointModified');
      expect(accessPoints[0].description).toBe('modified access point');

      await cam.accessControl.deleteAccessPoint({ token });
      createdAccessPointTokens.pop();

      const afterDelete = await cam.accessControl.getAccessPoints({ token: [token] });
      expect(afterDelete).toHaveLength(0);
    });
  });

  describe('createArea / modifyArea / deleteArea', () => {
    it('should create, modify, and delete an area', async () => {
      const area: Area = {
        token: '',
        name: 'TempArea',
        description: 'temporary area',
      };

      const token = await cam.accessControl.createArea({ area });
      createdAreaTokens.push(token);
      expect(token).toBeDefined();

      await cam.accessControl.modifyArea({
        area: {
          ...area,
          token,
          name: 'TempAreaModified',
          description: 'modified area',
        },
      });

      const areas = await cam.accessControl.getAreas({ token: [token] });
      expect(areas[0].name).toBe('TempAreaModified');
      expect(areas[0].description).toBe('modified area');

      await cam.accessControl.deleteArea({ token });
      createdAreaTokens.pop();

      const afterDelete = await cam.accessControl.getAreas({ token: [token] });
      expect(afterDelete).toHaveLength(0);
    });
  });
});
