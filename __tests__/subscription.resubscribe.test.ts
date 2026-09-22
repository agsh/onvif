/**
 * How a Subscription rebuilds its pull point after a failed pull. Every attempt authenticates, so a
 * device that faults on every pull can lock the account when the attempts are not spaced out.
 *
 * @jest-environment node
 */

import { Onvif, Subscription } from '../src';

const MIN_EVENT_RECONNECT_MS = 1000;

interface Harness {
  readonly sub: Subscription;
  readonly createPullPoint: jest.Mock;
  readonly pullMessages: jest.Mock;
}

/** A Subscription whose device accepts a pull point and then fails every pull. */
function buildFailingSubscription(): Harness {
  const createPullPoint = jest.fn().mockResolvedValue({
    subscriptionReference: { address: 'http://192.0.2.1/onvif/event' },
    currentTime: new Date(),
    // Already expired, which is the branch that rebuilds the pull point.
    terminationTime: new Date(Date.now() - 1000),
  });
  const onvif = {
    events: { createPullPointSubscription: createPullPoint, resetAgent: jest.fn() },
    request: jest.fn().mockResolvedValue([{}]),
    uri: { events: new URL('http://192.0.2.1/onvif/event') }
  } as unknown as Onvif;

  const sub = new Subscription(onvif);
  const pullMessages = jest.fn().mockRejectedValue(new Error('SOAP Fault: subscription not known'));
  sub.pullMessages = pullMessages as unknown as Subscription['pullMessages'];
  // The rebuild reports through the error event, and an emitter without a listener would throw.
  sub.on('error', () => undefined);
  return { sub, createPullPoint, pullMessages };
}

/** Lets every already resolved promise run, so an awaited chain reaches its next timer. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

describe('Subscription rebuild after a failed pull', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('waits the reconnect interval before it asks for a new pull point', async () => {
    const { sub, createPullPoint } = buildFailingSubscription();

    await sub.subscribe();
    await settle();

    expect(createPullPoint).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(MIN_EVENT_RECONNECT_MS - 1);
    await settle();
    expect(createPullPoint).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    await settle();
    expect(createPullPoint).toHaveBeenCalledTimes(2);

    await sub.unsubscribe();
  });

  it('widens the interval while the device keeps failing', async () => {
    const { sub } = buildFailingSubscription();

    await sub.subscribe();
    await settle();
    const afterFirst = sub.eventReconnectMs;

    jest.advanceTimersByTime(afterFirst);
    await settle();

    expect(sub.eventReconnectMs).toBeGreaterThan(afterFirst);

    await sub.unsubscribe();
  });

  it('leaves a pending rebuild alone once the caller unsubscribed', async () => {
    const { sub, createPullPoint } = buildFailingSubscription();

    await sub.subscribe();
    await settle();
    await sub.unsubscribe();

    jest.advanceTimersByTime(10 * MIN_EVENT_RECONNECT_MS);
    await settle();

    expect(createPullPoint).toHaveBeenCalledTimes(1);
  });
});
