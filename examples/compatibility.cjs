/**
 * CommonJS example using the v0.x-style callback API.
 *
 * Run after build:
 *   node examples/compatibility.cjs
 *
 * Replace hostname, port, username and password with your camera settings.
 */

const { Cam } = require('../build/compatibility/cam');

const cam = new Cam(
  {
    hostname: '127.0.0.1',
    port: 8000,
    username: 'admin',
    password: 'admin',
  },
  (error) => {
    if (error) {
      console.error(error);
      return;
    }
    cam.getDeviceInformation((err, info) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(info);
    });
  },
);
