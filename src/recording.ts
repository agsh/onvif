/**
 * Recording ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/recording.wsdl
 */

import { Onvif, OnvifServices } from './onvif';
import Service from './service';
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

/**
 * Recording service
 */
export class Recording extends Service {
  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
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
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Create a new recording.
   * @param options
   */
  async createRecording({ recordingConfiguration }: CreateRecording): Promise<ReferenceToken> {
    const response = await this.request({
      CreateRecording: {
        RecordingConfiguration: Recording.recordingConfigurationToBuild(recordingConfiguration),
      },
    });
    return response.createRecordingResponse.recordingToken;
  }

  /**
   * Delete a recording.
   * @param options
   */
  async deleteRecording({ recordingToken }: DeleteRecording): Promise<void> {
    await this.request({
      DeleteRecording: {
        RecordingToken: recordingToken,
      },
    });
  }

  /**
   * Return descriptions of all recordings on the device.
   */
  async getRecordings(): Promise<GetRecordingsResponseItem[]> {
    const response = await this.request({ GetRecordings: {} }, { array: ['recordingItem', 'track'] });
    return response.getRecordingsResponse.recordingItem ?? [];
  }

  /**
   * Change the configuration of a recording.
   * @param options
   */
  async setRecordingConfiguration({
    recordingToken,
    recordingConfiguration,
  }: SetRecordingConfiguration): Promise<void> {
    await this.request({
      SetRecordingConfiguration: {
        RecordingToken: recordingToken,
        RecordingConfiguration: Recording.recordingConfigurationToBuild(recordingConfiguration),
      },
    });
  }

  /**
   * Retrieve the recording configuration for a recording.
   * @param options
   */
  async getRecordingConfiguration({ recordingToken }: GetRecordingConfiguration): Promise<RecordingConfiguration> {
    const response = await this.request({
      GetRecordingConfiguration: {
        RecordingToken: recordingToken,
      },
    });
    return response.getRecordingConfigurationResponse.recordingConfiguration;
  }

  /**
   * Return recording options for a recording token.
   * @param options
   */
  async getRecordingOptions({ recordingToken }: GetRecordingOptions): Promise<RecordingOptions> {
    const response = await this.request({
      GetRecordingOptions: {
        RecordingToken: recordingToken,
      },
    });
    return response.getRecordingOptionsResponse.options;
  }

  /**
   * Create a new track within a recording.
   * @param options
   */
  async createTrack({ recordingToken, trackConfiguration }: CreateTrack): Promise<ReferenceToken> {
    const response = await this.request({
      CreateTrack: {
        RecordingToken: recordingToken,
        TrackConfiguration: Recording.trackConfigurationToBuild(trackConfiguration),
      },
    });
    return response.createTrackResponse.trackToken;
  }

  /**
   * Remove a track from a recording.
   * @param options
   */
  async deleteTrack({ recordingToken, trackToken }: DeleteTrack): Promise<void> {
    await this.request({
      DeleteTrack: {
        RecordingToken: recordingToken,
        TrackToken: trackToken,
      },
    });
  }

  /**
   * Retrieve the configuration for a specific track.
   * @param options
   */
  async getTrackConfiguration({ recordingToken, trackToken }: GetTrackConfiguration): Promise<TrackConfiguration> {
    const response = await this.request({
      GetTrackConfiguration: {
        RecordingToken: recordingToken,
        TrackToken: trackToken,
      },
    });
    return response.getTrackConfigurationResponse.trackConfiguration;
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
    await this.request({
      SetTrackConfiguration: {
        RecordingToken: recordingToken,
        TrackToken: trackToken,
        TrackConfiguration: Recording.trackConfigurationToBuild(trackConfiguration),
      },
    });
  }

  /**
   * Create a new recording job.
   * @param options
   */
  async createRecordingJob({ jobConfiguration }: CreateRecordingJob): Promise<CreateRecordingJobResponse> {
    const response = await this.request({
      CreateRecordingJob: {
        JobConfiguration: Recording.recordingJobConfigurationToBuild(jobConfiguration),
      },
    });
    return response.createRecordingJobResponse;
  }

  /**
   * Remove a recording job.
   * @param options
   */
  async deleteRecordingJob({ jobToken }: DeleteRecordingJob): Promise<void> {
    await this.request({
      DeleteRecordingJob: {
        JobToken: jobToken,
      },
    });
  }

  /**
   * Return a list of all recording jobs on the device.
   */
  async getRecordingJobs(): Promise<GetRecordingJobsResponseItem[]> {
    const response = await this.request({ GetRecordingJobs: {} }, { array: ['jobItem'] });
    return response.getRecordingJobsResponse.jobItem ?? [];
  }

  /**
   * Change the configuration for a recording job.
   * @param options
   */
  async setRecordingJobConfiguration({
    jobToken,
    jobConfiguration,
  }: SetRecordingJobConfiguration): Promise<SetRecordingJobConfigurationResponse> {
    const response = await this.request({
      SetRecordingJobConfiguration: {
        JobToken: jobToken,
        JobConfiguration: Recording.recordingJobConfigurationToBuild(jobConfiguration),
      },
    });
    return response.setRecordingJobConfigurationResponse;
  }

  /**
   * Return the current configuration for a recording job.
   * @param options
   */
  async getRecordingJobConfiguration({ jobToken }: GetRecordingJobConfiguration): Promise<RecordingJobConfiguration> {
    const response = await this.request({
      GetRecordingJobConfiguration: {
        JobToken: jobToken,
      },
    });
    return response.getRecordingJobConfigurationResponse.jobConfiguration;
  }

  /**
   * Change the mode of a recording job.
   * @param options
   */
  async setRecordingJobMode({ jobToken, mode }: SetRecordingJobMode): Promise<void> {
    await this.request({
      SetRecordingJobMode: {
        JobToken: jobToken,
        Mode: mode,
      },
    });
  }

  /**
   * Return the state of a recording job.
   * @param options
   */
  async getRecordingJobState({ jobToken }: GetRecordingJobState) {
    const response = await this.request({
      GetRecordingJobState: {
        JobToken: jobToken,
      },
    });
    return response.getRecordingJobStateResponse.state;
  }

  /**
   * Export selected recordings to a storage target.
   * @param options
   */
  async exportRecordedData(options: ExportRecordedData): Promise<ExportRecordedDataResponse> {
    const response = await this.request(
      {
        ExportRecordedData: {
          ...(options.startPoint !== undefined && { StartPoint: options.startPoint }),
          ...(options.endPoint !== undefined && { EndPoint: options.endPoint }),
          SearchScope: Recording.searchScopeToBuild(options.searchScope),
          FileFormat: options.fileFormat,
          StorageDestination: Recording.storageDestinationToBuild(options.storageDestination),
        },
      },
      { array: ['fileNames'] },
    );
    const exportResponse = response.exportRecordedDataResponse;
    return {
      operationToken: exportResponse.operationToken,
      fileNames: exportResponse.fileNames,
      extension: exportResponse.extension,
    };
  }

  /**
   * Stop an ExportRecordedData operation.
   * @param options
   */
  async stopExportRecordedData({ operationToken }: StopExportRecordedData): Promise<StopExportRecordedDataResponse> {
    const response = await this.request({
      StopExportRecordedData: {
        OperationToken: operationToken,
      },
    });
    return response.stopExportRecordedDataResponse;
  }

  /**
   * Retrieve the state of an ExportRecordedData operation.
   * @param options
   */
  async getExportRecordedDataState({
    operationToken,
  }: GetExportRecordedDataState): Promise<GetExportRecordedDataStateResponse> {
    const response = await this.request({
      GetExportRecordedDataState: {
        OperationToken: operationToken,
      },
    });
    return response.getExportRecordedDataStateResponse;
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
    await this.request({
      OverrideSegmentDuration: {
        TargetSegmentDuration: targetSegmentDuration,
        Expiration: expiration,
        RecordingConfiguration: recordingConfiguration,
      },
    });
  }
}
