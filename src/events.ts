/**
 * Events ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/core/ONVIF-Core-Specification.pdf
 * @see https://www.onvif.org/ver10/events/wsdl/event.wsdl
 */

import { Onvif } from './onvif';
import { GetEventPropertiesResponse, GetServiceCapabilitiesResponse } from './interfaces/event';
import { build, linerase } from './utils';

/**
 * Events service
 */
export class Events {
  private readonly onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * The WS-BaseNotification specification defines a set of OPTIONAL WS-ResouceProperties. This specification does not
   * require the implementation of the WS-ResourceProperty interface. Instead, the subsequent direct interface shall be
   * implemented by an ONVIF compliant device in order to provide information about the FilterDialects, Schema files
   * and topics supported by the device.
   */
  async getEventProperties(): Promise<GetEventPropertiesResponse> {
    const body = build({
      GetEventProperties: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    });
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data).getEventPropertiesResponse;
  }

  async getServiceCapabilities(): Promise<GetServiceCapabilitiesResponse> {
    const body = build({
      GetServiceCapabilities: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    });
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data);
  }
}
