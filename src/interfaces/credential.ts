import { PositiveInteger, DataEntity, Attribute } from './types';
import { Name, Description, Date } from './onvif';
import { ReferenceToken } from './common';

/**
 * The service capabilities reflect optional functionality of a service. The information is static
 * and does not change during device operation. The following capabilities are available:
 */
export interface ServiceCapabilities {
  /**
   * The maximum number of entries returned by a single Get&lt;Entity&gt;List or Get&lt;Entity&gt;
   * request. The device shall never return more than this number of entities in a single response.
   */
  maxLimit: PositiveInteger;
  /** Indicates that the device supports credential validity. */
  credentialValiditySupported: boolean;
  /**
   * Indicates that the device supports validity on the association between a credential and an
   * access profile.
   */
  credentialAccessProfileValiditySupported: boolean;
  /**
   * Indicates that the device supports both date and time value for validity. If set to false,
   * then the time value is ignored.
   */
  validitySupportsTimeValue: boolean;
  /**
   * The maximum number of credential supported by the device.
   * If set to 0, then operations using credential token are not supported.
   */
  maxCredentials: number;
  /** The maximum number of access profiles for a credential. */
  maxAccessProfilesPerCredential: PositiveInteger;
  /**
   * Indicates the device supports resetting of anti-passback violations and notifying on
   * anti-passback violations.
   */
  resetAntipassbackSupported: boolean;
  /**
   * Indicates that the client is allowed to supply the token when creating credentials.
   * To enable the use of the command SetCredential, the value must be set to true.
   */
  clientSuppliedTokenSupported?: boolean;
  /**
   * The default time period that the credential will temporary be suspended (e.g. by using
   * the wrong PIN a predetermined number of times).
   * The time period is defined as an [ISO 8601] duration string (e.g. “PT5M”).
   */
  defaultCredentialSuspensionDuration?: string;
  /** The maximum number of whitelisted credential identifiers supported by the device. */
  maxWhitelistedItems?: number;
  /** The maximum number of blacklisted credential identifiers supported by the device. */
  maxBlacklistedItems?: number;
  /**
   * A list of identifier types that the device supports. Is of type text.
   * Identifier types starting with the prefix pt: are reserved to define ONVIF-specific
   * types as defined in pt:RecognitionType. Please note that pt:REX is not an identifier
   * type. For custom defined identifier types, free text can be used.
   */
  supportedIdentifierType?: Name[];
  extension?: ServiceCapabilitiesExtension;
}
export interface ServiceCapabilitiesExtension {
  /**
   * A list of exemptions that the device supports. Supported exemptions starting with the
   * prefix pt: are reserved to define ONVIF specific exemption types and these reserved
   * exemption types shall all share "pt:&lt;Name&gt;" syntax.
   */
  supportedExemptionType?: Name[];
}
/**
 * The CredentialInfo type represents the credential as a logical object. The structure contains
 * the basic information of a specific credential instance. The device shall provide the following
 * fields for each credential.
 */
export interface CredentialInfo extends DataEntity {
  /** User readable description for the credential. It shall be up to 1024 characters. */
  description?: Description;
  /**
   * An external reference to a person holding this credential. The
   * reference is a username or used ID in an external system, such as a directory
   * service.
   */
  credentialHolderReference?: unknown;
  /**
   * The start date/time validity of the credential. If the
   * ValiditySupportsTimeValue capability is set to false, then only date is
   * supported (time is ignored).
   */
  validFrom?: Date;
  /**
   * The expiration date/time validity of the credential. If the
   * ValiditySupportsTimeValue capability is set to false, then only date is
   * supported (time is ignored).
   */
  validTo?: Date;
}
/**
 * A Credential is a physical/tangible object, a piece of knowledge, or a facet of a person's
 * physical being, that enables an individual access to a given physical facility or computer-based
 * information system. A credential holds one or more credential identifiers. To gain access one or
 * more identifiers may be required.
 */
export interface Credential extends CredentialInfo {
  /**
   * A list of credential identifier structures. At least one
   * credential identifier is required. Maximum one credential identifier structure
   * per type is allowed.
   */
  credentialIdentifier?: CredentialIdentifier[];
  /** A list of credential access profile structures. */
  credentialAccessProfile?: CredentialAccessProfile[];
  /**
   * A boolean indicating that the credential holder needs extra time to get through the door.
   * ExtendedReleaseTime will be added to ReleaseTime, and ExtendedOpenTime will be added to OpenTime
   */
  extendedGrantTime?: boolean;
  /**
   * A list of credential attributes as name value pairs. Key names
   * starting with the prefix pt: are reserved to define PACS specific attributes
   * following the "pt:&lt;Name&gt;" syntax.
   */
  attribute?: Attribute[];
  extension?: CredentialExtension;
}
export interface CredentialExtension {}
/**
 * A credential identifier is a card number, unique card information, PIN or
 * biometric information such as fingerprint, iris, vein, face recognition, that can be validated
 * in an access point.
 */
export interface CredentialIdentifier {
  /**
   * Contains the details of the credential identifier type. Is of type
   * CredentialIdentifierType.
   */
  type?: CredentialIdentifierType;
  /**
   * If set to true, this credential identifier is not considered for
   * authentication. For example if the access point requests Card plus PIN, and the credential
   * identifier of type PIN is exempted from authentication, then the access point will not prompt
   * for the PIN.
   */
  exemptedFromAuthentication?: boolean;
  /** The value of the identifier in hexadecimal representation. */
  value?: unknown;
}
/**
 * Specifies the name of credential identifier type and its format for the credential
 * value.
 */
export interface CredentialIdentifierType {
  /**
   * The name of the credential identifier type, such as pt:Card, pt:PIN,
   * etc.
   */
  name?: Name;
  /**
   * Specifies the format of the credential value for the specified identifier
   * type name.
   */
  formatType?: string;
}
/** The association between a credential and an access profile. */
export interface CredentialAccessProfile {
  /** The reference token of the associated access profile. */
  accessProfileToken?: ReferenceToken;
  /**
   * The start date/time of the validity for the association between the
   * credential and the access profile. If the ValiditySupportsTimeValue capability is set to
   * false, then only date is supported (time is ignored).
   */
  validFrom?: Date;
  /**
   * The end date/time of the validity for the association between the
   * credential and the access profile. If the ValiditySupportsTimeValue capability is set to
   * false, then only date is supported (time is ignored).
   */
  validTo?: Date;
}
/**
 * The CredentialState structure contains information about the state of the credential and
 * optionally the reason of why the credential was disabled.
 */
export interface CredentialState {
  /**
   * True if the credential is enabled or false if the credential is
   * disabled.
   */
  enabled?: boolean;
  /**
   * Predefined ONVIF reasons as mentioned in the section 5.4.2.7
   * of credential service specification document. For any other reason, free
   * text can be used.
   */
  reason?: Name;
  /**
   * A structure indicating the anti-passback state. This field shall be
   * supported if the ResetAntipassbackSupported capability is set to true.
   */
  antipassbackState?: AntipassbackState;
  extension?: CredentialStateExtension;
}
export interface CredentialStateExtension {}
/** A structure containing anti-passback related state information. */
export interface AntipassbackState {
  /** Indicates if anti-passback is violated for the credential. */
  antipassbackViolated?: boolean;
}
/** Contains information about a format type. */
export interface CredentialIdentifierFormatTypeInfo {
  /**
   * A format type supported by the device. A list of supported format types is
   * provided in [ISO 16484-5:2014-09 Annex P]. The BACnet type "CUSTOM" is not used in this
   * specification. Instead device manufacturers can define their own format types.
   */
  formatType?: string;
  /**
   * User readable description of the credential identifier format type. It
   * shall be up to 1024 characters. For custom types, it is recommended to describe how the
   * octet string is encoded (following the structure in column Authentication Factor Value
   * Encoding of [ISO 16484-5:2014-09 Annex P]).
   */
  description?: Description;
  extension?: CredentialIdentifierFormatTypeInfoExtension;
}
export interface CredentialIdentifierFormatTypeInfoExtension {}
/** Contains information about a format type. */
export interface CredentialData {
  /**
   * A format type supported by the device. A list of supported format types is
   * provided in [ISO 16484-5:2014-09 Annex P]. The BACnet type "CUSTOM" is not used in this
   * specification. Instead device manufacturers can define their own format types.
   */
  credential?: Credential;
  /**
   * User readable description of the credential identifier format type. It
   * shall be up to 1024 characters. For custom types, it is recommended to describe how the
   * octet string is encoded (following the structure in column Authentication Factor Value
   * Encoding of [ISO 16484-5:2014-09 Annex P]).
   */
  credentialState?: CredentialState;
  extension?: CredentialDataExtension;
}
export interface CredentialDataExtension {}
/**
 * A credential identifier is a card number, unique card information, PIN or biometric information
 * such as fingerprint, iris, vein, face recognition, that can be validated in an access point.
 */
export interface CredentialIdentifierItem {
  /** Contains the details of the credential identifier type. */
  type?: CredentialIdentifierType;
  /** The value of the identifier in hexadecimal representation. */
  value?: unknown;
}
/** Contains information about a format type. */
export interface FaultResponse {
  /**
   * A format type supported by the device. A list of supported format types is
   * provided in [ISO 16484-5:2014-09 Annex P]. The BACnet type "CUSTOM" is not used in this
   * specification. Instead device manufacturers can define their own format types.
   */
  token?: ReferenceToken;
  /**
   * User readable description of the credential identifier format type. It
   * shall be up to 1024 characters. For custom types, it is recommended to describe how the
   * octet string is encoded (following the structure in column Authentication Factor Value
   * Encoding of [ISO 16484-5:2014-09 Annex P]).
   */
  fault?: string;
  extension?: FaultResponseExtension;
}
export interface FaultResponseExtension {}
export interface Capabilities extends ServiceCapabilities {}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /**
   * The capability response message contains the requested credential
   * service capabilities using a hierarchical XML capability structure.
   */
  capabilities?: ServiceCapabilities;
}
export interface GetSupportedFormatTypes {
  /** Name of the credential identifier type */
  credentialIdentifierTypeName?: string;
}
export interface GetSupportedFormatTypesResponse {
  /** Identifier format type */
  formatTypeInfo?: CredentialIdentifierFormatTypeInfo[];
}
export interface GetCredentialInfo {
  /** Tokens of CredentialInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetCredentialInfoResponse {
  /** List of CredentialInfo items. */
  credentialInfo?: CredentialInfo[];
}
export interface GetCredentialInfoList {
  /**
   * Maximum number of entries to return. If not specified, less than one
   * or higher than what the device supports, the number of items is determined by the
   * device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference. If not specified,
   * entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetCredentialInfoListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of CredentialInfo items. */
  credentialInfo?: CredentialInfo[];
}
export interface GetCredentials {
  /** Token of Credentials to get */
  token?: ReferenceToken[];
}
export interface GetCredentialsResponse {
  /** List of Credential items. */
  credential?: Credential[];
}
export interface GetCredentialList {
  /**
   * Maximum number of entries to return. If not specified, less than one
   * or higher than what the device supports, the number of items is determined by the
   * device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference. If not specified,
   * entries shall start from the beginning of the dataset.
   */
  startReference?: string;
}
export interface GetCredentialListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of Credential items. */
  credential?: Credential[];
}
export interface CreateCredential {
  /** The credential to create. */
  credential?: Credential;
  /** The state of the credential. */
  state?: CredentialState;
}
export interface CreateCredentialResponse {
  /** The token of the created credential */
  token?: ReferenceToken;
}
export interface ModifyCredential {
  /** Details of the credential. */
  credential?: Credential;
}
export interface ModifyCredentialResponse {}
export interface SetCredential {
  /** Details of the credential. */
  credentialData?: CredentialData;
}
export interface SetCredentialResponse {}
export interface DeleteCredential {
  /** The token of the credential to delete. */
  token?: ReferenceToken;
}
export interface DeleteCredentialResponse {}
export interface GetCredentialState {
  /** Token of Credential */
  token?: ReferenceToken;
}
export interface GetCredentialStateResponse {
  /** State of the credential. */
  state?: CredentialState;
}
export interface EnableCredential {
  /** The token of the credential */
  token?: ReferenceToken;
  /** Reason for enabling the credential. */
  reason?: Name;
}
export interface EnableCredentialResponse {}
export interface DisableCredential {
  /** Token of the Credential */
  token?: ReferenceToken;
  /** Reason for disabling the credential */
  reason?: Name;
}
export interface DisableCredentialResponse {}
export interface ResetAntipassbackViolation {
  /** Token of the Credential */
  credentialToken?: ReferenceToken;
}
export interface ResetAntipassbackViolationResponse {}
export interface GetCredentialIdentifiers {
  /** Token of the Credential */
  credentialToken?: ReferenceToken;
}
export interface GetCredentialIdentifiersResponse {
  /** Identifier of the credential */
  credentialIdentifier?: CredentialIdentifier[];
}
export interface SetCredentialIdentifier {
  /** Token of the Credential */
  credentialToken?: ReferenceToken;
  /** Identifier of the credential */
  credentialIdentifier?: CredentialIdentifier;
}
export interface SetCredentialIdentifierResponse {}
export interface DeleteCredentialIdentifier {
  /** Token of the Credential */
  credentialToken?: ReferenceToken;
  /** Identifier type name of a credential */
  credentialIdentifierTypeName?: Name;
}
export interface DeleteCredentialIdentifierResponse {}
export interface GetCredentialAccessProfiles {
  /** Token of the Credential */
  credentialToken?: ReferenceToken;
}
export interface GetCredentialAccessProfilesResponse {
  /** Access Profiles of the credential */
  credentialAccessProfile?: CredentialAccessProfile[];
}
export interface SetCredentialAccessProfiles {
  /** Token of the Credential */
  credentialToken?: ReferenceToken;
  /** Access Profiles of the credential */
  credentialAccessProfile?: CredentialAccessProfile[];
}
export interface SetCredentialAccessProfilesResponse {}
export interface DeleteCredentialAccessProfiles {
  /** Token of the Credential */
  credentialToken?: ReferenceToken;
  /** Tokens of Access Profiles */
  accessProfileToken?: ReferenceToken[];
}
export interface DeleteCredentialAccessProfilesResponse {}
export interface GetWhitelist {
  /**
   * Maximum number of entries to return. If not specified, less than one or higher than what the device
   * supports, the number of items is determined by the device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference. If not specified, entries shall start from the
   * beginning of the dataset.
   */
  startReference?: string;
  /** Get only whitelisted credential identifiers with the specified identifier type. */
  identifierType?: string;
  /** Get only whitelisted credential identifiers with the specified identifier format type. */
  formatType?: string;
  /** Get only whitelisted credential identifiers with the specified identifier value. */
  value?: unknown;
}
export interface GetWhitelistResponse {
  /** StartReference to use in next call to get the following items. If absent, no more items to get. */
  nextStartReference?: string;
  /** The whitelisted credential identifiers matching the request criteria. */
  identifier?: CredentialIdentifierItem[];
}
export interface AddToWhitelist {
  /** The credential identifiers to be added to the whitelist. */
  identifier?: CredentialIdentifierItem[];
}
export interface AddToWhitelistResponse {}
export interface RemoveFromWhitelist {
  /** The credential identifiers to be removed from the whitelist. */
  identifier?: CredentialIdentifierItem[];
}
export interface RemoveFromWhitelistResponse {}
export interface DeleteWhitelist {}
export interface DeleteWhitelistResponse {}
export interface GetBlacklist {
  /**
   * Maximum number of entries to return. If not specified, less than one or higher than what the device
   * supports, the number of items is determined by the device.
   */
  limit?: number;
  /**
   * Start returning entries from this start reference. If not specified, entries shall start from the
   * beginning of the dataset.
   */
  startReference?: string;
  /** Get only blacklisted credential identifiers with the specified identifier type. */
  identifierType?: string;
  /** Get only blacklisted credential identifiers with the specified identifier format type. */
  formatType?: string;
  /** Get only blacklisted credential identifiers with the specified identifier value. */
  value?: unknown;
}
export interface GetBlacklistResponse {
  /** StartReference to use in next call to get the following items. If absent, no more items to get. */
  nextStartReference?: string;
  /** The blacklisted credential identifiers matching the request criteria. */
  identifier?: CredentialIdentifierItem[];
}
export interface AddToBlacklist {
  /** The credential identifiers to be added to the blacklist. */
  identifier?: CredentialIdentifierItem[];
}
export interface AddToBlacklistResponse {}
export interface RemoveFromBlacklist {
  /** The credential identifiers to be removed from the blacklist. */
  identifier?: CredentialIdentifierItem[];
}
export interface RemoveFromBlacklistResponse {}
export interface DeleteBlacklist {}
export interface DeleteBlacklistResponse {}
