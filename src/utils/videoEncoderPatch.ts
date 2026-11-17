import type { IntRange, ReferenceToken } from '../interfaces/common';
import type {
  H264Options,
  H264Profile,
  JpegOptions,
  Mpeg4Options,
  Mpeg4Profile,
  VideoEncoder2Configuration,
  VideoEncoder2ConfigurationOptions,
  VideoEncoderConfiguration,
  VideoEncoderConfigurationOptions,
  VideoEncoding,
  VideoResolution,
  VideoResolution2,
} from '../interfaces/onvif';
import { OnvifValidationError } from './errors';

/** Partial resolution; omitted axes keep the current Get value. */
export type VideoEncoderResolutionPatch = {
  width?: number;
  height?: number;
};

/**
 * Patch for Media 1.0 Get -> merge -> Set sugar.
 * Only defined fields overwrite the fetched configuration.
 * Changing `encoding` requires GetVideoEncoderConfigurationOptions (fetched by the service).
 */
export interface UpdateVideoEncoderConfiguration {
  /** Defaults to {@link Onvif.activeMediaProfile}.videoEncoderConfigurationToken. */
  configurationToken?: ReferenceToken;
  encoding?: VideoEncoding;
  resolution?: VideoEncoderResolutionPatch;
  quality?: number;
  frameRateLimit?: number;
  encodingInterval?: number;
  bitrateLimit?: number;
  /** Applied when the config has `H264` / `MPEG4` (or after an encoding switch). */
  govLength?: number;
  /** H.264 or MPEG-4 profile; used when that codec bag is present or being created. */
  profile?: H264Profile | Mpeg4Profile | string;
  /**
   * ForcePersistence on Set. ONVIF marks the flag obsolete (assume true); default `true`.
   */
  forcePersistence?: boolean;
}

/**
 * Patch for Media 2.0 Get -> merge -> Set sugar.
 * `encoding` is the Media2 mime / subtype string (e.g. `H264`, `H265`).
 * Changing `encoding` requires matching GetVideoEncoderConfigurationOptions entry.
 */
export interface UpdateVideoEncoder2Configuration {
  /** Defaults to {@link Onvif.activeMediaProfile}.videoEncoderConfigurationToken. */
  configurationToken?: ReferenceToken;
  encoding?: string;
  resolution?: VideoEncoderResolutionPatch;
  quality?: number;
  frameRateLimit?: number;
  bitrateLimit?: number;
  constantBitRate?: boolean;
  govLength?: number;
  profile?: string;
}

type Media1CodecOptions = JpegOptions | Mpeg4Options | H264Options;

function mergeResolution<T extends VideoResolution | VideoResolution2>(
  current: T,
  patch: VideoEncoderResolutionPatch | undefined,
): T {
  if (patch === undefined) {
    return current;
  }
  return {
    ...current,
    width: patch.width ?? current.width,
    height: patch.height ?? current.height,
  };
}

function clampToRange(value: number, range: IntRange | undefined): number {
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') {
    return value;
  }
  if (value < range.min) {
    return range.min;
  }
  if (value > range.max) {
    return range.max;
  }
  return value;
}

/** Normalize space-separated StringAttrList / IntList quirks from device XML. */
function asStringList(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => asStringList(item));
  }
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean);
  }
  return [String(value)];
}

function asNumberList(value: unknown): number[] {
  return asStringList(value)
    .map((item) => Number(item))
    .filter((n) => Number.isFinite(n));
}

function intListAsRange(value: unknown): IntRange | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const range = value as IntRange;
    if (typeof range.min === 'number' && typeof range.max === 'number') {
      return range;
    }
  }
  const list = asNumberList(value);
  if (list.length >= 2) {
    return { min: Math.min(list[0], list[1]), max: Math.max(list[0], list[1]) };
  }
  return undefined;
}

function sameResolution(a: VideoResolution | VideoResolution2, b: VideoResolution | VideoResolution2): boolean {
  return a.width === b.width && a.height === b.height;
}

function pickResolution<T extends VideoResolution | VideoResolution2>(
  current: T,
  available: T[] | undefined,
): T {
  if (!available?.length) {
    return current;
  }
  if (available.some((item) => sameResolution(item, current))) {
    return current;
  }
  return available[0];
}

function currentGovLength(cfg: VideoEncoderConfiguration): number | undefined {
  return cfg.H264?.govLength ?? cfg.MPEG4?.govLength;
}

function resolveMedia1CodecOptions(
  options: VideoEncoderConfigurationOptions,
  encoding: VideoEncoding,
): Media1CodecOptions {
  const top =
    encoding === 'H264' ? options.H264 : encoding === 'MPEG4' ? options.MPEG4 : options.JPEG;
  const ext =
    encoding === 'H264'
      ? options.extension?.H264
      : encoding === 'MPEG4'
        ? options.extension?.MPEG4
        : options.extension?.JPEG;
  const codec = top ?? ext;
  if (!codec) {
    throw new OnvifValidationError(
      `Video encoding "${encoding}" is not reported in GetVideoEncoderConfigurationOptions`,
    );
  }
  return codec;
}

function bitrateRangeOf(codec: Media1CodecOptions): IntRange | undefined {
  return 'bitrateRange' in codec ? (codec as { bitrateRange?: IntRange }).bitrateRange : undefined;
}

function applyMedia1RateAndQuality(
  cfg: VideoEncoderConfiguration,
  patch: UpdateVideoEncoderConfiguration,
  codec: Media1CodecOptions | undefined,
  qualityRange: IntRange | undefined,
): void {
  if (patch.quality !== undefined) {
    cfg.quality = clampToRange(patch.quality, qualityRange);
  } else if (qualityRange) {
    cfg.quality = clampToRange(cfg.quality, qualityRange);
  }

  const touchRate =
    patch.frameRateLimit !== undefined ||
    patch.bitrateLimit !== undefined ||
    patch.encodingInterval !== undefined ||
    codec !== undefined;

  if (!touchRate) {
    return;
  }

  const frameRateLimit = clampToRange(
    patch.frameRateLimit ?? cfg.rateControl?.frameRateLimit ?? 0,
    codec?.frameRateRange,
  );
  const encodingInterval = clampToRange(
    patch.encodingInterval ?? cfg.rateControl?.encodingInterval ?? 1,
    codec?.encodingIntervalRange,
  );
  const bitrateLimit = clampToRange(
    patch.bitrateLimit ?? cfg.rateControl?.bitrateLimit ?? 0,
    codec ? bitrateRangeOf(codec) : undefined,
  );
  cfg.rateControl = { frameRateLimit, encodingInterval, bitrateLimit };
}

function assignMedia1CodecBag(
  cfg: VideoEncoderConfiguration,
  encoding: VideoEncoding,
  codec: Media1CodecOptions,
  patch: UpdateVideoEncoderConfiguration,
  previousGov: number | undefined,
): void {
  delete cfg.H264;
  delete cfg.MPEG4;
  cfg.encoding = encoding;

  if (encoding === 'JPEG') {
    return;
  }

  const govRange = (codec as H264Options | Mpeg4Options).govLengthRange;
  const govLength = clampToRange(
    patch.govLength ?? previousGov ?? govRange?.min ?? 1,
    govRange,
  );

  if (encoding === 'H264') {
    const profiles = asStringList((codec as H264Options).H264ProfilesSupported) as H264Profile[];
    const requested = patch.profile as H264Profile | undefined;
    const profile =
      (requested && profiles.includes(requested) ? requested : undefined) ?? profiles[0];
    if (!profile) {
      throw new OnvifValidationError(
        'H264ProfilesSupported is empty; cannot build H264 configuration bag',
      );
    }
    cfg.H264 = { govLength, H264Profile: profile };
    return;
  }

  const profiles = asStringList((codec as Mpeg4Options).mpeg4ProfilesSupported) as Mpeg4Profile[];
  const requested = patch.profile as Mpeg4Profile | undefined;
  const profile =
    (requested && profiles.includes(requested) ? requested : undefined) ?? profiles[0];
  if (!profile) {
    throw new OnvifValidationError(
      'mpeg4ProfilesSupported is empty; cannot build MPEG4 configuration bag',
    );
  }
  cfg.MPEG4 = { govLength, mpeg4Profile: profile };
}

/**
 * Rebuild Media 1.0 bags for a codec change using GetVideoEncoderConfigurationOptions.
 * Mutates and returns `cfg`.
 */
export function applyMedia1EncodingSwitch(
  cfg: VideoEncoderConfiguration,
  patch: UpdateVideoEncoderConfiguration,
  options: VideoEncoderConfigurationOptions,
): VideoEncoderConfiguration {
  const encoding = patch.encoding;
  if (!encoding) {
    throw new OnvifValidationError('encoding is required for an encoding switch');
  }
  const previousGov = currentGovLength(cfg);
  const codec = resolveMedia1CodecOptions(options, encoding);
  assignMedia1CodecBag(cfg, encoding, codec, patch, previousGov);

  cfg.resolution = pickResolution(
    mergeResolution(cfg.resolution, patch.resolution),
    codec.resolutionsAvailable,
  );
  applyMedia1RateAndQuality(cfg, patch, codec, options.qualityRange);
  return cfg;
}

/**
 * Apply a partial encoder patch onto a Media 1.0 configuration (mutates and returns `cfg`).
 * Pass `options` when `patch.encoding` differs from `cfg.encoding` (service fetches them).
 */
export function applyVideoEncoderPatch(
  cfg: VideoEncoderConfiguration,
  patch: UpdateVideoEncoderConfiguration,
  options?: VideoEncoderConfigurationOptions,
): VideoEncoderConfiguration {
  const switching = patch.encoding !== undefined && patch.encoding !== cfg.encoding;
  if (switching) {
    if (!options) {
      throw new OnvifValidationError(
        'GetVideoEncoderConfigurationOptions is required when changing Media 1.0 encoding',
      );
    }
    return applyMedia1EncodingSwitch(cfg, patch, options);
  }

  if (patch.encoding !== undefined) {
    cfg.encoding = patch.encoding;
  }
  if (patch.resolution !== undefined) {
    cfg.resolution = mergeResolution(cfg.resolution, patch.resolution);
  }
  if (patch.quality !== undefined) {
    cfg.quality = patch.quality;
  }
  if (
    patch.frameRateLimit !== undefined ||
    patch.bitrateLimit !== undefined ||
    patch.encodingInterval !== undefined
  ) {
    cfg.rateControl = {
      frameRateLimit: patch.frameRateLimit ?? cfg.rateControl?.frameRateLimit ?? 0,
      encodingInterval: patch.encodingInterval ?? cfg.rateControl?.encodingInterval ?? 1,
      bitrateLimit: patch.bitrateLimit ?? cfg.rateControl?.bitrateLimit ?? 0,
    };
  }
  if (patch.govLength !== undefined) {
    if (cfg.H264) {
      cfg.H264 = { ...cfg.H264, govLength: patch.govLength };
    } else if (cfg.MPEG4) {
      cfg.MPEG4 = { ...cfg.MPEG4, govLength: patch.govLength };
    }
  }
  if (patch.profile !== undefined) {
    if (cfg.H264) {
      cfg.H264 = { ...cfg.H264, H264Profile: patch.profile as H264Profile };
    } else if (cfg.MPEG4) {
      cfg.MPEG4 = { ...cfg.MPEG4, mpeg4Profile: patch.profile as Mpeg4Profile };
    }
  }
  return cfg;
}

function encodingsMatch(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}

/** Find Media2 options entry for a target encoding (exact, then case-insensitive). */
export function findVideoEncoder2Options(
  list: VideoEncoder2ConfigurationOptions[],
  encoding: string,
): VideoEncoder2ConfigurationOptions | undefined {
  return (
    list.find((item) => item.encoding === encoding) ??
    list.find((item) => encodingsMatch(item.encoding, encoding))
  );
}

/**
 * Rebuild Media 2.0 fields for a codec change using the matching options entry.
 */
export function applyMedia2EncodingSwitch(
  cfg: VideoEncoder2Configuration,
  patch: UpdateVideoEncoder2Configuration,
  options: VideoEncoder2ConfigurationOptions,
): VideoEncoder2Configuration {
  const encoding = patch.encoding;
  if (!encoding) {
    throw new OnvifValidationError('encoding is required for an encoding switch');
  }
  cfg.encoding = encoding;

  const profiles = asStringList(options.profilesSupported);
  const requested = patch.profile;
  cfg.profile =
    (requested && profiles.includes(requested) ? requested : undefined) ??
    profiles[0] ??
    undefined;

  const govRange = intListAsRange(options.govLengthRange);
  if (patch.govLength !== undefined || govRange) {
    cfg.govLength = clampToRange(patch.govLength ?? cfg.govLength ?? govRange?.min ?? 1, govRange);
  }

  cfg.resolution = pickResolution(
    mergeResolution(cfg.resolution, patch.resolution),
    options.resolutionsAvailable,
  );

  if (patch.quality !== undefined) {
    cfg.quality = clampToRange(patch.quality, options.qualityRange);
  } else {
    cfg.quality = clampToRange(cfg.quality, options.qualityRange);
  }

  const frameRates = asNumberList(options.frameRatesSupported);
  let frameRateLimit = patch.frameRateLimit ?? cfg.rateControl?.frameRateLimit ?? 0;
  if (frameRates.length && !frameRates.includes(frameRateLimit)) {
    frameRateLimit = frameRates[0];
  }
  const bitrateLimit = clampToRange(
    patch.bitrateLimit ?? cfg.rateControl?.bitrateLimit ?? 0,
    options.bitrateRange,
  );
  const constantBitRate = patch.constantBitRate ?? cfg.rateControl?.constantBitRate;
  cfg.rateControl = {
    frameRateLimit,
    bitrateLimit,
    constantBitRate,
    averageBitRate: cfg.rateControl?.averageBitRate,
  };
  return cfg;
}

/**
 * Apply a partial encoder patch onto a Media 2.0 configuration (mutates and returns `cfg`).
 * Pass the matching options entry when `patch.encoding` differs from `cfg.encoding`.
 */
export function applyVideoEncoder2Patch(
  cfg: VideoEncoder2Configuration,
  patch: UpdateVideoEncoder2Configuration,
  options?: VideoEncoder2ConfigurationOptions,
): VideoEncoder2Configuration {
  const switching = patch.encoding !== undefined && !encodingsMatch(patch.encoding, cfg.encoding);
  if (switching) {
    if (!options) {
      throw new OnvifValidationError(
        'GetVideoEncoderConfigurationOptions is required when changing Media 2.0 encoding',
      );
    }
    return applyMedia2EncodingSwitch(cfg, patch, options);
  }

  if (patch.encoding !== undefined) {
    cfg.encoding = patch.encoding;
  }
  if (patch.resolution !== undefined) {
    cfg.resolution = mergeResolution(cfg.resolution, patch.resolution);
  }
  if (patch.quality !== undefined) {
    cfg.quality = patch.quality;
  }
  if (
    patch.frameRateLimit !== undefined ||
    patch.bitrateLimit !== undefined ||
    patch.constantBitRate !== undefined
  ) {
    cfg.rateControl = {
      frameRateLimit: patch.frameRateLimit ?? cfg.rateControl?.frameRateLimit ?? 0,
      bitrateLimit: patch.bitrateLimit ?? cfg.rateControl?.bitrateLimit ?? 0,
      constantBitRate: patch.constantBitRate ?? cfg.rateControl?.constantBitRate,
      averageBitRate: cfg.rateControl?.averageBitRate,
    };
  }
  if (patch.govLength !== undefined) {
    cfg.govLength = patch.govLength;
  }
  if (patch.profile !== undefined) {
    cfg.profile = patch.profile;
  }
  return cfg;
}
