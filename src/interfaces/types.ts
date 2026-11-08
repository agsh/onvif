/**
 * Type used to reference logical and physical entities.
 * Token may be extended by intermediate terminal with adding prefix to make it global unique.
 * The length should be within 36 characters for generating as a local token.
 * See "Remote Token" section in Resource Query specification.
 */
export type ReferenceToken = string;
/**
 * General datastructure referenced by a token.
 * Should be used as extension base.
 */
export interface DataEntity {
  /** A service-unique identifier of the item. */
  token: ReferenceToken;
}
/** Attributes contains a Name and an optional Value and type. */
export interface Attribute {
  /**
   * Name of attribute. Key names starting with "ONVIF" (any case) are reserved for ONVIF
   * use.
   */
  name: string;
  /** Value of attribute */
  value?: string;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
