# Known quirks / vendor notes

Real devices often bend the ONVIF specs. This library absorbs many quirks automatically;
others are firmware bugs you must work around in the app (or avoid that firmware).

Report manufacturer / model / firmware via the compatibility form:
https://docs.google.com/forms/d/e/1FAIpQLSfXsVZv802YFDISGCZaLaJaC_isw2wKQpJ11UurvgO5veYzUw/viewform

## Worked around in this client

- **Hikvision dual Digest** -- a 401 may list MD5 and SHA-256 (or more) `WWW-Authenticate`
  headers; the client prefers the strongest algorithm (SHA-512-256 > SHA-256 > SHA-1 > MD5).
  [#426](https://github.com/agsh/onvif/issues/426), [#374](https://github.com/agsh/onvif/issues/374).
- **Pelco GetStreamUri / empty SOAP body** -- some Pelco units reject missing SOAP action /
  pretty-printed XML and return an empty HTTP body; requests stay compact and include action.
  [#499](https://github.com/agsh/onvif/pull/499), [#497](https://github.com/agsh/onvif/issues/497).
- **Hikvision NVR stub profiles** -- channels may expose Media Profiles without a video encoder;
  `activeMediaProfiles` keeps same-source stubs and prefers a bag with an encoder as the process
  default. [#369](https://github.com/agsh/onvif/issues/369),
  [connection.md](connection.md#active-media-profile-token-bag).
- **Invalid PTZ presets** -- cameras that return broken preset entries are skipped instead of
  aborting `getPresets`. [#367](https://github.com/agsh/onvif/issues/367).
- **Uniview (and other) non-URI service namespaces** -- GetServices may advertise a bare token
  (e.g. `GenetecPtzPatterns`) instead of an `http://...` namespace; those entries are skipped
  without failing connect. [#532](https://github.com/agsh/onvif/issues/532).
- **Axis pull-point Renew / clock skew** -- PullPoints are renewed as Axis expects; WS-Security
  time uses device time sync (`timeShift`) so Replay Attack Protection does not reject local
  clock jumps. See also [#172](https://github.com/agsh/onvif/issues/172).
- **Vivotek / Panasonic-style GetSystemDateAndTime auth** -- some firmwares require auth already
  on the time call used for WS-Security; connect still completes. [#301](https://github.com/agsh/onvif/issues/301).
- **PullMessages Dialect with multiple xmlns** -- malformed `Dialect` attributes with embedded
  xmlns are tolerated when parsing events. [#134](https://github.com/agsh/onvif/issues/134).
- **Discovery UDP / dual-stack** -- ProbeMatch packet loss from a blocked event loop was fixed;
  IPv4 + IPv6 Probe is the default. [#377](https://github.com/agsh/onvif/issues/377).
- **Media1 missing / Media2-only** -- connect falls back to Media2 profiles when Media1 is absent
  or fails (common on some D-Link / Profile T devices).
- **Multi-channel NVR stream URIs** -- pick the right Media Profile / `setActiveMediaProfile`
  per channel; omit-token calls use the current bag. [#328](https://github.com/agsh/onvif/issues/328).
- **TP-Link Tapo C220 V1 firmware 1.4.4+ (events)** -- `CreatePullPointSubscription` succeeds, but
  `PullMessages` with no pending notifications can drop the TCP connection with an empty reply
  (no HTTP status / SOAP Fault). Worked before 1.4.4. Discussed on the
  [TP-Link community thread](https://community.tp-link.com/en/smart-home/forum/topic/867526).
  The library keeps listening without an app resubscribe. Two paths (see
  [events.md](events.md#pull-point-reconnection)):
  - Soft (pull point still valid): Renew + SetSynchronizationPoint, then `PullMessages` again on
    the **same** subscription.
  - Fatal (SOAP Fault, expired pull point, or renew cannot recover): backoff, Unsubscribe the old
    pull point, then `CreatePullPointSubscription` and resume.

## Device / firmware limits (app must cope)

- **TP-Link Tapo C520 / C510 events** -- connection works; pull / push event delivery has been
  unreliable on some firmwares. [#312](https://github.com/agsh/onvif/issues/312).
- **Dahua event subscriptions** -- many units need vendor event paths; plain ONVIF pull-point /
  BaseNotification often fails even in ONVIF Device Manager. [#353](https://github.com/agsh/onvif/issues/353).
- **Hikvision "Wrong ONVIF Soap Response"** -- some newer firmwares return non-SOAP / broken
  envelopes on otherwise supported calls. [#294](https://github.com/agsh/onvif/issues/294).
- **Media2 token vs Name** -- a few devices put the Name where a ReferenceToken is required,
  which breaks strict Profile matching (`Unrecognized configuration`).
  [#287](https://github.com/agsh/onvif/issues/287).
- **RTSP host inside GetStreamUri** -- `preserveAddress` rewrites service / subscription XAddrs
  for SOAP, but does **not** rewrite RTSP/snapshot URI strings inside Media response bodies.
  Fix the URL in the app (or camera network settings). [#170](https://github.com/agsh/onvif/issues/170),
  README [`preserveAddress`](../README.md#preserveaddress-nat--wrong-xaddr-host-or-port).
- **WS-Security time check failed** -- large client/camera clock skew; ensure connect time sync
  ran, or fix NTP on either side. [#249](https://github.com/agsh/onvif/issues/249).
- **PTZ AbsoluteMove optional** -- many cameras only expose ContinuousMove / RelativeMove; check
  SupportedPTZSpaces first. [ptz.nodes.js](https://github.com/agsh/onvif/blob/master/examples/ptz.nodes.js).
- **Reolink E1 Outdoor Pro PTZ** -- stream URI may work while pan/tilt commands do nothing
  (capability / firmware). [#346](https://github.com/agsh/onvif/issues/346).
- **Uniview recording options** -- some NVRs return `Optional Action Not Implemented` for
  recording helpers. [#317](https://github.com/agsh/onvif/issues/317).
- **Foscam VD1 doorbell events** -- Digest/auth may fail on event endpoints while Device calls
  succeed. [#269](https://github.com/agsh/onvif/issues/269).

## Related docs

- [troubleshooting.md](troubleshooting.md) -- symptom -> cause -> where to look
- [guides.md](guides.md) -- RTSP / PTZ / events / replay / door recipes
- [connection.md](connection.md) -- connect, profiles, `preserveAddress`
- [auth.md](auth.md) -- WS-Security / Digest / dual Digest / time sync
- [events.md](events.md) -- pull-point reconnect, `Subscription`
- [errors.md](errors.md) -- typed SOAP / auth errors
- [resources.md](resources.md) -- `close()` / agents
