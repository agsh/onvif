# Changelog

## 1.0.0

Rewrite of the library for Node.js 18+. Compared to the 0.x / 0.8 line (`Cam` + callbacks / `onvif/promises`), the public API and packaging change in several important ways.

### Breaking changes

- **Primary API is `Onvif`**, not `Cam`. Methods are Promises (`async`/`await`); the default entry (`require('onvif')` / `import { Onvif } from 'onvif'`) no longer exports the classic callback `Cam`.
- **`Cam` lives in a compatibility layer** (not loaded by default):
  - `onvif/compatibility` - callbacks (v0-style)
  - `onvif/compatibility/promises` - Promise wrapper around that layer
  See [innerDocs/migration.md](innerDocs/migration.md) for known behavioral differences vs 0.8.
- **Service methods are namespaced** - e.g. `onvif.device.getDeviceInformation()`, `onvif.media.getStreamUri()`, `onvif.ptz.absoluteMove()` instead of flat `cam.getDeviceInformation()` / `cam.getStreamUri()`.
- **Connection lifecycle** - call `await onvif.connect()` before service use (or `autoConnect: true`); call `await onvif.close()` to tear down keep-alive / events agents so the process can exit. Re-open with `connect()` after `close()`.
- **Return shapes are often unwrapped** - single useful values (object, token, boolean, array) instead of full SOAP response wrappers. Paginated `*List` responses keep the ONVIF list object.
- **Node.js >= 18** required.
- **XML stack** - `xml2js` replaced with `fast-xml-parser`; SOAP is built/parsed differently (compact XML; vendor cameras that were sensitive to indentation are handled more like 0.x compact envelopes).
- **Typed errors** - failures use `OnvifError` subclasses (`OnvifSoapFaultError`, `OnvifAuthError`, `OnvifResponseError`, `OnvifValidationError`) instead of generic `Error` / ad-hoc objects.

### New / improved features

- **TypeScript-first** - typed request/response interfaces generated from current ONVIF WSDL; TypeDoc API docs.
- **Broader profile coverage** - Profiles S, T, G, M, C, A (Media2, recording/replay/search, access control / door / credential / schedule, analytics, etc.), plus helpers such as Uplink and AppManagement.
- **Lazy-loaded service modules** - `device` / `media` / `media2` / ... load on first use so `connect()` does not pull in every service class.
- **Connect options** - `{ media: false }` skips media/profile probing (door stations, mass scan); Media2-only devices and Media1→Media2 fallbacks are supported.
- **Leaner `connect()`** - `GetServices` uses `IncludeCapability: false` by default (pass `{ includeCapability: true }` on `device.getServices` when needed); Media2 `GetProfiles` runs only as fallback when Media1 is missing or fails (saves one RTT on typical Media1 cameras).
- **`OnvifOptions.url`** - pass a device service URL (`http(s)://host[:port]/path]`) instead of separate hostname/port/path/useSecure; credentials must stay in `username`/`password`, not in the URL.
- **Events** - pull-point / notification flow with clearer reconnection and agent ownership; see [innerDocs/events.md](innerDocs/events.md).
- **Auth** - WS-Security PasswordDigest and HTTP Digest (MD5 / SHA-1 / SHA-256 / SHA-512-256), including multi-challenge cameras; Digest challenge reuse after the first 401; time-shift handling for clocks that jump.
- **Default SOAP timeout** - ordinary calls default to **10 s** (`DEFAULT_TIMEOUT_MS`); PullMessages still uses its own long-poll timeout (pull wait + margin). Pass `timeout` in the constructor for slower devices.
- **Vendor extensions** - `xs:any` / `xs:anyAttribute` via `xsany` (parse + serialize); see [innerDocs/vendor-extensions.md](innerDocs/vendor-extensions.md).
- **Discovery** - WS-Discovery improvements (RelatesTo / MessageID matching, multi-interface / buffer sizing, scopes & types).
- **SOAP / transport** - structured fault fields, Digest retry on Sender NotAuthorized, keep-alive / agent control, proxy-friendly request path; see [innerDocs/soap-xml.md](innerDocs/soap-xml.md).
- **XMLParser reuse** - `parseSOAPString` caches `fast-xml-parser` instances by `array` / `rawXML` (and xml2js hydrate mode) instead of constructing a new parser per response.

### Migration

Prefer the new `Onvif` API. Existing 0.x apps can keep using `Cam` via `onvif/compatibility` or `onvif/compatibility/promises`. Details and known differences: [innerDocs/migration.md](innerDocs/migration.md).
0.x docs and source remain on [branch v0.x](https://github.com/agsh/onvif/tree/v0.x); install with `npm install onvif@previous` if you need to stay on 0.8.
