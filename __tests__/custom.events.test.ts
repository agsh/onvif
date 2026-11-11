/**
 * Happytime custom event injection via POST /SendEvent (user-manual #8).
 *
 * Requires happytime-onvif-server with Send Custom Event Notification support.
 *
 * @jest-environment node
 */

import { EventEmitter } from 'events';
import { NotificationMessage, Onvif, Subscription } from '../src';
import type { ItemList } from '../src/interfaces/onvif';
import happytimeOnvifOptions from './happytime.json';

const CONCRETE_SET_DIALECT = 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet';
const SEND_EVENT_URL = `http://${happytimeOnvifOptions.hostname}:${happytimeOnvifOptions.port}/SendEvent`;

const TOPICS = {
  relay: 'tns1:Device/Trigger/Relay',
  digitalInput: 'tns1:Device/Trigger/DigitalInput',
  motionAlarm: 'tns1:VideoSource/MotionAlarm',
  cellMotion: 'tns1:RuleEngine/CellMotionDetector/Motion',
  profileChanged: 'tns1:Media/ProfileChanged',
} as const;

type SimplePair = { name: string; value: string | boolean | number };

let cam: Onvif;

function topicOf(msg: NotificationMessage): string {
  return msg.topic._;
}

function asSimpleItems(list?: ItemList): SimplePair[] {
  const raw = list?.simpleItem;
  if (!raw) {
    return [];
  }
  return (Array.isArray(raw) ? raw : [raw]).map((item) => ({
    name: String(item.name),
    value: item.value as string | boolean | number,
  }));
}

function notificationXml(options: {
  topic: string;
  propertyOperation?: 'Initialized' | 'Changed' | 'Deleted';
  utcTime?: string;
  dialect?: string;
  source?: Array<[string, string]>;
  data?: Array<[string, string]>;
  key?: Array<[string, string]>;
  omitTopic?: boolean;
}): string {
  const dialect = options.dialect ?? CONCRETE_SET_DIALECT;
  const propertyOperation = options.propertyOperation ?? 'Initialized';
  const utcTime = options.utcTime ?? '2026-11-10T22:00:00Z';
  const items = (pairs: Array<[string, string]> = []) =>
    pairs.map(([name, value]) => `<tt:SimpleItem Name="${name}" Value="${value}"/>`).join('');

  return `<wsnt:NotificationMessage xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tt="http://www.onvif.org/ver10/schema">
  ${options.omitTopic ? '' : `<wsnt:Topic Dialect="${dialect}">${options.topic}</wsnt:Topic>`}
  <wsnt:Message>
    <tt:Message UtcTime="${utcTime}" PropertyOperation="${propertyOperation}">
      ${options.source?.length ? `<tt:Source>${items(options.source)}</tt:Source>` : ''}
      ${options.key?.length ? `<tt:Key>${items(options.key)}</tt:Key>` : ''}
      ${options.data?.length ? `<tt:Data>${items(options.data)}</tt:Data>` : ''}
    </tt:Message>
  </wsnt:Message>
</wsnt:NotificationMessage>`;
}

async function sendEvent(body: string): Promise<{ result: string; topic?: string; reason?: string }> {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const response = await fetch(SEND_EVENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body,
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { result: string; topic?: string; reason?: string };
}

function waitForTopic(
  emitter: EventEmitter,
  event: string,
  topic: string,
  timeoutMs = 10000,
): Promise<NotificationMessage> {
  return new Promise((resolve, reject) => {
    const onMessage = (msg: NotificationMessage) => {
      if (topicOf(msg) !== topic) {
        return;
      }
      cleanup();
      resolve(msg);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for custom topic ${topic}`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      emitter.off(event, onMessage);
    };
    emitter.on(event, onMessage);
  });
}

async function subscribeFiltered(topic: string): Promise<Subscription> {
  const sub = new Subscription(cam, {
    filter: {
      topicExpression: [{ expression: topic, dialect: CONCRETE_SET_DIALECT }],
    },
  });
  await sub.subscribe();
  return sub;
}

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

afterEach(async () => {
  cam.removeAllListeners('event');
  await new Promise((resolve) => setTimeout(resolve, 50));
});

describe('Happytime custom events (/SendEvent)', () => {
  describe('HTTP API', () => {
    it('returns ok with the submitted topic', async () => {
      const response = await sendEvent(
        notificationXml({
          topic: TOPICS.relay,
          source: [['RelayToken', 'RelayOutputToken_1']],
          data: [['LogicalState', 'active']],
        }),
      );
      expect(response).toEqual({ result: 'ok', topic: TOPICS.relay });
    });

    it('returns empty body error for blank POST body', async () => {
      const response = await sendEvent('');
      expect(response).toEqual({ result: 'err', reason: 'empty body' });
    });

    it('returns xml parse failed for malformed XML', async () => {
      const response = await sendEvent('<not-valid');
      expect(response).toEqual({ result: 'err', reason: 'xml parse failed' });
    });
  });

  describe('pull-point delivery', () => {
    it('delivers Device/Trigger/Relay with source and data SimpleItems', async () => {
      const sub = await subscribeFiltered(TOPICS.relay);
      const pending = waitForTopic(sub, 'data', TOPICS.relay);

      await expect(
        sendEvent(
          notificationXml({
            topic: TOPICS.relay,
            propertyOperation: 'Changed',
            utcTime: '2026-11-10T22:10:00Z',
            source: [['RelayToken', 'RelayOutputToken_1']],
            data: [['LogicalState', 'inactive']],
          }),
        ),
      ).resolves.toMatchObject({ result: 'ok', topic: TOPICS.relay });

      const msg = await pending;
      expect(topicOf(msg)).toBe(TOPICS.relay);
      expect(msg.topic.dialect).toBe(CONCRETE_SET_DIALECT);
      expect(msg.message.message.propertyOperation).toBe('Changed');
      // Happytime rewrites UtcTime (not the XML stamp); only assert it parsed as Date.
      expect(msg.message.message.utcTime).toBeInstanceOf(Date);
      expect(Number.isNaN(msg.message.message.utcTime.getTime())).toBe(false);
      expect(asSimpleItems(msg.message.message.source)).toEqual([{ name: 'RelayToken', value: 'RelayOutputToken_1' }]);
      expect(asSimpleItems(msg.message.message.data)).toEqual([{ name: 'LogicalState', value: 'inactive' }]);

      await sub.unsubscribe();
    });

    it('delivers Device/Trigger/DigitalInput with Initialized operation', async () => {
      const sub = await subscribeFiltered(TOPICS.digitalInput);
      const pending = waitForTopic(sub, 'data', TOPICS.digitalInput);

      await sendEvent(
        notificationXml({
          topic: TOPICS.digitalInput,
          propertyOperation: 'Initialized',
          source: [['InputToken', 'DigitalInputToken_1']],
          data: [['LogicalState', 'true']],
        }),
      );

      const msg = await pending;
      expect(msg.message.message.propertyOperation).toBe('Initialized');
      expect(asSimpleItems(msg.message.message.source)).toEqual([{ name: 'InputToken', value: 'DigitalInputToken_1' }]);
      expect(asSimpleItems(msg.message.message.data)).toEqual([{ name: 'LogicalState', value: true }]);

      await sub.unsubscribe();
    });

    it('delivers VideoSource/MotionAlarm state change', async () => {
      const sub = await subscribeFiltered(TOPICS.motionAlarm);
      const pending = waitForTopic(sub, 'data', TOPICS.motionAlarm);

      await sendEvent(
        notificationXml({
          topic: TOPICS.motionAlarm,
          propertyOperation: 'Changed',
          source: [['Source', 'VideoSourceToken']],
          data: [['State', 'true']],
        }),
      );

      const msg = await pending;
      expect(asSimpleItems(msg.message.message.source)).toEqual([{ name: 'Source', value: 'VideoSourceToken' }]);
      expect(asSimpleItems(msg.message.message.data)).toEqual([{ name: 'State', value: true }]);

      await sub.unsubscribe();
    });

    it('delivers RuleEngine/CellMotionDetector/Motion with multiple source items and Deleted', async () => {
      const sub = await subscribeFiltered(TOPICS.cellMotion);
      const pending = waitForTopic(sub, 'data', TOPICS.cellMotion);

      await sendEvent(
        notificationXml({
          topic: TOPICS.cellMotion,
          propertyOperation: 'Deleted',
          source: [
            ['VideoSourceConfigurationToken', 'VideoSourceToken'],
            ['VideoAnalyticsConfigurationToken', 'VideoAnalyticsToken'],
            ['Rule', 'MyMotionDetectorRule'],
          ],
          data: [['IsMotion', 'false']],
        }),
      );

      const msg = await pending;
      expect(msg.message.message.propertyOperation).toBe('Deleted');
      expect(asSimpleItems(msg.message.message.source)).toEqual([
        { name: 'VideoSourceConfigurationToken', value: 'VideoSourceToken' },
        { name: 'VideoAnalyticsConfigurationToken', value: 'VideoAnalyticsToken' },
        { name: 'Rule', value: 'MyMotionDetectorRule' },
      ]);
      expect(asSimpleItems(msg.message.message.data)).toEqual([{ name: 'IsMotion', value: false }]);

      await sub.unsubscribe();
    });

    it('delivers Media/ProfileChanged with source only', async () => {
      const sub = await subscribeFiltered(TOPICS.profileChanged);
      const pending = waitForTopic(sub, 'data', TOPICS.profileChanged);

      await sendEvent(
        notificationXml({
          topic: TOPICS.profileChanged,
          propertyOperation: 'Changed',
          source: [['Token', 'ProfileToken_1']],
        }),
      );

      const msg = await pending;
      expect(asSimpleItems(msg.message.message.source)).toEqual([{ name: 'Token', value: 'ProfileToken_1' }]);
      expect(msg.message.message.data).toBeUndefined();

      await sub.unsubscribe();
    });

    it('honours topic expression filters (non-matching custom events are not delivered)', async () => {
      const sub = await subscribeFiltered(TOPICS.relay);
      let unexpected: NotificationMessage | undefined;
      sub.on('data', (msg) => {
        if (topicOf(msg) === TOPICS.motionAlarm) {
          unexpected = msg;
        }
      });

      await sendEvent(
        notificationXml({
          topic: TOPICS.motionAlarm,
          source: [['Source', 'VideoSourceToken']],
          data: [['State', 'true']],
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 750));
      expect(unexpected).toBeUndefined();

      const pending = waitForTopic(sub, 'data', TOPICS.relay, 8_000);
      await sendEvent(
        notificationXml({
          topic: TOPICS.relay,
          source: [['RelayToken', 'RelayOutputToken_1']],
          data: [['LogicalState', 'active']],
        }),
      );
      await expect(pending).resolves.toBeDefined();

      await sub.unsubscribe();
    });

    it('delivers custom events on the global Onvif "event" listener', async () => {
      const pending = waitForTopic(cam, 'event', TOPICS.cellMotion);
      cam.on('event', () => undefined);

      // Give global pull-point a moment to subscribe before injecting.
      await new Promise((resolve) => setTimeout(resolve, 200));
      await sendEvent(
        notificationXml({
          topic: TOPICS.cellMotion,
          propertyOperation: 'Changed',
          source: [
            ['VideoSourceConfigurationToken', 'VideoSourceToken'],
            ['Rule', 'GlobalListenerRule'],
          ],
          data: [['IsMotion', 'true']],
        }),
      );

      const msg = await pending;
      expect(topicOf(msg)).toBe(TOPICS.cellMotion);
      expect(asSimpleItems(msg.message.message.data)).toEqual([{ name: 'IsMotion', value: true }]);
    });
  });
});
