/**
 * Brute-force scan of an IP range for ONVIF devices (no WS-Discovery).
 * Useful on Layer-3 routed networks where multicast discovery fails.
 *
 * For each reachable device prints date/time, manufacturer/model, live stream
 * URIs, imaging move options (if any), and replay URI when recordings exist.
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Run after build:
 *   node examples/scan.ip.range.js
 */

const { Onvif } = require('../build');

const IP_RANGE_START = '192.168.1.1';
const IP_RANGE_END = '192.168.1.100';
const PORT_LIST = [80];
const USERNAME = 'username';
const PASSWORD = 'password';

const ipList = generateRange(IP_RANGE_START, IP_RANGE_END);

console.error = () => {};

for (const ip of ipList) {
  for (const port of PORT_LIST) {
    console.log(`${ip} ${port}`);
    probeHost(ip, port).catch(() => {});
  }
}

async function probeHost(hostname, port) {
  const onvif = new Onvif({
    hostname,
    username: USERNAME,
    password: PASSWORD,
    port,
    timeout: 10000,
  });

  try {
    await onvif.connect();
  } catch (err) {
    console.log(err.message || err);
    return;
  }

  const date = await onvif.device.getSystemDateAndTime().catch(() => undefined);
  const info = await onvif.device.getDeviceInformation().catch(() => undefined);

  const liveTcp = await onvif.media
    .getStreamUri({ protocol: 'RTSP', stream: 'RTP-Unicast' })
    .catch(() => undefined);
  const liveUdp = await onvif.media
    .getStreamUri({ protocol: 'UDP', stream: 'RTP-Unicast' })
    .catch(() => undefined);
  const liveMulticast = await onvif.media
    .getStreamUri({ protocol: 'UDP', stream: 'RTP-Multicast' })
    .catch(() => undefined);

  const moveOptions = await onvif.imaging.getMoveOptions().catch(() => undefined);

  let replayUri;
  const recordings = await onvif.recording.getRecordings().catch(() => undefined);
  if (recordings?.length) {
    replayUri = await onvif.replay
      .getReplayUri({ protocol: 'RTSP', recordingToken: recordings[0].recordingToken })
      .catch(() => undefined);
  }

  console.log('------------------------------');
  console.log(`Host: ${hostname} Port: ${port}`);
  console.log(`Date: = ${JSON.stringify(date)}`);
  console.log(`Info: = ${JSON.stringify(info)}`);
  if (liveTcp) console.log(`First Live TCP Stream: =       ${streamUri(liveTcp)}`);
  if (liveUdp) console.log(`First Live UDP Stream: =       ${streamUri(liveUdp)}`);
  if (liveMulticast) console.log(`First Live Multicast Stream: = ${streamUri(liveMulticast)}`);
  if (moveOptions) console.log(`Imaging move options: = ${JSON.stringify(moveOptions)}`);
  else console.log('Imaging move options: = No');
  if (recordings?.length) {
    console.log('Recordings: = Yes');
    if (replayUri) console.log(`First Replay Stream: = ${replayUri}`);
  } else {
    console.log('Recordings: = No');
  }
  console.log('------------------------------');
}

function streamUri(result) {
  return result?.uri ?? result?.mediaUri?.uri ?? '';
}

function generateRange(startIp, endIp) {
  let start = toLong(startIp);
  let end = toLong(endIp);
  if (start > end) [start, end] = [end, start];
  const range = [];
  for (let i = start; i <= end; i += 1) range.push(fromLong(i));
  return range;
}

function toLong(ip) {
  let ipl = 0;
  ip.split('.').forEach((octet) => {
    ipl <<= 8;
    ipl += parseInt(octet, 10);
  });
  return ipl >>> 0;
}

function fromLong(ipl) {
  return `${ipl >>> 24}.${(ipl >> 16) & 255}.${(ipl >> 8) & 255}.${ipl & 255}`;
}
