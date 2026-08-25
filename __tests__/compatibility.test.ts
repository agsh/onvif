import { Cam, Callback } from '../src/compatibility/cam';
import happytimeOnvifOptions from './happytime.json';

const RECORDING_TOKEN = 'RecordingToken_1';
const RECORDING_JOB_TOKEN = 'RecordingJobToken_1';
const VIDEO_SOURCE_TOKEN = 'VideoSourceToken_1';

let cam: Cam;

function promisify<T>(fn: (callback: Callback) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((error: Error | null, result?: T) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result as T);
    });
  });
}

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    cam = new Cam(
      happytimeOnvifOptions,
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
    );
  });
});

describe('Compatibility Cam', () => {
  describe('connection properties', () => {
    it('should expose startup properties like v0.x after connect', () => {
      expect(cam.uri.media?.href).toBeDefined();
      expect(cam.videoSources.length).toBeGreaterThan(0);
      expect(cam.profiles.length).toBeGreaterThan(0);
      expect(cam.defaultProfile).toBeDefined();
      expect(cam.defaultProfiles.length).toBeGreaterThan(0);
      expect(cam.activeSource).toBeDefined();
      expect(cam.activeSource?.profileToken).toBeDefined();
      expect(cam.activeSources.length).toBeGreaterThan(0);
      expect(cam.activeSources[0]).toEqual(cam.activeSource);
      expect(typeof cam.media2Support).toBe('boolean');
    });

    it('should expose connection getters and allow timeout/hostname updates', () => {
      expect(cam.port).toBe(8000);
      expect(cam.path).toBeDefined();
      expect(cam.hostname).toBe('127.0.0.1');
      expect(cam.username).toBe('admin');
      expect(cam.password).toBe('admin');
      expect(typeof cam.timeout).toBe('number');
      expect(cam.capabilities).toBeDefined();
      expect(typeof cam.media2Support).toBe('boolean');

      const previousTimeout = cam.timeout;
      cam.timeout = previousTimeout + 1;
      expect(cam.timeout).toBe(previousTimeout + 1);
      cam.timeout = previousTimeout;
    });

    it('should allow mutating v0.x connection properties (Discovery-style)', () => {
      const pending = new Cam({ hostname: '127.0.0.1', port: 8000, autoconnect: false });
      pending.username = 'admin';
      pending.password = 'secret';
      pending.useSecure = true;
      pending.useWSSecurity = false;
      pending.preserveAddress = true;
      pending.port = 8443;
      pending.path = '/onvif/device_service';
      pending.agent = false;
      pending.secureOpts = { rejectUnauthorized: false };
      pending.timeShift = 1000;

      expect(pending.username).toBe('admin');
      expect(pending.password).toBe('secret');
      expect(pending.useSecure).toBe(true);
      expect(pending.useWSSecurity).toBe(false);
      expect(pending.preserveAddress).toBe(true);
      expect(pending.port).toBe(8443);
      expect(pending.path).toBe('/onvif/device_service');
      expect(pending.agent).toBe(false);
      expect(pending.secureOpts).toEqual({ rejectUnauthorized: false });
      expect(pending.timeShift).toBe(1000);
    });

    it('should map v0.x secureOpts constructor option to Onvif secureOptions', () => {
      const pending = new Cam({
        hostname: '127.0.0.1',
        autoconnect: false,
        secureOpts: { rejectUnauthorized: false },
      });
      expect(pending.secureOpts).toEqual({ rejectUnauthorized: false });
    });

    it('should not auto-connect when autoconnect is false', async () => {
      const pending = new Cam({ ...happytimeOnvifOptions, autoconnect: false });
      await new Promise((resolve) => setImmediate(resolve));
      expect(pending.uri.media).toBeUndefined();
    });

    it('should populate deviceInformation after getDeviceInformation', async () => {
      const info = await promisify<any>((callback) => cam.getDeviceInformation(callback));
      expect(info.manufacturer).toBeDefined();
      expect(cam.deviceInformation).toEqual(info);
    });

    it('should return services through getServices callback API', async () => {
      const services = await promisify<any[]>((callback) => cam.getServices(false, callback));
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      expect(cam.services.length).toBeGreaterThan(0);
    });

    it('should accept getServices(callback) overload without includeCapability', async () => {
      const services = await promisify<any[]>((callback) => cam.getServices(callback));
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
    });

    it('should return active sources list', async () => {
      const sources = await promisify<any[]>((callback) => cam.getActiveSources(callback));
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0]).toHaveProperty('sourceToken');
      expect(sources[0]).toHaveProperty('profileToken');
      expect(cam.activeSources).toEqual(sources);
    });

    it('should return system date and time', async () => {
      const dateTime = await promisify<any>((callback) => cam.getSystemDateAndTime(callback));
      expect(dateTime).toBeDefined();
    });

    it('should return device service capabilities', async () => {
      const caps = await promisify<any>((callback) => cam.getServiceCapabilities(callback));
      expect(typeof caps).toBe('object');
      expect(cam.serviceCapabilities).toEqual(caps);
    });

    it('should reject _request without a callback', () => {
      expect(() => (cam as any)._request({})).toThrow('`callback` must be a function');
    });
  });

  describe('device', () => {
    it('should return and cache scopes', async () => {
      const scopes = await promisify<any[]>((callback) => cam.getScopes(callback));
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
      expect(cam.scopes).toEqual(scopes);
    });

    it('should return hostname', async () => {
      const hostname = await promisify<any>((callback) => cam.getHostname(callback));
      expect(hostname.name).toBeDefined();
      expect(typeof hostname.fromDHCP).toBe('boolean');
    });

    it('should return capabilities with service URIs', async () => {
      const caps = await promisify<any>((callback) => cam.getCapabilities(callback));
      expect(caps.media?.XAddr).toBeDefined();
      expect(caps.device?.XAddr).toBeDefined();
      expect(cam.uri.media).toBeDefined();
    });

    it('should return NTP settings', async () => {
      const ntp = await promisify<any>((callback) => cam.getNTP(callback));
      expect(ntp).toBeDefined();
      expect(cam.NTP).toEqual(ntp);
    });

    it('should return DNS settings', async () => {
      const dns = await promisify<any>((callback) => cam.getDNS(callback));
      expect(dns).toBeDefined();
      expect(cam.DNS).toEqual(dns);
    });

    it('should return network interfaces', async () => {
      const interfaces = await promisify<any[]>((callback) => cam.getNetworkInterfaces(callback));
      expect(Array.isArray(interfaces)).toBe(true);
      expect(interfaces.length).toBeGreaterThan(0);
      expect(cam.networkInterfaces).toEqual(interfaces);
    });

    it('should return network default gateway and protocols', async () => {
      const gateway = await promisify<any>((callback) => cam.getNetworkDefaultGateway(callback));
      expect(gateway).toBeDefined();
      expect(cam.networkDefaultGateway).toEqual(gateway);

      const protocols = await promisify<any>((callback) => cam.getNetworkProtocols(callback));
      expect(protocols).toBeDefined();
      expect(cam.networkProtocols).toEqual(protocols);
    });

    it('should return users and cache them on the cam instance', async () => {
      const users = await promisify<any[]>((callback) => cam.getUsers(callback));
      expect(Array.isArray(users)).toBe(true);
      expect(users[0]).toHaveProperty('username');
      expect(cam.users).toEqual(users);
    });

    it('should reject setUsers when required fields are missing', async () => {
      await expect(
        promisify<void>((callback) => cam.setUsers([{ username: 'x' }] as any, callback)),
      ).rejects.toThrow('Missing username, password or user level');
    });
  });

  describe('media', () => {
    it('should return media profiles', async () => {
      const profiles = await promisify<any[]>((callback) => cam.getProfiles(callback));
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles[0]).toHaveProperty('token');
      expect(profiles[0]).toHaveProperty('name');
      expect(profiles[0]).toHaveProperty('videoSourceConfiguration');
      expect(cam.profiles).toEqual(profiles);
    });

    it('should return video sources', async () => {
      const sources = await promisify<any[]>((callback) => cam.getVideoSources(callback));
      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0]).toHaveProperty('token');
    });

    it('should return stream and snapshot URIs', async () => {
      const stream = await promisify<any>((callback) => cam.getStreamUri(callback));
      expect(stream.uri).toMatch(/^rtsp:\/\//);

      const snapshot = await promisify<any>((callback) => cam.getSnapshotUri(callback));
      expect(snapshot.uri).toMatch(/^http/);
    });

    it('should call underlying media methods once when options and callback are both passed', async () => {
      const Media = (await import('../src/media')).default;
      const streamSpy = jest.spyOn(Media.prototype, 'getStreamUri');
      const snapshotSpy = jest.spyOn(Media.prototype, 'getSnapshotUri');

      await promisify<any>((callback) => cam.getStreamUri({ protocol: 'RTSP' }, callback));
      await promisify<any>((callback) => cam.getSnapshotUri({}, callback));

      expect(streamSpy).toHaveBeenCalledTimes(1);
      expect(snapshotSpy).toHaveBeenCalledTimes(1);
      streamSpy.mockRestore();
      snapshotSpy.mockRestore();
    });

    it('should return media service capabilities', async () => {
      const caps = await promisify<any>((callback) => cam.getMediaServiceCapabilities(callback));
      expect(typeof caps).toBe('object');
      expect(cam.mediaCapabilities).toEqual(caps);
    });

    it('should return encoder configurations and cache them', async () => {
      const configs = await promisify<any[]>((callback) => cam.getVideoEncoderConfigurations(callback));
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
      expect(cam.videoEncoderConfigurations).toEqual(configs);
    });

    it('should return video source configurations and a single configuration by token', async () => {
      const configs = await promisify<any[]>((callback) => cam.getVideoSourceConfigurations(callback));
      expect(configs.length).toBeGreaterThan(0);
      expect(cam.videoSourceConfigurations).toEqual(configs);

      const token = configs[0].token ?? configs[0].$?.token;
      const one = await promisify<any>((callback) => cam.getVideoSourceConfiguration(token, callback));
      expect(one).toBeDefined();
    });

    it('should return video encoder configuration and options using cached tokens', async () => {
      await promisify<any[]>((callback) => cam.getVideoEncoderConfigurations(callback));
      const config = await promisify<any>((callback) => cam.getVideoEncoderConfiguration(callback));
      expect(config).toBeDefined();

      const options = await promisify<any>((callback) => cam.getVideoEncoderConfigurationOptions(callback));
      expect(options).toBeDefined();
    });

    it('should return audio sources, outputs and encoder configurations', async () => {
      const sources = await promisify<any[]>((callback) => cam.getAudioSources(callback));
      expect(Array.isArray(sources)).toBe(true);

      const outputs = await promisify<any[]>((callback) => cam.getAudioOutputs(callback));
      expect(Array.isArray(outputs)).toBe(true);
      expect(cam.audioOutputs).toEqual(outputs);

      const sourceConfigs = await promisify<any[]>((callback) => cam.getAudioSourceConfigurations(callback));
      expect(Array.isArray(sourceConfigs)).toBe(true);
      expect(cam.audioSourceConfigurations).toEqual(sourceConfigs);

      const outputConfigs = await promisify<any[]>((callback) => cam.getAudioOutputConfigurations(callback));
      expect(Array.isArray(outputConfigs)).toBe(true);
      expect(cam.audioOutputConfigurations).toEqual(outputConfigs);

      const encoderConfigs = await promisify<any[]>((callback) => cam.getAudioEncoderConfigurations(callback));
      expect(Array.isArray(encoderConfigs)).toBe(true);
      expect(cam.audioEncoderConfigurations).toEqual(encoderConfigs);

      const token = encoderConfigs[0]?.token ?? encoderConfigs[0]?.$?.token;
      expect(token).toBeDefined();
      const one = await promisify<any>((callback) => cam.getAudioEncoderConfiguration(token, callback));
      expect(one).toBeDefined();
      const options = await promisify<any>((callback) => cam.getAudioEncoderConfigurationOptions(callback));
      expect(options).toBeDefined();
    });

    it('should set synchronization point for the default profile', async () => {
      await expect(promisify<void>((callback) => cam.setSynchronizationPoint(callback))).resolves.toBeUndefined();
    });

    it('should return OSDs and OSD options', async () => {
      const osds = await promisify<any>((callback) => cam.getOSDs(callback));
      expect(osds).toBeDefined();

      const videoSourceConfigurationToken =
        cam.defaultProfile?.videoSourceConfiguration?.token ?? cam.activeSource?.videoSourceConfigurationToken;
      expect(videoSourceConfigurationToken).toBeDefined();
      const options = await promisify<any>((callback) =>
        cam.getOSDOptions({ videoSourceConfigurationToken: videoSourceConfigurationToken! }, callback),
      );
      expect(options).toBeDefined();
    });
  });

  describe('ptz', () => {
    it('should return PTZ nodes', async () => {
      const nodes = await promisify<any[]>((callback) => cam.getNodes(callback));
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0]).toHaveProperty('token');
      expect(cam.nodes).toBeDefined();
    });

    it('should return presets keyed by token (v0.8.1+)', async () => {
      const presetName = `compat-map-${Date.now()}`;
      const presetToken = await promisify<string>((callback) =>
        cam.setPreset({ presetName } as any, callback),
      );
      expect(typeof presetToken).toBe('string');

      const presets = await promisify<Record<string, { name?: string; token?: string }>>((callback) =>
        cam.getPresets(callback),
      );
      expect(typeof presets).toBe('object');
      expect(Array.isArray(presets)).toBe(false);
      expect(presets[presetToken]).toBeDefined();
      expect(presets[presetToken].name).toBe(presetName);
      expect(presets[presetToken].token).toBe(presetToken);
      expect(cam.presets[presetToken]?.name).toBe(presetName);
    });

    it('should keep duplicate preset names when keyed by token', async () => {
      const PTZ = (await import('../src/ptz')).default;
      const duplicateName = 'Home';
      jest.spyOn(PTZ.prototype, 'getPresetsExtended').mockResolvedValue({
        'tok-a': { name: duplicateName, token: 'tok-a' },
        'tok-b': { name: duplicateName, token: 'tok-b' },
      } as any);

      const presets = await promisify<Record<string, { name?: string; token?: string }>>((callback) =>
        cam.getPresets(callback),
      );

      expect(Object.keys(presets)).toEqual(expect.arrayContaining(['tok-a', 'tok-b']));
      expect(presets['tok-a'].name).toBe(duplicateName);
      expect(presets['tok-b'].name).toBe(duplicateName);
      jest.restoreAllMocks();
    });

    it('should call underlying ptz methods once when options and callback are both passed', async () => {
      const PTZ = (await import('../src/ptz')).default;
      const presetsSpy = jest.spyOn(PTZ.prototype, 'getPresetsExtended');
      const statusSpy = jest.spyOn(PTZ.prototype, 'getStatus');

      await promisify<any>((callback) => cam.getPresets({}, callback));
      await promisify<any>((callback) => cam.getStatus({}, callback));

      expect(presetsSpy).toHaveBeenCalledTimes(1);
      expect(statusSpy).toHaveBeenCalledTimes(1);
      presetsSpy.mockRestore();
      statusSpy.mockRestore();
    });

    it('should return PTZ status', async () => {
      const status = await promisify<any>((callback) => cam.getStatus(callback));
      expect(status).toHaveProperty('position');
    });

    it('should accept v0.x x/y/zoom options for absoluteMove', async () => {
      await expect(
        promisify<void>((callback) => {
          cam.absoluteMove({ x: 0, y: 0, zoom: 0 } as any, callback);
        }),
      ).resolves.toBeUndefined();
    });

    it('should omit missing absoluteMove/relativeMove axes instead of sending undefined', async () => {
      const PTZ = (await import('../src/ptz')).default;
      const absoluteSpy = jest.spyOn(PTZ.prototype, 'absoluteMove').mockResolvedValue(undefined as never);
      const relativeSpy = jest.spyOn(PTZ.prototype, 'relativeMove').mockResolvedValue(undefined as never);

      await promisify<void>((callback) => cam.absoluteMove({ x: 0.5, y: 0.5 } as any, callback));
      expect(absoluteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { panTilt: { x: 0.5, y: 0.5 } },
        }),
      );
      expect(absoluteSpy.mock.calls[0][0].position).not.toHaveProperty('zoom');

      await promisify<void>((callback) => cam.relativeMove({ zoom: 0 } as any, callback));
      expect(relativeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          translation: { zoom: { x: 0 } },
        }),
      );
      expect(relativeSpy.mock.calls[0][0].translation).not.toHaveProperty('panTilt');

      absoluteSpy.mockRestore();
      relativeSpy.mockRestore();
    });

    it('should return PTZ configurations and configuration options', async () => {
      const configurations = await promisify<any[]>((callback) => cam.getConfigurations(callback));
      expect(Array.isArray(configurations)).toBe(true);
      expect(configurations.length).toBeGreaterThan(0);
      expect(cam.configurations).toBeDefined();

      const token = configurations[0].token;
      const options = await promisify<any>((callback) => cam.getConfigurationOptions(token, callback));
      expect(options).toBeDefined();
    });

    it('should support relativeMove, continuousMove and stop with v0.x options', async () => {
      await expect(
        promisify<void>((callback) => cam.relativeMove({ x: 0.01, y: 0, zoom: 0 } as any, callback)),
      ).resolves.toBeUndefined();
      await expect(
        promisify<void>((callback) => cam.continuousMove({ x: 0, y: 0, zoom: 0 } as any, callback)),
      ).resolves.toBeUndefined();
      await expect(promisify<void>((callback) => cam.stop(callback))).resolves.toBeUndefined();
    });

    it('should pass zero continuousMove velocities (not treat 0 as missing)', async () => {
      const PTZ = (await import('../src/ptz')).default;
      const spy = jest.spyOn(PTZ.prototype, 'continuousMove').mockResolvedValue(undefined as never);

      await promisify<void>((callback) => cam.continuousMove({ x: 0, y: 0, zoom: 0 } as any, callback));

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          velocity: {
            panTilt: { x: 0, y: 0 },
            zoom: { x: 0 },
          },
        }),
      );
      spy.mockRestore();
    });

    it('should honor onlySendPanTilt / onlySendZoom with zero velocities', async () => {
      const PTZ = (await import('../src/ptz')).default;
      const spy = jest.spyOn(PTZ.prototype, 'continuousMove').mockResolvedValue(undefined as never);

      await promisify<void>((callback) =>
        cam.continuousMove({ x: 0, y: 0, zoom: 0, onlySendPanTilt: true } as any, callback),
      );
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          velocity: { panTilt: { x: 0, y: 0 } },
        }),
      );

      await promisify<void>((callback) =>
        cam.continuousMove({ x: 0, y: 0, zoom: 0, onlySendZoom: true } as any, callback),
      );
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          velocity: { zoom: { x: 0 } },
        }),
      );
      spy.mockRestore();
    });

    it('should support preset round-trip helpers', async () => {
      const presetName = `compat-goto-${Date.now()}`;
      const presetToken = await promisify<string>((callback) =>
        cam.setPreset({ presetName } as any, callback),
      );
      const presets = await promisify<Record<string, { name?: string; token?: string }>>((callback) =>
        cam.getPresets(callback),
      );
      expect(presets[presetToken]?.name).toBe(presetName);
      await expect(
        promisify<void>((callback) => cam.gotoPreset({ presetToken } as any, callback)),
      ).resolves.toBeUndefined();
      // v0.x alias: options.preset was sent as PresetToken
      await expect(
        promisify<void>((callback) => cam.gotoPreset({ preset: presetToken } as any, callback)),
      ).resolves.toBeUndefined();
      await expect(promisify<void>((callback) => cam.gotoHomePosition({} as any, callback))).resolves.toBeUndefined();
    });
  });

  describe('imaging', () => {
    beforeAll(() => {
      if (!cam.uri.imaging) {
        throw new Error('Imaging service is not available on the test device');
      }
    });

    it('should return imaging service capabilities', async () => {
      const caps = await promisify<any>((callback) => cam.getImagingServiceCapabilities(callback));
      expect(typeof caps).toBe('object');
    });

    it('should return imaging settings using v0.x token option', async () => {
      const settings = await promisify<any>((callback) => cam.getImagingSettings({ token: VIDEO_SOURCE_TOKEN }, callback));
      expect(settings).toHaveProperty('brightness');
      expect(settings).toHaveProperty('contrast');
      expect(settings).toHaveProperty('exposure');
      expect(settings).toHaveProperty('focus');
    });

    it('should return imaging options through getVideoSourceOptions alias', async () => {
      const options = await promisify<any>((callback) => cam.getVideoSourceOptions({ token: VIDEO_SOURCE_TOKEN }, callback));
      expect(options).toBeDefined();
    });

    it('should return imaging move options and status', async () => {
      const moveOptions = await promisify<any>((callback) =>
        cam.imagingGetMoveOptions({ token: VIDEO_SOURCE_TOKEN }, callback),
      );
      expect(moveOptions).toBeDefined();

      const status = await promisify<any>((callback) => cam.imagingGetStatus({ token: VIDEO_SOURCE_TOKEN }, callback));
      expect(status).toBeDefined();
    });

    it('should stop imaging focus movement', async () => {
      await expect(
        promisify<void>((callback) => cam.imagingStop({ token: VIDEO_SOURCE_TOKEN }, callback)),
      ).resolves.toBeUndefined();
    });
  });

  describe('events', () => {
    beforeAll(() => {
      if (!cam.uri.events) {
        throw new Error('Events service is not available on the test device');
      }
    });

    it('should return event properties and cache them', async () => {
      const properties = await promisify<any>((callback) => cam.getEventProperties(callback));
      expect(properties.topicNamespaceLocation).toBeDefined();
      expect(properties.topicSet).toBeDefined();
      expect(cam.events.properties).toEqual(properties);
    });

    it('should return event service capabilities', async () => {
      const caps = await promisify<any>((callback) => cam.getEventServiceCapabilities(callback));
      expect(caps.WSPullPointSupport).toBe(true);
    });

    it('should create a pull-point subscription and store it on cam.events', async () => {
      const subscription = await promisify<any>((callback) => cam.createPullPointSubscription(callback));
      expect(subscription.subscriptionReference?.address).toBeDefined();
      expect(cam.events.subscription).toEqual(subscription);
      expect(cam.events.terminationTime).toBeInstanceOf(Date);

      const messages = await promisify<any>((callback) =>
        cam.pullMessages({ timeout: 'PT1S', messageLimit: 1 }, callback),
      );
      expect(messages).toBeDefined();

      await promisify<any>((callback) => cam.renew({}, callback));
      await promisify<void>((callback) => cam.unsubscribe(callback));
    });

    it('should require a pull-point subscription before pullMessages', async () => {
      cam.events.subscription = undefined;
      await expect(
        promisify<any>((callback) => cam.pullMessages({ timeout: 'PT1S', messageLimit: 1 }, callback)),
      ).rejects.toThrow('You should create pull-point subscription first!');
    });
  });

  describe('recording and replay', () => {
    beforeAll(() => {
      if (!cam.uri.recording || !cam.uri.replay) {
        throw new Error('Recording or replay service is not available on the test device');
      }
    });

    it('should return recordings and cache recordingItems', async () => {
      const recordings = await promisify<any[]>((callback) => cam.getRecordings(callback));
      expect(recordings.length).toBeGreaterThan(0);
      expect(recordings[0]).toHaveProperty('recordingToken');
      expect(cam.recordingItems).toEqual(recordings);
    });

    it('should return recording jobs and cache jobItem', async () => {
      const jobs = await promisify<any[]>((callback) => cam.getRecordingJobs(callback));
      expect(Array.isArray(jobs)).toBe(true);
      expect(cam.jobItem).toEqual(jobs);
    });

    it('should return recording service capabilities', async () => {
      const caps = await promisify<any>((callback) => cam.getRecordingServiceCapabilities(callback));
      expect(typeof caps).toBe('object');
      expect(cam.searchCapabilities).toEqual(caps);
    });

    it('should return recording summary through search service', async () => {
      const summary = await promisify<any>((callback) => cam.getRecordingSummary(callback));
      expect(summary).toBeDefined();
      expect(cam.recordingSummary).toEqual(summary);
    });

    it('should return recording information using v0.x RecordingToken option', async () => {
      const information = await promisify<any>((callback) =>
        cam.getRecordingInformation({ RecordingToken: RECORDING_TOKEN }, callback),
      );
      expect(information).toBeDefined();
      expect(cam.summary).toEqual(information);
    });

    it('should return recording configuration using v0.x RecordingToken option', async () => {
      const configuration = await promisify<any>((callback) =>
        cam.getRecordingConfiguration({ RecordingToken: RECORDING_TOKEN }, callback),
      );
      expect(configuration).toBeDefined();
      expect(cam.recordingConfiguration).toEqual(configuration);
    });

    it('should return recording job state using v0.x JobToken option', async () => {
      const state = await promisify<any>((callback) => cam.getRecordingJobState({ JobToken: RECORDING_JOB_TOKEN }, callback));
      expect(state).toBeDefined();
      expect(cam.recordingJobState).toEqual(state);
    });

    it('should return replay URI using v0.x options', async () => {
      const uri = await promisify<string>((callback) =>
        cam.getReplayUri(
          {
            recordingToken: RECORDING_TOKEN,
            stream: 'RTP-Unicast',
            protocol: 'RTSP',
          },
          callback,
        ),
      );
      expect(typeof uri).toBe('string');
      expect(uri).toMatch(/^rtsp:\/\//);
    });

    it('should return recording options and job configuration', async () => {
      const options = await promisify<any>((callback) =>
        cam.getRecordingOptions({ RecordingToken: RECORDING_TOKEN }, callback),
      );
      expect(options).toBeDefined();
      expect(cam.recordingOptions).toEqual(options);

      const jobConfiguration = await promisify<any>((callback) =>
        cam.getRecordingJobConfiguration({ JobToken: RECORDING_JOB_TOKEN }, callback),
      );
      expect(jobConfiguration).toBeDefined();
    });
  });
});
