import { AnyURI } from './basics';
import { Date } from './onvif';

/**
 * Unique identifier for a physical or logical resource.
 * Tokens should be assigned such that they are unique within a device. Tokens must be at least unique within its class.
 * Length up to 64 characters. Token may be extended by intermediate terminal with adding prefix to make it global unique.
 * The length should be within 36 characters for generating at local device. See "Remote Token" section in Resource Query specification.
 */
export type ReferenceToken = string;
export type MoveStatus = 'IDLE' | 'MOVING' | 'UNKNOWN';
export type Entity = 'Device' | 'VideoSource' | 'AudioSource';
/** Range of values greater equal Min value and less equal Max value. */
export interface IntRange {
  min?: number;
  max?: number;
}
export interface Vector2D {
  x: number;
  y: number;
  /**
   * Pan/tilt coordinate space selector. The following options are defined:
   *  http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace
   *  http://www.onvif.org/ver10/tptz/PanTiltSpaces/TranslationGenericSpace
   *  http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace
   *  http://www.onvif.org/ver10/tptz/PanTiltSpaces/GenericSpeedSpace
   *
   */
  space?: AnyURI;
}
export interface Vector1D {
  x: number;
  /**
   * Zoom coordinate space selector. The following options are defined:
   *  http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace
   *  http://www.onvif.org/ver10/tptz/ZoomSpaces/TranslationGenericSpace
   *  http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace
   *  http://www.onvif.org/ver10/tptz/ZoomSpaces/ZoomGenericSpeedSpace
   *
   */
  space?: AnyURI;
}
export interface PTZVector {
  /** Pan and tilt position. The x component corresponds to pan and the y component to tilt. */
  panTilt?: Vector2D;
  /** A zoom position. */
  zoom?: Vector1D;
}
export interface PTZStatus {
  /** Specifies the absolute position of the PTZ unit together with the Space references. The default absolute spaces of the corresponding PTZ configuration MUST be referenced within the Position element. */
  position?: PTZVector;
  /** Indicates if the Pan/Tilt/Zoom device unit is currently moving, idle or in an unknown state. */
  moveStatus?: PTZMoveStatus;
  /** States a current PTZ error. */
  error?: string;
  /** Specifies the UTC time when this status was generated. */
  utcTime?: Date;
}
export interface PTZMoveStatus {
  /**/
  panTilt?: MoveStatus;
  /**/
  zoom?: MoveStatus;
}
export interface Vector {
  x?: number;
  y?: number;
}
export interface Rectangle {
  bottom?: number;
  top?: number;
  right?: number;
  left?: number;
}
export interface Polygon {
  point?: Vector[];
}
export interface Color {
  X: number;
  Y: number;
  Z: number;
  /**
   * Acceptable values:
   *
   * http://www.onvif.org/ver10/colorspace/YCbCr - YCbCr
   * X attribute = Y value
   * Y attribute = Cb value
   * Z attribute = Cr value
   *
   * http://www.onvif.org/ver10/colorspace/RGB - RGB
   * X attribute = R value
   * Y attribute = G value
   * Z attribute = B value
   *
   *
   * If the Colorspace attribute is absent and not defined on higher level, YCbCr is implied.
   * Deprecated values:
   *
   * http://www.onvif.org/ver10/colorspace/CIELUV - CIE LUV
   * http://www.onvif.org/ver10/colorspace/CIELAB - CIE 1976 (L*a*b*)
   * http://www.onvif.org/ver10/colorspace/HSV - HSV
   *
   */
  colorspace?: AnyURI;
  /** Likelihood that the color is correct. */
  likelihood?: number;
}
export interface ColorCovariance {
  XX: number;
  YY: number;
  ZZ: number;
  XY?: number;
  XZ?: number;
  YZ?: number;
  /** Acceptable values are the same as in tt:Color. */
  colorspace?: AnyURI;
}
export interface ColorCluster {
  color?: Color;
  weight?: number;
  covariance?: ColorCovariance;
}
export interface ColorDescriptor {
  colorCluster?: ColorCluster[];
  extension?: unknown;
}
export interface Transformation {
  translate?: Vector;
  scale?: Vector;
  extension?: TransformationExtension;
}
export interface TransformationExtension {}
export interface GeoLocation {
  /** East west location as angle. */
  lon?: number;
  /** North south location as angle. */
  lat?: number;
  /** Hight in meters above sea level. */
  elevation?: number;
}
export interface GeoOrientation {
  /** Rotation around the x axis. */
  roll?: number;
  /** Rotation around the y axis. */
  pitch?: number;
  /** Rotation around the z axis. */
  yaw?: number;
}
export interface LocalLocation {
  /** East west location as angle. */
  x?: number;
  /** North south location as angle. */
  y?: number;
  /** Offset in meters from the sea level. */
  z?: number;
}
export interface LocalOrientation {
  /** Rotation around the y axis. */
  pan?: number;
  /** Rotation around the z axis. */
  tilt?: number;
  /** Rotation around the x axis. */
  roll?: number;
}
export interface SphericalCoordinate {
  /** Distance in meters to the object. */
  distance?: number;
  /** Elevation angle in the range -90 to 90 degrees, where 0 is in level with the x-y plane. */
  elevationAngle?: number;
  /** Azimuth angle in the range -180 to 180 degrees counter clockwise, where 0 is rightwards. */
  azimuthAngle?: number;
}
export interface LocationEntity {
  /** Entity type the entry refers to, use a value from the tt:Entity enumeration. */
  entity?: string;
  /** Optional entity token. */
  token?: ReferenceToken;
  /** If this value is true the entity cannot be deleted. */
  fixed?: boolean;
  /** Optional reference to the XAddr of another devices DeviceManagement service. */
  geoSource?: AnyURI;
  /** If set the geo location is obtained internally. */
  autoGeo?: boolean;
  /** Location on earth. */
  geoLocation?: GeoLocation;
  /** Orientation relative to earth. */
  geoOrientation?: GeoOrientation;
  /** Indoor location offset. */
  localLocation?: LocalLocation;
  /** Indoor orientation offset. */
  localOrientation?: LocalOrientation;
}
