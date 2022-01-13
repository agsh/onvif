import url from 'url';
import { CamService, CamServices, Onvif } from './onvif';
import { linerase } from './utils';

export class Device {
  private readonly onvif: Onvif;
  private services: CamService[] = [];
  private media2Support = false;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * Returns information about services of the device.
   * @param includeCapability
   */
  async getServices(includeCapability = true): Promise<CamService[]> {
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
          this.onvif.uri[namespaceSplitted[1] as keyof CamServices] = this.onvif.parseUrl(service.XAddr);
        }
      }
    });
    return this.services;
  }

  /**
   * This method has been replaced by the more generic GetServices method. For capabilities of individual services refer to the GetServiceCapabilities methods.
   */
  // eslint-disable-next-line no-use-before-define
  async getCapabilities(): Promise<iCapabilities> {
    return {
      device : {
        XAddr : 'kjh',
      },
    };
  }
}

/** Network capabilities */
export interface iNetwork {
  /** Indicates support for IP filtering */
  IPFilter: boolean;
  /** Indicates support for zeroconf */
  zeroConfiguration: boolean;
  /** Indicates support for IPv6 */
  IPVersion6: boolean;
  /** Indicates support for dynamic DNS configuration */
  dynDNS: boolean;
}

/** System capabilities */
export interface iSystem {
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
  httpFirmwareUpgrade: boolean;
  /** Indicates support for system backup through HTTP */
  httpSystemBackup: boolean;
  /** Indicates support for retrieval of system logging through HTTP */
  httpSystemLogging: boolean;
}

export interface iIO {
  /** Number of input connectors */
  inputConnectors: number;
  /** Number of relay outputs */
  relayOutputs: number;
  extension: {
    auxiliary: boolean;
    auxiliaryCommands: Record<string, unknown>;
  }
}

/** Security capabilities */
export interface iSecurity {
  /** Indicates support for TLS 1.1 */
  'TLS1.1': boolean;
  /** Indicates support for TLS 1.2 */
}
// * @property {object} [device.security]
// * @property {boolean} device.security.'TLS1.1' Indicates support for TLS 1.1
// * @property {boolean} device.security.'TLS1.2' Indicates support for TLS 1.2
// * @property {boolean} device.security.onboardKeyGeneration Indicates support for onboard key generation
// * @property {boolean} device.security.accessPolicyConfig Indicates support for access policy configuration
// * @property {boolean} device.security.'X.509Token' Indicates support for WS-Security X.509 token
// * @property {boolean} device.security.SAMLToken Indicates support for WS-Security SAML token
// * @property {boolean} device.security.kerberosToken Indicates support for WS-Security Kerberos token
// * @property {boolean} device.security.RELToken Indicates support for WS-Security REL token
// * @property {object} events Event capabilities
// * @property {string} events.XAddr Event service URI
// * @property {boolean} events.WSSubscriptionPolicySupport Indicates whether or not WS Subscription policy is supported
// * @property {boolean} events.WSPullPointSupport Indicates whether or not WS Pull Point is supported
// * @property {boolean} events.WSPausableSubscriptionManagerInterfaceSupport Indicates whether or not WS Pausable Subscription Manager Interface is supported
// * @property {object} imaging Imaging capabilities
// * @property {string} imaging.XAddr Imaging service URI
// * @property {object} media Media capabilities
// * @property {string} media.XAddr Media service URI
// * @property {object} media.streamingCapabilities Streaming capabilities
// * @property {boolean} media.streamingCapabilities.RTPMulticast Indicates whether or not RTP multicast is supported
// * @property {boolean} media.streamingCapabilities.RTP_TCP Indicates whether or not RTP over TCP is supported
// * @property {boolean} media.streamingCapabilities.RTP_RTSP_TCP Indicates whether or not RTP/RTSP/TCP is supported
// * @property {object} media.streamingCapabilities.extension
// * @property {object} PTZ PTZ capabilities
// * @property {string} PTZ.XAddr PTZ service URI
// * @property {object} [extension]
// * @property {object} extension.deviceIO DeviceIO capabilities
// * @property {string} extension.deviceIO.XAddr DeviceIO service URI
// * @property {number} extension.deviceIO.videoSources
// * @property {number} extension.deviceIO.videoOutputs
// * @property {number} extension.deviceIO.audioSources
// * @property {number} extension.deviceIO.audioOutputs
// * @property {number} extension.deviceIO.relayOutputs
// * @property {object} [extension.extensions]
// * @property {object} [extension.extensions.telexCapabilities]
// * @property {object} [extension.extensions.scdlCapabilities]
// */

/** Device capabilities */
export interface iDevice {
  /** Device service URI */
  XAddr: string;
  network?: iNetwork;
  system?: iSystem;
  IO?: iIO;
  security?: iSecurity;
}

/**
 * Capability list
 */
export interface iCapabilities {
  device: iDevice;
}
