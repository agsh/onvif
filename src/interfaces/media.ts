import { ReferenceToken } from './common';
import {
  VideoResolution,
  StringList,
  Description,
  VideoSource,
  AudioSource,
  AudioOutput,
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
  VideoSourceConfigurationOptions,
  VideoEncoderConfigurationOptions,
  AudioSourceConfigurationOptions,
  AudioEncoderConfigurationOptions,
  MetadataConfigurationOptions,
  AudioOutputConfigurationOptions,
  AudioDecoderConfigurationOptions,
  StreamSetup,
  MediaUri,
  OSDConfiguration,
  OSDConfigurationOptions,
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
  profileCapabilities?: ProfileCapabilities;
  /** Streaming capabilities. */
  streamingCapabilities?: StreamingCapabilities;
}
export interface ProfileCapabilities {
  /** Maximum number of profiles supported. */
  maximumNumberOfProfiles?: number;
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
  /** Indication which encodings are supported for this video source. The list may contain one or more enumeration values of tt:VideoEncoding. */
  encodings?: StringList;
  /** After setting the mode if a device starts to reboot this value is true. If a device change the mode without rebooting this value is false. If true, configured parameters may not be guaranteed by the device after rebooting. */
  reboot?: boolean;
  /** Informative description of this video source mode. This field should be described in English. */
  description?: Description;
  extension?: VideoSourceModeExtension;
}
export interface VideoSourceModeExtension {}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the media service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetVideoSources {}
export interface GetVideoSourcesResponse {
  /** List of existing Video Sources */
  videoSources?: VideoSource[];
}
export interface GetAudioSources {}
export interface GetAudioSourcesResponse {
  /** List of existing Audio Sources */
  audioSources?: AudioSource[];
}
export interface GetAudioOutputs {}
export interface GetAudioOutputsResponse {
  /** List of existing Audio Outputs */
  audioOutputs?: AudioOutput[];
}
export interface CreateProfile {
  /** friendly name of the profile to be created */
  name?: Name;
  /** Optional token, specifying the unique identifier of the new profile. A device supports at least a token length of 12 characters and characters "A-Z" | "a-z" | "0-9" | "-.". */
  token?: ReferenceToken;
}
export interface CreateProfileResponse {
  /** returns the new created profile */
  profile?: Profile;
}
export interface GetProfile {
  /** this command requests a specific profile */
  profileToken?: ReferenceToken;
}
export interface GetProfileResponse {
  /** returns the requested media profile */
  profile?: Profile;
}
export interface GetProfiles {}
export interface GetProfilesResponse {
  /** lists all profiles that exist in the media service */
  profiles?: Profile[];
}
export interface AddVideoEncoderConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the VideoEncoderConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddVideoEncoderConfigurationResponse {}
export interface RemoveVideoEncoderConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * VideoEncoderConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemoveVideoEncoderConfigurationResponse {}
export interface AddVideoSourceConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the VideoSourceConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddVideoSourceConfigurationResponse {}
export interface RemoveVideoSourceConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * VideoSourceConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemoveVideoSourceConfigurationResponse {}
export interface AddAudioEncoderConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the AudioEncoderConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddAudioEncoderConfigurationResponse {}
export interface RemoveAudioEncoderConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * AudioEncoderConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemoveAudioEncoderConfigurationResponse {}
export interface AddAudioSourceConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the AudioSourceConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddAudioSourceConfigurationResponse {}
export interface RemoveAudioSourceConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * AudioSourceConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemoveAudioSourceConfigurationResponse {}
export interface AddPTZConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the PTZConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddPTZConfigurationResponse {}
export interface RemovePTZConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * PTZConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemovePTZConfigurationResponse {}
export interface AddVideoAnalyticsConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the VideoAnalyticsConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddVideoAnalyticsConfigurationResponse {}
export interface RemoveVideoAnalyticsConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * VideoAnalyticsConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemoveVideoAnalyticsConfigurationResponse {}
export interface AddMetadataConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the MetadataConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddMetadataConfigurationResponse {}
export interface RemoveMetadataConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * MetadataConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemoveMetadataConfigurationResponse {}
export interface AddAudioOutputConfiguration {
  /** Reference to the profile where the configuration should be added */
  profileToken?: ReferenceToken;
  /** Contains a reference to the AudioOutputConfiguration to add */
  configurationToken?: ReferenceToken;
}
export interface AddAudioOutputConfigurationResponse {}
export interface RemoveAudioOutputConfiguration {
  /**
   * Contains a reference to the media profile from which the
   * AudioOutputConfiguration shall be removed.
   */
  profileToken?: ReferenceToken;
}
export interface RemoveAudioOutputConfigurationResponse {}
export interface AddAudioDecoderConfiguration {
  /** This element contains a reference to the profile where the configuration should be added. */
  profileToken?: ReferenceToken;
  /** This element contains a reference to the AudioDecoderConfiguration to add. */
  configurationToken?: ReferenceToken;
}
export interface AddAudioDecoderConfigurationResponse {}
export interface RemoveAudioDecoderConfiguration {
  /** This element contains a  reference to the media profile from which the AudioDecoderConfiguration shall be removed. */
  profileToken?: ReferenceToken;
}
export interface RemoveAudioDecoderConfigurationResponse {}
export interface DeleteProfile {
  /** This element contains a  reference to the profile that should be deleted. */
  profileToken?: ReferenceToken;
}
export interface DeleteProfileResponse {}
export interface GetVideoEncoderConfigurations {}
export interface GetVideoEncoderConfigurationsResponse {
  /** This element contains a list of video encoder configurations. */
  configurations?: VideoEncoderConfiguration[];
}
export interface GetVideoSourceConfigurations {}
export interface GetVideoSourceConfigurationsResponse {
  /** This element contains a list of video source configurations. */
  configurations?: VideoSourceConfiguration[];
}
export interface GetAudioEncoderConfigurations {}
export interface GetAudioEncoderConfigurationsResponse {
  /** This element contains a list of audio encoder configurations. */
  configurations?: AudioEncoderConfiguration[];
}
export interface GetAudioSourceConfigurations {}
export interface GetAudioSourceConfigurationsResponse {
  /** This element contains a list of audio source configurations. */
  configurations?: AudioSourceConfiguration[];
}
export interface GetVideoAnalyticsConfigurations {}
export interface GetVideoAnalyticsConfigurationsResponse {
  /** This element contains a list of VideoAnalytics configurations. */
  configurations?: VideoAnalyticsConfiguration[];
}
export interface GetMetadataConfigurations {}
export interface GetMetadataConfigurationsResponse {
  /** This element contains a list of metadata configurations */
  configurations?: MetadataConfiguration[];
}
export interface GetAudioOutputConfigurations {}
export interface GetAudioOutputConfigurationsResponse {
  /** This element contains a list of audio output configurations */
  configurations?: AudioOutputConfiguration[];
}
export interface GetAudioDecoderConfigurations {}
export interface GetAudioDecoderConfigurationsResponse {
  /** This element contains a list of audio decoder configurations */
  configurations?: AudioDecoderConfiguration[];
}
export interface GetVideoSourceConfiguration {
  /** Token of the requested video source configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetVideoSourceConfigurationResponse {
  /** The requested video source configuration. */
  configuration?: VideoSourceConfiguration;
}
export interface GetVideoEncoderConfiguration {
  /** Token of the requested video encoder configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetVideoEncoderConfigurationResponse {
  /** The requested video encoder configuration. */
  configuration?: VideoEncoderConfiguration;
}
export interface GetAudioSourceConfiguration {
  /** Token of the requested audio source configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetAudioSourceConfigurationResponse {
  /** The requested audio source configuration. */
  configuration?: AudioSourceConfiguration;
}
export interface GetAudioEncoderConfiguration {
  /** Token of the requested audio encoder configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetAudioEncoderConfigurationResponse {
  /** The requested audio encoder configuration */
  configuration?: AudioEncoderConfiguration;
}
export interface GetVideoAnalyticsConfiguration {
  /** Token of the requested video analytics configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetVideoAnalyticsConfigurationResponse {
  /** The requested video analytics configuration. */
  configuration?: VideoAnalyticsConfiguration;
}
export interface GetMetadataConfiguration {
  /** Token of the requested metadata configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetMetadataConfigurationResponse {
  /** The requested metadata configuration. */
  configuration?: MetadataConfiguration;
}
export interface GetAudioOutputConfiguration {
  /** Token of the requested audio output configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetAudioOutputConfigurationResponse {
  /** The requested audio output configuration. */
  configuration?: AudioOutputConfiguration;
}
export interface GetAudioDecoderConfiguration {
  /** Token of the requested audio decoder configuration. */
  configurationToken?: ReferenceToken;
}
export interface GetAudioDecoderConfigurationResponse {
  /** The requested audio decoder configuration */
  configuration?: AudioDecoderConfiguration;
}
export interface GetCompatibleVideoEncoderConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleVideoEncoderConfigurationsResponse {
  /** Contains a list of video encoder configurations that are compatible with the specified media profile. */
  configurations?: VideoEncoderConfiguration[];
}
export interface GetCompatibleVideoSourceConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleVideoSourceConfigurationsResponse {
  /** Contains a list of video source configurations that are compatible with the specified media profile. */
  configurations?: VideoSourceConfiguration[];
}
export interface GetCompatibleAudioEncoderConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioEncoderConfigurationsResponse {
  /** Contains a list of audio encoder configurations that are compatible with the specified media profile. */
  configurations?: AudioEncoderConfiguration[];
}
export interface GetCompatibleAudioSourceConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioSourceConfigurationsResponse {
  /** Contains a list of audio source configurations that are compatible with the specified media profile. */
  configurations?: AudioSourceConfiguration[];
}
export interface GetCompatibleVideoAnalyticsConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleVideoAnalyticsConfigurationsResponse {
  /** Contains a list of video analytics configurations that are compatible with the specified media profile. */
  configurations?: VideoAnalyticsConfiguration[];
}
export interface GetCompatibleMetadataConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleMetadataConfigurationsResponse {
  /** Contains a list of metadata configurations that are compatible with the specified media profile. */
  configurations?: MetadataConfiguration[];
}
export interface GetCompatibleAudioOutputConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioOutputConfigurationsResponse {
  /** Contains a list of audio output configurations that are compatible with the specified media profile. */
  configurations?: AudioOutputConfiguration[];
}
export interface GetCompatibleAudioDecoderConfigurations {
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetCompatibleAudioDecoderConfigurationsResponse {
  /** Contains a list of audio decoder configurations that are compatible with the specified media profile. */
  configurations?: AudioDecoderConfiguration[];
}
export interface SetVideoEncoderConfiguration {
  /** Contains the modified video encoder configuration. The configuration shall exist in the device. */
  configuration?: VideoEncoderConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetVideoEncoderConfigurationResponse {}
export interface SetVideoSourceConfiguration {
  /** Contains the modified video source configuration. The configuration shall exist in the device. */
  configuration?: VideoSourceConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetVideoSourceConfigurationResponse {}
export interface SetAudioEncoderConfiguration {
  /** Contains the modified audio encoder configuration. The configuration shall exist in the device. */
  configuration?: AudioEncoderConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetAudioEncoderConfigurationResponse {}
export interface SetAudioSourceConfiguration {
  /** Contains the modified audio source configuration. The configuration shall exist in the device. */
  configuration?: AudioSourceConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetAudioSourceConfigurationResponse {}
export interface SetVideoAnalyticsConfiguration {
  /** Contains the modified video analytics configuration. The configuration shall exist in the device. */
  configuration?: VideoAnalyticsConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetVideoAnalyticsConfigurationResponse {}
export interface SetMetadataConfiguration {
  /** Contains the modified metadata configuration. The configuration shall exist in the device. */
  configuration?: MetadataConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetMetadataConfigurationResponse {}
export interface SetAudioOutputConfiguration {
  /** Contains the modified audio output configuration. The configuration shall exist in the device. */
  configuration?: AudioOutputConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetAudioOutputConfigurationResponse {}
export interface SetAudioDecoderConfiguration {
  /** Contains the modified audio decoder configuration. The configuration shall exist in the device. */
  configuration?: AudioDecoderConfiguration;
  /** The ForcePersistence element is obsolete and should always be assumed to be true. */
  forcePersistence?: boolean;
}
export interface SetAudioDecoderConfigurationResponse {}
export interface GetVideoSourceConfigurationOptions {
  /** Optional video source configurationToken that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetVideoSourceConfigurationOptionsResponse {
  /** This message contains the video source configuration options. If a video source configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: VideoSourceConfigurationOptions;
}
export interface GetVideoEncoderConfigurationOptions {
  /** Optional video encoder configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetVideoEncoderConfigurationOptionsResponse {
  options?: VideoEncoderConfigurationOptions;
}
export interface GetAudioSourceConfigurationOptions {
  /** Optional audio source configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioSourceConfigurationOptionsResponse {
  /** This message contains the audio source configuration options. If a audio source configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioSourceConfigurationOptions;
}
export interface GetAudioEncoderConfigurationOptions {
  /** Optional audio encoder configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioEncoderConfigurationOptionsResponse {
  /** This message contains the audio encoder configuration options. If a audio encoder configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioEncoderConfigurationOptions;
}
export interface GetMetadataConfigurationOptions {
  /** Optional metadata configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetMetadataConfigurationOptionsResponse {
  /** This message contains the metadata configuration options. If a metadata configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: MetadataConfigurationOptions;
}
export interface GetAudioOutputConfigurationOptions {
  /** Optional audio output configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioOutputConfigurationOptionsResponse {
  /** This message contains the audio output configuration options. If a audio output configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioOutputConfigurationOptions;
}
export interface GetAudioDecoderConfigurationOptions {
  /** Optional audio decoder configuration token that specifies an existing configuration that the options are intended for. */
  configurationToken?: ReferenceToken;
  /** Optional ProfileToken that specifies an existing media profile that the options shall be compatible with. */
  profileToken?: ReferenceToken;
}
export interface GetAudioDecoderConfigurationOptionsResponse {
  /** This message contains the audio decoder configuration options. If a audio decoder configuration is specified, the options shall concern that particular configuration. If a media profile is specified, the options shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic for the device. */
  options?: AudioDecoderConfigurationOptions;
}
export interface GetGuaranteedNumberOfVideoEncoderInstances {
  /** Token of the video source configuration */
  configurationToken?: ReferenceToken;
}
export interface GetGuaranteedNumberOfVideoEncoderInstancesResponse {
  /** The minimum guaranteed total number of encoder instances (applications) per VideoSourceConfiguration. The device is able to deliver the TotalNumber of streams */
  totalNumber?: number;
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many Jpeg streams can be set up at the same time per VideoSource. */
  JPEG?: number;
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many H264 streams can be set up at the same time per VideoSource. */
  H264?: number;
  /** If a device limits the number of instances for respective Video Codecs the response contains the information how many Mpeg4 streams can be set up at the same time per VideoSource. */
  MPEG4?: number;
}
export interface GetStreamUri {
  /** Stream Setup that should be used with the uri */
  streamSetup?: StreamSetup;
  /** The ProfileToken element indicates the media profile to use and will define the configuration of the content of the stream. */
  profileToken?: ReferenceToken;
}
export interface GetStreamUriResponse {
  /**/
  mediaUri?: MediaUri;
}
export interface StartMulticastStreaming {
  /** Contains the token of the Profile that is used to define the multicast stream. */
  profileToken?: ReferenceToken;
}
export interface StartMulticastStreamingResponse {}
export interface StopMulticastStreaming {
  /** Contains the token of the Profile that is used to define the multicast stream. */
  profileToken?: ReferenceToken;
}
export interface StopMulticastStreamingResponse {}
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
  /**/
  mediaUri?: MediaUri;
}
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
  /** Token of the Video Source Configuration, which has OSDs associated with are requested. If token not exist, request all available OSDs. */
  configurationToken?: ReferenceToken;
}
export interface GetOSDsResponse {
  /** This element contains a list of requested OSDs. */
  OSDs?: OSDConfiguration[];
}
export interface GetOSD {
  /** The GetOSD command fetches the OSD configuration if the OSD token is known. */
  OSDToken?: ReferenceToken;
}
export interface GetOSDResponse {
  /** The requested OSD configuration. */
  OSD?: OSDConfiguration;
}
export interface SetOSD {
  /** Contains the modified OSD configuration. */
  OSD?: OSDConfiguration;
}
export interface SetOSDResponse {}
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
export interface DeleteOSDResponse {}
