/**
 * Device module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */

import {
  Onvif, OnvifServices, SetSystemDateAndTimeExtended,
} from './onvif';
import Service from './service';
import {
  DeviceServiceCapabilities,
  GetCapabilities, GetDeviceInformationResponse,
  GetServices,
  GetServicesResponse,
  Service as DeviceService, SetDNS, SetNetworkInterfaces, SetNetworkInterfacesResponse,
  SetNTP,
} from './interfaces/devicemgmt';
import {
  Capabilities,
  CapabilitiesExtension,
  DNSInformation, HostnameInformation, NetworkInterface,
  NTPInformation, Scope,
} from './interfaces/onvif';
import { AnyURI } from './interfaces/basics';

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
  get scopes() { return this.#scopes; }
  #serviceCapabilities?: DeviceServiceCapabilities;
  get serviceCapabilities() { return this.#serviceCapabilities; }
  #NTP?: NTPInformation;
  get NTP() { return this.#NTP; }
  #DNS?: DNSInformation;
  get DNS() { return this.#DNS; }
  #networkInterfaces?: NetworkInterface[];
  get networkInterfaces() { return this.#networkInterfaces; }

  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
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
  async getServices({ includeCapability }: GetServices = { includeCapability : true }): Promise<GetServicesResponse> {
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
      if (Object.prototype.hasOwnProperty.call(service, 'namespace') && Object.prototype.hasOwnProperty.call(service, 'XAddr')) {
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
      options = { category : ['All'] };
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
          this.onvif.uri[name as keyof OnvifServices] = this.onvif.parseUrl(this.onvif.capabilities[capabilityName]!.XAddr as string);
        }
      }
    });
    // extensions, eg. deviceIO
    if (this.onvif.capabilities.extension) {
      Object.keys(this.onvif.capabilities.extension).forEach((ext) => {
        const extensionName = ext as keyof CapabilitiesExtension;
        // TODO think about complex extensions like `telexCapabilities` and `scdlCapabilities`
        if ('XAddr' in this.onvif.capabilities.extension![extensionName]!
          && this.onvif.capabilities.extension![extensionName]!.XAddr
        ) {
          this.onvif.uri[extensionName] = new URL(this.onvif.capabilities.extension![extensionName]!.XAddr as string);
        }
      });
      // HACK for a Profile G NVR that has 'replay' but did not have 'recording' in GetCapabilities
      if (this.onvif.uri.replay && !this.onvif.uri.recording) {
        const tempRecorderXaddr = this.onvif.uri.replay.href.replace('replay', 'recording');
        this.onvif.emit('warn', `Adding ${tempRecorderXaddr} for bad Profile G device`);
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
      this.#serviceCapabilities!.misc!.auxiliaryCommands = capabilitiesResponse.capabilities.misc.auxiliaryCommands.split(' ');
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
    if (this.#NTP?.NTPManual && !Array.isArray(this.#NTP.NTPManual)) { this.#NTP.NTPManual = [this.#NTP.NTPManual]; }
    if (this.#NTP?.NTPFromDHCP && !Array.isArray(this.#NTP.NTPFromDHCP)) { this.#NTP.NTPFromDHCP = [this.#NTP.NTPFromDHCP]; }
    return this.#NTP!;
  }

  /**
   * Set the NTP settings on a device
   */
  async setNTP(options: SetNTP): Promise<NTPInformation> {
    const response = await this.request({
      SetNTP: {
        FromDHCP: options.fromDHCP ?? false,
        ...(options.NTPManual && Array.isArray(options.NTPManual) && {
          NTPManual: options.NTPManual
            .filter((NTPManual) => NTPManual.type)
            .map((NTPManual) => ({
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
    if (this.#DNS?.DNSManual && !Array.isArray(this.#DNS.DNSManual)) { this.#DNS.DNSManual = [this.#DNS.DNSManual]; }
    if (this.#DNS?.DNSFromDHCP && !Array.isArray(this.#DNS.DNSFromDHCP)) { this.#DNS.DNSFromDHCP = [this.#DNS.DNSFromDHCP]; }
    return this.#DNS!;
  }

  async setDNS(options: SetDNS): Promise<DNSInformation> {
    const response = await this.request({
      SetDNS: {
        FromDHCP: !!options.fromDHCP,
        ...(options.searchDomain && Array.isArray(options.searchDomain) && {
          SearchDomain: options.searchDomain,
        }),
        ...(options.DNSManual && Array.isArray(options.DNSManual) && {
          DNSManual: options.DNSManual
            .filter((DNSManual) => DNSManual.type)
            .map((DNSManual) => ({
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
    const response = await this.request({ GetNetworkInterfaces: {} }, { array : ['networkInterfaces', 'manual'] });
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
      return { rebootNeeded : false };
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
}
