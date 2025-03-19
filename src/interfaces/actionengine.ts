import { ItemListDescription, ItemList } from './onvif';
import { AnyURI } from './basics';
import { PositiveInteger } from './types';
import { ReferenceToken } from './common';

export type AddressFormatType = 'hostname' | 'ipv4' | 'ipv6' | 'Extended';
export type EMailAuthenticationMode = 'none' | 'SMTP' | 'POPSMTP' | 'Extended';
export type HttpProtocolType = 'http' | 'https' | 'Extended';
export type HttpAuthenticationMethodType = 'none' | 'MD5Digest' | 'Extended';
export type FileSuffixType = 'none' | 'sequence' | 'dateTime' | 'Extended';
/** Describes the configuration parameters of an action. */
export interface ActionConfigDescription {
  /** Action type name */
  name: unknown;
  /** Action configuration parameter descriptions */
  parameterDescription?: ItemListDescription;
}
/** SupportedActions data structure lists the available action types that service provider supports. For each action type, data structure contains the action configuration parameters. */
export interface SupportedActions {
  /** Lists the location of all schemas that are referenced in the supported actions. If the action descriptions reference data types in the ONVIF schema file,the ONVIF schema file MUST be explicitly listed. */
  actionContentSchemaLocation?: AnyURI[];
  /** List of actions supported by Action Engine Service provider. */
  actionDescription?: ActionConfigDescription[];
  extension?: SupportedActionsExtension;
}
export interface SupportedActionsExtension {}
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
export interface ActionEngineCapabilitiesExtension {}
/** ActionTypeLimits data structure contains maximum and current usage information for a specific action type in the service provider */
export interface ActionTypeLimits {
  /** Action Type */
  type: unknown;
  /** For the specific action type, the maximum number of actions that could be concurrently supported by the service provider */
  maximum: PositiveInteger;
  /** For the specific action type, the number of actions in use by the service provider */
  inUse?: number;
}
/** Action Configuration data type contains the configuration settings of action configuration parameters, service requester given action Name, and service provider supported action type value */
export interface ActionConfiguration {
  /** User given name. */
  name: string;
  /** Denotes the action type. */
  type: unknown;
  /** Action configuration parameter settings. */
  parameters?: ItemList;
}
/** Action data type contains the configuration settings of one action instance and service provider assigned unique identifier for this action configuration. */
export interface Action {
  /** Unique Action identifier that service provider assigned to the action configuration. */
  token: ReferenceToken;
  /** Action configuration contains action type, user given action name, and configuratin parameter settings. */
  configuration?: ActionConfiguration;
}
/** Action Trigger configuration data type contains mandatory Topic Expression (Section Topic Filter in [Core Specification]), optional Message content expression (Section Message Content Filter in [Core Specification]), and set of actions to be triggered. */
export interface ActionTriggerConfiguration {
  /** Topic expression, for example, to trigger only for relays. Trigger based on event topic. */
  topicExpression?: unknown;
  /** Content expression, for example, to trigger only when the relay value is on. Trigger based on content data in event. */
  contentExpression?: unknown;
  /** Reference to actions to be triggered when the conditions are satisfied. */
  actionToken?: ReferenceToken[];
  extension?: ActionTriggerConfigurationExtension;
}
export interface ActionTriggerConfigurationExtension {}
/** Action Trigger data type contains the service provider assigned unique identifier for the configuration and action trigger configuration data. */
export interface ActionTrigger {
  /** Unique Action Trigger identifier that service provider assigned to the action trigger configuration. */
  token: ReferenceToken;
  /** Action Trigger Configuration */
  configuration?: ActionTriggerConfiguration;
}
export interface onvif_action {
  actionDescription?: ActionConfigDescription[];
}
export interface EMailServerConfiguration {
  /** SMTP EMail Server configuration */
  SMTPConfig?: SMTPConfig;
  /** POP EMail Server configuration */
  POPConfig?: POPConfig;
  /** Credentials configuration */
  authenticationConfig?: AuthenticationConfig;
}
export interface SMTPConfig {
  /**/
  portNo?: PositiveInteger;
  /** Destination SMTP Address configuration */
  hostAddress?: HostAddress;
}
export interface POPConfig {
  /** Destination POP Server Address configuration */
  hostAddress?: HostAddress;
}
export interface HostAddress {
  /** IP Address format type such as IPv4 or IPv6 */
  formatType: AddressFormatType;
  /** IP Address */
  value?: string;
}
export interface UserCredentials {
  /** Username */
  username?: string;
  /** Password */
  password?: unknown;
  extension?: UserCredentialsExtension;
}
export interface UserCredentialsExtension {}
export interface AuthenticationConfig {
  /** Email server authentication mode */
  mode: EMailAuthenticationMode;
  /** Username-password */
  user?: UserCredentials;
}
export interface EMailReceiverConfiguration {
  /** Configuration for E-mail TO */
  TO?: string[];
  /** Configuration for E-mail CC */
  CC?: string[];
  /**/
  extension?: EMailReceiverConfigurationExtension;
}
export interface EMailReceiverConfigurationExtension {}
export interface EMailAttachmentConfiguration {
  /**/
  fileName?: string;
  /**/
  doSuffix?: FileSuffixType;
  /**/
  extension?: EMailAttachmentConfigurationExtension;
}
export interface EMailAttachmentConfigurationExtension {}
export interface EMailBodyTextConfiguration {
  /** Whether content of E-mail message contains event data */
  includeEvent?: boolean;
  /**/
  type?: string;
}
export interface MediaSource {
  /** MediaSource profile reference token */
  profileToken?: ReferenceToken;
}
export interface HttpHostConfigurations {
  /** Destination HTTP Server configuration */
  httpDestination?: HttpDestinationConfiguration[];
  /**/
  extension?: HttpHostConfigurationsExtension;
}
export interface HttpHostConfigurationsExtension {}
export interface HttpDestinationConfiguration {
  /** URI for POST Message destination */
  uri?: string;
  /** HTTP/HTTPS protocol selection (default is http) */
  protocol?: HttpProtocolType;
  /** Destination HTTP Server address configuration */
  hostAddress?: HttpHostAddress;
  /** User Credentials configuration for destination HTTP Server */
  httpAuthentication?: HttpAuthenticationConfiguration;
  /**/
  extension?: HttpDestinationConfigurationExtension;
}
export interface HttpDestinationConfigurationExtension {}
export interface HttpAuthenticationConfiguration {
  /** HTTP Authentication Method */
  method?: HttpAuthenticationMethodType;
  /** User credentials */
  user?: UserCredentials;
  /**/
  extension?: HttpAuthenticationConfigurationExtension;
}
export interface HttpAuthenticationConfigurationExtension {}
export interface HttpHostAddress {
  /** IPv4 or IPv6 */
  formatType: AddressFormatType;
  /** Port Number if different from 80 */
  portNo?: number;
  /** Destination HTTP Server IP Address */
  value?: string;
}
export interface PostContentConfiguration {
  /** MediaSource reference when the media is attached to POST message */
  mediaReference?: MediaSource;
  /** Configuration for POST Message content */
  postBody?: PostBodyConfiguration;
}
export interface PostBodyConfiguration {
  /**/
  formData?: string;
  /** Whether include event into POST message */
  includeEvent?: boolean;
  /** Whether attach media into POST message */
  includeMedia?: boolean;
}
export interface FtpHostConfigurations {
  /** FTP Action destination configuration */
  ftpDestination?: FtpDestinationConfiguration[];
  /**/
  extension?: FtpHostConfigurationsExtension;
}
export interface FtpHostConfigurationsExtension {}
export interface FtpDestinationConfiguration {
  /** FTP Server IP Address */
  hostAddress?: FtpHostAddress;
  /** Upload Directory Path */
  uploadPath?: string;
  /** User credentials confguration for target FTP Server */
  ftpAuthentication?: FtpAuthenticationConfiguration;
  extension?: FtpDestinationConfigurationExtension;
}
export interface FtpDestinationConfigurationExtension {}
export interface FtpAuthenticationConfiguration {
  /** User Credentials */
  user?: UserCredentials;
  extension?: FtpAuthenticationConfigurationExtension;
}
export interface FtpAuthenticationConfigurationExtension {}
export interface FtpHostAddress {
  /** IPv4 or IPv6 */
  formatType: AddressFormatType;
  /** Port Number */
  portNo?: number;
  /** FTP Server IP Address */
  value?: string;
}
export interface FtpContent {
  /**/
  ftpContentConfig?: FtpContentConfiguration;
}
export interface FtpFileNameConfigurations {
  /** Name of file */
  file_name?: string;
  /** Suffix of file */
  suffix?: FileSuffixType;
}
export interface FtpContentConfiguration {
  /** Type of FTP Upload action */
  type: string;
}
export interface FtpContentConfigurationUploadImages {
  /** Upload Image action; how long? */
  howLong?: string;
  /** Upload Image action; sample interval? */
  sampleInterval?: string;
  /** Upload Image action; name of destination file */
  fileName?: FtpFileNameConfigurations;
}
export interface FtpContentConfigurationUploadFile {
  /** Name of source file */
  sourceFileName?: string;
  /** Name of destination file */
  destinationFileName?: string;
}
export interface SMSProviderConfiguration {
  /** SMS Provider's URL */
  providerURL?: AnyURI;
  /** Username and password */
  user?: UserCredentials;
}
export interface SMSSenderConfiguration {
  /** Sender's e-mail address */
  EMail?: string;
}
export interface SMSMessage {
  /** Text Message */
  text?: string;
}
export interface TriggeredRecordingConfiguration {
  /** Length of recording time before the triggering event */
  preRecordDuration?: string;
  /** Recording after alarm recording duration */
  postRecordDuration?: string;
  /** Record duration */
  recordDuration?: string;
  /** Recording frame rate */
  recordFrameRate?: PositiveInteger;
  /** Whether Audio recording on/off */
  doRecordAudio?: boolean;
}
export interface RecordingActionConfiguration {
  /** Recording configuration */
  recordConfig?: TriggeredRecordingConfiguration;
}
export interface GetSupportedActionsResponse {
  /** Array of supported Action types */
  supportedActions?: SupportedActions;
}
export interface GetActionsResponse {
  /** Array of current Action configurations */
  action?: Action[];
}
export interface CreateActions {
  /** Array of Actions to be configured on service provider */
  action?: ActionConfiguration[];
}
export interface CreateActionsResponse {
  /** Array of configured Actions with service provider assigned unique identifiers */
  action?: Action[];
}
export interface DeleteActions {
  /** Array of tokens referencing existing Action configurations to be removed */
  token?: ReferenceToken[];
}
export interface ModifyActions {
  /** Array of Action configurations to update the existing action configurations */
  action?: Action[];
}
export interface GetServiceCapabilitiesResponse {
  capabilities?: ActionEngineCapabilities;
}
export interface Capabilities extends ActionEngineCapabilities {}
export interface GetActionTriggersResponse {
  /** Array of current Action Trigger configurations */
  actionTrigger?: ActionTrigger[];
}
export interface CreateActionTriggers {
  /** Action Triggers to be configured */
  actionTrigger?: ActionTriggerConfiguration[];
}
export interface CreateActionTriggersResponse {
  /** Returns configured Action Triggers with service provider assigned unique identifers */
  actionTrigger?: ActionTrigger[];
}
export interface ModifyActionTriggers {
  /** Array of Action Trigger configurations to be updated. */
  actionTrigger?: ActionTrigger[];
}
export interface DeleteActionTriggers {
  /** Array of tokens referencing existing Action Trigger configurations to be removed */
  token?: ReferenceToken[];
}
