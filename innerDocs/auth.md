# Authentication

ONVIF SOAP calls may use two independent credential mechanisms. This package supports both and
often uses them together.

- **WS-Security PasswordDigest** -- UsernameToken in the SOAP header (`Created`, `Nonce`, and
  `Base64(SHA-1(Nonce + Created + Password))`). Controlled by `useWSSecurity` (default `true`).
- **HTTP Digest** -- `Authorization: Digest ...` after an HTTP `401` with `WWW-Authenticate:
  Digest ...` (RFC 7616 plus SHA-1, which some cameras advertise). Always available when
  `username` / `password` are set; independent of `useWSSecurity`.

`connect()` is **not** a login check. Wrong credentials often still "connect" if early probes
succeed unauthenticated. Call something that requires auth (for example
`device.getDeviceInformation()`) to verify.

## Choosing a mode

Default (`useWSSecurity: true`):

1. SOAP envelopes include PasswordDigest when username/password are set.
2. If the device answers with HTTP `401` + Digest challenge, the client retries with
   `Authorization` and caches the challenge for later requests.

Digest-only (common on HTTPS stacks that ignore or dislike WS-Security):

```ts
const onvif = new Onvif({
  hostname: '192.168.1.13',
  port: 443,
  username: 'admin',
  password: 'admin',
  useSecure: true,
  useWSSecurity: false, // credentials only via HTTP Digest
  // secureOptions: { rejectUnauthorized: false }, // self-signed camera cert
});
```

Runnable mock: [https.digest.mjs](https://github.com/agsh/onvif/blob/master/examples/https.digest.mjs).

WS-Security-only devices that never emit HTTP Digest still work with the default: no `401`
retry path is needed if PasswordDigest is accepted on the first request.

## HTTP Digest details

On `401`, the client:

1. Collects all `WWW-Authenticate: Digest ...` headers (`getDigestHeaders`).
2. Picks the **strongest supported** challenge: SHA-512-256 > SHA-256 > SHA-1 > MD5
   (`preferredDigestChallenge`). Unsupported algorithms and `*-sess` variants are skipped.
3. Builds `Authorization` (`digestAuth` / `Onvif.digestAuth`), increments nonce-count (`nc`)
   when `qop=auth`.
4. Caches the challenge headers and reuses them on later requests until auth fails or the
   connection is re-opened.

Stale nonce (`stale=true`): one retry with a fresh `nc` is allowed. Same nonce again after a
failed attempt -> `OnvifAuthError` (`Digest authentication failed`) and the cache is cleared.

`ensureOpen` / `close()` / reconnect clears the Digest cache and `nc` so a new TCP session does
not reuse an old nonce count.

Hikvision (and similar) dual Digest challenges are handled by the strength order above -- see
[quirks.md](quirks.md).

## WS-Security and device time (`timeShift`)

PasswordDigest includes a `Created` timestamp. Cameras with Replay Attack Protection (for example
Axis) reject tokens when the client clock and device clock disagree.

`connect()` calls `getSystemDateAndTime` first and sets `timeShift` so later digests track the
device clock via `process.uptime()` (immune to local NTP jumps after sync). Before `timeShift` is
known, digests use `Date.now()` -- both ends must already be roughly correct for that first call.

Some firmwares require auth already on GetSystemDateAndTime (Panasonic / Vivotek-style). The
client tries unauthenticated first; on a Sender / NotAuthorized SOAP Fault it retries with the
normal authenticated `request()` path. See [quirks.md](quirks.md).

If you see WS-Security / "time check failed" Faults mid-session, fix NTP on the camera or host,
or reconnect so time sync runs again ([#249](https://github.com/agsh/onvif/issues/249)).

## Errors to expect

- **`OnvifAuthError`** -- missing Digest challenge on `401`, unusable challenge, or Digest rejected
  after retry. Check `statusCode` / `xml` when present.
- **`OnvifSoapFaultError`** with NotAuthorized / Sender-not-authorized -- SOAP-layer rejection
  (wrong password with WS-Security, or device wants Digest instead). Helper:
  `isSenderNotAuthorizedFault(err)`.

There is no automatic credential guessing. Prefer the algorithms the camera advertises; the client
already selects the strongest usable Digest offer.

Details: [errors.md](errors.md).

## Using Digest outside SOAP (snapshot HTTP GET)

ONVIF `getSnapshotUri` only returns a URL. Many cameras protect the JPEG with the same Digest
realm. Helpers are exported for that:

- `getDigestHeaders(rawHeaders)` -- from Node `rawHeaders` or a flattened Fetch header list
- `onvif.digestAuth(challengeHeaders, requestOptions)` -- build `Authorization`

Example: [media.snapshot.ts](https://github.com/agsh/onvif/blob/master/examples/media.snapshot.ts).

RTSP often uses Digest as well; this library does not speak RTSP -- pass the same username/password
to your RTSP client.

## Advanced Security

`onvif.advancedSecurity` (keystore / TLS on the device) is experimental and separate from the
HTTP / WS-Security login path above. Prefer TypeDoc for that namespace.

## Related

- Constructor flags: README [Constructor options](../README.md#constructor-options)
- Connect order (time sync before services): [connection.md](connection.md)
- Vendor Digest / clock quirks: [quirks.md](quirks.md)
- Typed auth / fault errors: [errors.md](errors.md)
