# Migration from v0.x

Use the **0.x compatibility API** if you are not ready to switch to `Onvif` yet — see
[Two APIs](../README.md#two-apis) in the README.
Import it explicitly (`onvif/compatibility` or `onvif/compatibility/promises`); it is not part of the main export.

### Callbacks (`onvif/compatibility`)

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

See [compatibility.cjs](https://github.com/agsh/onvif/blob/master/examples/compatibility.cjs).

### Promises (`onvif/compatibility/promises`)

```js
const { Cam, Discovery } = require('onvif/compatibility/promises');

const cam = new Cam({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });

(async () => {
  await cam.connect();
  console.log(await cam.getDeviceInformation());
})();
```

See [compatibilityPromises.cjs](https://github.com/agsh/onvif/blob/master/examples/compatibilityPromises.cjs).

The promisified `Cam` wraps the callback implementation: no auto-connect (call `await cam.connect()`),
methods return Promises, getters and EventEmitter APIs are forwarded, and `_cam` exposes the underlying instance.

Both compatibility entry points also export `Discovery` (callback or Promise `probe`), matching v0.x usage.
Discovered cams include `xaddrs` (all ProbeMatch XAddrs as `URL[]`).

### Compatibility notes (known differences vs v0.8)

The compatibility `Cam` aims to cover the v0.8 surface used in practice. Known behavioral differences:

- `gotoPreset` accepts both `{ presetToken }` (ONVIF / 1.x) and the v0 alias `{ preset }` (sent as PresetToken)
- `rawResponse` may omit the `statusCode` second argument that v0 emitted
- `setNTP(options)` mutates the passed `options` object (fills `NTPManual`) — same as v0.x
Callbacks match v0.x `(err, data, xml?)`: the third argument is the raw SOAP response XML from the underlying request
(`Onvif.lastResponseXml`).
`getPresets` / `cam.presets` follow token → preset (duplicate names kept; 0.8.1+ intent).
Note: published `onvif@0.8.2` still returns name → preset from the `getPresets` *callback* while storing token → preset
on `cam.presets` — compatibility aligns both with the token-keyed shape.
