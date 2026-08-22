import { Onvif } from '../src';

const RECORDING_TOKEN = 'RecordingToken_1';
const DEFAULT_SESSION_TIMEOUT = 'PT60S';

let cam: Onvif;

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
});

describe('Replay', () => {
  beforeAll(() => {
    if (!cam.uri.replay) {
      throw new Error('Replay service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return replay service capabilities as an object', async () => {
      const caps = await cam.replay.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.replay.getServiceCapabilities();
      expect(caps.reversePlayback).toBe(false);
      expect(caps.RTP_RTSP_TCP).toBe(true);
      expect(caps.sessionTimeoutRange).toBe('10.0 100.0');
    });

    it('should expose optional capability flags with expected types when present', async () => {
      const caps = await cam.replay.getServiceCapabilities();
      expect(typeof caps.reversePlayback).toBe('boolean');
      expect(typeof caps.RTP_RTSP_TCP).toBe('boolean');
      expect(['string', 'object']).toContain(typeof caps.sessionTimeoutRange);
    });
  });

  describe('getReplayConfiguration / setReplayConfiguration', () => {
    afterEach(async () => {
      await cam.replay.setReplayConfiguration({
        configuration: { sessionTimeout: DEFAULT_SESSION_TIMEOUT },
      });
    });

    it('should return the current replay configuration', async () => {
      const configuration = await cam.replay.getReplayConfiguration();
      expect(configuration).toBeDefined();
      expect(configuration.sessionTimeout).toBe(DEFAULT_SESSION_TIMEOUT);
    });

    it('should update and read back replay configuration', async () => {
      await cam.replay.setReplayConfiguration({
        configuration: { sessionTimeout: 'PT90S' },
      });
      const configuration = await cam.replay.getReplayConfiguration();
      expect(configuration.sessionTimeout).toBe('PT90S');
    });
  });

  describe('getReplayUri', () => {
    it('should return an RTSP replay URI for an existing recording', async () => {
      const uri = await cam.replay.getReplayUri({ recordingToken: RECORDING_TOKEN });
      expect(typeof uri).toBe('string');
      expect(uri).toMatch(/^rtsp:\/\//);
    });

    it('should accept an explicit streamSetup', async () => {
      const uri = await cam.replay.getReplayUri({
        recordingToken: RECORDING_TOKEN,
        streamSetup: {
          stream: 'RTP-Unicast',
          transport: { protocol: 'RTSP' },
        },
      });
      expect(uri).toMatch(/^rtsp:\/\//);
    });

    it('should default stream and protocol when streamSetup is omitted', async () => {
      const explicit = await cam.replay.getReplayUri({
        recordingToken: RECORDING_TOKEN,
        stream: 'RTP-Unicast',
        protocol: 'RTSP',
      });
      const defaulted = await cam.replay.getReplayUri({ recordingToken: RECORDING_TOKEN });
      expect(defaulted).toBe(explicit);
    });

    it('should throw when the requested recording token does not exist', async () => {
      await expect(cam.replay.getReplayUri({ recordingToken: '???' })).rejects.toThrow(
        'The RecordingToken does not reference an existing recording',
      );
    });
  });
});
