# ONVIF

[![Coverage Status](https://raw.githubusercontent.com/agsh/onvif/refs/heads/gh-pages-debug/badges/coverage.svg)](https://github.com/agsh/onvif/tree/v1)

TypeScript-first ONVIF client for Node.js.

- TypeScript + Promise API
- Typed ONVIF/WSDL interfaces
- Profiles [S](https://www.onvif.org/profiles/profile-s/), [T](https://www.onvif.org/profiles/profile-t/),
  [G](https://www.onvif.org/profiles/profile-g/), [M](https://www.onvif.org/profiles/profile-m/),
  [C](https://www.onvif.org/profiles/profile-c/), [A](https://www.onvif.org/profiles/profile-a/)
- WS-Discovery, WS-Security, Digest (MD5 / SHA-1 / SHA-256)
- Lazy-loaded service modules

> [!IMPORTANT]
> Looking for **0.x / 0.8**? Docs and source: [branch v0.x](https://github.com/agsh/onvif/tree/v0.x).

[![ONVIF](https://github.com/user-attachments/assets/f58fb3c8-6bf6-406c-bcc7-883c1da33c5d)](http://onvif.org)

## Installation

Requires Node.js 18+. The published package ships compiled `build/` (CommonJS + `.d.ts`),
`README`, `LICENSE`, and `CHANGELOG` - no need to clone this repository for normal use.

```shell
npm install onvif
```

```js
const { Onvif } = require('onvif'); // CommonJS
```

```ts
import { Onvif } from 'onvif'; // ESM / TypeScript (Node loads the CJS build)
```

Subpaths: `onvif/compatibility`, `onvif/compatibility/promises`.

For existing projects on the mature **0.x** line (~10 years):

```shell
npm install onvif@previous
```

README for 0.x: [branch v0.x](https://github.com/agsh/onvif/tree/v0.x).

## Documentation

API reference (TypeDoc): **[https://agsh.github.io/onvif/](https://agsh.github.io/onvif/)** -
start from the [`Onvif`](https://agsh.github.io/onvif/classes/Onvif.html) class.

After `connect()`, call methods on lazy-loaded service namespaces (`onvif.media`, `onvif.ptz`, ...; `events` is eager) -
see [Services](#services). Also exported: [`Discovery`](https://agsh.github.io/onvif/variables/Discovery.html).

## Quick start

Call `connect()` before service methods (or pass `autoConnect: true`). Call `close()` when you no longer need the connection.

### TypeScript / ESM

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });
await onvif.connect();
const info = await onvif.device.getDeviceInformation();
console.log(info);
await onvif.close();
```

### CommonJS

```js
const { Onvif } = require('onvif');

(async () => {
  const onvif = new Onvif({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });
  await onvif.connect();
  console.log(await onvif.device.getDeviceInformation());
  await onvif.close();
})();
```

### Example project

> [!NOTE]
> **Node.js** - works with plain JavaScript (`require` / `import`). TypeScript is optional;
> types ship with the package.

ONVIF with FFmpeg, RTSP and Socket.IO (http://localhost:6147):

<video src="https://github.com/user-attachments/assets/fd725700-f60e-4c3b-ba2d-bdf2d07b3376" controls width="720"></video>

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
</script></body></html>`),
);
const { Onvif } = require('onvif');
const io = require('socket.io')(server);
const rtsp = require('rtsp-ffmpeg');
server.listen(6147);

const onvif = new Onvif({ username: 'username', password: 'password', hostname: '192.168.0.116', port: 2020 });
(async () => {
  await onvif.connect();
  const input = (await onvif.media.getStreamUri({ protocol: 'RTSP' })).uri.replace(
    '://',
    `://${onvif.username}:${onvif.password}@`,
  );
  const stream = new rtsp.FFMpeg({ input, resolution: '320x240', quality: 3 });
  io.on('connection', (socket) => {
    const pipeStream = socket.emit.bind(socket, 'data');
    stream.on('disconnect', () => stream.removeListener('data', pipeStream)).on('data', pipeStream);
  });
  setInterval(
    () =>
      onvif.ptz.absoluteMove({
        position: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          zoom: Math.random(),
        },
      }),
    3000,
  );
})().catch(console.error);
```

## Features

- Typed request/response interfaces from the latest ONVIF WSDL
  ([onvif-generate-interfaces](https://github.com/agsh/onvif-generate-interfaces))
- [API documentation](https://agsh.github.io/onvif/)
- Events: pull-point, WS-BaseNotification, filters, `EventEmitter` - [innerDocs/events.md](innerDocs/events.md)
- Lazy-loaded services
- Auth: WS-Security, Digest; Advanced Security (experimental)
- WS-Discovery on the LAN
- Vendor XML extensions (`xs:any` / `xs:anyAttribute`) - [innerDocs/vendor-extensions.md](innerDocs/vendor-extensions.md)
- SOAP XML (`build` / `parseSOAPString` / `request` / `soapXml`) - [innerDocs/soap-xml.md](innerDocs/soap-xml.md)
- Services - see [Services](#services)

## Connection

Call `connect()` before most methods. It synchronizes time (for WS-Security), discovers service URLs
(`GetServices` / `GetCapabilities`), and - when Media is available - loads profiles and video sources.
Pass `{ media: false }` to skip media probing (door stations, reachability checks).

On success, `connect()` emits `connect` and returns the instance. A failed `connect()` rejects after
clearing prior discovery state (safe to retry). Media probe failures emit `warn` but still complete
connect. Details: [innerDocs/connection.md](innerDocs/connection.md).

When finished, call `await onvif.close()` to stop the pull-point subscription (if any) and release
HTTP keep-alive sockets. Without `close()`, idle connections can keep a Node process from exiting.
Safe to call more than once. Call `await onvif.connect()` again to reopen after `close()`.

Agents, renew/reconnect timers, and custom `Subscription` teardown:
[innerDocs/resources.md](innerDocs/resources.md).

## Services

Methods take typed ONVIF request options and return response data. Some helpers accept more convenient
fields (for example `dateTime?: Date` on `SetSystemDateAndTimeExtended`).

| Service | Namespace | Profile |
| --- | --- | --- |
| [Device](https://agsh.github.io/onvif/interfaces/Device.html) | `onvif.device` | Core (all) |
| [Media](https://agsh.github.io/onvif/interfaces/Media.html) | `onvif.media` | [S](https://www.onvif.org/profiles/profile-s/) |
| [Media2](https://agsh.github.io/onvif/interfaces/Media2.html) | `onvif.media2` | [T](https://www.onvif.org/profiles/profile-t/) |
| [PTZ](https://agsh.github.io/onvif/interfaces/PTZ.html) | `onvif.ptz` | [S](https://www.onvif.org/profiles/profile-s/), [T](https://www.onvif.org/profiles/profile-t/) |
| [Events](https://agsh.github.io/onvif/classes/Events.html) | `onvif.events` | Core (all) |
| [Imaging](https://agsh.github.io/onvif/interfaces/Imaging.html) | `onvif.imaging` | [S](https://www.onvif.org/profiles/profile-s/), [T](https://www.onvif.org/profiles/profile-t/) |
| [Analytics](https://agsh.github.io/onvif/interfaces/Analytics.html) | `onvif.analytics` | [T](https://www.onvif.org/profiles/profile-t/), [M](https://www.onvif.org/profiles/profile-m/) |
| [AnalyticsDevice](https://agsh.github.io/onvif/interfaces/AnalyticsDevice.html) | `onvif.analyticsDevice` | [M](https://www.onvif.org/profiles/profile-m/) |
| [Recording](https://agsh.github.io/onvif/interfaces/Recording.html) | `onvif.recording` | [G](https://www.onvif.org/profiles/profile-g/) |
| [Replay](https://agsh.github.io/onvif/interfaces/Replay.html) | `onvif.replay` | [G](https://www.onvif.org/profiles/profile-g/) |
| [Search](https://agsh.github.io/onvif/interfaces/Search.html) | `onvif.search` | [G](https://www.onvif.org/profiles/profile-g/) |
| [Receiver](https://agsh.github.io/onvif/interfaces/Receiver.html) | `onvif.receiver` | [G](https://www.onvif.org/profiles/profile-g/) |
| [DeviceIO](https://agsh.github.io/onvif/interfaces/DeviceIO.html) | `onvif.deviceIO` | [S](https://www.onvif.org/profiles/profile-s/), [T](https://www.onvif.org/profiles/profile-t/), [C](https://www.onvif.org/profiles/profile-c/) |
| [Display](https://agsh.github.io/onvif/interfaces/Display.html) | `onvif.display` | - |
| [ActionEngine](https://agsh.github.io/onvif/interfaces/ActionEngine.html) | `onvif.actionEngine` | - |
| [Thermal](https://agsh.github.io/onvif/interfaces/Thermal.html) | `onvif.thermal` | - |
| [DoorControl](https://agsh.github.io/onvif/interfaces/DoorControl.html) | `onvif.doorControl` | [C](https://www.onvif.org/profiles/profile-c/), [A](https://www.onvif.org/profiles/profile-a/) |
| [AccessControl](https://agsh.github.io/onvif/interfaces/AccessControl.html) | `onvif.accessControl` | [C](https://www.onvif.org/profiles/profile-c/), [A](https://www.onvif.org/profiles/profile-a/) |
| [Credential](https://agsh.github.io/onvif/interfaces/Credential.html) | `onvif.credential` | [A](https://www.onvif.org/profiles/profile-a/), [C](https://www.onvif.org/profiles/profile-c/) |
| [AccessRules](https://agsh.github.io/onvif/interfaces/AccessRules.html) | `onvif.accessRules` | [A](https://www.onvif.org/profiles/profile-a/) |
| [Schedule](https://agsh.github.io/onvif/interfaces/Schedule.html) | `onvif.schedule` | [A](https://www.onvif.org/profiles/profile-a/) |
| [Provisioning](https://agsh.github.io/onvif/interfaces/Provisioning.html) | `onvif.provisioning` | - |
| [AdvancedSecurity](https://agsh.github.io/onvif/interfaces/AdvancedSecurity.html) | `onvif.advancedSecurity` | - |

**Return unwrapping**

- **Single useful value** - unwrapped (e.g. `getDeviceInformation()` -> info object, `systemReboot()` -> message string)
- **By-token getters** (`getAccessPoints`, `getDoors`, ...) - unwrapped to an **array** (`[]` when empty)
- **Paginated `*List` methods** - keep the ONVIF list response object (`{ accessPoint?, nextStartReference? }`, ...)

## Events

```ts
onvif.on('event', (msg) => console.log(msg));
```

Pull-point, WS-BaseNotification, filters, and push: [innerDocs/events.md](innerDocs/events.md).

## Vendor XML

ONVIF `xs:any` / `xs:anyAttribute` extension points are exposed via `xsany` and `$`.
After parse you get a camelCase view **and** a wire tree on `obj[xsany]`. Setters serialize **`[xsany]` only**.

Details: [innerDocs/vendor-extensions.md](innerDocs/vendor-extensions.md).

## SOAP XML

`build` / `parseSOAPString`, public `onvif.request()`, and per-call `soapXml` request/response
capture: [innerDocs/soap-xml.md](innerDocs/soap-xml.md).

## Migration from v0.x

Prefer the new `Onvif` API. For existing `Cam`-based apps, a compatibility layer
(`onvif/compatibility`, `onvif/compatibility/promises`) is available - see
[innerDocs/migration.md](innerDocs/migration.md).  
0.x docs: [branch v0.x](https://github.com/agsh/onvif/tree/v0.x).

## Examples

Samples in the [`examples`](https://github.com/agsh/onvif/blob/master/examples) folder (1.x `Onvif` API):

- [device.info.js](https://github.com/agsh/onvif/blob/master/examples/device.info.js) - device info, hostname, scopes, services
- [media.stream.js](https://github.com/agsh/onvif/blob/master/examples/media.stream.js) - profiles, RTSP stream and snapshot URIs
- [media2.profiles.js](https://github.com/agsh/onvif/blob/master/examples/media2.profiles.js) - Profile T Media2 profiles / encoders
- [imaging.settings.js](https://github.com/agsh/onvif/blob/master/examples/imaging.settings.js) - imaging settings and options
- [analytics.rules.js](https://github.com/agsh/onvif/blob/master/examples/analytics.rules.js) - analytics rules and modules
- [deviceio.relay.js](https://github.com/agsh/onvif/blob/master/examples/deviceio.relay.js) - DeviceIO relays / digital inputs
- [door.unlock.js](https://github.com/agsh/onvif/blob/master/examples/door.unlock.js) - Profile C/A door unlock / lock
- [rtsp.socketio.ptz.js](https://github.com/agsh/onvif/blob/master/examples/rtsp.socketio.ptz.js) - RTSP preview over Socket.IO with PTZ
- [ptz.keyboard.js](https://github.com/agsh/onvif/blob/master/examples/ptz.keyboard.js) - keyboard PTZ + presets
- [discovery.js](https://github.com/agsh/onvif/blob/master/examples/discovery.js) - WS-Discovery
- [scan.ip.range.js](https://github.com/agsh/onvif/blob/master/examples/scan.ip.range.js) - IP range scan
- [proxy.socks5.js](https://github.com/agsh/onvif/blob/master/examples/proxy.socks5.js) - SOCKS5 proxy
- [https.digest.mjs](https://github.com/agsh/onvif/blob/master/examples/https.digest.mjs) - HTTPS + Digest (SHA-1 / SHA-256) with in-process mock (ESM)
- [events.with.filter.ts](https://github.com/agsh/onvif/blob/master/examples/events.with.filter.ts) - events with topic filters
- [osd.js](https://github.com/agsh/onvif/blob/master/examples/osd.js) - on-screen text overlays
- [replay.uri.js](https://github.com/agsh/onvif/blob/master/examples/replay.uri.js) - Profile G replay URI

Compatibility-layer demos: [`compatibility.cjs`](https://github.com/agsh/onvif/blob/master/examples/compatibility.cjs), [`compatibilityPromises.cjs`](https://github.com/agsh/onvif/blob/master/examples/compatibilityPromises.cjs).

## Device compatibility

Tested with devices from ACTi, Avigilon, Axis, Bosch, Canon, Hanwha, Hikvision, Panasonic, Sony, Tapo and others.

Report your device and firmware via the
[compatibility form](https://docs.google.com/forms/d/e/1FAIpQLSfXsVZv802YFDISGCZaLaJaC_isw2wKQpJ11UurvgO5veYzUw/viewform).

```ts
console.log(await onvif.device.getDeviceInformation());
```

```json
{
  "manufacturer": "tp-link",
  "model": "Tapo C220",
  "firmwareVersion": "1.4.4 Build 260515 Rel.24570n",
  "serialNumber": "7461572b",
  "hardwareId": 1
}
```

## Thanks

Thanks to [HappyTimeSoft](https://www.happytimesoft.com/) for
[HappyTime ONVIF Server](https://www.happytimesoft.com/products/onvif-server/index.html) used in integration tests,
to [@RogerHardiman](https://github.com/RogerHardiman) for ongoing support and real-camera testing,
and to everyone who filed issues over the years.

[![OBEY!](https://github.com/user-attachments/assets/8cc43a86-4610-4e1a-8700-3a46aa2c1da3)](https://www.onvif.org/resources/)
