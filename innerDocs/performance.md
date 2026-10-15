# Performance / lazy loading

Full write-up (feature comparison, loading mechanics, short example, and heap benchmarks) lives in the
[README](../README.md#performance--lazy-loading).

This note adds footprint details, methodology, and a longer walkthrough of how lazy proxies interact with
Promises.

## Compiled JS footprint (approx.)

`require('onvif')` / `import { Onvif } from 'onvif'` loads a core set (client, connection helpers, events, discovery,
utils). Large service implementations are loaded on first use.

| Module | Approx. size |
| --- | --- |
| Core (`onvif` + `connection` + `events` + `utils` + …) | ~95 KiB |
| `media.js` | ~78 KiB |
| `media2.js` | ~70 KiB |
| `device.js` | ~39 KiB |
| Remaining service modules combined | ~200+ KiB |

Eagerly loading every service would put the initial JS footprint well over 400 KiB.

## Snapshot methodology

Heap numbers in the README were measured against
[happytime-onvif-server](https://github.com/agsh/happytime-onvif-server) on Node.js 24 (median of 3 runs,
`heapUsed` after GC). RSS after connect is typically ~72–86 MiB for all clients (SOAP/HTTP dominates). Empty Node
≈ 3.4 MiB heap / ≈ 47 MiB RSS; `require`/`import` alone ≈ 5.3–5.5 MiB heap for each package.

Numbers change with Node, OS, and releases — treat them as illustrative, not as a guarantee.

## Worked example: NVR-style client with lazy services

Scenario: talk to many cameras, usually only for device info + one RTSP URI. Occasionally move PTZ or listen for
motion. You want `connect()` cheap, and you only want `media.js` / `ptz.js` / `device.js` in memory when those paths
actually run.

### 1. Connect — handshake without class modules

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
// Fills onvif.uri, onvif.profiles, onvif.videoSources, …
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

### 2. Method calls — normal Promise chains (always worked)

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
// onvif.thermal / recording / doorControl / … stay unloaded
```

Parallel first-use is fine — each namespace loads independently:

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
// No media.js required — filled by connect()
const tokens = onvif.profiles.map((p) => p.token);
```

If you read a field on the lazy proxy **before** any method has loaded the module:

```ts
// Sync read before load is NOT the array — it is a lazy accessor (callable / thenable).
// Prefer await (or call a method first):
const profilesFromService = await onvif.media.profiles;
```

After any `await onvif.media.…()` (or `await onvif.media.profiles`), the module is loaded and sync reads work:

```ts
await onvif.media.getProfiles(); // or just await onvif.media.profiles
console.log(onvif.media.profiles.length);
```

The proxy **root** is not thenable (`onvif.media.then === undefined`), so `Promise.resolve(onvif.media)` does not
try to unwrap the namespace itself.

### 4. Events without loading Media

```ts
// Events is constructed in the Onvif constructor — no media.js involved.
onvif.on('event', (msg) => {
  console.log(msg.topic?._, msg.message?.message?.data);
});

// First 'event' listener starts the global pull-point subscription.
// When finished:
onvif.removeAllListeners('event');
await onvif.close(); // stops pull-point, destroys owned HTTP agents
```

### 5. Mass-scan: connect without media discovery

For door stations / access-control / “is the camera alive?” sweeps, skip profile probing:

```ts
await onvif.connect({ media: false });
// uri / services filled; profiles & videoSources stay empty; no Media GetProfiles traffic
const alive = await onvif.device.getDeviceInformation().catch(() => null);
```

### 6. Reconnect

`connect()` clears prior discovery state (`uri`, `services`, `media2Support`, profiles, active sources, …) then
refills. After `close()`, the next `connect()` recreates owned agents and reattaches auto-event hooks.

```ts
await onvif.close();
await onvif.connect(); // reopen + fresh GetServices / profiles
```

### What loads when (summary)

| Action | Loads |
| --- | --- |
| `new Onvif()` | core + `events` |
| `await onvif.connect()` | `connection` helpers only (already in core path) |
| `await onvif.device.…()` | `device.js` once |
| `await onvif.media.…()` / `await onvif.media.profiles` | `media.js` once |
| `await onvif.ptz.…()` | `ptz.js` once |
| unused namespaces | never |
