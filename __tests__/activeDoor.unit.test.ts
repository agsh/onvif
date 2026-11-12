/**
 * activeDoorToken defaults for DoorControl omit-token DX.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import { connectSteps, getActiveDoor, setActiveDoor } from '../src/connection';
import DoorControl from '../src/doorcontrol';

describe('activeDoorToken', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getActiveDoor sets the first door from GetDoorInfoList', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.doorcontrol = new URL('http://127.0.0.1/onvif/doorcontrol');
    jest.spyOn(onvif.doorControl, 'getDoorInfoList').mockResolvedValue({
      doorInfo: [{ token: 'DoorToken_1', name: 'Main' } as never, { token: 'DoorToken_2' } as never],
    });

    await getActiveDoor(onvif);
    expect(onvif.activeDoorToken).toBe('DoorToken_1');
  });

  it('getActiveDoor is a no-op without DoorControl XAddr', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.activeDoorToken = 'stale';
    const spy = jest.spyOn(onvif.doorControl, 'getDoorInfoList');

    await getActiveDoor(onvif);
    expect(onvif.activeDoorToken).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it('setActiveDoor switches the default used by omit-token DoorControl calls', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.activeDoorToken = 'DoorToken_1';
    const door = new DoorControl(onvif);
    const req = jest.spyOn(door as any, 'request').mockResolvedValue({
      getDoorStateResponse: { doorState: { doorMode: 'Locked' } },
      getDoorInfoResponse: { doorInfo: [{ token: 'DoorToken_2' }] },
    });

    setActiveDoor(onvif, 'DoorToken_2');
    await door.getDoorState();
    await door.unlockDoor();
    await door.getDoorInfo();

    expect(req.mock.calls.map((c) => c[0])).toEqual([
      { GetDoorState: { Token: 'DoorToken_2' } },
      { UnlockDoor: { Token: 'DoorToken_2' } },
      { GetDoorInfo: { Token: 'DoorToken_2' } },
    ]);
  });

  it('connect probes activeDoor via getActiveEntityTokens', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue({} as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      cam.uri.doorcontrol = new URL('http://127.0.0.1/onvif/doorcontrol');
      return [] as never;
    });
    jest.spyOn(connectSteps, 'getActiveAccessPoint').mockResolvedValue(undefined);
    jest.spyOn(connectSteps, 'getActiveRecording').mockResolvedValue(undefined);
    jest.spyOn(connectSteps, 'getActiveRelayOutput').mockResolvedValue(undefined);
    const getActiveDoorSpy = jest.spyOn(connectSteps, 'getActiveDoor').mockImplementation(async (cam) => {
      cam.activeDoorToken = 'DoorToken_1';
    });

    await onvif.connect({ media: false });
    expect(getActiveDoorSpy).toHaveBeenCalled();
    expect(onvif.activeDoorToken).toBe('DoorToken_1');
  });
});
