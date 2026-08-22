import { Onvif } from '../src';
import { RecordingConfiguration } from '../src/interfaces/onvif';

const RECORDING_TOKEN = 'RecordingToken_1';
const RECORDING_JOB_TOKEN = 'RecordingJobToken_1';
const VIDEO_TRACK_TOKEN = 'VIDEO001';

let cam: Onvif;
let baselineConfiguration: RecordingConfiguration;

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
});

describe('Recording', () => {
  beforeAll(async () => {
    if (!cam.uri.recording) {
      throw new Error('Recording service is not available on the test device');
    }
    const recordings = await cam.recording.getRecordings();
    baselineConfiguration = await cam.recording.getRecordingConfiguration({
      recordingToken: recordings[0].recordingToken,
    });
  });

  describe('getServiceCapabilities', () => {
    it('should return recording service capabilities as an object', async () => {
      const caps = await cam.recording.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.recording.getServiceCapabilities();
      expect(caps.dynamicRecordings).toBe(true);
      expect(caps.dynamicTracks).toBe(true);
      expect(caps.options).toBe(true);
      expect(caps.metadataRecording).toBe(true);
      expect(caps.maxRecordings).toBe(5);
      expect(caps.maxRecordingJobs).toBe(5);
    });

    it('should expose optional capability flags with expected types when present', async () => {
      const caps = await cam.recording.getServiceCapabilities();
      const optionalFlags = [
        'dynamicRecordings',
        'dynamicTracks',
        'options',
        'metadataRecording',
        'eventRecording',
        'overrideSegmentDuration',
        'asymmetricEncryptionSupported',
      ] as const;
      optionalFlags.forEach((key) => {
        if (caps[key] !== undefined) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(typeof caps[key]).toBe('boolean');
        }
      });
    });
  });

  describe('getRecordings', () => {
    it('should return a list of recording items', async () => {
      const recordings = await cam.recording.getRecordings();
      expect(Array.isArray(recordings)).toBe(true);
      expect(recordings.length).toBeGreaterThan(0);
      recordings.forEach((item) => {
        expect(item).toHaveProperty('recordingToken');
        expect(item).toHaveProperty('configuration');
        expect(item).toHaveProperty('tracks');
      });
    });

    it('should include track entries for each recording', async () => {
      const recordings = await cam.recording.getRecordings();
      const [recording] = recordings;
      const tracks = (Array.isArray(recording.tracks.track)
        ? recording.tracks.track
        : [recording.tracks.track]
      ).filter((track): track is NonNullable<typeof track> => track !== undefined);
      expect(tracks.length).toBeGreaterThan(0);
      tracks.forEach((track) => {
        expect(track).toHaveProperty('trackToken');
        expect(track).toHaveProperty('configuration');
        expect(track.configuration).toHaveProperty('trackType');
      });
    });
  });

  describe('getRecordingConfiguration / setRecordingConfiguration', () => {
    afterEach(async () => {
      await cam.recording.setRecordingConfiguration({
        recordingToken: RECORDING_TOKEN,
        recordingConfiguration: baselineConfiguration,
      });
    });

    it('should return the recording configuration for an existing recording', async () => {
      const configuration = await cam.recording.getRecordingConfiguration({
        recordingToken: RECORDING_TOKEN,
      });
      expect(configuration).toBeDefined();
      expect(configuration).toHaveProperty('source');
      expect(configuration).toHaveProperty('content');
      expect(configuration).toHaveProperty('maximumRetentionTime');
      expect(configuration.source).toHaveProperty('sourceId');
    });

    it('should update and read back recording configuration', async () => {
      await cam.recording.setRecordingConfiguration({
        recordingToken: RECORDING_TOKEN,
        recordingConfiguration: { ...baselineConfiguration, content: 'jest_recording_test' },
      });
      const configuration = await cam.recording.getRecordingConfiguration({
        recordingToken: RECORDING_TOKEN,
      });
      expect(configuration.content).toBe('jest_recording_test');
    });

    it('should throw when the requested recording token does not exist', async () => {
      await expect(
        cam.recording.getRecordingConfiguration({ recordingToken: '???' }),
      ).rejects.toThrow('The RecordingToken does not reference an existing recording');
    });
  });

  describe('getRecordingOptions', () => {
    it('should return recording options for an existing recording', async () => {
      const options = await cam.recording.getRecordingOptions({ recordingToken: RECORDING_TOKEN });
      expect(options).toBeDefined();
      expect(options.job).toBeDefined();
      expect(options.track).toBeDefined();
      expect(options.job).toHaveProperty('spare');
      expect(options.track).toHaveProperty('spareTotal');
    });
  });

  describe('getTrackConfiguration', () => {
    it('should return track configuration for an existing track', async () => {
      const configuration = await cam.recording.getTrackConfiguration({
        recordingToken: RECORDING_TOKEN,
        trackToken: VIDEO_TRACK_TOKEN,
      });
      expect(configuration).toBeDefined();
      expect(configuration.trackType).toBe('Video');
    });
  });

  describe('getRecordingJobs / getRecordingJobConfiguration / setRecordingJobMode / getRecordingJobState', () => {
    afterEach(async () => {
      await cam.recording.setRecordingJobMode({ jobToken: RECORDING_JOB_TOKEN, mode: 'Active' });
    });

    it('should return a list of recording jobs', async () => {
      const jobs = await cam.recording.getRecordingJobs();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      jobs.forEach((job) => {
        expect(job).toHaveProperty('jobToken');
        expect(job).toHaveProperty('jobConfiguration');
        expect(job.jobConfiguration).toHaveProperty('recordingToken');
        expect(job.jobConfiguration).toHaveProperty('mode');
      });
    });

    it('should return the recording job configuration for an existing job', async () => {
      const jobConfiguration = await cam.recording.getRecordingJobConfiguration({
        jobToken: RECORDING_JOB_TOKEN,
      });
      expect(jobConfiguration).toBeDefined();
      expect(jobConfiguration.recordingToken).toBe(RECORDING_TOKEN);
      expect(jobConfiguration.mode).toBe('Active');
    });

    it('should change and read back recording job mode', async () => {
      await cam.recording.setRecordingJobMode({ jobToken: RECORDING_JOB_TOKEN, mode: 'Idle' });
      const jobConfiguration = await cam.recording.getRecordingJobConfiguration({
        jobToken: RECORDING_JOB_TOKEN,
      });
      expect(jobConfiguration.mode).toBe('Idle');
    });

    it('should return recording job state for an existing job', async () => {
      const state = await cam.recording.getRecordingJobState({ jobToken: RECORDING_JOB_TOKEN });
      expect(state).toBeDefined();
      expect(state).toHaveProperty('recordingToken');
      expect(state).toHaveProperty('state');
    });

    it('should throw when the requested job token does not exist', async () => {
      await expect(
        cam.recording.getRecordingJobConfiguration({ jobToken: '???' }),
      ).rejects.toThrow('The JobToken does not reference an existing job');
    });
  });
});
