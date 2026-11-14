# Troubleshooting

Symptom -> likely cause -> where to look. For vendor-specific firmware limits see
[quirks.md](quirks.md). Typed error classes: [errors.md](errors.md).

## How to inspect a failing call

1. Catch the error and check `instanceof` (`OnvifAuthError`, `OnvifSoapFaultError`,
   `OnvifTimeoutError`, `OnvifTransportError`, `OnvifParseError`, `OnvifResponseError`).
2. Read `err.statusCode`, `err.faultCode` / `faultSubcode` / `faultReason`, and `err.xml` when
   present.
3. For the exact envelopes of one call, wrap it in `requestContext.run` and log
   `store.requestXml` / `store.responseXml` -- [soap-xml.md](soap-xml.md).
4. Listen once: `onvif.on('rawRequest' / 'rawResponse' / 'warn' / 'eventError')`.

## Auth and connect

### Symptom: `connect()` succeeds but later calls are Unauthorized

- **Cause:** `connect()` is not a login check; early probes may work without credentials.
- **Look:** Call `device.getDeviceInformation()` right after connect. Auth modes and Digest vs
  WS-Security: [auth.md](auth.md). Errors: [errors.md](errors.md) (`OnvifAuthError`,
  `isSenderNotAuthorizedFault`).

### Symptom: HTTP 401 / `OnvifAuthError` / Digest failed

- **Cause:** Wrong username/password; Digest challenge missing or rejected; `*-sess` only
  (unsupported); stale nonce loop exhausted.
- **Look:** [auth.md](auth.md#http-digest-details). Dual Digest (Hikvision): [quirks.md](quirks.md).
  Example HTTPS Digest: [https.digest.mjs](https://github.com/agsh/onvif/blob/master/examples/https.digest.mjs).

### Symptom: SOAP Fault about time / Replay Attack / WS-Security timestamp

- **Cause:** Client and camera clocks diverge; `timeShift` never set or NTP jumped wrongly before
  sync.
- **Look:** [auth.md](auth.md#ws-security-and-device-time-timeshift), quirks "WS-Security time check
  failed". Reconnect after fixing NTP.

### Symptom: GetSystemDateAndTime fails on first try, then works

- **Cause:** Some firmwares require auth on the time call (Panasonic / Vivotek-style).
- **Look:** Client already retries on NotAuthorized -- [auth.md](auth.md), [quirks.md](quirks.md).

## Media / RTSP / snapshot

### Symptom: `profiles` empty / no RTSP after connect

- **Cause:** `connect({ media: false })`, access-only Discovery (`defaultMedia: false`), or no
  Media service.
- **Look:** Pass `{ media: true }` when you need profiles. Recipe:
  [guides.md](guides.md#get-an-rtsp-uri). Door stations: [guides.md](guides.md#unlock-a-door).
  Access peripherals (Profile D):
  [guides.md](guides.md#handle-a-profile-d-access-request).

### Symptom: Media1 missing; only Media2 / Profile T

- **Cause:** Device advertises Media2 only (or Media1 GetProfiles fails).
- **Look:** `onvif.media2Support`; use `onvif.media2.getStreamUri` (returns a **string**).
  [guides.md](guides.md#get-an-rtsp-uri),
  [media2.profiles.js](https://github.com/agsh/onvif/blob/master/examples/media2.profiles.js).

### Symptom: Stream URI host is wrong (NAT / loopback) while SOAP works with `preserveAddress`

- **Cause:** `preserveAddress` rewrites service XAddrs, not RTSP/snapshot strings inside Media
  bodies.
- **Look:** Fix the URL in the app (`URL` rewrite or `withUrlCredentials` after host fix).
  [quirks.md](quirks.md) (RTSP host), README `preserveAddress`.

### Symptom: Snapshot URL returns 401

- **Cause:** JPEG HTTP uses Digest separately from SOAP.
- **Look:** `getDigestHeaders` + `onvif.digestAuth` -- [auth.md](auth.md),
  [guides.md](guides.md#download-a-snapshot-jpeg),
  [media.snapshot.ts](https://github.com/agsh/onvif/blob/master/examples/media.snapshot.ts).

### Symptom: NVR channel has a profile but no useful stream / encoder

- **Cause:** Stub Media Profiles without video encoder (Hikvision NVR pattern).
- **Look:** `activeMediaProfiles` / prefer bag with encoder; `setActiveMediaProfile`.
  [connection.md](connection.md#active-media-profile-token-bag), [quirks.md](quirks.md).

## PTZ

### Symptom: AbsoluteMove SOAP Fault; ContinuousMove works

- **Cause:** Absolute (or Relative) spaces not advertised -- AbsoluteMove is optional.
- **Look:** `ptz.getNodes()` / `supportedPTZSpaces` -- [guides.md](guides.md#move-ptz),
  [ptz.nodes.js](https://github.com/agsh/onvif/blob/master/examples/ptz.nodes.js).

### Symptom: Stream URI works; pan/tilt does nothing

- **Cause:** Firmware / capability gap (seen on some Reolink units), or wrong PTZ token in the
  active bag.
- **Look:** [quirks.md](quirks.md); confirm `onvif.uri.ptz` and `activeMediaProfile` PTZ token.

## Events

### Symptom: No events / events stop; `eventError` fires

- **Cause:** Pull-point soft network drop (retry same subscription) or fatal Fault / expiry
  (rebuild PullPoint with backoff). Some firmwares drop empty PullMessages (Tapo C220).
- **Look:** Listen for `eventError`. Own `Subscription` **must** have `sub.on('error', ...)` or
  Node may exit. [events.md](events.md#pull-point-reconnection),
  [guides.md](guides.md#listen-for-motion-events), [quirks.md](quirks.md) (Tapo / Dahua / Foscam).

### Symptom: Process crash after subscription error

- **Cause:** Emitted `error` on a standalone `Subscription` with no listener (EventEmitter default).
- **Look:** [events.md](events.md) -- always `sub.on('error', ...)`.

## Discovery

### Symptom: Probe returns `[]` on a multi-homed host

- **Cause:** Probe sent on the wrong NIC / family; firewall; device not answering multicast.
- **Look:** `Discovery.on('status', ...)` for which interfaces and destinations were used;
  try `device: 'eth0'` or `type: 'udp4'|'udp6'`. README [Discovery](../README.md#discovery),
  [discovery.js](https://github.com/agsh/onvif/blob/master/examples/discovery.js).

## Transport / process lifecycle

### Symptom: Calls fail around 10 seconds with `OnvifTimeoutError`

- **Cause:** Default SOAP `timeout` is 10000 ms (PullMessages uses a longer wait).
- **Look:** `new Onvif({ timeout: ... })`. README Constructor options.

### Symptom: `OnvifTransportError` / `ECONNRESET` mid-session

- **Cause:** Camera closed the socket; keep-alive path; network blip. Events path may soft-retry.
- **Look:** [errors.md](errors.md); for pull-point [events.md](events.md). Ordinary Get* calls are
  not auto-retried.

### Symptom: `OnvifParseError` / `OnvifResponseError` / empty body

- **Cause:** Non-SOAP HTML, proxy noise, empty HTTP body (some Pelco cases without SOAP action --
  client already sends action), or broken firmware envelopes.
- **Look:** `err.xml` / `statusCode`; [quirks.md](quirks.md) (Pelco, Hikvision Wrong ONVIF Soap
  Response).

### Symptom: Node process never exits

- **Cause:** Owned HTTP(S) agents or an active pull-point / extra `Subscription`.
- **Look:** `await onvif.close()`; `unsubscribe()` your own subscriptions --
  [resources.md](resources.md).

## Recording / door

### Symptom: Recording helper returns Optional Action Not Implemented

- **Cause:** Device advertises Recording but not that operation (seen on some Uniview NVRs).
- **Look:** [quirks.md](quirks.md); try core list/replay path --
  [guides.md](guides.md#replay-a-recording).

### Symptom: Door / access device has no profiles

- **Cause:** Access-only device; Media probing skipped or unset.
- **Look:** `connect({ media: false })`; [guides.md](guides.md#unlock-a-door),
  [connection.md](connection.md#active-entity-tokens-non-media).

## Related

- [guides.md](guides.md) -- task recipes
- [quirks.md](quirks.md) -- vendor / firmware catalog
- [auth.md](auth.md) -- Digest / WS-Security
- [events.md](events.md) -- pull-point reconnect
- [errors.md](errors.md) -- error classes
- [soap-xml.md](soap-xml.md) -- request/response capture
- [resources.md](resources.md) -- agents / `close()`
