/**
 * Recording ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/recording.wsdl
 */

import { Onvif } from './onvif';
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
import { OnvifValidationError } from './utils/errors';
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
  SetRecordingJobMode,
  SetTrackConfiguration,
  StopExportRecordedData,
  StopExportRecordedDataResponse,
} from './interfaces/recording';

/**
 * Recording service (Profile G) — recordings, tracks, and recording jobs.
 *
 * @example After connect, omit tokens to use activeRecordingToken / activeRecordingJobToken:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const cfg = await onvif.recording.getRecordingConfiguration();
 * const opts = await onvif.recording.getRecordingOptions();
 * console.log(cfg.source, opts);
 * // await onvif.recording.setRecordingJobMode({ mode: 'Active' });
 * ```
 * @category Services
 */
export default class Recording extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'recording');
  }

  private recordingToken(recordingToken?: ReferenceToken): ReferenceToken {
    const resolved = recordingToken ?? this.onvif.activeRecordingToken;
    if (resolved === undefined || resolved === '') {
      throw new OnvifValidationError(
        'recordingToken is required (pass it or connect with Recording so activeRecordingToken is set)',
      );
    }
    return resolved;
  }

  private recordingJobToken(jobToken?: ReferenceToken): ReferenceToken {
    const resolved = jobToken ?? this.onvif.activeRecordingJobToken;
    if (resolved === undefined || resolved === '') {
      throw new OnvifValidationError(
        'jobToken is required (pass it or connect with Recording so activeRecordingJobToken is set)',
      );
    }
    return resolved;
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
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async deleteRecording(options: Partial<DeleteRecording> = {}): Promise<void> {
    await this.request({
      DeleteRecording: {
        RecordingToken: this.recordingToken(options.recordingToken),
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
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async setRecordingConfiguration(
    options: Partial<SetRecordingConfiguration> & Pick<SetRecordingConfiguration, 'recordingConfiguration'>,
  ): Promise<void> {
    await this.request({
      SetRecordingConfiguration: {
        RecordingToken: this.recordingToken(options.recordingToken),
        RecordingConfiguration: Recording.recordingConfigurationToBuild(options.recordingConfiguration),
      },
    });
  }

  /**
   * Retrieve the recording configuration for a recording.
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async getRecordingConfiguration(
    options: Partial<GetRecordingConfiguration> = {},
  ): Promise<RecordingConfiguration> {
    const response = await this.request({
      GetRecordingConfiguration: {
        RecordingToken: this.recordingToken(options.recordingToken),
      },
    });
    return response.getRecordingConfigurationResponse.recordingConfiguration;
  }

  /**
   * Return recording options for a recording token.
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async getRecordingOptions(options: Partial<GetRecordingOptions> = {}): Promise<RecordingOptions> {
    const response = await this.request({
      GetRecordingOptions: {
        RecordingToken: this.recordingToken(options.recordingToken),
      },
    });
    return response.getRecordingOptionsResponse.options;
  }

  /**
   * Create a new track within a recording.
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async createTrack(
    options: Partial<CreateTrack> & Pick<CreateTrack, 'trackConfiguration'>,
  ): Promise<ReferenceToken> {
    const response = await this.request({
      CreateTrack: {
        RecordingToken: this.recordingToken(options.recordingToken),
        TrackConfiguration: Recording.trackConfigurationToBuild(options.trackConfiguration),
      },
    });
    return response.createTrackResponse.trackToken;
  }

  /**
   * Remove a track from a recording.
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async deleteTrack(options: Partial<DeleteTrack> & Pick<DeleteTrack, 'trackToken'>): Promise<void> {
    await this.request({
      DeleteTrack: {
        RecordingToken: this.recordingToken(options.recordingToken),
        TrackToken: options.trackToken,
      },
    });
  }

  /**
   * Retrieve the configuration for a specific track.
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async getTrackConfiguration(
    options: Partial<GetTrackConfiguration> & Pick<GetTrackConfiguration, 'trackToken'>,
  ): Promise<TrackConfiguration> {
    const response = await this.request({
      GetTrackConfiguration: {
        RecordingToken: this.recordingToken(options.recordingToken),
        TrackToken: options.trackToken,
      },
    });
    return response.getTrackConfigurationResponse.trackConfiguration;
  }

  /**
   * Change the configuration of a track.
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async setTrackConfiguration(
    options: Partial<SetTrackConfiguration> & Pick<SetTrackConfiguration, 'trackToken' | 'trackConfiguration'>,
  ): Promise<void> {
    await this.request({
      SetTrackConfiguration: {
        RecordingToken: this.recordingToken(options.recordingToken),
        TrackToken: options.trackToken,
        TrackConfiguration: Recording.trackConfigurationToBuild(options.trackConfiguration),
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
   * When `jobToken` is omitted, uses {@link Onvif.activeRecordingJobToken}.
   * @param options
   */
  async deleteRecordingJob(options: Partial<DeleteRecordingJob> = {}): Promise<void> {
    await this.request({
      DeleteRecordingJob: {
        JobToken: this.recordingJobToken(options.jobToken),
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
   * When `jobToken` is omitted, uses {@link Onvif.activeRecordingJobToken}.
   * @param options
   * @returns Job configuration as used by the device
   */
  async setRecordingJobConfiguration(
    options: Partial<SetRecordingJobConfiguration> & Pick<SetRecordingJobConfiguration, 'jobConfiguration'>,
  ): Promise<RecordingJobConfiguration> {
    const response = await this.request({
      SetRecordingJobConfiguration: {
        JobToken: this.recordingJobToken(options.jobToken),
        JobConfiguration: Recording.recordingJobConfigurationToBuild(options.jobConfiguration),
      },
    });
    return response.setRecordingJobConfigurationResponse.jobConfiguration;
  }

  /**
   * Return the current configuration for a recording job.
   * When `jobToken` is omitted, uses {@link Onvif.activeRecordingJobToken}.
   * @param options
   */
  async getRecordingJobConfiguration(
    options: Partial<GetRecordingJobConfiguration> = {},
  ): Promise<RecordingJobConfiguration> {
    const response = await this.request({
      GetRecordingJobConfiguration: {
        JobToken: this.recordingJobToken(options.jobToken),
      },
    });
    return response.getRecordingJobConfigurationResponse.jobConfiguration;
  }

  /**
   * Change the mode of a recording job.
   * When `jobToken` is omitted, uses {@link Onvif.activeRecordingJobToken}.
   * @param options
   */
  async setRecordingJobMode(
    options: Partial<SetRecordingJobMode> & Pick<SetRecordingJobMode, 'mode'>,
  ): Promise<void> {
    await this.request({
      SetRecordingJobMode: {
        JobToken: this.recordingJobToken(options.jobToken),
        Mode: options.mode,
      },
    });
  }

  /**
   * Return the state of a recording job.
   * When `jobToken` is omitted, uses {@link Onvif.activeRecordingJobToken}.
   * @param options
   */
  async getRecordingJobState(options: Partial<GetRecordingJobState> = {}) {
    const response = await this.request({
      GetRecordingJobState: {
        JobToken: this.recordingJobToken(options.jobToken),
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
