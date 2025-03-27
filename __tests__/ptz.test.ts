import { Onvif } from '../src';

let cam: Onvif;
beforeAll(async () => {
  cam = new Onvif({
    hostname : 'localhost',
    username : 'admin',
    password : 'admin',
    port     : 8000,
  });
  await cam.connect();
});

describe('Nodes', () => {
  describe('getNodesExtended', () => {
    it('should return an object of nodes and sets them to #nodes', async () => {
      const result = await cam.ptz.getNodesExtended();
      Object.values(result).forEach((node) => {
        expect(node).toHaveProperty('token');
        expect(node).toHaveProperty('fixedHomePosition');
        expect(node).toHaveProperty('geoMove');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('supportedPTZSpaces');
        expect(node).toHaveProperty('maximumNumberOfPresets');
        expect(node).toHaveProperty('homeSupported');
        expect(node).toHaveProperty('auxiliaryCommands');
      });
    });
  });

  it('should return nodes as a property', () => {
    const result = cam.ptz.nodes;
    Object.values(result).forEach((node) => {
      expect(node).toHaveProperty('token');
      expect(node).toHaveProperty('name');
    });
  });

  describe('getNodes', () => {
    it('should return a list of nodes', async () => {
      const result = await cam.ptz.getNodes();
      expect(result).toBeInstanceOf(Array);
      result.forEach((node) => {
        expect(node).toHaveProperty('token');
        expect(node).toHaveProperty('name');
      });
    });
  });
});

describe('Configurations and configuration options', () => {
  describe('getConfigurationExtended', () => {
    it('should return an object of configurations and sets them to #configurations', async () => {
      const result = await cam.ptz.getConfigurationsExtended();
      Object.values(result).forEach((configuration) => {
        expect(configuration).toHaveProperty('moveRamp');
        expect(configuration).toHaveProperty('presetRamp');
        expect(configuration).toHaveProperty('presetTourRamp');
        expect(configuration).toHaveProperty('nodeToken');
        expect(configuration).toHaveProperty('defaultAbsolutePantTiltPositionSpace');
        expect(configuration).toHaveProperty('defaultAbsoluteZoomPositionSpace');
        expect(configuration).toHaveProperty('defaultRelativePanTiltTranslationSpace');
        expect(configuration).toHaveProperty('defaultRelativeZoomTranslationSpace');
        expect(configuration).toHaveProperty('defaultContinuousPanTiltVelocitySpace');
        expect(configuration).toHaveProperty('defaultContinuousZoomVelocitySpace');
        expect(configuration).toHaveProperty('defaultPTZSpeed');
        expect(configuration).toHaveProperty('defaultPTZTimeout');
        expect(configuration).toHaveProperty('panTiltLimits');
        expect(configuration).toHaveProperty('zoomLimits');
        expect(configuration).toHaveProperty('extension');
      });
    });
  });

  it('should return configurations as a property', () => {
    const result = cam.ptz.configurations;
    Object.values(result).forEach((configuration) => {
      expect(configuration).toHaveProperty('nodeToken');
    });
  });

  describe('getConfigurations', () => {
    it('should return a list of configurations', async () => {
      const result = await cam.ptz.getConfigurations();
      expect(result).toBeInstanceOf(Array);
      result.forEach((configuration) => {
        expect(configuration).toHaveProperty('nodeToken');
      });
    });
  });

  describe('getConfigurationOptions', () => {
    it('should return an options object for configuration token', async () => {
      const configuration = (await cam.ptz.getConfigurations())[0].token;
      const result = await cam.ptz.getConfigurationOptions({ configurationToken : configuration });
      expect(result).toHaveProperty('spaces');
      expect(result).toHaveProperty('PTZTimeout');
      expect(result).toHaveProperty('PTControlDirection');
    });
  });
});

// describe('Presets', () => {
//   describe('getPresetsExtended', () => {
//     it('should return a preset for all ');
//   });
// });
