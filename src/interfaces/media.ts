import { ReferenceToken } from './common';
import {
  VideoResolution,
  StringList,
  Description,
  Name,
  Profile,
  VideoEncoderConfiguration,
  VideoSourceConfiguration,
  AudioEncoderConfiguration,
  AudioSourceConfiguration,
  VideoAnalyticsConfiguration,
  MetadataConfiguration,
  AudioOutputConfiguration,
  AudioDecoderConfiguration,
} from './onvif';

export interface Capabilities {
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
  /** Indicates the support for the Efficient XML Interchange (EXI) binary XML format. */
  EXICompression?: boolean;
  /** Media profile capabilities. */
  profileCapabilities: ProfileCapabilities;
  /** Streaming capabilities. */
  streamingCapabilities: StreamingCapabilities;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface ProfileCapabilities {
  /** Maximum number of profiles supported. */
  maximumNumberOfProfiles?: number;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface StreamingCapabilities {
  /** Indicates support for RTP multicast. */
  RTPMulticast?: boolean;
  /** Indicates support for RTP over TCP. */
  RTP_TCP?: boolean;
  /** Indicates support for RTP/RTSP/TCP. */
  RTP_RTSP_TCP?: boolean;
  /** Indicates support for non aggregate RTSP control. */
  nonAggregateControl?: boolean;
  /** Indicates the device does not support live media streaming via RTSP. */
  noRTSPStreaming?: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
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
  /** Indication which encodings are supported for this video source. The list may contain one or more enumeration values of tt:VideoEncoding. */
  encodings: StringList;
  /** After setting the mode if a device starts to reboot this value is true. If a device change the mode without rebooting this value is false. If true, configured parameters may not be guaranteed by the device after rebooting. */
  reboot: boolean;
  /** Informative description of this video source mode. This field should be described in English. */
  description?: Description;
  extension?: VideoSourceModeExtension;
}
export interface VideoSourceModeExtension {
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface CreateProfile {
  /** friendly name of the profile to be created */
  name: Name;
  /** Optional token, specifying the unique identifier of the new profile. A device supports at least a token length of 12 characters and characters "A-Z" | "a-z" | "0-9" | "-.". */
  token?: ReferenceToken;
}
export interface GetProfile {
  /** This command requests a specific profile. */
  profileToken?: ReferenceToken;
}
export interface GetProfilesResponse {
  /** lists all profiles that exist in the media service */
  profiles?: Profile[];
}
export interface AddVideoEncoderConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the VideoEncoderConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemoveVideoEncoderConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * VideoEncoderConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddVideoSourceConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the VideoSourceConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemoveVideoSourceConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * VideoSourceConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddAudioEncoderConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the AudioEncoderConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemoveAudioEncoderConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * AudioEncoderConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddAudioSourceConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the AudioSourceConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemoveAudioSourceConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * AudioSourceConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddPTZConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the PTZConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemovePTZConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * PTZConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddVideoAnalyticsConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the VideoAnalyticsConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemoveVideoAnalyticsConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * VideoAnalyticsConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddMetadataConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the MetadataConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemoveMetadataConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * MetadataConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddAudioOutputConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the AudioOutputConfiguration to add */
  configurationToken: ReferenceToken;
}
export interface RemoveAudioOutputConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * AudioOutputConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface AddAudioDecoderConfiguration {
  /** This element contains a reference to the profile where the configuration should be added. */
  profileToken?: ReferenceToken;
  /** This element contains a reference to the AudioDecoderConfiguration to add. */
  configurationToken: ReferenceToken;
}
export interface RemoveAudioDecoderConfiguration {
  /** This element contains a  reference to the media profile from which the AudioDecoderConfiguration shall be removed. */
  profileToken?: ReferenceToken;
}
export interface DeleteProfile {
  /** This element contains a  reference to the profile that should be deleted. */
  profileToken?: ReferenceToken;
}
export interface GetVideoSourceConfiguration {
  /** Token of the requested video source configuration. */
  configurationToken: ReferenceToken;
}
export interface GetVideoEncoderConfiguration {
  /** Token of the requested video encoder configuration. */
  configurationToken: ReferenceToken;
}
export interface GetAudioSourceConfiguration {
  /** Token of the requested audio source configuration. */
  configurationToken: ReferenceToken;
}
export interface GetAudioEncoderConfiguration {
  /** Token of the requested audio encoder configuration. */
  configurationToken: ReferenceToken;
}
export interface GetVideoAnalyticsConfiguration {
  /** Token of the requested video analytics configuration. */
  configurationToken: ReferenceToken;
}
export interface GetMetadataConfiguration {
  /** Token of the requested metadata configuration. */
  configurationToken: ReferenceToken;
}
export interface GetAudioOutputConfiguration {
  /** Token of the requested audio output configuration. */
  configurationToken: ReferenceToken;
}
export interface GetAudioDecoderConfiguration {
  /** Token of the requested audio decoder configuration. */
  configurationToken: ReferenceToken;
}
export interface GetCompatibleVideoEncoderConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleVideoSourceConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioEncoderConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioSourceConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleVideoAnalyticsConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleMetadataConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioOutputConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioDecoderConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface SetVideoEncoderConfiguration {
  /** Contains the modified video encoder configuration. The configuration shall exist in the device. */
  configuration: VideoEncoderConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface SetVideoSourceConfiguration {
  /** Contains the modified video source configuration. The configuration shall exist in the device. */
  configuration: VideoSourceConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface SetAudioEncoderConfiguration {
  /** Contains the modified audio encoder configuration. The configuration shall exist in the device. */
  configuration: AudioEncoderConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface SetAudioSourceConfiguration {
  /** Contains the modified audio source configuration. The configuration shall exist in the device. */
  configuration: AudioSourceConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface SetVideoAnalyticsConfiguration {
  /** Contains the modified video analytics configuration. The configuration shall exist in the device. */
  configuration: VideoAnalyticsConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface SetMetadataConfiguration {
  /** Contains the modified metadata configuration. The configuration shall exist in the device. */
  configuration: MetadataConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface SetAudioOutputConfiguration {
  /** Contains the modified audio output configuration. The configuration shall exist in the device. */
  configuration: AudioOutputConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface SetAudioDecoderConfiguration {
  /** Contains the modified audio decoder configuration. The configuration shall exist in the device. */
  configuration: AudioDecoderConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence: boolean;
}
export interface GetVideoSourceConfigurationOptions {
  /** Optional video source configurationToken that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetVideoEncoderConfigurationOptions {
  /** Optional video encoder configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioSourceConfigurationOptions {
  /** Optional audio source configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioEncoderConfigurationOptions {
  /** Optional audio encoder configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetMetadataConfigurationOptions {
  /** Optional metadata configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioOutputConfigurationOptions {
  /** Optional audio output configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioDecoderConfigurationOptions {
  /** Optional audio decoder configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetGuaranteedNumberOfVideoEncoderInstances {
  /** Token of the video source configuration */
  configurationToken: ReferenceToken;
}
export interface GetGuaranteedNumberOfVideoEncoderInstancesResponse {
  /** The minimum guaranteed total number of encoder instances (applications) per VideoSourceConfiguration. The device is able to deliver the TotalNumber of streams */
  totalNumber: number;
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many Jpeg streams can be set up at the same time per VideoSource. */
  JPEG?: number;
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many H264 streams can be set up at the same time per VideoSource. */
  H264?: number;
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many Mpeg4 streams can be set up at the same time per VideoSource. */
  MPEG4?: number;
}
export interface StartMulticastStreaming {
  /** Contains the token of the Profile that is used to define the multicast stream. */
  profileToken?: ReferenceToken;
}
export interface StopMulticastStreaming {
  /** Contains the token of the Profile that is used to define the multicast stream. */
  profileToken?: ReferenceToken;
}
export interface SetSynchronizationPoint {
  /** Contains a Profile reference for which a Synchronization Point is requested. */
  profileToken?: ReferenceToken;
}
export interface GetSnapshotUri {
  /** The ProfileToken element indicates the media profile to use and will define the source and dimensions of the snapshot. */
  profileToken?: ReferenceToken;
}
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
  /** Token of the Video Source Configuration, which has OSDs associated with are requested. If token not exist, request all available OSDs. */
  configurationToken?: ReferenceToken;
}
export interface GetOSD {
  /** The GetOSD command fetches the OSD configuration if the OSD token is known. */
  OSDToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetOSDOptions {
  /** Video Source Configuration Token that specifies an existing video source configuration that the options shall be compatible with. */
  configurationToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface DeleteOSD {
  /** This element contains a reference to the OSD configuration that should be deleted. */
  OSDToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
