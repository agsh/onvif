import { ActiveSource, Onvif } from '../onvif';

export type Callback = (error: any, result?: any) => void;

export function isCallback(value: unknown): value is Callback {
  return typeof value === 'function';
}

export function invoke<T>(promise: Promise<T>, callback: Callback, transform?: (result: T) => unknown): void {
  promise
    .then((result) => callback(null, transform ? transform(result) : result))
    .catch(callback);
}

export function splitOptionalCallback<T>(
  arg1?: T | Callback,
  arg2?: Callback,
): { options: T; callback: Callback | undefined } {
  if (isCallback(arg1)) {
    return { options: {} as T, callback: arg1 };
  }
  return { options: (arg1 ?? {}) as T, callback: arg2 };
}

export function splitTokenCallback(
  arg1?: string | Callback,
  arg2?: Callback,
): { token: string | undefined; callback: Callback | undefined } {
  if (isCallback(arg1)) {
    return { token: undefined, callback: arg1 };
  }
  return { token: arg1, callback: arg2 };
}

export function videoSourceToken(onvif: Onvif, options: { token?: string } = {}): string | undefined {
  return options.token ?? onvif.activeSource?.sourceToken;
}

export function profileToken(onvif: Onvif, options: { profileToken?: string } = {}): string | undefined {
  return options.profileToken ?? onvif.activeSource?.profileToken;
}

export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Pre-0.8.1 name→token map. Prefer token→preset from `getPresets` / `cam.presets` (v0.8.1+).
 * @deprecated Duplicate preset names collide with this shape.
 */
export function presetsToMap<T extends { name?: string; token?: string; $?: { token?: string } }>(
  presets: Record<string, T> | T[] | undefined | null,
): Record<string, string> {
  if (!presets) {
    return {};
  }
  const list = Array.isArray(presets) ? presets : Object.values(presets);
  return Object.fromEntries(
    list.flatMap((preset) => {
      const token = preset.token ?? preset.$?.token;
      if (!token) {
        return [];
      }
      const name = preset.name || token;
      return [[name, token] as [string, string]];
    }),
  );
}

export interface CompatibilityImagingOptions {
  token?: string;
}

export function mapImagingToken<T extends CompatibilityImagingOptions>(
  onvif: Onvif,
  options: T,
): T & { videoSourceToken?: string } {
  return {
    ...options,
    videoSourceToken: videoSourceToken(onvif, options),
  };
}

export interface CompatibilityRecordingTokenOptions {
  RecordingToken?: string;
  recordingToken?: string;
}

export function mapRecordingToken(options: CompatibilityRecordingTokenOptions): { recordingToken: string } {
  return { recordingToken: options.recordingToken ?? options.RecordingToken! };
}

export interface CompatibilityJobTokenOptions {
  JobToken?: string;
  jobToken?: string;
}

export function mapJobToken(options: CompatibilityJobTokenOptions): { jobToken: string } {
  return { jobToken: options.jobToken ?? options.JobToken! };
}

export interface CompatibilityCreateRecordingJobOptions {
  scheduleToken?: string;
  recordingToken?: string;
  mode?: string;
  priority?: number;
  source?: {
    sourceToken?: { type?: string; token?: string };
    autoCreateReceiver?: boolean;
    tracks?: unknown;
  };
}

export function mapCreateRecordingJobOptions(options: CompatibilityCreateRecordingJobOptions) {
  return {
    jobConfiguration: {
      scheduleToken: options.scheduleToken,
      recordingToken: options.recordingToken,
      mode: options.mode,
      priority: options.priority,
      ...(options.source && {
        source: {
          sourceToken: options.source.sourceToken,
          autoCreateReceiver: options.source.autoCreateReceiver,
          tracks: options.source.tracks,
        },
      }),
    },
  };
}

export interface CompatibilityReplayOptions {
  recordingToken?: string;
  stream?: string;
  protocol?: string;
}

export function activeSourceToken(activeSource?: ActiveSource): string | undefined {
  return activeSource?.sourceToken;
}

export function normalizeMediaUriResponse(result: { uri?: string; mediaUri?: { uri?: string } }) {
  if (result.uri) {
    return result;
  }
  if (result.mediaUri) {
    return result.mediaUri;
  }
  return result;
}

export function normalizeStreamUriResponse(result: { uri?: string; mediaUri?: { uri?: string } }) {
  if (result.uri) {
    return result;
  }
  if (result.mediaUri?.uri) {
    return { uri: result.mediaUri.uri };
  }
  return result;
}

/** Flat v0.x PTZ move options (`x`/`y`/`zoom`) plus Sony-style onlySend flags. */
export interface CompatibilityPTZMoveCoords {
  x?: number;
  y?: number;
  zoom?: number;
  onlySendPanTilt?: boolean;
  onlySendZoom?: boolean;
}

/**
 * Build an ONVIF {@link PTZVector} from v0.x flat coords.
 * Omits missing axes (`!== undefined`) so cameras do not receive empty PanTilt/Zoom elements.
 */
export function mapCompatibilityPTZVector(options: CompatibilityPTZMoveCoords) {
  return {
    ...(options.x !== undefined &&
      options.y !== undefined &&
      !options.onlySendZoom && {
        panTilt: { x: options.x, y: options.y },
      }),
    ...(options.zoom !== undefined &&
      !options.onlySendPanTilt && {
        zoom: { x: options.zoom },
      }),
  };
}
