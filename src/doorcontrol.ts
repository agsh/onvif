/**
 * DoorControl ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/pacs/doorcontrol.wsdl
 */

import { Onvif, OnvifServices } from './onvif';
import Service from './service';
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
export class DoorControl extends Service {
  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
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
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns a list of door info items.
   * @param options
   */
  async getDoorInfoList(options: GetDoorInfoList = {}): Promise<GetDoorInfoListResponse> {
    const response = await this.request(
      {
        GetDoorInfoList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['doorInfo'] },
    );
    return response.getDoorInfoListResponse ?? {};
  }

  /**
   * Returns door info items for the requested tokens.
   * @param options
   */
  async getDoorInfo({ token }: GetDoorInfo): Promise<GetDoorInfoResponse> {
    const response = await this.request(
      {
        GetDoorInfo: {
          Token: DoorControl.tokensToBuild(token),
        },
      },
      { array: ['doorInfo'] },
    );
    return response.getDoorInfoResponse ?? {};
  }

  /**
   * Returns a list of door items.
   * @param options
   */
  async getDoorList(options: GetDoorList = {}): Promise<GetDoorListResponse> {
    const response = await this.request(
      {
        GetDoorList: {
          ...(options.limit && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['door'] },
    );
    return response.getDoorListResponse ?? {};
  }

  /**
   * Returns door items for the requested tokens.
   * @param options
   */
  async getDoors({ token }: GetDoors): Promise<GetDoorsResponse> {
    const response = await this.request(
      {
        GetDoors: {
          Token: DoorControl.tokensToBuild(token),
        },
      },
      { array: ['door'] },
    );
    return response.getDoorsResponse ?? {};
  }

  /**
   * Creates a new door.
   * @param options
   */
  async createDoor({ door }: CreateDoor): Promise<CreateDoorResponse['token']> {
    const response = await this.request({
      CreateDoor: {
        Door: DoorControl.doorToBuild(door),
      },
    });
    return response.createDoorResponse.token;
  }

  /**
   * Creates or replaces a door (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setDoor({ door }: SetDoor): Promise<void> {
    await this.request({
      SetDoor: {
        Door: DoorControl.doorToBuild(door),
      },
    });
  }

  /**
   * Modifies an existing door.
   * @param options
   */
  async modifyDoor({ door }: ModifyDoor): Promise<void> {
    await this.request({
      ModifyDoor: {
        Door: DoorControl.doorToBuild(door),
      },
    });
  }

  /**
   * Deletes a door.
   * @param options
   */
  async deleteDoor({ token }: DeleteDoor): Promise<void> {
    await this.request({
      DeleteDoor: {
        Token: token,
      },
    });
  }

  /**
   * Returns the current state of a door.
   * @param options
   */
  async getDoorState({ token }: GetDoorState): Promise<DoorState> {
    const response = await this.request({
      GetDoorState: {
        Token: token,
      },
    });
    return response.getDoorStateResponse.doorState;
  }

  /**
   * Grants momentary access to a door.
   * @param options
   */
  async accessDoor(options: AccessDoor): Promise<void> {
    await this.request({
      AccessDoor: {
        Token: options.token,
        ...(options.useExtendedTime && { UseExtendedTime: options.useExtendedTime }),
        ...(options.accessTime && { AccessTime: options.accessTime }),
        ...(options.openTooLongTime && { OpenTooLongTime: options.openTooLongTime }),
        ...(options.preAlarmTime && { PreAlarmTime: options.preAlarmTime }),
        ...(options.extension && { Extension: options.extension }),
      },
    });
  }

  /**
   * Locks a door.
   * @param options
   */
  async lockDoor({ token }: LockDoor): Promise<void> {
    await this.request({
      LockDoor: {
        Token: token,
      },
    });
  }

  /**
   * Unlocks a door.
   * @param options
   */
  async unlockDoor({ token }: UnlockDoor): Promise<void> {
    await this.request({
      UnlockDoor: {
        Token: token,
      },
    });
  }

  /**
   * Blocks a door.
   * @param options
   */
  async blockDoor({ token }: BlockDoor): Promise<void> {
    await this.request({
      BlockDoor: {
        Token: token,
      },
    });
  }

  /**
   * Puts a door in lock-down mode.
   * @param options
   */
  async lockDownDoor({ token }: LockDownDoor): Promise<void> {
    await this.request({
      LockDownDoor: {
        Token: token,
      },
    });
  }

  /**
   * Releases lock-down mode on a door.
   * @param options
   */
  async lockDownReleaseDoor({ token }: LockDownReleaseDoor): Promise<void> {
    await this.request({
      LockDownReleaseDoor: {
        Token: token,
      },
    });
  }

  /**
   * Puts a door in lock-open mode.
   * @param options
   */
  async lockOpenDoor({ token }: LockOpenDoor): Promise<void> {
    await this.request({
      LockOpenDoor: {
        Token: token,
      },
    });
  }

  /**
   * Releases lock-open mode on a door.
   * @param options
   */
  async lockOpenReleaseDoor({ token }: LockOpenReleaseDoor): Promise<void> {
    await this.request({
      LockOpenReleaseDoor: {
        Token: token,
      },
    });
  }

  /**
   * Activates double-lock on a door.
   * @param options
   */
  async doubleLockDoor({ token }: DoubleLockDoor): Promise<void> {
    await this.request({
      DoubleLockDoor: {
        Token: token,
      },
    });
  }
}
