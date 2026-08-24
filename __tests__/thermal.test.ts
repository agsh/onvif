import { Onvif } from '../src';
import { Configuration, RadiometryConfiguration } from '../src/interfaces/thermal';
import { happytimeOnvifOptions } from './happytime';

const VIDEO_SOURCE_TOKEN = 'VideoSourceToken_1';

let cam: Onvif;
let baselineConfiguration: Configuration;
let baselineRadiometry: RadiometryConfiguration;

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
  baselineConfiguration = await cam.thermal.getConfiguration({
    videoSourceToken: VIDEO_SOURCE_TOKEN,
  });
  baselineRadiometry = await cam.thermal.getRadiometryConfiguration({
    videoSourceToken: VIDEO_SOURCE_TOKEN,
  });
});

describe('Thermal', () => {
  beforeAll(() => {
    if (!cam.uri.thermal) {
      throw new Error('Thermal service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return thermal service capabilities as an object', async () => {
      const caps = await cam.thermal.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return radiometry capability from the happytime mock server', async () => {
      const caps = await cam.thermal.getServiceCapabilities();
      expect(caps.radiometry).toBe(true);
    });
  });

  describe('getConfigurations / getConfiguration', () => {
    it('should return thermal configurations for all video sources', async () => {
      const list = await cam.thermal.getConfigurations();
      expect(list.configurations?.length).toBeGreaterThanOrEqual(1);
      expect(list.configurations?.[0]).toHaveProperty('token');
      expect(list.configurations?.[0]).toHaveProperty('configuration');
      expect(list.configurations?.[0].token).toBe(VIDEO_SOURCE_TOKEN);
    });

    it('should return thermal configuration for a video source', async () => {
      const configuration = await cam.thermal.getConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      expect(configuration.polarity).toBe('WhiteHot');
      expect(configuration.colorPalette).toMatchObject({
        token: 'ColorPaletteToken_1',
        type: 'WhiteHot',
        name: 'ColorPaletteName_1',
      });
      expect(configuration.NUCTable).toMatchObject({
        token: 'NUCTableToken_1',
      });
      expect(typeof configuration.NUCTable?.name).toBe('string');
      expect(configuration.cooler).toMatchObject({
        enabled: true,
      });
    });

    it('should reject an invalid video source token', async () => {
      await expect(
        cam.thermal.getConfiguration({ videoSourceToken: 'InvalidToken' }),
      ).rejects.toThrow();
    });
  });

  describe('getConfigurationOptions', () => {
    it('should return color palettes and NUC tables as arrays', async () => {
      const options = await cam.thermal.getConfigurationOptions({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      expect(options.colorPalette?.length).toBeGreaterThanOrEqual(2);
      expect(options.NUCTable?.length).toBeGreaterThanOrEqual(2);
      expect(options.colorPalette?.[0]).toHaveProperty('token');
      expect(options.colorPalette?.[0]).toHaveProperty('type');
      expect(options.colorPalette?.[0]).toHaveProperty('name');
      expect(options.coolerOptions?.enabled).toBe(true);
    });
  });

  describe('setConfiguration', () => {
    afterEach(async () => {
      await cam.thermal.setConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
        configuration: baselineConfiguration,
      });
    });

    it('should update and read back polarity', async () => {
      const nextPolarity = baselineConfiguration.polarity === 'WhiteHot' ? 'BlackHot' : 'WhiteHot';
      await cam.thermal.setConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
        configuration: {
          ...baselineConfiguration,
          polarity: nextPolarity,
        },
      });
      const configuration = await cam.thermal.getConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      expect(configuration.polarity).toBe(nextPolarity);
    });

    it('should update color palette from available options', async () => {
      const options = await cam.thermal.getConfigurationOptions({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      const nextPalette =
        options.colorPalette?.find((palette) => palette.token !== baselineConfiguration.colorPalette.token) ??
        options.colorPalette![0];

      await cam.thermal.setConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
        configuration: {
          ...baselineConfiguration,
          colorPalette: nextPalette,
        },
      });

      const configuration = await cam.thermal.getConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      expect(configuration.colorPalette.token).toBe(nextPalette.token);
    });
  });

  describe('getRadiometryConfiguration / getRadiometryConfigurationOptions', () => {
    it('should return radiometry configuration for a video source', async () => {
      const configuration = await cam.thermal.getRadiometryConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      expect(configuration.radiometryGlobalParameters).toBeDefined();
      expect(configuration.radiometryGlobalParameters).toHaveProperty('reflectedAmbientTemperature');
      expect(configuration.radiometryGlobalParameters).toHaveProperty('emissivity');
      expect(configuration.radiometryGlobalParameters).toHaveProperty('distanceToObject');
    });

    it('should return radiometry parameter ranges', async () => {
      const options = await cam.thermal.getRadiometryConfigurationOptions({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      const ranges = options.radiometryGlobalParameterOptions!;
      expect(ranges.reflectedAmbientTemperature).toHaveProperty('min');
      expect(ranges.reflectedAmbientTemperature).toHaveProperty('max');
      expect(ranges.emissivity).toHaveProperty('min');
      expect(ranges.emissivity).toHaveProperty('max');
      expect(ranges.distanceToObject).toHaveProperty('min');
      expect(ranges.distanceToObject).toHaveProperty('max');
    });
  });

  describe('setRadiometryConfiguration', () => {
    afterEach(async () => {
      await cam.thermal.setRadiometryConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
        configuration: baselineRadiometry,
      });
    });

    it('should update and read back radiometry global parameters', async () => {
      const nextEmissivity =
        baselineRadiometry.radiometryGlobalParameters!.emissivity === 0.95 ? 0.9 : 0.95;

      await cam.thermal.setRadiometryConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
        configuration: {
          radiometryGlobalParameters: {
            ...baselineRadiometry.radiometryGlobalParameters!,
            emissivity: nextEmissivity,
          },
        },
      });

      const configuration = await cam.thermal.getRadiometryConfiguration({
        videoSourceToken: VIDEO_SOURCE_TOKEN,
      });
      expect(configuration.radiometryGlobalParameters!.emissivity).toBe(nextEmissivity);
    });
  });
});
