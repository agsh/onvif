import {
  Capabilities,
  AnalyticsEngineInput,
  AnalyticsEngineControl,
  AnalyticsEngine,
  VideoAnalyticsConfiguration,
  StreamSetup,
  AnalyticsStateInformation,
} from './onvif';
import { ReferenceToken } from './common';
import { AnyURI } from './basics';

export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the analytics device service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface DeleteAnalyticsEngineControl {
  /** Token of the Analytics Engine Control configuration to be deleted. */
  configurationToken?: ReferenceToken;
}
export interface DeleteAnalyticsEngineControlResponse {}
export interface CreateAnalyticsEngineInputs {
  /** Settings of the configurations to be created. */
  configuration?: AnalyticsEngineInput[];
  forcePersistence?: boolean[];
}
export interface CreateAnalyticsEngineInputsResponse {
  /** Configurations containing token generated. */
  configuration?: AnalyticsEngineInput[];
}
export interface CreateAnalyticsEngineControl {
  /** Settings of the Analytics Engine Control configuration to be created. Mode shall be set to "idle". */
  configuration?: AnalyticsEngineControl;
}
export interface CreateAnalyticsEngineControlResponse {
  /** Configuration containing token generated. */
  configuration?: AnalyticsEngineInput[];
}
export interface SetAnalyticsEngineControl {
  /** Contains the modified Analytics Engine Control configuration. */
  configuration?: AnalyticsEngineControl;
  forcePersistence?: boolean;
}
export interface SetAnalyticsEngineControlResponse {}
export interface GetAnalyticsEngineControl {
  /** Token of the requested AnalyticsEngineControl configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetAnalyticsEngineControlResponse {
  /** Configuration of the AnalyticsEngineControl. */
  configuration?: AnalyticsEngineControl;
}
export interface GetAnalyticsEngineControls {}
export interface GetAnalyticsEngineControlsResponse {
  /** List of available AnalyticsEngineControl configurations. */
  analyticsEngineControls?: AnalyticsEngineControl[];
}
export interface GetAnalyticsEngine {
  /** Token of the requested AnalyticsEngine configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetAnalyticsEngineResponse {
  /** Configuration of the AnalyticsEngine. */
  configuration?: AnalyticsEngine;
}
export interface GetAnalyticsEngines {}
export interface GetAnalyticsEnginesResponse {
  /** List of available AnalyticsEngine configurations. */
  configuration?: AnalyticsEngine[];
}
export interface SetVideoAnalyticsConfiguration {
  /** Contains the modified video analytics configuration. The configuration shall exist in the device. */
  configuration?: VideoAnalyticsConfiguration;
  forcePersistence?: boolean;
}
export interface SetVideoAnalyticsConfigurationResponse {}
export interface SetAnalyticsEngineInput {
  /** Contains the modified Analytics Engine Input configuration. The configuration shall exist in the device. */
  configuration?: AnalyticsEngineInput;
  forcePersistence?: boolean;
}
export interface SetAnalyticsEngineInputResponse {}
export interface GetAnalyticsEngineInput {
  /** Token of the requested AnalyticsEngineInput configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetAnalyticsEngineInputResponse {
  /** Configuration of the AnalyticsEngineInput. */
  configuration?: AnalyticsEngineInput;
}
export interface GetAnalyticsEngineInputs {}
export interface GetAnalyticsEngineInputsResponse {
  /** List of available AnalyticsEngineInput configurations. */
  configuration?: AnalyticsEngineInput[];
}
export interface GetAnalyticsDeviceStreamUri {
  /** Configuration of the URI requested. */
  streamSetup?: StreamSetup;
  /** Token of the AnalyticsEngineControl whose URI is requested. */
  analyticsEngineControlToken?: ReferenceToken;
}
export interface GetAnalyticsDeviceStreamUriResponse {
  /** Streaming URI. */
  uri?: AnyURI;
}
export interface GetVideoAnalyticsConfiguration {
  /** Token of the VideoAnalyticsConfiguration requested. */
  configurationToken?: ReferenceToken;
}
export interface GetVideoAnalyticsConfigurationResponse {
  /** Settings of the VideoAnalyticsConfiguration. */
  configuration?: VideoAnalyticsConfiguration;
}
export interface DeleteAnalyticsEngineInputs {
  /** LIst of tokens of Analytics Engine Input configurations to be deleted. */
  configurationToken?: ReferenceToken[];
}
export interface DeleteAnalyticsEngineInputsResponse {}
export interface GetAnalyticsState {
  /** Token of the AnalyticsEngineControl whose state information is requested. */
  analyticsEngineControlToken?: ReferenceToken;
}
export interface GetAnalyticsStateResponse {
  /** Current status information. */
  state?: AnalyticsStateInformation;
}
