import { PositiveInteger } from './types';
import { ReferenceToken } from './common';

/** The direction for PanMove to move the device. */
export type PanDirection = 'Left' | 'Right';
/** The direction for TiltMove to move the device. */
export type TiltDirection = 'Up' | 'Down';
/** The direction for ZoomMove to change the focal length in relation to the video source. */
export type ZoomDirection = 'Wide' | 'Telephoto';
/** The direction for RollMove to move the device. */
export type RollDirection = 'Clockwise' | 'Counterclockwise' | 'Auto';
/** The direction for FocusMove to move the focal plane in relation to the video source. */
export type FocusDirection = 'Near' | 'Far' | 'Auto';
/** The quantity of movement events that have occured over the lifetime of the device. */
export interface Usage {
  /** The quantity of pan movement events over the life of the device. */
  pan?: PositiveInteger;
  /** The quantity of tilt movement events over the life of the device. */
  tilt?: PositiveInteger;
  /** The quantity of zoom movement events over the life of the device. */
  zoom?: PositiveInteger;
  /** The quantity of roll movement events over the life of the device. */
  roll?: PositiveInteger;
  /** The quantity of focus movement events over the life of the device. */
  focus?: PositiveInteger;
}
/** The provisioning capabilities of a video source on the device. */
export interface SourceCapabilities {
  /** Unique identifier of a video source. */
  videoSourceToken: ReferenceToken;
  /** Lifetime limit of pan moves for this video source.  Presence of this attribute indicates support of pan move. */
  maximumPanMoves?: PositiveInteger;
  /** Lifetime limit of tilt moves for this video source.  Presence of this attribute indicates support of tilt move. */
  maximumTiltMoves?: PositiveInteger;
  /** Lifetime limit of zoom moves for this video source.  Presence of this attribute indicates support of zoom move. */
  maximumZoomMoves?: PositiveInteger;
  /** Lifetime limit of roll moves for this video source.  Presence of this attribute indicates support of roll move. */
  maximumRollMoves?: PositiveInteger;
  /** Indicates "auto" as a valid enum for Direction in RollMove. */
  autoLevel?: boolean;
  /** Lifetime limit of focus moves for this video source.  Presence of this attribute indicates support of focus move. */
  maximumFocusMoves?: PositiveInteger;
  /** Indicates "auto" as a valid enum for Direction in FocusMove. */
  autoFocus?: boolean;
}
/** The capabilities of Provisioning Service on the device. */
export interface Capabilities {
  /** Maximum time before stopping movement after a move operation. */
  defaultTimeout?: string;
  /** Capabilities per video source. */
  source?: SourceCapabilities[];
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the provisioning service on this device. */
  capabilities?: Capabilities;
}
export interface PanMove {
  /** The video source associated with the provisioning. */
  videoSource?: ReferenceToken;
  /** "left" or "right". */
  direction?: PanDirection;
  /** "Operation timeout, if less than default timeout. */
  timeout?: string;
}
export interface PanMoveResponse {}
export interface TiltMove {
  /** The video source associated with the provisioning. */
  videoSource?: ReferenceToken;
  /** "up" or "down". */
  direction?: TiltDirection;
  /** "Operation timeout, if less than default timeout. */
  timeout?: string;
}
export interface TiltMoveResponse {}
export interface ZoomMove {
  /** The video source associated with the provisioning. */
  videoSource?: ReferenceToken;
  /** "wide" or "telephoto". */
  direction?: ZoomDirection;
  /** "Operation timeout, if less than default timeout. */
  timeout?: string;
}
export interface ZoomMoveResponse {}
export interface RollMove {
  /** The video source associated with the provisioning. */
  videoSource?: ReferenceToken;
  /** "clockwise", "counterclockwise", or "auto". */
  direction?: RollDirection;
  /** "Operation timeout, if less than default timeout. */
  timeout?: string;
}
export interface RollMoveResponse {}
export interface FocusMove {
  /** The video source associated with the provisioning. */
  videoSource?: ReferenceToken;
  /** "near", "far", or "auto". */
  direction?: FocusDirection;
  /** "Operation timeout, if less than default timeout. */
  timeout?: string;
}
export interface FocusMoveResponse {}
export interface Stop {
  /** The video source associated with the provisioning. */
  videoSource?: ReferenceToken;
}
export interface StopResponse {}
export interface GetUsage {
  /** The video source associated with the provisioning. */
  videoSource?: ReferenceToken;
}
export interface GetUsageResponse {
  /** The set of lifetime usage values for the provisioning associated with the video source. */
  usage?: Usage;
}
