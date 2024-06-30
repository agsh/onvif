import { ReferenceToken } from './common';
import { Name, FloatRange, Capabilities } from './onvif';

export type Polarity = 'WhiteHot' | 'BlackHot';
/**
 * Describes standard Color Palette types, used to facilitate Multi-language support and client display.
 * "Custom" Type shall be used when Color Palette Name does not match any of the types included in the standard classification.
 */
export type ColorPaletteType =
  | 'Custom'
  | 'Grayscale'
  | 'BlackHot'
  | 'WhiteHot'
  | 'Sepia'
  | 'Red'
  | 'Iron'
  | 'Rain'
  | 'Rainbow'
  | 'Isotherm';
/** Describes a Color Palette element. */
export interface ColorPalette {
  /** Unique identifier of this Color Palette. */
  token: ReferenceToken;
  /**
   * Indicates Color Palette Type. Use tth:ColorPaletteType.
   * Used for multi-language support and display.
   */
  type: string;
  /** User readable Color Palette name. */
  name?: Name;
}
/** Type describing a NUC Table element. */
export interface NUCTable {
  /** Unique identifier of this NUC Table. */
  token: ReferenceToken;
  /** Low Temperature limit for application of NUC Table, in Kelvin. */
  lowTemperature?: number;
  /** High Temperature limit for application of NUC Table, in Kelvin. */
  highTemperature?: number;
  /** User reabable name for the Non-Uniformity Correction (NUC) Table. */
  name?: Name;
}
/** Type describing the Cooler settings. */
export interface Cooler {
  /** Indicates whether the Cooler is enabled (running) or not. */
  enabled?: boolean;
  /** Number of hours the Cooler has been running (unit: hours). Read-only. */
  runTime?: number;
}
/**
 * Describes valid ranges for the thermal device cooler settings.
 * Only applicable to cooled thermal devices.
 */
export interface CoolerOptions {
  /** Indicates the Device allows cooler status to be changed from running (Enabled) to stopped (Disabled), and viceversa. */
  enabled?: boolean;
}
/**
 * Holds default values that will be used in measurement modules when local parameters are not specified for the module (these are still required for valid temperature calculations).
 * Having ReflectedAmbientTemperature, Emissivity and DistanceToObject as mandatory ensures minimum parameters are available to obtain valid temperature values.
 */
export interface RadiometryGlobalParameters {
  /** Reflected Ambient Temperature for the environment in which the thermal device and the object being measured is located. */
  reflectedAmbientTemperature?: number;
  /** Emissivity of the surface of the object on which temperature is being measured. */
  emissivity?: number;
  /** Distance from the thermal device to the measured object. */
  distanceToObject?: number;
  /** Relative Humidity in the environment in which the measurement is located. */
  relativeHumidity?: number;
  /** Temperature of the atmosphere between the thermal device and the object being measured. */
  atmosphericTemperature?: number;
  /** Transmittance value for the atmosphere between the thermal device and the object being measured. */
  atmosphericTransmittance?: number;
  /** Temperature of the optics elements between the thermal device and the object being measured. */
  extOpticsTemperature?: number;
  /** Transmittance value for the optics elements between the thermal device and the object being measured. */
  extOpticsTransmittance?: number;
}
/** Describes valid ranges for the different radiometry parameters required for accurate temperature calculation. */
export interface RadiometryGlobalParameterOptions {
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
export interface Configuration {
  /** Current Color Palette in use by the Thermal Device. */
  colorPalette?: ColorPalette;
  /** Polarity configuration of the Thermal Device. */
  polarity?: Polarity;
  /** Current Non-Uniformity Correction (NUC) Table in use by the Thermal Device. */
  NUCTable?: NUCTable;
  /** Cooler settings of the Thermal Device. */
  cooler?: Cooler;
}
export interface Configurations {
  /** Reference token to the thermal VideoSource. */
  token: ReferenceToken;
  /** Current Thermal Settings for the VideoSource. */
  configuration?: Configuration;
}
export interface RadiometryConfiguration {
  /**
   * Global Parameters for Radiometry Measurements. Shall exist if Radiometry Capability is reported,
   * and Global Parameters are supported by the device.
   */
  radiometryGlobalParameters?: RadiometryGlobalParameters;
}
export interface ConfigurationOptions {
  /** List of Color Palettes available for the requested Thermal VideoSource. */
  colorPalette?: ColorPalette[];
  /** List of Non-Uniformity Correction (NUC) Tables available for the requested Thermal VideoSource. */
  NUCTable?: NUCTable[];
  /** Specifies Cooler Options for cooled thermal devices. */
  coolerOptions?: CoolerOptions;
}
export interface RadiometryConfigurationOptions {
  /**
   * Specifies valid ranges and options for the global radiometry parameters used as default parameter values
   * for temperature measurement modules (spots and boxes).
   */
  radiometryGlobalParameterOptions?: RadiometryGlobalParameterOptions;
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities of the thermal service are returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetConfigurationOptions {
  /** Reference token to the VideoSource for which the Thermal Configuration Options are requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetConfigurationOptionsResponse {
  /** Valid ranges for the Thermal configuration parameters that are categorized as device specific. */
  configurationOptions?: ConfigurationOptions;
}
export interface GetConfiguration {
  /** Reference token to the VideoSource for which the Thermal Settings are requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetConfigurationResponse {
  /** Thermal Settings for the VideoSource that was requested. */
  configuration?: Configuration;
}
export interface GetConfigurations {}
export interface GetConfigurationsResponse {
  /** This element contains a list of thermal VideoSource configurations. */
  configurations?: Configurations[];
}
export interface SetConfiguration {
  /** Reference token to the VideoSource for which the Thermal Settings are configured. */
  videoSourceToken?: ReferenceToken;
  /** Thermal Settings to be configured. */
  configuration?: Configuration;
}
export interface GetRadiometryConfigurationOptions {
  /** Reference token to the VideoSource for which the Thermal Radiometry Options are requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetRadiometryConfigurationOptionsResponse {
  /** Valid ranges for the Thermal Radiometry parameters that are categorized as device specific. */
  configurationOptions?: RadiometryConfigurationOptions;
}
export interface GetRadiometryConfiguration {
  /** Reference token to the VideoSource for which the Radiometry Configuration is requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetRadiometryConfigurationResponse {
  /** Radiometry Configuration for the VideoSource that was requested. */
  configuration?: RadiometryConfiguration;
}
export interface SetRadiometryConfiguration {
  /** Reference token to the VideoSource for which the Radiometry settings are configured. */
  videoSourceToken?: ReferenceToken;
  /** Radiometry settings to be configured. */
  configuration?: RadiometryConfiguration;
}
