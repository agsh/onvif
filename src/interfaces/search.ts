import {
  Capabilities,
  RecordingSummary,
  RecordingReference,
  RecordingInformation,
  Date,
  MediaAttributes,
  SearchScope,
  JobToken,
  FindRecordingResultList,
  EventFilter,
  FindEventResultList,
  PTZPositionFilter,
  FindPTZPositionResultList,
  MetadataFilter,
  FindMetadataResultList,
  SearchState,
} from './onvif';

export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the search service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetRecordingSummary {}
export interface GetRecordingSummaryResponse {
  summary?: RecordingSummary;
}
export interface GetRecordingInformation {
  recordingToken?: RecordingReference;
}
export interface GetRecordingInformationResponse {
  recordingInformation?: RecordingInformation;
}
export interface GetMediaAttributes {
  recordingTokens?: RecordingReference[];
  time?: Date;
}
export interface GetMediaAttributesResponse {
  mediaAttributes?: MediaAttributes[];
}
export interface FindRecordings {
  /** Scope defines the dataset to consider for this search. */
  scope?: SearchScope;
  /** The search will be completed after this many matches. If not specified, the search will continue until reaching the endpoint or until the session expires. */
  maxMatches?: number;
  /** The time the search session will be kept alive after responding to this and subsequent requests. A device shall support at least values up to ten seconds. */
  keepAliveTime?: string;
}
export interface FindRecordingsResponse {
  searchToken?: JobToken;
}
export interface GetRecordingSearchResults {
  /** The search session to get results from. */
  searchToken?: JobToken;
  /** The minimum number of results to return in one response. */
  minResults?: number;
  /** The maximum number of results to return in one response. */
  maxResults?: number;
  /** The maximum time before responding to the request, even if the MinResults parameter is not fulfilled. */
  waitTime?: string;
}
export interface GetRecordingSearchResultsResponse {
  resultList?: FindRecordingResultList;
}
export interface FindEvents {
  /** The point of time where the search will start. */
  startPoint?: Date;
  /** The point of time where the search will stop. This can be a time before the StartPoint, in which case the search is performed backwards in time. */
  endPoint?: Date;
  scope?: SearchScope;
  searchFilter?: EventFilter;
  /** Setting IncludeStartState to true means that the server should return virtual events representing the start state for any recording included in the scope. Start state events are limited to the topics defined in the SearchFilter that have the IsProperty flag set to true. */
  includeStartState?: boolean;
  /** The search will be completed after this many matches. If not specified, the search will continue until reaching the endpoint or until the session expires. */
  maxMatches?: number;
  /** The time the search session will be kept alive after responding to this and subsequent requests. A device shall support at least values up to ten seconds. */
  keepAliveTime?: string;
}
export interface FindEventsResponse {
  /** A unique reference to the search session created by this request. */
  searchToken?: JobToken;
}
export interface GetEventSearchResults {
  /** The search session to get results from. */
  searchToken?: JobToken;
  /** The minimum number of results to return in one response. */
  minResults?: number;
  /** The maximum number of results to return in one response. */
  maxResults?: number;
  /** The maximum time before responding to the request, even if the MinResults parameter is not fulfilled. */
  waitTime?: string;
}
export interface GetEventSearchResultsResponse {
  resultList?: FindEventResultList;
}
export interface FindPTZPosition {
  /** The point of time where the search will start. */
  startPoint?: Date;
  /** The point of time where the search will stop. This can be a time before the StartPoint, in which case the search is performed backwards in time. */
  endPoint?: Date;
  scope?: SearchScope;
  searchFilter?: PTZPositionFilter;
  /** The search will be completed after this many matches. If not specified, the search will continue until reaching the endpoint or until the session expires. */
  maxMatches?: number;
  /** The time the search session will be kept alive after responding to this and subsequent requests. A device shall support at least values up to ten seconds. */
  keepAliveTime?: string;
}
export interface FindPTZPositionResponse {
  /** A unique reference to the search session created by this request. */
  searchToken?: JobToken;
}
export interface GetPTZPositionSearchResults {
  /** The search session to get results from. */
  searchToken?: JobToken;
  /** The minimum number of results to return in one response. */
  minResults?: number;
  /** The maximum number of results to return in one response. */
  maxResults?: number;
  /** The maximum time before responding to the request, even if the MinResults parameter is not fulfilled. */
  waitTime?: string;
}
export interface GetPTZPositionSearchResultsResponse {
  resultList?: FindPTZPositionResultList;
}
export interface FindMetadata {
  /** The point of time where the search will start. */
  startPoint?: Date;
  /** The point of time where the search will stop. This can be a time before the StartPoint, in which case the search is performed backwards in time. */
  endPoint?: Date;
  scope?: SearchScope;
  metadataFilter?: MetadataFilter;
  /** The search will be completed after this many matches. If not specified, the search will continue until reaching the endpoint or until the session expires. */
  maxMatches?: number;
  /** The time the search session will be kept alive after responding to this and subsequent requests. A device shall support at least values up to ten seconds. */
  keepAliveTime?: string;
}
export interface FindMetadataResponse {
  /** A unique reference to the search session created by this request. */
  searchToken?: JobToken;
}
export interface GetMetadataSearchResults {
  /** The search session to get results from. */
  searchToken?: JobToken;
  /** The minimum number of results to return in one response. */
  minResults?: number;
  /** The maximum number of results to return in one response. */
  maxResults?: number;
  /** The maximum time before responding to the request, even if the MinResults parameter is not fulfilled. */
  waitTime?: string;
}
export interface GetMetadataSearchResultsResponse {
  resultList?: FindMetadataResultList;
}
export interface GetSearchState {
  /** The search session to get the state from. */
  searchToken?: JobToken;
}
export interface GetSearchStateResponse {
  state?: SearchState;
}
export interface EndSearch {
  /** The search session to end. */
  searchToken?: JobToken;
}
export interface EndSearchResponse {
  /** The point of time the search had reached when it was ended. It is equal to the EndPoint specified in Find-operation if the search was completed. */
  endpoint?: Date;
}
