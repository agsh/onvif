import { EventEmitter } from 'events';
import { SecureContextOptions } from 'tls';
import https, { Agent, RequestOptions } from 'https';
import http from 'http';
import { Buffer } from 'buffer';

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

type CamServices = {
  PTZ?: URL,
  media?: URL,
  imaging?: URL,
  events?: URL,
  device?: URL,
}

interface CamRequestOptions extends RequestOptions{
  /** Name of service (ptz, media, etc) */
  service?: keyof CamServices;
  /** SOAP body */
  body: string;
  /** Defines another url to request */
  url?: string;
  /** Make request to PTZ uri or not */
  ptz?: boolean;
}

export class Cam extends EventEmitter {
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

  private async request(options: CamRequestOptions) {
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
        'Content-Length' : Buffer.byteLength(options.body, 'utf8'), // options.body.length chinese will be wrong here
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
          parseSOAPString(xml, callback);
        });
      });
    });
  }

  /**
   * Connect to the camera and fill device information properties
   */
  async connect() {
    // await this.getSystemDateAndTime();
    // await this.getServices();
  }
}
