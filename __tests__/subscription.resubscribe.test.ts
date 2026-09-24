/**
 * Subscription pull-point rebuild / reconnect against a local SOAP mock server.
 *
 * Covers soft network retries, fatal resubscribe with backoff, and unsubscribe races
 * with an in-flight CreatePullPointSubscription.
 *
 * @jest-environment node
 */

import http from 'http';
import { AddressInfo } from 'net';
import { Onvif, Subscription } from '../src';

const RECONNECT_MS = 50;

type PullBehavior = 'ok' | 'fault' | 'reset';

interface MockStats {
  create: number;
  pull: number;
  renew: number;
  sync: number;
  unsubscribe: number;
}

interface EventsMock {
  port: number;
  readonly stats: MockStats;
  pullBehavior: PullBehavior;
  /** How many CreatePullPointSubscription requests fail before succeeding. */
  createFailuresLeft: number;
  /** When set, CreatePullPointSubscription waits until the gate resolves. */
  createGate: Promise<void> | null;
  /** Future termination on create/pull success; past forces fatal branch with SOAP fault. */
  terminationFuture: boolean;
  close: () => Promise<void>;
}

function soapEnvelope(inner: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"` +
    ` xmlns:tev="http://www.onvif.org/ver10/events/wsdl"` +
    ` xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2"` +
    ` xmlns:wsa="http://www.w3.org/2005/08/addressing">` +
    `<s:Body>${inner}</s:Body></s:Envelope>`
  );
}

function soapFault(reason: string): string {
  return soapEnvelope(
    `<s:Fault>` +
      `<s:Code><s:Value>s:Receiver</s:Value></s:Code>` +
      `<s:Reason><s:Text xml:lang="en">${reason}</s:Text></s:Reason>` +
      `</s:Fault>`,
  );
}

function isoOffset(msFromNow: number): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

function detectOperation(body: string): string {
  if (body.includes('CreatePullPointSubscription')) return 'CreatePullPointSubscription';
  if (body.includes('PullMessages')) return 'PullMessages';
  if (body.includes('SetSynchronizationPoint')) return 'SetSynchronizationPoint';
  if (body.includes('Renew')) return 'Renew';
  if (body.includes('Unsubscribe')) return 'Unsubscribe';
  return 'Unknown';
}

async function startEventsMock(): Promise<EventsMock> {
  const stats: MockStats = { create: 0, pull: 0, renew: 0, sync: 0, unsubscribe: 0 };
  const mock: EventsMock = {
    port: 0,
    stats,
    pullBehavior: 'ok',
    createFailuresLeft: 0,
    createGate: null,
    terminationFuture: true,
    close: async () => undefined,
  };

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const op = detectOperation(body);

      const reply = (xml: string, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/soap+xml' });
        res.end(xml);
      };

      try {
        if (op === 'CreatePullPointSubscription') {
          stats.create += 1;
          if (mock.createGate) {
            await mock.createGate;
          }
          if (mock.createFailuresLeft > 0) {
            mock.createFailuresLeft -= 1;
            reply(soapFault('create refused'));
            return;
          }
          const termination = mock.terminationFuture ? isoOffset(60 * 60 * 1000) : isoOffset(-1000);
          reply(
            soapEnvelope(
              `<tev:CreatePullPointSubscriptionResponse>` +
                `<tev:SubscriptionReference>` +
                `<wsa:Address>http://127.0.0.1:${mock.port}/Subscription?id=${stats.create}</wsa:Address>` +
                `</tev:SubscriptionReference>` +
                `<wsnt:CurrentTime>${isoOffset(0)}</wsnt:CurrentTime>` +
                `<wsnt:TerminationTime>${termination}</wsnt:TerminationTime>` +
                `</tev:CreatePullPointSubscriptionResponse>`,
            ),
          );
          return;
        }

        if (op === 'PullMessages') {
          stats.pull += 1;
          if (mock.pullBehavior === 'reset') {
            req.socket.destroy();
            return;
          }
          if (mock.pullBehavior === 'fault') {
            reply(soapFault('subscription not known'));
            return;
          }
          const termination = mock.terminationFuture ? isoOffset(60 * 60 * 1000) : isoOffset(-1000);
          reply(
            soapEnvelope(
              `<tev:PullMessagesResponse>` +
                `<tev:CurrentTime>${isoOffset(0)}</tev:CurrentTime>` +
                `<tev:TerminationTime>${termination}</tev:TerminationTime>` +
                `</tev:PullMessagesResponse>`,
            ),
          );
          return;
        }

        if (op === 'Renew') {
          stats.renew += 1;
          reply(
            soapEnvelope(
              `<wsnt:RenewResponse>` +
                `<wsnt:CurrentTime>${isoOffset(0)}</wsnt:CurrentTime>` +
                `<wsnt:TerminationTime>${isoOffset(60 * 60 * 1000)}</wsnt:TerminationTime>` +
                `</wsnt:RenewResponse>`,
            ),
          );
          return;
        }

        if (op === 'SetSynchronizationPoint') {
          stats.sync += 1;
          reply(soapEnvelope(`<tev:SetSynchronizationPointResponse/>`));
          return;
        }

        if (op === 'Unsubscribe') {
          stats.unsubscribe += 1;
          reply(soapEnvelope(`<wsnt:UnsubscribeResponse/>`));
          return;
        }

        reply(soapFault(`unexpected operation: ${op}`), 500);
      } catch {
        try {
          req.socket.destroy();
        } catch {
          // ignore
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  mock.port = (server.address() as AddressInfo).port;
  mock.close = () =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  return mock;
}

function createCam(port: number): Onvif {
  const cam = new Onvif({
    hostname: '127.0.0.1',
    port,
    path: '/onvif/device_service',
    username: 'admin',
    password: 'secret',
    autoConnect: false,
    useWSSecurity: false,
    agent: false,
    timeout: 5000,
  });
  cam.uri.events = new URL(`http://127.0.0.1:${port}/onvif/events`);
  return cam;
}

function prepareSub(cam: Onvif): Subscription {
  const sub = new Subscription(cam);
  sub.eventReconnectMs = RECONNECT_MS;
  sub.on('error', () => undefined);
  sub.on('connectionError', () => undefined);
  return sub;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate: () => boolean, timeoutMs = 5000, label = 'condition'): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }
    await delay(10);
  }
  throw new Error(`timeout waiting for ${label}`);
}

describe('Subscription resubscribe (SOAP mock server)', () => {
  let mock: EventsMock;
  let cam: Onvif;

  beforeEach(async () => {
    mock = await startEventsMock();
    cam = createCam(mock.port);
  });

  afterEach(async () => {
    await mock.close();
  });

  it('retries PullMessages after ECONNRESET without creating a new pull point', async () => {
    mock.pullBehavior = 'reset';
    mock.terminationFuture = true;
    const sub = prepareSub(cam);

    await sub.subscribe();
    await waitFor(() => mock.stats.pull >= 1, 5000, 'first pull');

    const createsAfterFirstPull = mock.stats.create;
    expect(createsAfterFirstPull).toBe(1);

    mock.pullBehavior = 'ok';
    await waitFor(() => mock.stats.pull >= 2, 5000, 'soft retry pull');

    expect(mock.stats.create).toBe(1);
    expect(mock.stats.renew).toBeGreaterThanOrEqual(1);

    await sub.unsubscribe();
  });

  it('waits the reconnect interval before CreatePullPointSubscription on fatal pull', async () => {
    mock.pullBehavior = 'fault';
    const sub = prepareSub(cam);

    await sub.subscribe();
    await waitFor(() => mock.stats.pull >= 1, 5000, 'failing pull');
    expect(mock.stats.create).toBe(1);

    await delay(RECONNECT_MS - 20);
    expect(mock.stats.create).toBe(1);

    await waitFor(() => mock.stats.create >= 2, 5000, 'resubscribe create');
    expect(mock.stats.create).toBeGreaterThanOrEqual(2);

    await sub.unsubscribe();
  });

  it('widens eventReconnectMs while the device keeps faulting', async () => {
    mock.pullBehavior = 'fault';
    const sub = prepareSub(cam);
    // restartEvent bumps before waiting/recreating. Create counts race with the next pull
    // fault, so assert the interval itself rather than tying bumps to create#N.
    const initial = sub.eventReconnectMs;

    await sub.subscribe();
    await waitFor(() => sub.eventReconnectMs > initial, 5000, 'first reconnect bump');
    const afterFirstBump = sub.eventReconnectMs;

    await waitFor(() => sub.eventReconnectMs > afterFirstBump, 5000, 'second reconnect bump');

    await sub.unsubscribe();
  });

  it('does not create another pull point after unsubscribe during rebuild wait', async () => {
    mock.pullBehavior = 'fault';
    const sub = prepareSub(cam);

    await sub.subscribe();
    await waitFor(() => mock.stats.pull >= 1, 5000, 'fault pull');
    expect(mock.stats.create).toBe(1);

    await sub.unsubscribe();
    await delay(RECONNECT_MS * 4);

    expect(mock.stats.create).toBe(1);
  });

  it('allows subscribe again after unsubscribe', async () => {
    mock.pullBehavior = 'ok';
    const sub = prepareSub(cam);

    await sub.subscribe();
    await waitFor(() => mock.stats.pull >= 1, 5000, 'first session pull');
    await sub.unsubscribe();

    const createsAfterStop = mock.stats.create;
    const pullsAfterStop = mock.stats.pull;

    await sub.subscribe();
    await waitFor(() => mock.stats.pull > pullsAfterStop, 5000, 'second session pull');

    expect(mock.stats.create).toBe(createsAfterStop + 1);
  });

  it('does not start pull when unsubscribe races with CreatePullPointSubscription', async () => {
    let releaseCreate!: () => void;
    mock.createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    mock.pullBehavior = 'ok';
    const sub = prepareSub(cam);

    const subscribePromise = sub.subscribe();
    await waitFor(() => mock.stats.create >= 1, 5000, 'create started');

    await sub.unsubscribe();
    releaseCreate();
    await subscribePromise;

    await delay(RECONNECT_MS * 3);
    expect(mock.stats.pull).toBe(0);

    // Fresh subscribe must still work after the raced stop.
    mock.createGate = null;
    await sub.subscribe();
    await waitFor(() => mock.stats.pull >= 1, 5000, 'pull after re-subscribe');
    await sub.unsubscribe();
  });

  it('retries CreatePullPointSubscription after create failures then starts pulling', async () => {
    mock.createFailuresLeft = 2;
    mock.pullBehavior = 'ok';
    const sub = prepareSub(cam);
    // Initial create fails; recovery goes through restartEvent only after a successful
    // subscribe that started pulling — so drive recovery via a first success then fault,
    // and separately verify create-fault retry from restartEvent using a failing pull.
    // Here: subscribe rejects on first create; call again after failures are spent.
    await expect(sub.subscribe()).rejects.toThrow(/SOAP Fault/);
    expect(mock.stats.create).toBe(1);
    expect(mock.stats.pull).toBe(0);

    // One failure left from the first attempt (createFailuresLeft was 2 → 1).
    await expect(sub.subscribe()).rejects.toThrow(/SOAP Fault/);
    expect(mock.stats.create).toBe(2);

    await sub.subscribe();
    await waitFor(() => mock.stats.pull >= 1, 5000, 'pull after creates succeed');
    expect(mock.stats.create).toBe(3);

    await sub.unsubscribe();
  });

  it('rebuilds pull point via restartEvent when create fails during recovery', async () => {
    mock.pullBehavior = 'fault';
    const sub = prepareSub(cam);

    await sub.subscribe();
    await waitFor(() => mock.stats.pull >= 1, 5000, 'initial fault');
    expect(mock.stats.create).toBe(1);

    // Next create attempts during rebuild fail once, then succeed.
    mock.createFailuresLeft = 1;
    await waitFor(() => mock.stats.create >= 3, 8000, 'create after failed rebuild create');
    // create#2 failed (fault), create#3 succeeded after restartEvent retry
    expect(mock.stats.create).toBeGreaterThanOrEqual(3);

    await sub.unsubscribe();
  });
});
