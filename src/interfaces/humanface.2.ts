import { ColorDescriptor, GeoOrientation, IntRange } from './common';

export type Gender = 'Male' | 'Female';
export type Complexion = 'White' | 'Black' | 'Asian' | 'Other';
export type FacialShape = 'Long' | 'Round' | 'Square' | 'Oval' | 'Other';
export type Length = 'Long' | 'Medium' | 'Short';
export type HairStyle = 'Straight' | 'Wave' | 'Curly' | 'CrewCut' | 'Bald' | 'Ponytail' | 'Pigtail' | 'Other';
export type EyebrowWidth = 'Long' | 'Short';
export type EyebrowSpace = 'Joint' | 'Separate';
export type EyeShape = 'Almond' | 'Round' | 'Other';
export type Eyelid = 'Single' | 'Double' | 'Other';
export type Eyeball = 'Black' | 'Blue' | 'Brown' | 'Gray' | 'Green' | 'Pink' | 'Other';
export type EarShape = 'Round' | 'Pointed' | 'Narrow' | 'BroadLobe' | 'Other';
export type NoseLength = 'Short' | 'Long';
export type NoseBridge = 'Straight' | 'Arch';
export type NoseWing = 'Narrow' | 'Broad';
export type NoseEnd = 'Snub' | 'Turnedup' | 'Flat' | 'Hooked' | 'Other';
export type Lip = 'Full' | 'Medium' | 'Thin';
export type Chin = 'Double' | 'Pointed' | 'Round';
export type Expression = 'Natural' | 'Smile' | 'RaisedEyebrows' | 'Squint' | 'Frown' | 'Other';
export type HatType = 'Cap';
export type HelmetType = 'ConstructionCap' | 'CycleCap' | 'RidingHat';
export type FrecklesType = 'AroundCheek' | 'Nose' | 'forehead' | 'Other';
export interface Hair {
  /**
   * Describe the length of the Hair, acceptable values are defined in fc:Length. Short usually means that the end of the hair doesn’t exceed the shoulder.
   * Medium usually means that the end of the hair is parallel with the shoulder. Long usually means that the end of the hair exceeds the chest.
   */
  length?: string;
  /** Describe the style of the Hair, acceptable values are defined in fc:HairStyle. */
  style?: string;
  /** Describe the color of the Hair. */
  color?: ColorDescriptor;
  /** Describe the bangs of the Hair */
  bangs?: boolean;
}
export interface Eyebrow {
  /**
   * Describe the shape of the eyebrow, Short usually means that the width of eye brow is shorter than the length of eye.
   * Long usually means that the width of eye brow is equal to or longer than the length of eye.acceptable values are defined in fc:EyebrowWidth.
   */
  width?: string;
  /** Describe the Color of the eyebrow. */
  color?: ColorDescriptor;
  /** Describe the space of two eyebrows, acceptable values are defined in fc:EyebrowSpace. */
  space?: string;
}
export interface Eye {
  /** Describe the shape of the eye, acceptable values are defined in fc:EyeShape. */
  shape?: string;
  /** Describe the eyelid of the eye, acceptable values are defined in fc:Eyelid. */
  eyelid?: string;
  /** Describe the eyeball of the eye, acceptable values are defined in fc:Eyeball. */
  eyeball?: string;
}
export interface Nose {
  /**
   * Describe the length of the nose, acceptable values are defined in fc:NoseLength.
   * Long usually means that the length of the nose is longer than 1/3 of the length of the face.
   * short usually means that the length of the nose is shorter than 1/3 of the length of the face.
   */
  length?: string;
  /** Describe the bridge of the nose, acceptable values are defined in fc:NoseBridge. */
  noseBridge?: string;
  /** Describe the wing of the nose, acceptable values are defined in fc:NoseWing. */
  noseWing?: string;
  /** Describe the end of the nose, acceptable values are defined in fc:NoseEnd. */
  noseEnd?: string;
}
export interface FacialHair {
  /** Describe if there is mustache on the face. */
  mustache?: boolean;
  /** Describe if there are Beard on the face. */
  beard?: boolean;
  /** Describe if there are sideburns on the face. */
  sideburn?: boolean;
}
export interface PoseAngle {
  /** Describe the pose angle of the face. */
  poseAngles?: GeoOrientation;
  /** Describe the expected degree of uncertainty of the pose angle yaw, pitch, and roll. */
  uncertainty?: GeoOrientation;
}
export interface AccessoryDescription {
  /** Describe if the object wear a accessory . */
  wear?: boolean;
  /** Describe the Color of the accessory. */
  color?: ColorDescriptor;
  /**
   * Optional subtype of the accessory. For definitions refer enumerations starting with
   * the accessory name followed by 'Type' like fc:HatType or fc:HelmetType.
   */
  subtype?: string;
}
export interface Accessory {
  /** Describe if the object wear opticals. */
  opticals?: AccessoryDescription;
  /** Describe if the object wear hat. */
  hat?: AccessoryDescription;
  /** Describe if the object wear mask. */
  mask?: AccessoryDescription;
  /** Describe if the object wear hijab. */
  hijab?: AccessoryDescription;
  /** Describe if the object wear Helmet. */
  helmet?: AccessoryDescription;
  /** Describe if the object wear Kerchief. */
  kerchief?: AccessoryDescription;
  /** Describe if there is a patch on the right eye. */
  rightEyePatch?: AccessoryDescription;
  /** Describe if there is a patch on the left eye. */
  leftEyePatch?: AccessoryDescription;
}
export interface AdditionalFeatures {
  /** Is there scar on the face. */
  scar?: boolean;
  /** Is there mole on the face. */
  mole?: boolean;
  /** Is there Tattoo on the face. */
  tattoo?: boolean;
  /** Describe freckles on the face, acceptable values are defined in fc:FrecklesType. */
  freckles?: string;
}
export interface HumanFace {
  /** Describe the age of the face. */
  age?: IntRange;
  /** Describe the gender of the face, acceptable values are defined in fc:Gender. */
  gender?: string;
  /** Describe the temperature of the face, in Kelvin. */
  temperature?: number;
  /** Describe the complexion of the face, acceptable values are defined in fc:Complexion. */
  complexion?: string;
  /** Describe the FacialShape, acceptable values are defined fc:FacialShape. */
  facialShape?: string;
  /** Describe the hair of the face. */
  hair?: Hair;
  /** Describe the eyebrow of the face. */
  eyebrow?: Eyebrow;
  /** Describe the eye of the face. */
  eye?: Eye;
  /** Describe the Ear of the face. For definitions see fc:EarShape. */
  ear?: string;
  /** Describe the nose of the face. */
  nose?: Nose;
  /** Describe the facial hair of the face. */
  facialHair?: FacialHair;
  /** Describe the lip of the face, acceptable values are defined in fc:Lip. */
  lip?: string;
  /** Describe the Chin of the face, acceptable values are defined in fc:Chin. */
  chin?: string;
  /** Describe the expression on the face, acceptable values are defined in fc:Expression. */
  expression?: string;
  /** Describe the pose angle of the face. */
  poseAngle?: PoseAngle;
  /** Describe the Accessory of the face. */
  accessory?: Accessory;
  /** Describe the other features, eg scar, mole etc of the face. */
  additionalFeatures?: AdditionalFeatures;
}
