import {
  StringList,
  StringAttrList,
  RecordingConfiguration,
  RecordingReference,
  TrackConfiguration,
  TrackReference,
  RecordingJobConfiguration,
  RecordingJobReference,
  RecordingJobMode,
  SearchScope,
  StorageReferencePath,
  ArrayOfFileProgress,
} from './onvif';
import { Duration } from './basics';
import { ReferenceToken } from './common';

export interface Capabilities {
  /** Indication if the device supports dynamic creation and deletion of recordings */
  dynamicRecordings?: boolean;
  /** Indication if the device supports dynamic creation and deletion of tracks */
  dynamicTracks?: boolean;
  /** Indication which encodings are supported for recording. The list may contain one or more enumeration values of tt:VideoEncoding and tt:AudioEncoding. For encodings that are neither defined in tt:VideoEncoding nor tt:AudioEncoding the device shall use the IANA defintions. Note, that a device without audio support shall not return audio encodings. */
  encoding?: StringList;
  /** Maximum supported bit rate for all tracks of a recording in kBit/s. */
  maxRate?: number;
  /** Maximum supported bit rate for all recordings in kBit/s. */
  maxTotalRate?: number;
  /** Maximum number of recordings supported. (Integer values only.) */
  maxRecordings?: number;
  /** Maximum total number of supported recording jobs by the device. */
  maxRecordingJobs?: number;
  /** Indication if the device supports the GetRecordingOptions command. */
  options?: boolean;
  /** Indication if the device supports recording metadata. */
  metadataRecording?: boolean;
  /**
   * Indication that the device supports ExportRecordedData command for the listed export file formats.
   * The list shall return at least one export file format value. The value of 'ONVIF' refers to
   * ONVIF Export File Format specification.
   */
  supportedExportFileFormats?: StringAttrList;
  /** Indication that the device supports event triggered recording. */
  eventRecording?: boolean;
  /** If present a device shall support configuring before event durations up to the given value. */
  beforeEventLimit?: Duration;
  /** If present a device shall support configuring after event durations up to the given value. */
  afterEventLimit?: Duration;
  /**
   * List of formats supported by the device for recording to an external target.
   * See tt:TargetFormat for a list of definitions.
   */
  supportedTargetFormats?: StringAttrList;
  /**
   * Number of encryption entries supported per recording.
   * By specifying multiple encryption entries per recording, different tracks can be encrypted with different configurations.
   */
  encryptionEntryLimit?: number;
  /**
   * Indicates supported encryption modes.
   * See tt:EncryptionMode for a list of definitions.
   */
  supportedEncryptionModes?: StringAttrList;
  /** Indicates if the device supports the OverrideSegmentDuration command. */
  overrideSegmentDuration?: boolean;
  /** Indicates if the device supports asymmetric encryption. */
  asymmetricEncryptionSupported?: boolean;
  /** Indicates if the device supports scheduled recording. */
  scheduledRecording?: boolean;
  /** Indicates if the device supports recording to onboard storage, default value is true. If false, device shall support recording to an external target. */
  onboardStorage?: boolean;
  /** Indicates support for ExportRecordedSegments. */
  segmentExport?: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface RecordingOptions {
  job: JobOptions;
  track: TrackOptions;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface JobOptions {
  /** Number of spare jobs that can be created for the recording. */
  spare?: number;
  /** A device that supports recording of a restricted set of Media/Media2 Service Profiles returns the list of profiles that can be recorded on the given Recording. */
  compatibleSources?: StringAttrList;
}
export interface TrackOptions {
  /** Total spare number of tracks that can be added to this recording. */
  spareTotal?: number;
  /** Number of spare Video tracks that can be added to this recording. */
  spareVideo?: number;
  /** Number of spare Aduio tracks that can be added to this recording. */
  spareAudio?: number;
  /** Number of spare Metadata tracks that can be added to this recording. */
  spareMetadata?: number;
}
export interface CreateRecording {
  /** Initial configuration for the recording. */
  recordingConfiguration: RecordingConfiguration;
}
export interface DeleteRecording {
  /** The reference of the recording to be deleted. */
  recordingToken: RecordingReference;
}
export interface SetRecordingConfiguration {
  /** Token of the recording that shall be changed. */
  recordingToken: RecordingReference;
  /** The new configuration. */
  recordingConfiguration: RecordingConfiguration;
}
export interface GetRecordingConfiguration {
  /** Token of the configuration to be retrieved. */
  recordingToken: RecordingReference;
}
export interface CreateTrack {
  /** Identifies the recording to which a track shall be added. */
  recordingToken: RecordingReference;
  /** The configuration of the new track. */
  trackConfiguration: TrackConfiguration;
}
export interface DeleteTrack {
  /** Token of the recording the track belongs to. */
  recordingToken: RecordingReference;
  /** Token of the track to be deleted. */
  trackToken: TrackReference;
}
export interface GetTrackConfiguration {
  /** Token of the recording the track belongs to. */
  recordingToken: RecordingReference;
  /** Token of the track. */
  trackToken: TrackReference;
}
export interface SetTrackConfiguration {
  /** Token of the recording the track belongs to. */
  recordingToken: RecordingReference;
  /** Token of the track to be modified. */
  trackToken: TrackReference;
  /** New configuration for the track. */
  trackConfiguration: TrackConfiguration;
}
export interface CreateRecordingJob {
  /** The initial configuration of the new recording job. */
  jobConfiguration: RecordingJobConfiguration;
}
export interface CreateRecordingJobResponse {
  /** The JobToken shall identify the created recording job. */
  jobToken: RecordingJobReference;
  /**
   * The JobConfiguration structure shall be the configuration as it is used by the device. This may be different from the
   * JobConfiguration passed to CreateRecordingJob.
   */
  jobConfiguration: RecordingJobConfiguration;
}
export interface DeleteRecordingJob {
  /** The token of the job to be deleted. */
  jobToken: RecordingJobReference;
}
export interface SetRecordingJobConfiguration {
  /** Token of the job to be modified. */
  jobToken: RecordingJobReference;
  /** New configuration of the recording job. */
  jobConfiguration: RecordingJobConfiguration;
}
export interface GetRecordingJobConfiguration {
  /** Token of the recording job. */
  jobToken: RecordingJobReference;
}
export interface SetRecordingJobMode {
  /** Token of the recording job. */
  jobToken: RecordingJobReference;
  /** The new mode for the recording job. */
  mode: RecordingJobMode;
}
export interface GetRecordingJobState {
  /** Token of the recording job. */
  jobToken: RecordingJobReference;
}
export interface GetRecordingOptions {
  /** Token of the recording. */
  recordingToken: RecordingReference;
}
export interface ExportRecordedData {
  /** Optional parameter that specifies start time for the exporting. */
  startPoint?: Date;
  /** Optional parameter that specifies end time for the exporting. */
  endPoint?: Date;
  /** Indicates the selection criterion on the existing recordings. . */
  searchScope: SearchScope;
  /** Indicates which export file format to be used. */
  fileFormat: string;
  /** Indicates the target storage and relative directory path. */
  storageDestination: StorageReferencePath;
}
export interface Extension {
  /** Extensibility point. */
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface ExportRecordedDataResponse {
  /** Unique operation token for client to associate the relevant events. */
  operationToken: ReferenceToken;
  /** List of exported file names. The device can also use AsyncronousOperationStatus event to publish this list. */
  fileNames?: string[];
  extension?: Extension;
}
export interface StopExportRecordedData {
  /** Unique ExportRecordedData operation token */
  operationToken: ReferenceToken;
}
export interface StopExportRecordedDataResponse {
  /** Progress percentage of ExportRecordedData operation. */
  progress: number;
  /**/
  fileProgressStatus: ArrayOfFileProgress;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetExportRecordedDataState {
  /** Unique ExportRecordedData operation token */
  operationToken: ReferenceToken;
}
export interface GetExportRecordedDataStateResponse {
  /** Progress percentage of ExportRecordedData operation. */
  progress: number;
  /**/
  fileProgressStatus: ArrayOfFileProgress;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface OverrideSegmentDuration {
  /** The new target duration for recorded segments. */
  targetSegmentDuration: Duration;
  /** The length of time during which the override request is to be in effect. */
  expiration: Duration;
  /** The recording configuration for which the override is requested. */
  recordingConfiguration: RecordingReference;
}
