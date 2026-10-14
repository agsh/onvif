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

    it('keeps updateNC / digestAuth synchronous (not promisified)', () => {
      expect(promisifiedMethods.includes('updateNC')).toBe(false);
      expect(promisifiedMethods.includes('digestAuth')).toBe(false);

      const cam = new Cam({ hostname: '127.0.0.1', username: 'u', password: 'p' });
      const nc = cam.updateNC();
      expect(nc).toBe('00000001');
      expect(typeof cam.digestAuth).toBe('function');
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

    it('disables media2Support when Media2 GetProfiles fails (D-Link workaround)', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.media2Support = true;
      onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
      onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockResolvedValue({ service: [] } as never);
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockRejectedValue(new Error('media2 broken'));
      jest.spyOn(connectSteps, 'getMediaProfiles').mockResolvedValue([]);
      jest.spyOn(connectSteps, 'getVideoSources').mockResolvedValue([]);
      jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined as never);

      await onvif.connect();
      expect(onvif.media2Support).toBe(false);
      expect(connectSteps.getMediaProfiles).toHaveBeenCalled();
    });

    it('keeps media2Support when Media2 GetProfiles succeeds', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.media2Support = true;
      onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
      onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockResolvedValue({ service: [] } as never);
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue([]);
      jest.spyOn(connectSteps, 'getMediaProfiles').mockResolvedValue([]);
      jest.spyOn(connectSteps, 'getVideoSources').mockResolvedValue([]);
      jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined as never);

      await onvif.connect();
      expect(onvif.media2Support).toBe(true);
      expect(connectSteps.probeMedia2Profiles).toHaveBeenCalled();
    });

    it('fills profiles and active sources for Media2-only devices', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      const media2Profiles = [
        {
          token: 'p1',
          name: 'Main',
          videoSourceConfiguration: { token: 'vsc1', sourceToken: 'src1' },
          videoEncoderConfiguration: {
            token: 'vec1',
            encoding: 'H264',
            resolution: { width: 1920, height: 1080 },
            rateControl: { frameRateLimit: 25, bitrateLimit: 4000 },
          },
        },
      ] as never;

      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.media2Support = true;
        cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
        return { service: [] } as never;
      });
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue(media2Profiles);
      jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
        cam.videoSources = [{ token: 'src1', framerate: 0, resolution: { width: 1920, height: 1080 } }];
        return cam.videoSources;
      });
      const getMediaProfiles = jest.spyOn(connectSteps, 'getMediaProfiles');
      // Use real getActiveSources with the Media1-shaped mapped profiles.
      const getActiveSources = jest.spyOn(connectSteps, 'getActiveSources');

      await onvif.connect();

      expect(getMediaProfiles).not.toHaveBeenCalled();
      expect(connectSteps.probeMedia2Profiles).toHaveBeenCalledTimes(1);
      expect(connectSteps.getVideoSources).toHaveBeenCalled();
      expect(getActiveSources).toHaveBeenCalled();
      expect(onvif.profiles).toEqual(media2Profiles);
      expect(onvif.activeSource?.profileToken).toBe('p1');
      expect(onvif.activeSource?.encoding).toBe('H264');
      expect(onvif.activeSource?.width).toBe(1920);
      expect(onvif.activeSource?.fps).toBe(25);
    });

    it('skips media discovery when device has no Media service', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.uri.doorcontrol = new URL('http://127.0.0.1/onvif/doorcontrol');
        cam.services = [];
        return { service: [] } as never;
      });
      const getMediaProfiles = jest.spyOn(connectSteps, 'getMediaProfiles');
      const getVideoSources = jest.spyOn(connectSteps, 'getVideoSources');
      const getActiveSources = jest.spyOn(connectSteps, 'getActiveSources');

      await onvif.connect();
      expect(getMediaProfiles).not.toHaveBeenCalled();
      expect(getVideoSources).not.toHaveBeenCalled();
      expect(getActiveSources).not.toHaveBeenCalled();
      expect(onvif.uri.doorcontrol).toBeDefined();
    });

    it('completes connect when Media is advertised but GetProfiles/GetVideoSources fail (Axis A1601)', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      const warnings: Error[] = [];
      onvif.on('warn', (error) => warnings.push(error));

      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        // Device lists Media in GetServices even though media actions are unimplemented.
        cam.uri.media = new URL('http://127.0.0.1/onvif/media');
        cam.uri.doorcontrol = new URL('http://127.0.0.1/onvif/doorcontrol');
        return { service: [] } as never;
      });
      jest
        .spyOn(connectSteps, 'getMediaProfiles')
        .mockRejectedValue(new Error('ONVIF SOAP Fault: Optional action not implemented'));
      jest
        .spyOn(connectSteps, 'getVideoSources')
        .mockRejectedValue(new Error('ONVIF SOAP Fault: Optional action not implemented'));
      const getActiveSources = jest.spyOn(connectSteps, 'getActiveSources');

      await expect(onvif.connect()).resolves.toBe(onvif);
      expect(onvif.profiles).toEqual([]);
      expect(onvif.videoSources).toEqual([]);
      expect(onvif.activeSource).toBeUndefined();
      expect(getActiveSources).toHaveBeenCalled();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toMatch(/Optional action not implemented/);
    });

    it('Media2-only: probe failure skips media discovery and clears media2Support', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.media2Support = true;
        cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
        return { service: [] } as never;
      });
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockRejectedValue(new Error('media2 broken'));
      const getMediaProfiles = jest.spyOn(connectSteps, 'getMediaProfiles');
      const getVideoSources = jest.spyOn(connectSteps, 'getVideoSources');
      const getActiveSources = jest.spyOn(connectSteps, 'getActiveSources');

      await expect(onvif.connect()).resolves.toBe(onvif);
      expect(onvif.media2Support).toBe(false);
      expect(getMediaProfiles).not.toHaveBeenCalled();
      expect(getVideoSources).not.toHaveBeenCalled();
      expect(getActiveSources).not.toHaveBeenCalled();
      expect(onvif.profiles).toEqual([]);
      expect(onvif.activeSource).toBeUndefined();
    });

    it('Media2-only: getVideoSources failure emits warn and clears media state', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      const warnings: Error[] = [];
      onvif.on('warn', (error) => warnings.push(error));

      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.media2Support = true;
        cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
        return { service: [] } as never;
      });
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue([
        { token: 'p1', name: 'Main', videoSourceConfiguration: { token: 'vsc1', sourceToken: 'src1' } } as never,
      ]);
      jest.spyOn(connectSteps, 'getVideoSources').mockRejectedValue(new Error('Media2 GetVideoSourceConfigurations failed'));
      const getActiveSources = jest.spyOn(connectSteps, 'getActiveSources');

      await expect(onvif.connect()).resolves.toBe(onvif);
      expect(onvif.profiles).toEqual([]);
      expect(onvif.videoSources).toEqual([]);
      expect(onvif.activeSource).toBeUndefined();
      expect(getActiveSources).toHaveBeenCalled();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toMatch(/GetVideoSourceConfigurations failed/);
    });

    it('Media2-only: real probeMedia2Profiles SOAP path fills profiles and activeSource', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });

      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.media2Support = true;
        cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
        return { service: [] } as never;
      });
      jest.spyOn(onvif, 'request').mockImplementation(async ({ body }) => {
        const root = Object.keys(body as object)[0];
        if (root === 'GetProfiles') {
          return [
            {
              getProfilesResponse: {
                profiles: [
                  {
                    token: 'p-soap',
                    name: 'FromSOAP',
                    configurations: {
                      videoSource: {
                        token: 'vsc1',
                        name: 'Source',
                        useCount: 1,
                        sourceToken: 'src1',
                        bounds: { x: 0, y: 0, width: 640, height: 480 },
                      },
                      videoEncoder: {
                        token: 'vec1',
                        name: 'Encoder',
                        useCount: 1,
                        encoding: 'H264',
                        resolution: { width: 640, height: 480 },
                        quality: 3,
                        rateControl: { frameRateLimit: 15, bitrateLimit: 1024 },
                      },
                    },
                  },
                ],
              },
            },
          ] as never;
        }
        if (root === 'GetVideoSourceConfigurations') {
          return [
            {
              getVideoSourceConfigurationsResponse: {
                configurations: [
                  {
                    token: 'vsc1',
                    name: 'Source',
                    useCount: 1,
                    sourceToken: 'src1',
                    bounds: { x: 0, y: 0, width: 640, height: 480 },
                  },
                ],
              },
            },
          ] as never;
        }
        throw new Error(`unexpected ${root}`);
      });

      await onvif.connect();

      expect(onvif.profiles[0]?.token).toBe('p-soap');
      expect(onvif.videoSources[0]?.token).toBe('src1');
      expect(onvif.activeSource).toMatchObject({
        profileToken: 'p-soap',
        sourceToken: 'src1',
        encoding: 'H264',
        width: 640,
        height: 480,
        fps: 15,
        bitrate: 1024,
      });
    });

    it('Media1+Media2 keeps Media1 profiles (does not overwrite with Media2 probe)', async () => {
      const { connectSteps } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      const media1Profiles = [{ token: 'media1-profile', name: 'Media1' }] as never;
      const media2Profiles = [{ token: 'media2-profile', name: 'Media2' }] as never;

      jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue(new Date() as never);
      jest.spyOn(connectSteps, 'getServices').mockImplementation(async (cam) => {
        cam.media2Support = true;
        cam.uri.media = new URL('http://127.0.0.1/onvif/media');
        cam.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
        return { service: [] } as never;
      });
      jest.spyOn(connectSteps, 'probeMedia2Profiles').mockResolvedValue(media2Profiles);
      jest.spyOn(connectSteps, 'getMediaProfiles').mockImplementation(async (cam) => {
        cam.profiles = media1Profiles;
        return media1Profiles;
      });
      jest.spyOn(connectSteps, 'getVideoSources').mockImplementation(async (cam) => {
        cam.videoSources = [];
        return [];
      });
      jest.spyOn(connectSteps, 'getActiveSources').mockResolvedValue(undefined as never);

      await onvif.connect();
      expect(onvif.profiles).toEqual(media1Profiles);
      expect(onvif.profiles[0].token).toBe('media1-profile');
      expect(connectSteps.getMediaProfiles).toHaveBeenCalled();
      expect(connectSteps.probeMedia2Profiles).toHaveBeenCalled();
    });
  });

  describe('probeMedia2Profiles', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('maps SOAP GetProfiles response into Media1-shaped profiles', async () => {
      const { probeMedia2Profiles } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
      onvif.media2Support = true;

      jest.spyOn(onvif, 'request').mockResolvedValue([
        {
          getProfilesResponse: {
            profiles: [
              {
                token: 'mp1',
                name: 'MainStream',
                configurations: {
                  videoSource: {
                    token: 'vsc1',
                    name: 'Source',
                    useCount: 1,
                    sourceToken: 'src1',
                    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
                  },
                  videoEncoder: {
                    token: 'vec1',
                    name: 'Encoder',
                    useCount: 1,
                    encoding: 'H264',
                    resolution: { width: 1920, height: 1080 },
                    quality: 4,
                    rateControl: { frameRateLimit: 25, bitrateLimit: 4096 },
                  },
                },
              },
            ],
          },
        },
      ] as never);

      const profiles = await probeMedia2Profiles(onvif);
      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toMatchObject({
        token: 'mp1',
        name: 'MainStream',
        videoSourceConfiguration: { token: 'vsc1', sourceToken: 'src1' },
        videoEncoderConfiguration: {
          encoding: 'H264',
          resolution: { width: 1920, height: 1080 },
          rateControl: { frameRateLimit: 25, bitrateLimit: 4096 },
        },
      });
      expect((profiles[0] as { configurations?: unknown }).configurations).toBeUndefined();
      expect(onvif.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'media2',
          body: expect.objectContaining({
            GetProfiles: expect.objectContaining({ Type: 'All' }),
          }),
        }),
      );
    });

    it('returns an empty array when device has no Media2 profiles', async () => {
      const { probeMedia2Profiles } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');

      jest.spyOn(onvif, 'request').mockResolvedValue([{ getProfilesResponse: {} }] as never);

      await expect(probeMedia2Profiles(onvif)).resolves.toEqual([]);
    });
  });

  describe('media2ProfileToMedia1', () => {
    it('maps Media2 configurations into Media1 profile fields', async () => {
      const { media2ProfileToMedia1 } = await import('../src/connection');
      const mapped = media2ProfileToMedia1({
        token: 'mp1',
        name: 'Stream',
        fixed: true,
        configurations: {
          videoSource: {
            token: 'vsc1',
            name: 'Source',
            useCount: 1,
            sourceToken: 'src1',
            bounds: { x: 0, y: 0, width: 1280, height: 720 },
          },
          videoEncoder: {
            token: 'vec1',
            name: 'Encoder',
            useCount: 1,
            encoding: 'H265',
            resolution: { width: 1280, height: 720 },
            quality: 5,
            rateControl: { frameRateLimit: 30, bitrateLimit: 2000 },
          },
          PTZ: { token: 'ptz1', name: 'PTZ' },
        },
      } as never);

      expect(mapped).toMatchObject({
        token: 'mp1',
        name: 'Stream',
        fixed: true,
        videoSourceConfiguration: { token: 'vsc1', sourceToken: 'src1' },
        videoEncoderConfiguration: {
          encoding: 'H265',
          resolution: { width: 1280, height: 720 },
          rateControl: { frameRateLimit: 30, bitrateLimit: 2000 },
        },
        PTZConfiguration: { token: 'ptz1', name: 'PTZ' },
      });
      expect((mapped as { configurations?: unknown }).configurations).toBeUndefined();
    });

    it('maps audioOutput / audioDecoder into Profile.extension', async () => {
      const { media2ProfileToMedia1 } = await import('../src/connection');
      const mapped = media2ProfileToMedia1({
        token: 'mp2',
        name: 'Audio',
        configurations: {
          audioOutput: { token: 'aout1', name: 'Out', useCount: 1, outputToken: 'spk1', outputLevel: 50 },
          audioDecoder: { token: 'adec1', name: 'Dec', useCount: 1 },
        },
      } as never);

      expect(mapped.extension).toEqual({
        audioOutputConfiguration: { token: 'aout1', name: 'Out', useCount: 1, outputToken: 'spk1', outputLevel: 50 },
        audioDecoderConfiguration: { token: 'adec1', name: 'Dec', useCount: 1 },
      });
      expect(mapped.videoSourceConfiguration).toBeUndefined();
      expect(mapped.videoEncoderConfiguration).toBeUndefined();
    });
  });

  describe('getVideoSources Media2 fallback', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('falls back to Media2 GetVideoSourceConfigurations when Media GetVideoSources fails', async () => {
      const { getVideoSources } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.uri.media = new URL('http://127.0.0.1/onvif/media');
      onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
      onvif.media2Support = true;

      jest.spyOn(onvif, 'request').mockImplementation(async ({ body }) => {
        const root = Object.keys(body as object)[0];
        if (root === 'GetVideoSources') {
          throw new Error('ONVIF SOAP Fault: Optional action not implemented');
        }
        if (root === 'GetVideoSourceConfigurations') {
          return [
            {
              getVideoSourceConfigurationsResponse: {
                configurations: [
                  {
                    token: 'cfg1',
                    name: 'Main',
                    useCount: 1,
                    sourceToken: 'src1',
                    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
                  },
                  {
                    token: 'cfg2',
                    name: 'Crop',
                    useCount: 1,
                    sourceToken: 'src1',
                    bounds: { x: 0, y: 0, width: 1280, height: 720 },
                  },
                  {
                    token: 'cfg3',
                    name: 'Second',
                    useCount: 1,
                    sourceToken: 'src2',
                    bounds: { x: 0, y: 0, width: 640, height: 480 },
                  },
                ],
              },
            },
          ] as never;
        }
        throw new Error(`unexpected ${root}`);
      });

      const sources = await getVideoSources(onvif);
      expect(sources.map((source) => source.token)).toEqual(['src1', 'src2']);
      expect(sources[0].resolution).toEqual({ width: 1920, height: 1080 });
      expect(onvif.videoSources).toEqual(sources);
    });

    it('uses Media2 when Media service is not advertised', async () => {
      const { getVideoSources } = await import('../src/connection');
      const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
      onvif.uri.media2 = new URL('http://127.0.0.1/onvif/media2');
      onvif.media2Support = true;

      jest.spyOn(onvif, 'request').mockResolvedValue([
        {
          getVideoSourceConfigurationsResponse: {
            configurations: [
              {
                token: 'cfg1',
                name: 'Main',
                useCount: 1,
                sourceToken: 'only-src',
                bounds: { x: 0, y: 0, width: 800, height: 600 },
              },
            ],
          },
        },
      ] as never);

      const sources = await getVideoSources(onvif);
      expect(sources).toHaveLength(1);
      expect(sources[0].token).toBe('only-src');
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
