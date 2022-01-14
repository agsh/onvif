import url from 'url';
import { Onvif, OnvifServices } from './onvif';
import { linerase } from './utils';

export interface OnvifService {
  /** Namespace uri */
  namespace: string;
  /** Uri for requests */
  XAddr: string;
  /** Minor version */
  minor: number;
  /** Major version */
  major: number;
}

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

export interface NetworkCapabilitiesExtension {
  dot11Configuration?: boolean;
  extension?: any;
}

/** Network capabilities */
export interface NetworkCapabilities {
  /** Indicates support for IP filtering */
  IPFilter?: boolean;
  /** Indicates support for zeroconf */
  zeroConfiguration?: boolean;
  /** Indicates support for IPv6 */
  IPVersion6?: boolean;
  /** Indicates support for dynamic DNS configuration */
  dynDNS?: boolean;
  extension: NetworkCapabilitiesExtension;
}

export interface SystemCapabilitiesExtension {
  httpFirmwareUpgrade?: boolean;
  httpSystemBackup?: boolean;
  httpSystemLogging?: boolean;
  httpSupportInformation?: boolean;
  extension?: any;
}

/** System capabilities */
export interface SystemCapabilities {
  /** Indicates whether or not WS Discovery resolve requests are supported */
  discoveryResolve: boolean;
  /** Indicates support for WS Discovery resolve requests */
  discoveryBye: boolean;
  /** Indicates support for remote discovery */
  remoteDiscovery: boolean;
  /** Indicates support for system backup through MTOM */
  systemBackup: boolean;
  /** Indicates support for retrieval of system logging through MTOM */
  systemLogging: boolean;
  /** Indicates support for firmware upgrade through MTOM */
  firmwareUpgrade: boolean;
  /** Indicates support for firmware upgrade through HTTP */
  httpFirmwareUpgrade?: boolean;
  /** Indicates support for system backup through HTTP */
  httpSystemBackup?: boolean;
  /** Indicates support for retrieval of system logging through HTTP */
  httpSystemLogging?: boolean;
  /** Indicates supported ONVIF version(s) */
  supportedVersions: OnvifVersion;
  extensions?: SystemCapabilitiesExtension;
}

export interface IOCapabilitiesExtension {
  auxiliary?: boolean;
  auxiliaryCommands?: Record<string, unknown>;
  extension?: any;
}

export interface IOCapabilities {
  /** Number of input connectors */
  inputConnectors?: number;
  /** Number of relay outputs */
  relayOutputs?: number;
  extension?: IOCapabilitiesExtension;
}

export interface SecurityCapabilitiesExtension2 {
  dot1X: boolean;
  /** EAP Methods supported by the device. The int values refer to the IANA EAP Registry */
  supportedEAPMethod?: number;
  remoteUserHandling: boolean;
}

export interface SecurityCapabilitiesExtension {
  /** Indicates support for TLS 1.0 */
  'TLS1.0': boolean;
  extension?: SecurityCapabilitiesExtension2;
}

/** Security capabilities */
export interface SecurityCapabilities {
  /** Indicates support for TLS 1.1 */
  'TLS1.1': boolean;
  /** Indicates support for TLS 1.2 */
  'TLS1.2': boolean;
  /** Indicates support for onboard key generation */
  onboardKeyGeneration: boolean;
  /** Indicates support for access policy configuration */
  accessPolicyConfig: boolean;
  /** Indicates support for WS-Security X.509 token */
  'X.509Token': boolean;
  /** Indicates support for WS-Security SAML token */
  SAMLToken: boolean;
  /** Indicates support for WS-Security Kerberos token */
  kerberosToken: boolean;
  /** Indicates support for WS-Security REL token */
  RELToken: boolean;
  extension?: SecurityCapabilitiesExtension;
}

/**
 * Event capabilities
 */
export interface EventCapabilities {
  /** Event service URI */
  XAddr: string;
  /** Indicates whether or not WS Subscription policy is supported */
  WSSubscriptionPolicySupport: boolean;
  /** Indicates whether or not WS Pull Point is supported */
  WSPullPointSupport: boolean;
  /** Indicates whether or not WS Pausable Subscription Manager Interface is supported */
  WSPausableSubscriptionManagerInterfaceSupport: boolean;
}

export interface ImagingCapabilities {
  /** Imaging service URI */
  XAddr: string;
}

export interface RealTimeStreamingCapabilities {
  /** Indicates whether or not RTP multicast is supported */
  RTPMulticast: boolean;
  /** Indicates whether or not RTP over TCP is supported */
  RTP_TCP: boolean;
  /** Indicates whether or not RTP/RTSP/TCP is supported */
  RTP_RTSP_TCP: boolean;
  /** Extensions */
  extension: any;
}

export interface ProfileCapabilities {
  maximumNumberOfProfiles: number;
}

export interface MediaCapabilitiesExtension {
  profileCapabilities: ProfileCapabilities;
}

export interface MediaCapabilities {
  /** Media service URI */
  XAddr: string;
  /** Streaming capabilities */
  streamingCapabilities: RealTimeStreamingCapabilities;
  extension?: MediaCapabilitiesExtension;
}

/** PTZ capabilities */
export interface PTZCapabilities {
  /** PTZ service URI */
  XAddr: string;
}

export interface DeviceIOCapabilities {
  /** DeviceIO service URI */
  XAddr: string;
  videoSources: number;
  videoOutputs: number;
  audioSources: number;
  audioOutputs: number;
  relayOutputs: number;
  extensions: {
    telexCapabilities: any;
    scdlCapabilities: any;
  }
}

export interface DisplayCapabilities {
  XAddr: string;
  /** Indication that the SetLayout command supports only predefined layouts */
  fixedLayout: boolean;
}

export interface RecordingCapabilities {
  XAddr: string;
  receiverSource: boolean;
  mediaProfileSource: boolean;
  dynamicRecordings: boolean;
  dynamicTracks: boolean;
  maxStringLength: number;
}

export interface SearchCapabilities {
  XAddr: string;
  metadataSearch: boolean;
}

export interface ReplayCapabilities {
  XAddr: string;
}

export interface ReceiverCapabilities {
  /** The address of the receiver service */
  XAddr: string;
  /** Indicates whether the device can receive RTP multicast streams */
  RTP_Multicast: boolean;
  /** Indicates whether the device can receive RTP/TCP streams */
  RTP_TCP: boolean;
  /** Indicates whether the device can receive RTP/RTSP/TCP streams */
  RTP_RTSP_TCP: boolean;
  /** The maximum number of receivers supported by the device */
  supportedReceivers: number;
  /** The maximum allowed length for RTSP URIs */
  maximumRTSPURILength: number;
}

export interface AnalyticsDeviceCapabilities {
  XAddr: string;
  ruleSupport?: boolean;
  extension?: any;
}

export interface CapabilitiesExtension {
  /** DeviceIO capabilities */
  deviceIO?: DeviceIOCapabilities;
  display?: DisplayCapabilities;
  recording?: RecordingCapabilities;
  search?: SearchCapabilities;
  replay?: ReplayCapabilities;
  receiver?: ReceiverCapabilities;
  analyticsDevice?: AnalyticsDeviceCapabilities;
}

/** Device capabilities */
export interface DeviceCapabilities {
  /** Device service URI */
  XAddr: string;
  network?: NetworkCapabilities;
  system?: SystemCapabilities;
  IO?: IOCapabilities;
  security?: SecurityCapabilities;
  extensions?: any;
}

/** Analytics capabilities */
export interface AnalyticsCapabilities {
  /** Analytics service URI */
  XAddr: string;
  /** Indicates whether or not rules are supported */
  ruleSupport: boolean;
  /** Indicates whether or not modules are supported */
  analyticsModuleSupport: boolean;
}

/**
 * Capability list
 */
export interface Capabilities {
  analytics?: AnalyticsCapabilities;
  device?: DeviceCapabilities;
  events?: EventCapabilities;
  imaging?: ImagingCapabilities;
  media?: MediaCapabilities;
  ptz?: PTZCapabilities;
  extension?: CapabilitiesExtension;
}

/**
 * Device methods
 */
export class Device {
  private readonly onvif: Onvif;
  private services: OnvifService[] = [];
  private media2Support = false;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  getSystemDateAndTime() {
    return this.onvif.getSystemDateAndTime();
  }

  /**
   * Returns information about services of the device.
   */
  async getServices(includeCapability = true): Promise<OnvifService[]> {
    const [data] = await this.onvif.request({
      body : '<GetServices xmlns="http://www.onvif.org/ver10/device/wsdl">'
          + `<IncludeCapability>${includeCapability}</IncludeCapability>`
          + '</GetServices>',
    });
    this.services = linerase(data).getServicesResponse.service;
    // ONVIF Profile T introduced Media2 (ver20) so cameras from around 2020/2021 will have
    // two media entries in the ServicesResponse, one for Media (ver10/media) and one for Media2 (ver20/media)
    // This is so that existing VMS software can still access the video via the orignal ONVIF Media API
    // fill Cam#uri property
    if (!this.onvif.uri) {
      /**
       * Device service URIs
       * @name Onvif#uri
       * @property {url} [PTZ]
       * @property {url} [media]
       * @property {url} [media2]
       * @property {url} [imaging]
       * @property {url} [events]
       * @property {url} [device]
       */
      this.onvif.uri = {};
    }
    this.services.forEach((service) => {
      // Look for services with namespaces and XAddr values
      if (Object.prototype.hasOwnProperty.call(service, 'namespace') && Object.prototype.hasOwnProperty.call(service, 'XAddr')) {
        // Only parse ONVIF namespaces. Axis cameras return Axis namespaces in GetServices
        const parsedNamespace = url.parse(service.namespace);
        if (parsedNamespace.hostname === 'www.onvif.org' && parsedNamespace.path) {
          const namespaceSplitted = parsedNamespace.path.substring(1).split('/'); // remove leading Slash, then split
          // special case for Media and Media2 where cameras supporting Profile S and Profile T (2020/2021 models) have two media services
          if (namespaceSplitted[1] === 'media' && namespaceSplitted[0] === 'ver20') {
            this.media2Support = true;
            namespaceSplitted[1] = 'media2';
          }
          this.onvif.uri[namespaceSplitted[1] as keyof OnvifServices] = this.onvif.parseUrl(service.XAddr);
        }
      }
    });
    return this.services;
  }

  /**
   * This method has been replaced by the more generic GetServices method. For capabilities of individual services refer to the GetServiceCapabilities methods.
   */
  async getCapabilities(): Promise<Capabilities> {
    return {
      device : {
        XAddr : 'kjh',
      },
    };
  }
}
