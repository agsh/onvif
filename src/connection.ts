/**
 * Connection for {@link Onvif}.
 * SOAP used by {@link connect} lives here so `device` / `media` / `media2` modules are not loaded.
 */

import type { Onvif, OnvifServices } from './onvif';
import type { Capabilities, CapabilitiesExtension, Profile, VideoSource, VideoSourceConfiguration } from './interfaces/onvif';
import type {
  GetCapabilities,
  GetServices,
  GetServicesResponse,
  Service as DeviceService,
} from './interfaces/devicemgmt';
import type { GetProfilesResponse } from './interfaces/media';
import type { LineraseOptions } from './utils';
import { XMLNS } from './service';

/** Same array/rawXML hints as Media.getProfiles for linerase. */
const MEDIA_PROFILE_PARSE: LineraseOptions = {
  array: ['configurations', 'analyticsModule', 'rule', 'simpleItem', 'elementItem'],
  rawXML: ['elementItem', 'subscriptionPolicy', 'filter'],
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
 * Returns information about services of the device (Device.GetServices).
 */
export async function getServices(
  onvif: Onvif,
  { includeCapability }: GetServices = { includeCapability: true },
): Promise<GetServicesResponse> {
  const response = await serviceRequest(onvif, 'device', {
    GetServices: {
      IncludeCapability: includeCapability,
    },
  });
  const result = response.getServicesResponse as GetServicesResponse;
  onvif.services = result.service ?? [];
  // ONVIF Profile T introduced Media2 (ver20) so cameras from around 2020/2021 will have
  // two media entries in the ServicesResponse, one for Media (ver10/media) and one for Media2 (ver20/media)
  onvif.services.forEach((service: DeviceService) => {
    if (
      Object.prototype.hasOwnProperty.call(service, 'namespace') &&
      Object.prototype.hasOwnProperty.call(service, 'XAddr')
    ) {
      if (!service.namespace || !service.XAddr) {
        return;
      }
      const parsedNamespace = new URL(service.namespace);
      if (parsedNamespace.hostname === 'www.onvif.org' && parsedNamespace.pathname) {
        const namespaceSplitted = parsedNamespace.pathname.substring(1).split('/');
        if (namespaceSplitted[1] === 'media' && namespaceSplitted[0] === 'ver20') {
          onvif.media2Support = true;
          namespaceSplitted[1] = 'media2';
        } else if (namespaceSplitted[1] === 'ptz') {
          namespaceSplitted[1] = 'PTZ';
        }
        onvif.uri[namespaceSplitted[1] as keyof OnvifServices] = onvif.parseUrl(service.XAddr);
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
        onvif.uri[name as keyof OnvifServices] = onvif.parseUrl(onvif.capabilities[capabilityName]!.XAddr as string);
      }
    }
  });
  if (onvif.capabilities.extension) {
    Object.keys(onvif.capabilities.extension).forEach((ext) => {
      const extensionName = ext as keyof CapabilitiesExtension;
      if (
        'XAddr' in onvif.capabilities.extension![extensionName]! &&
        onvif.capabilities.extension![extensionName]!.XAddr
      ) {
        onvif.uri[extensionName] = new URL(onvif.capabilities.extension![extensionName]!.XAddr as string);
      }
    });
    if (onvif.uri.replay && !onvif.uri.recording) {
      const tempRecorderXaddr = onvif.uri.replay.href.replace('replay', 'recording');
      onvif.emit('warn', new Error(`Adding ${tempRecorderXaddr} for bad Profile G device`));
      onvif.uri.recording = new URL(tempRecorderXaddr);
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
        throw mediaError instanceof Error ? mediaError : new Error(String(mediaError));
      }
      throw error;
    }
  }

  if (mediaError !== undefined) {
    throw mediaError instanceof Error ? mediaError : new Error(String(mediaError));
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

/** Probe Media2 GetProfiles (D-Link workaround); does not keep the result. */
export async function probeMedia2Profiles(onvif: Onvif): Promise<void> {
  await serviceRequest(
    onvif,
    'media2',
    {
      GetProfiles: {
        Type: 'All',
      },
    },
    { array: ['profiles'] },
  );
}

/**
 * Check and find out video configuration for device.
 * No-op when the device has no video sources (e.g. Profile C door stations).
 */
export async function getActiveSources(onvif: Onvif): Promise<void> {
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
        onvif.emit('warn', new Error('Unrecognized configuration: no media profiles available for video sources'));
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

/**
 * Connect to the camera and fill device information properties.
 * Media / active-source discovery runs only when a Media service was advertised.
 */
export async function connect(onvif: Onvif): Promise<Onvif> {
  await onvif.getSystemDateAndTime();
  try {
    await connectSteps.getServices(onvif);
  } catch {
    await connectSteps.getCapabilities(onvif);
  }
  // D-Link DCS-8635LH (and similar): GetServices advertises Media2 but Media2 GetProfiles fails.
  if (onvif.media2Support && onvif.uri.media2) {
    try {
      await connectSteps.probeMedia2Profiles(onvif);
    } catch {
      onvif.media2Support = false;
    }
  }
  // Profile C / doorcontrol / etc. may advertise no Media service at all.
  // Some devices (e.g. Axis A1601) still list Media in GetServices but reject
  // GetProfiles / GetVideoSources with "Optional action not implemented".
  // Both calls are required for active sources; if either fails, drop media state.
  if (onvif.uri.media) {
    try {
      await Promise.all([connectSteps.getMediaProfiles(onvif), connectSteps.getVideoSources(onvif)]);
    } catch (error) {
      onvif.profiles = [];
      onvif.videoSources = [];
      onvif.emit('warn', error instanceof Error ? error : new Error(String(error)));
    }
    await connectSteps.getActiveSources(onvif);
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
