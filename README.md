# ONVIF

[![Coverage Status](https://raw.githubusercontent.com/agsh/onvif/refs/heads/gh-pages/badges/coverage.svg)](https://github.com/agsh/onvif/tree/master)

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
ESM `import` loads the same CJS build via `exports.import` — examples: [Quick start](#quick-start).

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

### Deep docs

Longer notes in [`innerDocs/`](https://github.com/agsh/onvif/tree/master/innerDocs) (not shipped in the npm tarball):

- [connection.md](https://github.com/agsh/onvif/blob/master/innerDocs/connection.md) -- connect lifecycle,
  `activeMediaProfile`, entity tokens, `preserveAddress`
- [events.md](https://github.com/agsh/onvif/blob/master/innerDocs/events.md) -- pull-point, push, filters,
  reconnect
- [performance.md](https://github.com/agsh/onvif/blob/master/innerDocs/performance.md) -- lazy loading,
  footprint, Promise / proxy walkthrough
- [resources.md](https://github.com/agsh/onvif/blob/master/innerDocs/resources.md) -- agents, timers,
  `close()` / Subscription ownership
- [errors.md](https://github.com/agsh/onvif/blob/master/innerDocs/errors.md) -- typed errors and SOAP Faults
- [soap-xml.md](https://github.com/agsh/onvif/blob/master/innerDocs/soap-xml.md) -- `build` / parse /
  `request` / `requestContext`
- [vendor-extensions.md](https://github.com/agsh/onvif/blob/master/innerDocs/vendor-extensions.md) --
  `xs:any` / `xsany`
- [migration.md](https://github.com/agsh/onvif/blob/master/innerDocs/migration.md) -- v0.x `Cam` compatibility
- [testing.md](https://github.com/agsh/onvif/blob/master/innerDocs/testing.md) -- Jest, HappyTime mock server,
  `npm test`
- [quirks.md](https://github.com/agsh/onvif/blob/master/innerDocs/quirks.md) -- vendor / firmware quirks
  (Hik, Pelco, Tapo, NVR stubs, ...)

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
[rtsp.socketio.ptz.js](https://github.com/agsh/onvif/blob/master/examples/rtsp.socketio.ptz.js).

<video src="https://github.com/user-attachments/assets/fd725700-f60e-4c3b-ba2d-bdf2d07b3376" controls></video>

## Features

- Typed request/response interfaces from the latest ONVIF WSDL (26.06)
  ([onvif-generate-interfaces](https://github.com/agsh/onvif-generate-interfaces))
- [API documentation](https://agsh.github.io/onvif/)
- Events: pull-point, WS-BaseNotification, filters, `EventEmitter` -
  [innerDocs/events.md](https://github.com/agsh/onvif/blob/master/innerDocs/events.md)
- Lazy-loaded services -
  [innerDocs/performance.md](https://github.com/agsh/onvif/blob/master/innerDocs/performance.md)
- Auth: WS-Security, Digest (MD5 / SHA-1 / SHA-256 / SHA-512-256); Advanced Security (experimental)
- WS-Discovery on the LAN - see [Discovery](#discovery)
- Vendor XML extensions (`xs:any` / `xs:anyAttribute`) -
  [innerDocs/vendor-extensions.md](https://github.com/agsh/onvif/blob/master/innerDocs/vendor-extensions.md)
- SOAP XML (`build` / `parseSOAPString` / `request` / `requestContext`) -
  [innerDocs/soap-xml.md](https://github.com/agsh/onvif/blob/master/innerDocs/soap-xml.md)
- Typed errors (timeout / transport / parse / SOAP Fault 1.1+1.2) -
  [innerDocs/errors.md](https://github.com/agsh/onvif/blob/master/innerDocs/errors.md)
- Default Media Profile token bag (`activeMediaProfile` / `setActiveMediaProfile`) - see
  [Connection](#default-media-profile-activemediaprofile)
- Default tokens for door / access / recording / relay - see
  [connection.md](https://github.com/agsh/onvif/blob/master/innerDocs/connection.md#active-entity-tokens-non-media)
- Services - see [Services](#services)

## Constructor options

Address the device with `url` **or** `hostname` / `port` / `path` / `useSecure`, plus
`username` / `password`. Other common flags:

- `timeout` -- HTTP socket timeout for ordinary SOAP (ms; default 10000). PullMessages uses its own
- `useWSSecurity` -- SOAP PasswordDigest headers (default `true`; HTTP Digest still applies)
- `autoConnect` -- call `connect()` from the constructor (default `false`)
- `agent` -- custom `http(s).Agent`, proxy agent, or `false` (see
  [resources.md](https://github.com/agsh/onvif/blob/master/innerDocs/resources.md))
- `preserveAddress` -- rewrite XAddr host/port to the constructor address (NAT / loopback); see
  [`preserveAddress`](#preserveaddress-nat--wrong-xaddr-host-or-port)
- `secureOptions` -- TLS options when using HTTPS
- `defaultMedia` -- default for `connect({ media })` when omitted (Discovery may set `false`)

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
need to verify username/password early. Details:
[innerDocs/connection.md](https://github.com/agsh/onvif/blob/master/innerDocs/connection.md).

### Default Media Profile (`activeMediaProfile`)

After media discovery, omitted `profileToken` / source tokens default from the token bag
`onvif.activeMediaProfile` (tokens only; codec/fps live on `onvif.defaultProfile`). Switch with
`setActiveMediaProfile(profileToken)`:

```ts
await onvif.setActiveMediaProfile('ProfileToken_2');
const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
```

H.264 vs H.265, multi-source bags, and rebuild rules:
[connection.md](https://github.com/agsh/onvif/blob/master/innerDocs/connection.md#active-media-profile-token-bag).

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
[innerDocs/resources.md](https://github.com/agsh/onvif/blob/master/innerDocs/resources.md).

## Discovery

Find ONVIF devices on the LAN with WS-Discovery (`Discovery.probe`). Each match is an
[`Onvif`](https://agsh.github.io/onvif/classes/Onvif.html) instance (set credentials, then `connect()`).
`probe()` always resolves (possibly `[]`); bad replies and socket issues emit `error` only.
Informational progress uses `status` (NIC enumeration and each Probe send) -- useful when
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

- **Dual-stack by default** -- Probe from every non-loopback IPv4 and IPv6 address on every NIC
  (`239.255.255.250` / `FF02::C`, port `3702`). Pass `type: 'udp4' | 'udp6'` to limit the family;
  omit `type` for both.
- **IPv6 link-local bind** -- zone id is attached for `fe80::` binds (`%eth0` on Unix,
  numeric `%scopeid` on Windows).
- **Multi-homed / directed Probe** -- optional `device` (one NIC), or `address` + `port` for a
  unicast Probe still sent from each selected local address.
- **`status` diagnostics** -- `Discovery.on('status', ...)` gets human-readable lines while
  interfaces are listed and Probes are sent (not errors). See the sample below.
- **Dedup & filtering** -- devices are keyed by ProbeMatch `EndpointReference` (same NVT on
  IPv4+IPv6 -> one result); `RelatesTo` / MessageID drops replies meant for another client's Probe;
  `types` / `scopes` narrow the Probe; ProbeMatch scopes set `defaultMedia` (`false` for
  access-only Profile C/A without Streaming/T).
- **Other options** -- `timeout`, `bufferSize`, `listeningPort`, `resolve: false` (raw ProbeMatch
  instead of `Onvif`).

Runnable sample (includes `status`):
[discovery.js](https://github.com/agsh/onvif/blob/master/examples/discovery.js).

## Services

Methods take typed ONVIF request options. Return values are simplified (unwrapped) — see
[What methods return](#what-methods-return). Some helpers also accept more convenient input fields
(for example `dateTime?: Date` on `SetSystemDateAndTimeExtended`).

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
| [Uplink](https://agsh.github.io/onvif/interfaces/Uplink.html) | `onvif.uplink` | - |
| [AppManagement](https://agsh.github.io/onvif/interfaces/AppManagement.html) | `onvif.appManagement` | - |
| [AdvancedSecurity](https://agsh.github.io/onvif/interfaces/AdvancedSecurity.html) | `onvif.advancedSecurity` | - |

### What methods return

ONVIF SOAP replies are nested wrappers (`GetFooResponse` → `Foo` → …). This library unwraps them so you get the useful value directly — the simplest type that still carries everything you need.

- One useful field → that value alone.
  `systemReboot()` → `"Rebooting"`; `media2.getStreamUri()` → `"rtsp://…"`; `createDoor()` → token string.
- Several useful fields → one plain object (not a SOAP envelope).
  `getDeviceInformation()` → `{ manufacturer, model, … }`; `media.getStreamUri()` → `MediaUri` (`uri`, `invalidAfterConnect`, …).
- Lists → always an array, even when the camera returns a single item (or none).
  XML with one `<Door>` would otherwise become a lone object; the parser’s `array` option forces `Door[]` / `[]` instead.
  Same for `getProfiles()`, `getDoors({ token })`, `getAccessPoints({ token })`, `device.getServices()`, …
- Paginated `*List` methods keep the list envelope so you can page: `{ door?, nextStartReference? }`, …

```ts
// Media 1.0 — MediaUri object (uri + validity fields)
const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
console.log(stream.uri);

// Media 2 — WSDL has only Uri, so you get the string
const uri = await onvif.media2.getStreamUri({ protocol: 'RtspUnicast' });
console.log(uri);

// Lists are arrays even for one match
const doors = await onvif.doorControl.getDoors({ token: ['Door_1'] });
console.log(doors.length); // 1, not a bare Door object

const info = await onvif.device.getDeviceInformation();
console.log(info.manufacturer, info.model);
```

Rule of thumb: strip SOAP nesting; return a scalar or a single object when that is all there is; return arrays for repeating elements (never collapse one element to a non-array); keep a wrapper only for paging (`*List`) or multi-field values that belong together.

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

Pull-point reconnect, push / WS-BaseNotification, `AbortSignal`:
[innerDocs/events.md](https://github.com/agsh/onvif/blob/master/innerDocs/events.md).
Runnable sample:
[events.with.filter.ts](https://github.com/agsh/onvif/blob/master/examples/events.with.filter.ts).

## Vendor XML

ONVIF `xs:any` / `xs:anyAttribute` extension points are exposed via `xsany` and `$`.
After parse you get a camelCase view **and** a wire tree on `obj[xsany]`. Setters serialize **`[xsany]` only**.

Details:
[innerDocs/vendor-extensions.md](https://github.com/agsh/onvif/blob/master/innerDocs/vendor-extensions.md).

## SOAP XML

`build` / `parseSOAPString`, public `onvif.request()`, and per-call `requestContext` request/response
capture:
[innerDocs/soap-xml.md](https://github.com/agsh/onvif/blob/master/innerDocs/soap-xml.md).

## Errors

`OnvifTimeoutError`, `OnvifTransportError`, `OnvifParseError`, `OnvifResponseError`,
`OnvifSoapFaultError` (SOAP 1.1 + 1.2 normalized), `OnvifAuthError`, `OnvifValidationError` -
details:
[innerDocs/errors.md](https://github.com/agsh/onvif/blob/master/innerDocs/errors.md).

## Troubleshooting / FAQ

- **Auth fail / SOAP Unauthorized** -- wrong `username`/`password`, or Digest vs WS-Security mismatch.
  Prefer Digest algorithms the camera advertises (MD5 / SHA-1 / SHA-256 / SHA-512-256).
  `connect()` is not a login check - call `device.getDeviceInformation()` to verify credentials.
  See [Errors](https://github.com/agsh/onvif/blob/master/innerDocs/errors.md).
- **Media2-only device (no Media1)** -- `connect()` falls back to Media2 for profiles when Media1 is
  missing or fails; use `onvif.media2` for Profile T stream/snapshot APIs (`getStreamUri` returns a
  URI string). Check `onvif.media2Support` and
  [media2.profiles.js](https://github.com/agsh/onvif/blob/master/examples/media2.profiles.js).
- **Empty profiles / no RTSP after connect** -- pass `{ media: true }` (default) so profiles load, or
  pick a Media Profile via [activeMediaProfile](#default-media-profile-activemediaprofile). Use
  `connect({ media: false })` only for door stations / reachability sweeps (skips Media probing).
- **NAT / wrong XAddr host or port** -- set `preserveAddress: true` so service and subscription URLs
  use the constructor host/port; see [`preserveAddress`](#preserveaddress-nat--wrong-xaddr-host-or-port).
- **Node.js process does not exit** -- call `await onvif.close()`; also `unsubscribe()` any extra
  `Subscription` you created. See
  [resources.md](https://github.com/agsh/onvif/blob/master/innerDocs/resources.md).
- **Calls time out at ~10 s** -- default `timeout` is 10000 ms for ordinary SOAP. Raise
  `new Onvif({ timeout: ... })` for slow devices. PullMessages uses its own longer wait.
  See [Constructor options](#constructor-options).
- **PTZ SOAP Fault** -- AbsoluteMove is optional; check GetNodes / SupportedPTZSpaces first:
  [ptz.nodes.js](https://github.com/agsh/onvif/blob/master/examples/ptz.nodes.js).
- **Events stopped arriving** -- PullPoint reconnect / `eventError`;
  [Events](https://github.com/agsh/onvif/blob/master/innerDocs/events.md).

## Migration from v0.x

Cheat-sheet for the modern API (or keep `Cam` via `onvif/compatibility` /
`onvif/compatibility/promises`):

- `Cam` -> `Onvif` (+ explicit `await connect()` / `close()`)
- Flat `cam.getStreamUri(...)` -> namespaces: `onvif.media.getStreamUri(...)`, `onvif.ptz.*`, ...
- Return values are unwrapped (scalar / object / always-array lists; see [What methods return](#what-methods-return))
- `activeSource` / encoder snapshots -> token bag `activeMediaProfile` + `defaultProfile` for codec/fps

Details and behavioral notes:
[innerDocs/migration.md](https://github.com/agsh/onvif/blob/master/innerDocs/migration.md).
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
- [ptz.nodes.js](https://github.com/agsh/onvif/blob/master/examples/ptz.nodes.js) -
  GetNodes / SupportedPTZSpaces (which move types exist)
- [ptz.keyboard.js](https://github.com/agsh/onvif/blob/master/examples/ptz.keyboard.js) -
  keyboard ContinuousMove + presets
- [discovery.js](https://github.com/agsh/onvif/blob/master/examples/discovery.js) - WS-Discovery
- [scan.ip.range.js](https://github.com/agsh/onvif/blob/master/examples/scan.ip.range.js) - IP range scan
- [proxy.socks5.js](https://github.com/agsh/onvif/blob/master/examples/proxy.socks5.js) - SOCKS5 proxy
- [https.digest.mjs](https://github.com/agsh/onvif/blob/master/examples/https.digest.mjs) -
  HTTPS + Digest (SHA-1 / SHA-256 / SHA-512-256) with in-process mock (ESM)
- [events.with.filter.ts](https://github.com/agsh/onvif/blob/master/examples/events.with.filter.ts) - events with topic filters
- [osd.js](https://github.com/agsh/onvif/blob/master/examples/osd.js) - on-screen text overlays
- [replay.uri.js](https://github.com/agsh/onvif/blob/master/examples/replay.uri.js) - Profile G replay URI

Compatibility-layer demos: [`compatibility.cjs`](https://github.com/agsh/onvif/blob/master/examples/compatibility.cjs), [`compatibilityPromises.cjs`](https://github.com/agsh/onvif/blob/master/examples/compatibilityPromises.cjs).

## Device compatibility

Tested and quirk-fixed against real devices from many vendors (closed GitHub issues and lab use), including
[360 Vision Technology Predator](https://www.360visiontechnology.com/predator/), ACTi, Amcrest, Avigilon,
Axis, Bosch, Canon, Dahua, D-Link, Foscam, Hanwha / Wisenet, Hikvision, Panasonic, Pelco, Reolink, Sony,
Sricam, TP-Link / Tapo, Tyco, Uniview, Vivotek, and others.

Known quirks (Hik dual Digest, Pelco GetStreamUri, NVR stub profiles, Tapo C220 PullMessages, ...):
[innerDocs/quirks.md](https://github.com/agsh/onvif/blob/master/innerDocs/quirks.md).

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
