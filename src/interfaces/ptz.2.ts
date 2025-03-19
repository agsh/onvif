import {
  StringList,
  Capabilities,
  PTZNode,
  PTZConfiguration,
  PTZConfigurationOptions,
  AuxiliaryData,
  PTZPreset,
  PTZSpeed,
  PresetTour,
  PTZPresetTourOptions,
  PTZPresetTourOperation,
} from './onvif';
import { ReferenceToken, PTZStatus, PTZVector, GeoLocation } from './common';

export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the PTZ service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetNodesResponse {
  /** A list of the existing PTZ Nodes on the device. */
  PTZNode?: PTZNode[];
}
export interface GetNode {
  /** Token of the requested PTZNode. */
  nodeToken?: ReferenceToken;
}
export interface GetNodeResponse {
  /** A requested PTZNode. */
  PTZNode?: PTZNode;
}
export interface GetConfigurationsResponse {
  /** A list of all existing PTZConfigurations on the device. */
  PTZConfiguration?: PTZConfiguration[];
}
export interface GetConfiguration {
  /** Token of the requested PTZConfiguration. */
  PTZConfigurationToken?: ReferenceToken;
}
export interface GetConfigurationResponse {
  /** A requested PTZConfiguration. */
  PTZConfiguration?: PTZConfiguration;
}
export interface SetConfiguration {
  /**/
  PTZConfiguration?: PTZConfiguration;
  /** Flag that makes configuration persistent. Example: User wants the configuration to exist after reboot. */
  forcePersistence?: boolean;
}
export interface SetConfigurationResponse {}
export interface GetConfigurationOptions {
  /** Token of an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
}
export interface GetConfigurationOptionsResponse {
  /** The requested PTZ configuration options. */
  PTZConfigurationOptions?: PTZConfigurationOptions;
}
export interface SendAuxiliaryCommand {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** The Auxiliary request data. */
  auxiliaryData?: AuxiliaryData;
}
export interface SendAuxiliaryCommandResponse {
  /** The response contains the auxiliary response. */
  auxiliaryResponse?: AuxiliaryData;
}
export interface GetPresets {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
}
export interface GetPresetsResponse {
  /** A list of presets which are available for the requested MediaProfile. */
  preset?: PTZPreset[];
}
export interface SetPreset {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested preset name. */
  presetName?: string;
  /** A requested preset token. */
  presetToken?: ReferenceToken;
}
export interface SetPresetResponse {
  /** A token to the Preset which has been set. */
  presetToken?: ReferenceToken;
}
export interface RemovePreset {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested preset token. */
  presetToken?: ReferenceToken;
}
export interface GotoPreset {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested preset token. */
  presetToken?: ReferenceToken;
  /** A requested speed.The speed parameter can only be specified when Speed Spaces are available for the PTZ Node. */
  speed?: PTZSpeed;
}
export interface GetStatus {
  /** A reference to the MediaProfile where the PTZStatus should be requested. */
  profileToken?: ReferenceToken;
}
export interface GetStatusResponse {
  /** The PTZStatus for the requested MediaProfile. */
  PTZStatus?: PTZStatus;
}
export interface GotoHomePosition {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A requested speed.The speed parameter can only be specified when Speed Spaces are available for the PTZ Node. */
  speed?: PTZSpeed;
}
export interface GotoHomePositionResponse {}
export interface SetHomePosition {
  /** A reference to the MediaProfile where the home position should be set. */
  profileToken?: ReferenceToken;
}
export interface SetHomePositionResponse {}
export interface ContinuousMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** A Velocity vector specifying the velocity of pan, tilt and zoom. */
  velocity?: PTZSpeed;
  /** An optional Timeout parameter. */
  timeout?: string;
}
export interface ContinuousMoveResponse {}
export interface RelativeMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** A positional Translation relative to the current position */
  translation?: PTZVector;
  /** An optional Speed parameter. */
  speed?: PTZSpeed;
}
export interface RelativeMoveResponse {}
export interface AbsoluteMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** A Position vector specifying the absolute target position. */
  position?: PTZVector;
  /** An optional Speed. */
  speed?: PTZSpeed;
}
export interface AbsoluteMoveResponse {}
export interface GeoMove {
  /** A reference to the MediaProfile. */
  profileToken?: ReferenceToken;
  /** The geolocation of the target position. */
  target?: GeoLocation;
  /** An optional Speed. */
  speed?: PTZSpeed;
  /** An optional indication of the height of the target/area. */
  areaHeight?: number;
  /** An optional indication of the width of the target/area. */
  areaWidth?: number;
}
export interface GeoMoveResponse {}
export interface Stop {
  /** A reference to the MediaProfile that indicate what should be stopped. */
  profileToken?: ReferenceToken;
  /** Set true when we want to stop ongoing pan and tilt movements.If PanTilt arguments are not present, this command stops these movements. */
  panTilt?: boolean;
  /** Set true when we want to stop ongoing zoom movement.If Zoom arguments are not present, this command stops ongoing zoom movement. */
  zoom?: boolean;
}
export interface StopResponse {}
export interface GetPresetTours {
  profileToken?: ReferenceToken;
}
export interface GetPresetToursResponse {
  presetTour?: PresetTour[];
}
export interface GetPresetTour {
  profileToken?: ReferenceToken;
  presetTourToken?: ReferenceToken;
}
export interface GetPresetTourResponse {
  presetTour?: PresetTour;
}
export interface GetPresetTourOptions {
  profileToken?: ReferenceToken;
  presetTourToken?: ReferenceToken;
}
export interface GetPresetTourOptionsResponse {
  options?: PTZPresetTourOptions;
}
export interface CreatePresetTour {
  profileToken?: ReferenceToken;
}
export interface CreatePresetTourResponse {
  presetTourToken?: ReferenceToken;
}
export interface ModifyPresetTour {
  profileToken?: ReferenceToken;
  presetTour?: PresetTour;
}
export interface ModifyPresetTourResponse {}
export interface OperatePresetTour {
  profileToken?: ReferenceToken;
  presetTourToken?: ReferenceToken;
  operation?: PTZPresetTourOperation;
}
export interface OperatePresetTourResponse {}
export interface RemovePresetTour {
  profileToken?: ReferenceToken;
  presetTourToken?: ReferenceToken;
}
export interface RemovePresetTourResponse {}
export interface GetCompatibleConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleConfigurationsResponse {
  /** A list of all existing PTZConfigurations on the NVT that is suitable to be added to the addressed media profile. */
  PTZConfiguration?: PTZConfiguration[];
}
export interface MoveAndStartTracking {
  /** A reference to the MediaProfile where the operation should take place. */
  profileToken?: ReferenceToken;
  /** A preset token. */
  presetToken?: ReferenceToken;
  /** The geolocation of the target position. */
  geoLocation?: GeoLocation;
  /** A Position vector specifying the absolute target position. */
  targetPosition?: PTZVector;
  /** Speed vector specifying the velocity of pan, tilt and zoom. */
  speed?: PTZSpeed;
  /** Object ID of the object to track. */
  objectID?: number;
}
export interface MoveAndStartTrackingResponse {}
