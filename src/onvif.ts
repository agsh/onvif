/**
 * Onvif module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/wp-content/uploads/2022/07/ONVIF_Device_Feature_Discovery_Specification_21.12.pdf
 */

import { EventEmitter } from 'events';
import { ConnectionOptions } from 'tls';
import https, { Agent as HttpsAgent, RequestOptions } from 'https';
import http, { Agent as HttpAgent } from 'http';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import {
  build,
  getDigestHeaders,
  linerase,
  OnvifAuthError,
  OnvifResponse,
  OnvifResponseError,
  OnvifValidationError,
  parseSOAPString,
  soapActionFromBody,
  soapActionFromXml,
  splitArgs,
} from './utils';
import type Device from './device';
import type Media from './media';
import type Media2 from './media2';
import type PTZ from './ptz';
import type { Capabilities, Profile, SystemDateTime, VideoSource } from './interfaces/onvif';
import type {
  GetDeviceInformationResponse,
  SetSystemDateAndTime,
  Service as DeviceService,
} from './interfaces/devicemgmt';
import type { ReferenceToken } from './interfaces/common';
import Events, { type NotificationMessage } from './events';
import type Replay from './replay';
import type Imaging from './imaging';
import type Recording from './recording';
import type DoorControl from './doorcontrol';
import type AccessControl from './accesscontrol';
import type Credential from './credential';
import type AccessRules from './accessrules';
import type Schedule from './schedule';
import type Provisioning from './provisioning';
import type AdvancedSecurity from './advancedsecurity';
import type Thermal from './thermal';
import type Uplink from './uplink';
import type AppManagement from './appmgmt';
import type Analytics from './analytics';
import type DeviceIO from './deviceio';
import type Display from './display';
import type ActionEngine from './actionengine';
import type Search from './search';
import type AnalyticsDevice from './analyticsdevice';
import type Receiver from './receiver';
import { lazyService, XMLNS } from './service';
import type { ConnectOptions } from './connection';

/**
 * Onvif constructor options
 */
export interface OnvifOptions {
  /** Set true if using `https` protocol, defaults to false. */
  useSecure?: boolean;
  /** Set options for https like ca, cert, ciphers, rejectUnauthorized, secureOptions, secureProtocol, etc. */
  secureOptions?: ConnectionOptions;
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
  /** Set true if the camera should connect automatically, defaults false. */
  autoConnect?: boolean;
  /**
   * All XAddrs from WS-Discovery (set by {@link Discovery}).
   * Same role as v0.x `cam.xaddrs`.
   */
  xaddrs?: URL[];
}

export interface OnvifServices {
  ptz?: URL;
  analytics?: URL;
  analyticsdevice?: URL;
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
  accesscontrol?: URL;
  credential?: URL;
  accessrules?: URL;
  schedule?: URL;
  provisioning?: URL;
  advancedsecurity?: URL;
  thermal?: URL;
  uplink?: URL;
  appmgmt?: URL;
  actionengine?: URL;
  search?: URL;
  [key: string]: URL | undefined;
}

export interface OnvifRequestOptions extends Omit<RequestOptions, 'headers'> {
  headers?: http.OutgoingHttpHeaders;
  /** Name of service (ptz, media, etc) */
  service?: keyof OnvifServices;
  /** SOAP body */
  body: Record<string, any>;
  /** Defines another url to request */
  url?: URL;
  /** Timeout for pull-point event requests */
  timeout?: number;
  /** Additional SOAP-headers */
  soapHeaders?: Record<string, any>;
  /** Tags that should be forced to be arrays */
  array?: string[];
  /** Values of these tags will be in xml2js format */
  rawXML?: string[];
}

export interface OnvifRawRequestOptions extends Omit<OnvifRequestOptions, 'body'> {
  /** SOAP body */
  body: string;
  /**
   * SOAP 1.2 action URI for Content-Type (namespace/Operation).
   * When omitted, derived from the envelope Body like v0.x.
   */
  action?: string;
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

/**
 * Main ONVIF client. Connect to a device, then use lazy service namespaces (`media`, `ptz`, …).
 *
 * @example Connect, inspect the device, then stream and move PTZ:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({
 *   hostname: '192.168.1.13',
 *   port: 80,
 *   username: 'admin',
 *   password: 'admin',
 * });
 *
 * onvif.on('warn', (err) => console.warn('warn', err.message));
 * onvif.on('event', (msg) => console.log('event', msg.topic));
 *
 * await onvif.connect();
 * console.log(await onvif.device.getDeviceInformation());
 * console.log(onvif.profiles.map((p) => p.name));
 *
 * const { uri } = await onvif.media.getStreamUri({ protocol: 'RTSP' });
 * console.log('RTSP', uri);
 *
 * if (onvif.uri.ptz) {
 *   await onvif.ptz.continuousMove({ velocity: { x: 0.2, y: 0, zoom: 0 } });
 *   await new Promise((r) => setTimeout(r, 500));
 *   await onvif.ptz.stop();
 * }
 * ```
 * @category Core
 */
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

  /** Lazy {@link Device} service namespace. */
  public readonly device: Device;
  /** Lazy {@link Media} service namespace. */
  public readonly media: Media;
  /** Lazy {@link Media2} service namespace. */
  public readonly media2: Media2;
  /** Lazy {@link PTZ} service namespace. */
  public readonly ptz: PTZ;
  /** Eager {@link Events} service (pull-point / WS-BaseNotification). */
  public readonly events: Events;
  /** Lazy {@link Replay} service namespace. */
  public readonly replay: Replay;
  /** Lazy {@link Imaging} service namespace. */
  public readonly imaging: Imaging;
  /** Lazy {@link Recording} service namespace. */
  public readonly recording: Recording;
  /** Lazy {@link DoorControl} service namespace. */
  public readonly doorControl: DoorControl;
  /** Lazy {@link AccessControl} service namespace. */
  public readonly accessControl: AccessControl;
  /** Lazy {@link Credential} service namespace. */
  public readonly credential: Credential;
  /** Lazy {@link AccessRules} service namespace. */
  public readonly accessRules: AccessRules;
  /** Lazy {@link Schedule} service namespace. */
  public readonly schedule: Schedule;
  /** Lazy {@link Provisioning} service namespace. */
  public readonly provisioning: Provisioning;
  /** Lazy {@link AdvancedSecurity} service namespace. */
  public readonly advancedSecurity: AdvancedSecurity;
  /** Lazy {@link Thermal} service namespace. */
  public readonly thermal: Thermal;
  /** Lazy {@link Uplink} service namespace. */
  public readonly uplink: Uplink;
  /** Lazy {@link AppManagement} service namespace. */
  public readonly appManagement: AppManagement;
  /** Lazy {@link Analytics} service namespace. */
  public readonly analytics: Analytics;
  /** Lazy {@link DeviceIO} service namespace. */
  public readonly deviceIO: DeviceIO;
  /** Lazy {@link Display} service namespace. */
  public readonly display: Display;
  /** Lazy {@link ActionEngine} service namespace. */
  public readonly actionEngine: ActionEngine;
  /** Lazy {@link Search} service namespace. */
  public readonly search: Search;
  /** Lazy {@link AnalyticsDevice} service namespace. */
  public readonly analyticsDevice: AnalyticsDevice;
  /** Lazy {@link Receiver} service namespace. */
  public readonly receiver: Receiver;
  /**
   * Indicates if the device is using secure connection
   */
  public useSecure: boolean;
  /**
   * Secure options for the connection
   */
  public secureOptions: ConnectionOptions;
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
  /** Clock offset between the device and this host (ms), set during time sync. */
  public timeShift?: number;
  public capabilities: Capabilities;
  /** Filled by {@link connect} Device.getServices without loading the full Device module. */
  public services: DeviceService[] = [];
  /**
   * Profiles filled during connect (also copied onto Media when that module loads).
   * Media1 shape; Media2-only devices store profiles mapped from Media2 GetProfiles.
   */
  public profiles: Profile[] = [];
  /** Video sources filled during connect (Media1 GetVideoSources or Media2 configuration fallback). */
  public videoSources: VideoSource[] = [];
  public defaultProfiles: Profile[] = [];
  public defaultProfile?: Profile;
  public activeSources: ActiveSource[] = [];
  public activeSource?: ActiveSource;
  public readonly urn?: string;
  /** Set during connect when the device advertises ONVIF Media2 (Profile T). */
  public media2Support = false;
  public deviceInformation?: GetDeviceInformationResponse;
  /** All XAddrs from WS-Discovery when this instance was found via {@link Discovery}. */
  public xaddrs?: URL[];
  /**
   * Raw SOAP XML from the most recent {@link Onvif.request}.
   * Used by the v0.x compatibility layer for the third callback argument.
   */
  public lastResponseXml?: string;

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
    this.timeout = options.timeout ?? 120000;
    this.urn = options.urn;
    this.xaddrs = options.xaddrs;
    const httpLibrary = this.useSecure ? https : http;
    // Reuse sockets for SOAP chatter. Events use their own agent with keepAlive: false
    // (long-poll PullMessages). HappyTime tests pass `agent: false` — see __tests__/happytime.json.
    this.agent = options.agent ?? new httpLibrary.Agent({ keepAlive: true, keepAliveMsecs: 10000 });
    this.preserveAddress = options.preserveAddress ?? false;
    this.uri = {};
    this.capabilities = {};

    this.device = lazyService<Device>(this, () => import('./device'));
    this.media = lazyService<Media>(this, () => import('./media'));
    this.media2 = lazyService<Media2>(this, () => import('./media2'));
    this.ptz = lazyService<PTZ>(this, () => import('./ptz'));
    this.events = new Events(this); // mandatory module for events
    this.replay = lazyService<Replay>(this, () => import('./replay'));
    this.imaging = lazyService<Imaging>(this, () => import('./imaging'));
    this.recording = lazyService<Recording>(this, () => import('./recording'));
    this.doorControl = lazyService<DoorControl>(this, () => import('./doorcontrol'));
    this.accessControl = lazyService<AccessControl>(this, () => import('./accesscontrol'));
    this.credential = lazyService<Credential>(this, () => import('./credential'));
    this.accessRules = lazyService<AccessRules>(this, () => import('./accessrules'));
    this.schedule = lazyService<Schedule>(this, () => import('./schedule'));
    this.provisioning = lazyService<Provisioning>(this, () => import('./provisioning'));
    this.advancedSecurity = lazyService<AdvancedSecurity>(this, () => import('./advancedsecurity'));
    this.thermal = lazyService<Thermal>(this, () => import('./thermal'));
    this.uplink = lazyService<Uplink>(this, () => import('./uplink'));
    this.appManagement = lazyService<AppManagement>(this, () => import('./appmgmt'));
    this.analytics = lazyService<Analytics>(this, () => import('./analytics'));
    this.deviceIO = lazyService<DeviceIO>(this, () => import('./deviceio'));
    this.display = lazyService<Display>(this, () => import('./display'));
    this.actionEngine = lazyService<ActionEngine>(this, () => import('./actionengine'));
    this.search = lazyService<Search>(this, () => import('./search'));
    this.analyticsDevice = lazyService<AnalyticsDevice>(this, () => import('./analyticsdevice'));
    this.receiver = lazyService<Receiver>(this, () => import('./receiver'));

    /** Bind event handling to the `event` event */
    this.on('newListener', (name) => {
      // if this is the first listener, start pulling subscription
      if (name === 'event' && this.listeners(name).length === 0) {
        this.events.globalSubscription.subscribe().catch((error) => this.emit(Onvif.EVENTS_ERROR, error));
      }
    });
    this.on('removeListener', (name) => {
      if (name === 'event' && this.listeners(name).length === 0) {
        this.events.globalSubscription.unsubscribe().catch((error) => this.emit(Onvif.EVENTS_ERROR, error));
      }
    });

    if (options.autoConnect) {
      setImmediate(() => {
        this.connect().catch((error) => this.emit('error', error));
      });
    }
  }

  envelopeBody(body: Record<string, any>) {
    return {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
      },
      ...body,
    };
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
      }),
      ...options?.soapHeaders,
    };
  }

  private passwordDigest() {
    // When timeShift is known (learned from getSystemDateAndTime) keep the monotonic
    // process.uptime() base so the Created timestamp is immune to wall-clock/NTP jumps.
    // When it is not yet known, fall back to the local wall clock: process.uptime()*1000
    // alone is ~1970, which cameras enforcing Created-timestamp replay protection (Axis)
    // reject as "Sender not authorized", triggering false auth failures. (domotz BT-6835)
    const timestamp = new Date(
      this.timeShift !== undefined ? process.uptime() * 1000 + this.timeShift : Date.now(),
    ).toISOString();
    const nonce = crypto.randomBytes(16);
    const cryptoDigest = crypto.createHash('sha1');
    cryptoDigest.update(Buffer.concat([nonce, Buffer.from(timestamp, 'ascii'), Buffer.from(this.password!, 'ascii')]));
    const passDigest = cryptoDigest.digest('base64');
    return {
      passDigest,
      nonce: nonce.toString('base64'),
      timestamp,
    };
  }

  private async rawRequest<T>(options: OnvifRawRequestOptions): Promise<[T, string]> {
    return new Promise((resolve, reject) => {
      let alreadyReturned = false;
      // Build HTTP options explicitly — do not spread OnvifRawRequestOptions into http.request.
      // Include search: pathname alone drops query (e.g. subscription XAddrs with ?…).
      const requestPath = (url: URL) => `${url.pathname}${url.search}`;
      const requestOptions: RequestOptions = {
        ...(options.url
          ? {
              // if we have url property for pull-point event requests
              hostname: options.url.hostname,
              path: requestPath(options.url),
              port: options.url.port,
            }
          : {
              // try to guess the right path for the requested service
              hostname: this.hostname,
              path:
                options.service && this.uri[options.service]
                  ? requestPath(this.uri[options.service]!)
                  : this.path,
              port: this.port,
            }),
        // Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections
        agent: options.agent ?? this.agent,
        timeout: this.timeout,
        method: 'POST',
        headers: {
          ...options.headers,
          // Match v0.x: charset + SOAP action. Some devices (Pelco) reject requests without action
          // and return an empty body (#497).
          'Content-Type': (() => {
            const soapAction = options.action ?? soapActionFromXml(options.body);
            return soapAction
              ? `application/soap+xml;charset=utf-8;action="${soapAction}"`
              : 'application/soap+xml;charset=utf-8';
          })(),
          'Content-Length': Buffer.byteLength(options.body, 'utf8').toString(),
          charset: 'utf-8',
        },
      };
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
            return reject(
              new OnvifAuthError('Digest authentication failed', {
                statusCode: response.statusCode,
              }),
            );
          }
          const digestHeadersArray = getDigestHeaders(response.rawHeaders);
          if (digestHeadersArray.length > 0) {
            // Re-request with the digest auth header
            alreadyReturned = true;
            response.destroy();
            try {
              const digestResponse = await this.rawRequest<T>({
                ...options,
                headers: {
                  ...options.headers,
                  authorization: this.digestAuth(digestHeadersArray, requestOptions),
                },
              });
              return resolve(digestResponse);
            } catch (e) {
              return reject(e);
            }
          } else {
            alreadyReturned = true;
            response.destroy();
            return reject(
              new OnvifAuthError('Digest authentication headers not found in the server response', {
                statusCode: response.statusCode,
              }),
            );
          }
        }

        const bufs: Buffer[] = [];
        let length = 0;
        const statusCode = response.statusCode;

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
          if (!xml.trim()) {
            reject(
              new OnvifResponseError(`Empty ONVIF SOAP response (HTTP ${statusCode ?? 'unknown'})`, {
                xml,
                statusCode,
              }),
            );
            return;
          }
          // Non-2xx with HTML/proxy noise: fail before xml2js. SOAP-looking bodies still parse
          // (some stacks return Fault with HTTP 500).
          const httpOk = statusCode !== undefined && statusCode >= 200 && statusCode < 300;
          if (!httpOk && !/<\s*(?:\w+:)?(?:Envelope|Fault)\b/i.test(xml)) {
            reject(
              new OnvifResponseError(`Unexpected HTTP ${statusCode ?? 'unknown'} response (non-SOAP body)`, {
                xml,
                statusCode,
              }),
            );
            return;
          }
          resolve(parseSOAPString(xml, options));
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
        reject(error);
      });

      this.emit('rawRequest', options.body, requestOptions);
      request.write(options.body);
      request.end();
    });
  }

  /**
   * RFC 7616 / RFC 7230 quoted-string for Digest parameters.
   * HA1 still uses the raw username (unq); only the wire form is escaped.
   */
  private static quoteDigestParam(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  /**
   * Build Digest Authorization header.
   * Prefers SHA-256 when both MD5 and SHA-256 challenges are present.
   * Public for v0.x Cam compatibility (`digestAuth`).
   */
  public digestAuth(digestHeadersArray: string[], requestOptions: RequestOptions): string {
    // Process each item in the wwwAuthenticateArray
    // Most cameras have only 1 item.
    // HikVision implementing the new MD5-then-SHA256 have two items
    let bestResult: string | undefined;
    let bestAlgorithm: string | undefined;

    for (const digestHeader of digestHeadersArray) {
      const challenge = this.parseChallenge(digestHeader);
      // Skip unusable challenges (malformed WWW-Authenticate / missing required fields)
      if (!challenge.realm || !challenge.nonce) {
        continue;
      }
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
        cnonce = crypto.randomBytes(4).toString('hex');
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
        username: Onvif.quoteDigestParam(this.username ?? ''),
        realm: Onvif.quoteDigestParam(challenge.realm),
        nonce: Onvif.quoteDigestParam(challenge.nonce),
        uri: Onvif.quoteDigestParam(requestOptions.path ?? ''),
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
        authParams.cnonce = Onvif.quoteDigestParam(cnonce!);
      }
      authParams.response = Onvif.quoteDigestParam(response.digest('hex'));
      if (challenge.opaque) {
        authParams.opaque = Onvif.quoteDigestParam(challenge.opaque);
      }
      // Values that need quotes already include them; qop/nc stay unquoted per RFC
      const result = `Digest ${Object.entries(authParams)
        .map(([key, value]) => `${key}=${value}`)
        .join(',')}`;
      if (bestResult === undefined || (algorithm === 'SHA256' && bestAlgorithm === 'MD5')) {
        // set bestResult or upgrade the bestResult to the stronger algorithm
        bestResult = result;
        bestAlgorithm = algorithm;
      }
    }
    if (bestResult === undefined) {
      throw new OnvifAuthError('Unable to parse Digest authentication challenge');
    }
    return bestResult;
  }

  public request(options: OnvifRequestOptions): OnvifResponse {
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
    const body = build(bodyObject);
    const fallbackXmlns = options.service ? XMLNS[options.service] : undefined;
    const action = soapActionFromBody(options.body, fallbackXmlns);

    this.emit('requestBody', body);
    return this.rawRequest<Record<string, any>>({
      ...options,
      headers: { ...options.headers },
      body,
      action,
    }).then((result) => {
      this.lastResponseXml = result[1];
      return result;
    });
  }

  private parseChallenge(digest: string): { [key: string]: string } {
    const prefix = 'Digest ';
    const prefixAt = digest.indexOf(prefix);
    const challenge = prefixAt === -1 ? digest : digest.substring(prefixAt + prefix.length);
    const parts: [string, string][] = [];
    for (const part of splitArgs(challenge)) {
      // Soft-skip malformed tokens instead of throwing on match(...)!
      const match = part.match(/^\s*?([a-zA-Z0-9]+)="?([^"]*)"?\s*?$/);
      if (match) {
        parts.push([match[1], match[2]]);
      }
    }
    return Object.fromEntries(parts);
  }

  /**
   * Increment Digest auth nonce count and return the padded `nc` value.
   * Public for v0.x Cam compatibility (`updateNC`).
   */
  public updateNC(): string {
    this.nc += 1;
    if (this.nc > 99999999) {
      this.nc = 1;
    }
    return String(this.nc).padStart(8, '0');
  }

  /**
   * Effective TCP port from a WHATWG URL.
   * `URL.port` is `""` for scheme defaults (http→80, https→443), so string compare with
   * `this.port` would always look different under {@link OnvifOptions.preserveAddress}.
   */
  private static urlPort(url: URL): number {
    if (url.port) {
      return Number(url.port);
    }
    return url.protocol === 'https:' ? 443 : 80;
  }

  /**
   * Parse url with an eye on `preserveAddress` property
   * @param address
   * @private
   */
  public parseUrl(address: string) {
    const parsedAddress = new URL(address);
    // When preserveAddress is set, rewrite host/port to constructor values if they differ
    // from the XAddr (proxy / NAT). Compare effective ports, not URL.port strings.
    if (
      this.preserveAddress &&
      (this.hostname !== parsedAddress.hostname || this.port !== Onvif.urlPort(parsedAddress))
    ) {
      parsedAddress.hostname = this.hostname;
      parsedAddress.port = String(this.port);
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
    // Try the Unauthenticated Request first. Do not use envelopeHeader() as we don't have timeShift yet.
    const body = {
      GetSystemDateAndTime: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } },
    };
    const [data, xml] = await this.rawRequest({
      body: build({
        's:Envelope': {
          $: {
            'xmlns:s': 'http://www.w3.org/2003/05/soap-envelope',
          },
          's:Body': this.envelopeBody(body),
        },
      }),
      action: soapActionFromBody(body),
    });
    try {
      return this.setupSystemDateAndTime(data);
    } catch (error) {
      if (xml && xml.toLowerCase().includes('sender not authorized')) {
        // Try again with a Username and Password
        const [data] = await this.request({ body });
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
    this.timeShift = dateTime.getTime() - process.uptime() * 1000;
    systemDateAndTime.dateTime = dateTime;
    return systemDateAndTime;
  }

  /**
   * Set the device system date and time
   * Supports two possible date and time values: UTCDateTime(ONVIF types) or dateTime(js Date-object, preferred)
   */
  async setSystemDateAndTime(options: SetSystemDateAndTimeExtended): Promise<SystemDateTimeExtended> {
    if (!['Manual', 'NTP'].includes(options.dateTimeType!)) {
      throw new OnvifValidationError('DateTimeType should be `Manual` or `NTP`');
    }
    if (options.dateTimeType === 'Manual' && !options.dateTime && !options.UTCDateTime) {
      throw new OnvifValidationError('`dateTime` or `UTCDateTime` should be defined when the DateTimeType is `Manual`');
    }
    const body = {
      SetSystemDateAndTime: {
        $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' },
        DateTimeType: options.dateTimeType,
        DaylightSavings: options.daylightSavings,
        ...((options.timezone !== undefined || options.timeZone?.TZ !== undefined) && {
          TimeZone: {
            TZ: options.timezone || options.timeZone?.TZ,
          },
        }),
        ...(options.dateTimeType === 'Manual' &&
          (options.dateTime !== undefined && options.dateTime instanceof Date
            ? {
                UTCDateTime: {
                  Time: {
                    Hour: options.dateTime.getUTCHours(),
                    Minute: options.dateTime.getUTCMinutes(),
                    Second: options.dateTime.getUTCSeconds(),
                  },
                  Date: {
                    Year: options.dateTime.getUTCFullYear(),
                    Month: options.dateTime.getUTCMonth() + 1,
                    Day: options.dateTime.getUTCDate(),
                  },
                },
              }
            : {
                UTCDateTime: {
                  Time: {
                    Hour: options.UTCDateTime?.time?.hour,
                    Minute: options.UTCDateTime?.time?.minute,
                    Second: options.UTCDateTime?.time?.second,
                  },
                  Date: {
                    Year: options.UTCDateTime?.date?.year,
                    Month: options.UTCDateTime?.date?.month,
                    Day: options.UTCDateTime?.date?.day,
                  },
                },
              })),
      },
    };
    await this.request({ body });
    // get new system time from device
    return this.getSystemDateAndTime();
  }

  /**
   * Check and find out video configuration for device
   */
  public async getActiveSources() {
    const { getActiveSources } = await import('./connection');
    return getActiveSources(this);
  }

  /**
   * Connect to the camera and fill device information properties.
   * Pass `{ media: false }` to skip profile / video-source discovery after GetServices.
   */
  async connect(options?: ConnectOptions) {
    const { connect } = await import('./connection');
    return connect(this, options);
  }
}
