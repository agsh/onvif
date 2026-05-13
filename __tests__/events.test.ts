import { Onvif } from '../src';

let cam: Onvif;
beforeAll(async () => {
  cam = new Onvif({
    hostname : '127.0.0.1',
    username : 'admin',
    password : 'admin',
    port     : 8000,
  });
  await cam.connect();
});

describe('Events', () => {
  describe('getEventProperties', () => {
    it('should return event properties from the device', async () => {
      const result = await cam.events.getEventProperties();

      expect(result.topicNamespaceLocation).toBe('http://www.onvif.org/onvif/ver10/topics/topicns.xml');
      expect(result.fixedTopicSet).toBe(true);
      expect(result.topicSet).toBeDefined();
      expect(result.topicExpressionDialect).toEqual(expect.arrayContaining([
        'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
        'http://docs.oasis-open.org/wsn/t-1/TopicExpression/Concrete',
      ]));
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
        isProperty : true,
        source     : {
          simpleItemDescription : {
            name : 'Source',
            type : 'tt:ReferenceToken',
          },
        },
        data : {
          simpleItemDescription : {
            name : 'State',
            type : 'xs:boolean',
          },
        },
      });
    });
  });
});
