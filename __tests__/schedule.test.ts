import { Onvif } from '../src';
import { Schedule as ScheduleEntity, SpecialDayGroup } from '../src/interfaces/schedule';

const SCHEDULE_TOKEN_1 = 'ScheduleToken_1';
const STANDARD_ICAL =
  'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:19700101T000000\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR\nDTEND:19700101T235959\nEND:VEVENT\nEND:VCALENDAR';
const SPECIAL_DAYS_ICAL = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20200101\nEND:VEVENT\nEND:VCALENDAR';

let cam: Onvif;
const createdScheduleTokens: string[] = [];
const createdSpecialDayGroupTokens: string[] = [];

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
  while (createdScheduleTokens.length > 0) {
    const token = createdScheduleTokens.pop()!;
    try {
      await cam.schedule.deleteSchedule({ token });
    } catch {
      // already deleted
    }
  }
  while (createdSpecialDayGroupTokens.length > 0) {
    const token = createdSpecialDayGroupTokens.pop()!;
    try {
      await cam.schedule.deleteSpecialDayGroup({ token });
    } catch {
      // already deleted
    }
  }
});

describe('Schedule', () => {
  beforeAll(() => {
    if (!cam.uri.schedule) {
      throw new Error('Schedule service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return schedule service capabilities as an object', async () => {
      const caps = await cam.schedule.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.schedule.getServiceCapabilities();
      expect(caps.maxLimit).toBe(10);
      expect(caps.maxSchedules).toBe(10);
      expect(caps.maxTimePeriodsPerDay).toBe(10);
      expect(caps.maxSpecialDayGroups).toBe(10);
      expect(caps.extendedRecurrenceSupported).toBe(true);
      expect(caps.specialDaysSupported).toBe(true);
    });
  });

  describe('getScheduleInfoList / getScheduleInfo', () => {
    it('should return schedule info list from the mock server', async () => {
      const list = await cam.schedule.getScheduleInfoList();
      expect(list.scheduleInfo?.length).toBeGreaterThanOrEqual(1);
      expect(list.scheduleInfo?.[0]).toHaveProperty('token');
      expect(list.scheduleInfo?.[0]).toHaveProperty('name');
      expect(list.scheduleInfo?.[0].token).toBe(SCHEDULE_TOKEN_1);
    });

    it('should return schedule info for requested tokens', async () => {
      const response = await cam.schedule.getScheduleInfo({ token: [SCHEDULE_TOKEN_1] });
      expect(response.scheduleInfo?.length).toBe(1);
      expect(response.scheduleInfo?.[0].token).toBe(SCHEDULE_TOKEN_1);
      expect(response.scheduleInfo?.[0].name).toBe('ScheduleName_1');
      expect(response.scheduleInfo?.[0].description).toBe('Schedule 1');
    });
  });

  describe('getScheduleList / getSchedules', () => {
    it('should return schedule list from the mock server', async () => {
      const list = await cam.schedule.getScheduleList();
      expect(list.schedule?.length).toBeGreaterThanOrEqual(1);
      expect(list.schedule?.[0]).toHaveProperty('standard');
      expect(list.schedule?.[0].standard).toContain('BEGIN:VCALENDAR');
    });

    it('should return schedules for requested tokens', async () => {
      const response = await cam.schedule.getSchedules({ token: [SCHEDULE_TOKEN_1] });
      expect(response.schedule?.length).toBe(1);
      expect(response.schedule?.[0].token).toBe(SCHEDULE_TOKEN_1);
      expect(response.schedule?.[0].name).toBe('ScheduleName_1');
      expect(response.schedule?.[0].standard).toContain('DTSTART:20171125T200000');
    });

    it('should return empty list for an unknown token', async () => {
      const response = await cam.schedule.getSchedules({ token: ['InvalidToken'] });
      expect(response.schedule ?? []).toHaveLength(0);
    });
  });

  describe('getScheduleState', () => {
    it('should return schedule state for a valid token', async () => {
      const state = await cam.schedule.getScheduleState({ token: SCHEDULE_TOKEN_1 });
      expect(typeof state.active).toBe('boolean');
    });

    it('should reject an invalid schedule token', async () => {
      await expect(cam.schedule.getScheduleState({ token: 'InvalidToken' })).rejects.toThrow('Not found');
    });
  });

  describe('createSchedule / modifySchedule / deleteSchedule', () => {
    it('should create, modify, and delete a schedule', async () => {
      const schedule: ScheduleEntity = {
        token: '',
        name: 'TempSchedule',
        description: 'temp schedule',
        standard: STANDARD_ICAL,
      };

      const token = await cam.schedule.createSchedule({ schedule });
      createdScheduleTokens.push(token);
      expect(token).toBeDefined();

      await cam.schedule.modifySchedule({
        schedule: {
          ...schedule,
          token,
          name: 'TempScheduleModified',
          description: 'modified',
        },
      });

      const response = await cam.schedule.getSchedules({ token: [token] });
      expect(response.schedule?.[0].name).toBe('TempScheduleModified');
      expect(response.schedule?.[0].description).toBe('modified');
      expect(response.schedule?.[0].standard).toContain('FREQ=WEEKLY');

      await cam.schedule.deleteSchedule({ token });
      createdScheduleTokens.pop();

      const afterDelete = await cam.schedule.getSchedules({ token: [token] });
      expect(afterDelete.schedule ?? []).toHaveLength(0);
    });
  });

  describe('special day groups', () => {
    it('should create, modify, list, and delete a special day group', async () => {
      const specialDayGroup: SpecialDayGroup = {
        token: '',
        name: 'TempSpecialDayGroup',
        description: 'temp group',
        days: SPECIAL_DAYS_ICAL,
      };

      const token = await cam.schedule.createSpecialDayGroup({ specialDayGroup });
      createdSpecialDayGroupTokens.push(token);
      expect(token).toBeDefined();

      await cam.schedule.modifySpecialDayGroup({
        specialDayGroup: {
          ...specialDayGroup,
          token,
          name: 'TempSpecialDayGroupModified',
          description: 'modified group',
        },
      });

      const infoList = await cam.schedule.getSpecialDayGroupInfoList();
      expect(infoList.specialDayGroupInfo?.map((g) => g.token)).toContain(token);

      const info = await cam.schedule.getSpecialDayGroupInfo({ token: [token] });
      expect(info.specialDayGroupInfo?.[0].name).toBe('TempSpecialDayGroupModified');

      const groups = await cam.schedule.getSpecialDayGroups({ token: [token] });
      expect(groups.specialDayGroup?.[0].description).toBe('modified group');
      expect(groups.specialDayGroup?.[0].days).toContain('DTSTART:20200101');

      await cam.schedule.deleteSpecialDayGroup({ token });
      createdSpecialDayGroupTokens.pop();

      const afterDelete = await cam.schedule.getSpecialDayGroups({ token: [token] });
      expect(afterDelete.specialDayGroup ?? []).toHaveLength(0);
    });
  });
});
