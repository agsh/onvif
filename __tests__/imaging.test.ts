import { Onvif } from '../src';
import { ImagingSettings20 } from '../src/interfaces/onvif';

const VIDEO_SOURCE_TOKEN = 'VideoSourceToken_1';

let cam: Onvif;
let baselineSettings: ImagingSettings20;

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
  baselineSettings = await cam.imaging.getImagingSettings();
});

describe('Imaging', () => {
  beforeAll(() => {
    if (!cam.uri.imaging) {
      throw new Error('Imaging service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return imaging service capabilities as an object', async () => {
      const caps = await cam.imaging.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.imaging.getServiceCapabilities();
      expect(caps.imageStabilization).toBe(false);
      expect(caps.presets).toBe(true);
      expect(caps.adaptablePreset).toBe(true);
    });

    it('should expose optional capability flags as booleans when present', async () => {
      const caps = await cam.imaging.getServiceCapabilities();
      const optionalFlags = ['imageStabilization', 'presets', 'adaptablePreset'] as const;
      optionalFlags.forEach((key) => {
        if (caps[key] !== undefined) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(typeof caps[key]).toBe('boolean');
        }
      });
    });
  });

  describe('getImagingSettings', () => {
    it('should return imaging settings for the active video source', async () => {
      const settings = await cam.imaging.getImagingSettings();
      expect(settings).toBeDefined();
      expect(settings).toHaveProperty('brightness');
      expect(settings).toHaveProperty('contrast');
      expect(settings).toHaveProperty('exposure');
      expect(settings).toHaveProperty('focus');
      expect(settings.exposure).toHaveProperty('mode');
      expect(settings.focus).toHaveProperty('autoFocusMode');
    });

    it('should default video source token from activeSource when omitted', async () => {
      const explicit = await cam.imaging.getImagingSettings({ videoSourceToken: VIDEO_SOURCE_TOKEN });
      const defaulted = await cam.imaging.getImagingSettings();
      expect(defaulted).toEqual(explicit);
    });

    it('should throw when the requested video source token does not exist', async () => {
      await expect(cam.imaging.getImagingSettings({ videoSourceToken: '???' })).rejects.toThrow(
        'The requested VideoSource does not exist',
      );
    });
  });

  describe('setImagingSettings', () => {
    afterEach(async () => {
      await cam.imaging.setImagingSettings({
        imagingSettings: baselineSettings,
        forcePersistence: true,
      });
    });

    it('should update and read back imaging settings', async () => {
      const updatedBrightness = (baselineSettings.brightness ?? 50) === 51 ? 52 : 51;
      await cam.imaging.setImagingSettings({
        imagingSettings: { ...baselineSettings, brightness: updatedBrightness },
        forcePersistence: true,
      });
      const settings = await cam.imaging.getImagingSettings();
      expect(settings.brightness).toBe(updatedBrightness);
    });

    it('should default video source token from activeSource when omitted', async () => {
      await expect(
        cam.imaging.setImagingSettings({
          imagingSettings: baselineSettings,
          forcePersistence: true,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getOptions', () => {
    it('should return imaging parameter ranges for the active video source', async () => {
      const options = await cam.imaging.getOptions();
      expect(options).toBeDefined();
      expect(options.brightness).toBeDefined();
      expect(options.brightness).toHaveProperty('min');
      expect(options.brightness).toHaveProperty('max');
      expect(options.exposure).toBeDefined();
      expect(options.focus).toBeDefined();
    });

    it('should default video source token from activeSource when omitted', async () => {
      const explicit = await cam.imaging.getOptions({ videoSourceToken: VIDEO_SOURCE_TOKEN });
      const defaulted = await cam.imaging.getOptions();
      expect(defaulted).toEqual(explicit);
    });
  });

  describe('getMoveOptions / move / stop / getStatus', () => {
    it('should return focus move options for the active video source', async () => {
      const moveOptions = await cam.imaging.getMoveOptions();
      expect(moveOptions).toBeDefined();
      expect(moveOptions.continuous).toBeDefined();
      expect(moveOptions.continuous!.speed).toHaveProperty('min');
      expect(moveOptions.continuous!.speed).toHaveProperty('max');
    });

    it('should perform continuous focus move and stop it', async () => {
      const moveOptions = await cam.imaging.getMoveOptions();
      const speedMin = moveOptions.continuous!.speed.min;
      const speedMax = moveOptions.continuous!.speed.max;
      const speed = Math.min(speedMax, Math.max(speedMin, (speedMin + speedMax) / 2));

      await expect(cam.imaging.move({ focus: { continuous: { speed } } })).resolves.toBeUndefined();
      await expect(cam.imaging.stop()).resolves.toBeUndefined();

      const status = await cam.imaging.getStatus();
      expect(status).toBeDefined();
      expect(status.focusStatus20).toBeDefined();
      expect(status.focusStatus20!.moveStatus).toBeDefined();
    });

    it('should default video source token from activeSource when omitted', async () => {
      const explicit = await cam.imaging.getStatus({ videoSourceToken: VIDEO_SOURCE_TOKEN });
      const defaulted = await cam.imaging.getStatus();
      expect(defaulted).toEqual(explicit);
    });
  });

  describe('getPresets / getCurrentPreset', () => {
    it('should return an array of imaging presets for the active video source', async () => {
      const presets = await cam.imaging.getPresets();
      expect(Array.isArray(presets)).toBe(true);
      presets.forEach((preset) => {
        expect(preset).toHaveProperty('token');
        expect(preset).toHaveProperty('type');
        expect(preset).toHaveProperty('name');
      });
    });
  });
});
