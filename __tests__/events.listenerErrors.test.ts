/**
 * User `data` / `event` handler throws must not be classified as PullMessages failures.
 *
 * @jest-environment node
 */

import { Onvif, Subscription } from '../src';

function makePullingSub(onvif: Onvif): Subscription {
  const sub = new Subscription(onvif);
  (sub as any).subscription = {
    subscriptionReference: { address: 'http://127.0.0.1/Subscription' },
    currentTime: new Date(),
    terminationTime: new Date(Date.now() + 60 * 60 * 1000),
  };
  (sub as any).pulling = true;
  return sub;
}

describe('eventPull listener exceptions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not resubscribe when a data listener throws', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const sub = makePullingSub(onvif);
    const errors: Error[] = [];
    sub.on('error', (err) => errors.push(err));
    sub.on('data', () => {
      throw new Error('user handler boom');
    });

    let pulls = 0;
    jest.spyOn(sub, 'pullMessages').mockImplementation(async () => {
      pulls += 1;
      if (pulls > 1) {
        (sub as any).pulling = false;
      }
      return {
        currentTime: new Date(),
        terminationTime: new Date(Date.now() + 60 * 60 * 1000),
        notificationMessage: [{ topic: { _: 'tns1:VideoSource/MotionAlarm' } } as never],
      };
    });
    const renew = jest.spyOn(sub, 'renew').mockResolvedValue({
      currentTime: new Date(),
      terminationTime: new Date(Date.now() + 60 * 60 * 1000),
    });
    const restartEvent = jest.spyOn(sub as any, 'restartEvent').mockResolvedValue(undefined);
    const restartEventRequest = jest.spyOn(sub as any, 'restartEventRequest').mockImplementation(() => undefined);

    await sub.eventPull();

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('user handler boom');
    expect(restartEvent).not.toHaveBeenCalled();
    expect(restartEventRequest).not.toHaveBeenCalled();
    expect(renew).not.toHaveBeenCalled();
    // Loop continued after the listener throw.
    expect(pulls).toBe(2);
  });

  it('delivers later messages in the same pull after an earlier listener throw', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const sub = makePullingSub(onvif);
    const seen: string[] = [];
    sub.on('error', () => undefined);
    sub.on('data', (msg) => {
      const topic = String(msg.topic?._ ?? '');
      seen.push(topic);
      if (topic === 'first') {
        throw new Error('fail first');
      }
    });

    let pulls = 0;
    jest.spyOn(sub, 'pullMessages').mockImplementation(async () => {
      pulls += 1;
      if (pulls > 1) {
        (sub as any).pulling = false;
      }
      return {
        currentTime: new Date(),
        terminationTime: new Date(Date.now() + 60 * 60 * 1000),
        notificationMessage: [
          { topic: { _: 'first' } } as never,
          { topic: { _: 'second' } } as never,
        ],
      };
    });
    jest.spyOn(sub as any, 'restartEvent').mockResolvedValue(undefined);

    await sub.eventPull();

    expect(seen).toEqual(['first', 'second']);
  });

  it('Onvif event listener throw does not rebuild global pull point', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const sub = onvif.events.globalSubscription;
    (sub as any).subscription = {
      subscriptionReference: { address: 'http://127.0.0.1/Subscription' },
      currentTime: new Date(),
      terminationTime: new Date(Date.now() + 60 * 60 * 1000),
    };
    (sub as any).pulling = true;

    const eventsErrors: Error[] = [];
    onvif.on('eventsError', (err) => eventsErrors.push(err));
    onvif.on('event', () => {
      throw new Error('onvif event handler boom');
    });

    let pulls = 0;
    jest.spyOn(sub, 'pullMessages').mockImplementation(async () => {
      pulls += 1;
      if (pulls > 1) {
        (sub as any).pulling = false;
      }
      return {
        currentTime: new Date(),
        terminationTime: new Date(Date.now() + 60 * 60 * 1000),
        notificationMessage: [{ topic: { _: 'tns1:Device/Trigger/DigitalInput' } } as never],
      };
    });
    const restartEvent = jest.spyOn(sub as any, 'restartEvent').mockResolvedValue(undefined);

    await sub.eventPull();

    expect(eventsErrors.some((e) => e.message === 'onvif event handler boom')).toBe(true);
    expect(restartEvent).not.toHaveBeenCalled();
    expect(pulls).toBe(2);
  });
});
