import { ColorDescriptor } from './common';

export type BodyShape = 'Fat' | 'Thin' | 'Other';
export type TopsCategory = 'LongSleeve' | 'ShortSleeve' | 'Sleeveless' | 'Other';
export type Grain = 'Stria' | 'Plaid' | 'PureColour' | 'Decal' | 'Other';
export type TopsStyle = 'Tailor' | 'Jacket' | 'Shirt' | 'Sweater' | 'Overcoat' | 'Dress' | 'Vest' | 'Other';
export type BottomsCategory = 'Trousers' | 'Shorts' | 'Skirt' | 'Other';
export type BottomsStyle = 'FornalPants' | 'Jeans' | 'Other';
export type ShoesCategory = 'Boots' | 'LeatherShoes' | 'Sneakers' | 'Sandal' | 'Slipper' | 'Other';
export type KnapsackCategory = 'SingleShoulderBag' | 'Backpack' | 'Other';
export type CartCategory = 'BabyCarriage' | 'TwoWheelVehicle' | 'Tricyle' | 'Other';
export type Smoking = 'NoSmoking' | 'Cigar' | 'ElectronicCigarettes' | 'Other';
export type UsingMobile = 'ByLeftHand' | 'ByRightHand' | 'Other';
export type HumanActivity =
  | 'Walking'
  | 'Running'
  | 'Fallen'
  | 'Squatting'
  | 'Sitting'
  | 'Standing'
  | 'Driving'
  | 'Other';
export interface BodyMetric {
  /** Describe the Stature of the body, the unit is centimeter. */
  height?: number;
  /** Describle the Shape of the body, acceptable values are defined in bd:BodyShape. */
  bodyShape?: string;
}
export interface Scarf {
  /** Describe the Color of the Scarf, acceptable values are defined in ColorDescriptor. */
  color?: ColorDescriptor;
  /** Describe if the body wears the Scarf. */
  wear?: boolean;
}
export interface Gloves {
  /** Describe the Color of Gloves, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
  /** Describe if the body wears Gloves. */
  wear?: boolean;
}
export interface Tops {
  /** Describe the Category of the Tops, acceptable values are defined in bd:TopsCategory. */
  category?: string;
  /** Describe the Color of the Tops, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
  /** Describe the Grain of the Tops, acceptable values are defined in bd:Grain. */
  grain?: string;
  /** Describe the Style of the Tops, acceptable values are defined in bd:TopsStyle. */
  style?: string;
}
export interface Bottoms {
  /** Describe the Category of the Bottoms, acceptable values are defined in bd:BottomsCategory. */
  category?: string;
  /** Describe the Color of the Bottoms, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
  /** Describe the Grain of the Bottoms, acceptable values are defined in bd:Grain. */
  grain?: string;
  /** Describe the Style of the Bottoms, acceptable values are defined in bd:BottomsStyle. */
  style?: string;
}
export interface Shoes {
  /** Describe the Category of the Shoes, acceptable values are defined in bd:ShoesCategory. */
  category?: string;
  /** Describe the Color of the Shoes, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
}
export interface Clothing {
  /** Describe the Scarf of the body,acceptable values are defined in bd:Scarf. */
  scarf?: Scarf;
  /** Describe Gloves of the body,acceptable values are defined in bd:Gloves. */
  gloves?: Gloves;
  /** Describe the Tops of the body,acceptable values are defined in bd:Tops. */
  tops?: Tops;
  /** Describe the Bottoms of the body,acceptable values are defined in bd:Bottoms. */
  bottoms?: Bottoms;
  /** Describe the Shoes of the body,acceptable values are defined in bd:Shoes. */
  shoes?: Shoes;
}
export interface Bag {
  /** Describe the Category of the Bag, acceptable values are defined in bd:KnapsackCategory. */
  category?: string;
  /** Describe the Colour of the Bag, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
}
export interface Umbrella {
  /** Describe the Color of the Bag, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
  /** Describe if the body Opens the Umbrella. */
  open?: boolean;
}
export interface Box {
  /** Describe the Color of the Box, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
  /** Describe if the body Lugs the Box. */
  lug?: boolean;
}
export interface Cart {
  /** Describe the Category of the Cart, acceptable values are defined in bd:CartCategory. */
  category?: string;
  /** Describe the Color of the Cart, acceptable values are defined in tt:ColorDescriptor. */
  color?: ColorDescriptor;
}
export interface Belonging {
  /** Describe the Bag of the body,acceptable values are defined in bd:Bag */
  bag?: Bag;
  /** Describe the Umbrella carried by the body,acceptable values are defined in bd:Umbrella. */
  umbrella?: Umbrella;
  /** Describe if the body Lifts something. */
  liftSomething?: boolean;
  /** Describe the Box luffed by the body,acceptable values are defined in bd:Box. */
  box?: Box;
  /** Describe the Cart pushed by the body,acceptable values are defined in bd:Cart. */
  cart?: Cart;
  /** Describe if the body carries the Weapon. */
  weapon?: boolean;
}
export interface Behaviour {
  /** Acceptable values are defined in bd:Smoking. */
  smoking?: string;
  /** Acceptable values are defined in bd:UsingMobile. */
  usingMobile?: string;
  /** Describe the activity of the body, Acceptable values are defined in bd:HumanActivity. */
  activity?: string;
}
export interface HumanBody {
  /** Describe the body metric of the body. */
  bodyMetric?: BodyMetric;
  /** Describe the Clothing of the body. */
  clothing?: Clothing;
  /** Describe the Belonging of the body. */
  belonging?: Belonging;
  /** Describe the Behaviour of the body. */
  behaviour?: Behaviour;
}
