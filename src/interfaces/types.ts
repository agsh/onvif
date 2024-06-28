/**
 * Type used to reference logical and physical entities.
 * Token may be extended by intermediate terminal with adding prefix to make it global unique.
 * The length should be within 36 characters for generating as a local token.
 * See "Remote Token" section in Resource Query specification.
 */
export type ReferenceToken = string;
/** Type used for names of logical and physical entities. */
export type Name = string;
/**
 * Description is optional and the maximum length is device specific.
 * If the length is more than maximum length, it is silently chopped to the maximum length
 * supported by the device/service (which may be 0).
 */
export type Description = string;
/** Type used to represent the numbers from 1 ,2 , 3,... */
export type PositiveInteger = number;
/** Recognition/identification types supported by ONVIF. */
export type RecognitionType =
  | 'pt:Card'
  | 'pt:PIN'
  | 'pt:Fingerprint'
  | 'pt:Face'
  | 'pt:Iris'
  | 'pt:Vein'
  | 'pt:Palm'
  | 'pt:Retina'
  | 'pt:LicensePlate'
  | 'pt:REX';
export type StringList = string[];
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
}
