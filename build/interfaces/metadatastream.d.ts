import { Transformation, ColorDescriptor, GeoLocation, SphericalCoordinate, Rectangle, Vector, Polygon, PTZStatus, GeoOrientation } from './common';
import { HumanFace } from './humanface.2';
import { HumanBody } from './humanbody.2';
import { AnyURI } from './basics';
import { Date } from './onvif';
export type VehicleType = 'Bus' | 'Car' | 'Truck' | 'Bicycle' | 'Motorcycle';
export type PlateType = 'Normal' | 'Police' | 'Diplomat' | 'Temporary';
export type BarcodeType = 'Code-39' | 'Code-49' | 'Code-93' | 'Code-128' | 'Code-11' | 'Code-25-Interleaved' | 'Code-25-NonInterleaved' | 'DataMatrix' | 'Maxicode' | 'Postnet' | 'RM4SCC' | 'ISBN-13' | 'ISBN-13-Dual' | 'ISBN-10' | 'ITF-14' | 'EAN-2' | 'EAN-8' | 'EAN-13' | 'EAN-14' | 'EAN-18' | 'EAN-99' | 'EAN-128' | 'SCC-14' | 'SSCC-18' | 'UPC-A' | 'UPC-E' | 'PDF417' | 'QRCode';
export type LabelAuthority = 'ISO_3864' | 'ISO_7010' | 'UNECE_ADR' | 'UNECE_GHS';
export type ObjectType = 'Animal' | 'HumanFace' | 'Human' | 'Bicycle' | 'Vehicle' | 'LicensePlate' | 'Bike' | 'Barcode';
export type ClassType = 'Animal' | 'Face' | 'Human' | 'Vehical' | 'Other';
export interface Appearance {
    transformation?: Transformation;
    shape?: ShapeDescriptor;
    color?: ColorDescriptor;
    class?: ClassDescriptor;
    extension?: AppearanceExtension;
    geoLocation?: GeoLocation;
    vehicleInfo?: VehicleInfo[];
    licensePlateInfo?: LicensePlateInfo;
    humanFace?: HumanFace;
    humanBody?: HumanBody;
    imageRef?: AnyURI;
    image?: unknown;
    barcodeInfo?: BarcodeInfo;
    sphericalCoordinate?: SphericalCoordinate;
    label?: LabelInfo[];
    [key: string]: unknown;
}
export interface AppearanceExtension {
    [key: string]: unknown;
}
export interface BarcodeInfo {
    /** Information encoded in barcode */
    data: StringLikelihood;
    /** Acceptable values are defined in tt:BarcodeType */
    type?: StringLikelihood;
    /** Refers to the pixels per module */
    PPM?: number;
    [key: string]: unknown;
}
export interface LabelInfo {
    likelihood?: number;
    authority: string;
    ID: unknown;
    [key: string]: unknown;
}
export interface VehicleInfo {
    type: StringLikelihood;
    brand?: StringLikelihood;
    model?: StringLikelihood;
    [key: string]: unknown;
}
export interface LicensePlateInfo {
    /** A string of vehicle license plate number. */
    plateNumber: StringLikelihood;
    /** A description of the vehicle license plate, e.g., "Normal", "Police", "Diplomat" */
    plateType?: StringLikelihood;
    /** Describe the country of the license plate, in order to avoid the same license plate number. */
    countryCode?: StringLikelihood;
    /** State province or authority that issue the license plate. */
    issuingEntity?: StringLikelihood;
    [key: string]: unknown;
}
export interface ShapeDescriptor {
    boundingBox: Rectangle;
    centerOfGravity: Vector;
    polygon?: Polygon[];
    extension?: ShapeDescriptorExtension;
    [key: string]: unknown;
}
export interface ShapeDescriptorExtension {
    [key: string]: unknown;
}
export interface StringLikelihood {
}
export interface ClassCandidate {
    type: ClassType;
    likelihood: number;
    [key: string]: unknown;
}
export interface ClassDescriptor {
    classCandidate?: ClassCandidate[];
    extension?: ClassDescriptorExtension;
    /** ONVIF recommends to use this 'Type' element instead of 'ClassCandidate' and 'Extension' above for new design. Acceptable values are defined in tt:ObjectType. */
    type?: StringLikelihood[];
    [key: string]: unknown;
}
export interface ClassDescriptorExtension {
    otherTypes?: OtherType[];
    extension?: ClassDescriptorExtension2;
}
export interface ClassDescriptorExtension2 {
}
export interface OtherType {
    /** Object Class Type */
    type: string;
    /** A likelihood/probability that the corresponding object belongs to this class. The sum of the likelihoods shall NOT exceed 1 */
    likelihood: number;
    [key: string]: unknown;
}
export interface OnvifObject extends ObjectId {
    /** Object ID of the parent object. eg: License plate object has Vehicle object as parent. */
    parent?: number;
    /** Object UUID of the parent object. eg: License plate object has Vehicle object as parent. */
    parentUUID?: string;
    appearance?: Appearance;
    behaviour?: Behaviour;
    extension?: ObjectExtension;
    [key: string]: unknown;
}
export interface ObjectExtension {
    [key: string]: unknown;
}
export interface Frame {
    utcTime: Date;
    /** Default color space of Color definitions in frame. Valid values are "RGB" and "YCbCr". Defaults to "YCbCr". */
    colorspace?: string;
    /** Optional name of the analytics module that generated this frame. */
    source?: string;
    PTZStatus?: PTZStatus;
    transformation?: Transformation;
    object?: unknown[];
    objectTree?: ObjectTree;
    extension?: FrameExtension;
    sceneImageRef?: AnyURI;
    sceneImage?: unknown;
    [key: string]: unknown;
}
export interface FrameExtension {
    motionInCells?: MotionInCells;
    extension?: FrameExtension2;
}
export interface FrameExtension2 {
}
export interface Merge {
    from?: ObjectId[];
    to: ObjectId;
}
export interface Split {
    from: ObjectId;
    to?: ObjectId[];
}
export interface Rename {
    from: ObjectId;
    to: ObjectId;
}
export interface ObjectId {
    objectId?: number;
    /** Object unique identifier. */
    UUID?: string;
}
export interface Removed {
}
export interface Idle {
}
export interface Behaviour {
    removed?: Removed;
    idle?: Idle;
    extension?: BehaviourExtension;
    speed?: number;
    /** Direction the object is moving. Yaw describes the horizontal direction in the range [-180..180] where 0 is towards the right of the device and 90 is away from the device. Pitch describes the vertical direction in the range [-90..90] where 90 is upwards. */
    direction?: GeoOrientation;
    [key: string]: unknown;
}
export interface BehaviourExtension {
    [key: string]: unknown;
}
export interface ObjectTree {
    rename?: Rename[];
    split?: Split[];
    merge?: Merge[];
    delete?: ObjectId[];
    extension?: ObjectTreeExtension;
    [key: string]: unknown;
}
export interface ObjectTreeExtension {
    [key: string]: unknown;
}
export interface MotionInCells {
    /** Number of columns of the cell grid (x dimension) */
    columns: number;
    /** Number of rows of the cell grid (y dimension) */
    rows: number;
    /** A “1” denotes a cell where motion is detected and a “0” an empty cell. The first cell is in the upper left corner. Then the cell order goes first from left to right and then from up to down.  If the number of cells is not a multiple of 8 the last byte is filled with zeros. The information is run length encoded according to Packbit coding in ISO 12369 (TIFF, Revision 6.0). */
    cells: unknown;
    [key: string]: unknown;
}
export interface MetadataStream {
}
export interface MetadataStreamExtension {
    audioAnalyticsStream?: AudioAnalyticsStream;
    extension?: MetadataStreamExtension2;
}
export interface MetadataStreamExtension2 {
}
export interface AudioAnalyticsStream {
    audioDescriptor?: AudioDescriptor[];
    extension?: AudioAnalyticsStreamExtension;
    [key: string]: unknown;
}
export interface AudioDescriptor {
    utcTime: Date;
    [key: string]: unknown;
}
export interface AudioAnalyticsStreamExtension {
    [key: string]: unknown;
}
export interface VideoAnalyticsStream {
}
export interface VideoAnalyticsStreamExtension {
    [key: string]: unknown;
}
export interface PTZStream {
}
export interface PTZStreamExtension {
    [key: string]: unknown;
}
export interface EventStream {
}
export interface EventStreamExtension {
    [key: string]: unknown;
}
