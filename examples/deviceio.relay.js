/**
 * List DeviceIO relays / digital inputs and briefly activate the first relay.
 *
 * Run after build:
 *   node examples/deviceio.relay.js
 */

const { Onvif } = require('../build');

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';
const PULSE_MS = 500;

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
  });

  await onvif.connect({ media: false });

  if (!onvif.uri.deviceIO) {
    console.log('Device does not advertise DeviceIO service');
    await onvif.close();
    return;
  }

  const caps = await onvif.deviceIO.getServiceCapabilities();
  const relays = await onvif.deviceIO.getRelayOutputs();
  const inputs = await onvif.deviceIO.getDigitalInputs();

  console.log('DeviceIO capabilities:', caps);
  console.log(
    'Relays:',
    relays.map((r) => ({ token: r.token, mode: r.properties?.mode, idleState: r.properties?.idleState })),
  );
  console.log(
    'Digital inputs:',
    inputs.map((i) => i.token),
  );

  if (!relays.length) {
    console.log('No relays found');
    await onvif.close();
    return;
  }

  const relayOutputToken = relays[0].token;
  console.log(`Pulsing relay ${relayOutputToken} for ${PULSE_MS}ms`);
  await onvif.deviceIO.setRelayOutputState({ relayOutputToken, logicalState: 'active' });
  await new Promise((r) => setTimeout(r, PULSE_MS));
  await onvif.deviceIO.setRelayOutputState({ relayOutputToken, logicalState: 'inactive' });
  console.log('Done');

  await onvif.close();
})().catch(console.error);
