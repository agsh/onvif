import { ReferenceToken } from './common';
import {
  Name,
  Capabilities,
  ImagingSettings20,
  ImagingOptions20,
  FocusMove,
  MoveOptions20,
  ImagingStatus20,
} from './onvif';

/**
 * Describes standard Imaging Preset types, used to facilitate Multi-language support and client display.
 * "Custom" Type shall be used when Imaging Preset Name does not match any of the types included in the standard classification.
 */
export type ImagingPresetType =
  | 'Custom'
  | 'ClearWeather'
  | 'Cloudy'
  | 'Fog'
  | 'Rain'
  | 'Snowing'
  | 'Snow'
  | 'WDR'
  | 'Shade'
  | 'Night'
  | 'Indoor'
  | 'Fluorescent'
  | 'Incandescent'
  | 'Sodium(Natrium)'
  | 'Sunrise(Horizon)'
  | 'Sunset(Rear)'
  | 'ExtremeHot'
  | 'ExtremeCold'
  | 'Underwater'
  | 'CloseUp'
  | 'Motion'
  | 'FlickerFree50'
  | 'FlickerFree60';
/** Type describing the Imaging Preset settings. */
export interface ImagingPreset {
  /** Unique identifier of this Imaging Preset. */
  token: ReferenceToken;
  /**
   * Indicates Imaging Preset Type. Use timg:ImagingPresetType.
   * Used for multi-language support and display.
   */
  type: string;
  /** Human readable name of the Imaging Preset. */
  name?: Name;
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the imaging service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetImagingSettings {
  /** Reference token to the VideoSource for which the ImagingSettings. */
  videoSourceToken?: ReferenceToken;
}
export interface GetImagingSettingsResponse {
  /** ImagingSettings for the VideoSource that was requested. */
  imagingSettings?: ImagingSettings20;
}
export interface SetImagingSettings {
  videoSourceToken?: ReferenceToken;
  imagingSettings?: ImagingSettings20;
  forcePersistence?: boolean;
}
export interface GetOptions {
  /** Reference token to the VideoSource for which the imaging parameter options are requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetOptionsResponse {
  /** Valid ranges for the imaging parameters that are categorized as device specific. */
  imagingOptions?: ImagingOptions20;
}
export interface Move {
  /** Reference to the VideoSource for the requested move (focus) operation. */
  videoSourceToken?: ReferenceToken;
  /** Content of the requested move (focus) operation. */
  focus?: FocusMove;
}
export interface MoveResponse {}
export interface GetMoveOptions {
  /** Reference token to the VideoSource for the requested move options. */
  videoSourceToken?: ReferenceToken;
}
export interface GetMoveOptionsResponse {
  /** Valid ranges for the focus lens move options. */
  moveOptions?: MoveOptions20;
}
export interface Stop {
  /** Reference token to the VideoSource where the focus movement should be stopped. */
  videoSourceToken?: ReferenceToken;
}
export interface StopResponse {}
export interface GetStatus {
  /** Reference token to the VideoSource where the imaging status should be requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetStatusResponse {
  /** Requested imaging status. */
  status?: ImagingStatus20;
}
export interface GetPresets {
  /** A reference to the VideoSource where the operation should take place. */
  videoSourceToken?: ReferenceToken;
}
export interface GetPresetsResponse {
  /** List of Imaging Presets which are available for the requested VideoSource. */
  preset?: ImagingPreset[];
}
export interface GetCurrentPreset {
  /** Reference token to the VideoSource where the current Imaging Preset should be requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetCurrentPresetResponse {
  /** Current Imaging Preset in use for the specified Video Source. */
  preset?: ImagingPreset;
}
export interface SetCurrentPreset {
  /** Reference token to the VideoSource to which the specified Imaging Preset should be applied. */
  videoSourceToken?: ReferenceToken;
  /** Reference token to the Imaging Preset to be applied to the specified Video Source. */
  presetToken?: ReferenceToken;
}
export interface SetCurrentPresetResponse {}
