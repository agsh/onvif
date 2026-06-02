import { Onvif } from '../src';
import { GetPresetsExtended } from '../src/ptz';
import { ReferenceToken } from '../src/interfaces/common';

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

describe('getServiceCapabilities', () => {
  it('should return PTZ service capabilities as an object', async () => {
    const caps = await cam.ptz.getServiceCapabilities();
    expect(caps).toBeDefined();
    expect(typeof caps).toBe('object');
    expect(Array.isArray(caps)).toBe(false);
  });

  it('should return capability flags from the happytime mock server', async () => {
    const caps = await cam.ptz.getServiceCapabilities();
    expect(caps.EFlip).toBe(true);
    expect(caps.reverse).toBe(true);
    expect(caps.getCompatibleConfigurations).toBe(true);
    expect(caps.moveStatus).toBe(true);
    expect(caps.statusPosition).toBe(true);
  });

  it('should expose optional capability flags as booleans when present', async () => {
    const caps = await cam.ptz.getServiceCapabilities();
    const optionalFlags = ['EFlip', 'reverse', 'getCompatibleConfigurations', 'moveStatus', 'statusPosition'] as const;
    optionalFlags.forEach((key) => {
      if (caps[key] !== undefined) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(typeof caps[key]).toBe('boolean');
      }
    });
  });
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

  describe('getNode', () => {
    it('should return a PTZ node matching an entry from getNodes', async () => {
      const nodes = await cam.ptz.getNodes();
      expect(nodes.length).toBeGreaterThan(0);
      const [listed] = nodes;
      const node = await cam.ptz.getNode({ nodeToken: listed.token });
      expect(node.token).toBe(listed.token);
      expect(node.name).toBe(listed.name);
      expect(node).toHaveProperty('supportedPTZSpaces');
      expect(node).toHaveProperty('maximumNumberOfPresets');
      expect(node).toHaveProperty('homeSupported');
    });

    it('should return node fields advertised by the happytime mock server', async () => {
      const node = await cam.ptz.getNode({ nodeToken: 'PTZNodeToken_1' });
      expect(node.token).toBe('PTZNodeToken_1');
      expect(node.name).toBe('PTZNodeName_1');
      expect(node.geoMove).toBe(true);
    });

    it('should throw when the requested node token does not exist', async () => {
      await expect(cam.ptz.getNode({ nodeToken: '???' })).rejects.toThrow('No such PTZ Node on the device');
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

  let PTZConfigurationToken: ReferenceToken;
  describe('getConfigurations', () => {
    it('should return a list of configurations', async () => {
      const result = await cam.ptz.getConfigurations();
      expect(result).toBeInstanceOf(Array);
      PTZConfigurationToken = result[0].token;
      result.forEach((configuration) => {
        expect(configuration).toHaveProperty('nodeToken');
      });
    });
  });

  describe('getConfiguration', () => {
    it('should return a configuration for the token', async () => {
      const result = await cam.ptz.getConfiguration({
        PTZConfigurationToken,
      });
      expect(result).toHaveProperty('nodeToken');
    });

    it('throws an error with the wrong token', async () => {
      await expect(cam.ptz.getConfiguration({ PTZConfigurationToken: '???' })).rejects.toThrow();
    });
  });

  describe('getConfigurationOptions', () => {
    it('should return an options object for configuration token', async () => {
      const configuration = (await cam.ptz.getConfigurations())[0].token;
      const result = await cam.ptz.getConfigurationOptions({ configurationToken: configuration });
      expect(result).toHaveProperty('spaces');
      expect(result).toHaveProperty('PTZTimeout');
      expect(result).toHaveProperty('PTControlDirection');
    });
  });
});

describe('Presets', () => {
  describe('setPreset', () => {
    let presetToken: ReferenceToken;
    it('should create a new preset for the empty presetToken', async () => {
      presetToken = await cam.ptz.setPreset({
        presetName: 'My_Token',
      });
      expect(typeof presetToken).toBe('string');
    });

    it('should edit already existing preset by token', async () => {
      const result = await cam.ptz.setPreset({
        presetName: 'My_Token_2',
        presetToken,
      });
      expect(typeof result).toBe('string');
      expect(result).toBe(presetToken);
    });

    it('should throw an error if there is no preset token to edit', async () => {
      await expect(
        cam.ptz.setPreset({
          presetToken: 'Undefined_Token',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getPresetsExtended', () => {
    let activeSourceResult: GetPresetsExtended;
    it('should return a preset for the activeSource by default', async () => {
      activeSourceResult = await cam.ptz.getPresetsExtended();
      Object.values(activeSourceResult).forEach((configuration) => {
        expect(configuration).toHaveProperty('token');
        expect(configuration).toHaveProperty('name');
        expect(configuration).toHaveProperty('PTZPosition');
      });
    });

    it('should return presets for the selected profile', async () => {
      const result = await cam.ptz.getPresetsExtended({ profileToken: cam.activeSource!.profileToken });
      expect(result).toStrictEqual(activeSourceResult);
    });

    it('should return presets as a property', () => {
      const result = cam.ptz.presets;
      expect(result).toStrictEqual(activeSourceResult);
    });

    it('should return presets as an array for the selected profile', async () => {
      const result = await cam.ptz.getPresets({ profileToken: cam.activeSource!.profileToken });
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(Object.keys(activeSourceResult).length);
    });
  });

  describe('removePreset', () => {
    it('should remove preset by token', async () => {
      const presetToken = await cam.ptz.setPreset({});
      let presets = await cam.ptz.getPresetsExtended();
      expect(presets[presetToken]).toBeDefined();
      const result = await cam.ptz.removePreset({ presetToken });
      expect(result).toBeUndefined();
      presets = await cam.ptz.getPresetsExtended();
      expect(presets[presetToken]).toBeUndefined();
    });
  });

  describe('gotoPreset', () => {
    it('should go to preset by token', async () => {
      const presetToken = (await cam.ptz.getPresets({ profileToken: cam.activeSource!.profileToken }))[0].token!;
      const result = await cam.ptz.gotoPreset({
        presetToken,
        speed: {
          panTilt: {
            x: 0,
            y: 0,
          },
          zoom: {
            x: 0,
          },
        },
      });
      expect(result).toBeUndefined();
    });
  });

  describe('setHomePosition', () => {
    it('should set home position', async () => {
      const result = await cam.ptz.setHomePosition({});
      expect(result).toBeUndefined();
    });
  });

  describe('gotoHomePosition', () => {
    it('should set home position', async () => {
      const result = await cam.ptz.gotoHomePosition({});
      expect(result).toBeUndefined();
    });
  });
});

describe('getStatus for the node in the selected profile', () => {
  it('should return status', async () => {
    const result = await cam.ptz.getStatus({});
    expect(result).toHaveProperty('position');
    expect(result).toHaveProperty('moveStatus');
    expect(result).toHaveProperty('utcTime');
  });
});

describe('Moves', () => {
  describe('absoluteMove', () => {
    it('should move', async () => {
      const result = await cam.ptz.absoluteMove({
        position: {
          panTilt: {
            x: 0,
            y: 0,
          },
          zoom: {
            x: 0,
          },
        },
      });
      expect(result).toBeUndefined();
    });

    it('should move with simplified position vector first variant', async () => {
      const result = await cam.ptz.absoluteMove({
        position: {
          x: 0,
          y: 0,
          zoom: 0,
        },
      });
      expect(result).toBeUndefined();
    });

    it('should move with simplified position vector second variant', async () => {
      const result = await cam.ptz.absoluteMove({
        position: {
          pan: 0,
          tilt: 0,
          zoom: 0,
        },
      });
      expect(result).toBeUndefined();
    });

    it('should throw an error if the position is not specified', async () => {
      await expect(
        cam.ptz.absoluteMove(
          // @ts-expect-error position is required
          {},
        ),
      ).rejects.toThrow();
    });
  });

  describe('relativeMove', () => {
    it('should move', async () => {
      const result = await cam.ptz.relativeMove({
        translation: {
          panTilt: {
            x: 0,
            y: 0,
          },
          zoom: {
            x: 0,
          },
        },
        speed: {
          panTilt: {
            x: 0,
            y: 0,
          },
        },
      });
      expect(result).toBeUndefined();
    });

    it('should move with simplified position vector', async () => {
      const result = await cam.ptz.relativeMove({
        translation: {
          x: 1,
          y: 0.3,
          zoom: 0.1,
        },
      });
      expect(result).toBeUndefined();
    });

    it('should throw an error if the translation is not specified', async () => {
      await expect(
        cam.ptz.relativeMove(
          // @ts-expect-error translation is required
          {},
        ),
      ).rejects.toThrow();
    });
  });

  describe('continuousMove', () => {
    it('should move', async () => {
      const result = await cam.ptz.continuousMove({
        velocity: {
          panTilt: {
            x: 0,
            y: 0,
          },
          zoom: {
            x: 0,
          },
        },
        timeout: 'PT5S',
      });
      expect(result).toBeUndefined();
    });

    it('should move with simplified position vector', async () => {
      const result = await cam.ptz.continuousMove({
        velocity: {
          x: 1,
          y: 0.3,
          zoom: 0.1,
        },
      });
      expect(result).toBeUndefined();
    });

    it('should throw an error if the velocity is not specified', async () => {
      await expect(
        cam.ptz.continuousMove(
          // @ts-expect-error velocity is required
          {},
        ),
      ).rejects.toThrow();
    });
  });

  describe('geoMove', () => {
    const geoTarget = { lon: 37.6173, lat: 55.7558, elevation: 156 };

    async function expectGeoMoveOutcome(geoMoveCall: () => Promise<void>): Promise<void> {
      const nodes = await cam.ptz.getNodesExtended();
      const supported = Object.values(nodes).some((node) => node.geoMove === true);
      if (supported) {
        await expect(geoMoveCall()).resolves.toBeUndefined();
      } else {
        await expect(geoMoveCall()).rejects.toThrow(/does not support geo move/i);
      }
    }

    it('should move to a geolocation target when PTZ nodes advertise geoMove support', async () => {
      await expectGeoMoveOutcome(() =>
        cam.ptz.geoMove({
          profileToken: cam.activeSource!.profileToken,
          target: geoTarget,
        }),
      );
    });

    it('should default profile token from activeSource when omitted', async () => {
      await expectGeoMoveOutcome(() => cam.ptz.geoMove({ target: geoTarget }));
    });

    it('should accept optional speed and area dimensions per GeoMove schema', async () => {
      await expectGeoMoveOutcome(() =>
        cam.ptz.geoMove({
          target: geoTarget,
          speed: {
            panTilt: { x: 0.5, y: 0.5 },
            zoom: { x: 0.1 },
          },
          areaHeight: 10,
          areaWidth: 20,
        }),
      );
    });

    it('should throw when the requested profile token does not exist', async () => {
      await expect(
        cam.ptz.geoMove({
          profileToken: '???',
          target: geoTarget,
        }),
      ).rejects.toThrow('Profile Not Exist');
    });
  });

  describe('stop', () => {
    it('should stop', async () => {
      const result = await cam.ptz.stop({});
      expect(result).toBeUndefined();
    });

    it('should stop with optional parameters', async () => {
      const result = await cam.ptz.stop({
        panTilt: true,
        zoom: true,
        profileToken: cam.activeSource!.profileToken,
      });
      expect(result).toBeUndefined();
    });
  });
});
