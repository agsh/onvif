/**
 * Unit and integration tests for the Events service.
 *
 * Happytime ONVIF server emits two notifications on each CreatePullPointSubscription:
 *   - tns1:Device/Trigger/Relay
 *   - tns1:Device/Trigger/DigitalInput
 *
 * @jest-environment node
 */

import { EventEmitter } from 'events';
import { NotificationMessage, Onvif, Subscription } from '../src';
import happytimeOnvifOptions from './happytime.json';

const HAPPYTIME_TOPICS = {
  relay: 'tns1:Device/Trigger/Relay',
  digitalInput: 'tns1:Device/Trigger/DigitalInput',
} as const;

const CONCRETE_SET_DIALECT = 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet';

let cam: Onvif;

/**
 * Collect the next `count` emissions of `event` from `emitter`, or reject on timeout.
 */
function collectEvents<T>(
  emitter: EventEmitter,
  event: string,
  count: number,
  timeoutMs = 15_000,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const messages: T[] = [];
    const onMessage = (msg: T) => {
      messages.push(msg);
      if (messages.length >= count) {
        cleanup();
        resolve(messages);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${count} "${event}" event(s); got ${messages.length}`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      emitter.off(event, onMessage);
    };
    emitter.on(event, onMessage);
  });
}

/**
 * Wait until all required notification topics have been seen.
 * HappyTime may also emit leftover Door/Access topics from earlier suites — ignore those.
 */
function collectUntilTopics(
  emitter: EventEmitter,
  event: string,
  requiredTopics: readonly string[],
  timeoutMs = 15_000,
): Promise<NotificationMessage[]> {
  const needed = new Set(requiredTopics);
  return new Promise((resolve, reject) => {
    const messages: NotificationMessage[] = [];
    const seen = new Set<string>();
    const onMessage = (msg: NotificationMessage) => {
      messages.push(msg);
      const topic = topicOf(msg);
      if (needed.has(topic)) {
        seen.add(topic);
      }
      if (seen.size >= needed.size) {
        cleanup();
        resolve(messages);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out waiting for topics [${requiredTopics.join(', ')}]; got [${[...seen].join(', ') || 'none'}]`,
        ),
      );
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      emitter.off(event, onMessage);
    };
    emitter.on(event, onMessage);
  });
}

function topicOf(msg: NotificationMessage): string {
  return msg.topic._;
}

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

afterEach(async () => {
  cam.removeAllListeners('event');
  // Let globalSubscription.unsubscribe() from removeListener settle.
  await new Promise((resolve) => setTimeout(resolve, 50));
});

describe('Events', () => {
  describe('getServiceCapabilities', () => {
    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.events.getServiceCapabilities();
      expect(caps.WSSubscriptionPolicySupport).toBe(true);
      expect(caps.WSPullPointSupport).toBe(true);
    });
  });

  describe('getEventProperties', () => {
    it('should return event properties from the device', async () => {
      const result = await cam.events.getEventProperties();

      expect(result.topicNamespaceLocation).toBe('http://www.onvif.org/onvif/ver10/topics/topicns.xml');
      expect(result.fixedTopicSet).toBe(true);
      expect(result.topicSet).toBeDefined();
      expect(result.topicExpressionDialect).toEqual(
        expect.arrayContaining([
          'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
          'http://docs.oasis-open.org/wsn/t-1/TopicExpression/Concrete',
        ]),
      );
      expect(result.messageContentFilterDialect).toBe('http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter');
      expect(result.messageContentSchemaLocation).toBe('http://www.onvif.org/onvif/ver10/schema/onvif.xsd');
    });

    it('should include video motion alarm topic metadata', async () => {
      const result = await cam.events.getEventProperties();
      const topicSet = result.topicSet as {
        videoSource?: Array<{
          motionAlarm?: {
            messageDescription?: unknown;
          };
        }>;
      };
      const motionAlarm = topicSet.videoSource?.find((videoSource) => videoSource.motionAlarm)?.motionAlarm;

      expect(motionAlarm).toBeDefined();
      expect(motionAlarm?.messageDescription).toMatchObject({
        isProperty: true,
        source: {
          simpleItemDescription: {
            name: 'Source',
            type: 'tt:ReferenceToken',
          },
        },
        data: {
          simpleItemDescription: {
            name: 'State',
            type: 'xs:boolean',
          },
        },
      });
    });
  });

  describe("Onvif 'event' (globalSubscription)", () => {
    it('should start pull-point subscription when the first event listener is added', async () => {
      const expected = [HAPPYTIME_TOPICS.relay, HAPPYTIME_TOPICS.digitalInput] as const;
      const messagesPromise = collectUntilTopics(cam, 'event', expected);
      const handler = jest.fn();
      cam.on('event', handler);

      const messages = await messagesPromise;
      expect(messages.map(topicOf)).toEqual(expect.arrayContaining([...expected]));
      expect(handler.mock.calls.length).toBeGreaterThanOrEqual(2);
      messages.forEach((msg) => {
        expect(msg).toHaveProperty('topic');
        expect(msg).toHaveProperty('message.message');
        expect(msg.message.message.utcTime).toBeInstanceOf(Date);
      });
    });

    it('should stop pull-point subscription when the last event listener is removed', async () => {
      const expected = [HAPPYTIME_TOPICS.relay, HAPPYTIME_TOPICS.digitalInput] as const;
      const handler = jest.fn();
      const messagesPromise = collectUntilTopics(cam, 'event', expected);
      cam.on('event', handler);
      await messagesPromise;

      cam.off('event', handler);
      expect(cam.listeners('event')).toHaveLength(0);

      // After unsubscribe, a fresh listener should receive HappyTime's simulated topics again.
      await new Promise((resolve) => setTimeout(resolve, 100));
      const again = collectUntilTopics(cam, 'event', expected);
      const handler2 = jest.fn();
      cam.on('event', handler2);
      const messages = await again;
      expect(messages.map(topicOf)).toEqual(expect.arrayContaining([...expected]));
      cam.off('event', handler2);
    });
  });

  describe('Subscription', () => {
    it('should create an unfiltered pull-point and emit both Happytime events on data', async () => {
      const expected = [HAPPYTIME_TOPICS.relay, HAPPYTIME_TOPICS.digitalInput] as const;
      const sub = new Subscription(cam);
      const messagesPromise = collectUntilTopics(sub, 'data', expected);
      await sub.subscribe();
      expect(sub.subscription?.subscriptionReference.address).toBeDefined();

      const messages = await messagesPromise;
      expect(messages.map(topicOf)).toEqual(expect.arrayContaining([...expected]));

      await sub.unsubscribe();
      expect(sub.subscription).toBeUndefined();
    });

    it('should filter by Relay topic expression', async () => {
      const sub = new Subscription(cam, {
        filter: {
          topicExpression: [
            {
              expression: HAPPYTIME_TOPICS.relay,
              dialect: CONCRETE_SET_DIALECT,
            },
          ],
        },
      });
      const messagesPromise = collectEvents<NotificationMessage>(sub, 'data', 1);
      await sub.subscribe();

      const [message] = await messagesPromise;
      expect(topicOf(message)).toBe(HAPPYTIME_TOPICS.relay);
      expect(message.message.message).toBeDefined();

      await sub.unsubscribe();
    });

    it('should filter by DigitalInput topic expression', async () => {
      const sub = new Subscription(cam, {
        filter: {
          topicExpression: [
            {
              expression: HAPPYTIME_TOPICS.digitalInput,
              dialect: CONCRETE_SET_DIALECT,
            },
          ],
        },
      });
      const messagesPromise = collectEvents<NotificationMessage>(sub, 'data', 1);
      await sub.subscribe();

      const [message] = await messagesPromise;
      expect(topicOf(message)).toBe(HAPPYTIME_TOPICS.digitalInput);

      await sub.unsubscribe();
    });

    it('should accept multiple topic expressions in one filter', async () => {
      const expected = [HAPPYTIME_TOPICS.relay, HAPPYTIME_TOPICS.digitalInput] as const;
      const sub = new Subscription(cam, {
        filter: {
          topicExpression: [
            {
              expression: HAPPYTIME_TOPICS.relay,
              dialect: CONCRETE_SET_DIALECT,
            },
            {
              expression: HAPPYTIME_TOPICS.digitalInput,
              dialect: CONCRETE_SET_DIALECT,
            },
          ],
        },
      });
      const messagesPromise = collectUntilTopics(sub, 'data', expected);
      await sub.subscribe();

      const messages = await messagesPromise;
      expect(messages.map(topicOf)).toEqual(expect.arrayContaining([...expected]));

      await sub.unsubscribe();
    });
  });
});
