# Changelog

## 1.0.0-rc.4 (unreleased)

Not yet published to npm (`1.0.0-rc.3` is the latest on the registry). Collects work after rc.3 through current `master` / pre-release branches.

### Breaking changes

- **Return unwrapping** - many methods return the single useful value instead of the SOAP wrapper (tokens, booleans, arrays, scalars). Multi-field responses stay objects. Paginated `*List` / whitelist-blacklist keep `{ items?, nextStartReference? }`.
  - `media.getStreamUri` / `getSnapshotUri` → `MediaUri` (Media 1.0 only; no Media2 routing inside `media`)
  - `media2.getStreamUri` / `getSnapshotUri` → `AnyURI` string
  - `device.getServices` → `Service[]` (was `{ service }`)
- **`activeSource` / `activeSources` → `activeMediaProfile` / `activeMediaProfiles`** - token bag for the selected Media Profile pipeline. Deprecated aliases keep the old names. Bag is tokens-only (profile / source / configuration tokens including PTZ); encoder snapshots and nested `ptz: { name, token }` are gone — use `defaultProfile` for full configs. Switch with `setActiveMediaProfile(profileToken)`.
- **`connect()` / `close()` pairing** - `close()` tears down keep-alive / events agents; re-open with `connect()` after `close()`.

### Added

- **Typed transport / parse errors** - `OnvifTimeoutError` (`code: 'ETIMEDOUT'`), `OnvifTransportError`, `OnvifParseError`; SOAP Faults normalize SOAP 1.1 + 1.2 fields and expose `faultSubcodes`. Docs: [innerDocs/errors.md](innerDocs/errors.md).
- **`OnvifOptions.url`** - device service URL (`http(s)://host[:port]/path]`) instead of separate hostname/port/path/useSecure (credentials stay in `username`/`password`).
- **Uplink** and **AppManagement** service modules.
- **Auth module** - WS-Security PasswordDigest + HTTP Digest helpers; prefer strongest Digest algorithm (SHA-512-256 > SHA-256 > SHA-1 > MD5); cache Digest headers after the first 401; time-shift fixes.
- **Discovery** - RelatesTo / MessageID matching; multi-interface + `bufferSize` (from 0.x); scopes & types; ProbeMatch sets `defaultMedia` (`false` for access-only Profile C/A without Streaming/T).
- **Request context** - per-request AsyncLocalStorage; request/response XML store; richer debug fields on errors.
- **XMLParser reuse** - `parseSOAPString` caches `fast-xml-parser` instances by options.
- **`prepare` script** for install-time build; Windows-friendly `rimraf` clean.

### Changed

- **Leaner `connect()`** - `GetServices` defaults to `IncludeCapability: false`; prefer Media1 profiles, probe Media2 only when Media1 is missing or fails; Media2-only devices supported; `{ media: false }` skips media probing.
- **Lazy service modules** - load on first use; skip non-ONVIF namespaces in `getServices` without failing.
- **SOAP / transport** - structured faults, Digest retry on Sender NotAuthorized, keep-alive / agent ownership (including events), proxy-friendly path, `xs:any` / `xsany` improvements.
- **Default SOAP timeout** - ordinary calls **10 s**; PullMessages keeps its long-poll timeout.
- Package description clarified for all ONVIF devices (not only cameras). Docs / examples / migration notes expanded.

### Fixed

- **Discovery IPv6** - Probe also from non-loopback IPv6 (link-local bind with zone id: `%iface` on Unix, `%scopeid` on Windows) to `FF02::C`; `type: 'udp6'|'udp4'` filters family. Tests: `discovery.ipv6.test.ts` / `discovery.errors`.
- `getMediaProfiles` treats `profiles` as an array.
- Media ver10 `getStreamUri` return value (#512).
- Discovery IPv6 / optional address+port; analytics device URI key; ESM interop; compatibility layer edge cases; PullMessages `useSecure`; event agent selection after close.

---

## 1.0.0-rc.3 (2026-09-24)

### Fixed

- XML parse failures from some cameras (#498).
- Pelco `GetStreamUri` namespaces (#499, @RogerHardiman).
- Events: space out pull-point rebuilds after a failed pull (#502); reconnection logic reworked; unsubscribe race so an early-created subscription is not left behind.
- Tests updated for `streamSetupToBuild`.

---

## 1.0.0-rc.2 (2026-09-09)

### Fixed

- Lowercase serialization for single-character XML attributes (#493).

### Changed

- Examples refreshed (#494); test / docs polish (#491).

---

## 1.0.0-rc.1 (2026-09-08)

### Added / changed

- Skip Media1 video-source / profile probing when unsupported; fall back to Media2 when Media1 fails (#490).
- Reworked `xs:any` / `xs:anyAttribute` handling; README updates.
- Memory-usage tests; v1 README pass.

---

## 1.0.0-rc.0 (2026-08-26)

First release candidate of the **1.x rewrite** for Node.js 18+ (after alpha/beta). Compared to the 0.x / 0.8 line (`Cam` + callbacks / `onvif/promises`), the public API and packaging change in several important ways.

### Breaking changes

- **Primary API is `Onvif`**, not `Cam`. Methods are Promises (`async`/`await`); the default entry (`require('onvif')` / `import { Onvif } from 'onvif'`) no longer exports the classic callback `Cam`.
- **`Cam` lives in a compatibility layer** (not loaded by default):
  - `onvif/compatibility` - callbacks (v0-style)
  - `onvif/compatibility/promises` - Promise wrapper around that layer
  See [innerDocs/migration.md](innerDocs/migration.md) for known behavioral differences vs 0.8.
- **Service methods are namespaced** - e.g. `onvif.device.getDeviceInformation()`, `onvif.media.getStreamUri()`, `onvif.ptz.absoluteMove()` instead of flat `cam.getDeviceInformation()` / `cam.getStreamUri()`.
- **Connection lifecycle** - call `await onvif.connect()` before service use (or `autoConnect: true`).
- **Node.js >= 18** required.
- **XML stack** - `xml2js` replaced with `fast-xml-parser`; SOAP is built/parsed differently (compact XML).
- **Typed errors** - `OnvifError` subclasses (`OnvifSoapFaultError`, `OnvifAuthError`, `OnvifResponseError`, `OnvifValidationError`) instead of generic `Error` / ad-hoc objects.

### New features (baseline)

- **TypeScript-first** - typed request/response interfaces from ONVIF WSDL; TypeDoc API docs.
- **Broader profile coverage** - Profiles S, T, G, M, C, A (Media2, recording/replay/search, access control / door / credential / schedule, analytics, …).
- **Lazy-loaded service modules** - foundation for loading `device` / `media` / … on first use.
- **Events** - pull-point / notification flow.
- **Auth** - WS-Security PasswordDigest and HTTP Digest.
- **Discovery** - WS-Discovery client.
- **Vendor extensions** - `xs:any` / `xs:anyAttribute` support.
- Lazy-loading contract tests and docs.

### Migration

Prefer the new `Onvif` API. Existing 0.x apps can keep using `Cam` via `onvif/compatibility` or `onvif/compatibility/promises`. Details: [innerDocs/migration.md](innerDocs/migration.md).
0.x docs and source remain on [branch v0.x](https://github.com/agsh/onvif/tree/v0.x); install with `npm install onvif@previous` to stay on 0.8.

---

## 0.x

- **0.8.3** — see GitHub release.
- **0.8.2** Probably the last stable v0.x before v1. Digest auth RFC fixes (@RogerHardiman, @anupamme). Discovery UDP buffer fix and undefined props checks (@momoAmch). Replace splitargs with own implementation, promises probe return (@agsh). CI on Node 22/24 (@bryopsida).
- **0.8.1** Skip invalid presets (#367, @agsh). Get complete information about preset points (@momoAmch).
- **0.8.0** Media2 support for video encoders (@momoAmch). PTZ presets object token fix (@Craytor). Digest Authentication support (`useWSSecurity: false`) (@agsh). Cleanup unnecessary libraries, remove lodash.get, minimal Node version is 14 (@agsh).
- **0.7.4** Ability to set font size and color in `setOSD` and `createOSD` (@RotemDoar).
- **0.7.3** `setOSD` support for DateAndTime (@RotemDoar).
- **0.7.2** Promises API via `onvif/promises` (@agsh).
- **0.7.1** Large catch-up release: network interfaces and NTP improvements, HTTPS, HTTP agents, Profile T / Media2 review, custom OSD position, `SendAuxiliaryCommand`, imaging focus/irCutFilter/GetStatus, recording service methods, event pull retry/restart on connection drops, CI workflows and many bugfixes (see GitHub release notes for full contributor list).
- **0.6.6** A lot of fixes (@RogerHardiman). Stable and tested, next step for new version.
- **0.6.5** MEDIA2 / Profile T / GetServices XAddrs for H265; HTTPS; Discovery.on('error'); Zoom-only / PanTilt-only flags; GetServices fix; setNTP; array returns for methods that could be single-or-array; Promisify example; MockServer.
- **0.6.1** Workaround for cams that don't send date-time.
- **0.6.0** Refactor modules for proper import in electron-based environment.
- **0.5.5** ptz.`gotoHomePosition`, ptz.`setHomePosition`; fixes in ptz.`getConfigurations` and utils.`parseSOAPString`; related tests.
- **0.5.4** Bumped for NPM.
- **0.5.3** Some fixes. Tests.
- **0.5.2** `preserveAddress` for NAT devices, discovery with multiple network interfaces (@Climax777).
- **0.5.1** Critical bugfix in SOAP-auth for some cams.
- **0.5.0** Profile G support (@RogerHardiman), proper SOAP auth, nodejs support >= 0.12.
- **0.4.2** Bugfixes.
- **0.4.1** Improved discovery (@sousandrei, @RogerHardiman).
- **0.4.0** Encoder support (@chriswiggins), Imaging service (@EastL).
- **0.3.1** EventEmitter-based events.
- **0.3.0** Refactoring, documentation, event service basics.
- **0.2.7** WS-Discovery.
