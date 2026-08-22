/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 1/21/15.
 * Edited by Lucas Zanella <me@lucaszanella.com> on 27/08/17.
 * Edited by Andrew D.Laptev<a.d.laptev@gmail.com> on 22/08/26.
 * Same as example.json but uses SOCKS5 (useful to access cameras securely through SSH)
 */
const ProxyAgent = require('proxy-agent');

const CAMERA_HOST = '192.168.1.164',
  USERNAME = 'admin',
  PASSWORD = 'admin',
  PORT = 1018,
  PROXY_URI = 'socks5://localhost:1234';

const http = require('http'),
  { Onvif } = require('../build');

const cam = await Onvif({
  hostname: CAMERA_HOST,
  username: USERNAME,
  password: PASSWORD,
  port: PORT,
  agent: new ProxyAgent(PROXY_URI),
});

(async () => {
  await cam.connect();
  console.log('CONNECTED');

  this.absoluteMove({
    x: 1,
    y: 1,
    zoom: 1,
  });

  this.getStreamUri({ protocol: 'RTSP' }, function (err, stream) {
    console.log(stream);

    http
      .createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body>' +
            '<embed type="application/x-vlc-plugin" target="' +
            stream.uri +
            '"></embed>' +
            '</boby></html>',
        );
      })
      .listen(3030);
  });
})();
