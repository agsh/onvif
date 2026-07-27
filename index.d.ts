/**
 * Type definitions for onvif (v0.x).
 * @see https://github.com/agsh/onvif
 */

/// <reference types="node" />

import { EventEmitter } from 'events';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { RemoteInfo } from 'dgram';
import { UrlWithStringQuery } from 'url';

export type RequestCallback<T = any> = (
	err: Error | null,
	data?: T,
	xml?: string
) => void;

export type ConnectionCallback = (err: Error | null, data?: any, xml?: string) => void;

export type UserLevel =
	| 'Administrator'
	| 'Operator'
	| 'User'
	| 'Anonymous'
	| 'Extended'
	| string;

export interface CamOptions {
	/** Camera hostname or IP */
	hostname: string;
	username?: string;
	password?: string;
	/** Default 80, or 443 when useSecure is true */
	port?: number;
	/** Default `/onvif/device_service` */
	path?: string;
	/** Socket timeout in ms. Default 120000 */
	timeout?: number;
	/** Use HTTPS. Default false */
	useSecure?: boolean;
	/** Options passed to https.request */
	secureOpts?: object;
	/** Use WS-Security SOAP headers. Default true */
	useWSSecurity?: boolean;
	/** Connect automatically in constructor. Default true */
	autoconnect?: boolean;
	/** Force hostname/port from constructor for service URLs. Default false */
	preserveAddress?: boolean;
	/** HTTP(S) agent (e.g. proxy agent) */
	agent?: boolean | HttpAgent | HttpsAgent;
}

export interface PanTiltZoom {
	x?: number;
	y?: number;
	zoom?: number;
}

export interface MulticastConfiguration {
	address?:
		| 0
		| {
				type?: 'IPv4' | 'IPv6';
				IPv4Address?: string;
				IPv6Address?: string;
		  };
	port?: number;
	TTL?: number;
	autoStart?: boolean;
}

export interface ActiveSource {
	sourceToken: string;
	profileToken: string;
	videoSourceConfigurationToken: string;
	encoding?: string;
	width?: number | '';
	height?: number | '';
	fps?: number | '';
	bitrate?: number | '';
	ptz?: { name: string; token: string };
}

export interface DeviceInformation {
	manufacturer?: string;
	model?: string;
	firmwareVersion?: string;
	serialNumber?: string;
	hardwareId?: string;
	[key: string]: any;
}

export interface CamProfile {
	token?: string;
	name?: string;
	videoSourceConfiguration?: any;
	videoEncoderConfiguration?: any;
	PTZConfiguration?: any;
	[key: string]: any;
}

export interface CamCapabilities {
	device?: any;
	events?: any;
	imaging?: any;
	media?: any;
	PTZ?: any;
	extension?: any;
	[key: string]: any;
}

export interface CamService {
	namespace?: string;
	XAddr?: string;
	Version?: any;
	Capabilities?: any;
	[key: string]: any;
}

export interface CamUriMap {
	device?: UrlWithStringQuery;
	media?: UrlWithStringQuery;
	media2?: UrlWithStringQuery;
	PTZ?: UrlWithStringQuery;
	ptz?: UrlWithStringQuery;
	imaging?: UrlWithStringQuery;
	events?: UrlWithStringQuery;
	recording?: UrlWithStringQuery;
	replay?: UrlWithStringQuery;
	[key: string]: UrlWithStringQuery | undefined;
}

export interface SystemDateAndTimeOptions {
	dateTimeType: 'Manual' | 'NTP';
	dateTime?: Date;
	daylightSavings?: boolean;
	timezone?: string;
}

export interface NTPManual {
	type: 'IPv4' | 'IPv6' | 'DNS';
	IPv4Address?: string;
	IPv6Address?: string;
	DNSname?: string;
	extension?: string;
}

export interface SetNTPOptions {
	fromDHCP: boolean;
	NTPManual?: NTPManual[];
}

export interface NetworkInterfaceOptions {
	interfaceToken: string;
	networkInterface: {
		enabled?: boolean;
		link?: {
			autoNegotiation: boolean;
			speed: number;
			duplex: 'Full' | 'Half';
		};
		MTU?: number;
		IPv4?: {
			enabled?: boolean;
			manual?: { address: string; prefixLength: number };
			DHCP?: boolean;
		};
		IPv6?: {
			enabled?: boolean;
			acceptRouterAdvert?: boolean;
			manual?: { address: string; prefixLength: number };
			DHCP?: 'Auto' | 'Stateful' | 'Stateless' | 'Off';
		};
		extension?: object;
	};
}

export interface SetDNSOptions {
	fromDHCP: boolean | string;
	searchDomain?: string;
	DNSManual: Array<{
		type: 'IPv4' | 'IPv6';
		IPv4Address?: string;
		IPv6Address?: string;
	}>;
}

export interface CamUser {
	username: string;
	password?: string;
	userLevel?: UserLevel;
}

export interface VideoEncoderConfigurationOptions {
	token?: string;
	$?: { token?: string; GovLength?: number; Profile?: string };
	name?: string;
	useCount?: number;
	encoding?: 'JPEG' | 'H264' | 'MPEG4' | string;
	resolution?: { width: number; height: number };
	quality?: number;
	rateControl?: {
		frameRateLimit?: number;
		encodingInterval?: number;
		bitrateLimit?: number;
		$?: { ConstantBitRate?: boolean };
	};
	MPEG4?: { govLength?: number; profile?: 'SP' | 'ASP' | string };
	H264?: {
		govLength?: number;
		profile?: 'Baseline' | 'Main' | 'Extended' | 'High' | string;
	};
	multicast?: MulticastConfiguration;
	sessionTimeout?: string;
	[key: string]: any;
}

export interface AudioEncoderConfigurationOptions {
	token?: string;
	$?: { token?: string };
	name?: string;
	useCount?: number;
	encoding?: 'G711' | 'G726' | 'AAC' | string;
	bitrate?: number;
	sampleRate?: number;
	multicast?: MulticastConfiguration;
	sessionTimeout?: string;
	[key: string]: any;
}

export interface GetStreamUriOptions {
	stream?: string;
	protocol?: string;
	profileToken?: string;
}

export interface OSDOptions {
	videoSourceConfigurationToken?: string;
	/** Legacy misspelling accepted by the implementation */
	videoSourceConfiguationToken?: string;
	position?:
		| 'UpperLeft'
		| 'UpperRight'
		| 'LowerLeft'
		| 'LowerRight'
		| { x: number; y: number };
	plaintext?: string;
	dateFormat?: string;
	timeFormat?: string;
	fontSize?: number;
	colorspace?: 'RGB' | 'YCbCr';
	fontColor?: { X: number; Y: number; Z: number };
	OSDToken?: any;
	[key: string]: any;
}

export interface GotoPresetOptions {
	profileToken?: string;
	preset: string;
	speed?: string | PanTiltZoom;
}

export interface SetPresetOptions {
	profileToken?: string;
	presetName: string;
	presetToken?: string;
}

export interface PTZMoveOptions extends PanTiltZoom {
	profileToken?: string;
	speed?: PanTiltZoom;
	xyspace?: number;
	zoomspace?: number;
	onlySendPanTilt?: boolean;
	onlySendZoom?: boolean;
	/** Continuous move timeout in ms */
	timeout?: number;
}

export interface PTZStopOptions {
	profileToken?: string;
	panTilt?: boolean | string;
	zoom?: boolean | string;
}

export interface ImagingSettingsOptions {
	token?: string;
	brightness?: number;
	colorSaturation?: number;
	contrast?: number;
	exposure?: {
		mode?: 'AUTO' | 'MANUAL';
		priority?: 'LowNoise' | 'FrameRate';
		minExposureTime?: number;
		maxExposureTime?: number;
		minGain?: number;
		maxGain?: number;
		minIris?: number;
		maxIris?: number;
		exposureTime?: number;
		gain?: number;
		iris?: number;
	};
	focus?: {
		autoFocusMode?: 'AUTO' | 'MANUAL';
		defaultSpeed?: number;
		nearLimit?: number;
		farLimit?: number;
	};
	sharpness?: number;
	irCutFilter?: 'AUTO' | 'ON' | 'OFF';
	[key: string]: any;
}

export interface ImagingMoveOptions {
	token?: string;
	absolute?: { position?: number; speed?: number };
	relative?: { distance?: number; speed?: number };
	continuous?: { speed?: number };
}

export interface CreateRecordingJobOptions {
	scheduleToken?: string;
	recordingToken?: string;
	mode?: string;
	priority?: number;
	source?: {
		sourceToken?: { type?: string; token?: string };
		autoCreateReceiver?: boolean;
		tracks?: { sourceTag?: string; destination?: string };
		extension?: string;
	};
	extension?: object;
	[key: string]: any;
}

export interface DiscoveryProbeOptions {
	/** Timeout in ms. Default 5000 */
	timeout?: number;
	/** If false, returns raw probe objects instead of Cam instances. Default true */
	resolve?: boolean;
	messageId?: string;
	/** Network interface name, e.g. `eth0` */
	device?: string;
	listeningPort?: number | null;
	bufferSize?: number;
}

export type ProbeCallback = (
	err: Error | Error[] | null,
	devices?: Array<Cam | object>
) => void;

/**
 * ONVIF camera client (callback-based API).
 */
export class Cam extends EventEmitter {
	constructor(options: CamOptions, callback?: ConnectionCallback);

	useSecure: boolean;
	secureOpts: object;
	hostname: string;
	username?: string;
	password?: string;
	port: number;
	path: string;
	timeout: number;
	agent: boolean | HttpAgent | HttpsAgent;
	useWSSecurity: boolean;
	preserveAddress: boolean;

	/** Clock offset between device and local time (ms) */
	timeShift?: number;
	services?: CamService[];
	uri?: CamUriMap;
	media2Support?: boolean;
	capabilities?: CamCapabilities;
	serviceCapabilities?: any;
	deviceInformation?: DeviceInformation;
	scopes?: any[];
	profiles?: CamProfile[];
	defaultProfiles?: CamProfile[];
	defaultProfile?: CamProfile;
	videoSources?: any;
	activeSources?: ActiveSource[];
	activeSource?: ActiveSource;
	presets?: Record<string, string>;
	nodes?: any;
	configurations?: any;
	NTP?: any;
	networkInterfaces?: any;
	networkDefaultGateway?: any;
	DNS?: any;
	networkProtocols?: any;
	users?: CamUser[];
	videoEncoderConfigurations?: any;
	mediaCapabilities?: any;
	/** Set when created via Discovery with resolve=true */
	xaddrs?: UrlWithStringQuery[];
	events: Record<string, any>;

	on(event: 'connect', listener: () => void): this;
	on(event: 'rawRequest', listener: (body: string) => void): this;
	on(event: 'rawResponse', listener: (xml: string, statusCode: number) => void): this;
	on(event: 'event', listener: (event: any) => void): this;
	on(event: 'eventsError', listener: (error: any) => void): this;
	on(event: 'warning', listener: (warning: any) => void): this;
	on(event: string, listener: (...args: any[]) => void): this;

	connect(callback?: ConnectionCallback): void;

	/** Increment Digest nc counter and return zero-padded value */
	updateNC(): string;
	/**
	 * Build Digest Authorization header.
	 * Prefers SHA-256 when both MD5 and SHA-256 challenges are present.
	 */
	digestAuth(wwwAuthenticateArray: string[], reqOptions: { method?: string; path?: string; [key: string]: any }): string;

	getSystemDateAndTime(callback?: RequestCallback<Date>): void;
	setSystemDateAndTime(options: SystemDateAndTimeOptions, callback?: RequestCallback<Date>): void;

	getCapabilities(callback?: RequestCallback<CamCapabilities>): void;
	getServiceCapabilities(callback?: RequestCallback): void;
	getServices(includeCapability?: boolean, callback?: RequestCallback): void;
	getServices(callback: RequestCallback): void;

	/** Sync helper used during connect; fills activeSource(s) / defaultProfile(s) */
	getActiveSources(): void;

	getDeviceInformation(callback?: RequestCallback<DeviceInformation>): void;
	getHostname(callback?: RequestCallback<{ fromDHCP: boolean; name?: string }>): void;
	getScopes(callback?: RequestCallback): void;
	setScopes(scopes: string[], callback?: RequestCallback): void;
	systemReboot(callback?: RequestCallback<string>): void;
	setSystemFactoryDefault(hard?: boolean, callback?: RequestCallback): void;
	setSystemFactoryDefault(callback: RequestCallback): void;

	// Device / network
	getNTP(callback?: RequestCallback): void;
	setNTP(options: SetNTPOptions, callback?: RequestCallback): void;
	getNetworkInterfaces(callback?: RequestCallback): void;
	setNetworkInterfaces(options: NetworkInterfaceOptions, callback?: RequestCallback): void;
	getNetworkDefaultGateway(callback?: RequestCallback): void;
	setNetworkDefaultGateway(
		options: { IPv4Address?: string; IPv6Address?: string },
		callback?: RequestCallback
	): void;
	getDNS(callback?: RequestCallback): void;
	setDNS(options: SetDNSOptions, callback?: RequestCallback): void;
	getNetworkProtocols(callback?: RequestCallback): void;
	getUsers(callback?: RequestCallback): void;
	createUsers(users: CamUser | CamUser[], callback?: RequestCallback): void;
	setUsers(users: CamUser | CamUser[], callback?: RequestCallback): void;
	deleteUsers(users: Array<CamUser | string> | CamUser | string, callback?: RequestCallback): void;
	sendAuxiliaryCommand(options: { data?: string }, callback?: RequestCallback): void;

	// Media
	getVideoSources(callback?: RequestCallback): void;
	getVideoSourceConfigurations(callback?: RequestCallback): void;
	getVideoEncoderConfiguration(token?: string, callback?: RequestCallback): void;
	getVideoEncoderConfigurations(callback?: RequestCallback): void;
	getVideoEncoderConfigurationOptions(
		options?: { configurationToken?: string; profileToken?: string } | string,
		callback?: RequestCallback
	): void;
	setVideoEncoderConfiguration(options: VideoEncoderConfigurationOptions, callback?: RequestCallback): void;
	getAudioSources(callback?: RequestCallback): void;
	getAudioEncoderConfigurations(callback?: RequestCallback): void;
	getAudioEncoderConfiguration(token?: string, callback?: RequestCallback): void;
	getAudioEncoderConfigurationOptions(token?: string, callback?: RequestCallback): void;
	setAudioEncoderConfiguration(options: AudioEncoderConfigurationOptions, callback?: RequestCallback): void;
	getAudioSourceConfigurations(callback?: RequestCallback): void;
	getAudioOutputs(callback?: RequestCallback): void;
	getAudioOutputConfigurations(callback?: RequestCallback): void;
	addAudioEncoderConfiguration(
		options: { profileToken: string; configurationToken: string },
		callback?: RequestCallback
	): void;
	addAudioSourceConfiguration(
		options: { profileToken: string; configurationToken: string },
		callback?: RequestCallback
	): void;
	addVideoEncoderConfiguration(
		options: { profileToken: string; configurationToken: string },
		callback?: RequestCallback
	): void;
	addVideoSourceConfiguration(
		options: { profileToken: string; configurationToken: string },
		callback?: RequestCallback
	): void;
	removeAudioEncoderConfiguration(profileToken: string, callback?: RequestCallback): void;
	removeAudioSourceConfiguration(profileToken: string, callback?: RequestCallback): void;
	getProfiles(callback?: RequestCallback): void;
	createProfile(options: { name: string; token?: string }, callback?: RequestCallback): void;
	deleteProfile(token: string, callback?: RequestCallback): void;
	getStreamUri(options?: GetStreamUriOptions, callback?: RequestCallback<{ uri: string }>): void;
	getStreamUri(callback: RequestCallback<{ uri: string }>): void;
	getSnapshotUri(options?: { profileToken?: string }, callback?: RequestCallback<{ uri: string }>): void;
	getSnapshotUri(callback: RequestCallback<{ uri: string }>): void;
	setSynchronizationPoint(options?: { profileToken?: string }, callback?: RequestCallback): void;
	getOSDs(token?: string, callback?: RequestCallback): void;
	getOSDOptions(options?: OSDOptions, callback?: RequestCallback): void;
	createOSD(options?: OSDOptions, callback?: RequestCallback): void;
	setOSD(options: OSDOptions, callback?: RequestCallback): void;
	deleteOSD(token: string, callback?: RequestCallback): void;
	getMediaServiceCapabilities(callback?: RequestCallback): void;

	// PTZ
	getPresets(options?: { profileToken?: string }, callback?: RequestCallback): void;
	getPresets(callback: RequestCallback): void;
	gotoPreset(options: GotoPresetOptions, callback?: RequestCallback): void;
	setPreset(options: SetPresetOptions, callback?: RequestCallback): void;
	removePreset(options: { profileToken?: string; presetToken: string }, callback?: RequestCallback): void;
	gotoHomePosition(
		options?: { profileToken?: string; speed?: PanTiltZoom },
		callback?: RequestCallback
	): void;
	setHomePosition(options?: { profileToken?: string }, callback?: RequestCallback): void;
	getStatus(options?: { profileToken?: string }, callback?: RequestCallback): void;
	getStatus(callback: RequestCallback): void;
	getNodes(callback?: RequestCallback): void;
	getConfigurations(callback?: RequestCallback): void;
	getConfigurationOptions(configurationToken: string, callback?: RequestCallback): void;
	relativeMove(options: PTZMoveOptions, callback?: RequestCallback): void;
	absoluteMove(options: PTZMoveOptions, callback?: RequestCallback): void;
	continuousMove(options: PTZMoveOptions, callback?: RequestCallback): void;
	stop(options?: PTZStopOptions, callback?: RequestCallback): void;
	stop(callback: RequestCallback): void;
	ptzSendAuxiliaryCommand(
		options: { profileToken?: string; data?: string },
		callback?: RequestCallback
	): void;

	// Imaging
	getImagingSettings(options?: { token?: string }, callback?: RequestCallback): void;
	getImagingSettings(callback: RequestCallback): void;
	setImagingSettings(options: ImagingSettingsOptions, callback?: RequestCallback): void;
	getImagingServiceCapabilities(callback?: RequestCallback): void;
	getCurrentImagingPreset(options?: { token?: string }, callback?: RequestCallback): void;
	setCurrentImagingPreset(options: { token?: string; presetToken: string }, callback?: RequestCallback): void;
	getVideoSourceOptions(options?: { token?: string }, callback?: RequestCallback): void;
	imagingGetMoveOptions(options?: { token?: string }, callback?: RequestCallback): void;
	imagingGetStatus(options?: { token?: string }, callback?: RequestCallback): void;
	imagingMove(options: ImagingMoveOptions, callback?: RequestCallback): void;
	imagingStop(options?: { token?: string }, callback?: RequestCallback): void;

	// Events
	getEventProperties(callback?: RequestCallback): void;
	getEventServiceCapabilities(callback?: RequestCallback): void;
	subscribe(options: { url: string }, callback?: RequestCallback): void;
	createPullPointSubscription(callback?: RequestCallback): void;
	renew(options?: object, callback?: RequestCallback): void;
	renew(callback: RequestCallback): void;
	pullMessages(options?: { messageLimit?: number }, callback?: RequestCallback): void;
	unsubscribe(callback?: RequestCallback, preserveListeners?: boolean): void;
	parseEventXML(xml: string, callback?: RequestCallback): void;

	// Recording
	getRecordings(callback?: RequestCallback): void;
	getRecordingJobs(callback?: RequestCallback): void;
	createRecordingJob(options: CreateRecordingJobOptions, callback?: RequestCallback): void;
	deleteRecordingJob(options: { JobToken: string }, callback?: RequestCallback): void;
	getRecordingSummary(callback?: RequestCallback): void;
	getRecordingInformation(options: { RecordingToken: string }, callback?: RequestCallback): void;
	getRecordingConfiguration(options: { RecordingToken: string }, callback?: RequestCallback): void;
	getRecordingJobState(options: { JobToken: string }, callback?: RequestCallback): void;
	getRecordingOptions(options: { RecordingToken: string }, callback?: RequestCallback): void;
	getRecordingServiceCapabilities(callback?: RequestCallback): void;
	getTrackConfiguration(
		options: { recordingToken: string; trackToken: string },
		callback?: RequestCallback
	): void;
	getRecordingJobConfiguration(options?: { JobToken?: string }, callback?: RequestCallback): void;
	setRecordingJobMode(options: { JobToken?: string; Mode?: string }, callback?: RequestCallback): void;

	// Replay
	getReplayUri(
		options?: { stream?: string; protocol?: string; recordingToken?: string },
		callback?: RequestCallback<{ uri: string }>
	): void;
}

/**
 * WS-Discovery singleton.
 */
export interface Discovery extends EventEmitter {
	probe(options?: DiscoveryProbeOptions, callback?: ProbeCallback): void;
	probe(callback: ProbeCallback): void;

	on(
		event: 'device',
		listener: (cam: Cam | object, remoteInfo: RemoteInfo, xml: string) => void
	): this;
	on(event: 'error', listener: (error: Error | string, xml?: string) => void): this;
	on(event: string, listener: (...args: any[]) => void): this;
}

export const Discovery: Discovery;

declare const onvif: {
	Cam: typeof Cam;
	Discovery: Discovery;
};

export default onvif;
