/**
 * Promisified compatibility Cam (`require('onvif/compatibility/promises')`).
 * @see origin/v0.x:promises/cam.js
 */

import { Cam as CallbackCam } from '../cam';
import { promisifyProperty } from './promisify';
import type { PromisifiedCam } from './types';

/**
 * Promise-based wrapper around the v0.x callback {@link CallbackCam}.
 * @example
 * ```js
 * const { Cam } = require('onvif/compatibility/promises');
 * const cam = new Cam({ hostname: '127.0.0.1', username: 'admin', password: 'admin' });
 * await cam.connect();
 * const { uri } = await cam.getStreamUri({ protocol: 'RTSP' });
 * ```
 */
export class Cam {
  readonly _cam: CallbackCam;

  constructor(options: Record<string, unknown>) {
    this._cam = new CallbackCam({ ...options, autoconnect: false });
    return new Proxy(this, {
      get(target, name) {
        if (name === '_cam') {
          return target._cam;
        }
        return promisifyProperty(target, name);
      },
      set(target, name, value) {
        (target._cam as unknown as Record<string | symbol, unknown>)[name] = value;
        return true;
      },
    }) as unknown as this;
  }
}

export interface Cam extends PromisifiedCam {}
