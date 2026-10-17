/**
 * Profile C / A: list doors, print state, unlock briefly, then lock again.
 *
 * Run after build:
 *   node examples/door.unlock.js
 */

const { Onvif } = require('../build');

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';
const UNLOCK_MS = 2000;

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
  });

  // Door stations often have no Media service
  await onvif.connect({ media: false });

  if (!onvif.uri.doorcontrol) {
    console.log('Device does not advertise DoorControl service');
    await onvif.close();
    return;
  }

  const caps = await onvif.doorControl.getServiceCapabilities();
  const list = await onvif.doorControl.getDoorInfoList();
  const doors = list.doorInfo ?? [];

  console.log('DoorControl capabilities:', caps);
  console.log(
    'Doors:',
    doors.map((d) => ({ token: d.token, name: d.name, description: d.description })),
  );

  if (!doors.length) {
    console.log('No doors found');
    await onvif.close();
    return;
  }

  const token = doors[0].token;
  console.log('State before:', await onvif.doorControl.getDoorState({ token }));
  await onvif.doorControl.unlockDoor({ token });
  console.log(`Unlocked for ${UNLOCK_MS}ms`);
  await new Promise((r) => setTimeout(r, UNLOCK_MS));
  await onvif.doorControl.lockDoor({ token });
  console.log('State after:', await onvif.doorControl.getDoorState({ token }));

  await onvif.close();
})().catch(console.error);
