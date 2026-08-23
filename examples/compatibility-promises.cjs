/**
 * CommonJS example using the v0.x-style promise API (`require('onvif/promises')`).
 *
 * Install dependencies:
 *   npm i onvif socket.io rtsp-ffmpeg
 *
 * Run after build:
 *   node examples/compatibility-promises.cjs
 *
 * Replace hostname, port, username and password with your camera settings.
 */

const server = require('http').createServer((req, res) =>
  res.end(`
<!DOCTYPE html><body>
<canvas width='640' height='480' />
<script src="/socket.io/socket.io.js"></script><script>
  const socket = io(), ctx = document.getElementsByTagName('canvas')[0].getContext('2d');
  socket.on('data', (data) => {
    const img = new Image;
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], {type: 'application/octet-binary'}));
    img.onload = () => {
      URL.revokeObjectURL(url);
      ctx.drawImage(img, 0, 0);
    };
    img.src = url;
  });
</script></body></html>`),
);

const { Cam } = require('../build/compatibility/promises');
const io = require('socket.io')(server);
const rtsp = require('rtsp-ffmpeg');

server.listen(6147);

const cam = new Cam({
  username: 'admin',
  password: 'admin',
  hostname: '127.0.0.1',
  port: 8000,
});

(async () => {
  await cam.connect();

  const { uri } = await cam.getStreamUri({ protocol: 'RTSP' });
  const input = uri.replace('://', `://${cam.username}:${cam.password}@`);
  const stream = new rtsp.FFMpeg({ input, resolution: '320x240', quality: 3 });

  io.on('connection', (socket) => {
    const pipeStream = socket.emit.bind(socket, 'data');
    stream.on('disconnect', () => stream.removeListener('data', pipeStream)).on('data', pipeStream);
  });

  setInterval(
    () =>
      cam.absoluteMove({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        zoom: Math.random(),
      }),
    3000,
  );

  console.log('Streaming from', input);
  console.log('Open http://127.0.0.1:6147/ in a browser');
})().catch(console.error);
