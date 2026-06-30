import { Onvif, Subscription } from '../src';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const keypress = require('keypress');

const cam = new Onvif({
  hostname: '192.168.1.14',
  username: 'administrator',
  password: 'password',
  port: 2020,
});

// const cam = new Onvif({
//   hostname: '192.168.1.13',
//   username: 'admin',
//   password: 'admin',
//   port: 8000,
// });

console.log('Press:');
console.log('s - subscribe');
console.log('u - unsubscribe');
console.log('e - event info');
console.log('Ctrl+C - exit');

(async () => {
  let eventCounter = 0;
  // My poor Tapo C220 V1 cam supports ONVIF very badly, I decided to count errors in the PullMessages realization
  // https://community.tp-link.com/en/smart-home/forum/topic/867526?replyId=1705912
  let tapoErrorCounter = 0;
  await cam.connect();
  const sub = new Subscription(cam, 'pullPoint', {
    filter: {
      topicExpression: [
        {
          expression: 'tns1:RuleEngine/CellMotionDetector/Motion',
          dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
        },
      ],
    },
    // filter: {
    //   topicExpression: [
    //     {
    //       expression: 'tns1:Device/Trigger/Relay',
    //       dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
    //     },
    //   ],
    // },
  });

  keypress(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  process.stdin.on('keypress', async (c, key) => {
    if (key.ctrl && key.name === 'c') {
      // eslint-disable-next-line n/no-process-exit
      process.exit();
    }
    if (key.name === 's') {
      sub.on('data', (data) => {
        eventCounter += 1;
        console.log(new Date().toLocaleTimeString(), 'only motion', data.topic._, data.message.message.data);
      });
      sub.on('connectionError', (error) => {
        tapoErrorCounter += 1;
      });
      await sub.subscribe();
      console.log(new Date().toLocaleTimeString(), 'Pull-point at ', sub.subscription?.subscriptionReference.address);
    }
    if (key.name === 'u') {
      console.log(await sub.unsubscribe());
      console.log(new Date().toLocaleTimeString(), 'Unsubscribed', sub.listenerCount('data'));
    }
    if (key.name === 'e') {
      console.log(
        new Date().toLocaleTimeString(),
        sub.subscription?.subscriptionReference.address,
        eventCounter,
        tapoErrorCounter,
      );
    }
  });
})();
