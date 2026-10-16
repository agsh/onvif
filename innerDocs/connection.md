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
5. Optional media discovery (unless `{ media: false }`): Media1 first; Media2 `GetProfiles` only if Media1 is absent or fails
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

## Related

- Agents and timers: [resources.md](resources.md)
- Lazy connect (no service class modules): [performance.md](performance.md)
- Tests: `__tests__/connection.errors.test.ts`, `__tests__/connection.lazy.test.ts`
