# ONVIF

[![Build Status](https://travis-ci.org/agsh/onvif.png)](https://travis-ci.org/agsh/onvif)
[![Coverage Status](https://img.shields.io/coveralls/agsh/onvif.svg)](https://coveralls.io/r/agsh/onvif?branch=master)
[![NPM version](https://badge.fury.io/js/onvif.png)](http://badge.fury.io/js/onvif)

ONVIF Node.js implementation based on this [article](http://ltoscanolm.hubpages.com/hub/onvif-programming-revealed).
This is a wrapper to ONVIF protocol which allows you to get information about your NVT (network video transmitter)
device, its media sources, control PTZ (pan-tilt-zoom) movements and manage presets.

[![ONVIF](http://www.onvif.org/Portals/_default/Skins/onvif/images/logo-new.jpg)](http://onvif.org)

##Supported methods
* GetSystemDateAndTime
* GetCapabilities
* GetVideoSources
* GetProfiles
* GetServices
* GetDeviceInformation
* GetStreamUri
* PTZRelativeMove
* PTZAbsoluteMove

##Installation
`npm install onvif`

##Tests
In the library directory run `npm run-script test`

##Quick example
This example asks your camera to look up and starts a web server at port 3030 that distributes a web page with vlc-plugin
container which translates video from the camera.
```javascript
var
  http = require('http'),
  Cam = require('onvif').Cam;

new Cam({
  hostname: CAMERA_HOST,
  username: USERNAME,
  password: PASSWORD
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

##API

```javascript
var Cam = require('onvif').Cam;
```

### new Cam(options, callback)

Options are:
- hostname
- username, password (optional, to deal with majority functions)
- port (optional)

Callback (optional) executes when the cam is initialised. Single argument for this function is possible error.

####Technical description

When the cam object creates it automatically sends three command to the ONVIF device:
`getCapabilities`, `getVideoSources` and `getProfiles`. After that it fills correspondent properties of an object:

+ capabilities
  - device
  - events
  - imaging
  - media
  - PTZ
  - extension
+ ptzUri (this is a link to #capabilities.PTZ.XAddr)
+ videoSources
  - $.token
  - framerate
  - resolution
+ profiles, array of profile object
  - name
  - videoSourceConfiguration
  - videoEncoderConfiguration
  - PTZConfiguration
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
Returns a device information, such as manufacturer, model and firmware version in the callback
Works without credentials (passed `username` and `password` arguments).

### getServices(callback)
Returns in callback and assigns to `#services` property an array consists of objects with properties: `namespace`, `XAddr`, `version`

### getStreamUri(options, callback)
Returns a URI that can be used to initiate a live media stream using RTSP as the control protocol
The options are:

- `stream` (optional) - defines if a multicast or unicast stream is requested. Possible values are: 'RTP-Unicast' (default), 'RTP-Multicast'
- `protocol` (optional) - defines the network protocol for streaming. Possible values are: 'UDP', 'TCP', 'RTSP' (default), 'HTTP'
- `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`

### getPresets(options, callback)
Returns the saved presets as an a key-value object where the key is the name of a preset and a value is a preset token.
This method also stores the presets information in a `#presets` property of an object.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`

### relativeMove(options, callback)

This is a relative pan-tilt-zoom method. Options for this method is a delta between desired and current position of the camera.

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

This is an absolute pan-tilt-zoom method. Options for this method is an absolute position of the camera.

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

### getStatus(options, callback)
Returns an object with the current PTZ values.
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
Get all the existing PTZConfigurations from the device. Configurations saved into `#configurations` property

### getConfigurationOptions(configurationToken, callback)
Get supported coordinate systems including their range limitations for selected configuration. Extends corresponding
configuration object

##Links
WSDL schemes:
- http://www.onvif.org/ver10/media/wsdl/media.wsdl
- http://www.onvif.org/ver20/ptz/wsdl/ptz.wsdl
