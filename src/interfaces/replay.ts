import { FloatList, StreamSetup, ReplayConfiguration } from './onvif';
import { AnyURI } from './basics';
import { ReferenceToken } from './common';

export interface Capabilities {
  /** Indicator that the Device supports reverse playback as defined in the ONVIF Streaming Specification. */
  reversePlayback?: boolean;
  /** The list contains two elements defining the minimum and maximum valid values supported as session timeout in seconds. */
  sessionTimeoutRange?: FloatList;
  /** Indicates support for RTP/RTSP/TCP. */
  RTP_RTSP_TCP?: boolean;
  /** If playback streaming over WebSocket is supported, this shall return the RTSP WebSocket URI as described in Streaming Specification Section 5.1.1.5. */
  RTSPWebSocketUri?: AnyURI;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetReplayUri {
  /** Specifies the connection parameters to be used for the stream. The URI that is returned may depend on these parameters. */
  streamSetup: StreamSetup;
  /** The identifier of the recording to be streamed. */
  recordingToken: ReferenceToken;
}
export interface SetReplayConfiguration {
  /** Description of the new replay configuration parameters. */
  configuration: ReplayConfiguration;
}
