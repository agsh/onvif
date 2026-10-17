/**
 * Connect and print device information, services, hostname, and scopes.
 *
 * Run after build:
 *   node examples/device.info.js
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

  const info = await onvif.device.getDeviceInformation();
  const hostname = await onvif.device.getHostname();
  const scopes = await onvif.device.getScopes();
  await onvif.device.getServices({ includeCapability: true });

  console.log('Device information:', info);
  console.log('Hostname:', hostname.name, '(fromDHCP:', hostname.fromDHCP + ')');
  console.log(
    'Scopes:',
    scopes.map((s) => s.scopeItem),
  );
  console.log(
    'Services:',
    onvif.services.map((s) => ({ namespace: s.namespace, xaddr: s.XAddr })),
  );

  await onvif.close();
})().catch(console.error);
