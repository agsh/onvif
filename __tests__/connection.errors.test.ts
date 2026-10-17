/**
 * connect() failure paths and reconnect consistency.
 * Criterion: errors are surfaced; a failed or repeated connect does not leave stale discovery state.
 *
 * @jest-environment node
 */

import http from 'http';
import { AddressInfo } from 'net';
import { Onvif } from '../src';
import { connectSteps } from '../src/connection';

describe('connect() errors and reconnect consistency', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function seedStaleDiscovery(onvif: Onvif) {
    onvif.uri.ptz = new URL('http://127.0.0.1/onvif/ptz');
    onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
    onvif.services = [{ namespace: 'old', XAddr: 'http://old' } as never];
    onvif.media2Support = true;
    onvif.profiles = [{ token: 'old' } as never];
    onvif.videoSources = [{ token: 'old' } as never];
    onvif.activeSources = [{ sourceToken: 'old' } as never];
    onvif.activeSource = onvif.activeSources[0];
    onvif.deviceInformation = { manufacturer: 'Stale' } as never;
  }

  it('rejects when time sync fails, clears prior discovery, does not emit connect', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    seedStaleDiscovery(onvif);
    const onConnect = jest.fn();
    onvif.on('connect', onConnect);

    jest.spyOn(onvif, 'getSystemDateAndTime').mockRejectedValue(Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' }));
    const getServices = jest.spyOn(connectSteps, 'getServices');

    await expect(onvif.connect({ media: false })).rejects.toMatchObject({ code: 'ETIMEDOUT' });
    expect(getServices).not.toHaveBeenCalled();
    expect(onConnect).not.toHaveBeenCalled();
    expect(onvif.uri).toEqual({});
    expect(onvif.services).toEqual([]);
    expect(onvif.media2Support).toBe(false);
    expect(onvif.profiles).toEqual([]);
    expect(onvif.activeSource).toBeUndefined();
    expect(onvif.deviceInformation).toBeUndefined();
    expect(onvif.closed).toBe(false);
  });

  it('retries successfully after a failed connect', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    seedStaleDiscovery(onvif);

    jest
      .spyOn(onvif, 'getSystemDateAndTime')
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      cam.uri.device = new URL('http://127.0.0.1/onvif/device_service');
      cam.services = [];
      return { service: [] } as never;
    });

    await expect(onvif.connect({ media: false })).rejects.toThrow(/ECONNREFUSED/);
    expect(onvif.uri).toEqual({});

    const onConnect = jest.fn();
    onvif.on('connect', onConnect);
    await expect(onvif.connect({ media: false })).resolves.toBe(onvif);
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onvif.uri.device).toBeDefined();
    expect(onvif.uri.ptz).toBeUndefined();
  });

  it('falls back to GetCapabilities when GetServices fails', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockRejectedValue(new Error('ActionNotSupported'));
    jest.spyOn(connectSteps, 'getCapabilities').mockImplementation(async (cam) => {
      cam.uri.media = new URL('http://127.0.0.1/onvif/media');
      cam.capabilities = { media: { XAddr: 'http://127.0.0.1/onvif/media' } } as never;
      return cam.capabilities;
    });
    jest.spyOn(connectSteps, 'getMediaProfiles').mockImplementation(async (cam) => {
      cam.profiles = [{ token: 'p1' } as never];
      return cam.profiles;
    });
    jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
      cam.videoSources = [];
      return [];
    });
    jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined);

    await onvif.connect();
    expect(connectSteps.getCapabilities).toHaveBeenCalled();
    expect(onvif.uri.media).toBeDefined();
    expect(onvif.profiles).toHaveLength(1);
  });

  it('rejects when both GetServices and GetCapabilities fail (state stays cleared)', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    seedStaleDiscovery(onvif);
    const onConnect = jest.fn();
    onvif.on('connect', onConnect);

    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockRejectedValue(new Error('no GetServices'));
    jest.spyOn(connectSteps, 'getCapabilities').mockRejectedValue(new Error('no GetCapabilities'));

    await expect(onvif.connect({ media: false })).rejects.toThrow(/no GetCapabilities/);
    expect(onConnect).not.toHaveBeenCalled();
    expect(onvif.uri).toEqual({});
    expect(onvif.services).toEqual([]);
    expect(onvif.capabilities).toEqual({});
  });

  it('emits warn and still completes when Media GetProfiles fails', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    const onWarn = jest.fn();
    const onConnect = jest.fn();
    onvif.on('warn', onWarn);
    onvif.on('connect', onConnect);

    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      cam.uri.media = new URL('http://127.0.0.1/onvif/media');
      cam.services = [];
      return { service: [] } as never;
    });
    jest.spyOn(connectSteps, 'getMediaProfiles').mockRejectedValue(new Error('Optional action not implemented'));
    jest.spyOn(connectSteps, 'getVideoSources').mockRejectedValue(new Error('Optional action not implemented'));
    jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined);

    await expect(onvif.connect()).resolves.toBe(onvif);
    expect(onConnect).toHaveBeenCalled();
    expect(onWarn).toHaveBeenCalled();
    expect(onvif.profiles).toEqual([]);
    expect(onvif.videoSources).toEqual([]);
    expect(onvif.uri.media).toBeDefined();
  });

  it('close then connect reopens and refills discovery from scratch', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      cam.uri.device = new URL('http://127.0.0.1/onvif/device_service');
      cam.uri.ptz = new URL('http://127.0.0.1/onvif/ptz');
      cam.services = [];
      return { service: [] } as never;
    });

    await onvif.connect({ media: false });
    expect(onvif.uri.ptz).toBeDefined();

    await onvif.close();
    expect(onvif.closed).toBe(true);

    jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
      cam.uri.device = new URL('http://127.0.0.1/onvif/device_service');
      // PTZ gone after reboot
      cam.services = [];
      return { service: [] } as never;
    });

    await onvif.connect({ media: false });
    expect(onvif.closed).toBe(false);
    expect(onvif.uri.device).toBeDefined();
    expect(onvif.uri.ptz).toBeUndefined();
  });
});

describe('mid-session transport errors', () => {
  it('ETIMEDOUT on one request does not leave the client closed or stuck', async () => {
    const server = http.createServer((req, res) => {
      // Never respond — client timeout fires
      req.resume();
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    const { port } = server.address() as AddressInfo;

    const onvif = new Onvif({
      hostname: '127.0.0.1',
      port,
      autoConnect: false,
      agent: false,
      useWSSecurity: false,
      timeout: 50,
    });

    await expect(
      onvif.request({
        body: { GetHostname: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } } },
      }),
    ).rejects.toMatchObject({ code: 'ETIMEDOUT' });

    expect(onvif.closed).toBe(false);

    // Second request against a responding server still works on the same instance.
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    const ok = http.createServer((req, res) => {
      req.resume();
      res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
      res.end(
        '<?xml version="1.0"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body>' +
          '<tds:GetHostnameResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl">' +
          '<tds:HostnameInformation><tt:Name xmlns:tt="http://www.onvif.org/ver10/schema">cam</tt:Name></tds:HostnameInformation>' +
          '</tds:GetHostnameResponse></s:Body></s:Envelope>',
      );
    });
    await new Promise<void>((resolve, reject) => {
      ok.listen(port, '127.0.0.1', () => resolve());
      ok.on('error', reject);
    });

    const [body] = await onvif.request({
      body: { GetHostname: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } } },
    });
    expect(body.getHostnameResponse).toBeDefined();
    expect(onvif.closed).toBe(false);

    await onvif.close();
    await new Promise<void>((resolve, reject) => {
      ok.close((err) => (err ? reject(err) : resolve()));
    });
  });
});
