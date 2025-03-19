import { PositiveInteger, DataEntity } from './types';
import { Name, Description, Time } from './onvif';
import { ReferenceToken } from './common';

/**
 * The service capabilities reflect optional functionality of a service.
 * The information is static and does not change during device operation.
 * The following capabilities are available:
 */
export interface ServiceCapabilities {
  /**
   * The maximum number of entries returned by a single Get&lt;Entity&gt;List or
   * Get&lt;Entity&gt; request. The device shall never return more than this number
   * of entities in a single response.
   */
  maxLimit: PositiveInteger;
  /**
   * Indicates the maximum number of schedules the device supports.
   * The device shall support at least one schedule.
   */
  maxSchedules: PositiveInteger;
  /**
   * Indicates the maximum number of time periods per day the device supports
   * in a schedule including special days schedule. The device shall support
   * at least one time period per day.
   */
  maxTimePeriodsPerDay: PositiveInteger;
  /**
   * Indicates the maximum number of special day group entities the device supports.
   * The device shall support at least one ‘SpecialDayGroup’ entity.
   */
  maxSpecialDayGroups: PositiveInteger;
  /**
   * Indicates the maximum number of days per ‘SpecialDayGroup’ entity the device
   * supports. The device shall support at least one day per ‘SpecialDayGroup’ entity.
   */
  maxDaysInSpecialDayGroup: PositiveInteger;
  /**
   * Indicates the maximum number of ‘SpecialDaysSchedule’ entities referred by a
   * schedule that the device supports.
   */
  maxSpecialDaysSchedules: PositiveInteger;
  /**
   * For schedules:
   * If this capability is supported, then all iCalendar recurrence types shall
   * be supported by the device. The device shall also support the start and end dates (or
   * iCalendar occurrence count) in recurring events (see iCalendar examples in section 3).
   * If this capability is not supported, then only the weekly iCalendar recurrence
   * type shall be supported. Non-recurring events and other recurring types are
   * not supported. The device shall only accept a start date with the year ‘1970’
   * (the month and day is needed to reflect the week day of the recurrence)
   * and will not accept an occurrence count (or iCalendar until date) in recurring events.
   * For special days (only applicable if SpecialDaysSupported is set to true):
   * If this capability is supported, then all iCalendar recurrence types shall
   * be supported by the device. The device shall also support the start and
   * end dates (or occurrence count) in recurring events.
   * If this capability is not supported, then only non-recurring special days are supported.
   */
  extendedRecurrenceSupported: boolean;
  /** If this capability is supported, then the device shall support special days. */
  specialDaysSupported: boolean;
  /**
   * If this capability is set to true, the device shall implement the
   * GetScheduleState command, and shall notify subscribing clients whenever
   * schedules become active or inactive.
   */
  stateReportingSupported: boolean;
  /**
   * Indicates that the client is allowed to supply the token when creating schedules and special day groups.
   * To enable the use of the commands SetSchedule and SetSpecialDayGroup, the value must be set to true.
   */
  clientSuppliedTokenSupported?: boolean;
}
/**
 * The ScheduleInfo type represents the schedule as a physical object.
 * The structure contains information of a specific schedule instance.
 */
export interface ScheduleInfo extends DataEntity {
  /** A user readable name. It shall be up to 64 characters. */
  name?: Name;
  /** User readable description for the schedule. It shall be up to 1024 characters. */
  description?: Description;
}
/**
 * The schedule structure shall include all properties of the ScheduleInfo structure
 * and also the standard events (iCalendar format) and a list of SpecialDaysSchedule instances.
 */
export interface Schedule extends ScheduleInfo {
  /**
   * An iCalendar structure that defines a number of events. Events
   * can be recurring or non-recurring. The events can, for instance,
   * be used to control when a camera should record or when a facility
   * is accessible. Some devices might not be able to fully support
   * all the features of iCalendar. Setting the service capability
   * ExtendedRecurrenceSupported to false will enable more devices
   * to be ONVIF compliant. Is of type string (but contains an iCalendar structure).
   */
  standard?: string;
  /**
   * For devices that are not able to support all the features of iCalendar,
   * supporting special days is essential. Each SpecialDaysSchedule
   * instance defines an alternate set of time periods that overrides
   * the regular schedule for a specified list of special days.
   * Is of type SpecialDaysSchedule.
   */
  specialDays?: SpecialDaysSchedule[];
  extension?: ScheduleExtension;
}
export interface ScheduleExtension {}
/** A override schedule that defines alternate time periods for a group of special days. */
export interface SpecialDaysSchedule {
  /** Indicates the list of special days in a schedule. */
  groupToken?: ReferenceToken;
  /**
   * Indicates the alternate time periods for the list of special days
   * (overrides the regular schedule). For example, the regular schedule indicates
   * that it is active from 8AM to 5PM on Mondays. However, this particular
   * Monday is a special day, and the alternate time periods state that the
   * schedule is active from 9 AM to 11 AM and 1 PM to 4 PM.
   * If no time periods are defined, then no access is allowed.
   * Is of type TimePeriod.
   */
  timeRange?: TimePeriod[];
  extension?: SpecialDaysScheduleExtension;
}
export interface SpecialDaysScheduleExtension {}
/** The ScheduleState contains state information for a schedule. */
export interface ScheduleState {
  /**
   * Indicates that the current time is within the boundaries of the schedule
   * or its special days schedules’ time periods. For example, if this
   * schedule is being used for triggering automatic recording on a video source,
   * the Active flag will be true when the schedule-based recording is supposed to record.
   */
  active?: boolean;
  /**
   * Indicates that the current time is within the boundaries of its special
   * days schedules’ time periods. For example, if this schedule is being used
   * for recording at a lower frame rate on a video source during special days,
   * the SpecialDay flag will be true. If special days are not supported by the device,
   * this field may be omitted and interpreted as false by the client.
   */
  specialDay?: boolean;
  extension?: ScheduleStateExtension;
}
export interface ScheduleStateExtension {}
/**
 * A time period defines a start and end time. For full day access, the
 * start time ="00:00:00" with no defined end time. For a time period with no
 * end time, the schedule runs until midnight. The end time must always be greater
 * than the start time, otherwise an InvalidArgVal error messages is generated by the device.
 */
export interface TimePeriod {
  /** Indicates the start time. */
  from?: Time;
  /**
   * Indicates the end time. Is optional, if omitted, the period ends at midnight.
   * The end time is exclusive, meaning that that exact moment in time is not
   * part of the period. To determine if a moment in time (t) is part of a time period,
   * the formula StartTime &#8804; t &lt; EndTime is used.
   */
  until?: Time;
  extension?: TimePeriodExtension;
}
export interface TimePeriodExtension {}
/** The SpecialDayGroupInfo structure contains the basic information about the special days list. */
export interface SpecialDayGroupInfo extends DataEntity {
  /** User readable name. It shall be up to 64 characters. */
  name?: Name;
  /**
   * User readable description for the special days. It shall be up to 1024
   * characters.
   */
  description?: Description;
}
/**
 * The special day group structure shall include all properties of the SpecialDayGroupInfo
 * structure and also a set of special days. A special day group are days (or parts of days)
 * that require the regular schedule to be overridden with an alternate schedule.
 * For example holidays, half-days, working Sundays, etc.
 */
export interface SpecialDayGroup extends SpecialDayGroupInfo {
  /**
   * An iCalendar structure that contains a group of special days.
   * Is of type string (containing an iCalendar structure).
   */
  days?: string;
  extension?: SpecialDayGroupExtension;
}
export interface SpecialDayGroupExtension {}
export interface Capabilities extends ServiceCapabilities {}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /**
   * The capability response message contains the requested schedule service
   * capabilities using a hierarchical XML capability structure.
   */
  capabilities?: ServiceCapabilities;
}
export interface GetScheduleState {
  /** Token of schedule instance to get ScheduleState. */
  token?: ReferenceToken;
}
export interface GetScheduleStateResponse {
  /** ScheduleState item. */
  scheduleState?: ScheduleState;
}
export interface GetScheduleInfo {
  /** Tokens of ScheduleInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetScheduleInfoResponse {
  /** List of ScheduleInfo items. */
  scheduleInfo?: ScheduleInfo[];
}
export interface GetScheduleInfoList {
  /**
   * Maximum number of entries to return. If not specified, less than one
   * or higher than what the device supports, the number of items is
   * determined by the device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference.
   * If not specified, entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetScheduleInfoListResponse {
  /**
   * StartReference to use in next call to get the following items.
   * If absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of ScheduleInfo items. */
  scheduleInfo?: ScheduleInfo[];
}
export interface GetSchedules {
  /** Tokens of Schedule items to get */
  token?: ReferenceToken[];
}
export interface GetSchedulesResponse {
  /** List of schedule items. */
  schedule?: Schedule[];
}
export interface GetScheduleList {
  /**
   * Maximum number of entries to return.
   * If not specified, less than one or higher than what the device supports,
   * the number of items is determined by the device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference.
   * If not specified, entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetScheduleListResponse {
  /**
   * StartReference to use in next call to get the following items.
   * If absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of Schedule items. */
  schedule?: Schedule[];
}
export interface CreateSchedule {
  /** The Schedule to create */
  schedule?: Schedule;
}
export interface CreateScheduleResponse {
  /** The token of created Schedule */
  token?: ReferenceToken;
}
export interface SetSchedule {
  /** The Schedule to modify/create */
  schedule?: Schedule;
}
export interface SetScheduleResponse {}
export interface ModifySchedule {
  /** The Schedule to modify/update */
  schedule?: Schedule;
}
export interface ModifyScheduleResponse {}
export interface DeleteSchedule {
  /** The token of the schedule to delete. */
  token?: ReferenceToken;
}
export interface DeleteScheduleResponse {}
export interface GetSpecialDayGroupInfo {
  /** Tokens of SpecialDayGroupInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetSpecialDayGroupInfoResponse {
  /** List of SpecialDayGroupInfo items. */
  specialDayGroupInfo?: SpecialDayGroupInfo[];
}
export interface GetSpecialDayGroupInfoList {
  /**
   * Maximum number of entries to return. If not specified, less than
   * one or higher than what the device supports, the number
   * of items is determined by the device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference.
   * If not specified, entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetSpecialDayGroupInfoListResponse {
  /**
   * StartReference to use in next call to get the following items.
   * If absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of SpecialDayGroupInfo items. */
  specialDayGroupInfo?: SpecialDayGroupInfo[];
}
export interface GetSpecialDayGroups {
  /** Tokens of the SpecialDayGroup items to get */
  token?: ReferenceToken[];
}
export interface GetSpecialDayGroupsResponse {
  /** List of SpecialDayGroup items. */
  specialDayGroup?: SpecialDayGroup[];
}
export interface GetSpecialDayGroupList {
  /**
   * Maximum number of entries to return. If not specified, less than
   * one or higher than what the device supports, the number of
   * items is determined by the device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference.
   * If not specified, entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetSpecialDayGroupListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of SpecialDayGroup items. */
  specialDayGroup?: SpecialDayGroup[];
}
export interface CreateSpecialDayGroup {
  /** The special day group to create. */
  specialDayGroup?: SpecialDayGroup;
}
export interface CreateSpecialDayGroupResponse {
  /** The token of created special day group. */
  token?: ReferenceToken;
}
export interface SetSpecialDayGroup {
  /** The SpecialDayGroup to modify/create */
  specialDayGroup?: SpecialDayGroup;
}
export interface SetSpecialDayGroupResponse {}
export interface ModifySpecialDayGroup {
  /** The special day group to modify/update. */
  specialDayGroup?: SpecialDayGroup;
}
export interface ModifySpecialDayGroupResponse {}
export interface DeleteSpecialDayGroup {
  /** The token of the special day group item to delete. */
  token?: ReferenceToken;
}
export interface DeleteSpecialDayGroupResponse {}
