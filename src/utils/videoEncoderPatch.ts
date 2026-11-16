import type { ReferenceToken } from '../interfaces/common';
import type {
  VideoEncoder2Configuration,
  VideoEncoderConfiguration,
  VideoEncoding,
  VideoResolution,
  VideoResolution2,
} from '../interfaces/onvif';

/** Partial resolution; omitted axes keep the current Get value. */
export type VideoEncoderResolutionPatch = {
  width?: number;
  height?: number;
};

/**
 * Patch for Media 1.0 Get -> merge -> Set sugar.
 * Only defined fields overwrite the fetched configuration.
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
  /** Applied when the current config has `H264` / `MPEG4` (or after encoding switch). */
  govLength?: number;
  /**
   * ForcePersistence on Set. ONVIF marks the flag obsolete (assume true); default `true`.
   */
  forcePersistence?: boolean;
}

/**
 * Patch for Media 2.0 Get -> merge -> Set sugar.
 * `encoding` is the Media2 mime / subtype string (e.g. `H264`, `H265`).
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

/**
 * Apply a partial encoder patch onto a Media 1.0 configuration (mutates and returns `cfg`).
 */
export function applyVideoEncoderPatch(
  cfg: VideoEncoderConfiguration,
  patch: UpdateVideoEncoderConfiguration,
): VideoEncoderConfiguration {
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
    } else if (cfg.encoding === 'H264') {
      cfg.H264 = { govLength: patch.govLength, H264Profile: 'Main' };
    } else if (cfg.encoding === 'MPEG4') {
      cfg.MPEG4 = { govLength: patch.govLength, mpeg4Profile: 'SP' };
    }
  }
  return cfg;
}

/**
 * Apply a partial encoder patch onto a Media 2.0 configuration (mutates and returns `cfg`).
 */
export function applyVideoEncoder2Patch(
  cfg: VideoEncoder2Configuration,
  patch: UpdateVideoEncoder2Configuration,
): VideoEncoder2Configuration {
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
