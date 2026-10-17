/**
 * Watch ONVIF motion alarms on the global pull-point (`onvif.on('event')`).
 *
 * Prints when a source goes active / idle and how long the previous bout lasted.
 * Topic filter is applied in the handler (any event still arrives; we ignore the rest).
 *
 * Run:
 *   npx tsx examples/events.motion.ts
 *
 * Ctrl+C → remove listener, close client.
 */

import { NotificationMessage, Onvif } from '../src';

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';

/** True for the usual ONVIF motion topics (any prefix before `:`). */
function looksLikeMotionTopic(topic: string): boolean {
  const bare = topic.includes(':') ? topic.slice(topic.indexOf(':') + 1) : topic;
  return (
    bare === 'RuleEngine/CellMotionDetector/Motion' ||
    bare === 'VideoSource/MotionAlarm' ||
    bare.endsWith('/CellMotionDetector/Motion')
  );
}

function itemValue(
  list: { simpleItem?: Array<{ name: string; value: unknown }> } | undefined,
  name: string,
): string | undefined {
  const hit = list?.simpleItem?.find((item) => item.name === name);
  return hit?.value === undefined ? undefined : String(hit.value);
}

function asBool(raw: string | undefined): boolean | undefined {
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return undefined;
}

/** Active-since wall clock per source label (ms). */
const activeSince = new Map<string, number>();

function onEvent(msg: NotificationMessage) {
  const topic = String(msg.topic._);
  if (!looksLikeMotionTopic(topic)) {
    return;
  }

  const m = msg.message.message;
  const sourceLabel =
    itemValue(m.source, 'VideoSourceConfigurationToken') ??
    itemValue(m.source, 'Source') ??
    itemValue(m.source, 'VideoSourceToken') ??
    'camera';

  // CellMotion uses IsMotion; MotionAlarm uses State.
  const flag = asBool(itemValue(m.data, 'IsMotion')) ?? asBool(itemValue(m.data, 'State'));
  if (flag === undefined) {
    console.log(`? ${topic} (no IsMotion/State) source=${sourceLabel}`);
    return;
  }

  const when = m.utcTime instanceof Date ? m.utcTime : new Date();
  const stamp = when.toLocaleTimeString();

  if (m.propertyOperation === 'Initialized') {
    if (flag) {
      activeSince.set(sourceLabel, when.getTime());
    } else {
      activeSince.delete(sourceLabel);
    }
    console.log(`${stamp}  [${sourceLabel}] initial state: ${flag ? 'MOTION' : 'idle'}`);
    return;
  }

  if (flag) {
    if (!activeSince.has(sourceLabel)) {
      activeSince.set(sourceLabel, when.getTime());
      console.log(`${stamp}  [${sourceLabel}] MOTION`);
    }
    return;
  }

  const started = activeSince.get(sourceLabel);
  activeSince.delete(sourceLabel);
  if (started === undefined) {
    console.log(`${stamp}  [${sourceLabel}] idle`);
    return;
  }
  const seconds = ((when.getTime() - started) / 1000).toFixed(1);
  console.log(`${stamp}  [${sourceLabel}] idle (was moving ${seconds}s)`);
}

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    port: PORT,
    username: USERNAME,
    password: PASSWORD,
  });

  await onvif.connect();
  onvif.on('event', onEvent);
  onvif.on('eventsError', (err) => {
    console.error('eventsError', err);
  });

  console.log(`Connected to ${HOSTNAME}:${PORT}. Waiting for motion… (Ctrl+C to quit)`);

  await new Promise<void>((resolve) => {
    process.once('SIGINT', () => resolve());
  });

  onvif.off('event', onEvent);
  await onvif.close();
  console.log('bye');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
