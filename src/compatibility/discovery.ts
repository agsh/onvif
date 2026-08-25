/**
 * Callback-style Discovery for `require('onvif/compatibility')`.
 * Wraps the main {@link Discovery} and returns compatibility {@link Cam} instances.
 */

import { EventEmitter } from 'events';
import { Discovery as MasterDiscovery, DiscoveryOptions } from '../discovery';
import { Onvif } from '../onvif';
import { Cam } from './cam';
import { camOptionsFromOnvif } from './fromOnvif';
import { Callback, isCallback } from './helpers';

function onvifToCam(onvif: Onvif): Cam {
  return new Cam(camOptionsFromOnvif(onvif));
}

class DiscoveryCompat extends EventEmitter {
  /**
   * Discover NVT devices in the subnetwork (v0.x callback API).
   */
  probe(options?: DiscoveryOptions | Callback, callback?: Callback): void {
    let opts: DiscoveryOptions = {};
    let cb: Callback | undefined = callback;
    if (isCallback(options)) {
      cb = options;
    } else if (options) {
      opts = options;
    }
    const done = cb ?? (() => undefined);

    MasterDiscovery.probe(opts)
      .then((devices) => {
        const mapped = devices.map((device) => (device instanceof Onvif ? onvifToCam(device) : device));
        done(null, mapped);
      })
      .catch((error: Error) => {
        done(error);
      });
  }
}

const discovery = new DiscoveryCompat();

MasterDiscovery.on('device', (device, rinfo, xml) => {
  discovery.emit('device', device instanceof Onvif ? onvifToCam(device) : device, rinfo, xml);
});

MasterDiscovery.on('error', (error, xml) => {
  discovery.emit('error', error, xml);
});

export { discovery as Discovery };
