import { Onvif } from '../src';

const DOOR_TOKEN_1 = 'DoorToken_1';
const DOOR_TOKEN_2 = 'DoorToken_2';

let cam: Onvif;

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
});

describe('DoorControl', () => {
  beforeAll(() => {
    if (!cam.uri.doorcontrol) {
      throw new Error('DoorControl service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return door control service capabilities as an object', async () => {
      const caps = await cam.doorControl.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return maxLimit from the happytime mock server', async () => {
      const caps = await cam.doorControl.getServiceCapabilities();
      expect(caps.maxLimit).toBeGreaterThan(0);
    });
  });

  describe('getDoorInfoList / getDoorInfo', () => {
    it('should return door info list from the mock server', async () => {
      const list = await cam.doorControl.getDoorInfoList();
      expect(list.doorInfo?.length).toBeGreaterThanOrEqual(2);
      expect(list.doorInfo?.[0]).toHaveProperty('token');
      expect(list.doorInfo?.[0]).toHaveProperty('name');
      expect(list.doorInfo?.[0]).toHaveProperty('capabilities');
    });

    it('should return door info for requested tokens', async () => {
      const response = await cam.doorControl.getDoorInfo({ token: [DOOR_TOKEN_1, DOOR_TOKEN_2] });
      expect(response.doorInfo?.length).toBe(2);
      expect(response.doorInfo?.map((d) => d.token)).toEqual(expect.arrayContaining([DOOR_TOKEN_1, DOOR_TOKEN_2]));
    });
  });

  describe('getDoorList / getDoors', () => {
    it('should return door list from the mock server', async () => {
      const list = await cam.doorControl.getDoorList();
      expect(list.door?.length).toBeGreaterThanOrEqual(2);
      expect(list.door?.[0]).toHaveProperty('doorType');
      expect(list.door?.[0]).toHaveProperty('timings');
    });

    it('should return doors for requested tokens', async () => {
      const response = await cam.doorControl.getDoors({ token: [DOOR_TOKEN_1] });
      expect(response.door?.length).toBe(1);
      expect(response.door?.[0].token).toBe(DOOR_TOKEN_1);
      expect(response.door?.[0].name).toBe('DoorName_1');
    });
  });

  describe('getDoorState', () => {
    it('should return door state for a valid token', async () => {
      const state = await cam.doorControl.getDoorState({ token: DOOR_TOKEN_1 });
      expect(state.doorMode).toBe('Locked');
      expect(state.doorPhysicalState).toBe('Closed');
      expect(state.lockPhysicalState).toBe('Locked');
    });

    it('should reject an invalid door token', async () => {
      await expect(cam.doorControl.getDoorState({ token: 'InvalidToken' })).rejects.toThrow();
    });
  });

  describe('door control commands', () => {
    afterEach(async () => {
      await cam.doorControl.lockDoor({ token: DOOR_TOKEN_1 });
    });

    it('should unlock and lock a door', async () => {
      await cam.doorControl.unlockDoor({ token: DOOR_TOKEN_1 });
      let state = await cam.doorControl.getDoorState({ token: DOOR_TOKEN_1 });
      expect(state.doorMode).toBe('Unlocked');

      await cam.doorControl.lockDoor({ token: DOOR_TOKEN_1 });
      state = await cam.doorControl.getDoorState({ token: DOOR_TOKEN_1 });
      expect(state.doorMode).toBe('Locked');
    });

    it('should grant momentary access via accessDoor', async () => {
      await cam.doorControl.accessDoor({ token: DOOR_TOKEN_1 });
      const state = await cam.doorControl.getDoorState({ token: DOOR_TOKEN_1 });
      expect(['Accessed', 'Unlocked', 'Locked']).toContain(state.doorMode);
    });
  });
});
