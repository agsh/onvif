/**
 * Action Engine ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/actionengine.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { ReferenceToken } from './interfaces/common';
import {
  Action,
  ActionConfiguration,
  ActionEngineCapabilities,
  ActionTrigger,
  ActionTriggerConfiguration,
  Capabilities,
  CreateActionTriggers,
  CreateActions,
  DeleteActionTriggers,
  DeleteActions,
  GetActions,
  GetActionTriggers,
  GetSupportedActions,
  ModifyActionTriggers,
  ModifyActions,
  SupportedActions,
} from './interfaces/actionengine';
import { itemList } from './utils/toOnvifXMLSchemaObject';

/**
 * Action Engine service
 * @example
 * ```typescript
 * await cam.connect();
 * const caps = await cam.actionEngine.getServiceCapabilities();
 * const supported = await cam.actionEngine.getSupportedActions();
 * const actions = await cam.actionEngine.getActions();
 * const triggers = await cam.actionEngine.getActionTriggers();
 * ```
 */
export default class ActionEngine extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'actionengine');
  }

  private static tokensToBuild(tokens?: ReferenceToken[]) {
    if (!tokens?.length) {
      return undefined;
    }
    return tokens.length === 1 ? tokens[0] : tokens;
  }

  private static actionConfigurationToBuild(configuration: ActionConfiguration) {
    return {
      $: { Name: configuration.name, Type: configuration.type },
      Parameters: itemList(configuration.parameters),
    };
  }

  private static actionToBuild(action: Action) {
    return {
      $: { token: action.token },
      Configuration: ActionEngine.actionConfigurationToBuild(action.configuration),
    };
  }

  private static actionTriggerConfigurationToBuild(configuration: ActionTriggerConfiguration) {
    return {
      TopicExpression: configuration.topicExpression,
      ...(configuration.contentExpression !== undefined && {
        ContentExpression: configuration.contentExpression,
      }),
      ...(configuration.actionToken && {
        ActionToken: ActionEngine.tokensToBuild(configuration.actionToken),
      }),
      ...(configuration.extension && { Extension: configuration.extension }),
    };
  }

  private static actionTriggerToBuild(actionTrigger: ActionTrigger) {
    return {
      $: { token: actionTrigger.token },
      Configuration: ActionEngine.actionTriggerConfigurationToBuild(actionTrigger.configuration),
    };
  }

  /**
   * Returns the capabilities of the action engine service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({ GetServiceCapabilities: {} }, { array: ['actionCapabilities'] });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns the action types supported by the device.
   */
  async getSupportedActions(_options: GetSupportedActions = {}): Promise<SupportedActions> {
    const response = await this.request(
      { GetSupportedActions: {} },
      { array: ['actionDescription', 'actionContentSchemaLocation'] },
    );
    return response.getSupportedActionsResponse.supportedActions;
  }

  /**
   * Returns the configured actions.
   */
  async getActions(_options: GetActions = {}): Promise<Action[]> {
    const response = await this.request({ GetActions: {} }, { array: ['action'] });
    return response.getActionsResponse.action ?? [];
  }

  /**
   * Creates one or more actions.
   */
  async createActions({ action = [] }: CreateActions): Promise<Action[]> {
    const response = await this.request(
      { CreateActions: { Action: action.map(ActionEngine.actionConfigurationToBuild) } },
      { array: ['action'] },
    );
    return response.createActionsResponse.action ?? [];
  }

  /**
   * Deletes one or more actions.
   */
  async deleteActions({ token }: DeleteActions): Promise<void> {
    await this.request({
      DeleteActions: {
        Token: ActionEngine.tokensToBuild(token),
      },
    });
  }

  /**
   * Modifies one or more actions.
   */
  async modifyActions({ action = [] }: ModifyActions): Promise<void> {
    await this.request({ ModifyActions: { Action: action.map(ActionEngine.actionToBuild) } });
  }

  /**
   * Returns the configured action triggers.
   */
  async getActionTriggers(_options: GetActionTriggers = {}): Promise<ActionTrigger[]> {
    const response = await this.request({ GetActionTriggers: {} }, { array: ['actionTrigger'] });
    return response.getActionTriggersResponse.actionTrigger ?? [];
  }

  /**
   * Creates one or more action triggers.
   */
  async createActionTriggers({ actionTrigger = [] }: CreateActionTriggers): Promise<ActionTrigger[]> {
    const response = await this.request(
      { CreateActionTriggers: { ActionTrigger: actionTrigger?.map(ActionEngine.actionTriggerConfigurationToBuild) } },
      { array: ['actionTrigger'] },
    );
    return response.createActionTriggersResponse.actionTrigger ?? [];
  }

  /**
   * Modifies one or more action triggers.
   */
  async modifyActionTriggers({ actionTrigger = [] }: ModifyActionTriggers): Promise<void> {
    await this.request({
      ModifyActionTriggers: { ActionTrigger: actionTrigger.map(ActionEngine.actionTriggerToBuild) },
    });
  }

  /**
   * Deletes one or more action triggers.
   */
  async deleteActionTriggers({ token }: DeleteActionTriggers): Promise<void> {
    await this.request({
      DeleteActionTriggers: {
        Token: ActionEngine.tokensToBuild(token),
      },
    });
  }
}
