import { Onvif, OnvifServices } from './onvif';
import { build, linerase, LineraseOptions } from './utils';

const XMLNS: Record<keyof OnvifServices, string> = {
  PTZ: 'http://www.onvif.org/ver20/ptz/wsdl',
  analytics: 'http://www.onvif.org/ver20/analytics/wsdl',
  device: 'http://www.onvif.org/ver10/device/wsdl',
  deviceIO: 'http://www.onvif.org/ver10/deviceIO/wsdl',
  display: 'http://www.onvif.org/ver10/display/wsdl',
  events: 'http://www.onvif.org/ver10/events/wsdl',
  imaging: 'http://www.onvif.org/ver20/imaging/wsdl',
  media2: 'http://www.onvif.org/ver20/media/wsdl',
  media: 'http://www.onvif.org/ver10/media/wsdl',
  receiver: 'http://www.onvif.org/ver10/receiver/wsdl',
  recording: 'http://www.onvif.org/ver10/recording/wsdl',
  replay: 'http://www.onvif.org/ver10/replay/wsdl',
  doorcontrol: 'http://www.onvif.org/ver10/doorcontrol/wsdl',
  search: 'http://www.onvif.org/ver10/search/wsdl',
  analyticsDevice: 'http://www.onvif.org/ver10/analyticsDevice/wsdl',
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

  async request(query: Record<string, any>, options?: LineraseOptions) {
    const root = Object.keys(query)[0];
    query[root].$ = {
      xmlns: this.xmlns,
      ...query[root].$,
    };
    const body = build(query);
    const [data] = await this.onvif.request({
      service: this.service,
      body,
    });
    return linerase(data, options);
  }
}
