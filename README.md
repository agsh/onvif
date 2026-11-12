# ONVIF

[![Coverage Status][cov-badge]][cov-link]

[cov-badge]: https://raw.githubusercontent.com/agsh/onvif/refs/heads/gh-pages/badges/coverage.svg
[cov-link]: https://github.com/agsh/onvif/tree/master

ONVIF client for all ONVIF devices with TypeScript types.

- TypeScript + Promise API
- Typed ONVIF/WSDL interfaces (26.06)
- Profiles [S](https://www.onvif.org/profiles/profile-s/), [T](https://www.onvif.org/profiles/profile-t/),
  [G](https://www.onvif.org/profiles/profile-g/), [M](https://www.onvif.org/profiles/profile-m/),
  [C](https://www.onvif.org/profiles/profile-c/), [A](https://www.onvif.org/profiles/profile-a/)
- WS-Discovery, WS-Security, Digest (MD5 / SHA-1 / SHA-256 / SHA-512-256)
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

One build covers **CommonJS**, **ESM**, and **TypeScript** (`require` / `import` + `.d.ts`).
ESM `import` loads the same CJS build via `exports.import` - examples: [Quick start](#quick-start).

Subpaths: `onvif/compatibility`, `onvif/compatibility/promises` (callback / Promise `Cam` wrappers).

To pin the previous major line explicitly:

```shell
npm install onvif@previous
```

## Documentation

API reference (TypeDoc): **[https://agsh.github.io/onvif/](https://agsh.github.io/onvif/)** -
start from the [`Onvif`](https://agsh.github.io/onvif/classes/Onvif.html) class.

After `connect()`, call methods on lazy namespaces (`onvif.media`, `onvif.ptz`, ...;
`events` is eager) - see [Services](#services). Also exported:
[`Discovery`](https://agsh.github.io/onvif/variables/Discovery.html).

### Deep docs

Longer notes in [`innerDocs/`](innerDocs/) (GitHub; not in the npm tarball):

- Start here: [guides.md](innerDocs/guides.md), [troubleshooting.md](innerDocs/troubleshooting.md),
  [connection.md](innerDocs/connection.md), [auth.md](innerDocs/auth.md)
- Also: [events.md](innerDocs/events.md), [errors.md](innerDocs/errors.md),
  [migration.md](innerDocs/migration.md), [quirks.md](innerDocs/quirks.md),
  [performance.md](innerDocs/performance.md), [resources.md](innerDocs/resources.md),
  [soap-xml.md](innerDocs/soap-xml.md), [vendor-extensions.md](innerDocs/vendor-extensions.md),
  [testing.md](innerDocs/testing.md)

## Quick start

Call `connect()` before service methods (or pass `autoConnect: true`). Call `close()` when done.
Same pattern works with `require('onvif')` (CommonJS).

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({
  url: 'http://192.168.1.13:8000/onvif/device_service',
  username: 'admin',
  password: 'admin',
});
// or: { hostname, port, path?, useSecure? }
await onvif.connect();
console.log(await onvif.device.getDeviceInformation());
await onvif.close();
```

RTSP preview + Socket.IO / FFmpeg demo:
[rtsp.socketio.ptz.js](examples/rtsp.socketio.ptz.js).

<video src="https://github.com/user-attachments/assets/fd725700-f60e-4c3b-ba2d-bdf2d07b3376" controls></video>

## Features

- Typed WSDL interfaces (26.06) and [TypeDoc API](https://agsh.github.io/onvif/)
- Lazy service namespaces; eager `events` - [performance.md](innerDocs/performance.md)
- Auth: WS-Security + HTTP Digest - [auth.md](innerDocs/auth.md)
- WS-Discovery - [Discovery](#discovery)
- Media profile bag and non-camera profiles (C / A / G / M) -
  [Connection](#default-media-profile-activemediaprofile),
  [Beyond cameras](#beyond-cameras-profiles-c--a--g--m)
- Typed errors, vendor `xs:any`, SOAP helpers - see [Deep docs](#deep-docs)

## Constructor options

Address the device with `url` **or** `hostname` / `port` / `path` / `useSecure`, plus
`username` / `password`. Other common flags:

- `timeout` - HTTP socket timeout for ordinary SOAP (ms; default 10000). PullMessages uses its own
- `useWSSecurity` - SOAP PasswordDigest headers (default `true`; HTTP Digest still applies; see
  [auth.md](innerDocs/auth.md))
- `autoConnect` - call `connect()` from the constructor (default `false`)
- `agent` - custom `http(s).Agent`, proxy agent, or `false` (see
  [resources.md](innerDocs/resources.md))
- `preserveAddress` - rewrite XAddr host/port to the constructor address (NAT / loopback); see
  [`preserveAddress`](#preserveaddress-nat--wrong-xaddr-host-or-port)
- `secureOptions` - TLS options when using HTTPS
- `defaultMedia` - default for `connect({ media })` when omitted (Discovery may set `false`)

Full field list: [`OnvifOptions`](https://agsh.github.io/onvif/interfaces/OnvifOptions.html).

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
connect. `connect()` is not a login check - call `device.getDeviceInformation()` afterwards if you
need to verify username/password early. Details: [connection.md](innerDocs/connection.md).

### Default Media Profile (`activeMediaProfile`)

After media discovery, omitted `profileToken` / source tokens default from the token bag
`onvif.activeMediaProfile` (tokens only; codec/fps live on `onvif.defaultProfile`). Switch with
`setActiveMediaProfile(profileToken)`:

```ts
await onvif.setActiveMediaProfile('ProfileToken_2');
const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
```

Details: [connection.md](innerDocs/connection.md#active-media-profile-token-bag).

### Beyond cameras (Profiles C / A / G / M)

Profiles [S](https://www.onvif.org/profiles/profile-s/) / [T](https://www.onvif.org/profiles/profile-t/)
are the video path above (`media` / `media2` / `ptz` / `imaging`). The same `Onvif` client also
covers access control, recording, and analytics - without treating every device as a camera.

**Profile [C](https://www.onvif.org/profiles/profile-c/) / [A](https://www.onvif.org/profiles/profile-a/)
(door / access):** skip Media probing. Discovery sets `defaultMedia: false` when ProbeMatch scopes
look access-only (no Streaming/T); or pass `{ media: false }` yourself. After connect, omit-token
DoorControl / AccessControl calls use `activeDoorToken` / `activeAccessPointToken`.

```ts
await onvif.connect({ media: false });
console.log(onvif.activeDoorToken, onvif.uri.doorcontrol);
await onvif.doorControl.unlockDoor(); // uses activeDoorToken
await onvif.setActiveDoor('DoorToken_2');
```

Recipe: [guides.md](innerDocs/guides.md#unlock-a-door) /
[door.unlock.js](examples/door.unlock.js).

**Profile [G](https://www.onvif.org/profiles/profile-g/) (recording / replay / search):** connect
still probes Media when present. Defaults: `activeRecordingToken` /
`activeRecordingJobToken`. See [guides.md](innerDocs/guides.md#replay-a-recording) /
[replay.uri.js](examples/replay.uri.js).

**Profile [M](https://www.onvif.org/profiles/profile-m/) (analytics):** `onvif.analytics` /
`onvif.analyticsDevice` - [analytics.rules.js](examples/analytics.rules.js).

Entity tokens: [connection.md](innerDocs/connection.md#active-entity-tokens-non-media).

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
[resources.md](innerDocs/resources.md).

## Discovery

Find ONVIF devices on the LAN with WS-Discovery (`Discovery.probe`). Each match is an
[`Onvif`](https://agsh.github.io/onvif/classes/Onvif.html) instance (set credentials, then `connect()`).
`probe()` always resolves (possibly `[]`); bad replies and socket issues emit `error` only.
Informational progress uses `status` (NIC enumeration and each Probe send) - useful when
nothing appears on a multi-homed host.

```ts
import { Discovery } from 'onvif';

Discovery.on('device', (cam, rinfo) => {
  console.log('found', rinfo.address, cam.hostname, cam.xaddrs?.map((u) => u.href));
});
Discovery.on('error', (err) => console.error('discovery', err));
Discovery.on('status', (msg) => console.log('discovery', msg));
// Found interface eth0
// Sending IPv4 from 192.168.1.10 (eth0) to 239.255.255.250:3702

const devices = await Discovery.probe({
  timeout: 5000,
  // device: 'eth0', // bind to one NIC (default: every address on every NIC)
  // type: 'udp6', // optional family filter; omit = IPv4 + IPv6
  // address: '192.168.1.50', port: 3702, // directed unicast Probe
  // types default to ['tds:Device']; pass [] to match any WS-Discovery type
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

What `probe` does (beyond a single-interface IPv4 multicast):

- **Dual-stack by default** - Probe from every non-loopback IPv4 and IPv6 address on every NIC
  (`239.255.255.250` / `FF02::C`, port `3702`). Pass `type: 'udp4' | 'udp6'` to limit the family;
  omit `type` for both.
- **IPv6 link-local bind** - zone id is attached for `fe80::` binds (`%eth0` on Unix,
  numeric `%scopeid` on Windows).
- **Multi-homed / directed Probe** - optional `device` (one NIC), or `address` + `port` for a
  unicast Probe still sent from each selected local address.
- **`status` diagnostics** - `Discovery.on('status', ...)` gets human-readable lines while
  interfaces are listed and Probes are sent (not errors). See the sample below.
- **Dedup & filtering** - devices are keyed by ProbeMatch `EndpointReference` (same NVT on
  IPv4+IPv6 -> one result); `RelatesTo` / MessageID drops replies meant for another client's Probe;
  `types` / `scopes` narrow the Probe; ProbeMatch scopes set `defaultMedia` (`false` for
  access-only Profile C/A without Streaming/T).
- **Other options** - `timeout`, `bufferSize`, `listeningPort`, `resolve: false` (raw ProbeMatch
  instead of `Onvif`).

Runnable sample (includes `status`):
[discovery.js](examples/discovery.js).

## Services

Methods take typed ONVIF options. Returns are unwrapped - [What methods return](#what-methods-return).
Task recipes: [guides.md](innerDocs/guides.md). Method details:
[TypeDoc](https://agsh.github.io/onvif/) (start at `Onvif`).

Namespaces (lazy except `events`):

- **Core** - `device`, `events`
- **Video (S / T)** - `media`, `media2`, `ptz`, `imaging`, `deviceIO`
- **Recording (G)** - `recording`, `replay`, `search`, `receiver`
- **Access (C / A)** - `doorControl`, `accessControl`, `credential`, `accessRules`, `schedule`
- **Analytics (T / M)** - `analytics`, `analyticsDevice`
- **Other** - `display`, `actionEngine`, `thermal`, `provisioning`, `uplink`,
  `appManagement`, `advancedSecurity` (experimental)

### What methods return

SOAP replies are nested (`GetFooResponse` -> `Foo` -> ...). This library unwraps them to the
simplest useful value:

- One useful field -> that value alone (`systemReboot()` -> `"Rebooting"`;
  `media2.getStreamUri()` -> `"rtsp://..."`; `createDoor()` -> token string).
- Several fields -> one plain object (`getDeviceInformation()`;
  `media.getStreamUri()` -> `MediaUri` with `.uri`).
- Lists -> always an array, even for one item (`getProfiles()`, `getDoors({ token })`, ...).
- Paginated `*List` methods keep `{ items?, nextStartReference? }` (or door/access list shape).

```ts
const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
console.log(stream.uri); // Media 1.0 -> MediaUri

const uri = await onvif.media2.getStreamUri({ protocol: 'RtspUnicast' });
console.log(uri); // Media 2 -> string

const doors = await onvif.doorControl.getDoors({ token: ['Door_1'] });
console.log(doors.length); // always an array
```

Rule of thumb: strip SOAP nesting; scalars/objects when that is all there is; arrays for
repeating elements; keep a wrapper only for paging (`*List`) or multi-field values.

## Events

First `onvif.on('event', ...)` starts a global pull-point (`Events` is eager). Use `eventError`
for pull / reconnect failures; remove listeners or `close()` to stop. For topic filters or another
pull-point, use `Subscription` and `unsubscribe()` yourself (`close()` does not tear those down).

```ts
import { Onvif, Subscription } from 'onvif';

onvif.on('event', (msg) => console.log(msg.topic?._));
onvif.on('eventError', (err) => console.error(err));

const sub = new Subscription(onvif, {
  filter: { topicExpression: [{ expression: 'tns1:RuleEngine/CellMotionDetector/Motion' }] },
});
sub.on('data', (msg) => console.log('motion', msg.topic?._));
await sub.subscribe();
```

More: [events.md](innerDocs/events.md),
[guides.md](innerDocs/guides.md#listen-for-motion-events),
[events.with.filter.ts](examples/events.with.filter.ts).

## Vendor XML

`xs:any` / `xs:anyAttribute` via `xsany` and `$`. Parse gives camelCase **and** a wire tree on
`obj[xsany]`. Setters serialize **`[xsany]` only**. Details:
[vendor-extensions.md](innerDocs/vendor-extensions.md).

## SOAP XML

`build` / `parseSOAPString`, `onvif.request()`, `requestContext`:
[soap-xml.md](innerDocs/soap-xml.md).

## Errors

Typed failures (`OnvifTimeoutError`, `OnvifTransportError`, `OnvifParseError`,
`OnvifResponseError`, `OnvifSoapFaultError`, `OnvifAuthError`, `OnvifValidationError`):
[errors.md](innerDocs/errors.md).

## Troubleshooting / FAQ

Full catalog: [troubleshooting.md](innerDocs/troubleshooting.md). Quirks:
[quirks.md](innerDocs/quirks.md).

- **Auth / Unauthorized after connect** - `connect()` is not a login check; call
  `getDeviceInformation()`. See troubleshooting Auth + [auth.md](innerDocs/auth.md).
- **Empty profiles / no RTSP** - media skipped, wrong bag, or Media2-only. Access-only C/A:
  [Beyond cameras](#beyond-cameras-profiles-c--a--g--m). Else troubleshooting Media / RTSP.
- **RTSP host wrong; SOAP OK with `preserveAddress`** - flag does not rewrite RTSP body URLs.
  See troubleshooting + [`preserveAddress`](#preserveaddress-nat--wrong-xaddr-host-or-port).
- **PTZ AbsoluteMove Fault** - check SupportedPTZSpaces; prefer ContinuousMove.
- **Events stop / process exit** -`eventError`; always `sub.on('error')` on own Subscription.
- **Discovery finds nothing** - `Discovery.on('status')`; bind NIC / family.
- **Timeout ~10 s / process never exits** - raise `timeout`; `close()` / `unsubscribe()`.

## Migration from v0.x

Cheat-sheet (or keep `Cam` via `onvif/compatibility` / `.../promises`):

- `Cam` -> `Onvif` (+ `await connect()` / `close()`)
- Flat `cam.getStreamUri(...)` -> `onvif.media.getStreamUri(...)`, `onvif.ptz.*`, ...
- Unwrapped returns - [What methods return](#what-methods-return)
- `activeSource` -> `activeMediaProfile` + `defaultProfile` for codec/fps

Checklist and diffs: [migration.md](innerDocs/migration.md). Older line:
[branch v0.x](https://github.com/agsh/onvif/tree/v0.x).

## Examples

Samples in [`examples/`](examples/):

- [device.info.js](examples/device.info.js) - device info, hostname, scopes, services
- [media.stream.js](examples/media.stream.js) - profiles, RTSP + snapshot URIs
- [media.snapshot.ts](examples/media.snapshot.ts) - snapshot URI + HTTP Digest download
- [media2.profiles.js](examples/media2.profiles.js) - Profile T Media2 profiles / encoders
- [imaging.settings.js](examples/imaging.settings.js) - imaging settings and options
- [analytics.rules.js](examples/analytics.rules.js) - analytics rules and modules
- [deviceio.relay.js](examples/deviceio.relay.js) - DeviceIO relays / digital inputs
- [door.unlock.js](examples/door.unlock.js) - Profile C/A door unlock / lock
- [rtsp.socketio.ptz.js](examples/rtsp.socketio.ptz.js) - RTSP preview + PTZ over Socket.IO
- [ptz.nodes.js](examples/ptz.nodes.js) - GetNodes / SupportedPTZSpaces
- [ptz.keyboard.js](examples/ptz.keyboard.js) - keyboard ContinuousMove + presets
- [discovery.js](examples/discovery.js) - WS-Discovery (includes `status`)
- [scan.ip.range.js](examples/scan.ip.range.js) - IP range scan
- [proxy.socks5.js](examples/proxy.socks5.js) - SOCKS5 proxy
- [https.digest.mjs](examples/https.digest.mjs) - HTTPS + Digest mock (ESM)
- [events.with.filter.ts](examples/events.with.filter.ts) - topic-filtered events
- [osd.js](examples/osd.js) - on-screen text overlays
- [replay.uri.js](examples/replay.uri.js) - Profile G replay URI
- [compatibility.cjs](examples/compatibility.cjs) /
  [compatibilityPromises.cjs](examples/compatibilityPromises.cjs) - Cam layer

## Device compatibility

Tested against many vendors (issues + lab), including ACTi, Amcrest, Avigilon, Axis, Bosch,
Canon, Dahua, D-Link, Foscam, Hanwha / Wisenet, Hikvision, Panasonic, Pelco, Reolink, Sony,
TP-Link / Tapo, Uniview, Vivotek, and others. Known quirks: [quirks.md](innerDocs/quirks.md).

Report manufacturer / model / firmware via the [compatibility form][compat-form].

[compat-form]: https://docs.google.com/forms/d/e/1FAIpQLSfXsVZv802YFDISGCZaLaJaC_isw2wKQpJ11UurvgO5veYzUw/viewform

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

Thanks to [HappyTimeSoft](https://www.happytimesoft.com/index.html) for
[HappyTime ONVIF Server](https://www.happytimesoft.com/products/onvif-server/index.html)
used in integration tests, to [@RogerHardiman](https://github.com/RogerHardiman) for support
and real-camera testing, and to everyone who filed issues over the years.

[![OBEY!][obey-img]](https://www.onvif.org/resources/)

[obey-img]: https://github.com/user-attachments/assets/8cc43a86-4610-4e1a-8700-3a46aa2c1da3
