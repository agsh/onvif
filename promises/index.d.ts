/**
 * Promisified ONVIF client (`require('onvif/promises')`).
 */

import { EventEmitter } from 'events';
import {
	Cam as CallbackCam,
	CamOptions,
	Discovery as CallbackDiscovery,
	DiscoveryProbeOptions,
} from '../index';

type DropCallbackArgs<A extends any[]> = A extends [...infer P, ((...args: any[]) => any)?]
	? P
	: A;

type CallbackCamMethodKeys = {
	[K in keyof CallbackCam]-?: CallbackCam[K] extends (...args: any[]) => any
		? K extends keyof EventEmitter
			? never
			: K
		: never;
}[keyof CallbackCam];

type PromisifiedCamMethods = {
	[K in CallbackCamMethodKeys]: CallbackCam[K] extends (...args: infer A) => any
		? (...args: DropCallbackArgs<A>) => Promise<any>
		: never;
};

export interface Cam extends PromisifiedCamMethods, EventEmitter {
	/** Underlying callback-based Cam instance */
	_cam: CallbackCam;
}

export declare class Cam {
	constructor(options: CamOptions);
}

export interface Discovery extends EventEmitter {
	probe(options?: DiscoveryProbeOptions): Promise<Array<CallbackCam | object>>;
	probe(): Promise<Array<CallbackCam | object>>;
	on(
		event: 'device',
		listener: (cam: CallbackCam | object, remoteInfo: any, xml: string) => void
	): this;
	on(event: 'error', listener: (error: Error | string, xml?: string) => void): this;
	on(event: string, listener: (...args: any[]) => void): this;
}

export declare const Discovery: Discovery;

declare const onvifPromises: {
	Cam: typeof Cam;
	Discovery: Discovery;
};

export default onvifPromises;
