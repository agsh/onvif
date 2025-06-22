/**
 * Discovery module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */
import { EventEmitter } from 'events';
import { Onvif } from './onvif';
export interface DiscoveryOptions {
    /** Timeout in milliseconds for discovery responses, Default 5000 */
    timeout?: number;
    /** Set to `false` if you want to omit creating of Cam objects. Default true */
    resolve?: boolean;
    /** WS-Discovery message id */
    messageId?: string;
    /** Interface to bind on for discovery ex. `eth0` */
    device?: string;
    /** Client will listen to discovery data device sent */
    listeningPort?: number;
    /** Socket type */
    type?: 'udp4' | 'udp6';
}
/**
 * Class for `Discovery` singleton
 */
export declare class DiscoverySingleton extends EventEmitter {
    /**
     * Fires when device found
     * @param onvif Onvif instance {@link Onvif} or just information object about found device
     * @event device
     * @example
     * ```typescript
     * discovery.on('device', console.log);
     * ```
     */
    static device: "device";
    /**
     * Indicates any errors
     * @param error Error instance or array of error instances from {@link OnvifError}
     * @event error
     * @example
     * ```typescript
     * discovery.on('error', console.error);
     * ```
     */
    static error: "error";
    private static instance?;
    static get getInstance(): DiscoverySingleton;
    private constructor();
    /**
     * Discover NVT devices in the subnetwork
     * @param options
     * @example
     * ```typescript
     * import { Discovery } from 'onvif';
     * Discovery.on('device', async (cam) => {
     *   // function would be called as soon as NVT responses
     *   cam.username = <USERNAME>;
     *   cam.password = <PASSWORD>;
     *   await cam.connect();
     * })
     * Discovery.probe();
     * ```
     * @example
     * import { Discovery } from 'onvif';
     * (async () => {
     *   const cams = Promise.all((await Discovery.probe()).map(camera => camera.connect());
     *   console.log(await cams[0]?.getSystemDateAndTime());
     * })();
     */
    probe(options?: DiscoveryOptions): Promise<(Onvif | Record<string, unknown>)[]>;
}
/**
 * Singleton for the discovery to provide `probe` method
 * {@link Discovery.probe}
 * @example
 * ```typescript
 * import { Discovery } from 'onvif';
 * Discovery.on('device', async (cam) => {
 *   // function would be called as soon as NVT responses
 *   cam.username = <USERNAME>;
 *   cam.password = <PASSWORD>;
 *   await cam.connect();
 * })
 * Discovery.probe();
 * ```
 * @example
 * import { Discovery } from 'onvif';
 * (async () => {
 *   const cams = Promise.all((await Discovery.probe()).map(camera => camera.connect());
 *   console.log(await cams[0]?.getSystemDateAndTime());
 * })();
 */
export declare const Discovery: DiscoverySingleton;
