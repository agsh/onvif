import { StringList, Capabilities } from './onvif';
import { AnyURI } from './basics';
import { ReferenceToken } from './common';

export type Protocols = 'https' | 'wss';
export type AuthorizationModes = 'mTLS' | 'AccessToken';
export type ConnectionStatus = 'Offline' | 'Connecting' | 'Connected';
export interface Configuration {
  /** Uniform resource locator by which the remote client can be reached. */
  remoteAddress: AnyURI;
  /** ID of the certificate to be used for client authentication. */
  certificateID?: string;
  /** Authorization level that will be assigned to the uplink connection. */
  userLevel: string;
  /** Current connection status (see tup:ConnectionStatus for possible values). */
  status?: string;
  /**
   * CertPathValidationPolicyID used to validate the uplink server certificate. If not configured, server certificate validation
   * behavior is undefined and the device may either apply a vendor specific default validation policy or skip validation at all.
   */
  certPathValidationPolicyID?: string;
  /** AuthorizationServer token referring to the server that provides JWT tokens to authorize with the uplink server. */
  authorizationServer?: ReferenceToken;
  /** Optional user readable error information (readonly). */
  error?: string;
  [key: string]: unknown;
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the uplink service is returned in the Capabilities element. */
  capabilities: Capabilities;
}
export interface GetUplinks {}
export interface GetUplinksResponse {
  /** List of configured uplinks. */
  configuration?: Configuration[];
}
export interface SetUplink {
  /** Configuration to be added or modified. */
  configuration: Configuration;
}
export interface SetUplinkResponse {}
export interface DeleteUplink {
  /** Uniform resource locator of the configuration to be deleted. */
  remoteAddress: AnyURI;
}
export interface DeleteUplinkResponse {}
