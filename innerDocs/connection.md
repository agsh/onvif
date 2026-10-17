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
2. `resetConnectState` - drops previous `uri` / services / profiles / active media profiles
3. Time sync (`getSystemDateAndTime`) for WS-Security
4. `GetServices` (`IncludeCapability: false`), or `GetCapabilities` if that fails
5. Optional media discovery (unless `{ media: false }`): Media1 first; Media2 `GetProfiles` only if Media1 is absent or fails. If `media` is omitted, uses `onvif.defaultMedia` (Discovery may have set `false` for access-only door stations)
6. Emits `connect` and returns the same instance

## Errors during `connect()`

| Failure | Behaviour |
| --- | --- |
| Time sync / network down | Promise **rejects**; discovery state already cleared; **no** `connect` event |
| `GetServices` fails | Falls back to `GetCapabilities` |
| Both service discovery calls fail | Promise **rejects**; state stays empty |
| Media `GetProfiles` / sources fail | Emits `warn`, keeps service URIs, completes `connect` (door stations / Axis quirks) |

After a rejected `connect()`, the client is still open (`closed === false`). Call `connect()` again when the device is reachable - there is no half-filled `uri` from the failed attempt (reset runs first).

## Loss of connection after a successful connect

A failed SOAP call (`ETIMEDOUT`, `ECONNRESET`, SOAP Fault, ...) rejects that Promise only. It does **not** mark the client closed or clear discovery cache. Retry the method, or `close()` + `connect()` for a full rediscovery (e.g. after camera reboot when PTZ XAddr disappeared).

Pull-point / events reconnection is separate - see [events.md](events.md).

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

For each `videoSources[i]`:

1. Prefer profiles whose `videoSourceConfiguration.sourceToken` matches that source **and** that have a `videoEncoderConfiguration`.
2. Else any profile with a video encoder.
3. Else any profile.
4. Take the **first** match -> `defaultProfiles[i]` + `activeMediaProfiles[i]` (token bag).
5. Slot `0` also becomes `defaultProfile` / `activeMediaProfile` (the process-wide defaults).

Pseudo-flow:

```text
GetProfiles -> onvif.profiles
GetVideoSources -> onvif.videoSources
for each video source:
  pick best Profile
  bag = tokens copied from that Profile
  activeMediaProfiles[i] = bag
  defaultProfiles[i] = Profile
activeMediaProfile = activeMediaProfiles[0]
defaultProfile = defaultProfiles[0]
```

Rebuild the same way later with `await onvif.getActiveMediaProfiles()` (e.g. after you mutated
profiles on the device and refreshed `onvif.profiles`).

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

const uri = (await onvif.media.getStreamUri({ protocol: 'RTSP' })).mediaUri.uri;
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

Connect builds **one bag per video source**. `activeMediaProfile` is always slot `0` until you switch.

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

#### Example: door station / `media: false` - no bag

```ts
await onvif.connect({ media: false });
console.log(onvif.activeMediaProfile); // undefined

// Pass tokens explicitly, or connect with media: true when streams exist.
await onvif.doorControl.getDoorInfo({ token: 'DoorToken_1' });
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

## Related

- Agents and timers: [resources.md](resources.md)
- Lazy connect (no service class modules): [performance.md](performance.md)
- Tests: `__tests__/activeMediaProfile.test.ts`, `__tests__/connection.errors.test.ts`, `__tests__/connection.lazy.test.ts`, `__tests__/events.clock.test.ts`
