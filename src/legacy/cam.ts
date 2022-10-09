/**
 * Module to provide backward compatibility with versions 0.x
 */

import { EventEmitter } from 'events';
import { Onvif, OnvifRequestOptions, SetSystemDateAndTimeOptions } from '../onvif';

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
    this.onvif.device.getServiceCapabilities().then((result) => callback(null, result)).catch(callback);
  }
}
