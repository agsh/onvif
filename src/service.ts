/**
 * Service module for all ONVIF services
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/profiles/specifications/
 */

import { Onvif, OnvifServices, type OnvifSoapBody } from './onvif';
import { linerase, LineraseOptions } from './utils';

export const XMLNS: Record<keyof OnvifServices, string> = {
  ptz: 'http://www.onvif.org/ver20/ptz/wsdl',
  analytics: 'http://www.onvif.org/ver20/analytics/wsdl',
  device: 'http://www.onvif.org/ver10/device/wsdl',
  deviceIO: 'http://www.onvif.org/ver10/deviceIO/wsdl',
  display: 'http://www.onvif.org/ver10/display/wsdl',
  actionengine: 'http://www.onvif.org/ver10/actionengine/wsdl',
  events: 'http://www.onvif.org/ver10/events/wsdl',
  imaging: 'http://www.onvif.org/ver20/imaging/wsdl',
  media2: 'http://www.onvif.org/ver20/media/wsdl',
  media: 'http://www.onvif.org/ver10/media/wsdl',
  receiver: 'http://www.onvif.org/ver10/receiver/wsdl',
  recording: 'http://www.onvif.org/ver10/recording/wsdl',
  replay: 'http://www.onvif.org/ver10/replay/wsdl',
  doorcontrol: 'http://www.onvif.org/ver10/doorcontrol/wsdl',
  accesscontrol: 'http://www.onvif.org/ver10/accesscontrol/wsdl',
  credential: 'http://www.onvif.org/ver10/credential/wsdl',
  accessrules: 'http://www.onvif.org/ver10/accessrules/wsdl',
  schedule: 'http://www.onvif.org/ver10/schedule/wsdl',
  provisioning: 'http://www.onvif.org/ver10/provisioning/wsdl',
  advancedsecurity: 'http://www.onvif.org/ver10/advancedsecurity/wsdl',
  thermal: 'http://www.onvif.org/ver10/thermal/wsdl',
  uplink: 'http://www.onvif.org/ver10/uplink/wsdl',
  appmgmt: 'http://www.onvif.org/ver10/appmgmt/wsdl',
  search: 'http://www.onvif.org/ver10/search/wsdl',
  analyticsdevice: 'http://www.onvif.org/ver10/analyticsdevice/wsdl',
};

/**
 * Common base for ONVIF service namespaces (device, media, ptz, ...).
 *
 * Handles SOAP request / xmlns; subclasses add typed operations.
 *
 * @example
 * Typical usage is through a lazy namespace on {@link Onvif} (you rarely construct `Service` yourself):
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * // First call loads the module; subsequent calls reuse the same Service instance.
 * const caps = await onvif.device.getServiceCapabilities();
 * const info = await onvif.device.getDeviceInformation();
 * console.log(caps, info.manufacturer);
 *
 * // Low-level escape hatch when a typed wrapper is missing:
 * const raw = await onvif.device.request({ GetHostname: {} });
 * console.log(raw.getHostnameResponse);
 * ```
 * @category Core
 */
export default class Service {
  protected readonly onvif: Onvif;
  protected readonly service: keyof OnvifServices;
  protected readonly xmlns: string;

  constructor(onvif: Onvif, service: keyof OnvifServices) {
    this.onvif = onvif;
    this.service = service;
    this.xmlns = XMLNS[this.service];
  }

  async request<T = any>(body: OnvifSoapBody, options?: LineraseOptions): Promise<T> {
    const root = Object.keys(body)[0];
    const rootNode = body[root];
    if (typeof rootNode !== 'object' || rootNode === null) {
      throw new TypeError(`SOAP body root "${root}" must be an object`);
    }
    const node = rootNode as Record<string, unknown>;
    node.$ = {
      xmlns: this.xmlns,
      ...(typeof node.$ === 'object' && node.$ !== null ? node.$ : {}),
    };
    const [data] = await this.onvif.request({
      service: this.service,
      body,
      array: options?.array,
      rawXML: options?.rawXML,
    });
    return data as T;
  }
}

/**
 * Lazy namespace proxy for {@link Onvif} service fields (`media`, `ptz`, …).
 *
 * - Methods: `await onvif.media.getProfiles()` — first call loads the module.
 * - Data properties before load: `await onvif.media.profiles` (thenable accessor).
 *   Sync reads before load are still a callable/thenable (not the raw value); prefer
 *   `onvif.profiles` on the client, or await a method that hydrates the service first.
 * - The proxy itself is not thenable (`.then` is undefined) so `Promise.resolve(onvif.media)` is safe.
 */
export function lazyService<T extends object>(
  onvif: Onvif,
  loader: () => Promise<{ default: new (onvif: Onvif) => T }>,
): T {
  let instance: T | undefined;
  let loading: Promise<T> | undefined;
  const overrides = new Map<string | symbol, unknown>();

  const load = (): Promise<T> => {
    if (instance) {
      return Promise.resolve(instance);
    }

    return (loading ??= loader().then(({ default: ServiceClass }) => {
      instance = new ServiceClass(onvif);
      for (const [property, value] of overrides) {
        Reflect.set(instance, property, value, instance);
      }
      return instance;
    }));
  };

  const resolveProperty = (service: T, property: string | symbol, args: unknown[]) => {
    const value = Reflect.get(service, property, service);
    if (typeof value === 'function') {
      return Reflect.apply(value, service, args);
    }
    if (args.length > 0) {
      throw new TypeError(`${String(property)} is not a method`);
    }
    return value;
  };

  /** Callable for methods; also thenable so `await proxy.prop` loads a data field. */
  const unloadedAccessor = (property: string | symbol) => {
    const accessor = ((...args: unknown[]) =>
      load().then((service) => resolveProperty(service, property, args))) as ((
      ...args: unknown[]
    ) => Promise<unknown>) &
      PromiseLike<unknown>;
    accessor.then = (onFulfilled, onRejected) =>
      load()
        .then((service) => Reflect.get(service, property, service))
        .then(onFulfilled, onRejected);
    return accessor;
  };

  return new Proxy(
    {},
    {
      get(_target, property) {
        // Do not make the proxy itself a thenable.
        if (property === 'then' || typeof property === 'symbol') {
          return undefined;
        }
        if (overrides.has(property)) {
          return overrides.get(property);
        }
        if (instance) {
          const value = Reflect.get(instance, property, instance);
          if (typeof value === 'function') {
            // Own props (e.g. jest.spyOn mocks) must be returned as-is for mock APIs.
            if (Object.prototype.hasOwnProperty.call(instance, property)) {
              return value;
            }
            return (...args: unknown[]) => Reflect.apply(value, instance!, args);
          }
          return value;
        }
        return unloadedAccessor(property);
      },
      set(_target, property, value) {
        if (instance) {
          overrides.delete(property);
          return Reflect.set(instance, property, value, instance);
        }
        overrides.set(property, value);
        return true;
      },
      has(_target, property) {
        if (overrides.has(property)) {
          return true;
        }
        if (instance) {
          return Reflect.has(instance, property);
        }
        return false;
      },
    },
  ) as T;
}
