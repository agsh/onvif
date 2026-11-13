# Migration from v0.x

The 1.x `Onvif` API covers all methods available in v0.8. Existing apps have two paths:

1. **Stay on `Cam`** -- `onvif/compatibility` or `onvif/compatibility/promises` (smallest change).
2. **Move to `Onvif`** -- namespaces, Promises, explicit `connect()` / `close()` (recommended for new
   work).

Import the compatibility layer explicitly; it is **not** part of `require('onvif')` /
`import { Onvif } from 'onvif'`:

- `onvif/compatibility` -- callbacks (`Cam`, `Discovery`)
- `onvif/compatibility/promises` -- async/await (`Cam`, `Discovery`)

**Functional coverage** of the v0.8 `Cam` surface is the goal. **Behavioral compatibility** is close,
but not identical - see [Compatibility notes](#compatibility-notes-known-differences-vs-v08).

README cheat-sheet: [Migration from v0.x](../README.md#migration-from-v0x).

## Choose a path

- **Ship soon / large Cam codebase** -- use compatibility. Call `close()` when done (1.x agents).
  Skim [Compatibility notes](#compatibility-notes-known-differences-vs-v08) for presets, return
  shapes, and `activeSource`.
- **New module or greenfield** -- use `Onvif` from day one. Follow the
  [checklist](#migration-checklist-cam--onvif) and [cookbook diffs](#cookbook-diffs-cam--onvif).
- **Hybrid** -- keep most of the app on `Cam`; rewrite hot paths to `Onvif` one feature at a time.
  Do not mix both clients against the same device in one process unless you understand agent /
  event ownership ([resources.md](resources.md)).

## Migration checklist (`Cam` -> `Onvif`)

Work top-down; each item is a common break when people rewrite call sites:

1. **Install / import** -- `import { Onvif } from 'onvif'` (not `require('onvif')` for `Cam`).
2. **Lifecycle** -- `await onvif.connect()` before services (or `autoConnect: true`);
   `await onvif.close()` so the process can exit.
3. **Namespaces** -- `cam.getDeviceInformation()` -> `onvif.device.getDeviceInformation()`;
   media / ptz / imaging / recording / ... under `onvif.<service>`.
4. **Return unwrap** -- no SOAP wrappers; `getStreamUri` is `MediaUri` (use `.uri`); Media2 stream
   URI is a **string**; lists are always arrays. See [What methods return](../README.md#what-methods-return).
5. **Active media** -- `activeSource` / encoder fields -> `activeMediaProfile` (tokens) +
   `defaultProfile` (codec / resolution). Switch with `setActiveMediaProfile(token)`.
6. **Events** -- `cam.on('event', ...)` still works on Cam; on `Onvif` use `onvif.on('event', ...)`
   and `eventError` (not `eventsError`). Own `Subscription` needs `sub.on('error', ...)`.
7. **Auth** -- same `username` / `password`; `useWSSecurity` defaults true. Digest / time sync:
   [auth.md](auth.md).
8. **Presets** -- token-keyed maps; `gotoPreset({ presetToken })` (Cam still accepts `{ preset }`).
9. **Discovery** -- `Discovery` from `onvif` (1.x) or from the compatibility entry; listen for
   `status` / `error` / `device` as needed.
10. **Smoke test** -- connect, `getDeviceInformation`, `getStreamUri` (or door unlock), one event,
    `close()`. Compare XML with `requestContext` if a shape surprises you ([soap-xml.md](soap-xml.md)).

## Cookbook diffs (`Cam` -> `Onvif`)

### Connect and device info

```js
// v0 / compatibility (callback)
const { Cam } = require('onvif/compatibility');
new Cam({ hostname, username, password }, (err) => {
  if (err) throw err;
  cam.getDeviceInformation((e, info) => console.log(info));
});

// 1.x Onvif
import { Onvif } from 'onvif';
const onvif = new Onvif({ hostname, username, password });
await onvif.connect();
console.log(await onvif.device.getDeviceInformation());
await onvif.close();
```

### Stream URI

```js
// Cam (callback data is MediaUri-like with .uri after compatibility remaps)
cam.getStreamUri({ protocol: 'RTSP' }, (err, stream) => console.log(stream.uri));

// Onvif Media 1.0
const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
console.log(stream.uri);

// Onvif Media2 (string)
const uri = await onvif.media2.getStreamUri({ protocol: 'RtspUnicast' });
```

Recipe: [guides.md](guides.md#get-an-rtsp-uri).

### Presets

```js
// Cam / Onvif ptz -- token -> preset (not name -> preset)
const presets = await onvif.ptz.getPresets();
// Object.keys(presets) are preset tokens
await onvif.ptz.gotoPreset({ presetToken: Object.keys(presets)[0] });
// Cam alias still accepted: { preset: token }
```

If you still key by display name, build your own map from `preset.name` -- do not assume the
0.8.2 callback name-keyed shape.

### Events

```js
// Cam (compatibility forwards eventError)
cam.on('event', handler);
cam.on('eventError', console.error);

// Onvif
onvif.on('event', handler);
onvif.on('eventError', console.error);
```

Filtered pull-point: `Subscription` + `sub.on('error', ...)` -- [events.md](events.md),
[guides.md](guides.md#listen-for-motion-events).

### Active source / profile bag

```js
// v0-style (deprecated aliases still work on Cam / Onvif)
cam.activeSource.sourceToken;
cam.activeSource.encoding; // gone from the bag in 1.x

// 1.x
onvif.activeMediaProfile?.sourceToken;
onvif.defaultProfile?.videoEncoderConfiguration?.encoding;
await onvif.setActiveMediaProfile(profileToken);
```

Details: [connection.md](connection.md#active-media-profile-token-bag).

## Callbacks (`onvif/compatibility`)

```js
const { Cam, Discovery } = require('onvif/compatibility');

const cam = new Cam(
  { hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' },
  (error) => {
    if (error) throw error;
    cam.getDeviceInformation((err, info) => {
      if (err) throw err;
      console.log(info);
    });
  },
);
```

Runnable sample: [compatibility.cjs](https://github.com/agsh/onvif/blob/master/examples/compatibility.cjs).

## Promises (`onvif/compatibility/promises`)

```js
const { Cam, Discovery } = require('onvif/compatibility/promises');

const cam = new Cam({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });

(async () => {
  await cam.connect();
  console.log(await cam.getDeviceInformation());
})();
```

Runnable sample:
[compatibilityPromises.cjs](https://github.com/agsh/onvif/blob/master/examples/compatibilityPromises.cjs).

The promisified `Cam` wraps the callback implementation:

- no auto-connect - call `await cam.connect()`
- methods return Promises (same callback `data` shapes - including remaps like `{ rebootNeeded }` / `{ OSDToken }`)
- getters and `EventEmitter` APIs are forwarded (not wrapped as Promises)
- `_cam` exposes the underlying callback instance
- `await cam.close()` releases keep-alive / Events agents (forwards `Onvif.close`; reopen with `connect()`)

Both entry points also export `Discovery` (callback or Promise `probe`), matching v0.x usage.
Discovered cams include `xaddrs` (all ProbeMatch XAddrs as `URL[]`).

## Compatibility notes (known differences vs v0.8)

The compatibility `Cam` covers the v0.8 method surface used in practice. Remaining **behavioral** differences:

- `gotoPreset` accepts both `{ presetToken }` (ONVIF / 1.x) and the v0 alias `{ preset }` (sent as PresetToken)
- `rawResponse` may omit the `statusCode` second argument that v0 emitted
- `setNTP(options)` mutates the passed `options` object (fills `NTPManual`) - same as v0.x
- Callbacks match v0.x `(err, data, xml?)`: the third argument is the raw SOAP response XML
  for that call (via `requestContext` AsyncLocalStorage; safe under parallel `Cam` method calls).
  For the modern `Onvif` API, wrap a call in `requestContext.run(store, () => ...)` and read
  `store.requestXml` / `store.responseXml` - see [soap-xml.md](soap-xml.md).
- `getPresets` / `cam.presets` follow token -> preset (duplicate names kept; 0.8.1+ intent).  
  Note: published `onvif@0.8.2` still returns name -> preset from the `getPresets` *callback* while storing
  token -> preset on `cam.presets` - compatibility aligns both with the token-keyed shape.
- **Return shapes after 1.x unwrap:** the modern `Onvif` API often returns a single useful value
  (boolean / token / array). Multi-field values stay as objects (e.g. `media.getStreamUri()` /
  `getSnapshotUri()` -> `MediaUri` with `.uri`, not `{ mediaUri: { uri } }`). Media2 stream/snapshot
  methods unwrap further to an `AnyURI` string. Callback `Cam` remaps the ones v0 apps commonly
  destructure; the **promises** entry inherits the same shapes via the proxy:
  - `setNetworkInterfaces` -> `{ rebootNeeded }` (not a bare boolean)
  - `createOSD` -> `{ OSDToken }` (not a bare token string)
  - `setPreset` -> preset token string (v0 passed through raw SOAP; Cam matches practical 0.8.x usage)
  - `getOSDs` -> `OSD[]` (v0 returned `{ getOSDsResponse: { OSDs } }`)
  - `getOSDOptions` -> options object (v0 returned `{ getOSDOptionsResponse: { OSDOptions } }`)
  - `getStreamUri` / `getSnapshotUri` -> `MediaUri` (use `.uri`; Cam normalizers keep a top-level `.uri`)
- `close()` is available on compatibility `Cam` (callback and promises) even though classic v0.x had no
  equivalent - needed so keep-alive sockets do not keep the process alive after 1.x agent ownership.
- **Event subscription errors:** listen for `eventError` (was `eventsError` in earlier 1.x drafts /
  docs). Same name on `Onvif` and compatibility `Cam`; constant `Onvif.EVENT_ERROR`.
- **Active media profile (token bag):** v0.x exposed `cam.activeSource` / `cam.activeSources` with a mix of
  tokens and encoder snapshots (`encoding`, resolution, fps, nested `ptz: { name, token }`). In 1.x the
  modern names are `activeMediaProfile` / `activeMediaProfiles` (on `Onvif` and on compatibility `Cam`).
  Deprecated aliases `activeSource` / `activeSources` / `getActiveSources` still work and point at the
  same objects. The bag is **tokens only** - read codec / resolution / rate control from
  `defaultProfile` (or `profiles`). Switch the current pipeline with
  `setActiveMediaProfile(profileToken)` (callback or Promise Cam). Do not assign bag fields by hand.
  Details: [connection.md#active-media-profile-token-bag](connection.md#active-media-profile-token-bag).
- **Active entity tokens (non-media):** 1.x also sets `activeDoorToken`, `activeAccessPointToken`,
  `activeRecordingToken` / `activeRecordingJobToken`, and `activeRelayOutputToken` during
  `connect()` when those services are advertised. Omit-token DoorControl / AccessControl /
  Recording / Replay / Search / DeviceIO relay calls use them. Switch with `setActiveDoor`,
  `setActiveAccessPoint`, `setActiveRecording`, `setActiveRecordingJob`, `setActiveRelayOutput`.
  Details: [connection.md#active-entity-tokens-non-media](connection.md#active-entity-tokens-non-media).
