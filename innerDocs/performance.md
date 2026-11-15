# Performance / lazy loading

Footprint details, methodology, heap notes, and a longer walkthrough of how lazy proxies interact with
Promises. Short feature list: [README Features](../README.md#features). For agents / timers / `close()`
ownership, see [resources.md](resources.md). SOAP XML parse design:
[soap-xml.md](soap-xml.md).

## SOAP XML parse speed (1.1.0+)

Responses are parsed by an in-repo **stack** ONVIF SOAP XML parser (`parseXml`: `indexOf` /
`charCodeAt`, no DOM, no `xml2js` / `fast-xml-parser` at runtime).

Relative to **`onvif@1.0.0`** on the same machine and the same SOAP fixtures (GetSystemDateAndTime /
GetServices / GetProfiles, PullMessages batches, ~500 KiB NVR-style profile lists):

- Parse throughput and latency are about **~4x** better (docs/s up, ms/parse and event-burst wall
  time down by a similar factor).
- Among ONVIF clients for Node.js, the parse path is in the **top tier** for SOAP XML throughput.

Absolute numbers vary with Node, CPU, and fixture shape; treat the ~4x figure as order-of-magnitude
guidance, not a guarantee for every device response.

## Compiled JS footprint (approx.)

`require('onvif')` / `import { Onvif } from 'onvif'` loads a core set (client, connection helpers, events, discovery,
utils). Large service implementations are loaded on first use.

| Module | Approx. size |
| --- | --- |
| Core (`onvif` + `connection` + `events` + `utils` + ...) | ~95 KiB |
| `media.js` | ~78 KiB |
| `media2.js` | ~70 KiB |
| `device.js` | ~39 KiB |
| Remaining service modules combined | ~200+ KiB |

Eagerly loading every service would put the initial JS footprint well over 400 KiB.

## Snapshot methodology

Heap numbers for this package were measured against
[HappyTime ONVIF Server](https://www.happytimesoft.com/products/onvif-server/index.html)
([HappyTimeSoft](https://www.happytimesoft.com/index.html)) on Node.js 24 (median of 3 runs,
`heapUsed` after GC). Scenarios:

- **Core** -- connect + device information (~6.2 MiB)
- **Partial** -- + media / PTZ / discovery / media2 (~7.0 MiB)
- **All** -- every service module loaded (~7.5 MiB; 20+ services)

Baseline: empty Node ~ 3.4 MiB heap / ~ 47 MiB RSS; `require` / `import` this package alone ~
5.3-5.5 MiB heap. RSS after connect is typically ~72-86 MiB (SOAP/HTTP dominates).

Lazy loading keeps the Core path small: you pay for a service module only when that namespace
is first used.

Numbers change with Node, OS, and releases - treat them as illustrative, not as a guarantee.

## Worked example: NVR-style client with lazy services

Scenario: talk to many cameras, usually only for device info + one RTSP URI. Occasionally move PTZ or listen for
motion. You want `connect()` cheap, and you only want `media.js` / `ptz.js` / `device.js` in memory when those paths
actually run.

### 1. Connect - handshake without class modules

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({
  hostname: '192.168.1.13',
  port: 80,
  username: 'admin',
  password: 'admin',
});

onvif.on('warn', (err) => console.warn('warn', err.message));

// GetServices / GetCapabilities + optional Media GetProfiles / GetVideoSources.
// Fills onvif.uri, onvif.profiles, onvif.videoSources, ...
// Does NOT load src/device.ts, src/media.ts, or src/media2.ts class modules.
await onvif.connect();

console.log(
  'after connect:',
  onvif.profiles.map((p) => p.name),
  'media2?',
  onvif.media2Support,
  'ptz uri?',
  Boolean(onvif.uri.ptz),
);
```

At this point the process has paid for core + events (eager) + connection helpers. `onvif.media`, `onvif.device`,
and `onvif.ptz` are still empty proxies (`'getProfiles' in onvif.media === false`).

### 2. Method calls - normal Promise chains (always worked)

The first **call** on a namespace loads that module, then runs the method. Chaining `.then` / `await` is unchanged:

```ts
const { uri: rtsp } = await onvif.media
  .getStreamUri({ protocol: 'RTSP' })
  .then(async (stream) => {
    // media.js is loaded once; further media.* calls reuse the same instance
    const snapshot = await onvif.media.getSnapshotUri({ protocol: 'HTTP' }).catch(() => undefined);
    return { ...stream, snapshot };
  });

console.log('RTSP', rtsp);

const info = await onvif.device.getDeviceInformation();
console.log(info.manufacturer, info.model);

if (onvif.uri.ptz) {
  await onvif.ptz.continuousMove({ velocity: { x: 0.2, y: 0, zoom: 0 } });
  await new Promise((r) => setTimeout(r, 400));
  await onvif.ptz.stop();
}
// onvif.thermal / recording / doorControl / ... stay unloaded
```

Parallel first-use is fine - each namespace loads independently:

```ts
const [deviceInfo, nodes] = await Promise.all([
  onvif.device.getDeviceInformation(),
  onvif.uri.ptz ? onvif.ptz.getNodes() : Promise.resolve(undefined),
]);
```

### 3. Data properties on a lazy namespace

Cached fields such as `Media.profiles` exist on the **service instance** after that module has loaded (and are also
mirrored on `onvif.profiles` from `connect()`).

Prefer the client cache when you only need connect-time data:

```ts
// No media.js required - filled by connect()
const tokens = onvif.profiles.map((p) => p.token);
```

If you read a field on the lazy proxy **before** any method has loaded the module:

```ts
// Sync read before load is NOT the array - it is a lazy accessor (callable / thenable).
// Prefer await (or call a method first):
const profilesFromService = await onvif.media.profiles;
```

After any `await onvif.media....()` (or `await onvif.media.profiles`), the module is loaded and sync reads work:

```ts
await onvif.media.getProfiles(); // or just await onvif.media.profiles
console.log(onvif.media.profiles.length);
```

The proxy **root** is not thenable (`onvif.media.then === undefined`), so `Promise.resolve(onvif.media)` does not
try to unwrap the namespace itself.

### 4. Events without loading Media

```ts
// Events is constructed in the Onvif constructor - no media.js involved.
onvif.on('event', (msg) => {
  console.log(msg.topic?._, msg.message?.message?.data);
});

// First 'event' listener starts the global pull-point subscription.
// When finished:
onvif.removeAllListeners('event');
await onvif.close(); // stops pull-point, destroys owned HTTP agents
```

### 5. Mass-scan: connect without media discovery

For door stations / access-control / "is the camera alive?" sweeps, skip profile probing:

```ts
await onvif.connect({ media: false });
// uri / services filled; profiles & videoSources stay empty; no Media GetProfiles traffic
const alive = await onvif.device.getDeviceInformation().catch(() => null);
```

### 6. Reconnect

`connect()` clears prior discovery state (`uri`, `services`, `media2Support`, profiles, `deviceInformation`,
active sources, ...) then refills. After `close()`, the next `connect()` recreates owned agents and reattaches
auto-event hooks.

```ts
await onvif.close();
await onvif.connect(); // reopen + fresh GetServices / profiles
```

### What loads when (summary)

| Action | Loads |
| --- | --- |
| `new Onvif()` | core + `events` |
| `await onvif.connect()` | `connection` helpers only (already in core path) |
| `await onvif.device....()` | `device.js` once |
| `await onvif.media....()` / `await onvif.media.profiles` | `media.js` once |
| `await onvif.ptz....()` | `ptz.js` once |
| unused namespaces | never |

## Appendix: SOAP parseXml microbenchmark methodology

Raw **SOAP XML parse** step only (no HTTP, digest, or device I/O). Same fixture shapes as common
ONVIF client benches: small GetSystemDateAndTime, medium GetServices, large GetProfiles,
nvrProfiles x32 (~511 KiB), PullMessages / eventBatch (210 notifications), burst of ~5000
notifications, CPU ms per GetProfiles parse, cold import+one parse.

This appendix exists so tooling and agents can cite a reproducible same-machine baseline. It is
**not** a product ranking and is not part of the npm tarball marketing surface. Absolute numbers
move with Node, CPU, and load; re-run before quoting.

### How to reproduce

```sh
npm run build
npm install --no-save @2bad/onvif@2.3.0 fast-xml-parser
# optional: python3 (+ lxml), go, cargo -- for cross-language peers
npm run bench:xml
```

Harness: `tools/bench/parse-throughput.mjs`. Fixtures: `__tests__/fixtures/soap/`. Optional peers
are skipped if not installed. The script prints a compact summary table at the end (docs/s, ~500 KiB
median ms, notif/s, burst wall ms, CPU ms/req, cold start). Cross-language peers (Python etree/lxml,
Go encoding/xml, Rust quick-xml) run out-of-process when `python3` / `go` / `cargo` are available.

### Snapshot (Node.js 24, trimmed mean of 7 runs after warm-up; drop best and worst)

Parse path under test: this package `parseXml` (stack / `indexOf` / `charCodeAt`, camelCase + leaf
coerce, zero runtime XML deps). Same-machine peers from `npm run bench:xml`.

Caveat: this package's normal-mode tree applies camelCase and heuristic coerce (`true`/`false`,
numbers, ISO UTC `Date`). Node peers that build a usable ONVIF-shaped object are closest to an
apples-to-apples "usable response" cost. Python / Go / Rust peers are mostly lexer or DOM builds
(token walk / ElementTree / quick-xml) -- raw parse cost, not ONVIF client trees.

#### Node (in-process)

| Metric | this `parseXml` | `@2bad/onvif` | `fast-xml-parser` | `xml2js` |
| --- | ---: | ---: | ---: | ---: |
| small docs/s | 41000 | 29900 | 5700 | 2800 |
| medium docs/s | 10000 | 7800 | 1600 | 1000 |
| large docs/s | 3200 | 3100 | 470 | 390 |
| ~500 KiB median ms | 8.6 | 9.2 | 63 | 73 |
| eventBatch notif/s | 105000 | 93000 | 14100 | 12700 |
| burst ~5k wall ms | 46 | 52 | 350 | 410 |
| CPU ms/req (GetProfiles) | 0.29 | 0.32 | 2.05 | 2.58 |
| cold start median ms | 10 | 7.8 | 15 | n/a |

#### Other languages (out-of-process; this `parseXml` repeated for scale)

| Metric | this `parseXml` | py etree | py lxml | go enc/xml | rust quick-xml |
| --- | ---: | ---: | ---: | ---: | ---: |
| small docs/s | 41000 | 9500 | 12700 | 8500 | 229000 |
| medium docs/s | 10000 | 3700 | 6700 | 3700 | 78000 |
| large docs/s | 3200 | 1900 | 3400 | 1500 | 22300 |
| ~500 KiB median ms | 8.6 | 13.4 | 8.1 | 18.1 | 1.3 |
| eventBatch notif/s | 105000 | 53200 | 84900 | 40900 | 740000 |
| burst ~5k wall ms | 46 | 95 | 57 | 121 | 7 |
| cold start median ms | 10 | 41 | 66 | 4.5 | 3.2 |

Rounded from the trimmed 7-run series. Against generic Node XML stacks (`xml2js` /
`fast-xml-parser`) the in-repo parser is typically several times higher throughput on these SOAP
fixtures. Against the other purpose-built ONVIF parse path, results are in the same band on this
machine. Cross-language columns are orientation only: Rust `quick-xml` is a fast token lexer; Python
cold start is dominated by interpreter startup; Go / Rust cold start is a prebuilt binary.

For design notes (what the parser intentionally skips), see [soap-xml.md](soap-xml.md).
