/**
 * Mocked unit tests for the Analytics Device service.
 *
 * Happytime ONVIF Server does not expose ver10/analyticsdevice, so these tests
 * validate request/response handling against mocked SOAP responses.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import { OnvifError } from '../src/utils';
import {
  AnalyticsEngine,
  AnalyticsEngineControl,
  AnalyticsEngineInput,
  VideoAnalyticsConfiguration,
} from '../src/interfaces/onvif';

const ENGINE_TOKEN = 'AnalyticsEngineToken_1';
const CONTROL_TOKEN = 'AnalyticsEngineControlToken_1';
const INPUT_TOKEN = 'AnalyticsEngineInputToken_1';
const CONFIG_TOKEN = 'VideoAnalyticsConfigurationToken_1';
const ANALYTICS_DEVICE_XMLNS = 'http://www.onvif.org/ver10/analyticsdevice/wsdl';

const mockMulticast = {
  address: { type: 'IPv4' as const, IPv4Address: '0.0.0.0' },
  port: 0,
  TTL: 1,
  autoStart: false,
};

const mockSubscription = {
  name: 'Subscription',
  type: 'tt:Subscription',
  parameters: {
    simpleItem: [{ name: 'Topic', value: 'tns1:RuleEngine/Motion' }],
  },
};

const mockAnalyticsEngineControl: AnalyticsEngineControl = {
  token: CONTROL_TOKEN,
  name: 'AnalyticsEngineControlName_1',
  useCount: 1,
  engineToken: ENGINE_TOKEN,
  engineConfigToken: CONFIG_TOKEN,
  inputToken: [INPUT_TOKEN],
  subscription: mockSubscription,
  mode: 'Idle',
};

const mockVideoAnalyticsConfiguration: VideoAnalyticsConfiguration = {
  token: CONFIG_TOKEN,
  name: 'VideoAnalyticsConfigurationName_1',
  useCount: 1,
  analyticsEngineConfiguration: {},
  ruleEngineConfiguration: {},
};

const mockAnalyticsEngineInput: AnalyticsEngineInput = {
  token: INPUT_TOKEN,
  name: 'AnalyticsEngineInputName_1',
  useCount: 1,
  sourceIdentification: {
    name: 'VideoSourceName_1',
    token: ['VideoSourceToken_1'],
  },
  videoInput: {
    token: 'VideoEncoderToken_1',
    name: 'VideoEncoderName_1',
    useCount: 1,
    encoding: 'H264',
    resolution: { width: 1920, height: 1080 },
    quality: 5,
    multicast: mockMulticast,
    sessionTimeout: 'PT60S',
  },
  metadataInput: {},
};

const mockAnalyticsEngine: AnalyticsEngine = {
  token: ENGINE_TOKEN,
  name: 'AnalyticsEngineName_1',
  useCount: 1,
  analyticsEngineConfiguration: {},
};

let cam: Onvif;

function mockAnalyticsDeviceResponse(body: Record<string, unknown>) {
  return jest.spyOn(cam as any, 'request').mockResolvedValueOnce([body, '<mock/>']);
}

beforeEach(() => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  cam.uri.analyticsDevice = new URL('http://127.0.0.1:8000/onvif/analyticsdevice_service');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AnalyticsDevice (mocked)', () => {
  describe('getServiceCapabilities', () => {
    it('should return analytics device service capabilities', async () => {
      mockAnalyticsDeviceResponse({
        getServiceCapabilitiesResponse: {
          capabilities: {
            maximumAnalyticsEngines: 4,
            maximumInputs: 8,
          },
        },
      });

      const caps = await cam.analyticsDevice.getServiceCapabilities();
      expect(caps.maximumAnalyticsEngines).toBe(4);
      expect(caps.maximumInputs).toBe(8);
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'analyticsdevice',
          body: {
            GetServiceCapabilities: {
              $: { xmlns: ANALYTICS_DEVICE_XMLNS },
            },
          },
        }),
      );
    });

    it('should return an empty object when capabilities are absent', async () => {
      mockAnalyticsDeviceResponse({
        getServiceCapabilitiesResponse: {},
      });

      const caps = await cam.analyticsDevice.getServiceCapabilities();
      expect(caps).toEqual({});
    });
  });

  describe('analytics engine controls', () => {
    it('should return all analytics engine controls', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsEngineControlsResponse: {
          analyticsEngineControls: [mockAnalyticsEngineControl],
        },
      });

      const controls = await cam.analyticsDevice.getAnalyticsEngineControls();
      expect(controls).toHaveLength(1);
      expect(controls[0].token).toBe(CONTROL_TOKEN);
    });

    it('should return an empty array when no controls exist', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsEngineControlsResponse: {},
      });

      const controls = await cam.analyticsDevice.getAnalyticsEngineControls();
      expect(controls).toEqual([]);
    });

    it('should return a single analytics engine control', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsEngineControlResponse: {
          configuration: mockAnalyticsEngineControl,
        },
      });

      const control = await cam.analyticsDevice.getAnalyticsEngineControl({
        configurationToken: CONTROL_TOKEN,
      });
      expect(control.token).toBe(CONTROL_TOKEN);
    });

    it('should create an analytics engine control', async () => {
      mockAnalyticsDeviceResponse({
        createAnalyticsEngineControlResponse: {
          configuration: [mockAnalyticsEngineInput],
        },
      });

      const created = await cam.analyticsDevice.createAnalyticsEngineControl({
        configuration: mockAnalyticsEngineControl,
      });
      expect(created[0].token).toBe(INPUT_TOKEN);

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body.CreateAnalyticsEngineControl.Configuration).toMatchObject({
        $: { token: CONTROL_TOKEN },
        EngineToken: ENGINE_TOKEN,
        EngineConfigToken: CONFIG_TOKEN,
        Mode: 'Idle',
      });
    });

    it('should modify an analytics engine control', async () => {
      mockAnalyticsDeviceResponse({ setAnalyticsEngineControlResponse: {} });

      await cam.analyticsDevice.setAnalyticsEngineControl({
        configuration: mockAnalyticsEngineControl,
        forcePersistence: true,
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        SetAnalyticsEngineControl: {
          $: { xmlns: ANALYTICS_DEVICE_XMLNS },
          Configuration: expect.objectContaining({
            $: { token: CONTROL_TOKEN },
            EngineToken: ENGINE_TOKEN,
          }),
          ForcePersistence: true,
        },
      });
    });

    it('should delete an analytics engine control', async () => {
      mockAnalyticsDeviceResponse({ deleteAnalyticsEngineControlResponse: {} });

      await cam.analyticsDevice.deleteAnalyticsEngineControl({
        configurationToken: CONTROL_TOKEN,
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        DeleteAnalyticsEngineControl: {
          $: { xmlns: ANALYTICS_DEVICE_XMLNS },
          ConfigurationToken: CONTROL_TOKEN,
        },
      });
    });
  });

  describe('analytics engines', () => {
    it('should return all analytics engines', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsEnginesResponse: {
          configuration: [mockAnalyticsEngine],
        },
      });

      const engines = await cam.analyticsDevice.getAnalyticsEngines();
      expect(engines).toHaveLength(1);
      expect(engines[0].token).toBe(ENGINE_TOKEN);
    });

    it('should return a single analytics engine', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsEngineResponse: {
          configuration: mockAnalyticsEngine,
        },
      });

      const engine = await cam.analyticsDevice.getAnalyticsEngine({
        configurationToken: ENGINE_TOKEN,
      });
      expect(engine.token).toBe(ENGINE_TOKEN);
    });
  });

  describe('analytics engine inputs', () => {
    it('should return all analytics engine inputs', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsEngineInputsResponse: {
          configuration: [mockAnalyticsEngineInput],
        },
      });

      const inputs = await cam.analyticsDevice.getAnalyticsEngineInputs();
      expect(inputs).toHaveLength(1);
      expect(inputs[0].token).toBe(INPUT_TOKEN);
    });

    it('should return a single analytics engine input', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsEngineInputResponse: {
          configuration: mockAnalyticsEngineInput,
        },
      });

      const input = await cam.analyticsDevice.getAnalyticsEngineInput({
        configurationToken: INPUT_TOKEN,
      });
      expect(input.sourceIdentification.name).toBe('VideoSourceName_1');
    });

    it('should create analytics engine inputs', async () => {
      mockAnalyticsDeviceResponse({
        createAnalyticsEngineInputsResponse: {
          configuration: [mockAnalyticsEngineInput],
        },
      });

      const created = await cam.analyticsDevice.createAnalyticsEngineInputs({
        configuration: [mockAnalyticsEngineInput],
        forcePersistence: [true],
      });
      expect(created[0].token).toBe(INPUT_TOKEN);

      const { body, array } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(array).toEqual(['configuration']);
      expect(body.CreateAnalyticsEngineInputs.ForcePersistence).toBe(true);
    });

    it('should modify an analytics engine input', async () => {
      mockAnalyticsDeviceResponse({ setAnalyticsEngineInputResponse: {} });

      await cam.analyticsDevice.setAnalyticsEngineInput({
        configuration: mockAnalyticsEngineInput,
        forcePersistence: false,
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body.SetAnalyticsEngineInput.ForcePersistence).toBe(false);
      expect(body.SetAnalyticsEngineInput.Configuration.SourceIdentification.Name).toBe('VideoSourceName_1');
    });

    it('should delete analytics engine inputs by token', async () => {
      mockAnalyticsDeviceResponse({ deleteAnalyticsEngineInputsResponse: {} });

      await cam.analyticsDevice.deleteAnalyticsEngineInputs({
        configurationToken: [INPUT_TOKEN],
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        DeleteAnalyticsEngineInputs: {
          $: { xmlns: ANALYTICS_DEVICE_XMLNS },
          ConfigurationToken: INPUT_TOKEN,
        },
      });
    });
  });

  describe('video analytics configuration', () => {
    it('should return a video analytics configuration', async () => {
      mockAnalyticsDeviceResponse({
        getVideoAnalyticsConfigurationResponse: {
          configuration: mockVideoAnalyticsConfiguration,
        },
      });

      const configuration = await cam.analyticsDevice.getVideoAnalyticsConfiguration({
        configurationToken: CONFIG_TOKEN,
      });
      expect(configuration.token).toBe(CONFIG_TOKEN);
    });

    it('should modify a video analytics configuration', async () => {
      mockAnalyticsDeviceResponse({ setVideoAnalyticsConfigurationResponse: {} });

      await cam.analyticsDevice.setVideoAnalyticsConfiguration({
        configuration: mockVideoAnalyticsConfiguration,
        forcePersistence: true,
      });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body.SetVideoAnalyticsConfiguration.Configuration.$).toEqual({ token: CONFIG_TOKEN });
      expect(body.SetVideoAnalyticsConfiguration.ForcePersistence).toBe(true);
    });
  });

  describe('getAnalyticsDeviceStreamUri', () => {
    it('should return a stream URI for an analytics engine control', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsDeviceStreamUriResponse: {
          uri: 'rtsp://127.0.0.1:554/analytics',
        },
      });

      const uri = await cam.analyticsDevice.getAnalyticsDeviceStreamUri({
        analyticsEngineControlToken: CONTROL_TOKEN,
        streamSetup: {
          stream: 'RTP-Unicast',
          transport: { protocol: 'RTSP' },
        },
      });
      expect(uri).toBe('rtsp://127.0.0.1:554/analytics');

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body.GetAnalyticsDeviceStreamUri).toEqual({
        $: { xmlns: ANALYTICS_DEVICE_XMLNS },
        StreamSetup: {
          Stream: 'RTP-Unicast',
          Transport: {
            Protocol: 'RTSP',
          },
        },
        AnalyticsEngineControlToken: CONTROL_TOKEN,
      });
    });
  });

  describe('getAnalyticsState', () => {
    it('should return analytics state for a control token', async () => {
      mockAnalyticsDeviceResponse({
        getAnalyticsStateResponse: {
          state: {
            analyticsEngineControlToken: CONTROL_TOKEN,
            state: {
              state: 'Running',
            },
          },
        },
      });

      const state = await cam.analyticsDevice.getAnalyticsState({
        analyticsEngineControlToken: CONTROL_TOKEN,
      });
      expect(state.analyticsEngineControlToken).toBe(CONTROL_TOKEN);
      expect(state.state.state).toBe('Running');
    });
  });

  describe('errors', () => {
    it('should propagate request errors', async () => {
      jest.spyOn(cam as any, 'request').mockRejectedValueOnce(new OnvifError('Invalid token'));

      await expect(
        cam.analyticsDevice.getAnalyticsEngineControl({ configurationToken: 'InvalidToken' }),
      ).rejects.toThrow('Invalid token');
    });
  });
});
