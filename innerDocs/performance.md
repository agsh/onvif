# Performance / lazy loading

Full write-up (feature comparison, loading mechanics, example, and heap benchmarks) lives in the
[README](../README.md#performance--lazy-loading).

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
