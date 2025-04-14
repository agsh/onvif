/**
 * Discovery module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */

import { EventEmitter } from 'events';
import { createSocket, RemoteInfo } from 'dgram';
import url from 'url';
import os from 'os';
import { guid, linerase, OnvifError, parseSOAPString } from './utils';
import { Onvif } from './onvif';

export interface DiscoveryOptions {
  /** Timeout in milliseconds for discovery responses, Default 5000 */
  timeout?: number;
  /** Set to `false` if you want to omit creating of Cam objects. Default true */
  resolve?: boolean;
  /** WS-Discovery message id */
  messageId?: string;
  /** Interface to bind on for discovery ex. `eth0` */
  device?: string;
  /** Client will listen to discovery data device sent */
  listeningPort?: number;
  /** Socket type */
  type?: 'udp4' | 'udp6';
}

/**
 * Try to find the most suitable record
 * Now it is simple ip match
 */
function matchXAddr(xaddrs: URL[], address: string) {
  const ipMatch = xaddrs.filter((xaddr) => xaddr.hostname === address);
  return ipMatch[0] || xaddrs[0];
}

/**
 * Class for `Discovery` singleton
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
   * Indicates any errors
   * @param error Error instance or array of error instances from {@link OnvifError}
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

  // eslint-disable-next-line no-useless-constructor
  private constructor() {
    super();
  }

  /**
   * Discover NVT devices in the subnetwork
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
    return new Promise((resolve, reject) => {
      const cams: Map<string, Onvif | Record<string, unknown>> = new Map();
      const errors: Error[] = [];
      const messageID = `urn:uuid:${options.messageId || guid()}`;
      const request = Buffer.from(
        '<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">'
        + '<Header>'
        + `<wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">${messageID}</wsa:MessageID>`
        + '<wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>'
        + '<wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>'
        + '</Header>'
        + '<Body>'
        + '<Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        + '<Types>dn:NetworkVideoTransmitter</Types>'
        + '<Scopes />'
        + '</Probe>'
        + '</Body>'
        + '</Envelope>',
      );
      const socket = createSocket(options.type ?? 'udp4');
      socket.on('error', (err) => {
        this.emit('error', err);
      });

      const listener = async (msg: Buffer, rinfo: RemoteInfo) => {
        let data;
        let xml;
        try {
          [data, xml] = await parseSOAPString(msg.toString());
        } catch (error) {
          errors.push(error as Error);
          this.emit('error', error, xml);
          return;
        }
        // TODO check for matching RelatesTo field and messageId
        if (!data[0].probeMatches) {
          errors.push(new OnvifError(`Wrong SOAP message from ${rinfo.address}:${rinfo.port}\n${xml}`));
          this.emit('error', `Wrong SOAP message from ${rinfo.address}:${rinfo.port}`, xml);
        } else {
          data = linerase(data);

          // Possible to get multiple matches for the same camera
          // when your computer has more than one network adapter in the same subnet
          const camAddr = data.probeMatches.probeMatch.endpointReference.address;
          if (!cams.has(camAddr)) {
            let cam;
            if (options.resolve !== false) {
              // Create cam with one of the XAddrs uri
              const camUris = data.probeMatches.probeMatch.XAddrs.split(' ').map(url.parse);
              const camUri = matchXAddr(camUris, rinfo.address);
              cam = new Onvif({
                hostname : camUri.hostname,
                port     : parseInt(camUri.port, 10),
                path     : camUri.pathname,
                urn      : camAddr,
              });
            } else {
              cam = data;
            }
            cams.set(camAddr, cam);
            this.emit('device', cam, rinfo, xml);
          }
        }
      };

      // If device is specified try to bind to that interface
      if (options.device) {
        const interfaces = os.networkInterfaces();
        // Try to find the interface based on the device name
        if (options.device in interfaces) {
          interfaces[options.device]?.forEach((iface) => {
            // Only use IPv4 addresses
            if (iface.family === 'IPv4') {
              socket.bind(options.listeningPort, iface.address);
            }
          });
        }
      }

      socket.on('message', listener);
      socket.send(request, 0, request.length, 3702, '239.255.255.250');

      setTimeout(() => {
        socket.removeListener('message', listener);
        socket.close();
        if (errors.length === 0) {
          resolve(Array.from(cams.values()));
        } else {
          reject(errors);
        }
      }, options.timeout || 5000);
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
 */
export const Discovery = DiscoverySingleton.getInstance;
