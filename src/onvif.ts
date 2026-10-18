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
import {
  build,
  getDigestHeaders,
  isSenderNotAuthorizedFault,
  assignErrorContext,
  linerase,
  OnvifAuthError,
  OnvifResponse,
  OnvifResponseError,
  OnvifValidationError,
  parseSOAPString,
  soapActionFromBody,
  soapActionFromXml,
} from './utils';
import {
  digestAuth as buildDigestAuth,
  isDigestChallengeStale,
  passwordDigest as createPasswordDigest,
  preferredDigestChallenge,
} from './utils/auth';
import type Device from './device';
import type Media from './media';
import type Media2 from './media2';
import type PTZ from './ptz';
import type { Capabilities, Profile, SystemDateTime, VideoSource } from './interfaces/onvif';
import type {
  GetDeviceInformationResponse,
  GetSystemDateAndTimeResponse,
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
import { requestContext } from './utils/request-context';

/** Default HTTP timeout for ordinary SOAP calls (ms). PullMessages overrides per request. */
export const DEFAULT_TIMEOUT_MS = 10_000;

const DEFAULT_DEVICE_PATH = '/onvif/device_service';

/** Resolve hostname/port/path/useSecure from {@link OnvifOptions.url} or discrete fields. */
function resolveDeviceLocation(options: OnvifOptions): {
  hostname: string;
  port: number;
  path: string;
  useSecure: boolean;
} {
  if (options.url !== undefined && options.hostname !== undefined) {
    throw new OnvifValidationError('Pass either `url` or `hostname`, not both');
  }
  if (options.url !== undefined) {
    let parsed: URL;
    try {
      parsed = options.url instanceof URL ? options.url : new URL(options.url);
    } catch {
      throw new OnvifValidationError('Invalid `url`');
    }
    if (parsed.username !== '' || parsed.password !== '') {
      throw new OnvifValidationError('Credentials must not be embedded in `url`; use username/password options');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new OnvifValidationError('`url` must use http: or https:');
    }
    const useSecure = parsed.protocol === 'https:';
    const path =
      parsed.pathname && parsed.pathname !== '/'
        ? parsed.pathname + parsed.search
        : DEFAULT_DEVICE_PATH;
    const port =
      parsed.port !== ''
        ? Number.parseInt(parsed.port, 10)
        : useSecure
          ? 443
          : 80;
    return { hostname: parsed.hostname, port, path, useSecure };
  }
  if (!options.hostname) {
    throw new OnvifValidationError('`hostname` or `url` is required');
  }
  const useSecure = options.useSecure ?? false;
  return {
    hostname: options.hostname,
    port: options.port ?? (useSecure ? 443 : 80),
    path: options.path ?? DEFAULT_DEVICE_PATH,
    useSecure,
  };
}

/**
 * Onvif constructor options.
 * Pass either {@link OnvifOptions.url} or {@link OnvifOptions.hostname} (not both).
 */
export interface OnvifOptions {
  /**
   * Device service URL (`http(s)://host[:port]/path]`).
   * Sets hostname, port, path, and useSecure. Must not include userinfo; use username/password.
   */
  url?: string | URL;
  /** Set true if using `https` protocol, defaults to false. Ignored when {@link url} is set. */
  useSecure?: boolean;
  /** Set options for https like ca, cert, ciphers, rejectUnauthorized, secureOptions, secureProtocol, etc. */
  secureOptions?: ConnectionOptions;
  /** Use WS-Security SOAP headers */
  useWSSecurity?: boolean;
  /** Device host. Required when {@link url} is omitted. */
  hostname?: string;
  username?: string;
  password?: string;
  /** Defaults to 80 or 443 from useSecure / url scheme. */
  port?: number;
  /** Device service path. Defaults to `/onvif/device_service`. */
  path?: string;
  /**
   * HTTP socket timeout for ordinary SOAP calls, in milliseconds.
   * Defaults to {@link DEFAULT_TIMEOUT_MS} (10 s). PullMessages sets its own longer
   * timeout (pull wait + margin) and is not limited by this value.
   */
  timeout?: number;
  urn?: string;
  /** Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections. */
  agent?: HttpsAgent | HttpAgent | boolean;
  /**
   * Rewrite host/port on service and subscription XAddrs to this client's
   * {@link hostname}:{@link port} (pathname and query kept). Defaults to `false`.
   *
   * Cameras often advertise unreachable XAddrs: `127.0.0.1` behind a vendor proxy,
   * a private LAN IP while you connect through NAT/port-forward, or a different
   * published port than the one you dial. Ordinary SOAP calls (`device`, `media`, ...)
   * always TCP to the constructor host/port and take only `pathname` (+ query) from
   * each XAddr - so they work without this flag. Set `preserveAddress: true` when
   * the **full** URL must match the constructor address as well:
   * - SOAP `a:To` / addressing headers built from the XAddr
   * - PullMessages / Renew / Unsubscribe, which dial `options.url` from the
   *   subscription Address
   *
   * Comparison uses the effective port (scheme defaults 80/443), not the empty
   * `URL.port` string. Does not rewrite raw RTSP/snapshot URI strings inside Media
   * responses - only URLs passed through {@link Onvif.parseUrl}.
   */
  preserveAddress?: boolean;
  /** Set true if the camera should connect automatically, defaults false. */
  autoConnect?: boolean;
  /**
   * All XAddrs from WS-Discovery (set by {@link Discovery}).
   * Same role as v0.x `cam.xaddrs`.
   */
  xaddrs?: URL[];
  /**
   * Default for {@link Onvif.connect} `{ media }` when that option is omitted.
   * @default true
   */
  defaultMedia?: boolean;
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

/**
 * SOAP Body tree for {@link build} / {@link Onvif.request}
 * (operation element name -> children and `$` attributes).
 */
export type OnvifSoapBody = Record<string, unknown>;

export interface OnvifRequestOptions extends Omit<RequestOptions, 'headers'> {
  headers?: http.OutgoingHttpHeaders;
  /** Name of service (ptz, media, etc) */
  service?: keyof OnvifServices;
  /** SOAP body */
  body: OnvifSoapBody;
  /** Defines another url to request */
  url?: URL;
  /** Timeout for pull-point event requests */
  timeout?: number;
  /**
   * Abort the HTTP request (useful for long-poll {@link Events} `PullMessages`).
   * When aborted, the socket is destroyed and the promise rejects with `AbortError`.
   * Passed through to Node's `http.request`.
   */
  signal?: AbortSignal;
  /** Additional SOAP-headers */
  soapHeaders?: OnvifSoapBody;
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
  /**
   * Internal: already retried once after a 401 with Authorization present
   * (stale / rotated Digest nonce). Prevents an infinite challenge loop.
   */
  digestStaleRetried?: boolean;
}

/**
 * Default Media Profile pipeline tokens used when service methods omit tokens.
 *
 * Copied from the selected {@link Profile} during {@link Onvif.connect} /
 * {@link Onvif.getActiveMediaProfiles}, or switched via {@link Onvif.setActiveMediaProfile}.
 * Encoder metadata (codec, resolution, ...) stays on {@link Onvif.defaultProfile} /
 * {@link Onvif.profiles}.
 */
export interface ActiveMediaProfile {
  /** Physical video source token (= {@link videoSourceToken}; v0.x field name). */
  sourceToken: ReferenceToken;
  /** Media profile that binds this source to an encoder (and optional PTZ). */
  profileToken: ReferenceToken;
  /** `VideoSourceConfiguration` token on that profile (not the physical source token). */
  videoSourceConfigurationToken: ReferenceToken;
  /** Physical video source token (= {@link sourceToken}). */
  videoSourceToken: ReferenceToken;
  /** `VideoEncoderConfiguration` token on the selected profile. */
  videoEncoderConfigurationToken?: ReferenceToken;
  /** `AudioSourceConfiguration` token on the selected profile. */
  audioSourceConfigurationToken?: ReferenceToken;
  /** `AudioEncoderConfiguration` token on the selected profile. */
  audioEncoderConfigurationToken?: ReferenceToken;
  /** `VideoAnalyticsConfiguration` token on the selected profile. */
  videoAnalyticsConfigurationToken?: ReferenceToken;
  /** `MetadataConfiguration` token on the selected profile. */
  metadataConfigurationToken?: ReferenceToken;
  /** `AudioOutputConfiguration` token (`Profile.extension`). */
  audioOutputConfigurationToken?: ReferenceToken;
  /** `AudioDecoderConfiguration` token (`Profile.extension`). */
  audioDecoderConfigurationToken?: ReferenceToken;
  /** `PTZConfiguration` token on the selected profile. */
  ptzConfigurationToken?: ReferenceToken;
}

/** @deprecated Use {@link ActiveMediaProfile}. */
export type ActiveSource = ActiveMediaProfile;

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

/** Parsed SOAP Body for GetSystemDateAndTime (camelCase from the XML parser). */
interface GetSystemDateAndTimeSoapBody {
  getSystemDateAndTimeResponse: GetSystemDateAndTimeResponse;
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
 * Main ONVIF client. Connect to a device, then use lazy service namespaces (`media`, `ptz`, ...).
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
 * const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
 * console.log('RTSP', stream.uri);
 *
 * if (onvif.uri.ptz) {
 *   await onvif.ptz.continuousMove({ velocity: { x: 0.2, y: 0, zoom: 0 } });
 *   await new Promise((r) => setTimeout(r, 500));
 *   await onvif.ptz.stop();
 * }
 *
 * // When finished with the device, close the client (see {@link Onvif.close}).
 * await onvif.close();
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
   * Cached `WWW-Authenticate: Digest ...` values from the last successful challenge.
   * Reused so later SOAP calls send `Authorization` without an extra 401 round-trip.
   * Cleared on {@link ensureOpen} / failed Digest auth.
   */
  private digestChallengeHeaders?: string[];
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
  /** True when the default keep-alive agent was created by this instance (not a caller-supplied agent). */
  private readonly ownsAgent: boolean;
  /**
   * Set by {@link close} after destroying the Events agent; cleared by {@link ensureOpen}.
   * Skips a redundant destroy/create on the first open (Events already built an agent in its ctor).
   */
  private eventsAgentNeedsReset = false;
  /**
   * Set by {@link close}; cleared by {@link ensureOpen} (constructor and {@link connect}).
   * While closed, {@link request} rejects.
   */
  public closed = true;
  public preserveAddress = false;
  public uri: OnvifServices;
  /** Bound so {@link close} / {@link ensureOpen} can remove and reattach auto pull-point hooks. */
  private readonly onEventNewListener: (name: string | symbol) => void;
  private readonly onEventRemoveListener: (name: string | symbol) => void;
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
  /** Token bags for usable media pipelines (typically one per video source after connect). */
  public activeMediaProfiles: ActiveMediaProfile[] = [];
  /** Currently selected media pipeline defaults when methods omit tokens. */
  public activeMediaProfile?: ActiveMediaProfile;
  /** @deprecated Use {@link activeMediaProfiles}. */
  get activeSources(): ActiveMediaProfile[] {
    return this.activeMediaProfiles;
  }
  set activeSources(value: ActiveMediaProfile[]) {
    this.activeMediaProfiles = value;
  }
  /** @deprecated Use {@link activeMediaProfile}. */
  get activeSource(): ActiveMediaProfile | undefined {
    return this.activeMediaProfile;
  }
  set activeSource(value: ActiveMediaProfile | undefined) {
    this.activeMediaProfile = value;
  }
  public readonly urn?: string;
  /** Set during connect when the device advertises ONVIF Media2 (Profile T). */
  public media2Support = false;
  public deviceInformation?: GetDeviceInformationResponse;
  /** All XAddrs from WS-Discovery when this instance was found via {@link Discovery}. */
  public xaddrs?: URL[];
  /**
   * Default for {@link connect}`s `media` option when omitted.
   * Callers (e.g. Discovery for access-only devices) may set {@link OnvifOptions.defaultMedia}.
   */
  public defaultMedia = true;

  constructor(options: OnvifOptions) {
    super();
    const location = resolveDeviceLocation(options);
    this.useSecure = location.useSecure;
    this.secureOptions = options.secureOptions ?? {};
    this.useWSSecurity = options.useWSSecurity ?? true;
    this.hostname = location.hostname;
    this.username = options.username;
    this.password = options.password;
    this.port = location.port;
    this.path = location.path;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.urn = options.urn;
    this.xaddrs = options.xaddrs;
    this.defaultMedia = options.defaultMedia ?? true;
    // Caller-supplied agent (incl. `false`) is kept across close/ensureOpen; otherwise ensureOpen owns it.
    // HappyTime tests pass `agent: false` - see __tests__/happytime.json.
    this.ownsAgent = options.agent === undefined;
    this.agent = options.agent ?? false;
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
    this.onEventNewListener = (name) => {
      if (this.closed) {
        return;
      }
      // if this is the first listener, start pulling subscription
      if (name === 'event' && this.listeners(name).length === 0) {
        this.events.globalSubscription.subscribe().catch((error) => this.emit(Onvif.EVENTS_ERROR, error));
      }
    };
    this.onEventRemoveListener = (name) => {
      if (this.closed) {
        return;
      }
      if (name === 'event' && this.listeners(name).length === 0) {
        this.events.globalSubscription.unsubscribe().catch((error) => this.emit(Onvif.EVENTS_ERROR, error));
      }
    };
    this.ensureOpen();

    if (options.autoConnect) {
      setImmediate(() => {
        this.connect().catch((error) => this.emit('error', error));
      });
    }
  }

  envelopeBody(body: OnvifSoapBody) {
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

  /** WS-Security PasswordDigest; see `createPasswordDigest` in `auth.ts`. */
  private passwordDigest() {
    return createPasswordDigest(this.password!, this.timeShift);
  }

  /** Active {@link requestContext} values for this transport call. */
  private requestErrorContext(options: OnvifRawRequestOptions) {
    const host = options.url?.hostname ?? this.hostname;
    const action = options.action ?? soapActionFromXml(options.body);
    return {
      host,
      ...(options.service !== undefined && { service: String(options.service) }),
      ...(action !== undefined && { action }),
    };
  }

  private async rawRequest<T>(options: OnvifRawRequestOptions): Promise<[T, string]> {
    const ctx = this.requestErrorContext(options);
    const active = requestContext.getStore();
    // Prefer the caller-owned store (requestContext.run) so XML fields stay on
    // the same object; otherwise enter a fresh ALS frame for this call.
    if (active) {
      Object.assign(active, ctx);
      return this.rawRequestBody(options);
    }
    return requestContext.run(ctx, () => this.rawRequestBody(options));
  }

  private rawRequestBody<T>(options: OnvifRawRequestOptions): Promise<[T, string]> {
    if (this.closed) {
      return Promise.reject(new OnvifValidationError('Onvif client is closed'));
    }
    return new Promise((resolve, reject) => {
      let alreadyReturned = false;
      const fail = (error: unknown) => {
        reject(assignErrorContext(error));
      };
      // Build HTTP options explicitly - do not spread OnvifRawRequestOptions into http.request.
      // Include search: pathname alone drops query (e.g. subscription XAddrs with ?).
      const requestPath = (url: URL) => `${url.pathname}${url.search}`;
      const hadCallerAuth = Boolean(options.headers?.authorization || options.headers?.Authorization);
      const requestOptions: RequestOptions = {
        ...(options.url
          ? {
              // if we have url property for pull-point event requests
              hostname: options.url.hostname,
              path: requestPath(options.url),
              // URL.port is "" for scheme defaults - Node needs a numeric port.
              port: Onvif.urlPort(options.url),
            }
          : {
              // try to guess the right path for the requested service
              hostname: this.hostname,
              path: options.service && this.uri[options.service] ? requestPath(this.uri[options.service]!) : this.path,
              port: this.port,
            }),
        // Supports things like https://www.npmjs.com/package/proxy-agent which provide SOCKS5 and other connections
        agent: options.agent ?? this.agent,
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
      let sentDigestAuth = hadCallerAuth;
      if (!hadCallerAuth && this.digestChallengeHeaders && this.username !== undefined && this.password !== undefined) {
        requestOptions.headers = {
          ...requestOptions.headers,
          authorization: this.digestAuth(this.digestChallengeHeaders, requestOptions),
        };
        sentDigestAuth = true;
      }
      // Prefer options.url scheme (PullMessages / subscription XAddr may differ from useSecure).
      const useHttps = options.url ? options.url.protocol === 'https:' : this.useSecure;
      const httpLibrary = useHttps ? https : http;
      if (useHttps) {
        Object.assign(requestOptions, this.secureOptions);
      }
      // After secureOptions so a custom ConnectionOptions bag cannot drop abort.
      if (options.signal) {
        requestOptions.signal = options.signal;
      }
      const request = httpLibrary.request(requestOptions, async (response) => {
        if (response.statusCode === 401) {
          // Avoid racing with request 'error' from response.destroy() below
          if (alreadyReturned) {
            return undefined;
          }
          const digestHeadersArray = getDigestHeaders(response.rawHeaders);
          if (digestHeadersArray.length === 0) {
            alreadyReturned = true;
            response.destroy();
            return fail(
              new OnvifAuthError('Digest authentication headers not found in the server response', {
                statusCode: response.statusCode,
              }),
            );
          }

          const sentAuth = sentDigestAuth;
          const nextChallenge = preferredDigestChallenge(digestHeadersArray);
          const cachedChallenge = this.digestChallengeHeaders
            ? preferredDigestChallenge(this.digestChallengeHeaders)
            : undefined;
          const sameNonce = nextChallenge?.nonce !== undefined && nextChallenge.nonce === cachedChallenge?.nonce;
          const stale = isDigestChallengeStale(nextChallenge);

          // Same nonce and not stale -> credentials rejected. Or we already retried once for stale.
          if (sentAuth && ((sameNonce && !stale) || options.digestStaleRetried)) {
            alreadyReturned = true;
            response.destroy();
            this.digestChallengeHeaders = undefined;
            return fail(
              new OnvifAuthError('Digest authentication failed', {
                statusCode: response.statusCode,
              }),
            );
          }

          // New / first / stale challenge - cache and retry with Authorization.
          alreadyReturned = true;
          response.destroy();
          if (!sameNonce || stale || !this.digestChallengeHeaders) {
            this.nc = 0;
          }
          this.digestChallengeHeaders = digestHeadersArray;
          try {
            const digestResponse = await this.rawRequest<T>({
              ...options,
              digestStaleRetried: sentAuth || options.digestStaleRetried,
              headers: {
                ...options.headers,
                authorization: this.digestAuth(digestHeadersArray, requestOptions),
              },
            });
            return resolve(digestResponse);
          } catch (e) {
            return fail(e);
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
            fail(
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
            fail(
              new OnvifResponseError(`Unexpected HTTP ${statusCode ?? 'unknown'} response (non-SOAP body)`, {
                xml,
                statusCode,
              }),
            );
            return;
          }
          parseSOAPString<T>(xml, options).then(resolve, (error) => fail(error));
        });
        return undefined;
      });

      // Single timeout path (not also via requestOptions.timeout) so per-call overrides
      // like PullMessages `options.timeout` win over this.timeout.
      request.setTimeout(options.timeout ?? this.timeout, () => {
        const err = Object.assign(new Error('Network timeout'), {
          code: 'ETIMEDOUT',
          syscall: 'connect',
        }) as NodeJS.ErrnoException;
        request.destroy(err);
      });

      request.on('error', (error: NodeJS.ErrnoException) => {
        if (alreadyReturned) {
          return;
        }
        alreadyReturned = true;
        // Keep ErrnoException identity (code ETIMEDOUT, ...) for existing callers.
        fail(error);
      });

      this.emit('rawRequest', options.body, requestOptions);
      request.write(options.body);
      request.end();
    });
  }

  /**
   * Build Digest Authorization header.
   * Prefers SHA-256 when both MD5 and SHA-256 challenges are present.
   * Public for v0.x Cam compatibility (`digestAuth`).
   */
  public digestAuth(digestHeadersArray: string[], requestOptions: RequestOptions): string {
    return buildDigestAuth(
      digestHeadersArray,
      requestOptions,
      { username: this.username, password: this.password },
      () => this.updateNC(),
    );
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
    // Capture store by reference at call time so http callbacks need not preserve ALS.
    const store = requestContext.getStore();
    if (store) {
      store.requestXml = body;
    }
    return this.rawRequest<Record<string, any>>({
      ...options,
      headers: { ...options.headers },
      body,
      action,
    }).then((result) => {
      if (store) {
        store.responseXml = result[1];
      }
      return result;
    });
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
   * Close the client connection to the ONVIF device.
   *
   * Call this when you are done talking to the camera and want to release the
   * session: stop the pull-point event subscription (if any) and tear down the
   * HTTP agents. Until then, the default keep-alive agent may keep TCP sockets
   * open so later SOAP calls reuse them - which also keeps a Node process from
   * exiting (common in short scripts and Jest).
   *
   * What this method does:
   * 1. Marks the client {@link closed} (further {@link request} fail until {@link connect}).
   * 2. Removes auto `event` subscribe/unsubscribe hooks so later `on('event')` is a no-op.
   * 3. Clears WS-BaseNotification push renew timers.
   * 4. Unsubscribes {@link Events.globalSubscription} (stops PullMessages / renew).
   * 5. Destroys the Events HTTP agent and the main SOAP agent **created by this instance**.
   *
   * Call {@link connect} again to reopen via {@link ensureOpen} (new agents + hooks).
   * What it does not do: it is not an ONVIF "logout" RPC, and it does not destroy a
   * custom or shared agent passed via {@link OnvifOptions.agent}
   * (`agent: false` / non-Agent values are left alone). Safe to call more than once.
   *
   * @example
   * ```ts
   * await onvif.connect();
   * // ... use services
   * await onvif.close();
   * ```
   */
  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.off('newListener', this.onEventNewListener);
    this.off('removeListener', this.onEventRemoveListener);
    this.events.clearPushRenew();
    try {
      // false: skip Subscription.resetAgent - we destroy the Events agent below once.
      await this.events.globalSubscription.unsubscribe(false);
    } catch {
      // Device may already be gone; local pull loop is still stopped by unsubscribe.
    }
    Onvif.destroyHttpAgent(this.events.agent);
    this.eventsAgentNeedsReset = true;
    if (this.ownsAgent) {
      Onvif.destroyHttpAgent(this.agent);
    }
  }

  private static destroyHttpAgent(agent: HttpsAgent | HttpAgent | boolean | undefined) {
    // Skip `false` (no agent) and non-Agent values - never destroy http.globalAgent.
    if (agent && typeof agent !== 'boolean' && typeof agent.destroy === 'function') {
      try {
        agent.destroy();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Effective TCP port from a WHATWG URL.
   * `URL.port` is `""` for scheme defaults (http->80, https->443), so string compare with
   * `this.port` would always look different under {@link OnvifOptions.preserveAddress}.
   */
  private static urlPort(url: URL): number {
    if (url.port) {
      return Number(url.port);
    }
    return url.protocol === 'https:' ? 443 : 80;
  }

  /**
   * Parse a device XAddr into a {@link URL}.
   * When {@link OnvifOptions.preserveAddress} is set, replace host/port with the
   * constructor values (path and query kept). Used when filling {@link uri} and for
   * event subscription Addresses.
   */
  public parseUrl(address: string) {
    const parsedAddress = new URL(address);
    // Compare effective ports, not URL.port strings ("" means scheme default 80/443).
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
    const body: OnvifSoapBody = {
      GetSystemDateAndTime: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } },
    };
    try {
      const [data] = await this.rawRequest<GetSystemDateAndTimeSoapBody>({
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
      return this.setupSystemDateAndTime(data);
    } catch (error) {
      // Real devices return a SOAP Fault (parsed as OnvifSoapFaultError), not a soft body + reason string.
      if (isSenderNotAuthorizedFault(error)) {
        const [data] = await this.request({ body });
        return this.setupSystemDateAndTime(data as GetSystemDateAndTimeSoapBody);
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
   * @param data parsed SOAP Body containing GetSystemDateAndTimeResponse
   * @private
   */
  private setupSystemDateAndTime(data: GetSystemDateAndTimeSoapBody): SystemDateTimeExtended {
    const { systemDateAndTime } = linerase<GetSystemDateAndTimeSoapBody>(data).getSystemDateAndTimeResponse;
    // UTCDateTime is mandatory since version 2.0
    const UTCDateTime = systemDateAndTime.UTCDateTime || systemDateAndTime.localDateTime;
    let dateTime: Date;
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
    return { ...systemDateAndTime, dateTime };
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
   * Rebuild {@link activeMediaProfiles} / {@link activeMediaProfile} from
   * {@link videoSources} + {@link profiles} (used by connect).
   */
  public async getActiveMediaProfiles() {
    const { getActiveMediaProfiles } = await import('./connection');
    return getActiveMediaProfiles(this);
  }

  /** @deprecated Use {@link getActiveMediaProfiles}. */
  public async getActiveSources() {
    return this.getActiveMediaProfiles();
  }

  /**
   * Switch the default Media Profile pipeline used when service methods omit tokens.
   * Rebuilds {@link activeMediaProfile} (and syncs {@link defaultProfile}) from
   * {@link profiles}. The profile must exist and reference a known video source
   * when {@link videoSources} was loaded at connect.
   *
   * @example
   * ```ts
   * await onvif.connect();
   * await onvif.setActiveMediaProfile(onvif.profiles[1]!.token);
   * const stream = await onvif.media.getStreamUri({ protocol: 'RTSP' });
   * ```
   */
  public async setActiveMediaProfile(profileToken: ReferenceToken): Promise<ActiveMediaProfile> {
    const { setActiveMediaProfile } = await import('./connection');
    return setActiveMediaProfile(this, profileToken);
  }

  /**
   * Bring the client online: owned keep-alive agent, Events agent, auto-`event` hooks.
   * Shared by the constructor and {@link connect} after {@link close}.
   * Caller-supplied {@link OnvifOptions.agent} is left as-is.
   */
  private ensureOpen() {
    if (!this.closed) {
      return;
    }
    if (this.ownsAgent) {
      const httpLibrary = this.useSecure ? https : http;
      // Reuse sockets for SOAP chatter. Events keep their own agent (keepAlive: false).
      this.agent = new httpLibrary.Agent({ keepAlive: true, keepAliveMsecs: 10000 });
    }
    // First open: keep the agent from Events' constructor. After close: replace the destroyed one.
    if (this.eventsAgentNeedsReset) {
      this.events.resetAgent();
      this.eventsAgentNeedsReset = false;
    }
    // Fresh Digest nonce-count / challenge after (re)open - cameras reject reused nc after a new connection.
    this.nc = 0;
    this.digestChallengeHeaders = undefined;
    this.on('newListener', this.onEventNewListener);
    this.on('removeListener', this.onEventRemoveListener);
    this.closed = false;
    // Listeners that survived close do not re-fire newListener - restart pull-point if needed.
    if (this.listeners('event').length > 0) {
      this.events.globalSubscription.subscribe().catch((error) => this.emit(Onvif.EVENTS_ERROR, error));
    }
  }

  /**
   * Connect to the camera and fill device information properties.
   * Pass `{ media: false }` to skip profile / video-source discovery after GetServices.
   * When `media` is omitted, uses {@link defaultMedia} (usually `true`; Discovery may set
   * `false` for access-only door stations). Explicit `{ media: true | false }` always wins.
   * After {@link close}, {@link ensureOpen} recreates owned agents and event hooks first.
   */
  async connect(options?: ConnectOptions) {
    this.ensureOpen();
    const { connect } = await import('./connection');
    return connect(this, options);
  }
}
