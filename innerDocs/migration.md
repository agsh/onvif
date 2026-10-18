# Migration from v0.x

The 1.x `Onvif` API covers all methods available in v0.8. A separate compatibility layer is provided for existing
applications - see [Two APIs](../README.md#two-apis) in the README.

Import it explicitly; it is **not** part of `require('onvif')` / `import { Onvif } from 'onvif'`:

| Entry | Style |
| --- | --- |
| `onvif/compatibility` | callbacks (`Cam`, `Discovery`) |
| `onvif/compatibility/promises` | async/await (`Cam`, `Discovery`) |

**Functional coverage** of the v0.8 `Cam` surface is the goal. **Behavioral compatibility** is close, but not
identical - see [Compatibility notes](#compatibility-notes-known-differences-vs-v08) below.

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

Runnable sample: [compatibility.cjs](https://github.com/agsh/onvif/blob/v1/examples/compatibility.cjs).

## Promises (`onvif/compatibility/promises`)

```js
const { Cam, Discovery } = require('onvif/compatibility/promises');

const cam = new Cam({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });

(async () => {
  await cam.connect();
  console.log(await cam.getDeviceInformation());
})();
```

Runnable sample: [compatibilityPromises.cjs](https://github.com/agsh/onvif/blob/v1/examples/compatibilityPromises.cjs).

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
  `getSnapshotUri()` -> `MediaUri` with `.uri`, not `{ mediaUri: { uri } }`). Callback `Cam`
  remaps the ones v0 apps commonly destructure; the **promises** entry inherits the same shapes
  via the proxy:
  - `setNetworkInterfaces` -> `{ rebootNeeded }` (not a bare boolean)
  - `createOSD` -> `{ OSDToken }` (not a bare token string)
  - `setPreset` -> preset token string (v0 passed through raw SOAP; Cam matches practical 0.8.x usage)
  - `getOSDs` -> `OSD[]` (v0 returned `{ getOSDsResponse: { OSDs } }`)
  - `getOSDOptions` -> options object (v0 returned `{ getOSDOptionsResponse: { OSDOptions } }`)
  - `getStreamUri` / `getSnapshotUri` -> `MediaUri` (use `.uri`; Cam normalizers keep a top-level `.uri`)
- `close()` is available on compatibility `Cam` (callback and promises) even though classic v0.x had no
  equivalent - needed so keep-alive sockets do not keep the process alive after 1.x agent ownership.
- **Active media profile (token bag):** v0.x exposed `cam.activeSource` / `cam.activeSources` with a mix of
  tokens and encoder snapshots (`encoding`, resolution, fps, nested `ptz: { name, token }`). In 1.x the
  modern names are `activeMediaProfile` / `activeMediaProfiles` (on `Onvif` and on compatibility `Cam`).
  Deprecated aliases `activeSource` / `activeSources` / `getActiveSources` still work and point at the
  same objects. The bag is **tokens only** - read codec / resolution / rate control from
  `defaultProfile` (or `profiles`). Switch the current pipeline with
  `setActiveMediaProfile(profileToken)` (callback or Promise Cam). Do not assign bag fields by hand.
  Details: [connection.md#active-media-profile-token-bag](connection.md#active-media-profile-token-bag).
