# ONVIF

[![Build Status](https://travis-ci.org/agsh/onvif.png)](https://travis-ci.org/agsh/onvif)
[![Coverage Status](https://img.shields.io/coveralls/agsh/onvif.svg)](https://coveralls.io/r/agsh/onvif?branch=master)

ONVIF Node.js implementation based on this [article](http://ltoscanolm.hubpages.com/hub/onvif-programming-revealed).

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

See more detailed information at http://www.onvif.org/ver10/media/wsdl/media.wsdl
After cam initialisation we can run several ONVIF commands.
There are several common methods that work without credentials. Here are they: `getSystemDateAndTime`.

### getSystemDateAndTime(callback)
Returns an Date object with current camera datetime

### getDeviceInformation(callback)
Returns a device information, such as manufacturer, model and firmware version

And with credentials (with passed `username` and `password` in object):

### getServices(callback)
Returns in callback and assigns to `#services` property an array consists of objects with properties: `namespace`, `XAddr`, `version`

### getStreamUri(options, callback)
Returns a URI that can be used to initiate a live media stream using RTSP as the control protocol
The options are:

* `stream` (optional) - defines if a multicast or unicast stream is requested. Possible values are: 'RTP-Unicast' (default), 'RTP-Multicast'
* `protocol` (optional) - defines the network protocol for streaming. Possible values are: 'UDP', 'TCP', 'RTSP' (default), 'HTTP'
* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`

### getPresets(options, callback)
Returns the saved presets as an a key-value object where the key is the name of a preset and a value is a preset token.
This method also stores the presets information in a `#presets` property of an object.

The options are:

* `profileToken` (optional) - defines media profile to use and will define the configuration of the content of the stream. Default is `#activeSource.profileToken`

### ptzRelativeMove(options, callback)
This is a relative pan-tilt method. Options for this method is a delta between desired and current position of the camera.
The options are:

* `translationPanTiltX` (optional)
* `translationPanTiltY` (optional)
* `speedPanTiltX` (optional)
* `speedPanTiltY` (optional)
* `zoom` (optional)