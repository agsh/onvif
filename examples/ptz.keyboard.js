/**
 * Control PTZ from the keyboard (cursor keys + zoom) and recall presets 1–9.
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Requires: `npm i keypress`
 *
 * Run after build:
 *   node examples/ptz.keyboard.js
 *
 * Keys: arrows = pan/tilt, +/-/= = zoom, 1–9 = goto preset, q / Ctrl+C = quit
 */

const { Onvif } = require('../build');
const keypress = require('keypress');

const HOSTNAME = '192.168.0.116';
const PORT = 80;
const USERNAME = 'username';
const PASSWORD = 'password';
const STOP_DELAY_MS = 50;

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
    timeout: 10000,
  });

  try {
    await onvif.connect();
  } catch (err) {
    console.error(err);
    return;
  }

  let stopTimer;
  let ignoreKeypress = false;
  const presetNames = [];
  const presetTokens = [];

  const stream = await onvif.media.getStreamUri();
  const uri = stream.uri ?? stream.mediaUri?.uri;

  console.log('------------------------------');
  console.log(`Host: ${HOSTNAME} Port: ${PORT}`);
  console.log(`Stream: = ${uri}`);
  console.log('------------------------------');

  try {
    const presets = await onvif.ptz.getPresets();
    console.log('GetPreset Reply');
    let count = 1;
    for (const item of presets) {
      let name = item.name || '';
      const token = item.token;
      if (!name.length) name = `no name (${token})`;
      presetNames.push(name);
      presetTokens.push(token);
      if (count <= 9) {
        console.log(`Press key ${count} for preset "${name}"`);
        count += 1;
      }
    }
  } catch {
    console.log('Error reading presets (device may not support them)');
  }

  keypress(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  console.log('');
  console.log('Use Cursor Keys to move camera. + and - to zoom. q to quit');

  process.stdin.on('keypress', (ch, key) => {
    if ((key && key.ctrl && key.name === 'c') || (key && key.name === 'q')) {
      process.exit();
    }
    if (ignoreKeypress) return;

    if (key?.name === 'up') move(0, 1, 0, 'up');
    else if (key?.name === 'down') move(0, -1, 0, 'down');
    else if (key?.name === 'left') move(-1, 0, 0, 'left');
    else if (key?.name === 'right') move(1, 0, 0, 'right');
    else if (ch === '-') move(0, 0, -1, 'zoom out');
    else if (ch === '+' || ch === '=') move(0, 0, 1, 'zoom in');
    else if (ch >= '1' && ch <= '9') gotoPreset(ch);
  });

  async function move(xSpeed, ySpeed, zoomSpeed, msg) {
    ignoreKeypress = true;
    if (stopTimer) clearTimeout(stopTimer);

    console.log(`sending move command ${msg}`);
    try {
      await onvif.ptz.continuousMove({
        velocity: {
          panTilt: { x: xSpeed, y: ySpeed },
          zoom: { x: zoomSpeed },
        },
        timeout: 'PT5S',
      });
      console.log('move command sent');
      stopTimer = setTimeout(stop, STOP_DELAY_MS);
    } catch (err) {
      console.log(err);
    }
    ignoreKeypress = false;
  }

  async function stop() {
    console.log('sending stop command');
    try {
      await onvif.ptz.stop();
      console.log('stop command sent');
    } catch (err) {
      console.log(err);
    }
  }

  async function gotoPreset(number) {
    const index = Number(number) - 1;
    if (index >= presetNames.length) {
      console.log(`No preset ${number}`);
      return;
    }
    console.log(`sending goto preset command ${presetNames[index]}`);
    try {
      await onvif.ptz.gotoPreset({ presetToken: presetTokens[index] });
      console.log('goto preset command sent');
    } catch (err) {
      console.log(err);
    }
  }
})();
