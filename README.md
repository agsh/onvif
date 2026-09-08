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

Requires Node.js 18+. Docs: https://agsh.github.io/onvif/

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

### 1.x API (main export)

Preferred for new projects. Service namespaces on `Onvif`:

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', port: 8000, username: 'admin', password: 'admin' });
await onvif.connect();
await onvif.media.getProfiles();
```

### 0.x compatibility API (separate entry points)

For existing `Cam`-based code. **Not** re-exported from `require('onvif')` / `import { Onvif } from 'onvif'`:

```js
const { Cam } = require('onvif/compatibility'); // callbacks
// or:
const { Cam } = require('onvif/compatibility/promises'); // async/await
```

Examples and known differences: [innerDocs/migration.md](innerDocs/migration.md).

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

A small example showing how to build a simple video server (http://localhost:6147) with ffmpeg and a few Node.js
libraries:

<video src="https://github.com/agsh/onvif/assets/576263/e816fed6-067a-4f77-b3f5-ccd9d5ff1310" width="300" />

https://github.com/agsh/onvif/assets/576263/e816fed6-067a-4f77-b3f5-ccd9d5ff1310

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
- Lazy-loaded services — see [innerDocs/performance.md](innerDocs/performance.md)
- Auth: WS-Security, Digest; Advanced Security (experimental)
- WS-Discovery on the LAN
- The library currently implements: `Device`, `Events`, `Media`, `Media2`, `PTZ`, `Imaging`, `Analytics`,
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

Use the [0.x compatibility API](#two-apis) (`onvif/compatibility` or `onvif/compatibility/promises`) if you are not
ready to switch to `Onvif` yet.

Guides, examples, and known differences: [innerDocs/migration.md](innerDocs/migration.md).

---

# Examples

Additional samples are in the [`examples`](https://github.com/agsh/onvif/tree/v1/examples) folder. Some older files
still target 0.x / compatibility APIs; prefer the 1.x samples and [Quick start](#quick-start) for new work.

- [compatibility.cjs](https://github.com/agsh/onvif/blob/v1/examples/compatibility.cjs) / [compatibilityPromises.cjs](https://github.com/agsh/onvif/blob/v1/examples/compatibilityPromises.cjs)
- [events.with.filter.ts](https://github.com/agsh/onvif/blob/v1/examples/events.with.filter.ts)
- [example.js](https://github.com/agsh/onvif/blob/master/examples/example.js) … [example8.js](https://github.com/agsh/onvif/blob/master/examples/example8.js) (legacy / mixed)

---

# Performance / lazy loading

1.x loads large service modules on first use instead of at import time.

| | 0.x | 1.x |
| --- | --- | --- |
| Service loading | eager | lazy |
| TypeScript | — | ✓ |
| Typed WSDL interfaces | — | ✓ |
| Promise API | compatibility / wrappers | native |
| Large services loaded at startup | ✓ | — |

Architecture notes and snapshot measurements: [innerDocs/performance.md](innerDocs/performance.md).

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

# Feedback

Device reports help track which cameras work well with this library. ONVIF support varies by vendor and firmware.

@RogerHardiman tested this lib on a test bed with 5 x Axis, 2 x Bosch, 1 x Canon, 2 x Hanwha, 4 x HikVision, 1 x
Panasonic,
2 x Sony and 2 x unknown vendor cameras. There is a mix of PTZ and Fixed cameras and a mix of Pre-Profile, Profile S,
Profile G and Profile T devices.

To contribute a report, run `console.log(await onvif.device.getDeviceInformation());` — you should see something like:

```json
{
  "manufacturer": "tp-link",
  "model": "Tapo C220",
  "firmwareVersion": "1.4.4 Build 260515 Rel.24570n",
  "serialNumber": "7461572b",
  "hardwareId": 1
}
```

Submit the result and notes here:
https://docs.google.com/forms/d/e/1FAIpQLSfXsVZv802YFDISGCZaLaJaC_isw2wKQpJ11UurvgO5veYzUw/viewform

---

<img width="748" height="561" alt="HappyTimeSoft" src="https://github.com/user-attachments/assets/8cc43a86-4610-4e1a-8700-3a46aa2c1da3" />
