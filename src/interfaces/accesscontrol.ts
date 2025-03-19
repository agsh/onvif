import { DataEntity } from './types';
import { Name, Description, StringList } from './onvif';
import { ReferenceToken } from './common';

/** The Decision enumeration represents a choice of two available options for an access request: */
export type Decision = 'Granted' | 'Denied';
/**
 * Non-normative enum that describes the various reasons for denying access.
 * The following strings shall be used for the reason field:
 */
export type DenyReason =
  | 'CredentialNotEnabled'
  | 'CredentialNotActive'
  | 'CredentialExpired'
  | 'InvalidPIN'
  | 'NotPermittedAtThisTime'
  | 'Unauthorized'
  | 'Other';
/**
 * Non-normative enumeration that describes the ONVIF defined feedback types.
 * These types are used in string fields where extendibility is desired.
 * Strings starting with the prefix pt: are reserved to define ONVIF-specific types.
 * For custom defined feedback types, free text can be used.
 * The following types are defined by ONVIF:
 */
export type FeedbackType =
  | 'pt:Disabled'
  | 'pt:Idle'
  | 'pt:DoorLocked'
  | 'pt:DoorUnlocked'
  | 'pt:DoorOpenTooLong'
  | 'pt:DoorPreAlarmWarning'
  | 'pt:RequireIdentifier'
  | 'pt:TextMessage'
  | 'pt:Processing'
  | 'pt:RetryIdentifier'
  | 'pt:AccessGranted'
  | 'pt:AccessDenied'
  | 'pt:Ok'
  | 'pt:Fault'
  | 'pt:Warning'
  | 'pt:Alarm';
/**
 * The service capabilities reflect optional functionality of a service.
 * The information is static and does not change during device operation.
 * The following capabilities are available:
 */
export interface ServiceCapabilities {
  /**
   * The maximum number of entries returned by a single Get&lt;Entity&gt;List or
   * Get&lt;Entity&gt; request.
   * The device shall never return more than this number of entities in a single response.
   */
  maxLimit: number;
  /** Indicates the maximum number of access points supported by the device. */
  maxAccessPoints?: number;
  /** Indicates the maximum number of areas supported by the device. */
  maxAreas?: number;
  /**
   * Indicates that the client is allowed to supply the token when creating access
   * points and areas.
   * To enable the use of the commands SetAccessPoint and SetArea, the value must be set to true.
   */
  clientSuppliedTokenSupported?: boolean;
  /**
   * Indicates that the client can perform CRUD operations (create, read, update and delete)
   * on access points. To enable the use of the commands GetAccessPoints, GetAccessPointList,
   * CreateAccessPoint, ModifyAccessPoint, DeleteAccessPoint, SetAccessPointAuthenticationProfile
   * and DeleteAccessPointAuthenticationProfile, the value must be set to true.
   */
  accessPointManagementSupported?: boolean;
  /**
   * Indicates that the client can perform CRUD operations (create, read, update and delete)
   * on areas. To enable the use of the commands GetAreas, GetAreaList, CreateArea, ModifyArea
   * and DeleteArea, the value must be set to true.
   */
  areaManagementSupported?: boolean;
}
/** Used as extension base for AccessPointInfo. */
export interface AccessPointInfoBase extends DataEntity {
  /** A user readable name. It shall be up to 64 characters. */
  name?: Name;
  /**
   * Optional user readable description for the AccessPoint. It shall
   * be up to 1024 characters.
   */
  description?: Description;
  /** Optional reference to the Area from which access is requested. */
  areaFrom?: ReferenceToken;
  /** Optional reference to the Area to which access is requested. */
  areaTo?: ReferenceToken;
  /**
   * Optional entity type; if missing, a Door type as defined by [ONVIF Door Control
   * Service Specification] should be assumed. This can also be represented by the
   * QName value "tdc:Door" – where tdc is the namespace of the door control service:
   * "http://www.onvif.org/ver10/doorcontrol/wsdl". This field is provided for future
   * extensions; it will allow an access point being extended to cover entity types
   * other than doors as well.
   */
  entityType?: unknown;
  /**
   * Reference to the entity used to control access; the entity type
   * may be specified by the optional EntityType field explained below but is
   * typically a Door.
   */
  entity?: ReferenceToken;
}
/**
 * The AccessPointInfo structure contains basic information about an access point instance.
 * An access point defines an entity a credential can be granted or denied access to.
 * The AccessPointInfo structure provides basic information on how access is controlled
 * in one direction for a door (from which area to which area).
 * Multiple access points may cover the same door. A typical case is one access point for
 * entry and another for exit, both referencing the same door.
 */
export interface AccessPointInfo extends AccessPointInfoBase {
  /** The capabilities for the AccessPoint. */
  capabilities?: AccessPointCapabilities;
}
/**
 * The AccessPoint structure shall include all properties of the AccessPointInfo structure,
 * a reference to an authentication profile instance, and optionally a number of input and output devices.
 */
export interface AccessPoint extends AccessPointInfo {
  /**
   * A reference to an authentication profile which defines the authentication
   * behavior of the access point.
   */
  authenticationProfileToken?: ReferenceToken;
  extension?: AccessPointExtension;
}
export interface AccessPointExtension {}
/**
 * The AccessPoint capabilities reflect optional functionality of a particular physical entity.
 * Different AccessPoint instances may have different set of capabilities. This information may
 * change during device operation, e.g. if hardware settings are changed.
 * The following capabilities are available:
 */
export interface AccessPointCapabilities {
  /**
   * Indicates whether or not this AccessPoint instance supports EnableAccessPoint
   * and DisableAccessPoint commands.
   */
  disableAccessPoint: boolean;
  /** Indicates whether or not this AccessPoint instance supports generation of duress events. */
  duress?: boolean;
  /**
   * Indicates whether or not this AccessPoint has a REX switch or other input that
   * allows anonymous access.
   */
  anonymousAccess?: boolean;
  /**
   * Indicates whether or not this AccessPoint instance supports generation of
   * AccessTaken and AccessNotTaken events. If AnonymousAccess and AccessTaken are both true, it
   * indicates that the Anonymous versions of AccessTaken and AccessNotTaken are supported.
   */
  accessTaken?: boolean;
  /**
   * Indicates whether or not this AccessPoint instance supports the
   * ExternalAuthorization operation and the generation of Request events. If AnonymousAccess and
   * ExternalAuthorization are both true, it indicates that the Anonymous version is supported as
   * well.
   */
  externalAuthorization?: boolean;
  /**
   * A list of recognition types that the device supports. This field is only relevant for devices
   * that are not aware of security levels (see [ONVIF Authentication Behavior Service Specification]).
   * Please note that when an access point is updated, then any previously supported recognition types
   * are replaced with the new list.
   * Recognition types starting with the prefix pt: are reserved to define ONVIF-specific
   * types as defined in pt:RecognitionType. For custom defined identifier types, free text
   * can be used.
   */
  supportedRecognitionTypes?: StringList;
  /**
   * Indicates whether or not this access point supports the AccessControl/Request/Identifier
   * event to request external authorization.
   * Identfier access requires that ExternalAuthorization is set to true.
   * The IdentifierAccess capability is typically enabled for devices that do not have any
   * knowledge of credential tokens. When IdentifierAccess is set to true then the device
   * must support the identifier events.
   */
  identifierAccess?: boolean;
  /**
   * List of supported feedback types. Feedback types starting with the prefix pt:
   * are reserved to define ONVIF-specific types as defined in tac:FeedbackType.
   * For custom defined feedback types, free text can be used.
   */
  supportedFeedbackTypes?: StringList;
  /**
   * A list of security level tokens that this access point supports.
   * See [Authentication Behavior Service Specification].
   * This field is optional, and if omitted, the device cannot support multi-factor
   * authentication for this access point.
   * Please note that when an access point is updated, then any previously supported
   * security levels are replaced with the new list.
   */
  supportedSecurityLevels?: ReferenceToken[];
  extension?: SupportedSecurityLevelsExtension;
}
export interface SupportedSecurityLevelsExtension {}
/** Basic information about an Area. Used as extension base. */
export interface AreaInfoBase extends DataEntity {
  /** User readable name. It shall be up to 64 characters. */
  name?: Name;
  /**
   * User readable description for the Area. It shall be up to 1024
   * characters.
   */
  description?: Description;
}
/**
 * The AreaInfo structure contains basic information about an Area.
 * An ONVIF compliant device shall provide the following fields for each Area:
 */
export interface AreaInfo extends AreaInfoBase {}
/**
 * The Area structure shall include all properties of the AreaInfo structure and optionally
 * a parent area token, an OccupancyControl structure and/or an Antipassback structure.
 */
export interface Area extends AreaInfo {
  extension?: AreaExtension;
}
export interface AreaExtension {}
/**
 * The AccessPointState contains state information for an AccessPoint.
 * An ONVIF compliant device shall provide the following fields for each AccessPoint instance:
 */
export interface AccessPointState {
  /**
   * Indicates that the AccessPoint is enabled. By default this field value
   * shall be True, if the DisableAccessPoint capabilities is not supported.
   */
  enabled?: boolean;
}
export interface Capabilities extends ServiceCapabilities {}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /**
   * The capability response message contains the requested Access Control
   * service capabilities using a hierarchical XML capability structure.
   */
  capabilities?: ServiceCapabilities;
}
export interface GetAccessPointInfoList {
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
export interface GetAccessPointInfoListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of AccessPointInfo items. */
  accessPointInfo?: AccessPointInfo[];
}
export interface GetAccessPointInfo {
  /** Tokens of AccessPointInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetAccessPointInfoResponse {
  /** List of AccessPointInfo items. */
  accessPointInfo?: AccessPointInfo[];
}
export interface GetAccessPointList {
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
export interface GetAccessPointListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of AccessPoint items. */
  accessPoint?: AccessPoint[];
}
export interface GetAccessPoints {
  /** Tokens of AccessPoint items to get. */
  token?: ReferenceToken[];
}
export interface GetAccessPointsResponse {
  /** List of AccessPoint items. */
  accessPoint?: AccessPoint[];
}
export interface CreateAccessPoint {
  /** AccessPoint item to create */
  accessPoint?: AccessPoint;
}
export interface CreateAccessPointResponse {
  /** Token of created AccessPoint item */
  token?: ReferenceToken;
}
export interface SetAccessPoint {
  /** AccessPoint item to create or modify */
  accessPoint?: AccessPoint;
}
export interface SetAccessPointResponse {}
export interface ModifyAccessPoint {
  /** AccessPoint item to modify */
  accessPoint?: AccessPoint;
}
export interface ModifyAccessPointResponse {}
export interface DeleteAccessPoint {
  /** Token of AccessPoint item to delete. */
  token?: ReferenceToken;
}
export interface DeleteAccessPointResponse {}
export interface SetAccessPointAuthenticationProfile {
  /** Token of the AccessPoint. */
  token?: ReferenceToken;
  /** Token of the AuthenticationProfile. */
  authenticationProfileToken?: ReferenceToken;
}
export interface SetAccessPointAuthenticationProfileResponse {}
export interface DeleteAccessPointAuthenticationProfile {
  /** Token of the AccessPoint. */
  token?: ReferenceToken;
}
export interface DeleteAccessPointAuthenticationProfileResponse {}
export interface GetAreaInfoList {
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
export interface GetAreaInfoListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of AreaInfo items. */
  areaInfo?: AreaInfo[];
}
export interface GetAreaInfo {
  /** Tokens of AreaInfo items to get. */
  token?: ReferenceToken[];
}
export interface GetAreaInfoResponse {
  /** List of AreaInfo items. */
  areaInfo?: AreaInfo[];
}
export interface GetAreaList {
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
export interface GetAreaListResponse {
  /**
   * StartReference to use in next call to get the following items. If
   * absent, no more items to get.
   */
  nextStartReference?: string;
  /** List of Area items. */
  area?: Area[];
}
export interface GetAreas {
  /** Tokens of Area items to get. */
  token?: ReferenceToken[];
}
export interface GetAreasResponse {
  /** List of Area items. */
  area?: Area[];
}
export interface CreateArea {
  /** Area item to create */
  area?: Area;
}
export interface CreateAreaResponse {
  /** Token of created Area item */
  token?: ReferenceToken;
}
export interface SetArea {
  /** Area item to create or modify */
  area?: Area;
}
export interface SetAreaResponse {}
export interface ModifyArea {
  /** Area item to modify */
  area?: Area;
}
export interface ModifyAreaResponse {}
export interface DeleteArea {
  /** Token of Area item to delete. */
  token?: ReferenceToken;
}
export interface DeleteAreaResponse {}
export interface GetAccessPointState {
  /** Token of AccessPoint instance to get AccessPointState for. */
  token?: ReferenceToken;
}
export interface GetAccessPointStateResponse {
  /** AccessPointState item. */
  accessPointState?: AccessPointState;
}
export interface EnableAccessPoint {
  /** Token of the AccessPoint instance to enable. */
  token?: ReferenceToken;
}
export interface EnableAccessPointResponse {}
export interface DisableAccessPoint {
  /** Token of the AccessPoint instance to disable. */
  token?: ReferenceToken;
}
export interface DisableAccessPointResponse {}
export interface ExternalAuthorization {
  /** Token of the Access Point instance. */
  accessPointToken?: ReferenceToken;
  /** Optional token of the Credential involved. */
  credentialToken?: ReferenceToken;
  /** Optional reason for decision. */
  reason?: string;
  /** Decision - Granted or Denied. */
  decision?: Decision;
}
export interface ExternalAuthorizationResponse {}
export interface Feedback {
  /** Token of the access point to control. */
  accessPointToken?: ReferenceToken;
  /**
   * The feedback type to use. Feedback types starting with the prefix pt:
   * are reserved to define ONVIF-specific types as defined in tac:FeedbackType.
   * For custom defined feedback types, free text can be used.
   * If feedback type is set to pt:RequireIdentifier, the RecognitionType field shall provide the required type(s).
   * If the feedback type is not supported, it shall be ignored.
   */
  feedbackType?: string;
  /**
   * Optional list of recognition types requested by a client to get closer to making a decision.
   * Used if FeedbackType is set to pt:RequireIdentifier.
   * If a recognition type is not supported, it shall be ignored.
   */
  recognitionType?: string[];
  /**
   * Optional textual feedback message.
   * If not supported by the access point it shall be ignored.
   */
  textMessage?: string;
}
export interface FeedbackResponse {}
