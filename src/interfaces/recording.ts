import {
  StringList,
  StringAttrList,
  Capabilities,
  RecordingConfiguration,
  RecordingReference,
  GetRecordingsResponseItem,
  TrackConfiguration,
  TrackReference,
  RecordingJobConfiguration,
  RecordingJobReference,
  GetRecordingJobsResponseItem,
  RecordingJobMode,
  RecordingJobStateInformation,
  Date,
  SearchScope,
  StorageReferencePath,
  ArrayOfFileProgress,
} from './onvif';
import { ReferenceToken } from './common';

export interface RecordingOptions {
  job?: JobOptions;
  track?: TrackOptions;
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
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the recording service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface CreateRecording {
  /** Initial configuration for the recording. */
  recordingConfiguration?: RecordingConfiguration;
}
export interface CreateRecordingResponse {
  /** The reference to the created recording. */
  recordingToken?: RecordingReference;
}
export interface DeleteRecording {
  /** The reference of the recording to be deleted. */
  recordingToken?: RecordingReference;
}
export interface DeleteRecordingResponse {}
export interface GetRecordings {}
export interface GetRecordingsResponse {
  /** List of recording items. */
  recordingItem?: GetRecordingsResponseItem[];
}
export interface SetRecordingConfiguration {
  /** Token of the recording that shall be changed. */
  recordingToken?: RecordingReference;
  /** The new configuration. */
  recordingConfiguration?: RecordingConfiguration;
}
export interface SetRecordingConfigurationResponse {}
export interface GetRecordingConfiguration {
  /** Token of the configuration to be retrieved. */
  recordingToken?: RecordingReference;
}
export interface GetRecordingConfigurationResponse {
  /** Configuration of the recording. */
  recordingConfiguration?: RecordingConfiguration;
}
export interface CreateTrack {
  /** Identifies the recording to which a track shall be added. */
  recordingToken?: RecordingReference;
  /** The configuration of the new track. */
  trackConfiguration?: TrackConfiguration;
}
export interface CreateTrackResponse {
  /**
   * The TrackToken shall identify the newly created track. The
   * TrackToken shall be unique within the recoding to which
   * the new track belongs.
   */
  trackToken?: TrackReference;
}
export interface DeleteTrack {
  /** Token of the recording the track belongs to. */
  recordingToken?: RecordingReference;
  /** Token of the track to be deleted. */
  trackToken?: TrackReference;
}
export interface DeleteTrackResponse {}
export interface GetTrackConfiguration {
  /** Token of the recording the track belongs to. */
  recordingToken?: RecordingReference;
  /** Token of the track. */
  trackToken?: TrackReference;
}
export interface GetTrackConfigurationResponse {
  /** Configuration of the track. */
  trackConfiguration?: TrackConfiguration;
}
export interface SetTrackConfiguration {
  /** Token of the recording the track belongs to. */
  recordingToken?: RecordingReference;
  /** Token of the track to be modified. */
  trackToken?: TrackReference;
  /** New configuration for the track. */
  trackConfiguration?: TrackConfiguration;
}
export interface SetTrackConfigurationResponse {}
export interface CreateRecordingJob {
  /** The initial configuration of the new recording job. */
  jobConfiguration?: RecordingJobConfiguration;
}
export interface CreateRecordingJobResponse {
  /** The JobToken shall identify the created recording job. */
  jobToken?: RecordingJobReference;
  /**
   * The JobConfiguration structure shall be the configuration as it is used by the device. This may be different from the
   * JobConfiguration passed to CreateRecordingJob.
   */
  jobConfiguration?: RecordingJobConfiguration;
}
export interface DeleteRecordingJob {
  /** The token of the job to be deleted. */
  jobToken?: RecordingJobReference;
}
export interface DeleteRecordingJobResponse {}
export interface GetRecordingJobs {}
export interface GetRecordingJobsResponse {
  /** List of recording jobs. */
  jobItem?: GetRecordingJobsResponseItem[];
}
export interface SetRecordingJobConfiguration {
  /** Token of the job to be modified. */
  jobToken?: RecordingJobReference;
  /** New configuration of the recording job. */
  jobConfiguration?: RecordingJobConfiguration;
}
export interface SetRecordingJobConfigurationResponse {
  /**
   * The JobConfiguration structure shall be the configuration
   * as it is used by the device. This may be different from the JobConfiguration passed to SetRecordingJobConfiguration.
   */
  jobConfiguration?: RecordingJobConfiguration;
}
export interface GetRecordingJobConfiguration {
  /** Token of the recording job. */
  jobToken?: RecordingJobReference;
}
export interface GetRecordingJobConfigurationResponse {
  /** Current configuration of the recording job. */
  jobConfiguration?: RecordingJobConfiguration;
}
export interface SetRecordingJobMode {
  /** Token of the recording job. */
  jobToken?: RecordingJobReference;
  /** The new mode for the recording job. */
  mode?: RecordingJobMode;
}
export interface SetRecordingJobModeResponse {}
export interface GetRecordingJobState {
  /** Token of the recording job. */
  jobToken?: RecordingJobReference;
}
export interface GetRecordingJobStateResponse {
  /** The current state of the recording job. */
  state?: RecordingJobStateInformation;
}
export interface GetRecordingOptions {
  /** Token of the recording. */
  recordingToken?: RecordingReference;
}
export interface GetRecordingOptionsResponse {
  /** Configuration of the recording. */
  options?: RecordingOptions;
}
export interface ExportRecordedData {
  /** Optional parameter that specifies start time for the exporting. */
  startPoint?: Date;
  /** Optional parameter that specifies end time for the exporting. */
  endPoint?: Date;
  /** Indicates the selection criterion on the existing recordings. . */
  searchScope?: SearchScope;
  /** Indicates which export file format to be used. */
  fileFormat?: string;
  /** Indicates the target storage and relative directory path. */
  storageDestination?: StorageReferencePath;
}
export interface Extension {}
export interface ExportRecordedDataResponse {
  /** Unique operation token for client to associate the relevant events. */
  operationToken?: ReferenceToken;
  /** List of exported file names. The device can also use AsyncronousOperationStatus event to publish this list. */
  fileNames?: string[];
  extension?: Extension;
}
export interface StopExportRecordedData {
  /** Unique ExportRecordedData operation token */
  operationToken?: ReferenceToken;
}
export interface StopExportRecordedDataResponse {
  /** Progress percentage of ExportRecordedData operation. */
  progress?: number;
  /**/
  fileProgressStatus?: ArrayOfFileProgress;
}
export interface GetExportRecordedDataState {
  /** Unique ExportRecordedData operation token */
  operationToken?: ReferenceToken;
}
export interface GetExportRecordedDataStateResponse {
  /** Progress percentage of ExportRecordedData operation. */
  progress?: number;
  /**/
  fileProgressStatus?: ArrayOfFileProgress;
}
