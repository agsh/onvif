# Events

## Common approach

To subscribe to all events using pull-point subscription you can just use `.on()` method, since the `Onvif` class
inherits from the `EventEmitter` class.

```ts
const onvif = new Onvif({/**...*/});
function eventHandler(msg) {
  console.log(msg);
  onvif.off('event');
}
onvif.on('event', eventHandler);
```

## Subscription class

If you need to subscribe to events, you can use the `Subscription` class. This class is for the specific subscriptions,
for example, when we need to subscribe to events from the camera with the filters. or add some more subscriptions
than the common one. It uses the pull-point subscription. It inherits from EventEmitter.
And emits two events: `data` and `error`. To use it you need to call `subscribe()` method. And to stop the device
subscription and remove all listeners you need to call `unsubscribe()` method.

The first and the only one argument for `data` is the NotificationMessage object.

`error` is emitted for pull / renew failures (those rebuild the pull point). If a synchronous
`data` handler throws, that exception is also surfaced as `error` when an `error` listener is
present, but it does **not** tear down or recreate the PullPoint -- the pull loop continues with
the remaining messages.

Always attach `sub.on('error', ...)` on a standalone `Subscription`. An emitted `error` with no
listener follows the default `EventEmitter` rule and can terminate the Node process. (The global
`onvif.on('event')` path forwards those failures as `eventError` on `Onvif` instead.)

```ts
const onvif = new Onvif({/**...*/});
await onvif.connect();
const sub = new Subscription(onvif, {
  filter: {
    topicExpression: [
      {
        expression: 'tns1:RuleEngine/CellMotionDetector/Motion',
        dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
      },
    ],
  },
});
sub.on('error', (err) => console.error('subscription', err));
sub.on('data', async (data) => {
  console.log(new Date().toLocaleTimeString(), 'motion', data.topic._, data.message.message.data);
  await sub.unsubscribe();
});
await sub.subscribe();
```

For a full interactive example, see
[events.with.filter.ts](https://github.com/agsh/onvif/blob/master/examples/events.with.filter.ts).

This class is used internally by the `Onvif` class for the common `event` listener.

## Pull-point reconnection

`Subscription` (and `onvif.on('event')` via `events.globalSubscription`) keeps pulling after
transient loss of the device link. You do not need to call `subscribe()` again yourself.

Soft network errors (`ECONNRESET`, `ETIMEDOUT`, `ENETUNREACH`, `HPE_CLOSED_CONNECTION`) while the
pull point is still within its termination time: Renew + SetSynchronizationPoint, then retry
PullMessages on the same subscription. Emits `connectionError` as `Error` (forwarded as
`eventError` on `Onvif` for the global listener). Network errors may still carry a `code`
field; SOAP faults are `OnvifError` subclasses -- both are typed as `Error`, not only
`ErrnoException`.

Fatal cases (SOAP Fault, expired pull point, soft renew cannot save it): wait with backoff
(`eventReconnectMs`, about 1s up to about 2 minutes; a successful pull resets it), best-effort
Unsubscribe the old pull point, then `CreatePullPointSubscription` again and resume the loop.
Emits `error` / `eventError` on each fatal failure.

A throw from a `data` / `onvif.on('event')` handler is **not** a fatal pull failure: it is
caught per message, optionally forwarded as `error` (own `Subscription`) or `eventError`
(`Onvif` global listener), and the loop keeps the same PullPoint. On an own `Subscription`,
listen for `error` yourself -- an unhandled `error` emit can exit the process.

`unsubscribe()` / `onvif.close()` clear the reconnect timer and stop auto-resubscribe. Own
`new Subscription(...)` instances are not torn down by `close()` - call `unsubscribe()` on them.

Automated coverage: `__tests__/subscription.resubscribe.test.ts` (SOAP mock) and the recovery
case in `__tests__/events.test.ts` (Happytime).

## Cancelling a long-poll with `AbortSignal`

`PullMessages` can block for up to a minute waiting for notifications. Pass an
[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) to abort the HTTP
request early (shutdown, timeout you control, or switching subscriptions):

```ts
import { Onvif, Subscription } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

const sub = new Subscription(onvif, 'pullPoint');
await sub.subscribe();

const ac = new AbortController();
// Abort after 5s even if the camera has not returned yet
const timer = setTimeout(() => ac.abort(), 5_000);

try {
  const { notificationMessage } = await sub.pullMessages({
    timeout: 'PT1M',
    messageLimit: 10,
    signal: ac.signal,
  });
  console.log('got', notificationMessage?.length ?? 0, 'messages');
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    console.log('pull cancelled');
  } else {
    throw err;
  }
} finally {
  clearTimeout(timer);
  await sub.unsubscribe();
  await onvif.close();
}
```

The same `signal` option works on any `onvif.request({ ..., signal })` call, not only events.

## Push WS-BaseNotification

With push (WS-BaseNotification), the camera sends event notifications to an HTTP endpoint you host, instead of you
polling the device.

To use it: start an HTTP server reachable from the camera, call `subscribe` with that URL as the consumer reference,
keep the subscription alive with `renew` before it expires, and call `unsubscribe` when you are done. Method signatures
are in the [Events class documentation][events-docs]. A working flow is shown in
[events.with.filter.ts](https://github.com/agsh/onvif/blob/master/examples/events.with.filter.ts) - the HTTP server at
lines 50-65, and subscribe / unsubscribe at lines 143-164.

[events-docs]: https://agsh.github.io/onvif/classes/Events.html
