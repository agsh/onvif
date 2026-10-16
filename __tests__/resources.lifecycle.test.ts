/**
 * Resource ownership: agents, reconnect timers, and connect/close cycles.
 * Guards against obvious leaks that keep a Node process or sockets alive.
 *
 * @jest-environment node
 */

import http from 'http';
import { Onvif } from '../src';
import { connectSteps } from '../src/connection';

describe('resource lifecycle (agents / timers)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('repeated connect/close destroys each owned agent generation', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockResolvedValue({ service: [] } as never);
    jest.spyOn(connectSteps, 'getCapabilities').mockResolvedValue({} as never);

    const destroyed = new Set<object>();

    for (let i = 0; i < 5; i++) {
      await onvif.connect({ media: false });
      expect(onvif.closed).toBe(false);
      expect(onvif.agent).toBeInstanceOf(http.Agent);

      const main = onvif.agent as http.Agent;
      const events = onvif.events.agent;
      const track = (agent: http.Agent) => {
        const original = agent.destroy.bind(agent);
        jest.spyOn(agent, 'destroy').mockImplementation(() => {
          destroyed.add(agent);
          return original();
        });
      };
      track(main);
      track(events);

      await onvif.close();
      expect(onvif.closed).toBe(true);
      expect(destroyed.has(main)).toBe(true);
      expect(destroyed.has(events)).toBe(true);
    }

    expect(destroyed.size).toBe(10); // 5 main + 5 events
  });

  it('close clears a pending Subscription reconnect timer', async () => {
    jest.useFakeTimers();
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const sub = onvif.events.globalSubscription;
    const eventPull = jest.spyOn(sub as any, 'eventPull').mockResolvedValue(undefined);

    (sub as any).pulling = true;
    (sub as any).restartEventRequest();
    expect((sub as any).reconnectTimer).toBeDefined();

    await onvif.close();
    expect((sub as any).reconnectTimer).toBeUndefined();
    expect((sub as any).pulling).toBe(false);

    await jest.advanceTimersByTimeAsync(120_000);
    expect(eventPull).not.toHaveBeenCalled();
  });

  it('close clears scheduleReconnectDelay without leaving a live timer', async () => {
    jest.useFakeTimers();
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const sub = onvif.events.globalSubscription;

    const delay = (sub as any).scheduleReconnectDelay(60_000) as Promise<void>;
    expect((sub as any).reconnectTimer).toBeDefined();

    await onvif.close();
    await expect(delay).resolves.toBeUndefined();
    expect((sub as any).reconnectTimer).toBeUndefined();

    const before = jest.getTimerCount();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(jest.getTimerCount()).toBe(before);
  });
});
