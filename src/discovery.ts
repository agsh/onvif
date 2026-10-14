/**
 * Discovery module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */

import { EventEmitter } from 'events';
import { createSocket, type Socket, RemoteInfo } from 'dgram';
import os from 'os';
import { build, guid, linerase, OnvifResponseError, parseSOAPString } from './utils';
import { stringListToBuild } from './utils/toOnvifXMLSchemaObject';
import { Onvif } from './onvif';

/**
 * WS-Discovery Probe Types (ONVIF QNames).
 * - `tds:Device` — ONVIF Core Spec §7.3.2.1 (required for all devices)
 * - `dn:NetworkVideoTransmitter` — NVT Definition §5.2.1
 * - `dn:NetworkVideoDisplay` / `Storage` / `Analytics` — NVD / NVS / NVA device types
 */
export type Types =
  | 'tds:Device'
  | 'dn:NetworkVideoTransmitter'
  | 'dn:NetworkVideoDisplay'
  | 'dn:NetworkVideoStorage'
  | 'dn:NetworkVideoAnalytics';

/**
 * WS-Discovery Probe Scopes (ONVIF absolute URIs, scheme `onvif://www.onvif.org/...`).
 * Profile and type values are fixed by ONVIF specs; hardware / name / location accept any path.
 */
export type Scopes =
  | 'onvif://www.onvif.org'
  // Profiles — ONVIF Profile Specs / Conformance Device Test Spec
  | 'onvif://www.onvif.org/Profile/Streaming'
  | 'onvif://www.onvif.org/Profile/T'
  | 'onvif://www.onvif.org/Profile/G'
  | 'onvif://www.onvif.org/Profile/C'
  | 'onvif://www.onvif.org/Profile/A'
  | 'onvif://www.onvif.org/Profile/D'
  | 'onvif://www.onvif.org/Profile/M'
  | 'onvif://www.onvif.org/Profile/V'
  | 'onvif://www.onvif.org/Profile/Q/FactoryDefault'
  | 'onvif://www.onvif.org/Profile/Q/Operational'
  | `onvif://www.onvif.org/Profile/${string}`
  // type — NVT / NVD / NVS / NVA Device Definitions
  | 'onvif://www.onvif.org/type/Network_Video_Transmitter'
  | 'onvif://www.onvif.org/type/Network_Video_Display'
  | 'onvif://www.onvif.org/type/Network_Video_Storage'
  | 'onvif://www.onvif.org/type/Network_Video_Analytic'
  | 'onvif://www.onvif.org/type/video_encoder'
  | 'onvif://www.onvif.org/type/audio_encoder'
  | 'onvif://www.onvif.org/type/ptz'
  | 'onvif://www.onvif.org/type/video_analytics'
  | 'onvif://www.onvif.org/type'
  | `onvif://www.onvif.org/type/${string}`
  // Core Spec Table 7 — category root or any path value
  | 'onvif://www.onvif.org/hardware'
  | `onvif://www.onvif.org/hardware/${string}`
  | 'onvif://www.onvif.org/name'
  | `onvif://www.onvif.org/name/${string}`
  | 'onvif://www.onvif.org/location'
  | `onvif://www.onvif.org/location/${string}`;

/** Default WS-Discovery IPv4 multicast (IANA / SOAP-over-UDP). */
const WS_DISCOVERY_IPV4 = '239.255.255.250';
/** Default WS-Discovery IPv6 link-local multicast. */
const WS_DISCOVERY_IPV6 = 'FF02::C';
/** Default WS-Discovery UDP port. */
const WS_DISCOVERY_PORT = 3702;

export interface DiscoveryOptions {
  /** Timeout in milliseconds for discovery responses, Default 5000 */
  timeout?: number;
  /** Set to `false` if you want to omit creating of Cam objects. Default true */
  resolve?: boolean;
  /** WS-Discovery message id */
  messageId?: string;
  /** Interface to bind on for discovery ex. `eth0` */
  device?: string;
  /**
   * Probe destination host. Default {@link WS_DISCOVERY_IPV4} (or {@link WS_DISCOVERY_IPV6} for IPv6 sockets).
   * Pass a unicast IP for a directed Probe.
   */
  address?: string;
  /** Probe destination UDP port. Default {@link WS_DISCOVERY_PORT}. */
  port?: number;
  /** Client will listen to discovery data device sent */
  listeningPort?: number;
  /** Socket type */
  type?: 'udp4' | 'udp6';
  /** Receive buffer size in bytes for discovery responses */
  bufferSize?: number;
  /** WS-Discovery Probe Types. Default empty — match any type. */
  types?: Types[];
  /** WS-Discovery Probe Scopes. Default empty — match any scope. */
  scopes?: Scopes[];
}

/**
 * Try to find the most suitable record
 * Now it is simple ip match
 */
function matchXAddr(xaddrs: URL[], address: string) {
  const ipMatch = xaddrs.filter((xaddr) => xaddr.hostname === address);
  return ipMatch[0] || xaddrs[0];
}

/** Strip urn:uuid: / uuid: so Probe MessageID and ProbeMatch RelatesTo compare equal. */
function normalizeWsAddressingId(id: string): string {
  return id
    .replace(/^urn:uuid:/i, '')
    .replace(/^uuid:/i, '')
    .trim()
    .toLowerCase();
}

/**
 * RelatesTo lives in the SOAP Header; {@link parseSOAPString} returns only Body.
 * Extract from raw XML (optional `wsa:` / other prefix).
 */
function relatesToFromSoapXml(xml: string | undefined): string | undefined {
  if (!xml) {
    return undefined;
  }
  const match = xml.match(/<(?:\w+:)?RelatesTo\b[^>]*>([^<]*)<\/(?:\w+:)?RelatesTo>/i);
  const value = match?.[1]?.trim();
  return value || undefined;
}

/**
 * Accept ProbeMatch when RelatesTo is missing (some devices omit it) or matches our Probe MessageID.
 * Drop replies clearly meant for another Probe (noisy LAN).
 */
function isProbeMatchForMessage(xml: string | undefined, messageId: string): boolean {
  const relatesTo = relatesToFromSoapXml(xml);
  if (!relatesTo) {
    return true;
  }
  return normalizeWsAddressingId(relatesTo) === normalizeWsAddressingId(messageId);
}

/**
 * Class for `Discovery` singleton. Prefer the exported {@link Discovery} instance.
 *
 * @example Discover NVTs on the LAN, filter by Probe type / Profile T scope, connect, and fetch stream URIs:
 * ```typescript
 * import { Discovery, type Onvif } from 'onvif';
 *
 * const USERNAME = 'admin';
 * const PASSWORD = 'admin';
 *
 * Discovery.on('error', (err, xml) => {
 *   console.error('WS-Discovery error', err.message, xml?.slice(0, 200));
 * });
 *
 * Discovery.on('device', async (cam, rinfo) => {
 *   // Fired as soon as each NVT replies (before probe() settles).
 *   if (typeof (cam as Onvif).connect !== 'function') return;
 *   const onvif = cam as Onvif;
 *   onvif.username = USERNAME;
 *   onvif.password = PASSWORD;
 *   try {
 *     await onvif.connect();
 *     const info = await onvif.device.getDeviceInformation();
 *     console.log(`Live: ${rinfo.address} → ${info.manufacturer} ${info.model}`);
 *   } catch (e) {
 *     console.warn(`Skip ${onvif.hostname}:`, e);
 *   }
 * });
 *
 * (async () => {
 *   const devices = await Discovery.probe({
 *     timeout: 8000,
 *     // Optional: bind to a specific NIC (Linux: eth0 / enp0s3)
 *     // device: 'eth0',
 *     types: ['dn:NetworkVideoTransmitter'],
 *     scopes: ['onvif://www.onvif.org/Profile/T'],
 *   });
 *
 *   // probe() always resolves; bad replies only emit 'error'
 *   const cams = devices.filter((d): d is Onvif => typeof (d as Onvif).connect === 'function');
 *   console.log(`Probe finished: ${cams.length} Onvif instance(s)`);
 *
 *   await Promise.all(
 *     cams.map(async (cam) => {
 *       cam.username ??= USERNAME;
 *       cam.password ??= PASSWORD;
 *       if (cam.timeShift === undefined) await cam.connect();
 *       const profiles = await cam.media.getProfiles();
 *       const uri = await cam.media.getStreamUri({ protocol: 'RTSP' });
 *       console.log(cam.hostname, profiles[0]?.name, uri.uri);
 *     }),
 *   );
 * })().catch(console.error);
 * ```
 * @category Core
 */
export class DiscoverySingleton extends EventEmitter {
  /**
   * Fires when device found
   * @param onvif Onvif instance {@link Onvif} or just information object about found device
   * @event device
   * @example
   * ```typescript
   * discovery.on('device', console.log);
   * ```
   */
  static device = 'device' as const;
  /**
   * Indicates a problem with a Probe response or UDP socket.
   * Always an {@link Error} (often {@link OnvifResponseError} / parser error).
   * {@link DiscoverySingleton.probe} always resolves (possibly with an empty array);
   * bad responses and socket failures are reported only via this event.
   * @param error Error instance
   * @param xml Optional raw SOAP that triggered the error
   * @event error
   * @example
   * ```typescript
   * discovery.on('error', console.error);
   * ```
   */
  static error = 'error' as const;

  private static instance?: DiscoverySingleton;

  public static get getInstance(): DiscoverySingleton {
    if (!DiscoverySingleton.instance) {
      DiscoverySingleton.instance = new DiscoverySingleton();
    }
    return DiscoverySingleton.instance;
  }

  private constructor() {
    super();
  }

  /**
   * Discover NVT devices in the subnetwork.
   * Always resolves with found devices (or `[]`); bad Probe responses and socket
   * failures are emitted on {@link DiscoverySingleton.error} and do not reject.
   * @param options
   * @example
   * ```typescript
   * import { Discovery } from 'onvif';
   * Discovery.on('device', async (cam) => {
   *   // function would be called as soon as NVT responses
   *   cam.username = <USERNAME>;
   *   cam.password = <PASSWORD>;
   *   await cam.connect();
   * })
   * Discovery.probe();
   * ```
   * @example
   * import { Discovery } from 'onvif';
   * (async () => {
   *   const cams = Promise.all((await Discovery.probe()).map(camera => camera.connect());
   *   console.log(await cams[0]?.getSystemDateAndTime());
   * })();
   */
  probe(options: DiscoveryOptions = {}): Promise<(Onvif | Record<string, unknown>)[]> {
    return new Promise((resolve) => {
      const cams: Map<string, Onvif | Record<string, unknown>> = new Map();
      const sockets: Socket[] = [];
      let settled = false;
      const messageID = `urn:uuid:${options.messageId || guid()}`;
      const request = Buffer.from(
        build({
          Envelope: {
            $: {
              xmlns: 'http://www.w3.org/2003/05/soap-envelope',
              'xmlns:dn': 'http://www.onvif.org/ver10/network/wsdl',
              'xmlns:tds': 'http://www.onvif.org/ver10/device/wsdl',
            },
            Header: {
              'wsa:MessageID': {
                $: { 'xmlns:wsa': 'http://schemas.xmlsoap.org/ws/2004/08/addressing' },
                _: messageID,
              },
              'wsa:To': {
                $: { 'xmlns:wsa': 'http://schemas.xmlsoap.org/ws/2004/08/addressing' },
                _: 'urn:schemas-xmlsoap-org:ws:2005:04:discovery',
              },
              'wsa:Action': {
                $: { 'xmlns:wsa': 'http://schemas.xmlsoap.org/ws/2004/08/addressing' },
                _: 'http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe',
              },
            },
            Body: {
              Probe: {
                $: {
                  xmlns: 'http://schemas.xmlsoap.org/ws/2005/04/discovery',
                  'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
                  'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                },
                Types: stringListToBuild(options.types) ?? {},
                Scopes: stringListToBuild(options.scopes) ?? {},
              },
            },
          },
        }),
      );
      // Defer heavy XML parsing so the event loop can drain the UDP receive
      // buffer first — otherwise ProbeMatch packets are dropped on large networks (#377).
      const listener = (msg: Buffer, rinfo: RemoteInfo) => {
        setImmediate(async () => {
          let data;
          let xml;
          try {
            [data, xml] = await parseSOAPString(msg.toString());
            data = linerase(data);
          } catch (error) {
            const err = error instanceof Error ? error : new OnvifResponseError(String(error));
            this.emit('error', err, xml);
            return;
          }
          if (!isProbeMatchForMessage(xml, messageID)) {
            // ProbeMatch for another client's Probe — ignore quietly.
            return;
          }
          if (!data.probeMatches) {
            const err = new OnvifResponseError(`Wrong SOAP message from ${rinfo.address}:${rinfo.port}`, {
              xml,
            });
            this.emit('error', err, xml);
          } else {
            // Possible to get multiple matches for the same camera
            // when your computer has more than one network adapter in the same subnet
            const camAddr = data.probeMatches.probeMatch.endpointReference.address;
            if (!cams.has(camAddr)) {
              let cam;
              if (options.resolve !== false) {
                // Create cam with one of the XAddrs uri
                const camUris = data.probeMatches.probeMatch.XAddrs.split(' ')
                  .filter(Boolean)
                  .map((href: string) => new URL(href.trim()));
                const camUri = matchXAddr(camUris, rinfo.address);
                cam = new Onvif({
                  hostname: camUri.hostname,
                  port: camUri.port === '' ? undefined : parseInt(camUri.port, 10),
                  path: camUri.pathname,
                  urn: camAddr,
                  // Match v0.x Cam.xaddrs: all XAddrs from the ProbeMatch
                  xaddrs: camUris,
                });
              } else {
                cam = data;
              }
              cams.set(camAddr, cam);
              this.emit('device', cam, rinfo, xml);
            }
          }
        });
      };

      let timeout: ReturnType<typeof setTimeout> | undefined;

      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout !== undefined) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        for (const socket of sockets) {
          socket.removeAllListeners();
          try {
            socket.close();
          } catch {
            // socket may already be closed
          }
        }
        resolve(Array.from(cams.values()));
      };

      // A computer may have Multiple Network Interfaces (Network Devices) like eth0, eth1, wifi0, lo0, vpm0, vpn1
      // Each Network Interface can have Multiple IP Addresses e.g. 192.168.1.99 and also 10.10.10.5
      // And the IP Addresses can be IPv4 or IPv6
      // To find every device on the network we want to send a Discovery Message from every IP Address on every Network Interface

      // None of my test cameras responded to IPv6 discovery so the IPv6 code in this code is untested

      // We can also restrict to a specific Interface using options.device

      // Make a list of IP addresses to send from
      const interfaces = os.networkInterfaces();
      const sendList: os.NetworkInterfaceInfo[] = [];
      for (const interfaceName in interfaces) {
        this.emit('status', `Found interface ${interfaceName}`);
        if (options.device && options.device != interfaceName) {
          continue;
        }
        interfaces[interfaceName]?.forEach((addressItem) => {
          // Only use IPv4 addresses
          if (addressItem.family === 'IPv4') {
            sendList.push(addressItem);
          }
        });
      }

      const udpNameConverter = (family: string) => {
        return family === 'IPv6' ? 'udp6' : 'udp4';
      };

      // Send a Discovery Message from each address in the SendList
      for (const sendItem of sendList) {
        const socket = createSocket({ type: options.type ?? udpNameConverter(sendItem.family), reuseAddr: true });
        sockets.push(socket);
        socket.on('error', (err) => {
          this.emit('error', err);
        });
        socket.on('listening', () => {
          // bind() is complete. Send the discovery message
          if (options.bufferSize && options.bufferSize > 0) {
            socket.setRecvBufferSize(options.bufferSize);
          }
          const destPort = options.port ?? WS_DISCOVERY_PORT;
          const destAddress = options.address ?? (sendItem.family === 'IPv6' ? WS_DISCOVERY_IPV6 : WS_DISCOVERY_IPV4);
          this.emit('status', `Sending ${sendItem.family} from ${sendItem.address} to ${destAddress}:${destPort}`);
          socket.send(request, 0, request.length, destPort, destAddress);
        });
        socket.on('message', listener);

        // Bind to the local IP address and either an OS selected UDP Port, or the options.listeningPort UDP Port)
        // This fires 'listening' which sends the discovery message
        socket.bind(options.listeningPort, sendItem.address);
      }

      timeout = setTimeout(finish, options.timeout || 5000);
    });
  }
}

/**
 * Singleton for the discovery to provide `probe` method
 * {@link Discovery.probe}
 * @example
 * ```typescript
 * import { Discovery } from 'onvif';
 * Discovery.on('device', async (cam) => {
 *   // function would be called as soon as NVT responses
 *   cam.username = <USERNAME>;
 *   cam.password = <PASSWORD>;
 *   await cam.connect();
 * })
 * Discovery.probe();
 * ```
 * @example
 * import { Discovery } from 'onvif';
 * (async () => {
 *   const cams = Promise.all((await Discovery.probe()).map(camera => camera.connect());
 *   console.log(await cams[0]?.getSystemDateAndTime());
 * })();
 * @category Core
 */
export const Discovery = DiscoverySingleton.getInstance;
