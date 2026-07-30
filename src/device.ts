/**
 * Device module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */

import { Onvif, OnvifServices, SetSystemDateAndTimeExtended } from './onvif';
import Service from './service';
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
  SetNetworkInterfacesResponse,
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
  CapabilitiesExtension,
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
import { AnyURI } from './interfaces/basics';
import { LocationEntity, ReferenceToken } from './interfaces/common';

const SCHEMA_XMLNS = 'http://www.onvif.org/ver10/schema';

/**
 * Device methods
 */
export class Device extends Service {
  #services: DeviceService[] = [];
  get services() {
    return this.#services;
  }
  public media2Support = false;
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

  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
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
    const built = files.map((file) => ({
      Name: file.name,
      Data: Device.attachmentDataToBuild(file.data),
    }));
    return built.length === 1 ? built[0] : built;
  }

  private static networkHostToBuild(host: NetworkHost) {
    return {
      Type: { $: { xmlns: SCHEMA_XMLNS }, _: host.type },
      ...(host.IPv4Address && {
        IPv4Address: { $: { xmlns: SCHEMA_XMLNS }, _: host.IPv4Address },
      }),
      ...(host.IPv6Address && {
        IPv6Address: { $: { xmlns: SCHEMA_XMLNS }, _: host.IPv6Address },
      }),
      ...(host.DNSname && {
        DNSname: { $: { xmlns: SCHEMA_XMLNS }, _: host.DNSname },
      }),
      ...(host.extension && {
        Extension: { $: { xmlns: SCHEMA_XMLNS }, _: host.extension },
      }),
    };
  }

  private static networkHostsToBuild(hosts?: NetworkHost[]) {
    if (!hosts?.length) {
      return undefined;
    }
    const built = hosts.map((host) => Device.networkHostToBuild(host));
    return built.length === 1 ? built[0] : built;
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

  private static usersToBuild(users: User[]) {
    const built = users.map((user) => Device.userToBuild(user));
    return built.length === 1 ? built[0] : built;
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
    const built = certs.map((cert) => Device.certificateToBuild(cert));
    return built.length === 1 ? built[0] : built;
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
    const built = locations.map((location) => ({
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
    return built.length === 1 ? built[0] : built;
  }

  getSystemDateAndTime() {
    return this.onvif.getSystemDateAndTime();
  }

  setSystemDateAndTime(options: SetSystemDateAndTimeExtended) {
    return this.onvif.setSystemDateAndTime(options);
  }

  /**
   * Returns information about services of the device.
   */
  async getServices({ includeCapability }: GetServices = { includeCapability: true }): Promise<GetServicesResponse> {
    const response = await this.request({
      GetServices: {
        IncludeCapability: includeCapability,
      },
    });
    const result = response.getServicesResponse;
    this.#services = result.service;
    // ONVIF Profile T introduced Media2 (ver20) so cameras from around 2020/2021 will have
    // two media entries in the ServicesResponse, one for Media (ver10/media) and one for Media2 (ver20/media)
    // This is so that existing VMS software can still access the video via the orignal ONVIF Media API
    // fill Cam#uri property
    this.#services.forEach((service) => {
      // Look for services with namespaces and XAddr values
      if (
        Object.prototype.hasOwnProperty.call(service, 'namespace') &&
        Object.prototype.hasOwnProperty.call(service, 'XAddr')
      ) {
        // Only parse ONVIF namespaces. Axis cameras return Axis namespaces in GetServices
        if (!service.namespace || !service.XAddr) {
          return;
        }
        const parsedNamespace = new URL(service.namespace);
        if (parsedNamespace.hostname === 'www.onvif.org' && parsedNamespace.pathname) {
          const namespaceSplitted = parsedNamespace.pathname.substring(1).split('/'); // remove leading Slash, then split
          if (namespaceSplitted[1] === 'media' && namespaceSplitted[0] === 'ver20') {
            // special case for Media and Media2 where cameras supporting Profile S and Profile T (2020/2021 models) have two media services
            this.media2Support = true;
            namespaceSplitted[1] = 'media2';
          } else if (namespaceSplitted[1] === 'ptz') {
            // uppercase PTZ namespace to fit names convention
            namespaceSplitted[1] = 'PTZ';
          }
          this.onvif.uri[namespaceSplitted[1] as keyof OnvifServices] = this.onvif.parseUrl(service.XAddr);
        }
      }
    });
    return result;
  }

  /**
   * This method has been replaced by the more generic {@link Device.getServices | GetServices} method.
   * For capabilities of individual services refer to the GetServiceCapabilities methods.
   * @param options
   * @param options.category
   */
  async getCapabilities(options?: GetCapabilities): Promise<Capabilities> {
    if (!options || !options.category) {
      options = { category: ['All'] };
    }
    const response = await this.request({
      GetCapabilities: {
        Category: options.category,
      },
    });
    this.onvif.capabilities = response.getCapabilitiesResponse.capabilities as Capabilities;
    ['PTZ', 'media', 'imaging', 'events', 'device', 'analytics'].forEach((name) => {
      // All names in GetCapabilities are optional in the WSL spec. For example, my Pelco IMP1110-1 does not support Analytics.
      if (name in this.onvif.capabilities) {
        const capabilityName = name as keyof Capabilities;
        if ('XAddr' in this.onvif.capabilities[capabilityName]!) {
          this.onvif.uri[name as keyof OnvifServices] = this.onvif.parseUrl(
            this.onvif.capabilities[capabilityName]!.XAddr as string,
          );
        }
      }
    });
    // extensions, eg. deviceIO
    if (this.onvif.capabilities.extension) {
      Object.keys(this.onvif.capabilities.extension).forEach((ext) => {
        const extensionName = ext as keyof CapabilitiesExtension;
        // TODO think about complex extensions like `telexCapabilities` and `scdlCapabilities`
        if (
          'XAddr' in this.onvif.capabilities.extension![extensionName]! &&
          this.onvif.capabilities.extension![extensionName]!.XAddr
        ) {
          this.onvif.uri[extensionName] = new URL(this.onvif.capabilities.extension![extensionName]!.XAddr as string);
        }
      });
      // HACK for a Profile G NVR that has 'replay' but did not have 'recording' in GetCapabilities
      if (this.onvif.uri.replay && !this.onvif.uri.recording) {
        const tempRecorderXaddr = this.onvif.uri.replay.href.replace('replay', 'recording');
        this.onvif.emit('warn', new Error(`Adding ${tempRecorderXaddr} for bad Profile G device`));
        this.onvif.uri.recording = new URL(tempRecorderXaddr);
      }
    }
    return this.onvif.capabilities;
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
    const response = await this.request({ GetScopes: {} });
    this.#scopes = response.getScopesResponse.scopes;
    if (this.#scopes === undefined) {
      this.#scopes = [];
    } else if (!Array.isArray(this.#scopes)) {
      this.#scopes = [this.#scopes];
    }
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
      throw new Error('Wrong `SetScopes` response');
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
            NTPManual: options.NTPManual.filter((NTPManual) => NTPManual.type).map((NTPManual) => ({
              Type: { $: { xmlns: SCHEMA_XMLNS }, _: NTPManual.type },
              ...(NTPManual.IPv4Address && {
                IPv4Address: { $: { xmlns: SCHEMA_XMLNS }, _: NTPManual.IPv4Address },
              }),
              ...(NTPManual.IPv6Address && {
                IPv6Address: { $: { xmlns: SCHEMA_XMLNS }, _: NTPManual.IPv6Address },
              }),
              ...(NTPManual.DNSname && {
                DNSname: { $: { xmlns: SCHEMA_XMLNS }, _: NTPManual.DNSname },
              }),
              ...(NTPManual.extension && {
                Extension: { $: { xmlns: SCHEMA_XMLNS }, _: NTPManual.extension },
              }),
            })),
          }),
      },
    });
    if (response.setNTPResponse.length !== 0) {
      throw new Error('Wrong `SetNTP` response');
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
            DNSManual: options.DNSManual.filter((DNSManual) => DNSManual.type).map((DNSManual) => ({
              Type: { $: { xmlns: SCHEMA_XMLNS }, _: DNSManual.type },
              ...(DNSManual.IPv4Address && {
                IPv4Address: { $: { xmlns: SCHEMA_XMLNS }, _: DNSManual.IPv4Address },
              }),
              ...(DNSManual.IPv6Address && {
                IPv6Address: { $: { xmlns: SCHEMA_XMLNS }, _: DNSManual.IPv6Address },
              }),
            })),
          }),
      },
    });
    if (response.setDNSResponse.length !== 0) {
      throw new Error('Wrong `SetDNS` response');
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
   */
  async setNetworkInterfaces(options: SetNetworkInterfaces): Promise<SetNetworkInterfacesResponse> {
    const { networkInterface } = options;
    if (!networkInterface) {
      return { rebootNeeded: false };
    }
    const response = await this.request({
      SetNetworkInterfaces: {
        InterfaceToken: options.interfaceToken,
        NetworkInterface: {
          $: { xmlns: SCHEMA_XMLNS },
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
    return result;
  }

  async setSystemFactoryDefault({ factoryDefault }: SetSystemFactoryDefault): Promise<void> {
    await this.request({
      SetSystemFactoryDefault: { FactoryDefault: factoryDefault },
    });
  }

  async upgradeSystemFirmware({ firmware }: UpgradeSystemFirmware): Promise<string | undefined> {
    const response = await this.request({
      UpgradeSystemFirmware: { Firmware: Device.attachmentDataToBuild(firmware) },
    });
    return response.upgradeSystemFirmwareResponse.message;
  }

  async restoreSystem({ backupFiles }: RestoreSystem): Promise<void> {
    await this.request({
      RestoreSystem: { BackupFiles: Device.backupFilesToBuild(backupFiles) },
    });
  }

  async getSystemBackup(): Promise<BackupFile[]> {
    const response = await this.request({ GetSystemBackup: {} }, { array: ['backupFiles'] });
    const { backupFiles } = response.getSystemBackupResponse;
    return Array.isArray(backupFiles) ? backupFiles : backupFiles ? [backupFiles] : [];
  }

  async getSystemLog({ logType }: GetSystemLog) {
    const response = await this.request({
      GetSystemLog: { LogType: logType },
    });
    return response.getSystemLogResponse.systemLog;
  }

  async getSystemSupportInformation() {
    const response = await this.request({ GetSystemSupportInformation: {} });
    return response.getSystemSupportInformationResponse.supportInformation;
  }

  async addScopes({ scopeItem }: AddScopes): Promise<void> {
    await this.request({
      AddScopes: { ScopeItem: Device.namesToBuild(scopeItem) },
    });
    await this.getScopes();
  }

  async removeScopes({ scopeItem }: RemoveScopes): Promise<AnyURI[] | undefined> {
    const response = await this.request({
      RemoveScopes: { ScopeItem: Device.namesToBuild(scopeItem) },
    });
    const removed = response.removeScopesResponse.scopeItem;
    await this.getScopes();
    return removed;
  }

  async getDiscoveryMode() {
    const response = await this.request({ GetDiscoveryMode: {} });
    return response.getDiscoveryModeResponse.discoveryMode;
  }

  async setDiscoveryMode({ discoveryMode }: SetDiscoveryMode): Promise<void> {
    await this.request({
      SetDiscoveryMode: { DiscoveryMode: discoveryMode },
    });
  }

  async getRemoteDiscoveryMode() {
    const response = await this.request({ GetRemoteDiscoveryMode: {} });
    return response.getRemoteDiscoveryModeResponse.remoteDiscoveryMode;
  }

  async setRemoteDiscoveryMode({ remoteDiscoveryMode }: SetRemoteDiscoveryMode): Promise<void> {
    await this.request({
      SetRemoteDiscoveryMode: { RemoteDiscoveryMode: remoteDiscoveryMode },
    });
  }

  async getDPAddresses(): Promise<NetworkHost[] | undefined> {
    const response = await this.request({ GetDPAddresses: {} }, { array: ['DPAddress'] });
    const addresses = response.getDPAddressesResponse.DPAddress;
    return Array.isArray(addresses) ? addresses : addresses ? [addresses] : undefined;
  }

  async setDPAddresses({ DPAddress }: SetDPAddresses): Promise<void> {
    await this.request({
      SetDPAddresses: { DPAddress: Device.networkHostsToBuild(DPAddress) },
    });
  }

  async getEndpointReference() {
    const response = await this.request({ GetEndpointReference: {} });
    return response.getEndpointReferenceResponse;
  }

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

  async setUserRole({ userRole }: SetUserRole): Promise<void> {
    await this.request({
      SetUserRole: { UserRole: Device.userRoleToBuild(userRole) },
    });
  }

  async deleteUserRole({ userRole }: DeleteUserRole): Promise<void> {
    await this.request({
      DeleteUserRole: { UserRole: userRole },
    });
  }

  async getRemoteUser(): Promise<RemoteUser | undefined> {
    const response = await this.request({ GetRemoteUser: {} });
    return response.getRemoteUserResponse.remoteUser;
  }

  async setRemoteUser({ remoteUser }: SetRemoteUser): Promise<void> {
    await this.request({
      SetRemoteUser: {
        ...(remoteUser && { RemoteUser: Device.remoteUserToBuild(remoteUser) }),
      },
    });
  }

  async getUsers(): Promise<User[]> {
    const response = await this.request({ GetUsers: {} }, { array: ['user'] });
    return response.getUsersResponse.user ?? [];
  }

  async createUsers({ user }: CreateUsers): Promise<void> {
    await this.request({
      CreateUsers: { User: Device.usersToBuild(user) },
    });
  }

  async deleteUsers({ username }: DeleteUsers): Promise<void> {
    await this.request({
      DeleteUsers: { Username: Device.namesToBuild(username) },
    });
  }

  async setUser({ user }: SetUser): Promise<void> {
    await this.request({
      SetUser: { User: Device.usersToBuild(user) },
    });
  }

  async getWsdlUrl(): Promise<AnyURI> {
    const response = await this.request({ GetWsdlUrl: {} });
    return response.getWsdlUrlResponse.wsdlUrl;
  }

  async getPasswordComplexityOptions() {
    const response = await this.request({ GetPasswordComplexityOptions: {} });
    return response.getPasswordComplexityOptionsResponse;
  }

  async getPasswordComplexityConfiguration(): Promise<GetPasswordComplexityConfigurationResponse> {
    const response = await this.request({ GetPasswordComplexityConfiguration: {} });
    return response.getPasswordComplexityConfigurationResponse;
  }

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

  async getPasswordHistoryConfiguration() {
    const response = await this.request({ GetPasswordHistoryConfiguration: {} });
    return response.getPasswordHistoryConfigurationResponse;
  }

  async setPasswordHistoryConfiguration(options: SetPasswordHistoryConfiguration): Promise<void> {
    await this.request({
      SetPasswordHistoryConfiguration: {
        Enabled: options.enabled,
        Length: options.length,
      },
    });
  }

  async getAuthFailureWarningOptions() {
    const response = await this.request({ GetAuthFailureWarningOptions: {} });
    return response.getAuthFailureWarningOptionsResponse;
  }

  async getAuthFailureWarningConfiguration(): Promise<GetAuthFailureWarningConfigurationResponse> {
    const response = await this.request({ GetAuthFailureWarningConfiguration: {} });
    return response.getAuthFailureWarningConfigurationResponse;
  }

  async setAuthFailureWarningConfiguration(options: SetAuthFailureWarningConfiguration): Promise<void> {
    await this.request({
      SetAuthFailureWarningConfiguration: {
        Enabled: options.enabled,
        MonitorPeriod: options.monitorPeriod,
        MaxAuthFailures: options.maxAuthFailures,
      },
    });
  }

  async setHostname({ name }: SetHostname): Promise<void> {
    await this.request({
      SetHostname: { Name: name },
    });
  }

  async setHostnameFromDHCP({ fromDHCP }: SetHostnameFromDHCP): Promise<boolean> {
    const response = await this.request({
      SetHostnameFromDHCP: { FromDHCP: fromDHCP },
    });
    return response.setHostnameFromDHCPResponse.rebootNeeded;
  }

  async getDynamicDNS(): Promise<DynamicDNSInformation> {
    const response = await this.request({ GetDynamicDNS: {} });
    return response.getDynamicDNSResponse.dynamicDNSInformation;
  }

  async setDynamicDNS(options: SetDynamicDNS): Promise<void> {
    await this.request({
      SetDynamicDNS: {
        Type: options.type,
        ...(options.name !== undefined && { Name: options.name }),
        ...(options.TTL !== undefined && { TTL: options.TTL }),
      },
    });
  }

  async getNetworkProtocols(): Promise<NetworkProtocol[]> {
    const response = await this.request({ GetNetworkProtocols: {} }, { array: ['networkProtocols'] });
    return response.getNetworkProtocolsResponse.networkProtocols ?? [];
  }

  async setNetworkProtocols({ networkProtocols }: SetNetworkProtocols): Promise<void> {
    const built = networkProtocols.map((protocol) => Device.networkProtocolToBuild(protocol));
    await this.request({
      SetNetworkProtocols: {
        NetworkProtocols: built.length === 1 ? built[0] : built,
      },
    });
  }

  async getNetworkDefaultGateway(): Promise<NetworkGateway> {
    const response = await this.request({ GetNetworkDefaultGateway: {} });
    return response.getNetworkDefaultGatewayResponse.networkGateway;
  }

  async setNetworkDefaultGateway(options: SetNetworkDefaultGateway): Promise<void> {
    await this.request({
      SetNetworkDefaultGateway: {
        ...(options.IPv4Address && { IPv4Address: Device.namesToBuild(options.IPv4Address) }),
        ...(options.IPv6Address && { IPv6Address: Device.namesToBuild(options.IPv6Address) }),
      },
    });
  }

  async getZeroConfiguration(): Promise<NetworkZeroConfiguration> {
    const response = await this.request({ GetZeroConfiguration: {} });
    return response.getZeroConfigurationResponse.zeroConfiguration;
  }

  async setZeroConfiguration({ interfaceToken, enabled }: SetZeroConfiguration): Promise<void> {
    await this.request({
      SetZeroConfiguration: {
        InterfaceToken: interfaceToken,
        Enabled: enabled,
      },
    });
  }

  async getIPAddressFilter(): Promise<IPAddressFilter> {
    const response = await this.request({ GetIPAddressFilter: {} });
    return response.getIPAddressFilterResponse.IPAddressFilter;
  }

  async setIPAddressFilter({ IPAddressFilter }: SetIPAddressFilter): Promise<void> {
    await this.request({
      SetIPAddressFilter: {
        IPAddressFilter: Device.ipAddressFilterToBuild(IPAddressFilter),
      },
    });
  }

  async addIPAddressFilter({ IPAddressFilter }: AddIPAddressFilter): Promise<void> {
    await this.request({
      AddIPAddressFilter: {
        IPAddressFilter: Device.ipAddressFilterToBuild(IPAddressFilter),
      },
    });
  }

  async removeIPAddressFilter({ IPAddressFilter }: RemoveIPAddressFilter): Promise<void> {
    await this.request({
      RemoveIPAddressFilter: {
        IPAddressFilter: Device.ipAddressFilterToBuild(IPAddressFilter),
      },
    });
  }

  async getAccessPolicy(): Promise<BinaryData> {
    const response = await this.request({ GetAccessPolicy: {} });
    return response.getAccessPolicyResponse.policyFile;
  }

  async setAccessPolicy({ policyFile }: SetAccessPolicy): Promise<void> {
    await this.request({
      SetAccessPolicy: { PolicyFile: Device.binaryDataToBuild(policyFile) },
    });
  }

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

  async getCertificates(): Promise<Certificate[]> {
    const response = await this.request({ GetCertificates: {} }, { array: ['nvtCertificate'] });
    return response.getCertificatesResponse.nvtCertificate ?? [];
  }

  async getCertificatesStatus(): Promise<CertificateStatus[]> {
    const response = await this.request({ GetCertificatesStatus: {} }, { array: ['certificateStatus'] });
    return response.getCertificatesStatusResponse.certificateStatus ?? [];
  }

  async setCertificatesStatus({ certificateStatus }: SetCertificatesStatus): Promise<void> {
    const built = certificateStatus?.map((status) => Device.certificateStatusToBuild(status));
    await this.request({
      SetCertificatesStatus: {
        ...(built && { CertificateStatus: built.length === 1 ? built[0] : built }),
      },
    });
  }

  async deleteCertificates({ certificateID }: DeleteCertificates): Promise<void> {
    await this.request({
      DeleteCertificates: { CertificateID: Device.namesToBuild(certificateID) },
    });
  }

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

  async loadCertificates({ NVTCertificate }: LoadCertificates): Promise<void> {
    await this.request({
      LoadCertificates: { NVTCertificate: Device.certificatesToBuild(NVTCertificate) },
    });
  }

  async getClientCertificateMode(): Promise<boolean> {
    const response = await this.request({ GetClientCertificateMode: {} });
    return response.getClientCertificateModeResponse.enabled;
  }

  async setClientCertificateMode({ enabled }: SetClientCertificateMode): Promise<void> {
    await this.request({
      SetClientCertificateMode: { Enabled: enabled },
    });
  }

  async getCACertificates(): Promise<Certificate[]> {
    const response = await this.request({ GetCACertificates: {} }, { array: ['CACertificate'] });
    return response.getCACertificatesResponse.CACertificate ?? [];
  }

  async loadCertificateWithPrivateKey({ certificateWithPrivateKey }: LoadCertificateWithPrivateKey): Promise<void> {
    const built = certificateWithPrivateKey.map((item) => Device.certificateWithPrivateKeyToBuild(item));
    await this.request({
      LoadCertificateWithPrivateKey: {
        CertificateWithPrivateKey: built.length === 1 ? built[0] : built,
      },
    });
  }

  async getCertificateInformation({ certificateID }: GetCertificateInformation) {
    const response = await this.request({
      GetCertificateInformation: { CertificateID: certificateID },
    });
    return response.getCertificateInformationResponse.certificateInformation;
  }

  async loadCACertificates({ CACertificate }: LoadCACertificates): Promise<void> {
    await this.request({
      LoadCACertificates: { CACertificate: Device.certificatesToBuild(CACertificate) },
    });
  }

  async createDot1XConfiguration({ dot1XConfiguration }: CreateDot1XConfiguration): Promise<void> {
    await this.request({
      CreateDot1XConfiguration: {
        Dot1XConfiguration: Device.dot1XConfigurationToBuild(dot1XConfiguration),
      },
    });
  }

  async setDot1XConfiguration({ dot1XConfiguration }: SetDot1XConfiguration): Promise<void> {
    await this.request({
      SetDot1XConfiguration: {
        Dot1XConfiguration: Device.dot1XConfigurationToBuild(dot1XConfiguration),
      },
    });
  }

  async getDot1XConfiguration({ dot1XConfigurationToken }: GetDot1XConfiguration) {
    const response = await this.request({
      GetDot1XConfiguration: { Dot1XConfigurationToken: dot1XConfigurationToken },
    });
    return response.getDot1XConfigurationResponse.dot1XConfiguration;
  }

  async getDot1XConfigurations(): Promise<Dot1XConfiguration[]> {
    const response = await this.request({ GetDot1XConfigurations: {} }, { array: ['dot1XConfiguration'] });
    return response.getDot1XConfigurationsResponse.dot1XConfiguration ?? [];
  }

  async deleteDot1XConfiguration({ dot1XConfigurationToken }: DeleteDot1XConfiguration): Promise<void> {
    await this.request({
      DeleteDot1XConfiguration: {
        Dot1XConfigurationToken: Device.namesToBuild(dot1XConfigurationToken),
      },
    });
  }

  async getRelayOutputs(): Promise<RelayOutput[]> {
    const response = await this.request({ GetRelayOutputs: {} }, { array: ['relayOutputs'] });
    return response.getRelayOutputsResponse.relayOutputs ?? [];
  }

  async setRelayOutputSettings({ relayOutputToken, properties }: SetRelayOutputSettings): Promise<void> {
    await this.request({
      SetRelayOutputSettings: {
        RelayOutputToken: relayOutputToken,
        Properties: Device.relayOutputSettingsToBuild(properties),
      },
    });
  }

  async setRelayOutputState({ relayOutputToken, logicalState }: SetRelayOutputState): Promise<void> {
    await this.request({
      SetRelayOutputState: {
        RelayOutputToken: relayOutputToken,
        LogicalState: logicalState,
      },
    });
  }

  async sendAuxiliaryCommand({ auxiliaryCommand }: SendAuxiliaryCommand) {
    const response = await this.request({
      SendAuxiliaryCommand: { AuxiliaryCommand: auxiliaryCommand },
    });
    return response.sendAuxiliaryCommandResponse.auxiliaryCommandResponse;
  }

  async getDot11Capabilities() {
    const response = await this.request({ GetDot11Capabilities: {} });
    return response.getDot11CapabilitiesResponse.capabilities;
  }

  async getDot11Status({ interfaceToken }: GetDot11Status) {
    const response = await this.request({
      GetDot11Status: { InterfaceToken: interfaceToken },
    });
    return response.getDot11StatusResponse.status;
  }

  async scanAvailableDot11Networks({ interfaceToken }: ScanAvailableDot11Networks) {
    const response = await this.request(
      {
        ScanAvailableDot11Networks: { InterfaceToken: interfaceToken },
      },
      { array: ['networks'] },
    );
    return response.scanAvailableDot11NetworksResponse.networks ?? [];
  }

  async getSystemUris() {
    const response = await this.request({ GetSystemUris: {} });
    return response.getSystemUrisResponse;
  }

  async startFirmwareUpgrade() {
    const response = await this.request({ StartFirmwareUpgrade: {} });
    return response.startFirmwareUpgradeResponse;
  }

  async upgradeFirmware({ version }: UpgradeFirmware) {
    const response = await this.request({
      UpgradeFirmware: { Version: version },
    });
    return response.upgradeFirmwareResponse;
  }

  async startSystemRestore() {
    const response = await this.request({ StartSystemRestore: {} });
    return response.startSystemRestoreResponse;
  }

  async setHashingAlgorithm({ algorithm }: SetHashingAlgorithm): Promise<void> {
    await this.request({
      SetHashingAlgorithm: { Algorithm: Device.namesToBuild(algorithm) },
    });
  }

  async getStorageConfigurations(): Promise<StorageConfiguration[]> {
    const response = await this.request({ GetStorageConfigurations: {} }, { array: ['storageConfigurations'] });
    return response.getStorageConfigurationsResponse.storageConfigurations ?? [];
  }

  async createStorageConfiguration({ storageConfiguration }: CreateStorageConfiguration): Promise<ReferenceToken> {
    const response = await this.request({
      CreateStorageConfiguration: {
        StorageConfiguration: Device.storageConfigurationDataToBuild(storageConfiguration),
      },
    });
    return response.createStorageConfigurationResponse.token;
  }

  async getStorageConfiguration({ token }: GetStorageConfiguration) {
    const response = await this.request({
      GetStorageConfiguration: { Token: token },
    });
    return response.getStorageConfigurationResponse.storageConfiguration;
  }

  async setStorageConfiguration({ storageConfiguration }: SetStorageConfiguration): Promise<void> {
    await this.request({
      SetStorageConfiguration: {
        StorageConfiguration: Device.storageConfigurationToBuild(storageConfiguration),
      },
    });
  }

  async deleteStorageConfiguration({ token }: DeleteStorageConfiguration): Promise<void> {
    await this.request({
      DeleteStorageConfiguration: { Token: token },
    });
  }

  async getGeoLocation(): Promise<LocationEntity[]> {
    const response = await this.request({ GetGeoLocation: {} }, { array: ['location'] });
    return response.getGeoLocationResponse.location ?? [];
  }

  async setGeoLocation({ location }: SetGeoLocation): Promise<void> {
    await this.request({
      SetGeoLocation: { Location: Device.locationEntitiesToBuild(location) },
    });
  }

  async deleteGeoLocation({ location }: DeleteGeoLocation): Promise<void> {
    await this.request({
      DeleteGeoLocation: { Location: Device.locationEntitiesToBuild(location) },
    });
  }
}
