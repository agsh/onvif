# ONVIF

[![Coverage Status](https://raw.githubusercontent.com/agsh/onvif/refs/heads/gh-pages-debug/badges/coverage.svg)](https://github.com/agsh/onvif/tree/v1)

ONVIF client for all ONVIF devices with TypeScript types.

- TypeScript + Promise API
- Typed ONVIF/WSDL interfaces
- Profiles [S](https://www.onvif.org/profiles/profile-s/), [T](https://www.onvif.org/profiles/profile-t/),
  [G](https://www.onvif.org/profiles/profile-g/), [M](https://www.onvif.org/profiles/profile-m/),
  [C](https://www.onvif.org/profiles/profile-c/), [A](https://www.onvif.org/profiles/profile-a/)
- WS-Discovery, WS-Security, Digest (MD5 / SHA-1 / SHA-256)
- Lazy-loaded service modules
- Built to work around real-camera quirks across vendors

> [!NOTE]
> Coming from the classic `Cam` API (0.x / 0.8)? You can stay on
> `npm install onvif@previous`, use the `onvif/compatibility` layer with this package, or browse
> [branch v0.x](https://github.com/agsh/onvif/tree/v0.x).

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

Subpaths: `onvif/compatibility`, `onvif/compatibility/promises` (callback / Promise `Cam` wrappers).

To pin the previous major line explicitly:

```shell
npm install onvif@previous
```

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

const onvif = new Onvif({
  url: 'http://192.168.1.13:8000/onvif/device_service',
  username: 'admin',
  password: 'admin',
});
// or: { hostname, port, path?, useSecure? }
await onvif.connect();
const info = await onvif.device.getDeviceInformation();
console.log(info);
await onvif.close();
```

### CommonJS

```js
const { Onvif } = require('onvif');

(async () => {
  const onvif = new Onvif({
    url: 'http://192.168.1.13:8000/onvif/device_service',
    username: 'admin',
    password: 'admin',
  });
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
- WS-Discovery on the LAN - see [Discovery](#discovery)
- Vendor XML extensions (`xs:any` / `xs:anyAttribute`) - [innerDocs/vendor-extensions.md](innerDocs/vendor-extensions.md)
- SOAP XML (`build` / `parseSOAPString` / `request` / `requestContext`) - [innerDocs/soap-xml.md](innerDocs/soap-xml.md)
- Default Media Profile token bag (`activeMediaProfile` / `setActiveMediaProfile`) - see [Connection](#default-media-profile-activemediaprofile)
- Services - see [Services](#services)

## Connection

Call `connect()` before most methods. It synchronizes time (for WS-Security), discovers service URLs
via `GetServices` with `IncludeCapability: false` (or `GetCapabilities` if that fails), and - when
Media is available - loads profiles and video sources. Media1 is preferred; Media2 `GetProfiles` runs
only if Media1 is missing or fails. Pass `{ media: false }` to skip media probing (door stations,
reachability checks). `Discovery.probe` sets `defaultMedia: false` on access-only devices
(Profile C/A without Streaming/T in ProbeMatch); `connect()` honors that when `media` is omitted.
Override with `{ media: true | false }`. For capability blocks from GetServices, call
`device.getServices({ includeCapability: true })` after connect.

On success, `connect()` emits `connect` and returns the instance. A failed `connect()` rejects after
clearing prior discovery state (safe to retry). Media probe failures emit `warn` but still complete
connect. Details: [innerDocs/connection.md](innerDocs/connection.md).

### Default Media Profile (`activeMediaProfile`)

After media discovery, `connect()` builds a **token bag** - `onvif.activeMediaProfile` - from one
selected Media Profile (typically the first usable profile per video source). Multi-source devices
also fill `onvif.activeMediaProfiles` (one bag per video source); slot `0` is the process-wide
default until you switch. Service methods that omit `profileToken` / `configurationToken` /
`videoSourceToken` read defaults from the current bag (`media`, `media2`, `ptz`, `analytics`,
`imaging`, `deviceIO`, `thermal`, ...).

The bag holds **tokens only**. Codec / resolution / fps stay on the full profile object
`onvif.defaultProfile` (same selection as the bag). Deprecated aliases: `activeSource` /
`activeSources` (same objects). Rebuild after mutating profiles on the device with
`getActiveMediaProfiles()`.

Switch the current pipeline with `setActiveMediaProfile(profileToken)` (must exist in
`onvif.profiles`; validated against `videoSources` when those were loaded):

```ts
await onvif.connect();

console.log(onvif.profiles.map((p) => p.token));
// e.g. ['ProfileToken_1', 'ProfileToken_2'] - main vs sub stream

await onvif.setActiveMediaProfile('ProfileToken_2');
const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
// uses ProfileToken_2 / its encoder without passing tokens

// one-off override still works:
await onvif.media.getStreamUri({
  protocol: 'RTSP',
  profileToken: 'ProfileToken_1',
});
```

Same video source, different codecs (H.264 vs H.265): cameras usually expose that as
**two Media Profiles** that share one `videoSource`, each with its own
`videoEncoderConfiguration.encoding`. Pick the profile by encoding, then switch the bag
(codec metadata lives on `defaultProfile`, not on the token bag):

```ts
await onvif.connect();

for (const p of onvif.profiles) {
  const enc = p.videoEncoderConfiguration;
  console.log(p.token, enc?.encoding, enc?.resolution);
}

const h265 = onvif.profiles.find(
  (p) => p.videoEncoderConfiguration?.encoding === 'H265',
);
if (!h265) throw new Error('no H265 profile on this device');

await onvif.setActiveMediaProfile(h265.token);
console.log(onvif.defaultProfile?.videoEncoderConfiguration?.encoding); // H265

const uri = (await onvif.media.getStreamUri({ protocol: 'RTSP' })).mediaUri.uri;
// RTSP for the H265 pipeline; PTZ / imaging still use the same video source tokens
```

Switch back the same way (`encoding === 'H264'`). If both codecs sit on one profile and you
must change the encoder config on the device, that is a Media `setVideoEncoderConfiguration`
flow - not `setActiveMediaProfile`.

How the bag is built, multi-source devices, and more examples:
[innerDocs/connection.md#active-media-profile-token-bag](innerDocs/connection.md#active-media-profile-token-bag).

### `preserveAddress` (NAT / wrong XAddr host or port)

Devices often return service or subscription XAddrs that you cannot reach as written -
`http://127.0.0.1/...` behind a vendor proxy, an internal LAN IP while you connect through
NAT or a port-forward, or a different port than the one in the constructor / `url`.

By default (`preserveAddress: false`) ordinary SOAP still works: TCP always goes to the
constructor `hostname`:`port` (or host/port from `url`); from each XAddr only the path
(and query) is used. Set `preserveAddress: true` when the full URL must be rewritten to
that constructor host/port (path/query kept) - needed for SOAP `a:To` and for PullMessages /
Renew / Unsubscribe, which dial the subscription Address as `options.url`. Effective ports
are compared (empty `URL.port` means 80/443). This does not rewrite RTSP/snapshot URI
strings inside Media response bodies.

```ts
const onvif = new Onvif({
  hostname: '203.0.113.10', // public / NAT address you can reach
  port: 8080, // forwarded port (camera may advertise :80 in XAddr)
  username: 'admin',
  password: 'admin',
  preserveAddress: true,
});
```

When finished, call `await onvif.close()` to stop the pull-point subscription (if any) and release
HTTP keep-alive sockets. Without `close()`, idle connections can keep a Node process from exiting.
Safe to call more than once. Call `await onvif.connect()` again to reopen after `close()`.

Agents, renew/reconnect timers, and custom `Subscription` teardown:
[innerDocs/resources.md](innerDocs/resources.md).

## Discovery

Find ONVIF devices on the LAN with WS-Discovery (`Discovery.probe`). Each match is an
[`Onvif`](https://agsh.github.io/onvif/classes/Onvif.html) instance (set credentials, then `connect()`).
`probe()` always resolves (possibly `[]`); bad replies and socket issues emit `error` only.

```ts
import { Discovery } from 'onvif';

Discovery.on('device', (cam, rinfo) => {
  console.log('found', rinfo.address, cam.hostname, cam.xaddrs?.map((u) => u.href));
});
Discovery.on('error', (err) => console.error('discovery', err));

const devices = await Discovery.probe({
  timeout: 5000,
  // device: 'eth0', // bind to a NIC when needed
  // types: ['dn:NetworkVideoTransmitter'],
  // scopes: ['onvif://www.onvif.org/Profile/T'],
});

for (const cam of devices) {
  if (!('connect' in cam)) continue;
  cam.username = 'admin';
  cam.password = 'admin';
  await cam.connect();
  console.log(await cam.device.getDeviceInformation());
  await cam.close();
}
```

Options include `timeout`, `device` (interface), `types` / `scopes` filters, `bufferSize`, and
IPv4/IPv6. RelatesTo / MessageID matching avoids mixing Probe replies. Runnable sample:
[discovery.js](https://github.com/agsh/onvif/blob/master/examples/discovery.js).

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

`build` / `parseSOAPString`, public `onvif.request()`, and per-call `requestContext` request/response
capture: [innerDocs/soap-xml.md](innerDocs/soap-xml.md).

## Migration from v0.x

This package uses the `Onvif` API. Existing `Cam` apps can keep working via
`onvif/compatibility` / `onvif/compatibility/promises` - see
[innerDocs/migration.md](innerDocs/migration.md).
Older line docs: [branch v0.x](https://github.com/agsh/onvif/tree/v0.x).

## Examples

Samples in the [`examples`](https://github.com/agsh/onvif/blob/master/examples) folder:

- [device.info.js](https://github.com/agsh/onvif/blob/master/examples/device.info.js) - device info, hostname, scopes, services
- [media.stream.js](https://github.com/agsh/onvif/blob/master/examples/media.stream.js) - profiles, RTSP stream and snapshot URIs
- [media.snapshot.ts](https://github.com/agsh/onvif/blob/master/examples/media.snapshot.ts) - GetSnapshotUri + HTTP Digest download (`digestAuth` / `getDigestHeaders`)
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

Tested and quirk-fixed against real devices from many vendors (closed GitHub issues and lab use), including
[360 Vision Technology Predator](https://www.360visiontechnology.com/predator/), ACTi, Amcrest, Avigilon,
Axis, Bosch, Canon, Dahua, D-Link, Foscam, Hanwha / Wisenet, Hikvision, Panasonic, Pelco, Reolink, Sony,
Sricam, TP-Link / Tapo, Tyco, Uniview, Vivotek, and others.

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
