# ONVIF

[![Coverage Status](https://img.shields.io/coveralls/agsh/onvif.svg)](https://coveralls.io/r/agsh/onvif?branch=master)
[![NPM version](https://img.shields.io/npm/v/onvif.svg)](https://www.npmjs.com/package/onvif)

ONVIF client protocol implementation for Node.js.

> [!IMPORTANT]
> This repository has two incompatible major lines. Pick deliberately:
>
> - **v0.x (this page)** - stable JavaScript `Cam` API on branch
>   [`v0.x`](https://github.com/agsh/onvif/tree/v0.x). Install with `npm install onvif@0.8`.
> - **v1.x** - TypeScript rewrite with a separate API on default branch
>   [`master`](https://github.com/agsh/onvif/tree/master). Preview via `npm install onvif@rc`;
>   a stable 1.x npm release is coming and may become `latest`.

This library implements the ONVIF client protocol for Node.js. It allows you to get information about your NVT
(network video transmitter) device, its media sources, control PTZ (pan-tilt-zoom) movements and manage presets,
detect devices in your network and control its events. It will also allow you to get information about your NVR
(network video recorder) Profile G device and obtain a list of recordings.

The library runs on Node.js and is intended for server-side applications.

Documentation for version 0.8: https://onvif.pages.dev

[![ONVIF](https://github.com/user-attachments/assets/f58fb3c8-6bf6-406c-bcc7-883c1da33c5d)](http://onvif.org)

## Compatibility and testing
The library is tested on a test bed with 5 x Axis, 2 x Bosch, 1 x Canon, 2 x Hanwha, 4 x HikVision, 1 x Panasonic, 
2 x Sony and 2 x unknown vendor cameras. There is a mix of PTZ and Fixed cameras and a mix of Pre-Profile, Profile S, 
Profile G and Profile T devices.

It is also tested with some analogue encoders from Avigilon, Axis, Bosch, and HikVision, including RS485 output.

We welcome donations or long-term loans of cameras from other vendors, especially for testing Media2, ONVIF Events,
and OSD compatibility.


## Installation

### Which version should I install?

- **v0.x (this README)** - JavaScript, classic `Cam` / callback (and `onvif/promises`) API.
  Branch [`v0.x`](https://github.com/agsh/onvif/tree/v0.x). Pin with `onvif@0.8`.
- **v1.x** - TypeScript, separate API. Default branch
  [`master`](https://github.com/agsh/onvif/tree/master). Preview with `onvif@rc`; stable 1.x npm
  release is coming and may become `latest`.

Do not mix v0.x application code with a v1.x package install - the APIs are not drop-in compatible.

### NPM (v0.x / this README)

Pin the 0.8 line so a future 1.x `latest` publish does not break existing apps:

```shell
npm install onvif@0.8
```

From GitHub:

```shell
npm install agsh/onvif#v0.x
```

### NPM (v1.x / separate API)

```shell
npm install onvif@rc
```

Details: [v1 README on master](https://github.com/agsh/onvif/blob/master/README.md).

### Clone from GitHub

```shell
git clone -b v0.x https://github.com/agsh/onvif.git
```

### Tests
In the library directory run `npm test`

By default the tests use a mockup server to generate ONVIF replies.

To test with the real device, set appropriate environment variables `HOSTNAME`, `USERNAME`, `PASSWORD`, `PORT` and run
tests.

### Documentation
To build jsdoc for the library with default theme run `npm run jsdoc`. Otherwise use `jsdoc` with sources from
`./lib/*.js`

Full API reference: https://onvif.pages.dev

## Quick start

Minimal connect + first RTSP URL using the classic `Cam` API.

```js
const { Cam } = require('onvif');

const cam = new Cam({
  hostname: '192.168.0.10',
  username: 'admin',
  password: 'secret',
  port: 80
}, function(err) {
  if (err) {
    console.error('connect failed', err);
    return;
  }
  console.log('connected', this.deviceInformation);
  this.getStreamUri({ protocol: 'RTSP' }, function(err, stream) {
    if (err) {
      console.error(err);
      return;
    }
    console.log('RTSP', stream.uri);
  });
});
```

Equivalent with promises (`onvif/promises` disables autoconnect by default; shown
explicitly here so the async sequence is clear):

```js
const { Cam } = require('onvif/promises');

(async () => {
  const cam = new Cam({
    hostname: '192.168.0.10',
    username: 'admin',
    password: 'secret',
    autoconnect: false
  });
  await cam.connect();
  const stream = await cam.getStreamUri({ protocol: 'RTSP' });
  console.log(stream.uri);
})().catch(console.error);
```

## Common use cases

Everyday camera tasks after a successful `connect`.

### Get an RTSP URL

After `connect`, call `getStreamUri`. Default profile is `#activeSource.profileToken`.

```js
cam.getStreamUri({ protocol: 'RTSP' }, (err, stream) => {
  // stream.uri looks like rtsp://192.168.0.10/onvif1
  // Many players need credentials in the URL:
  const user = encodeURIComponent(cam.username);
  const pass = encodeURIComponent(cam.password);
  const withAuth = stream.uri.replace('://', `://${user}:${pass}@`);
  console.log(withAuth);
});
```

Be careful when embedding credentials in RTSP URLs. Avoid logging or exposing
authenticated URLs, as they contain camera credentials. If the username or password
includes reserved characters (`@`, `:`, `/`, `#`, and others), URL-encode them (as in
the example above) or the player may parse the URL incorrectly.

Options worth knowing: `protocol` (`RTSP` / `UDP` / `TCP` / `HTTP`), `stream`
(`RTP-Unicast` default, or `RTP-Multicast`), `profileToken` for a non-default profile.

### Get a JPEG snapshot URI

```js
cam.getSnapshotUri({}, (err, result) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(result.uri); // HTTP GET, often with camera credentials
});
```

Uses Media2 when available, otherwise Media1. Not every device implements snapshots.

### Check PTZ capabilities before moving

Not every PTZ device supports Absolute or Relative moves. PanTilt and Zoom are
advertised separately - a camera may allow Absolute PanTilt but not Absolute Zoom.

Important for this library: `absoluteMove` / `continuousMove` default omitted `x` /
`y` / `zoom` to `0`, so "leave zoom out" is not enough. When Zoom (or PanTilt) is
unsupported, set `onlySendPanTilt` or `onlySendZoom` so that axis is not written
into the SOAP body.

```js
cam.getNodes((err, nodes) => {
  if (err) {
    console.error(err);
    return;
  }
  const tokens = Object.keys(nodes || {});
  if (!tokens.length) {
    console.error('no PTZ nodes');
    return;
  }

  const spaces = nodes[tokens[0]].supportedPTZSpaces || {};
  const canAbsolutePanTilt = Boolean(spaces.absolutePanTiltPositionSpace);
  const canAbsoluteZoom = Boolean(spaces.absoluteZoomPositionSpace);
  const canContinuousPanTilt = Boolean(spaces.continuousPanTiltVelocitySpace);
  const canContinuousZoom = Boolean(spaces.continuousZoomVelocitySpace);

  if (canContinuousPanTilt) {
    cam.continuousMove({
      x: 0.5,
      y: 0,
      ...(canContinuousZoom ? { zoom: 0 } : { onlySendPanTilt: true })
    });
    setTimeout(() => cam.stop({}), 500);
  } else if (canContinuousZoom) {
    cam.continuousMove({ zoom: 0.5, onlySendZoom: true });
    setTimeout(() => cam.stop({}), 500);
  } else if (canAbsolutePanTilt) {
    cam.absoluteMove({
      x: 0,
      y: 0,
      ...(canAbsoluteZoom ? { zoom: 0 } : { onlySendPanTilt: true })
    });
  } else if (canAbsoluteZoom) {
    cam.absoluteMove({ zoom: 0, onlySendZoom: true });
  }
  // Otherwise prefer presets / home, or skip PTZ moves.
});
```

See also `getNodes` / `absoluteMove` / `relativeMove` in the API section.

### Use another media profile

Multi-stream cameras expose several profiles (main / sub / low-res). After connect,
`profiles` is the full media profile list; `activeSources` is one entry per video
source (with a default profile for that source). Do not assume `profiles[i]` lines
up with `activeSources[i]` - several profiles often share one source.

```js
// List what connect() discovered
cam.profiles.forEach((p) => {
  console.log(p.$.token, p.name, p.videoEncoderConfiguration && {
    encoding: p.videoEncoderConfiguration.encoding,
    width: p.videoEncoderConfiguration.resolution.width,
    height: p.videoEncoderConfiguration.resolution.height
  });
});

// Pick a profile by name/token (example: second profile, or find by name)
const profile = cam.profiles.find((p) => p.name === 'Profile_1') || cam.profiles[1];
const token = profile.$.token;

// Option A: pass profileToken per call (safest)
cam.getStreamUri({ protocol: 'RTSP', profileToken: token }, console.log);

// Option B: switch the default used when methods omit profileToken.
// Match activeSources by the profile's video source, not by array index.
const sourceToken = profile.videoSourceConfiguration
  && profile.videoSourceConfiguration.sourceToken;
const base = (cam.activeSources || []).find((s) => s.sourceToken === sourceToken)
  || cam.activeSource;
cam.activeSource = Object.assign({}, base, { profileToken: token });
```

## Advanced examples

Discovery, events, promises, Profile G, and a larger integration demo.

### Discovery

Since version 0.2.7, the library has supported WS-Discovery of NVT devices. It currently uses the SOAP `Probe`
operation to discover devices on the local network.

Use the `probe` method on the `Discovery` singleton. `Discovery` extends `EventEmitter`, so you can wait for the
probe timeout or listen for each `device` as it appears. Always subscribe to `error` as well - devices on the
network may reply with invalid XML.

Examples:

```js
var onvif = require('onvif');
onvif.Discovery.on('device', function(cam){
// function will be called as soon as NVT responds
	cam.username = <USERNAME>;
	cam.password = <PASSWORD>;
	cam.connect(console.log);
});
// Must have an error handler to catch bad replies from the network
onvif.Discovery.on('error', function (err,xml) {
  // function called as soon as NVT responds, but this library could not parse the response
  console.log('Discovery error ' + err);
});
onvif.Discovery.probe();
```

```js
var onvif = require('onvif');
// Must have an error handler to catch bad replies from the network
onvif.Discovery.on('error', function (err,xml) {
  console.log('Discovery error ' + err);
});
onvif.Discovery.probe(function(err, cams) {
// function will be called only after timeout (5 sec by default)
	if (err) { 
    // There is a device on the network returning bad discovery data
    // Probe results will be incomplete
    throw err;
  }
	cams.forEach(function(cam) {
		cam.username = <USERNAME>;
		cam.password = <PASSWORD>;
		cam.connect(console.log);
	});
});
```

In all these cases you receive disconnected camera objects. To issue ONVIF commands you normally need
`username` and `password`. Assign those properties and call `connect`, as shown above.

#### Discovery.probe(options, callback)
Options:

- `timeout` (number) - how long to wait for NVT responses, in milliseconds
- `resolve` (boolean) - if `false`, discovered NVTs are plain data objects instead of `Cam` instances

#### Discovery events
- `device(cam, remoteInfo, responseXML)` - emitted when a device is found. `cam` is a `Cam` instance,
  `remoteInfo` holds network details, and `responseXML` is the SOAP response body
- `error(error)` - emitted on UDP errors or when an NVT returns a bad SOAP response

### Events


Simplest path is a PullPoint subscription: register an `event` listener after connect.
The library creates and renews the pull point for you.

```js
cam.on('event', (event) => {
  console.log(event.topic, event.message);
});
cam.on('eventsError', console.error);

// Stop pulling when finished:
// cam.removeAllListeners('event');
```

Base Subscribe (camera pushes to your HTTP URL) is more involved; see
[example6.js](https://github.com/agsh/onvif/blob/v0.x/examples/example6.js).

### Promises

Since version 0.7.2 the library provides `onvif/promises`: a Promise-based `Cam` with the same methods as the
callback API (and the full docs), but returning promises instead of taking a callback. Short example:

```js
const onvif = require('onvif/promises');
onvif.Discovery.on('device', async (cam) => {
  // Set credentials to connect
  cam.username = 'username';
  cam.password = 'password';
  await cam.connect();
  cam.on('event', (event)=> console.log(JSON.stringify(event.message, null, '\t')));
  cam.on('eventsError', console.error);
  console.log(cam.username, cam.password);
  console.log((await cam.getStreamUri({protocol:'RTSP'})).uri);
  const date = await cam.getSystemDateAndTime();
  console.log(date);
  await cam.continuousMove({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    zoom: Math.random()
  });
});
onvif.Discovery.on('error', console.error);
onvif.Discovery.probe();
```

### Profile G / NVR recordings


Profile G devices can list recordings and return a replay RTSP URL:

```js
cam.getRecordings((err, recordings) => {
  if (err || !recordings.length) {
    console.error(err || 'no recordings');
    return;
  }
  const recordingToken = recordings[0].recordingToken;
  cam.getReplayUri({ protocol: 'RTSP', recordingToken }, (err, replay) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(replay.uri);
  });
});
```

See `getReplayUri(options, callback)` in the API reference for `recordingToken`,
`protocol`, and the callback result shape. `getRecordingOptions` helps match
recording tokens to sources. Full flow:
[example9.js](https://github.com/agsh/onvif/blob/v0.x/examples/example9.js).

### Demo: ffmpeg + socket.io

Example: a small video server (http://localhost:6147) using ffmpeg and three Node.js libraries:
<video src="https://github.com/agsh/onvif/assets/576263/e816fed6-067a-4f77-b3f5-ccd9d5ff1310" width="300" />

```shell
sudo apt install ffmpeg
npm install onvif socket.io rtsp-ffmpeg
```

```js
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
</script></body></html>`));
const { Cam } = require('onvif/promises'), io = require('socket.io')(server), rtsp = require('rtsp-ffmpeg');
server.listen(6147);

const cam = new Cam({
  username: 'username',
  password: 'password',
  hostname: '192.168.0.116',
  port: 2020,
  autoconnect: false
});
(async() => {
  await cam.connect();
  const input = (await cam.getStreamUri({protocol:'RTSP'})).uri.replace(
    '://',
    `://${encodeURIComponent(cam.username)}:${encodeURIComponent(cam.password)}@`
  );
  const stream = new rtsp.FFMpeg({input, resolution: '320x240', quality: 3});
  io.on('connection', (socket) => {
    const pipeStream = socket.emit.bind(socket, 'data');
    stream.on('disconnect', () => stream.removeListener('data', pipeStream)).on('data', pipeStream);
  });
  setInterval(() => cam.absoluteMove({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    zoom: Math.random()
  }), 3000);
})().catch(console.error);
```

### More examples in the repository
* [example.js](https://github.com/agsh/onvif/blob/v0.x/examples/example.js) - Move to a preset, then serve the RTSP
  URL over a small HTTP page. Open the address in a browser (VLC plugin) to view the stream.
* [example2.js](https://github.com/agsh/onvif/blob/v0.x/examples/example2.js) - Scan an IP range for ONVIF devices
  and print make/model plus RTSP URLs. Profile S cameras show the default live URL; Profile G recorders show the
  first recording replay URL.
* [example3.js](https://github.com/agsh/onvif/blob/v0.x/examples/example3.js) - Map terminal cursor keys to PTZ
  commands.
* [example4.js](https://github.com/agsh/onvif/blob/v0.x/examples/example4.js) - Discover cameras on the local network.
* [example5.js](https://github.com/agsh/onvif/blob/v0.x/examples/example5.js) - Connect through a SOCKS proxy (for
  example via SSH port forwarding).
* [example6.js](https://github.com/agsh/onvif/blob/v0.x/examples/example6.js) - ONVIF Events with PullPoint or Base
  Subscribe (includes a small HTTP receiver).
* [example7.js](https://github.com/agsh/onvif/blob/v0.x/examples/example7.js) - Async/await against the camera API
  (newer apps should use `onvif/promises`).
* [example8.js](https://github.com/agsh/onvif/blob/v0.x/examples/example8.js) - Set OSD (On-Screen Display) using
  `onvif/promises`.

### Troubleshooting connection issues


- Confirm `hostname`, `port`, and `path` (default `/onvif/device_service`). Some vendors
  use another path from Discovery/`XAddr`.
- Auth: try `useWSSecurity: false` to force Digest if WS-Security fails.
- NAT / port mapping: set `preserveAddress: true` so service URLs keep your constructor
  host/port.
- Time skew breaks WS-Security; `getSystemDateAndTime` runs first to compute `timeShift`.
- Non-media devices (door controllers, etc.): `connect` may succeed with empty
  profiles and emit `warning` - listen with `cam.on('warning', console.warn)`.
- Discovery: always handle `Discovery.on('error', ...)` - bad XML from the network is
  common.
- Enable packet/XML logging in your app when a single SOAP call fails; compare with
  the device's ONVIF test tool.

## API reference

Short description of the classic `Cam` API. Full docs: https://onvif.pages.dev

### Cam class

```javascript
const Cam = require('onvif').Cam;
```

### new Cam(options, callback)

Options are:
- `hostname`
- `username`, `password` (optional, to deal with majority of functions)
- `port` (optional)
- `path` (optional) - ONVIF service path, default `/onvif/device_service`
- `timeout` (optional) - request timeout in ms
- `useSecure` (optional) - use HTTPS instead of HTTP
- `useWSSecurity` (optional, default `true`) - WS-Security SOAP headers; set `false` to force Digest auth (0.8+)
- `preserveAddress` (optional) - keep constructor hostname/port for service URLs (NAT)
- `autoconnect` (optional, default `true`) - set `false` to skip automatic `connect()`

The library calls `connect()` automatically, which runs `getSystemDateAndTime`, `getCapabilities`, and related
methods.
Note on username and password:
- Some cameras do not require credentials.
- If the camera requires credentials and you omit them, only a few unauthenticated methods work (for example
  `getSystemDateAndTime`).

The optional callback runs when the cam is initialized. Its single argument is an error, if any.

#### Technical description

On creation the cam sends `getCapabilities`. For a camera or encoder (NVT) it also calls `getVideoSources` and
`getProfiles`, then fills:

+ capabilities
  - device
  - events
  - imaging
  - media
  - PTZ
  - extension
+ uri (service endpoints for the different NVT services)
+ videoSources
  - $.token
  - framerate
  - resolution
+ profiles (array of profile objects)
  - name
  - videoSourceConfiguration
  - videoEncoderConfiguration
  - PTZConfiguration

Then `getActiveSources` walks video sources and picks a matching profile for each. The first match becomes an entry
in `defaultProfiles`; the matching video source (with PTZ when present) goes into `activeSources`.

The first (or only) video source becomes `defaultProfile` and `activeSource`. Methods that omit an options object
use that active source. You can change it manually at any time.

+ defaultProfile (link to the first profile in profiles)
+ activeSource (based on the default profile)
  - sourceToken
  - profileToken
  - encoding
  - width
  - height
  - fps
  - bitrate
  - ptz

### connect(callback)
Connect to the camera and fill device information properties with `getSystemDateAndTime`, 
`getCapabilities`/`getServices`, `getVideoSources`, `getProfiles` methods.

Media discovery runs only when the device advertises Media (or Media2). If those calls fail
(e.g. Axis A1601 door controller returns "Optional action not implemented"), `connect` still
succeeds with empty profiles/video sources and emits a `warning`.
`getVideoSources` falls back to Media2 `GetVideoSourceConfigurations` when Media1 fails.

See more detailed information at http://www.onvif.org/ver10/media/wsdl/media.wsdl
After cam initialisation we can run several ONVIF commands.
There are several common methods that work without credentials. Here are they: `getSystemDateAndTime`.

### getSystemDateAndTime(callback)
Returns a Date object with current camera datetime in the callback.
The ONVIF Standard says this would work without credentials (passed `username` and `password` arguments) so that the
timeShift difference between the local clock and the NVT's onboard clock can be calculated for SOAP Authentication.
However some devices claiming ONVIF support require a password and the library will re-try the connection if a username
and password are available.

### getDeviceInformation(callback)
*Device.* Returns a device information, such as manufacturer, model and firmware version in the callback

### getServices(callback)
*Device.* Returns in callback and assigns to `#services` property an array consists of objects with properties:
`namespace`, `XAddr`, `version`

### getServiceCapabilities(callback)
*Device.* Returns in callback and assigns to `#serviceCapabilities` property the capabilities of the device service (not
media):
network, security and system. If your device supports some auxiliary capabilities they will be there too.

### getStreamUri(options, callback)
*Media.* Returns a URI that can be used to initiate a live media stream using RTSP as the control protocol
The options are:

- `stream` (optional) - defines if a multicast or unicast stream is requested. Possible values are: 'RTP-Unicast'
  (default), 'RTP-Multicast'
- `protocol` (optional) - defines the network protocol for streaming. Possible values are: 'UDP', 'TCP', 'RTSP'
  (default), 'HTTP'
- `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the
  stream. Default is `#activeSource.profileToken`

### getSnapshotUri(options, callback)
*Media.* Obtain a JPEG snapshot URI from the device. The callback receives `(err, result, xml)` where `result` includes
a `uri` string you can HTTP-GET (often with the camera credentials).

The options are:

- `profileToken` (optional) - media profile to use. Default is `#activeSource.profileToken`

Uses Media2 `GetSnapshotUri` when the device advertised Media2 support; otherwise Media1. Not every NVT implements
snapshots; fixed encoders and some Profile G recorders may return a fault.

### getPresets(options, callback)
*PTZ.* Returns the list of presets for the PTZ node in the selected profile.

Since **0.8.4** the callback receives `(err, presetsByName, presetsByToken, xml)`:
- `presetsByName` - map of preset name -> token (also stored on `#presets`; same shape as pre-0.8.1)
- `presetsByToken` - map of token -> full preset object (`name` and optional ONVIF fields). Prefer this when names may
  duplicate; tokens are unique
- `xml` - raw SOAP response body

```js
cam.getPresets((err, presetsByName, presetsByToken) => {
  // presetsByName['Home'] === 'token-1'
  // presetsByToken['token-1'].name === 'Home'
});
```

Promise API (`onvif/promises`) still resolves to the name->token map only (first result argument).

The options are:

* `profileToken` (optional) - defines media profile to use. Default is `#activeSource.profileToken`

### gotoPreset(options, callback)
*PTZ.* Operation to go to a saved preset position for the PTZ node in the selected profile.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the
  stream. Default is `#activeSource.profileToken`
* `preset` - the name of preset. List of presets you can get by `#getPresets` method or in `#presets` property.

### setPreset(options, callback)
*PTZ.* Operation to set the current position as a preset for the PTZ node in the selected profile. If `presetToken` is
passed as an option, then the preset for which that token is attached will be replaced. After success, you should
re-fetch the presets with `#getPresets` method.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the
  stream. Default is `#activeSource.profileToken`
* `presetName` - the name to give to the preset. (optional) is this is a preset update.

### removePreset(options, callback)
*PTZ.* Operation to remove a preset specified by the preset token. After success, you should re-fetch the presets with
`#getPresets` method.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the
  stream. Default is `#activeSource.profileToken`
* `presetToken` - the preset token to use for preset removal (this will be the `value` of a preset object found in
  `#presets` after calling the `#getPresets` method.

### gotoHomePosition(options, callback)
*PTZ.* Operation to go to the saved `home` position for the PTZ node in the selected profile. If no `home` position has
been saved, the ONVIF camera will do nothing.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the
  stream. Default is `#activeSource.profileToken`
* `speed` An object with properties
  - `x` Pan speed, float within 0 to 1
  - `y` Tilt speed, float within 0 to 1
  - `zoom` Zoom speed, float within 0 to 1

  If the speed option is omitted, the default speed set by the PTZConfiguration will be used.

### setHomePosition(options, callback)
*PTZ.* Operation to set the current position as the `home` position for the PTZ node in the selected profile.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the
  stream. Default is `#activeSource.profileToken`

### getNodes(callback)
*PTZ.* Returns PTZ node properties and stores them in `#nodes` (keyed by node token).

Use this before Absolute/Relative moves. Each node includes practical capability fields such as:
- `maximumNumberOfPresets`, `homeSupported`
- `supportedPTZSpaces` - which move modes and coordinate ranges the device actually supports

Important: **not every PTZ camera supports AbsoluteMove or RelativeMove**. Many devices only implement ContinuousMove
(joystick-style velocity). Before calling `absoluteMove` / `relativeMove`, inspect `supportedPTZSpaces` on the node, for
example:
- Absolute: `absolutePanTiltPositionSpace`, `absoluteZoomPositionSpace`
- Relative: `relativePanTiltTranslationSpace`, `relativeZoomTranslationSpace`
- Continuous: `continuousPanTiltVelocitySpace`, `continuousZoomVelocitySpace`

Ranges (`XRange` / `YRange` min/max) are defined per space; they are often `-1..1` or `0..1`, but vendors differ. Prefer
these advertised ranges over hard-coded assumptions.

```js
cam.getNodes((err, nodes) => {
  if (err || !nodes || !Object.keys(nodes).length) {
    return;
  }
  const spaces = nodes[Object.keys(nodes)[0]].supportedPTZSpaces || {};
  // Check PanTilt and Zoom spaces separately before absoluteMove / relativeMove.
  // e.g. absolutePanTiltPositionSpace vs absoluteZoomPositionSpace
});
```

### relativeMove(options, callback)
*PTZ.* Relative pan-tilt-zoom: options are a **delta** (translation) from the current position.

**Warning:** support is optional. If `supportedPTZSpaces` has no relative PanTilt/Zoom spaces, the camera will typically
return an ONVIF fault. Prefer `continuousMove` when relative spaces are missing. Call `getNodes` first (see above).

Coordinate meaning comes from the active Relative space (often ONVIF `TranslationGenericSpace`, roughly `-1..1`). Exact
min/max are in `supportedPTZSpaces`.

The options are:

- `profileToken` (optional) - default `#activeSource.profileToken`
- `x` Pan translation, optional (defaults to `0` if omitted)
- `y` Tilt translation, optional (defaults to `0` if omitted)
- `zoom` Zoom translation, optional (defaults to `0` if omitted)
- `speed` optional object with `x` / `y` / `zoom`; if omitted, the PTZConfiguration default speed is used

The optional callback reports request completion or error only; it does not return the resulting PTZ position.

### absoluteMove(options, callback)
*PTZ.* Absolute pan-tilt-zoom: options are a **target position** in the Absolute space.

**Warning:** support is optional. Many PTZ cameras (especially cheaper / analog-PTZ via encoder) only support
ContinuousMove and presets, not AbsoluteMove. If `supportedPTZSpaces` has no absolute PanTilt/Zoom spaces, do not call
this method. Use `getNodes` to check first.

Coordinate meaning comes from the Absolute space (often `PositionGenericSpace`). README examples use values in roughly
`-1..1` / `0..1`, but real limits are whatever the node advertises. Some cameras also reject sending pan/tilt and zoom
in one request; use `onlySendPanTilt` or `onlySendZoom` when needed.

The options are:

- `profileToken` (optional) - default `#activeSource.profileToken`
- `x` Pan position, optional (defaults to `0` if omitted)
- `y` Tilt position, optional (defaults to `0` if omitted)
- `zoom` Zoom position, optional (defaults to `0` if omitted)
- `speed` optional object with `x` / `y` / `zoom`
- `onlySendPanTilt` / `onlySendZoom` (optional) - send only that part of the vector in the SOAP body

The optional callback reports request completion or error only; it does not return the resulting PTZ position.

### continuousMove(options, callback)
*PTZ.* Continuous (velocity) Pan/Tilt and Zoom. This is the most widely supported PTZ move mode; if Absolute/Relative
are missing, use this plus `stop`.

The options are:

- `profileToken` (optional) - default `#activeSource.profileToken`
- `x` Pan velocity, optional (often `-1..1`)
- `y` Tilt velocity, optional (often `-1..1`)
- `zoom` Zoom velocity, optional (often `-1..1`)
- `timeout` Timeout in milliseconds. If omitted, movement continues until `stop`
- `onlySendPanTilt` / `onlySendZoom` (optional) - workaround for cameras that reject combined vectors

### stop(options, callback)
*PTZ.* Stop ongoing pan, tilt and zoom movements of absolute, relative and continuous type

Options and callback are optional. The options properties are:

- `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the
  stream. Default is `#activeSource.profileToken`
- `panTilt` (optional) - set true when we want to stop ongoing pan and tilt movements. If `panTilt` arguments are not
  present, this command stops these movements.
- `zoom` (optional) - set true when we want to stop ongoing zoom movement. If `zoom` arguments are not present, this
  command stops ongoing zoom movement.

### getStatus(options, callback)
*PTZ.* Returns an object with the current PTZ values.
```js
{
	position: {
		x: 'pan position', 
        y: 'tilt position',
		zoom: 'zoom'
	}
	, moveStatus: {} // camera moving
	, utcTime: 'current camera datetime'
}
```

### getConfigurations(callback)
*PTZ.* Get all the existing PTZConfigurations from the device. Configurations saved into `#configurations` property

### getConfigurationOptions(configurationToken, callback)
*PTZ.* Get supported coordinate systems including their range limitations for selected configuration. Extends
corresponding
configuration object

### getRecordings(callback)
*Recordings.* Get all recording tracks available on the device. Callback receives
`(err, recordings, xml)`; results are also stored on `#recordingItems`. Note: only
[ONVIF Profile G](https://www.onvif.org/profiles/profile-g/) devices provide this feature.

### getReplayUri(options, callback)
*Recordings.* Get a replay stream URI for a recording on an NVR / Profile G device
(typically RTSP).

Signature: `getReplayUri(options, callback)` - not callback-only.

The options are:

- `recordingToken` (required) - recording token from `getRecordings` /
  `#recordingItems` (the ONVIF `RecordingToken`)
- `protocol` (optional) - transport protocol for `StreamSetup` / `Transport`,
  default `RTSP` (other values such as `UDP`, `TCP`, or `HTTP` only if the device
  supports them)
- `stream` (optional) - stream type, default `RTP-Unicast` (or `RTP-Multicast`)

The callback is `(err, result, xml)`:

- `err` - request / SOAP fault, or `null`
- `result` - object with a `uri` string (replay URL), same general shape as
  `getStreamUri` / `getSnapshotUri`
- `xml` - raw SOAP response body

```js
cam.getReplayUri(
  { protocol: 'RTSP', recordingToken: recordings[0].recordingToken },
  (err, replay) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(replay.uri);
  }
);
```

### getRecordingOptions(options, callback)
*Recordings.* Get options/metadata for a recording token - useful to match a
`recordingToken` with a source. Pass `{ RecordingToken: '<token>' }` (capital `R`, as in
the ONVIF request). Used together with `getRecordings` and `getReplayUri`. Note: not all
devices are fully Profile G compliant.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full list. Recent **0.8.x** highlights:

- **0.8.4** BREAKING: `getPresets` callback is `(err, presetsByName, presetsByToken, xml)` - name->token map unchanged;
  use `presetsByToken` for duplicates / full preset objects. SOAP setters use `isSet` so `0` / `false` are sent; omit
  only `undefined` / `null` / `''`.
- **0.8.3** Skip Media/VideoSource probing when unsupported; fall back to Media2 when Media fails.
- **0.8.2** Digest auth RFC fixes; Discovery UDP buffer / undefined props; replace `splitargs`; promises probe return;
  CI on Node 22/24.
- **0.8.1** Skip invalid presets; richer preset objects (`@momoAmch`). Brief period used token-keyed presets; **0.8.4**
  restores name->token as the primary callback result with `presetsByToken` as an extra argument.
- **0.8.0** Media2 video encoders; PTZ preset token fix (`@Craytor`); Digest auth via `useWSSecurity: false`; Node >=
  14.
- **0.7.2** Promises API via `onvif/promises`.
- Older history: Profile G, Imaging, Discovery, HTTPS / Profile T / Media2 foundations - see CHANGELOG.md.

## Links and further resources

### v1.x on master

- Main line (TypeScript, separate API):
  [https://github.com/agsh/onvif/tree/master](https://github.com/agsh/onvif/tree/master)
- npm preview: `npm install onvif@rc` (stable 1.x publish expected soon)
- Demo project Broviki: [https://github.com/agsh/broviki](https://github.com/agsh/broviki)

### ONVIF specifications

WSDL schemes and docs:
- [Operations index](http://www.onvif.org/onvif/ver20/util/operationIndex.html)
- http://www.onvif.org/onvif/ver10/tc/onvif_core_ver10.pdf
- http://www.onvif.org/ver10/device/wsdl/devicemgmt.wsdl
- http://www.onvif.org/ver10/media/wsdl/media.wsdl
- http://www.onvif.org/ver20/ptz/wsdl/ptz.wsdl
- http://www.onvif.org/onvif/ver10/recording.wsdl
- http://www.onvif.org/onvif/ver10/replay.wsdl
- [ONVIF Application Programmer's
  Guide](http://www.onvif.org/Portals/0/documents/WhitePapers/ONVIF_WG-APG-Application_Programmer's_Guide.pdf)
