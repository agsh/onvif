# Resources / teardown

What keeps a Node process or TCP sockets alive, and how to release them.

## What owns what

| Resource | Created by | Released by |
| --- | --- | --- |
| Main SOAP `http(s).Agent` (keep-alive) | `Onvif` when `agent` option is omitted | `await onvif.close()` (owned agents only) |
| Events `http(s).Agent` (`keepAlive: false`) | `Events` constructor / `resetAgent` after close | `close()` or `Subscription.unsubscribe()` -> `resetAgent` |
| Global pull-point loop | First `onvif.on('event', ...)` (or explicit subscribe) | Removing all `event` listeners, or `close()` |
| Push renew `setTimeout` | `events.subscribe({ renew: true, ... })` | `close()` -> `clearPushRenew()` |
| Pull reconnect `setTimeout` | Soft/fatal pull failures inside `Subscription` | `unsubscribe()` / `close()` -> `clearReconnectTimer()` |
| WS-Discovery UDP sockets | `Discovery.probe()` | Probe timeout / finish (always closed) |
| Caller-supplied `agent` | You | **You** - `close()` does not destroy it |

## Always call `close()` when done

```ts
const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();
try {
  // ...
} finally {
  await onvif.close();
}
```

Without `close()`, the default keep-alive agent can leave idle sockets open and prevent a short
script (or Jest without `--forceExit`) from exiting. Safe to call more than once. After `close()`,
`await onvif.connect()` recreates owned agents and reattaches auto-`event` hooks.

`agent: false` or a custom/shared `Agent` - `close()` still stops events / renew timers, but does
not destroy your agent.

## Extra `Subscription` instances

`close()` unsubscribes **`events.globalSubscription` only**. If you created your own
`new Subscription(onvif, ...)`, call `await sub.unsubscribe()` yourself (or you may leave a
PullMessages long-poll and reconnect timer running).

## Compatibility `Cam`

`cam.close(cb)` / `await cam.close()` forwards to `Onvif.close` for the same teardown.

## Tests

Automated checks: `__tests__/unit.options.builders.test.ts` (destroy agents, push renew cancel,
caller-supplied agent) and `__tests__/resources.lifecycle.test.ts` (connect/close cycles,
reconnect timer cleared on close). There is no long soak / heap-growth suite - treat heap notes in
[performance.md](performance.md) as illustrative.
