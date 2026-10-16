import { Duration } from '../interfaces/basics';
import { OnvifValidationError } from './errors';

/** Shared patterns for coercing XML text nodes to JS values */
export const NUMBER_RE = /^-?([1-9]\d*|0)(\.\d*)?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;

const ISO_DURATION_RE = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?=\d+)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/;

/**
 * Type for common duration values, ISO duration or milliseconds
 */
export type CommonDuration = string | number;

/**
 * Use ISO duration or convert milliseconds to ISO duration
 * @param duration
 */
export function toIsoDuration(duration: CommonDuration): Duration {
  if (typeof duration === 'string') {
    if (!ISO_DURATION_RE.test(duration)) {
      throw new OnvifValidationError(`"${duration}" is not a valid ISO duration value`);
    }
    return duration;
  }

  if (duration <= 0) return 'PT0S';

  let totalSeconds = Math.floor(duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0) result += `${minutes}M`;
  if (seconds > 0 || result === 'PT') result += `${seconds}S`;

  return result;
}

/**
 * Converts an ISO Duration (H, M, S) to milliseconds.
 * @param duration - The duration string (e.g., "PT5S", "PT1M", "PT1H30M")
 */
export function toMs(duration: CommonDuration): number {
  if (typeof duration === 'number') {
    return duration;
  }
  // Matches strict time duration: T followed by Hours, Minutes, and/or Seconds (including decimals)
  const regex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.(\d+))?S)?$/;
  const matches = duration.match(regex);

  if (!matches) {
    throw new OnvifValidationError(`Invalid ISO Time Duration format: ${duration}`);
  }

  const hours = parseInt(matches[1]) || 0;
  const minutes = parseInt(matches[2]) || 0;
  const seconds = parseInt(matches[3]) || 0;
  const ms = matches[4] ? Math.round(parseFloat(`0.${matches[4]}`) * 1000) : 0;

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

function s4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

/**
 * Generate GUID
 */
export function guid() {
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/**
 * Create a record from the list where the key is commonly used parameter
 * For example, from the profiles array get an object where we can have rapid access to profile using its token
 * @param list
 * @param groupKey
 */
export function struct<T, K extends keyof T>(list: T[], groupKey: K): Record<string, T> {
  return Object.fromEntries(list.map((item) => [item[groupKey], item]));
}
