import { Capabilities, Receiver, ReceiverConfiguration, ReceiverMode, ReceiverStateInformation } from './onvif';
import { ReferenceToken } from './common';

export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the receiver service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetReceivers {}
export interface GetReceiversResponse {
  /** A list of all receivers that currently exist on the device. */
  receivers?: Receiver[];
}
export interface GetReceiver {
  /** The token of the receiver to be retrieved. */
  receiverToken?: ReferenceToken;
}
export interface GetReceiverResponse {
  /** The details of the receiver. */
  receiver?: Receiver;
}
export interface CreateReceiver {
  /** The initial configuration for the new receiver. */
  configuration?: ReceiverConfiguration;
}
export interface CreateReceiverResponse {
  /** The details of the receiver that was created. */
  receiver?: Receiver;
}
export interface DeleteReceiver {
  /** The token of the receiver to be deleted. */
  receiverToken?: ReferenceToken;
}
export interface DeleteReceiverResponse {}
export interface ConfigureReceiver {
  /** The token of the receiver to be configured. */
  receiverToken?: ReferenceToken;
  /** The new configuration for the receiver. */
  configuration?: ReceiverConfiguration;
}
export interface ConfigureReceiverResponse {}
export interface SetReceiverMode {
  /** The token of the receiver to be changed. */
  receiverToken?: ReferenceToken;
  /** The new receiver mode. Options available are: */
  mode?: ReceiverMode;
}
export interface SetReceiverModeResponse {}
export interface GetReceiverState {
  /** The token of the receiver to be queried. */
  receiverToken?: ReferenceToken;
}
export interface GetReceiverStateResponse {
  /** Description of the current receiver state. */
  receiverState?: ReceiverStateInformation;
}
