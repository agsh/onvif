/**
 * Unit and integration tests for the Events service.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';

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

  describe('createPullPointSubscription', () => {
    it('should return a subscription reference from the happytime mock server', async () => {
      const subscription = await cam.events.createPullPointSubscription({ initialTerminationTime: 'PT2M' });

      expect(subscription.subscriptionReference).toMatchObject({
        address: expect.stringMatching(/^http:\/\/127\.0\.0\.1:8000\/event_service\//),
      });
      expect(subscription.currentTime).toBeInstanceOf(Date);
      expect(subscription.terminationTime).toBeInstanceOf(Date);
      await cam.events.unsubscribe();
    });

    it('should subscribe to cell motion events with a typed topic filter', async () => {
      const subscription = await cam.events.createPullPointSubscription({
        initialTerminationTime: 'PT2M',
        filter: {
          topicExpression: [
            {
              dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
              expression: 'tns1:RuleEngine/CellMotionDetector/Motion',
            },
          ],
        },
      });

      expect(subscription.subscriptionReference).toBeDefined();
      await cam.events.unsubscribe();
    });
  });

  describe('pullMessages', () => {
    it('should pull messages from the happytime mock server', async () => {
      await cam.events.createPullPointSubscription({ initialTerminationTime: 'PT2M' });
      const messages = await cam.events.pullMessages({ timeout: 'PT3S', messageLimit: 1 });

      expect(messages.currentTime).toBeInstanceOf(Date);
      expect(messages.terminationTime).toBeInstanceOf(Date);
      expect(Array.isArray(messages.notificationMessage)).toBe(true);
      await cam.events.unsubscribe();
    });
  });

  describe('setSynchronizationPoint', () => {
    it('should complete', async () => {
      await cam.events.createPullPointSubscription({ initialTerminationTime: 'PT2M' });
      await expect(cam.events.setSynchronizationPoint()).resolves.toBeUndefined();
      await cam.events.unsubscribe();
    });
  });

  describe('renew', () => {
    it('should renew the subscription', async () => {
      await cam.events.createPullPointSubscription({ initialTerminationTime: 'PT2M' });
      const renewed = await cam.events.renew();

      expect(renewed.currentTime).toBeInstanceOf(Date);
      expect(renewed.terminationTime).toBeInstanceOf(Date);
      expect(+renewed.terminationTime).toBeGreaterThan(+renewed.currentTime);
      await cam.events.unsubscribe();
    });
  });

  describe('unsubscribe', () => {
    it('should terminate the pull-point subscription', async () => {
      await cam.events.createPullPointSubscription({ initialTerminationTime: 'PT2M' });

      await expect(cam.events.unsubscribe()).resolves.toBeUndefined();
      await expect(cam.events.pullMessages({ timeout: 'PT1S', messageLimit: 1 })).rejects.toThrow(
        'pull-point subscription',
      );
    });
  });
});
