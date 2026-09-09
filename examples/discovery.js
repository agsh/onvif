/**
 * WS-Discovery: find ONVIF Network Video Transmitters on the LAN.
 *
 * Created by Roger Hardiman <opensource@rjh.org.uk>
 *
 * Run after build:
 *   node examples/discovery.js
 */

const { Discovery } = require('../build');

Discovery.on('device', (cam, rinfo) => {
  const xaddrs = (cam.xaddrs || []).map((u) => u.href).join(' ');
  console.log(
    `Discovery reply from ${rinfo.address}: ${cam.hostname}:${cam.port ?? 80}${cam.path || ''} urn=${cam.urn} ${xaddrs}`,
  );
});

Discovery.on('error', (err) => {
  console.error('Discovery error', err);
});

(async () => {
  const devices = await Discovery.probe();
  console.log(`Probe finished, ${devices.length} device(s)`);
})().catch(console.error);
