/**
 * Connection for {@link Onvif}.
 * SOAP used by {@link connect} lives here so `device` / `media` / `media2` modules are not loaded.
 */

import type { ActiveMediaProfile, Onvif, OnvifServices } from './onvif';
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
  Service as DeviceService,
} from './interfaces/devicemgmt';
import type { GetProfilesResponse } from './interfaces/media';
import type { MediaProfile } from './interfaces/media.2';
import type { ReferenceToken } from './interfaces/common';
import { OnvifError, OnvifValidationError } from './utils/errors';
import { MEDIA_NESTED_PARSE, type LineraseOptions } from './utils/linerase';
import { XMLNS } from './service';

/** Media1 GetProfiles - `Profiles` unbounded; nested configs are single entities. */
const MEDIA_PROFILE_PARSE: LineraseOptions = {
  array: ['profiles', ...MEDIA_NESTED_PARSE.array],
  rawXML: MEDIA_NESTED_PARSE.rawXML,
};

/**
 * Media2 GetProfiles - `Profiles` unbounded; `Configurations` is one ConfigurationSet (object).
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

/** Vendor extensions often send a bare token (e.g. `GenetecPtzPatterns`) instead of an absolute URI. */
function parseServiceNamespace(namespace: string): URL | undefined {
  try {
    return new URL(namespace);
  } catch {
    return undefined;
  }
}

/**
 * Returns information about services of the device (Device.GetServices).
 * Defaults to `IncludeCapability: false` - XAddrs / namespaces are enough for
 * {@link connect}; pass `{ includeCapability: true }` when capability blocks are needed.
 */
export async function getServices(
  onvif: Onvif,
  { includeCapability }: GetServices = { includeCapability: false },
): Promise<DeviceService[]> {
  const response = await serviceRequest(onvif, 'device', {
    GetServices: { IncludeCapability: includeCapability },
  });
  onvif.services = response.getServicesResponse?.service ?? [];
  // ONVIF Profile T introduced Media2 (ver20) so cameras from around 2020/2021 will have
  // two media entries in the ServicesResponse, one for Media (ver10/media) and one for Media2 (ver20/media)
  onvif.services.forEach((service: DeviceService) => {
    if (service.namespace && service.XAddr) {
      const parsedNamespace = parseServiceNamespace(service.namespace);
      if (parsedNamespace?.hostname === 'www.onvif.org' && parsedNamespace.pathname) {
        const namespaceSplitted = parsedNamespace.pathname.substring(1).split('/');
        if (namespaceSplitted[1] === 'media' && namespaceSplitted[0] === 'ver20') {
          onvif.media2Support = true;
          namespaceSplitted[1] = 'media2';
        }
        // Namespace path segment matches OnvifServices keys (ptz, media, deviceIO, ...).
        onvif.uri[serviceUriKey(namespaceSplitted[1])] = onvif.parseUrl(service.XAddr);
      }
    }
  });
  return onvif.services;
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
 * Media1 GetProfiles - stores result on {@link Onvif.profiles}.
 */
export async function getMediaProfiles(onvif: Onvif): Promise<Profile[]> {
  const response = await serviceRequest(onvif, 'media', { GetProfiles: {} }, MEDIA_PROFILE_PARSE);
  onvif.profiles = (response as { getProfilesResponse: GetProfilesResponse }).getProfilesResponse.profiles ?? [];
  return onvif.profiles;
}

/**
 * Media1 GetVideoSources - stores result on {@link Onvif.videoSources}.
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
 * Used as Media1 fallback / Media2-only profile source (not called when Media1 succeeds).
 * Returns profiles mapped to the Media1 {@link Profile} shape for {@link Onvif.profiles} / {@link getActiveMediaProfiles}.
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
    result.videoEncoderConfiguration = configurations.videoEncoder as unknown as VideoEncoderConfiguration;
  }
  if (configurations?.audioEncoder) {
    result.audioEncoderConfiguration = configurations.audioEncoder as unknown as Profile['audioEncoderConfiguration'];
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

/** Clear {@link Onvif.activeMediaProfiles} and default profile pointers. */
function resetActiveMediaProfileState(onvif: Onvif): void {
  onvif.activeMediaProfiles = [];
  onvif.defaultProfiles = [];
  onvif.activeMediaProfile = undefined;
  onvif.defaultProfile = undefined;
}

/**
 * Build a token bag from a Media {@link Profile}.
 * @throws {@link OnvifValidationError} when the profile has no video source token
 */
export function activeMediaProfileFromProfile(profile: Profile, videoSourceToken?: ReferenceToken): ActiveMediaProfile {
  const sourceToken = videoSourceToken ?? profile.videoSourceConfiguration?.sourceToken;
  if (!sourceToken) {
    throw new OnvifValidationError(`Profile "${profile.token}" has no VideoSourceConfiguration.sourceToken`);
  }
  return {
    sourceToken,
    profileToken: profile.token,
    videoSourceConfigurationToken: profile.videoSourceConfiguration?.token ?? sourceToken,
    videoSourceToken: sourceToken,
    videoEncoderConfigurationToken: profile.videoEncoderConfiguration?.token,
    audioSourceConfigurationToken: profile.audioSourceConfiguration?.token,
    audioEncoderConfigurationToken: profile.audioEncoderConfiguration?.token,
    videoAnalyticsConfigurationToken: profile.videoAnalyticsConfiguration?.token,
    metadataConfigurationToken: profile.metadataConfiguration?.token,
    audioOutputConfigurationToken: profile.extension?.audioOutputConfiguration?.token,
    audioDecoderConfigurationToken: profile.extension?.audioDecoderConfiguration?.token,
    ptzConfigurationToken: profile.PTZConfiguration?.token,
  };
}

/**
 * Select the Media Profile whose tokens become defaults for service methods.
 * Updates {@link Onvif.activeMediaProfile}, {@link Onvif.defaultProfile}, and the
 * matching slot in {@link Onvif.activeMediaProfiles} / {@link Onvif.defaultProfiles}.
 *
 * @param profileToken must exist on {@link Onvif.profiles} (from connect / GetProfiles)
 * @throws {@link OnvifValidationError} when the token is unknown, the profile lacks a
 *   video source, or (when video sources were loaded) the source is not on the device
 */
export function setActiveMediaProfile(onvif: Onvif, profileToken: ReferenceToken): ActiveMediaProfile {
  if (profileToken === undefined || profileToken === '') {
    throw new OnvifValidationError('profileToken is required');
  }

  const profile = onvif.profiles.find((p) => p.token === profileToken);
  if (!profile) {
    throw new OnvifValidationError(`Unknown media profile token: ${profileToken}`);
  }

  const bag = activeMediaProfileFromProfile(profile);

  if (onvif.videoSources.length > 0 && !onvif.videoSources.some((vs) => vs.token === bag.videoSourceToken)) {
    throw new OnvifValidationError(
      `Profile "${profileToken}" references unknown video source "${bag.videoSourceToken}"`,
    );
  }

  onvif.activeMediaProfile = bag;
  onvif.defaultProfile = profile;

  const idx = onvif.activeMediaProfiles.findIndex((amp) => amp.videoSourceToken === bag.videoSourceToken);
  if (idx >= 0) {
    onvif.activeMediaProfiles[idx] = bag;
    onvif.defaultProfiles[idx] = profile;
  } else if (onvif.activeMediaProfiles.length === 0) {
    onvif.activeMediaProfiles[0] = bag;
    onvif.defaultProfiles[0] = profile;
  } else {
    onvif.activeMediaProfiles.push(bag);
    onvif.defaultProfiles.push(profile);
  }

  return bag;
}

/**
 * Pick Media Profiles for one video source.
 *
 * Order:
 * 1. same `sourceToken` + `videoEncoderConfiguration`
 * 2. same `sourceToken` (encoder optional; HikVision NVR stubs, etc.)
 * 3. single-source last resort only: any encoder profile, else any profile
 *
 * Multi-source devices never borrow another source's profile (avoids wrong-channel defaults).
 */
export function profilesForVideoSource(
  profiles: Profile[],
  videoSrcToken: ReferenceToken,
  singleSource: boolean,
): Profile[] {
  const sameSource = profiles.filter((profile) => profile.videoSourceConfiguration?.sourceToken === videoSrcToken);
  const sameWithEncoder = sameSource.filter((profile) => profile.videoEncoderConfiguration !== undefined);
  if (sameWithEncoder.length > 0) {
    return sameWithEncoder;
  }
  if (sameSource.length > 0) {
    return sameSource;
  }
  if (!singleSource) {
    return [];
  }
  const anyEncoder = profiles.filter((profile) => profile.videoEncoderConfiguration !== undefined);
  if (anyEncoder.length > 0) {
    return anyEncoder;
  }
  return [...profiles];
}

/**
 * Pick process-wide defaults from index-aligned bags.
 * Prefer the first bag that has a video encoder; else the first mapped slot.
 */
export function selectDefaultActiveMediaProfile(
  activeMediaProfiles: ActiveMediaProfile[],
  defaultProfiles: Profile[],
): { bag?: ActiveMediaProfile; profile?: Profile } {
  for (let idx = 0; idx < activeMediaProfiles.length; idx += 1) {
    const bag = activeMediaProfiles[idx];
    if (bag?.videoEncoderConfigurationToken) {
      return { bag, profile: defaultProfiles[idx] };
    }
  }
  for (let idx = 0; idx < activeMediaProfiles.length; idx += 1) {
    const bag = activeMediaProfiles[idx];
    if (bag) {
      return { bag, profile: defaultProfiles[idx] };
    }
  }
  return {};
}

/**
 * Build {@link Onvif.activeMediaProfiles} from video sources + media profiles.
 * No-op when the device has no video sources (e.g. Profile C door stations).
 * Always resets prior state so a reconnect with fewer sources cannot leave stale slots.
 *
 * Slots stay index-aligned with {@link Onvif.videoSources}. Unmatched sources leave a hole.
 * {@link Onvif.activeMediaProfile} / {@link Onvif.defaultProfile} prefer the first bag with a
 * video encoder; otherwise the first successfully mapped slot.
 */
export async function getActiveMediaProfiles(onvif: Onvif): Promise<void> {
  resetActiveMediaProfileState(onvif);

  if (!onvif.videoSources.length) {
    return;
  }

  const singleSource = onvif.videoSources.length === 1;
  let mappedAny = false;

  onvif.videoSources.forEach(({ token: videoSrcToken }, idx) => {
    const appropriateProfiles = profilesForVideoSource(onvif.profiles, videoSrcToken, singleSource);
    if (appropriateProfiles.length === 0) {
      return;
    }

    const profile = appropriateProfiles[0];
    let bag: ActiveMediaProfile;
    try {
      // Bag tokens always come from the chosen profile (no forced videoSrcToken override).
      bag = activeMediaProfileFromProfile(profile);
    } catch (error) {
      if (!mappedAny) {
        onvif.emit('warn', error instanceof Error ? error : new OnvifValidationError(String(error)));
      }
      return;
    }

    onvif.defaultProfiles[idx] = profile;
    onvif.activeMediaProfiles[idx] = bag;
    mappedAny = true;
  });

  if (!mappedAny) {
    onvif.emit(
      'warn',
      new OnvifValidationError('Unrecognized configuration: no media profiles available for video sources'),
    );
    return;
  }

  const selected = selectDefaultActiveMediaProfile(onvif.activeMediaProfiles, onvif.defaultProfiles);
  onvif.activeMediaProfile = selected.bag;
  onvif.defaultProfile = selected.profile;
}

/** @deprecated Use {@link getActiveMediaProfiles}. */
export async function getActiveSources(onvif: Onvif): Promise<void> {
  return getActiveMediaProfiles(onvif);
}

/** Options for {@link connect}. */
export interface ConnectOptions {
  /**
   * When `false`, skip Media1/Media2 profile and video-source discovery.
   * Still syncs time and fills `services` / `uri` from GetServices (or GetCapabilities).
   * Useful for access-control / door / mass-scan where streams are not needed.
   *
   * When omitted, uses {@link Onvif.defaultMedia} (`true` unless the constructor set otherwise).
   * Explicit `true` / `false` always wins.
   */
  media?: boolean;
}

/**
 * Drop discovery state left from a previous {@link connect} so disappeared services
 * (e.g. PTZ after reboot) cannot leave stale {@link Onvif.uri} keys / flags.
 */
export function resetConnectState(onvif: Onvif): void {
  onvif.uri = {};
  onvif.services = [];
  onvif.media2Support = false;
  onvif.capabilities = {};
  onvif.profiles = [];
  onvif.videoSources = [];
  onvif.deviceInformation = undefined;
  onvif.activeDoorToken = undefined;
  onvif.activeAccessPointToken = undefined;
  onvif.activeRecordingToken = undefined;
  onvif.activeRecordingJobToken = undefined;
  onvif.activeRelayOutputToken = undefined;
  resetActiveMediaProfileState(onvif);
}

/** Assign a non-empty active entity token or throw. */
export function setActiveEntityToken(
  onvif: Onvif,
  field:
    | 'activeDoorToken'
    | 'activeAccessPointToken'
    | 'activeRecordingToken'
    | 'activeRecordingJobToken'
    | 'activeRelayOutputToken',
  token: ReferenceToken,
  label: string,
): ReferenceToken {
  if (token === undefined || token === '') {
    throw new OnvifValidationError(`${label} is required`);
  }
  onvif[field] = token;
  return token;
}

/**
 * Set {@link Onvif.activeDoorToken} used when DoorControl methods omit `token`.
 * @throws {@link OnvifValidationError} when the token is empty
 */
export function setActiveDoor(onvif: Onvif, token: ReferenceToken): ReferenceToken {
  return setActiveEntityToken(onvif, 'activeDoorToken', token, 'door token');
}

/**
 * Pick the first DoorControl door as {@link Onvif.activeDoorToken}.
 * No-op when the device has no DoorControl XAddr.
 * Uses `GetDoorInfoList` with `limit: 1` (loads the DoorControl module once).
 */
export async function getActiveDoor(onvif: Onvif): Promise<void> {
  onvif.activeDoorToken = undefined;
  if (!onvif.uri.doorcontrol) {
    return;
  }
  try {
    const list = await onvif.doorControl.getDoorInfoList({ limit: 1 });
    const token = list.doorInfo?.[0]?.token;
    if (token) {
      onvif.activeDoorToken = token;
    }
  } catch (error) {
    onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
  }
}

/**
 * Set {@link Onvif.activeAccessPointToken} used when AccessControl methods omit `token`.
 * @throws {@link OnvifValidationError} when the token is empty
 */
export function setActiveAccessPoint(onvif: Onvif, token: ReferenceToken): ReferenceToken {
  return setActiveEntityToken(onvif, 'activeAccessPointToken', token, 'access point token');
}

/**
 * Pick the first AccessControl access point as {@link Onvif.activeAccessPointToken}.
 * No-op when AccessControl is not advertised.
 */
export async function getActiveAccessPoint(onvif: Onvif): Promise<void> {
  onvif.activeAccessPointToken = undefined;
  if (!onvif.uri.accesscontrol) {
    return;
  }
  try {
    const list = await onvif.accessControl.getAccessPointInfoList({ limit: 1 });
    const token = list.accessPointInfo?.[0]?.token;
    if (token) {
      onvif.activeAccessPointToken = token;
    }
  } catch (error) {
    onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
  }
}

/**
 * Set {@link Onvif.activeRecordingToken} used when Recording / Replay / Search omit `recordingToken`.
 * @throws {@link OnvifValidationError} when the token is empty
 */
export function setActiveRecording(onvif: Onvif, token: ReferenceToken): ReferenceToken {
  return setActiveEntityToken(onvif, 'activeRecordingToken', token, 'recording token');
}

/**
 * Set {@link Onvif.activeRecordingJobToken} used when Recording job methods omit `jobToken`.
 * @throws {@link OnvifValidationError} when the token is empty
 */
export function setActiveRecordingJob(onvif: Onvif, token: ReferenceToken): ReferenceToken {
  return setActiveEntityToken(onvif, 'activeRecordingJobToken', token, 'recording job token');
}

/**
 * Pick first recording + first job tokens when Recording is advertised.
 */
export async function getActiveRecording(onvif: Onvif): Promise<void> {
  onvif.activeRecordingToken = undefined;
  onvif.activeRecordingJobToken = undefined;
  if (!onvif.uri.recording) {
    return;
  }
  try {
    const [recordings, jobs] = await Promise.all([
      onvif.recording.getRecordings(),
      onvif.recording.getRecordingJobs(),
    ]);
    const recordingToken = recordings[0]?.recordingToken;
    if (recordingToken) {
      onvif.activeRecordingToken = recordingToken;
    }
    const jobToken = jobs[0]?.jobToken;
    if (jobToken) {
      onvif.activeRecordingJobToken = jobToken;
    }
  } catch (error) {
    onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
  }
}

/**
 * Set {@link Onvif.activeRelayOutputToken} used when DeviceIO relay methods require a token.
 * @throws {@link OnvifValidationError} when the token is empty
 */
export function setActiveRelayOutput(onvif: Onvif, token: ReferenceToken): ReferenceToken {
  return setActiveEntityToken(onvif, 'activeRelayOutputToken', token, 'relay output token');
}

/**
 * Pick the first DeviceIO relay output as {@link Onvif.activeRelayOutputToken}.
 * No-op when DeviceIO is not advertised.
 */
export async function getActiveRelayOutput(onvif: Onvif): Promise<void> {
  onvif.activeRelayOutputToken = undefined;
  if (!onvif.uri.deviceIO) {
    return;
  }
  try {
    const relays = await onvif.deviceIO.getRelayOutputs();
    const token = relays[0]?.token;
    if (token) {
      onvif.activeRelayOutputToken = token;
    }
  } catch (error) {
    onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
  }
}

/**
 * Probe Door / AccessPoint / Recording / Relay defaults in parallel (each no-ops without XAddr).
 */
export async function getActiveEntityTokens(onvif: Onvif): Promise<void> {
  await Promise.all([
    connectSteps.getActiveDoor(onvif),
    connectSteps.getActiveAccessPoint(onvif),
    connectSteps.getActiveRecording(onvif),
    connectSteps.getActiveRelayOutput(onvif),
  ]);
}

/**
 * Connect to the camera and fill device information properties.
 * Media / activeMediaProfile discovery runs when Media1 and/or Media2 was advertised
 * (unless {@link ConnectOptions.media} is `false`).
 * When `media` is omitted, uses {@link Onvif.defaultMedia}.
 * Always clears prior discovery state first (see {@link resetConnectState}).
 */
export async function connect(onvif: Onvif, options: ConnectOptions = {}): Promise<Onvif> {
  const media = options.media ?? onvif.defaultMedia;
  resetConnectState(onvif);
  await onvif.getSystemDateAndTime();
  try {
    await connectSteps.getServices(onvif);
  } catch {
    await connectSteps.getCapabilities(onvif);
  }

  if (media) {
    // Prefer Media1. Probe Media2 only when Media1 is absent or fails
    // (D-Link / Axis quirks; Profile T Media2-only devices).
    if (onvif.uri.media) {
      try {
        await Promise.all([connectSteps.getMediaProfiles(onvif), connectSteps.getVideoSources(onvif)]);
      } catch (error) {
        onvif.profiles = [];
        onvif.videoSources = [];
        if (onvif.media2Support && onvif.uri.media2) {
          try {
            onvif.profiles = await connectSteps.probeMedia2Profiles(onvif);
          } catch {
            onvif.media2Support = false;
          }
          if (onvif.media2Support) {
            try {
              await connectSteps.getVideoSources(onvif);
            } catch {
              onvif.profiles = [];
              onvif.videoSources = [];
            }
          }
        }
        onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
      }
      await connectSteps.getActiveMediaProfiles(onvif);
    } else if (onvif.media2Support && onvif.uri.media2) {
      // Media2-only (no Media1 XAddr).
      try {
        onvif.profiles = await connectSteps.probeMedia2Profiles(onvif);
      } catch {
        onvif.media2Support = false;
        onvif.profiles = [];
        onvif.videoSources = [];
      }
      if (onvif.media2Support) {
        try {
          await connectSteps.getVideoSources(onvif);
        } catch (error) {
          onvif.profiles = [];
          onvif.videoSources = [];
          onvif.emit('warn', error instanceof Error ? error : new OnvifError(String(error)));
        }
        await connectSteps.getActiveMediaProfiles(onvif);
      }
    }
  }

  // PACS / recording / IO: cheap list probes so omit-token calls work after connect.
  await connectSteps.getActiveEntityTokens(onvif);

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
  getActiveMediaProfiles,
  getActiveSources,
  setActiveMediaProfile,
  getActiveDoor,
  setActiveDoor,
  getActiveAccessPoint,
  setActiveAccessPoint,
  getActiveRecording,
  setActiveRecording,
  setActiveRecordingJob,
  getActiveRelayOutput,
  setActiveRelayOutput,
  getActiveEntityTokens,
};
