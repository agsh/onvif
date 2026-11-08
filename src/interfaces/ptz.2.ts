import {
  StringList,
  PTZConfiguration,
  AuxiliaryData,
  PTZSpeed,
  PresetTour,
  PTZPresetTourOperation,
} from './onvif';
import {
  ReferenceToken,
  PTZVector,
  GeoLocation,
} from './common';
import { Duration } from './basics';

export interface Capabilities {
  /** Indicates whether or not EFlip is supported. */
  EFlip?: boolean;
  /** Indicates whether or not reversing of PT control direction is supported. */
  reverse?: boolean;
  /** Indicates support for the GetCompatibleConfigurations command. */
  getCompatibleConfigurations?: boolean;
  /** Indicates that the PTZStatus includes MoveStatus information. */
  moveStatus?: boolean;
  /** Indicates that the PTZStatus includes Position information. */
  statusPosition?: boolean;
  /** Indication of the methods of MoveAndTrack that are supported, acceptable values are defined in tt:MoveAndTrackMethod. */
  moveAndTrack?: StringList;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetNode {
  /** Token of the requested PTZNode. */
  nodeToken: ReferenceToken;
}
export interface GetConfiguration {
  /** Token of the requested PTZConfiguration. */
  PTZConfigurationToken: ReferenceToken;
}
export interface SetConfiguration {
  /**/
  PTZConfiguration: PTZConfiguration;
  /** Flag that makes configuration persistent. Example: User wants the configuration to exist after reboot. */
  forcePersistence: boolean;
}
export interface GetConfigurationOptions {
  /** Token of an existing configuration that the options are intended for. */
  configurationToken: ReferenceToken;
}
export interface SendAuxiliaryCommand {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** The Auxiliary request data. */
  auxiliaryData: AuxiliaryData;
}
export interface GetPresets {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
}
export interface SetPreset {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested preset name. */
  presetName?: string;
  /** A requested preset token. */
  presetToken?: ReferenceToken;
}
export interface RemovePreset {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested preset token. */
  presetToken: ReferenceToken;
}
export interface GotoPreset {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested preset token. */
  presetToken: ReferenceToken;
  /** A requested speed.The speed parameter can only be specified when Speed Spaces are available for the PTZ Node. */
  speed?: PTZSpeed;
}
export interface GetStatus {
  /** A reference to the MediaProfile where the PTZStatus should be requested. */
  profileToken?: ReferenceToken;
}
export interface GotoHomePosition {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested speed.The speed parameter can only be specified when Speed Spaces are available for the PTZ Node. */
  speed?: PTZSpeed;
}
export interface SetHomePosition {
  /** A reference to the MediaProfile where the home position should be set. */
  profileToken?: ReferenceToken;
}
export interface ContinuousMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** A Velocity vector specifying the velocity of pan, tilt and zoom. */
  velocity: PTZSpeed;
  /** An optional Timeout parameter. */
  timeout?: Duration;
}
export interface RelativeMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** A positional Translation relative to the current position */
  translation: PTZVector;
  /** An optional Speed parameter. */
  speed?: PTZSpeed;
}
export interface AbsoluteMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** A Position vector specifying the absolute target position. */
  position: PTZVector;
  /** An optional Speed. */
  speed?: PTZSpeed;
}
export interface GeoMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** The geolocation of the target position. */
  target: GeoLocation;
  /** An optional Speed. */
  speed?: PTZSpeed;
  /** An optional indication of the height of the target/area. */
  areaHeight?: number;
  /** An optional indication of the width of the target/area. */
  areaWidth?: number;
}
export interface Stop {
  /** A reference to the MediaProfile that indicate what should be stopped. */
  profileToken?: ReferenceToken;
  /** Set true when we want to stop ongoing pan and tilt movements.If PanTilt arguments are not present, this command stops these movements. */
  panTilt?: boolean;
  /** Set true when we want to stop ongoing zoom movement.If Zoom arguments are not present, this command stops ongoing zoom movement. */
  zoom?: boolean;
}
export interface GetPresetTours {
  profileToken?: ReferenceToken;
}
export interface GetPresetTour {
  profileToken?: ReferenceToken;
  presetTourToken: ReferenceToken;
}
export interface GetPresetTourOptions {
  profileToken?: ReferenceToken;
  presetTourToken?: ReferenceToken;
}
export interface CreatePresetTour {
  profileToken?: ReferenceToken;
}
export interface ModifyPresetTour {
  profileToken?: ReferenceToken;
  presetTour: PresetTour;
}
export interface OperatePresetTour {
  profileToken?: ReferenceToken;
  presetTourToken: ReferenceToken;
  operation: PTZPresetTourOperation;
}
export interface RemovePresetTour {
  profileToken?: ReferenceToken;
  presetTourToken: ReferenceToken;
}
export interface GetCompatibleConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
