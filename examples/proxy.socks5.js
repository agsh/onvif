/**
 * Connect to a camera through a SOCKS5 proxy (e.g. SSH dynamic port forward).
 *
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 1/21/15.
 * Edited by Lucas Zanella <me@lucaszanella.com> on 27/08/17.
 * Edited by Andrew D.Laptev<a.d.laptev@gmail.com> on 22/08/26.
 *
 * Requires: `npm i proxy-agent`
 *
 * Run after build:
 *   node examples/proxy.socks5.js
 */

const proxyAgent = require('proxy-agent');
const ProxyAgent = proxyAgent.ProxyAgent || proxyAgent;
const { Onvif } = require('../build');

const CAMERA_HOST = '192.168.1.164';
const USERNAME = 'admin';
const PASSWORD = 'admin';
const PORT = 1018;
const PROXY_URI = 'socks5://localhost:1234';

(async () => {
  const onvif = new Onvif({
    hostname: CAMERA_HOST,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
    agent: new ProxyAgent(PROXY_URI),
    preserveAddress: true,
  });

  await onvif.connect();
  console.log('CONNECTED');

  await onvif.ptz.absoluteMove({
    position: { x: 1, y: 1, zoom: 1 },
  });

  const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
  console.log(stream.uri ?? stream.mediaUri?.uri);
})().catch(console.error);
