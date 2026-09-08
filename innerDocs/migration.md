# Migration from v0.x

The 1.x `Onvif` API covers all methods available in v0.8. A separate compatibility layer is provided for existing
applications — see [Two APIs](../README.md#two-apis) in the README.

Import it explicitly; it is **not** part of `require('onvif')` / `import { Onvif } from 'onvif'`:

| Entry | Style |
| --- | --- |
| `onvif/compatibility` | callbacks (`Cam`, `Discovery`) |
| `onvif/compatibility/promises` | async/await (`Cam`, `Discovery`) |

**Functional coverage** of the v0.8 `Cam` surface is the goal. **Behavioral compatibility** is close, but not
identical — see [Compatibility notes](#compatibility-notes-known-differences-vs-v08) below.

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

- no auto-connect — call `await cam.connect()`
- methods return Promises
- getters and `EventEmitter` APIs are forwarded
- `_cam` exposes the underlying callback instance

Both entry points also export `Discovery` (callback or Promise `probe`), matching v0.x usage.
Discovered cams include `xaddrs` (all ProbeMatch XAddrs as `URL[]`).

## Compatibility notes (known differences vs v0.8)

The compatibility `Cam` covers the v0.8 method surface used in practice. Remaining **behavioral** differences:

- `gotoPreset` accepts both `{ presetToken }` (ONVIF / 1.x) and the v0 alias `{ preset }` (sent as PresetToken)
- `rawResponse` may omit the `statusCode` second argument that v0 emitted
- `setNTP(options)` mutates the passed `options` object (fills `NTPManual`) — same as v0.x
- Callbacks match v0.x `(err, data, xml?)`: the third argument is the raw SOAP response XML
  (`Onvif.lastResponseXml`)
- `getPresets` / `cam.presets` follow token → preset (duplicate names kept; 0.8.1+ intent).  
  Note: published `onvif@0.8.2` still returns name → preset from the `getPresets` *callback* while storing
  token → preset on `cam.presets` — compatibility aligns both with the token-keyed shape.
