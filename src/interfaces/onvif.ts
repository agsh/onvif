import {
  ReferenceToken,
  IntRange,
  Vector2D,
  Vector1D,
  PTZVector,
  MoveStatus,
  Rectangle,
  Vector,
  Transformation,
  Color,
} from './common';
import { FilterType, AnyURI } from './basics';

/** User readable name. Length up to 64 characters. */
export type Name = string;
export type IntList = number[];
export type FloatList = number[];
export type StringAttrList = string[];
export type StringList = string[];
export type ReferenceTokenList = ReferenceToken[];
export type RotateMode = 'OFF' | 'ON' | 'AUTO';
export type SceneOrientationMode = 'MANUAL' | 'AUTO';
export type SceneOrientationOption = 'Below' | 'Horizon' | 'Above';
/** Source view modes supported by device. */
export type ViewModes =
  | 'tt:Fisheye'
  | 'tt:360Panorama'
  | 'tt:180Panorama'
  | 'tt:Quad'
  | 'tt:Original'
  | 'tt:LeftHalf'
  | 'tt:RightHalf'
  | 'tt:Dewarp';
export type VideoEncoding = 'JPEG' | 'MPEG4' | 'H264';
export type Mpeg4Profile = 'SP' | 'ASP';
export type H264Profile = 'Baseline' | 'Main' | 'Extended' | 'High';
/** Video Media Subtypes as referenced by IANA (without the leading "video/" Video Media Type).  See also  IANA Media Types. */
export type VideoEncodingMimeNames = 'JPEG' | 'MPV4-ES' | 'H264' | 'H265';
export type VideoEncodingProfiles = 'Simple' | 'AdvancedSimple' | 'Baseline' | 'Main' | 'Main10' | 'Extended' | 'High';
export type AudioEncoding = 'G711' | 'G726' | 'AAC';
/** Audio Media Subtypes as referenced by IANA (without the leading "audio/" Audio Media Type and except for the audio types defined in the restriction).  See also  IANA Media Types. */
export type AudioEncodingMimeNames = 'PCMU' | 'G726' | 'MP4A-LATM' | 'mpeg4-generic';
export type MetadataCompressionType = 'None' | 'GZIP' | 'EXI';
export type StreamType = 'RTP-Unicast' | 'RTP-Multicast';
export type TransportProtocol = 'UDP' | 'TCP' | 'RTSP' | 'HTTP';
export type ScopeDefinition = 'Fixed' | 'Configurable';
export type DiscoveryMode = 'Discoverable' | 'NonDiscoverable';
export type NetworkInterfaceConfigPriority = number;
export type Duplex = 'Full' | 'Half';
export type IANAIfTypes = number;
export type IPv6DHCPConfiguration = 'Auto' | 'Stateful' | 'Stateless' | 'Off';
export type NetworkProtocolType = 'HTTP' | 'HTTPS' | 'RTSP';
export type NetworkHostType = 'IPv4' | 'IPv6' | 'DNS';
export type IPv4Address = string;
export type IPv6Address = string;
export type HwAddress = string;
export type IPType = 'IPv4' | 'IPv6';
export type DNSName = string;
export type Domain = string;
export type IPAddressFilterType = 'Allow' | 'Deny';
export type DynamicDNSType = 'NoUpdate' | 'ClientUpdates' | 'ServerUpdates';
export type Dot11SSIDType = unknown;
export type Dot11StationMode = 'Ad-hoc' | 'Infrastructure' | 'Extended';
export type Dot11SecurityMode = 'None' | 'WEP' | 'PSK' | 'Dot1X' | 'Extended';
export type Dot11Cipher = 'CCMP' | 'TKIP' | 'Any' | 'Extended';
export type Dot11PSK = unknown;
export type Dot11PSKPassphrase = string;
export type Dot11SignalStrength = 'None' | 'Very Bad' | 'Bad' | 'Good' | 'Very Good' | 'Extended';
export type Dot11AuthAndMangementSuite = 'None' | 'Dot1X' | 'PSK' | 'Extended';
export type CapabilityCategory = 'All' | 'Analytics' | 'Device' | 'Events' | 'Imaging' | 'Media' | 'PTZ';
/** Enumeration describing the available system log modes. */
export type SystemLogType = 'System' | 'Access';
/** Enumeration describing the available factory default modes. */
export type FactoryDefaultType = 'Hard' | 'Soft';
export type SetDateTimeType = 'Manual' | 'NTP';
export type UserLevel = 'Administrator' | 'Operator' | 'User' | 'Anonymous' | 'Extended';
export type RelayLogicalState = 'active' | 'inactive';
export type RelayIdleState = 'closed' | 'open';
export type RelayMode = 'Monostable' | 'Bistable';
export type DigitalIdleState = 'closed' | 'open';
export type EFlipMode = 'OFF' | 'ON' | 'Extended';
export type ReverseMode = 'OFF' | 'ON' | 'AUTO' | 'Extended';
export type AuxiliaryData = string;
export type PTZPresetTourState = 'Idle' | 'Touring' | 'Paused' | 'Extended';
export type PTZPresetTourDirection = 'Forward' | 'Backward' | 'Extended';
export type PTZPresetTourOperation = 'Start' | 'Stop' | 'Pause' | 'Extended';
export type MoveAndTrackMethod = 'PresetToken' | 'GeoLocation' | 'PTZVector' | 'ObjectID';
export type AutoFocusMode = 'AUTO' | 'MANUAL';
export type AFModes = 'OnceAfterMove';
export type WideDynamicMode = 'OFF' | 'ON';
/** Enumeration describing the available backlight compenstation modes. */
export type BacklightCompensationMode = 'OFF' | 'ON';
export type ExposurePriority = 'LowNoise' | 'FrameRate';
export type ExposureMode = 'AUTO' | 'MANUAL';
export type Enabled = 'ENABLED' | 'DISABLED';
export type WhiteBalanceMode = 'AUTO' | 'MANUAL';
export type IrCutFilterMode = 'ON' | 'OFF' | 'AUTO';
export type ImageStabilizationMode = 'OFF' | 'ON' | 'AUTO' | 'Extended';
export type IrCutFilterAutoBoundaryType = 'Common' | 'ToOn' | 'ToOff' | 'Extended';
export type ToneCompensationMode = 'OFF' | 'ON' | 'AUTO';
export type DefoggingMode = 'OFF' | 'ON' | 'AUTO';
export type ImageSendingType = 'Embedded' | 'LocalStorage' | 'RemoteStorage';
export type PropertyOperation = 'Initialized' | 'Deleted' | 'Changed';
export type Direction = 'Left' | 'Right' | 'Any';
/** Specifies a receiver connection mode. */
export type ReceiverMode = 'AutoConnect' | 'AlwaysConnect' | 'NeverConnect' | 'Unknown';
/** Specifies the current connection state of the receiver. */
export type ReceiverState = 'NotConnected' | 'Connecting' | 'Connected' | 'Unknown';
export type ReceiverReference = ReferenceToken;
export type RecordingReference = ReferenceToken;
export type TrackReference = ReferenceToken;
export type Description = string;
export type XPathExpression = string;
export type SearchState = 'Queued' | 'Searching' | 'Completed' | 'Unknown';
export type JobToken = ReferenceToken;
export type TargetFormat = 'MP4' | 'CMAF';
export type EncryptionMode = 'CENC' | 'CBCS';
export type RecordingStatus = 'Initiated' | 'Recording' | 'Stopped' | 'Removing' | 'Removed' | 'Unknown';
export type TrackType = 'Video' | 'Audio' | 'Metadata' | 'Extended';
export type RecordingJobReference = ReferenceToken;
export type RecordingJobMode = string;
export type RecordingJobState = string;
export type ModeOfOperation = 'Idle' | 'Active' | 'Unknown';
/**
 * AudioClassType acceptable values are;
 * gun_shot, scream, glass_breaking, tire_screech
 */
export type AudioClassType = 'gun_shot' | 'scream' | 'glass_breaking' | 'tire_screech';
export type AudioClassification = 'GunShot' | 'Scream' | 'GlassBreaking' | 'TireScreech' | 'Alarm';
export type OSDType = 'Text' | 'Image' | 'Extended';
/** Base class for physical entities like inputs and outputs. */
export interface DeviceEntity {
  /** Unique identifier referencing the physical entity. */
  token: ReferenceToken;
}
/** Rectangle defined by lower left corner position and size. Units are pixel. */
export interface IntRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Range of a rectangle. The rectangle itself is defined by lower left corner position and size. Units are pixel. */
export interface IntRectangleRange {
  /** Range of X-axis. */
  XRange?: IntRange;
  /** Range of Y-axis. */
  YRange?: IntRange;
  /** Range of width. */
  widthRange?: IntRange;
  /** Range of height. */
  heightRange?: IntRange;
}
/** Range of values greater equal Min value and less equal Max value. */
export interface FloatRange {
  min?: number;
  max?: number;
}
/** Range of duration greater equal Min duration and less equal Max duration. */
export interface DurationRange {
  min?: string;
  max?: string;
}
/** List of values. */
export interface IntItems {
  items?: number[];
}
export interface FloatItems {
  items?: number[];
}
export interface AnyHolder {}
/** Representation of a physical video input. */
export interface VideoSource extends DeviceEntity {
  /** Frame rate in frames per second. */
  framerate?: number;
  /** Horizontal and vertical resolution */
  resolution?: VideoResolution;
  /** Optional configuration of the image sensor. */
  imaging?: ImagingSettings;
  extension?: VideoSourceExtension;
}
export interface VideoSourceExtension {
  /** Optional configuration of the image sensor. To be used if imaging service 2.00 is supported. */
  imaging?: ImagingSettings20;
  extension?: VideoSourceExtension2;
}
export interface VideoSourceExtension2 {}
/** Representation of a physical audio input. */
export interface AudioSource extends DeviceEntity {
  /** number of available audio channels. (1: mono, 2: stereo) */
  channels?: number;
}
/**
 * A media profile consists of a set of media configurations. Media profiles are used by a client
 * to configure properties of a media stream from an NVT.
 * An NVT shall provide at least one media profile at boot. An NVT should provide “ready to use”
 * profiles for the most common media configurations that the device offers.
 * A profile consists of a set of interconnected configuration entities. Configurations are provided
 * by the NVT and can be either static or created dynamically by the NVT. For example, the
 * dynamic configurations can be created by the NVT depending on current available encoding
 * resources.
 */
export interface Profile {
  /** Unique identifier of the profile. */
  token: ReferenceToken;
  /** A value of true signals that the profile cannot be deleted. Default is false. */
  fixed?: boolean;
  /** User readable name of the profile. */
  name?: Name;
  /** Optional configuration of the Video input. */
  videoSourceConfiguration?: VideoSourceConfiguration;
  /** Optional configuration of the Audio input. */
  audioSourceConfiguration?: AudioSourceConfiguration;
  /** Optional configuration of the Video encoder. */
  videoEncoderConfiguration?: VideoEncoderConfiguration;
  /** Optional configuration of the Audio encoder. */
  audioEncoderConfiguration?: AudioEncoderConfiguration;
  /** Optional configuration of the video analytics module and rule engine. */
  videoAnalyticsConfiguration?: VideoAnalyticsConfiguration;
  /** Optional configuration of the pan tilt zoom unit. */
  PTZConfiguration?: PTZConfiguration;
  /** Optional configuration of the metadata stream. */
  metadataConfiguration?: MetadataConfiguration;
  /** Extensions defined in ONVIF 2.0 */
  extension?: ProfileExtension;
}
export interface ProfileExtension {
  /** Optional configuration of the Audio output. */
  audioOutputConfiguration?: AudioOutputConfiguration;
  /** Optional configuration of the Audio decoder. */
  audioDecoderConfiguration?: AudioDecoderConfiguration;
  extension?: ProfileExtension2;
}
export interface ProfileExtension2 {}
/** Base type defining the common properties of a configuration. */
export interface ConfigurationEntity {
  /** Token that uniquely references this configuration. Length up to 64 characters. */
  token: ReferenceToken;
  /** User readable name. Length up to 64 characters. */
  name?: Name;
  /** Number of internal references currently using this configuration. This informational parameter is read-only. Deprecated for Media2 Service. */
  useCount?: number;
}
export interface VideoSourceConfiguration extends ConfigurationEntity {
  /** Readonly parameter signalling Source configuration's view mode, for devices supporting different view modes as defined in tt:viewModes. */
  viewMode?: string;
  /** Reference to the physical input. */
  sourceToken?: ReferenceToken;
  /** Rectangle specifying the Video capturing area. The capturing area shall not be larger than the whole Video source area. */
  bounds?: IntRectangle;
  extension?: VideoSourceConfigurationExtension;
}
export interface VideoSourceConfigurationExtension {
  /**
   * Optional element to configure rotation of captured image.
   * What resolutions a device supports shall be unaffected by the Rotate parameters.
   * If a device is configured with Rotate=AUTO, the device shall take control over the Degree parameter and automatically update it so that a client can query current rotation.
   * The device shall automatically apply the same rotation to its pan/tilt control direction depending on the following condition:
   * if Reverse=AUTO in PTControlDirection or if the device doesn’t support Reverse in PTControlDirection
   */
  rotate?: Rotate;
  extension?: VideoSourceConfigurationExtension2;
}
export interface VideoSourceConfigurationExtension2 {
  /** Optional element describing the geometric lens distortion. Multiple instances for future variable lens support. */
  lensDescription?: LensDescription[];
  /** Optional element describing the scene orientation in the camera’s field of view. */
  sceneOrientation?: SceneOrientation;
}
export interface Rotate {
  /** Parameter to enable/disable Rotation feature. */
  mode?: RotateMode;
  /** Optional parameter to configure how much degree of clockwise rotation of image  for On mode. Omitting this parameter for On mode means 180 degree rotation. */
  degree?: number;
  extension?: RotateExtension;
}
export interface RotateExtension {}
export interface LensProjection {
  /** Angle of incidence. */
  angle?: number;
  /** Mapping radius as a consequence of the emergent angle. */
  radius?: number;
  /** Optional ray absorption at the given angle due to vignetting. A value of one means no absorption. */
  transmittance?: number;
}
export interface LensOffset {
  /** Optional horizontal offset of the lens center in normalized coordinates. */
  x?: number;
  /** Optional vertical offset of the lens center in normalized coordinates. */
  y?: number;
}
export interface LensDescription {
  /** Optional focal length of the optical system. */
  focalLength?: number;
  /** Offset of the lens center to the imager center in normalized coordinates. */
  offset?: LensOffset;
  /**
   * Radial description of the projection characteristics. The resulting curve is defined by the B-Spline interpolation
   * over the given elements. The element for Radius zero shall not be provided. The projection points shall be ordered with ascending Radius.
   * Items outside the last projection Radius shall be assumed to be invisible (black).
   */
  projection?: LensProjection[];
  /** Compensation of the x coordinate needed for the ONVIF normalized coordinate system. */
  XFactor?: number;
}
export interface VideoSourceConfigurationOptions {
  /** Maximum number of profiles. */
  maximumNumberOfProfiles?: number;
  /**
   * Supported range for the capturing area.
   * Device that does not support cropped streaming shall express BoundsRange option as mentioned below
   * BoundsRange->XRange and BoundsRange->YRange with same Min/Max values HeightRange and WidthRange Min/Max values same as VideoSource Height and Width Limits.
   */
  boundsRange?: IntRectangleRange;
  /** List of physical inputs. */
  videoSourceTokensAvailable?: ReferenceToken[];
  extension?: VideoSourceConfigurationOptionsExtension;
}
export interface VideoSourceConfigurationOptionsExtension {
  /** Options of parameters for Rotation feature. */
  rotate?: RotateOptions;
  extension?: VideoSourceConfigurationOptionsExtension2;
}
export interface VideoSourceConfigurationOptionsExtension2 {
  /** Scene orientation modes supported by the device for this configuration. */
  sceneOrientationMode?: SceneOrientationMode[];
}
export interface RotateOptions {
  /**
   * Signals if a device requires a reboot after changing the rotation.
   * If a device can handle rotation changes without rebooting this value shall be set to false.
   */
  reboot?: boolean;
  /** Supported options of Rotate mode parameter. */
  mode?: RotateMode[];
  /** List of supported degree value for rotation. */
  degreeList?: IntItems;
  extension?: RotateOptionsExtension;
}
export interface RotateOptionsExtension {}
export interface SceneOrientation {
  /** Parameter to assign the way the camera determines the scene orientation. */
  mode?: SceneOrientationMode;
  /**
   * Assigned or determined scene orientation based on the Mode. When assigning the Mode to AUTO, this field
   * is optional and will be ignored by the device. When assigning the Mode to MANUAL, this field is required
   * and the device will return an InvalidArgs fault if missing.
   */
  orientation?: string;
}
export interface VideoEncoderConfiguration extends ConfigurationEntity {
  /**
   * A value of true indicates that frame rate is a fixed value rather than an upper limit,
   * and that the video encoder shall prioritize frame rate over all other adaptable
   * configuration values such as bitrate.  Default is false.
   */
  guaranteedFrameRate?: boolean;
  /** Used video codec, either Jpeg, H.264 or Mpeg4 */
  encoding?: VideoEncoding;
  /** Configured video resolution */
  resolution?: VideoResolution;
  /** Relative value for the video quantizers and the quality of the video. A high value within supported quality range means higher quality */
  quality?: number;
  /** Optional element to configure rate control related parameters. */
  rateControl?: VideoRateControl;
  /** Optional element to configure Mpeg4 related parameters. */
  MPEG4?: Mpeg4Configuration;
  /** Optional element to configure H.264 related parameters. */
  H264?: H264Configuration;
  /** Defines the multicast settings that could be used for video streaming. */
  multicast?: MulticastConfiguration;
  /** The rtsp session timeout for the related video stream */
  sessionTimeout?: string;
}
export interface VideoResolution {
  /** Number of the columns of the Video image. */
  width?: number;
  /** Number of the lines of the Video image. */
  height?: number;
}
export interface VideoRateControl {
  /** Maximum output framerate in fps. If an EncodingInterval is provided the resulting encoded framerate will be reduced by the given factor. */
  frameRateLimit?: number;
  /** Interval at which images are encoded and transmitted. (A value of 1 means that every frame is encoded, a value of 2 means that every 2nd frame is encoded ...) */
  encodingInterval?: number;
  /** the maximum output bitrate in kbps */
  bitrateLimit?: number;
}
export interface Mpeg4Configuration {
  /** Determines the interval in which the I-Frames will be coded. An entry of 1 indicates I-Frames are continuously generated. An entry of 2 indicates that every 2nd image is an I-Frame, and 3 only every 3rd frame, etc. The frames in between are coded as P or B Frames. */
  govLength?: number;
  /** the Mpeg4 profile, either simple profile (SP) or advanced simple profile (ASP) */
  mpeg4Profile?: Mpeg4Profile;
}
export interface H264Configuration {
  /** Group of Video frames length. Determines typically the interval in which the I-Frames will be coded. An entry of 1 indicates I-Frames are continuously generated. An entry of 2 indicates that every 2nd image is an I-Frame, and 3 only every 3rd frame, etc. The frames in between are coded as P or B Frames. */
  govLength?: number;
  /** the H.264 profile, either baseline, main, extended or high */
  H264Profile?: H264Profile;
}
export interface VideoEncoderConfigurationOptions {
  /** Indicates the support for the GuaranteedFrameRate attribute on the VideoEncoderConfiguration element. */
  guaranteedFrameRateSupported?: boolean;
  /** Range of the quality values. A high value means higher quality. */
  qualityRange?: IntRange;
  /** Optional JPEG encoder settings ranges (See also Extension element). */
  JPEG?: JpegOptions;
  /** Optional MPEG-4 encoder settings ranges (See also Extension element). */
  MPEG4?: Mpeg4Options;
  /** Optional H.264 encoder settings ranges (See also Extension element). */
  H264?: H264Options;
  extension?: VideoEncoderOptionsExtension;
}
export interface VideoEncoderOptionsExtension {
  /** Optional JPEG encoder settings ranges. */
  JPEG?: JpegOptions2;
  /** Optional MPEG-4 encoder settings ranges. */
  MPEG4?: Mpeg4Options2;
  /** Optional H.264 encoder settings ranges. */
  H264?: H264Options2;
  extension?: VideoEncoderOptionsExtension2;
}
export interface VideoEncoderOptionsExtension2 {}
export interface JpegOptions {
  /** List of supported image sizes. */
  resolutionsAvailable?: VideoResolution[];
  /** Supported frame rate in fps (frames per second). */
  frameRateRange?: IntRange;
  /** Supported encoding interval range. The encoding interval corresponds to the number of frames devided by the encoded frames. An encoding interval value of "1" means that all frames are encoded. */
  encodingIntervalRange?: IntRange;
}
export interface JpegOptions2 extends JpegOptions {
  /** Supported range of encoded bitrate in kbps. */
  bitrateRange?: IntRange;
}
export interface Mpeg4Options {
  /** List of supported image sizes. */
  resolutionsAvailable?: VideoResolution[];
  /** Supported group of Video frames length. This value typically corresponds to the I-Frame distance. */
  govLengthRange?: IntRange;
  /** Supported frame rate in fps (frames per second). */
  frameRateRange?: IntRange;
  /** Supported encoding interval range. The encoding interval corresponds to the number of frames devided by the encoded frames. An encoding interval value of "1" means that all frames are encoded. */
  encodingIntervalRange?: IntRange;
  /** List of supported MPEG-4 profiles. */
  mpeg4ProfilesSupported?: Mpeg4Profile[];
}
export interface Mpeg4Options2 extends Mpeg4Options {
  /** Supported range of encoded bitrate in kbps. */
  bitrateRange?: IntRange;
}
export interface H264Options {
  /** List of supported image sizes. */
  resolutionsAvailable?: VideoResolution[];
  /** Supported group of Video frames length. This value typically corresponds to the I-Frame distance. */
  govLengthRange?: IntRange;
  /** Supported frame rate in fps (frames per second). */
  frameRateRange?: IntRange;
  /** Supported encoding interval range. The encoding interval corresponds to the number of frames devided by the encoded frames. An encoding interval value of "1" means that all frames are encoded. */
  encodingIntervalRange?: IntRange;
  /** List of supported H.264 profiles. */
  H264ProfilesSupported?: H264Profile[];
}
export interface H264Options2 extends H264Options {
  /** Supported range of encoded bitrate in kbps. */
  bitrateRange?: IntRange;
}
export interface VideoEncoder2Configuration extends ConfigurationEntity {
  /** Group of Video frames length. Determines typically the interval in which the I-Frames will be coded. An entry of 1 indicates I-Frames are continuously generated. An entry of 2 indicates that every 2nd image is an I-Frame, and 3 only every 3rd frame, etc. The frames in between are coded as P or B Frames. */
  govLength?: number;
  /** Distance between anchor frames of type I-Frame and P-Frame. '1' indicates no B-Frames, '2' indicates that every 2nd frame is encoded as B-Frame, '3' indicates a structure like IBBPBBP..., etc. */
  anchorFrameDistance?: number;
  /** The encoder profile as defined in tt:VideoEncodingProfiles. */
  profile?: string;
  /**
   * A value of true indicates that frame rate is a fixed value rather than an upper limit,
   * and that the video encoder shall prioritize frame rate over all other adaptable
   * configuration values such as bitrate.  Default is false.
   */
  guaranteedFrameRate?: boolean;
  /** Video Media Subtype for the video format. For definitions see tt:VideoEncodingMimeNames and  IANA Media Types. */
  encoding?: string;
  /** Configured video resolution */
  resolution?: VideoResolution2;
  /** Optional element to configure rate control related parameters. */
  rateControl?: VideoRateControl2;
  /** Defines the multicast settings that could be used for video streaming. */
  multicast?: MulticastConfiguration;
  /** Relative value for the video quantizers and the quality of the video. A high value within supported quality range means higher quality */
  quality?: number;
}
export interface VideoResolution2 {
  /** Number of the columns of the Video image. */
  width?: number;
  /** Number of the lines of the Video image. */
  height?: number;
}
export interface VideoRateControl2 {
  /** Enforce constant bitrate. */
  constantBitRate?: boolean;
  /** Desired frame rate in fps. The actual rate may be lower due to e.g. performance limitations. */
  frameRateLimit?: number;
  /** the maximum output bitrate in kbps */
  bitrateLimit?: number;
}
export interface VideoEncoder2ConfigurationOptions {
  /** Exactly two values, which define the Lower and Upper bounds for the supported group of Video frames length. These values typically correspond to the I-Frame distance. */
  govLengthRange?: IntList;
  /** Signals support for B-Frames. Upper bound for the supported anchor frame distance (must be larger than one). */
  maxAnchorFrameDistance?: number;
  /** List of supported target frame rates in fps (frames per second). The list shall be sorted with highest values first. */
  frameRatesSupported?: FloatList;
  /** List of supported encoder profiles as defined in tt::VideoEncodingProfiles. */
  profilesSupported?: StringAttrList;
  /** Signal whether enforcing constant bitrate is supported. */
  constantBitRateSupported?: boolean;
  /** Indicates the support for the GuaranteedFrameRate attribute on the VideoEncoder2Configuration element. */
  guaranteedFrameRateSupported?: boolean;
  /** Video Media Subtype for the video format. For definitions see tt:VideoEncodingMimeNames and  IANA Media Types. */
  encoding?: string;
  /** Range of the quality values. A high value means higher quality. */
  qualityRange?: FloatRange;
  /** List of supported image sizes. */
  resolutionsAvailable?: VideoResolution2[];
  /** Supported range of encoded bitrate in kbps. */
  bitrateRange?: IntRange;
}
export interface AudioSourceConfiguration extends ConfigurationEntity {
  /** Token of the Audio Source the configuration applies to */
  sourceToken?: ReferenceToken;
}
export interface AudioSourceConfigurationOptions {
  /** Tokens of the audio source the configuration can be used for. */
  inputTokensAvailable?: ReferenceToken[];
  extension?: AudioSourceOptionsExtension;
}
export interface AudioSourceOptionsExtension {}
export interface AudioEncoderConfiguration extends ConfigurationEntity {
  /** Audio codec used for encoding the audio input (either G.711, G.726 or AAC) */
  encoding?: AudioEncoding;
  /** The output bitrate in kbps. */
  bitrate?: number;
  /** The output sample rate in kHz. */
  sampleRate?: number;
  /** Defines the multicast settings that could be used for video streaming. */
  multicast?: MulticastConfiguration;
  /** The rtsp session timeout for the related audio stream */
  sessionTimeout?: string;
}
export interface AudioEncoderConfigurationOptions {
  /** list of supported AudioEncoderConfigurations */
  options?: AudioEncoderConfigurationOption[];
}
export interface AudioEncoderConfigurationOption {
  /** The enoding used for audio data (either G.711, G.726 or AAC) */
  encoding?: AudioEncoding;
  /** List of supported bitrates in kbps for the specified Encoding */
  bitrateList?: IntItems;
  /** List of supported Sample Rates in kHz for the specified Encoding */
  sampleRateList?: IntItems;
}
export interface AudioEncoder2Configuration extends ConfigurationEntity {
  /** Audio Media Subtype for the audio format. For definitions see tt:AudioEncodingMimeNames and  IANA Media Types. */
  encoding?: string;
  /** Optional multicast configuration of the audio stream. */
  multicast?: MulticastConfiguration;
  /** The output bitrate in kbps. */
  bitrate?: number;
  /** The output sample rate in kHz. */
  sampleRate?: number;
}
export interface AudioEncoder2ConfigurationOptions {
  /** Audio Media Subtype for the audio format. For definitions see tt:AudioEncodingMimeNames and  IANA Media Types. */
  encoding?: string;
  /** List of supported bitrates in kbps for the specified Encoding */
  bitrateList?: IntItems;
  /** List of supported Sample Rates in kHz for the specified Encoding */
  sampleRateList?: IntItems;
}
export interface VideoAnalyticsConfiguration extends ConfigurationEntity {
  analyticsEngineConfiguration?: AnalyticsEngineConfiguration;
  ruleEngineConfiguration?: RuleEngineConfiguration;
}
export interface MetadataConfiguration extends ConfigurationEntity {
  /** Optional parameter to configure compression type of Metadata payload. Use values from enumeration MetadataCompressionType. */
  compressionType?: string;
  /** Optional parameter to configure if the metadata stream shall contain the Geo Location coordinates of each target. */
  geoLocation?: boolean;
  /** Optional parameter to configure if the generated metadata stream should contain shape information as polygon. */
  shapePolygon?: boolean;
  /** optional element to configure which PTZ related data is to include in the metadata stream */
  PTZStatus?: PTZFilter;
  /**
   * Optional element to configure the streaming of events. A client might be interested in receiving all,
   * none or some of the events produced by the device:
   * To get all events: Include the Events element but do not include a filter.
   * To get no events: Do not include the Events element.
   * To get only some events: Include the Events element and include a filter in the element.
   *
   */
  events?: EventSubscription;
  /** Defines whether the streamed metadata will include metadata from the analytics engines (video, cell motion, audio etc.) */
  analytics?: boolean;
  /** Defines the multicast settings that could be used for video streaming. */
  multicast?: MulticastConfiguration;
  /** The rtsp session timeout for the related audio stream (when using Media2 Service, this value is deprecated and ignored) */
  sessionTimeout?: string;
  /**
   * Indication which AnalyticsModules shall output metadata.
   * Note that the streaming behavior is undefined if the list includes items that are not part of the associated AnalyticsConfiguration.
   */
  analyticsEngineConfiguration?: AnalyticsEngineConfiguration;
  extension?: MetadataConfigurationExtension;
}
export interface MetadataConfigurationExtension {}
export interface PTZFilter {
  /** True if the metadata stream shall contain the PTZ status (IDLE, MOVING or UNKNOWN) */
  status?: boolean;
  /** True if the metadata stream shall contain the PTZ position */
  position?: boolean;
}
export interface SubscriptionPolicy {}
/** Subcription handling in the same way as base notification subscription. */
export interface EventSubscription {
  filter?: FilterType;
  subscriptionPolicy?: SubscriptionPolicy;
}
export interface MetadataConfigurationOptions {
  /** True if the device is able to stream the Geo Located positions of each target. */
  geoLocation?: boolean;
  /** A device signalling support for content filtering shall support expressions with the provided expression size. */
  maxContentFilterSize?: number;
  PTZStatusFilterOptions?: PTZStatusFilterOptions;
  extension?: MetadataConfigurationOptionsExtension;
}
export interface MetadataConfigurationOptionsExtension {
  /** List of supported metadata compression type. Its options shall be chosen from tt:MetadataCompressionType. */
  compressionType?: string[];
  extension?: MetadataConfigurationOptionsExtension2;
}
export interface MetadataConfigurationOptionsExtension2 {}
export interface PTZStatusFilterOptions {
  /** True if the device is able to stream pan or tilt status information. */
  panTiltStatusSupported?: boolean;
  /** True if the device is able to stream zoom status inforamtion. */
  zoomStatusSupported?: boolean;
  /** True if the device is able to stream the pan or tilt position. */
  panTiltPositionSupported?: boolean;
  /** True if the device is able to stream zoom position information. */
  zoomPositionSupported?: boolean;
  extension?: PTZStatusFilterOptionsExtension;
}
export interface PTZStatusFilterOptionsExtension {}
/** Representation of a physical video outputs. */
export interface VideoOutput extends DeviceEntity {
  layout?: Layout;
  /** Resolution of the display in Pixel. */
  resolution?: VideoResolution;
  /** Refresh rate of the display in Hertz. */
  refreshRate?: number;
  /** Aspect ratio of the display as physical extent of width divided by height. */
  aspectRatio?: number;
  extension?: VideoOutputExtension;
}
export interface VideoOutputExtension {}
export interface VideoOutputConfiguration extends ConfigurationEntity {
  /** Token of the Video Output the configuration applies to */
  outputToken?: ReferenceToken;
}
export interface VideoOutputConfigurationOptions {}
export interface VideoDecoderConfigurationOptions {
  /** If the device is able to decode Jpeg streams this element describes the supported codecs and configurations */
  jpegDecOptions?: JpegDecOptions;
  /** If the device is able to decode H.264 streams this element describes the supported codecs and configurations */
  H264DecOptions?: H264DecOptions;
  /** If the device is able to decode Mpeg4 streams this element describes the supported codecs and configurations */
  mpeg4DecOptions?: Mpeg4DecOptions;
  extension?: VideoDecoderConfigurationOptionsExtension;
}
export interface H264DecOptions {
  /** List of supported H.264 Video Resolutions */
  resolutionsAvailable?: VideoResolution[];
  /** List of supported H264 Profiles (either baseline, main, extended or high) */
  supportedH264Profiles?: H264Profile[];
  /** Supported H.264 bitrate range in kbps */
  supportedInputBitrate?: IntRange;
  /** Supported H.264 framerate range in fps */
  supportedFrameRate?: IntRange;
}
export interface JpegDecOptions {
  /** List of supported Jpeg Video Resolutions */
  resolutionsAvailable?: VideoResolution[];
  /** Supported Jpeg bitrate range in kbps */
  supportedInputBitrate?: IntRange;
  /** Supported Jpeg framerate range in fps */
  supportedFrameRate?: IntRange;
}
export interface Mpeg4DecOptions {
  /** List of supported Mpeg4 Video Resolutions */
  resolutionsAvailable?: VideoResolution[];
  /** List of supported Mpeg4 Profiles (either SP or ASP) */
  supportedMpeg4Profiles?: Mpeg4Profile[];
  /** Supported Mpeg4 bitrate range in kbps */
  supportedInputBitrate?: IntRange;
  /** Supported Mpeg4 framerate range in fps */
  supportedFrameRate?: IntRange;
}
export interface VideoDecoderConfigurationOptionsExtension {}
/** Representation of a physical audio outputs. */
export interface AudioOutput extends DeviceEntity {}
export interface AudioOutputConfiguration extends ConfigurationEntity {
  /** Token of the phsycial Audio output. */
  outputToken?: ReferenceToken;
  /**
   * An audio channel MAY support different types of audio transmission. While for full duplex
   * operation no special handling is required, in half duplex operation the transmission direction
   * needs to be switched.
   * The optional SendPrimacy parameter inside the AudioOutputConfiguration indicates which
   * direction is currently active. An NVC can switch between different modes by setting the
   * AudioOutputConfiguration.
   * The following modes for the Send-Primacy are defined:
   * www.onvif.org/ver20/HalfDuplex/Server
   * The server is allowed to send audio data to the client. The client shall not send
   * audio data via the backchannel to the NVT in this mode.
   * www.onvif.org/ver20/HalfDuplex/Client
   * The client is allowed to send audio data via the backchannel to the server. The
   * NVT shall not send audio data to the client in this mode.
   * www.onvif.org/ver20/HalfDuplex/Auto
   * It is up to the device how to deal with sending and receiving audio data.
   *
   * Acoustic echo cancellation is out of ONVIF scope.
   */
  sendPrimacy?: AnyURI;
  /** Volume setting of the output. The applicable range is defined via the option AudioOutputOptions.OutputLevelRange. */
  outputLevel?: number;
}
export interface AudioOutputConfigurationOptions {
  /** Tokens of the physical Audio outputs (typically one). */
  outputTokensAvailable?: ReferenceToken[];
  /**
   * An audio channel MAY support different types of audio transmission. While for full duplex
   * operation no special handling is required, in half duplex operation the transmission direction
   * needs to be switched.
   * The optional SendPrimacy parameter inside the AudioOutputConfiguration indicates which
   * direction is currently active. An NVC can switch between different modes by setting the
   * AudioOutputConfiguration.
   * The following modes for the Send-Primacy are defined:
   * www.onvif.org/ver20/HalfDuplex/Server
   * The server is allowed to send audio data to the client. The client shall not send
   * audio data via the backchannel to the NVT in this mode.
   * www.onvif.org/ver20/HalfDuplex/Client
   * The client is allowed to send audio data via the backchannel to the server. The
   * NVT shall not send audio data to the client in this mode.
   * www.onvif.org/ver20/HalfDuplex/Auto
   * It is up to the device how to deal with sending and receiving audio data.
   *
   * Acoustic echo cancellation is out of ONVIF scope.
   */
  sendPrimacyOptions?: AnyURI[];
  /** Minimum and maximum level range supported for this Output. */
  outputLevelRange?: IntRange;
}
/**
 * The Audio Decoder Configuration does not contain any that parameter to configure the
 * decoding .A decoder shall decode every data it receives (according to its capabilities).
 */
export interface AudioDecoderConfiguration extends ConfigurationEntity {}
export interface AudioDecoderConfigurationOptions {
  /** If the device is able to decode AAC encoded audio this section describes the supported configurations */
  AACDecOptions?: AACDecOptions;
  /** If the device is able to decode G711 encoded audio this section describes the supported configurations */
  G711DecOptions?: G711DecOptions;
  /** If the device is able to decode G726 encoded audio this section describes the supported configurations */
  G726DecOptions?: G726DecOptions;
  extension?: AudioDecoderConfigurationOptionsExtension;
}
export interface G711DecOptions {
  /** List of supported bitrates in kbps */
  bitrate?: IntItems;
  /** List of supported sample rates in kHz */
  sampleRateRange?: IntItems;
}
export interface AACDecOptions {
  /** List of supported bitrates in kbps */
  bitrate?: IntItems;
  /** List of supported sample rates in kHz */
  sampleRateRange?: IntItems;
}
export interface G726DecOptions {
  /** List of supported bitrates in kbps */
  bitrate?: IntItems;
  /** List of supported sample rates in kHz */
  sampleRateRange?: IntItems;
}
export interface AudioDecoderConfigurationOptionsExtension {}
export interface MulticastConfiguration {
  /** The multicast address (if this address is set to 0 no multicast streaming is enaled) */
  address?: IPAddress;
  /** The RTP mutlicast destination port. A device may support RTCP. In this case the port value shall be even to allow the corresponding RTCP stream to be mapped to the next higher (odd) destination port number as defined in the RTSP specification. */
  port?: number;
  /** In case of IPv6 the TTL value is assumed as the hop limit. Note that for IPV6 and administratively scoped IPv4 multicast the primary use for hop limit / TTL is to prevent packets from (endlessly) circulating and not limiting scope. In these cases the address contains the scope. */
  TTL?: number;
  /** Read only property signalling that streaming is persistant. Use the methods StartMulticastStreaming and StopMulticastStreaming to switch its state. */
  autoStart?: boolean;
}
export interface StreamSetup {
  /** Defines if a multicast or unicast stream is requested */
  stream?: StreamType;
  transport?: Transport;
}
export interface Transport {
  /** Defines the network protocol for streaming, either UDP=RTP/UDP, RTSP=RTP/RTSP/TCP or HTTP=RTP/RTSP/HTTP/TCP */
  protocol?: TransportProtocol;
  /** Optional element to describe further tunnel options. This element is normally not needed */
  tunnel?: Transport;
}
export interface MediaUri {
  /** Stable Uri to be used for requesting the media stream */
  uri?: AnyURI;
  /** Indicates if the Uri is only valid until the connection is established. The value shall be set to "false". */
  invalidAfterConnect?: boolean;
  /** Indicates if the Uri is invalid after a reboot of the device. The value shall be set to "false". */
  invalidAfterReboot?: boolean;
  /** Duration how long the Uri is valid. This parameter shall be set to PT0S to indicate that this stream URI is indefinitely valid even if the profile changes */
  timeout?: string;
}
export interface Scope {
  /** Indicates if the scope is fixed or configurable. */
  scopeDef?: ScopeDefinition;
  /** Scope item URI. */
  scopeItem?: AnyURI;
}
export interface NetworkInterface extends DeviceEntity {
  /** Indicates whether or not an interface is enabled. */
  enabled?: boolean;
  /** Network interface information */
  info?: NetworkInterfaceInfo;
  /** Link configuration. */
  link?: NetworkInterfaceLink;
  /** IPv4 network interface configuration. */
  IPv4?: IPv4NetworkInterface;
  /** IPv6 network interface configuration. */
  IPv6?: IPv6NetworkInterface;
  extension?: NetworkInterfaceExtension;
}
export interface NetworkInterfaceExtension {
  interfaceType?: IANAIfTypes;
  /** Extension point prepared for future 802.3 configuration. */
  dot3?: Dot3Configuration[];
  dot11?: Dot11Configuration[];
  extension?: NetworkInterfaceExtension2;
}
export interface Dot3Configuration {}
export interface NetworkInterfaceExtension2 {}
export interface NetworkInterfaceLink {
  /** Configured link settings. */
  adminSettings?: NetworkInterfaceConnectionSetting;
  /** Current active link settings. */
  operSettings?: NetworkInterfaceConnectionSetting;
  /** Integer indicating interface type, for example: 6 is ethernet. */
  interfaceType?: IANAIfTypes;
}
export interface NetworkInterfaceConnectionSetting {
  /** Auto negotiation on/off. */
  autoNegotiation?: boolean;
  /** Speed. */
  speed?: number;
  /** Duplex type, Half or Full. */
  duplex?: Duplex;
}
export interface NetworkInterfaceInfo {
  /** Network interface name, for example eth0. */
  name?: string;
  /** Network interface MAC address. */
  hwAddress?: HwAddress;
  /** Maximum transmission unit. */
  MTU?: number;
}
export interface IPv6NetworkInterface {
  /** Indicates whether or not IPv6 is enabled. */
  enabled?: boolean;
  /** IPv6 configuration. */
  config?: IPv6Configuration;
}
export interface IPv4NetworkInterface {
  /** Indicates whether or not IPv4 is enabled. */
  enabled?: boolean;
  /** IPv4 configuration. */
  config?: IPv4Configuration;
}
export interface IPv4Configuration {
  /** List of manually added IPv4 addresses. */
  manual?: PrefixedIPv4Address[];
  /** Link local address. */
  linkLocal?: PrefixedIPv4Address;
  /** IPv4 address configured by using DHCP. */
  fromDHCP?: PrefixedIPv4Address;
  /** Indicates whether or not DHCP is used. */
  DHCP?: boolean;
}
export interface IPv6Configuration {
  /** Indicates whether router advertisment is used. */
  acceptRouterAdvert?: boolean;
  /** DHCP configuration. */
  DHCP?: IPv6DHCPConfiguration;
  /** List of manually entered IPv6 addresses. */
  manual?: PrefixedIPv6Address[];
  /** List of link local IPv6 addresses. */
  linkLocal?: PrefixedIPv6Address[];
  /** List of IPv6 addresses configured by using DHCP. */
  fromDHCP?: PrefixedIPv6Address[];
  /** List of IPv6 addresses configured by using router advertisment. */
  fromRA?: PrefixedIPv6Address[];
  extension?: IPv6ConfigurationExtension;
}
export interface IPv6ConfigurationExtension {}
export interface NetworkProtocol {
  /** Network protocol type string. */
  name?: NetworkProtocolType;
  /** Indicates if the protocol is enabled or not. */
  enabled?: boolean;
  /** The port that is used by the protocol. */
  port?: number[];
  extension?: NetworkProtocolExtension;
}
export interface NetworkProtocolExtension {}
export interface NetworkHost {
  /** Network host type: IPv4, IPv6 or DNS. */
  type?: NetworkHostType;
  /** IPv4 address. */
  IPv4Address?: IPv4Address;
  /** IPv6 address. */
  IPv6Address?: IPv6Address;
  /** DNS name. */
  DNSname?: DNSName;
  extension?: NetworkHostExtension;
}
export interface NetworkHostExtension {}
export interface IPAddress {
  /** Indicates if the address is an IPv4 or IPv6 address. */
  type?: IPType;
  /** IPv4 address. */
  IPv4Address?: IPv4Address;
  /** IPv6 address */
  IPv6Address?: IPv6Address;
}
export interface PrefixedIPv4Address {
  /** IPv4 address */
  address?: IPv4Address;
  /** Prefix/submask length */
  prefixLength?: number;
}
export interface PrefixedIPv6Address {
  /** IPv6 address */
  address?: IPv6Address;
  /** Prefix/submask length */
  prefixLength?: number;
}
export interface HostnameInformation {
  /** Indicates whether the hostname has been obtained from DHCP or not. */
  fromDHCP?: boolean;
  /** Indicates the device hostname or an empty string if no hostname has been assigned. */
  name?: string;
  extension?: HostnameInformationExtension;
}
export interface HostnameInformationExtension {}
export interface DNSInformation {
  /** Indicates whether or not DNS information is retrieved from DHCP. */
  fromDHCP?: boolean;
  /** Search domain. */
  searchDomain?: string[];
  /** List of DNS addresses received from DHCP. */
  DNSFromDHCP?: IPAddress[];
  /** List of manually entered DNS addresses. */
  DNSManual?: IPAddress[];
  extension?: DNSInformationExtension;
}
export interface DNSInformationExtension {}
export interface NTPInformation {
  /** Indicates if NTP information is to be retrieved by using DHCP. */
  fromDHCP?: boolean;
  /** List of NTP addresses retrieved by using DHCP. */
  NTPFromDHCP?: NetworkHost[];
  /** List of manually entered NTP addresses. */
  NTPManual?: NetworkHost[];
  extension?: NTPInformationExtension;
}
export interface NTPInformationExtension {}
export interface DynamicDNSInformation {
  /** Dynamic DNS type. */
  type?: DynamicDNSType;
  /** DNS name. */
  name?: DNSName;
  /** Time to live. */
  TTL?: string;
  extension?: DynamicDNSInformationExtension;
}
export interface DynamicDNSInformationExtension {}
export interface NetworkInterfaceSetConfiguration {
  /** Indicates whether or not an interface is enabled. */
  enabled?: boolean;
  /** Link configuration. */
  link?: NetworkInterfaceConnectionSetting;
  /** Maximum transmission unit. */
  MTU?: number;
  /** IPv4 network interface configuration. */
  IPv4?: IPv4NetworkInterfaceSetConfiguration;
  /** IPv6 network interface configuration. */
  IPv6?: IPv6NetworkInterfaceSetConfiguration;
  extension?: NetworkInterfaceSetConfigurationExtension;
}
export interface NetworkInterfaceSetConfigurationExtension {
  dot3?: Dot3Configuration[];
  dot11?: Dot11Configuration[];
  extension?: NetworkInterfaceSetConfigurationExtension2;
}
export interface IPv6NetworkInterfaceSetConfiguration {
  /** Indicates whether or not IPv6 is enabled. */
  enabled?: boolean;
  /** Indicates whether router advertisment is used. */
  acceptRouterAdvert?: boolean;
  /** List of manually added IPv6 addresses. */
  manual?: PrefixedIPv6Address[];
  /** DHCP configuration. */
  DHCP?: IPv6DHCPConfiguration;
}
export interface IPv4NetworkInterfaceSetConfiguration {
  /** Indicates whether or not IPv4 is enabled. */
  enabled?: boolean;
  /** List of manually added IPv4 addresses. */
  manual?: PrefixedIPv4Address[];
  /** Indicates whether or not DHCP is used. */
  DHCP?: boolean;
}
export interface NetworkGateway {
  /** IPv4 address string. */
  IPv4Address?: IPv4Address[];
  /** IPv6 address string. */
  IPv6Address?: IPv6Address[];
}
export interface NetworkZeroConfiguration {
  /** Unique identifier of network interface. */
  interfaceToken?: ReferenceToken;
  /** Indicates whether the zero-configuration is enabled or not. */
  enabled?: boolean;
  /** The zero-configuration IPv4 address(es) */
  addresses?: IPv4Address[];
  extension?: NetworkZeroConfigurationExtension;
}
export interface NetworkZeroConfigurationExtension {
  /** Optional array holding the configuration for the second and possibly further interfaces. */
  additional?: NetworkZeroConfiguration[];
  extension?: NetworkZeroConfigurationExtension2;
}
export interface NetworkZeroConfigurationExtension2 {}
export interface IPAddressFilter {
  type?: IPAddressFilterType;
  IPv4Address?: PrefixedIPv4Address[];
  IPv6Address?: PrefixedIPv6Address[];
  extension?: IPAddressFilterExtension;
}
export interface IPAddressFilterExtension {}
export interface Dot11Configuration {
  SSID?: Dot11SSIDType;
  mode?: Dot11StationMode;
  alias?: Name;
  priority?: NetworkInterfaceConfigPriority;
  security?: Dot11SecurityConfiguration;
}
export interface Dot11SecurityConfiguration {
  mode?: Dot11SecurityMode;
  algorithm?: Dot11Cipher;
  PSK?: Dot11PSKSet;
  dot1X?: ReferenceToken;
  extension?: Dot11SecurityConfigurationExtension;
}
export interface Dot11SecurityConfigurationExtension {}
export interface Dot11PSKSet {
  /**
   * According to IEEE802.11-2007 H.4.1 the RSNA PSK consists of 256 bits, or 64 octets when represented in hex
   * Either Key or Passphrase shall be given, if both are supplied Key shall be used by the device and Passphrase ignored.
   */
  key?: Dot11PSK;
  /**
   * According to IEEE802.11-2007 H.4.1 a pass-phrase is a sequence of between 8 and 63 ASCII-encoded characters and
   * each character in the pass-phrase must have an encoding in the range of 32 to 126 (decimal),inclusive.
   * If only Passpharse is supplied the Key shall be derived using the algorithm described in IEEE802.11-2007 section H.4
   */
  passphrase?: Dot11PSKPassphrase;
  extension?: Dot11PSKSetExtension;
}
export interface Dot11PSKSetExtension {}
export interface NetworkInterfaceSetConfigurationExtension2 {}
export interface Dot11Capabilities {
  TKIP?: boolean;
  scanAvailableNetworks?: boolean;
  multipleConfiguration?: boolean;
  adHocStationMode?: boolean;
  WEP?: boolean;
}
export interface Dot11Status {
  SSID?: Dot11SSIDType;
  BSSID?: string;
  pairCipher?: Dot11Cipher;
  groupCipher?: Dot11Cipher;
  signalStrength?: Dot11SignalStrength;
  activeConfigAlias?: ReferenceToken;
}
export interface Dot11AvailableNetworks {
  SSID?: Dot11SSIDType;
  BSSID?: string;
  /** See IEEE802.11 7.3.2.25.2 for details. */
  authAndMangementSuite?: Dot11AuthAndMangementSuite[];
  pairCipher?: Dot11Cipher[];
  groupCipher?: Dot11Cipher[];
  signalStrength?: Dot11SignalStrength;
  extension?: Dot11AvailableNetworksExtension;
}
export interface Dot11AvailableNetworksExtension {}
export interface Capabilities {
  /** Analytics capabilities */
  analytics?: AnalyticsCapabilities;
  /** Device capabilities */
  device?: DeviceCapabilities;
  /** Event capabilities */
  events?: EventCapabilities;
  /** Imaging capabilities */
  imaging?: ImagingCapabilities;
  /** Media capabilities */
  media?: MediaCapabilities;
  /** PTZ capabilities */
  PTZ?: PTZCapabilities;
  extension?: CapabilitiesExtension;
}
export interface CapabilitiesExtension {
  deviceIO?: DeviceIOCapabilities;
  display?: DisplayCapabilities;
  recording?: RecordingCapabilities;
  search?: SearchCapabilities;
  replay?: ReplayCapabilities;
  receiver?: ReceiverCapabilities;
  analyticsDevice?: AnalyticsDeviceCapabilities;
  extensions?: CapabilitiesExtension2;
}
export interface CapabilitiesExtension2 {}
export interface AnalyticsCapabilities {
  /** Analytics service URI. */
  XAddr?: AnyURI;
  /** Indicates whether or not rules are supported. */
  ruleSupport?: boolean;
  /** Indicates whether or not modules are supported. */
  analyticsModuleSupport?: boolean;
}
export interface DeviceCapabilities {
  /** Device service URI. */
  XAddr?: AnyURI;
  /** Network capabilities. */
  network?: NetworkCapabilities;
  /** System capabilities. */
  system?: SystemCapabilities;
  /** I/O capabilities. */
  IO?: IOCapabilities;
  /** Security capabilities. */
  security?: SecurityCapabilities;
  extension?: DeviceCapabilitiesExtension;
}
export interface DeviceCapabilitiesExtension {}
export interface EventCapabilities {
  /** Event service URI. */
  XAddr?: AnyURI;
  /** Indicates whether or not WS Subscription policy is supported. */
  WSSubscriptionPolicySupport?: boolean;
  /** Indicates whether or not WS Pull Point is supported. */
  WSPullPointSupport?: boolean;
  /** Indicates whether or not WS Pausable Subscription Manager Interface is supported. */
  WSPausableSubscriptionManagerInterfaceSupport?: boolean;
}
export interface IOCapabilities {
  /** Number of input connectors. */
  inputConnectors?: number;
  /** Number of relay outputs. */
  relayOutputs?: number;
  extension?: IOCapabilitiesExtension;
}
export interface IOCapabilitiesExtension {
  auxiliary?: boolean;
  auxiliaryCommands?: AuxiliaryData[];
  extension?: IOCapabilitiesExtension2;
}
export interface IOCapabilitiesExtension2 {}
export interface MediaCapabilities {
  /** Media service URI. */
  XAddr?: AnyURI;
  /** Streaming capabilities. */
  streamingCapabilities?: RealTimeStreamingCapabilities;
  extension?: MediaCapabilitiesExtension;
}
export interface MediaCapabilitiesExtension {
  profileCapabilities?: ProfileCapabilities;
}
export interface RealTimeStreamingCapabilities {
  /** Indicates whether or not RTP multicast is supported. */
  RTPMulticast?: boolean;
  /** Indicates whether or not RTP over TCP is supported. */
  RTP_TCP?: boolean;
  /** Indicates whether or not RTP/RTSP/TCP is supported. */
  RTP_RTSP_TCP?: boolean;
  extension?: RealTimeStreamingCapabilitiesExtension;
}
export interface RealTimeStreamingCapabilitiesExtension {}
export interface ProfileCapabilities {
  /** Maximum number of profiles. */
  maximumNumberOfProfiles?: number;
}
export interface NetworkCapabilities {
  /** Indicates whether or not IP filtering is supported. */
  IPFilter?: boolean;
  /** Indicates whether or not zeroconf is supported. */
  zeroConfiguration?: boolean;
  /** Indicates whether or not IPv6 is supported. */
  IPVersion6?: boolean;
  /** Indicates whether or not  is supported. */
  dynDNS?: boolean;
  extension?: NetworkCapabilitiesExtension;
}
export interface NetworkCapabilitiesExtension {
  dot11Configuration?: boolean;
  extension?: NetworkCapabilitiesExtension2;
}
export interface NetworkCapabilitiesExtension2 {}
export interface SecurityCapabilities {
  /** Indicates whether or not TLS 1.1 is supported. */
  'TLS1.1'?: boolean;
  /** Indicates whether or not TLS 1.2 is supported. */
  'TLS1.2'?: boolean;
  /** Indicates whether or not onboard key generation is supported. */
  onboardKeyGeneration?: boolean;
  /** Indicates whether or not access policy configuration is supported. */
  accessPolicyConfig?: boolean;
  /** Indicates whether or not WS-Security X.509 token is supported. */
  'X.509Token'?: boolean;
  /** Indicates whether or not WS-Security SAML token is supported. */
  SAMLToken?: boolean;
  /** Indicates whether or not WS-Security Kerberos token is supported. */
  kerberosToken?: boolean;
  /** Indicates whether or not WS-Security REL token is supported. */
  RELToken?: boolean;
  extension?: SecurityCapabilitiesExtension;
}
export interface SecurityCapabilitiesExtension {
  'TLS1.0'?: boolean;
  extension?: SecurityCapabilitiesExtension2;
}
export interface SecurityCapabilitiesExtension2 {
  dot1X?: boolean;
  /** EAP Methods supported by the device. The int values refer to the IANA EAP Registry. */
  supportedEAPMethod?: number[];
  remoteUserHandling?: boolean;
}
export interface SystemCapabilities {
  /** Indicates whether or not WS Discovery resolve requests are supported. */
  discoveryResolve?: boolean;
  /** Indicates whether or not WS-Discovery Bye is supported. */
  discoveryBye?: boolean;
  /** Indicates whether or not remote discovery is supported. */
  remoteDiscovery?: boolean;
  /** Indicates whether or not system backup is supported. */
  systemBackup?: boolean;
  /** Indicates whether or not system logging is supported. */
  systemLogging?: boolean;
  /** Indicates whether or not firmware upgrade is supported. */
  firmwareUpgrade?: boolean;
  /** Indicates supported ONVIF version(s). */
  supportedVersions?: OnvifVersion[];
  extension?: SystemCapabilitiesExtension;
}
export interface SystemCapabilitiesExtension {
  httpFirmwareUpgrade?: boolean;
  httpSystemBackup?: boolean;
  httpSystemLogging?: boolean;
  httpSupportInformation?: boolean;
  extension?: SystemCapabilitiesExtension2;
}
export interface SystemCapabilitiesExtension2 {}
export interface OnvifVersion {
  /** Major version number. */
  major?: number;
  /**
   * Two digit minor version number.
   * If major version number is less than "16", X.0.1 maps to "01" and X.2.1 maps to "21" where X stands for Major version number.
   * Otherwise, minor number is month of release, such as "06" for June.
   */
  minor?: number;
}
export interface ImagingCapabilities {
  /** Imaging service URI. */
  XAddr?: AnyURI;
}
export interface PTZCapabilities {
  /** PTZ service URI. */
  XAddr?: AnyURI;
}
export interface DeviceIOCapabilities {
  XAddr?: AnyURI;
  videoSources?: number;
  videoOutputs?: number;
  audioSources?: number;
  audioOutputs?: number;
  relayOutputs?: number;
}
export interface DisplayCapabilities {
  XAddr?: AnyURI;
  /** Indication that the SetLayout command supports only predefined layouts. */
  fixedLayout?: boolean;
}
export interface RecordingCapabilities {
  XAddr?: AnyURI;
  receiverSource?: boolean;
  mediaProfileSource?: boolean;
  dynamicRecordings?: boolean;
  dynamicTracks?: boolean;
  maxStringLength?: number;
}
export interface SearchCapabilities {
  XAddr?: AnyURI;
  metadataSearch?: boolean;
}
export interface ReplayCapabilities {
  /** The address of the replay service. */
  XAddr?: AnyURI;
}
export interface ReceiverCapabilities {
  /** The address of the receiver service. */
  XAddr?: AnyURI;
  /** Indicates whether the device can receive RTP multicast streams. */
  RTP_Multicast?: boolean;
  /** Indicates whether the device can receive RTP/TCP streams */
  RTP_TCP?: boolean;
  /** Indicates whether the device can receive RTP/RTSP/TCP streams. */
  RTP_RTSP_TCP?: boolean;
  /** The maximum number of receivers supported by the device. */
  supportedReceivers?: number;
  /** The maximum allowed length for RTSP URIs. */
  maximumRTSPURILength?: number;
}
export interface AnalyticsDeviceCapabilities {
  XAddr?: AnyURI;
  /** Obsolete property. */
  ruleSupport?: boolean;
  extension?: AnalyticsDeviceExtension;
}
export interface AnalyticsDeviceExtension {}
export interface SystemLog {
  /** The log information as attachment data. */
  binary?: AttachmentData;
  /** The log information as character data. */
  string?: string;
}
export interface SupportInformation {
  /** The support information as attachment data. */
  binary?: AttachmentData;
  /** The support information as character data. */
  string?: string;
}
export interface BinaryData {
  contentType?: unknown;
  /** base64 encoded binary data. */
  data?: unknown;
}
export interface AttachmentData {
  contentType?: unknown;
  clude?: unknown;
}
export interface BackupFile {
  name?: string;
  data?: AttachmentData;
}
export interface SystemLogUriList {
  systemLog?: SystemLogUri[];
}
export interface SystemLogUri {
  type?: SystemLogType;
  uri?: AnyURI;
}
/** General date time inforamtion returned by the GetSystemDateTime method. */
export interface SystemDateTime {
  /** Indicates if the time is set manully or through NTP. */
  dateTimeType?: SetDateTimeType;
  /** Informative indicator whether daylight savings is currently on/off. */
  daylightSavings?: boolean;
  /** Timezone information in Posix format. */
  timeZone?: TimeZone;
  /** Current system date and time in UTC format. This field is mandatory since version 2.0. */
  UTCDateTime?: DateTime;
  /** Date and time in local format. */
  localDateTime?: DateTime;
  extension?: SystemDateTimeExtension;
}
export interface SystemDateTimeExtension {}
export interface DateTime {
  time?: Time;
  date?: Date;
}
export interface Date {
  year?: number;
  /** Range is 1 to 12. */
  month?: number;
  /** Range is 1 to 31. */
  day?: number;
}
export interface Time {
  /** Range is 0 to 23. */
  hour?: number;
  /** Range is 0 to 59. */
  minute?: number;
  /** Range is 0 to 61 (typically 59). */
  second?: number;
}
/**
 * The TZ format is specified by POSIX, please refer to POSIX 1003.1 section 8.3
 * Example: Europe, Paris TZ=CET-1CEST,M3.5.0/2,M10.5.0/3
 * CET = designation for standard time when daylight saving is not in force
 * -1 = offset in hours = negative so 1 hour east of Greenwich meridian
 * CEST = designation when daylight saving is in force ("Central European Summer Time")
 * , = no offset number between code and comma, so default to one hour ahead for daylight saving
 * M3.5.0 = when daylight saving starts = the last Sunday in March (the "5th" week means the last in the month)
 * /2, = the local time when the switch occurs = 2 a.m. in this case
 * M10.5.0 = when daylight saving ends = the last Sunday in October.
 * /3, = the local time when the switch occurs = 3 a.m. in this case
 */
export interface TimeZone {
  /** Posix timezone string. */
  TZ?: string;
}
export interface RemoteUser {
  username?: string;
  password?: string;
  useDerivedPassword?: boolean;
}
export interface User {
  /** Username string. */
  username?: string;
  /** Password string. */
  password?: string;
  /** User level string. */
  userLevel?: UserLevel;
  extension?: UserExtension;
}
export interface UserExtension {}
export interface CertificateGenerationParameters {
  certificateID?: string;
  subject?: string;
  validNotBefore?: string;
  validNotAfter?: string;
  extension?: CertificateGenerationParametersExtension;
}
export interface CertificateGenerationParametersExtension {}
export interface Certificate {
  /** Certificate id. */
  certificateID?: string;
  /** base64 encoded DER representation of certificate. */
  certificate?: BinaryData;
}
export interface CertificateStatus {
  /** Certificate id. */
  certificateID?: string;
  /** Indicates whether or not a certificate is used in a HTTPS configuration. */
  status?: boolean;
}
export interface CertificateWithPrivateKey {
  certificateID?: string;
  certificate?: BinaryData;
  privateKey?: BinaryData;
}
export interface CertificateInformation {
  certificateID?: string;
  issuerDN?: string;
  subjectDN?: string;
  keyUsage?: CertificateUsage;
  extendedKeyUsage?: CertificateUsage;
  keyLength?: number;
  version?: string;
  serialNum?: string;
  /** Validity Range is from "NotBefore" to "NotAfter"; the corresponding DateTimeRange is from "From" to "Until" */
  signatureAlgorithm?: string;
  validity?: DateTimeRange;
  extension?: CertificateInformationExtension;
}
export interface CertificateUsage {}
export interface CertificateInformationExtension {}
export interface Dot1XConfiguration {
  dot1XConfigurationToken?: ReferenceToken;
  identity?: string;
  anonymousID?: string;
  /** EAP Method type as defined in IANA EAP Registry. */
  EAPMethod?: number;
  CACertificateID?: string[];
  EAPMethodConfiguration?: EAPMethodConfiguration;
  extension?: Dot1XConfigurationExtension;
}
export interface Dot1XConfigurationExtension {}
export interface EAPMethodConfiguration {
  /** Confgiuration information for TLS Method. */
  TLSConfiguration?: TLSConfiguration;
  /** Password for those EAP Methods that require a password. The password shall never be returned on a get method. */
  password?: string;
  extension?: EapMethodExtension;
}
export interface EapMethodExtension {}
export interface TLSConfiguration {
  certificateID?: string;
}
export interface GenericEapPwdConfigurationExtension {}
export interface RelayOutputSettings {
  /**
   * 'Bistable' or 'Monostable'
   *
   * Bistable – After setting the state, the relay remains in this state.
   * Monostable – After setting the state, the relay returns to its idle state after the specified time.
   *
   */
  mode?: RelayMode;
  /** Time after which the relay returns to its idle state if it is in monostable mode. If the Mode field is set to bistable mode the value of the parameter can be ignored. */
  delayTime?: string;
  /**
   * 'open' or 'closed'
   *
   * 'open' means that the relay is open when the relay state is set to 'inactive' through the trigger command and closed when the state is set to 'active' through the same command.
   * 'closed' means that the relay is closed when the relay state is set to 'inactive' through the trigger command and open when the state is set to 'active' through the same command.
   *
   */
  idleState?: RelayIdleState;
}
export interface RelayOutput extends DeviceEntity {
  properties?: RelayOutputSettings;
}
export interface DigitalInput extends DeviceEntity {
  /** Indicate the Digital IdleState status. */
  idleState?: DigitalIdleState;
}
export interface PTZNode extends DeviceEntity {
  /** Indication whether the HomePosition of a Node is fixed or it can be changed via the SetHomePosition command. */
  fixedHomePosition?: boolean;
  /** Indication whether the Node supports the geo-referenced move command. */
  geoMove?: boolean;
  /** A unique identifier that is used to reference PTZ Nodes. */
  name?: Name;
  /** A list of Coordinate Systems available for the PTZ Node. For each Coordinate System, the PTZ Node MUST specify its allowed range. */
  supportedPTZSpaces?: PTZSpaces;
  /** All preset operations MUST be available for this PTZ Node if one preset is supported. */
  maximumNumberOfPresets?: number;
  /** A boolean operator specifying the availability of a home position. If set to true, the Home Position Operations MUST be available for this PTZ Node. */
  homeSupported?: boolean;
  /** A list of supported Auxiliary commands. If the list is not empty, the Auxiliary Operations MUST be available for this PTZ Node. */
  auxiliaryCommands?: AuxiliaryData[];
  extension?: PTZNodeExtension;
}
export interface PTZNodeExtension {
  /** Detail of supported Preset Tour feature. */
  supportedPresetTour?: PTZPresetTourSupported;
  extension?: PTZNodeExtension2;
}
export interface PTZNodeExtension2 {}
export interface PTZPresetTourSupported {
  /** Indicates number of preset tours that can be created. Required preset tour operations shall be available for this PTZ Node if one or more preset tour is supported. */
  maximumNumberOfPresetTours?: number;
  /** Indicates which preset tour operations are available for this PTZ Node. */
  PTZPresetTourOperation?: PTZPresetTourOperation[];
  extension?: PTZPresetTourSupportedExtension;
}
export interface PTZPresetTourSupportedExtension {}
export interface PTZConfiguration extends ConfigurationEntity {
  /** The optional acceleration ramp used by the device when moving. */
  moveRamp?: number;
  /** The optional acceleration ramp used by the device when recalling presets. */
  presetRamp?: number;
  /** The optional acceleration ramp used by the device when executing PresetTours. */
  presetTourRamp?: number;
  /** A mandatory reference to the PTZ Node that the PTZ Configuration belongs to. */
  nodeToken?: ReferenceToken;
  /** If the PTZ Node supports absolute Pan/Tilt movements, it shall specify one Absolute Pan/Tilt Position Space as default. */
  defaultAbsolutePantTiltPositionSpace?: AnyURI;
  /** If the PTZ Node supports absolute zoom movements, it shall specify one Absolute Zoom Position Space as default. */
  defaultAbsoluteZoomPositionSpace?: AnyURI;
  /** If the PTZ Node supports relative Pan/Tilt movements, it shall specify one RelativePan/Tilt Translation Space as default. */
  defaultRelativePanTiltTranslationSpace?: AnyURI;
  /** If the PTZ Node supports relative zoom movements, it shall specify one Relative Zoom Translation Space as default. */
  defaultRelativeZoomTranslationSpace?: AnyURI;
  /** If the PTZ Node supports continuous Pan/Tilt movements, it shall specify one Continuous Pan/Tilt Velocity Space as default. */
  defaultContinuousPanTiltVelocitySpace?: AnyURI;
  /** If the PTZ Node supports continuous zoom movements, it shall specify one Continuous Zoom Velocity Space as default. */
  defaultContinuousZoomVelocitySpace?: AnyURI;
  /** If the PTZ Node supports absolute or relative PTZ movements, it shall specify corresponding default Pan/Tilt and Zoom speeds. */
  defaultPTZSpeed?: PTZSpeed;
  /** If the PTZ Node supports continuous movements, it shall specify a default timeout, after which the movement stops. */
  defaultPTZTimeout?: string;
  /** The Pan/Tilt limits element should be present for a PTZ Node that supports an absolute Pan/Tilt. If the element is present it signals the support for configurable Pan/Tilt limits. If limits are enabled, the Pan/Tilt movements shall always stay within the specified range. The Pan/Tilt limits are disabled by setting the limits to –INF or +INF. */
  panTiltLimits?: PanTiltLimits;
  /** The Zoom limits element should be present for a PTZ Node that supports absolute zoom. If the element is present it signals the supports for configurable Zoom limits. If limits are enabled the zoom movements shall always stay within the specified range. The Zoom limits are disabled by settings the limits to -INF and +INF. */
  zoomLimits?: ZoomLimits;
  /**/
  extension?: PTZConfigurationExtension;
}
export interface PTZConfigurationExtension {
  /** Optional element to configure PT Control Direction related features. */
  PTControlDirection?: PTControlDirection;
  extension?: PTZConfigurationExtension2;
}
export interface PTZConfigurationExtension2 {}
export interface PTControlDirection {
  /** Optional element to configure related parameters for E-Flip. */
  EFlip?: EFlip;
  /** Optional element to configure related parameters for reversing of PT Control Direction. */
  reverse?: Reverse;
  extension?: PTControlDirectionExtension;
}
export interface PTControlDirectionExtension {}
export interface EFlip {
  /** Parameter to enable/disable E-Flip feature. */
  mode?: EFlipMode;
}
export interface Reverse {
  /** Parameter to enable/disable Reverse feature. */
  mode?: ReverseMode;
}
export interface PTZConfigurationOptions {
  /**
   * The list of acceleration ramps supported by the device. The
   * smallest acceleration value corresponds to the minimal index, the
   * highest acceleration corresponds to the maximum index.
   */
  PTZRamps?: IntList;
  /** A list of supported coordinate systems including their range limitations. */
  spaces?: PTZSpaces;
  /** A timeout Range within which Timeouts are accepted by the PTZ Node. */
  PTZTimeout?: DurationRange;
  /** Supported options for PT Direction Control. */
  PTControlDirection?: PTControlDirectionOptions;
  extension?: PTZConfigurationOptions2;
}
export interface PTZConfigurationOptions2 {}
export interface PTControlDirectionOptions {
  /** Supported options for EFlip feature. */
  EFlip?: EFlipOptions;
  /** Supported options for Reverse feature. */
  reverse?: ReverseOptions;
  extension?: PTControlDirectionOptionsExtension;
}
export interface PTControlDirectionOptionsExtension {}
export interface EFlipOptions {
  /** Options of EFlip mode parameter. */
  mode?: EFlipMode[];
  extension?: EFlipOptionsExtension;
}
export interface EFlipOptionsExtension {}
export interface ReverseOptions {
  /** Options of Reverse mode parameter. */
  mode?: ReverseMode[];
  extension?: ReverseOptionsExtension;
}
export interface ReverseOptionsExtension {}
export interface PanTiltLimits {
  /** A range of pan tilt limits. */
  range?: Space2DDescription;
}
export interface ZoomLimits {
  /** A range of zoom limit */
  range?: Space1DDescription;
}
export interface PTZSpaces {
  /**
   * The Generic Pan/Tilt Position space is provided by every PTZ node that supports absolute Pan/Tilt, since it does not relate to a specific physical range.
   * Instead, the range should be defined as the full range of the PTZ unit normalized to the range -1 to 1 resulting in the following space description.
   */
  absolutePanTiltPositionSpace?: Space2DDescription[];
  /**
   * The Generic Zoom Position Space is provided by every PTZ node that supports absolute Zoom, since it does not relate to a specific physical range.
   * Instead, the range should be defined as the full range of the Zoom normalized to the range 0 (wide) to 1 (tele).
   * There is no assumption about how the generic zoom range is mapped to magnification, FOV or other physical zoom dimension.
   */
  absoluteZoomPositionSpace?: Space1DDescription[];
  /**
   * The Generic Pan/Tilt translation space is provided by every PTZ node that supports relative Pan/Tilt, since it does not relate to a specific physical range.
   * Instead, the range should be defined as the full positive and negative translation range of the PTZ unit normalized to the range -1 to 1,
   * where positive translation would mean clockwise rotation or movement in right/up direction resulting in the following space description.
   */
  relativePanTiltTranslationSpace?: Space2DDescription[];
  /**
   * The Generic Zoom Translation Space is provided by every PTZ node that supports relative Zoom, since it does not relate to a specific physical range.
   * Instead, the corresponding absolute range should be defined as the full positive and negative translation range of the Zoom normalized to the range -1 to1,
   * where a positive translation maps to a movement in TELE direction. The translation is signed to indicate direction (negative is to wide, positive is to tele).
   * There is no assumption about how the generic zoom range is mapped to magnification, FOV or other physical zoom dimension. This results in the following space description.
   */
  relativeZoomTranslationSpace?: Space1DDescription[];
  /**
   * The generic Pan/Tilt velocity space shall be provided by every PTZ node, since it does not relate to a specific physical range.
   * Instead, the range should be defined as a range of the PTZ unit’s speed normalized to the range -1 to 1, where a positive velocity would map to clockwise
   * rotation or movement in the right/up direction. A signed speed can be independently specified for the pan and tilt component resulting in the following space description.
   */
  continuousPanTiltVelocitySpace?: Space2DDescription[];
  /**
   * The generic zoom velocity space specifies a zoom factor velocity without knowing the underlying physical model. The range should be normalized from -1 to 1,
   * where a positive velocity would map to TELE direction. A generic zoom velocity space description resembles the following.
   */
  continuousZoomVelocitySpace?: Space1DDescription[];
  /**
   * The speed space specifies the speed for a Pan/Tilt movement when moving to an absolute position or to a relative translation.
   * In contrast to the velocity spaces, speed spaces do not contain any directional information. The speed of a combined Pan/Tilt
   * movement is represented by a single non-negative scalar value.
   */
  panTiltSpeedSpace?: Space1DDescription[];
  /**
   * The speed space specifies the speed for a Zoom movement when moving to an absolute position or to a relative translation.
   * In contrast to the velocity spaces, speed spaces do not contain any directional information.
   */
  zoomSpeedSpace?: Space1DDescription[];
  extension?: PTZSpacesExtension;
}
export interface PTZSpacesExtension {}
export interface Space2DDescription {
  /** A URI of coordinate systems. */
  URI?: AnyURI;
  /** A range of x-axis. */
  XRange?: FloatRange;
  /** A range of y-axis. */
  YRange?: FloatRange;
}
export interface Space1DDescription {
  /** A URI of coordinate systems. */
  URI?: AnyURI;
  /** A range of x-axis. */
  XRange?: FloatRange;
}
export interface PTZSpeed {
  /** Pan and tilt speed. The x component corresponds to pan and the y component to tilt. If omitted in a request, the current (if any) PanTilt movement should not be affected. */
  panTilt?: Vector2D;
  /** A zoom speed. If omitted in a request, the current (if any) Zoom movement should not be affected. */
  zoom?: Vector1D;
}
export interface PTZPreset {
  /**/
  token?: ReferenceToken;
  /** A list of preset position name. */
  name?: Name;
  /** A list of preset position. */
  PTZPosition?: PTZVector;
}
export interface PresetTour {
  /** Unique identifier of this preset tour. */
  token?: ReferenceToken;
  /** Readable name of the preset tour. */
  name?: Name;
  /** Read only parameters to indicate the status of the preset tour. */
  status?: PTZPresetTourStatus;
  /** Auto Start flag of the preset tour. True allows the preset tour to be activated always. */
  autoStart?: boolean;
  /** Parameters to specify the detail behavior of the preset tour. */
  startingCondition?: PTZPresetTourStartingCondition;
  /** A list of detail of touring spots including preset positions. */
  tourSpot?: PTZPresetTourSpot[];
  extension?: PTZPresetTourExtension;
}
export interface PTZPresetTourExtension {}
export interface PTZPresetTourSpot {
  /** Detail definition of preset position of the tour spot. */
  presetDetail?: PTZPresetTourPresetDetail;
  /** Optional parameter to specify Pan/Tilt and Zoom speed on moving toward this tour spot. */
  speed?: PTZSpeed;
  /** Optional parameter to specify time duration of staying on this tour sport. */
  stayTime?: string;
  extension?: PTZPresetTourSpotExtension;
}
export interface PTZPresetTourSpotExtension {}
export interface PTZPresetTourPresetDetail {}
export interface PTZPresetTourTypeExtension {}
export interface PTZPresetTourStatus {
  /** Indicates state of this preset tour by Idle/Touring/Paused. */
  state?: PTZPresetTourState;
  /** Indicates a tour spot currently staying. */
  currentTourSpot?: PTZPresetTourSpot;
  extension?: PTZPresetTourStatusExtension;
}
export interface PTZPresetTourStatusExtension {}
export interface PTZPresetTourStartingCondition {
  /** Execute presets in random order. If set to true and Direction is also present, Direction will be ignored and presets of the Tour will be recalled randomly. */
  randomPresetOrder?: boolean;
  /** Optional parameter to specify how many times the preset tour is recurred. */
  recurringTime?: number;
  /** Optional parameter to specify how long time duration the preset tour is recurred. */
  recurringDuration?: string;
  /** Optional parameter to choose which direction the preset tour goes. Forward shall be chosen in case it is omitted. */
  direction?: PTZPresetTourDirection;
  extension?: PTZPresetTourStartingConditionExtension;
}
export interface PTZPresetTourStartingConditionExtension {}
export interface PTZPresetTourOptions {
  /** Indicates whether or not the AutoStart is supported. */
  autoStart?: boolean;
  /** Supported options for Preset Tour Starting Condition. */
  startingCondition?: PTZPresetTourStartingConditionOptions;
  /** Supported options for Preset Tour Spot. */
  tourSpot?: PTZPresetTourSpotOptions;
}
export interface PTZPresetTourSpotOptions {
  /** Supported options for detail definition of preset position of the tour spot. */
  presetDetail?: PTZPresetTourPresetDetailOptions;
  /** Supported range of stay time for a tour spot. */
  stayTime?: DurationRange;
}
export interface PTZPresetTourPresetDetailOptions {
  /** A list of available Preset Tokens for tour spots. */
  presetToken?: ReferenceToken[];
  /** An option to indicate Home postion for tour spots. */
  home?: boolean;
  /** Supported range of Pan and Tilt for tour spots. */
  panTiltPositionSpace?: Space2DDescription;
  /** Supported range of Zoom for a tour spot. */
  zoomPositionSpace?: Space1DDescription;
  extension?: PTZPresetTourPresetDetailOptionsExtension;
}
export interface PTZPresetTourPresetDetailOptionsExtension {}
export interface PTZPresetTourStartingConditionOptions {
  /** Supported range of Recurring Time. */
  recurringTime?: IntRange;
  /** Supported range of Recurring Duration. */
  recurringDuration?: DurationRange;
  /** Supported options for Direction of Preset Tour. */
  direction?: PTZPresetTourDirection[];
  extension?: PTZPresetTourStartingConditionOptionsExtension;
}
export interface PTZPresetTourStartingConditionOptionsExtension {}
export interface ImagingStatus {
  focusStatus?: FocusStatus;
}
export interface FocusStatus {
  /** Status of focus position. */
  position?: number;
  /** Status of focus MoveStatus. */
  moveStatus?: MoveStatus;
  /** Error status of focus. */
  error?: string;
}
export interface FocusConfiguration {
  autoFocusMode?: AutoFocusMode;
  defaultSpeed?: number;
  /** Parameter to set autofocus near limit (unit: meter). */
  nearLimit?: number;
  /**
   * Parameter to set autofocus far limit (unit: meter).
   * If set to 0.0, infinity will be used.
   */
  farLimit?: number;
}
export interface ImagingSettings {
  /** Enabled/disabled BLC mode (on/off). */
  backlightCompensation?: BacklightCompensation;
  /** Image brightness (unit unspecified). */
  brightness?: number;
  /** Color saturation of the image (unit unspecified). */
  colorSaturation?: number;
  /** Contrast of the image (unit unspecified). */
  contrast?: number;
  /** Exposure mode of the device. */
  exposure?: Exposure;
  /** Focus configuration. */
  focus?: FocusConfiguration;
  /** Infrared Cutoff Filter settings. */
  irCutFilter?: IrCutFilterMode;
  /** Sharpness of the Video image. */
  sharpness?: number;
  /** WDR settings. */
  wideDynamicRange?: WideDynamicRange;
  /** White balance settings. */
  whiteBalance?: WhiteBalance;
  extension?: ImagingSettingsExtension;
}
export interface ImagingSettingsExtension {}
export interface Exposure {
  /**
   * Exposure Mode
   *
   * Auto – Enabled the exposure algorithm on the NVT.
   * Manual – Disabled exposure algorithm on the NVT.
   *
   */
  mode?: ExposureMode;
  /** The exposure priority mode (low noise/framerate). */
  priority?: ExposurePriority;
  /** Rectangular exposure mask. */
  window?: Rectangle;
  /** Minimum value of exposure time range allowed to be used by the algorithm. */
  minExposureTime?: number;
  /** Maximum value of exposure time range allowed to be used by the algorithm. */
  maxExposureTime?: number;
  /** Minimum value of the sensor gain range that is allowed to be used by the algorithm. */
  minGain?: number;
  /** Maximum value of the sensor gain range that is allowed to be used by the algorithm. */
  maxGain?: number;
  /** Minimum value of the iris range allowed to be used by the algorithm. */
  minIris?: number;
  /** Maximum value of the iris range allowed to be used by the algorithm. */
  maxIris?: number;
  /** The fixed exposure time used by the image sensor (&#956;s). */
  exposureTime?: number;
  /** The fixed gain used by the image sensor (dB). */
  gain?: number;
  /** The fixed attenuation of input light affected by the iris (dB). 0dB maps to a fully opened iris. */
  iris?: number;
}
export interface WideDynamicRange {
  /** White dynamic range (on/off) */
  mode?: WideDynamicMode;
  /** Optional level parameter (unitless) */
  level?: number;
}
export interface BacklightCompensation {
  /** Backlight compensation mode (on/off). */
  mode?: BacklightCompensationMode;
  /** Optional level parameter (unit unspecified). */
  level?: number;
}
export interface ImagingOptions {
  backlightCompensation?: BacklightCompensationOptions;
  brightness?: FloatRange;
  colorSaturation?: FloatRange;
  contrast?: FloatRange;
  exposure?: ExposureOptions;
  focus?: FocusOptions;
  irCutFilterModes?: IrCutFilterMode[];
  sharpness?: FloatRange;
  wideDynamicRange?: WideDynamicRangeOptions;
  whiteBalance?: WhiteBalanceOptions;
}
export interface WideDynamicRangeOptions {
  mode?: WideDynamicMode[];
  level?: FloatRange;
}
export interface BacklightCompensationOptions {
  mode?: WideDynamicMode[];
  level?: FloatRange;
}
export interface FocusOptions {
  autoFocusModes?: AutoFocusMode[];
  defaultSpeed?: FloatRange;
  nearLimit?: FloatRange;
  farLimit?: FloatRange;
}
export interface ExposureOptions {
  mode?: ExposureMode[];
  priority?: ExposurePriority[];
  minExposureTime?: FloatRange;
  maxExposureTime?: FloatRange;
  minGain?: FloatRange;
  maxGain?: FloatRange;
  minIris?: FloatRange;
  maxIris?: FloatRange;
  exposureTime?: FloatRange;
  gain?: FloatRange;
  iris?: FloatRange;
}
export interface WhiteBalanceOptions {
  mode?: WhiteBalanceMode[];
  yrGain?: FloatRange;
  ybGain?: FloatRange;
}
export interface FocusMove {
  /** Parameters for the absolute focus control. */
  absolute?: AbsoluteFocus;
  /** Parameters for the relative focus control. */
  relative?: RelativeFocus;
  /** Parameter for the continuous focus control. */
  continuous?: ContinuousFocus;
}
export interface AbsoluteFocus {
  /** Position parameter for the absolute focus control. */
  position?: number;
  /** Speed parameter for the absolute focus control. */
  speed?: number;
}
export interface RelativeFocus {
  /** Distance parameter for the relative focus control. */
  distance?: number;
  /** Speed parameter for the relative focus control. */
  speed?: number;
}
export interface ContinuousFocus {
  /** Speed parameter for the Continuous focus control. */
  speed?: number;
}
export interface MoveOptions {
  absolute?: AbsoluteFocusOptions;
  relative?: RelativeFocusOptions;
  continuous?: ContinuousFocusOptions;
}
export interface AbsoluteFocusOptions {
  /** Valid ranges of the position. */
  position?: FloatRange;
  /** Valid ranges of the speed. */
  speed?: FloatRange;
}
export interface RelativeFocusOptions {
  /** Valid ranges of the distance. */
  distance?: FloatRange;
  /** Valid ranges of the speed. */
  speed?: FloatRange;
}
export interface ContinuousFocusOptions {
  /** Valid ranges of the speed. */
  speed?: FloatRange;
}
export interface WhiteBalance {
  /** Auto whitebalancing mode (auto/manual). */
  mode?: WhiteBalanceMode;
  /** Rgain (unitless). */
  crGain?: number;
  /** Bgain (unitless). */
  cbGain?: number;
}
export interface ImagingStatus20 {
  /** Status of focus. */
  focusStatus20?: FocusStatus20;
  extension?: ImagingStatus20Extension;
}
export interface ImagingStatus20Extension {}
export interface FocusStatus20 {
  /** Status of focus position. */
  position?: number;
  /** Status of focus MoveStatus. */
  moveStatus?: MoveStatus;
  /** Error status of focus. */
  error?: string;
  extension?: FocusStatus20Extension;
}
export interface FocusStatus20Extension {}
/** Type describing the ImagingSettings of a VideoSource. The supported options and ranges can be obtained via the GetOptions command. */
export interface ImagingSettings20 {
  /** Enabled/disabled BLC mode (on/off). */
  backlightCompensation?: BacklightCompensation20;
  /** Image brightness (unit unspecified). */
  brightness?: number;
  /** Color saturation of the image (unit unspecified). */
  colorSaturation?: number;
  /** Contrast of the image (unit unspecified). */
  contrast?: number;
  /** Exposure mode of the device. */
  exposure?: Exposure20;
  /** Focus configuration. */
  focus?: FocusConfiguration20;
  /** Infrared Cutoff Filter settings. */
  irCutFilter?: IrCutFilterMode;
  /** Sharpness of the Video image. */
  sharpness?: number;
  /** WDR settings. */
  wideDynamicRange?: WideDynamicRange20;
  /** White balance settings. */
  whiteBalance?: WhiteBalance20;
  extension?: ImagingSettingsExtension20;
}
export interface ImagingSettingsExtension20 {
  /** Optional element to configure Image Stabilization feature. */
  imageStabilization?: ImageStabilization;
  extension?: ImagingSettingsExtension202;
}
export interface ImagingSettingsExtension202 {
  /** An optional parameter applied to only auto mode to adjust timing of toggling Ir cut filter. */
  irCutFilterAutoAdjustment?: IrCutFilterAutoAdjustment[];
  extension?: ImagingSettingsExtension203;
}
export interface ImagingSettingsExtension203 {
  /** Optional element to configure Image Contrast Compensation. */
  toneCompensation?: ToneCompensation;
  /** Optional element to configure Image Defogging. */
  defogging?: Defogging;
  /** Optional element to configure Image Noise Reduction. */
  noiseReduction?: NoiseReduction;
  extension?: ImagingSettingsExtension204;
}
export interface ImagingSettingsExtension204 {}
export interface ImageStabilization {
  /** Parameter to enable/disable Image Stabilization feature. */
  mode?: ImageStabilizationMode;
  /** Optional level parameter (unit unspecified) */
  level?: number;
  extension?: ImageStabilizationExtension;
}
export interface ImageStabilizationExtension {}
export interface IrCutFilterAutoAdjustment {
  /** Specifies which boundaries to automatically toggle Ir cut filter following parameters are applied to. Its options shall be chosen from tt:IrCutFilterAutoBoundaryType. */
  boundaryType?: string;
  /** Adjusts boundary exposure level for toggling Ir cut filter to on/off specified with unitless normalized value from +1.0 to -1.0. Zero is default and -1.0 is the darkest adjustment (Unitless). */
  boundaryOffset?: number;
  /** Delay time of toggling Ir cut filter to on/off after crossing of the boundary exposure levels. */
  responseTime?: string;
  extension?: IrCutFilterAutoAdjustmentExtension;
}
export interface IrCutFilterAutoAdjustmentExtension {}
/** Type describing whether WDR mode is enabled or disabled (on/off). */
export interface WideDynamicRange20 {
  /** Wide dynamic range mode (on/off). */
  mode?: WideDynamicMode;
  /** Optional level parameter (unit unspecified). */
  level?: number;
}
/** Type describing whether BLC mode is enabled or disabled (on/off). */
export interface BacklightCompensation20 {
  /** Backlight compensation mode (on/off). */
  mode?: BacklightCompensationMode;
  /** Optional level parameter (unit unspecified). */
  level?: number;
}
/** Type describing the exposure settings. */
export interface Exposure20 {
  /**
   * Exposure Mode
   *
   * Auto – Enabled the exposure algorithm on the device.
   * Manual – Disabled exposure algorithm on the device.
   *
   */
  mode?: ExposureMode;
  /** The exposure priority mode (low noise/framerate). */
  priority?: ExposurePriority;
  /** Rectangular exposure mask. */
  window?: Rectangle;
  /** Minimum value of exposure time range allowed to be used by the algorithm. */
  minExposureTime?: number;
  /** Maximum value of exposure time range allowed to be used by the algorithm. */
  maxExposureTime?: number;
  /** Minimum value of the sensor gain range that is allowed to be used by the algorithm. */
  minGain?: number;
  /** Maximum value of the sensor gain range that is allowed to be used by the algorithm. */
  maxGain?: number;
  /** Minimum value of the iris range allowed to be used by the algorithm.  0dB maps to a fully opened iris and positive values map to higher attenuation. */
  minIris?: number;
  /** Maximum value of the iris range allowed to be used by the algorithm. 0dB maps to a fully opened iris and positive values map to higher attenuation. */
  maxIris?: number;
  /** The fixed exposure time used by the image sensor (&#956;s). */
  exposureTime?: number;
  /** The fixed gain used by the image sensor (dB). */
  gain?: number;
  /** The fixed attenuation of input light affected by the iris (dB). 0dB maps to a fully opened iris and positive values map to higher attenuation. */
  iris?: number;
}
export interface ToneCompensation {
  /** Parameter to enable/disable or automatic ToneCompensation feature. Its options shall be chosen from tt:ToneCompensationMode Type. */
  mode?: string;
  /** Optional level parameter specified with unitless normalized value from 0.0 to +1.0. */
  level?: number;
  extension?: ToneCompensationExtension;
}
export interface ToneCompensationExtension {}
export interface Defogging {
  /** Parameter to enable/disable or automatic Defogging feature. Its options shall be chosen from tt:DefoggingMode Type. */
  mode?: string;
  /** Optional level parameter specified with unitless normalized value from 0.0 to +1.0. */
  level?: number;
  extension?: DefoggingExtension;
}
export interface DefoggingExtension {}
export interface NoiseReduction {
  /** Level parameter specified with unitless normalized value from 0.0 to +1.0. Level=0 means no noise reduction or minimal noise reduction. */
  level?: number;
}
export interface ImagingOptions20 {
  /** Valid range of Backlight Compensation. */
  backlightCompensation?: BacklightCompensationOptions20;
  /** Valid range of Brightness. */
  brightness?: FloatRange;
  /** Valid range of Color Saturation. */
  colorSaturation?: FloatRange;
  /** Valid range of Contrast. */
  contrast?: FloatRange;
  /** Valid range of Exposure. */
  exposure?: ExposureOptions20;
  /** Valid range of Focus. */
  focus?: FocusOptions20;
  /** Valid range of IrCutFilterModes. */
  irCutFilterModes?: IrCutFilterMode[];
  /** Valid range of Sharpness. */
  sharpness?: FloatRange;
  /** Valid range of WideDynamicRange. */
  wideDynamicRange?: WideDynamicRangeOptions20;
  /** Valid range of WhiteBalance. */
  whiteBalance?: WhiteBalanceOptions20;
  extension?: ImagingOptions20Extension;
}
export interface ImagingOptions20Extension {
  /** Options of parameters for Image Stabilization feature. */
  imageStabilization?: ImageStabilizationOptions;
  extension?: ImagingOptions20Extension2;
}
export interface ImagingOptions20Extension2 {
  /** Options of parameters for adjustment of Ir cut filter auto mode. */
  irCutFilterAutoAdjustment?: IrCutFilterAutoAdjustmentOptions;
  extension?: ImagingOptions20Extension3;
}
export interface ImagingOptions20Extension3 {
  /** Options of parameters for Tone Compensation feature. */
  toneCompensationOptions?: ToneCompensationOptions;
  /** Options of parameters for Defogging feature. */
  defoggingOptions?: DefoggingOptions;
  /** Options of parameter for Noise Reduction feature. */
  noiseReductionOptions?: NoiseReductionOptions;
  extension?: ImagingOptions20Extension4;
}
export interface ImagingOptions20Extension4 {}
export interface ImageStabilizationOptions {
  /** Supported options of Image Stabilization mode parameter. */
  mode?: ImageStabilizationMode[];
  /** Valid range of the Image Stabilization. */
  level?: FloatRange;
  extension?: ImageStabilizationOptionsExtension;
}
export interface ImageStabilizationOptionsExtension {}
export interface IrCutFilterAutoAdjustmentOptions {
  /** Supported options of boundary types for adjustment of Ir cut filter auto mode. The opptions shall be chosen from tt:IrCutFilterAutoBoundaryType. */
  boundaryType?: string[];
  /** Indicates whether or not boundary offset for toggling Ir cut filter is supported. */
  boundaryOffset?: boolean;
  /** Supported range of delay time for toggling Ir cut filter. */
  responseTimeRange?: DurationRange;
  extension?: IrCutFilterAutoAdjustmentOptionsExtension;
}
export interface IrCutFilterAutoAdjustmentOptionsExtension {}
export interface WideDynamicRangeOptions20 {
  mode?: WideDynamicMode[];
  level?: FloatRange;
}
export interface BacklightCompensationOptions20 {
  /** 'ON' or 'OFF' */
  mode?: BacklightCompensationMode[];
  /** Level range of BacklightCompensation. */
  level?: FloatRange;
}
export interface ExposureOptions20 {
  /**
   * Exposure Mode
   *
   * Auto – Enabled the exposure algorithm on the device.
   * Manual – Disabled exposure algorithm on the device.
   *
   */
  mode?: ExposureMode[];
  /** The exposure priority mode (low noise/framerate). */
  priority?: ExposurePriority[];
  /** Valid range of the Minimum ExposureTime. */
  minExposureTime?: FloatRange;
  /** Valid range of the Maximum ExposureTime. */
  maxExposureTime?: FloatRange;
  /** Valid range of the Minimum Gain. */
  minGain?: FloatRange;
  /** Valid range of the Maximum Gain. */
  maxGain?: FloatRange;
  /** Valid range of the Minimum Iris. */
  minIris?: FloatRange;
  /** Valid range of the Maximum Iris. */
  maxIris?: FloatRange;
  /** Valid range of the ExposureTime. */
  exposureTime?: FloatRange;
  /** Valid range of the Gain. */
  gain?: FloatRange;
  /** Valid range of the Iris. */
  iris?: FloatRange;
}
export interface MoveOptions20 {
  /** Valid ranges for the absolute control. */
  absolute?: AbsoluteFocusOptions;
  /** Valid ranges for the relative control. */
  relative?: RelativeFocusOptions20;
  /** Valid ranges for the continuous control. */
  continuous?: ContinuousFocusOptions;
}
export interface RelativeFocusOptions20 {
  /** Valid ranges of the distance. */
  distance?: FloatRange;
  /** Valid ranges of the speed. */
  speed?: FloatRange;
}
export interface WhiteBalance20 {
  /** 'AUTO' or 'MANUAL' */
  mode?: WhiteBalanceMode;
  /** Rgain (unitless). */
  crGain?: number;
  /** Bgain (unitless). */
  cbGain?: number;
  extension?: WhiteBalance20Extension;
}
export interface WhiteBalance20Extension {}
export interface FocusConfiguration20 {
  /** Zero or more modes as defined in enumeration tt:AFModes. */
  AFMode?: StringAttrList;
  /**
   * Mode of auto focus.
   *
   * AUTO - The device automatically adjusts focus.
   * MANUAL - The device does not automatically adjust focus.
   *
   * Note: for devices supporting both manual and auto operation at the same time manual operation may be supported even if the Mode parameter is set to Auto.
   */
  autoFocusMode?: AutoFocusMode;
  defaultSpeed?: number;
  /** Parameter to set autofocus near limit (unit: meter). */
  nearLimit?: number;
  /** Parameter to set autofocus far limit (unit: meter). */
  farLimit?: number;
  extension?: FocusConfiguration20Extension;
}
export interface FocusConfiguration20Extension {}
export interface WhiteBalanceOptions20 {
  /**
   * Mode of WhiteBalance.
   *
   * AUTO
   * MANUAL
   *
   */
  mode?: WhiteBalanceMode[];
  yrGain?: FloatRange;
  ybGain?: FloatRange;
  extension?: WhiteBalanceOptions20Extension;
}
export interface WhiteBalanceOptions20Extension {}
export interface FocusOptions20 {
  /**
   * Supported modes for auto focus.
   *
   * AUTO - The device supports automatic focus adjustment.
   * MANUAL - The device supports manual focus adjustment.
   *
   */
  autoFocusModes?: AutoFocusMode[];
  /** Valid range of DefaultSpeed. */
  defaultSpeed?: FloatRange;
  /** Valid range of NearLimit. */
  nearLimit?: FloatRange;
  /** Valid range of FarLimit. */
  farLimit?: FloatRange;
  extension?: FocusOptions20Extension;
}
export interface FocusOptions20Extension {
  /** Supported options for auto focus. Options shall be chosen from tt:AFModes. */
  AFModes?: StringAttrList;
}
export interface ToneCompensationOptions {
  /** Supported options for Tone Compensation mode. Its options shall be chosen from tt:ToneCompensationMode Type. */
  mode?: string[];
  /** Indicates whether or not support Level parameter for Tone Compensation. */
  level?: boolean;
}
export interface DefoggingOptions {
  /** Supported options for Defogging mode. Its options shall be chosen from tt:DefoggingMode Type. */
  mode?: string[];
  /** Indicates whether or not support Level parameter for Defogging. */
  level?: boolean;
}
export interface NoiseReductionOptions {
  /** Indicates whether or not support Level parameter for NoiseReduction. */
  level?: boolean;
}
export interface MessageExtension {}
export interface SimpleItem {
  /** Item name. */
  name: string;
  /** Item value. The type is defined in the corresponding description. */
  value: unknown;
}
export interface ElementItem {
  /** Item name. */
  name: string;
}
export interface ItemList {
  /** Value name pair as defined by the corresponding description. */
  simpleItem?: SimpleItem[];
  /** Complex value structure. */
  elementItem?: ElementItem[];
  extension?: ItemListExtension;
}
export interface ItemListExtension {}
export interface MessageDescription {
  /** Must be set to true when the described Message relates to a property. An alternative term of "property" is a "state" in contrast to a pure event, which contains relevant information for only a single point in time.Default is false. */
  isProperty?: boolean;
  /**
   * Set of tokens producing this message. The list may only contain SimpleItemDescription items.
   * The set of tokens identify the component within the WS-Endpoint, which is responsible for the producing the message.
   * For analytics events the token set shall include the VideoSourceConfigurationToken, the VideoAnalyticsConfigurationToken
   * and the name of the analytics module or rule.
   */
  source?: ItemListDescription;
  /** Describes optional message payload parameters that may be used as key. E.g. object IDs of tracked objects are conveyed as key. */
  key?: ItemListDescription;
  /** Describes the payload of the message. */
  data?: ItemListDescription;
  extension?: MessageDescriptionExtension;
}
export interface MessageDescriptionExtension {}
export interface SimpleItemDescription {
  /** Item name. Must be unique within a list. */
  name: string;
  type: unknown;
}
export interface ElementItemDescription {
  /** Item name. Must be unique within a list. */
  name: string;
  /** The type of the item. The Type must reference a defined type. */
  type: unknown;
}
/**
 * Describes a list of items. Each item in the list shall have a unique name.
 * The list is designed as linear structure without optional or unbounded elements.
 * Use ElementItems only when complex structures are inevitable.
 */
export interface ItemListDescription {
  /** Description of a simple item. The type must be of cathegory simpleType (xs:string, xs:integer, xs:float, ...). */
  simpleItemDescription?: SimpleItemDescription[];
  /** Description of a complex type. The Type must reference a defined type. */
  elementItemDescription?: ElementItemDescription[];
  extension?: ItemListDescriptionExtension;
}
export interface ItemListDescriptionExtension {}
export interface Polyline {
  point?: Vector[];
}
export interface AnalyticsEngineConfiguration {
  analyticsModule?: Config[];
  extension?: AnalyticsEngineConfigurationExtension;
}
export interface AnalyticsEngineConfigurationExtension {}
export interface RuleEngineConfiguration {
  rule?: Config[];
  extension?: RuleEngineConfigurationExtension;
}
export interface RuleEngineConfigurationExtension {}
export interface Config {
  /** Name of the configuration. */
  name: string;
  /** The Type attribute specifies the type of rule and shall be equal to value of one of Name attributes of ConfigDescription elements returned by GetSupportedRules and GetSupportedAnalyticsModules command. */
  type: unknown;
  /** List of configuration parameters as defined in the corresponding description. */
  parameters?: ItemList;
}
export interface Messages extends MessageDescription {
  /** The topic of the message. For historical reason the element is named ParentTopic, but the full topic is expected. */
  parentTopic?: string;
}
export interface ConfigDescription {
  /** The Name attribute (e.g. "tt::LineDetector") uniquely identifies the type of rule, not a type definition in a schema. */
  name: unknown;
  /** The fixed attribute signals that it is not allowed to add or remove this type of configuration. */
  fixed?: boolean;
  /** The maxInstances attribute signals the maximum number of instances per configuration. */
  maxInstances?: number;
  /**
   * List describing the configuration parameters. The names of the parameters must be unique. If possible SimpleItems
   * should be used to transport the information to ease parsing of dynamically defined messages by a client
   * application.
   */
  parameters?: ItemListDescription;
  /**
   * The analytics modules and rule engine produce Events, which must be listed within the Analytics Module Description. In order to do so
   * the structure of the Message is defined and consists of three groups: Source, Key, and Data. It is recommended to use SimpleItemDescriptions wherever applicable.
   * The name of all Items must be unique within all Items contained in any group of this Message.
   * Depending on the component multiple parameters or none may be needed to identify the component uniquely.
   */
  messages?: Messages[];
  extension?: ConfigDescriptionExtension;
}
export interface ConfigDescriptionExtension {}
export interface SupportedRules {
  /** Maximum number of concurrent instances. */
  limit?: number;
  /** Lists the location of all schemas that are referenced in the rules. */
  ruleContentSchemaLocation?: AnyURI[];
  /** List of rules supported by the Video Analytics configuration.. */
  ruleDescription?: ConfigDescription[];
  extension?: SupportedRulesExtension;
}
export interface SupportedRulesExtension {}
export interface SupportedAnalyticsModules {
  /** Maximum number of concurrent instances. */
  limit?: number;
  /**
   * It optionally contains a list of URLs that provide the location of schema files.
   * These schema files describe the types and elements used in the analytics module descriptions.
   * Analytics module descriptions that reference types or elements imported from any ONVIF defined schema files
   * need not explicitly list those schema files.
   */
  analyticsModuleContentSchemaLocation?: AnyURI[];
  analyticsModuleDescription?: ConfigDescription[];
  extension?: SupportedAnalyticsModulesExtension;
}
export interface SupportedAnalyticsModulesExtension {}
export interface PolylineArray {
  /** Contains array of Polyline */
  segment?: Polyline[];
  extension?: PolylineArrayExtension;
}
export interface PolylineArrayExtension {}
export interface PolylineArrayConfiguration {
  /** Contains PolylineArray configuration data */
  polylineArray?: PolylineArray;
}
export interface MotionExpression {
  type?: string;
  /** Motion Expression data structure contains motion expression which is based on Scene Descriptor schema with XPATH syntax. The Type argument could allow introduction of different dialects */
  expression?: string;
}
export interface MotionExpressionConfiguration {
  /** Contains Rule MotionExpression configuration */
  motionExpression?: MotionExpression;
}
export interface CellLayout {
  /** Number of columns of the cell grid (x dimension) */
  columns: number;
  /** Number of rows of the cell grid (y dimension) */
  rows: number;
  /** Mapping of the cell grid to the Video frame. The cell grid is starting from the upper left corner and x dimension is going from left to right and the y dimension from up to down. */
  transformation?: Transformation;
}
/** Configuration of the streaming and coding settings of a Video window. */
export interface PaneConfiguration {
  /** Optional name of the pane configuration. */
  paneName?: string;
  /**
   * If the device has audio outputs, this element contains a pointer to the audio output that is associated with the pane. A client
   * can retrieve the available audio outputs of a device using the GetAudioOutputs command of the DeviceIO service.
   */
  audioOutputToken?: ReferenceToken;
  /**
   * If the device has audio sources, this element contains a pointer to the audio source that is associated with this pane.
   * The audio connection from a decoder device to the NVT is established using the backchannel mechanism. A client can retrieve the available audio sources of a device using the GetAudioSources command of the
   * DeviceIO service.
   */
  audioSourceToken?: ReferenceToken;
  /**
   * The configuration of the audio encoder including codec, bitrate
   * and sample rate.
   */
  audioEncoderConfiguration?: AudioEncoderConfiguration;
  /**
   * A pointer to a Receiver that has the necessary information to receive
   * data from a Transmitter. This Receiver can be connected and the network video decoder displays the received data on the specified outputs. A client can retrieve the available Receivers using the
   * GetReceivers command of the Receiver Service.
   */
  receiverToken?: ReferenceToken;
  /** A unique identifier in the display device. */
  token?: ReferenceToken;
}
/** A pane layout describes one Video window of a display. It links a pane configuration to a region of the screen. */
export interface PaneLayout {
  /** Reference to the configuration of the streaming and coding parameters. */
  pane?: ReferenceToken;
  /** Describes the location and size of the area on the monitor. The area coordinate values are espressed in normalized units [-1.0, 1.0]. */
  area?: Rectangle;
}
/** A layout describes a set of Video windows that are displayed simultaniously on a display. */
export interface Layout {
  /** List of panes assembling the display layout. */
  paneLayout?: PaneLayout[];
  extension?: LayoutExtension;
}
export interface LayoutExtension {}
/** This type contains the Audio and Video coding capabilities of a display service. */
export interface CodingCapabilities {
  /** If the device supports audio encoding this section describes the supported codecs and their configuration. */
  audioEncodingCapabilities?: AudioEncoderConfigurationOptions;
  /** If the device supports audio decoding this section describes the supported codecs and their settings. */
  audioDecodingCapabilities?: AudioDecoderConfigurationOptions;
  /** This section describes the supported video codesc and their configuration. */
  videoDecodingCapabilities?: VideoDecoderConfigurationOptions;
}
/** The options supported for a display layout. */
export interface LayoutOptions {
  /** Lists the possible Pane Layouts of the Video Output */
  paneLayoutOptions?: PaneLayoutOptions[];
  extension?: LayoutOptionsExtension;
}
export interface LayoutOptionsExtension {}
/** Description of a pane layout describing a complete display layout. */
export interface PaneLayoutOptions {
  /** List of areas assembling a layout. Coordinate values are in the range [-1.0, 1.0]. */
  area?: Rectangle[];
  extension?: PaneOptionExtension;
}
export interface PaneOptionExtension {}
/** Description of a receiver, including its token and configuration. */
export interface Receiver {
  /** Unique identifier of the receiver. */
  token?: ReferenceToken;
  /** Describes the configuration of the receiver. */
  configuration?: ReceiverConfiguration;
}
/** Describes the configuration of a receiver. */
export interface ReceiverConfiguration {
  /** The following connection modes are defined: */
  mode?: ReceiverMode;
  /** Details of the URI to which the receiver should connect. */
  mediaUri?: AnyURI;
  /** Stream connection parameters. */
  streamSetup?: StreamSetup;
}
/** Contains information about a receiver's current state. */
export interface ReceiverStateInformation {
  /** The connection state of the receiver may have one of the following states: */
  state?: ReceiverState;
  /** Indicates whether or not the receiver was created automatically. */
  autoCreated?: boolean;
}
export interface SourceReference {
  type?: AnyURI;
  token?: ReferenceToken;
}
export interface DateTimeRange {
  from?: Date;
  until?: Date;
}
export interface RecordingSummary {
  /** The earliest point in time where there is recorded data on the device. */
  dataFrom?: Date;
  /** The most recent point in time where there is recorded data on the device. */
  dataUntil?: Date;
  /** The device contains this many recordings. */
  numberRecordings?: number;
}
/** A structure for defining a limited scope when searching in recorded data. */
export interface SearchScope {
  /** A list of sources that are included in the scope. If this list is included, only data from one of these sources shall be searched. */
  includedSources?: SourceReference[];
  /** A list of recordings that are included in the scope. If this list is included, only data from one of these recordings shall be searched. */
  includedRecordings?: RecordingReference[];
  /** An xpath expression used to specify what recordings to search. Only those recordings with an RecordingInformation structure that matches the filter shall be searched. */
  recordingInformationFilter?: XPathExpression;
  /** Extension point */
  extension?: SearchScopeExtension;
}
export interface SearchScopeExtension {}
export interface EventFilter extends FilterType {}
export interface PTZPositionFilter {
  /** The lower boundary of the PTZ volume to look for. */
  minPosition?: PTZVector;
  /** The upper boundary of the PTZ volume to look for. */
  maxPosition?: PTZVector;
  /** If true, search for when entering the specified PTZ volume. */
  enterOrExit?: boolean;
}
export interface MetadataFilter {
  metadataStreamFilter?: XPathExpression;
}
export interface FindRecordingResultList {
  /** The state of the search when the result is returned. Indicates if there can be more results, or if the search is completed. */
  searchState?: SearchState;
  /** A RecordingInformation structure for each found recording matching the search. */
  recordingInformation?: RecordingInformation[];
}
export interface FindEventResultList {
  /** The state of the search when the result is returned. Indicates if there can be more results, or if the search is completed. */
  searchState?: SearchState;
  /** A FindEventResult structure for each found event matching the search. */
  result?: FindEventResult[];
}
export interface FindEventResult {
  /** The recording where this event was found. Empty string if no recording is associated with this event. */
  recordingToken?: RecordingReference;
  /** A reference to the track where this event was found. Empty string if no track is associated with this event. */
  trackToken?: TrackReference;
  /** The time when the event occured. */
  time?: Date;
  /** The description of the event. */
  event?: unknown;
  /** If true, indicates that the event is a virtual event generated for this particular search session to give the state of a property at the start time of the search. */
  startStateEvent?: boolean;
}
export interface FindPTZPositionResultList {
  /** The state of the search when the result is returned. Indicates if there can be more results, or if the search is completed. */
  searchState?: SearchState;
  /** A FindPTZPositionResult structure for each found PTZ position matching the search. */
  result?: FindPTZPositionResult[];
}
export interface FindPTZPositionResult {
  /** A reference to the recording containing the PTZ position. */
  recordingToken?: RecordingReference;
  /** A reference to the metadata track containing the PTZ position. */
  trackToken?: TrackReference;
  /** The time when the PTZ position was valid. */
  time?: Date;
  /** The PTZ position. */
  position?: PTZVector;
}
export interface FindMetadataResultList {
  /** The state of the search when the result is returned. Indicates if there can be more results, or if the search is completed. */
  searchState?: SearchState;
  /** A FindMetadataResult structure for each found set of Metadata matching the search. */
  result?: FindMetadataResult[];
}
export interface FindMetadataResult {
  /** A reference to the recording containing the metadata. */
  recordingToken?: RecordingReference;
  /** A reference to the metadata track containing the matching metadata. */
  trackToken?: TrackReference;
  /** The point in time when the matching metadata occurs in the metadata track. */
  time?: Date;
}
export interface RecordingInformation {
  recordingToken?: RecordingReference;
  /**
   * Information about the source of the recording. This gives a description of where the data in the recording comes from. Since a single
   * recording is intended to record related material, there is just one source. It is indicates the physical location or the
   * major data source for the recording. Currently the recordingconfiguration cannot describe each individual data source.
   */
  source?: RecordingSourceInformation;
  earliestRecording?: Date;
  latestRecording?: Date;
  content?: Description;
  /** Basic information about the track. Note that a track may represent a single contiguous time span or consist of multiple slices. */
  track?: TrackInformation[];
  recordingStatus?: RecordingStatus;
}
/** A set of informative desciptions of a data source. The Search searvice allows a client to filter on recordings based on information in this structure. */
export interface RecordingSourceInformation {
  /**
   * Identifier for the source chosen by the client that creates the structure.
   * This identifier is opaque to the device. Clients may use any type of URI for this field. A device shall support at least 128 characters.
   */
  sourceId?: AnyURI;
  /** Informative user readable name of the source, e.g. "Camera23". A device shall support at least 20 characters. */
  name?: Name;
  /** Informative description of the physical location of the source, e.g. the coordinates on a map. */
  location?: Description;
  /** Informative description of the source. */
  description?: Description;
  /** URI provided by the service supplying data to be recorded. A device shall support at least 128 characters. */
  address?: AnyURI;
}
export interface RecordingEncryption {
  /**
   * Mode of encryption.
   * See tt:EncryptionMode for a list of definitions and capability trc:SupportedEncryptionModes for the supported encryption modes.
   */
  mode: string;
  /** Key ID of the associated key for encryption. */
  KID?: string;
  /**
   * Key for encrypting content.
   * The device shall not include this parameter when reading.
   */
  key?: unknown;
  /**
   * Optional list of track tokens to be encrypted.
   * If no track tokens are specified, all tracks are encrypted and no other encryption configurations shall exist for the recording.
   * Each track shall only be contained in one encryption configuration.
   */
  track?: string[];
}
export interface RecordingTargetConfiguration {
  /** Token of a storage configuration. */
  storage?: ReferenceToken;
  /**
   * Format of the recording.
   * See tt:TargetFormat for a list of definitions and capability trc:SupportedTargetFormats for the supported formats.
   */
  format?: string;
  /** Path prefix to be inserted in the object key. */
  prefix?: string;
  /** Path postfix to be inserted in the object key. */
  postfix?: string;
  /** Maximum duration of a span. */
  spanDuration?: string;
  /** Maximum duration of a segment. */
  segmentDuration?: string;
  /**
   * Optional encryption configuration.
   * See capability trc:EncryptionEntryLimit for the number of supported entries.
   * By specifying multiple encryption entries per recording, different tracks can be encrypted with different configurations.
   * Each track shall only be contained in one encryption configuration.
   */
  encryption?: RecordingEncryption[];
}
export interface TrackInformation {
  trackToken?: TrackReference;
  /**
   * Type of the track: "Video", "Audio" or "Metadata".
   * The track shall only be able to hold data of that type.
   */
  trackType?: TrackType;
  /** Informative description of the contents of the track. */
  description?: Description;
  /** The start date and time of the oldest recorded data in the track. */
  dataFrom?: Date;
  /** The stop date and time of the newest recorded data in the track. */
  dataTo?: Date;
}
/** A set of media attributes valid for a recording at a point in time or for a time interval. */
export interface MediaAttributes {
  /** A reference to the recording that has these attributes. */
  recordingToken?: RecordingReference;
  /** A set of attributes for each track. */
  trackAttributes?: TrackAttributes[];
  /** The attributes are valid from this point in time in the recording. */
  from?: Date;
  /** The attributes are valid until this point in time in the recording. Can be equal to 'From' to indicate that the attributes are only known to be valid for this particular point in time. */
  until?: Date;
}
export interface TrackAttributes {
  /** The basic information about the track. Note that a track may represent a single contiguous time span or consist of multiple slices. */
  trackInformation?: TrackInformation;
  /** If the track is a video track, exactly one of this structure shall be present and contain the video attributes. */
  videoAttributes?: VideoAttributes;
  /** If the track is an audio track, exactly one of this structure shall be present and contain the audio attributes. */
  audioAttributes?: AudioAttributes;
  /** If the track is an metadata track, exactly one of this structure shall be present and contain the metadata attributes. */
  metadataAttributes?: MetadataAttributes;
  /**/
  extension?: TrackAttributesExtension;
}
export interface TrackAttributesExtension {}
export interface VideoAttributes {
  /** Average bitrate in kbps. */
  bitrate?: number;
  /** The width of the video in pixels. */
  width?: number;
  /** The height of the video in pixels. */
  height?: number;
  /** Video encoding of the track.  Use value from tt:VideoEncoding for MPEG4. Otherwise use values from tt:VideoEncodingMimeNames and  IANA Media Types. */
  encoding?: string;
  /** Average framerate in frames per second. */
  framerate?: number;
}
export interface AudioAttributes {
  /** The bitrate in kbps. */
  bitrate?: number;
  /** Audio encoding of the track.  Use values from tt:AudioEncoding for G711 and AAC. Otherwise use values from tt:AudioEncodingMimeNames and  IANA Media Types. */
  encoding?: string;
  /** The sample rate in kHz. */
  samplerate?: number;
}
export interface MetadataAttributes {
  /** List of all PTZ spaces active for recording. Note that events are only recorded on position changes and the actual point of recording may not necessarily contain an event of the specified type. */
  ptzSpaces?: StringAttrList;
  /** Indicates that there can be PTZ data in the metadata track in the specified time interval. */
  canContainPTZ?: boolean;
  /** Indicates that there can be analytics data in the metadata track in the specified time interval. */
  canContainAnalytics?: boolean;
  /** Indicates that there can be notifications in the metadata track in the specified time interval. */
  canContainNotifications?: boolean;
}
export interface RecordingConfiguration {
  /** Information about the source of the recording. */
  source?: RecordingSourceInformation;
  /** Informative description of the source. */
  content?: Description;
  /**
   * Sspecifies the maximum time that data in any track within the
   * recording shall be stored. The device shall delete any data older than the maximum retention
   * time. Such data shall not be accessible anymore. If the MaximumRetentionPeriod is set to 0,
   * the device shall not limit the retention time of stored data, except by resource constraints.
   * Whatever the value of MaximumRetentionTime, the device may automatically delete
   * recordings to free up storage space for new recordings.
   */
  maximumRetentionTime?: string;
  /** Optional external storage target configuration. */
  target?: RecordingTargetConfiguration;
}
export interface TrackConfiguration {
  /**
   * Type of the track. It shall be equal to the strings “Video”,
   * “Audio” or “Metadata”. The track shall only be able to hold data of that type.
   */
  trackType?: TrackType;
  /** Informative description of the track. */
  description?: Description;
}
export interface GetRecordingsResponseItem {
  /** Token of the recording. */
  recordingToken?: RecordingReference;
  /** Configuration of the recording. */
  configuration?: RecordingConfiguration;
  /** List of tracks. */
  tracks?: GetTracksResponseList;
}
export interface GetTracksResponseList {
  /** Configuration of a track. */
  track?: GetTracksResponseItem[];
}
export interface GetTracksResponseItem {
  /** Token of the track. */
  trackToken?: TrackReference;
  /** Configuration of the track. */
  configuration?: TrackConfiguration;
}
export interface RecordingJobConfiguration {
  /**
   * This attribute adds an additional requirement for activating the recording job.
   * If this optional field is provided the job shall only record if the schedule exists and is active.
   */
  scheduleToken?: unknown;
  /** Identifies the recording to which this job shall store the received data. */
  recordingToken?: RecordingReference;
  /**
   * The mode of the job. If it is idle, nothing shall happen. If it is active, the device shall try
   * to obtain data from the receivers. A client shall use GetRecordingJobState to determine if data transfer is really taking place.
   * The only valid values for Mode shall be “Idle” and “Active”.
   */
  mode?: RecordingJobMode;
  /**
   * This shall be a non-negative number. If there are multiple recording jobs that store data to
   * the same track, the device will only store the data for the recording job with the highest
   * priority. The priority is specified per recording job, but the device shall determine the priority
   * of each track individually. If there are two recording jobs with the same priority, the device
   * shall record the data corresponding to the recording job that was activated the latest.
   */
  priority?: number;
  /** Source of the recording. */
  source?: RecordingJobSource[];
  extension?: RecordingJobConfigurationExtension;
  /** Optional filter defining on which event condition a recording job gets active. */
  eventFilter?: RecordingEventFilter;
}
export interface Filter {
  /** Topic filter as defined in section 9.6.3 of the ONVIF Core Specification. */
  topic?: string;
  /** Optional message source content filter as defined in section 9.4.4 of the ONVIF Core Specification. */
  source?: string;
}
export interface RecordingEventFilter {
  filter?: Filter[];
  /** Optional timespan to record before the actual event condition became active. */
  before?: string;
  /** Optional timespan to record after the actual event condition becomes inactive. */
  after?: string;
}
export interface RecordingJobConfigurationExtension {}
export interface RecordingJobSource {
  /**
   * This field shall be a reference to the source of the data. The type of the source
   * is determined by the attribute Type in the SourceToken structure. If Type is
   * http://www.onvif.org/ver10/schema/Receiver, the token is a ReceiverReference. In this case
   * the device shall receive the data over the network. If Type is
   * http://www.onvif.org/ver10/schema/Profile, the token identifies a media profile, instructing the
   * device to obtain data from a profile that exists on the local device.
   */
  sourceToken?: SourceReference;
  /**
   * If this field is TRUE, and if the SourceToken is omitted, the device
   * shall create a receiver object (through the receiver service) and assign the
   * ReceiverReference to the SourceToken field. When retrieving the RecordingJobConfiguration
   * from the device, the AutoCreateReceiver field shall never be present.
   */
  autoCreateReceiver?: boolean;
  /** List of tracks associated with the recording. */
  tracks?: RecordingJobTrack[];
  extension?: RecordingJobSourceExtension;
}
export interface RecordingJobSourceExtension {}
export interface RecordingJobTrack {
  /**
   * If the received RTSP stream contains multiple tracks of the same type, the
   * SourceTag differentiates between those Tracks. This field can be ignored in case of recording a local source.
   */
  sourceTag?: string;
  /**
   * The destination is the tracktoken of the track to which the device shall store the
   * received data.
   */
  destination?: TrackReference;
}
export interface RecordingJobStateInformation {
  /** Identification of the recording that the recording job records to. */
  recordingToken?: RecordingReference;
  /** Holds the aggregated state over the whole RecordingJobInformation structure. */
  state?: RecordingJobState;
  /** Identifies the data source of the recording job. */
  sources?: RecordingJobStateSource[];
  extension?: RecordingJobStateInformationExtension;
}
export interface RecordingJobStateInformationExtension {}
export interface RecordingJobStateSource {
  /** Identifies the data source of the recording job. */
  sourceToken?: SourceReference;
  /** Holds the aggregated state over all substructures of RecordingJobStateSource. */
  state?: RecordingJobState;
  /** List of track items. */
  tracks?: RecordingJobStateTracks;
}
export interface RecordingJobStateTracks {
  track?: RecordingJobStateTrack[];
}
export interface RecordingJobStateTrack {
  /** Identifies the track of the data source that provides the data. */
  sourceTag?: string;
  /** Indicates the destination track. */
  destination?: TrackReference;
  /**
   * Optionally holds an implementation defined string value that describes the error.
   * The string should be in the English language.
   */
  error?: string;
  /**
   * Provides the job state of the track. The valid
   * values of state shall be “Idle”, “Active” and “Error”. If state equals “Error”, the Error field may be filled in with an implementation defined value.
   */
  state?: RecordingJobState;
}
export interface GetRecordingJobsResponseItem {
  jobToken?: RecordingJobReference;
  jobConfiguration?: RecordingJobConfiguration;
}
/** Configuration parameters for the replay service. */
export interface ReplayConfiguration {
  /** The RTSP session timeout. */
  sessionTimeout?: string;
}
export interface AnalyticsEngine extends ConfigurationEntity {
  analyticsEngineConfiguration?: AnalyticsDeviceEngineConfiguration;
}
export interface AnalyticsDeviceEngineConfiguration {
  engineConfiguration?: EngineConfiguration[];
  extension?: AnalyticsDeviceEngineConfigurationExtension;
}
export interface AnalyticsDeviceEngineConfigurationExtension {}
export interface EngineConfiguration {
  videoAnalyticsConfiguration?: VideoAnalyticsConfiguration;
  analyticsEngineInputInfo?: AnalyticsEngineInputInfo;
}
export interface AnalyticsEngineInputInfo {
  inputInfo?: Config;
  extension?: AnalyticsEngineInputInfoExtension;
}
export interface AnalyticsEngineInputInfoExtension {}
export interface AnalyticsEngineInput extends ConfigurationEntity {
  sourceIdentification?: SourceIdentification;
  videoInput?: VideoEncoderConfiguration;
  metadataInput?: MetadataInput;
}
export interface SourceIdentification {
  name?: string;
  token?: ReferenceToken[];
  extension?: SourceIdentificationExtension;
}
export interface SourceIdentificationExtension {}
export interface MetadataInput {
  metadataConfig?: Config[];
  extension?: MetadataInputExtension;
}
export interface MetadataInputExtension {}
export interface AnalyticsEngineControl extends ConfigurationEntity {
  /** Token of the analytics engine (AnalyticsEngine) being controlled. */
  engineToken?: ReferenceToken;
  /** Token of the analytics engine configuration (VideoAnalyticsConfiguration) in effect. */
  engineConfigToken?: ReferenceToken;
  /** Tokens of the input (AnalyticsEngineInput) configuration applied. */
  inputToken?: ReferenceToken[];
  /** Tokens of the receiver providing media input data. The order of ReceiverToken shall exactly match the order of InputToken. */
  receiverToken?: ReferenceToken[];
  multicast?: MulticastConfiguration;
  subscription?: Config;
  mode?: ModeOfOperation;
}
export interface AnalyticsStateInformation {
  /** Token of the control object whose status is requested. */
  analyticsEngineControlToken?: ReferenceToken;
  state?: AnalyticsState;
}
export interface AnalyticsState {
  error?: string;
  state?: string;
}
/** Action Engine Event Payload data structure contains the information about the ONVIF command invocations. Since this event could be generated by other or proprietary actions, the command invocation specific fields are defined as optional and additional extension mechanism is provided for future or additional action definitions. */
export interface ActionEngineEventPayload {
  /** Request Message */
  requestInfo?: unknown;
  /** Response Message */
  responseInfo?: unknown;
  /** Fault Message */
  fault?: unknown;
  extension?: ActionEngineEventPayloadExtension;
}
export interface ActionEngineEventPayloadExtension {}
export interface AudioClassCandidate {
  /** Indicates audio class label */
  type?: AudioClassType;
  /** A likelihood/probability that the corresponding audio event belongs to this class. The sum of the likelihoods shall NOT exceed 1 */
  likelihood?: number;
}
export interface AudioClassDescriptor {
  /** Array of audio class label and class probability */
  classCandidate?: AudioClassCandidate[];
  extension?: AudioClassDescriptorExtension;
}
export interface AudioClassDescriptorExtension {}
export interface ActiveConnection {
  currentBitrate?: number;
  currentFps?: number;
}
export interface ProfileStatus {
  activeConnections?: ActiveConnection[];
  extension?: ProfileStatusExtension;
}
export interface ProfileStatusExtension {}
export interface OSDReference {}
export interface OSDPosConfiguration {
  /**
   * For OSD position type, following are the pre-defined: UpperLeft
   * UpperRight
   * LowerLeft
   * LowerRight
   * Custom
   */
  type?: string;
  pos?: Vector;
  extension?: OSDPosConfigurationExtension;
}
export interface OSDPosConfigurationExtension {}
/** The value range of "Transparent" could be defined by vendors only should follow this rule: the minimum value means non-transparent and the maximum value maens fully transparent. */
export interface OSDColor {
  transparent?: number;
  color?: Color;
}
export interface OSDTextConfiguration {
  /** This flag is applicable for Type Plain and defaults to true. When set to false the PlainText content will not be persistent across device reboots. */
  isPersistentText?: boolean;
  /**
   * The following OSD Text Type are defined:
   * Plain - The Plain type means the OSD is shown as a text string which defined in the "PlainText" item.
   * Date - The Date type means the OSD is shown as a date, format of which should be present in the "DateFormat" item.
   * Time - The Time type means the OSD is shown as a time, format of which should be present in the "TimeFormat" item.
   * DateAndTime - The DateAndTime type means the OSD is shown as date and time, format of which should be present in the "DateFormat" and the "TimeFormat" item.
   *
   */
  type?: string;
  /**
   * List of supported OSD date formats. This element shall be present when the value of Type field has Date or DateAndTime. The following DateFormat are defined:
   * M/d/yyyy - e.g. 3/6/2013
   * MM/dd/yyyy - e.g. 03/06/2013
   * dd/MM/yyyy - e.g. 06/03/2013
   * yyyy/MM/dd - e.g. 2013/03/06
   * yyyy-MM-dd - e.g. 2013-06-03
   * dddd, MMMM dd, yyyy - e.g. Wednesday, March 06, 2013
   * MMMM dd, yyyy - e.g. March 06, 2013
   * dd MMMM, yyyy - e.g. 06 March, 2013
   *
   */
  dateFormat?: string;
  /**
   * List of supported OSD time formats. This element shall be present when the value of Type field has Time or DateAndTime. The following TimeFormat are defined:
   * h:mm:ss tt - e.g. 2:14:21 PM
   * hh:mm:ss tt - e.g. 02:14:21 PM
   * H:mm:ss - e.g. 14:14:21
   * HH:mm:ss - e.g. 14:14:21
   *
   */
  timeFormat?: string;
  /** Font size of the text in pt. */
  fontSize?: number;
  /** Font color of the text. */
  fontColor?: OSDColor;
  /** Background color of the text. */
  backgroundColor?: OSDColor;
  /** The content of text to be displayed. */
  plainText?: string;
  extension?: OSDTextConfigurationExtension;
}
export interface OSDTextConfigurationExtension {}
export interface OSDImgConfiguration {
  /** The URI of the image which to be displayed. */
  imgPath?: AnyURI;
  extension?: OSDImgConfigurationExtension;
}
export interface OSDImgConfigurationExtension {}
export interface ColorspaceRange {
  X?: FloatRange;
  Y?: FloatRange;
  Z?: FloatRange;
  /** Acceptable values are the same as in tt:Color. */
  colorspace?: AnyURI;
}
/** Describe the colors supported. Either list each color or define the range of color values. */
export interface ColorOptions {}
/** Describe the option of the color and its transparency. */
export interface OSDColorOptions {
  /** Optional list of supported colors. */
  color?: ColorOptions;
  /** Range of the transparent level. Larger means more tranparent. */
  transparent?: IntRange;
  extension?: OSDColorOptionsExtension;
}
export interface OSDColorOptionsExtension {}
export interface OSDTextOptions {
  /** List of supported OSD text type. When a device indicates the supported number relating to Text type in MaximumNumberOfOSDs, the type shall be presented. */
  type?: string[];
  /** Range of the font size value. */
  fontSizeRange?: IntRange;
  /** List of supported date format. */
  dateFormat?: string[];
  /** List of supported time format. */
  timeFormat?: string[];
  /** List of supported font color. */
  fontColor?: OSDColorOptions;
  /** List of supported background color. */
  backgroundColor?: OSDColorOptions;
  extension?: OSDTextOptionsExtension;
}
export interface OSDTextOptionsExtension {}
export interface OSDImgOptions {
  /** List of supported image MIME types, such as "image/png". */
  formatsSupported?: StringAttrList;
  /** The maximum size (in bytes) of the image that can be uploaded. */
  maxSize?: number;
  /** The maximum width (in pixels) of the image that can be uploaded. */
  maxWidth?: number;
  /** The maximum height (in pixels) of the image that can be uploaded. */
  maxHeight?: number;
  /** List of available image URIs. */
  imagePath?: AnyURI[];
  extension?: OSDImgOptionsExtension;
}
export interface OSDImgOptionsExtension {}
export interface OSDConfiguration extends DeviceEntity {
  /** Reference to the video source configuration. */
  videoSourceConfigurationToken?: OSDReference;
  /** Type of OSD. */
  type?: OSDType;
  /** Position configuration of OSD. */
  position?: OSDPosConfiguration;
  /** Text configuration of OSD. It shall be present when the value of Type field is Text. */
  textString?: OSDTextConfiguration;
  /** Image configuration of OSD. It shall be present when the value of Type field is Image */
  image?: OSDImgConfiguration;
  extension?: OSDConfigurationExtension;
}
export interface OSDConfigurationExtension {}
export interface MaximumNumberOfOSDs {
  total: number;
  image?: number;
  plainText?: number;
  date?: number;
  time?: number;
  dateAndTime?: number;
}
export interface OSDConfigurationOptions {
  /** The maximum number of OSD configurations supported for the specified video source configuration. If the configuration does not support OSDs, this value shall be zero and the Type and PositionOption elements are ignored. If a device limits the number of instances by OSDType, it shall indicate the supported number for each type via the related attribute. */
  maximumNumberOfOSDs?: MaximumNumberOfOSDs;
  /** List supported type of OSD configuration. When a device indicates the supported number for each types in MaximumNumberOfOSDs, related type shall be presented. A device shall return Option element relating to listed type. */
  type?: OSDType[];
  /**
   * List available OSD position type. Following are the pre-defined:UpperLeft
   * UpperRight
   * LowerLeft
   * LowerRight
   * Custom
   */
  positionOption?: string[];
  /** Option of the OSD text configuration. This element shall be returned if the device is signaling the support for Text. */
  textOption?: OSDTextOptions;
  /** Option of the OSD image configuration. This element shall be returned if the device is signaling the support for Image. */
  imageOption?: OSDImgOptions;
  extension?: OSDConfigurationOptionsExtension;
}
export interface OSDConfigurationOptionsExtension {}
export interface FileProgress {
  /** Exported file name */
  fileName?: string;
  /** Normalized percentage completion for uploading the exported file */
  progress?: number;
}
export interface ArrayOfFileProgress {
  /** Exported file name and export progress information */
  fileProgress?: FileProgress[];
  extension?: ArrayOfFileProgressExtension;
}
export interface ArrayOfFileProgressExtension {}
export interface StorageReferencePath {
  /** identifier of an existing Storage Configuration. */
  storageToken?: ReferenceToken;
  /** gives the relative directory path on the storage */
  relativePath?: string;
  extension?: StorageReferencePathExtension;
}
export interface StorageReferencePathExtension {}
export interface PolygonOptions {
  /**
   * True if the device supports defining a region only using Rectangle.
   * The rectangle points are still passed using a Polygon element if the device does not support polygon regions. In this case, the points provided in the Polygon element shall represent a rectangle.
   */
  rectangleOnly?: boolean;
  /**
   * Provides the minimum and maximum number of points that can be defined in the Polygon.
   * If RectangleOnly is not set to true, this parameter is required.
   */
  vertexLimits?: IntRange;
}
export interface StringItems {
  item?: string[];
}
export interface Message {
  utcTime: Date;
  propertyOperation?: PropertyOperation;
  /** Token value pairs that triggered this message. Typically only one item is present. */
  source?: ItemList;
  key?: ItemList;
  data?: ItemList;
  extension?: MessageExtension;
}
