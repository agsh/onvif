import {
  Receiver,
  ReceiverConfiguration,
  ReceiverMode,
} from './onvif';
import { ReferenceToken } from './common';

export interface Capabilities {
  /** Indicates that the device can receive RTP multicast streams. */
  RTP_Multicast?: boolean;
  /** Indicates that the device can receive RTP/TCP streams */
  RTP_TCP?: boolean;
  /** Indicates that the device can receive RTP/RTSP/TCP streams. */
  RTP_RTSP_TCP?: boolean;
  /** The maximum number of receivers supported by the device. */
  supportedReceivers: number;
  /** The maximum allowed length for RTSP URIs (Minimum and default value is 128 octet). */
  maximumRTSPURILength?: number;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetReceiver {
  /** The token of the receiver to be retrieved. */
  receiverToken: ReferenceToken;
}
export interface CreateReceiver {
  /** The initial configuration for the new receiver. */
  configuration: ReceiverConfiguration;
}
export interface CreateReceiverResponse {
  /** The details of the receiver that was created. */
  receiver: Receiver;
}
export interface DeleteReceiver {
  /** The token of the receiver to be deleted. */
  receiverToken: ReferenceToken;
}
export interface ConfigureReceiver {
  /** The token of the receiver to be configured. */
  receiverToken: ReferenceToken;
  /** The new configuration for the receiver. */
  configuration: ReceiverConfiguration;
}
export interface SetReceiverMode {
  /** The token of the receiver to be changed. */
  receiverToken: ReferenceToken;
  /** The new receiver mode. Options available are: */
  mode: ReceiverMode;
}
export interface GetReceiverState {
  /** The token of the receiver to be queried. */
  receiverToken: ReferenceToken;
}
