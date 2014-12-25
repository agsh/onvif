# ONVIF
ONVIF Node.js implementation based on this [article](http://ltoscanolm.hubpages.com/hub/onvif-programming-revealed).

##Supported methods
* getSystemDateAndTime
* getCapabilities
* getVideoSources
* getActiveSources
* getProfiles
* getServices
* getDeviceInformation
* getStreamUri
* PTZRelativeMove
* PTZAbsoluteMove

##Technical description
When the cam object created it automatically sends three command to the ONVIF device:
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

There are several common methods that work without credentials. Here are they: `getSystemDateAndTime`