/**
 * Profile G: list recordings and print an RTSP replay URI for the first one.
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Run after build:
 *   node examples/replay.uri.js
 */

const { Onvif } = require('../build');

const IP_ADDRESS = '192.168.26.204';
const PORT = 80;
const USERNAME = 'onvifuser';
const PASSWORD = 'PASS99pass';

(async () => {
  const onvif = new Onvif({
    hostname: IP_ADDRESS,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
    timeout: 5000,
  });

  try {
    await onvif.connect();
  } catch (err) {
    console.log(err.message || err);
    return;
  }

  const recordings = await onvif.recording.getRecordings();
  if (!recordings?.length) {
    console.log('No recordings found');
    return;
  }

  const replayUri = await onvif.replay.getReplayUri({
    protocol: 'RTSP',
    recordingToken: recordings[0].recordingToken,
  });

  console.log('------------------------------');
  console.log(`Host: ${IP_ADDRESS} Port: ${PORT}`);
  console.log(`Recording token: ${recordings[0].recordingToken}`);
  console.log(`Replay URL: = ${replayUri}`);
  console.log('------------------------------');
})().catch(console.error);
