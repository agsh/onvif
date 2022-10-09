/**
 * Module to provide backward compatibility with versions 0.x
 */

import { EventEmitter } from 'events';
import { Onvif, OnvifRequestOptions } from '../onvif';

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

  get port() {
    return this.onvif.port;
  }

  get path() {
    return this.onvif.path;
  }

  set hostname(name: string) {
    this.onvif.hostname = name;
  }

  set timeout(time: number) {
    this.onvif.timeout = time;
  }

  get timeout() {
    return this.onvif.timeout;
  }

  connect(callback: Callback) {
    this.onvif.connect().then((result) => callback(null, result)).catch(callback);
  }

  _request(options: OnvifRequestOptions, callback: Callback) {
    console.log('what?');
    if (typeof callback !== 'function') {
      throw new Error('`callback` must be a function');
    }
    this.onvif.request(options).then((result) => {
      console.log(result);
      callback(null, result);
    }).catch((error) => {
      console.error(error);
      callback(error);
    });
  }
}
