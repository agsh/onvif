import { AnyURI, Duration } from './basics';
import {
  OnvifVersion,
  IntList,
  StringList,
  StringAttrList,
  DeviceEntity,
  SetDateTimeType,
  TimeZone,
  DateTime,
  SystemDateTime,
  FactoryDefaultType,
  AttachmentData,
  BackupFile,
  SystemLogType,
  DiscoveryMode,
  NetworkHost,
  RemoteUser,
  User,
  UserRole,
  CapabilityCategory,
  IPAddress,
  DynamicDNSType,
  DNSName,
  NetworkInterfaceSetConfiguration,
  NetworkProtocol,
  IPv4Address,
  IPv6Address,
  IPAddressFilter,
  BinaryData,
  Certificate,
  CertificateStatus,
  CertificateWithPrivateKey,
  Dot1XConfiguration,
  RelayOutputSettings,
  RelayLogicalState,
  AuxiliaryData,
} from './onvif';
import {
  ReferenceToken,
  LocationEntity,
} from './common';
export interface Capabilities {
  /** The placeholder for the service capabilities. The service capability element shall be returned here. For example for the device service that would be the tds:DeviceServiceCapabilities element (not complextype). */
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface Service {
  /** Namespace of the service being described. This parameter allows to match the service capabilities to the service. Note that only one set of capabilities is supported per namespace. */
  namespace: AnyURI;
  /** The transport addresses where the service can be reached. The scheme and IP part shall match the one used in the request (i.e. the GetServices request). */
  XAddr: AnyURI;
  capabilities?: Capabilities;
  /** The version of the service (not the ONVIF core spec version). */
  version: OnvifVersion;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface DeviceServiceCapabilities {
  /** Network capabilities. */
  network: NetworkCapabilities;
  /** Security capabilities. */
  security: SecurityCapabilities;
  /** System capabilities. */
  system: SystemCapabilities;
  /** Capabilities that do not fit in any of the other categories. */
  misc?: MiscCapabilities;
}
export interface NetworkCapabilities {
  /** Indicates support for IP filtering. */
  IPFilter?: boolean;
  /** Indicates support for zeroconf. */
  zeroConfiguration?: boolean;
  /** Indicates support for IPv6. */
  IPVersion6?: boolean;
  /** Indicates support for dynamic DNS configuration. */
  dynDNS?: boolean;
  /** Indicates support for IEEE 802.11 configuration. */
  dot11Configuration?: boolean;
  /** Indicates the maximum number of Dot1X configurations supported by the device */
  dot1XConfigurations?: number;
  /** Indicates support for retrieval of hostname from DHCP. */
  hostnameFromDHCP?: boolean;
  /** Maximum number of NTP servers supported by the devices SetNTP command. */
  NTP?: number;
  /** Indicates support for Stateful IPv6 DHCP. */
  DHCPv6?: boolean;
}
export interface SecurityCapabilities {
  /** Indicates support for TLS 1.0. */
  'TLS1.0'?: boolean;
  /** Indicates support for TLS 1.1. */
  'TLS1.1'?: boolean;
  /** Indicates support for TLS 1.2. */
  'TLS1.2'?: boolean;
  /** Indicates support for onboard key generation. */
  onboardKeyGeneration?: boolean;
  /** Indicates support for access policy configuration. */
  accessPolicyConfig?: boolean;
  /** Indicates support for the ONVIF default access policy. */
  defaultAccessPolicy?: boolean;
  /** Indicates support for IEEE 802.1X configuration. */
  dot1X?: boolean;
  /** Indicates support for remote user configuration. Used when accessing another device. */
  remoteUserHandling?: boolean;
  /** Indicates support for WS-Security X.509 token. */
  'X.509Token'?: boolean;
  /** Indicates support for WS-Security SAML token. */
  SAMLToken?: boolean;
  /** Indicates support for WS-Security Kerberos token. */
  kerberosToken?: boolean;
  /** Indicates support for WS-Security Username token. */
  usernameToken?: boolean;
  /** Indicates support for WS over HTTP digest authenticated communication layer. */
  httpDigest?: boolean;
  /** Indicates support for WS-Security REL token. */
  RELToken?: boolean;
  /** Indicates support for JWT-based authentication with WS-Security Binary Security token. */
  jsonWebToken?: boolean;
  /** EAP Methods supported by the device. The int values refer to the IANA EAP Registry. */
  supportedEAPMethods?: IntList;
  /** The maximum number of users that the device supports. */
  maxUsers?: number;
  /** Maximum number of characters supported for the username by CreateUsers. */
  maxUserNameLength?: number;
  /** Maximum number of characters supported for the password by CreateUsers and SetUser. */
  maxPasswordLength?: number;
  /** Indicates which security policies are supported. Options are: ModifyPassword, PasswordComplexity, AuthFailureWarnings */
  securityPolicies?: StringList;
  /** Maximum number of passwords that the device can remember for each user */
  maxPasswordHistory?: number;
  /** Supported hashing algorithms as part of HTTP and RTSP Digest authentication.Example: MD5,SHA-256 */
  hashingAlgorithms?: StringList;
  /** Whenever set to an integer greater than zero, it signals that the device supports editable user roles. It indicates the maximum number of editable user roles. */
  maxUserRoles?: number;
}
export interface SystemCapabilities {
  /** Indicates support for WS Discovery resolve requests. */
  discoveryResolve?: boolean;
  /** Indicates support for WS-Discovery Bye. */
  discoveryBye?: boolean;
  /** Indicates support for remote discovery. */
  remoteDiscovery?: boolean;
  /** Indicates support for system backup through MTOM. */
  systemBackup?: boolean;
  /** Indicates support for retrieval of system logging through MTOM. */
  systemLogging?: boolean;
  /** Indicates support for firmware upgrade through the cloud. */
  cloudFirmwareUpgrade?: boolean;
  /** Indicates support for firmware upgrade through HTTP. */
  httpFirmwareUpgrade?: boolean;
  /** Indicates support for system backup through HTTP. */
  httpSystemBackup?: boolean;
  /** Indicates support for retrieval of system logging through HTTP. */
  httpSystemLogging?: boolean;
  /** Indicates support for retrieving support information through HTTP. */
  httpSupportInformation?: boolean;
  /** Indicates support for storage configuration interfaces. */
  storageConfiguration?: boolean;
  /** Indicates maximum number of storage configurations supported. */
  maxStorageConfigurations?: number;
  /** Indicates support for renewal of storage configuration. */
  storageConfigurationRenewal?: boolean;
  /** If present signals support for geo location. The value signals the supported number of entries. */
  geoLocationEntries?: number;
  /** List of supported automatic GeoLocation adjustment supported by the device. Valid items are defined by tds:AutoGeoMode. */
  autoGeo?: StringAttrList;
  /** Enumerates the supported StorageTypes, see tds:StorageType. */
  storageTypesSupported?: StringAttrList;
  /** Indicates no support for network discovery. */
  discoveryNotSupported?: boolean;
  /** Indicates no support for network configuration. */
  networkConfigNotSupported?: boolean;
  /** Indicates no support for user configuration. */
  userConfigNotSupported?: boolean;
  /** List of supported Addons by the device. */
  addons?: StringAttrList;
  /** Indicates what type of device this is. See tt:HardwareTypes for available options. */
  hardwareType?: string;
}
export interface MiscCapabilities {
  /** Lists of commands supported by SendAuxiliaryCommand. */
  auxiliaryCommands?: StringAttrList;
}
export interface Extension {
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface UserCredential {
  /** User name */
  userName: string;
  /** optional password, device shall not return the credentials (password) in the reply. */
  password?: string;
  extension?: Extension;
  /** optional access token, device shall not return the credentials (token) in the reply. */
  token?: string;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface ConfigurationRenewal {
  /** Remote URL to be queried by the device to renew the storage configuration. */
  renewalEndpoint: AnyURI;
  /** AuthorizationServer token referring to the server that provides access tokens to authorize with the the renewal endpoint. */
  authorizationServer: ReferenceToken;
  /**
   * CertPathValidationPolicyID used to validate the renewal endpoint server certificate.
   * If not configured, server certificate validation behavior is undefined and the device may either apply
   * a vendor specific default validation policy or skip validation at all.
   */
  certPathValidationPolicyID?: string;
  /** Optional user readable error information (readonly). */
  error?: string;
}
export interface StorageConfigurationData {
  /** tds:StorageType lists the acceptable values for type attribute */
  type: string;
  /** Optional region of the storage server */
  region?: string;
  /** Local path */
  localPath?: AnyURI;
  /** Storage server address */
  storageUri?: AnyURI;
  /** User credential for the storage server */
  user?: UserCredential;
  extension?: Extension;
  /** The unique identifier of the certification path validation policy to be used for validating the server certificate as declared in the security service. */
  certPathValidationPolicyID?: string;
  configurationRenewal?: ConfigurationRenewal;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface StorageConfiguration extends DeviceEntity {
  data: StorageConfigurationData;
}
export interface GetServices {
  /** Indicates if the service capabilities (untyped) should be included in the response. */
  includeCapability: boolean;
}
export interface GetDeviceInformationResponse {
  /** The manufactor of the device. */
  manufacturer: string;
  /** The device model. */
  model: string;
  /** The firmware version in the device. */
  firmwareVersion: string;
  /** The serial number of the device. */
  serialNumber: string;
  /** The hardware ID of the device. */
  hardwareId: string;
}
export interface SetSystemDateAndTime {
  /** Defines if the date and time is set via NTP or manually. */
  dateTimeType: SetDateTimeType;
  /** Automatically adjust Daylight savings if defined in TimeZone. */
  daylightSavings: boolean;
  /** The time zone in POSIX 1003.1 format */
  timeZone?: TimeZone;
  /** Date and time in UTC. If time is obtained via NTP, UTCDateTime has no meaning */
  UTCDateTime?: DateTime;
}
export interface GetSystemDateAndTimeResponse {
  /** Contains information whether system date and time are set manually or by NTP, daylight savings is on or off, time zone in POSIX 1003.1 format and system date and time in UTC and also local system date and time. */
  systemDateAndTime: SystemDateTime;
}
export interface SetSystemFactoryDefault {
  /** Specifies the factory default action type. */
  factoryDefault: FactoryDefaultType;
}
export interface UpgradeSystemFirmware {
  firmware: AttachmentData;
}
export interface RestoreSystem {
  backupFiles: BackupFile[];
}
export interface GetSystemLog {
  /** Specifies the type of system log to get. */
  logType: SystemLogType;
}
export interface AddScopes {
  /** Contains a list of new configurable scope parameters that will be added to the existing configurable scope. */
  scopeItem: AnyURI[];
}
export interface RemoveScopes {
  /**
   * Contains a list of URIs that should be removed from the device scope.
   * Note that the response message always will match the request or an error will be returned. The use of the response is for that reason deprecated.
   */
  scopeItem: AnyURI[];
}
export interface SetDiscoveryMode {
  /** Indicator of discovery mode: Discoverable, NonDiscoverable. */
  discoveryMode: DiscoveryMode;
}
export interface SetRemoteDiscoveryMode {
  /** Indicator of discovery mode: Discoverable, NonDiscoverable. */
  remoteDiscoveryMode: DiscoveryMode;
}
export interface SetDPAddresses {
  DPAddress?: NetworkHost[];
}
export interface SetRemoteUser {
  remoteUser?: RemoteUser;
}
export interface CreateUsers {
  /** Creates new device users and corresponding credentials. Each user entry includes: username, password and user level. Either all users are created successfully or a fault message MUST be returned without creating any user. If trying to create several users with exactly the same username the request is rejected and no users are created. If password is missing, then fault message Too weak password is returned. */
  user: User[];
}
export interface DeleteUsers {
  /** Deletes users on an device and there may exist users that cannot be deleted to ensure access to the unit. Either all users are deleted successfully or a fault message MUST be returned and no users be deleted. If a username exists multiple times in the request, then a fault message is returned. */
  username: string[];
}
export interface SetUser {
  /** Updates the credentials for one or several users on an device. Either all change requests are processed successfully or a fault message MUST be returned. If the request contains the same username multiple times, a fault message is returned. */
  user: User[];
}
export interface GetUserRoles {
  userRole?: string;
}
export interface SetUserRole {
  userRole: UserRole;
}
export interface DeleteUserRole {
  userRole: string;
}
export interface GetPasswordComplexityConfigurationResponse {
  minLen?: number;
  uppercase?: number;
  number?: number;
  specialChars?: number;
  blockUsernameOccurrence?: boolean;
  policyConfigurationLocked?: boolean;
}
export interface SetPasswordComplexityConfiguration {
  minLen?: number;
  uppercase?: number;
  number?: number;
  specialChars?: number;
  blockUsernameOccurrence?: boolean;
  policyConfigurationLocked?: boolean;
}
export interface SetPasswordHistoryConfiguration {
  enabled: boolean;
  length: number;
}
export interface GetAuthFailureWarningConfigurationResponse {
  enabled: boolean;
  monitorPeriod: number;
  maxAuthFailures: number;
}
export interface SetAuthFailureWarningConfiguration {
  enabled: boolean;
  monitorPeriod: number;
  maxAuthFailures: number;
}
export interface GetCapabilities {
  /** List of categories to retrieve capability information on. */
  category?: CapabilityCategory[];
}
export interface SetHostname {
  /** The hostname to set. */
  name: string;
}
export interface SetHostnameFromDHCP {
  /** True if the hostname shall be obtained via DHCP. */
  fromDHCP: boolean;
}
export interface SetDNS {
  /** Indicate if the DNS address is to be retrieved using DHCP. */
  fromDHCP: boolean;
  /** DNS search domain. */
  searchDomain?: string[];
  /** DNS address(es) set manually. */
  DNSManual?: IPAddress[];
}
export interface SetNTP {
  /** Indicate if NTP address information is to be retrieved using DHCP. */
  fromDHCP: boolean;
  /** Manual NTP settings. */
  NTPManual?: NetworkHost[];
}
export interface SetDynamicDNS {
  /** Dynamic DNS type. */
  type: DynamicDNSType;
  /** DNS name. */
  name?: DNSName;
  /** DNS record time to live. */
  TTL?: Duration;
}
export interface SetNetworkInterfaces {
  /** Symbolic network interface name. */
  interfaceToken: ReferenceToken;
  /** Network interface name. */
  networkInterface: NetworkInterfaceSetConfiguration;
}
export interface SetNetworkProtocols {
  /** Configures one or more defined network protocols supported by the device. There are currently three protocols defined; HTTP, HTTPS and RTSP. The following parameters can be set for each protocol: port and enable/disable. */
  networkProtocols: NetworkProtocol[];
}
export interface SetNetworkDefaultGateway {
  /** Sets IPv4 gateway address used as default setting. */
  IPv4Address?: IPv4Address[];
  /** Sets IPv6 gateway address used as default setting. */
  IPv6Address?: IPv6Address[];
}
export interface SetZeroConfiguration {
  /** Unique identifier referencing the physical interface. */
  interfaceToken: ReferenceToken;
  /** Specifies if the zero-configuration should be enabled or not. */
  enabled: boolean;
}
export interface SetIPAddressFilter {
  IPAddressFilter: IPAddressFilter;
}
export interface AddIPAddressFilter {
  IPAddressFilter: IPAddressFilter;
}
export interface RemoveIPAddressFilter {
  IPAddressFilter: IPAddressFilter;
}
export interface SetAccessPolicy {
  policyFile: BinaryData;
}
export interface CreateCertificate {
  /** Certificate id. */
  certificateID?: string;
  /** Identification of the entity associated with the public-key. */
  subject?: string;
  /** Certificate validity start date. */
  validNotBefore?: Date;
  /** Certificate expiry start date. */
  validNotAfter?: Date;
}
export interface SetCertificatesStatus {
  /** Indicates if a certificate is to be used in an optional HTTPS configuration of the device. */
  certificateStatus?: CertificateStatus[];
}
export interface DeleteCertificates {
  /** List of ids of certificates to delete. */
  certificateID: string[];
}
export interface GetPkcs10Request {
  /** List of ids of certificates to delete. */
  certificateID: string;
  /** Relative Dinstinguished Name(RDN) CommonName(CN). */
  subject?: string;
  /** Optional base64 encoded DER attributes. */
  attributes?: BinaryData;
}
export interface LoadCertificates {
  /** Optional id and base64 encoded DER representation of certificate. */
  NVTCertificate: Certificate[];
}
export interface SetClientCertificateMode {
  /** Indicates whether or not client certificates are required by device. */
  enabled: boolean;
}
export interface LoadCertificateWithPrivateKey {
  certificateWithPrivateKey: CertificateWithPrivateKey[];
}
export interface GetCertificateInformation {
  certificateID: string;
}
export interface LoadCACertificates {
  CACertificate: Certificate[];
}
export interface CreateDot1XConfiguration {
  dot1XConfiguration: Dot1XConfiguration;
}
export interface SetDot1XConfiguration {
  dot1XConfiguration: Dot1XConfiguration;
}
export interface GetDot1XConfiguration {
  dot1XConfigurationToken: ReferenceToken;
}
export interface DeleteDot1XConfiguration {
  dot1XConfigurationToken?: ReferenceToken[];
}
export interface SetRelayOutputSettings {
  relayOutputToken: ReferenceToken;
  properties: RelayOutputSettings;
}
export interface SetRelayOutputState {
  relayOutputToken: ReferenceToken;
  logicalState: RelayLogicalState;
}
export interface SendAuxiliaryCommand {
  auxiliaryCommand: AuxiliaryData;
}
export interface GetDot11Status {
  interfaceToken: ReferenceToken;
}
export interface ScanAvailableDot11Networks {
  interfaceToken: ReferenceToken;
}
export interface UpgradeFirmware {
  version: string;
}
export interface SetHashingAlgorithm {
  /** Hashing algorithm(s) used in HTTP and RTSP Digest Authentication. */
  algorithm: StringList;
}
export interface CreateStorageConfiguration {
  storageConfiguration: StorageConfigurationData;
}
export interface GetStorageConfiguration {
  token: ReferenceToken;
}
export interface SetStorageConfiguration {
  storageConfiguration: StorageConfiguration;
}
export interface DeleteStorageConfiguration {
  token: ReferenceToken;
}
export interface SetGeoLocation {
  location?: LocationEntity[];
}
export interface DeleteGeoLocation {
  location?: LocationEntity[];
}
