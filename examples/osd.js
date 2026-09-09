/**
 * OSD (On-Screen Display): delete existing plain-text overlays and add one new line.
 *
 * Vendor behaviour varies widely (max length, supported positions, Media1 vs Media2).
 *
 * (c) Roger Hardiman 2021
 *
 * Run after build:
 *   node examples/osd.js
 */

const { Onvif } = require('../build');

const HOSTNAME = '192.168.1.11';
const PORT = 80;
const USERNAME = 'onvifuser';
const PASSWORD = 'PASS99pass';

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
    timeout: 10000,
    preserveAddress: true,
  });

  await onvif.connect();
  console.log('Connected to ONVIF Device');

  const info = await onvif.device.getDeviceInformation();
  console.log(`Connected to ${JSON.stringify(info)}`);

  const videoSourceConfigurationToken =
    onvif.activeSource?.videoSourceConfigurationToken ??
    onvif.defaultProfile?.videoSourceConfiguration?.token;

  if (!videoSourceConfigurationToken) {
    throw new Error('No video source configuration token (device may lack Media)');
  }

  const { OSDOptions } = await onvif.media.getOSDOptions({ configurationToken: videoSourceConfigurationToken });
  console.log(`Maximum number of OSDs ${JSON.stringify(OSDOptions.maximumNumberOfOSDs)}`);

  const existing = await onvif.media.getOSDs({ configurationToken: videoSourceConfigurationToken });
  console.log(`Found ${existing.length} existing OSDs`);

  for (const osd of existing) {
    if (osd.type === 'Text' && osd.textString?.type !== 'DateAndTime') {
      console.log(`Deleting OSD Token ${osd.token}`);
      await onvif.media.deleteOSD({ OSDToken: osd.token });
    } else {
      console.log(`Keeping OSD Token ${osd.token}`);
    }
  }

  const positions = OSDOptions.positionOption ?? ['UpperLeft'];
  for (const position of positions) {
    console.log(`Trying to add new OSD at ${position}`);
    try {
      const created = await onvif.media.createOSD({
        token: `example_osd_${Date.now()}`,
        videoSourceConfigurationToken,
        type: 'Text',
        position: { type: position },
        textString: { type: 'Plain', plainText: 'Hello World' },
      });
      console.log(`New OSD created with token ${created.OSDToken}`);
      break;
    } catch {
      // try next position
    }
  }

  console.log('Finished');
})().catch(console.error);
