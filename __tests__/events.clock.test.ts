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

  const cameraPullPoint = 'http://192.168.1.10:8000/Subscription?id=1';
  const rewrittenTo = 'http://proxy.local:8080/Subscription?id=1';

  function natOnvif() {
    return new Onvif({
      hostname: 'proxy.local',
      port: 8080,
      preserveAddress: true,
      autoConnect: false,
    });
  }

  function expectRewrittenUrlAndTo(opts: { url?: URL; soapHeaders?: { 'a:To'?: { _: string } } }) {
    expect(opts.url?.hostname).toBe('proxy.local');
    expect(opts.url?.port).toBe('8080');
    expect(opts.url?.pathname).toBe('/Subscription');
    expect(opts.url?.search).toBe('?id=1');
    expect(opts.soapHeaders?.['a:To']?._).toBe(rewrittenTo);
  }

  it('rewrites pull-point Address host/port for Events.unsubscribe', async () => {
    const onvif = natOnvif();
    const events = new Events(onvif);
    const request = jest.spyOn(onvif, 'request').mockResolvedValue([{}, ''] as never);

    await events.unsubscribe({
      subscriptionReference: { address: cameraPullPoint },
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
        agent: events.agent,
      }),
    );
    expectRewrittenUrlAndTo(request.mock.calls[0][0] as never);
  });

  it('PullMessages / Renew / SyncPoint put rewritten host in url and SOAP a:To', async () => {
    const onvif = natOnvif();
    const sub = onvif.events.globalSubscription;
    (sub as any).subscription = {
      subscriptionReference: { address: cameraPullPoint },
      currentTime: new Date(),
      terminationTime: new Date(Date.now() + 60000),
    };

    const request = jest.spyOn(onvif, 'request').mockImplementation(async (opts) => {
      if (opts.body && 'Renew' in (opts.body as object)) {
        return [
          {
            renewResponse: {
              currentTime: new Date(),
              terminationTime: new Date(Date.now() + 60_000),
            },
          },
          '',
        ] as never;
      }
      if (opts.body && 'tev:PullMessages' in (opts.body as object)) {
        return [{ pullMessagesResponse: { notificationMessage: [] } }, ''] as never;
      }
      return [{}, ''] as never;
    });

    await sub.pullMessages({ timeout: 'PT1S', messageLimit: 1 });
    await sub.renew();
    await sub.setSynchronizationPoint();

    expect(request).toHaveBeenCalledTimes(3);
    for (const [opts] of request.mock.calls) {
      expectRewrittenUrlAndTo(opts as never);
      expect(opts).toEqual(expect.objectContaining({ agent: onvif.events.agent }));
    }
  });

  it('without preserveAddress keeps camera pull-point host in url and a:To', async () => {
    const onvif = new Onvif({
      hostname: 'proxy.local',
      port: 8080,
      preserveAddress: false,
      autoConnect: false,
    });
    const sub = onvif.events.globalSubscription;
    (sub as any).subscription = {
      subscriptionReference: { address: cameraPullPoint },
      currentTime: new Date(),
      terminationTime: new Date(Date.now() + 60_000),
    };
    const request = jest.spyOn(onvif, 'request').mockResolvedValue([{}, ''] as never);

    await sub.setSynchronizationPoint();

    const opts = request.mock.calls[0][0] as {
      url?: URL;
      soapHeaders?: { 'a:To'?: { _: string } };
    };
    expect(opts.url?.hostname).toBe('192.168.1.10');
    expect(opts.url?.port).toBe('8000');
    expect(opts.soapHeaders?.['a:To']?._).toBe(cameraPullPoint);
  });

  it('push Subscribe a:To uses rewritten events XAddr when preserveAddress is set', async () => {
    const onvif = natOnvif();
    onvif.uri.events = onvif.parseUrl('http://192.168.1.10:8000/onvif/events_service');
    expect(onvif.uri.events.href).toBe('http://proxy.local:8080/onvif/events_service');

    const request = jest.spyOn(onvif, 'request').mockResolvedValue([
      {
        subscribeResponse: {
          subscriptionReference: { address: cameraPullPoint },
          currentTime: new Date(),
          terminationTime: new Date(Date.now() + 60_000),
        },
      },
      '',
    ] as never);

    await onvif.events.subscribe({ url: 'http://client.example/notify', renew: false });

    const opts = request.mock.calls[0][0] as { soapHeaders?: { 'a:To'?: { _: string } } };
    expect(opts.soapHeaders?.['a:To']?._).toBe('http://proxy.local:8080/onvif/events_service');
  });

  it('Subscription renew and setSynchronizationPoint use the Events agent', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const sub = onvif.events.globalSubscription;
    (sub as any).subscription = {
      subscriptionReference: { address: 'http://127.0.0.1/Subscription' },
      currentTime: new Date(),
      terminationTime: new Date(Date.now() + 60_000),
    };
    const request = jest.spyOn(onvif, 'request').mockResolvedValue([
      {
        renewResponse: {
          currentTime: new Date(),
          terminationTime: new Date(Date.now() + 60_000),
        },
      },
      '',
    ] as never);

    await sub.renew();
    await sub.setSynchronizationPoint();

    expect(request).toHaveBeenCalledTimes(2);
    for (const [opts] of request.mock.calls) {
      expect(opts).toEqual(expect.objectContaining({ agent: onvif.events.agent }));
    }
  });
});
