/**
 * Media ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @license MIT
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media-Service-Spec.pdf
 */
import { Onvif } from './onvif';
import { AudioDecoderConfiguration, AudioDecoderConfigurationOptions, AudioEncoderConfiguration, AudioEncoderConfigurationOptions, AudioOutput, AudioOutputConfiguration, AudioOutputConfigurationOptions, AudioSource, AudioSourceConfiguration, AudioSourceConfigurationOptions, MediaUri, MetadataConfiguration, MetadataConfigurationOptions, Profile, VideoAnalyticsConfiguration, VideoEncoderConfiguration, VideoEncoderConfigurationOptions, VideoSource, VideoSourceConfiguration, VideoSourceConfigurationOptions } from './interfaces/onvif';
import { ReferenceToken } from './interfaces/common';
import { AnyURI } from './interfaces/basics';
import { GetOSDOptions, GetOSDOptionsResponse, GetOSDs, GetOSDsResponse, GetVideoSourceConfigurationOptions } from './interfaces/media.2';
import { GetSnapshotUri, CreateProfile, DeleteProfile, GetProfile, AddVideoSourceConfiguration, AddAudioOutputConfiguration, AddAudioSourceConfiguration, AddVideoEncoderConfiguration, AddAudioEncoderConfiguration, AddVideoAnalyticsConfiguration, AddPTZConfiguration, AddMetadataConfiguration, AddAudioDecoderConfiguration, RemoveVideoSourceConfiguration, RemoveVideoEncoderConfiguration, RemoveAudioSourceConfiguration, RemoveAudioEncoderConfiguration, RemoveVideoAnalyticsConfiguration, RemovePTZConfiguration, RemoveMetadataConfiguration, RemoveAudioOutputConfiguration, RemoveAudioDecoderConfiguration, GetCompatibleVideoSourceConfigurations, GetCompatibleVideoEncoderConfigurations, GetCompatibleAudioSourceConfigurations, GetCompatibleAudioEncoderConfigurations, GetCompatibleVideoAnalyticsConfigurations, GetCompatibleMetadataConfigurations, GetCompatibleAudioOutputConfigurations, GetCompatibleAudioDecoderConfigurations, GetVideoSourceConfiguration, GetVideoEncoderConfiguration, GetAudioEncoderConfiguration, GetAudioSourceConfiguration, GetVideoAnalyticsConfiguration, GetMetadataConfiguration, GetAudioOutputConfiguration, GetAudioDecoderConfiguration, GetVideoEncoderConfigurationOptions, GetAudioSourceConfigurationOptions, GetAudioEncoderConfigurationOptions, GetMetadataConfigurationOptions, GetAudioOutputConfigurationOptions, GetAudioDecoderConfigurationOptions, SetVideoSourceConfiguration, SetVideoEncoderConfiguration, SetAudioSourceConfiguration, GetGuaranteedNumberOfVideoEncoderInstances, GetGuaranteedNumberOfVideoEncoderInstancesResponse, SetAudioEncoderConfiguration, SetVideoAnalyticsConfiguration, SetMetadataConfiguration, SetAudioOutputConfiguration, SetAudioDecoderConfiguration } from './interfaces/media';
export interface GetStreamUriOptions {
    profileToken?: ReferenceToken;
    stream?: 'RTP-Unicast' | 'RTP-Multicast';
    protocol?: 'RtspUnicast' | 'RtspMulticast' | 'RTSP' | 'RtspOverHttp' | // for Media2
    'UDP' | 'TCP' | 'HTTP';
}
/**
 * Media service, ver10 profile
 */
export declare class Media {
    private onvif;
    profiles: Profile[];
    videoSources: VideoSource[];
    audioSources: AudioSource[];
    private audioOutputs;
    constructor(onvif: Onvif);
    /**
     * Receive profiles in Media ver10 format
     * Any endpoint can ask for the existing media profiles of a device using the GetProfiles command. Pre-configured or
     * dynamically configured profiles can be retrieved using this command. This command lists all configured profiles in
     * a device. The client does not need to know the media profile in order to use the command.
     */
    getProfiles(): Promise<Profile[]>;
    /**
     * If the profile token is already known, a profile can be fetched through the GetProfile command.
     * @param options
     * @param options.profileToken
     */
    getProfile({ profileToken }: GetProfile): Promise<Profile>;
    /**
     * This operation creates a new empty media profile. The media profile shall be created in the device and shall be
     * persistent (remain after reboot). A created profile shall be deletable and a device shall set the “fixed” attribute
     * to false in the returned Profile.
     * @param options
     * @param options.name
     * @param options.token
     */
    createProfile({ name, token }: CreateProfile): Promise<Profile>;
    /**
     * This operation deletes a profile. This change shall always be persistent. Deletion of a profile is only possible
     * for non-fixed profiles
     * @param options
     * @param options.profileToken
     */
    deleteProfile({ profileToken }: DeleteProfile): Promise<void>;
    /**
     * Common function to add configuration
     */
    private addConfiguration;
    /**
     * This operation adds a VideoSourceConfiguration to an existing media profile. If such a configuration exists in
     * the media profile, it will be replaced. The change shall be persistent. The device shall support addition of a
     * video source configuration to a profile through the AddVideoSourceConfiguration command.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addVideoSourceConfiguration(options: AddVideoSourceConfiguration): Promise<void>;
    /**
     * This operation adds an AudioSourceConfiguration to an existing media profile. If a configuration exists in the
     * media profile, it will be replaced. The change shall be persistent. A device that supports audio streaming from
     * device to client shall support addition of audio source configuration to a profile through the AddAudioSource-
     * Configuration command.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addAudioSourceConfiguration(options: AddAudioSourceConfiguration): Promise<void>;
    /**
     * This operation adds a VideoEncoderConfiguration to an existing media profile. If a configuration exists in the
     * media profile, it will be replaced. The change shall be persistent. A device shall support addition of a video
     * encoder configuration to a profile through the AddVideoEncoderConfiguration command.
     * A device shall support adding a compatible VideoEncoderConfiguration to a Profile containing a VideoSource-
     * Configuration and shall support streaming video data of such a Profile.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addVideoEncoderConfiguration(options: AddVideoEncoderConfiguration): Promise<void>;
    /**
     * This operation adds an AudioEncoderConfiguration to an existing media profile. If a configuration exists in the
     * media profile, it will be replaced. The change shall be persistent. A device that supports audio streaming from
     * device to client shall support addition of audio encoder configurations to a profile through the AddAudioEn-
     * coderConfiguration command.
     * A device shall support adding a compatible AudioEncoderConfiguration to a Profile containing an AudioSource-
     * Configuration and shall support streaming audio data of such a Profile.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addAudioEncoderConfiguration(options: AddAudioEncoderConfiguration): Promise<void>;
    /**
     * This operation adds a VideoAnalytics configuration to an existing media profile. If a configuration exists in
     * the media profile, it will be replaced. The change shall be persistent. A device that supports video analytics
     * shall support addition of video analytics configurations to a profile through the AddVideoAnalyticsConfiguration
     * command.
     * Adding a VideoAnalyticsConfiguration to a media profile means that streams using that media profile can contain
     * video analytics data (in the metadata) as defined by the submitted configuration reference. Video analytics data
     * is specified in the document Video Analytics Specification and analytics configurations are managed
     * through the commands defined in Section 5.9.
     * A profile containing only a video analytics configuration but no video source configuration is incomplete.
     * Therefore, a client should first add a video source configuration to a profile before adding a video analytics
     * configuration. The device can deny adding of a video analytics configuration before a video source configuration.
     * In this case, it should respond with a ConfigurationConflict Fault.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addVideoAnalyticsConfiguration(options: AddVideoAnalyticsConfiguration): Promise<void>;
    /**
     * This operation adds a PTZConfiguration to an existing media profile. If a configuration exists in the media
     * profile, it will be replaced. The change shall be persistent. A device that supports PTZ control shall support
     * addition of PTZ configurations to a profile through the AddPTZConfiguration command.
     * Adding a PTZConfiguration to a media profile means that streams using that media profile can contain PTZ
     * status (in the metadata), and that the media profile can be used for controlling PTZ movement, see document
     * PTZ Service Specification
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addPTZConfiguration(options: AddPTZConfiguration): Promise<void>;
    /**
     * This operation adds a Metadata configuration to an existing media profile. If a configuration exists in the media
     * profile, it will be replaced. The change shall be persistent. A device shall support the addition of a metadata
     * configuration to a profile though the AddMetadataConfiguration command.
     * Adding a MetadataConfiguration to a Profile means that streams using that profile contain metadata. Metadata
     * can consist of events, PTZ status, and/or video analytics data. Metadata configurations are handled through
     * the commands defined in Section 5.10 and 5.9.4.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addMetadataConfiguration(options: AddMetadataConfiguration): Promise<void>;
    /**
     * This operation adds an AudioOutputConfiguration to an existing media profile. If a configuration exists in the
     * media profile, it will be replaced. The change shall be persistent. An device that signals support for Audio
     * outputs via its Device IO AudioOutputs capability shall support the addition of an audio output configuration to
     * a profile through the AddAudioOutputConfiguration command.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addAudioOutputConfiguration(options: AddAudioOutputConfiguration): Promise<void>;
    /**
     * This operation adds an AudioDecoderConfiguration to an existing media profile. If a configuration exists in the
     * media profile, it shall be replaced. The change shall be persistent. An device that signals support for Audio
     * outputs via its Device IO AudioOutputs capability shall support the addition of an audio decoder configuration
     * to a profile through the AddAudioDecoderConfiguration command
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    addAudioDecoderConfiguration(options: AddAudioDecoderConfiguration): Promise<void>;
    /**
     * Common function to remove configuration
     */
    private removeConfiguration;
    /**
     * This operation removes a VideoSourceConfiguration from an existing media profile. If the media profile does
     * not contain a VideoSourceConfiguration, the operation has no effect. The removal shall be persistent. The
     * device shall support removal of a video source configuration from a profile through the
     * RemoveVideoSourceConfiguration command.
     * Video source configurations should only be removed after removing a VideoEncoderConfiguration from the
     * media profile.
     * @param options
     * @param options.profileToken
     */
    removeVideoSourceConfiguration(options: RemoveVideoSourceConfiguration): Promise<void>;
    /**
     * This operation removes an AudioSourceConfiguration from an existing media profile. If the media profile does
     * not contain an AudioSourceConfiguration, the operation has no effect. The removal shall be persistent. A device
     * that supports audio streaming from device to client shall support removal of an audio source configuration from
     * a profile through the RemoveAudioSourceConfiguration command.
     * @param options
     * @param options.profileToken
     */
    removeAudioSourceConfiguration(options: RemoveAudioSourceConfiguration): Promise<void>;
    /**
     * This operation removes a VideoEncoderConfiguration from an existing media profile. If the media profile does
     * not contain a VideoEncoderConfiguration, the operation has no effect. The removal shall be persistent. The
     * device shall support removal of a video encoder configuration from a profile through the
     * RemoveVideoEncoderConfiguration command.
     * @param options
     * @param options.profileToken
     */
    removeVideoEncoderConfiguration(options: RemoveVideoEncoderConfiguration): Promise<void>;
    /**
     * This operation removes an AudioEncoderConfiguration from an existing media profile. If the media profile does
     * not contain an AudioEncoderConfiguration, the operation has no effect. The removal shall be persistent. A
     * device that supports audio streaming from device to client shall support removal of audio encoder configurations
     * from a profile through the RemoveAudioEncoderConfiguration command.
     * @param options
     * @param options.profileToken
     */
    removeAudioEncoderConfiguration(options: RemoveAudioEncoderConfiguration): Promise<void>;
    /**
     * This operation removes a VideoAnalyticsConfiguration from an existing media profile. If the media profile does
     * not contain a VideoAnalyticsConfiguration, the operation has no effect. The removal shall be persistent. A
     * device that supports video analytics shall support removal of a video analytics configuration from a profile
     * through the RemoveVideoAnalyticsConfiguration command.
     * @param options
     * @param options.profileToken
     */
    removeVideoAnalyticsConfiguration(options: RemoveVideoAnalyticsConfiguration): Promise<void>;
    /**
     * This operation removes a PTZConfiguration from an existing media profile. If the media profile does not contain
     * a PTZConfiguration, the operation has no effect. The removal shall be persistent. A device that supports
     * PTZ control shall support removal of PTZ configurations from a profile through the RemovePTZConfiguration
     * command.
     * @param options
     * @param options.profileToken
     */
    removePTZConfiguration(options: RemovePTZConfiguration): Promise<void>;
    /**
     * This operation removes a MetadataConfiguration from an existing media profile. If the media profile does not
     * contain a MetadataConfiguration, the operation has no effect. The removal shall be persistent. A device shall
     * support the removal of a metadata configuration from a profile through the RemoveMetadataConfiguration
     * command.
     * @param options
     * @param options.profileToken
     */
    removeMetadataConfiguration(options: RemoveMetadataConfiguration): Promise<void>;
    /**
     * This operation removes an AudioOutputConfiguration from an existing media profile. If the media profile does
     * not contain an AudioOutputConfiguration, the operation has no effect. The removal shall be persistent. An
     * device that signals support for Audio outputs via its Device IO AudioOutputs capability shall support the removal
     * of an audio output configuration from a profile through the RemoveAudioOutputConfiguration command.
     * @param options
     * @param options.profileToken
     */
    removeAudioOutputConfiguration(options: RemoveAudioOutputConfiguration): Promise<void>;
    /**
     * This operation removes an AudioDecoderConfiguration from an existing media profile. If the media profile does
     * not contain an AudioDecoderConfiguration, the operation has no effect. The removal shall be persistent. An
     * device that signals support for Audio outputs via its Device IO AudioOutputs capability shall support the removal
     * of an audio decoder configuration from a profile through the RemoveAudioDecoderConfiguration command.
     * @param options
     * @param options.profileToken
     */
    removeAudioDecoderConfiguration(options: RemoveAudioDecoderConfiguration): Promise<void>;
    /**
     * This operation lists all available video sources for the device. The device shall support the listing of available
     * video sources through the GetVideoSources command
     */
    getVideoSources(): Promise<VideoSource[]>;
    /**
     * This operation lists all available audio sources of the device. A device that supports audio streaming from
     * device to client shall support listing of available audio sources through the GetAudioSources command.
     */
    getAudioSources(): Promise<AudioSource[]>;
    /**
     * This command lists all available audio outputs of a device. An device that signals support for Audio outputs
     * via its Device IO AudioOutputs capability shall support listing of available audio outputs through the GetAu-
     * dioOutputs command.
     */
    getAudioOutputs(): Promise<AudioOutput[]>;
    /**
     * Common method to get configurations
     * @private
     * @param options
     * @param options.entityName
     */
    private getConfigurations;
    /**
     * This operation lists all existing video source configurations for a device. This command lists all video source
     * configurations in a device. The client need not know anything about the video source configurations in order
     * to use the command. The device shall support the listing of available video source configurations through the
     * GetVideoSourceConfigurations command.
     */
    getVideoSourceConfigurations(): Promise<VideoSourceConfiguration[]>;
    /**
     * This operation lists all existing video encoder configurations of a device. This command lists all configured
     * video encoder configurations in a device. The client does not need to know anything apriori about the video
     * encoder configurations in order to use the command. The device shall support the listing of available video
     * encoder configurations through the GetVideoEncoderConfigurations command
     */
    getVideoEncoderConfigurations(): Promise<VideoEncoderConfiguration[]>;
    /**
     * This operation lists all existing audio source configurations of a device. This command lists all audio source
     * configurations in a device. The client does not need to know anything apriori about the audio source configurations
     * in order to use the command. A device that supports audio streaming from device to client shall support
     * listing of available audio source configurations through the GetAudioSourceConfigurations command
     */
    getAudioSourceConfigurations(): Promise<AudioSourceConfiguration[]>;
    /**
     * This operation lists all existing device audio encoder configurations. The client does not need to know anything
     * apriori about the audio encoder configurations in order to use the command. A device that supports audio
     * streaming from device to client shall support the listing of available audio encoder configurations through the
     * GetAudioEncoderConfigurations command
     */
    getAudioEncoderConfigurations(): Promise<AudioEncoderConfiguration[]>;
    /**
     * This operation lists all video analytics configurations of a device. This command lists all configured video an-
     * alytics in a device. The client does not need to know anything apriori about the video analytics in order to
     * use the command. A device that supports video analytics shall support the listing of available video analytics
     * configuration through the GetVideoAnalyticsConfigurations command.
     */
    getVideoAnalyticsConfigurations(): Promise<VideoAnalyticsConfiguration[]>;
    /**
     * This operation lists all existing metadata configurations. The client does not need to know anything apriori about
     * the metadata in order to use the command. A device or another device that supports metadata streaming shall
     * support the listing of existing metadata configurations through the GetMetadataConfigurations command.
     */
    getMetadataConfigurations(): Promise<MetadataConfiguration[]>;
    /**
     * This command lists all existing AudioOutputConfigurations of a device. The client does not need to know any-
     * thing apriori about the audio configurations to use this command. A device that signals support for Audio out-
     * puts via its Device IO AudioOutputs capability shall support the listing of AudioOutputConfigurations through
     * this command
     */
    getAudioOutputConfigurations(): Promise<AudioOutputConfiguration[]>;
    /**
     * This command lists all existing AudioDecoderConfigurations of a device.
     * The client does not need to know anything apriori about the audio decoder configurations in order to use this
     * command. An device that signals support for Audio outputs via its Device IO AudioOutputs capability shall
     * support the listing of AudioOutputConfigurations through this command.
     */
    getAudioDecoderConfigurations(): Promise<AudioDecoderConfiguration[]>;
    /**
     * Common method to get compatible configurations
     * @private
     * @param options
     * @param options.entityName
     * @param options.profileToken
     */
    private getCompatibleConfigurations;
    /**
     * This operation requests all the video source configurations of the device that are compatible with a certain media
     * profile. Each of the returned configurations shall be a valid input parameter for the AddVideoSourceConfiguration
     * command on the media profile. The result will vary depending on the capabilities, configurations and settings in
     * the device.
     * @param options
     * @param options.profileToken
     */
    getCompatibleVideoSourceConfigurations(options: GetCompatibleVideoSourceConfigurations): Promise<VideoSourceConfiguration[]>;
    /**
     * This operation lists all the video encoder configurations of the device that are compatible with a certain media
     * profile. Each of the returned configurations shall be a valid input parameter for the AddVideoEncoderConfig-
     * uration command on the media profile. The result will vary depending on the capabilities, configurations and
     * settings in the device. The device shall support the listing of compatible (with a specific profile) video encoder
     * configurations through the GetCompatibleVideoEncoderConfigurations command
     * @param options
     * @param options.profileToken
     */
    getCompatibleVideoEncoderConfigurations(options: GetCompatibleVideoEncoderConfigurations): Promise<VideoEncoderConfiguration[]>;
    /**
     * This operation requests all audio source configurations of a device that are compatible with a certain media
     * profile. Each of the returned configurations shall be a valid input parameter for the AddAudioSourceConfigu-
     * ration command on the media profile. The result varies depending on the capabilities, configurations and set-
     * tings in the device. A device that supports audio streaming from device to client shall support listing of compat-
     * ible (with a specific profile) audio source configurations through the GetCompatibleAudioSourceConfigurations
     * command
     * @param options
     * @param options.profileToken
     */
    getCompatibleAudioSourceConfigurations(options: GetCompatibleAudioSourceConfigurations): Promise<AudioSourceConfiguration[]>;
    /**
     * This operation requests all audio encoder configurations of the device that are compatible with a certain media
     * profile. Each of the returned configurations shall be a valid input parameter for the AddAudioEncoderConfigura-
     * tion command on the media profile. The result varies depending on the capabilities, configurations and settings
     * in the device. A device that supports audio streaming from device to client shall support listing of compatible
     * (with a specific profile) audio encoder configurations through the GetCompatibleAudioEncoderConfigurations
     * command
     * @param options
     * @param options.profileToken
     */
    getCompatibleAudioEncoderConfigurations(options: GetCompatibleAudioEncoderConfigurations): Promise<AudioEncoderConfiguration[]>;
    /**
     * This operation requests all video analytic configurations of the device that are compatible with a certain media
     * profile. Each of the returned configurations shall be a valid input parameter for the
     * AddVideoAnalyticsConfiguration command on the media profile. The result varies depending on the capabilities,
     * configurations and settings in the device. A device that supports video analytics shall support the listing of
     * compatible (with a specific profile) video analytics configuration through the
     * GetCompatibleVideoAnalyticsConfigurations command.
    * @param options
    * @param options.profileToken
    */
    getCompatibleVideoAnalyticsConfigurations(options: GetCompatibleVideoAnalyticsConfigurations): Promise<VideoAnalyticsConfiguration[]>;
    /**
     * This operation requests all the metadata configurations of the device that are compatible with a certain media
     * profile. Each of the returned configurations shall be a valid input parameter for the AddMetadataConfiguration
     * command on the media profile. The result varies depending on the capabilities, configurations and settings in
     * the device. A device or other device that supports metadata streaming shall support the listing of compatible
     * (with a specific profile) metadata configuration through the GetCompatibleMetadataConfigurations command.
     * @param options
     * @param options.profileToken
     */
    getCompatibleMetadataConfigurations(options: GetCompatibleMetadataConfigurations): Promise<MetadataConfiguration[]>;
    /**
     * This command lists all audio output configurations of a device that are compatible with a certain media profile.
     * Each returned configuration shall be a valid input for the AddAudioOutputConfiguration command. An device
     * that signals support for Audio outputs via its Device IO AudioOutputs capability shall support the listing of
     * compatible (with a specific profile) AudioOutputConfigurations through the
     * GetCompatibleAudioOutputConfigurations command
     * @param options
     * @param options.profileToken
     */
    getCompatibleAudioOutputConfigurations(options: GetCompatibleAudioOutputConfigurations): Promise<AudioOutputConfiguration[]>;
    /**
     * This operation lists all the audio decoder configurations of the device that are compatible with a certain media
     * profile. Each of the returned configurations shall be a valid input parameter for the
     * AddAudioDecoderConfiguration command on the media profile. An device that signals support for Audio outputs via its
     * Device IO AudioOutputs capability shall support the listing of compatible (with a specific profile) audio decoder
     * configurations through the GetCompatibleAudioDecoderConfigurations command
     * @param options
     * @param options.profileToken
     */
    getCompatibleAudioDecoderConfigurations(options: GetCompatibleAudioDecoderConfigurations): Promise<AudioDecoderConfiguration[]>;
    /**
     * Common method to get configuration
     * @private
     * @param options
     * @param options.entityName
     * @param options.configurationToken
     */
    private getConfiguration;
    /**
     * If the video source configuration token is already known, the video source configuration can be fetched through
     * the GetVideoSourceConfiguration command. The device shall support retrieval of specific video source configurations
     * through the GetVideoSourceConfiguration command
     * @param options
     * @param options.configurationToken
     */
    getVideoSourceConfiguration(options: GetVideoSourceConfiguration): Promise<VideoSourceConfiguration>;
    /**
     * If the video encoder configuration token is already known, the encoder configuration can be fetched through the
     * GetVideoEncoderConfiguration command. The device shall support the retrieval of a specific video encoder
     * configuration through the GetVideoEncoderConfiguration command.
     * @param options
     * @param options.configurationToken
     */
    getVideoEncoderConfiguration(options: GetVideoEncoderConfiguration): Promise<VideoEncoderConfiguration>;
    /**
     * The GetAudioSourceConfiguration command fetches the audio source configurations if the audio source configuration
     * token is already known. A device that supports audio streaming from device to client shall support
     * the retrieval of a specific audio source configuration through the GetAudioSourceConfiguration command.
     * @param options
     * @param options.configurationToken
     */
    getAudioSourceConfiguration(options: GetAudioSourceConfiguration): Promise<AudioSourceConfiguration>;
    /**
     * The GetAudioEncoderConfiguration command fetches the encoder configuration if the audio encoder configuration
     * token is known. A device that supports audio streaming from device to client shall support the listing of
     * a specific audio encoder configuration through the GetAudioEncoderConfiguration command.
     * @param options
     * @param options.configurationToken
     */
    getAudioEncoderConfiguration(options: GetAudioEncoderConfiguration): Promise<AudioEncoderConfiguration>;
    /**
     * The GetVideoAnalyticsConfiguration command fetches the video analytics configuration if the video analytics
     * token is known. A device that supports video analytics shall support the listing of a specific video analytics
     * configuration through the GetVideoAnalyticsConfiguration command.
     * @param options
     * @param options.configurationToken
     */
    getVideoAnalyticsConfiguration(options: GetVideoAnalyticsConfiguration): Promise<VideoAnalyticsConfiguration>;
    /**
     * The GetMetadataConfiguration command fetches the metadata configuration if the metadata token is known.
     * A device or another device that supports metadata streaming shall support the listing of a specific metadata
     * configuration through the GetMetadataConfiguration command.
     * @param options
     * @param options.configurationToken
     */
    getMetadataConfiguration(options: GetMetadataConfiguration): Promise<MetadataConfiguration>;
    /**
     * If the audio output configuration token is already known, the output configuration can be fetched through the
     * GetAudioOutputConfiguration command. An device that signals support for Audio outputs via its Device IO
     * AudioOutputs capability shall support the retrieval of a specific audio output configuration through the
     * GetAudioOutputConfiguration command.
     * @param options
     * @param options.configurationToken
     */
    getAudioOutputConfiguration(options: GetAudioOutputConfiguration): Promise<AudioOutputConfiguration>;
    /**
     * If the audio decoder configuration token is already known, the decoder configuration can be fetched through
     * the GetAudioDecoderConfiguration command. An device that signals support for Audio outputs via its Device
     * IO AudioOutputs capability shall support the retrieval of a specific audio decoder configuration through the
     * GetAudioDecoderConfiguration command.
     * @param options
     * @param options.configurationToken
     */
    getAudioDecoderConfiguration(options: GetAudioDecoderConfiguration): Promise<AudioDecoderConfiguration>;
    /**
     * Common method to get configuration options
     * @param options
     * @param options.entityName
     * @param options.configurationToken
     * @param options.profileToken
     * @private
     */
    private getConfigurationOptions;
    /**
     * This operation returns the available parameters and their valid ranges to the client. Any combination of the
     * parameters obtained using a given media profile and video source configuration shall be a valid input for the
     * SetVideoSourceConfiguration command. The device shall support the GetVideoSourceConfigurationOptions
     * command.
     * If a video source configuration token is provided, the device shall return the options compatible with that con-
     * figuration. If a media profile token is specified, the device shall return the options compatible with that media
     * profile. If both a media profile token and a video source configuration token are specified, the device shall
     * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
     * options shall be considered generic for the device.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getVideoSourceConfigurationOptions(options?: GetVideoSourceConfigurationOptions): Promise<VideoSourceConfigurationOptions>;
    /**
     * This operation returns the available parameters and their valid ranges to the client. Any combination of the
     * parameters obtained using a given media profile and video encoder configuration shall be a valid input for
     * the SetVideoEncoderConfiguration command. The device shall support the GetVideoEncoderConfigurationOptions command.
     * If a video encoder configuration token is provided, the device shall return the options compatible with that
     * configuration. If a media profile token is specified, the device shall return the options compatible with that media
     * profile. If both a media profile token and a video encoder configuration token are specified, the device shall
     * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
     * options shall be considered generic for the device
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getVideoEncoderConfigurationOptions(options?: GetVideoEncoderConfigurationOptions): Promise<VideoEncoderConfigurationOptions>;
    /**
     * This operation returns the available parameters and their valid ranges to the client. Any combination of the
     * parameters obtained using a given media profile and audio source configuration shall be a valid input for the
     * SetAudioSourceConfiguration command. A device that supports audio streaming from device to client shall
     * support the GetAudioSourceConfigurationOptions command.
     * If an audio source configuration token is provided, the device shall return the options compatible with that
     * configuration. If a media profile token is specified, the device shall return the options compatible with that media
     * profile. If both a media profile token and an audio source configuration token are specified, the device shall
     * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
     * options shall be considered generic for the device.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioSourceConfigurationOptions(options?: GetAudioSourceConfigurationOptions): Promise<AudioSourceConfigurationOptions>;
    /**
     * This operation returns the available parameters and their valid ranges to the client. Any combination of the
     * parameters obtained using a given media profile and audio encoder configuration shall be a valid input for the
     * SetAudioEncoderConfiguration command. A device that supports audio streaming from device to client shall
     * support the GetAudioEncoderConfigurationOptions command.
     * If an audio encoder configuration token is provided, the device shall return the options compatible with that
     * configuration. If a media profile token is specified, the device shall return the options compatible with that media
     * profile. If both a media profile token and an audio encoder configuration token are specified, the device shall
     * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
     * options shall be considered generic for the device.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioEncoderConfigurationOptions(options?: GetAudioEncoderConfigurationOptions): Promise<AudioEncoderConfigurationOptions>;
    /**
     * This operation returns the available parameters and their valid ranges to the client. Any combination of the
     * parameters obtained using a given media profile and metadata configuration shall be a valid input for the Set-
     * MetadataConfiguration command. A device that supports metadata streaming shall support the GetMetadata-
     * ConfigurationOptions command.
     * If a metadata configuration token is provided, the device shall return the options compatible with that
     * configuration. If a media profile token is specified, the device shall return the options compatible with that media
     * profile. If both a media profile token and a metadata configuration token are specified, the device shall return
     * the options compatible with both that media profile and that configuration. If no tokens are specified, the options
     * shall be considered generic for the device.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getMetadataConfigurationOptions(options?: GetMetadataConfigurationOptions): Promise<MetadataConfigurationOptions>;
    /**
     * This operation returns the available parameters and their valid ranges to the client. Any combination of the
     * parameters obtained using a given media profile and audio output configuration shall be a valid input for the
     * SetAudioOutputConfiguration command. A device that supports audio streaming from client to device shall
     * support the GetAudioOutputConfigurationOptions command.
     * If an audio output configuration token is provided, the device shall return the options compatible with that
     * configuration. If a media profile token is specified, the device shall return the options compatible with that media
     * profile. If both a media profile token and an audio output configuration token are specified, the device shall
     * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
     * options shall be considered generic for the device.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioOutputConfigurationOptions(options?: GetAudioOutputConfigurationOptions): Promise<AudioOutputConfigurationOptions>;
    /**
     * This operation returns the available parameters and their valid ranges to the client. Any combination of the
     * parameters obtained using a given media profile and audio decoder configuration shall be a valid input for the
     * SetAudioDecoderConfiguration command. A device that supports audio streaming from client to device shall
     * support the GetAudioDecoderConfigurationOptions command.
     * If an audio decoder configuration token is provided, the device shall return the options compatible with that
     * configuration. If a media profile token is specified, the device shall return the options compatible with that media
     * profile. If both a media profile token and an audio decoder configuration token are specified, the device shall
     * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
     * options shall be considered generic for the device.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioDecoderConfigurationOptions(options?: GetAudioDecoderConfigurationOptions): Promise<AudioDecoderConfigurationOptions>;
    /**
     * This operation modifies a video source configuration. The ForcePersistence flag indicates if the changes shall
     * remain after reboot of the device. Running streams using this configuration may be immediately updated
     * according to the new settings. The changes are not guaranteed to take effect unless the client requests a
     * new stream URI and restarts any affected stream. Client methods for changing a running stream are out of
     * scope for this specification. The device shall support the modification of video source parameters through the
     * SetVideoSourceConfiguration command.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setVideoSourceConfiguration({ configuration, forcePersistence }: SetVideoSourceConfiguration): Promise<void>;
    /**
     * This operation modifies a video encoder configuration. The ForcePersistence flag indicates if the changes shall
     * remain after reboot of the device. Changes in the Multicast settings shall always be persistent. Running streams
     * using this configuration may be immediately updated according to the new settings, but the changes are not
     * guaranteed to take effect unless the client requests a new stream URI and restarts any affected stream. If the
     * new settings invalidate any parameters already negotiated using RTSP, for example by changing codec type,
     * the device must not apply these settings to existing streams. Instead it must either continue to stream using
     * the old settings or stop sending data on the affected streams.
     * Client methods for changing a running stream are out of scope for this specification. The device shall support
     * the modification of video encoder parameters through the SetVideoEncoderConfiguration command.
     * A device shall accept any combination of parameters that it returned in the
     * GetVideoEncoderConfigurationOptionsResponse. If necessary the device may adapt parameter values for Quality and
     * RateControl elements without returning an error. A device shall adapt an out of range BitrateLimit instead of
     * returning a fault.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setVideoEncoderConfiguration({ configuration, forcePersistence }: SetVideoEncoderConfiguration): Promise<void>;
    /**
     * The GetGuaranteedNumberOfVideoEncoderInstances command can be used to request the minimum number
     * of guaranteed video encoder instances (applications) per Video Source Configuration. A device SHALL support
     * this command. This command was added in ONVIF 1.02.
     * @param options
     * @param options.configurationToken
     */
    getGuaranteedNumberOfVideoEncoderInstances({ configurationToken }: GetGuaranteedNumberOfVideoEncoderInstances): Promise<GetGuaranteedNumberOfVideoEncoderInstancesResponse>;
    /**
     * This operation modifies an audio source configuration. The ForcePersistence flag indicates if the changes
     * shall remain after reboot of the device. Running streams using this configuration may be immediately updated
     * according to the new settings, but the changes are not guaranteed to take effect unless the client requests a new
     * stream URI and restarts any affected stream. If the new settings invalidate any parameters already negotiated
     * using RTSP, for example by changing codec type, the device must not apply these settings to existing streams.
     * Instead it must either continue to stream using the old settings or stop sending data on the affected streams.
     * Client methods for changing a running stream are out of scope for this specification. A device that supports
     * audio streaming from device to client shall support the configuration of audio source parameters through the
     * SetAudioSourceConfiguration command.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setAudioSourceConfiguration({ configuration, forcePersistence }: SetAudioSourceConfiguration): Promise<void>;
    /**
     * This operation modifies an audio encoder configuration. The ForcePersistence flag indicates if the changes
     * shall remain after reboot of the device. Changes in the Multicast settings shall always be persistent. Running
     * streams using this configuration may be immediately updated according to the new settings. The changes are
     * not guaranteed to take effect unless the client requests a new stream URI and restarts any affected streams.
     * Client methods for changing a running stream are out of scope for this specification. A device that supports
     * audio streaming from device to client shall support the configuration of audio encoder parameters through the
     * SetAudioEncoderConfiguration command.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setAudioEncoderConfiguration({ configuration, forcePersistence }: SetAudioEncoderConfiguration): Promise<void>;
    /**
     * A video analytics configuration is modified using this command. The ForcePersistence flag indicates if the
     * changes shall remain after reboot of the device or not. Running streams using this configuration shall be im-
     * mediately updated according to the new settings. Otherwise inconsistencies can occur between the scene
     * description processed by the rule engine and the notifications produced by analytics engine and rule engine
     * which reference the very same video analytics configuration token. A device that supports video analytics shall
     * support the configuration of video analytics parameters through the SetVideoAnalyticsConfiguration command.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setVideoAnalyticsConfiguration({ configuration, forcePersistence }: SetVideoAnalyticsConfiguration): Promise<void>;
    /**
     * This operation modifies a metadata configuration. The ForcePersistence flag indicates if the changes shall
     * remain after reboot of the device. Changes in the Multicast settings shall always be persistent. Running streams
     * using this configuration may be updated immediately according to the new settings. The changes are not
     * guaranteed to take effect unless the client requests a new stream URI and restarts any affected streams.
     * Client methods for changing a running stream are out of scope for this specification. A device or another
     * device that supports metadata streaming shall support the configuration of metadata parameters through the
     * SetMetadataConfiguration command.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setMetadataConfiguration({ configuration, forcePersistence }: SetMetadataConfiguration): Promise<void>;
    /**
     * This operation modifies an audio output configuration. The ForcePersistence flag indicates if the changes shall
     * remain after reboot of the device. An device that signals support for Audio outputs via its Device IO
     * AudioOutputs capability shall support the modification of audio output parameters through the
     * SetAudioOutputConfiguration command.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setAudioOutputConfiguration({ configuration, forcePersistence }: SetAudioOutputConfiguration): Promise<void>;
    /**
     * This operation modifies an audio decoder configuration. The ForcePersistence flag indicates if the changes
     * shall remain after reboot of the device. An device that signals support for Audio outputs via its Device IO
     * AudioOutputs capability shall support the modification of audio decoder parameters through the SetAudioDe-
     * coderConfiguration command.
     * @param options
     * @param options.configuration
     * @param options.forcePersistence
     */
    setAudioDecoderConfiguration({ configuration, forcePersistence }: SetAudioDecoderConfiguration): Promise<void>;
    /**
     * This method requests a URI that can be used to initiate a live media stream using RTSP as the control protocol.
     * The returned URI shall remain valid indefinitely even if the profile is changed.
     * Method uses Media2 if device supports it.
     *
     * For Media2 you need to provide only `protocol` parameter ('RTPS' by default). Here is supported values from the
     * ONVIF documentation:
     * Defined stream types are
     * - RtspUnicast RTSP streaming RTP as UDP Unicast.
     * - RtspMulticast RTSP streaming RTP as UDP Multicast.
     * - RTSP RTSP streaming RTP over TCP.
     * - RtspOverHttp Tunneling both the RTSP control channel and the RTP stream over HTTP or HTTPS.
     *
     * For Media1 you need to set both parameters: protocl and stream (RTP-Unicast by default) If Media2 supported
     * by device, this parameters will be converted to Media2 call. This is excerpt from ONVIF documentation:
     * The correct syntax for the StreamSetup element for these media stream setups defined in 5.1.1 of the streaming specification are as follows:
     * - RTP unicast over UDP: StreamType = "RTP_unicast", TransportProtocol = "UDP"
     * - RTP over RTSP over HTTP over TCP: StreamType = "RTP_unicast", TransportProtocol = "HTTP"
     * - RTP over RTSP over TCP: StreamType = "RTP_unicast", TransportProtocol = "RTSP"
     */
    getStreamUri(options?: GetStreamUriOptions): Promise<MediaUri | string>;
    /**
     * Receive snapshot URI
     * @param profileToken
     */
    getSnapshotUri({ profileToken }?: GetSnapshotUri): Promise<{
        uri: AnyURI;
    }>;
    getOSDs({ configurationToken, OSDToken }?: GetOSDs): Promise<GetOSDsResponse>;
    getOSDOptions({ configurationToken }: GetOSDOptions): Promise<GetOSDOptionsResponse>;
}
