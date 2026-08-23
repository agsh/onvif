/**
 * CommonJS example using the v0.x-style promise API.
 *
 * Run after build:
 *   node examples/compatibilityPromises.cjs
 *
 * Replace hostname, port, username and password with your camera settings.
 */

const { Cam } = require('../build/compatibility/promises');

const cam = new Cam({
  hostname: '127.0.0.1',
  port: 8000,
  username: 'admin',
  password: 'admin',
});

(async () => {
  await cam.connect();
  const info = await cam.getDeviceInformation();
  console.log(info);
})().catch(console.error);
