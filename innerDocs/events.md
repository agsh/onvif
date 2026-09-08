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

The first and the only one argument for `data` is the NotificationMessage object. And an `error` raised only when
the connection to the device is lost.

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
sub.on('data', async (data) => {
  console.log(new Date().toLocaleTimeString(), 'motion', data.topic._, data.message.message.data);
  await sub.unsubscribe();
});
await sub.subscribe();
```

For a full interactive example, see
[events.with.filter.ts](https://github.com/agsh/onvif/blob/v1/examples/events.with.filter.ts).

This class is used internally by the `Onvif` class for the common `event` listener.

## Push WS-BaseNotification

With push (WS-BaseNotification), the camera sends event notifications to an HTTP endpoint you host, instead of you
polling the device.

To use it: start an HTTP server reachable from the camera, call `subscribe` with that URL as the consumer reference,
keep the subscription alive with `renew` before it expires, and call `unsubscribe` when you are done. Method signatures
are in the [Events class documentation][events-docs]. A working flow is shown in
[events.with.filter.ts](https://github.com/agsh/onvif/blob/v1/examples/events.with.filter.ts) — the HTTP server at
lines 50–65, and subscribe / unsubscribe at lines 143–164.

[events-docs]: https://agsh.github.io/onvif/classes/Events.html
