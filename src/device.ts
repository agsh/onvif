/**
 * Device module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */

import { Onvif, SetSystemDateAndTimeExtended } from './onvif';
import Service from './service';
import { OnvifResponseError } from './utils';
import {
  AddIPAddressFilter,
  AddScopes,
  CreateCertificate,
  CreateDot1XConfiguration,
  CreateStorageConfiguration,
  CreateUsers,
  DeleteCertificates,
  DeleteDot1XConfiguration,
  DeleteGeoLocation,
  DeleteStorageConfiguration,
  DeleteUserRole,
  DeleteUsers,
  DeviceServiceCapabilities,
  GetAuthFailureWarningConfigurationResponse,
  GetCapabilities,
  GetCertificateInformation,
  GetDeviceInformationResponse,
  GetDot11Status,
  GetDot1XConfiguration,
  GetGeoLocation,
  GetPasswordComplexityConfigurationResponse,
  GetPkcs10Request,
  GetServices,
  GetServicesResponse,
  GetStorageConfiguration,
  GetSystemLog,
  GetUserRoles,
  LoadCACertificates,
  LoadCertificateWithPrivateKey,
  LoadCertificates,
  RemoveIPAddressFilter,
  RemoveScopes,
  RestoreSystem,
  ScanAvailableDot11Networks,
  SendAuxiliaryCommand,
  Service as DeviceService,
  SetAccessPolicy,
  SetAuthFailureWarningConfiguration,
  SetCertificatesStatus,
  SetClientCertificateMode,
  SetDNS,
  SetDiscoveryMode,
  SetDot1XConfiguration,
  SetDPAddresses,
  SetDynamicDNS,
  SetGeoLocation,
  SetHashingAlgorithm,
  SetHostname,
  SetHostnameFromDHCP,
  SetIPAddressFilter,
  SetNetworkDefaultGateway,
  SetNetworkInterfaces,
  SetNetworkProtocols,
  SetNTP,
  SetPasswordComplexityConfiguration,
  SetPasswordHistoryConfiguration,
  SetRelayOutputSettings,
  SetRelayOutputState,
  SetRemoteDiscoveryMode,
  SetRemoteUser,
  SetStorageConfiguration,
  SetSystemFactoryDefault,
  SetUser,
  SetUserRole,
  SetZeroConfiguration,
  StorageConfiguration,
  StorageConfigurationData,
  UpgradeFirmware,
  UpgradeSystemFirmware,
  UserCredential,
} from './interfaces/devicemgmt';
import {
  AttachmentData,
  BackupFile,
  BinaryData,
  Capabilities,
  Certificate,
  CertificateStatus,
  CertificateWithPrivateKey,
  DNSInformation,
  Dot1XConfiguration,
  DynamicDNSInformation,
  HostnameInformation,
  IPAddressFilter,
  NetworkGateway,
  NetworkHost,
  NetworkInterface,
  NetworkProtocol,
  NetworkZeroConfiguration,
  NTPInformation,
  PrefixedIPv4Address,
  PrefixedIPv6Address,
  RelayOutput,
  RelayOutputSettings,
  RemoteUser,
  Scope,
  User,
  UserRole,
} from './interfaces/onvif';
import { AnyURI, Duration } from './interfaces/basics';
import { LocationEntity, ReferenceToken } from './interfaces/common';

/**
 * Device management service (network, users, scopes, system).
 *
 * @example Read identity and network settings, then adjust NTP / scopes:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const info = await onvif.device.getDeviceInformation();
 * const hostname = await onvif.device.getHostname();
 * const ifaces = await onvif.device.getNetworkInterfaces();
 * const scopes = await onvif.device.getScopes();
 * console.log(info.manufacturer, hostname.name, ifaces[0]?.token, scopes.length);
 *
 * const ntp = await onvif.device.getNTP();
 * console.log(ntp.fromDHCP, ntp.NTPManual);
 * // await onvif.device.setNTP({ fromDHCP: false, NTPManual: [{ type: 'DNS', dNSname: 'pool.ntp.org' }] });
 *
 * await onvif.device.addScopes({
 *   scopeItem: ['onvif://www.onvif.org/location/country/russia'],
 * });
 * ```
 * @category Services
 */
export default class Device extends Service {
  #services: DeviceService[] = [];
  get services() {
    return this.#services;
  }
  #scopes: Scope[] = [];
  get scopes() {
    return this.#scopes;
  }
  #serviceCapabilities?: DeviceServiceCapabilities;
  get serviceCapabilities() {
    return this.#serviceCapabilities;
  }
  #NTP?: NTPInformation;
  get NTP() {
    return this.#NTP;
  }
  #DNS?: DNSInformation;
  get DNS() {
    return this.#DNS;
  }
  #networkInterfaces?: NetworkInterface[];
  get networkInterfaces() {
    return this.#networkInterfaces;
  }

  constructor(onvif: Onvif) {
    super(onvif, 'device');
    this.#services = onvif.services;
  }

  private static namesToBuild(names?: string[]) {
    if (!names?.length) {
      return undefined;
    }
    return names.length === 1 ? names[0] : names;
  }

  private static binaryDataToBuild(binaryData: BinaryData) {
    return {
      ...(binaryData.contentType !== undefined && { ContentType: binaryData.contentType }),
      _: binaryData.data,
    };
  }

  private static attachmentDataToBuild(data: AttachmentData) {
    return {
      ...(data.contentType !== undefined && { ContentType: data.contentType }),
      Include: data.include,
    };
  }

  private static backupFilesToBuild(files: BackupFile[]) {
    return files.map((file) => ({
      Name: file.name,
      Data: Device.attachmentDataToBuild(file.data),
    }));
  }

  private static networkHostToBuild(host: NetworkHost) {
    return {
      Type: host.type,
      ...(host.IPv4Address && { IPv4Address: host.IPv4Address }),
      ...(host.IPv6Address && { IPv6Address: host.IPv6Address }),
      ...(host.DNSname && { DNSname: host.DNSname }),
      ...(host.extension && { Extension: host.extension }),
    };
  }

  private static networkHostsToBuild(hosts?: NetworkHost[]) {
    if (!hosts?.length) {
      return undefined;
    }
    return hosts.map((host) => Device.networkHostToBuild(host));
  }

  private static prefixedIPv4ToBuild(ipv4: PrefixedIPv4Address) {
    return { Address: ipv4.address, PrefixLength: ipv4.prefixLength };
  }

  private static prefixedIPv6ToBuild(ipv6: PrefixedIPv6Address) {
    return { Address: ipv6.address, PrefixLength: ipv6.prefixLength };
  }

  private static ipAddressFilterToBuild(filter: IPAddressFilter) {
    const ipv4 = filter.IPv4Address?.map((item) => Device.prefixedIPv4ToBuild(item));
    const ipv6 = filter.IPv6Address?.map((item) => Device.prefixedIPv6ToBuild(item));
    return {
      Type: filter.type,
      ...(ipv4 && { IPv4Address: ipv4.length === 1 ? ipv4[0] : ipv4 }),
      ...(ipv6 && { IPv6Address: ipv6.length === 1 ? ipv6[0] : ipv6 }),
      ...(filter.extension && { Extension: filter.extension }),
    };
  }

  private static networkProtocolToBuild(protocol: NetworkProtocol) {
    const port = protocol.port;
    return {
      Name: protocol.name,
      Enabled: protocol.enabled,
      ...(port && { Port: port.length === 1 ? port[0] : port }),
      ...(protocol.extension && { Extension: protocol.extension }),
    };
  }

  private static userToBuild(user: User) {
    return {
      Username: user.username,
      ...(user.password !== undefined && { Password: user.password }),
      UserLevel: user.userLevel,
      ...(user.extension && { Extension: user.extension }),
    };
  }

  private static userRoleToBuild(role: UserRole) {
    const functions = Device.namesToBuild(role.functions);
    return {
      Name: role.name,
      ...(functions && { Functions: functions }),
    };
  }

  private static remoteUserToBuild(remoteUser: RemoteUser) {
    return {
      Username: remoteUser.username,
      ...(remoteUser.password !== undefined && { Password: remoteUser.password }),
      UseDerivedPassword: remoteUser.useDerivedPassword,
    };
  }

  private static certificateToBuild(cert: Certificate) {
    return {
      CertificateID: cert.certificateID,
      Certificate: Device.binaryDataToBuild(cert.certificate),
    };
  }

  private static certificatesToBuild(certs: Certificate[]) {
    return certs.map((cert) => Device.certificateToBuild(cert));
  }

  private static certificateStatusToBuild(status: CertificateStatus) {
    return {
      CertificateID: status.certificateID,
      Status: status.status,
    };
  }

  private static certificateWithPrivateKeyToBuild(item: CertificateWithPrivateKey) {
    return {
      ...(item.certificateID !== undefined && { CertificateID: item.certificateID }),
      Certificate: Device.binaryDataToBuild(item.certificate),
      PrivateKey: Device.binaryDataToBuild(item.privateKey),
    };
  }

  private static dot1XConfigurationToBuild(config: Dot1XConfiguration) {
    return {
      Dot1XConfigurationToken: config.dot1XConfigurationToken,
      Identity: config.identity,
      ...(config.anonymousID !== undefined && { AnonymousID: config.anonymousID }),
      EAPMethod: config.EAPMethod,
      ...(config.CACertificateID && { CACertificateID: Device.namesToBuild(config.CACertificateID) }),
      ...(config.EAPMethodConfiguration && {
        EAPMethodConfiguration: {
          ...(config.EAPMethodConfiguration.TLSConfiguration && {
            TLSConfiguration: {
              CertificateID: config.EAPMethodConfiguration.TLSConfiguration.certificateID,
            },
          }),
          ...(config.EAPMethodConfiguration.password !== undefined && {
            Password: config.EAPMethodConfiguration.password,
          }),
          ...(config.EAPMethodConfiguration.extension && {
            Extension: config.EAPMethodConfiguration.extension,
          }),
        },
      }),
      ...(config.extension && { Extension: config.extension }),
    };
  }

  private static relayOutputSettingsToBuild(properties: RelayOutputSettings) {
    return {
      Mode: properties.mode,
      DelayTime: properties.delayTime,
      IdleState: properties.idleState,
    };
  }

  private static userCredentialToBuild(user: UserCredential) {
    return {
      UserName: user.userName,
      ...(user.password !== undefined && { Password: user.password }),
      ...(user.token !== undefined && { Token: user.token }),
      ...(user.extension && { Extension: user.extension }),
    };
  }

  private static storageConfigurationDataToBuild(data: StorageConfigurationData) {
    return {
      Type: data.type,
      ...(data.region !== undefined && { Region: data.region }),
      ...(data.localPath !== undefined && { LocalPath: data.localPath }),
      ...(data.storageUri !== undefined && { StorageUri: data.storageUri }),
      ...(data.user && { User: Device.userCredentialToBuild(data.user) }),
      ...(data.extension && { Extension: data.extension }),
      ...(data.certPathValidationPolicyID !== undefined && {
        CertPathValidationPolicyID: data.certPathValidationPolicyID,
      }),
      ...(data.configurationRenewal && {
        ConfigurationRenewal: {
          RenewalEndpoint: data.configurationRenewal.renewalEndpoint,
          AuthorizationServer: data.configurationRenewal.authorizationServer,
          ...(data.configurationRenewal.certPathValidationPolicyID !== undefined && {
            CertPathValidationPolicyID: data.configurationRenewal.certPathValidationPolicyID,
          }),
          ...(data.configurationRenewal.error !== undefined && { Error: data.configurationRenewal.error }),
        },
      }),
    };
  }

  private static storageConfigurationToBuild(config: StorageConfiguration) {
    return {
      $: { token: config.token },
      Data: Device.storageConfigurationDataToBuild(config.data),
    };
  }

  private static locationEntitiesToBuild(locations?: LocationEntity[]) {
    if (!locations?.length) {
      return undefined;
    }
    return locations.map((location) => ({
      ...(location.entity !== undefined && { Entity: location.entity }),
      ...(location.token !== undefined && { token: location.token }),
      ...(location.fixed !== undefined && { Fixed: location.fixed }),
      ...(location.geoSource !== undefined && { GeoSource: location.geoSource }),
      ...(location.autoGeo !== undefined && { AutoGeo: location.autoGeo }),
      ...(location.geoLocation && { GeoLocation: location.geoLocation }),
      ...(location.geoOrientation && { GeoOrientation: location.geoOrientation }),
      ...(location.localLocation && { LocalLocation: location.localLocation }),
      ...(location.localOrientation && { LocalOrientation: location.localOrientation }),
    }));
  }

  /**
   * This operation gets the device system date and time. The device shall support the return of the
   * daylight saving setting and of the manual system date and time (if applicable) or indication of NTP
   * time (if applicable) through the GetSystemDateAndTime command.
   *
   * A device shall provide the UTCDateTime information.
   */
  getSystemDateAndTime() {
    return this.onvif.getSystemDateAndTime();
  }

  /**
   * This operation sets the device system date and time. The device shall support the configuration of
   * the daylight saving setting and of the manual system date and time (if applicable) or indication of
   * NTP time (if applicable) through the SetSystemDateAndTime command.
   *
   * If system time and date are set manually, the client shall include UTCDateTime in the request.
   *
   * A TimeZone token which is not formed according to the rules of IEEE 1003.1 section 8.3 is considered
   * as invalid timezone.
   *
   * The DayLightSavings flag should be set to true to activate any DST settings of the TimeZone string.
   * Clear the DayLightSavings flag if the DST portion of the TimeZone settings should be ignored.
   * @param options
   */
  setSystemDateAndTime(options: SetSystemDateAndTimeExtended) {
    return this.onvif.setSystemDateAndTime(options);
  }

  /**
   * Returns information about services of the device.
   */
  async getServices({ includeCapability }: GetServices = { includeCapability: true }): Promise<GetServicesResponse> {
    const { getServices } = await import('./connection');
    const result = await getServices(this.onvif, { includeCapability });
    this.#services = this.onvif.services;
    return result;
  }

  /**
   * This method has been replaced by the more generic {@link Device.getServices | GetServices} method.
   * For capabilities of individual services refer to the GetServiceCapabilities methods.
   * @param options
   * @param options.category
   */
  async getCapabilities(options?: GetCapabilities): Promise<Capabilities> {
    const { getCapabilities } = await import('./connection');
    return getCapabilities(this.onvif, options);
  }

  /**
   * Receive device information
   */
  async getDeviceInformation(): Promise<GetDeviceInformationResponse> {
    const response = await this.request({ GetDeviceInformation: {} });
    this.onvif.deviceInformation = response.getDeviceInformationResponse;
    return this.onvif.deviceInformation!;
  }

  /**
   * Receive hostname information
   */
  async getHostname(): Promise<HostnameInformation> {
    const response = await this.request({ GetHostname: {} });
    return response.getHostnameResponse.hostnameInformation;
  }

  /**
   * Receive the scope parameters of a device
   */
  async getScopes(): Promise<Scope[]> {
    const response = await this.request({ GetScopes: {} }, { array: ['scopes'] });
    this.#scopes = response.getScopesResponse.scopes;
    return this.#scopes;
  }

  /**
   * Set the scope parameters of a device
   * @param scopes Array of scope's uris
   */
  async setScopes(scopes: AnyURI[]) {
    const response = await this.request({
      SetScopes: {
        Scopes: scopes,
      },
    });
    if (response.setScopesResponse.length !== 0) {
      throw new OnvifResponseError('Wrong `SetScopes` response');
    }
    // get new scopes from device
    return this.getScopes();
  }

  /**
   * Returns the capabilities of the device service. The result is returned in a typed answer
   */
  async getServiceCapabilities() {
    const response = await this.request({ GetServiceCapabilities: {} });
    const capabilitiesResponse = response.getServiceCapabilitiesResponse;
    this.#serviceCapabilities = capabilitiesResponse.capabilities;
    if (capabilitiesResponse.capabilities?.misc?.auxiliaryCommands !== undefined) {
      this.#serviceCapabilities!.misc!.auxiliaryCommands =
        capabilitiesResponse.capabilities.misc.auxiliaryCommands.split(' ');
    }
    return this.#serviceCapabilities!;
  }

  /**
   * This operation reboots the device
   */
  async systemReboot(): Promise<string> {
    const response = await this.request({ SystemReboot: {} });
    return response.systemRebootResponse.message;
  }

  /**
   * This operation gets the NTP settings from a device. If the device supports NTP, it shall be possible to get the
   * NTP server settings through the GetNTP command.
   */
  async getNTP(): Promise<NTPInformation> {
    const response = await this.request({ GetNTP: {} });
    this.#NTP = response.getNTPResponse.NTPInformation;
    if (this.#NTP?.NTPManual && !Array.isArray(this.#NTP.NTPManual)) {
      this.#NTP.NTPManual = [this.#NTP.NTPManual];
    }
    if (this.#NTP?.NTPFromDHCP && !Array.isArray(this.#NTP.NTPFromDHCP)) {
      this.#NTP.NTPFromDHCP = [this.#NTP.NTPFromDHCP];
    }
    return this.#NTP!;
  }

  /**
   * Set the NTP settings on a device
   */
  async setNTP(options: SetNTP): Promise<NTPInformation> {
    const response = await this.request({
      SetNTP: {
        FromDHCP: options.fromDHCP ?? false,
        ...(options.NTPManual &&
          Array.isArray(options.NTPManual) && {
            NTPManual: options.NTPManual.filter((NTPManual) => NTPManual.type).map((NTPManual) =>
              Device.networkHostToBuild(NTPManual),
            ),
          }),
      },
    });
    if (response.setNTPResponse.length !== 0) {
      throw new OnvifResponseError('Wrong `SetNTP` response');
    }
    return this.getNTP();
  }

  /**
   * This operation gets the DNS settings from a device. The device shall return its DNS configurations through the
   * GetDNS command.
   */
  async getDNS(): Promise<DNSInformation> {
    const response = await this.request({ GetDNS: {} });
    this.#DNS = response.getDNSResponse.DNSInformation;
    if (this.#DNS?.DNSManual && !Array.isArray(this.#DNS.DNSManual)) {
      this.#DNS.DNSManual = [this.#DNS.DNSManual];
    }
    if (this.#DNS?.DNSFromDHCP && !Array.isArray(this.#DNS.DNSFromDHCP)) {
      this.#DNS.DNSFromDHCP = [this.#DNS.DNSFromDHCP];
    }
    return this.#DNS!;
  }

  /**
   * This operation sets the DNS settings on a device. It shall be possible to set the device DNS
   * configurations through the SetDNS command.
   * @param options
   */
  async setDNS(options: SetDNS): Promise<DNSInformation> {
    const response = await this.request({
      SetDNS: {
        FromDHCP: !!options.fromDHCP,
        ...(options.searchDomain &&
          Array.isArray(options.searchDomain) && {
            SearchDomain: options.searchDomain,
          }),
        ...(options.DNSManual &&
          Array.isArray(options.DNSManual) && {
            DNSManual: options.DNSManual.filter((DNSManual) => DNSManual.type).map((DNSManual) =>
              Device.networkHostToBuild(DNSManual),
            ),
          }),
      },
    });
    if (response.setDNSResponse.length !== 0) {
      throw new OnvifResponseError('Wrong `SetDNS` response');
    }
    return this.getDNS();
  }

  /**
   * This operation gets the network interface configuration from a device. The device shall support return of network
   * interface configuration settings as defined by the NetworkInterface type through the GetNetworkInterfaces command.
   */
  async getNetworkInterfaces(): Promise<NetworkInterface[]> {
    const response = await this.request({ GetNetworkInterfaces: {} }, { array: ['networkInterfaces', 'manual'] });
    const { networkInterfaces } = response.getNetworkInterfacesResponse;
    this.#networkInterfaces = Array.isArray(networkInterfaces) ? networkInterfaces : [];
    return this.#networkInterfaces;
  }

  /**
   * Set network interfaces information
   * @returns Whether a reboot is required after the update
   */
  async setNetworkInterfaces(options: SetNetworkInterfaces): Promise<boolean> {
    const { networkInterface } = options;
    if (!networkInterface) {
      return false;
    }
    const response = await this.request({
      SetNetworkInterfaces: {
        InterfaceToken: options.interfaceToken,
        NetworkInterface: {
          Enabled: networkInterface.enabled,
          ...(networkInterface.link && {
            Link: {
              AutoNegotiation: networkInterface.link.autoNegotiation,
              Speed: networkInterface.link.speed,
              Duplex: networkInterface.link.duplex,
            },
          }),
          ...(!Number.isNaN(networkInterface.MTU) && { MTU: networkInterface.MTU }),
          ...(networkInterface.IPv4 && {
            IPv4: {
              Enabled: networkInterface.IPv4.enabled,
              ...(networkInterface.IPv4.manual && {
                Manual: networkInterface.IPv4.manual.map((ipv4) => ({
                  Address: ipv4.address,
                  PrefixLength: ipv4.prefixLength,
                })),
              }),
              DHCP: networkInterface.IPv4.DHCP,
            },
          }),
          ...(networkInterface.IPv6 && {
            IPv6: {
              Enabled: networkInterface.IPv6.enabled,
              AcceptRouterAdvert: networkInterface.IPv6.acceptRouterAdvert,
              ...(networkInterface.IPv6.manual && {
                Manual: networkInterface.IPv6.manual.map((ipv6) => ({
                  Address: ipv6.address,
                  PrefixLength: ipv6.prefixLength,
                })),
              }),
              DHCP: networkInterface.IPv6.DHCP,
            },
          }),
        },
      },
    });
    const result = response.setNetworkInterfacesResponse;
    if (Array.isArray(networkInterface.IPv6?.manual) && networkInterface.IPv6.manual.length > 0) {
      this.onvif.hostname = networkInterface.IPv6.manual[0].address!;
    }
    if (Array.isArray(networkInterface.IPv4?.manual) && networkInterface.IPv4.manual.length > 0) {
      this.onvif.hostname = networkInterface.IPv4.manual[0].address!;
    }
    return result.rebootNeeded;
  }

  /**
   * This operation reloads the parameters on the device to their factory default values.
   * @param options
   */
  async setSystemFactoryDefault({ factoryDefault }: SetSystemFactoryDefault): Promise<void> {
    await this.request({
      SetSystemFactoryDefault: { FactoryDefault: factoryDefault },
    });
  }

  /**
   * This operation upgrades a device firmware version. After a successful upgrade the response message
   * is sent before the device reboots. The device should support firmware upgrade through the
   * UpgradeSystemFirmware command. The exact format of the firmware data is outside the scope of this
   * standard.
   * @param options
   */
  async upgradeSystemFirmware({ firmware }: UpgradeSystemFirmware): Promise<string | undefined> {
    const response = await this.request({
      UpgradeSystemFirmware: { Firmware: Device.attachmentDataToBuild(firmware) },
    });
    return response.upgradeSystemFirmwareResponse.message;
  }

  /**
   * This operation restores the system backup configuration files(s) previously retrieved from a device.
   * The device should support restore of backup configuration file(s) through the RestoreSystem command.
   * The exact format of the backup configuration file(s) is outside the scope of this standard. If the
   * command is supported, it shall accept backup files returned by the GetSystemBackup command.
   * @param options
   */
  async restoreSystem({ backupFiles }: RestoreSystem): Promise<void> {
    await this.request({
      RestoreSystem: { BackupFiles: Device.backupFilesToBuild(backupFiles) },
    });
  }

  /**
   * This operation is retrieves system backup configuration file(s) from a device. The device should
   * support return of back up configuration file(s) through the GetSystemBackup command. The backup is
   * returned with reference to a name and mime-type together with binary data. The exact format of the
   * backup configuration files is outside the scope of this standard.
   */
  async getSystemBackup(): Promise<BackupFile[]> {
    const response = await this.request({ GetSystemBackup: {} }, { array: ['backupFiles'] });
    const { backupFiles } = response.getSystemBackupResponse;
    return Array.isArray(backupFiles) ? backupFiles : backupFiles ? [backupFiles] : [];
  }

  /**
   * This operation gets a system log from the device. The exact format of the system logs is outside the
   * scope of this standard.
   * @param options
   */
  async getSystemLog({ logType }: GetSystemLog) {
    const response = await this.request({
      GetSystemLog: { LogType: logType },
    });
    return response.getSystemLogResponse.systemLog;
  }

  /**
   * This operation gets arbitary device diagnostics information from the device.
   */
  async getSystemSupportInformation() {
    const response = await this.request({ GetSystemSupportInformation: {} });
    return response.getSystemSupportInformationResponse.supportInformation;
  }

  /**
   * This operation adds new configurable scope parameters to a device. The scope parameters are used in
   * the device discovery to match a probe message. The device shall support addition of discovery scope
   * parameters through the AddScopes command.
   * @param options
   */
  async addScopes({ scopeItem }: AddScopes): Promise<void> {
    await this.request({
      AddScopes: { ScopeItem: Device.namesToBuild(scopeItem) },
    });
    await this.getScopes();
  }

  /**
   * This operation deletes scope-configurable scope parameters from a device. The scope parameters are
   * used in the device discovery to match a probe message, see Section 7. The device shall support
   * deletion of discovery scope parameters through the RemoveScopes command. Table
   * @param options
   */
  async removeScopes({ scopeItem }: RemoveScopes): Promise<AnyURI[] | undefined> {
    const response = await this.request({
      RemoveScopes: { ScopeItem: Device.namesToBuild(scopeItem) },
    });
    const removed = response.removeScopesResponse.scopeItem;
    await this.getScopes();
    return removed;
  }

  /**
   * This operation gets the discovery mode of a device. See Section 7.2 for the definition of the
   * different device discovery modes. The device shall support retrieval of the discovery mode setting
   * through the GetDiscoveryMode command.
   */
  async getDiscoveryMode() {
    const response = await this.request({ GetDiscoveryMode: {} });
    return response.getDiscoveryModeResponse.discoveryMode;
  }

  /**
   * This operation sets the discovery mode operation of a device. See Section 7.2 for the definition of
   * the different device discovery modes. The device shall support configuration of the discovery mode
   * setting through the SetDiscoveryMode command.
   * @param options
   */
  async setDiscoveryMode({ discoveryMode }: SetDiscoveryMode): Promise<void> {
    await this.request({
      SetDiscoveryMode: { DiscoveryMode: discoveryMode },
    });
  }

  /**
   * This operation gets the remote discovery mode of a device. See Section 7.4 for the definition of
   * remote discovery extensions. A device that supports remote discovery shall support retrieval of the
   * remote discovery mode setting through the GetRemoteDiscoveryMode command.
   */
  async getRemoteDiscoveryMode() {
    const response = await this.request({ GetRemoteDiscoveryMode: {} });
    return response.getRemoteDiscoveryModeResponse.remoteDiscoveryMode;
  }

  /**
   * This operation sets the remote discovery mode of operation of a device. See Section 7.4 for the
   * definition of remote discovery remote extensions. A device that supports remote discovery shall
   * support configuration of the discovery mode setting through the SetRemoteDiscoveryMode command.
   * @param options
   */
  async setRemoteDiscoveryMode({ remoteDiscoveryMode }: SetRemoteDiscoveryMode): Promise<void> {
    await this.request({
      SetRemoteDiscoveryMode: { RemoteDiscoveryMode: remoteDiscoveryMode },
    });
  }

  /**
   * This operation gets the remote DP address or addresses from a device. If the device supports remote
   * discovery, as specified in Section 7.4, the device shall support retrieval of the remote DP
   * address(es) through the GetDPAddresses command.
   */
  async getDPAddresses(): Promise<NetworkHost[] | undefined> {
    const response = await this.request({ GetDPAddresses: {} }, { array: ['DPAddress'] });
    const addresses = response.getDPAddressesResponse.DPAddress;
    return Array.isArray(addresses) ? addresses : addresses ? [addresses] : undefined;
  }

  /**
   * This operation sets the remote DP address or addresses on a device. If the device supports remote
   * discovery, as specified in Section 7.4, the device shall support configuration of the remote DP
   * address(es) through the SetDPAddresses command.
   * @param options
   */
  async setDPAddresses({ DPAddress }: SetDPAddresses): Promise<void> {
    await this.request({
      SetDPAddresses: { DPAddress: Device.networkHostsToBuild(DPAddress) },
    });
  }

  /**
   * A client can ask for the device service endpoint reference address property that can be used to
   * derive the password equivalent for remote user operation. The device shall support the
   * GetEndpointReference command returning the address property of the device service endpoint
   * reference.
   * @returns Device GUID from the endpoint reference
   */
  async getEndpointReference(): Promise<string> {
    const response = await this.request({ GetEndpointReference: {} });
    return response.getEndpointReferenceResponse.GUID;
  }

  /**
   * This operation returns the editable user levels configured in the device. Whenever an editable user
   * level is passed in the request, information only about that level is returned.
   * @param options
   */
  async getUserRoles(options: GetUserRoles = {}) {
    const response = await this.request(
      {
        GetUserRoles: {
          ...(options.userRole !== undefined && { UserRole: options.userRole }),
        },
      },
      { array: ['userRole'] },
    );
    return response.getUserRolesResponse.userRole ?? [];
  }

  /**
   * This operation configures an editable user level in the device. If the level passed in UserRole
   * already exists in the device, its configuration is overwritten. Otherwise, a new editable user level
   * is created.
   * @param options
   */
  async setUserRole({ userRole }: SetUserRole): Promise<void> {
    await this.request({
      SetUserRole: { UserRole: Device.userRoleToBuild(userRole) },
    });
  }

  /**
   * This operation deletes an editable user level in the device.
   * @param options
   */
  async deleteUserRole({ userRole }: DeleteUserRole): Promise<void> {
    await this.request({
      DeleteUserRole: { UserRole: userRole },
    });
  }

  /**
   * This operation returns the configured remote user (if any). A device supporting remote user handling
   * shall support this operation. The user is only valid for the WS-UserToken profile or as an HTTP /
   * RTSP user.
   *
   * The algorithm to use for deriving the password is described in section 5.12.2.1 of the core
   * specification.
   */
  async getRemoteUser(): Promise<RemoteUser | undefined> {
    const response = await this.request({ GetRemoteUser: {} });
    return response.getRemoteUserResponse.remoteUser;
  }

  /**
   * This operation sets the remote user. A device supporting remote user handling shall support this
   * operation. The user is only valid for the WS-UserToken profile or as an HTTP / RTSP user.
   *
   * The password that is set shall always be the original (not derived) password.
   *
   * If UseDerivedPassword is set password derivation shall be done by the device when connecting to a
   * remote device.The algorithm to use for deriving the password is described in section 5.12.2.1 of the
   * core specification.
   *
   * To remove the remote user SetRemoteUser should be called without the RemoteUser parameter.
   * @param options
   */
  async setRemoteUser({ remoteUser }: SetRemoteUser): Promise<void> {
    await this.request({
      SetRemoteUser: {
        ...(remoteUser && { RemoteUser: Device.remoteUserToBuild(remoteUser) }),
      },
    });
  }

  /**
   * This operation lists the registered users and corresponding credentials on a device. The device
   * shall support retrieval of registered device users and their credentials for the user token through
   * the GetUsers command.
   */
  async getUsers(): Promise<User[]> {
    const response = await this.request({ GetUsers: {} }, { array: ['user'] });
    return response.getUsersResponse.user ?? [];
  }

  /**
   * This operation creates new device users and corresponding credentials on a device for authentication
   * purposes. The device shall support creation of device users and their credentials through the
   * CreateUsers command. Either all users are created successfully or a fault message shall be returned
   * without creating any user.
   *
   * ONVIF compliant devices are recommended to support password length of at least 28 bytes, as clients
   * may follow the password derivation mechanism which results in 'password equivalent' of length 28
   * bytes, as described in section 3.1.2 of the ONVIF security white paper.
   * @param options
   */
  async createUsers({ user }: CreateUsers): Promise<void> {
    await this.request({ CreateUsers: { User: user.map((user) => Device.userToBuild(user)) } });
  }

  /**
   * This operation deletes users on a device. The device shall support deletion of device users and
   * their credentials through the DeleteUsers command. A device may have one or more fixed users that
   * cannot be deleted to ensure access to the unit. Either all users are deleted successfully or a fault
   * message shall be returned and no users be deleted.
   * @param options
   */
  async deleteUsers({ username }: DeleteUsers): Promise<void> {
    await this.request({
      DeleteUsers: { Username: Device.namesToBuild(username) },
    });
  }

  /**
   * This operation updates the settings for one or several users on a device for authentication
   * purposes. The device shall support update of device users and their credentials through the SetUser
   * command. Either all change requests are processed successfully or a fault message shall be returned
   * and no change requests be processed.
   * @param options
   */
  async setUser({ user }: SetUser): Promise<void> {
    await this.request({
      SetUser: { User: user.map((user) => Device.userToBuild(user)) },
    });
  }

  /**
   * This method allows to provide a URL where product specific WSDL and schema definitions can be
   * retrieved. This method is deprecated.
   */
  async getWsdlUrl(): Promise<AnyURI> {
    const response = await this.request({ GetWsdlUrl: {} });
    return response.getWsdlUrlResponse.wsdlUrl;
  }

  /**
   * This method allows retrieval of all the available parameters and their valid ranges for the password
   * complexity configuration.
   */
  async getPasswordComplexityOptions() {
    const response = await this.request({ GetPasswordComplexityOptions: {} });
    return response.getPasswordComplexityOptionsResponse;
  }

  /**
   * This method allows retrieval of the current password complexity configuration settings.
   */
  async getPasswordComplexityConfiguration(): Promise<GetPasswordComplexityConfigurationResponse> {
    const response = await this.request({ GetPasswordComplexityConfiguration: {} });
    return response.getPasswordComplexityConfigurationResponse;
  }

  /**
   * This method allows setting of the password complexity configuration.
   * @param options
   */
  async setPasswordComplexityConfiguration(options: SetPasswordComplexityConfiguration): Promise<void> {
    await this.request({
      SetPasswordComplexityConfiguration: {
        ...(options.minLen !== undefined && { MinLen: options.minLen }),
        ...(options.uppercase !== undefined && { Uppercase: options.uppercase }),
        ...(options.number !== undefined && { Number: options.number }),
        ...(options.specialChars !== undefined && { SpecialChars: options.specialChars }),
        ...(options.blockUsernameOccurrence !== undefined && {
          BlockUsernameOccurrence: options.blockUsernameOccurrence,
        }),
        ...(options.policyConfigurationLocked !== undefined && {
          PolicyConfigurationLocked: options.policyConfigurationLocked,
        }),
      },
    });
  }

  /**
   * This method allows retrieval of the current password history configuration settings.
   */
  async getPasswordHistoryConfiguration() {
    const response = await this.request({ GetPasswordHistoryConfiguration: {} });
    return response.getPasswordHistoryConfigurationResponse;
  }

  /**
   * This method allows setting of the password history configuration.
   * @param options
   */
  async setPasswordHistoryConfiguration(options: SetPasswordHistoryConfiguration): Promise<void> {
    await this.request({
      SetPasswordHistoryConfiguration: {
        Enabled: options.enabled,
        Length: options.length,
      },
    });
  }

  /**
   * This method allows retrieval of all the available parameters and their valid ranges for the
   * authentication failure warning configuration.
   */
  async getAuthFailureWarningOptions() {
    const response = await this.request({ GetAuthFailureWarningOptions: {} });
    return response.getAuthFailureWarningOptionsResponse;
  }

  /**
   * This method allows retrieval of the current authentication failure warning configuration settings.
   */
  async getAuthFailureWarningConfiguration(): Promise<GetAuthFailureWarningConfigurationResponse> {
    const response = await this.request({ GetAuthFailureWarningConfiguration: {} });
    return response.getAuthFailureWarningConfigurationResponse;
  }

  /**
   * This method allows setting of the authentication failure warning configuration.
   * @param options
   */
  async setAuthFailureWarningConfiguration(options: SetAuthFailureWarningConfiguration): Promise<void> {
    await this.request({
      SetAuthFailureWarningConfiguration: {
        Enabled: options.enabled,
        MonitorPeriod: options.monitorPeriod,
        MaxAuthFailures: options.maxAuthFailures,
      },
    });
  }

  /**
   * This operation sets the hostname on a device. It shall be possible to set the device hostname
   * configurations through the SetHostname command.
   *
   * A device shall accept string formated according to RFC 1123 section 2.1 or alternatively to RFC 952,
   * other string shall be considered as invalid strings.
   * @param options
   */
  async setHostname({ name }: SetHostname): Promise<void> {
    await this.request({
      SetHostname: { Name: name },
    });
  }

  /**
   * This operation controls whether the hostname is set manually or retrieved via DHCP.
   * @param options
   */
  async setHostnameFromDHCP({ fromDHCP }: SetHostnameFromDHCP): Promise<boolean> {
    const response = await this.request({
      SetHostnameFromDHCP: { FromDHCP: fromDHCP },
    });
    return response.setHostnameFromDHCPResponse.rebootNeeded;
  }

  /**
   * This operation gets the dynamic DNS settings from a device. If the device supports dynamic DNS as
   * specified in [RFC 2136] and [RFC 4702], it shall be possible to get the type, name and TTL through
   * the GetDynamicDNS command.
   */
  async getDynamicDNS(): Promise<DynamicDNSInformation> {
    const response = await this.request({ GetDynamicDNS: {} });
    return response.getDynamicDNSResponse.dynamicDNSInformation;
  }

  /**
   * This operation sets the dynamic DNS settings on a device. If the device supports dynamic DNS as
   * specified in [RFC 2136] and [RFC 4702], it shall be possible to set the type, name and TTL through
   * the SetDynamicDNS command.
   * @param options
   */
  async setDynamicDNS(options: SetDynamicDNS): Promise<void> {
    await this.request({
      SetDynamicDNS: {
        Type: options.type,
        ...(options.name !== undefined && { Name: options.name }),
        ...(options.TTL !== undefined && { TTL: options.TTL }),
      },
    });
  }

  /**
   * This operation gets defined network protocols from a device. The device shall support the
   * GetNetworkProtocols command returning configured network protocols.
   */
  async getNetworkProtocols(): Promise<NetworkProtocol[]> {
    const response = await this.request({ GetNetworkProtocols: {} }, { array: ['networkProtocols'] });
    return response.getNetworkProtocolsResponse.networkProtocols ?? [];
  }

  /**
   * This operation configures defined network protocols on a device. The device shall support
   * configuration of defined network protocols through the SetNetworkProtocols command.
   * @param options
   */
  async setNetworkProtocols({ networkProtocols }: SetNetworkProtocols): Promise<void> {
    await this.request({
      SetNetworkProtocols: {
        NetworkProtocols: networkProtocols.map((protocol) => Device.networkProtocolToBuild(protocol)),
      },
    });
  }

  /**
   * This operation gets the default gateway settings from a device. The device shall support the
   * GetNetworkDefaultGateway command returning configured default gateway address(es).
   */
  async getNetworkDefaultGateway(): Promise<NetworkGateway> {
    const response = await this.request({ GetNetworkDefaultGateway: {} });
    return response.getNetworkDefaultGatewayResponse.networkGateway;
  }

  /**
   * This operation sets the default gateway settings on a device. The device shall support configuration
   * of default gateway through the SetNetworkDefaultGateway command.
   * @param options
   */
  async setNetworkDefaultGateway(options: SetNetworkDefaultGateway): Promise<void> {
    await this.request({
      SetNetworkDefaultGateway: {
        ...(options.IPv4Address && { IPv4Address: Device.namesToBuild(options.IPv4Address) }),
        ...(options.IPv6Address && { IPv6Address: Device.namesToBuild(options.IPv6Address) }),
      },
    });
  }

  /**
   * This operation gets the zero-configuration from a device. If the device supports dynamic IP
   * configuration according to [RFC3927], it shall support the return of IPv4 zero configuration address
   * and status through the GetZeroConfiguration command.
   *
   * Devices supporting zero configuration on more than one interface shall use the extension to list the
   * additional interface settings.
   */
  async getZeroConfiguration(): Promise<NetworkZeroConfiguration> {
    const response = await this.request({ GetZeroConfiguration: {} });
    return response.getZeroConfigurationResponse.zeroConfiguration;
  }

  /**
   * This operation sets the zero-configuration. Use GetCapalities to get if zero-zero-configuration is
   * supported or not.
   * @param options
   */
  async setZeroConfiguration({ interfaceToken, enabled }: SetZeroConfiguration): Promise<void> {
    await this.request({
      SetZeroConfiguration: {
        InterfaceToken: interfaceToken,
        Enabled: enabled,
      },
    });
  }

  /**
   * This operation gets the IP address filter settings from a device. If the device supports device
   * access control based on IP filtering rules (denied or accepted ranges of IP addresses), the device
   * shall support the GetIPAddressFilter command.
   */
  async getIPAddressFilter(): Promise<IPAddressFilter> {
    const response = await this.request({ GetIPAddressFilter: {} });
    return response.getIPAddressFilterResponse.IPAddressFilter;
  }

  /**
   * This operation sets the IP address filter settings on a device. If the device supports device access
   * control based on IP filtering rules (denied or accepted ranges of IP addresses), the device shall
   * support configuration of IP filtering rules through the SetIPAddressFilter command.
   * @param options
   */
  async setIPAddressFilter({ IPAddressFilter }: SetIPAddressFilter): Promise<void> {
    await this.request({
      SetIPAddressFilter: {
        IPAddressFilter: Device.ipAddressFilterToBuild(IPAddressFilter),
      },
    });
  }

  /**
   * This operation adds an IP filter address to a device. If the device supports device access control
   * based on IP filtering rules (denied or accepted ranges of IP addresses), the device shall support
   * adding of IP filtering addresses through the AddIPAddressFilter command.
   * @param options
   */
  async addIPAddressFilter({ IPAddressFilter }: AddIPAddressFilter): Promise<void> {
    await this.request({
      AddIPAddressFilter: {
        IPAddressFilter: Device.ipAddressFilterToBuild(IPAddressFilter),
      },
    });
  }

  /**
   * This operation deletes an IP filter address from a device. If the device supports device access
   * control based on IP filtering rules (denied or accepted ranges of IP addresses), the device shall
   * support deletion of IP filtering addresses through the RemoveIPAddressFilter command.
   * @param options
   */
  async removeIPAddressFilter({ IPAddressFilter }: RemoveIPAddressFilter): Promise<void> {
    await this.request({
      RemoveIPAddressFilter: {
        IPAddressFilter: Device.ipAddressFilterToBuild(IPAddressFilter),
      },
    });
  }

  /**
   * Access to different services and sub-sets of services should be subject to access control. The WS-
   * Security framework gives the prerequisite for end-point authentication. Authorization decisions can
   * then be taken using an access security policy. This standard does not mandate any particular policy
   * description format or security policy but this is up to the device manufacturer or system provider
   * to choose policy and policy description format of choice. However, an access policy (in arbitrary
   * format) can be requested using this command. If the device supports access policy settings based on
   * WS-Security authentication, then the device shall support this command.
   */
  async getAccessPolicy(): Promise<BinaryData> {
    const response = await this.request({ GetAccessPolicy: {} });
    return response.getAccessPolicyResponse.policyFile;
  }

  /**
   * This command sets the device access security policy (for more details on the access security policy
   * see the Get command). If the device supports access policy settings based on WS-Security
   * authentication, then the device shall support this command.
   * @param options
   */
  async setAccessPolicy({ policyFile }: SetAccessPolicy): Promise<void> {
    await this.request({
      SetAccessPolicy: { PolicyFile: Device.binaryDataToBuild(policyFile) },
    });
  }

  /**
   * Create a self-signed certificate on the device (legacy Device service API).
   * @param options
   */
  async createCertificate(options: CreateCertificate = {}) {
    const response = await this.request({
      CreateCertificate: {
        ...(options.certificateID !== undefined && { CertificateID: options.certificateID }),
        ...(options.subject !== undefined && { Subject: options.subject }),
        ...(options.validNotBefore !== undefined && { ValidNotBefore: options.validNotBefore }),
        ...(options.validNotAfter !== undefined && { ValidNotAfter: options.validNotAfter }),
      },
    });
    return response.createCertificateResponse.nvtCertificate;
  }

  /**
   * Return ids and base64-encoded DER representations of all available certificates.
   */
  async getCertificates(): Promise<Certificate[]> {
    const response = await this.request({ GetCertificates: {} }, { array: ['nvtCertificate'] });
    return response.getCertificatesResponse.nvtCertificate ?? [];
  }

  /**
   * Indicate whether each certificate is used in an optional HTTPS configuration of the device.
   */
  async getCertificatesStatus(): Promise<CertificateStatus[]> {
    const response = await this.request({ GetCertificatesStatus: {} }, { array: ['certificateStatus'] });
    return response.getCertificatesStatusResponse.certificateStatus ?? [];
  }

  /**
   * Set whether certificates are used in an optional HTTPS configuration of the device.
   * @param options
   */
  async setCertificatesStatus({ certificateStatus }: SetCertificatesStatus): Promise<void> {
    await this.request({
      SetCertificatesStatus: {
        ...(certificateStatus && {
          CertificateStatus: certificateStatus.map((status) => Device.certificateStatusToBuild(status)),
        }),
      },
    });
  }

  /**
   * Delete certificates identified by the given certificate ids.
   * @param options
   */
  async deleteCertificates({ certificateID }: DeleteCertificates): Promise<void> {
    await this.request({
      DeleteCertificates: { CertificateID: Device.namesToBuild(certificateID) },
    });
  }

  /**
   * Request a PKCS#10 certification request for a certificate id.
   * @param options
   */
  async getPkcs10Request(options: GetPkcs10Request) {
    const response = await this.request({
      GetPkcs10Request: {
        CertificateID: options.certificateID,
        ...(options.subject !== undefined && { Subject: options.subject }),
        ...(options.attributes && { Attributes: Device.binaryDataToBuild(options.attributes) }),
      },
    });
    return response.getPkcs10RequestResponse.pkcs10Request;
  }

  /**
   * Load one or more NVT certificates onto the device.
   * @param options
   */
  async loadCertificates({ NVTCertificate }: LoadCertificates): Promise<void> {
    await this.request({
      LoadCertificates: { NVTCertificate: Device.certificatesToBuild(NVTCertificate) },
    });
  }

  /**
   * Return whether client authentication with a certificate is enabled.
   */
  async getClientCertificateMode(): Promise<boolean> {
    const response = await this.request({ GetClientCertificateMode: {} });
    return response.getClientCertificateModeResponse.enabled;
  }

  /**
   * Enable or disable client authentication with a certificate.
   * @param options
   */
  async setClientCertificateMode({ enabled }: SetClientCertificateMode): Promise<void> {
    await this.request({
      SetClientCertificateMode: { Enabled: enabled },
    });
  }

  /**
   * Return all available CA certificates from the device.
   */
  async getCACertificates(): Promise<Certificate[]> {
    const response = await this.request({ GetCACertificates: {} }, { array: ['CACertificate'] });
    return response.getCACertificatesResponse.CACertificate ?? [];
  }

  /**
   * Load a certificate together with its private key onto the device.
   * @param options
   */
  async loadCertificateWithPrivateKey({ certificateWithPrivateKey }: LoadCertificateWithPrivateKey): Promise<void> {
    await this.request({
      LoadCertificateWithPrivateKey: {
        CertificateWithPrivateKey: certificateWithPrivateKey.map((item) =>
          Device.certificateWithPrivateKeyToBuild(item),
        ),
      },
    });
  }

  /**
   * Return detailed information for a certificate.
   * @param options
   */
  async getCertificateInformation({ certificateID }: GetCertificateInformation) {
    const response = await this.request({
      GetCertificateInformation: { CertificateID: certificateID },
    });
    return response.getCertificateInformationResponse.certificateInformation;
  }

  /**
   * Load one or more CA certificates onto the device.
   * @param options
   */
  async loadCACertificates({ CACertificate }: LoadCACertificates): Promise<void> {
    await this.request({
      LoadCACertificates: { CACertificate: Device.certificatesToBuild(CACertificate) },
    });
  }

  /**
   * Create an IEEE 802.1X configuration on the device (legacy Device service API).
   * @param options
   */
  async createDot1XConfiguration({ dot1XConfiguration }: CreateDot1XConfiguration): Promise<void> {
    await this.request({
      CreateDot1XConfiguration: {
        Dot1XConfiguration: Device.dot1XConfigurationToBuild(dot1XConfiguration),
      },
    });
  }

  /**
   * Modify an existing IEEE 802.1X configuration on the device.
   * @param options
   */
  async setDot1XConfiguration({ dot1XConfiguration }: SetDot1XConfiguration): Promise<void> {
    await this.request({
      SetDot1XConfiguration: {
        Dot1XConfiguration: Device.dot1XConfigurationToBuild(dot1XConfiguration),
      },
    });
  }

  /**
   * Return a specific IEEE 802.1X configuration by token.
   * @param options
   */
  async getDot1XConfiguration({ dot1XConfigurationToken }: GetDot1XConfiguration) {
    const response = await this.request({
      GetDot1XConfiguration: { Dot1XConfigurationToken: dot1XConfigurationToken },
    });
    return response.getDot1XConfigurationResponse.dot1XConfiguration;
  }

  /**
   * Return all IEEE 802.1X configurations from the device.
   */
  async getDot1XConfigurations(): Promise<Dot1XConfiguration[]> {
    const response = await this.request({ GetDot1XConfigurations: {} }, { array: ['dot1XConfiguration'] });
    return response.getDot1XConfigurationsResponse.dot1XConfiguration ?? [];
  }

  /**
   * Delete IEEE 802.1X configuration(s) identified by token.
   * @param options
   */
  async deleteDot1XConfiguration({ dot1XConfigurationToken }: DeleteDot1XConfiguration): Promise<void> {
    await this.request({
      DeleteDot1XConfiguration: {
        Dot1XConfigurationToken: Device.namesToBuild(dot1XConfigurationToken),
      },
    });
  }

  /**
   * This operation gets a list of all available relay outputs and their settings.
   *
   * This method has been depricated with version 2.0. Refer to the DeviceIO service.
   */
  async getRelayOutputs(): Promise<RelayOutput[]> {
    const response = await this.request({ GetRelayOutputs: {} }, { array: ['relayOutputs'] });
    return response.getRelayOutputsResponse.relayOutputs ?? [];
  }

  /**
   * This operation sets the settings of a relay output.
   *
   * This method has been depricated with version 2.0. Refer to the DeviceIO service.
   * @param options
   */
  async setRelayOutputSettings({ relayOutputToken, properties }: SetRelayOutputSettings): Promise<void> {
    await this.request({
      SetRelayOutputSettings: {
        RelayOutputToken: relayOutputToken,
        Properties: Device.relayOutputSettingsToBuild(properties),
      },
    });
  }

  /**
   * This operation sets the state of a relay output.
   *
   * This method has been depricated with version 2.0. Refer to the DeviceIO service.
   * @param options
   */
  async setRelayOutputState({ relayOutputToken, logicalState }: SetRelayOutputState): Promise<void> {
    await this.request({
      SetRelayOutputState: {
        RelayOutputToken: relayOutputToken,
        LogicalState: logicalState,
      },
    });
  }

  /**
   * Manage auxiliary commands supported by a device, such as controlling an Infrared (IR) lamp, a heater
   * or a wiper or a thermometer that is connected to the device.
   *
   * The supported commands can be retrieved via the AuxiliaryCommands capability.
   *
   * Although the name of the auxiliary commands can be freely defined, commands starting with the prefix
   * tt: are reserved to define frequently used commands and these reserved commands shall all share the
   * "tt:command|parameter" syntax.
   *
   * tt:Wiper|On – Request to start the wiper. tt:Wiper|Off – Request to stop the wiper. tt:Washer|On –
   * Request to start the washer. tt:Washer|Off – Request to stop the washer. tt:WashingProcedure|On –
   * Request to start the washing procedure. tt: WashingProcedure |Off – Request to stop the washing
   * procedure. tt:IRLamp|On – Request to turn ON an IR illuminator attached to the unit. tt:IRLamp|Off –
   * Request to turn OFF an IR illuminator attached to the unit. tt:IRLamp|Auto – Request to configure an
   * IR illuminator attached to the unit so that it automatically turns ON and OFF.
   *
   * A device that indicates auxiliary service capability shall support this command.
   * @param options
   */
  async sendAuxiliaryCommand({ auxiliaryCommand }: SendAuxiliaryCommand) {
    const response = await this.request({
      SendAuxiliaryCommand: { AuxiliaryCommand: auxiliaryCommand },
    });
    return response.sendAuxiliaryCommandResponse.auxiliaryCommandResponse;
  }

  /**
   * This operation returns the IEEE802.11 capabilities. The device shall support this operation.
   */
  async getDot11Capabilities() {
    const response = await this.request({ GetDot11Capabilities: {} });
    return response.getDot11CapabilitiesResponse.capabilities;
  }

  /**
   * This operation returns the status of a wireless network interface. The device shall support this
   * command.
   * @param options
   */
  async getDot11Status({ interfaceToken }: GetDot11Status) {
    const response = await this.request({
      GetDot11Status: { InterfaceToken: interfaceToken },
    });
    return response.getDot11StatusResponse.status;
  }

  /**
   * This operation returns a lists of the wireless networks in range of the device. A device should
   * support this operation.
   * @param options
   */
  async scanAvailableDot11Networks({ interfaceToken }: ScanAvailableDot11Networks) {
    const response = await this.request(
      {
        ScanAvailableDot11Networks: { InterfaceToken: interfaceToken },
      },
      { array: ['networks'] },
    );
    return response.scanAvailableDot11NetworksResponse.networks ?? [];
  }

  /**
   * This operation is used to retrieve URIs from which system information may be downloaded using HTTP.
   * URIs may be returned for the following system information:
   *
   * System Logs. Multiple system logs may be returned, of different types. The exact format of the
   * system logs is outside the scope of this specification.
   *
   * Support Information. This consists of arbitrary device diagnostics information from a device. The
   * exact format of the diagnostic information is outside the scope of this specification.
   *
   * System Backup. The received file is a backup file that can be used to restore the current device
   * configuration at a later date. The exact format of the backup configuration file is outside the
   * scope of this specification.
   *
   * If the device allows retrieval of system logs, support information or system backup data, it should
   * make them available via HTTP GET. If it does, it shall support the GetSystemUris command.
   */
  async getSystemUris() {
    const response = await this.request({ GetSystemUris: {} });
    return response.getSystemUrisResponse;
  }

  /**
   * This operation initiates a firmware upgrade using the HTTP POST mechanism. The response to the
   * command includes an HTTP URL to which the upgrade file may be uploaded. The actual upgrade takes
   * place as soon as the HTTP POST operation has completed. The device should support firmware upgrade
   * through the StartFirmwareUpgrade command. The exact format of the firmware data is outside the scope
   * of this specification. Firmware upgrade over HTTP may be achieved using the following steps: Client
   * calls StartFirmwareUpgrade. Server responds with upload URI and optional delay value. Client waits
   * for delay duration if specified by server. Client transmits the firmware image to the upload URI
   * using HTTP POST. Server reprograms itself using the uploaded image, then reboots.
   *
   * If the firmware upgrade fails because the upgrade file was invalid, the HTTP POST response shall be
   * "415 Unsupported Media Type". If the firmware upgrade fails due to an error at the device, the HTTP
   * POST response shall be "500 Internal Server Error".
   *
   * The value of the Content-Type header in the HTTP POST request shall be "application/octetstream".
   */
  async startFirmwareUpgrade() {
    const response = await this.request({ StartFirmwareUpgrade: {} });
    return response.startFirmwareUpgradeResponse;
  }

  /**
   * This operation initiates a firmware upgrade using between the device and the MCS, without further
   * actions from the client. Cloud firmware upgrade may be achieved using the following steps:
   *
   * Client retrieves the list of available firmware versions from the MCS. Client calls UpgradeFirmware,
   * selecting the desired FW version. Device service responds with a downtime value. Device and MCS
   * perform the firmware upgrade procedure without further interaction from the Client Device notifies
   * the Client of the result by emitting the appropriate CloudFirmwareUpgrade event
   *
   * After applying a firmware upgrade the device shall keep the basic network configuration like IP
   * address, subnet mask and gateway or DHCP settings, as well as all the parameters of the Uplink and
   * Security service unchanged, so that it can connect to the cloud. Additionally a firmware upgrade
   * shall not change user credentials.
   * @param options
   * @returns Expected downtime while the firmware is upgraded
   */
  async upgradeFirmware({ version }: UpgradeFirmware): Promise<Duration> {
    const response = await this.request({
      UpgradeFirmware: { Version: version },
    });
    return response.upgradeFirmwareResponse.expectedDownTime;
  }

  /**
   * This operation initiates a system restore from backed up configuration data using the HTTP POST
   * mechanism. The response to the command includes an HTTP URL to which the backup file may be
   * uploaded. The actual restore takes place as soon as the HTTP POST operation has completed. Devices
   * should support system restore through the StartSystemRestore command. The exact format of the backup
   * configuration data is outside the scope of this specification.
   *
   * System restore over HTTP may be achieved using the following steps: Client calls StartSystemRestore.
   * Server responds with upload URI. Client transmits the configuration data to the upload URI using
   * HTTP POST. Server applies the uploaded configuration, then reboots if necessary.
   *
   * If the system restore fails because the uploaded file was invalid, the HTTP POST response shall be
   * "415 Unsupported Media Type". If the system restore fails due to an error at the device, the HTTP
   * POST response shall be "500 Internal Server Error".
   *
   * The value of the Content-Type header in the HTTP POST request shall be "application/octetstream".
   */
  async startSystemRestore() {
    const response = await this.request({ StartSystemRestore: {} });
    return response.startSystemRestoreResponse;
  }

  /**
   * This operation sets the hashing algorithm(s) used in HTTP and RTSP Digest Authentication.
   * @param options
   */
  async setHashingAlgorithm({ algorithm }: SetHashingAlgorithm): Promise<void> {
    await this.request({
      SetHashingAlgorithm: { Algorithm: Device.namesToBuild(algorithm) },
    });
  }

  /**
   * This operation lists all existing storage configurations for the device.
   */
  async getStorageConfigurations(): Promise<StorageConfiguration[]> {
    const response = await this.request({ GetStorageConfigurations: {} }, { array: ['storageConfigurations'] });
    return response.getStorageConfigurationsResponse.storageConfigurations ?? [];
  }

  /**
   * This operation creates a new storage configuration. The configuration data shall be created in the
   * device and shall be persistent (remain after reboot).
   * @param options
   */
  async createStorageConfiguration({ storageConfiguration }: CreateStorageConfiguration): Promise<ReferenceToken> {
    const response = await this.request({
      CreateStorageConfiguration: {
        StorageConfiguration: Device.storageConfigurationDataToBuild(storageConfiguration),
      },
    });
    return response.createStorageConfigurationResponse.token;
  }

  /**
   * This operation retrieves the Storage configuration associated with the given storage configuration
   * token.
   * @param options
   */
  async getStorageConfiguration({ token }: GetStorageConfiguration) {
    const response = await this.request({
      GetStorageConfiguration: { Token: token },
    });
    return response.getStorageConfigurationResponse.storageConfiguration;
  }

  /**
   * This operation modifies an existing Storage configuration.
   * @param options
   */
  async setStorageConfiguration({ storageConfiguration }: SetStorageConfiguration): Promise<void> {
    await this.request({
      SetStorageConfiguration: {
        StorageConfiguration: Device.storageConfigurationToBuild(storageConfiguration),
      },
    });
  }

  /**
   * This operation deletes the given storage configuration and configuration change shall always be
   * persistent.
   * @param options
   */
  async deleteStorageConfiguration({ token }: DeleteStorageConfiguration): Promise<void> {
    await this.request({
      DeleteStorageConfiguration: { Token: token },
    });
  }

  /**
   * This operation lists all existing geo location configurations for the device.
   */
  async getGeoLocation(): Promise<LocationEntity[]> {
    const response = await this.request({ GetGeoLocation: {} }, { array: ['location'] });
    return response.getGeoLocationResponse.location ?? [];
  }

  /**
   * This operation allows to modify one or more geo configuration entries.
   * @param options
   */
  async setGeoLocation({ location }: SetGeoLocation): Promise<void> {
    await this.request({
      SetGeoLocation: { Location: Device.locationEntitiesToBuild(location) },
    });
  }

  /**
   * This operation deletes the given geo location entries.
   * @param options
   */
  async deleteGeoLocation({ location }: DeleteGeoLocation): Promise<void> {
    await this.request({
      DeleteGeoLocation: { Location: Device.locationEntitiesToBuild(location) },
    });
  }
}
