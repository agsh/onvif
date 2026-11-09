# ONVIF

[![Coverage Status](https://img.shields.io/coveralls/agsh/onvif.svg)](https://coveralls.io/r/agsh/onvif?branch=master)
[![NPM version](https://img.shields.io/npm/v/onvif.svg)](https://www.npmjs.com/package/onvif)

ONVIF Client protocol Node.js implementation.

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

It is also tested with some Analogue Encoders from Avigilon, Axis, Bosch and HikVision including testing the RS485 
output.

We welcome any donations or long term loans cameras from other vendors to test compatibility especially when testing 
the Media2 API, ONVIF Events and OSD.


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

## Quick example

Special teasing example how to create little funny video server (http://localhost:6147) with 1 ffmpeg and 3 node.js 
libraries:
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

const cam = new Cam({username: 'username', password: 'password', hostname: '192.168.0.116', port: 2020});
(async() => {
  await cam.connect();
  const input = (await cam.getStreamUri({protocol:'RTSP'})).uri.replace('://', `://${cam.username}:${cam.password}@`);
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

## Other examples (located in the Examples Folder on the Github)
* [example.js](https://github.com/agsh/onvif/blob/v0.x/examples/example.js) - Move camera to a pre-defined position then
  server the RTSP URL up via a HTTP Server. Click on the RTSP address in a browser to open the video (if you have the
  VLC plugin installed)
* [example2.js](https://github.com/agsh/onvif/blob/v0.x/examples/example2.js) - takes an IP address range, scans the
  range for ONVIF devices (brute force scan) and displays information about each device found including make and model
  and RTSP URLs
For Profile S Cameras and Encoders it displays the default RTSP address
For Profile G Recorders it displays the RTSP address of the first recording
* [example3.js](https://github.com/agsh/onvif/blob/v0.x/examples/example3.js) - reads the command line cursor keys and
  sends PTZ commands to the Camera
* [example4.js](https://github.com/agsh/onvif/blob/v0.x/examples/example4.js) - uses Discovery to find cameras on the
  local network
* [example5.js](https://github.com/agsh/onvif/blob/v0.x/examples/example5.js) - connect to a camera via SOCKS proxy.
  Note SSH includes a SOCKS proxy so you can use this example to connect to remote cameras via SSH
* [example6.js](https://github.com/agsh/onvif/blob/v0.x/examples/example6.js) - ONVIF Events. Example can be switched
  between using Pull Point Subscriptions and using Base Subscribe with a built in mini HTTP Server
* [example7.js](https://github.com/agsh/onvif/blob/v0.x/examples/example7.js) - example using a Promise API. It uses
  'promisify' to convert the ONVIF Library to return promises and uses Await to wait for responses
* [example8.js](https://github.com/agsh/onvif/blob/v0.x/examples/example8.js) - example setting OSD On Screen Display.
  (also uses Promises API)

# API

## You can find this page and full API class documentation here: [https://onvif.pages.dev/](https://onvif.pages.dev/) ##

Short description of library possibilities is below.

## Discovery

Since 0.2.7 version library supports WS-Discovery of NVT devices. Currently it uses only `Probe` SOAP method that just
works well.
You can find devices in your subnetwork using `probe` method of the Discovery singleton.
Discovery is an EventEmitter inheritor, so you can wait until discovery timeout, or subscribe on `device` event.
You must subscribe to the `error` event as a device on your network could reply with bad XML
Here some examples:

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

In all of that cases you've got disconnected cameras. To access each camera (and issue ONVIF commands) you normally need
the tuple `username:password`. So, as shown in the examples, you can assign these properties and call `connect` method
to get full functionality.

### Discovery.probe(options, callback)
Options

- `timeout`, number. Time the probe method will wait NVT responses in ms
- `resolve`, boolean. If this argument is false, all discovered NVTs would be presented as data object instead of Cam
  instance

### Discovery events
- `device(cam, remoteInfo, responseXML)` fires on device discover. `cam` is a Cam instance, remoteInfo is an object with
  network information
 and responseXML is a body of SOAP response
- `error(error)` fires on some UDP error or on bad SOAP response from NVT

## Promises

Since version 0.7.2 this library have a `onvif/promises` namespace. It have promisified version of Cam constructor which
returns an object with the same methods as described below or in documentation but returns promises instead of callback 
function. Short example of common usage is here:

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
  await cam.absoluteMove({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    zoom: Math.random()
  });
});
onvif.Discovery.on('error', console.error);
onvif.Discovery.probe();
```

## Cam class

```javascript
const Cam = require('onvif').Cam;
```

## new Cam(options, callback)

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

The library calls connect() automatically which executes the `getSystemDateAndTime`, `getCapabilities` and other
methods.
Note on username and password:
- Some cameras do not require username:password credentials.
- If a camera does require a username:password but you do not provide them, you will be limited to executing a few ONVIF
  methods that can operate without credentials, for example you can execute only `getSystemDateAndTime` method.

Callback (optional) executes when the cam is initialised. Single argument for this function is possible error.

#### Technical description

When the cam object is created it automatically sends a `getCapabilities` command to the ONVIF device. If the device is
a camera or encoder (NVT) it sends two commands to the ONVIF device:
`getVideoSources` and `getProfiles`. It fills corresponding properties of an object:

+ capabilities
  - device
  - events
  - imaging
  - media
  - PTZ
  - extension
+ uri (this is a links to different NVT services)
+ videoSources
  - $.token
  - framerate
  - resolution
+ profiles, array of profile object
  - name
  - videoSourceConfiguration
  - videoEncoderConfiguration
  - PTZConfiguration

After that it runs `getActiveSources` method. It iterates over all video sources and tries to find out proper
configuration for profile and videosource. First matching profile becomes a member of defaultProfiles array and video 
source configuration with ptz configuration becomes a member of activeSources array.

Configuration for the first or the only one video source becomes defaultProfile and activeSource properties. All methods
without passing options object use it. You can change it manually at any time.

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
  const node = nodes[Object.keys(nodes)[0]];
  const spaces = node.supportedPTZSpaces;
  // e.g. spaces.absolutePanTiltPositionSpace must exist before absoluteMove({x,y})
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
*Recordings.* Get all the recordings tracks available on the device. Note: Only [Onvif Profile
G](https://www.onvif.org/profiles/profile-g/) devices provide this feature.

### getReplayUri(callback)
*Recordings.* Get the replay stream or streams (if using a NVR) - usually RTSP - for the provided recording token/s.

### getRecordingOptions(callback)
*Recordings.* Get the information of a recording token. Needed in order to match a recordingToken with a sourceToken.
Used with both **GetRecordings** and **GetReplayUri** will allow to retrieve recordings from an [Onvif Profile
G](https://www.onvif.org/profiles/profile-g/) device. Note: not all devices are 100% Onvif G compliant.

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

## Related: v1.x on master
- Main line (TypeScript, separate API):
  [https://github.com/agsh/onvif/tree/master](https://github.com/agsh/onvif/tree/master)
- npm preview: `npm install onvif@rc` (stable 1.x publish expected soon)
- Demo project Broviki: [https://github.com/agsh/broviki](https://github.com/agsh/broviki)

## Links
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
