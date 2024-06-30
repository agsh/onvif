import { FloatList, Capabilities, StreamSetup, ReplayConfiguration } from './onvif';
import { AnyURI } from './basics';
import { ReferenceToken } from './common';

export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the replay service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetReplayUri {
  /** Specifies the connection parameters to be used for the stream. The URI that is returned may depend on these parameters. */
  streamSetup?: StreamSetup;
  /** The identifier of the recording to be streamed. */
  recordingToken?: ReferenceToken;
}
export interface GetReplayUriResponse {
  /** The URI to which the client should connect in order to stream the recording. */
  uri?: AnyURI;
}
export interface SetReplayConfiguration {
  /** Description of the new replay configuration parameters. */
  configuration?: ReplayConfiguration;
}
export interface SetReplayConfigurationResponse {}
export interface GetReplayConfiguration {}
export interface GetReplayConfigurationResponse {
  /** The current replay configuration parameters. */
  configuration?: ReplayConfiguration;
}
