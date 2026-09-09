/**
 * RTSP preview in the browser (Socket.IO + FFmpeg) with random absolute PTZ moves.
 *
 * Requires: ffmpeg on PATH, and `npm i socket.io rtsp-ffmpeg`
 *
 * Run after build:
 *   node examples/rtsp.socketio.ptz.js
 *
 * Then open http://localhost:6147
 */

const http = require('http');
const { Onvif } = require('../build');
const io = require('socket.io');
const rtsp = require('rtsp-ffmpeg');

const HOSTNAME = '192.168.1.13';
const PORT = 8000;
const USERNAME = 'admin';
const PASSWORD = 'admin';

const onvif = new Onvif({
  hostname: HOSTNAME,
  port: PORT,
  username: USERNAME,
  password: PASSWORD,
});

const server = http.createServer((_req, res) =>
  res.end(`
<!DOCTYPE html><body>
<canvas width='640' height='480'></canvas>
<script src="/socket.io/socket.io.js"></script><script>
  const socket = io(), ctx = document.getElementsByTagName('canvas')[0].getContext('2d');
  socket.on('data', (data) => {
    const img = new Image;
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'application/octet-binary' }));
    img.onload = () => {
      URL.revokeObjectURL(url);
      ctx.drawImage(img, 0, 0);
    };
    img.src = url;
  });
</script></body></html>`),
);

const socketServer = io(server);
server.listen(6147);

(async () => {
  await onvif.connect();

  const mediaUri = await onvif.media.getStreamUri({ protocol: 'RTSP' });
  const uri = mediaUri.uri ?? mediaUri.mediaUri?.uri;
  const input = uri.replace('://', `://${onvif.username}:${onvif.password}@`);

  const stream = new rtsp.FFMpeg({ input, resolution: '320x240', quality: 3 });
  socketServer.on('connection', (socket) => {
    const pipeStream = socket.emit.bind(socket, 'data');
    stream.on('disconnect', () => stream.removeListener('data', pipeStream)).on('data', pipeStream);
  });

  setInterval(
    () =>
      onvif.ptz.absoluteMove({
        position: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          zoom: Math.random(),
        },
      }),
    3000,
  );

  console.log('Stream URI:', uri);
  console.log('Open http://localhost:6147');
})().catch(console.error);
