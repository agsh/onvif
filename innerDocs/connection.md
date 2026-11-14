# Connection lifecycle

## Happy path

```ts
const onvif = new Onvif({ hostname, username, password });
await onvif.connect(); // or connect({ media: false })
// ... use services ...
await onvif.close();
await onvif.connect(); // reopen after close
```

`connect()`:

1. `ensureOpen` - owned agents + auto-`event` hooks (after a prior `close()`)
2. `resetConnectState` - drops previous `uri` / services / profiles / active media / door defaults
3. Time sync (`getSystemDateAndTime`) for WS-Security (see [auth.md](auth.md))
4. `GetServices` (`IncludeCapability: false`), or `GetCapabilities` if that fails
5. Optional media discovery (unless `{ media: false }`): Media1 first; Media2 `GetProfiles` only if Media1 is absent or fails. If `media` is omitted, uses `onvif.defaultMedia` (Discovery may have set `false` for access-only door stations)
6. Entity defaults (parallel, each no-ops without XAddr): door / access point / recording(+job) / relay
7. Emits `connect` and returns the same instance

`connect()` is not a login check - call `device.getDeviceInformation()` afterwards if you need to
verify username/password early.

## Errors during `connect()`

| Failure | Behaviour |
| --- | --- |
| Time sync / network down | Promise **rejects**; discovery state already cleared; **no** `connect` event |
| `GetServices` fails | Falls back to `GetCapabilities` |
| Both service discovery calls fail | Promise **rejects**; state stays empty |
| Media `GetProfiles` / sources fail | Emits `warn`, keeps service URIs, completes `connect` (door stations / Axis quirks) |

After a rejected `connect()`, the client is still open (`closed === false`). Call `connect()` again when the device is reachable - there is no half-filled `uri` from the failed attempt (reset runs first).

## Loss of connection after a successful connect

A failed SOAP call (`OnvifTimeoutError` / `OnvifTransportError` / SOAP Fault, …) rejects that
Promise only. It does **not** mark the client closed or clear discovery cache. Retry the method, or
`close()` + `connect()` for a full rediscovery (e.g. after camera reboot when PTZ XAddr disappeared).
Error classes: [errors.md](errors.md).

Pull-point / events reconnection is separate - see
[events.md#pull-point-reconnection](events.md#pull-point-reconnection).

## `preserveAddress` (NAT / loopback / wrong port in XAddr)

`GetServices` / capabilities / event subscription Addresses often advertise a host or port
the client cannot use: `127.0.0.1`, a private IP behind NAT, or the camera's local `:80`
while you dial a forwarded `:8080`.

| `preserveAddress` | Behaviour |
| --- | --- |
| `false` (default) | `parseUrl` keeps the XAddr host/port. Normal service HTTP still uses the constructor host/port; only pathname (+ query) is taken from the XAddr. |
| `true` | `parseUrl` replaces XAddr host/port with the constructor `hostname` / `port` (pathname + query kept). Use for SOAP `a:To` and pull-point URLs that are dialed as a full `options.url`. |

Port comparison uses the effective port (scheme default 80/443 when `URL.port` is empty).
Raw RTSP / snapshot URI strings in Media SOAP bodies are **not** rewritten - only URLs that
go through `parseUrl` (service `uri` map, subscription Address, etc.).

## Active Media Profile (token bag)

After a successful media probe, the client keeps a small **token bag** so most service calls can omit
ONVIF tokens. That bag is `onvif.activeMediaProfile` (type `ActiveMediaProfile`).

| Property | Role |
| --- | --- |
| `onvif.profiles` | All Media Profiles from GetProfiles (full config trees) |
| `onvif.videoSources` | Physical video sources |
| `onvif.activeMediaProfile` | **Current defaults** - flat tokens for one selected profile |
| `onvif.activeMediaProfiles` | One bag per video source (same selection rules as connect) |
| `onvif.defaultProfile` | Full `Profile` object for the **current** bag (codec, resolution, ...) |
| `onvif.defaultProfiles` | Full profile per video-source slot (aligned with `activeMediaProfiles`) |

Deprecated aliases (same objects): `activeSource` / `activeSources`. Prefer the `activeMediaProfile*` names.

### What is in the bag

Tokens only - no encoder snapshots (`encoding` / width / fps were removed on purpose):

| Field | From Media Profile |
| --- | --- |
| `profileToken` | `Profile.token` |
| `sourceToken` / `videoSourceToken` | `videoSourceConfiguration.sourceToken` (physical source; both names are equal) |
| `videoSourceConfigurationToken` | `videoSourceConfiguration.token` (falls back to the physical source token) |
| `videoEncoderConfigurationToken` | `videoEncoderConfiguration.token` |
| `audioSourceConfigurationToken` | `audioSourceConfiguration.token` |
| `audioEncoderConfigurationToken` | `audioEncoderConfiguration.token` |
| `videoAnalyticsConfigurationToken` | `videoAnalyticsConfiguration.token` |
| `metadataConfigurationToken` | `metadataConfiguration.token` |
| `ptzConfigurationToken` | `PTZConfiguration.token` |
| `audioOutputConfigurationToken` | `extension.audioOutputConfiguration.token` |
| `audioDecoderConfigurationToken` | `extension.audioDecoderConfiguration.token` |

Optional fields are `undefined` when that configuration is missing on the profile.

For codec / resolution / rate control, read the full profile:

```ts
await onvif.connect();

const bag = onvif.activeMediaProfile!;
console.log(bag.profileToken, bag.videoEncoderConfigurationToken);

const encoder = onvif.defaultProfile?.videoEncoderConfiguration;
console.log(encoder?.encoding, encoder?.resolution, encoder?.rateControl);
```

### How connect builds the bag

Runs only when media discovery ran and at least one video source exists. Skipped for
`connect({ media: false })` / access-only devices with no sources - then
`activeMediaProfile` stays `undefined`.

#### Connect overview

```text
connect({ media? })
  |
  +-- resetConnectState
  +-- getSystemDateAndTime          (WS-Security clock)
  +-- getServices | getCapabilities (fills uri / services)
  |
  +-- media === false ? skip media branch
  |     else:
  |       Media1 GetProfiles + GetVideoSources
  |         (or Media2 probe if Media1 missing / fails)
  |       getActiveMediaProfiles()      (builds bags below)
  |
  +-- getActiveEntityTokens()       (door / accessPoint / recording / relay)
  +-- emit('connect')
```

Deprecated aliases: `activeSources` == `activeMediaProfiles`, `activeSource` == `activeMediaProfile`.

#### Selecting `activeMediaProfiles` (per video source)

Slots stay index-aligned with `videoSources`. A source with no usable profile leaves a hole.

```text
GetProfiles  --------->  onvif.profiles[]
GetVideoSources ------->  onvif.videoSources[]

for i, src in videoSources:
  candidates = profilesForVideoSource(profiles, src.token, singleSource?)
       |
       |  1) same sourceToken AND has videoEncoderConfiguration
       |  2) same sourceToken (encoder optional)
       |  3) ONLY if videoSources.length === 1:
       |       any profile with encoder, else any profile
       |  multi-source: never borrow another source's profile
       |
  if no candidates: skip slot i
  else:
    profile = candidates[0]
    bag     = tokens from that profile   (no forced sourceToken override)
    activeMediaProfiles[i] = bag
    defaultProfiles[i]     = profile
```

#### Selecting `activeMediaProfile` (process-wide default)

```text
activeMediaProfile / defaultProfile
  =
  first mapped bag WITH videoEncoderConfigurationToken
  else first mapped bag

later:
  setActiveMediaProfile(profileToken)
    -> replaces activeMediaProfile + matching source slot
```

Example (HikVision-style incomplete profiles):

```text
videoSources:  [VS001, VS006, VS007]
profiles:      P001(VS001, no enc), P006(VS006, H264), P007(VS007, no enc)

activeMediaProfiles[0] = bag(P001)   // same source, encoder optional
activeMediaProfiles[1] = bag(P006)   // same source + encoder
activeMediaProfiles[2] = bag(P007)
activeMediaProfile     = bag(P006)   // first bag with encoder
```

Rebuild the same way later with `await onvif.getActiveMediaProfiles()` (e.g. after you mutated
profiles on the device and refreshed `onvif.profiles`).

#### Concurrent / multi-source caveat

`activeMediaProfile` is **one shared process-wide default**. Omit-token methods read it
synchronously when the call starts (before `await` transport), so:

- an in-flight omit-token call is **not** rewritten by a later `setActiveMediaProfile`
- starting two omit-token calls around a switch **can** target different profiles
- `activeMediaProfiles[i]` slots stay source-aligned under switches; only the matching slot
  and the shared `activeMediaProfile` change

For parallel work across sources, pass explicit `profileToken` / `videoSourceToken` (from
`activeMediaProfiles[i]`), do not rely on the shared bag.

## Active entity tokens (non-media)

README sketch (door / peripheral / recording / analytics onboarding):
[Beyond cameras](../README.md#beyond-cameras-profiles-c--a--d--g--m). Task recipes:
[guides.md](guides.md#unlock-a-door),
[guides.md](guides.md#handle-a-profile-d-access-request),
[guides.md](guides.md#replay-a-recording).

Services outside the Media Profile pipeline get their own default tokens. Connect probes
each advertised XAddr in parallel (`getActiveEntityTokens`):

```text
uri.doorcontrol   -> GetDoorInfoList(limit: 1)      -> activeDoorToken
uri.accesscontrol -> GetAccessPointInfoList(limit: 1) -> activeAccessPointToken
uri.recording     -> GetRecordings / GetRecordingJobs -> activeRecordingToken
                                                    -> activeRecordingJobToken
uri.deviceIO      -> GetRelayOutputs                -> activeRelayOutputToken
```

Omit-token calls fall back to these defaults. Explicit tokens always win.
List/paging APIs (`getDoorInfoList`, `getAccessPointInfoList`, `getRecordings`, ...) do not
require a default. For DeviceIO, `getRelayOutputOptions()` without a token still means
**all** relays -- `activeRelayOutputToken` is only used where a token is required
(e.g. `setRelayOutputState`).

```ts
await onvif.connect({ media: false });

// DoorControl
await onvif.doorControl.unlockDoor();
await onvif.setActiveDoor('DoorToken_2');

// AccessControl
await onvif.accessControl.getAccessPointState();
await onvif.setActiveAccessPoint('AccessPointToken_2');

// Recording / Replay / Search
await onvif.recording.getRecordingConfiguration();
await onvif.replay.getReplayUri({ protocol: 'RTSP' });
await onvif.search.getRecordingInformation();
await onvif.recording.setRecordingJobMode({ mode: 'Active' });

// DeviceIO relay
await onvif.deviceIO.setRelayOutputState({ logicalState: 'active' });
```

Rebuild after device-side changes: `getActiveDoor()`, `getActiveAccessPoint()`,
`getActiveRecording()`, `getActiveRelayOutput()`, or `getActiveEntityTokens()` via connect.

### Who uses the bag

When you omit tokens, these (and similar) methods fall back to `activeMediaProfile`:

- **Media / Media2** - `profileToken`, stream/snapshot/multicast/sync, `get*Configuration`, OSD options (`videoSourceConfigurationToken`)
- **PTZ** - `profileToken`, `ptzConfigurationToken` for getConfiguration / getConfigurationOptions
- **Analytics** - `videoAnalyticsConfigurationToken`
- **Imaging / Thermal / DeviceIO** - `videoSourceToken` where the WSDL asks for a video source

Explicit arguments always win:

```ts
// bag says ProfileToken_2, but this call forces ProfileToken_1
await onvif.media.getStreamUri({
  protocol: 'RTSP',
  profileToken: 'ProfileToken_1',
});
```

If the bag is missing and you omit a required token, methods throw `OnvifValidationError`
(e.g. after `connect({ media: false })`).

### Changing the bag: `setActiveMediaProfile`

```ts
await onvif.setActiveMediaProfile(profileToken);
```

1. Looks up `profileToken` in `onvif.profiles` (must already be loaded).
2. Rebuilds the token bag from that profile.
3. If `videoSources` is non-empty, requires the profile's source to be in that list.
4. Sets `activeMediaProfile` + `defaultProfile`.
5. Updates the matching slot in `activeMediaProfiles` / `defaultProfiles` (same `videoSourceToken`), or appends a slot if needed.

Do **not** assign bag fields by hand (`onvif.activeMediaProfile.profileToken = '...'`). That desyncs
`defaultProfile` and optional config tokens. Always use `setActiveMediaProfile`.

#### Example: list profiles and switch main -> sub stream

```ts
import { Onvif } from 'onvif';

const onvif = new Onvif({
  hostname: '192.168.1.13',
  username: 'admin',
  password: 'admin',
});
await onvif.connect();

for (const p of onvif.profiles) {
  const enc = p.videoEncoderConfiguration;
  console.log(p.token, p.name, enc?.encoding, enc?.resolution);
}

// After connect, bag usually points at the first usable profile (often "main").
console.log('current', onvif.activeMediaProfile?.profileToken);

const sub = onvif.profiles.find((p) => p.token !== onvif.activeMediaProfile?.profileToken);
if (sub) {
  await onvif.setActiveMediaProfile(sub.token);
}

const uri = (await onvif.media.getStreamUri({ protocol: 'RTSP' })).uri;
console.log('streaming', onvif.activeMediaProfile?.profileToken, uri);

await onvif.close();
```

#### Example: pick by encoder resolution

```ts
await onvif.connect();

const hd = onvif.profiles.find(
  (p) => (p.videoEncoderConfiguration?.resolution?.width ?? 0) >= 1280,
);
if (!hd) throw new Error('no HD profile');

await onvif.setActiveMediaProfile(hd.token);
console.log(onvif.defaultProfile?.videoEncoderConfiguration?.resolution);
```

#### Example: PTZ and analytics follow the same bag

```ts
await onvif.connect();
await onvif.setActiveMediaProfile('ProfileToken_1');

// profileToken / configurationToken omitted -> bag
const status = await onvif.ptz.getStatus();
const ptzCfg = await onvif.ptz.getConfiguration(); // ptzConfigurationToken
const rules = await onvif.analytics.getRules(); // videoAnalyticsConfigurationToken

console.log(status.position, ptzCfg.token, rules.length);
```

#### Example: imaging / thermal use the physical video source token

```ts
await onvif.connect();

const settings = await onvif.imaging.getImagingSettings();
const thermal = await onvif.thermal.getConfiguration();

console.log(
  onvif.activeMediaProfile?.videoSourceToken,
  settings.brightness,
  thermal.polarity,
);
```

#### Example: media configuration getters without tokens

```ts
await onvif.connect();

const vsc = await onvif.media.getVideoSourceConfiguration();
const vec = await onvif.media.getVideoEncoderConfiguration();
const vac = await onvif.media.getVideoAnalyticsConfiguration();

console.log(vsc.token, onvif.activeMediaProfile?.videoSourceConfigurationToken);
console.log(vec.token, onvif.activeMediaProfile?.videoEncoderConfigurationToken);
console.log(vac.token, onvif.activeMediaProfile?.videoAnalyticsConfigurationToken);
```

#### Example: validation errors

```ts
await onvif.connect();

try {
  await onvif.setActiveMediaProfile('does-not-exist');
} catch (err) {
  // OnvifValidationError: Unknown media profile token: ...
  console.error(err);
}

try {
  await onvif.setActiveMediaProfile('');
} catch (err) {
  // OnvifValidationError: profileToken is required
  console.error(err);
}
```

#### Example: multi-source device

Connect builds **one bag per video source**. `activeMediaProfile` is the first bag with an
encoder (else the first mapped bag) until you switch.

```ts
await onvif.connect();

console.log(
  onvif.videoSources.map((v) => v.token),
  onvif.activeMediaProfiles.map((b) => ({
    source: b.videoSourceToken,
    profile: b.profileToken,
  })),
);

// Switch current defaults to a profile that belongs to another source
// (must appear in onvif.profiles and reference a known videoSources token).
const other = onvif.profiles.find(
  (p) => p.videoSourceConfiguration?.sourceToken !== onvif.activeMediaProfile?.videoSourceToken,
);
if (other) {
  await onvif.setActiveMediaProfile(other.token);
  console.log('now imaging/stream default to', onvif.activeMediaProfile?.videoSourceToken);
}
```

#### Example: door station / `media: false`

```ts
await onvif.connect({ media: false });
console.log(onvif.activeMediaProfile); // undefined (media skipped)
console.log(onvif.activeDoorToken); // first door
console.log(onvif.activeAccessPointToken); // first access point (if advertised)

await onvif.doorControl.getDoorInfo();
await onvif.doorControl.unlockDoor();
await onvif.accessControl.getAccessPointState();
```

#### Example: refresh bags after editing profiles on the device

```ts
await onvif.connect();

// ... AddVideoEncoderConfiguration / CreateProfile via media.* ...

onvif.profiles = await onvif.media.getProfiles();
await onvif.getActiveMediaProfiles(); // rebuild bags from profiles + videoSources

await onvif.setActiveMediaProfile(onvif.profiles[0]!.token);
```

### Mental model

`GetProfiles` fills `onvif.profiles` with full Media Profile trees. Connect (or
`setActiveMediaProfile`) picks one of those profiles and mirrors it as two views of
the same selection: `activeMediaProfile` (flat tokens used as defaults) and
`defaultProfile` (the full Profile object, including encoder metadata).

When `media`, `media2`, `ptz`, `analytics`, `imaging`, and similar methods omit
tokens, they read from `activeMediaProfile`. Pass an explicit token on the call
to override the bag for that request only.

Non-media services use separate defaults (`activeDoorToken`, `activeAccessPointToken`,
`activeRecordingToken`, `activeRecordingJobToken`, `activeRelayOutputToken`) -- see
[Active entity tokens](#active-entity-tokens-non-media).

## Related

- Auth (WS-Security / Digest / `timeShift`): [auth.md](auth.md)
- Agents and timers: [resources.md](resources.md)
- Lazy connect (no service class modules): [performance.md](performance.md)
- Tests: `__tests__/activeMediaProfile.test.ts`, `__tests__/activeMediaProfile.multisource.test.ts`,
  `__tests__/activeDoor.unit.test.ts`, `__tests__/activeEntityTokens.unit.test.ts`,
  `__tests__/doorcontrol.test.ts`, `__tests__/accesscontrol.test.ts`,
  `__tests__/connection.errors.test.ts`, `__tests__/connection.lazy.test.ts`
