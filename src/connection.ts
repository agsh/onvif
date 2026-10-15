/**
 * Connection for {@link Onvif}.
 * SOAP used by {@link connect} lives here so `device` / `media` / `media2` modules are not loaded.
 */

import type { Onvif, OnvifServices } from './onvif';
import type {
  Capabilities,
  CapabilitiesExtension,
  Profile,
  VideoEncoderConfiguration,
  VideoSource,
  VideoSourceConfiguration,
} from './interfaces/onvif';
import type {
  GetCapabilities,
  GetServices,
  GetServicesResponse,
  Service as DeviceService,
} from './interfaces/devicemgmt';
import type { GetProfilesResponse } from './interfaces/media';
import type { MediaProfile } from './interfaces/media.2';
import { MEDIA_NESTED_PARSE, OnvifError, OnvifValidationError, type LineraseOptions } from './utils';
import { XMLNS } from './service';

/** Media1 GetProfiles — `Profiles` unbounded; nested configs are single entities. */
const MEDIA_PROFILE_PARSE: LineraseOptions = {
  array: ['profiles', ...MEDIA_NESTED_PARSE.array],
  rawXML: MEDIA_NESTED_PARSE.rawXML,
};

/**
 * Media2 GetProfiles — `Profiles` unbounded; `Configurations` is one ConfigurationSet (object).
 */
const MEDIA2_PROFILE_PARSE: LineraseOptions = {
  array: ['profiles', ...MEDIA_NESTED_PARSE.array],
  rawXML: MEDIA_NESTED_PARSE.rawXML,
};

async function serviceRequest(
  onvif: Onvif,
  service: keyof OnvifServices,
  body: Record<string, any>,
  options?: LineraseOptions,
) {
  const root = Object.keys(body)[0];
  body[root].$ = {
    xmlns: XMLNS[service],
    ...body[root].$,
  };
  const [data] = await onvif.request({
    service,
    body,
    array: options?.array,
    rawXML: options?.rawXML,
  });
  return data;
}

/**
 * Map GetCapabilities field names / GetServices namespace path segments onto {@link OnvifServices} keys.
 * Caps use `PTZ` / linerase `analyticsDevice`; services request with `ptz` / `analyticsdevice`.
 */
export function serviceUriKey(name: string): keyof OnvifServices {
  switch (name) {
    case 'PTZ':
      return 'ptz';
    case 'analyticsDevice':
      return 'analyticsdevice';
    default:
      return name as keyof OnvifServices;
  }
}

/**
 * Returns information about services of the device (Device.GetServices).
 */
export async function getServices(
  onvif: Onvif,
  { includeCapability }: GetServices = { includeCapability: true },
): Promise<GetServicesResponse> {
  const response = await serviceRequest(onvif, 'device', {
    GetServices: { IncludeCapability: includeCapability },
  });
  const result = response.getServicesResponse as GetServicesResponse;
  onvif.services = result.service ?? [];
  // ONVIF Profile T introduced Media2 (ver20) so cameras from around 2020/2021 will have
  // two media entries in the ServicesResponse, one for Media (ver10/media) and one for Media2 (ver20/media)
  onvif.services.forEach((service: DeviceService) => {
    if (service.namespace && service.XAddr) {
      const parsedNamespace = new URL(service.namespace);
      if (parsedNamespace.hostname === 'www.onvif.org' && parsedNamespace.pathname) {
        const namespaceSplitted = parsedNamespace.pathname.substring(1).split('/');
        if (namespaceSplitted[1] === 'media' && namespaceSplitted[0] === 'ver20') {
          onvif.media2Support = true;
          namespaceSplitted[1] = 'media2';
        }
        // Namespace path segment matches OnvifServices keys (ptz, media, deviceIO, …).
        onvif.uri[serviceUriKey(namespaceSplitted[1])] = onvif.parseUrl(service.XAddr);
      }
    }
  });
  return result;
}

/**
 * Device.GetCapabilities (legacy fallback when GetServices is unavailable).
 */
export async function getCapabilities(onvif: Onvif, options?: GetCapabilities): Promise<Capabilities> {
  if (!options || !options.category) {
    options = { category: ['All'] };
  }
  const response = await serviceRequest(onvif, 'device', {
    GetCapabilities: {
      Category: options.category,
    },
  });
  onvif.capabilities = response.getCapabilitiesResponse.capabilities as Capabilities;
  ['PTZ', 'media', 'imaging', 'events', 'device', 'analytics'].forEach((name) => {
    if (name in onvif.capabilities) {
      const capabilityName = name as keyof Capabilities;
      if ('XAddr' in onvif.capabilities[capabilityName]!) {
        onvif.uri[serviceUriKey(name)] = onvif.parseUrl(onvif.capabilities[capabilityName]!.XAddr as string);
      }
    }
  });
  if (onvif.capabilities.extension) {
    Object.keys(onvif.capabilities.extension).forEach((ext) => {
      const extensionName = ext as keyof CapabilitiesExtension;
      const extension = onvif.capabilities.extension![extensionName];
      if (extension && typeof extension === 'object' && 'XAddr' in extension && extension.XAddr) {
        // Same parseUrl path as core capabilities so preserveAddress rewrites host/port.
        onvif.uri[serviceUriKey(ext)] = onvif.parseUrl(extension.XAddr as string);
      }
    });
    if (onvif.uri.replay && !onvif.uri.recording) {
      const tempRecorderXaddr = onvif.uri.replay.href.replace('replay', 'recording');
      onvif.emit('warn', new OnvifError(`Adding ${tempRecorderXaddr} for bad Profile G device`));
      onvif.uri.recording = onvif.parseUrl(tempRecorderXaddr);
    }
  }
  return onvif.capabilities;
}

/**
 * Media1 GetProfiles — stores result on {@link Onvif.profiles}.
 */
export async function getMediaProfiles(onvif: Onvif): Promise<Profile[]> {
  const response = await serviceRequest(onvif, 'media', { GetProfiles: {} }, MEDIA_PROFILE_PARSE);
  onvif.profiles = (response as { getProfilesResponse: GetProfilesResponse }).getProfilesResponse.profiles ?? [];
  return onvif.profiles;
}

/**
 * Media1 GetVideoSources — stores result on {@link Onvif.videoSources}.
 * Media2 has no GetVideoSources; if Media1 is absent, empty, or fails and Media2 is available,
 * falls back to GetVideoSourceConfigurations and maps unique `sourceToken` values to {@link VideoSource}.
 */
export async function getVideoSources(onvif: Onvif): Promise<VideoSource[]> {
  let mediaError: unknown;

  if (onvif.uri.media) {
    try {
      const response = await serviceRequest(onvif, 'media', { GetVideoSources: {} }, { array: ['videoSources'] });
      onvif.videoSources = response.getVideoSourcesResponse.videoSources ?? [];
      if (onvif.videoSources.length > 0) {
        return onvif.videoSources;
      }
    } catch (error) {
      mediaError = error;
    }
  }

  if (onvif.media2Support && onvif.uri.media2) {
    try {
      onvif.videoSources = await getVideoSourcesFromMedia2(onvif);
      return onvif.videoSources;
    } catch (error) {
      if (mediaError !== undefined) {
        throw mediaError instanceof Error ? mediaError : new OnvifError(String(mediaError));
      }
      throw error;
    }
  }

  if (mediaError !== undefined) {
    throw mediaError instanceof Error ? mediaError : new OnvifError(String(mediaError));
  }

  onvif.videoSources ??= [];
  return onvif.videoSources;
}

/** Unique physical sources from Media2 VideoSourceConfiguration list. */
async function getVideoSourcesFromMedia2(onvif: Onvif): Promise<VideoSource[]> {
  const response = await serviceRequest(
    onvif,
    'media2',
    { GetVideoSourceConfigurations: {} },
    { array: ['configurations'] },
  );
  const configurations =
    (response.getVideoSourceConfigurationsResponse?.configurations as VideoSourceConfiguration[] | undefined) ?? [];
  return videoSourcesFromConfigurations(configurations);
}

function videoSourcesFromConfigurations(configurations: VideoSourceConfiguration[]): VideoSource[] {
  const sources = new Map<string, VideoSource>();
  for (const configuration of configurations) {
    const { sourceToken: token } = configuration;
    if (!token || sources.has(token)) {
      continue;
    }
    sources.set(token, {
      token,
      framerate: 0,
      resolution: {
        width: configuration.bounds?.width ?? 0,
        height: configuration.bounds?.height ?? 0,
      },
    });
  }
  return [...sources.values()];
}

/**
 * Media2 GetProfiles (Type=All).
 * Used as a capability probe (D-Link workaround) and as the profile source for Media2-only devices.
 * Returns profiles mapped to the Media1 {@link Profile} shape for {@link Onvif.profiles} / {@link getActiveSources}.
 */
export async function probeMedia2Profiles(onvif: Onvif): Promise<Profile[]> {
  const response = await serviceRequest(
    onvif,
    'media2',
    {
      GetProfiles: {
        Type: 'All',
      },
    },
    MEDIA2_PROFILE_PARSE,
  );
  const media2Profiles = (response.getProfilesResponse?.profiles as MediaProfile[]) ?? [];
  // A successful SOAP reply must keep media2Support; skip malformed entries instead of failing the probe.
  const mapped: Profile[] = [];
  for (const profile of media2Profiles) {
    if (!profile || typeof profile !== 'object' || !profile.token) {
      continue;
    }
    try {
      mapped.push(media2ProfileToMedia1(profile));
    } catch {
      // ignore individual bad profiles
    }
  }
  return mapped;
}

/** Flatten Media2 `configurations.*` into Media1 profile fields used by connect / active sources. */
export function media2ProfileToMedia1(profile: MediaProfile): Profile {
  const configurations = profile.configurations;
  const result: Profile = {
    token: profile.token,
    name: profile.name,
    fixed: profile.fixed,
  };
  if (configurations?.videoSource) {
    result.videoSourceConfiguration = configurations.videoSource;
  }
  if (configurations?.audioSource) {
    result.audioSourceConfiguration = configurations.audioSource;
  }
  if (configurations?.videoEncoder) {
    // Duck-compatible for ActiveSource (encoding, resolution, rateControl).
    result.videoEncoderConfiguration = configurations.videoEncoder as unknown as VideoEncoderConfiguration;
  }
  if (configurations?.analytics) {
    result.videoAnalyticsConfiguration = configurations.analytics;
  }
  if (configurations?.PTZ) {
    result.PTZConfiguration = configurations.PTZ;
  }
  if (configurations?.metadata) {
    result.metadataConfiguration = configurations.metadata;
  }
  if (configurations?.audioOutput || configurations?.audioDecoder) {
    result.extension = {
      audioOutputConfiguration: configurations.audioOutput,
      audioDecoderConfiguration: configurations.audioDecoder,
    };
  }
  return result;
}

/**
 * Check and find out video configuration for device.
 * No-op when the device has no video sources (e.g. Profile C door stations).
 * Always resets prior {@link Onvif.activeSources} / defaults so a reconnect with fewer
 * sources cannot leave stale slots from the previous session.
 */
export async function getActiveSources(onvif: Onvif): Promise<void> {
  onvif.activeSources = [];
  onvif.defaultProfiles = [];
  onvif.activeSource = undefined;
  onvif.defaultProfile = undefined;

  if (!onvif.videoSources.length) {
    return;
  }

  onvif.videoSources.forEach(({ token: videoSrcToken }, idx) => {
    let appropriateProfiles = onvif.profiles.filter(
      (profile) =>
        profile.videoSourceConfiguration?.sourceToken === videoSrcToken &&
        profile.videoEncoderConfiguration !== undefined,
    );

    if (appropriateProfiles.length === 0) {
      appropriateProfiles = onvif.profiles.filter((profile) => profile.videoEncoderConfiguration !== undefined);
    }
    if (appropriateProfiles.length === 0) {
      appropriateProfiles = [...onvif.profiles];
    }
    if (appropriateProfiles.length === 0) {
      if (idx === 0) {
        onvif.emit(
          'warn',
          new OnvifValidationError('Unrecognized configuration: no media profiles available for video sources'),
        );
      }
      return;
    }

    if (idx === 0) {
      [onvif.defaultProfile] = appropriateProfiles;
    }

    [onvif.defaultProfiles[idx]] = appropriateProfiles;

    onvif.activeSources[idx] = {
      sourceToken: videoSrcToken,
      profileToken: onvif.defaultProfiles[idx].token,
      videoSourceConfigurationToken: onvif.defaultProfiles[idx].videoSourceConfiguration?.token ?? videoSrcToken,
      videoSourceToken: videoSrcToken,
    };
    if (onvif.defaultProfiles[idx].videoEncoderConfiguration) {
      const configuration = onvif.defaultProfiles[idx].videoEncoderConfiguration;
      onvif.activeSources[idx].encoding = configuration?.encoding;
      onvif.activeSources[idx].width = configuration?.resolution?.width;
      onvif.activeSources[idx].height = configuration?.resolution?.height;
      onvif.activeSources[idx].fps = configuration?.rateControl?.frameRateLimit;
      onvif.activeSources[idx].bitrate = configuration?.rateControl?.bitrateLimit;
    }

    if (idx === 0) {
      onvif.activeSource = onvif.activeSources[idx];
    }

    if (onvif.defaultProfiles[idx].PTZConfiguration) {
      onvif.activeSources[idx].ptz = {
        name: onvif.defaultProfiles[idx].PTZConfiguration!.name as string,
        token: onvif.defaultProfiles[idx].PTZConfiguration!.token,
      };
    }
  });
}

/** Options for {@link connect}. */
export interface ConnectOptions {
  /**
   * When `false`, skip Media1/Media2 profile and video-source discovery (and the Media2 probe).
   * Still syncs time and fills `services` / `uri` from GetServices (or GetCapabilities).
   * Useful for access-control / door / mass-scan where streams are not needed.
   * @default true
   */
  media?: boolean;
}

/**
 * Connect to the camera and fill device information properties.
 * Media / active-source discovery runs when Media1 and/or Media2 was advertised
 * (unless {@link ConnectOptions.media} is `false`).
 */
export async function connect(onvif: Onvif, { media = true }: ConnectOptions = {}): Promise<Onvif> {
  await onvif.getSystemDateAndTime();
  try {
    await connectSteps.getServices(onvif);
  } catch {
    await connectSteps.getCapabilities(onvif);
  }

  if (media) {
    let media2Profiles: Profile[] | undefined;
    // D-Link DCS-8635LH (and similar): GetServices advertises Media2 but Media2 GetProfiles fails.
    if (onvif.media2Support && onvif.uri.media2) {
      try {
        media2Profiles = await connectSteps.probeMedia2Profiles(onvif);
      } catch {
        onvif.media2Support = false;
      }
    }

    // Profile C / doorcontrol / etc. may advertise no Media service at all.
    // Some devices (e.g. Axis A1601) still list Media in GetServices but reject
    // GetProfiles / GetVideoSources with "Optional action not implemented".
    // If Media1 fails but Media2 probe already succeeded, fall back to Media2 (Profile T).
    if (onvif.uri.media) {
      try {
        await Promise.all([connectSteps.getMediaProfiles(onvif), connectSteps.getVideoSources(onvif)]);
      } catch (error) {
        onvif.profiles = [];
        onvif.videoSources = [];
        if (onvif.media2Support && onvif.uri.media2) {
          try {
            onvif.profiles = media2Profiles ?? (await connectSteps.probeMedia2Profiles(onvif));
            await connectSteps.getVideoSources(onvif);
          } catch {
            onvif.profiles = [];
            onvif.videoSources = [];
          }
        }
        onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
      }
      await connectSteps.getActiveSources(onvif);
    } else if (onvif.media2Support && onvif.uri.media2) {
      // Media2-only (no Media1): reuse probed profiles; discover video sources via Media2.
      try {
        onvif.profiles = media2Profiles ?? (await connectSteps.probeMedia2Profiles(onvif));
        await connectSteps.getVideoSources(onvif);
      } catch (error) {
        onvif.profiles = [];
        onvif.videoSources = [];
        onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
      }
      await connectSteps.getActiveSources(onvif);
    }
  }

  onvif.emit('connect');
  return onvif;
}

/** Mutable step map so unit tests can spy without fighting CJS local bindings. */
export const connectSteps = {
  getServices,
  getCapabilities,
  getMediaProfiles,
  getVideoSources,
  probeMedia2Profiles,
  getActiveSources,
};
