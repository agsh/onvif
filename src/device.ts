import url from 'url';
import {
  Onvif, OnvifServices, ReferenceToken, SetSystemDateAndTimeOptions,
} from './onvif';
import { linerase } from './utils';
import {
  DeviceServiceCapabilities,
  GetCapabilities, GetCapabilitiesResponse,
  GetServices,
  GetServicesResponse,
  Service,
  SetNTP,
} from './interfaces/devicemgmt';
import {
  Capabilities, CapabilitiesExtension,
  DNSInformation,
  IPv4Address,
  IPv6Address,
  NTPInformation,
} from './interfaces/onvif';

export interface OnvifVersion {
  /** Major version number */
  major: number;
  /**
   * Two digit minor version number.
   * If major version number is less than "16", X.0.1 maps to "01" and X.2.1 maps to "21" where X stands for Major version number.
   * Otherwise, minor number is month of release, such as "06" for June
   */
  minor: number;
}

export interface HostnameInformation {
  /** Indicates whether the hostname is obtained from DHCP or not */
  fromDHCP: boolean;
  /** Indicates the hostname */
  name?: string;
  extension?: any;
}

export interface DeviceInformation {
  /** The manufactor of the device */
  manufacturer: string;
  /** The device model */
  model: string;
  /** The firmware version in the device */
  firmwareVersion: string;
  /** The serial number of the device */
  serialNumber: string;
  /** The hardware ID of the device */
  hardwareId: string;
}

export interface Scope {
  /** Indicates if the scope is fixed or configurable */
  scopeDef: 'Fixed' | 'Configurable';
  /** Scope item URI */
  scopeItem: string;
}

export interface NetworkInterfaceInfo {
  /* Network interface name, for example eth0. */
  name?: string;
  /* Network interface MAC address. */
  hwAddress: string;
  /* Maximum transmission unit. */
  MTU?: number;
}

export interface NetworkInterfaceConnectionSetting {
  /* Auto negotiation on/off. */
  autoNegotiation: boolean;
  /* Speed. */
  speed: number;
  /* Duplex type, Half or Full. */
  duplex: 'Full' | 'Half';
}

export interface NetworkInterfaceLink {
  /* Configured link settings. */
  adminSettings: NetworkInterfaceConnectionSetting;
  /* Current active link settings. */
  operSettings: NetworkInterfaceConnectionSetting;
  /* Integer indicating interface type, for example: 6 is ethernet. */
  interfaceType: number;
}

export interface PrefixedIPv4Address {
  /** IPv4 address */
  address: IPv4Address;
  // Prefix/submask length
  prefixLength: number;
}

export interface IPv4Configuration {
  /** List of manually added IPv4 addresses. */
  manual?: PrefixedIPv4Address[];
  /** Link local address. */
  linkLocal?: PrefixedIPv4Address;
  /** IPv4 address configured by using DHCP. */
  fromDHCP?: PrefixedIPv4Address;
  /** Indicates whether or not DHCP is used. */
  DHCP?: boolean;
  /** Indicates whether or not IPv4 is enabled. */
  enabled?: boolean;
}

export interface IPv4NetworkInterface {
  /** Indicates whether or not IPv4 is enabled. */
  enabled: boolean;
  /** IPv4 configuration. */
  config?: IPv4Configuration;
}

export interface PrefixedIPv6Address {
  /** IPv6 address */
  address: IPv6Address;
  /** Prefix/submask length */
  prefixLength: number;
}

export interface IPv6Configuration {
  /** Indicates whether router advertisment is used. */
  acceptRouterAdvert?: boolean;
  /** Indicates whether or not IPv6 is enabled. */
  enabled?: boolean;
  /** DHCP configuration. */
  DHCP: 'Auto' | 'Stateful' | 'Stateless' | 'Off';
  /** List of manually entered IPv6 addresses. */
  manual?: PrefixedIPv6Address[];
  /** List of link local IPv6 addresses. */
  linkLocal?: PrefixedIPv6Address[];
  /** List of IPv6 addresses configured by using DHCP. */
  fromDHCP?: PrefixedIPv6Address[];
  /** List of IPv6 addresses configured by using router advertisment. */
  fromRA?: PrefixedIPv6Address[];
  extension?: any;
}

export interface IPv6NetworkInterface {
  /* Indicates whether or not IPv6 is enabled. */
  enabled: boolean;
  /* IPv4 configuration. */
  config: IPv6Configuration;
}

export interface Dot11PSKSet {
  /* According to IEEE802.11-2007 H.4.1 the RSNA PSK consists of 256 bits, or 64 octets when represented in hex
  Either Key or Passphrase shall be given, if both are supplied Key shall be used by the device and Passphrase ignored. */
  key?: number;
  /* According to IEEE802.11-2007 H.4.1 a pass-phrase is a sequence of between 8 and 63 ASCII-encoded characters and
  each character in the pass-phrase must have an encoding in the range of 32 to 126 (decimal),inclusive.
  If only Passpharse is supplied the Key shall be derived using the algorithm described in IEEE802.11-2007 section H.4 */
  passphrase?: string;
  extension?: any;
}

export interface Dot11SecurityConfiguration {
  mode: 'None' | 'WEP' | 'PSK' | 'Dot1X' | 'Extended';
  algorithm?: 'CCMP' | 'TKIP' | 'Any' | 'Extended';
  PSK?: Dot11PSKSet;
  dot1X?: ReferenceToken;
  extension?: any;
}

export interface Dot11Configuration {
  SSID: number;
  mode: 'Ad-hoc' | 'Infrastructure' | 'Extended';
  alias: string;
  priority: number;
  security: Dot11SecurityConfiguration;
}

export interface NetworkInterfaceExtension {
  interfaceType: number;
  /* Extension point prepared for future 802.3 configuration. */
  dot3?: any;
  dot11?: Dot11Configuration;
  extension?: any;
}

export interface NetworkInterface {
  /* Unique identifier referencing the physical entity. */
  token: ReferenceToken;
  /* Indicates whether or not an interface is enabled. */
  enabled: boolean;
  /* Network interface information */
  info?: NetworkInterfaceInfo;
  /* Link configuration. */
  link?: NetworkInterfaceLink;
  // IPv4 network interface configuration.
  IPv4?: IPv4NetworkInterface;
  // IPv6 network interface configuration.
  IPv6?: IPv6NetworkInterface;
  extension?: NetworkInterfaceExtension;
}

/**
 * Device methods
 */
export class Device {
  private readonly onvif: Onvif;
  #services: Service[] = [];
  get services() {
    return this.#services;
  }
  public media2Support = false;
  #scopes: Scope[] = [];
  get scopes() { return this.#scopes; }
  #serviceCapabilities: DeviceServiceCapabilities = {};
  get serviceCapabilities() { return this.#serviceCapabilities; }
  #NTP?: NTPInformation;
  get NTP() { return this.#NTP; }
  #DNS?: DNSInformation;
  get DNS() { return this.#NTP; }
  #networkInterfaces?: NetworkInterface[];
  get newtworkInterfaces() { return this.#networkInterfaces; }

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  getSystemDateAndTime() {
    return this.onvif.getSystemDateAndTime();
  }

  setSystemDateAndTime(options: SetSystemDateAndTimeOptions) {
    return this.onvif.setSystemDateAndTime(options);
  }

  /**
   * Returns information about services of the device.
   */
  async getServices({ includeCapability }: GetServices = { includeCapability : true }): Promise<GetServicesResponse> {
    const [data] = await this.onvif.request({
      body : '<GetServices xmlns="http://www.onvif.org/ver10/device/wsdl">'
          + `<IncludeCapability>${includeCapability}</IncludeCapability>`
          + '</GetServices>',
    });
    const result = linerase(data).getServicesResponse;
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
        const parsedNamespace = url.parse(service.namespace);
        if (parsedNamespace.hostname === 'www.onvif.org' && parsedNamespace.path) {
          const namespaceSplitted = parsedNamespace.path.substring(1).split('/'); // remove leading Slash, then split
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
   */
  async getCapabilities(options?: GetCapabilities): Promise<GetCapabilitiesResponse> {
    if (!options || !options.category) {
      options = { category : ['All'] };
    }
    const [data] = await this.onvif.request({
      body : `<GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl">${
        options.category!.map((category) => `<Category>${category}</Category>`).join('')
      }</GetCapabilities>`,
    });
    this.onvif.capabilities = linerase(data[0].getCapabilitiesResponse[0].capabilities[0]);
    ['PTZ', 'media', 'imaging', 'events', 'device', 'analytics'].forEach((name) => {
      const capabilityName = name as keyof Capabilities;
      if ('XAddr' in this.onvif.capabilities[capabilityName]!) {
        this.onvif.uri[name as keyof OnvifServices] = this.onvif.parseUrl(this.onvif.capabilities[capabilityName]!.XAddr as string);
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
    return { capabilities : this.onvif.capabilities };
  }

  /**
   * Receive device information
   */
  async getDeviceInformation(): Promise<DeviceInformation> {
    const [data] = await this.onvif.request({ body : '<GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl"/>' });
    this.onvif.deviceInformation = linerase(data).getDeviceInformationResponse;
    return this.onvif.deviceInformation!;
  }

  /**
   * Receive hostname information
   */
  async getHostname(): Promise<HostnameInformation> {
    const [data] = await this.onvif.request({
      body : '<GetHostname xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
    });
    return linerase(data).getHostnameResponse.hostnameInformation;
  }

  /**
   * Receive the scope parameters of a device
   */
  async getScopes(): Promise<Scope[]> {
    const [data] = await this.onvif.request({
      body : '<GetScopes xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
    });
    this.#scopes = linerase(data).getScopesResponse.scopes;
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
  async setScopes(scopes: string[]) {
    const [data] = await this.onvif.request({
      body : `<SetScopes xmlns="http://www.onvif.org/ver10/device/wsdl">${
        scopes.map((uri) => `<Scopes>${uri}</Scopes>`).join('')
      }</SetScopes>`,
    });
    if (linerase(data).setScopesResponse !== '') {
      throw new Error('Wrong `SetScopes` response');
    }
    // get new scopes from device
    return this.getScopes();
  }

  /**
   * Returns the capabilities of the device service. The result is returned in a typed answer
   */
  async getServiceCapabilities() {
    const [data] = await this.onvif.request({
      body : '<GetServiceCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl" />',
    });
    const capabilitiesResponse = linerase(data);
    this.#serviceCapabilities = {
      network  : capabilitiesResponse.getServiceCapabilitiesResponse.capabilities.network,
      security : capabilitiesResponse.getServiceCapabilitiesResponse.capabilities.security,
      system   : capabilitiesResponse.getServiceCapabilitiesResponse.capabilities.system,
    };
    if (capabilitiesResponse.getServiceCapabilitiesResponse.capabilities.misc) {
      this.#serviceCapabilities.misc = capabilitiesResponse.getServiceCapabilitiesResponse.capabilities.misc;
      this.#serviceCapabilities.misc!.auxiliaryCommands = capabilitiesResponse.getServiceCapabilitiesResponse.capabilities.misc.AuxiliaryCommands.split(' ');
    }
    return this.#serviceCapabilities;
  }

  /**
   * This operation reboots the device
   */
  async systemReboot(): Promise<string> {
    return this.onvif.request({
      service : 'device', // or 'deviceIO' ?
      body    : '<SystemReboot xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
    }).then(([data]) => data[0].systemRebootResponse[0].message[0]);
  }

  /**
   * This operation gets the NTP settings from a device. If the device supports NTP, it shall be possible to get the
   * NTP server settings through the GetNTP command.
   */
  async getNTP(): Promise<NTPInformation> {
    const [data] = await this.onvif.request({
      service : 'device',
      body    : '<GetNTP xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
    });
    this.#NTP = linerase(data[0].getNTPResponse[0].NTPInformation[0]);
    if (this.#NTP?.NTPManual && !Array.isArray(this.#NTP.NTPManual)) { this.#NTP.NTPManual = [this.#NTP.NTPManual]; }
    if (this.#NTP?.NTPFromDHCP && !Array.isArray(this.#NTP.NTPFromDHCP)) { this.#NTP.NTPFromDHCP = [this.#NTP.NTPFromDHCP]; }
    return this.#NTP!;
  }

  /**
   * Set the NTP settings on a device
   */
  async setNTP(options: SetNTP): Promise<NTPInformation> {
    let body = '<SetNTP xmlns="http://www.onvif.org/ver10/device/wsdl">'
      + `<FromDHCP>${options.fromDHCP ?? false}</FromDHCP>`;
    if (options.NTPManual && Array.isArray(options.NTPManual)) {
      options.NTPManual.forEach((NTPManual) => {
        body += (NTPManual.type ? '<NTPManual>'
          + `<Type xmlns="http://www.onvif.org/ver10/schema">${NTPManual.type}</Type>${
            NTPManual.IPv4Address ? `<IPv4Address xmlns="http://www.onvif.org/ver10/schema">${NTPManual.IPv4Address}</IPv4Address>` : ''
          }${NTPManual.IPv6Address ? `<IPv6Address xmlns="http://www.onvif.org/ver10/schema">${NTPManual.IPv6Address}</IPv6Address>` : ''
          }${NTPManual.DNSname ? `<DNSname>${NTPManual.DNSname}</DNSname>` : ''
          }${NTPManual.extension ? `<Extension>${NTPManual.extension}</Extension>` : ''
          }</NTPManual>` : '');
      });
    }
    body += '</SetNTP>';
    const [data, stat] = await this.onvif.request({
      service : 'device',
      body,
    });
    return linerase(data[0].setNTPResponse);
  }

  /**
   * This operation gets the DNS settings from a device. The device shall return its DNS configurations through the
   * GetDNS command.
   */
  async getDNS(): Promise<DNSInformation> {
    const [data] = await this.onvif.request({
      service : 'device',
      body    : '<GetDNS xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
    });
    this.#DNS = linerase(data[0].getDNSResponse[0].DNSInformation);
    if (this.#DNS?.DNSManual && !Array.isArray(this.#DNS.DNSManual)) { this.#DNS.DNSManual = [this.#DNS.DNSManual]; }
    if (this.#DNS?.DNSFromDHCP && !Array.isArray(this.#DNS.DNSFromDHCP)) { this.#DNS.DNSFromDHCP = [this.#DNS.DNSFromDHCP]; }
    return this.#DNS!;
  }

  /**
   * This operation gets the network interface configuration from a device. The device shall support return of network
   * interface configuration settings as defined by the NetworkInterface type through the GetNetworkInterfaces command.
   */
  async getNetworkInterfaces(): Promise<NetworkInterface[]> {
    const [data] = await this.onvif.request({
      service : 'device',
      body    : '<GetNetworkInterfaces xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
    });
    const networkInterfaces = linerase(data[0].getNetworkInterfacesResponse[0].networkInterfaces);
    // networkInterfaces is an array of network interfaces, but linerase remove the array if there is only one element inside
    // so we convert it back to an array
    if (!Array.isArray(networkInterfaces)) {
      this.#networkInterfaces = [networkInterfaces];
    } else {
      this.#networkInterfaces = networkInterfaces;
    }
    return this.#networkInterfaces;
  }

  /**
   * Set network interfaces information
   */
  // async setNetworkInterfaces(options: SetNetworkInterfacesOptions) {
  //
  // }
}
