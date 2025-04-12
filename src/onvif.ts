import { EventEmitter } from 'events';
import { SecureContextOptions } from 'tls';
import https, { Agent, RequestOptions } from 'https';
import http from 'http';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { linerase, parseSOAPString } from './utils';
import { Device } from './device';
import { Media } from './media';
import { Media2 } from './media2';
import { PTZ } from './ptz';
import { Capabilities, Profile, SystemDateTime } from './interfaces/onvif';
import { GetDeviceInformationResponse, SetSystemDateAndTime } from './interfaces/devicemgmt';
import { ReferenceToken } from './interfaces/common';

/**
 * Cam constructor options
 */
export interface OnvifOptions {
  /** Set true if using `https` protocol, defaults to false. */
  useSecure?: boolean;
  /** Set options for https like ca, cert, ciphers, rejectUnauthorized, secureOptions, secureProtocol, etc. */
  secureOptions?: SecureContextOptions;
  /** Use WS-Security SOAP headers */
  useWSSecurity?: boolean;
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
  [key: string]: URL | undefined;
}

export interface OnvifRequestOptions extends RequestOptions {
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
  sourceToken: ReferenceToken;
  profileToken: ReferenceToken;
  videoSourceConfigurationToken: ReferenceToken;
  encoding?: string;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  ptz?: {
    name: string;
    token: ReferenceToken;
  };
}

export interface SetSystemDateAndTimeExtended extends SetSystemDateAndTime {
  /**
   * Javascript Date object to use instead of UTCDateTime
   */
  dateTime?: Date;
  /**
   * The TZ format is specified by POSIX, please refer to POSIX 1003.1 section 8.3
   * Example: Europe, Paris TZ=CET-1CEST,M3.5.0/2,M10.5.0/3
   * CET = designation for standard time when daylight saving is not in force
   * -1 = offset in hours = negative so 1 hour east of Greenwich meridian
   * CEST = designation when daylight saving is in force ("Central European Summer Time")
   * , = no offset number between code and comma, so default to one hour ahead for daylight saving
   * M3.5.0 = when daylight saving starts = the last Sunday in March (the "5th" week means the last in the month)
   * /2, = the local time when the switch occurs = 2 a.m. in this case
   * M10.5.0 = when daylight saving ends = the last Sunday in October.
   * /3, = the local time when the switch occurs = 3 a.m. in this case
   */
  timezone?: string;
}

export interface SystemDateTimeExtended extends SystemDateTime {
  /**
   * Javascript Date object to use instead of UTCDateTime
   */
  dateTime: Date;
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
  static rawRequest = 'rawRequest' as const;
  /**
   * Indicates raw xml response from device.
   * @event rawResponse
   * @example
   * ```typescript
   * onvif.on('rawResponse', (xml) => { console.log('<- response was', xml); });
   * ```
   */
  static rawResponse = 'rawResponse' as const;
  /**
   * Indicates any warnings
   * @event warn
   * @example
   * ```typescript
   * onvif.on('warn', console.warn);
   * ```
   */
  static warn = 'warn' as const;
  /**
   * Indicates any errors
   * @param error Error object
   * @event error
   * @example
   * ```typescript
   * onvif.on('error', console.error);
   * ```
   */
  static error = 'error' as const;

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
  public readonly media2: Media2;
  public readonly ptz: PTZ;
  public useSecure: boolean;
  public secureOptions: SecureContextOptions;
  public useWSSecurity: boolean;
  private nc: number = 0;
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
  public deviceInformation?: GetDeviceInformationResponse;

  constructor(options: OnvifOptions) {
    super();
    this.useSecure = options.useSecure ?? false;
    this.secureOptions = options.secureOptions ?? {};
    this.useWSSecurity = options.useWSSecurity ?? true;
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
    this.media2 = new Media2(this);
    this.ptz = new PTZ(this);

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
        this.connect().catch((error) => this.emit('error', error));
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
    if (this.useWSSecurity && this.username && this.password) {
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

  private async rawRequest(options: OnvifRequestOptions): Promise<[Record<string, any>, string]> {
    return new Promise((resolve, reject) => {
      let alreadyReturned = false;
      const requestOptions: RequestOptions = {
        ...options,
        hostname : this.hostname,
        path     : options.service
          ? (this.uri[options.service] ? this.uri[options.service]!.pathname : this.path)
          : this.path,
        port    : this.port,
        agent   : this.agent, // Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections}
        timeout : this.timeout,
      };
      requestOptions.headers = {
        ...options.headers,
        'Content-Type'   : 'application/soap+xml',
        'Content-Length' : Buffer.byteLength(options.body, 'utf8').toString(),
        charset          : 'utf-8',
      };
      requestOptions.method = 'POST';
      const httpLibrary = this.useSecure ? https : http;
      if (this.useSecure) {
        Object.assign(requestOptions, this.secureOptions);
      }
      const request = httpLibrary.request(requestOptions, async (response) => {
        const wwwAuthenticate = response.headers['www-authenticate'];
        const { statusCode } = response;
        if (statusCode === 401 && wwwAuthenticate !== undefined) {
          // Re-request with digest auth header
          response.destroy();
          try {
            options.headers!.Authorization = this.digestAuth(wwwAuthenticate, requestOptions.path!);
            const digestResponse = await this.rawRequest(options);
            return resolve(digestResponse);
          } catch (e) {
            return reject(e);
          }
        }

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
        return undefined;
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

      this.emit('rawRequest', options.body, requestOptions);
      request.write(options.body);
      request.end();
    });
  }

  private digestAuth(wwwAuthenticate: string, path: string) {
    const challenge = this.parseChallenge(wwwAuthenticate);
    const ha1 = crypto.createHash('md5');
    ha1.update([this.username, challenge.realm, this.password].join(':'));
    const ha2 = crypto.createHash('md5');
    ha2.update(['POST', path].join(':'));

    let cnonce = null;
    let nc = null;
    if (typeof challenge.qop === 'string') {
      const cnonceHash = crypto.createHash('md5');
      cnonceHash.update(Math.random().toString(36));
      cnonce = cnonceHash.digest('hex').substring(0, 8);
      nc = this.updateNC();
    }

    const response = crypto.createHash('md5');
    const responseParams = [
      ha1.digest('hex'),
      challenge.nonce,
    ];
    if (cnonce) {
      responseParams.push(nc);
      responseParams.push(cnonce);
    }

    responseParams.push(challenge.qop);
    responseParams.push(ha2.digest('hex'));
    response.update(responseParams.join(':'));

    const authParams: { [key: string]: string } = {
      username : this.username!,
      realm    : challenge.realm,
      nonce    : challenge.nonce,
      uri      : path,
      qop      : challenge.qop,
      response : response.digest('hex'),
    };
    if (challenge.opaque) {
      authParams.opaque = challenge.opaque;
    }
    if (cnonce && nc) {
      authParams.nc = nc;
      authParams.cnonce = cnonce;
    }
    return `Digest ${Object.entries(authParams).map(([key, value]) => `${key}="${value}"`).join(',')}`;
  }

  public request(options: OnvifRequestOptions) {
    if (!options.body) {
      throw new Error('There is no \'body\' field in request options');
    }
    this.emit('requestBody', options.body);
    options.headers = options.headers ?? {};
    return this.rawRequest({
      ...options,
      body : `${this.envelopeHeader()}${options.body}${this.envelopeFooter()}`,
    });
  }

  private parseChallenge(digest: string) {
    const prefix = 'Digest ';
    const challenge = digest.substring(digest.indexOf(prefix) + prefix.length);
    const parts = challenge.split(',')
      .map((part) => part.match(/^\s*?([a-zA-Z0-9]+)="?([^"]*)"?\s*?$/)!.slice(1));
    return Object.fromEntries(parts);
  }

  private updateNC() {
    this.nc += 1;
    if (this.nc > 99999999) {
      this.nc = 1;
    }
    return String(this.nc).padStart(8, '0');
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
  async getSystemDateAndTime() {
    // The ONVIF spec says this should work without a Password as we need to know any difference in the
    // remote NVT's time relative to our own time clock (called the timeShift) before we can calculate the
    // correct timestamp in nonce SOAP Authentication header.
    // But... Panasonic and Digital Barriers both have devices that implement ONVIF that only work with
    // authenticated getSystemDateAndTime. So for these devices we need to do an authenticated getSystemDateAndTime.
    // As 'timeShift' is not set, the local clock MUST be set to the correct time AND the NVT/Camera MUST be set
    // to the correct time if the camera implements Replay Attack Protection (e.g. Axis)
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
   * Receive only date and time from cam (old behaviour, returns only Date object)
   */
  async getOnlySystemDateAndTime() {
    return (await this.getSystemDateAndTime()).dateTime;
  }

  /**
   * Add time shift to use with ONVIF timestamps
   * @param data
   * @private
   */
  private setupSystemDateAndTime(data: any): SystemDateTimeExtended {
    const { systemDateAndTime } = linerase(data).getSystemDateAndTimeResponse;
    // UTCDateTime is mandatory since version 2.0
    const UTCDateTime = systemDateAndTime.UTCDateTime || systemDateAndTime.localDateTime;
    let dateTime;
    if (UTCDateTime === undefined) {
      // Seen on a cheap Chinese camera from GWellTimes-IPC. Use the current time.
      dateTime = new Date();
    } else {
      dateTime = new Date(Date.UTC(UTCDateTime.date.year, UTCDateTime.date.month - 1, UTCDateTime.date.day, UTCDateTime.time.hour, UTCDateTime.time.minute, UTCDateTime.time.second));
    }
    if (!this.timeShift) {
      this.timeShift = dateTime.getTime() - (process.uptime() * 1000);
    }
    systemDateAndTime.dateTime = dateTime;
    return systemDateAndTime;
  }

  /**
   * Set the device system date and time
   * Supports two possible date and time values: UTCDateTime(ONVIF types) or dateTime(js Date-object, preferred)
   */
  async setSystemDateAndTime(options: SetSystemDateAndTimeExtended): Promise<SystemDateTimeExtended> {
    if (!['Manual', 'NTP'].includes(options.dateTimeType!)) {
      throw new Error('DateTimeType should be `Manual` or `NTP`');
    }
    if (options.dateTimeType === 'Manual' && !options.dateTime && !options.UTCDateTime) {
      throw new Error('`dateTime` or `UTCDateTime` should be defined when the DateTimeType is `Manual`');
    }
    const body = '<SetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl">'
      + `<DateTimeType>${
        options.dateTimeType
      }</DateTimeType>`
      + `<DaylightSavings>${
        !!options.daylightSavings
      }</DaylightSavings>${
        options.timezone !== undefined || options.timeZone?.TZ !== undefined
          ? '<TimeZone>'
          + `<TZ xmlns="http://www.onvif.org/ver10/schema">${
            options.timezone || options.timeZone?.TZ
          }</TZ>`
          + '</TimeZone>' : ''
      }${options.dateTime !== undefined && options.dateTime instanceof Date
        ? '<UTCDateTime>'
        + '<Time xmlns="http://www.onvif.org/ver10/schema">'
        + `<Hour>${options.dateTime.getUTCHours()}</Hour>`
        + `<Minute>${options.dateTime.getUTCMinutes()}</Minute>`
        + `<Second>${options.dateTime.getUTCSeconds()}</Second>`
        + '</Time>'
        + '<Date xmlns="http://www.onvif.org/ver10/schema">'
        + `<Year>${options.dateTime.getUTCFullYear()}</Year>`
        + `<Month>${options.dateTime.getUTCMonth() + 1}</Month>`
        + `<Day>${options.dateTime.getUTCDate()}</Day>`
        + '</Date>'
        + '</UTCDateTime>'
        : (options.UTCDateTime !== undefined ? '<UTCDateTime>'
        + '<Time xmlns="http://www.onvif.org/ver10/schema">'
        + `<Hour>${options.UTCDateTime?.time?.hour}</Hour>`
        + `<Minute>${options.UTCDateTime?.time?.minute}</Minute>`
        + `<Second>${options.UTCDateTime?.time?.second}</Second>`
        + '</Time>'
        + '<Date xmlns="http://www.onvif.org/ver10/schema">'
        + `<Year>${options.UTCDateTime?.date?.year}</Year>`
        + `<Month>${options.UTCDateTime?.date?.month}</Month>`
        + `<Day>${options.UTCDateTime?.date?.day}</Day>`
        + '</Date>'
        + '</UTCDateTime>' : '')
      }</SetSystemDateAndTime>`;
    const [data] = await this.request({
      // Try the Unauthenticated Request first. Do not use this._envelopeHeader() as we don't have timeShift yet.
      body,
    });
    if (linerase(data).setSystemDateAndTimeResponse.length !== 0) {
      throw new Error(`Wrong 'SetSystemDateAndTime' response: '${linerase(data).setSystemDateAndTimeResponse}'`);
    }
    // get new system time from device
    return this.getSystemDateAndTime();
  }

  /**
   * Check and find out video configuration for device
   * @private
   */
  private async getActiveSources() {
    this.media.videoSources.forEach(({ token: videoSrcToken }, idx) => {
      // let's choose first appropriate profile for our video source and make it default
      const appropriateProfiles = this.media.profiles.filter((profile) => (
        profile.videoSourceConfiguration?.sourceToken === videoSrcToken
      ) && (profile.videoEncoderConfiguration !== undefined));
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
        sourceToken                   : videoSrcToken,
        profileToken                  : this.defaultProfiles[idx].token,
        videoSourceConfigurationToken : this.defaultProfiles[idx].videoSourceConfiguration!.token,
      };
      if (this.defaultProfiles[idx].videoEncoderConfiguration) {
        const configuration = this.defaultProfiles[idx].videoEncoderConfiguration;
        this.activeSources[idx].encoding = configuration?.encoding;
        this.activeSources[idx].width = configuration?.resolution?.width;
        this.activeSources[idx].height = configuration?.resolution?.height;
        this.activeSources[idx].fps = configuration?.rateControl?.frameRateLimit;
        this.activeSources[idx].bitrate = configuration?.rateControl?.bitrateLimit;
      }

      if (idx === 0) {
        this.activeSource = this.activeSources[idx];
      }

      if (this.defaultProfiles[idx].PTZConfiguration) {
        this.activeSources[idx].ptz = {
          name  : this.defaultProfiles[idx].PTZConfiguration!.name as string,
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
    // Try to get services (new approach). If not, get capabilities
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
