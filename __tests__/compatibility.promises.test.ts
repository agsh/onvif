import { Cam, promisifiedMethods } from '../src/compatibility/promises';
import { Cam as CallbackCam } from '../src/compatibility/cam';
import happytimeOnvifOptions from './happytime.json';

const RECORDING_TOKEN = 'RecordingToken_1';
const RECORDING_JOB_TOKEN = 'RecordingJobToken_1';
const VIDEO_SOURCE_TOKEN = 'VideoSourceToken_1';

let cam: any;

beforeAll(async () => {
  cam = new Cam(happytimeOnvifOptions);
  await cam.connect();
});

describe('Compatibility Cam promises', () => {
  describe('promisify wrapper', () => {
    it('should not auto-connect in constructor', () => {
      const pendingCam = new Cam(happytimeOnvifOptions);
      expect(pendingCam._cam.uri.media).toBeUndefined();
    });

    it('should expose underlying callback cam as _cam', () => {
      expect(cam._cam).toBeInstanceOf(CallbackCam);
    });

    it('should promisify own Cam prototype methods', () => {
      expect(promisifiedMethods).toContain('connect');
      expect(promisifiedMethods).toContain('getStreamUri');
      expect(promisifiedMethods).not.toContain('constructor');
    });

    it('should forward EventEmitter methods without promisification', () => {
      const handler = jest.fn();
      cam.on('promisify', handler);
      cam.getProfiles();
      expect(handler).toHaveBeenCalledWith('getProfiles');
      cam.removeListener('promisify', handler);
    });

    it('should forward property getters to _cam', () => {
      expect(cam.username).toBe('admin');
      expect(cam.password).toBe('admin');
      expect(cam.port).toBe(8000);
      expect(cam.profiles).toEqual(cam._cam.profiles);
    });
  });

  describe('connection properties', () => {
    it('should expose startup properties like v0.x after connect', () => {
      expect(cam.uri.media?.href).toBeDefined();
      expect(cam.videoSources.length).toBeGreaterThan(0);
      expect(cam.profiles.length).toBeGreaterThan(0);
      expect(cam.defaultProfile).toBeDefined();
      expect(cam.activeSource).toBeDefined();
    });

    it('should populate deviceInformation after getDeviceInformation', async () => {
      const info = await cam.getDeviceInformation();
      expect(info.manufacturer).toBeDefined();
      expect(cam.deviceInformation).toEqual(info);
    });

    it('should return services through promise API', async () => {
      const services = await cam.getServices(false);
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      expect(cam.services.length).toBeGreaterThan(0);
    });
  });

  describe('device', () => {
    it('should return and cache scopes', async () => {
      const scopes = await cam.getScopes();
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
      expect(cam.scopes).toEqual(scopes);
    });

    it('should return hostname', async () => {
      const hostname = await cam.getHostname();
      expect(hostname.name).toBeDefined();
      expect(typeof hostname.fromDHCP).toBe('boolean');
    });

    it('should return capabilities with service URIs', async () => {
      const caps = await cam.getCapabilities();
      expect(caps.media?.XAddr).toBeDefined();
      expect(caps.device?.XAddr).toBeDefined();
      expect(cam.uri.media).toBeDefined();
    });

    it('should return NTP settings', async () => {
      const ntp = await cam.getNTP();
      expect(ntp).toBeDefined();
      expect(cam.NTP).toEqual(ntp);
    });

    it('should return DNS settings', async () => {
      const dns = await cam.getDNS();
      expect(dns).toBeDefined();
      expect(cam.DNS).toEqual(dns);
    });

    it('should return network interfaces', async () => {
      const interfaces = await cam.getNetworkInterfaces();
      expect(Array.isArray(interfaces)).toBe(true);
      expect(interfaces.length).toBeGreaterThan(0);
      expect(cam.networkInterfaces).toEqual(interfaces);
    });

    it('should return users and cache them on the cam instance', async () => {
      const users = await cam.getUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users[0]).toHaveProperty('username');
      expect(cam.users).toEqual(users);
    });
  });

  describe('media', () => {
    it('should return media profiles', async () => {
      const profiles = await cam.getProfiles();
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles[0]).toHaveProperty('token');
      expect(profiles[0]).toHaveProperty('name');
      expect(profiles[0]).toHaveProperty('videoSourceConfiguration');
      expect(cam.profiles).toEqual(profiles);
    });

    it('should return video sources', async () => {
      const sources = await cam.getVideoSources();
      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0]).toHaveProperty('token');
    });

    it('should return stream and snapshot URIs', async () => {
      const stream = await cam.getStreamUri();
      expect(stream.uri).toMatch(/^rtsp:\/\//);

      const snapshot = await cam.getSnapshotUri();
      expect(snapshot.uri).toMatch(/^http/);
    });

    it('should accept protocol option for getStreamUri', async () => {
      const stream = await cam.getStreamUri({ protocol: 'RTSP' });
      expect(stream.uri).toMatch(/^rtsp:\/\//);
    });

    it('should return media service capabilities', async () => {
      const caps = await cam.getMediaServiceCapabilities();
      expect(typeof caps).toBe('object');
      expect(cam.mediaCapabilities).toEqual(caps);
    });

    it('should return encoder configurations and cache them', async () => {
      const configs = await cam.getVideoEncoderConfigurations();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
      expect(cam.videoEncoderConfigurations).toEqual(configs);
    });
  });

  describe('ptz', () => {
    it('should return PTZ nodes', async () => {
      const nodes = await cam.getNodes();
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0]).toHaveProperty('token');
      expect(cam.nodes).toBeDefined();
    });

    it('should return presets keyed by token (v0.8.1+)', async () => {
      const presetName = `compat-promises-map-${Date.now()}`;
      const presetToken = await cam.setPreset({ presetName } as any);
      expect(typeof presetToken).toBe('string');

      const presets = await cam.getPresets();
      expect(typeof presets).toBe('object');
      expect(Array.isArray(presets)).toBe(false);
      expect(presets[presetToken]).toBeDefined();
      expect(presets[presetToken].name).toBe(presetName);
      expect(presets[presetToken].token).toBe(presetToken);
      expect(cam.presets[presetToken]?.name).toBe(presetName);
    });

    it('should return PTZ status', async () => {
      const status = await cam.getStatus();
      expect(status).toHaveProperty('position');
    });

    it('should accept v0.x x/y/zoom options for absoluteMove', async () => {
      await expect(cam.absoluteMove({ x: 0, y: 0, zoom: 0 } as any)).resolves.toBeUndefined();
    });
  });

  describe('imaging', () => {
    beforeAll(() => {
      if (!cam.uri.imaging) {
        throw new Error('Imaging service is not available on the test device');
      }
    });

    it('should return imaging service capabilities', async () => {
      const caps = await cam.getImagingServiceCapabilities();
      expect(typeof caps).toBe('object');
    });

    it('should return imaging settings using v0.x token option', async () => {
      const settings = await cam.getImagingSettings({ token: VIDEO_SOURCE_TOKEN });
      expect(settings).toHaveProperty('brightness');
      expect(settings).toHaveProperty('contrast');
      expect(settings).toHaveProperty('exposure');
      expect(settings).toHaveProperty('focus');
    });

    it('should return imaging options through getVideoSourceOptions alias', async () => {
      const options = await cam.getVideoSourceOptions({ token: VIDEO_SOURCE_TOKEN });
      expect(options).toBeDefined();
    });
  });

  describe('events', () => {
    beforeAll(() => {
      if (!cam.uri.events) {
        throw new Error('Events service is not available on the test device');
      }
    });

    it('should return event properties and cache them', async () => {
      const properties = await cam.getEventProperties();
      expect(properties.topicNamespaceLocation).toBeDefined();
      expect(properties.topicSet).toBeDefined();
      expect(cam.events.properties).toEqual(properties);
    });

    it('should return event service capabilities', async () => {
      const caps = await cam.getEventServiceCapabilities();
      expect(caps.WSPullPointSupport).toBe(true);
    });

    it('should create a pull-point subscription and store it on cam.events', async () => {
      const subscription = await cam.createPullPointSubscription();
      expect(subscription.subscriptionReference?.address).toBeDefined();
      expect(cam.events.subscription).toEqual(subscription);
      expect(cam.events.terminationTime).toBeInstanceOf(Date);
      await cam.unsubscribe();
    });
  });

  describe('recording and replay', () => {
    beforeAll(() => {
      if (!cam.uri.recording || !cam.uri.replay) {
        throw new Error('Recording or replay service is not available on the test device');
      }
    });

    it('should return recordings and cache recordingItems', async () => {
      const recordings = await cam.getRecordings();
      expect(recordings.length).toBeGreaterThan(0);
      expect(recordings[0]).toHaveProperty('recordingToken');
      expect(cam.recordingItems).toEqual(recordings);
    });

    it('should return recording jobs and cache jobItem', async () => {
      const jobs = await cam.getRecordingJobs();
      expect(Array.isArray(jobs)).toBe(true);
      expect(cam.jobItem).toEqual(jobs);
    });

    it('should return recording service capabilities', async () => {
      const caps = await cam.getRecordingServiceCapabilities();
      expect(typeof caps).toBe('object');
      expect(cam.searchCapabilities).toEqual(caps);
    });

    it('should return recording summary through search service', async () => {
      const summary = await cam.getRecordingSummary();
      expect(summary).toBeDefined();
      expect(cam.recordingSummary).toEqual(summary);
    });

    it('should return recording information using v0.x RecordingToken option', async () => {
      const information = await cam.getRecordingInformation({ RecordingToken: RECORDING_TOKEN });
      expect(information).toBeDefined();
      expect(cam.summary).toEqual(information);
    });

    it('should return recording configuration using v0.x RecordingToken option', async () => {
      const configuration = await cam.getRecordingConfiguration({ RecordingToken: RECORDING_TOKEN });
      expect(configuration).toBeDefined();
      expect(cam.recordingConfiguration).toEqual(configuration);
    });

    it('should return recording job state using v0.x JobToken option', async () => {
      const state = await cam.getRecordingJobState({ JobToken: RECORDING_JOB_TOKEN });
      expect(state).toBeDefined();
      expect(cam.recordingJobState).toEqual(state);
    });

    it('should return replay URI using v0.x options', async () => {
      const uri = await cam.getReplayUri({
        recordingToken: RECORDING_TOKEN,
        stream: 'RTP-Unicast',
        protocol: 'RTSP',
      });
      expect(typeof uri).toBe('string');
      expect(uri).toMatch(/^rtsp:\/\//);
    });
  });
});
