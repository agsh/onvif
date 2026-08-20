/**
 * Search ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/search.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import {
  FindEventResultList,
  FindMetadataResultList,
  FindPTZPositionResultList,
  FindRecordingResultList,
  JobToken,
  MediaAttributes,
  MetadataFilter,
  PTZPositionFilter,
  RecordingInformation,
  RecordingReference,
  RecordingSummary,
  SearchScope,
  SearchState,
} from './interfaces/onvif';
import {
  Capabilities,
  EndSearch,
  EndSearchResponse,
  FindEvents,
  FindMetadata,
  FindPTZPosition,
  FindRecordings,
  GetEventSearchResults,
  GetMediaAttributes,
  GetMetadataSearchResults,
  GetPTZPositionSearchResults,
  GetRecordingInformation,
  GetRecordingSearchResults,
  GetRecordingSummary,
  GetSearchState,
} from './interfaces/search';
import { ptzVectorToBuild } from './utils/toOnvifXMLSchemaObject';

/**
 * Search service
 * @example
 * ```ts
 * const summary = await cam.search.getRecordingSummary();
 * const token = await cam.search.findRecordings({
 *   scope: { includedRecordings: ['RecordingToken_1'] },
 *   keepAliveTime: 'PT10S',
 * });
 * const results = await cam.search.getRecordingSearchResults({ searchToken: token });
 * await cam.search.endSearch({ searchToken: token });
 * ```
 */
export default class Search extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'search');
  }

  private static recordingTokensToBuild(tokens: RecordingReference[]) {
    if (!tokens?.length) {
      return undefined;
    }
    return tokens.length === 1 ? tokens[0] : tokens;
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
        IncludedRecordings: Search.recordingTokensToBuild(searchScope.includedRecordings),
      }),
      ...(searchScope.recordingInformationFilter && {
        RecordingInformationFilter: searchScope.recordingInformationFilter,
      }),
      ...(searchScope.extension && { Extension: searchScope.extension }),
    };
  }

  private static ptzPositionFilterToBuild(searchFilter: PTZPositionFilter) {
    return {
      MinPosition: ptzVectorToBuild(searchFilter.minPosition),
      MaxPosition: ptzVectorToBuild(searchFilter.maxPosition),
      EnterOrExit: searchFilter.enterOrExit,
      ...(searchFilter.extension !== undefined ? { Extension: searchFilter.extension } : {}),
    };
  }

  private static metadataFilterToBuild(metadataFilter: MetadataFilter) {
    return {
      MetadataStreamFilter: metadataFilter.metadataStreamFilter,
      ...(metadataFilter.extension !== undefined ? { Extension: metadataFilter.extension } : {}),
    };
  }

  private static searchResultsRequestToBuild(
    options: GetRecordingSearchResults | GetEventSearchResults | GetPTZPositionSearchResults | GetMetadataSearchResults,
  ) {
    return {
      SearchToken: options.searchToken,
      ...(options.minResults !== undefined && { MinResults: options.minResults }),
      ...(options.maxResults !== undefined && { MaxResults: options.maxResults }),
      ...(options.waitTime !== undefined && { WaitTime: options.waitTime }),
    };
  }

  /**
   * Returns the capabilities of the search service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns a summary of recorded data on the device.
   */
  async getRecordingSummary(_options: GetRecordingSummary = {}): Promise<RecordingSummary> {
    const response = await this.request({ GetRecordingSummary: {} });
    return response.getRecordingSummaryResponse.summary;
  }

  /**
   * Returns detailed information about a recording.
   * @param options
   */
  async getRecordingInformation({ recordingToken }: GetRecordingInformation): Promise<RecordingInformation> {
    const response = await this.request({
      GetRecordingInformation: {
        RecordingToken: recordingToken,
      },
    });
    return response.getRecordingInformationResponse.recordingInformation;
  }

  /**
   * Returns media attributes valid at a specific point in time.
   * @param options
   */
  async getMediaAttributes({ recordingTokens, time }: GetMediaAttributes): Promise<MediaAttributes[]> {
    const response = await this.request(
      {
        GetMediaAttributes: {
          ...(recordingTokens && {
            RecordingTokens: Search.recordingTokensToBuild(recordingTokens),
          }),
          Time: time,
        },
      },
      { array: ['mediaAttributes'] },
    );
    return response.getMediaAttributesResponse.mediaAttributes ?? [];
  }

  /**
   * Starts a search for recordings matching the scope.
   * @param options
   */
  async findRecordings({ scope, maxMatches, keepAliveTime }: FindRecordings): Promise<JobToken> {
    const response = await this.request({
      FindRecordings: {
        Scope: Search.searchScopeToBuild(scope),
        ...(maxMatches !== undefined && { MaxMatches: maxMatches }),
        KeepAliveTime: keepAliveTime,
      },
    });
    return response.findRecordingsResponse.searchToken;
  }

  /**
   * Returns results from a recording search session.
   * @param options
   */
  async getRecordingSearchResults(options: GetRecordingSearchResults): Promise<FindRecordingResultList> {
    const response = await this.request(
      {
        GetRecordingSearchResults: Search.searchResultsRequestToBuild(options),
      },
      { array: ['recordingInformation'] },
    );
    return response.getRecordingSearchResultsResponse.resultList;
  }

  /**
   * Starts a search for events in recorded data.
   * @param options
   */
  async findEvents({
    startPoint,
    endPoint,
    scope,
    searchFilter,
    includeStartState,
    maxMatches,
    keepAliveTime,
  }: FindEvents): Promise<JobToken> {
    const response = await this.request({
      FindEvents: {
        StartPoint: startPoint,
        ...(endPoint !== undefined && { EndPoint: endPoint }),
        Scope: Search.searchScopeToBuild(scope),
        SearchFilter: searchFilter,
        IncludeStartState: includeStartState,
        ...(maxMatches !== undefined && { MaxMatches: maxMatches }),
        KeepAliveTime: keepAliveTime,
      },
    });
    return response.findEventsResponse.searchToken;
  }

  /**
   * Returns results from an event search session.
   * @param options
   */
  async getEventSearchResults(options: GetEventSearchResults): Promise<FindEventResultList> {
    const response = await this.request(
      {
        GetEventSearchResults: Search.searchResultsRequestToBuild(options),
      },
      { array: ['result'] },
    );
    return response.getEventSearchResultsResponse.resultList;
  }

  /**
   * Starts a search for PTZ positions in recorded metadata.
   * @param options
   */
  async findPTZPosition({
    startPoint,
    endPoint,
    scope,
    searchFilter,
    maxMatches,
    keepAliveTime,
  }: FindPTZPosition): Promise<JobToken> {
    const response = await this.request({
      FindPTZPosition: {
        StartPoint: startPoint,
        ...(endPoint !== undefined && { EndPoint: endPoint }),
        Scope: Search.searchScopeToBuild(scope),
        SearchFilter: Search.ptzPositionFilterToBuild(searchFilter),
        ...(maxMatches !== undefined && { MaxMatches: maxMatches }),
        KeepAliveTime: keepAliveTime,
      },
    });
    return response.findPTZPositionResponse.searchToken;
  }

  /**
   * Returns results from a PTZ position search session.
   * @param options
   */
  async getPTZPositionSearchResults(options: GetPTZPositionSearchResults): Promise<FindPTZPositionResultList> {
    const response = await this.request(
      {
        GetPTZPositionSearchResults: Search.searchResultsRequestToBuild(options),
      },
      { array: ['result'] },
    );
    return response.getPTZPositionSearchResultsResponse.resultList;
  }

  /**
   * Starts a search for metadata in recorded data.
   * @param options
   */
  async findMetadata({
    startPoint,
    endPoint,
    scope,
    metadataFilter,
    maxMatches,
    keepAliveTime,
  }: FindMetadata): Promise<JobToken> {
    const response = await this.request({
      FindMetadata: {
        StartPoint: startPoint,
        ...(endPoint !== undefined && { EndPoint: endPoint }),
        Scope: Search.searchScopeToBuild(scope),
        MetadataFilter: Search.metadataFilterToBuild(metadataFilter),
        ...(maxMatches !== undefined && { MaxMatches: maxMatches }),
        KeepAliveTime: keepAliveTime,
      },
    });
    return response.findMetadataResponse.searchToken;
  }

  /**
   * Returns results from a metadata search session.
   * @param options
   */
  async getMetadataSearchResults(options: GetMetadataSearchResults): Promise<FindMetadataResultList> {
    const response = await this.request(
      {
        GetMetadataSearchResults: Search.searchResultsRequestToBuild(options),
      },
      { array: ['result'] },
    );
    return response.getMetadataSearchResultsResponse.resultList;
  }

  /**
   * Returns the state of a search session.
   * @param options
   */
  async getSearchState({ searchToken }: GetSearchState): Promise<SearchState> {
    const response = await this.request({
      GetSearchState: {
        SearchToken: searchToken,
      },
    });
    return response.getSearchStateResponse.state;
  }

  /**
   * Ends a search session.
   * @param options
   */
  async endSearch({ searchToken }: EndSearch): Promise<EndSearchResponse['endpoint']> {
    const response = await this.request({
      EndSearch: {
        SearchToken: searchToken,
      },
    });
    return response.endSearchResponse.endpoint;
  }
}
