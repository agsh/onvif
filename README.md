# ONVIF

[![Build Status](https://travis-ci.org/agsh/onvif.png)](https://travis-ci.org/agsh/onvif)

ONVIF Node.js implementation based on this [article](http://ltoscanolm.hubpages.com/hub/onvif-programming-revealed).

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
+ ptzUri (this is link to ~capabilities.PTZ.XAddr)
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
Returns an object with camera DateTime

And with credentials (with passed `username` and `password` in object):

### getVideoSources
