import { NotificationMessage, Onvif, PullPointSubscription, Subscription } from '../src';
import { createServer } from 'http';
import { parseStringPromise } from 'xml2js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const keypress = require('keypress');

// the IP Address and Port for a HTTP Server that the camera will send events to. Change this.
const EVENT_RECEIVER_IP_ADDRESS = '192.168.1.13';
const EVENT_RECEIVER_PORT = 8086;

// My Tapo C220
const cam = new Onvif({
  hostname: '192.168.1.14',
  username: 'administrator',
  password: 'password',
  port: 2020,
});

// Happytimesoft
// const cam = new Onvif({
//   hostname: '192.168.1.13',
//   username: 'admin',
//   password: 'admin',
//   port: 8000,
// });

process.stdout.write(`

\x1b[38;2;138;43;226m ______                     _       
\x1b[38;2;161;34;206m|  ____|                   | |      
\x1b[38;2;185;26;187m| |__  __   __ ___  _ __   | |_  ___
\x1b[38;2;208;17;167m|  __| \\ \\ / // _ \\| '_ \\  | __|/ __|
\x1b[38;2;232;9;148m| |____ \\ V /|  __/| | | | | |_ \\__ \\
\x1b[38;2;255;0;128m|______| \\_/  \\___||_| |_|  \\__||___/
\x1b[0m

Press:
--- Common sub ---
c - toggle common event handler
--- Pull-point sub ---
s - subscribe
u - unsubscribe
e - event info
--- Base sub with own server ---
b - toggle base event handler (and own http-server)

Ctrl+C - exit
`);

const server = createServer((req, res) => {
  const buf: any[] = [];
  req.on('data', (data) => {
    buf.push(data);
  });
  req.on('end', async () => {
    const msg = await parseStringPromise(Buffer.concat(buf).toString());
    msg['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['wsnt:Notify'][0]['wsnt:NotificationMessage'].forEach((txt: any) => {
      process.stdout.write(
        `${new Date().toLocaleTimeString()} ${JSON.stringify(txt['wsnt:Message'][0]['tt:Message'][0]['tt:Data'][0]['tt:SimpleItem'][0].$)}\n`,
      );
    });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World!\n');
  });
});
let pushSub: PullPointSubscription | null = null;

(async () => {
  let eventCounter = 0;
  // My poor Tapo C220 V1 cam supports ONVIF very badly, I decided to count errors in the PullMessages realization
  // https://community.tp-link.com/en/smart-home/forum/topic/867526?replyId=1705912
  let tapoErrorCounter = 0;
  await cam.connect();
  const sub = new Subscription(cam, {
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

  const globalHandler = (msg: NotificationMessage) => {
    process.stdout.write(
      `${new Date().toLocaleTimeString()} common ${msg.topic._} ${JSON.stringify(msg.message.message.data)}\n`,
    );
  };

  process.stdin.on('keypress', async (c, key) => {
    if (key.ctrl && key.name === 'c') {
      // eslint-disable-next-line n/no-process-exit
      process.exit();
    }
    if (key.name === 'c') {
      if (cam.listeners('event').length === 0) {
        process.stdout.write(`${new Date().toLocaleTimeString()} common sub started\n`);
        cam.on('event', globalHandler);
      } else {
        process.stdout.write(`${new Date().toLocaleTimeString()} common sub stopped\n`);
        cam.off('event', globalHandler);
      }
    }
    if (key.name === 's') {
      sub.on('data', (data) => {
        eventCounter += 1;
        process.stdout.write(
          `${new Date().toLocaleTimeString()} only motion ${data.topic._} ${JSON.stringify(data.message.message.data)}\n`,
        );
      });
      sub.on('connectionError', (error) => {
        tapoErrorCounter += 1;
      });
      await sub.subscribe();
      process.stdout.write(
        `${new Date().toLocaleTimeString()} Pull-point at  ${sub.subscription?.subscriptionReference.address}\n`,
      );
    }
    if (key.name === 'u') {
      process.stdout.write(`${JSON.stringify(await sub.unsubscribe())}\n`);
      process.stdout.write(`${new Date().toLocaleTimeString()} Unsubscribed ${sub.listenerCount('data')}\n`);
    }
    if (key.name === 'e') {
      process.stdout.write(
        `${new Date().toLocaleTimeString()} ${sub.subscription?.subscriptionReference.address} ${eventCounter} ${
          tapoErrorCounter
        } ${sub.subscription?.terminationTime.toLocaleTimeString()} ${sub.eventReconnectMs}\n`,
      );
    }
    if (key.name === 'b') {
      if (pushSub) {
        await cam.events.unsubscribe(pushSub);
        pushSub = null;
        server.close();
        process.stdout.write(`${new Date().toLocaleTimeString()} Base event server stopped listening\n`);
        return;
      }
      server.listen(EVENT_RECEIVER_PORT, EVENT_RECEIVER_IP_ADDRESS, () => {
        process.stdout.write(
          `${new Date().toLocaleTimeString()} Base event server is listening on ${EVENT_RECEIVER_IP_ADDRESS}:${EVENT_RECEIVER_PORT}\n`,
        );
      });
      pushSub = await cam.events.subscribe({
        renew: false,
        url: `http://${EVENT_RECEIVER_IP_ADDRESS}:${EVENT_RECEIVER_PORT}`,
        terminationTime: 5 * 60 * 1000,
      });
      process.stdout.write(
        `${new Date().toLocaleTimeString()} subscribed for 5min ${pushSub.subscriptionReference.address}\n`,
      );
    }
  });
})();
