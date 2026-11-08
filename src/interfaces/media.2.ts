import {
  StringList,
  StringAttrList,
  VideoSourceConfiguration,
  AudioSourceConfiguration,
  VideoEncoder2Configuration,
  AudioEncoder2Configuration,
  VideoAnalyticsConfiguration,
  PTZConfiguration,
  MetadataConfiguration,
  AudioOutputConfiguration,
  AudioDecoderConfiguration,
  ReceiverConfiguration,
  Name,
  VideoResolution,
  Description,
  ColorOptions,
} from './onvif';
import { AnyURI } from './basics';
import { ReferenceToken, Polygon, Color } from './common';
export type ConfigurationEnumeration =
  | 'All'
  | 'VideoSource'
  | 'VideoEncoder'
  | 'AudioSource'
  | 'AudioEncoder'
  | 'AudioOutput'
  | 'AudioDecoder'
  | 'Metadata'
  | 'Analytics'
  | 'PTZ'
  | 'Receiver';
export interface Capabilities2 {
  /** Indicates if GetSnapshotUri is supported. */
  snapshotUri?: boolean;
  /** Indicates whether or not Rotation feature is supported. */
  rotation?: boolean;
  /** Indicates the support for changing video source mode. */
  videoSourceMode?: boolean;
  /** Indicates if OSD is supported. */
  OSD?: boolean;
  /** Indicates the support for temporary osd text configuration. */
  temporaryOSDText?: boolean;
  /** Indicates if Masking is supported. */
  mask?: boolean;
  /**
   * Indicates that privacy masks are only supported at the video source level and not the video source configuration level.
   * If this is true any addition, deletion or change of a privacy mask done for one video source configuration will automatically be
   * applied by the device to a corresponding privacy mask for all other video source configuration associated with the same video source.
   */
  sourceMask?: boolean;
  /** Indicates number of supported WebRTC configurations. */
  webRTC?: number;
  /** List of supported video and audio media types as defined by IANA. E.g. "video/H264 audio/opus". */
  webRTC_codecs?: StringList;
  /** Media profile capabilities. */
  profileCapabilities: ProfileCapabilities;
  /** Streaming capabilities. */
  streamingCapabilities: StreamingCapabilities;
  /** Audio clip capabilities. */
  audioClipCapabilities?: AudioClipCapabilities;
  /** MulticastAudioDecoder capabilities. */
  multicastAudioDecoderCapabilities?: MulticastAudioDecoderCapabilities;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface ProfileCapabilities {
  /** Maximum number of profiles supported. */
  maximumNumberOfProfiles?: number;
  /** The configurations supported by the device as defined by tr2:ConfigurationEnumeration. The enumeration value "All" shall not be included in this list. */
  configurationsSupported?: StringAttrList;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface StreamingCapabilities {
  /** Indicates support for live media streaming via RTSP. */
  RTSPStreaming?: boolean;
  /** Indicates support for RTP multicast. */
  RTPMulticast?: boolean;
  /** Indicates support for RTP/RTSP/TCP. */
  RTP_RTSP_TCP?: boolean;
  /** Indicates support for non aggregate RTSP control. */
  nonAggregateControl?: boolean;
  /** If streaming over WebSocket is supported, this shall return the RTSP WebSocket URI as described in Streaming Specification Section 5.1.1.5. */
  RTSPWebSocketUri?: AnyURI;
  /** Indicates support for non-RTSP controlled multicast streaming. */
  autoStartMulticast?: boolean;
  /** Indicates support for live media streaming via RTSPS and SRTP. */
  secureRTSPStreaming?: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface MulticastAudioDecoderCapabilities {
  /** Indicates support for multicast audio decoder. */
  multicastAudioDecoder?: boolean;
  /** Indicates whether the SRTP is supported in MulticastAudioDecoder or not. */
  SRTP?: boolean;
  /** Indicates whether the IPv6 is supported in MulticastAudioDecoder or not. */
  IPv6?: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface AudioClipCapabilities {
  /** Indicates the maximum number of audio clips that can be uploaded to the device. */
  maxAudioClipLimit?: number;
  /** Indicates the maximum size of the audio clip that can be uploaded, in KB. */
  maxAudioClipSize?: number;
  /** Enumerates the supported audio clip formats. See tr2: SupportedAudioClipFormat. */
  supportedAudioClipFormat?: StringAttrList;
  /** Indicates device has TTS capability. */
  TTSCapabilities?: TTSCapabilities;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface TTSCapabilities {
  /** Indicates the maximum length of content of a text for device to convert to an audio clip. */
  maxContentLength?: number;
  /**
   * List of supported languages. Uses ISO 639-1 alpha-2 language codes, such as"en" for English. See Codes for the Representation of Names of Languages.
   * Optionally combined with ISO 3166-1 alpha-2 country codes using the "language-country" format to specify regional variations, such as"en-US" for American English. For country codes, see ISO 3166-1 Country Codes.
   */
  TTSLanguage?: StringAttrList;
  /** List of supported voice types. See tr2: TTSVoiceType. */
  TTSVoiceType?: StringAttrList;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface ConfigurationRef {
  /** Type of the configuration as defined by tr2:ConfigurationEnumeration. */
  type: string;
  /**
   * Reference token of an existing configuration.
   * Token shall be included in the AddConfiguration request along with the type.
   * Token shall be included in the CreateProfile request when Configuration elements are included and type is selected.
   * Token is optional for RemoveConfiguration request. If no token is provided in RemoveConfiguration request, device shall
   * remove the configuration of the type included in the profile.
   */
  token?: ReferenceToken;
}
/** A set of media configurations. */
export interface ConfigurationSet {
  /** Optional configuration of the Video input. */
  videoSource?: VideoSourceConfiguration;
  /** Optional configuration of the Audio input. */
  audioSource?: AudioSourceConfiguration;
  /** Optional configuration of the Video encoder. */
  videoEncoder?: VideoEncoder2Configuration;
  /** Optional configuration of the Audio encoder. */
  audioEncoder?: AudioEncoder2Configuration;
  /** Optional configuration of the analytics module and rule engine. */
  analytics?: VideoAnalyticsConfiguration;
  /** Optional configuration of the pan tilt zoom unit. */
  PTZ?: PTZConfiguration;
  /** Optional configuration of the metadata stream. */
  metadata?: MetadataConfiguration;
  /** Optional configuration of the Audio output. */
  audioOutput?: AudioOutputConfiguration;
  /** Optional configuration of the Audio decoder. */
  audioDecoder?: AudioDecoderConfiguration;
  /** Optional configuration of the Receiver. */
  receiver?: ReceiverConfiguration;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** A media profile consists of a set of media configurations. */
export interface MediaProfile {
  /** Unique identifier of the profile. */
  token: ReferenceToken;
  /** A value of true signals that the profile cannot be deleted. Default is false. */
  fixed?: boolean;
  /** User readable name of the profile. */
  name: Name;
  /** The configurations assigned to the profile. */
  configurations?: ConfigurationSet;
}
export interface GetConfiguration {
  /** Token of the requested configuration. */
  configurationToken?: ReferenceToken;
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface EncoderInstance {
  /** Video Media Subtype for the video format. For definitions see tt:VideoEncodingMimeNames and  IANA Media Types. */
  encoding: string;
  /** The minimum guaranteed number of encoder instances (applications) for the VideoSourceConfiguration. */
  number: number;
}
export interface EncoderInstanceInfo {
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many streams can be set up at the same time per VideoSource. */
  codec?: EncoderInstance[];
  /** The minimum guaranteed total number of encoder instances (applications) per VideoSourceConfiguration. The device is able to deliver the Total number of streams */
  total: number;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface StartStopMulticastStreaming {
  /** Contains the token of the Profile that is used to define the multicast stream. */
  profileToken?: ReferenceToken;
}
export interface VideoSourceMode {
  /** Indicate token for video source mode. */
  token: ReferenceToken;
  /** Indication of whether this mode is active. If active this value is true. In case of non-indication, it means as false. The value of true shall be had by only one video source mode. */
  enabled?: boolean;
  /** Max frame rate in frames per second for this video source mode. */
  maxFramerate: number;
  /** Max horizontal and vertical resolution for this video source mode. */
  maxResolution: VideoResolution;
  /** List of one or more encodings supported for this video source.  For name definitions see tt:VideoEncodingMimeNames, and see IANA Media Types. */
  encodings: StringList;
  /** After setting the mode if a device starts to reboot this value is true. If a device change the mode without rebooting this value is false. If true, configured parameters may not be guaranteed by the device after rebooting. */
  reboot: boolean;
  /** Informative description of this video source mode. This field should be described in English. */
  description?: Description;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface Mask {
  /** Token of the mask. */
  token?: ReferenceToken;
  /** Token of the VideoSourceConfiguration the Mask is associated with. */
  configurationToken: ReferenceToken;
  /** Geometric representation of the mask area. */
  polygon: Polygon;
  /**
   * Type of masking as defined by tr2:MaskType:
   *
   * Color - The masked area is colored with color defined by the Color field.
   * Pixelated - The masked area is filled in mosaic style to hide details.
   * Blurred - The masked area is low pass filtered to hide details.
   *
   */
  type: string;
  /** Color of the masked area. */
  color?: Color;
  /** If set the mask will cover the image, otherwise it will be fully transparent. */
  enabled: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface MaskOptions {
  /** Information whether the polygon must have four points and a rectangular shape. */
  rectangleOnly?: boolean;
  /** Indicates the device capability of change in color of privacy mask for one video source configuration will automatically be applied to all the privacy masks associated with the same video source configuration. */
  singleColorOnly?: boolean;
  /** Maximum supported number of masks per VideoSourceConfiguration. */
  maxMasks: number;
  /** Maximum supported number of points per mask. */
  maxPoints: number;
  /** Information which types of tr2:MaskType are supported. Valid values are 'Color', 'Pixelated' and 'Blurred'. */
  types?: string[];
  /** Colors supported. */
  color: ColorOptions;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface WebRTCConfiguration {
  /** The signaling server URI. */
  signalingServer: AnyURI;
  /** The CertPathValidationPolicyID for validating the signaling server certificate. */
  certPathValidationPolicyID?: string;
  /** The Authorization Server to use for getting access tokens. This refers to an entity in the list of configured Authorization Servers in the [ONVIF Security Service Specification]. */
  authorizationServer: ReferenceToken;
  /** The default media profile to use for streaming if no specific profile is specified when initializing a session. */
  defaultProfile: ReferenceToken;
  /** Enables/disables the configuration. */
  enabled: boolean;
  /** Indicates if the device is connected to the server. This parameter is read-only. */
  connected?: boolean;
  /** Optional user readable error information (readonly). */
  error?: string;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface CreateProfile {
  /** friendly name of the profile to be created */
  name: Name;
  /** Optional set of configurations to be assigned to the profile. List entries with tr2:ConfigurationEnumeration value "All" shall be ignored. */
  configuration?: ConfigurationRef[];
}
export interface GetProfiles {
  /** Optional token of the requested profile. */
  token?: ReferenceToken;
  /** The types shall be provided as defined by tr2:ConfigurationEnumeration. */
  type?: string[];
}
export interface AddConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Optional item. If present updates the Name property of the profile. */
  name?: Name;
  /** List of configurations to be added. The types shall be provided in the order defined by tr2:ConfigurationEnumeration. List entries with tr2:ConfigurationEnumeration value "All" shall be ignored. */
  configuration?: ConfigurationRef[];
}
export interface RemoveConfiguration {
  /** This element contains a  reference to the media profile from which the configuration shall be removed. */
  profileToken?: ReferenceToken;
  /** List of configurations to be removed. The types shall be provided in the order defined by tr2:ConfigurationEnumeration. Tokens appearing in the configuration list shall be ignored. Presence of the "All" type shall result in an empty profile. */
  configuration?: ConfigurationRef[];
}
export interface DeleteProfile {
  /** This element contains a  reference to the profile that should be deleted. */
  token: ReferenceToken;
}
export interface GetVideoEncoderConfigurations extends GetConfiguration {}
export interface GetVideoSourceConfigurations extends GetConfiguration {}
export interface GetAudioEncoderConfigurations extends GetConfiguration {}
export interface GetAudioSourceConfigurations extends GetConfiguration {}
export interface GetAnalyticsConfigurations extends GetConfiguration {}
export interface GetMetadataConfigurations extends GetConfiguration {}
export interface GetAudioOutputConfigurations extends GetConfiguration {}
export interface GetAudioDecoderConfigurations extends GetConfiguration {}
export interface GetVideoEncoderInstances {
  /** Token of the video source configuration */
  configurationToken: ReferenceToken;
}
export interface SetSynchronizationPoint {
  /** Contains a Profile reference for which a Synchronization Point is requested. */
  profileToken?: ReferenceToken;
}
export interface GetSnapshotUri {
  /** The ProfileToken element indicates the media profile to use and will define the source and dimensions of the snapshot. */
  profileToken?: ReferenceToken;
}
export interface StartMulticastStreaming extends StartStopMulticastStreaming {}
export interface StopMulticastStreaming extends StartStopMulticastStreaming {}
export interface GetVideoSourceModes {
  /** Contains a video source reference for which a video source mode is requested. */
  videoSourceToken: ReferenceToken;
}
export interface SetVideoSourceMode {
  /** Contains a video source reference for which a video source mode is requested. */
  videoSourceToken: ReferenceToken;
  /** Indicate video source mode. */
  videoSourceModeToken: ReferenceToken;
}
export interface GetOSDs {
  /** The GetOSDs command fetches the OSD configuration if the OSD token is known. */
  OSDToken?: ReferenceToken;
  /** Token of the Video Source Configuration, which has OSDs associated with are requested. If token not exist, request all available OSDs. */
  configurationToken?: ReferenceToken;
}
export interface GetOSDOptions {
  /** Video Source Configuration Token that specifies an existing video source configuration that the options shall be compatible with. */
  configurationToken: ReferenceToken;
}
export interface DeleteOSD {
  /** This element contains a reference to the OSD configuration that should be deleted. */
  OSDToken: ReferenceToken;
}
export interface GetMasks {
  /** Optional mask token of an existing mask. */
  token?: ReferenceToken;
  /** Optional token of a Video Source Configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetMaskOptions {
  /** Video Source Configuration Token that specifies an existing video source configuration that the options shall be compatible with. */
  configurationToken: ReferenceToken;
}
export interface DeleteMask {
  /** This element contains a reference to the Mask configuration that should be deleted. */
  token: ReferenceToken;
}
