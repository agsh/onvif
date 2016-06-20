# ONVIF

[![Build Status](https://travis-ci.org/agsh/onvif.png)](https://travis-ci.org/agsh/onvif)
[![Coverage Status](https://img.shields.io/coveralls/agsh/onvif.svg)](https://coveralls.io/r/agsh/onvif?branch=master)
[![NPM version](https://img.shields.io/npm/v/onvif.svg)](https://www.npmjs.com/package/onvif)

ONVIF Client protocol Profile S Node.js implementation.

This is a wrapper to ONVIF protocol which allows you to get information about your NVT (network video transmitter)
device, its media sources, control PTZ (pan-tilt-zoom) movements and manage presets, detect devices in your network and control its events.

[![ONVIF](http://www.onvif.org/Portals/_default/Skins/onvif/images/logo-new.jpg)](http://onvif.org)

## Installation

### NPM

`npm install onvif` - install latest stable version

`npm install agsh/onvif` - install latest version from GitHub

`npm install agsh/onvif#dev` - install latest development version

### Clone the latest version from github
`git clone https://github.com/agsh/onvif.git`

### Tests
In the library directory run `npm test`

By default the tests use a mockup server to generate ONVIF replies.

To test with the real device, set appropriate environment variables `HOSTNAME`, `USERNAME`, `PASSWORD`, `PORT` and run 
tests.

### Documentation
To build jsdoc for the library with default theme run `npm run jsdoc`. Otherwise use `jsdoc` with sources from
`./lib/*.js`

## Quick example
This example asks your camera to look up and starts a web server at port 3030 that distributes a web page with vlc-plugin
container which translates video from the camera.
```javascript
var
  http = require('http'),
  Cam = require('onvif').Cam;

new Cam({
  hostname: <CAMERA_HOST>,
  username: <USERNAME>,
  password: <PASSWORD>
}, function(err) {
  this.absoluteMove({x: 1, y: 1, zoom: 1});
  this.getStreamUri({protocol:'RTSP'}, function(err, stream) {
    http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('<html><body>' +
        '<embed type="application/x-vlc-plugin" target="' + stream.uri + '"></embed>' +
        '</body></html>');
    }).listen(3030);
  });
});
```

## Other examples
* example2.js takes an IP address range, scans the range for ONVIF devices (brute force scan) and displays information about each device found including make and model and default RTSP address

* example3.js reads the command line cursor keys and sends PTZ commands to the camera


## Troubleshooting
Different cameras have different ONVIF implementation. I've tested this module only with a couple of devices. So if you got different problems with this library, please let me know via e-mail. Else please just send the model of your
camera to me.

# API

This page and API class documentation you can found here: [http://agsh.github.io/onvif/](http://agsh.github.io/onvif/)

Short description of library possibilities is below.

## Discovery
Since 0.2.7 version library supports WS-Discovery of NVT devices. Currently it uses only `Probe` SOAP method that just works well.
You can find devices in your subnetwork using `probe` method of the Discovery singleton.
Discovery is an EventEmitter inheritor, so you can wait until discovery timeout, or subscribe on `device` event.
Here some examples:

```js
var onvif = require('onvif');
onvif.Discovery.on('device', function(cam){
// function will be called as soon as NVT responses
	cam.username = <USERNAME>;
	cam.password = <PASSWORD>;
	cam.connect(console.log);
})
onvif.Discovery.probe();
```

```js
var onvif = require('onvif');
onvif.Discovery.probe(function(err, cams) {
// function will be called only after timeout (5 sec by default)
	if (err) { throw err; }
	cams.forEach(function(cam) {
		cam.username = <USERNAME>;
		cam.password = <PASSWORD>;
		cam.connect(console.log);
	});
});
```

In all of that cases you've got disconnected cameras because to manage them you need tuple `username:password`.
So, as shown in the examples, you can assign these properties and call `connect` method to get full functionality.

### Discovery.probe(options, callback)
Options

- `timeout`, number. Time the probe method will wait NVT responses in ms
- `resolve`, boolean. If this argument is false, all discovered NVTs would be presented as data object instead of Cam instance

### Discovery events
- `device(cam, remoteInfo, responseXML)` fires on device discover. `cam` is a Cam instance, remoteInfo is an object with network information
 and responseXML is a body of SOAP response
- `error(error)` fires on some UDP error or on bad SOAP response from NVT

## Cam class

```javascript
var Cam = require('onvif').Cam;
```

## new Cam(options, callback)

Options are:
- hostname
- username, password (optional, to deal with majority of functions)
- port (optional)

If the username and password are present, camera tries to connect automatically. Otherwise use `connect` method.
Once again, without credentials you can execute only `getSystemDateAndTime` method.

Callback (optional) executes when the cam is initialised. Single argument for this function is possible error.

#### Technical description

When the cam object creates it automatically sends three command to the ONVIF device:
`getCapabilities`, `getVideoSources` and `getProfiles`. It fills correspondent properties of an object:

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
  
After that it runs `getActiveSources` method. It iterates over all video sources and tries to find out proper configuration
for profile and videosource. First matching profile becomes a member of defaultProfiles array and video source configuration
with ptz configuration becomes a member of activeSources array.
 
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
Connect to the camera and fill device information properties with `getCapabilities`, `getVideoSources`, `getProfiles` methods

See more detailed information at http://www.onvif.org/ver10/media/wsdl/media.wsdl
After cam initialisation we can run several ONVIF commands.
There are several common methods that work without credentials. Here are they: `getSystemDateAndTime`.

### getSystemDateAndTime(callback)
Returns a Date object with current camera datetime in the callback.
Works without credentials (passed `username` and `password` arguments).

### getDeviceInformation(callback)
*Device.* Returns a device information, such as manufacturer, model and firmware version in the callback
Works without credentials (passed `username` and `password` arguments).

### getServices(callback)
*Device.* Returns in callback and assigns to `#services` property an array consists of objects with properties: `namespace`, `XAddr`, `version`

### getServiceCapabilities(callback)
*Device.* Returns in callback and assigns to `#serviceCapabilities` property the capabilities of the device service (not media):
network, security and system. If your device supports some auxiliary capabilities they will be there too.

### getStreamUri(options, callback)
*Media.* Returns a URI that can be used to initiate a live media stream using RTSP as the control protocol
The options are:

- `stream` (optional) - defines if a multicast or unicast stream is requested. Possible values are: 'RTP-Unicast' (default), 'RTP-Multicast'
- `protocol` (optional) - defines the network protocol for streaming. Possible values are: 'UDP', 'TCP', 'RTSP' (default), 'HTTP'
- `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`

### getSnapshotUri(options, callback)
*Media.* Obtain a JPEG snapshot URI from the device.

### getPresets(options, callback)
Returns the saved presets as an a key-value object where the key is the name of a preset and a value is a preset token.
This method also stores the presets information in a `#presets` property of an object.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`

### gotoPreset(options, callback)
Operation to go to a saved preset position for the PTZ node in the selected profile.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`
* `preset` - the name of preset. List of presets you can get by `#getPresets` method or in `#presets` property.

### getNodes(callback)
*PTZ.* Returns the properties of the current PTZ node, if it exists.
Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus.
Sets all information into `#nodes` property.

### relativeMove(options, callback)
*PTZ.* This is a relative pan-tilt-zoom method. Options for this method is a delta between desired and current position of the camera.

The options are:

- `x` Pan, number or a string within -1 to 1, optional
- `y` Tilt, number or a string within -1 to 1, optional
- `zoom` Zoom, number or a string within -1 to 1, optional
- `speed` An object with properties
  * `x` Pan speed
  * `y` Tilt speed
  * `zoom` Zoom speed

  If the speed option is omitted, the default speed set by the PTZConfiguration will be used.

Callback is optional and means essentially nothing

### absoluteMove(options, callback)
*PTZ.* This is an absolute pan-tilt-zoom method. Options for this method is an absolute position of the camera.

The options are:

- `x` Pan, number or a string within -1 to 1, optional
- `y` Tilt, number or a string within -1 to 1, optional
- `zoom` Zoom, number or a string within -1 to 1, optional
- `speed` An object with properties
  * `x` Pan speed
  * `y` Tilt speed
  * `zoom` Zoom speed

  If the speed option is omitted, the default speed set by the PTZConfiguration will be used.

Callback is optional and means essentially nothing

### continuousMove(options, callback)
Operation for continuous Pan/Tilt and Zoom movements

The options are:

- `x` Pan velocity, number or a string within -1 to 1, optional
- `y` Tilt velocity, number or a string within -1 to 1, optional
- `zoom` Zoom velocity, number or a string within -1 to 1, optional
- `timeout` Timeout in milliseconds, number. If timeout is omitted, movement will continue until `stop` command

### stop(options, callback)
*PTZ.* Stop ongoing pan, tilt and zoom movements of absolute relative and continuous type

Options and callback are optional. The options properties are:

- `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`
- `panTilt` (optional) - set true when we want to stop ongoing pan and tilt movements. If `panTilt` arguments are not present, this command stops these movements.
- `zoom` (optional) - set true when we want to stop ongoing zoom movement. If `zoom` arguments are not present, this command stops ongoing zoom movement.

### getStatus(options, callback)
*PTZ.* Returns an object with the current PTZ values.
```javascript
{
	position: {
		x: 'pan position'
		, y: 'tilt position'
		, zoom: 'zoom'
	}
	, moveStatus: {} // camera moving
	, utcTime: 'current camera datetime'
}
```

### getConfigurations(callback)
*PTZ.* Get all the existing PTZConfigurations from the device. Configurations saved into `#configurations` property

### getConfigurationOptions(configurationToken, callback)
*PTZ.* Get supported coordinate systems including their range limitations for selected configuration. Extends corresponding
configuration object

## Supported methods
* GetSystemDateAndTime
* GetCapabilities
* GetVideoSources
* GetProfiles
* GetServices
* GetDeviceInformation
* GetStreamUri
* GetSnapshotUri
* GetPresets
* GotoPreset
* RelativeMove
* AbsoluteMove
* ContinuousMove
* Stop
* GetStatus
* SystemReboot
* GetImagingSettings
* SetImagingSettings
* GetHostname
* GetScopes
* SetScopes

## Changelog
- 0.4.2 Bugfixes
- 0.4.1 Improved discovery (@sousandrei, @RogerHardiman) 
- 0.4.0 Encoder support (@chriswiggins), Imaging service (@EastL)
- 0.3.1 EventEmitter-based events
- 0.3.0 Refactoring, documentation, event service basics
- 0.2.7 WS-Discovery

## Links
WSDL schemes and docs:
- [Operations index](http://www.onvif.org/onvif/ver20/util/operationIndex.html)
- http://www.onvif.org/onvif/ver10/tc/onvif_core_ver10.pdf
- http://www.onvif.org/ver10/device/wsdl/devicemgmt.wsdl
- http://www.onvif.org/ver10/media/wsdl/media.wsdl
- http://www.onvif.org/ver20/ptz/wsdl/ptz.wsdl
- http://www.onvif.org/Portals/0/documents/WhitePapers/ONVIF_WG-APG-Application_Programmer's_Guide.pdf
