/**
 * Infer connect defaults from WS-Discovery ProbeMatch Scopes / Types.
 * Devices advertise conformance via `onvif://www.onvif.org/Profile/...` scopes.
 *
 * @see https://www.onvif.org/specs/core/ONVIF-Core-Specification.pdf (scopes)
 */

/** Split a ProbeMatch Scopes / Types list (space-separated string or array). */
export function splitDiscoveryList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === 'string' ? item.split(/\s+/) : [])).filter(Boolean);
  }
  return [];
}

function lower(tokens: string[]): string[] {
  return tokens.map((token) => token.toLowerCase());
}

/** Conformance / streaming scopes that imply a media pipeline is expected. */
function hasVideoConformance(scopes: string[], types: string[]): boolean {
  const all = lower([...scopes, ...types]);
  return all.some(
    (token) =>
      token.includes('/profile/streaming') ||
      token.includes('/profile/t') ||
      // Legacy Profile S scope form used by some NVTs
      token.includes('/profile/s') ||
      token.includes('/type/video_encoder') ||
      token.includes('/type/video_analytics') ||
      token.includes('network_video_transmitter') ||
      token.includes('networkvideotransmitter'),
  );
}

/** Access-control conformance (door stations, Profile C / A). */
function hasAccessConformance(scopes: string[], types: string[]): boolean {
  const all = lower([...scopes, ...types]);
  return all.some(
    (token) =>
      token.includes('/profile/c') ||
      token.includes('/profile/a') ||
      token.includes('doorcontrol') ||
      token.includes('accesscontrol'),
  );
}

/**
 * True when ProbeMatch advertises access control without video conformance.
 * Video doorbells that also list Streaming / Profile T / NVT keep media on.
 */
export function isAccessControlOnlyDevice(scopes: string[] = [], types: string[] = []): boolean {
  if (scopes.length === 0 && types.length === 0) {
    return false;
  }
  return hasAccessConformance(scopes, types) && !hasVideoConformance(scopes, types);
}

/**
 * Default for {@link ConnectOptions.media} when the caller omits it.
 * - Manual `new Onvif(...)` (no discovery scopes) → `true` (cameras are the common case)
 * - Discovery access-only door station → `false`
 * - Discovery camera / video doorbell → `true`
 */
export function defaultMediaOnConnect(scopes?: string[], types?: string[]): boolean {
  return !isAccessControlOnlyDevice(scopes ?? [], types ?? []);
}
