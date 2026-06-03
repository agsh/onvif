/**
 * Recording ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/recording.wsdl
 */

import { Onvif } from './onvif';
import { build, linerase } from './utils';
import {
  GetRecordingsResponseItem,
  GetRecordingJobsResponseItem,
  RecordingConfiguration,
  RecordingJobConfiguration,
  RecordingJobSource,
  RecordingJobTrack,
  RecordingSourceInformation,
  SearchScope,
  StorageReferencePath,
  TrackConfiguration,
} from './interfaces/onvif';
import { ReferenceToken } from './interfaces/common';
import {
  Capabilities,
  RecordingOptions,
  CreateRecording,
  CreateRecordingJob,
  CreateRecordingJobResponse,
  CreateTrack,
  DeleteRecording,
  DeleteRecordingJob,
  DeleteTrack,
  ExportRecordedData,
  ExportRecordedDataResponse,
  GetExportRecordedDataState,
  GetExportRecordedDataStateResponse,
  GetRecordingConfiguration,
  GetRecordingJobConfiguration,
  GetRecordingJobState,
  GetRecordingOptions,
  GetTrackConfiguration,
  OverrideSegmentDuration,
  SetRecordingConfiguration,
  SetRecordingJobConfiguration,
  SetRecordingJobConfigurationResponse,
  SetRecordingJobMode,
  SetTrackConfiguration,
  StopExportRecordedData,
  StopExportRecordedDataResponse,
} from './interfaces/recording';

const RECORDING_XMLNS = 'http://www.onvif.org/ver10/recording/wsdl';

/**
 * Recording service
 */
export class Recording {
  private readonly onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  private static recordingSourceToBuild(source: RecordingSourceInformation) {
    return {
      SourceId: source.sourceId,
      Name: source.name,
      Location: source.location,
      Description: source.description,
      Address: source.address,
    };
  }

  private static recordingConfigurationToBuild(configuration: RecordingConfiguration) {
    return {
      Source: Recording.recordingSourceToBuild(configuration.source),
      Content: configuration.content,
      MaximumRetentionTime: configuration.maximumRetentionTime,
      ...(configuration.target && { Target: configuration.target }),
    };
  }

  private static trackConfigurationToBuild(configuration: TrackConfiguration) {
    return {
      TrackType: configuration.trackType,
      Description: configuration.description,
    };
  }

  private static recordingJobTrackToBuild(track: RecordingJobTrack) {
    return {
      SourceTag: track.sourceTag,
      Destination: track.destination,
    };
  }

  private static recordingJobSourceToBuild(source: RecordingJobSource) {
    const tracks = source.tracks
      ? Array.isArray(source.tracks)
        ? source.tracks.map((track) => Recording.recordingJobTrackToBuild(track))
        : [Recording.recordingJobTrackToBuild(source.tracks)]
      : undefined;

    return {
      ...(source.sourceToken && {
        SourceToken: {
          Type: source.sourceToken.type,
          Token: source.sourceToken.token,
        },
      }),
      ...(source.autoCreateReceiver !== undefined && { AutoCreateReceiver: source.autoCreateReceiver }),
      ...(tracks && { Tracks: tracks.length === 1 ? tracks[0] : tracks }),
      ...(source.extension && { Extension: source.extension }),
    };
  }

  private static recordingJobConfigurationToBuild(configuration: RecordingJobConfiguration) {
    const sources = configuration.source
      ? Array.isArray(configuration.source)
        ? configuration.source.map((source) => Recording.recordingJobSourceToBuild(source))
        : [Recording.recordingJobSourceToBuild(configuration.source)]
      : undefined;

    return {
      ...(configuration.scheduleToken !== undefined && { $: { ScheduleToken: configuration.scheduleToken } }),
      RecordingToken: configuration.recordingToken,
      Mode: configuration.mode,
      Priority: configuration.priority,
      ...(sources && { Source: sources.length === 1 ? sources[0] : sources }),
      ...(configuration.extension && { Extension: configuration.extension }),
      ...(configuration.eventFilter && { EventFilter: configuration.eventFilter }),
    };
  }

  private static searchScopeToBuild(searchScope: SearchScope) {
    return {
      ...(searchScope.includedSources && {
        IncludedSources: searchScope.includedSources.map((source) => ({
          Type: source.type,
          Token: source.token,
        })),
      }),
      ...(searchScope.includedRecordings && {
        IncludedRecordings: searchScope.includedRecordings,
      }),
      ...(searchScope.recordingInformationFilter && {
        RecordingInformationFilter: searchScope.recordingInformationFilter,
      }),
      ...(searchScope.extension && { Extension: searchScope.extension }),
    };
  }

  private static storageDestinationToBuild(storageDestination: StorageReferencePath) {
    return {
      StorageToken: storageDestination.storageToken,
      ...(storageDestination.relativePath && {
        RelativePath: storageDestination.relativePath,
      }),
      ...(storageDestination.extension && { Extension: storageDestination.extension }),
    };
  }

  /**
   * Returns the capabilities of the recording service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const body = build({
      GetServiceCapabilities: {
        $: { xmlns: RECORDING_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Create a new recording.
   * @param options
   */
  async createRecording({ recordingConfiguration }: CreateRecording): Promise<ReferenceToken> {
    const body = build({
      CreateRecording: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingConfiguration: Recording.recordingConfigurationToBuild(recordingConfiguration),
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).createRecordingResponse.recordingToken;
  }

  /**
   * Delete a recording.
   * @param options
   */
  async deleteRecording({ recordingToken }: DeleteRecording): Promise<void> {
    const body = build({
      DeleteRecording: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
      },
    });
    await this.onvif.request({ service: 'recording', body });
  }

  /**
   * Return descriptions of all recordings on the device.
   */
  async getRecordings(): Promise<GetRecordingsResponseItem[]> {
    const body = build({
      GetRecordings: {
        $: { xmlns: RECORDING_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data, { array: ['recordingItem', 'track'] }).getRecordingsResponse.recordingItem ?? [];
  }

  /**
   * Change the configuration of a recording.
   * @param options
   */
  async setRecordingConfiguration({
    recordingToken,
    recordingConfiguration,
  }: SetRecordingConfiguration): Promise<void> {
    const body = build({
      SetRecordingConfiguration: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
        RecordingConfiguration: Recording.recordingConfigurationToBuild(recordingConfiguration),
      },
    });
    await this.onvif.request({ service: 'recording', body });
  }

  /**
   * Retrieve the recording configuration for a recording.
   * @param options
   */
  async getRecordingConfiguration({ recordingToken }: GetRecordingConfiguration): Promise<RecordingConfiguration> {
    const body = build({
      GetRecordingConfiguration: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).getRecordingConfigurationResponse.recordingConfiguration;
  }

  /**
   * Return recording options for a recording token.
   * @param options
   */
  async getRecordingOptions({ recordingToken }: GetRecordingOptions): Promise<RecordingOptions> {
    const body = build({
      GetRecordingOptions: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).getRecordingOptionsResponse.options;
  }

  /**
   * Create a new track within a recording.
   * @param options
   */
  async createTrack({ recordingToken, trackConfiguration }: CreateTrack): Promise<ReferenceToken> {
    const body = build({
      CreateTrack: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
        TrackConfiguration: Recording.trackConfigurationToBuild(trackConfiguration),
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).createTrackResponse.trackToken;
  }

  /**
   * Remove a track from a recording.
   * @param options
   */
  async deleteTrack({ recordingToken, trackToken }: DeleteTrack): Promise<void> {
    const body = build({
      DeleteTrack: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
        TrackToken: trackToken,
      },
    });
    await this.onvif.request({ service: 'recording', body });
  }

  /**
   * Retrieve the configuration for a specific track.
   * @param options
   */
  async getTrackConfiguration({ recordingToken, trackToken }: GetTrackConfiguration): Promise<TrackConfiguration> {
    const body = build({
      GetTrackConfiguration: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
        TrackToken: trackToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).getTrackConfigurationResponse.trackConfiguration;
  }

  /**
   * Change the configuration of a track.
   * @param options
   */
  async setTrackConfiguration({
    recordingToken,
    trackToken,
    trackConfiguration,
  }: SetTrackConfiguration): Promise<void> {
    const body = build({
      SetTrackConfiguration: {
        $: { xmlns: RECORDING_XMLNS },
        RecordingToken: recordingToken,
        TrackToken: trackToken,
        TrackConfiguration: Recording.trackConfigurationToBuild(trackConfiguration),
      },
    });
    await this.onvif.request({ service: 'recording', body });
  }

  /**
   * Create a new recording job.
   * @param options
   */
  async createRecordingJob({ jobConfiguration }: CreateRecordingJob): Promise<CreateRecordingJobResponse> {
    const body = build({
      CreateRecordingJob: {
        $: { xmlns: RECORDING_XMLNS },
        JobConfiguration: Recording.recordingJobConfigurationToBuild(jobConfiguration),
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).createRecordingJobResponse;
  }

  /**
   * Remove a recording job.
   * @param options
   */
  async deleteRecordingJob({ jobToken }: DeleteRecordingJob): Promise<void> {
    const body = build({
      DeleteRecordingJob: {
        $: { xmlns: RECORDING_XMLNS },
        JobToken: jobToken,
      },
    });
    await this.onvif.request({ service: 'recording', body });
  }

  /**
   * Return a list of all recording jobs on the device.
   */
  async getRecordingJobs(): Promise<GetRecordingJobsResponseItem[]> {
    const body = build({
      GetRecordingJobs: {
        $: { xmlns: RECORDING_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data, { array: ['jobItem'] }).getRecordingJobsResponse.jobItem ?? [];
  }

  /**
   * Change the configuration for a recording job.
   * @param options
   */
  async setRecordingJobConfiguration({
    jobToken,
    jobConfiguration,
  }: SetRecordingJobConfiguration): Promise<SetRecordingJobConfigurationResponse> {
    const body = build({
      SetRecordingJobConfiguration: {
        $: { xmlns: RECORDING_XMLNS },
        JobToken: jobToken,
        JobConfiguration: Recording.recordingJobConfigurationToBuild(jobConfiguration),
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).setRecordingJobConfigurationResponse;
  }

  /**
   * Return the current configuration for a recording job.
   * @param options
   */
  async getRecordingJobConfiguration({ jobToken }: GetRecordingJobConfiguration): Promise<RecordingJobConfiguration> {
    const body = build({
      GetRecordingJobConfiguration: {
        $: { xmlns: RECORDING_XMLNS },
        JobToken: jobToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).getRecordingJobConfigurationResponse.jobConfiguration;
  }

  /**
   * Change the mode of a recording job.
   * @param options
   */
  async setRecordingJobMode({ jobToken, mode }: SetRecordingJobMode): Promise<void> {
    const body = build({
      SetRecordingJobMode: {
        $: { xmlns: RECORDING_XMLNS },
        JobToken: jobToken,
        Mode: mode,
      },
    });
    await this.onvif.request({ service: 'recording', body });
  }

  /**
   * Return the state of a recording job.
   * @param options
   */
  async getRecordingJobState({ jobToken }: GetRecordingJobState) {
    const body = build({
      GetRecordingJobState: {
        $: { xmlns: RECORDING_XMLNS },
        JobToken: jobToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).getRecordingJobStateResponse.state;
  }

  /**
   * Export selected recordings to a storage target.
   * @param options
   */
  async exportRecordedData(options: ExportRecordedData): Promise<ExportRecordedDataResponse> {
    const body = build({
      ExportRecordedData: {
        $: { xmlns: RECORDING_XMLNS },
        ...(options.startPoint !== undefined && { StartPoint: options.startPoint }),
        ...(options.endPoint !== undefined && { EndPoint: options.endPoint }),
        SearchScope: Recording.searchScopeToBuild(options.searchScope),
        FileFormat: options.fileFormat,
        StorageDestination: Recording.storageDestinationToBuild(options.storageDestination),
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    const response = linerase(data, { array: ['fileNames'] }).exportRecordedDataResponse;
    return {
      operationToken: response.operationToken,
      fileNames: response.fileNames,
      extension: response.extension,
    };
  }

  /**
   * Stop an ExportRecordedData operation.
   * @param options
   */
  async stopExportRecordedData({ operationToken }: StopExportRecordedData): Promise<StopExportRecordedDataResponse> {
    const body = build({
      StopExportRecordedData: {
        $: { xmlns: RECORDING_XMLNS },
        OperationToken: operationToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).stopExportRecordedDataResponse;
  }

  /**
   * Retrieve the state of an ExportRecordedData operation.
   * @param options
   */
  async getExportRecordedDataState({
    operationToken,
  }: GetExportRecordedDataState): Promise<GetExportRecordedDataStateResponse> {
    const body = build({
      GetExportRecordedDataState: {
        $: { xmlns: RECORDING_XMLNS },
        OperationToken: operationToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'recording', body });
    return linerase(data).getExportRecordedDataStateResponse;
  }

  /**
   * Request a temporary override of the target segment duration for a recording.
   * @param options
   */
  async overrideSegmentDuration({
    targetSegmentDuration,
    expiration,
    recordingConfiguration,
  }: OverrideSegmentDuration): Promise<void> {
    const body = build({
      OverrideSegmentDuration: {
        $: { xmlns: RECORDING_XMLNS },
        TargetSegmentDuration: targetSegmentDuration,
        Expiration: expiration,
        RecordingConfiguration: recordingConfiguration,
      },
    });
    await this.onvif.request({ service: 'recording', body });
  }
}
