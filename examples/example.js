/**
 * Install ffmpeg(https://ffmpeg.org/download.html) in your system
 * Run `npm i onvif socket.io rtsp-ffmpeg`
 */

const { Onvif } = require('../build');

const cam = new Onvif({
  hostname: '192.168.1.13',
  username: 'admin',
  password: 'admin',
  port: 8000,
});

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
      URL.revokeObjectURL(url, {type: 'application/octet-binary'});
      ctx.drawImage(img, 100, 100);
    };
    img.src = url;
  });
</script></body></html>`),
);
server.listen(6147);

(async () => {
  try {
    await cam.connect();
    await cam.ptz.absoluteMove({ position: { x: 0, y: 0 } });
    const uri = await cam.media.getStreamUri();
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
    console.log(uri);
  } catch (error) {
    console.log(error);
  }
})();
