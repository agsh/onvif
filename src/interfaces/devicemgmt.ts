import { AnyURI } from './basics';
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
  SupportInformation,
  SystemLogType,
  SystemLog,
  Scope,
  DiscoveryMode,
  NetworkHost,
  RemoteUser,
  User,
  CapabilityCategory,
  HostnameInformation,
  DNSInformation,
  IPAddress,
  NTPInformation,
  DynamicDNSInformation,
  DynamicDNSType,
  DNSName,
  NetworkInterface,
  NetworkInterfaceSetConfiguration,
  NetworkProtocol,
  NetworkGateway,
  IPv4Address,
  IPv6Address,
  NetworkZeroConfiguration,
  IPAddressFilter,
  BinaryData,
  Date,
  Certificate,
  CertificateStatus,
  CertificateWithPrivateKey,
  CertificateInformation,
  Dot1XConfiguration,
  RelayOutput,
  RelayOutputSettings,
  RelayLogicalState,
  AuxiliaryData,
  Dot11Capabilities,
  Dot11Status,
  Dot11AvailableNetworks,
  SystemLogUriList, Capabilities,
} from './onvif';
import { IntRange, ReferenceToken, LocationEntity } from './common';

export type AutoGeoModes = 'Location' | 'Heading' | 'Leveling';
export type StorageType = 'NFS' | 'CIFS' | 'CDMI' | 'FTP' | 'ObjectStorageS3' | 'ObjectStorageAzure';
export interface Service {
  /** Namespace of the service being described. This parameter allows to match the service capabilities to the service. Note that only one set of capabilities is supported per namespace. */
  namespace?: AnyURI;
  /** The transport addresses where the service can be reached. The scheme and IP part shall match the one used in the request (i.e. the GetServices request). */
  XAddr?: AnyURI;
  capabilities?: Capabilities;
  /** The version of the service (not the ONVIF core spec version). */
  version?: OnvifVersion;
}
export interface DeviceServiceCapabilities {
  /** Network capabilities. */
  network?: NetworkCapabilities;
  /** Security capabilities. */
  security?: SecurityCapabilities;
  /** System capabilities. */
  system?: SystemCapabilities;
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
  /** Indicates support for firmware upgrade through MTOM. */
  firmwareUpgrade?: boolean;
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
}
export interface MiscCapabilities {
  /** Lists of commands supported by SendAuxiliaryCommand. */
  auxiliaryCommands?: StringAttrList;
}
export interface Extension {}
export interface UserCredential {
  /** User name */
  userName?: string;
  /** optional password */
  password?: string;
  extension?: Extension;
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
}
export interface StorageConfiguration extends DeviceEntity {
  data?: StorageConfigurationData;
}
export interface GetServices {
  /** Indicates if the service capabilities (untyped) should be included in the response. */
  includeCapability?: boolean;
}
export interface GetServicesResponse {
  /** Each Service element contains information about one service. */
  service?: Service[];
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the device service is returned in the Capabilities element. */
  capabilities?: DeviceServiceCapabilities;
}
// export interface Capabilities extends DeviceServiceCapabilities {}
export interface GetDeviceInformation {}
export interface GetDeviceInformationResponse {
  /** The manufactor of the device. */
  manufacturer?: string;
  /** The device model. */
  model?: string;
  /** The firmware version in the device. */
  firmwareVersion?: string;
  /** The serial number of the device. */
  serialNumber?: string;
  /** The hardware ID of the device. */
  hardwareId?: string;
}
export interface SetSystemDateAndTime {
  /** Defines if the date and time is set via NTP or manually. */
  dateTimeType?: SetDateTimeType;
  /** Automatically adjust Daylight savings if defined in TimeZone. */
  daylightSavings?: boolean;
  /** The time zone in POSIX 1003.1 format */
  timeZone?: TimeZone;
  /** Date and time in UTC. If time is obtained via NTP, UTCDateTime has no meaning */
  UTCDateTime?: DateTime;
}
export interface SetSystemDateAndTimeResponse {}
export interface GetSystemDateAndTime {}
export interface GetSystemDateAndTimeResponse {
  /** Contains information whether system date and time are set manually or by NTP, daylight savings is on or off, time zone in POSIX 1003.1 format and system date and time in UTC and also local system date and time. */
  systemDateAndTime?: SystemDateTime;
}
export interface SetSystemFactoryDefault {
  /** Specifies the factory default action type. */
  factoryDefault?: FactoryDefaultType;
}
export interface SetSystemFactoryDefaultResponse {}
export interface UpgradeSystemFirmware {
  firmware?: AttachmentData;
}
export interface UpgradeSystemFirmwareResponse {
  message?: string;
}
export interface SystemReboot {}
export interface SystemRebootResponse {
  /** Contains the reboot message sent by the device. */
  message?: string;
}
export interface RestoreSystem {
  backupFiles?: BackupFile[];
}
export interface RestoreSystemResponse {}
export interface GetSystemBackup {}
export interface GetSystemBackupResponse {
  backupFiles?: BackupFile[];
}
export interface GetSystemSupportInformation {}
export interface GetSystemSupportInformationResponse {
  /** Contains the arbitary device diagnostics information. */
  supportInformation?: SupportInformation;
}
export interface GetSystemLog {
  /** Specifies the type of system log to get. */
  logType?: SystemLogType;
}
export interface GetSystemLogResponse {
  /** Contains the system log information. */
  systemLog?: SystemLog;
}
export interface GetScopes {}
export interface GetScopesResponse {
  /** Contains a list of URI definining the device scopes. Scope parameters can be of two types: fixed and configurable. Fixed parameters can not be altered. */
  scopes?: Scope[];
}
export interface SetScopes {
  /** Contains a list of scope parameters that will replace all existing configurable scope parameters. */
  scopes?: AnyURI[];
}
export interface SetScopesResponse {}
export interface AddScopes {
  /** Contains a list of new configurable scope parameters that will be added to the existing configurable scope. */
  scopeItem?: AnyURI[];
}
export interface AddScopesResponse {}
export interface RemoveScopes {
  /**
   * Contains a list of URIs that should be removed from the device scope.
   * Note that the response message always will match the request or an error will be returned. The use of the response is for that reason deprecated.
   */
  scopeItem?: AnyURI[];
}
export interface RemoveScopesResponse {
  /** Contains a list of URIs that has been removed from the device scope */
  scopeItem?: AnyURI[];
}
export interface GetDiscoveryMode {}
export interface GetDiscoveryModeResponse {
  /** Indicator of discovery mode: Discoverable, NonDiscoverable. */
  discoveryMode?: DiscoveryMode;
}
export interface SetDiscoveryMode {
  /** Indicator of discovery mode: Discoverable, NonDiscoverable. */
  discoveryMode?: DiscoveryMode;
}
export interface SetDiscoveryModeResponse {}
export interface GetRemoteDiscoveryMode {}
export interface GetRemoteDiscoveryModeResponse {
  /** Indicator of discovery mode: Discoverable, NonDiscoverable. */
  remoteDiscoveryMode?: DiscoveryMode;
}
export interface SetRemoteDiscoveryMode {
  /** Indicator of discovery mode: Discoverable, NonDiscoverable. */
  remoteDiscoveryMode?: DiscoveryMode;
}
export interface SetRemoteDiscoveryModeResponse {}
export interface GetDPAddresses {}
export interface GetDPAddressesResponse {
  DPAddress?: NetworkHost[];
}
export interface SetDPAddresses {
  DPAddress?: NetworkHost[];
}
export interface SetDPAddressesResponse {}
export interface GetEndpointReference {}
export interface GetEndpointReferenceResponse {
  GUID?: string;
}
export interface GetRemoteUser {}
export interface GetRemoteUserResponse {
  remoteUser?: RemoteUser;
}
export interface SetRemoteUser {
  remoteUser?: RemoteUser;
}
export interface SetRemoteUserResponse {}
export interface GetUsers {}
export interface GetUsersResponse {
  /** Contains a list of the onvif users and following information is included in each entry: username and user level. */
  user?: User[];
}
export interface CreateUsers {
  /** Creates new device users and corresponding credentials. Each user entry includes: username, password and user level. Either all users are created successfully or a fault message MUST be returned without creating any user. If trying to create several users with exactly the same username the request is rejected and no users are created. If password is missing, then fault message Too weak password is returned. */
  user?: User[];
}
export interface CreateUsersResponse {}
export interface DeleteUsers {
  /** Deletes users on an device and there may exist users that cannot be deleted to ensure access to the unit. Either all users are deleted successfully or a fault message MUST be returned and no users be deleted. If a username exists multiple times in the request, then a fault message is returned. */
  username?: string[];
}
export interface DeleteUsersResponse {}
export interface SetUser {
  /** Updates the credentials for one or several users on an device. Either all change requests are processed successfully or a fault message MUST be returned. If the request contains the same username multiple times, a fault message is returned. */
  user?: User[];
}
export interface SetUserResponse {}
export interface GetWsdlUrl {}
export interface GetWsdlUrlResponse {
  wsdlUrl?: AnyURI;
}
export interface GetPasswordComplexityOptions {}
export interface GetPasswordComplexityOptionsResponse {
  minLenRange?: IntRange;
  uppercaseRange?: IntRange;
  numberRange?: IntRange;
  specialCharsRange?: IntRange;
  blockUsernameOccurrenceSupported?: boolean;
  policyConfigurationLockSupported?: boolean;
}
export interface GetPasswordComplexityConfiguration {}
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
export interface SetPasswordComplexityConfigurationResponse {}
export interface GetPasswordHistoryConfiguration {}
export interface GetPasswordHistoryConfigurationResponse {
  enabled?: boolean;
  length?: number;
}
export interface SetPasswordHistoryConfiguration {
  enabled?: boolean;
  length?: number;
}
export interface SetPasswordHistoryConfigurationResponse {}
export interface GetAuthFailureWarningOptions {}
export interface GetAuthFailureWarningOptionsResponse {
  monitorPeriodRange?: IntRange;
  authFailureRange?: IntRange;
}
export interface GetAuthFailureWarningConfiguration {}
export interface GetAuthFailureWarningConfigurationResponse {
  enabled?: boolean;
  monitorPeriod?: number;
  maxAuthFailures?: number;
}
export interface SetAuthFailureWarningConfiguration {
  enabled?: boolean;
  monitorPeriod?: number;
  maxAuthFailures?: number;
}
export interface SetAuthFailureWarningConfigurationResponse {}
export interface GetCapabilities {
  /** List of categories to retrieve capability information on. */
  category?: CapabilityCategory[];
}
export interface GetCapabilitiesResponse {
  /** Capability information. */
  capabilities?: Capabilities;
}
export interface GetHostname {}
export interface GetHostnameResponse {
  /** Contains the hostname information. */
  hostnameInformation?: HostnameInformation;
}
export interface SetHostname {
  /** The hostname to set. */
  name?: string;
}
export interface SetHostnameResponse {}
export interface SetHostnameFromDHCP {
  /** True if the hostname shall be obtained via DHCP. */
  fromDHCP?: boolean;
}
export interface SetHostnameFromDHCPResponse {
  /** Indicates whether or not a reboot is required after configuration updates. */
  rebootNeeded?: boolean;
}
export interface GetDNS {}
export interface GetDNSResponse {
  /** DNS information. */
  DNSInformation?: DNSInformation;
}
export interface SetDNS {
  /** Indicate if the DNS address is to be retrieved using DHCP. */
  fromDHCP?: boolean;
  /** DNS search domain. */
  searchDomain?: string[];
  /** DNS address(es) set manually. */
  DNSManual?: IPAddress[];
}
export interface SetDNSResponse {}
export interface GetNTP {}
export interface GetNTPResponse {
  /** NTP information. */
  NTPInformation?: NTPInformation;
}
export interface SetNTP {
  /** Indicate if NTP address information is to be retrieved using DHCP. */
  fromDHCP?: boolean;
  /** Manual NTP settings. */
  NTPManual?: NetworkHost[];
}
export interface SetNTPResponse {}
export interface GetDynamicDNS {}
export interface GetDynamicDNSResponse {
  /** Dynamic DNS information. */
  dynamicDNSInformation?: DynamicDNSInformation;
}
export interface SetDynamicDNS {
  /** Dynamic DNS type. */
  type?: DynamicDNSType;
  /** DNS name. */
  name?: DNSName;
  /** DNS record time to live. */
  TTL?: string;
}
export interface SetDynamicDNSResponse {}
export interface GetNetworkInterfaces {}
export interface GetNetworkInterfacesResponse {
  /** List of network interfaces. */
  networkInterfaces?: NetworkInterface[];
}
export interface SetNetworkInterfaces {
  /** Symbolic network interface name. */
  interfaceToken?: ReferenceToken;
  /** Network interface name. */
  networkInterface?: NetworkInterfaceSetConfiguration;
}
export interface SetNetworkInterfacesResponse {
  /**
   * Indicates whether or not a reboot is required after configuration updates.
   * If a device responds with RebootNeeded set to false, the device can be reached
   * via the new IP address without further action. A client should be aware that a device
   * may not be responsive for a short period of time until it signals availability at
   * the new address via the discovery Hello messages.
   * If a device responds with RebootNeeded set to true, it will be further available under
   * its previous IP address. The settings will only be activated when the device is
   * rebooted via the SystemReboot command.
   */
  rebootNeeded?: boolean;
}
export interface GetNetworkProtocols {}
export interface GetNetworkProtocolsResponse {
  /** Contains an array of defined protocols supported by the device. There are three protocols defined; HTTP, HTTPS and RTSP. The following parameters can be retrieved for each protocol: port and enable/disable. */
  networkProtocols?: NetworkProtocol[];
}
export interface SetNetworkProtocols {
  /** Configures one or more defined network protocols supported by the device. There are currently three protocols defined; HTTP, HTTPS and RTSP. The following parameters can be set for each protocol: port and enable/disable. */
  networkProtocols?: NetworkProtocol[];
}
export interface SetNetworkProtocolsResponse {}
export interface GetNetworkDefaultGateway {}
export interface GetNetworkDefaultGatewayResponse {
  /** Gets the default IPv4 and IPv6 gateway settings from the device. */
  networkGateway?: NetworkGateway;
}
export interface SetNetworkDefaultGateway {
  /** Sets IPv4 gateway address used as default setting. */
  IPv4Address?: IPv4Address[];
  /** Sets IPv6 gateway address used as default setting. */
  IPv6Address?: IPv6Address[];
}
export interface SetNetworkDefaultGatewayResponse {}
export interface GetZeroConfiguration {}
export interface GetZeroConfigurationResponse {
  /** Contains the zero-configuration. */
  zeroConfiguration?: NetworkZeroConfiguration;
}
export interface SetZeroConfiguration {
  /** Unique identifier referencing the physical interface. */
  interfaceToken?: ReferenceToken;
  /** Specifies if the zero-configuration should be enabled or not. */
  enabled?: boolean;
}
export interface SetZeroConfigurationResponse {}
export interface GetIPAddressFilter {}
export interface GetIPAddressFilterResponse {
  IPAddressFilter?: IPAddressFilter;
}
export interface SetIPAddressFilter {
  IPAddressFilter?: IPAddressFilter;
}
export interface SetIPAddressFilterResponse {}
export interface AddIPAddressFilter {
  IPAddressFilter?: IPAddressFilter;
}
export interface AddIPAddressFilterResponse {}
export interface RemoveIPAddressFilter {
  IPAddressFilter?: IPAddressFilter;
}
export interface RemoveIPAddressFilterResponse {}
export interface GetAccessPolicy {}
export interface GetAccessPolicyResponse {
  policyFile?: BinaryData;
}
export interface SetAccessPolicy {
  policyFile?: BinaryData;
}
export interface SetAccessPolicyResponse {}
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
export interface CreateCertificateResponse {
  /** base64 encoded DER representation of certificate. */
  nvtCertificate?: Certificate;
}
export interface GetCertificates {}
export interface GetCertificatesResponse {
  /** Id and base64 encoded DER representation of all available certificates. */
  nvtCertificate?: Certificate[];
}
export interface GetCertificatesStatus {}
export interface GetCertificatesStatusResponse {
  /** Indicates if a certificate is used in an optional HTTPS configuration of the device. */
  certificateStatus?: CertificateStatus[];
}
export interface SetCertificatesStatus {
  /** Indicates if a certificate is to be used in an optional HTTPS configuration of the device. */
  certificateStatus?: CertificateStatus[];
}
export interface SetCertificatesStatusResponse {}
export interface DeleteCertificates {
  /** List of ids of certificates to delete. */
  certificateID?: string[];
}
export interface DeleteCertificatesResponse {}
export interface GetPkcs10Request {
  /** List of ids of certificates to delete. */
  certificateID?: string;
  /** Relative Dinstinguished Name(RDN) CommonName(CN). */
  subject?: string;
  /** Optional base64 encoded DER attributes. */
  attributes?: BinaryData;
}
export interface GetPkcs10RequestResponse {
  /** base64 encoded DER representation of certificate. */
  pkcs10Request?: BinaryData;
}
export interface LoadCertificates {
  /** Optional id and base64 encoded DER representation of certificate. */
  NVTCertificate?: Certificate[];
}
export interface LoadCertificatesResponse {}
export interface GetClientCertificateMode {}
export interface GetClientCertificateModeResponse {
  /** Indicates whether or not client certificates are required by device. */
  enabled?: boolean;
}
export interface SetClientCertificateMode {
  /** Indicates whether or not client certificates are required by device. */
  enabled?: boolean;
}
export interface SetClientCertificateModeResponse {}
export interface GetCACertificates {}
export interface GetCACertificatesResponse {
  CACertificate?: Certificate[];
}
export interface LoadCertificateWithPrivateKey {
  certificateWithPrivateKey?: CertificateWithPrivateKey[];
}
export interface LoadCertificateWithPrivateKeyResponse {}
export interface GetCertificateInformation {
  certificateID?: string;
}
export interface GetCertificateInformationResponse {
  certificateInformation?: CertificateInformation;
}
export interface LoadCACertificates {
  CACertificate?: Certificate[];
}
export interface LoadCACertificatesResponse {}
export interface CreateDot1XConfiguration {
  dot1XConfiguration?: Dot1XConfiguration;
}
export interface CreateDot1XConfigurationResponse {}
export interface SetDot1XConfiguration {
  dot1XConfiguration?: Dot1XConfiguration;
}
export interface SetDot1XConfigurationResponse {}
export interface GetDot1XConfiguration {
  dot1XConfigurationToken?: ReferenceToken;
}
export interface GetDot1XConfigurationResponse {
  dot1XConfiguration?: Dot1XConfiguration;
}
export interface GetDot1XConfigurations {}
export interface GetDot1XConfigurationsResponse {
  dot1XConfiguration?: Dot1XConfiguration[];
}
export interface DeleteDot1XConfiguration {
  dot1XConfigurationToken?: ReferenceToken[];
}
export interface DeleteDot1XConfigurationResponse {}
export interface GetRelayOutputs {}
export interface GetRelayOutputsResponse {
  relayOutputs?: RelayOutput[];
}
export interface SetRelayOutputSettings {
  relayOutputToken?: ReferenceToken;
  properties?: RelayOutputSettings;
}
export interface SetRelayOutputSettingsResponse {}
export interface SetRelayOutputState {
  relayOutputToken?: ReferenceToken;
  logicalState?: RelayLogicalState;
}
export interface SetRelayOutputStateResponse {}
export interface SendAuxiliaryCommand {
  auxiliaryCommand?: AuxiliaryData;
}
export interface SendAuxiliaryCommandResponse {
  auxiliaryCommandResponse?: AuxiliaryData;
}
export interface GetDot11Capabilities {}
export interface GetDot11CapabilitiesResponse {
  capabilities?: Dot11Capabilities;
}
export interface GetDot11Status {
  interfaceToken?: ReferenceToken;
}
export interface GetDot11StatusResponse {
  status?: Dot11Status;
}
export interface ScanAvailableDot11Networks {
  interfaceToken?: ReferenceToken;
}
export interface ScanAvailableDot11NetworksResponse {
  networks?: Dot11AvailableNetworks[];
}
export interface GetSystemUris {}
export interface GetSystemUrisResponse {
  systemLogUris?: SystemLogUriList;
  supportInfoUri?: AnyURI;
  systemBackupUri?: AnyURI;
  extension?: Extension;
}
export interface StartFirmwareUpgrade {}
export interface StartFirmwareUpgradeResponse {
  uploadUri?: AnyURI;
  uploadDelay?: string;
  expectedDownTime?: string;
}
export interface StartSystemRestore {}
export interface StartSystemRestoreResponse {
  uploadUri?: AnyURI;
  expectedDownTime?: string;
}
export interface SetHashingAlgorithm {
  /** Hashing algorithm(s) used in HTTP and RTSP Digest Authentication. */
  algorithm?: StringList;
}
export interface SetHashingAlgorithmResponse {}
export interface GetStorageConfigurations {}
export interface GetStorageConfigurationsResponse {
  storageConfigurations?: StorageConfiguration[];
}
export interface CreateStorageConfiguration {
  storageConfiguration?: StorageConfigurationData;
}
export interface CreateStorageConfigurationResponse {
  token?: ReferenceToken;
}
export interface GetStorageConfiguration {
  token?: ReferenceToken;
}
export interface GetStorageConfigurationResponse {
  storageConfiguration?: StorageConfiguration;
}
export interface SetStorageConfiguration {
  storageConfiguration?: StorageConfiguration;
}
export interface SetStorageConfigurationResponse {}
export interface DeleteStorageConfiguration {
  token?: ReferenceToken;
}
export interface DeleteStorageConfigurationResponse {}
export interface GetGeoLocation {}
export interface GetGeoLocationResponse {
  location?: LocationEntity[];
}
export interface SetGeoLocation {
  location?: LocationEntity[];
}
export interface SetGeoLocationResponse {}
export interface DeleteGeoLocation {
  location?: LocationEntity[];
}
export interface DeleteGeoLocationResponse {}
