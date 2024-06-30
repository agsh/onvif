import {
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
  StringList,
  Description,
  ColorOptions,
  VideoSourceConfigurationOptions,
  VideoEncoder2ConfigurationOptions,
  AudioSourceConfigurationOptions,
  AudioEncoder2ConfigurationOptions,
  MetadataConfigurationOptions,
  AudioOutputConfigurationOptions,
  OSDConfiguration,
  OSDConfigurationOptions,
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
export type TransportProtocol =
  | 'RtspUnicast'
  | 'RtspMulticast'
  | 'RtspsUnicast'
  | 'RtspsMulticast'
  | 'RTSP'
  | 'RtspOverHttp';
export type MaskType = 'Color' | 'Pixelated' | 'Blurred';
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
  /** Media profile capabilities. */
  profileCapabilities?: ProfileCapabilities;
  /** Streaming capabilities. */
  streamingCapabilities?: StreamingCapabilities;
}
export interface ProfileCapabilities {
  /** Maximum number of profiles supported. */
  maximumNumberOfProfiles?: number;
  /** The configurations supported by the device as defined by tr2:ConfigurationEnumeration. The enumeration value "All" shall not be included in this list. */
  configurationsSupported?: StringAttrList;
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
}
export interface ConfigurationRef {
  /** Type of the configuration as defined by tr2:ConfigurationEnumeration. */
  type?: string;
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
}
/** A media profile consists of a set of media configurations. */
export interface MediaProfile {
  /** Unique identifier of the profile. */
  token: ReferenceToken;
  /** A value of true signals that the profile cannot be deleted. Default is false. */
  fixed?: boolean;
  /** User readable name of the profile. */
  name?: Name;
  /** The configurations assigned to the profile. */
  configurations?: ConfigurationSet;
}
export interface GetConfiguration {
  /** Token of the requested configuration. */
  configurationToken?: ReferenceToken;
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface SetConfigurationResponse {}
export interface EncoderInstance {
  /** Video Media Subtype for the video format. For definitions see tt:VideoEncodingMimeNames and  IANA Media Types. */
  encoding?: string;
  /** The minimum guaranteed number of encoder instances (applications) for the VideoSourceConfiguration. */
  number?: number;
}
export interface EncoderInstanceInfo {
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many streams can be set up at the same time per VideoSource. */
  codec?: EncoderInstance[];
  /** The minimum guaranteed total number of encoder instances (applications) per VideoSourceConfiguration. The device is able to deliver the Total number of streams */
  total?: number;
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
  maxFramerate?: number;
  /** Max horizontal and vertical resolution for this video source mode. */
  maxResolution?: VideoResolution;
  /** List of one or more encodings supported for this video source.  For name definitions see tt:VideoEncodingMimeNames, and see IANA Media Types. */
  encodings?: StringList;
  /** After setting the mode if a device starts to reboot this value is true. If a device change the mode without rebooting this value is false. If true, configured parameters may not be guaranteed by the device after rebooting. */
  reboot?: boolean;
  /** Informative description of this video source mode. This field should be described in English. */
  description?: Description;
}
export interface Mask {
  /** Token of the mask. */
  token?: ReferenceToken;
  /** Token of the VideoSourceConfiguration the Mask is associated with. */
  configurationToken?: ReferenceToken;
  /** Geometric representation of the mask area. */
  polygon?: Polygon;
  /**
   * Type of masking as defined by tr2:MaskType:
   *
   * Color - The masked area is colored with color defined by the Color field.
   * Pixelated - The masked area is filled in mosaic style to hide details.
   * Blurred - The masked area is low pass filtered to hide details.
   *
   */
  type?: string;
  /** Color of the masked area. */
  color?: Color;
  /** If set the mask will cover the image, otherwise it will be fully transparent. */
  enabled?: boolean;
}
export interface MaskOptions {
  /** Information whether the polygon must have four points and a rectangular shape. */
  rectangleOnly?: boolean;
  /** Indicates the device capability of change in color of privacy mask for one video source configuration will automatically be applied to all the privacy masks associated with the same video source configuration. */
  singleColorOnly?: boolean;
  /** Maximum supported number of masks per VideoSourceConfiguration. */
  maxMasks?: number;
  /** Maximum supported number of points per mask. */
  maxPoints?: number;
  /** Information which types of tr2:MaskType are supported. Valid values are 'Color', 'Pixelated' and 'Blurred'. */
  types?: string[];
  /** Colors supported. */
  color?: ColorOptions;
}
export interface WebRTCConfiguration {
  /** The signaling server URI. */
  signalingServer?: AnyURI;
  /** The CertPathValidationPolicyID for validating the signaling server certificate. */
  certPathValidationPolicyID?: string;
  /** The Authorization Server to use for getting access tokens. This refers to an entity in the list of configured Authorization Servers in the [ONVIF Security Service Specification]. */
  authorizationServer?: ReferenceToken;
  /** The default media profile to use for streaming if no specific profile is specified when initializing a session. */
  defaultProfile?: ReferenceToken;
  /** Enables/disables the configuration. */
  enabled?: boolean;
  /** Indicates if the device is connected to the server. This parameter is read-only. */
  connected?: boolean;
  /** Optional user readable error information (readonly). */
  error?: string;
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the media service is returned in the Capabilities element. */
  capabilities?: Capabilities2;
}
export interface Capabilities extends Capabilities2 {}
export interface CreateProfile {
  /** friendly name of the profile to be created */
  name?: Name;
  /** Optional set of configurations to be assigned to the profile. List entries with tr2:ConfigurationEnumeration value "All" shall be ignored. */
  configuration?: ConfigurationRef[];
}
export interface CreateProfileResponse {
  /** Token assigned by the device for the newly created profile. */
  token?: ReferenceToken;
}
export interface GetProfiles {
  /** Optional token of the requested profile. */
  token?: ReferenceToken;
  /** The types shall be provided as defined by tr2:ConfigurationEnumeration. */
  type?: string[];
}
export interface GetProfilesResponse {
  /**
   * Lists all profiles that exist in the media service. The response provides the requested types of Configurations as far as available.
   * If a profile doesn't contain a type no error shall be provided.
   */
  profiles?: MediaProfile[];
}
export interface AddConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Optional item. If present updates the Name property of the profile. */
  name?: Name;
  /** List of configurations to be added. The types shall be provided in the order defined by tr2:ConfigurationEnumeration. List entries with tr2:ConfigurationEnumeration value "All" shall be ignored. */
  configuration?: ConfigurationRef[];
}
export interface AddConfigurationResponse {}
export interface RemoveConfiguration {
  /** This element contains a  reference to the media profile from which the configuration shall be removed. */
  profileToken?: ReferenceToken;
  /** List of configurations to be removed. The types shall be provided in the order defined by tr2:ConfigurationEnumeration. Tokens appearing in the configuration list shall be ignored. Presence of the "All" type shall result in an empty profile. */
  configuration?: ConfigurationRef[];
}
export interface RemoveConfigurationResponse {}
export interface DeleteProfile {
  /** This element contains a  reference to the profile that should be deleted. */
  token?: ReferenceToken;
}
export interface DeleteProfileResponse {}
export interface GetVideoEncoderConfigurations extends GetConfiguration {}
export interface GetVideoEncoderConfigurationsResponse {
  /** This element contains a list of video encoder configurations. */
  configurations?: VideoEncoder2Configuration[];
}
export interface GetVideoSourceConfigurations extends GetConfiguration {}
export interface GetVideoSourceConfigurationsResponse {
  /** This element contains a list of video source configurations. */
  configurations?: VideoSourceConfiguration[];
}
export interface GetAudioEncoderConfigurations extends GetConfiguration {}
export interface GetAudioEncoderConfigurationsResponse {
  /** This element contains a list of audio encoder configurations. */
  configurations?: AudioEncoder2Configuration[];
}
export interface GetAudioSourceConfigurations extends GetConfiguration {}
export interface GetAudioSourceConfigurationsResponse {
  /** This element contains a list of audio source configurations. */
  configurations?: AudioSourceConfiguration[];
}
export interface GetAnalyticsConfigurations extends GetConfiguration {}
export interface GetAnalyticsConfigurationsResponse {
  /** This element contains a list of Analytics configurations. */
  configurations?: VideoAnalyticsConfiguration[];
}
export interface GetMetadataConfigurations extends GetConfiguration {}
export interface GetMetadataConfigurationsResponse {
  /** This element contains a list of metadata configurations */
  configurations?: MetadataConfiguration[];
}
export interface GetAudioOutputConfigurations extends GetConfiguration {}
export interface GetAudioOutputConfigurationsResponse {
  /** This element contains a list of audio output configurations */
  configurations?: AudioOutputConfiguration[];
}
export interface GetAudioDecoderConfigurations extends GetConfiguration {}
export interface GetAudioDecoderConfigurationsResponse {
  /** This element contains a list of audio decoder configurations */
  configurations?: AudioDecoderConfiguration[];
}
export interface SetVideoEncoderConfiguration {
  /** Contains the modified video encoder configuration. The configuration shall exist in the device. */
  configuration?: VideoEncoder2Configuration;
}
export interface SetVideoEncoderConfigurationResponse extends SetConfigurationResponse {}
export interface SetVideoSourceConfiguration {
  /** Contains the modified video source configuration. The configuration shall exist in the device. */
  configuration?: VideoSourceConfiguration;
}
export interface SetVideoSourceConfigurationResponse extends SetConfigurationResponse {}
export interface SetAudioEncoderConfiguration {
  /** Contains the modified audio encoder configuration. The configuration shall exist in the device. */
  configuration?: AudioEncoder2Configuration;
}
export interface SetAudioEncoderConfigurationResponse extends SetConfigurationResponse {}
export interface SetAudioSourceConfiguration {
  /** Contains the modified audio source configuration. The configuration shall exist in the device. */
  configuration?: AudioSourceConfiguration;
}
export interface SetAudioSourceConfigurationResponse extends SetConfigurationResponse {}
export interface SetMetadataConfiguration {
  /** Contains the modified metadata configuration. The configuration shall exist in the device. */
  configuration?: MetadataConfiguration;
}
export interface SetMetadataConfigurationResponse extends SetConfigurationResponse {}
export interface SetAudioOutputConfiguration {
  /** Contains the modified audio output configuration. The configuration shall exist in the device. */
  configuration?: AudioOutputConfiguration;
}
export interface SetAudioOutputConfigurationResponse extends SetConfigurationResponse {}
export interface SetAudioDecoderConfiguration {
  /** Contains the modified audio decoder configuration. The configuration shall exist in the device. */
  configuration?: AudioDecoderConfiguration;
}
export interface SetAudioDecoderConfigurationResponse extends SetConfigurationResponse {}
export interface GetVideoSourceConfigurationOptions extends GetConfiguration {}
export interface GetVideoSourceConfigurationOptionsResponse {
  /** This message contains the video source configuration options. If a video source configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: VideoSourceConfigurationOptions;
}
export interface GetVideoEncoderConfigurationOptions extends GetConfiguration {}
export interface GetVideoEncoderConfigurationOptionsResponse {
  options?: VideoEncoder2ConfigurationOptions[];
}
export interface GetAudioSourceConfigurationOptions extends GetConfiguration {}
export interface GetAudioSourceConfigurationOptionsResponse {
  /** This message contains the audio source configuration options. If a audio source configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioSourceConfigurationOptions;
}
export interface GetAudioEncoderConfigurationOptions extends GetConfiguration {}
export interface GetAudioEncoderConfigurationOptionsResponse {
  /** This message contains the audio encoder configuration options. If a audio encoder configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioEncoder2ConfigurationOptions[];
}
export interface GetMetadataConfigurationOptions extends GetConfiguration {}
export interface GetMetadataConfigurationOptionsResponse {
  /** This message contains the metadata configuration options. If a metadata configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: MetadataConfigurationOptions;
}
export interface GetAudioOutputConfigurationOptions extends GetConfiguration {}
export interface GetAudioOutputConfigurationOptionsResponse {
  /** This message contains the audio output configuration options. If a audio output configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioOutputConfigurationOptions;
}
export interface GetAudioDecoderConfigurationOptions extends GetConfiguration {}
export interface GetAudioDecoderConfigurationOptionsResponse {
  /** This message contains the audio decoder configuration options. If a audio decoder configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioEncoder2ConfigurationOptions[];
}
export interface GetVideoEncoderInstances {
  /** Token of the video source configuration */
  configurationToken?: ReferenceToken;
}
export interface GetVideoEncoderInstancesResponse {
  /** The minimum guaranteed total number of encoder instances (applications) per VideoSourceConfiguration. */
  info?: EncoderInstanceInfo;
}
export interface GetStreamUri {
  /** Defines the network protocol for streaming as defined by tr2:TransportProtocol */
  protocol?: string;
  /** The ProfileToken element indicates the media profile to use and will define the configuration of the content of the stream. */
  profileToken?: ReferenceToken;
}
export interface GetStreamUriResponse {
  /** Stable Uri to be used for requesting the media stream */
  uri?: AnyURI;
}
export interface SetSynchronizationPoint {
  /** Contains a Profile reference for which a Synchronization Point is requested. */
  profileToken?: ReferenceToken;
}
export interface SetSynchronizationPointResponse {}
export interface GetSnapshotUri {
  /** The ProfileToken element indicates the media profile to use and will define the source and dimensions of the snapshot. */
  profileToken?: ReferenceToken;
}
export interface GetSnapshotUriResponse {
  /** Stable Uri to be used for requesting snapshot images. */
  uri?: AnyURI;
}
export interface StartMulticastStreaming extends StartStopMulticastStreaming {}
export interface StartMulticastStreamingResponse extends SetConfigurationResponse {}
export interface StopMulticastStreaming extends StartStopMulticastStreaming {}
export interface StopMulticastStreamingResponse extends SetConfigurationResponse {}
export interface GetVideoSourceModes {
  /** Contains a video source reference for which a video source mode is requested. */
  videoSourceToken?: ReferenceToken;
}
export interface GetVideoSourceModesResponse {
  /** Return the information for specified video source mode. */
  videoSourceModes?: VideoSourceMode[];
}
export interface SetVideoSourceMode {
  /** Contains a video source reference for which a video source mode is requested. */
  videoSourceToken?: ReferenceToken;
  /** Indicate video source mode. */
  videoSourceModeToken?: ReferenceToken;
}
export interface SetVideoSourceModeResponse {
  /** The response contains information about rebooting after returning response. When Reboot is set true, a device will reboot automatically after setting mode. */
  reboot?: boolean;
}
export interface GetOSDs {
  /** The GetOSDs command fetches the OSD configuration if the OSD token is known. */
  OSDToken?: ReferenceToken;
  /** Token of the Video Source Configuration, which has OSDs associated with are requested. If token not exist, request all available OSDs. */
  configurationToken?: ReferenceToken;
}
export interface GetOSDsResponse {
  /** This element contains a list of requested OSDs. */
  OSDs?: OSDConfiguration[];
}
export interface SetOSD {
  /** Contains the modified OSD configuration. */
  OSD?: OSDConfiguration;
}
export interface SetOSDResponse extends SetConfigurationResponse {}
export interface GetOSDOptions {
  /** Video Source Configuration Token that specifies an existing video source configuration that the options shall be compatible with. */
  configurationToken?: ReferenceToken;
}
export interface GetOSDOptionsResponse {
  /**/
  OSDOptions?: OSDConfigurationOptions;
}
export interface CreateOSD {
  /** Contain the initial OSD configuration for create. */
  OSD?: OSDConfiguration;
}
export interface CreateOSDResponse {
  /** Returns Token of the newly created OSD */
  OSDToken?: ReferenceToken;
}
export interface DeleteOSD {
  /** This element contains a reference to the OSD configuration that should be deleted. */
  OSDToken?: ReferenceToken;
}
export interface DeleteOSDResponse extends SetConfigurationResponse {}
export interface GetMasks {
  /** Optional mask token of an existing mask. */
  token?: ReferenceToken;
  /** Optional token of a Video Source Configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetMasksResponse {
  /** List of Mask configurations. */
  masks?: Mask[];
}
export interface SetMask {
  /** Mask to be updated. */
  mask?: Mask;
}
export interface SetMaskResponse extends SetConfigurationResponse {}
export interface GetMaskOptions {
  /** Video Source Configuration Token that specifies an existing video source configuration that the options shall be compatible with. */
  configurationToken?: ReferenceToken;
}
export interface GetMaskOptionsResponse {
  /**/
  options?: MaskOptions;
}
export interface CreateMask {
  /** Contain the initial mask configuration for create. */
  mask?: Mask;
}
export interface CreateMaskResponse {
  /** Returns Token of the newly created Mask */
  token?: ReferenceToken;
}
export interface DeleteMask {
  /** This element contains a reference to the Mask configuration that should be deleted. */
  token?: ReferenceToken;
}
export interface DeleteMaskResponse extends SetConfigurationResponse {}
export interface GetWebRTCConfigurations {}
export interface GetWebRTCConfigurationsResponse {
  /** Video Source Configuration Token that specifies an existing video source configuration that the options shall be compatible with. */
  webRTCConfiguration?: WebRTCConfiguration[];
}
export interface SetWebRTCConfigurations {
  /** Video Source Configuration Token that specifies an existing video source configuration that the options shall be compatible with. */
  webRTCConfiguration?: WebRTCConfiguration[];
}
export interface SetWebRTCConfigurationsResponse {}
