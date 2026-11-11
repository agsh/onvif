/**
 * Live Happytime: connect -> close -> connect must reopen agents and SOAP.
 *
 * @jest-environment node
 */

import http from 'http';
import { Onvif } from '../src';
import happytimeOnvifOptions from './happytime.json';

describe('real connect-close-reconnect workflow (happytime)', () => {
  it('reopens after close and serves SOAP again', async () => {
    // Own keep-alive agents (happytime.json sets agent:false for suite isolation).
    const onvif = new Onvif({
      hostname: happytimeOnvifOptions.hostname,
      port: happytimeOnvifOptions.port,
      username: happytimeOnvifOptions.username,
      password: happytimeOnvifOptions.password,
      autoConnect: false,
    });

    await onvif.connect();
    expect(onvif.closed).toBe(false);
    expect(onvif.agent).toBeInstanceOf(http.Agent);
    const firstAgent = onvif.agent;
    const firstEventsAgent = onvif.events.agent;
    const info1 = await onvif.device.getDeviceInformation();
    expect(info1.manufacturer).toMatch(/Happytimesoft/i);

    await onvif.close();
    expect(onvif.closed).toBe(true);
    await expect(onvif.device.getDeviceInformation()).rejects.toThrow(/closed/);

    await onvif.connect();
    expect(onvif.closed).toBe(false);
    expect(onvif.agent).toBeInstanceOf(http.Agent);
    expect(onvif.agent).not.toBe(firstAgent);
    expect(onvif.events.agent).not.toBe(firstEventsAgent);

    const info2 = await onvif.device.getDeviceInformation();
    expect(info2.manufacturer).toBe(info1.manufacturer);
    expect(onvif.profiles.length).toBeGreaterThan(0);
    expect(onvif.uri.device).toBeDefined();

    await onvif.close();
  });
});
