/**
 * List media profiles and print RTSP stream + snapshot URIs.
 *
 * Works with Profile S (Media) and Profile T (Media2 via media.getStreamUri fallback).
 *
 * Run after build:
 *   node examples/media.stream.js
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

  const profiles = await onvif.media.getProfiles();
  console.log(
    'Profiles:',
    profiles.map((p) => ({ token: p.token, name: p.name })),
  );

  const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
  const streamUri = stream.uri ?? stream.mediaUri?.uri;
  console.log('Stream URI:', streamUri);

  const snapshot = await onvif.media.getSnapshotUri();
  const snapshotUri = snapshot.uri ?? snapshot.mediaUri?.uri;
  console.log('Snapshot URI:', snapshotUri);

  console.log('Media2 supported:', onvif.media2Support);
  console.log('Active media profile:', onvif.activeMediaProfile);
  console.log('Default profile encoding:', onvif.defaultProfile?.videoEncoderConfiguration?.encoding);

  await onvif.close();
})().catch(console.error);
