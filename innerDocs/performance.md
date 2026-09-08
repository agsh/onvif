# Performance / lazy loading

In 1.x you only pay for the ONVIF services you actually use. High-level comparison with 0.x:

| | 0.x | 1.x |
| --- | --- | --- |
| Service loading | eager | lazy |
| TypeScript | — | ✓ |
| Typed WSDL interfaces | — | ✓ |
| Promise API | compatibility / wrappers | native |
| Large services loaded at startup | ✓ | — |

## How loading works

- Service namespaces (`onvif.device`, `onvif.media`, `onvif.ptz`, `onvif.thermal`, …) are lazy proxies.
  The corresponding module is loaded the first time you call a method on it (for example `await onvif.ptz.getNodes()`).
- `connect()` uses dedicated helpers in `connection.ts` for the handshake SOAP (`GetServices` /
  `GetCapabilities`, Media `GetProfiles` / `GetVideoSources`). It does not load the full `device` / `media` /
  `media2` class modules. Profiles and video sources are stored on the `Onvif` instance (`onvif.profiles`,
  `onvif.videoSources`); when `Media` is later loaded, it reuses that cache.
- `Events` is constructed eagerly (needed for `onvif.on('event', …)`). Everything else stays deferred.
- The main package entry exports service classes as TypeScript types only, so CommonJS `require('onvif')` does
  not force-load `Recording`, `Thermal`, and similar modules just because they appear in the type surface.

## Practical tips

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect(); // handshake only — no full Media/Device class modules yet

const info = await onvif.device.getDeviceInformation(); // loads device.js on first use
const uri = await onvif.media.getStreamUri({ protocol: 'RTSP' }); // loads media.js on first use
// onvif.thermal is never loaded unless you call it
```

If you only need Discovery or Events, you can avoid Media entirely: Profile C / door-control style devices complete
`connect()` without a Media service, and unused namespaces stay unloaded for the lifetime of the process.

## Snapshot measurements

Numbers change with Node, OS, and releases — treat them as illustrative, not as a guarantee.

### Compiled JS footprint (approx.)

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

### Runtime heap (HappyTime ONVIF server)

Measured against [happytime-onvif-server](https://github.com/agsh/happytime-onvif-server) on Node.js 24
(median of 3 runs, `heapUsed` after GC).

Scenarios:

1. **Core** — connect + device information
2. **Partial** — + media / PTZ / discovery (and `media2` where the library has it)
3. **All** — every service module that library exposes

| Library | Core | Partial | All | Notes |
| --- | ---: | ---: | ---: | --- |
| onvif 1.x | ~6.2 MiB | ~7.0 MiB | ~7.5 MiB | Lazy service modules; “All” covers 20+ services |
| [onvif 0.8](https://github.com/agsh/onvif/tree/v0.x) | ~6.3 MiB | ~6.8 MiB | ~6.9 MiB | Eager device/media/ptz/imaging/recording/replay |
| [node-onvif](https://github.com/GuilhermeC18/node-onvif) | ~6.5 MiB | ~6.5 MiB | ~6.5 MiB | Device/media/ptz only; `init()` already loads that surface |
| [@2bad/onvif](https://github.com/2BAD/onvif) | ~8.9 MiB | ~9.1 MiB | ~9.1 MiB | Eager Device/Media/PTZ (early fork of 1.x; no further services) |

RSS after connect is typically ~72–86 MiB for all clients (SOAP/HTTP dominates). Empty Node ≈ 3.4 MiB heap /
≈ 47 MiB RSS; `require`/`import` alone ≈ 5.3–5.5 MiB heap for each package.

Lazy loading mainly helps the **Core** path: 1.x stays near 0.8 while only paying for Device, then grows when you
touch Media2, door control, analytics, and the rest — a surface 0.8 / `node-onvif` / `@2bad/onvif` do not ship.
