/**
 * Read imaging settings and options for the active video source.
 *
 * Optionally bumps brightness by 1 (commented out by default).
 *
 * Run after build:
 *   node examples/imaging.settings.js
 */

const { Onvif } = require('../build');

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
  });

  await onvif.connect();

  if (!onvif.uri.imaging) {
    console.log('Device does not advertise Imaging service');
    await onvif.close();
    return;
  }

  const settings = await onvif.imaging.getImagingSettings();
  const options = await onvif.imaging.getOptions();
  const status = await onvif.imaging.getStatus().catch(() => undefined);

  console.log('Imaging settings:', settings);
  console.log('Imaging options (ranges):', options);
  if (status) console.log('Imaging status:', status);

  // Uncomment to change brightness (clamped to device options when available):
  // const min = options.brightness?.min ?? 0;
  // const max = options.brightness?.max ?? 100;
  // const next = Math.min(max, Math.max(min, (settings.brightness ?? min) + 1));
  // await onvif.imaging.setImagingSettings({
  //   imagingSettings: { ...settings, brightness: next },
  //   forcePersistence: true,
  // });
  // console.log('Brightness set to', next);

  await onvif.close();
})().catch(console.error);
