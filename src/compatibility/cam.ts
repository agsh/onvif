/**
 * Module to provide backward compatibility with versions 0.x
 */

import { EventEmitter } from 'events';
import {
  Onvif, OnvifRequestOptions, ReferenceToken, SetSystemDateAndTimeOptions,
} from '../onvif';
import { GetSnapshotUriOptions, GetStreamUriOptions } from '../media';
import { GetPresetsOptions, GotoPresetOptions, SetPresetOptions } from '../ptz';

type Callback = (error: any, result?: any) => void;

export class Cam extends EventEmitter {
  private onvif: Onvif;
  constructor(options: any, callback: Callback) {
    super();
    this.onvif = new Onvif({
      ...options,
      autoConnect : callback !== undefined ? false : options.autoconnect,
    });
    if (callback) {
      this.onvif.connect().then((result) => callback(null, result)).catch(callback);
    }
  }

  get port() { return this.onvif.port; }
  get path() { return this.onvif.path; }
  set hostname(name: string) { this.onvif.hostname = name; }
  set timeout(time: number) { this.onvif.timeout = time; }
  get timeout() { return this.onvif.timeout; }
  get services() { return this.onvif.device.services; }
  get capabilities() { return this.onvif.capabilities; }
  get uri() { return this.onvif.uri; }
  get videoSources() { return this.onvif.media.videoSources; }
  get profiles() { return this.onvif.media.profiles; }
  get defaultProfile() { return this.onvif.defaultProfile; }
  get defaultProfiles() { return this.onvif.defaultProfiles; }
  get activeSource() { return this.onvif.activeSource; }
  get serviceCapabilities() { return this.onvif.device.serviceCapabilities; }
  get deviceInformation() { return this.onvif.deviceInformation; }
  get nodes() { return this.onvif.ptz.nodes; }
  get configurations() { return this.onvif.ptz.configurations; }
  get presets() {
    return Object.fromEntries(Object.values(this.onvif.ptz.presets)
      .map((preset) => [preset.name, preset.token]));
  }

  connect(callback: Callback) {
    this.onvif.connect().then((result) => callback(null, result)).catch(callback);
  }

  _request(options: OnvifRequestOptions, callback: Callback) {
    if (typeof callback !== 'function') {
      throw new Error('`callback` must be a function');
    }
    this.onvif.request(options).then((result) => callback(null, result)).catch(callback);
  }

  getSystemDateAndTime(callback: Callback) {
    this.onvif.device.getSystemDateAndTime().then((result) => callback(null, result)).catch(callback);
  }

  setSystemDateAndTime(value: SetSystemDateAndTimeOptions, callback: Callback) {
    this.onvif.device.setSystemDateAndTime(value).then((result) => callback(null, result)).catch(callback);
  }

  getHostname(callback: Callback) {
    this.onvif.device.getHostname().then((result) => callback(null, result)).catch(callback);
  }

  getScopes(callback: Callback) {
    this.onvif.device.getScopes().then((result) => callback(null, result)).catch(callback);
  }

  setScopes(value: string[], callback: Callback) {
    this.onvif.device.setScopes(value).then((result) => callback(null, result)).catch(callback);
  }

  getCapabilities(callback: Callback) {
    this.onvif.device.getCapabilities().then((result) => callback(null, result)).catch(callback);
  }

  getServiceCapabilities(callback: Callback) {
    this.onvif.device.getServiceCapabilities()
      .then((result) => callback(null, result)).catch(callback);
  }

  getActiveSources(callback: Callback) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.onvif.getActiveSources().then((result) => callback(null, result)).catch(callback);
  }

  getVideoSources(callback: Callback) {
    this.onvif.media.getVideoSources().then((result) => callback(null, result)).catch(callback);
  }

  getServices(includeCapability: boolean, callback: Callback) {
    this.onvif.device.getServices(includeCapability)
      .then((result) => callback(null, result)).catch(callback);
  }

  getDeviceInformation(callback: Callback) {
    this.onvif.device.getDeviceInformation()
      .then((result) => callback(null, result)).catch(callback);
  }

  getStreamUri(options: GetStreamUriOptions, callback: Callback): void
  getStreamUri(callback: Callback): void
  getStreamUri(options: GetStreamUriOptions | Callback, callback?: Callback) {
    if (callback) {
      this.onvif.media.getStreamUri(options as GetStreamUriOptions)
        .then((result) => callback(null, result)).catch(callback);
    }
    this.onvif.media.getStreamUri()
      .then((result) => (options as Callback)(null, result)).catch(options as Callback);
  }

  getSnapshotUri(options: GetSnapshotUriOptions, callback: Callback): void
  getSnapshotUri(callback: Callback): void
  getSnapshotUri(options: GetSnapshotUriOptions | Callback, callback?: Callback) {
    if (callback) {
      this.onvif.media.getSnapshotUri(options as GetSnapshotUriOptions)
        .then((result) => callback(null, result)).catch(callback);
    }
    this.onvif.media.getSnapshotUri().then((result) => (options as Callback)(null, result))
      .catch(options as Callback);
  }

  getNodes(callback: Callback) {
    this.onvif.ptz.getNodes().then((result) => callback(null, result)).catch(callback);
  }

  getConfigurations(callback: Callback) {
    this.onvif.ptz.getConfigurations().then((result) => callback(null, result)).catch(callback);
  }

  getConfigurationOptions(configurationToken: ReferenceToken, callback: Callback) {
    this.onvif.ptz.getConfigurationOptions({ configurationToken })
      .then((result) => callback(null, result)).catch(callback);
  }

  systemReboot(callback: Callback) {
    this.onvif.device.systemReboot().then((result) => callback(null, result)).catch(callback);
  }

  getPresets(options: GetPresetsOptions, callback: Callback): void
  getPresets(callback: Callback): void
  getPresets(options: GetPresetsOptions | Callback, callback?: Callback) {
    if (callback) {
      this.onvif.ptz.getPresets(options as GetPresetsOptions)
        .then((result) => callback(
          null,
          Object.fromEntries(Object.values(result).map((preset) => [preset.name, preset.token])),
        ))
        .catch(callback);
    }
    this.onvif.ptz.getPresets()
      .then((result) => (options as Callback)(
        null,
        Object.fromEntries(Object.values(result).map((preset) => [preset.name, preset.token])),
      ))
      .catch(options as Callback);
  }

  async gotoPreset(options: GotoPresetOptions, callback: Callback) {
    this.onvif.ptz.gotoPreset(options).then((result) => callback(null, result)).catch(callback);
  }

  async setPreset(options: SetPresetOptions, callback: Callback) {
    this.onvif.ptz.setPreset(options).then((result) => callback(null, result)).catch(callback);
  }
}
