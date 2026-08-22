## Changelog
- 0.8.2 Probably the last stable v0.x before v1. Digest auth RFC fixes (@RogerHardiman, @anupamme).
  Discovery UDP buffer fix and undefined props checks (@momoAmch). Replace splitargs with own implementation,
  promises probe return (@agsh). CI on Node 22/24 (@bryopsida).
- 0.8.1 Skip invalid presets (#367, @agsh). Get complete information about preset points (@momoAmch).
- 0.8.0 Media2 support for video encoders (@momoAmch). PTZ presets object token fix (@Craytor).
  Digest Authentication support (`useWSSecurity: false`) (@agsh). Cleanup unnecessary libraries,
  remove lodash.get, minimal Node version is 14 (@agsh).
- 0.7.4 Ability to set font size and color in `setOSD` and `createOSD` (@RotemDoar).
- 0.7.3 `setOSD` support for DateAndTime (@RotemDoar).
- 0.7.2 Promises API via `onvif/promises` (@agsh).
- 0.7.1 Large catch-up release: network interfaces and NTP improvements, HTTPS, HTTP agents,
  Profile T / Media2 review, custom OSD position, `SendAuxiliaryCommand`, imaging focus/irCutFilter/GetStatus,
  recording service methods, event pull retry/restart on connection drops, CI workflows and many bugfixes
  (see GitHub release notes for full contributor list).
- 0.6.6 A lot of fixes (@RogerHardiman). Stable and tested, next step for new version
- 0.6.5 Add MEDIA2 support, Profile T and GetServices XAddrs support for H265 cameras. Add support for HTTPS. Add Discovery.on('error') to examples.
  Add flag to only send Zoom, or only send Pan/Tilt for some broken cameras (Sony XP1 Xiongmai). Fix bug in GetServices. Improve setNTP command.
  API changed on getNetworkInterfaces and other methods that could return an Array or a Single Item. We now return an Array in all cases.
  Add example converting library so it uses Promises with Promisify. Enable 3702 Discovery on Windows for MockServer. Add MockServer test cases)
- 0.6.1 Workaround for cams that don't send date-time
- 0.6.0 Refactor modules for proper import in electron-based environment
- 0.5.5 Added ptz.`gotoHomePosition`, ptz.`setHomePosition`. Fixed exceptions in ptz.`getConfigurations` and utils.`parseSOAPString`.
  Added tests for ptz.`setPreset`, ptz.`removePreset`, ptz.`gotoHomePosition`, and ptz.`setHomePosition`.
- 0.5.4 Bumped for NPM.
- 0.5.3 Some fixes. Tests
- 0.5.2 `preserveAddress` property for NAT devices, discovery with multiple network interfaces (@Climax777)
- 0.5.1 Critical bugfix in SOAP-auth for some cams
- 0.5.0 Profile G support (@RogerHardiman), proper SOAP auth, nodejs support >= 0.12
- 0.4.2 Bugfixes
- 0.4.1 Improved discovery (@sousandrei, @RogerHardiman)
- 0.4.0 Encoder support (@chriswiggins), Imaging service (@EastL)
- 0.3.1 EventEmitter-based events
- 0.3.0 Refactoring, documentation, event service basics
- 0.2.7 WS-Discovery
