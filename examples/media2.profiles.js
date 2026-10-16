/**
 * Profile T: list Media2 profiles and video encoder configurations.
 *
 * Requires a device that advertises Media2 (`onvif.media2Support === true`).
 *
 * Run after build:
 *   node examples/media2.profiles.js
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

  if (!onvif.media2Support) {
    console.log('This device does not support Media2 / Profile T');
    await onvif.close();
    return;
  }

  const profiles = await onvif.media2.getProfiles();
  console.log(
    'Media2 profiles:',
    profiles.map((p) => ({
      token: p.token,
      name: p.name,
      videoEncoder: p.configurations?.videoEncoder?.encoding,
      resolution: p.configurations?.videoEncoder?.resolution,
    })),
  );

  const encoders = await onvif.media2.getVideoEncoderConfigurations();
  console.log(
    'Video encoders:',
    encoders.map((e) => ({
      token: e.token,
      name: e.name,
      encoding: e.encoding,
      resolution: e.resolution,
      quality: e.quality,
    })),
  );

  const stream = await onvif.media2.getStreamUri({ protocol: 'RTSP' });
  console.log('Media2 stream URI:', stream.uri);

  await onvif.close();
})().catch(console.error);
