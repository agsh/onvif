/**
 * Mocked unit tests for the Action Engine service.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import { OnvifError } from '../src/utils';
import { Action, ActionConfiguration, ActionTrigger, ActionTriggerConfiguration } from '../src/interfaces/actionengine';
import happytimeOnvifOptions from './happytime.json';

const ACTION_TOKEN = 'ActionToken_1';
const TRIGGER_TOKEN = 'ActionTriggerToken_1';
const ACTIONENGINE_XMLNS = 'http://www.onvif.org/ver10/actionengine/wsdl';

const mockActionConfiguration: ActionConfiguration = {
  name: 'RelayOn',
  type: 'tt:RelayOutput',
  parameters: {
    simpleItem: [{ name: 'RelayToken', value: 'RelayOutputToken_1' }],
  },
};

const mockAction: Action = {
  token: ACTION_TOKEN,
  configuration: mockActionConfiguration,
};

const mockActionTriggerConfiguration: ActionTriggerConfiguration = {
  topicExpression: 'tns1:RuleEngine/CellMotionDetector/Motion',
  actionToken: [ACTION_TOKEN],
};

const mockActionTrigger: ActionTrigger = {
  token: TRIGGER_TOKEN,
  configuration: mockActionTriggerConfiguration,
};

let cam: Onvif;

function mockActionEngineResponse(body: Record<string, unknown>) {
  return jest.spyOn(cam as any, 'request').mockResolvedValueOnce([body, '<mock/>']);
}

beforeEach(() => {
  cam = new Onvif(happytimeOnvifOptions);
  cam.uri.actionengine = new URL('http://127.0.0.1:8000/onvif/actionengine_service');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ActionEngine (mocked)', () => {
  describe('getServiceCapabilities', () => {
    it('should return action engine service capabilities', async () => {
      mockActionEngineResponse({
        getServiceCapabilitiesResponse: {
          capabilities: {
            maximumTriggers: 10,
            maximumActions: 20,
            actionCapabilities: [{ type: 'tt:RelayOutput', maximum: 5, inUse: 1 }],
          },
        },
      });

      const caps = await cam.actionEngine.getServiceCapabilities();
      expect(caps.maximumActions).toBe(20);
      expect(caps.actionCapabilities).toHaveLength(1);
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'actionengine',
          body: {
            GetServiceCapabilities: {
              $: { xmlns: ACTIONENGINE_XMLNS },
            },
          },
        }),
      );
    });

    it('should return an empty object when capabilities are absent', async () => {
      mockActionEngineResponse({
        getServiceCapabilitiesResponse: {},
      });

      const caps = await cam.actionEngine.getServiceCapabilities();
      expect(caps).toEqual({});
    });
  });

  describe('getSupportedActions', () => {
    it('should return supported action descriptions', async () => {
      mockActionEngineResponse({
        getSupportedActionsResponse: {
          supportedActions: {
            actionContentSchemaLocation: ['http://www.onvif.org/ver10/schema'],
            actionDescription: [
              {
                name: 'tt:RelayOutput',
                parameterDescription: {
                  simpleItemDescription: [{ name: 'RelayToken', type: 'tt:ReferenceToken' }],
                },
              },
            ],
          },
        },
      });

      const supported = await cam.actionEngine.getSupportedActions();
      expect(supported.actionDescription).toHaveLength(1);
      expect(supported.actionDescription![0].name).toBe('tt:RelayOutput');
    });
  });

  describe('actions', () => {
    it('should return configured actions', async () => {
      mockActionEngineResponse({
        getActionsResponse: { action: [mockAction] },
      });

      const actions = await cam.actionEngine.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].token).toBe(ACTION_TOKEN);
    });

    it('should return an empty array when no actions exist', async () => {
      mockActionEngineResponse({
        getActionsResponse: {},
      });

      const actions = await cam.actionEngine.getActions();
      expect(actions).toEqual([]);
    });

    it('should create actions and return assigned tokens', async () => {
      mockActionEngineResponse({
        createActionsResponse: { action: [mockAction] },
      });

      const actions = await cam.actionEngine.createActions({ action: [mockActionConfiguration] });
      expect(actions[0].token).toBe(ACTION_TOKEN);

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        CreateActions: {
          $: { xmlns: ACTIONENGINE_XMLNS },
          Action: [
            {
              $: { Name: 'RelayOn', Type: 'tt:RelayOutput' },
              Parameters: {
                SimpleItem: [{ $: { Name: 'RelayToken', Value: 'RelayOutputToken_1' } }],
              },
            },
          ],
        },
      });
    });

    it('should modify actions with token and configuration', async () => {
      mockActionEngineResponse({ modifyActionsResponse: {} });

      await cam.actionEngine.modifyActions({ action: [mockAction] });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        ModifyActions: {
          $: { xmlns: ACTIONENGINE_XMLNS },
          Action: [
            {
              $: { token: ACTION_TOKEN },
              Configuration: {
                $: { Name: 'RelayOn', Type: 'tt:RelayOutput' },
                Parameters: {
                  SimpleItem: [{ $: { Name: 'RelayToken', Value: 'RelayOutputToken_1' } }],
                },
              },
            },
          ],
        },
      });
    });

    it('should delete actions by token', async () => {
      mockActionEngineResponse({ deleteActionsResponse: {} });

      await cam.actionEngine.deleteActions({ token: [ACTION_TOKEN] });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        DeleteActions: {
          $: { xmlns: ACTIONENGINE_XMLNS },
          Token: ACTION_TOKEN,
        },
      });
    });
  });

  describe('action triggers', () => {
    it('should return configured action triggers', async () => {
      mockActionEngineResponse({
        getActionTriggersResponse: { actionTrigger: [mockActionTrigger] },
      });

      const triggers = await cam.actionEngine.getActionTriggers();
      expect(triggers).toHaveLength(1);
      expect(triggers[0].token).toBe(TRIGGER_TOKEN);
    });

    it('should create action triggers and return assigned tokens', async () => {
      mockActionEngineResponse({
        createActionTriggersResponse: { actionTrigger: [mockActionTrigger] },
      });

      const triggers = await cam.actionEngine.createActionTriggers({
        actionTrigger: [mockActionTriggerConfiguration],
      });
      expect(triggers[0].token).toBe(TRIGGER_TOKEN);

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        CreateActionTriggers: {
          $: { xmlns: ACTIONENGINE_XMLNS },
          ActionTrigger: [
            {
              TopicExpression: 'tns1:RuleEngine/CellMotionDetector/Motion',
              ActionToken: ACTION_TOKEN,
            },
          ],
        },
      });
    });

    it('should modify action triggers with token and configuration', async () => {
      mockActionEngineResponse({ modifyActionTriggersResponse: {} });

      await cam.actionEngine.modifyActionTriggers({ actionTrigger: [mockActionTrigger] });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        ModifyActionTriggers: {
          $: { xmlns: ACTIONENGINE_XMLNS },
          ActionTrigger: [
            {
              $: { token: TRIGGER_TOKEN },
              Configuration: {
                TopicExpression: 'tns1:RuleEngine/CellMotionDetector/Motion',
                ActionToken: ACTION_TOKEN,
              },
            },
          ],
        },
      });
    });

    it('should delete action triggers by token', async () => {
      mockActionEngineResponse({ deleteActionTriggersResponse: {} });

      await cam.actionEngine.deleteActionTriggers({ token: [TRIGGER_TOKEN] });

      const { body } = (cam.request as jest.Mock).mock.calls[0][0];
      expect(body).toEqual({
        DeleteActionTriggers: {
          $: { xmlns: ACTIONENGINE_XMLNS },
          Token: TRIGGER_TOKEN,
        },
      });
    });
  });

  describe('errors', () => {
    it('should propagate request errors', async () => {
      jest.spyOn(cam as any, 'request').mockRejectedValueOnce(new OnvifError('Action not found'));

      await expect(cam.actionEngine.getActions()).rejects.toThrow('Action not found');
    });
  });
});
