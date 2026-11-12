# Testing

How this repo is tested, what HappyTime covers, and how to run or extend suites. For runtime
teardown in apps, see [resources.md](resources.md). For SOAP capture helpers, see
[soap-xml.md](soap-xml.md).

## Commands

```bash
npm test            # pretest (build + lint) + HappyTime start/hydrate + Jest + stop
npm run test-local  # Jest only (expects HappyTime already on :8000 for integration suites)
npm run build       # rimraf build && tsc (avoids stale JS shadowing dirs)
npm run lint
```

`pretest` runs build + lint before `npm test`. Jest uses `--runInBand --forceExit` so keep-alive
agents and long-poll sockets do not hang CI ([resources.md](resources.md)).

## What `npm test` does

1. Stop any previous HappyTime processes (`happytime-onvif-server/stop.sh`).
2. Start [happytime-onvif-server](https://www.happytimesoft.com/products/onvif-server/index.html)
   ([HappyTimeSoft](https://www.happytimesoft.com/index.html) ONVIF mock) in the background.
3. Wait until it accepts connections (`wait-ready.sh`).
4. Hydrate profiles / fixtures (`hydrate-profiles.sh`).
5. Run the full Jest suite with coverage (`coverageReporters=json-summary`).
6. Stop HappyTime (even if Jest failed).

Default device options: `__tests__/happytime.json` -- `127.0.0.1:8000`, `admin`/`admin`,
`agent: false` (no keep-alive in tests).

HappyTime is a **real ONVIF HTTP endpoint** in-process of the CI machine (native server binaries
under `__tests__/happytime-onvif-server/`), not a Jest mock. Suites that import `happytime.json`
and call `connect()` need that server up.

## What is covered (by kind)

Rough map of `__tests__/` (file names are the source of truth):

- **Integration vs HappyTime** -- `device`, `media`, `media2`, `ptz`, `imaging`, `events`,
  `recording`, `replay`, `search`, `doorcontrol`, `accesscontrol`, `credential`, `accessrules`,
  `schedule`, `deviceio`, `display`, `analytics`, `analyticsdevice`, `receiver`, `thermal`,
  `provisioning`, `uplink`, `appmgmt`, `advancedsecurity`, `actionengine`, `onvif`, ...
  These exercise live SOAP against the mock camera.
- **Connection / lifecycle** -- `connect.close.reconnect`, `connection.errors`,
  `connection.lazy`, `connect.parallel`, `resources.lifecycle`, `activeMediaProfile*`,
  `activeDoor`, `activeEntityTokens`.
- **Events edge cases** -- `events.listenerErrors`, `events.clock`, `subscription.resubscribe`,
  `custom.events` (often mix HappyTime + controlled faults).
- **Auth / Digest / WS-Security** -- `digest`, `ws-security`.
- **Discovery** -- `discovery`, `discovery.ipv6`, `discovery.errors`, `discovery-hints`
  (UDP / mocks; not HappyTime Media).
- **Unit / mocked SOAP** -- `unit.mocked.services`, `unit.options.builders`,
  `unit.optional.payloads`, `device.builders`, many `*.unit.test.ts` files. No HappyTime required
  if you run a single file that never connects -- still safer to use `test-local` with the server
  when unsure.
- **Lazy-loading contract** -- `lazy-loading.contract.test.ts` asserts `connect()` does not load
  `device` / `media` / `media2` modules until first namespace use ([performance.md](performance.md)).
- **Compatibility** -- `compatibility.test.ts`, `compatibility.promises*`,
  `compatibility.cam.methods.unit`, `compatibility.extra`, `compatibility.helpers`.
- **Golden vs npm 0.8.2** -- `compatibility.golden.test.ts` runs the same scenarios against
  `onvif-v0` (`onvif@0.8.2`) and compatibility `Cam`, comparing callback args (`err`, `data`,
  `xml`), key fields, post-connect props, and `rawRequest` / `rawResponse`.
- **API surface / regression** -- `api.regression.test.ts` (exports, package `exports` map).
- **XML / vendor** -- `vendor-extensions`, `any`, `toOnvifXMLSchemaObject`.

Maintainer method checklist (v0 surface vs v1 coverage): [CHECKED.md](CHECKED.md).

## Prerequisites

- Node.js 18+ (same as the package).
- Linux-friendly environment for HappyTime binaries (CI uses Ubuntu). Scripts live under
  `__tests__/happytime-onvif-server/` (`start.sh`, `stop.sh`, `wait-ready.sh`, `hydrate-profiles.sh`,
  `mklinks.sh`).
- For `compatibility.golden.test.ts`, npm must be able to resolve `onvif@0.8.2` as `onvif-v0`
  (devDependency / install layout used by that suite).

## Pointing tests at another device

1. Edit `__tests__/happytime.json` (or temporarily override options in a single suite) with the
   real hostname / port / credentials.
2. Start that device (or leave HappyTime running if you only changed credentials on :8000).
3. `npm run test-local` -- or run one file:
   `npx jest __tests__/media.test.ts --runInBand --forceExit`.

Do not commit real camera passwords. Prefer a lab device or HappyTime for shared CI.

## Writing or extending a suite

- Prefer HappyTime integration for "does this SOAP round-trip work?" and unit mocks for builders,
  error branches, and edge XML.
- Import shared options from `./happytime.json` when hitting the mock server.
- After `connect()`, always `close()` in `afterAll` / `finally` so local Jest without
  `--forceExit` can exit cleanly.
- For exact envelopes under parallel calls, wrap in `requestContext.run` --
  [soap-xml.md](soap-xml.md).
- Listener / pull-point behavior: see [events.md](events.md) and
  `__tests__/events.listenerErrors.test.ts`, `__tests__/subscription.resubscribe.test.ts`.

## Debugging a failure

1. Re-run one file: `npx jest __tests__/device.test.ts --runInBand --forceExit`.
2. Confirm HappyTime is up (`curl` device service or re-run `wait-ready.sh`).
3. Log `err.xml` / `faultSubcode` on `OnvifSoapFaultError` -- [errors.md](errors.md),
   [troubleshooting.md](troubleshooting.md).
4. Capture request/response XML via `requestContext` or `onvif.on('rawRequest'|'rawResponse')`.

## Coverage

`npm test` / `test-local` collect Jest coverage. Treat percentages as a progress signal; HappyTime
cannot emulate every vendor quirk listed in [quirks.md](quirks.md). There is no long soak /
heap-growth suite -- heap notes in [performance.md](performance.md) are illustrative.

## Related

- [HappyTimeSoft](https://www.happytimesoft.com/index.html) -- vendor home
- [HappyTime ONVIF Server](https://www.happytimesoft.com/products/onvif-server/index.html) -- product page
- [resources.md](resources.md) -- agents, `close()`, why `--forceExit`
- [soap-xml.md](soap-xml.md) -- `requestContext`, `build` / parse
- [performance.md](performance.md) -- lazy load contract
- [troubleshooting.md](troubleshooting.md) -- symptom catalog
- [migration.md](migration.md) -- compatibility layer under test
- [CHECKED.md](CHECKED.md) -- method coverage checklist
