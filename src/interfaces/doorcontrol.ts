import { DataEntity } from './types';
import { Name, Description } from './onvif';
import { ReferenceToken } from './common';

/** The physical state of a Door. */
export type DoorPhysicalState = 'Unknown' | 'Open' | 'Closed' | 'Fault';
/** The physical state of a Lock (including Double Lock). */
export type LockPhysicalState = 'Unknown' | 'Locked' | 'Unlocked' | 'Fault';
/** Describes the state of a Door with regard to alarms. */
export type DoorAlarmState = 'Normal' | 'DoorForcedOpen' | 'DoorOpenTooLong';
/** Describes the state of a Tamper detector. */
export type DoorTamperState = 'Unknown' | 'NotInTamper' | 'TamperDetected';
/** Describes the state of a Door fault. */
export type DoorFaultState = 'Unknown' | 'NotInFault' | 'FaultDetected';
/**
 * The DoorMode describe the mode of operation from a logical perspective.
 * Setting a door mode reflects the intent to set a door in a physical state.
 */
export type DoorMode =
  | 'Unknown'
  | 'Locked'
  | 'Unlocked'
  | 'Accessed'
  | 'Blocked'
  | 'LockedDown'
  | 'LockedOpen'
  | 'DoubleLocked';
/**
 * ServiceCapabilities structure reflects optional functionality of a service.
 * The information is static and does not change during device operation.
 * The following capabilities are available:
 */
export interface ServiceCapabilities {
  /**
   * The maximum number of entries returned by a single Get&lt;Entity&gt;List or
   * Get&lt;Entity&gt; request. The device shall never return more than this number of entities
   * in a single response.
   */
  maxLimit: number;
  /** Indicates the maximum number of doors supported by the device. */
  maxDoors?: number;
  /**
   * Indicates that the client is allowed to supply the token when creating doors.
   * To enable the use of the command SetDoor, the value must be set to true.
   */
  clientSuppliedTokenSupported?: boolean;
  /**
   * Indicates that the client can perform CRUD operations (create, read, update and delete)
   * on doors. To enable the use of the commands GetDoors, GetDoorList, CreateDoor, ModifyDoor
   * and DeleteDoor, the value must be set to true.
   */
  doorManagementSupported?: boolean;
}
/** Used as extension base. */
export interface DoorInfoBase extends DataEntity {
  /** A user readable name. It shall be up to 64 characters. */
  name?: Name;
  /** A user readable description. It shall be up to 1024 characters. */
  description?: Description;
}
/**
 * The DoorInfo type represents the Door as a physical object.
 * The structure contains information and capabilities of a specific door instance.
 * An ONVIF compliant device shall provide the following fields for each Door instance:
 */
export interface DoorInfo extends DoorInfoBase {
  /** The capabilities of the Door. */
  capabilities?: DoorCapabilities;
}
/**
 * The door structure shall include all properties of the DoorInfo structure and also a timings
 * structure.
 */
export interface Door extends DoorInfoBase {
  /** The capabilities of the Door. */
  capabilities?: DoorCapabilities;
  /**
   * The type of door. Is of type text. Can be either one of the following reserved
   * ONVIF types: "pt:Door", "pt:ManTrap", "pt:Turnstile", "pt:RevolvingDoor",
   * "pt:Barrier", or a custom defined type.
   */
  doorType?: Name;
  /**
   * A structure defining times such as how long the door is unlocked when
   * accessed, extended grant time, etc.
   */
  timings?: Timings;
  extension?: DoorExtension;
}
export interface DoorExtension {}
/**
 * A structure defining times such as how long the door is unlocked when accessed,
 * extended grant time, etc.
 */
export interface Timings {
  /**
   * When access is granted (door mode becomes Accessed), the latch is unlocked.
   * ReleaseTime is the time from when the latch is unlocked until it is
   * relocked again (unless the door is physically opened).
   */
  releaseTime?: string;
  /**
   * The time from when the door is physically opened until the door is set in the
   * DoorOpenTooLong alarm state.
   */
  openTime?: string;
  /**
   * Some individuals need extra time to open the door before the latch relocks.
   * If supported, ExtendedReleaseTime shall be added to ReleaseTime if UseExtendedTime
   * is set to true in the AccessDoor command.
   */
  extendedReleaseTime?: string;
  /**
   * If the door is physically opened after access is granted,
   * then DelayTimeBeforeRelock is the time from when the door is physically
   * opened until the latch goes back to locked state.
   */
  delayTimeBeforeRelock?: string;
  /**
   * Some individuals need extra time to pass through the door. If supported,
   * ExtendedOpenTime shall be added to OpenTime if UseExtendedTime is set to true
   * in the AccessDoor command.
   */
  extendedOpenTime?: string;
  /**
   * Before a DoorOpenTooLong alarm state is generated, a signal will sound to indicate
   * that the door must be closed. PreAlarmTime defines how long before DoorOpenTooLong
   * the warning signal shall sound.
   */
  preAlarmTime?: string;
  extension?: TimingsExtension;
}
export interface TimingsExtension {}
/**
 * DoorCapabilities reflect optional functionality of a particular physical entity.
 * Different door instances may have different set of capabilities.
 * This information may change during device operation, e.g. if hardware settings are changed.
 * The following capabilities are available:
 */
export interface DoorCapabilities {
  /**
   * Indicates whether or not this Door instance supports AccessDoor command to
   * perform momentary access.
   */
  access?: boolean;
  /**
   * Indicates that this Door instance supports overriding configured timing in the
   * AccessDoor command.
   */
  accessTimingOverride?: boolean;
  /**
   * Indicates that this Door instance supports LockDoor command to lock the
   * door.
   */
  lock?: boolean;
  /**
   * Indicates that this Door instance supports UnlockDoor command to unlock the
   * door.
   */
  unlock?: boolean;
  /**
   * Indicates that this Door instance supports BlockDoor command to block the
   * door.
   */
  block?: boolean;
  /**
   * Indicates that this Door instance supports DoubleLockDoor command to lock
   * multiple locks on the door.
   */
  doubleLock?: boolean;
  /**
   * Indicates that this Door instance supports LockDown (and LockDownRelease)
   * commands to lock the door and put it in LockedDown mode.
   */
  lockDown?: boolean;
  /**
   * Indicates that this Door instance supports LockOpen (and LockOpenRelease)
   * commands to unlock the door and put it in LockedOpen mode.
   */
  lockOpen?: boolean;
  /**
   * Indicates that this Door instance has a DoorMonitor and supports the
   * DoorPhysicalState event.
   */
  doorMonitor?: boolean;
  /**
   * Indicates that this Door instance has a LockMonitor and supports the
   * LockPhysicalState event.
   */
  lockMonitor?: boolean;
  /**
   * Indicates that this Door instance has a DoubleLockMonitor and supports the
   * DoubleLockPhysicalState event.
   */
  doubleLockMonitor?: boolean;
  /**
   * Indicates that this Door instance supports door alarm and the DoorAlarm
   * event.
   */
  alarm?: boolean;
  /**
   * Indicates that this Door instance has a Tamper detector and supports the
   * DoorTamper event.
   */
  tamper?: boolean;
  /**
   * Indicates that this Door instance supports door fault and the DoorFault
   * event.
   */
  fault?: boolean;
}
/** The DoorState structure contains current aggregate runtime status of Door. */
export interface DoorState {
  /**
   * Physical state of the Door; it is of type DoorPhysicalState. A device that
   * signals support for DoorMonitor capability for a particular door instance shall provide
   * this field.
   */
  doorPhysicalState?: DoorPhysicalState;
  /**
   * Physical state of the Lock; it is of type LockPhysicalState. A device that
   * signals support for LockMonitor capability for a particular door instance shall provide
   * this field.
   */
  lockPhysicalState?: LockPhysicalState;
  /**
   * Physical state of the DoubleLock; it is of type LockPhysicalState. A
   * device that signals support for DoubleLockMonitor capability for a particular door
   * instance shall provide this field.
   */
  doubleLockPhysicalState?: LockPhysicalState;
  /**
   * Alarm state of the door; it is of type DoorAlarmState. A device that
   * signals support for Alarm capability for a particular door instance shall provide this
   * field.
   */
  alarm?: DoorAlarmState;
  /**
   * Tampering state of the door; it is of type DoorTamper. A device that
   * signals support for Tamper capability for a particular door instance shall provide this
   * field.
   */
  tamper?: DoorTamper;
  /**
   * Fault information for door; it is of type DoorFault. A device that signals
   * support for Fault capability for a particular door instance shall provide this field.
   */
  fault?: DoorFault;
  /**
   * The logical operating mode of the door; it is of type DoorMode. An ONVIF
   * compatible device shall report current operating mode in this field.
   */
  doorMode?: DoorMode;
}
/** Tampering information for a Door. */
export interface DoorTamper {
  /**
   * Optional field; Details describing tampering state change (e.g., reason,
   * place and time).
   * NOTE: All fields (including this one) which are designed to give
   * end-user prompts can be localized to the customer's native language.
   */
  reason?: string;
  /** State of the tamper detector; it is of type DoorTamperState. */
  state?: DoorTamperState;
}
/**
 * Fault information for a Door.
 * This can be extended with optional attributes in the future.
 */
export interface DoorFault {
  /** Optional reason for fault. */
  reason?: string;
  /**
   * Overall fault state for the door; it is of type DoorFaultState. If there
   * are any faults, the value shall be: FaultDetected. Details of the detected fault shall
   * be found in the Reason field, and/or the various DoorState fields and/or in extensions
   * to this structure.
   */
  state?: DoorFaultState;
}
/** Extension for the AccessDoor command. */
export interface AccessDoorExtension {}
export interface Capabilities extends ServiceCapabilities {}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /**
   * The capability response message contains the requested DoorControl
   * service capabilities using a hierarchical XML capability structure.
   */
  capabilities?: ServiceCapabilities;
}
export interface GetDoorInfoList {
  /**
   * Maximum number of entries to return. If Limit is omitted or if the
   * value of Limit is higher than what the device supports, then the device shall
   * return its maximum amount of entries.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference. If not specified,
   * entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetDoorInfoListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of DoorInfo items. */
  doorInfo?: DoorInfo[];
}
export interface GetDoorInfo {
  /** Tokens of DoorInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetDoorInfoResponse {
  /** List of DoorInfo items. */
  doorInfo?: DoorInfo[];
}
export interface GetDoorList {
  /**
   * Maximum number of entries to return. If not specified, less than one
   * or higher than what the device supports, the number of items is determined by the
   * device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference. If not specified,
   * entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetDoorListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of Door items. */
  door?: Door[];
}
export interface GetDoors {
  /** Tokens of Door items to get. */
  token?: ReferenceToken[];
}
export interface GetDoorsResponse {
  /** List of Door items. */
  door?: Door[];
}
export interface CreateDoor {
  /** Door item to create */
  door?: Door;
}
export interface CreateDoorResponse {
  /** Token of created Door item */
  token?: ReferenceToken;
}
export interface SetDoor {
  /** The Door item to create or modify */
  door?: Door;
}
export interface SetDoorResponse {}
export interface ModifyDoor {
  /** The details of the door */
  door?: Door;
}
export interface ModifyDoorResponse {}
export interface DeleteDoor {
  /** The Token of the door to delete. */
  token?: ReferenceToken;
}
export interface DeleteDoorResponse {}
export interface GetDoorState {
  /** Token of the Door instance to get the state for. */
  token?: ReferenceToken;
}
export interface GetDoorStateResponse {
  /** The state of the door. */
  doorState?: DoorState;
}
export interface AccessDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
  /**
   * Optional - Indicates that the configured extended time should be
   * used.
   */
  useExtendedTime?: boolean;
  /** Optional - overrides ReleaseTime if specified. */
  accessTime?: string;
  /** Optional - overrides OpenTime if specified. */
  openTooLongTime?: string;
  /** Optional - overrides PreAlarmTime if specified. */
  preAlarmTime?: string;
  /** Future extension. */
  extension?: AccessDoorExtension;
}
export interface AccessDoorResponse {}
export interface LockDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface LockDoorResponse {}
export interface UnlockDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface UnlockDoorResponse {}
export interface BlockDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface BlockDoorResponse {}
export interface LockDownDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface LockDownDoorResponse {}
export interface LockDownReleaseDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface LockDownReleaseDoorResponse {}
export interface LockOpenDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface LockOpenDoorResponse {}
export interface LockOpenReleaseDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface LockOpenReleaseDoorResponse {}
export interface DoubleLockDoor {
  /** Token of the Door instance to control. */
  token?: ReferenceToken;
}
export interface DoubleLockDoorResponse {}
