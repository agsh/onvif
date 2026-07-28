/**
 * Unit and integration tests for the Events service.
 *
 * @jest-environment node
 */

import { Onvif, Subscription } from '../src';

let cam: Onvif;

describe('Events', () => {
  beforeAll(async () => {
    cam = new Onvif({
      hostname: '127.0.0.1',
      username: 'admin',
      password: 'admin',
      port: 8000,
    });
    await cam.connect();
  });

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

  describe('subscriptions', () => {
    it('should create pull-point subscription and emit events', async () => {
      const eventHandler = jest.fn();
      const sub = new Subscription(cam);
      sub.on('data', eventHandler);
      await sub.subscribe();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out waiting for pull-point events')), 15_000);
        const interval = setInterval(() => {
          if (eventHandler.mock.calls.length >= 2) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
        }, 10);
      });
      await sub.unsubscribe();
      expect(eventHandler.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
