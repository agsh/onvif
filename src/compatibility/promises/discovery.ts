/**
 * Discovery module with promise-based probe returning promisified Cam instances.
 * @see origin/v0.x:promises/discovery.js
 */

import { EventEmitter } from 'events';
import { Discovery as MasterDiscovery, DiscoveryOptions } from '../../discovery';
import { Onvif } from '../../onvif';
import { camOptionsFromOnvif } from '../fromOnvif';
import { Cam } from './cam';

function onvifToCam(onvif: Onvif): Cam {
  return new Cam(camOptionsFromOnvif(onvif));
}

class DiscoveryCompat extends EventEmitter {
  /**
   * Discover NVT devices in the subnetwork.
   * @returns promisified {@link Cam} instances when `resolve` is not `false`
   */
  async probe(options: DiscoveryOptions = {}): Promise<(Cam | Record<string, unknown>)[]> {
    const devices = await MasterDiscovery.probe(options);
    return devices.map((device) => (device instanceof Onvif ? onvifToCam(device) : device));
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
