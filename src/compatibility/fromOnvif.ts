/**
 * Shared mapping from a discovered {@link Onvif} instance to Cam constructor options.
 */

import { Onvif } from '../onvif';

/** Options for building a compatibility Cam from a Discovery {@link Onvif}. */
export function camOptionsFromOnvif(onvif: Onvif): Record<string, unknown> {
  return {
    hostname: onvif.hostname,
    port: onvif.port,
    path: onvif.path,
    username: onvif.username,
    password: onvif.password,
    urn: onvif.urn,
    xaddrs: onvif.xaddrs,
    autoconnect: false,
  };
}
