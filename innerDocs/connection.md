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
2. `resetConnectState` - drops previous `uri` / services / profiles / active sources
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
Raw RTSP / snapshot URI strings in Media SOAP bodies are **not** rewritten — only URLs that
go through `parseUrl` (service `uri` map, subscription Address, etc.).

## Related

- Agents and timers: [resources.md](resources.md)
- Lazy connect (no service class modules): [performance.md](performance.md)
- Tests: `__tests__/connection.errors.test.ts`, `__tests__/connection.lazy.test.ts`, `__tests__/events.clock.test.ts`
