import { IntRange, ReferenceToken } from './common';

export interface MotionRegionConfigOptions {
  /** Indicates the support for PTZ preset based motion detection, if supported Preset token can be associated with a motion region. */
  PTZPresetMotionSupport?: boolean;
  /**
   * The total number of Motion Region Detector rules that can be created on the device.
   * This element is deprecated. maxInstances in the GetSupportedRules shall be used instead.
   */
  maxRegions?: number;
  /** True if the device supports disarming a Motion Region Detector rule. */
  disarmSupport?: boolean;
  /**
   * True if the device supports defining a region using a Polygon instead of a rectangle.
   * The rectangle points are still passed using a Polygon element if the device does not support polygon regions.
   * In this case, the points provided in the Polygon element shall represent a rectangle.
   */
  polygonSupport?: boolean;
  /**
   * For devices that support Polygons with limitations on the number of sides,
   * provides the minimum and maximum number of sides that can be defined in the
   * Polygon.
   */
  polygonLimits?: IntRange;
  /**
   * Indicates the device can only support one sensitivity level for all defines
   * motion detection regions. Changing the sensitivity for one region would be
   * applied to all regions.
   */
  singleSensitivitySupport?: boolean;
  /**
   * True if the device will include the Name of the Rule to indicate the region
   * that motion was detected in.
   */
  ruleNotification?: boolean;
}
export interface MotionRegionConfig {
  /**
   * Indicates if the Motion Region is Armed (detecting motion) or Disarmed (motion is
   * not being detected).
   */
  armed?: boolean;
  /**
   * Indicates the sensitivity level of the motion detector for this region. The
   * sensitivity value is normalized where 0 represents the lower sensitivity where
   * significant motion is required to trigger an alarm and 1 represents the higher
   * sensitivity where very little motion is required to trigger an alarm.
   */
  sensitivity?: number;
  /**
   * Provides the points of a Polygon in the VideoSourceConfiguration's Bounds
   * element. If the device does not support Polygons, this structure must contain
   * four points that represent a Rectangle.
   */
  ygon?: unknown;
  /** Preset position associated with the motion region defined by Polygon. */
  presetToken?: ReferenceToken;
}
