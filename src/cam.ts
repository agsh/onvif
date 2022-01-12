import { EventEmitter } from 'events';
import { SecureContextOptions } from 'tls';
import https, { Agent, RequestOptions } from 'https';
import http from 'http';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import url from 'url';
import { linerase, parseSOAPString } from './utils';

/**
 * Cam constructor options
 */
export interface CamOptions {
  /** Set true if using `https` protocol, defaults to false. */
  useSecure?: boolean;
  /** Set options for https like ca, cert, ciphers, rejectUnauthorized, secureOptions, secureProtocol, etc. */
  secureOptions?: SecureContextOptions;
  hostname: string;
  username?: string;
  password?: string;
  port?: number;
  path?: string;
  timeout?: number;
  /** Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections. */
  agent?: Agent | boolean;
  /** Force using hostname and port from constructor for the services (ex.: for proxying), defaults to false. */
  preserveAddress: boolean;
  /** Set false if the camera should not connect automatically. */
  autoConnect?: boolean;
}

export type CamServices = {
  PTZ?: URL,
  media?: URL,
  media2?: URL,
  imaging?: URL,
  events?: URL,
  device?: URL,
}

export interface CamRequestOptions extends RequestOptions{
  /** Name of service (ptz, media, etc) */
  service?: keyof CamServices;
  /** SOAP body */
  body: string;
  /** Defines another url to request */
  url?: string;
  /** Make request to PTZ uri or not */
  ptz?: boolean;
}

interface RequestError extends Error {
  code: string;
  errno: string;
  syscall: string;
}

export interface CamService {
  /** Namespace uri */
  namespace: string;
  /** Uri for requests */
  XAddr: string;
  /** Minor version */
  minor: number;
  /** Major version */
  major: number;
}

export class Cam extends EventEmitter {
  /**
   * Indicates raw xml request to device.
   * @event rawData
   */
  static rawRequest: 'rawRequest' = 'rawRequest';

  public useSecure: boolean;
  public secureOptions: SecureContextOptions;
  public hostname: string;
  public username?: string;
  public password?: string;
  public port: number;
  public path: string;
  public timeout: number;
  public agent: Agent | boolean;
  public preserveAddress: boolean;
  private events: Record<string, unknown>;
  private uri: CamServices;
  private timeShift: number | undefined;
  private services: CamService[] | undefined;
  private media2Support = false;

  constructor(options: CamOptions) {
    super();
    this.useSecure = options.useSecure ?? false;
    this.secureOptions = options.secureOptions ?? {};
    this.hostname = options.hostname;
    this.username = options.username;
    this.password = options.password;
    this.port = options.port ?? (options.useSecure ? 443 : 80);
    this.path = options.path ?? '/onvif/device_service';
    this.timeout = options.timeout || 120000;
    this.agent = options.agent || false;
    this.preserveAddress = options.preserveAddress || false;
    this.events = {};
    this.uri = {};
    /** Bind event handling to the `event` event */
    this.on('newListener', (name) => {
      // if this is the first listener, start pulling subscription
      if (name === 'event' && this.listeners(name).length === 0) {
        setImmediate(() => {
          // this._eventRequest(); TODO bring back
        });
      }
    });
    if (options.autoConnect !== false) {
      setImmediate(() => {
        this.connect();
      });
    }
  }

  /**
   * Envelope header for all SOAP messages
   * @param openHeader
   * @private
   */
  private envelopeHeader(openHeader = false) {
    let header = '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing">'
        + '<s:Header>';
    // Only insert Security if there is a username and password
    if (this.username && this.password) {
      const req = this.passwordDigest();
      header += '<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">'
          + '<UsernameToken>'
          + `<Username>${this.username}</Username>`
          + `<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${req.passdigest}</Password>`
          + `<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${req.nonce}</Nonce>`
          + `<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">${req.timestamp}</Created>`
          + '</UsernameToken>'
          + '</Security>';
    }
    if (!(openHeader !== undefined && openHeader)) {
      header += '</s:Header>'
          + '<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
    }
    return header;
  }

  /**
   * Envelope footer for all SOAP messages
   * @private
   */
  private envelopeFooter() {
    return '</s:Body>'
        + '</s:Envelope>';
  }

  private passwordDigest() {
    const timestamp = (new Date((process.uptime() * 1000) + (this.timeShift || 0))).toISOString();
    const nonce = Buffer.allocUnsafe(16);
    nonce.writeUIntLE(Math.ceil(Math.random() * 0x100000000), 0, 4);
    nonce.writeUIntLE(Math.ceil(Math.random() * 0x100000000), 4, 4);
    nonce.writeUIntLE(Math.ceil(Math.random() * 0x100000000), 8, 4);
    nonce.writeUIntLE(Math.ceil(Math.random() * 0x100000000), 12, 4);
    const cryptoDigest = crypto.createHash('sha1');
    cryptoDigest.update(Buffer.concat([nonce, Buffer.from(timestamp, 'ascii'), Buffer.from(this.password!, 'ascii')]));
    const passDigest = cryptoDigest.digest('base64');
    return {
      passdigest : passDigest,
      nonce      : nonce.toString('base64'),
      timestamp,
    };
  }

  private async request(options: CamRequestOptions): Promise<[Record<string, any>, string]> {
    return new Promise((resolve, reject) => {
      let callbackExecuted = false;
      let requestOptions = {
        ...options,
        path : options.service
          ? (this.uri[options.service] ? this.uri[options.service]?.pathname : options.service)
          : this.path,
      };
      requestOptions.headers = {
        'Content-Type'   : 'application/soap+xml',
        'Content-Length' : Buffer.byteLength(options.body, 'utf8'),
        charset          : 'utf-8',
      };
      requestOptions.method = 'POST';
      const httpLibrary = this.useSecure ? https : http;
      requestOptions = this.useSecure ? { ...requestOptions, ...this.secureOptions } : requestOptions;
      const request = httpLibrary.request(requestOptions, (response) => {
        const bufs: Buffer[] = [];
        let length = 0;

        response.on('data', (chunk) => {
          bufs.push(chunk);
          length += chunk.length;
        });

        response.on('end', () => {
          if (callbackExecuted) {
            return;
          }
          callbackExecuted = true;
          const xml = Buffer.concat(bufs, length).toString('utf8');
          /**
           * Indicates raw xml response from device.
           * @event Cam#rawResponse
           * @type {string}
           */
          this.emit('rawResponse', xml);
          resolve(parseSOAPString(xml));
        });
      });

      request.setTimeout(this.timeout, () => {
        if (callbackExecuted) {
          return;
        }
        callbackExecuted = true;
        request.destroy();
        reject(new Error('Network timeout'));
      });

      request.on('error', (error: RequestError) => {
        if (callbackExecuted) {
          return;
        }
        callbackExecuted = true;
        /* address, port number or IPCam error */
        if (error.code === 'ECONNREFUSED' && error.errno === 'ECONNREFUSED' && error.syscall === 'connect') {
          reject(error);
          /* network error */
        } else if (error.code === 'ECONNRESET' && error.errno === 'ECONNRESET' && error.syscall === 'read') {
          reject(error);
        } else {
          reject(error);
        }
      });

      this.emit('rawRequest', options.body);
      request.write(options.body);
      request.end();
    });
  }

  /**
   * Parse url with an eye on `preserveAddress` property
   * @param address
   * @private
   */
  private parseUrl(address: string) {
    const parsedAddress = new URL(address);
    // If host for service and default host differs, also if preserve address property set
    // we substitute host, hostname and port from settings then rebuild the href using .format
    if (this.preserveAddress && (this.hostname !== parsedAddress.hostname || this.port.toString() !== parsedAddress.port)) {
      parsedAddress.hostname = this.hostname;
      parsedAddress.host = `${this.hostname}:${this.port}`;
      parsedAddress.port = this.port.toString();
      parsedAddress.href = url.format(parsedAddress);
    }
    return parsedAddress;
  }

  /**
   * Connect to the camera and fill device information properties
   */
  async connect() {
    await this.getSystemDateAndTime();
    await this.getServices();
  }

  private setupSystemDateAndTime(data: any) {
    const systemDateAndTime = data[0].getSystemDateAndTimeResponse[0].systemDateAndTime[0];
    const dateTime = systemDateAndTime.UTCDateTime || systemDateAndTime.localDateTime;
    let time;
    if (dateTime === undefined) {
      // Seen on a cheap Chinese camera from GWellTimes-IPC. Use the current time.
      time = new Date();
    } else {
      const dt = linerase(dateTime[0]);
      time = new Date(Date.UTC(dt.date.year, dt.date.month - 1, dt.date.day, dt.time.hour, dt.time.minute, dt.time.second));
    }
    if (!this.timeShift) {
      this.timeShift = time.getTime() - (process.uptime() * 1000);
    }
    return time;
  }

  /**
   * Receive date and time from cam
   */
  async getSystemDateAndTime() {
    // The ONVIF spec says this should work without a Password as we need to know any difference in the
    // remote NVT's time relative to our own time clock (called the timeShift) before we can calculate the
    // correct timestamp in nonce SOAP Authentication header.
    // But.. Panasonic and Digital Barriers both have devices that implement ONVIF that only work with
    // authenticated getSystemDateAndTime. So for these devices we need to do an authenticated getSystemDateAndTime.
    // As 'timeShift' is not set, the local clock MUST be set to the correct time AND the NVT/Camera MUST be set
    // to the correct time if the camera implements Replay Attack Protection (eg Axis)
    const [data, xml] = await this.request({
      // Try the Unauthenticated Request first. Do not use this._envelopeHeader() as we don't have timeShift yet.
      body :
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">'
          + '<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">'
          + '<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>'
          + '</s:Body>'
          + '</s:Envelope>',
    });
    try {
      return this.setupSystemDateAndTime(data);
    } catch (error) {
      if (xml && xml.toLowerCase().includes('sender not authorized')) {
        // Try again with a Username and Password
        const [data] = await this.request({
          body : `${this.envelopeHeader()}<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>${this.envelopeFooter()}`,
        });
        return this.setupSystemDateAndTime(data);
      }
      throw error;
    }
  }

  /**
   * Returns information about services of the device.
   * @param includeCapability
   */
  async getServices(includeCapability = true) {
    const [data] = await this.request({
      body : `${this.envelopeHeader()}<GetServices xmlns="http://www.onvif.org/ver10/device/wsdl">`
          + `<IncludeCapability>${includeCapability}</IncludeCapability>`
          + `</GetServices>${
            this.envelopeFooter()}`,
    });
    this.services = linerase(data).getServicesResponse.service;
    // ONVIF Profile T introduced Media2 (ver20) so cameras from around 2020/2021 will have
    // two media entries in the ServicesResponse, one for Media (ver10/media) and one for Media2 (ver20/media)
    // This is so that existing VMS software can still access the video via the orignal ONVIF Media API
    // fill Cam#uri property
    if (!this.uri) {
      /**
       * Device service URIs
       * @name Cam#uri
       * @property {url} [PTZ]
       * @property {url} [media]
       * @property {url} [media2]
       * @property {url} [imaging]
       * @property {url} [events]
       * @property {url} [device]
       */
      this.uri = {};
    }
    this.services!.forEach((service) => {
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
          this.uri[namespaceSplitted[1] as keyof CamServices] = this.parseUrl(service.XAddr);
        }
      }
    });
  }
}
