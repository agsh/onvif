import { AnyURI } from './basics';
import { Capabilities } from './onvif';

/** Corresponds to SimpleTermType definition in ISO/IEC 15938-12 */
export type SimpleTermType = AnyURI;
/** Corresponds to mimeType definition in ISO/IEC 15938-12 */
export type mimeType = string;
/**
 * Contains features provided by a database, formatted according to
 * presets defined in ISO/IEC 15938-12
 */
export interface RegisterDatabase extends CapabilityType {
  serviceID: AnyURI;
  recordingSearchInterfaceRegistration?: boolean;
  extension?: RegisterDatabaseExtension;
}
export interface RegisterDatabaseExtension {}
export interface CapabilityType {
  supportedQFProfile?: TermType;
  supportedMetadata?: AnyURI[];
  supportedExampleMediaTypes?: unknown;
  supportedResultMediaTypes?: unknown;
  supportedQueryTypes?: TermType[];
  supportedExpressions?: TermType[];
}
/** Corresponds to TermType definition in ISO/IEC 15938-12 */
export interface TermType {
  href: SimpleTermType;
  name?: string;
  description?: string;
  term?: TermType[];
}
export interface GetServiceCapabilitiesResponse {
  capabilities?: Capabilities;
}
export interface GetServiceFeatures {
  /**
   * Contains descriptions of desired services
   * capabilities and may contain the ID for a particular service to
   * be addressed.
   */
  inputCapabilities?: unknown;
}
export interface GetServiceFeaturesResponse {
  /**
   * Contains a list of available service capability
   * descriptions or a system message in case of an error. If no
   * service is available or matches the given capabilities, then an
   * empty Output element is returned.
   */
  outputCapabilities?: unknown;
}
export interface Search {
  /**
   * Container for describing a query request
   * containing a set of conditions and/or the specification of the
   * structure and content of the output query format and a
   * declaration part.
   */
  inputQuery?: unknown;
}
export interface SearchResponse {
  /**
   * Container for all the results from a responder to
   * a requester. It may contain in addition messages such as error
   * and exception.
   */
  outputQuery?: unknown;
}
export interface GetSearchResults {
  /**
   * Allows to request the results of a previous query
   * issued.
   */
  results?: unknown;
}
export interface GetSearchResultsResponse {
  /**
   * Describes a single result returned from a
   * responder.
   */
  resultItem?: unknown[];
}
export interface RegisterDatabaseResponse {}
