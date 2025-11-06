// Example: Use a given XAddr to call Device.GetServices via SOAP
// Target XAddr: http://192.168.15.143/onvif/device_service
//
// Usage
//   node study/get-services-xaddr.js
//   ONVIF_USERNAME=user ONVIF_PASSWORD=pass node study/get-services-xaddr.js
//   (Optional) ONVIF_HOST=192.168.15.143 ONVIF_PORT=80 ONVIF_SECURE=0

const { Cam } = require('..');

const HOST = process.env.ONVIF_HOST || '192.168.15.143';
const PORT = parseInt(process.env.ONVIF_PORT || '80', 10);
const USERNAME = process.env.ONVIF_USERNAME || undefined;
const PASSWORD = process.env.ONVIF_PASSWORD || undefined;
const USE_SECURE = (process.env.ONVIF_SECURE || '0') === '1';

const cam = new Cam({
  hostname: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD,
  useSecure: USE_SECURE,
  path: '/onvif/device_service',
  // Optional: force hostname/port from constructor if device returns mismatched XAddr
  preserveAddress: true,
});

cam.on('connect', () => {
  const scheme = USE_SECURE ? 'https' : 'http';
  const target = `${scheme}://${cam.hostname}:${cam.port}${cam.path}`;
  console.log(`[INFO] Connected. Calling GetServices at: ${target}`);

  cam.getServices(true, (err, services, xml) => {
    if (err) {
      console.error('[ERROR] GetServices failed:', err.message || err);
      if (xml) {
        console.error('[DEBUG] SOAP response (truncated):');
        console.error(String(xml).slice(0, 2000));
      }
      process.exitCode = 1;
      return;
    }

    console.log(`[OK] Services (${Array.isArray(services) ? services.length : 0})`);
    (services || []).forEach((svc, idx) => {
      const ns = svc.namespace || '(no namespace)';
      const xaddr = svc.XAddr || '(no XAddr)';
      console.log(`  [${idx}] ns=${ns} XAddr=${xaddr}`);
    });
  });
});

cam.on('error', (e) => {
  console.error('[ERROR] Connection error:', e && e.message ? e.message : e);
});

