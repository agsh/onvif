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
      expect(cam._cam.hostname).toBe('10.0.0.2');
      expect(cam._cam.timeout).toBe(1234);
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
      });
      jest.spyOn(MasterDiscovery, 'probe').mockResolvedValue([onvif, { raw: true }]);

      const devices = await Discovery.probe({ timeout: 10 });
      expect(devices).toHaveLength(2);
      expect(devices[0]).toBeInstanceOf(Cam);
      expect((devices[0] as Cam).hostname).toBe('192.168.1.50');
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
