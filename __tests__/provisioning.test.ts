import { Onvif } from '../src';
import { happytimeOnvifOptions } from './happytime';

const VIDEO_SOURCE_TOKEN_1 = 'VideoSourceToken_1';

let cam: Onvif;

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

describe('Provisioning', () => {
  beforeAll(() => {
    if (!cam.uri.provisioning) {
      throw new Error('Provisioning service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return provisioning service capabilities as an object', async () => {
      const caps = await cam.provisioning.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.provisioning.getServiceCapabilities();
      expect(caps.defaultTimeout).toBe('PT60S');
      expect(caps.source?.length).toBeGreaterThanOrEqual(1);
      expect(caps.source?.[0].videoSourceToken).toBe(VIDEO_SOURCE_TOKEN_1);
      expect(caps.source?.[0].maximumPanMoves).toBe(60);
      expect(caps.source?.[0].autoLevel).toBe(true);
      expect(caps.source?.[0].autoFocus).toBe(true);
    });
  });

  describe('getUsage', () => {
    it('should return usage counters for a valid video source', async () => {
      const usage = await cam.provisioning.getUsage({ videoSource: VIDEO_SOURCE_TOKEN_1 });
      expect(usage).toBeDefined();
      expect(typeof usage).toBe('object');
      expect(Array.isArray(usage)).toBe(false);
    });

    it('should reject an invalid video source token', async () => {
      await expect(cam.provisioning.getUsage({ videoSource: 'InvalidToken' })).rejects.toThrow(
        'The requested VideoSource does not exist',
      );
    });
  });

  describe('move commands', () => {
    afterEach(async () => {
      await cam.provisioning.stop({ videoSource: VIDEO_SOURCE_TOKEN_1 });
    });

    it('should pan and stop', async () => {
      await expect(
        cam.provisioning.panMove({
          videoSource: VIDEO_SOURCE_TOKEN_1,
          direction: 'Left',
          timeout: 'PT1S',
        }),
      ).resolves.toBeUndefined();
      await expect(cam.provisioning.stop({ videoSource: VIDEO_SOURCE_TOKEN_1 })).resolves.toBeUndefined();
    });

    it('should tilt move', async () => {
      await expect(
        cam.provisioning.tiltMove({
          videoSource: VIDEO_SOURCE_TOKEN_1,
          direction: 'Up',
          timeout: 'PT1S',
        }),
      ).resolves.toBeUndefined();
    });

    it('should zoom move', async () => {
      await expect(
        cam.provisioning.zoomMove({
          videoSource: VIDEO_SOURCE_TOKEN_1,
          direction: 'Wide',
          timeout: 'PT1S',
        }),
      ).resolves.toBeUndefined();
    });

    it('should roll move', async () => {
      await expect(
        cam.provisioning.rollMove({
          videoSource: VIDEO_SOURCE_TOKEN_1,
          direction: 'Clockwise',
          timeout: 'PT1S',
        }),
      ).resolves.toBeUndefined();
    });

    it('should focus move', async () => {
      await expect(
        cam.provisioning.focusMove({
          videoSource: VIDEO_SOURCE_TOKEN_1,
          direction: 'Near',
          timeout: 'PT1S',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
