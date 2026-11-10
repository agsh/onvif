import { ItemListDescription, ItemList } from './onvif';
import {
  AnyURI,
  PositiveInteger,
} from './basics';
import { ReferenceToken } from './common';
/** Describes the configuration parameters of an action. */
export interface ActionConfigDescription {
  /** Action type name */
  name: string;
  /** Action configuration parameter descriptions */
  parameterDescription: ItemListDescription;
}
/** SupportedActions data structure lists the available action types that service provider supports. For each action type, data structure contains the action configuration parameters. */
export interface SupportedActions {
  /** Lists the location of all schemas that are referenced in the supported actions. If the action descriptions reference data types in the ONVIF schema file,the ONVIF schema file MUST be explicitly listed. */
  actionContentSchemaLocation?: AnyURI[];
  /** List of actions supported by Action Engine Service provider. */
  actionDescription?: ActionConfigDescription[];
  extension?: SupportedActionsExtension;
}
export interface SupportedActionsExtension {
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** Action Engine Capabilities data structure contains the maximum number of supported actions and number of actions in use for generic as well as specific action types */
export interface ActionEngineCapabilities {
  /** The maximum number of trigger configurations that the service provider can concurrently support */
  maximumTriggers?: PositiveInteger;
  /** The maximum number of actions that the service provider can concurrently support */
  maximumActions?: PositiveInteger;
  /** Limits for each action type */
  actionCapabilities?: ActionTypeLimits[];
  extension?: ActionEngineCapabilitiesExtension;
}
export interface ActionEngineCapabilitiesExtension {
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** ActionTypeLimits data structure contains maximum and current usage information for a specific action type in the service provider */
export interface ActionTypeLimits {
  /** Action Type */
  type: string;
  /** For the specific action type, the maximum number of actions that could be concurrently supported by the service provider */
  maximum: PositiveInteger;
  /** For the specific action type, the number of actions in use by the service provider */
  inUse?: number;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** Action Configuration data type contains the configuration settings of action configuration parameters, service requester given action Name, and service provider supported action type value */
export interface ActionConfiguration {
  /** User given name. */
  name: string;
  /** Denotes the action type. */
  type: string;
  /** Action configuration parameter settings. */
  parameters: ItemList;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** Action data type contains the configuration settings of one action instance and service provider assigned unique identifier for this action configuration. */
export interface Action {
  /** Unique Action identifier that service provider assigned to the action configuration. */
  token: ReferenceToken;
  /** Action configuration contains action type, user given action name, and configuratin parameter settings. */
  configuration: ActionConfiguration;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** Action Trigger configuration data type contains mandatory Topic Expression (Section Topic Filter in [Core Specification]), optional Message content expression (Section Message Content Filter in [Core Specification]), and set of actions to be triggered. */
export interface ActionTriggerConfiguration {
  /** Topic expression, for example, to trigger only for relays. Trigger based on event topic. */
  topicExpression: unknown;
  /** Content expression, for example, to trigger only when the relay value is on. Trigger based on content data in event. */
  contentExpression?: unknown;
  /** Reference to actions to be triggered when the conditions are satisfied. */
  actionToken?: ReferenceToken[];
  extension?: ActionTriggerConfigurationExtension;
}
export interface ActionTriggerConfigurationExtension {
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** Action Trigger data type contains the service provider assigned unique identifier for the configuration and action trigger configuration data. */
export interface ActionTrigger {
  /** Unique Action Trigger identifier that service provider assigned to the action trigger configuration. */
  token: ReferenceToken;
  /** Action Trigger Configuration */
  configuration: ActionTriggerConfiguration;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetSupportedActions {}
export interface GetActions {}
export interface CreateActions {
  /** Array of Actions to be configured on service provider */
  action?: ActionConfiguration[];
}
export interface DeleteActions {
  /** Array of tokens referencing existing Action configurations to be removed */
  token?: ReferenceToken[];
}
export interface ModifyActions {
  /** Array of Action configurations to update the existing action configurations */
  action?: Action[];
}
export interface Capabilities extends ActionEngineCapabilities {}
export interface GetActionTriggers {}
export interface CreateActionTriggers {
  /** Action Triggers to be configured */
  actionTrigger?: ActionTriggerConfiguration[];
}
export interface ModifyActionTriggers {
  /** Array of Action Trigger configurations to be updated. */
  actionTrigger?: ActionTrigger[];
}
export interface DeleteActionTriggers {
  /** Array of tokens referencing existing Action Trigger configurations to be removed */
  token?: ReferenceToken[];
}
