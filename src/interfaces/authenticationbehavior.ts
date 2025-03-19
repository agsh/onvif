import { PositiveInteger, DataEntity } from './types';
import { StringList, Name, Description } from './onvif';
import { ReferenceToken } from './common';

/**
 * The service capabilities reflect optional functionality of a service. The information is static
 * and does not change during device operation. The following capabilities are available:
 */
export interface ServiceCapabilities {
  /**
   * The maximum number of entries returned by a single Get&lt;Entity&gt;List or Get&lt;Entity&gt;
   * request.
   * The device shall never return more than this number of entities in a single response.
   */
  maxLimit: PositiveInteger;
  /**
   * Indicates the maximum number of authentication profiles the device supports. The device
   * shall
   * support at least one authentication profile.
   */
  maxAuthenticationProfiles: PositiveInteger;
  /**
   * Indicates the maximum number of authentication policies per authentication profile supported
   * by the device.
   */
  maxPoliciesPerAuthenticationProfile: PositiveInteger;
  /**
   * Indicates the maximum number of security levels the device supports. The device shall
   * support at least one
   * security level.
   */
  maxSecurityLevels: PositiveInteger;
  /**
   * Indicates the maximum number of recognition groups per security level supported by the
   * device.
   */
  maxRecognitionGroupsPerSecurityLevel: PositiveInteger;
  /**
   * Indicates the maximum number of recognition methods per recognition group supported by the
   * device.
   */
  maxRecognitionMethodsPerRecognitionGroup: PositiveInteger;
  /**
   * Indicates that the client is allowed to supply the token when creating authentication
   * profiles and
   * security levels. To enable the use of the commands SetAuthenticationProfile and
   * SetSecurityLevel, the
   * value must be set to true.
   */
  clientSuppliedTokenSupported?: boolean;
  /**
   * A list of supported authentication modes (including custom modes).
   * This field is optional, and when omitted, the client shall assume that the
   * device supports "pt:SingleCredential" only.
   */
  supportedAuthenticationModes?: StringList;
}
/**
 * The AuthenticationProfileInfo structure contains information of a specific authentication
 * profile instance.
 */
export interface AuthenticationProfileInfo extends DataEntity {
  /** A user readable name. It shall be up to 64 characters. */
  name?: Name;
  /**
   * User readable description for the access profile. It shall be up
   * to 1024 characters.
   */
  description?: Description;
}
/**
 * The AuthenticationProfile structure shall include all properties of the
 * AuthenticationProfileInfo structure
 * and also a default security level, an authentication mode, and a list of AuthenticationProfile
 * instances.
 */
export interface AuthenticationProfile extends AuthenticationProfileInfo {
  /**
   * The default security level is used if none of the authentication policies
   * has a schedule covering the time of access (or if no authentication policies
   * are defined).
   */
  defaultSecurityLevelToken?: ReferenceToken;
  /**
   * Each authentication policy associates a security level with a schedule (during
   * which the specified security level will be required at the access point).
   */
  authenticationPolicy?: AuthenticationPolicy[];
  extension?: AuthenticationProfileExtension;
}
export interface AuthenticationProfileExtension {}
/**
 * The authentication policy is an association of a security level and a schedule. It defines when
 * a certain security level is required to grant access to a credential holder. Each security
 * level is given a unique priority. If authentication policies have overlapping schedules,
 * the security level with the highest priority is used.
 */
export interface AuthenticationPolicy {
  /** Reference to the schedule used by the authentication policy. */
  scheduleToken?: ReferenceToken;
  /**
   * A list of security level constraint structures defining the conditions
   * for what security level to use.
   * Minimum one security level constraint must be specified.
   */
  securityLevelConstraint?: SecurityLevelConstraint[];
  extension?: AuthenticationPolicyExtension;
}
export interface AuthenticationPolicyExtension {}
/**
 * This structure defines what security level should be active depending on the state of the
 * schedule.
 */
export interface SecurityLevelConstraint {
  /**
   * Corresponds to the Active field in the ScheduleState structure in
   * [ONVIF Schedule Service Specification].
   */
  activeRegularSchedule?: boolean;
  /**
   * Corresponds to the SpecialDay field in the ScheduleState structure in
   * [ONVIF Schedule Service Specification].
   * This field will be ignored if the device do not support special days.
   */
  activeSpecialDaySchedule?: boolean;
  /**
   * Defines the mode of authentication. Authentication modes starting with the prefix
   * pt: are reserved to define ONVIF-specific authentication modes. For custom defined
   * authentication modes, free text can be used.
   * The following authentication modes are defined by ONVIF:
   * pt:SingleCredential - Normal mode where only one credential holder is required to be granted access.
   * pt:DualCredential - Two credential holders are required to be granted access
   */
  authenticationMode?: Name;
  /** Reference to the security level used by the authentication policy. */
  securityLevelToken?: ReferenceToken;
  extension?: SecurityLevelConstraintExtension;
}
export interface SecurityLevelConstraintExtension {}
/**
 * Recognition is the action of identifying authorized users requesting access by the comparison of
 * presented
 * credential data with recorded credential data. A recognition method is either memorized,
 * biometric or held
 * within a physical credential. A recognition type is either a recognition method or a physical
 * input such as
 * a request-to-exit button.
 */
export interface RecognitionMethod {
  /**
   * The requested type of recognition. Is of type text.
   * Recognition types starting with the prefix pt: are reserved to define
   * ONVIF-specific types as defined in pt:RecognitionType. For custom defined
   * identifier types, free text can be used.
   */
  recognitionType?: string;
  /**
   * The order value defines when this recognition method will be requested in relation
   * to the other recognition methods in the same security level. A lower number indicates
   * that the recognition method will be requested before recognition methods with a higher number.
   */
  order?: number;
  extension?: RecognitionMethodExtension;
}
export interface RecognitionMethodExtension {}
/**/
export interface RecognitionGroup {
  /** A list of recognition methods to request for at the access point. */
  recognitionMethod?: RecognitionMethod[];
  extension?: RecognitionGroupExtension;
}
export interface RecognitionGroupExtension {}
/** The SecurityLevelInfo structure contains information of a specific security level instance. */
export interface SecurityLevelInfo extends DataEntity {
  /** A user readable name. It shall be up to 64 characters. */
  name?: Name;
  /**
   * A higher number indicates that the security level is considered more secure
   * than security levels with lower priorities. The priority is used when an
   * authentication profile have overlapping schedules with different security
   * levels. When an access point is accessed, the authentication policies are
   * walked through in priority order (highest priority first). When a schedule is
   * found covering the time of access, the associated security level is used and
   * processing stops. Two security levels cannot have the same priority.
   */
  priority?: number;
  /**
   * User readable description for the access profile. It shall be up
   * to 1024 characters.
   */
  description?: Description;
}
/**
 * The SecurityLevel structure shall include all properties of the SecurityLevelInfo structure and
 * also a set
 * of recognition groups.
 * The recognition groups are used to define a logical OR between the groups. Each recognition
 * group consists
 * of one or more recognition methods.
 */
export interface SecurityLevel extends SecurityLevelInfo {
  /**
   * The recognition groups are used to define a logical OR between the groups. Each
   * recognition group consists of one or more recognition methods.
   */
  recognitionGroup?: RecognitionGroup[];
  extension?: SecurityLevelExtension;
}
export interface SecurityLevelExtension {}
export interface Capabilities extends ServiceCapabilities {}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /**
   * The capability response message contains the requested access rules
   * service capabilities using a hierarchical XML capability structure.
   */
  capabilities?: ServiceCapabilities;
}
export interface GetAuthenticationProfileInfo {
  /** Tokens of AuthenticationProfileInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetAuthenticationProfileInfoResponse {
  /** List of AuthenticationProfileInfo items. */
  authenticationProfileInfo?: AuthenticationProfileInfo[];
}
export interface GetAuthenticationProfileInfoList {
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
export interface GetAuthenticationProfileInfoListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of AuthenticationProfileInfo items. */
  authenticationProfileInfo?: AuthenticationProfileInfo[];
}
export interface GetAuthenticationProfiles {
  /** Tokens of AuthenticationProfile items to get. */
  token?: ReferenceToken[];
}
export interface GetAuthenticationProfilesResponse {
  /** List of AuthenticationProfile items. */
  authenticationProfile?: AuthenticationProfile[];
}
export interface GetAuthenticationProfileList {
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
export interface GetAuthenticationProfileListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of AuthenticationProfile items. */
  authenticationProfile?: AuthenticationProfile[];
}
export interface CreateAuthenticationProfile {
  /** The AuthenticationProfile to create. */
  authenticationProfile?: AuthenticationProfile;
}
export interface CreateAuthenticationProfileResponse {
  /** The Token of created AuthenticationProfile. */
  token?: ReferenceToken;
}
export interface SetAuthenticationProfile {
  /** The AuthenticationProfile to create or modify. */
  authenticationProfile?: AuthenticationProfile;
}
export interface SetAuthenticationProfileResponse {}
export interface ModifyAuthenticationProfile {
  /** The AuthenticationProfile to modify. */
  authenticationProfile?: AuthenticationProfile;
}
export interface ModifyAuthenticationProfileResponse {}
export interface DeleteAuthenticationProfile {
  /** The token of the AuthenticationProfile to delete. */
  token?: ReferenceToken;
}
export interface DeleteAuthenticationProfileResponse {}
export interface GetSecurityLevelInfo {
  /** Tokens of SecurityLevelInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetSecurityLevelInfoResponse {
  /** List of SecurityLevelInfo items. */
  securityLevelInfo?: SecurityLevelInfo[];
}
export interface GetSecurityLevelInfoList {
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
export interface GetSecurityLevelInfoListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of SecurityLevelInfo items. */
  securityLevelInfo?: SecurityLevelInfo[];
}
export interface GetSecurityLevels {
  /** Tokens of SecurityLevel items to get. */
  token?: ReferenceToken[];
}
export interface GetSecurityLevelsResponse {
  /** List of SecurityLevel items. */
  securityLevel?: SecurityLevel[];
}
export interface GetSecurityLevelList {
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
export interface GetSecurityLevelListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of SecurityLevel items. */
  securityLevel?: SecurityLevel[];
}
export interface CreateSecurityLevel {
  /** The SecurityLevel to create. */
  securityLevel?: SecurityLevel;
}
export interface CreateSecurityLevelResponse {
  /** The Token of created SecurityLevel. */
  token?: ReferenceToken;
}
export interface SetSecurityLevel {
  /** The SecurityLevel to create or modify. */
  securityLevel?: SecurityLevel;
}
export interface SetSecurityLevelResponse {}
export interface ModifySecurityLevel {
  /** The SecurityLevel to modify. */
  securityLevel?: SecurityLevel;
}
export interface ModifySecurityLevelResponse {}
export interface DeleteSecurityLevel {
  /** The token of the SecurityLevel to delete. */
  token?: ReferenceToken;
}
export interface DeleteSecurityLevelResponse {}
