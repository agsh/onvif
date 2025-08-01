/**
 * Media ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media2-Service-Spec.pdf
 */
import { Onvif } from './onvif';
import { MediaProfile, GetProfiles, CreateProfile, ConfigurationRef, ConfigurationEnumeration, AddConfiguration, RemoveConfiguration, DeleteProfile, GetVideoSourceConfigurations, GetAudioEncoderConfigurations, GetVideoEncoderConfigurations, GetAnalyticsConfigurations, GetMetadataConfigurations, GetAudioOutputConfigurations, GetAudioDecoderConfigurations, SetVideoSourceConfiguration } from './interfaces/media.2';
import { ReferenceToken } from './interfaces/common';
import { AudioDecoderConfiguration, AudioEncoder2Configuration, AudioOutputConfiguration, AudioSourceConfiguration, MetadataConfiguration, VideoAnalyticsConfiguration, VideoEncoder2Configuration, VideoSourceConfiguration } from './interfaces/onvif';
/**
 * Configurations as defined by tr2:ConfigurationEnumeration
 */
export interface ConfigurationRefExtended extends ConfigurationRef {
    type: ConfigurationEnumeration;
}
interface CreateProfileExtended extends CreateProfile {
    configuration?: ConfigurationRefExtended[];
}
interface AddConfigurationExtended extends AddConfiguration {
    configuration?: ConfigurationRefExtended[];
}
interface RemoveConfigurationExtended extends RemoveConfiguration {
    configuration?: ConfigurationRefExtended[];
}
/**
 * Media service, ver20 profile
 */
export declare class Media2 {
    private onvif;
    constructor(onvif: Onvif);
    /**
     * Retrieve the profile with the specified token or all defined media profiles.
     * - If no Type is provided the returned profiles shall contain no configuration information.
     * - If a single Type with value 'All' is provided the returned profiles shall include all associated configurations.
     * - Otherwise the requested list of configurations shall for each profile include the configurations present as Type.
     * @param options
     * @param options.token Optional token to retrieve exactly one profile.
     * @param options.type If one or more types are passed only the corresponding configurations will be returned.
     */
    getProfiles({ token, type }?: GetProfiles): Promise<(MediaProfile)[]>;
    /**
     * This operation creates a new media profile. A created profile created via this method may be deleted via the
     * DeleteProfile method. Optionally Configurations can be assigned to the profile on creation. For details regarding
     * profile assignment check also the method AddConfiguration.
     * @param options
     * @param options.name
     * @param options.configuration
     */
    createProfile({ name, configuration }: CreateProfileExtended): Promise<ReferenceToken>;
    /**
     * This operation adds one or more Configurations to an existing media profile. If a configuration exists in the media
     * profile, it will be replaced. A device shall support adding a compatible Configuration to a Profile containing a
     * VideoSourceConfiguration and shall support streaming video data of such a profile.
     *
     * Note that OSD elements must be added via the CreateOSD command.
     * @param options
     * @param options.profileToken
     * @param options.name
     * @param options.configuration
     */
    addConfiguration({ profileToken, name, configuration }: AddConfigurationExtended): Promise<void>;
    /**
     * This operation removes one or more configurations from an existing media profile. Tokens appearing in the
     * configuration list shall be ignored. Presence of the "All" type shall result in an empty profile. Removing a
     * non-existing configuration shall be ignored and not result in an error. A device supporting the Media2 service
     * shall support this command
     * @param options
     * @param options.profileToken
     * @param options.configuration
     */
    removeConfiguration({ profileToken, configuration }: RemoveConfigurationExtended): Promise<void>;
    /**
     * This operation deletes a profile. The device shall support the deletion of a media profile through the DeletePro-
     * file command.
     * A device signaling support for MultiTrackStreaming shall support deleting of virtual profiles via the command.
     * Note that deleting a profile of a virtual profile set may invalidate the virtual profile.
     * @param options
     * @param options.token
     */
    deleteProfile({ token }: DeleteProfile): Promise<void>;
    /**
     * Common function to get configurations
     * @private
     * @param options
     * @param options.entityName
     * @param options.profileToken
     * @param options.configurationToken
     */
    private getConfigurations;
    /**
     * The `getVideoSourceConfigurations` operation allows to retrieve the video source settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getVideoSourceConfigurations(options: GetVideoSourceConfigurations): Promise<VideoSourceConfiguration[]>;
    /**
     * The `getVideoEncoderConfigurations` operation allows to retrieve the video encoder settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getVideoEncoderConfigurations(options: GetVideoEncoderConfigurations): Promise<VideoEncoder2Configuration[]>;
    /**
     * The `getAudioSourceConfigurations` operation allows to retrieve the audio source settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioSourceConfigurations(options: GetVideoSourceConfigurations): Promise<AudioSourceConfiguration[]>;
    /**
     * The `getAudioEncoderConfigurations` operation allows to retrieve the audio encoder settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioEncoderConfigurations(options: GetAudioEncoderConfigurations): Promise<AudioEncoder2Configuration[]>;
    /**
     * The `getAnalyticsConfigurations` operation allows to retrieve the analytics settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAnalyticsConfigurations(options: GetAnalyticsConfigurations): Promise<VideoAnalyticsConfiguration[]>;
    /**
     * The `getMetadataConfigurations` operation allows to retrieve the metadata settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getMetadataConfigurations(options: GetMetadataConfigurations): Promise<MetadataConfiguration[]>;
    /**
     * The `getAudioOutputConfigurations` operation allows to retrieve the audio output settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioOutputConfigurations(options: GetAudioOutputConfigurations): Promise<AudioOutputConfiguration[]>;
    /**
     * The `getAudioDecoderConfigurations` operation allows to retrieve the audio decoder settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @param options
     * @param options.profileToken
     * @param options.configurationToken
     */
    getAudioDecoderConfigurations(options: GetAudioDecoderConfigurations): Promise<AudioDecoderConfiguration[]>;
    /**
     * The `getWebRTCConfigurations` operation allows to retrieve the WebRTC settings of one ore more
     * configurations.
     * - If a configuration token is provided the device shall respond with the requested configuration or provide
     * an error if it does not exist.
     * - In case only a profile token is provided the device shall respond with all configurations that are compatible
     * to the provided media profile.
     * - If no tokens are provided the device shall respond with all available configurations.
     * @protected Specs not ready yet, this method is for the future development
     * @param options
     */
    private getWebRTCConfigurations;
    setVideoSourceConfiguration({ configuration }: SetVideoSourceConfiguration): Promise<void>;
}
export {};
