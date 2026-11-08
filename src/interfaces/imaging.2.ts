import { ReferenceToken } from './common';
import {
  Name,
  ImagingSettings20,
  FocusMove,
} from './onvif';
export interface Capabilities {
  /**
   * Indicates whether or not Image Stabilization feature is supported.
   * The use of this capability is deprecated, a client should use GetOption to find out if image stabilization is supported.
   */
  imageStabilization?: boolean;
  /** Indicates whether or not Imaging Presets feature is supported. */
  presets?: boolean;
  /** Indicates whether or not imaging preset settings can be updated. */
  adaptablePreset?: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
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
  name: Name;
}
export interface GetImagingSettings {
  /** Reference token to the VideoSource for which the ImagingSettings. */
  videoSourceToken: ReferenceToken;
}
export interface SetImagingSettings {
  videoSourceToken: ReferenceToken;
  imagingSettings: ImagingSettings20;
  forcePersistence?: boolean;
}
export interface GetOptions {
  /** Reference token to the VideoSource for which the imaging parameter options are requested. */
  videoSourceToken: ReferenceToken;
}
export interface Move {
  /** Reference to the VideoSource for the requested move (focus) operation. */
  videoSourceToken: ReferenceToken;
  /** Content of the requested move (focus) operation. */
  focus: FocusMove;
}
export interface GetMoveOptions {
  /** Reference token to the VideoSource for the requested move options. */
  videoSourceToken: ReferenceToken;
}
export interface Stop {
  /** Reference token to the VideoSource where the focus movement should be stopped. */
  videoSourceToken: ReferenceToken;
}
export interface GetStatus {
  /** Reference token to the VideoSource where the imaging status should be requested. */
  videoSourceToken: ReferenceToken;
}
export interface GetPresets {
  /** A reference to the VideoSource where the operation should take place. */
  videoSourceToken: ReferenceToken;
}
export interface GetCurrentPreset {
  /** Reference token to the VideoSource where the current Imaging Preset should be requested. */
  videoSourceToken: ReferenceToken;
}
export interface SetCurrentPreset {
  /** Reference token to the VideoSource to which the specified Imaging Preset should be applied. */
  videoSourceToken: ReferenceToken;
  /** Reference token to the Imaging Preset to be applied to the specified Video Source. */
  presetToken: ReferenceToken;
}
