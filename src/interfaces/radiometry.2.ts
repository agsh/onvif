import { FloatRange } from './onvif';
import { ReferenceToken, Vector, PTZVector, Rectangle } from './common';

export type TemperatureCondition = 'LessThan' | 'MoreThan' | 'EqualTo' | 'Change';
export type TemperatureType = 'MaxTemp' | 'MinTemp' | 'AverageTemp' | 'StdDeviation' | 'MedianTemp' | 'ISOCoverage';
export interface RadiometryModuleConfigOptions {
  /**
   * The total number of temperature measurement modules that can be created on the
   * device, screen based or geolocated, of any type (spots or boxes).
   */
  maxMeasurementModules?: number;
  /**
   * The total number of spot measurement modules that can be loaded simultaneously on the
   * screen by the device. A value of 0 shall be used to indicate no support for Spots.
   */
  maxScreenSpots?: number;
  /**
   * The total number of box measurement modules that can be loaded simultaneously on the
   * screen by the device. A value of 0 shall be used to indicate no support for Boxes.
   */
  maxScreenBoxes?: number;
  /** Specifies valid ranges for the different radiometry parameters used for temperature calculation. */
  radiometryParameterOptions?: RadiometryParameterOptions;
}
/** Describes valid ranges for the different radiometry parameters used for accurate temperature calculation. */
export interface RadiometryParameterOptions {
  /** Valid range of temperature values, in Kelvin. */
  reflectedAmbientTemperature?: FloatRange;
  /** Valid range of emissivity values for the objects to measure. */
  emissivity?: FloatRange;
  /** Valid range of distance between camera and object for a valid temperature reading, in meters. */
  distanceToObject?: FloatRange;
  /** Valid range of relative humidity values, in percentage. */
  relativeHumidity?: FloatRange;
  /** Valid range of temperature values, in Kelvin. */
  atmosphericTemperature?: FloatRange;
  /** Valid range of atmospheric transmittance values. */
  atmosphericTransmittance?: FloatRange;
  /** Valid range of temperature values, in Kelvin. */
  extOpticsTemperature?: FloatRange;
  /** Valid range of external optics transmittance. */
  extOpticsTransmittance?: FloatRange;
}
export interface RadiometrySpotModuleConfig {
  /** Unique identifier for this Spot Temperature Measurement Analytics Module. */
  itemID?: ReferenceToken;
  /** Indicates if the Temperature Measurement Item is enabled to provide temperature readings. */
  active?: boolean;
  /** Screen coordinates, if spot is currently on screen. Assumes normalized screen limits (-1.0, 1.0). */
  screenCoords?: Vector;
  /**
   * Absolute orientation of the PTZ Vector with the Spot on screen. If no PTZVector is present
   * the spot shall behave as a screen element, and stay on the same screen coordinates as the PTZ
   * moves (like a head up display mask). If PTZVector is present the Spot element shall appear on
   * display only when contained in the Field of View. In this case SpotScreenCoords shall be
   * reported as relative to PTZVector.
   */
  absoluteCoords?: PTZVector;
  /** Not present parameter means the Device shall use its value from Global Parameters in Thermal Service. */
  radiometryParameters?: RadiometryParameters;
}
export interface RadiometryBoxModuleConfig {
  /** Unique identifier for this Box Temperature Measurement Analytics Module. */
  itemID?: ReferenceToken;
  /** Indicates if the Temperature Measurement Item is enabled to provide temperature readings. */
  active?: boolean;
  /** Screen coordinates, if box is currently on screen. Assumes normalized screen limits (-1.0, 1.0). */
  screenCoords?: Rectangle;
  /**
   * Absolute orientation of the PTZ Vector with the Box on screen. If no PTZVector is present
   * the box shall behave as a screen element, and stay on the same screen coordinates as the PTZ
   * moves (like a head up display mask). If PTZVector is present the Box element shall appear on
   * display only when contained in the Field of View. In this case BoxScreenCoords shall be
   * reported as relative to PTZVector.
   */
  absoluteCoords?: PTZVector;
  /** Not present parameter means the Device shall use its value from Global Parameters in Thermal Service. */
  radiometryParameters?: RadiometryParameters;
}
export interface SpotTemperatureReading {
  itemID?: ReferenceToken;
  spotTemperature: number;
  /** Not present means Global Parameters from Thermal Service are being used. */
  radiometryParameters?: RadiometryParameters;
}
export interface BoxTemperatureReading {
  itemID: ReferenceToken;
  maxTemperature: number;
  minTemperature: number;
  averageTemperature?: number;
  medianTemperature?: number;
  /** Not present means Global Parameters from Thermal Service are being used. */
  radiometryParameters?: RadiometryParameters;
}
export interface RadiometryParameters {
  reflectedAmbientTemperature?: number;
  emissivity?: number;
  distanceToObject?: number;
  relativeHumidity?: number;
  atmosphericTemperature?: number;
  atmosphericTransmittance?: number;
  extOpticsTemperature?: number;
  extOpticsTransmittance?: number;
}
export interface RadiometryRuleConfigOptions {
  /** Specifies valid ranges for thresholds and reference parameters used for triggering radiometric rules. */
  radiometryRuleOptions?: RadiometryRuleOptions;
  /** Specifies valid rule conditions for temperature comparisions in radiometric rules. */
  temperatureConditionOptions?: TemperatureCondition[];
  /** Specifies temperature measurement types provided by radiometry analytics modules in the device. */
  temperatureTypeOptions?: TemperatureType[];
}
/** Describes valid ranges for radiometric rule condition thresholds and reference parameters. */
export interface RadiometryRuleOptions {
  /** Valid range of temperature values, in Kelvin. */
  thresholdTemperature?: FloatRange;
  /** Valid range of hysteresis time interval for temperature conditions, in seconds. */
  thresholdTime?: FloatRange;
  /** Valid range of temperature hysteresis values, in Kelvin. */
  hysteresisTemperature?: FloatRange;
}
export interface RadiometryTemperatureRuleConfig {
  /** Reference Token to the Temperature Measurement Analytics Module providing the Temperature on which rule is defined. */
  radiometryModuleID?: ReferenceToken;
  /** Indicates if the Temperature Rule is enabled to provide temperature alarm events. */
  enabled?: boolean;
  /**
   * Indicates which of the temperature values provided by the input Analytics Module
   * shall be used by the rule. In the case of Analytics Modules providing a single
   * Temperature Value (e.g. Spot) this parameter is ignored, and is therefore optional.
   */
  temperatureType?: TemperatureType;
  /** Indicates the type of temperature condition to check. */
  ruleCondition?: TemperatureCondition;
  /** Indicates the temperature reference value the rule shall be checked against. */
  thresholdTemperature?: number;
  /** Indicates the time interval during which the rule condition shall be met to trigger an event. */
  thresholdTime?: string;
  /** Indicates the width in Kelvin of the temerature hysteresis band to be considered by the rule. */
  hysteresisTemperature?: number;
}
