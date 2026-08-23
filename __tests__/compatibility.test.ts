import { Cam, Callback } from '../src/compatibility/cam';

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
      {
        hostname: '127.0.0.1',
        username: 'admin',
        password: 'admin',
        port: 8000,
      },
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
      expect(cam.activeSource).toBeDefined();
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

    it('should return users and cache them on the cam instance', async () => {
      const users = await promisify<any[]>((callback) => cam.getUsers(callback));
      expect(Array.isArray(users)).toBe(true);
      expect(users[0]).toHaveProperty('username');
      expect(cam.users).toEqual(users);
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
  });

  describe('ptz', () => {
    it('should return PTZ nodes', async () => {
      const nodes = await promisify<any[]>((callback) => cam.getNodes(callback));
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0]).toHaveProperty('token');
      expect(cam.nodes).toBeDefined();
    });

    it('should return presets as a name-to-token map', async () => {
      const presets = await promisify<Record<string, string>>((callback) => cam.getPresets(callback));
      expect(typeof presets).toBe('object');
      expect(Array.isArray(presets)).toBe(false);
      const names = Object.keys(presets);
      expect(names.length).toBeGreaterThan(0);
      expect(typeof presets[names[0]]).toBe('string');
      expect(cam.presets).toEqual(presets);
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
      await promisify<void>((callback) => cam.unsubscribe(callback));
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
  });
});
