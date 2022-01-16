import { EventEmitter } from 'events';
import { SecureContextOptions } from 'tls';
import https, { Agent, RequestOptions } from 'https';
import http from 'http';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { linerase, parseSOAPString } from './utils';
import { Capabilities, Device } from './device';
import { Media, Profile } from './media';

/**
 * Cam constructor options
 */
export interface OnvifOptions {
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
  urn?: string;
  /** Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections. */
  agent?: Agent | boolean;
  /** Force using hostname and port from constructor for the services (ex.: for proxying), defaults to false. */
  preserveAddress?: boolean;
  /** Set false if the camera should not connect automatically, defaults false. */
  autoConnect?: boolean;
}

export interface OnvifServices {
  PTZ?: URL;
  analyticsDevice?: URL;
  device?: URL;
  deviceIO?: URL;
  display?: URL;
  events?: URL;
  imaging?: URL;
  media2?: URL;
  media?: URL;
  receiver?: URL;
  recording?: URL;
  replay?: URL;
  search?: URL;
}

export interface OnvifRequestOptions extends RequestOptions{
  /** Name of service (ptz, media, etc) */
  service?: keyof OnvifServices;
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

/**
 * Information about active video source
 */
export interface ActiveSource {
  sourceToken: string;
  profileToken: string;
  videoSourceConfigurationToken: string;
  encoding?: string;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  ptz?: {
    name: string;
    token: string;
  };
}

export class Onvif extends EventEmitter {
  /**
   * Indicates raw xml request to device.
   * @event rawRequest
   * @example
   * ```typescript
   * onvif.on('rawRequest', (xml) => { console.log('-> request was', xml); });
   * ```
   */
  static rawRequest: 'rawRequest' = 'rawRequest';
  /**
   * Indicates raw xml response from device.
   * @event rawResponse
   * @example
   * ```typescript
   * onvif.on('rawResponse', (xml) => { console.log('<- response was', xml); });
   * ```
   */
  static rawResponse: 'rawResponse' = 'rawResponse';
  /**
   * Indicates any warnings
   * @event warn
   * @example
   * ```typescript
   * onvif.on('warn', console.warn);
   * ```
   */
  static warn: 'warn' = 'warn';
  /**
   * Indicates any errors
   * @event error
   * @example
   * ```typescript
   * onvif.on('error', console.error);
   * ```
   */
  static error: 'error' = 'error';

  /**
   * Core device namespace for device v1.0 methods
   * @example
   * ```typescript
   * const date = await onvif.device.getSystemDateAndTime();
   * console.log(date.toLocaleString());
   * ```
   */
  public readonly device: Device;
  public readonly media: Media;
  public useSecure: boolean;
  public secureOptions: SecureContextOptions;
  public hostname: string;
  public username?: string;
  public password?: string;
  public port: number;
  public path: string;
  public timeout: number;
  public agent: Agent | boolean;
  public preserveAddress = false;
  private events: Record<string, unknown>;
  public uri: OnvifServices;
  private timeShift?: number;
  public capabilities: Capabilities;
  public defaultProfiles: Profile[] = [];
  public defaultProfile?: Profile;
  private activeSources: ActiveSource[] = [];
  public activeSource?: ActiveSource;
  public readonly urn?: string;

  constructor(options: OnvifOptions) {
    super();
    this.useSecure = options.useSecure ?? false;
    this.secureOptions = options.secureOptions ?? {};
    this.hostname = options.hostname;
    this.username = options.username;
    this.password = options.password;
    this.port = options.port ?? (options.useSecure ? 443 : 80);
    this.path = options.path ?? '/onvif/device_service';
    this.timeout = options.timeout || 120000;
    this.urn = options.urn;
    this.agent = options.agent ?? false;
    this.preserveAddress = options.preserveAddress ?? false;
    this.events = {};
    this.uri = {};
    this.capabilities = {};

    this.device = new Device(this);
    this.media = new Media(this);
    /** Bind event handling to the `event` event */
    this.on('newListener', (name) => {
      // if this is the first listener, start pulling subscription
      if (name === 'event' && this.listeners(name).length === 0) {
        setImmediate(() => {
          // this._eventRequest(); TODO bring back
        });
      }
    });
    if (options.autoConnect) {
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
          + `<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${req.passDigest}</Password>`
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
      passDigest,
      nonce : nonce.toString('base64'),
      timestamp,
    };
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

  private async rawRequest(options: OnvifRequestOptions): Promise<[Record<string, any>, string]> {
    return new Promise((resolve, reject) => {
      let alreadyReturned = false;
      let requestOptions = {
        ...options,
        path : options.service
          ? (this.uri[options.service] ? this.uri[options.service]?.pathname : options.service)
          : this.path,
        port    : this.port,
        agent   : this.agent, // Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections}
        timeout : this.timeout,
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
          if (alreadyReturned) {
            return;
          }
          alreadyReturned = true;
          const xml = Buffer.concat(bufs, length).toString('utf8');
          /**
           * Indicates raw xml response from device.
           * @event Onvif#rawResponse
           * @type {string}
           */
          this.emit('rawResponse', xml);
          resolve(parseSOAPString(xml));
        });
      });

      request.setTimeout(this.timeout, () => {
        if (alreadyReturned) {
          return;
        }
        alreadyReturned = true;
        request.destroy();
        reject(new Error('Network timeout'));
      });

      request.on('error', (error: RequestError) => {
        if (alreadyReturned) {
          return;
        }
        alreadyReturned = true;
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

  public request(options: OnvifRequestOptions) {
    return this.rawRequest({
      ...options,
      body : `${this.envelopeHeader()}${options.body}${this.envelopeFooter()}`,
    });
  }

  /**
   * Parse url with an eye on `preserveAddress` property
   * @param address
   * @private
   */
  public parseUrl(address: string) {
    const parsedAddress = new URL(address);
    // If host for service and default host differs, also if preserve address property set
    // we substitute host, hostname and port from settings then rebuild the href using .format
    if (this.preserveAddress && (this.hostname !== parsedAddress.hostname || this.port.toString() !== parsedAddress.port)) {
      parsedAddress.hostname = this.hostname;
      parsedAddress.host = `${this.hostname}:${this.port}`;
      parsedAddress.port = this.port.toString();
      parsedAddress.href = parsedAddress.toString();
    }
    return parsedAddress;
  }

  /**
   * Receive date and time from cam
   */
  async getSystemDateAndTime(): Promise<Date> {
    // The ONVIF spec says this should work without a Password as we need to know any difference in the
    // remote NVT's time relative to our own time clock (called the timeShift) before we can calculate the
    // correct timestamp in nonce SOAP Authentication header.
    // But.. Panasonic and Digital Barriers both have devices that implement ONVIF that only work with
    // authenticated getSystemDateAndTime. So for these devices we need to do an authenticated getSystemDateAndTime.
    // As 'timeShift' is not set, the local clock MUST be set to the correct time AND the NVT/Camera MUST be set
    // to the correct time if the camera implements Replay Attack Protection (eg Axis)
    const [data, xml] = await this.rawRequest({
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
          body : '<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>}',
        });
        return this.setupSystemDateAndTime(data);
      }
      throw error;
    }
  }

  /**
   * Check and find out video configuration for device
   * @private
   */
  private async getActiveSources() {
    this.media.videoSources.forEach((videoSource, idx) => {
      // let's choose first appropriate profile for our video source and make it default
      const videoSrcToken = videoSource.token;
      const appropriateProfiles = this.media.profiles.filter((profile) => (profile.videoSourceConfiguration
        ? profile.videoSourceConfiguration.sourceToken === videoSrcToken
        : false) && (profile.videoEncoderConfiguration !== undefined));
      if (appropriateProfiles.length === 0) {
        if (idx === 0) {
          throw new Error('Unrecognized configuration');
        } else {
          return;
        }
      }

      if (idx === 0) {
        [this.defaultProfile] = appropriateProfiles;
      }

      [this.defaultProfiles[idx]] = appropriateProfiles;

      this.activeSources[idx] = {
        sourceToken                   : videoSource.token,
        profileToken                  : this.defaultProfiles[idx].token,
        videoSourceConfigurationToken : this.defaultProfiles[idx].videoSourceConfiguration!.token,
      };
      if (this.defaultProfiles[idx].videoEncoderConfiguration) {
        const configuration = this.defaultProfiles[idx].videoEncoderConfiguration;
        this.activeSources[idx].encoding = configuration?.encoding;
        this.activeSources[idx].width = configuration?.resolution.width;
        this.activeSources[idx].height = configuration?.resolution.height;
        this.activeSources[idx].fps = configuration?.rateControl?.frameRateLimit;
        this.activeSources[idx].bitrate = configuration?.rateControl?.bitrateLimit;
      }

      if (idx === 0) {
        this.activeSource = this.activeSources[idx];
      }

      if (this.defaultProfiles[idx].PTZConfiguration) {
        this.activeSources[idx].ptz = {
          name  : this.defaultProfiles[idx].PTZConfiguration!.name,
          token : this.defaultProfiles[idx].PTZConfiguration!.token,
        };
        /*
        TODO Think about it
        if (idx === 0) {
          this.defaultProfile.PTZConfiguration = this.activeSources[idx].PTZConfiguration;
        } */
      }
    });
  }

  /**
   * Connect to the camera and fill device information properties
   */
  async connect() {
    await this.getSystemDateAndTime();
    try {
      await this.device.getServices();
    } catch (error) {
      await this.device.getCapabilities();
    }
    await Promise.all([this.media.getProfiles(), this.media.getVideoSources()]);
    await this.getActiveSources();
    this.emit('connect');
    return this;
  }
}
