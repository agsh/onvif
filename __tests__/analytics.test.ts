import { Onvif } from '../src';
import { Config } from '../src/interfaces/onvif';

const CONFIGURATION_TOKEN = 'VideoAnalyticsConfigurationToken_1';

let cam: Onvif;
let baselineRules: Config[];

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
  baselineRules = await cam.analytics.getRules({ configurationToken: CONFIGURATION_TOKEN });
});

describe('Analytics', () => {
  beforeAll(() => {
    if (!cam.uri.analytics) {
      throw new Error('Analytics service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return analytics service capabilities as an object', async () => {
      const caps = await cam.analytics.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.analytics.getServiceCapabilities();
      expect(caps.ruleSupport).toBe(true);
      expect(caps.analyticsModuleSupport).toBe(true);
      expect(caps.ruleOptionsSupported).toBe(true);
      expect(caps.analyticsModuleOptionsSupported).toBe(true);
      expect(caps.supportedMetadata).toBe(true);
    });
  });

  describe('getSupportedRules / getRules', () => {
    it('should return supported rule descriptions', async () => {
      const supported = await cam.analytics.getSupportedRules({ configurationToken: CONFIGURATION_TOKEN });
      expect(supported.ruleDescription?.length).toBeGreaterThanOrEqual(1);
    });

    it('should return configured rules from the mock server', async () => {
      const rules = await cam.analytics.getRules({ configurationToken: CONFIGURATION_TOKEN });
      expect(rules.length).toBeGreaterThanOrEqual(2);
      expect(rules.map((rule) => rule.name)).toEqual(
        expect.arrayContaining(['MyCellMotionDetector', 'TamperingDetection']),
      );
    });

    it('should reject an invalid configuration token', async () => {
      await expect(cam.analytics.getRules({ configurationToken: '???' })).rejects.toThrow();
    });
  });

  describe('getSupportedAnalyticsModules / getAnalyticsModules', () => {
    it('should return supported analytics module descriptions', async () => {
      const supported = await cam.analytics.getSupportedAnalyticsModules({
        configurationToken: CONFIGURATION_TOKEN,
      });
      expect(supported.analyticsModuleDescription?.length).toBeGreaterThanOrEqual(1);
    });

    it('should return configured analytics modules from the mock server', async () => {
      const modules = await cam.analytics.getAnalyticsModules({ configurationToken: CONFIGURATION_TOKEN });
      expect(modules.length).toBeGreaterThanOrEqual(2);
      expect(modules.map((module) => module.name)).toEqual(
        expect.arrayContaining(['MyCellMotionEngine', 'MyMotionRegionDetector']),
      );
    });
  });

  describe('getRuleOptions / getAnalyticsModuleOptions', () => {
    it('should return rule options for a configuration', async () => {
      const options = await cam.analytics.getRuleOptions({ configurationToken: CONFIGURATION_TOKEN });
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveProperty('name');
    });

    it('should return analytics module options for a configuration', async () => {
      const options = await cam.analytics.getAnalyticsModuleOptions({ configurationToken: CONFIGURATION_TOKEN });
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveProperty('name');
    });
  });

  describe('getSupportedMetadata', () => {
    it('should return supported metadata samples', async () => {
      const response = await cam.analytics.getSupportedMetadata();
      expect(response.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('modifyRules', () => {
    afterEach(async () => {
      await cam.analytics.modifyRules({
        configurationToken: CONFIGURATION_TOKEN,
        rule: baselineRules,
      });
    });

    it('should modify and restore a rule parameter', async () => {
      const rules = await cam.analytics.getRules({ configurationToken: CONFIGURATION_TOKEN });
      const rule = rules.find((item) => item.name === 'MyCellMotionDetector');
      expect(rule).toBeDefined();

      const modified = structuredClone(rule!);
      const minCount = modified.parameters.simpleItem?.find((item) => item.name === 'MinCount');
      expect(minCount).toBeDefined();
      const newValue = String(minCount!.value) === '5' ? '6' : '5';
      minCount!.value = newValue;

      await cam.analytics.modifyRules({
        configurationToken: CONFIGURATION_TOKEN,
        rule: [modified],
      });

      const updated = await cam.analytics.getRules({ configurationToken: CONFIGURATION_TOKEN });
      const updatedRule = updated.find((item) => item.name === 'MyCellMotionDetector');
      expect(String(updatedRule?.parameters.simpleItem?.find((item) => item.name === 'MinCount')?.value)).toBe(
        newValue,
      );
    });
  });
});
