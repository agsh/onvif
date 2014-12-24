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
+ PTZUri (this is link to ~capabilities.PTZ.XAddr)
+ videoSources
  - $.token
  - framerate
  - resolution
+ profiles