/**
 * Onvif module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/wp-content/uploads/2022/07/ONVIF_Device_Feature_Discovery_Specification_21.12.pdf
 */
import { EventEmitter } from 'events';
import { SecureContextOptions } from 'tls';
import { Agent, RequestOptions } from 'https';
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
export declare class Onvif extends EventEmitter {
    /**
     * Indicates raw xml request to device.
     * @event rawRequest
     * @example
     * ```typescript
     * onvif.on('rawRequest', (xml) => { console.log('-> request was', xml); });
     * ```
     */
    static rawRequest: "rawRequest";
    /**
     * Indicates raw xml response from device.
     * @event rawResponse
     * @example
     * ```typescript
     * onvif.on('rawResponse', (xml) => { console.log('<- response was', xml); });
     * ```
     */
    static rawResponse: "rawResponse";
    /**
     * Indicates any warnings
     * @event warn
     * @example
     * ```typescript
     * onvif.on('warn', console.warn);
     * ```
     */
    static warn: "warn";
    /**
     * Indicates any errors
     * @param error Error object
     * @event error
     * @example
     * ```typescript
     * onvif.on('error', console.error);
     * ```
     */
    static error: "error";
    /**
     * Core device namespace for device v1.0 methods
     * @example
     * ```typescript
     * const date = await onvif.device.getSystemDateAndTime();
     * console.log(date.toLocaleString());
     * ```
     */
    readonly device: Device;
    readonly media: Media;
    readonly media2: Media2;
    readonly ptz: PTZ;
    useSecure: boolean;
    secureOptions: SecureContextOptions;
    useWSSecurity: boolean;
    private nc;
    hostname: string;
    username?: string;
    password?: string;
    port: number;
    path: string;
    timeout: number;
    agent: Agent | boolean;
    preserveAddress: boolean;
    private events;
    uri: OnvifServices;
    private timeShift?;
    capabilities: Capabilities;
    defaultProfiles: Profile[];
    defaultProfile?: Profile;
    private activeSources;
    activeSource?: ActiveSource;
    readonly urn?: string;
    deviceInformation?: GetDeviceInformationResponse;
    constructor(options: OnvifOptions);
    /**
     * Envelope header for all SOAP messages
     * @param openHeader
     * @private
     */
    private envelopeHeader;
    /**
     * Envelope footer for all SOAP messages
     * @private
     */
    private envelopeFooter;
    private passwordDigest;
    private rawRequest;
    private digestAuth;
    request(options: OnvifRequestOptions): Promise<[Record<string, any>, string]>;
    private parseChallenge;
    private updateNC;
    /**
     * Parse url with an eye on `preserveAddress` property
     * @param address
     * @private
     */
    parseUrl(address: string): URL;
    /**
     * Receive date and time from cam
     */
    getSystemDateAndTime(): Promise<SystemDateTimeExtended>;
    /**
     * Receive only date and time from cam (old behaviour, returns only Date object)
     */
    getOnlySystemDateAndTime(): Promise<Date>;
    /**
     * Add time shift to use with ONVIF timestamps
     * @param data
     * @private
     */
    private setupSystemDateAndTime;
    /**
     * Set the device system date and time
     * Supports two possible date and time values: UTCDateTime(ONVIF types) or dateTime(js Date-object, preferred)
     */
    setSystemDateAndTime(options: SetSystemDateAndTimeExtended): Promise<SystemDateTimeExtended>;
    /**
     * Check and find out video configuration for device
     * @private
     */
    private getActiveSources;
    /**
     * Connect to the camera and fill device information properties
     */
    connect(): Promise<this>;
}
