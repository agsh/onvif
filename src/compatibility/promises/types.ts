/**
 * Type definitions for `onvif/promises`.
 */

import { EventEmitter } from 'events';
import { Cam as CallbackCam } from '../cam';
import { DiscoveryOptions } from '../../discovery';

type DropCallbackArgs<A extends unknown[]> = A extends [...infer P, (...args: unknown[]) => unknown]
  ? P
  : A;

type CallbackCamMethodKeys = {
  [K in keyof CallbackCam]-?: CallbackCam[K] extends (...args: infer _A) => unknown
    ? K extends keyof EventEmitter
      ? never
      : K
    : never;
}[keyof CallbackCam];

type PromisifiedCamMethods = {
  [K in CallbackCamMethodKeys]: CallbackCam[K] extends (...args: infer A) => unknown
    ? (...args: DropCallbackArgs<A>) => Promise<unknown>
    : never;
};

type CallbackCamPropertyKeys = {
  [K in keyof CallbackCam]-?: CallbackCam[K] extends (...args: infer _A) => unknown ? never : K;
}[keyof CallbackCam];

type PromisifiedCamProperties = Pick<CallbackCam, CallbackCamPropertyKeys>;

export interface PromisifiedCam extends PromisifiedCamMethods, PromisifiedCamProperties, EventEmitter {
  /** Underlying callback-based Cam instance */
  readonly _cam: CallbackCam;
}

export interface PromisifiedDiscovery extends EventEmitter {
  probe(options?: DiscoveryOptions): Promise<Array<import('./cam').Cam | Record<string, unknown>>>;
  on(
    event: 'device',
    listener: (cam: import('./cam').Cam | Record<string, unknown>, remoteInfo: unknown, xml: string) => void,
  ): this;
  on(event: 'error', listener: (error: Error | string, xml?: string) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;
}

declare const onvifPromises: {
  Cam: typeof import('./cam').Cam;
  Discovery: PromisifiedDiscovery;
  promisifiedMethods: string[];
};

export default onvifPromises;
