/**
 * Onvif module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/wp-content/uploads/2022/07/ONVIF_Device_Feature_Discovery_Specification_21.12.pdf
 */

import { EventEmitter } from 'events';
import { SecureContextOptions } from 'tls';
import https, { Agent as HttpsAgent, RequestOptions } from 'https';
import http, { Agent as HttpAgent } from 'http';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { build, getDigestHeaders, linerase, parseSOAPString, splitArgs } from './utils';
import { Device } from './device';
import { Media } from './media';
import { Media2 } from './media2';
import { PTZ } from './ptz';
import { Capabilities, Profile, SystemDateTime } from './interfaces/onvif';
import { GetDeviceInformationResponse, SetSystemDateAndTime } from './interfaces/devicemgmt';
import { ReferenceToken } from './interfaces/common';
import { Events, NotificationMessage } from './events';
import { Replay } from './replay';
import { Imaging } from './imaging';
import { Recording } from './recording';
import { DoorControl } from './doorcontrol';
import { Thermal } from './thermal';
import { Analytics } from './analytics';
import { DeviceIO } from './deviceio';
import { Display } from './display';
import { ActionEngine } from './actionengine';

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
  agent?: HttpsAgent | HttpAgent | boolean;
  /** Force using hostname and port from constructor for the services (ex.: for proxying), defaults to false. */
  preserveAddress?: boolean;
  /** Set false if the camera should not connect automatically, defaults false. */
  autoConnect?: boolean;
}

export interface OnvifServices {
  PTZ?: URL;
  analytics?: URL;
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
  doorcontrol?: URL;
  thermal?: URL;
  actionengine?: URL;
  search?: URL;
  [key: string]: URL | undefined;
}

export interface OnvifRequestOptions extends Omit<RequestOptions, 'headers'> {
  headers?: http.OutgoingHttpHeaders;
  /** Name of service (ptz, media, etc) */
  service?: keyof OnvifServices;
  /** SOAP body */
  body: string | Record<string, any>;
  /** Defines another url to request */
  url?: URL;
  /** Make request to PTZ uri or not */
  ptz?: boolean;
  /** Timeout for pull-point event requests */
  timeout?: number;
  /** Additional SOAP-headers */
  soapHeaders?: Record<string, any>;
}

/**
 * Information about active video source
 */
export interface ActiveSource {
  sourceToken: ReferenceToken;
  /**
   * Media profile token
   */
  profileToken: ReferenceToken;
  videoSourceConfigurationToken: ReferenceToken;
  videoSourceToken: ReferenceToken;
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

interface OnvifEvents {
  [Onvif.EVENT]: [msg: NotificationMessage];
  [Onvif.ERROR]: [error: Error];
  [Onvif.CONNECT]: [];
  [Onvif.RAW_REQUEST]: [xml: string, requestOptions: http.RequestOptions];
  [Onvif.REQUEST_BODY]: [body: string];
  [Onvif.RAW_RESPONSE]: [xml: string];
  [Onvif.WARN]: [error: Error];
  [Onvif.EVENTS_ERROR]: [error: Error];
  newListener: [event: string, listener: (...args: any[]) => void];
  removeListener: [event: string, listener: (...args: any[]) => void];
}

export class Onvif extends EventEmitter<OnvifEvents> {
  /**
   * Indicates raw xml response from device.
   * @event rawResponse
   * @example
   * ```typescript
   * onvif.on('rawResponse', (xml) => { console.log('<- response was', xml); });
   * ```
   */
  static readonly RAW_RESPONSE = 'rawResponse';

  /**
   * Indicates raw xml request to device.
   * @event rawRequest
   * @example
   * ```typescript
   * onvif.on('rawRequest', (xml) => { console.log('-> request was', xml); });
   * ```
   */
  static readonly RAW_REQUEST = 'rawRequest';

  /**
   * Shows body of request
   * @event
   */
  static readonly REQUEST_BODY = 'requestBody';

  /**
   * Indicates any errors except events errors
   * @event error
   * @example
   * ```typescript
   * onvif.on('error', console.error);
   * ```
   */
  static readonly ERROR = 'error';

  /**
   * Indicates events errors
   * @event eventsError
   * @example
   * ```typescript
   * onvif.on('eventsError', console.error);
   * ```
   */
  static readonly EVENTS_ERROR = 'eventsError';

  /**
   * Indicates any event from Onvif device.
   * @event event
   * @example
   * ```typescript
   * onvif.on('event', (msg) => { console.log(new Date().toLocaleTimeString(), 'new event', msg); });
   * ```
   */
  static readonly EVENT = 'event';

  /**
   * Indicates any warnings
   * @event warn
   * @example
   * ```typescript
   * onvif.on('warn', console.warn);
   * ```
   */
  static readonly WARN = 'warn';

  /**
   * Indicates successfully connection
   * @event connect
   * @example
   * ```typescript
   * onvif.on('connect', () => console.log('connected!'));
   * ```
   */
  static readonly CONNECT = 'connect';

  /**
   * Core device namespace for device v1.0 methods
   * @example
   * ```typescript
   * const date = await onvif.device.getSystemDateAndTime();
   * console.log(date.toLocaleString());
   * ```
   */
  public readonly device: Device;
  /**
   * Media namespace for media v1.0 methods
   * @example
   * ```typescript
   * const profiles = await onvif.media.getProfiles();
   * console.log(profiles);
   * ```
   */
  public readonly media: Media;
  /**
   * Media2 namespace for media2 v1.0 methods
   * @example
   * ```typescript
   * const profiles = await onvif.media2.getProfiles();
   * console.log(profiles);
   * ```
   */
  public readonly media2: Media2;
  /**
   * PTZ namespace for ptz v1.0 methods
   * @example
   * ```typescript
   * const ptz = await onvif.ptz.getPTZStatus();
   * console.log(ptz);
   * ```
   */
  public readonly ptz: PTZ;
  /**
   * Events namespace for events v1.0 methods
   * @example
   * ```typescript
   * onvif.on('event', (msg) => { console.log('-> request was', xml); });
   * ```
   */
  public readonly events: Events;
  /**
   * Replay namespace for replay v1.0 methods
   * @example
   * ```typescript
   * const replay = await onvif.replay.getReplayConfiguration();
   * console.log(replay);
   * ```
   */
  public readonly replay: Replay;
  /**
   * Imaging namespace for imaging v1.0 methods
   * @example
   * ```typescript
   * const imaging = await onvif.imaging.getImagingSettings();
   * console.log(imaging);
   * ```
   */
  public readonly imaging: Imaging;
  /**
   * Recording namespace for recording v1.0 methods
   * @example
   * ```typescript
   * const recording = await onvif.recording.getRecordingConfiguration();
   * console.log(recording);
   * ```
   */
  public readonly recording: Recording;
  /**
   * DoorControl namespace for doorcontrol v1.0 methods
   * @example
   * ```typescript
   * const doorControl = await onvif.doorControl.getDoorControlConfiguration();
   * console.log(doorControl);
   * ```
   */
  public readonly doorControl: DoorControl;
  /**
   * Thermal namespace for thermal v1.0 methods
   * @example
   * ```typescript
   * const thermal = await onvif.thermal.getConfigurations();
   * console.log(thermal);
   * ```
   */
  public readonly thermal: Thermal;
  /**
   * Analytics namespace for analytics v1.0 methods
   * @example
   * ```typescript
   * const analytics = await onvif.analytics.getAnalyticsConfiguration();
   * console.log(analytics);
   * ```
   */
  public readonly analytics: Analytics;
  /**
   * DeviceIO namespace for deviceio v1.0 methods
   * @example
   * ```typescript
   * const deviceIO = await onvif.deviceIO.getDeviceIOConfiguration();
   * console.log(deviceIO);
   * ```
   */
  public readonly deviceIO: DeviceIO;
  /**
   * Display namespace for display v1.0 methods
   * @example
   * ```typescript
   * const display = await onvif.display.getDisplayConfiguration();
   * console.log(display);
   * ```
   */
  public readonly display: Display;
  /**
   * ActionEngine namespace for actionengine v1.0 methods
   * @example
   * ```typescript
   * const actionEngine = await onvif.actionEngine.getActionEngineConfiguration();
   * console.log(actionEngine);
   * ```
   */
  public readonly actionEngine: ActionEngine;
  /**
   * Indicates if the device is using secure connection
   */
  public readonly useSecure: boolean;
  /**
   * Secure options for the connection
   */
  public secureOptions: SecureContextOptions;
  /**
   * Use WS-Security for the connection (this is the default and adds security headers in the SOAP messages)
   */
  public useWSSecurity: boolean;
  /**
   * Nonce for the connection
   */
  private nc: number = 0;
  /**
   * Hostname of the ONVIF device
   */
  public hostname: string;
  /**
   * Username for the connection
   */
  public username?: string;
  /**
   * Password for the connection
   */
  public password?: string;
  /**
   * Port for the connection
   */
  public port: number;
  /**
   * Path for the connection
   */
  public path: string;
  public timeout: number;
  public agent: HttpsAgent | HttpAgent | boolean;
  public preserveAddress = false;
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
    const httpLibrary = this.useSecure ? https : http;
    this.agent = options.agent ?? new httpLibrary.Agent({ keepAlive: true, keepAliveMsecs: 10000 });
    this.preserveAddress = options.preserveAddress ?? false;
    this.uri = {};
    this.capabilities = {};

    this.device = new Device(this);
    this.media = new Media(this);
    this.media2 = new Media2(this);
    this.ptz = new PTZ(this);
    this.events = new Events(this);
    this.replay = new Replay(this);
    this.imaging = new Imaging(this);
    this.recording = new Recording(this);
    this.doorControl = new DoorControl(this);
    this.thermal = new Thermal(this);
    this.analytics = new Analytics(this);
    this.deviceIO = new DeviceIO(this);
    this.display = new Display(this);
    this.actionEngine = new ActionEngine(this);

    /** Bind event handling to the `event` event */
    this.on('newListener', (name) => {
      // if this is the first listener, start pulling subscription
      if (name === 'event' && this.listeners(name).length === 0) {
        this.events.globalSubscription.subscribe().catch((error) => this.emit('error', error));
      }
    });
    this.on('removeListener', (name) => {
      if (name === 'event' && this.listeners(name).length === 0) {
        this.events.globalSubscription.unsubscribe().catch((error) => this.emit('error', error));
      }
    });

    if (options.autoConnect) {
      setImmediate(() => {
        this.connect().catch((error) => this.emit('error', error));
      });
    }
  }

  envelopeBody(body: Record<string, any> | string) {
    if (typeof body === 'string') {
      return {
        $: {
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
        },
        _: 'RAW_XML_PLACEHOLDER',
      };
    } else {
      return {
        $: {
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
        },
        ...body,
      };
    }
  }

  /**
   * Envelope header for all SOAP messages
   * @param options
   * @private
   */
  envelopeHeader(options?: OnvifRequestOptions) {
    const pd = this.useWSSecurity && this.username && this.password ? this.passwordDigest() : null;
    return {
      ...(pd && {
        Security: {
          $: {
            's:mustUnderstand': '1',
            xmlns: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
          },
          UsernameToken: {
            Username: this.username,
            Password: {
              $: {
                Type: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest',
              },
              _: pd.passDigest,
            },
            Nonce: {
              $: {
                EncodingType:
                  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary',
              },
              _: pd.nonce,
            },
            Created: {
              $: {
                xmlns: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
              },
              _: pd.timestamp,
            },
          },
        },
        ...options?.soapHeaders,
      }),
    };
  }

  private passwordDigest() {
    const timestamp = new Date(process.uptime() * 1000 + (this.timeShift || 0)).toISOString();
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
      nonce: nonce.toString('base64'),
      timestamp,
    };
  }

  private async rawRequest(options: OnvifRequestOptions): Promise<[Record<string, any>, string]> {
    return new Promise((resolve, reject) => {
      if (typeof options.body !== 'string') {
        return reject(new Error('Request body in rawRequest must be a string'));
      }
      let alreadyReturned = false;
      const requestOptions: RequestOptions = {
        ...options,
        ...(options.url
          ? {
              // if we have url property for pull-point event requests
              hostname: options.url.hostname,
              path: options.url.pathname,
              port: options.url.port,
            }
          : {
              // try to guess the right path for the requested service
              hostname: this.hostname,
              path: options.service
                ? this.uri[options.service]
                  ? this.uri[options.service]!.pathname
                  : this.path
                : this.path,
              port: this.port,
            }),
        agent: options.agent ?? this.agent, // Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections}
        timeout: this.timeout,
      };
      requestOptions.headers = {
        ...options.headers,
        'Content-Type': 'application/soap+xml',
        'Content-Length': Buffer.byteLength(options.body, 'utf8').toString(),
        charset: 'utf-8',
      };
      requestOptions.method = 'POST';
      const httpLibrary = this.useSecure ? https : http;
      if (this.useSecure) {
        Object.assign(requestOptions, this.secureOptions);
      }
      const request = httpLibrary.request(requestOptions, async (response) => {
        if (response.statusCode === 401) {
          // Avoid racing with request 'error' from response.destroy() below
          if (alreadyReturned) {
            return undefined;
          }
          // Digest credentials were already sent and rejected — do not retry forever
          if (options.headers?.authorization || options.headers?.Authorization) {
            alreadyReturned = true;
            response.destroy();
            return reject(new Error('Digest authentication failed'));
          }
          const digestHeadersArray = getDigestHeaders(response.rawHeaders);
          if (digestHeadersArray.length > 0) {
            // Re-request with the digest auth header
            alreadyReturned = true;
            response.destroy();
            try {
              options.headers = {
                ...options.headers,
                authorization: this.digestAuth(digestHeadersArray, requestOptions),
              };
              const digestResponse = await this.rawRequest(options);
              return resolve(digestResponse);
            } catch (e) {
              return reject(e);
            }
          } else {
            alreadyReturned = true;
            response.destroy();
            return reject(new Error(`Digest authentication headers not found in the server response`));
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
          this.emit('rawResponse', xml);
          resolve(parseSOAPString(xml));
        });
        return undefined;
      });

      // let handle timeout by itself and produce network error to catch below
      request.setTimeout(options.timeout ?? this.timeout, () => {
        const err = new Error('Network timeout') as NodeJS.ErrnoException;
        err.code = 'ETIMEDOUT';
        err.syscall = 'connect';
        request.destroy(err);
      });

      request.on('error', (error: NodeJS.ErrnoException) => {
        if (alreadyReturned) {
          return;
        }
        alreadyReturned = true;
        /* address, port number or IPCam error */
        if (error.code === 'ECONNREFUSED' && error.syscall === 'connect') {
          reject(error);
          /* network error */
        } else if (error.code === 'ECONNRESET' && error.syscall === 'read') {
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

  private digestAuth(digestHeadersArray: string[], requestOptions: RequestOptions) {
    // Process each item in the wwwAuthenticateArray
    // Most cameras have only 1 item.
    // HikVision implementing the new MD5-then-SHA256 have two items
    let bestResult;
    let bestAlgorithm;

    for (const digestHeader of digestHeadersArray) {
      const challenge = this.parseChallenge(digestHeader);
      // if 'algorithm' is undefined, the Digest RFC says we default to MD5
      const algorithm = challenge.algorithm === undefined ? 'MD5' : challenge.algorithm.replace(/-/g, '');
      const ha1 = crypto.createHash(algorithm);
      ha1.update([this.username, challenge.realm, this.password].join(':'));
      // Sony SRG-XP1 sends qop="auth,auth-int" it means the Server will accept either "auth" or "auth-int". We select "auth"
      // We also need to handle spaces in the string e.g.like "auth, auth-int"
      // So we split the QOP and then see if one item is "auth" using a trim to remove whitespace
      if (typeof challenge.qop === 'string' && challenge.qop.split(',').some((item) => item.trim() === 'auth')) {
        challenge.qop = 'auth';
      }
      const ha2 = crypto.createHash(algorithm);
      ha2.update([requestOptions.method, requestOptions.path].join(':'));

      let cnonce;
      let nc;
      if (typeof challenge.qop === 'string' && challenge.qop === 'auth') {
        const cnonceHash = crypto.createHash(algorithm);
        cnonceHash.update(Math.random().toString(36));
        cnonce = cnonceHash.digest('hex').substring(0, 8);
        nc = this.updateNC();
      }

      // HASH_ALG is usually MD5 but can also be SHA256
      // No qop   -> Response = HASH_ALG(HA1:nonce:HA2);
      // With qop -> Response = HASH_ALG(HA1:nonce:nonceCount:cnonce:qop:HA2)
      const response = crypto.createHash(algorithm);
      const responseParams = [ha1.digest('hex'), challenge.nonce];
      if (cnonce && nc) {
        responseParams.push(nc);
        responseParams.push(cnonce);
        responseParams.push(challenge.qop);
      }
      responseParams.push(ha2.digest('hex'));
      response.update(responseParams.join(':'));

      const authParams: Record<string, string> = {
        username: `"${this.username}"`,
        realm: `"${challenge.realm}"`,
        nonce: `"${challenge.nonce}"`,
        uri: `"${requestOptions.path}"`,
      };
      // Send back the original algorithm value, if we received one.
      if ('algorithm' in challenge) {
        authParams.algorithm = challenge.algorithm;
      }
      // RFC says only send qop, nc and cnonce if there was a QOP in the Header
      // 'qop' and 'nc' do not have quotes around the Values
      if ('qop' in challenge && nc) {
        authParams.qop = challenge.qop; // no quotes
        authParams.nc = nc; // no quotes
        authParams.cnonce = `"${cnonce}"`;
      }
      authParams.response = `"${response.digest('hex')}"`;
      if (challenge.opaque) {
        authParams.opaque = `"${challenge.opaque}"`;
      }
      // Values that need quotes already include them; qop/nc stay unquoted per RFC
      const result = `Digest ${Object.entries(authParams)
        .map(([key, value]) => `${key}=${value}`)
        .join(',')}`;
      if (bestResult == null || (algorithm === 'SHA256' && bestAlgorithm === 'MD5')) {
        // set bestResult or upgrade the bestResult to the stronger algorithm
        bestResult = result;
        bestAlgorithm = algorithm;
      }
    }
    return bestResult;
  }

  public request(options: OnvifRequestOptions) {
    options.headers = options.headers ?? {};
    const bodyObject = {
      's:Envelope': {
        $: {
          'xmlns:s': 'http://www.w3.org/2003/05/soap-envelope',
          'xmlns:a': 'http://www.w3.org/2005/08/addressing',
        },
        's:Header': this.envelopeHeader(options),
        's:Body': this.envelopeBody(options.body),
      },
    };
    const body = build(bodyObject).replace('RAW_XML_PLACEHOLDER', typeof options.body === 'string' ? options.body : '');

    this.emit('requestBody', body);
    return this.rawRequest({
      ...options,
      body,
    });
  }

  private parseChallenge(digest: string): { [key: string]: string } {
    const prefix = 'Digest ';
    const challenge = digest.substring(digest.indexOf(prefix) + prefix.length);
    const partsArray = splitArgs(challenge);
    const parts = partsArray.map((part) => part.match(/^\s*?([a-zA-Z0-9]+)="?([^"]*)"?\s*?$/)!.slice(1));
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
    if (
      this.preserveAddress &&
      (this.hostname !== parsedAddress.hostname || this.port.toString() !== parsedAddress.port)
    ) {
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
      body:
        '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
        '<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
        '<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
        '</s:Body>' +
        '</s:Envelope>',
    });
    try {
      return this.setupSystemDateAndTime(data);
    } catch (error) {
      if (xml && xml.toLowerCase().includes('sender not authorized')) {
        // Try again with a Username and Password
        const [data] = await this.request({
          body: '<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>}',
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
      dateTime = new Date(
        Date.UTC(
          UTCDateTime.date.year,
          UTCDateTime.date.month - 1,
          UTCDateTime.date.day,
          UTCDateTime.time.hour,
          UTCDateTime.time.minute,
          UTCDateTime.time.second,
        ),
      );
    }
    if (!this.timeShift) {
      this.timeShift = dateTime.getTime() - process.uptime() * 1000;
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
    const body =
      '<SetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl">' +
      `<DateTimeType>${options.dateTimeType}</DateTimeType>` +
      `<DaylightSavings>${!!options.daylightSavings}</DaylightSavings>${
        options.timezone !== undefined || options.timeZone?.TZ !== undefined
          ? '<TimeZone>' +
            `<TZ xmlns="http://www.onvif.org/ver10/schema">${options.timezone || options.timeZone?.TZ}</TZ>` +
            '</TimeZone>'
          : ''
      }${
        options.dateTime !== undefined && options.dateTime instanceof Date
          ? '<UTCDateTime>' +
            '<Time xmlns="http://www.onvif.org/ver10/schema">' +
            `<Hour>${options.dateTime.getUTCHours()}</Hour>` +
            `<Minute>${options.dateTime.getUTCMinutes()}</Minute>` +
            `<Second>${options.dateTime.getUTCSeconds()}</Second>` +
            '</Time>' +
            '<Date xmlns="http://www.onvif.org/ver10/schema">' +
            `<Year>${options.dateTime.getUTCFullYear()}</Year>` +
            `<Month>${options.dateTime.getUTCMonth() + 1}</Month>` +
            `<Day>${options.dateTime.getUTCDate()}</Day>` +
            '</Date>' +
            '</UTCDateTime>'
          : options.UTCDateTime !== undefined
            ? '<UTCDateTime>' +
              '<Time xmlns="http://www.onvif.org/ver10/schema">' +
              `<Hour>${options.UTCDateTime?.time?.hour}</Hour>` +
              `<Minute>${options.UTCDateTime?.time?.minute}</Minute>` +
              `<Second>${options.UTCDateTime?.time?.second}</Second>` +
              '</Time>' +
              '<Date xmlns="http://www.onvif.org/ver10/schema">' +
              `<Year>${options.UTCDateTime?.date?.year}</Year>` +
              `<Month>${options.UTCDateTime?.date?.month}</Month>` +
              `<Day>${options.UTCDateTime?.date?.day}</Day>` +
              '</Date>' +
              '</UTCDateTime>'
            : ''
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
    if (!this.media.videoSources?.length) {
      return;
    }

    this.media.videoSources.forEach(({ token: videoSrcToken }, idx) => {
      // let's choose first appropriate profile for our video source and make it default
      let appropriateProfiles = this.media.profiles.filter(
        (profile) =>
          profile.videoSourceConfiguration?.sourceToken === videoSrcToken &&
          profile.videoEncoderConfiguration !== undefined,
      );

      // Happytime and some devices return profiles without VideoSourceConfiguration.
      // Fall back to any profile that has an encoder, then to any profile at all.
      if (appropriateProfiles.length === 0) {
        appropriateProfiles = this.media.profiles.filter((profile) => profile.videoEncoderConfiguration !== undefined);
      }
      if (appropriateProfiles.length === 0) {
        appropriateProfiles = [...this.media.profiles];
      }
      if (appropriateProfiles.length === 0) {
        if (idx === 0) {
          this.emit(Onvif.WARN, new Error('Unrecognized configuration: no media profiles available for video sources'));
        }
        return;
      }

      if (idx === 0) {
        [this.defaultProfile] = appropriateProfiles;
      }

      [this.defaultProfiles[idx]] = appropriateProfiles;

      this.activeSources[idx] = {
        sourceToken: videoSrcToken,
        profileToken: this.defaultProfiles[idx].token,
        videoSourceConfigurationToken: this.defaultProfiles[idx].videoSourceConfiguration?.token ?? videoSrcToken,
        videoSourceToken: videoSrcToken,
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
          name: this.defaultProfiles[idx].PTZConfiguration!.name as string,
          token: this.defaultProfiles[idx].PTZConfiguration!.token,
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
