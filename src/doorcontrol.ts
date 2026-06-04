/**
 * DoorControl ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/pacs/doorcontrol.wsdl
 */

import { Onvif } from './onvif';
import { build, linerase } from './utils';
import { ReferenceToken } from './interfaces/common';
import {
  AccessDoor,
  BlockDoor,
  Capabilities,
  CreateDoor,
  CreateDoorResponse,
  DeleteDoor,
  Door,
  DoorCapabilities,
  DoorInfo,
  DoorState,
  DoubleLockDoor,
  GetDoorInfo,
  GetDoorInfoList,
  GetDoorInfoListResponse,
  GetDoorInfoResponse,
  GetDoorList,
  GetDoorListResponse,
  GetDoors,
  GetDoorsResponse,
  GetDoorState,
  LockDoor,
  LockDownDoor,
  LockDownReleaseDoor,
  LockOpenDoor,
  LockOpenReleaseDoor,
  ModifyDoor,
  SetDoor,
  Timings,
  UnlockDoor,
} from './interfaces/doorcontrol';

const DOORCONTROL_XMLNS = 'http://www.onvif.org/ver10/doorcontrol/wsdl';

/**
 * DoorControl service
 * @example
 * ```ts
 *  const doorsList = await cam.doorControl.getDoorList();
 *  const token = doorsList.door![0].token;
 *  console.log((await cam.doorControl.getDoorState({ token })).doorMode);
 *  await cam.doorControl.unlockDoor({ token });
 *  console.log((await cam.doorControl.getDoorState({ token })).doorMode);
 * ```
 */
export class DoorControl {
  private readonly onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  private static tokensToBuild(tokens?: ReferenceToken[]) {
    if (!tokens?.length) {
      return undefined;
    }
    return tokens.length === 1 ? tokens[0] : tokens;
  }

  private static doorCapabilitiesToBuild(capabilities: DoorCapabilities) {
    return {
      $: {
        ...(capabilities.access && { Access: capabilities.access }),
        ...(capabilities.accessTimingOverride && {
          AccessTimingOverride: capabilities.accessTimingOverride,
        }),
        ...(capabilities.lock && { Lock: capabilities.lock }),
        ...(capabilities.unlock && { Unlock: capabilities.unlock }),
        ...(capabilities.block && { Block: capabilities.block }),
        ...(capabilities.doubleLock && { DoubleLock: capabilities.doubleLock }),
        ...(capabilities.lockDown && { LockDown: capabilities.lockDown }),
        ...(capabilities.lockOpen && { LockOpen: capabilities.lockOpen }),
        ...(capabilities.doorMonitor && { DoorMonitor: capabilities.doorMonitor }),
        ...(capabilities.lockMonitor && { LockMonitor: capabilities.lockMonitor }),
        ...(capabilities.doubleLockMonitor && {
          DoubleLockMonitor: capabilities.doubleLockMonitor,
        }),
        ...(capabilities.alarm && { Alarm: capabilities.alarm }),
        ...(capabilities.tamper && { Tamper: capabilities.tamper }),
        ...(capabilities.fault && { Fault: capabilities.fault }),
      },
    };
  }

  private static timingsToBuild(timings: Timings) {
    return {
      ReleaseTime: timings.releaseTime,
      OpenTime: timings.openTime,
      ...(timings.extendedReleaseTime && {
        ExtendedReleaseTime: timings.extendedReleaseTime,
      }),
      ...(timings.delayTimeBeforeRelock && {
        DelayTimeBeforeRelock: timings.delayTimeBeforeRelock,
      }),
      ...(timings.extendedOpenTime && { ExtendedOpenTime: timings.extendedOpenTime }),
      ...(timings.preAlarmTime && { PreAlarmTime: timings.preAlarmTime }),
      ...(timings.extension && { Extension: timings.extension }),
    };
  }

  private static doorInfoToBuild(door: DoorInfo | Door) {
    return {
      $: { token: door.token },
      Name: door.name,
      ...(door.description && { Description: door.description }),
      Capabilities: DoorControl.doorCapabilitiesToBuild(door.capabilities),
    };
  }

  private static doorToBuild(door: Door) {
    return {
      ...DoorControl.doorInfoToBuild(door),
      DoorType: door.doorType,
      Timings: DoorControl.timingsToBuild(door.timings),
      ...(door.extension && { Extension: door.extension }),
    };
  }

  /**
   * Returns the capabilities of the door control service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const body = build({
      GetServiceCapabilities: {
        $: { xmlns: DOORCONTROL_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'doorcontrol', body });
    return linerase(data).getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns a list of door info items.
   * @param options
   */
  async getDoorInfoList(options: GetDoorInfoList = {}): Promise<GetDoorInfoListResponse> {
    const body = build({
      GetDoorInfoList: {
        $: { xmlns: DOORCONTROL_XMLNS },
        ...(options.limit !== undefined && { Limit: options.limit }),
        ...(options.startReference && { StartReference: options.startReference }),
      },
    });
    const [data] = await this.onvif.request({ service: 'doorcontrol', body });
    return linerase(data, { array: ['doorInfo'] }).getDoorInfoListResponse ?? {};
  }

  /**
   * Returns door info items for the requested tokens.
   * @param options
   */
  async getDoorInfo({ token }: GetDoorInfo): Promise<GetDoorInfoResponse> {
    const body = build({
      GetDoorInfo: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: DoorControl.tokensToBuild(token),
      },
    });
    const [data] = await this.onvif.request({ service: 'doorcontrol', body });
    return linerase(data, { array: ['doorInfo'] }).getDoorInfoResponse ?? {};
  }

  /**
   * Returns a list of door items.
   * @param options
   */
  async getDoorList(options: GetDoorList = {}): Promise<GetDoorListResponse> {
    const body = build({
      GetDoorList: {
        $: { xmlns: DOORCONTROL_XMLNS },
        ...(options.limit && { Limit: options.limit }),
        ...(options.startReference && { StartReference: options.startReference }),
      },
    });
    const [data] = await this.onvif.request({ service: 'doorcontrol', body });
    return linerase(data, { array: ['door'] }).getDoorListResponse ?? {};
  }

  /**
   * Returns door items for the requested tokens.
   * @param options
   */
  async getDoors({ token }: GetDoors): Promise<GetDoorsResponse> {
    const body = build({
      GetDoors: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: DoorControl.tokensToBuild(token),
      },
    });
    const [data] = await this.onvif.request({ service: 'doorcontrol', body });
    return linerase(data, { array: ['door'] }).getDoorsResponse ?? {};
  }

  /**
   * Creates a new door.
   * @param options
   */
  async createDoor({ door }: CreateDoor): Promise<CreateDoorResponse['token']> {
    const body = build({
      CreateDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Door: DoorControl.doorToBuild(door),
      },
    });
    const [data] = await this.onvif.request({ service: 'doorcontrol', body });
    return linerase(data).createDoorResponse.token;
  }

  /**
   * Creates or replaces a door (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setDoor({ door }: SetDoor): Promise<void> {
    const body = build({
      SetDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Door: DoorControl.doorToBuild(door),
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Modifies an existing door.
   * @param options
   */
  async modifyDoor({ door }: ModifyDoor): Promise<void> {
    const body = build({
      ModifyDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Door: DoorControl.doorToBuild(door),
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Deletes a door.
   * @param options
   */
  async deleteDoor({ token }: DeleteDoor): Promise<void> {
    const body = build({
      DeleteDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Returns the current state of a door.
   * @param options
   */
  async getDoorState({ token }: GetDoorState): Promise<DoorState> {
    const body = build({
      GetDoorState: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    const [data] = await this.onvif.request({ service: 'doorcontrol', body });
    return linerase(data).getDoorStateResponse.doorState;
  }

  /**
   * Grants momentary access to a door.
   * @param options
   */
  async accessDoor(options: AccessDoor): Promise<void> {
    const body = build({
      AccessDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: options.token,
        ...(options.useExtendedTime && { UseExtendedTime: options.useExtendedTime }),
        ...(options.accessTime && { AccessTime: options.accessTime }),
        ...(options.openTooLongTime && { OpenTooLongTime: options.openTooLongTime }),
        ...(options.preAlarmTime && { PreAlarmTime: options.preAlarmTime }),
        ...(options.extension && { Extension: options.extension }),
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Locks a door.
   * @param options
   */
  async lockDoor({ token }: LockDoor): Promise<void> {
    const body = build({
      LockDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Unlocks a door.
   * @param options
   */
  async unlockDoor({ token }: UnlockDoor): Promise<void> {
    const body = build({
      UnlockDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Blocks a door.
   * @param options
   */
  async blockDoor({ token }: BlockDoor): Promise<void> {
    const body = build({
      BlockDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Puts a door in lock-down mode.
   * @param options
   */
  async lockDownDoor({ token }: LockDownDoor): Promise<void> {
    const body = build({
      LockDownDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Releases lock-down mode on a door.
   * @param options
   */
  async lockDownReleaseDoor({ token }: LockDownReleaseDoor): Promise<void> {
    const body = build({
      LockDownReleaseDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Puts a door in lock-open mode.
   * @param options
   */
  async lockOpenDoor({ token }: LockOpenDoor): Promise<void> {
    const body = build({
      LockOpenDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Releases lock-open mode on a door.
   * @param options
   */
  async lockOpenReleaseDoor({ token }: LockOpenReleaseDoor): Promise<void> {
    const body = build({
      LockOpenReleaseDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }

  /**
   * Activates double-lock on a door.
   * @param options
   */
  async doubleLockDoor({ token }: DoubleLockDoor): Promise<void> {
    const body = build({
      DoubleLockDoor: {
        $: { xmlns: DOORCONTROL_XMLNS },
        Token: token,
      },
    });
    await this.onvif.request({ service: 'doorcontrol', body });
  }
}
