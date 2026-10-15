/**
 * Pull-point clock skew and preserveAddress for subscription URLs.
 *
 * @jest-environment node
 */

import { Onvif, Subscription, Events } from '../src';

describe('pull-point terminationTime clock skew', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('compares and stores PullMessages expiry in local wall clock', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const sub = new Subscription(onvif);
    const deviceBehindMs = 60 * 60 * 1000;
    const remainingMs = 30 * 60 * 1000;
    const now = Date.now();

    (sub as any).subscription = {
      subscriptionReference: { address: 'http://127.0.0.1/Subscription' },
      currentTime: new Date(now - deviceBehindMs),
      terminationTime: new Date(now + remainingMs),
    };
    (sub as any).pulling = true;

    let pulls = 0;
    jest.spyOn(sub, 'pullMessages').mockImplementation(async () => {
      pulls += 1;
      if (pulls > 1) {
        (sub as any).pulling = false;
      }
      return {
        currentTime: new Date(now - deviceBehindMs),
        // Still 30 minutes left on the device clock (device is 1h behind local).
        terminationTime: new Date(now - deviceBehindMs + remainingMs),
        notificationMessage: [],
      };
    });
    const renew = jest.spyOn(sub, 'renew').mockResolvedValue({
      currentTime: new Date(now - deviceBehindMs),
      terminationTime: new Date(now - deviceBehindMs + remainingMs),
    });

    await sub.eventPull();

    // Raw device terminationTime is in the past vs Date.now(); without localConversion renew would fire.
    expect(renew).not.toHaveBeenCalled();
    const stored = +(sub as any).subscription.terminationTime;
    expect(stored).toBeGreaterThan(now + remainingMs - 5_000);
    expect(stored).toBeLessThan(now + remainingMs + 5_000);
  });

  it('converts createPullPointSubscription termination to local time on subscribe', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.events = new URL('http://127.0.0.1/onvif/events');
    const deviceBehindMs = 60 * 60 * 1000;
    const remainingMs = 10 * 60 * 1000;
    const now = Date.now();

    jest.spyOn(onvif.events, 'createPullPointSubscription').mockResolvedValue({
      subscriptionReference: { address: 'http://127.0.0.1/Subscription' },
      currentTime: new Date(now - deviceBehindMs),
      terminationTime: new Date(now - deviceBehindMs + remainingMs),
    });

    const sub = new Subscription(onvif);
    jest.spyOn(sub as any, 'eventPull').mockImplementation(() => undefined);
    await sub.subscribe();

    const stored = +(sub as any).subscription.terminationTime;
    expect(stored).toBeGreaterThan(now + remainingMs - 5_000);
    expect(stored).toBeLessThan(now + remainingMs + 5_000);
  });
});

describe('subscription URL preserveAddress', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rewrites pull-point Address host/port for Events.unsubscribe', async () => {
    const onvif = new Onvif({
      hostname: 'proxy.local',
      port: 8080,
      preserveAddress: true,
      autoConnect: false,
    });
    const events = new Events(onvif);
    const request = jest.spyOn(onvif, 'request').mockResolvedValue([{}, ''] as never);

    await events.unsubscribe({
      subscriptionReference: { address: 'http://192.168.1.10:8000/Subscription?id=1' },
      currentTime: new Date(),
      terminationTime: new Date(Date.now() + 60_000),
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.objectContaining({
          hostname: 'proxy.local',
          port: '8080',
          pathname: '/Subscription',
          search: '?id=1',
        }),
      }),
    );
  });
});
