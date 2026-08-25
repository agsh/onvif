import { Onvif } from '../src/onvif';
import { Discovery as MasterDiscovery } from '../src/discovery';
import { Discovery } from '../src/compatibility/promises/discovery';
import { Cam } from '../src/compatibility/promises/cam';
import { promisifyProperty, promisifiedMethods } from '../src/compatibility/promises/promisify';
import { Cam as CallbackCam } from '../src/compatibility/cam';

describe('compatibility promises unit', () => {
  describe('promisifyProperty', () => {
    it('returns undefined for symbol keys', () => {
      const target = { _cam: new CallbackCam({ hostname: '127.0.0.1', autoconnect: false }) };
      expect(promisifyProperty(target, Symbol('x'))).toBeUndefined();
    });

    it('forwards non-promisified functions without wrapping', () => {
      const cam = new CallbackCam({ hostname: '127.0.0.1', autoconnect: false });
      const spy = jest.fn();
      cam.on('test', spy);
      const target = { _cam: cam };
      const on = promisifyProperty(target, 'on') as typeof cam.on;
      expect(promisifiedMethods.includes('on')).toBe(false);
      on('test', () => undefined);
      cam.emit('test');
      expect(spy).toHaveBeenCalled();
    });

    it('rejects when the callback reports an error', async () => {
      const cam = new CallbackCam({ hostname: '127.0.0.1', autoconnect: false });
      jest.spyOn(cam, 'getHostname').mockImplementation((callback: any) => {
        callback(new Error('boom'));
      });
      const target = { _cam: cam };
      const getHostname = promisifyProperty(target, 'getHostname') as () => Promise<unknown>;
      await expect(getHostname()).rejects.toThrow('boom');
    });
  });

  describe('Cam proxy setters', () => {
    it('forwards property writes to the underlying callback cam', () => {
      const cam = new Cam({ hostname: '127.0.0.1', port: 8000, autoconnect: false });
      cam.hostname = '10.0.0.2';
      cam.timeout = 1234;
      cam.username = 'admin';
      cam.password = 'pass';
      cam.useSecure = true;
      cam.preserveAddress = true;
      cam.agent = false;
      expect(cam._cam.hostname).toBe('10.0.0.2');
      expect(cam._cam.timeout).toBe(1234);
      expect(cam._cam.username).toBe('admin');
      expect(cam._cam.password).toBe('pass');
      expect(cam._cam.useSecure).toBe(true);
      expect(cam._cam.preserveAddress).toBe(true);
      expect(cam._cam.agent).toBe(false);
    });
  });

  describe('Cam event forwarding', () => {
    it('forwards rawRequest/rawResponse/connect/warning/eventsError from Onvif', () => {
      const cam = new CallbackCam({ hostname: '127.0.0.1', autoconnect: false });
      const onvif = (cam as unknown as { onvif: Onvif }).onvif;
      const rawRequest = jest.fn();
      const rawResponse = jest.fn();
      const connect = jest.fn();
      const warning = jest.fn();
      const eventsError = jest.fn();

      cam.on('rawRequest', rawRequest);
      cam.on('rawResponse', rawResponse);
      cam.on('connect', connect);
      cam.on('warning', warning);
      cam.on('eventsError', eventsError);

      onvif.emit(Onvif.RAW_REQUEST, '<req/>', {});
      onvif.emit(Onvif.RAW_RESPONSE, '<res/>');
      onvif.emit(Onvif.CONNECT);
      onvif.emit(Onvif.WARN, new Error('no sources'));
      onvif.emit(Onvif.EVENTS_ERROR, new Error('pull failed'));

      expect(rawRequest).toHaveBeenCalledWith('<req/>', {});
      expect(rawResponse).toHaveBeenCalledWith('<res/>');
      expect(connect).toHaveBeenCalled();
      expect(warning).toHaveBeenCalledWith(expect.any(Error));
      expect(eventsError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('lazily bridges event listeners and starts/stops pull subscription', async () => {
      const cam = new CallbackCam({ hostname: '127.0.0.1', autoconnect: false });
      const onvif = (cam as unknown as { onvif: Onvif }).onvif;
      const subscribe = jest
        .spyOn(onvif.events.globalSubscription, 'subscribe')
        .mockResolvedValue(undefined as never);
      const unsubscribe = jest
        .spyOn(onvif.events.globalSubscription, 'unsubscribe')
        .mockResolvedValue(undefined as never);
      const handler = jest.fn();

      cam.on('event', handler);
      expect(subscribe).toHaveBeenCalled();

      onvif.emit(Onvif.EVENT, { topic: 'tns1:VideoSource/MotionAlarm' } as any);
      expect(handler).toHaveBeenCalledWith({ topic: 'tns1:VideoSource/MotionAlarm' });

      cam.off('event', handler);
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Onvif.connect Media2 probe', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    async function withConcreteServices(onvif: Onvif) {
      const Media2 = (await import('../src/media2')).default;
      const Media = (await import('../src/media')).default;
      const media2 = new Media2(onvif);
      const media = new Media(onvif);
      Object.defineProperty(onvif, 'media2', { configurable: true, value: media2 });
      Object.defineProperty(onvif, 'media', { configurable: true, value: media });
      return { media2, media };
    }

    it('disables media2Support when Media2 GetProfiles fails (D-Link workaround)', async () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      const { media2, media } = await withConcreteServices(onvif);
      onvif.device.media2Support = true;
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(onvif.device, 'getServices').mockResolvedValue({ service: [] } as never);
      jest.spyOn(media2, 'getProfiles').mockRejectedValue(new Error('media2 broken'));
      jest.spyOn(media, 'getProfiles').mockResolvedValue([]);
      jest.spyOn(media, 'getVideoSources').mockResolvedValue([]);
      jest.spyOn(onvif, 'getActiveSources').mockResolvedValue(undefined as never);

      await onvif.connect();
      expect(onvif.device.media2Support).toBe(false);
      expect(media.getProfiles).toHaveBeenCalled();
    });

    it('keeps media2Support when Media2 GetProfiles succeeds', async () => {
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      const { media2, media } = await withConcreteServices(onvif);
      onvif.device.media2Support = true;
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(onvif.device, 'getServices').mockResolvedValue({ service: [] } as never);
      jest.spyOn(media2, 'getProfiles').mockResolvedValue([]);
      jest.spyOn(media, 'getProfiles').mockResolvedValue([]);
      jest.spyOn(media, 'getVideoSources').mockResolvedValue([]);
      jest.spyOn(onvif, 'getActiveSources').mockResolvedValue(undefined as never);

      await onvif.connect();
      expect(onvif.device.media2Support).toBe(true);
    });
  });

  describe('Discovery', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('maps discovered Onvif devices to promisified Cam instances', async () => {
      const onvif = new Onvif({
        hostname: '192.168.1.50',
        port: 80,
        path: '/onvif/device_service',
        urn: 'urn:uuid:test',
        autoConnect: false,
        xaddrs: [new URL('http://192.168.1.50/onvif/device_service')],
      });
      jest.spyOn(MasterDiscovery, 'probe').mockResolvedValue([onvif, { raw: true }]);

      const devices = await Discovery.probe({ timeout: 10 });
      expect(devices).toHaveLength(2);
      expect(devices[0]).toBeInstanceOf(Cam);
      expect((devices[0] as Cam).hostname).toBe('192.168.1.50');
      expect((devices[0] as Cam).xaddrs).toEqual(onvif.xaddrs);
      expect(devices[1]).toEqual({ raw: true });
    });

    it('re-emits device and error events from master Discovery', () => {
      const onvif = new Onvif({ hostname: '10.0.0.1', autoConnect: false });
      const deviceHandler = jest.fn();
      const errorHandler = jest.fn();
      Discovery.on('device', deviceHandler);
      Discovery.on('error', errorHandler);

      MasterDiscovery.emit('device', onvif, { address: '10.0.0.1' }, '<xml/>');
      MasterDiscovery.emit('error', new Error('probe failed'), '<bad/>');

      expect(deviceHandler).toHaveBeenCalled();
      expect(deviceHandler.mock.calls[0][0]).toBeInstanceOf(Cam);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), '<bad/>');

      Discovery.off('device', deviceHandler);
      Discovery.off('error', errorHandler);
    });

    it('re-emits non-Onvif device payloads unchanged', () => {
      const deviceHandler = jest.fn();
      Discovery.on('device', deviceHandler);
      const payload = { probeMatches: true };
      MasterDiscovery.emit('device', payload, {}, '<xml/>');
      expect(deviceHandler).toHaveBeenCalledWith(payload, {}, '<xml/>');
      Discovery.off('device', deviceHandler);
    });
  });
});
