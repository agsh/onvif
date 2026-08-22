/**
 * Schedule ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/schedule/wsdl/schedule.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import {
  Capabilities,
  CreateSchedule,
  CreateScheduleResponse,
  CreateSpecialDayGroup,
  CreateSpecialDayGroupResponse,
  DeleteSchedule,
  DeleteSpecialDayGroup,
  GetScheduleInfo,
  GetScheduleInfoList,
  GetScheduleInfoListResponse,
  GetScheduleInfoResponse,
  GetScheduleList,
  GetScheduleListResponse,
  GetSchedules,
  GetSchedulesResponse,
  GetScheduleState,
  GetSpecialDayGroupInfo,
  GetSpecialDayGroupInfoList,
  GetSpecialDayGroupInfoListResponse,
  GetSpecialDayGroupInfoResponse,
  GetSpecialDayGroupList,
  GetSpecialDayGroupListResponse,
  GetSpecialDayGroups,
  GetSpecialDayGroupsResponse,
  ModifySchedule,
  ModifySpecialDayGroup,
  Schedule as ScheduleEntity,
  ScheduleInfo,
  ScheduleState,
  SetSchedule,
  SetSpecialDayGroup,
  SpecialDayGroup,
  SpecialDayGroupInfo,
  SpecialDaysSchedule,
  TimePeriod,
} from './interfaces/schedule';

/**
 * Schedule service
 * @example
 * ```ts
 *  const list = await cam.schedule.getScheduleInfoList();
 *  const token = list.scheduleInfo![0].token;
 *  console.log((await cam.schedule.getScheduleState({ token })).active);
 * ```
 */
export default class Schedule extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'schedule');
  }

  private static timePeriodToBuild(period: TimePeriod) {
    return {
      From: period.from,
      ...(period.until !== undefined && { Until: period.until }),
      ...(period.extension && { Extension: period.extension }),
    };
  }

  private static specialDaysScheduleToBuild(specialDays: SpecialDaysSchedule) {
    return {
      GroupToken: specialDays.groupToken,
      ...(specialDays.timeRange && {
        TimeRange: specialDays.timeRange.map(Schedule.timePeriodToBuild),
      }),
      ...(specialDays.extension && { Extension: specialDays.extension }),
    };
  }

  private static scheduleInfoToBuild(schedule: ScheduleInfo | ScheduleEntity) {
    return {
      $: { token: schedule.token },
      Name: schedule.name,
      ...(schedule.description && { Description: schedule.description }),
    };
  }

  private static scheduleToBuild(schedule: ScheduleEntity) {
    return {
      ...Schedule.scheduleInfoToBuild(schedule),
      Standard: schedule.standard,
      ...(schedule.specialDays && {
        SpecialDays: schedule.specialDays.map(Schedule.specialDaysScheduleToBuild),
      }),
      ...(schedule.extension && { Extension: schedule.extension }),
    };
  }

  private static specialDayGroupInfoToBuild(group: SpecialDayGroupInfo | SpecialDayGroup) {
    return {
      $: { token: group.token },
      Name: group.name,
      ...(group.description && { Description: group.description }),
    };
  }

  private static specialDayGroupToBuild(group: SpecialDayGroup) {
    return {
      ...Schedule.specialDayGroupInfoToBuild(group),
      ...(group.days !== undefined && { Days: group.days }),
      ...(group.extension && { Extension: group.extension }),
    };
  }

  /**
   * Returns the capabilities of the schedule service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({ GetServiceCapabilities: {} });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns the current state of a schedule.
   * @param options
   */
  async getScheduleState({ token }: GetScheduleState): Promise<ScheduleState> {
    const response = await this.request({ GetScheduleState: { Token: token } });
    return response.getScheduleStateResponse.scheduleState;
  }

  /**
   * Returns schedule info items for the requested tokens.
   * @param options
   */
  async getScheduleInfo({ token }: GetScheduleInfo): Promise<GetScheduleInfoResponse> {
    const response = await this.request({ GetScheduleInfo: { Token: token } }, { array: ['scheduleInfo'] });
    return response.getScheduleInfoResponse || {};
  }

  /**
   * Returns a list of schedule info items.
   * @param options
   */
  async getScheduleInfoList(options: GetScheduleInfoList = {}): Promise<GetScheduleInfoListResponse> {
    const response = await this.request(
      {
        GetScheduleInfoList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['scheduleInfo'] },
    );
    return response.getScheduleInfoListResponse || {};
  }

  /**
   * Returns schedule items for the requested tokens.
   * @param options
   */
  async getSchedules({ token }: GetSchedules): Promise<GetSchedulesResponse> {
    const response = await this.request(
      { GetSchedules: { Token: token } },
      { array: ['schedule', 'specialDays', 'timeRange'] },
    );
    return response.getSchedulesResponse || {};
  }

  /**
   * Returns a list of schedule items.
   * @param options
   */
  async getScheduleList(options: GetScheduleList = {}): Promise<GetScheduleListResponse> {
    const response = await this.request(
      {
        GetScheduleList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['schedule', 'specialDays', 'timeRange'] },
    );
    return response.getScheduleListResponse || {};
  }

  /**
   * Creates a new schedule.
   * @param options
   */
  async createSchedule({ schedule }: CreateSchedule): Promise<CreateScheduleResponse['token']> {
    const response = await this.request({ CreateSchedule: { Schedule: Schedule.scheduleToBuild(schedule) } });
    return response.createScheduleResponse.token;
  }

  /**
   * Creates or replaces a schedule (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setSchedule({ schedule }: SetSchedule): Promise<void> {
    await this.request({ SetSchedule: { Schedule: Schedule.scheduleToBuild(schedule) } });
  }

  /**
   * Modifies an existing schedule.
   * @param options
   */
  async modifySchedule({ schedule }: ModifySchedule): Promise<void> {
    await this.request({ ModifySchedule: { Schedule: Schedule.scheduleToBuild(schedule) } });
  }

  /**
   * Deletes a schedule.
   * @param options
   */
  async deleteSchedule({ token }: DeleteSchedule): Promise<void> {
    await this.request({ DeleteSchedule: { Token: token } });
  }

  /**
   * Returns special day group info items for the requested tokens.
   * @param options
   */
  async getSpecialDayGroupInfo({ token }: GetSpecialDayGroupInfo): Promise<GetSpecialDayGroupInfoResponse> {
    const response = await this.request(
      { GetSpecialDayGroupInfo: { Token: token } },
      { array: ['specialDayGroupInfo'] },
    );
    return response.getSpecialDayGroupInfoResponse || {};
  }

  /**
   * Returns a list of special day group info items.
   * @param options
   */
  async getSpecialDayGroupInfoList(
    options: GetSpecialDayGroupInfoList = {},
  ): Promise<GetSpecialDayGroupInfoListResponse> {
    const response = await this.request(
      {
        GetSpecialDayGroupInfoList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['specialDayGroupInfo'] },
    );
    return response.getSpecialDayGroupInfoListResponse || {};
  }

  /**
   * Returns special day group items for the requested tokens.
   * @param options
   */
  async getSpecialDayGroups({ token }: GetSpecialDayGroups): Promise<GetSpecialDayGroupsResponse> {
    const response = await this.request({ GetSpecialDayGroups: { Token: token } }, { array: ['specialDayGroup'] });
    return response.getSpecialDayGroupsResponse || {};
  }

  /**
   * Returns a list of special day group items.
   * @param options
   */
  async getSpecialDayGroupList(options: GetSpecialDayGroupList = {}): Promise<GetSpecialDayGroupListResponse> {
    const response = await this.request(
      {
        GetSpecialDayGroupList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['specialDayGroup'] },
    );
    return response.getSpecialDayGroupListResponse || {};
  }

  /**
   * Creates a new special day group.
   * @param options
   */
  async createSpecialDayGroup({
    specialDayGroup,
  }: CreateSpecialDayGroup): Promise<CreateSpecialDayGroupResponse['token']> {
    const response = await this.request({
      CreateSpecialDayGroup: { SpecialDayGroup: Schedule.specialDayGroupToBuild(specialDayGroup) },
    });
    return response.createSpecialDayGroupResponse.token;
  }

  /**
   * Creates or replaces a special day group (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setSpecialDayGroup({ specialDayGroup }: SetSpecialDayGroup): Promise<void> {
    await this.request({ SetSpecialDayGroup: { SpecialDayGroup: Schedule.specialDayGroupToBuild(specialDayGroup) } });
  }

  /**
   * Modifies an existing special day group.
   * @param options
   */
  async modifySpecialDayGroup({ specialDayGroup }: ModifySpecialDayGroup): Promise<void> {
    await this.request({
      ModifySpecialDayGroup: { SpecialDayGroup: Schedule.specialDayGroupToBuild(specialDayGroup) },
    });
  }

  /**
   * Deletes a special day group.
   * @param options
   */
  async deleteSpecialDayGroup({ token }: DeleteSpecialDayGroup): Promise<void> {
    await this.request({ DeleteSpecialDayGroup: { Token: token } });
  }
}
