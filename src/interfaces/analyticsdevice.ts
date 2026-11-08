import { ReferenceToken } from './common';
import {
  AnalyticsEngineInput,
  AnalyticsEngineControl,
  VideoAnalyticsConfiguration,
  StreamSetup,
} from './onvif';

export interface Capabilities {
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface DeleteAnalyticsEngineControl {
  /** Token of the Analytics Engine Control configuration to be deleted. */
  configurationToken: ReferenceToken;
}
export interface CreateAnalyticsEngineInputs {
  /** Settings of the configurations to be created. */
  configuration: AnalyticsEngineInput[];
  forcePersistence: boolean[];
}
export interface CreateAnalyticsEngineControl {
  /** Settings of the Analytics Engine Control configuration to be created. Mode shall be set to "idle". */
  configuration: AnalyticsEngineControl;
}
export interface SetAnalyticsEngineControl {
  /** Contains the modified Analytics Engine Control configuration. */
  configuration: AnalyticsEngineControl;
  forcePersistence: boolean;
}
export interface GetAnalyticsEngineControl {
  /** Token of the requested AnalyticsEngineControl configuration. */
  configurationToken: ReferenceToken;
}
export interface GetAnalyticsEngine {
  /** Token of the requested AnalyticsEngine configuration. */
  configurationToken: ReferenceToken;
}
export interface SetVideoAnalyticsConfiguration {
  /** Contains the modified video analytics configuration. The configuration shall exist in the device. */
  configuration: VideoAnalyticsConfiguration;
  forcePersistence: boolean;
}
export interface SetAnalyticsEngineInput {
  /** Contains the modified Analytics Engine Input configuration. The configuration shall exist in the device. */
  configuration: AnalyticsEngineInput;
  forcePersistence: boolean;
}
export interface GetAnalyticsEngineInput {
  /** Token of the requested AnalyticsEngineInput configuration. */
  configurationToken: ReferenceToken;
}
export interface GetAnalyticsDeviceStreamUri {
  /** Configuration of the URI requested. */
  streamSetup: StreamSetup;
  /** Token of the AnalyticsEngineControl whose URI is requested. */
  analyticsEngineControlToken: ReferenceToken;
}
export interface GetVideoAnalyticsConfiguration {
  /** Token of the VideoAnalyticsConfiguration requested. */
  configurationToken: ReferenceToken;
}
export interface DeleteAnalyticsEngineInputs {
  /** LIst of tokens of Analytics Engine Input configurations to be deleted. */
  configurationToken: ReferenceToken[];
}
export interface GetAnalyticsState {
  /** Token of the AnalyticsEngineControl whose state information is requested. */
  analyticsEngineControlToken: ReferenceToken;
}
