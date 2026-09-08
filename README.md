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
- [v0.x compatibility layer](https://github.com/agsh/onvif/blob/master/src/compatibility/cam.ts)

> [!TIP]
> **Looking for stable 0.x / 0.8?** This page is for **1.x** (release candidate).  
> README and docs for the default npm install: [branch v0.x](https://github.com/agsh/onvif/tree/v0.x).  
> Staying on 0.x while trying 1.x? Use the [0.x compatibility API](#two-apis).

[![ONVIF](https://github.com/user-attachments/assets/f58fb3c8-6bf6-406c-bcc7-883c1da33c5d)](http://onvif.org)

## Installation

Requires Node.js 18+.

**For new projects, use 1.x.**  
**For existing 0.x projects, keep using the [0.x compatibility API](#two-apis) or migrate to the 1.x `Onvif` API** —
see [innerDocs/migration.md](innerDocs/migration.md).

### 1.x release candidate

```shell
npm install onvif@rc
```

This README describes 1.x. The package is still on the release-candidate channel until 1.0 is published.

### Stable 0.x

```shell
npm install onvif
```

Default `npm install onvif` still resolves to stable **0.x**. README for that line:
[branch v0.x](https://github.com/agsh/onvif/tree/v0.x).

## Documentation

API reference (TypeDoc): **[https://agsh.github.io/onvif/](https://agsh.github.io/onvif/)** —
start from the [`Onvif`](https://agsh.github.io/onvif/classes/Onvif.html) class.

The main entry is `Onvif`. After `connect()`, call methods on service namespaces. Most namespaces are
**lazy-loaded** on first use; `events` is constructed eagerly.

```text
Onvif
├── connect() / request()          # handshake + raw SOAP
├── device                         # Device management (lazy)
├── media / media2                 # Profiles S / T media (lazy)
├── ptz                            # Pan-tilt-zoom (lazy)
├── events                         # Pull-point / WS-BaseNotification (eager)
├── imaging                        # Imaging settings (lazy)
├── recording / replay / search    # Profile G NVR (lazy)
├── receiver                       # Stream receivers (lazy)
├── analytics / analyticsDevice    # Analytics (lazy)
├── deviceIO / display / actionEngine
├── thermal / provisioning
├── doorControl / accessControl / credential / accessRules / schedule
└── advancedSecurity               # TLS / keystore (experimental, lazy)
```

Also exported: [`Discovery`](https://agsh.github.io/onvif/variables/Discovery.html) (WS-Discovery on the LAN),
and the separate [0.x compatibility](#two-apis) entry points.

## Why 1.x?

Version 1.x is a redesign of the original JavaScript API:

- TypeScript-first API with generated ONVIF interfaces
- Native Promise-based methods
- Lazy-loaded services
- More ONVIF services than 0.x (media2, access control, thermal, …)
- Improved error handling
- Explicit support for vendor-specific XML extensions (`xs:any` / `xs:anyAttribute`) — [innerDocs/vendor-extensions.md](innerDocs/vendor-extensions.md)
- Optional compatibility layer for existing 0.x applications

## Two APIs

**New API ≠ compatibility API.** Pick one surface and stick to it.

| | 1.x API | 0.x compatibility API |
| --- | --- | --- |
| Import | `import { Onvif } from 'onvif'` | `require('onvif/compatibility')` or `…/promises` |
| Type | `Onvif` + service namespaces | `Cam` / `Discovery` (v0.x shape) |
| For | new projects | existing `Cam`-based apps |

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });
await onvif.connect();
await onvif.media.getProfiles();
```

Compatibility import paths, full examples, and known behavioral differences:
[innerDocs/migration.md](innerDocs/migration.md).

## Quick start

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });
await onvif.connect();
const info = await onvif.device.getDeviceInformation();
console.log(info);
```

Same import works from CommonJS (`require('onvif')`) and ESM. Call `connect()` before service methods
(or pass `autoConnect: true`).

### Example project

Special teasing example how to create little funny video server (http://localhost:6147) with 1 ffmpeg and 3 node.js libraries:
[333702629-e816fed6-067a-4f77-b3f5-ccd9d5ff1310.webm](https://github.com/user-attachments/assets/fd725700-f60e-4c3b-ba2d-bdf2d07b3376)

```shell
sudo apt install ffmpeg
npm install onvif@rc socket.io rtsp-ffmpeg
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
const { Onvif } = require('onvif'),
  io = require('socket.io')(server),
  rtsp = require('rtsp-ffmpeg');
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
- Integration tests against [HappyTimeSoft ONVIF server](https://www.happytimesoft.com/products/onvif-server/index.html)
- Events: pull-point, WS-BaseNotification, filters, `EventEmitter` — see [innerDocs/events.md](innerDocs/events.md)
- Lazy-loaded services — see [Performance / lazy loading](#performance--lazy-loading)
- Auth: WS-Security, Digest; Advanced Security (experimental)
- WS-Discovery on the LAN
- Implemented services — `Device`, `Events`, `Media`, `Media2`, `PTZ`, `Imaging`, `Analytics`,
  `AnalyticsDevice`, `Recording`, `Replay`, `Search`, `Receiver`, `DeviceIO`, `Display`, `Action Engine`,
  `Thermal`, `DoorControl`, `AccessControl`, `Credential`, `AccessRules`, `Schedule`, `Provisioning`,
  `AdvancedSecurity`
- The following services currently have interfaces but no high-level implementation:
  AuthenticationBehavior, Application Management (appmgmt), Uplink, FederatedSearch
  (from the [ONVIF Network Interface Specifications](https://www.onvif.org/profiles/specifications/))
- Optional v0.x compatibility entry points — see [Two APIs](#two-apis)


---

# Connection

Before most methods work, call `connect()` on your `Onvif` instance. It handshakes with the device and fills
internal state so later SOAP requests are authenticated and routed to the correct endpoints.

`connect()` runs these steps in order:

1. **Time synchronization** — `getSystemDateAndTime()` first. ONVIF WS-Security includes a timestamp in the nonce
   digest, so the client needs the clock offset (`timeShift`). The library tries an unauthenticated request first
   (allowed by the spec) and retries with credentials when needed (some Panasonic and Digital Barriers models).
2. **Service discovery** — `GetServices` (Profile T) via a small `connection` helper, without loading the full
   `device` module. On older devices it falls back to `GetCapabilities`. Both populate `onvif.uri` with media, PTZ,
   events, replay, and other service URLs.
3. **Media configuration** (only if the device advertises Media) — `GetProfiles` and `GetVideoSources` in parallel,
   then `getActiveSources()` matches video sources to profiles. Sets `activeSource`, `defaultProfile`, and
   `defaultProfiles`. Devices without video (e.g. Profile C door stations) skip this when Media is absent.
   If Media is listed but a call fails (e.g. Axis A1601 “Optional action not implemented”), `connect()` still
   succeeds with empty `profiles` / `videoSources` and emits `warn`.

On success, `connect()` emits `connect` and returns the instance. See [Quick start](#quick-start) for a minimal example.

---

# Services

Methods take typed ONVIF request options and return the corresponding response data (often unwrapped when there is a
single property). Some helpers accept more convenient fields (for example `dateTime?: Date` on
`SetSystemDateAndTimeExtended`).

See the [API documentation](https://agsh.github.io/onvif/) for per-service methods.

---

# Events

Pull-point and WS-BaseNotification subscriptions, topic filters, and `EventEmitter` integration.

```ts
onvif.on('event', (msg) => console.log(msg));
```

Full guide (including `Subscription` and push notifications): [innerDocs/events.md](innerDocs/events.md).

---

# Vendor XML

ONVIF schemas use `xs:any` / `xs:anyAttribute` extension points. This library exposes them via `xsany` and `$`
so vendor-specific XML can be read and written without losing data.

Details and camera examples: [innerDocs/vendor-extensions.md](innerDocs/vendor-extensions.md).

---

# Migration from v0.x

The 1.x API covers all methods available in v0.8. A separate compatibility layer is provided for existing
applications — **functional coverage**, not bit-identical behavior.

Full guide with callback / Promise examples and known differences:
[innerDocs/migration.md](innerDocs/migration.md).

---

# Examples

Additional samples are in the [`examples`](https://github.com/agsh/onvif/tree/v1/examples) folder.

- Compatibility walkthrough (preferred over reading the `.cjs` files alone): [innerDocs/migration.md](innerDocs/migration.md)
- [events.with.filter.ts](https://github.com/agsh/onvif/blob/v1/examples/events.with.filter.ts)
- [example.js](https://github.com/agsh/onvif/blob/master/examples/example.js) … [example8.js](https://github.com/agsh/onvif/blob/master/examples/example8.js) (legacy / mixed; some still target 0.x)

---

# Performance / lazy loading

In 1.x you only pay for the ONVIF services you actually use.

| | 0.x | 1.x |
| --- | --- | --- |
| Service loading | eager | lazy |
| TypeScript | — | ✓ |
| Typed WSDL interfaces | — | ✓ |
| Promise API | compatibility / wrappers | native |
| Large services loaded at startup | ✓ | — |

### How loading works

- Service namespaces (`onvif.device`, `onvif.media`, `onvif.ptz`, `onvif.thermal`, …) are lazy proxies.
  The corresponding module is loaded the first time you call a method on it (for example `await onvif.ptz.getNodes()`).
- `connect()` uses dedicated helpers in `connection.ts` for the handshake SOAP (`GetServices` /
  `GetCapabilities`, Media `GetProfiles` / `GetVideoSources`). It does not load the full `device` / `media` /
  `media2` class modules. Profiles and video sources are stored on the `Onvif` instance; when `Media` is later
  loaded, it reuses that cache.
- `Events` is constructed eagerly (needed for `onvif.on('event', …)`). Everything else stays deferred.

### Practical tips

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect(); // handshake only — no full Media/Device class modules yet

const info = await onvif.device.getDeviceInformation(); // loads device.js on first use
const uri = await onvif.media.getStreamUri({ protocol: 'RTSP' }); // loads media.js on first use
// onvif.thermal is never loaded unless you call it
```

### Runtime heap (HappyTime ONVIF server)

Measured against [happytime-onvif-server](https://github.com/agsh/happytime-onvif-server) on Node.js 24
(`heapUsed` after GC; illustrative):

| Library | Core | Partial | All |
| --- | ---: | ---: | ---: |
| onvif 1.x | ~6.2 MiB | ~7.0 MiB | ~7.5 MiB |
| [onvif 0.8](https://github.com/agsh/onvif/tree/v0.x) | ~6.3 MiB | ~6.8 MiB | ~6.9 MiB |
| [node-onvif](https://github.com/GuilhermeC18/node-onvif) | ~6.5 MiB | ~6.5 MiB | ~6.5 MiB |
| [@2bad/onvif](https://github.com/2BAD/onvif) (a fork of an earlier version of onvif 1.0) | ~8.9 MiB | ~9.1 MiB | ~9.1 MiB |

- **Core** — `connect()` + device information  
- **Partial** — + media / PTZ / discovery (`media2` where available)  
- **All** — every service module that library exposes (1.x covers 20+ services)

Lazy loading mainly helps the **Core** path: 1.x stays close to the memory footprint of 0.8 when only Device
is used, and grows as additional services are accessed. Compiled JS sizes and methodology notes:
[innerDocs/performance.md](innerDocs/performance.md).

---

# Development

```bash
git clone https://github.com/agsh/onvif.git
cd onvif
npm install
npm run build
npm run lint
npm test
```

- `npm test` — lint, start the HappyTime mock ONVIF server, run Jest, stop the server
- `npm run test-local` — Jest only (expects a server already on the configured host/port)
- `npm run build` / `npm run lint` — TypeScript build and ESLint

Default integration tests use [happytime-onvif-server](https://github.com/agsh/happytime-onvif-server)
(`__tests__/happytime.json`, typically `127.0.0.1:8000`).

More detail (golden compatibility suite, pointing tests at another device): [innerDocs/testing.md](innerDocs/testing.md).

Further reading:

- [innerDocs/events.md](innerDocs/events.md)
- [innerDocs/vendor-extensions.md](innerDocs/vendor-extensions.md)
- [innerDocs/migration.md](innerDocs/migration.md)
- [innerDocs/performance.md](innerDocs/performance.md)
- [innerDocs/testing.md](innerDocs/testing.md)

---

# Device compatibility

The library has been tested with cameras and devices from Axis, Bosch, Canon, Hanwha, Hikvision, Panasonic, Sony and
other vendors.

Please report your device and firmware using our
[compatibility form](https://docs.google.com/forms/d/e/1FAIpQLSfXsVZv802YFDISGCZaLaJaC_isw2wKQpJ11UurvgO5veYzUw/viewform).

Run `console.log(await onvif.device.getDeviceInformation());` — you should get something like:

```json
{
  "manufacturer": "tp-link",
  "model": "Tapo C220",
  "firmwareVersion": "1.4.4 Build 260515 Rel.24570n",
  "serialNumber": "7461572b",
  "hardwareId": 1
}
```

---

<img width="748" height="561" alt="HappyTimeSoft" src="https://github.com/user-attachments/assets/8cc43a86-4610-4e1a-8700-3a46aa2c1da3" />
