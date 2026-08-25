/**
 * Module to provide backward compatibility with versions 0.x
 */

import { EventEmitter } from 'events';
import { ConnectionOptions } from 'tls';
import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import { ActiveSource, Onvif, OnvifRequestOptions, SetSystemDateAndTimeExtended } from '../onvif';
import { GetStreamUriOptions } from '../media';
import { SetNTP, SetSystemFactoryDefault } from '../interfaces/devicemgmt';
import {
  NetworkHostType,
  ImagingSettings20,
  VideoEncoderConfiguration,
  AudioEncoderConfiguration,
  StreamType,
  TransportProtocol,
} from '../interfaces/onvif';
import { GetOSDs, GetSnapshotUri } from '../interfaces/media.2';
import { ReferenceToken } from '../interfaces/common';
import {
  AbsoluteMove,
  ContinuousMove,
  GetPresets,
  GetStatus,
  GotoHomePosition,
  GotoPreset,
  RelativeMove,
  RemovePreset,
  SetHomePosition,
  SetPreset,
} from '../interfaces/ptz.2';
import { Subscription, PullPointSubscription } from '../events';
import { PullMessages, GetEventPropertiesResponse } from '../interfaces/event';
import { CreateRecordingJob } from '../interfaces/recording';
import { GetReplayUriOptions } from '../replay';
import { parseSOAPString } from '../utils';
import {
  Callback,
  ensureArray,
  invoke,
  isCallback,
  mapCreateRecordingJobOptions,
  mapImagingToken,
  mapJobToken,
  mapRecordingToken,
  normalizeMediaUriResponse,
  normalizeStreamUriResponse,
  presetsToMap,
  profileToken,
  splitOptionalCallback,
  splitTokenCallback,
  videoSourceToken,
} from './helpers';

export type CompatibilityAbsoluteMoveOptions = AbsoluteMove & { x?: number; y?: number; zoom?: number };
export type CompatibilityRelativeMoveOptions = RelativeMove & { x?: number; y?: number; zoom?: number };
interface CompatibilityContinuousMoveOptions extends ContinuousMove {
  x?: number;
  y?: number;
  zoom?: number;
  onlySendPanTilt?: boolean;
  onlySendZoom?: boolean;
}

interface GetOSDOptions {
  videoSourceConfigurationToken: string;
}

interface SetNTPOptions extends SetNTP {
  type?: NetworkHostType;
  ipv4Address?: string;
  ipv6Address?: string;
  dnsName?: string;
  extension?: string;
}

interface CompatibilityEventsState {
  subscription?: PullPointSubscription;
  terminationTime?: Date;
  properties?: GetEventPropertiesResponse;
}

/**
 * Compatibility class for the 0.x version of the onvif package
 * @example
 * ```ts
 * import { Cam } from './src/compatibility/cam';
 *
 * const cam = new Cam({
 *   hostname: '127.0.0.1',
 *   username: 'admin',
 *   password: 'admin',
 *   port: 8000,
 * }, (err) => {
 *   if (err) throw err;
 *   cam.getStreamUri((err, stream) => {
 *     console.log(stream.uri);
 *   });
 * });
 * ```
 * @see compatibility.test.ts for the details
 */
export class Cam extends EventEmitter {
  private readonly onvif: Onvif;
  private readonly pullPointSubscription?: Subscription;
  public events: CompatibilityEventsState = {};

  public recordingItems?: unknown;
  public recordingSummary?: unknown;
  public summary?: unknown;
  public recordingConfiguration?: unknown;
  public jobItem?: unknown;
  public recordingJobState?: unknown;
  public recordingOptions?: unknown;
  public trackConfiguration?: unknown;
  public searchCapabilities?: unknown;
  public mediaCapabilities?: unknown;
  public users?: unknown;
  public videoEncoderConfigurations?: unknown;
  public videoSourceConfigurations?: unknown;
  public audioEncoderConfigurations?: unknown;
  public audioOutputConfigurations?: unknown;
  public audioOutputs?: unknown;
  public audioSourceConfigurations?: unknown;
  public networkDefaultGateway?: unknown;
  public networkProtocols?: unknown;
  public activeSourcesList?: ActiveSource[];

  constructor(options: any, callback?: Callback) {
    super();
    this.onvif = new Onvif({
      ...options,
      // v0.x used `secureOpts`; 1.x Onvif uses `secureOptions`
      secureOptions: options.secureOptions ?? options.secureOpts,
      autoConnect: false,
    });
    this.pullPointSubscription = new Subscription(this.onvif);
    const connectCallback = callback ?? (() => undefined);
    if (options.autoconnect !== false) {
      setImmediate(() => {
        this.connect(connectCallback);
      });
    }
  }

  get useSecure() {
    return this.onvif.useSecure;
  }
  set useSecure(value: boolean) {
    this.onvif.useSecure = value;
  }
  /** v0.x name for TLS options (`secureOptions` on {@link Onvif}). */
  get secureOpts() {
    return this.onvif.secureOptions;
  }
  set secureOpts(value: ConnectionOptions) {
    this.onvif.secureOptions = value;
  }
  get useWSSecurity() {
    return this.onvif.useWSSecurity;
  }
  set useWSSecurity(value: boolean) {
    this.onvif.useWSSecurity = value;
  }
  get port() {
    return this.onvif.port;
  }
  set port(value: number) {
    this.onvif.port = value;
  }
  get path() {
    return this.onvif.path;
  }
  set path(value: string) {
    this.onvif.path = value;
  }
  get hostname() {
    return this.onvif.hostname;
  }
  set hostname(name: string) {
    this.onvif.hostname = name;
  }
  get username() {
    return this.onvif.username;
  }
  set username(value: string | undefined) {
    this.onvif.username = value;
  }
  get password() {
    return this.onvif.password;
  }
  set password(value: string | undefined) {
    this.onvif.password = value;
  }
  set timeout(time: number) {
    this.onvif.timeout = time;
  }
  get timeout() {
    return this.onvif.timeout;
  }
  get agent() {
    return this.onvif.agent;
  }
  set agent(value: HttpsAgent | HttpAgent | boolean) {
    this.onvif.agent = value;
  }
  get preserveAddress() {
    return this.onvif.preserveAddress;
  }
  set preserveAddress(value: boolean) {
    this.onvif.preserveAddress = value;
  }
  get timeShift() {
    return this.onvif.timeShift;
  }
  set timeShift(value: number | undefined) {
    this.onvif.timeShift = value;
  }
  get services() {
    return this.onvif.device.services;
  }
  get capabilities() {
    return this.onvif.capabilities;
  }
  get uri() {
    return this.onvif.uri;
  }
  get videoSources() {
    return this.onvif.media.videoSources;
  }
  get profiles() {
    return this.onvif.media.profiles;
  }
  get defaultProfile() {
    return this.onvif.defaultProfile;
  }
  get defaultProfiles() {
    return this.onvif.defaultProfiles;
  }
  get activeSource() {
    return this.onvif.activeSource;
  }
  get activeSources() {
    return this.activeSourcesList;
  }
  get serviceCapabilities() {
    return this.onvif.device.serviceCapabilities;
  }
  get deviceInformation() {
    return this.onvif.deviceInformation;
  }
  get nodes() {
    return this.onvif.ptz.nodes;
  }
  get configurations() {
    return this.onvif.ptz.configurations;
  }
  get presets() {
    return presetsToMap(this.onvif.ptz.presets);
  }
  get scopes() {
    return this.onvif.device.scopes;
  }
  get media2Support() {
    return this.onvif.device.media2Support;
  }
  get NTP() {
    return this.onvif.device.NTP;
  }
  get DNS() {
    return this.onvif.device.DNS;
  }
  get networkInterfaces() {
    return this.onvif.device.networkInterfaces;
  }

  connect(callback: Callback) {
    this.onvif
      .connect()
      .then(() => callback(null))
      .catch(callback);
  }

  _request(options: OnvifRequestOptions, callback: Callback) {
    if (typeof callback !== 'function') {
      throw new Error('`callback` must be a function');
    }
    invoke(this.onvif.request(options), callback);
  }

  getSystemDateAndTime(callback: Callback) {
    invoke(this.onvif.device.getSystemDateAndTime(), callback);
  }

  setSystemDateAndTime(value: SetSystemDateAndTimeExtended, callback: Callback) {
    invoke(this.onvif.device.setSystemDateAndTime(value), callback);
  }

  getHostname(callback: Callback) {
    invoke(this.onvif.device.getHostname(), callback);
  }

  getScopes(callback: Callback) {
    invoke(this.onvif.device.getScopes(), callback);
  }

  setScopes(value: string[], callback: Callback) {
    invoke(this.onvif.device.setScopes(value), callback);
  }

  getCapabilities(callback: Callback) {
    invoke(this.onvif.device.getCapabilities(), callback);
  }

  getServiceCapabilities(callback: Callback) {
    invoke(this.onvif.device.getServiceCapabilities(), callback);
  }

  getActiveSources(callback: Callback) {
    invoke(
      this.onvif.getActiveSources().then(() => {
        this.activeSourcesList = this.onvif.defaultProfiles
          .map((profile, idx) => {
            const videoSrcToken = this.onvif.media.videoSources[idx]?.token;
            if (!videoSrcToken || !profile) {
              return undefined;
            }
            const activeSource: ActiveSource = {
              sourceToken: videoSrcToken,
              profileToken: profile.token,
              videoSourceConfigurationToken: profile.videoSourceConfiguration?.token ?? videoSrcToken,
              videoSourceToken: videoSrcToken,
            };
            if (profile.videoEncoderConfiguration) {
              activeSource.encoding = profile.videoEncoderConfiguration.encoding;
              activeSource.width = profile.videoEncoderConfiguration.resolution?.width;
              activeSource.height = profile.videoEncoderConfiguration.resolution?.height;
              activeSource.fps = profile.videoEncoderConfiguration.rateControl?.frameRateLimit;
              activeSource.bitrate = profile.videoEncoderConfiguration.rateControl?.bitrateLimit;
            }
            if (profile.PTZConfiguration) {
              activeSource.ptz = {
                name: profile.PTZConfiguration.name as string,
                token: profile.PTZConfiguration.token,
              };
            }
            return activeSource;
          })
          .filter((source): source is ActiveSource => source !== undefined);
        return this.activeSourcesList;
      }),
      callback,
    );
  }

  getServices(includeCapability: boolean | Callback, callback?: Callback) {
    if (isCallback(includeCapability)) {
      invoke(this.onvif.device.getServices(), includeCapability, (result) => result.service);
      return;
    }
    invoke(this.onvif.device.getServices({ includeCapability }), callback!, (result) => result.service);
  }

  getDeviceInformation(callback: Callback) {
    invoke(this.onvif.device.getDeviceInformation(), callback);
  }

  setSystemFactoryDefault(hard: boolean | Callback, callback?: Callback) {
    if (isCallback(hard)) {
      invoke(this.onvif.device.setSystemFactoryDefault({ factoryDefault: 'Soft' }), hard);
      return;
    }
    invoke(
      this.onvif.device.setSystemFactoryDefault({
        factoryDefault: (hard ? 'Hard' : 'Soft') as SetSystemFactoryDefault['factoryDefault'],
      }),
      callback!,
    );
  }

  systemReboot(callback: Callback) {
    invoke(this.onvif.device.systemReboot(), callback);
  }

  getNTP(callback: Callback) {
    invoke(this.onvif.device.getNTP(), callback);
  }

  setNTP(options: SetNTPOptions, callback: Callback) {
    if (!Array.isArray(options.NTPManual)) {
      options.NTPManual = [];
    }
    if (options.type || options.ipv4Address || options.ipv6Address || options.dnsName || options.extension) {
      options.NTPManual.push({
        type: options.type!,
        IPv4Address: options.ipv4Address,
        IPv6Address: options.ipv6Address,
        DNSname: options.dnsName,
      });
    }
    invoke(this.onvif.device.setNTP(options), callback);
  }

  getDNS(callback: Callback) {
    invoke(this.onvif.device.getDNS(), callback);
  }

  setDNS(options: Parameters<Onvif['device']['setDNS']>[0], callback: Callback) {
    invoke(this.onvif.device.setDNS(options), callback);
  }

  getNetworkInterfaces(callback: Callback) {
    invoke(this.onvif.device.getNetworkInterfaces(), callback);
  }

  setNetworkInterfaces(options: Parameters<Onvif['device']['setNetworkInterfaces']>[0], callback: Callback) {
    invoke(this.onvif.device.setNetworkInterfaces(options), callback);
  }

  getNetworkDefaultGateway(callback: Callback) {
    invoke(
      this.onvif.device.getNetworkDefaultGateway().then((result) => {
        this.networkDefaultGateway = result;
        return result;
      }),
      callback,
    );
  }

  setNetworkDefaultGateway(options: Parameters<Onvif['device']['setNetworkDefaultGateway']>[0], callback: Callback) {
    invoke(this.onvif.device.setNetworkDefaultGateway(options), callback);
  }

  getNetworkProtocols(callback: Callback) {
    invoke(
      this.onvif.device.getNetworkProtocols().then((result) => {
        this.networkProtocols = result;
        return result;
      }),
      callback,
    );
  }

  getUsers(callback: Callback) {
    invoke(
      this.onvif.device.getUsers().then((result) => {
        this.users = result;
        return result;
      }),
      callback,
    );
  }

  createUsers(options: { user: Parameters<Onvif['device']['createUsers']>[0]['user'] }, callback: Callback) {
    invoke(this.onvif.device.createUsers(options), callback);
  }

  deleteUsers(options: Parameters<Onvif['device']['deleteUsers']>[0], callback: Callback) {
    invoke(this.onvif.device.deleteUsers(options), callback);
  }

  setUsers(users: Parameters<Onvif['device']['setUser']>[0]['user'], callback: Callback) {
    const usersOk = users.every((user) => user.username && user.password && user.userLevel);
    if (!usersOk) {
      callback(new Error('Missing username, password or user level'));
      return;
    }
    invoke(this.onvif.device.setUser({ user: users }), callback);
  }

  sendAuxiliaryCommand(options: { data: string }, callback: Callback) {
    invoke(this.onvif.device.sendAuxiliaryCommand({ auxiliaryCommand: options.data }), callback);
  }

  getProfiles(callback: Callback) {
    invoke(
      this.onvif.media.getProfiles().then((result) => {
        return result;
      }),
      callback,
    );
  }

  createProfile(options: Parameters<Onvif['media']['createProfile']>[0], callback: Callback) {
    invoke(this.onvif.media.createProfile(options), callback);
  }

  deleteProfile(options: Parameters<Onvif['media']['deleteProfile']>[0], callback: Callback) {
    invoke(this.onvif.media.deleteProfile(options), callback);
  }

  getMediaServiceCapabilities(callback: Callback) {
    invoke(
      this.onvif.media.getServiceCapabilities().then((result) => {
        this.mediaCapabilities = result;
        return result;
      }),
      callback,
    );
  }

  getVideoSources(callback: Callback) {
    invoke(this.onvif.media.getVideoSources(), callback);
  }

  getVideoSourceConfigurations(callback: Callback) {
    invoke(
      this.onvif.media.getVideoSourceConfigurations().then((result) => {
        this.videoSourceConfigurations = result;
        return result;
      }),
      callback,
    );
  }

  getVideoEncoderConfigurations(callback: Callback) {
    invoke(
      this.onvif.media.getVideoEncoderConfigurations().then((result) => {
        this.videoEncoderConfigurations = result;
        return result;
      }),
      callback,
    );
  }

  getVideoSourceConfiguration(token: ReferenceToken | Callback, callback?: Callback) {
    const { token: configurationToken, callback: cb } = splitTokenCallback(token, callback);
    if (!cb) {
      return;
    }
    if (!configurationToken) {
      cb(new Error('No video source configuration token is present!'));
      return;
    }
    invoke(this.onvif.media.getVideoSourceConfiguration({ configurationToken }), cb);
  }

  getVideoEncoderConfiguration(token: ReferenceToken | Callback, callback?: Callback) {
    const { token: configurationToken, callback: cb } = splitTokenCallback(token, callback);
    if (!cb) {
      return;
    }
    let resolvedToken = configurationToken;
    if (!resolvedToken) {
      const configs = ensureArray(this.videoEncoderConfigurations as { token?: string; $?: { token?: string } }[]);
      resolvedToken = configs[0]?.token ?? configs[0]?.$?.token;
    }
    if (!resolvedToken) {
      cb(new Error('No video encoder configuration token is present!'));
      return;
    }
    invoke(this.onvif.media.getVideoEncoderConfiguration({ configurationToken: resolvedToken }), cb);
  }

  getVideoEncoderConfigurationOptions(options?: Record<string, unknown> | Callback | string, callback?: Callback) {
    let resolvedOptions: Record<string, unknown> = {};
    let cb = callback;
    if (isCallback(options)) {
      cb = options;
    } else if (typeof options === 'string') {
      resolvedOptions = { configurationToken: options };
    } else if (options) {
      resolvedOptions = options;
    }
    if (!cb) {
      return;
    }
    if (!Object.keys(resolvedOptions).length) {
      const configs = ensureArray(this.videoEncoderConfigurations as { token?: string; $?: { token?: string } }[]);
      const token = configs[0]?.token ?? configs[0]?.$?.token;
      if (!token) {
        cb(new Error('No video encoder configuration token is present!'));
        return;
      }
      resolvedOptions = { configurationToken: token };
    }
    invoke(this.onvif.media.getVideoEncoderConfigurationOptions(resolvedOptions as any), cb);
  }

  setVideoEncoderConfiguration(options: Record<string, any>, callback: Callback) {
    const token = options.token ?? options.$?.token;
    if (!token) {
      callback(new Error('No video encoder configuration token is present!'));
      return;
    }
    invoke(
      this.onvif.media.setVideoEncoderConfiguration({
        configuration: options as VideoEncoderConfiguration,
        forcePersistence: options.forcePersistence,
      }),
      callback,
    );
  }

  getAudioSources(callback: Callback) {
    invoke(
      this.onvif.media.getAudioSources().then((result) => {
        return result;
      }),
      callback,
    );
  }

  getAudioOutputs(callback: Callback) {
    invoke(
      this.onvif.media.getAudioOutputs().then((result) => {
        this.audioOutputs = result;
        return result;
      }),
      callback,
    );
  }

  getAudioSourceConfigurations(callback: Callback) {
    invoke(
      this.onvif.media.getAudioSourceConfigurations().then((result) => {
        this.audioSourceConfigurations = result;
        return result;
      }),
      callback,
    );
  }

  getAudioOutputConfigurations(callback: Callback) {
    invoke(
      this.onvif.media.getAudioOutputConfigurations().then((result) => {
        this.audioOutputConfigurations = result;
        return result;
      }),
      callback,
    );
  }

  getAudioEncoderConfigurations(callback: Callback) {
    invoke(
      this.onvif.media.getAudioEncoderConfigurations().then((result) => {
        this.audioEncoderConfigurations = result;
        return result;
      }),
      callback,
    );
  }

  getAudioEncoderConfiguration(token: ReferenceToken | Callback, callback?: Callback) {
    const { token: configurationToken, callback: cb } = splitTokenCallback(token, callback);
    if (!cb) {
      return;
    }
    if (!configurationToken) {
      cb(new Error('No audio encoder configuration token is present!'));
      return;
    }
    invoke(this.onvif.media.getAudioEncoderConfiguration({ configurationToken }), cb);
  }

  getAudioEncoderConfigurationOptions(options?: Record<string, unknown> | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.media.getAudioEncoderConfigurationOptions(resolvedOptions as any), cb);
  }

  setAudioEncoderConfiguration(options: Record<string, any>, callback: Callback) {
    invoke(
      this.onvif.media.setAudioEncoderConfiguration({
        configuration: options as AudioEncoderConfiguration,
        forcePersistence: options.forcePersistence,
      }),
      callback,
    );
  }

  addVideoSourceConfiguration(
    options: Parameters<Onvif['media']['addVideoSourceConfiguration']>[0],
    callback: Callback,
  ) {
    invoke(this.onvif.media.addVideoSourceConfiguration(options), callback);
  }

  addVideoEncoderConfiguration(
    options: Parameters<Onvif['media']['addVideoEncoderConfiguration']>[0],
    callback: Callback,
  ) {
    invoke(this.onvif.media.addVideoEncoderConfiguration(options), callback);
  }

  addAudioSourceConfiguration(
    options: Parameters<Onvif['media']['addAudioSourceConfiguration']>[0],
    callback: Callback,
  ) {
    invoke(this.onvif.media.addAudioSourceConfiguration(options), callback);
  }

  addAudioEncoderConfiguration(
    options: Parameters<Onvif['media']['addAudioEncoderConfiguration']>[0],
    callback: Callback,
  ) {
    invoke(this.onvif.media.addAudioEncoderConfiguration(options), callback);
  }

  removeAudioSourceConfiguration(
    options: Parameters<Onvif['media']['removeAudioSourceConfiguration']>[0],
    callback: Callback,
  ) {
    invoke(this.onvif.media.removeAudioSourceConfiguration(options), callback);
  }

  removeVideoEncoderConfiguration(
    options: Parameters<Onvif['media']['removeVideoEncoderConfiguration']>[0],
    callback: Callback,
  ) {
    invoke(this.onvif.media.removeVideoEncoderConfiguration(options), callback);
  }

  removeAudioEncoderConfiguration(
    options: Parameters<Onvif['media']['removeAudioEncoderConfiguration']>[0],
    callback: Callback,
  ) {
    invoke(this.onvif.media.removeAudioEncoderConfiguration(options), callback);
  }

  getStreamUri(options: GetStreamUriOptions | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<GetStreamUriOptions>(options, callback);
    if (!cb) {
      return;
    }
    invoke(
      this.onvif.media
        .getStreamUri(resolvedOptions.profileToken ? resolvedOptions : undefined)
        .then(normalizeStreamUriResponse),
      cb,
    );
  }

  getSnapshotUri(options: GetSnapshotUri | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<GetSnapshotUri>(options, callback);
    if (!cb) {
      return;
    }
    invoke(
      this.onvif.media
        .getSnapshotUri(resolvedOptions.profileToken ? resolvedOptions : undefined)
        .then(normalizeMediaUriResponse),
      cb,
    );
  }

  setSynchronizationPoint(
    options?: Parameters<Onvif['media']['setSynchronizationPoint']>[0] | Callback,
    callback?: Callback,
  ) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.media.setSynchronizationPoint(resolvedOptions), cb);
  }

  getOSDs(options?: GetOSDs | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<GetOSDs>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.media.getOSDs(resolvedOptions), cb);
  }

  getOSDOptions(options?: GetOSDOptions | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<GetOSDOptions>(options, callback);
    if (!cb) {
      return;
    }
    invoke(
      this.onvif.media.getOSDOptions(
        resolvedOptions?.videoSourceConfigurationToken
          ? { configurationToken: resolvedOptions.videoSourceConfigurationToken }
          : undefined,
      ),
      cb,
    );
  }

  createOSD(options: Parameters<Onvif['media']['createOSD']>[0], callback: Callback) {
    invoke(this.onvif.media.createOSD(options), callback);
  }

  setOSD(options: Parameters<Onvif['media']['setOSD']>[0], callback: Callback) {
    invoke(this.onvif.media.setOSD(options), callback);
  }

  deleteOSD(options: Parameters<Onvif['media']['deleteOSD']>[0], callback: Callback) {
    invoke(this.onvif.media.deleteOSD(options), callback);
  }

  getNodes(callback: Callback) {
    invoke(this.onvif.ptz.getNodes(), callback);
  }

  getConfigurations(callback: Callback) {
    invoke(this.onvif.ptz.getConfigurations(), callback);
  }

  getConfigurationOptions(configurationToken: ReferenceToken, callback: Callback) {
    invoke(this.onvif.ptz.getConfigurationOptions({ configurationToken }), callback);
  }

  getPresets(options: GetPresets | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<GetPresets>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.ptz.getPresets(resolvedOptions.profileToken ? resolvedOptions : undefined), cb, (result) =>
      presetsToMap(result),
    );
  }

  gotoPreset(options: GotoPreset, callback: Callback) {
    invoke(this.onvif.ptz.gotoPreset(options), callback);
  }

  setPreset(options: SetPreset, callback: Callback) {
    invoke(this.onvif.ptz.setPreset(options), callback);
  }

  removePreset(options: RemovePreset, callback: Callback) {
    invoke(this.onvif.ptz.removePreset(options), callback);
  }

  gotoHomePosition(options: GotoHomePosition, callback: Callback) {
    invoke(this.onvif.ptz.gotoHomePosition(options), callback);
  }

  setHomePosition(options: SetHomePosition, callback: Callback) {
    invoke(this.onvif.ptz.setHomePosition(options), callback);
  }

  getStatus(options: GetStatus | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<GetStatus>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.ptz.getStatus(resolvedOptions.profileToken ? resolvedOptions : undefined), cb);
  }

  absoluteMove(compatibilityOptions: CompatibilityAbsoluteMoveOptions, callback?: Callback): void {
    const options: AbsoluteMove = {
      ...compatibilityOptions,
      position: {
        panTilt: {
          x: compatibilityOptions.x!,
          y: compatibilityOptions.y!,
        },
        zoom: { x: compatibilityOptions.zoom! },
      },
    };
    if (callback) {
      invoke(this.onvif.ptz.absoluteMove(options), callback);
    } else {
      this.onvif.ptz.absoluteMove(options).catch((err) => this.emit('error', err));
    }
  }

  relativeMove(compatibilityOptions: CompatibilityRelativeMoveOptions, callback?: Callback): void {
    const options: RelativeMove = {
      ...compatibilityOptions,
      translation: {
        panTilt: {
          x: compatibilityOptions.x!,
          y: compatibilityOptions.y!,
        },
        zoom: { x: compatibilityOptions.zoom! },
      },
    };
    if (callback) {
      invoke(this.onvif.ptz.relativeMove(options), callback);
    } else {
      this.onvif.ptz.relativeMove(options).catch((err) => this.emit('error', err));
    }
  }

  continuousMove(compatibilityOptions: CompatibilityContinuousMoveOptions, callback?: Callback): void {
    const options: ContinuousMove = {
      ...compatibilityOptions,
      velocity: {
        ...(compatibilityOptions.x &&
          compatibilityOptions.y &&
          !compatibilityOptions.onlySendZoom && {
            panTilt: {
              x: compatibilityOptions.x,
              y: compatibilityOptions.y,
            },
          }),
        ...(compatibilityOptions.zoom &&
          !compatibilityOptions.onlySendPanTilt && {
            zoom: { x: compatibilityOptions.zoom },
          }),
      },
    };
    if (callback) {
      invoke(this.onvif.ptz.continuousMove(options), callback);
    } else {
      this.onvif.ptz.continuousMove(options).catch((err) => this.emit('error', err));
    }
  }

  stop(options?: GetStatus | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<GetStatus>(options, callback);
    if (cb) {
      invoke(this.onvif.ptz.stop(resolvedOptions), cb);
      return;
    }
    this.onvif.ptz.stop(resolvedOptions).catch((error) => this.emit('error', error));
  }

  ptzSendAuxiliaryCommand(options: { data: string; profileToken?: string }, callback: Callback) {
    invoke(
      this.onvif.ptz.sendAuxiliaryCommand({
        profileToken: profileToken(this.onvif, options),
        auxiliaryData: options.data,
      }),
      callback,
    );
  }

  getImagingServiceCapabilities(callback: Callback) {
    invoke(this.onvif.imaging.getServiceCapabilities(), callback);
  }

  getImagingSettings(options?: { token?: string } | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<{ token?: string }>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.imaging.getImagingSettings(mapImagingToken(this.onvif, resolvedOptions)), cb);
  }

  setImagingSettings(options: { token?: string; [key: string]: unknown }, callback: Callback) {
    const { token, ...settings } = options;
    invoke(
      this.onvif.imaging.setImagingSettings({
        videoSourceToken: videoSourceToken(this.onvif, { token }),
        imagingSettings: settings as ImagingSettings20,
      }),
      callback,
    );
  }

  getVideoSourceOptions(options?: { token?: string } | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<{ token?: string }>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.imaging.getOptions(mapImagingToken(this.onvif, resolvedOptions)), cb);
  }

  imagingGetMoveOptions(options?: { token?: string } | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<{ token?: string }>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.imaging.getMoveOptions(mapImagingToken(this.onvif, resolvedOptions)), cb);
  }

  imagingGetStatus(options?: { token?: string } | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<{ token?: string }>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.imaging.getStatus(mapImagingToken(this.onvif, resolvedOptions)), cb);
  }

  imagingMove(
    options: {
      token?: string;
      absolute?: { position?: number };
      relative?: { distance?: number };
      continuous?: { speed?: number };
    },
    callback: Callback,
  ) {
    invoke(
      this.onvif.imaging.move({
        videoSourceToken: videoSourceToken(this.onvif, options),
        focus: {
          ...(options.absolute && { absolute: options.absolute as any }),
          ...(options.relative && { relative: options.relative as any }),
          ...(options.continuous && { continuous: options.continuous as any }),
        },
      }),
      callback,
    );
  }

  imagingStop(options: { token?: string } | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<{ token?: string }>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.imaging.stop(mapImagingToken(this.onvif, resolvedOptions)), cb);
  }

  getCurrentImagingPreset(options?: { token?: string } | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<{ token?: string }>(options, callback);
    if (!cb) {
      return;
    }
    invoke(this.onvif.imaging.getCurrentPreset(mapImagingToken(this.onvif, resolvedOptions)), cb);
  }

  setCurrentImagingPreset(options: { token?: string; presetToken: string }, callback: Callback) {
    invoke(
      this.onvif.imaging.setCurrentPreset({
        videoSourceToken: videoSourceToken(this.onvif, options),
        presetToken: options.presetToken,
      }),
      callback,
    );
  }

  getEventProperties(callback: Callback) {
    invoke(
      this.onvif.events.getEventProperties().then((result) => {
        this.events.properties = result;
        return result;
      }),
      callback,
    );
  }

  getEventServiceCapabilities(callback: Callback) {
    invoke(this.onvif.events.getServiceCapabilities(), callback);
  }

  private storePullPointSubscription(subscription: PullPointSubscription) {
    this.events.subscription = subscription;
    this.events.terminationTime = new Date(
      Date.now() - subscription.currentTime.getTime() + subscription.terminationTime.getTime(),
    );
    if (this.pullPointSubscription) {
      this.pullPointSubscription.subscription = subscription;
    }
    return subscription;
  }

  createPullPointSubscription(callback: Callback) {
    invoke(
      this.onvif.events
        .createPullPointSubscription()
        .then((subscription) => this.storePullPointSubscription(subscription)),
      callback,
    );
  }

  subscribe(options: { url: string }, callback: Callback) {
    invoke(
      this.onvif.events.subscribe({ url: options.url, terminationTime: 2 * 60 * 1000 }).then((subscription) => {
        return this.storePullPointSubscription(subscription);
      }),
      callback,
    );
  }

  pullMessages(options: PullMessages | Callback, callback?: Callback) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<PullMessages>(options, callback);
    if (!cb) {
      return;
    }
    if (!this.pullPointSubscription?.subscription) {
      cb(new Error('You should create pull-point subscription first!'));
      return;
    }
    invoke(this.pullPointSubscription.pullMessages(resolvedOptions), cb);
  }

  renew(options?: unknown | Callback, callback?: Callback) {
    const cb = isCallback(options) ? options : callback;
    if (!cb) {
      return;
    }
    if (!this.events.subscription) {
      cb(new Error('You should create pull-point subscription first!'));
      return;
    }
    if (this.pullPointSubscription?.subscription) {
      invoke(this.pullPointSubscription.renew(), cb);
      return;
    }
    invoke(this.onvif.events.renew(this.events.subscription, 2 * 60 * 1000), cb);
  }

  unsubscribe(callback?: Callback, _preserveListeners?: boolean) {
    const cb = callback ?? (() => undefined);
    if (!this.events.subscription) {
      cb(new Error('You should create pull-point subscription first!'));
      return;
    }
    const subscription = this.events.subscription;
    delete this.events.subscription;
    delete this.events.terminationTime;
    if (this.pullPointSubscription?.subscription) {
      invoke(this.pullPointSubscription.unsubscribe(), cb);
      return;
    }
    invoke(this.onvif.events.unsubscribe(subscription), cb);
  }

  parseEventXML(xml: string, callback: Callback) {
    parseSOAPString<any>(xml)
      .then(([data]) => callback(null, data?.notify?.notificationMessage))
      .catch(callback);
  }

  getRecordings(callback: Callback) {
    invoke(
      this.onvif.recording.getRecordings().then((result) => {
        this.recordingItems = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingJobs(callback: Callback) {
    invoke(
      this.onvif.recording.getRecordingJobs().then((result) => {
        this.jobItem = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingServiceCapabilities(callback: Callback) {
    invoke(
      this.onvif.recording.getServiceCapabilities().then((result) => {
        this.searchCapabilities = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingSummary(callback: Callback) {
    invoke(
      this.onvif.search.getRecordingSummary().then((result) => {
        this.recordingSummary = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingInformation(options: { RecordingToken: string }, callback: Callback) {
    invoke(
      this.onvif.search.getRecordingInformation(mapRecordingToken(options)).then((result) => {
        this.summary = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingConfiguration(options: { RecordingToken: string }, callback: Callback) {
    invoke(
      this.onvif.recording.getRecordingConfiguration(mapRecordingToken(options)).then((result) => {
        this.recordingConfiguration = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingOptions(options: { RecordingToken: string }, callback: Callback) {
    invoke(
      this.onvif.recording.getRecordingOptions(mapRecordingToken(options)).then((result) => {
        this.recordingOptions = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingJobState(options: { JobToken: string }, callback: Callback) {
    invoke(
      this.onvif.recording.getRecordingJobState(mapJobToken(options)).then((result) => {
        this.recordingJobState = result;
        return result;
      }),
      callback,
    );
  }

  getRecordingJobConfiguration(options: { JobToken: string }, callback: Callback) {
    invoke(this.onvif.recording.getRecordingJobConfiguration(mapJobToken(options)), callback);
  }

  getTrackConfiguration(options: { recordingToken: string; trackToken: string }, callback: Callback) {
    invoke(
      this.onvif.recording.getTrackConfiguration(options).then((result) => {
        this.trackConfiguration = result;
        return result;
      }),
      callback,
    );
  }

  createRecordingJob(options: Parameters<typeof mapCreateRecordingJobOptions>[0], callback: Callback) {
    invoke(
      this.onvif.recording.createRecordingJob(mapCreateRecordingJobOptions(options) as CreateRecordingJob),
      callback,
    );
  }

  deleteRecordingJob(options: { JobToken: string }, callback: Callback) {
    invoke(this.onvif.recording.deleteRecordingJob(mapJobToken(options)), callback);
  }

  setRecordingJobMode(options: { JobToken: string; Mode: string }, callback: Callback) {
    invoke(
      this.onvif.recording.setRecordingJobMode({
        jobToken: options.JobToken,
        mode: options.Mode as any,
      }),
      callback,
    );
  }

  getReplayUri(
    options: { recordingToken: string; stream?: string; protocol?: string } | Callback,
    callback?: Callback,
  ) {
    const { options: resolvedOptions, callback: cb } = splitOptionalCallback<{
      recordingToken: string;
      stream?: string;
      protocol?: string;
    }>(options, callback);
    if (!cb) {
      return;
    }
    invoke(
      this.onvif.replay.getReplayUri({
        recordingToken: resolvedOptions.recordingToken,
        stream: resolvedOptions.stream as StreamType | undefined,
        protocol: resolvedOptions.protocol as TransportProtocol | undefined,
      } as GetReplayUriOptions),
      cb,
    );
  }
}

export type { Callback };
