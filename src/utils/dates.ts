/**
 * Service-side Date coercion.
 *
 * `parseXml` leaves ISO UTC `...Z` (and other xs:dateTime) values as strings.
 * Typed service APIs expose `Date` -- convert known fields at the service boundary.
 */
import type { PTZStatus } from '../interfaces/common';
import type { AppInfo, LicenseInfo } from '../interfaces/appmgmt';
import type { Credential, CredentialAccessProfile, CredentialInfo } from '../interfaces/credential';
import type {
  FindEventResult,
  FindEventResultList,
  FindMetadataResultList,
  FindPTZPositionResultList,
  MediaAttributes,
  RecordingInformation,
  RecordingSummary,
  TrackAttributes,
  TrackInformation,
} from '../interfaces/onvif';

export type DateLike = Date | string;

/** Coerce a SOAP ISO datetime string (or pass-through `Date`). */
export function toDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Convert when present; leave null/undefined alone. */
function setDate(value: DateLike | null | undefined): Date | undefined {
  if (value == null) {
    return undefined;
  }
  return toDate(value);
}

/** parseXml may leave a single sibling as an object; services often request arrays. */
function asList<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function coerceRecordingSummary(summary: RecordingSummary): RecordingSummary {
  summary.dataFrom = toDate(summary.dataFrom as DateLike);
  summary.dataUntil = toDate(summary.dataUntil as DateLike);
  return summary;
}

export function coerceTrackInformation(track: TrackInformation): TrackInformation {
  track.dataFrom = toDate(track.dataFrom as DateLike);
  track.dataTo = toDate(track.dataTo as DateLike);
  return track;
}

export function coerceRecordingInformation(info: RecordingInformation): RecordingInformation {
  info.earliestRecording = setDate(info.earliestRecording as DateLike | undefined);
  info.latestRecording = setDate(info.latestRecording as DateLike | undefined);
  for (const track of asList(info.track)) {
    coerceTrackInformation(track);
  }
  return info;
}

export function coerceMediaAttributes(item: MediaAttributes): MediaAttributes {
  item.from = toDate(item.from as DateLike);
  item.until = toDate(item.until as DateLike);
  for (const attr of asList(item.trackAttributes as TrackAttributes | TrackAttributes[] | undefined)) {
    if (attr.trackInformation) {
      coerceTrackInformation(attr.trackInformation);
    }
  }
  return item;
}

export function coerceMediaAttributesList(items: MediaAttributes[] | null | undefined): MediaAttributes[] {
  if (items == null) {
    return [];
  }
  for (const item of items) {
    coerceMediaAttributes(item);
  }
  return items;
}

type FindResultList = FindEventResultList | FindPTZPositionResultList | FindMetadataResultList;

export function coerceFindResultList<T extends FindResultList>(list: T): T {
  for (const row of asList(list.result as FindEventResult | FindEventResult[] | undefined)) {
    row.time = toDate(row.time as DateLike);
  }
  return list;
}

export function coerceStatusTimes<T extends { currentTime: Date; terminationTime: Date }>(status: T): T {
  status.currentTime = toDate(status.currentTime as DateLike);
  status.terminationTime = toDate(status.terminationTime as DateLike);
  return status;
}

export function coercePTZStatus(status: PTZStatus): PTZStatus {
  status.utcTime = toDate(status.utcTime as DateLike);
  return status;
}

function coerceLicense(license: LicenseInfo): void {
  license.validFrom = setDate(license.validFrom as DateLike | undefined);
  license.validUntil = setDate(license.validUntil as DateLike | undefined);
}

export function coerceAppInfo(info: AppInfo): AppInfo {
  info.installationDate = toDate(info.installationDate as DateLike);
  info.lastUpdate = toDate(info.lastUpdate as DateLike);
  for (const license of asList(info.licenses)) {
    coerceLicense(license);
  }
  return info;
}

export function coerceAppInfoList(items: AppInfo[] | null | undefined): AppInfo[] {
  if (items == null) {
    return [];
  }
  for (const item of items) {
    coerceAppInfo(item);
  }
  return items;
}

export function coerceCredentialValidity<T extends { validFrom?: Date; validTo?: Date }>(item: T): T {
  item.validFrom = setDate(item.validFrom as DateLike | undefined);
  item.validTo = setDate(item.validTo as DateLike | undefined);
  return item;
}

/** Credential (+ nested access profiles) or CredentialInfo. */
export function coerceCredentialEntity<T extends CredentialInfo | Credential>(item: T): T {
  coerceCredentialValidity(item);
  const profiles = (item as Credential).credentialAccessProfile;
  for (const profile of asList(profiles as CredentialAccessProfile | CredentialAccessProfile[] | undefined)) {
    coerceCredentialValidity(profile);
  }
  return item;
}

export function coerceCredentialEntityList<T extends CredentialInfo | Credential>(items: T[] | null | undefined): T[] {
  if (items == null) {
    return [];
  }
  for (const item of items) {
    coerceCredentialEntity(item);
  }
  return items;
}

/** Device Mgmt certificate info (fields vary by firmware; convert known ones if present). */
export function coerceCertificateInformation<T extends object>(info: T): T {
  const rec = info as Record<string, unknown>;
  if (rec.validNotBefore != null) {
    rec.validNotBefore = toDate(rec.validNotBefore as DateLike);
  }
  if (rec.validNotAfter != null) {
    rec.validNotAfter = toDate(rec.validNotAfter as DateLike);
  }
  if (rec.notValidBefore != null) {
    rec.notValidBefore = toDate(rec.notValidBefore as DateLike);
  }
  if (rec.notValidAfter != null) {
    rec.notValidAfter = toDate(rec.notValidAfter as DateLike);
  }
  return info;
}

/** Notification message: `message.message.utcTime` (ONVIF tt:Message attribute). */
export function coerceNotificationMessage<T extends { message?: { message?: { utcTime?: DateLike } } }>(msg: T): T {
  const inner = msg.message?.message;
  if (inner?.utcTime != null) {
    inner.utcTime = toDate(inner.utcTime);
  }
  return msg;
}

export function coerceNotificationMessages<T extends { message?: { message?: { utcTime?: DateLike } } }>(
  messages: T[] | null | undefined,
): T[] {
  if (messages == null) {
    return [];
  }
  for (const msg of messages) {
    coerceNotificationMessage(msg);
  }
  return messages;
}
