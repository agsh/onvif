/**
 * Service module for all ONVIF services
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/profiles/specifications/
 */

import { Onvif, OnvifServices } from './onvif';
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
  search: 'http://www.onvif.org/ver10/search/wsdl',
  analyticsdevice: 'http://www.onvif.org/ver10/analyticsdevice/wsdl',
};

/**
 * Common class for all services that handles the common xmlns, request and response
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

  async request<T = any>(body: Record<string, any>, options?: LineraseOptions): Promise<T> {
    const root = Object.keys(body)[0];
    body[root].$ = {
      xmlns: this.xmlns,
      ...body[root].$,
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

    return (loading ??= loader().then(({ default: Service }) => {
      instance = new Service(onvif);
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

  return new Proxy(
    {},
    {
      get(_target, property) {
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
        return (...args: unknown[]) => load().then((service) => resolveProperty(service, property, args));
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
