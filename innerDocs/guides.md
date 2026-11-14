# Task guides

Short paths from a common goal to working code. Full API: TypeDoc. Lifecycle:
[connection.md](connection.md). Auth: [auth.md](auth.md). Quirks: [quirks.md](quirks.md).
README onboarding for non-camera profiles:
[Beyond cameras](../README.md#beyond-cameras-profiles-c--a--d--g--m).

By goal:

- [Get an RTSP URI](#get-an-rtsp-uri) -- Profiles S / T
- [Download a snapshot JPEG](#download-a-snapshot-jpeg) -- S / T
- [Move PTZ](#move-ptz) -- S / T
- [Listen for motion events](#listen-for-motion-events) -- core Events (+ analytics topics)
- [Replay a recording](#replay-a-recording) -- Profile G
- [Unlock a door](#unlock-a-door) -- Profiles C / A
- [Handle a Profile D access request](#handle-a-profile-d-access-request) -- Profile D

By profile (quick):

- **S / T (video)** -- RTSP, snapshot, PTZ, imaging
- **C / A (access unit)** -- `connect({ media: false })`, `doorControl` / `accessControl` /
  `credential` / `accessRules` / `schedule`; defaults `activeDoorToken` /
  `activeAccessPointToken`
- **D (access peripheral)** -- same AccessControl / DoorControl / Credential services;
  client decides via `externalAuthorization` (+ `feedback`, optional whitelist/blacklist)
- **G (recording)** -- `recording` / `replay` / `search` / `receiver`; defaults
  `activeRecordingToken` / `activeRecordingJobToken`
- **M (analytics)** -- `analytics` / `analyticsDevice` (often tied to the Media profile bag)

## Get an RTSP URI

Goal: play live video in VLC / FFmpeg / your RTSP client.

```ts
import { Onvif, withUrlCredentials } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

let uri: string;
if (onvif.uri.media) {
  // Media 1.0 (Profile S) -- MediaUri object
  uri = (await onvif.media.getStreamUri({ protocol: 'RTSP' })).uri;
} else {
  // Media2-only / Profile T -- unwraps to string
  uri = await onvif.media2.getStreamUri({ protocol: 'RtspUnicast' });
}

// Optional: embed credentials for players that need userinfo in the URL.
// Do not log `playable` - it embeds the password in cleartext userinfo.
const playable = withUrlCredentials(uri, onvif.username, onvif.password);
// Pass `playable` to VLC / FFmpeg / your RTSP client.
console.log(uri); // device URI without credentials

await onvif.close();
```

Choose:

- Omit-token calls use `activeMediaProfile`. Switch channel / stream with
  `setActiveMediaProfile(profileToken)` -- [connection.md](connection.md#active-media-profile-token-bag).
- Prefer `onvif.media` when Media1 works; use `onvif.media2` for Profile T encoder/stream helpers
  (`getStreamUri` unwraps to a string).
- `preserveAddress` rewrites SOAP XAddrs, **not** the host inside the RTSP string -- fix that in
  the app if the camera returns a LAN/loopback host you cannot reach.

Typical failures: empty profiles (`connect({ media: true })`), NVR stub profiles without encoder
([quirks.md](quirks.md)), wrong channel bag.

Examples: [media.stream.js](https://github.com/agsh/onvif/blob/master/examples/media.stream.js),
[media2.profiles.js](https://github.com/agsh/onvif/blob/master/examples/media2.profiles.js),
[rtsp.socketio.ptz.js](https://github.com/agsh/onvif/blob/master/examples/rtsp.socketio.ptz.js).

## Download a snapshot JPEG

Goal: save one still image. ONVIF only returns a URL; the HTTP GET is yours.

```ts
const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

const { uri } = await onvif.media.getSnapshotUri();
// Media2: const uri = await onvif.media2.getSnapshotUri({ ... });

// GET uri with the same username/password. Many cameras answer with HTTP Digest --
// use getDigestHeaders + onvif.digestAuth (see example / auth.md). There is no fetchSnapshot().

await onvif.close();
```

Choose: same profile bag as RTSP. Snapshot Digest often matches SOAP credentials -- see
[auth.md](auth.md#using-digest-outside-soap-snapshot-http-get).

Example: [media.snapshot.ts](https://github.com/agsh/onvif/blob/master/examples/media.snapshot.ts)
(full Fetch + `getDigestHeaders` + `digestAuth`).

## Move PTZ

Goal: pan / tilt / zoom without guessing AbsoluteMove.

```ts
const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

if (!onvif.uri.ptz) {
  throw new Error('No PTZ XAddr');
}

const nodes = await onvif.ptz.getNodes();
// Inspect node.supportedPTZSpaces -- Absolute / Relative / Continuous are optional

await onvif.ptz.continuousMove({ velocity: { x: 0.3, y: 0, zoom: 0 } });
await new Promise((r) => setTimeout(r, 500));
await onvif.ptz.stop();

await onvif.close();
```

Choose:

- Call `getNodes()` (or read spaces on the PTZ configuration) **before** AbsoluteMove. Many cameras
  only expose ContinuousMove / RelativeMove.
- Omit-token moves use the PTZ token from `activeMediaProfile`.

Typical failures: SOAP Fault on AbsoluteMove (no absolute spaces); stream works but PTZ is a no-op
on some firmwares ([quirks.md](quirks.md)).

Examples: [ptz.nodes.js](https://github.com/agsh/onvif/blob/master/examples/ptz.nodes.js),
[ptz.keyboard.js](https://github.com/agsh/onvif/blob/master/examples/ptz.keyboard.js).

## Listen for motion events

Goal: react to CellMotion (or all topics) without managing PullMessages yourself.

```ts
import { Onvif, Subscription } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

// All topics -- first listener starts the global pull-point
onvif.on('event', (msg) => console.log(msg.topic?._));
onvif.on('eventError', console.error);

// Or a filtered pull-point (always attach error -- unhandled error can exit Node)
const sub = new Subscription(onvif, {
  filter: {
    topicExpression: [{ expression: 'tns1:RuleEngine/CellMotionDetector/Motion' }],
  },
});
sub.on('error', console.error);
sub.on('data', (msg) => console.log('motion', msg.topic?._));
await sub.subscribe();

// later: onvif.removeAllListeners('event'); await sub.unsubscribe(); await onvif.close();
```

Choose: global `event` for simple apps; `Subscription` for filters / extra pull-points.
`close()` does not unsubscribe your own `Subscription` instances.

Reconnect / soft vs fatal pull: [events.md](events.md). Tapo empty PullMessages:
[quirks.md](quirks.md).

Examples: [events.motion.ts](https://github.com/agsh/onvif/blob/master/examples/events.motion.ts),
[events.with.filter.ts](https://github.com/agsh/onvif/blob/master/examples/events.with.filter.ts).

## Replay a recording

Goal: RTSP URI for Profile G playback (NVR / camera recording).

```ts
const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

const recordings = await onvif.recording.getRecordings();
if (!recordings.length) {
  throw new Error('No recordings');
}

const token = recordings[0].recordingToken;
// connect() may already set activeRecordingToken when Recording is advertised
const replayUri = await onvif.replay.getReplayUri({
  protocol: 'RTSP',
  recordingToken: token,
});
console.log(replayUri);

await onvif.close();
```

Choose: list via `recording`, play via `replay`. Search / find recordings by time uses
`onvif.search` (TypeDoc). Entity tokens:
[connection.md](connection.md#active-entity-tokens-non-media).

Typical failures: no Recording XAddr; `Optional Action Not Implemented` on some Uniview helpers
([quirks.md](quirks.md)).

Example: [replay.uri.js](https://github.com/agsh/onvif/blob/master/examples/replay.uri.js).

## Unlock a door

Goal: Profile C / A door station -- unlock briefly without probing Media.

```ts
const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect({ media: false }); // door stations often have no Media

if (!onvif.uri.doorcontrol) {
  throw new Error('No DoorControl service');
}

const { doorInfo = [] } = await onvif.doorControl.getDoorInfoList();
const token = doorInfo[0]?.token ?? onvif.activeDoorToken;
if (!token) {
  throw new Error('No door token');
}

await onvif.doorControl.unlockDoor({ token });
await new Promise((r) => setTimeout(r, 2000));
await onvif.doorControl.lockDoor({ token });

await onvif.close();
```

Choose: Discovery may set `defaultMedia: false` on access-only ProbeMatch scopes; honor that or
pass `{ media: false }` yourself. Access points / credentials live under `accessControl` /
`credential` (TypeDoc).

Example: [door.unlock.js](https://github.com/agsh/onvif/blob/master/examples/door.unlock.js).

## Handle a Profile D access request

Goal: Profile D peripheral -- capture identifier / request events, decide grant or deny in
your app, tell the device with `ExternalAuthorization` (optional Feedback / DoorControl).

Profile D uses the **same** Access Control / Door Control / Credential APIs as C / A. The
difference is the scenario: the device does not store access rules; the client does.

```ts
import { Onvif, Subscription } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect({ media: false });

if (!onvif.uri.accesscontrol) {
  throw new Error('No AccessControl service');
}

const { accessPointInfo = [] } = await onvif.accessControl.getAccessPointInfoList();
const ap = accessPointInfo.find((p) => p.capabilities?.externalAuthorization) ?? accessPointInfo[0];
if (ap?.token) {
  await onvif.setActiveAccessPoint(ap.token);
}

const sub = new Subscription(onvif, {
  filter: {
    topicExpression: [{ expression: 'tns1:AccessControl//.' }],
  },
});
sub.on('error', console.error);
sub.on('data', async (msg) => {
  const topic = String(msg.topic?._ ?? '');
  if (!topic.includes('AccessControl/Request/')) {
    return;
  }
  // Replace with your policy / ACS lookup (credential token, card number, etc.)
  const decision = 'Granted'; // or 'Denied'
  await onvif.accessControl.externalAuthorization({ decision });
  // Optional: await onvif.accessControl.feedback({ feedbackType: 'pt:Ok' });
  // Optional: await onvif.doorControl.accessDoor();
});
await sub.subscribe();
```

Choose:

- Require `accessPoint.capabilities.externalAuthorization` (and often `identifierAccess`)
  before relying on Request/* events.
- Filter topics: `Request/Credential`, `Request/Identifier`, `Request/Anonymous`,
  `Request/Timeout`; also listen for AccessGranted / Denied / AccessTaken when auditing.
- Optional offline lists: `credential.getWhitelist` / `addToWhitelist` /
  `getBlacklist` / `addToBlacklist` (+ `getSupportedFormatTypes`) when the device
  advertises those capabilities.
- Door pulse after grant: `doorControl.accessDoor` / `unlockDoor` when DoorControl is
  present (same as C).

Typical failures: AccessControl without `ExternalAuthorization`; Request events never
arrive because pull-point filter is too narrow; Feedback type not in
`supportedFeedbackTypes` (device ignores unknown types).

Example:
[access.externalAuthorization.js](https://github.com/agsh/onvif/blob/master/examples/access.externalAuthorization.js).

## Related

- [troubleshooting.md](troubleshooting.md) -- symptom -> cause -> where to look
- [connection.md](connection.md) -- connect, profiles, entity tokens
- [auth.md](auth.md) -- Digest / WS-Security
- [events.md](events.md) -- pull-point reconnect
- [quirks.md](quirks.md) -- vendor limits
- [errors.md](errors.md) -- typed failures
