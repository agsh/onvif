/**
 * Media ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @license MIT
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media-Service-Spec.pdf
 */

import { Onvif } from './onvif';
import { linerase, build, toOnvifXMLSchemaObject, xsany, Optional } from './utils';
import {
  AudioDecoderConfiguration, AudioDecoderConfigurationOptions,
  AudioEncoderConfiguration,
  AudioEncoderConfigurationOptions,
  AudioOutput,
  AudioOutputConfiguration, AudioOutputConfigurationOptions,
  AudioSource,
  AudioSourceConfiguration,
  AudioSourceConfigurationOptions,
  MediaUri,
  MetadataConfiguration,
  MetadataConfigurationOptions,
  Profile,
  VideoAnalyticsConfiguration,
  VideoEncoderConfiguration,
  VideoEncoderConfigurationOptions,
  VideoSource,
  VideoSourceConfiguration,
  VideoSourceConfigurationOptions,
} from './interfaces/onvif';
import { ReferenceToken } from './interfaces/common';
import {
  GetOSDOptions,
  GetOSDOptionsResponse,
  GetOSDs,
  GetOSDsResponse,
} from './interfaces/media.2';
import {
  GetSnapshotUri,
  CreateProfile,
  DeleteProfile,
  GetProfile,
  AddVideoSourceConfiguration,
  AddAudioOutputConfiguration,
  AddAudioSourceConfiguration,
  AddVideoEncoderConfiguration,
  AddAudioEncoderConfiguration,
  AddVideoAnalyticsConfiguration,
  AddPTZConfiguration,
  AddMetadataConfiguration,
  AddAudioDecoderConfiguration,
  RemoveVideoSourceConfiguration,
  RemoveVideoEncoderConfiguration,
  RemoveAudioSourceConfiguration,
  RemoveAudioEncoderConfiguration,
  RemoveVideoAnalyticsConfiguration,
  RemovePTZConfiguration,
  RemoveMetadataConfiguration,
  RemoveAudioOutputConfiguration,
  RemoveAudioDecoderConfiguration,
  GetCompatibleVideoSourceConfigurations,
  GetCompatibleVideoEncoderConfigurations,
  GetCompatibleAudioSourceConfigurations,
  GetCompatibleAudioEncoderConfigurations,
  GetCompatibleVideoAnalyticsConfigurations,
  GetCompatibleMetadataConfigurations,
  GetCompatibleAudioOutputConfigurations,
  GetCompatibleAudioDecoderConfigurations,
  GetVideoSourceConfiguration,
  GetVideoEncoderConfiguration,
  GetAudioEncoderConfiguration,
  GetAudioSourceConfiguration,
  GetVideoAnalyticsConfiguration,
  GetMetadataConfiguration,
  GetAudioOutputConfiguration,
  GetAudioDecoderConfiguration,
  GetVideoEncoderConfigurationOptions,
  GetAudioSourceConfigurationOptions,
  GetAudioEncoderConfigurationOptions,
  GetMetadataConfigurationOptions,
  GetAudioOutputConfigurationOptions,
  GetAudioDecoderConfigurationOptions,
  SetVideoSourceConfiguration,
  SetVideoEncoderConfiguration,
  SetAudioSourceConfiguration,
  GetGuaranteedNumberOfVideoEncoderInstances,
  GetGuaranteedNumberOfVideoEncoderInstancesResponse,
  SetAudioEncoderConfiguration,
  SetVideoAnalyticsConfiguration,
  SetMetadataConfiguration,
  SetAudioOutputConfiguration,
  SetAudioDecoderConfiguration,
  GetStreamUri,
  StartMulticastStreaming,
  StopMulticastStreaming,
  GetVideoSourceConfigurationOptions,
  SetSynchronizationPoint,
  GetVideoSourceModes, GetVideoSourceModesResponse, VideoSourceMode,
  SetVideoSourceMode, SetVideoSourceModeResponse,
} from './interfaces/media';

const ConfigurationArraysAndExtensions = {
  array : [
    // 'extension', // common
    'configurations',
    'analyticsModule', // analytics
    'rule', // analytics
    'simpleItem', // analytics
    'elementItem', // analytics
  ],
  rawXML : [
    'elementItem',
    'subscriptionPolicy', // metadata
    'filter', // metadata
  ],
};

export interface GetStreamUriOptions {
  profileToken?: ReferenceToken;
  stream?: 'RTP-Unicast' | 'RTP-Multicast';
  protocol?:
    'RtspUnicast' | 'RtspMulticast' | 'RTSP' | 'RtspOverHttp' | // for Media2
    'UDP'| 'TCP' | 'HTTP'; // for Media1
}

interface AddConfiguration {
  /** Configuration name */
  name: string;
  /** Reference to the profile where the configuration should be added */
  profileToken: ReferenceToken;
  /** Contains a reference to the configuration to add */
  configurationToken: ReferenceToken;
}

interface RemoveConfiguration {
  /** Configuration name */
  name: string;
  /** Contains a reference to the media profile from which the configuration shall be removed. */
  profileToken: ReferenceToken;
}

type ConfigurationExtended = VideoSourceConfiguration & VideoEncoderConfiguration & AudioEncoderConfiguration;

interface GetCompatibleConfigurations {
  /** Configuration name */
  entityName: string;
  /** Contains the token of an existing media profile the configurations shall be compatible with */
  profileToken: ReferenceToken;
}

interface GetConfiguration {
  /** Configuration name */
  entityName: string;
  /** Token of the requested configuration. */
  configurationToken: ReferenceToken;
}

interface GetConfigurationOptions {
  /** Configuration name */
  entityName: string;
  /** Token of the requested configuration. */
  configurationToken?: ReferenceToken;
  /** Contains the token of an existing media profile the configurations shall be compatible with. */
  profileToken?: ReferenceToken;
}

type ConfigurationOptionsExtended = VideoSourceConfigurationOptions & VideoEncoderConfigurationOptions
  & AudioSourceConfigurationOptions & AudioEncoderConfigurationOptions & MetadataConfigurationOptions
  & AudioOutputConfigurationOptions;

/**
 * Media service, ver10 profile
 */
export class Media {
  private onvif: Onvif;
  public profiles: Profile[] = [];
  public videoSources: VideoSource[] = [];
  public audioSources: AudioSource[] = [];
  private audioOutputs: AudioOutput[] = [];

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * Receive profiles in Media ver10 format
   * Any endpoint can ask for the existing media profiles of a device using the GetProfiles command. Pre-configured or
   * dynamically configured profiles can be retrieved using this command. This command lists all configured profiles in
   * a device. The client does not need to know the media profile in order to use the command.
   */
  async getProfiles(): Promise<Profile[]> {
    // Original ONVIF Media support (used in Profile S)
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.profiles = linerase(data, ConfigurationArraysAndExtensions).getProfilesResponse.profiles;
    return this.profiles;
  }

  /**
   * If the profile token is already known, a profile can be fetched through the GetProfile command.
   * @param options
   * @param options.profileToken
   */
  async getProfile({ profileToken }: GetProfile): Promise<Profile> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : `<GetProfile xmlns="http://www.onvif.org/ver10/media/wsdl"><ProfileToken>${profileToken}</ProfileToken></GetProfile>`,
    });
    return linerase(data, ConfigurationArraysAndExtensions).getProfileResponse.profile;
  }

  /**
   * This operation creates a new empty media profile. The media profile shall be created in the device and shall be
   * persistent (remain after reboot).
   * @param options
   * @param options.name
   * @param options.token
   */
  async createProfile({ name, token }: CreateProfile): Promise<Profile> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<CreateProfile xmlns="http://www.onvif.org/ver10/media/wsdl">'
        + `<Name>${name}</Name>${
          token ? `<Token>${token}</Token>` : ''
        }</CreateProfile>`,
    });
    return linerase(data).createProfileResponse.profile;
  }

  /**
   * This operation deletes a profile. This change shall always be persistent. Deletion of a profile is only possible
   * for non-fixed profiles
   * @param options
   * @param options.profileToken
   */
  async deleteProfile({ profileToken }: DeleteProfile): Promise<void> {
    await this.onvif.request({
      service : 'media',
      body    : '<DeleteProfile xmlns="http://www.onvif.org/ver10/media/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + '</DeleteProfile>',
    });
  }

  /**
   * Common function to add configuration
   */
  private async addConfiguration({ name, configurationToken, profileToken }: AddConfiguration) {
    await this.onvif.request({
      service : 'media',
      body    : `<${name} xmlns="http://www.onvif.org/ver10/media/wsdl">`
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + `<ConfigurationToken>${configurationToken}</ConfigurationToken>`
        + `</${name}>`,
    });
  }

  /**
   * This operation adds a VideoSourceConfiguration to an existing media profile. If such a configuration exists in
   * the media profile, it will be replaced. The change shall be persistent.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addVideoSourceConfiguration(options: AddVideoSourceConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddVideoSourceConfiguration', ...options });
  }

  /**
   * This operation adds an AudioSourceConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it will be replaced. The change shall be persistent.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addAudioSourceConfiguration(options: AddAudioSourceConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddAudioSourceConfiguration', ...options });
  }

  /**
   * This operation adds a VideoEncoderConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it will be replaced. The change shall be persistent.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addVideoEncoderConfiguration(options: AddVideoEncoderConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddVideoEncoderConfiguration', ...options });
  }

  /**
   * This operation adds an AudioEncoderConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it will be replaced. The change shall be persistent.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addAudioEncoderConfiguration(options: AddAudioEncoderConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddAudioEncoderConfiguration', ...options });
  }

  /**
   * This operation adds a VideoAnalytics configuration to an existing media profile. If a
   * configuration exists in the media profile, it will be replaced. The change shall be persistent. Adding a
   * VideoAnalyticsConfiguration to a media profile means that streams using that media profile can contain video
   * analytics data (in the metadata) as defined by the submitted configuration reference. A profile containing only a
   * video analytics configuration but no video source configuration is incomplete. Therefore, a client should first add
   * a video source configuration to a profile before adding a video analytics configuration. The device can deny adding
   * of a video analytics configuration before a video source configuration.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addVideoAnalyticsConfiguration(options: AddVideoAnalyticsConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddVideoAnalyticsConfiguration', ...options });
  }

  /**
   * This operation adds a PTZConfiguration to an existing media profile. If a configuration exists
   * in the media profile, it will be replaced. The change shall be persistent. Adding a PTZConfiguration to a media
   * profile means that streams using that media profile can contain PTZ status (in the metadata), and that the media
   * profile can be used for controlling PTZ movement.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addPTZConfiguration(options: AddPTZConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddPTZConfiguration', ...options });
  }

  /**
   * This operation adds a Metadata configuration to an existing media profile. If a configuration exists in the media
   * profile, it will be replaced. The change shall be persistent. Adding a MetadataConfiguration to a Profile means
   * that streams using that profile contain metadata. Metadata can consist of events, PTZ status, and/or video analytics data.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addMetadataConfiguration(options: AddMetadataConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddMetadataConfiguration', ...options });
  }

  /**
   * This operation adds an AudioOutputConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it will be replaced. The change shall be persistent.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addAudioOutputConfiguration(options: AddAudioOutputConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddAudioOutputConfiguration', ...options });
  }

  /**
   * This operation adds an AudioDecoderConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it shall be replaced. The change shall be persistent.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addAudioDecoderConfiguration(options: AddAudioDecoderConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddAudioDecoderConfiguration', ...options });
  }

  /**
   * Common function to remove configuration
   */
  private async removeConfiguration({ name, profileToken }: RemoveConfiguration) {
    await this.onvif.request({
      service : 'media',
      body    : `<${name} xmlns="http://www.onvif.org/ver10/media/wsdl">`
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + `</${name}>`,
    });
  }

  /**
   * This operation removes a VideoSourceConfiguration from an existing media profile. If the media profile does
   * not contain a VideoSourceConfiguration, the operation has no effect. The removal shall be persistent.
   * Video source configurations should only be removed after removing a VideoEncoderConfiguration from the
   * media profile.
   * @param options
   * @param options.profileToken
   */
  removeVideoSourceConfiguration(options: RemoveVideoSourceConfiguration) {
    return this.removeConfiguration({ name : 'RemoveVideoSourceConfiguration', ...options });
  }

  /**
   * This operation removes an AudioSourceConfiguration from an existing media profile. If the
   * media profile does not contain an AudioSourceConfiguration, the operation has no effect. The
   * removal shall be persistent. Audio source configurations should only be removed after removing an
   * AudioEncoderConfiguration from the media profile.
   * @param options
   * @param options.profileToken
   */
  removeAudioSourceConfiguration(options: RemoveAudioSourceConfiguration) {
    return this.removeConfiguration({ name : 'RemoveAudioSourceConfiguration', ...options });
  }

  /**
   * This operation removes a VideoEncoderConfiguration from an existing media profile. If the media profile does
   * not contain a VideoEncoderConfiguration, the operation has no effect. The removal shall be persistent.
   * @param options
   * @param options.profileToken
   */
  removeVideoEncoderConfiguration(options: RemoveVideoEncoderConfiguration) {
    return this.removeConfiguration({ name : 'RemoveVideoEncoderConfiguration', ...options });
  }

  /**
   * This operation removes an AudioEncoderConfiguration from an existing media profile. If the media profile does
   * not contain an AudioEncoderConfiguration, the operation has no effect. The removal shall be persistent.
   * @param options
   * @param options.profileToken
   */
  removeAudioEncoderConfiguration(options: RemoveAudioEncoderConfiguration) {
    return this.removeConfiguration({ name : 'RemoveAudioEncoderConfiguration', ...options });
  }

  /**
   * This operation removes a VideoAnalyticsConfiguration from an existing media profile. If the media profile does
   * not contain a VideoAnalyticsConfiguration, the operation has no effect. The removal shall be persistent.
   * @param options
   * @param options.profileToken
   */
  removeVideoAnalyticsConfiguration(options: RemoveVideoAnalyticsConfiguration) {
    return this.removeConfiguration({ name : 'RemoveVideoAnalyticsConfiguration', ...options });
  }

  /**
   * This operation removes a PTZConfiguration from an existing media profile. If the media profile does not contain
   * a PTZConfiguration, the operation has no effect. The removal shall be persistent.
   * @param options
   * @param options.profileToken
   */
  removePTZConfiguration(options: RemovePTZConfiguration) {
    return this.removeConfiguration({ name : 'RemovePTZConfiguration', ...options });
  }

  /**
   * This operation removes a MetadataConfiguration from an existing media profile. If the media profile does not
   * contain a MetadataConfiguration, the operation has no effect. The removal shall be persistent.
   * @param options
   * @param options.profileToken
   */
  removeMetadataConfiguration(options: RemoveMetadataConfiguration) {
    return this.removeConfiguration({ name : 'RemoveMetadataConfiguration', ...options });
  }

  /**
   * This operation removes an AudioOutputConfiguration from an existing media profile. If the media profile does
   * not contain an AudioOutputConfiguration, the operation has no effect. The removal shall be persistent.
   * @param options
   * @param options.profileToken
   */
  removeAudioOutputConfiguration(options: RemoveAudioOutputConfiguration) {
    return this.removeConfiguration({ name : 'RemoveAudioOutputConfiguration', ...options });
  }

  /**
   * This operation removes an AudioDecoderConfiguration from an existing media profile. If the media profile does
   * not contain an AudioDecoderConfiguration, the operation has no effect. The removal shall be persistent.
   * @param options
   * @param options.profileToken
   */
  removeAudioDecoderConfiguration(options: RemoveAudioDecoderConfiguration) {
    return this.removeConfiguration({ name : 'RemoveAudioDecoderConfiguration', ...options });
  }

  /**
   * This operation lists all available video sources for the device.
   */
  async getVideoSources(): Promise<VideoSource[]> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetVideoSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.videoSources = linerase(data, { array : ['videoSources'] }).getVideoSourcesResponse.videoSources;
    return this.videoSources;
  }

  /**
   * This operation lists all available audio sources of the device.
   */
  async getAudioSources(): Promise<AudioSource[]> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetAudioSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.audioSources = linerase(data, { array : ['audioSources'] }).getAudioSourcesResponse.audioSources;
    return this.audioSources;
  }

  /**
   * This command lists all available audio outputs of a device.
   */
  async getAudioOutputs(): Promise<AudioOutput[]> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetAudioOutputs xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.audioOutputs = linerase(data, { array : ['audioOutputs'] }).getAudioOutputsResponse.audioOutputs;
    return this.audioOutputs;
  }

  /**
   * Common method to get configurations
   * @private
   * @param options
   * @param options.entityName
   */
  private async getConfigurations({ entityName }: { entityName: string }): Promise<ConfigurationExtended[]> {
    const body = `<Get${entityName}Configurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>`;
    const [data] = await this.onvif.request({
      service : 'media',
      body,
    });
    return linerase(data, ConfigurationArraysAndExtensions)[`get${entityName}ConfigurationsResponse`].configurations;
  }

  /**
   * This operation lists all existing video source configurations for a device. This command lists all video source
   * configurations in a device. The client need not know anything about the video source configurations in order
   * to use the command.
   */
  getVideoSourceConfigurations(): Promise<VideoSourceConfiguration[]> {
    return this.getConfigurations({ entityName : 'VideoSource' });
  }

  /**
   * This operation lists all existing video encoder configurations of a device. This command lists all configured
   * video encoder configurations in a device. The client does not need to know anything apriori about the video
   * encoder configurations in order to use the command.
   */
  getVideoEncoderConfigurations(): Promise<VideoEncoderConfiguration[]> {
    return this.getConfigurations({ entityName : 'VideoEncoder' });
  }

  /**
   * This operation lists all existing audio source configurations of a device. This command lists all audio source
   * configurations in a device. The client does not need to know anything apriori about the audio source configurations
   * in order to use the command.
   */
  getAudioSourceConfigurations(): Promise<AudioSourceConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioSource' });
  }

  /**
   * This operation lists all existing device audio encoder configurations. The client does not need to know anything
   * apriori about the audio encoder configurations in order to use the command.
   */
  getAudioEncoderConfigurations(): Promise<AudioEncoderConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioEncoder' });
  }

  /**
   * This operation lists all video analytics configurations of a device. This command lists all configured video an-
   * alytics in a device. The client does not need to know anything apriori about the video analytics in order to
   * use the command.
   */
  getVideoAnalyticsConfigurations(): Promise<VideoAnalyticsConfiguration[]> {
    return this.getConfigurations({ entityName : 'VideoAnalytics' });
  }

  /**
   * This operation lists all existing metadata configurations. The client does not need to know anything apriori about
   * the metadata in order to use the command.
   */
  getMetadataConfigurations(): Promise<MetadataConfiguration[]> {
    return this.getConfigurations({ entityName : 'Metadata' });
  }

  /**
   * This command lists all existing AudioOutputConfigurations of a device. The client does not need to know any-
   * thing apriori about the audio configurations to use this command.
   */
  getAudioOutputConfigurations(): Promise<AudioOutputConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioOutput' });
  }

  /**
   * This command lists all existing AudioDecoderConfigurations of a device.
   * The client does not need to know anything apriori about the audio decoder configurations in order to use this
   * command.
   */
  getAudioDecoderConfigurations(): Promise<AudioDecoderConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioDecoder' });
  }

  /**
   * Common method to get compatible configurations
   * @private
   * @param options
   * @param options.entityName
   * @param options.profileToken
   */
  private async getCompatibleConfigurations({ entityName, profileToken }: GetCompatibleConfigurations): Promise<ConfigurationExtended[]> {
    const body = `<GetCompatible${entityName}Configurations xmlns="http://www.onvif.org/ver10/media/wsdl">`
      + `<ProfileToken>${profileToken}</ProfileToken>`
      + `</GetCompatible${entityName}Configurations>`;
    const [data] = await this.onvif.request({
      service : 'media',
      body,
    });
    return linerase(data, { array : ['configurations', 'analyticsModule', 'rule'] })[`getCompatible${entityName}ConfigurationsResponse`].configurations;
  }

  /**
   * This operation requests all the video source configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the AddVideoSourceConfiguration
   * command on the media profile. The result will vary depending on the capabilities, configurations and settings in
   * the device.
   * @param options
   * @param options.profileToken
   */
  getCompatibleVideoSourceConfigurations(options: GetCompatibleVideoSourceConfigurations): Promise<VideoSourceConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'VideoSource', ...options });
  }

  /**
   * This operation lists all the video encoder configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the AddVideoEncoderConfig-
   * uration command on the media profile. The result will vary depending on the capabilities, configurations and
   * settings in the device.
   * @param options
   * @param options.profileToken
   */
  getCompatibleVideoEncoderConfigurations(options: GetCompatibleVideoEncoderConfigurations): Promise<VideoEncoderConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'VideoEncoder', ...options });
  }

  /**
   * This operation requests all audio source configurations of a device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the AddAudioSourceConfigu-
   * ration command on the media profile. The result varies depending on the capabilities, configurations and set-
   * tings in the device.
   * @param options
   * @param options.profileToken
   */
  getCompatibleAudioSourceConfigurations(options: GetCompatibleAudioSourceConfigurations): Promise<AudioSourceConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'AudioSource', ...options });
  }

  /**
   * This operation requests all audio encoder configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the AddAudioEncoderConfigura-
   * tion command on the media profile. The result varies depending on the capabilities, configurations and settings
   * in the device.
   * @param options
   * @param options.profileToken
   */
  getCompatibleAudioEncoderConfigurations(options: GetCompatibleAudioEncoderConfigurations): Promise<AudioEncoderConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'AudioEncoder', ...options });
  }

  /**
   * This operation requests all video analytic configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the
   * AddVideoAnalyticsConfiguration command on the media profile. The result varies depending on the capabilities,
   * configurations and settings in the device.
  * @param options
  * @param options.profileToken
  */
  getCompatibleVideoAnalyticsConfigurations(options: GetCompatibleVideoAnalyticsConfigurations): Promise<VideoAnalyticsConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'VideoAnalytics', ...options });
  }

  /**
   * This operation requests all the metadata configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the AddMetadataConfiguration
   * command on the media profile. The result varies depending on the capabilities, configurations and settings in
   * the device.
   * @param options
   * @param options.profileToken
   */
  getCompatibleMetadataConfigurations(options: GetCompatibleMetadataConfigurations): Promise<MetadataConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'Metadata', ...options });
  }

  /**
   * This command lists all audio output configurations of a device that are compatible with a certain media profile.
   * Each returned configuration shall be a valid input for the AddAudioOutputConfiguration command.
   * @param options
   * @param options.profileToken
   */
  getCompatibleAudioOutputConfigurations(options: GetCompatibleAudioOutputConfigurations): Promise<AudioOutputConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'AudioOutput', ...options });
  }

  /**
   * This operation lists all the audio decoder configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the
   * AddAudioDecoderConfiguration command on the media profile.
   * @param options
   * @param options.profileToken
   */
  getCompatibleAudioDecoderConfigurations(options: GetCompatibleAudioDecoderConfigurations): Promise<AudioDecoderConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'AudioDecoder', ...options });
  }

  /**
   * Common method to get configuration
   * @private
   * @param options
   * @param options.entityName
   * @param options.configurationToken
   */
  private async getConfiguration({ entityName, configurationToken }: GetConfiguration): Promise<ConfigurationExtended> {
    const body = `<Get${entityName}Configuration xmlns="http://www.onvif.org/ver10/media/wsdl">`
    + `<ConfigurationToken>${configurationToken}</ConfigurationToken>`
    + `</Get${entityName}Configuration>`;
    const [data] = await this.onvif.request({
      service : 'media',
      body,
    });
    return linerase(data, ConfigurationArraysAndExtensions)[`get${entityName}ConfigurationResponse`].configuration;
  }

  /**
   * If the video source configuration token is already known, the video source configuration can be fetched through
   * the GetVideoSourceConfiguration command. The device shall support retrieval of specific video source configurations
   * through the GetVideoSourceConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  getVideoSourceConfiguration(options: GetVideoSourceConfiguration): Promise<VideoSourceConfiguration> {
    return this.getConfiguration({ entityName : 'VideoSource', ...options });
  }

  /**
   * If the video encoder configuration token is already known, the encoder configuration can be fetched through the
   * GetVideoEncoderConfiguration command. The device shall support the retrieval of a specific video encoder
   * configuration through the GetVideoEncoderConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  getVideoEncoderConfiguration(options: GetVideoEncoderConfiguration): Promise<VideoEncoderConfiguration> {
    return this.getConfiguration({ entityName : 'VideoEncoder', ...options });
  }

  /**
   * The GetAudioSourceConfiguration command fetches the audio source configurations if the audio source configuration
   * token is already known. A device that supports audio streaming from device to client shall support
   * the retrieval of a specific audio source configuration through the GetAudioSourceConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  getAudioSourceConfiguration(options: GetAudioSourceConfiguration): Promise<AudioSourceConfiguration> {
    return this.getConfiguration({ entityName : 'AudioSource', ...options });
  }

  /**
   * The GetAudioEncoderConfiguration command fetches the encoder configuration if the audio encoder configuration
   * token is known. A device that supports audio streaming from device to client shall support the listing of
   * a specific audio encoder configuration through the GetAudioEncoderConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  getAudioEncoderConfiguration(options: GetAudioEncoderConfiguration): Promise<AudioEncoderConfiguration> {
    return this.getConfiguration({ entityName : 'AudioEncoder', ...options });
  }

  /**
   * The GetVideoAnalyticsConfiguration command fetches the video analytics configuration if the video analytics
   * token is known. A device that supports video analytics shall support the listing of a specific video analytics
   * configuration through the GetVideoAnalyticsConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  getVideoAnalyticsConfiguration(options: GetVideoAnalyticsConfiguration): Promise<VideoAnalyticsConfiguration> {
    return this.getConfiguration({ entityName : 'VideoAnalytics', ...options });
  }

  /**
   * The GetMetadataConfiguration command fetches the metadata configuration if the metadata token is known.
   * A device or another device that supports metadata streaming shall support the listing of a specific metadata
   * configuration through the GetMetadataConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  async getMetadataConfiguration(options: GetMetadataConfiguration): Promise<MetadataConfiguration> {
    return this.getConfiguration({ entityName : 'Metadata', ...options });
  }

  /**
   * If the audio output configuration token is already known, the output configuration can be fetched through the
   * GetAudioOutputConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  getAudioOutputConfiguration(options: GetAudioOutputConfiguration): Promise<AudioOutputConfiguration> {
    return this.getConfiguration({ entityName : 'AudioOutput', ...options });
  }

  /**
   * If the audio decoder configuration token is already known, the decoder configuration can be fetched through
   * the GetAudioDecoderConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  getAudioDecoderConfiguration(options: GetAudioDecoderConfiguration): Promise<AudioDecoderConfiguration> {
    return this.getConfiguration({ entityName : 'AudioDecoder', ...options });
  }

  /**
   * Common method to get configuration options
   * @param options
   * @param options.entityName
   * @param options.configurationToken
   * @param options.profileToken
   * @private
   */
  private async getConfigurationOptions({ entityName, configurationToken, profileToken }: GetConfigurationOptions):
    Promise<ConfigurationOptionsExtended> {
    const body = `<Get${entityName}ConfigurationOptions xmlns="http://www.onvif.org/ver10/media/wsdl">${
      configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }${
      profileToken ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }</Get${entityName}ConfigurationOptions>`;
    const [data] = await this.onvif.request({
      service : 'media',
      body,
    });
    return linerase(data[`trt:Get${entityName}ConfigurationOptionsResponse`][0]['trt:Options'], {
      array : [
        'videoSourceTokensAvailable',
        'resolutionsAvailable',
        'mpeg4ProfilesSupported',
        'H264ProfilesSupported',
        'inputTokensAvailable',
        'options',
        'compressionType',
        'outputTokensAvailable',
        'sendPrimacyOptions',
      ],
    });
  }

  /**
   * This operation returns the available parameters and their valid ranges to the client. Any combination of the
   * parameters obtained using a given media profile and video source configuration shall be a valid input for the
   * SetVideoSourceConfiguration command. The device shall support the GetVideoSourceConfigurationOptions
   * command.
   * If a video source configuration token is provided, the device shall return the options compatible with that
   * configuration. If a media profile token is specified, the device shall return the options compatible with that media
   * profile.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  getVideoSourceConfigurationOptions(options: GetVideoSourceConfigurationOptions = {}): Promise<VideoSourceConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'VideoSource', ...options });
  }

  /**
   * This operation returns the available parameters and their valid ranges to the client. Any combination of the
   * parameters obtained using a given media profile and video encoder configuration shall be a valid input for
   * the SetVideoEncoderConfiguration command. The device shall support the GetVideoEncoderConfigurationOptions command.
   * If a video encoder configuration token is provided, the device shall return the options compatible with that
   * configuration. If a media profile token is specified, the device shall return the options compatible with that media
   * profile. If both a media profile token and a video encoder configuration token are specified, the device shall
   * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
   * options shall be considered generic for the device.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  getVideoEncoderConfigurationOptions(options: GetVideoEncoderConfigurationOptions = {}): Promise<VideoEncoderConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'VideoEncoder', ...options });
  }

  /**
   * This operation returns the available options (supported values and ranges for audio source configuration parameters)
   * when the audio source parameters are reconfigured. If an audio source configuration is specified, the options shall
   * concern that particular configuration. If a media profile is specified, the options shall be compatible with
   * that media profile.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  getAudioSourceConfigurationOptions(options: GetAudioSourceConfigurationOptions = {}): Promise<AudioSourceConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioSource', ...options });
  }

  /**
   * This operation returns the available options  (supported values and ranges for audio encoder configuration parameters)
   * when the audio encoder parameters are reconfigured.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  getAudioEncoderConfigurationOptions(options: GetAudioEncoderConfigurationOptions = {}): Promise<AudioEncoderConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioEncoder', ...options });
  }

  /**
   * This operation returns the available options (supported values and ranges for metadata configuration parameters)
   * for changing the metadata configuration.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  getMetadataConfigurationOptions(options: GetMetadataConfigurationOptions = {}): Promise<MetadataConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'Metadata', ...options });
  }

  /**
   * This operation returns the available options (supported values and ranges for audio output configuration parameters)
   * for configuring an audio output.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  getAudioOutputConfigurationOptions(options: GetAudioOutputConfigurationOptions = {}): Promise<AudioOutputConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioOutput', ...options });
  }

  /**
   * This command list the audio decoding capabilities for a given profile and configuration of a device.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  getAudioDecoderConfigurationOptions(options: GetAudioDecoderConfigurationOptions = {}): Promise<AudioDecoderConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioDecoder', ...options });
  }

  /**
   * This operation modifies a video source configuration. The ForcePersistence flag indicates if the changes shall
   * remain after reboot of the device. Running streams using this configuration may be immediately updated according to
   * the new settings. The changes are not guaranteed to take effect unless the client requests a new stream URI and
   * restarts any affected stream. NVC methods for changing a running stream are out of scope for this specification.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setVideoSourceConfiguration({ configuration, forcePersistence }: SetVideoSourceConfiguration): Promise<void> {
    const body = build({
      SetVideoSourceConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $ : {
            token    : configuration.token,
            ViewMode : configuration.viewMode,
          },
          Name        : configuration.name,
          UseCount    : configuration.useCount,
          SourceToken : configuration.sourceToken,
          Bounds      : {
            $ : {
              x      : configuration.bounds.x,
              y      : configuration.bounds.y,
              width  : configuration.bounds.width,
              height : configuration.bounds.height,
            },
          },
          ...(
            configuration.extension
            && {
              Extension : {
                ...(configuration.extension.rotate && {
                  Rotate : {
                    Mode   : configuration.extension.rotate.mode,
                    Degree : configuration.extension.rotate.degree,
                  },
                }),
                ...(configuration.extension.extension && {
                  Extension : {
                    LensDescription : configuration.extension.extension.lensDescription?.map((lensDescription) => ({
                      FocalLength : lensDescription.focalLength,
                      Offset      : {
                        $ : {
                          x : lensDescription.offset.x,
                          y : lensDescription.offset.y,
                        },
                      },
                      Projection : lensDescription.projection?.map((lensProjection) => ({
                        Angle         : lensProjection.angle,
                        Radius        : lensProjection.radius,
                        Transmittance : lensProjection.transmittance,
                      })),
                      XFactor : lensDescription.XFactor,
                    })),
                    ...(configuration.extension.extension.sceneOrientation && {
                      SceneOrientation : {
                        mode        : configuration.extension.extension.sceneOrientation.mode,
                        orientation : configuration.extension.extension.sceneOrientation.orientation,
                      },
                    }),
                  },
                }),
              },
            }
          ),
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * This operation modifies a video encoder configuration. The ForcePersistence flag indicates if the changes shall
   * remain after reboot of the device. Changes in the Multicast settings shall always be persistent. Running streams
   * using this configuration may be immediately updated according to the new settings. The changes are not guaranteed
   * to take effect unless the client requests a new stream URI and restarts any affected stream. NVC methods for
   * changing a running stream are out of scope for this specification.SessionTimeout is provided as a hint for keeping
   * rtsp session by a device. If necessary the device may adapt parameter values for SessionTimeout elements without
   * returning an error. For the time between keep alive calls the client shall adhere to the timeout value signaled via RTSP.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setVideoEncoderConfiguration({ configuration, forcePersistence }: SetVideoEncoderConfiguration): Promise<void> {
    const body = build({
      SetVideoEncoderConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $ : {
            token               : configuration.token,
            GuaranteedFrameRate : configuration.guaranteedFrameRate,
          },
          Name       : configuration.name,
          UseCount   : configuration.useCount,
          Encoding   : configuration.encoding,
          Resolution : {
            Width  : configuration.resolution.width,
            Height : configuration.resolution.height,
          },
          Quality : configuration.quality,
          ...(
            configuration.rateControl
            && {
              RateControl : {
                FrameRateLimit   : configuration.rateControl.frameRateLimit,
                EncodingInterval : configuration.rateControl.encodingInterval,
                BitrateLimit     : configuration.rateControl.bitrateLimit,
              },
            }
          ),
          ...(
            configuration.MPEG4
            && {
              MPEG4 : {
                GovLength    : configuration.MPEG4.govLength,
                Mpeg4Profile : configuration.MPEG4.mpeg4Profile,
              },
            }
          ),
          ...(
            configuration.H264
            && {
              H264 : {
                GovLength   : configuration.H264.govLength,
                H264Profile : configuration.H264.H264Profile,
              },
            }
          ),
          Multicast      : toOnvifXMLSchemaObject.multicastConfiguration(configuration.multicast),
          SessionTimeout : configuration.sessionTimeout,
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * The GetGuaranteedNumberOfVideoEncoderInstances command can be used to request the minimum number
   * of guaranteed video encoder instances (applications) per Video Source Configuration. A device SHALL support
   * this command. This command was added in ONVIF 1.02.
   * @param options
   * @param options.configurationToken
   */
  async getGuaranteedNumberOfVideoEncoderInstances({ configurationToken }: GetGuaranteedNumberOfVideoEncoderInstances):
    Promise<GetGuaranteedNumberOfVideoEncoderInstancesResponse> {
    const body = build({ GetGuaranteedNumberOfVideoEncoderInstances : { ConfigurationToken : configurationToken } });
    const [data] = await this.onvif.request({ service : 'media', body });
    return linerase(data).getGuaranteedNumberOfVideoEncoderInstancesResponse;
  }

  /**
   * This operation modifies an audio source configuration. The ForcePersistence flag indicates if
   * the changes shall remain after reboot of the device. Running streams using this configuration
   * may be immediately updated according to the new settings. The changes are not guaranteed
   * to take effect unless the client requests a new stream URI and restarts any affected stream
   * NVC methods for changing a running stream are out of scope for this specification.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setAudioSourceConfiguration({ configuration, forcePersistence }: SetAudioSourceConfiguration): Promise<void> {
    const body = build({
      SetAudioSourceConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $           : { token : configuration.token },
          Name        : configuration.name,
          UseCount    : configuration.useCount,
          SourceToken : configuration.sourceToken,
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * This operation modifies an audio encoder configuration. The ForcePersistence flag indicates if
   * the changes shall remain after reboot of the device. Running streams using this configuration may be immediately updated
   * according to the new settings. The changes are not guaranteed to take effect unless the client
   * requests a new stream URI and restarts any affected streams. NVC methods for changing a
   * running stream are out of scope for this specification.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setAudioEncoderConfiguration({ configuration, forcePersistence }: SetAudioEncoderConfiguration): Promise<void> {
    const body = build({
      SetAudioEncoderConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $              : { token : configuration.token },
          Name           : configuration.name,
          UseCount       : configuration.useCount,
          Encoding       : configuration.encoding,
          Bitrate        : configuration.bitrate,
          SampleRate     : configuration.sampleRate,
          Multicast      : toOnvifXMLSchemaObject.multicastConfiguration(configuration.multicast),
          SessionTimeout : configuration.sessionTimeout,
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * A video analytics configuration is modified using this command. The ForcePersistence flag
   * indicates if the changes shall remain after reboot of the device or not. Running streams using
   * this configuration shall be immediately updated according to the new settings. Otherwise
   * inconsistencies can occur between the scene description processed by the rule engine and
   * the notifications produced by analytics engine and rule engine which reference the very same
   * video analytics configuration token.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setVideoAnalyticsConfiguration({ configuration, forcePersistence }: SetVideoAnalyticsConfiguration): Promise<void> {
    const body = build({
      SetVideoAnalyticsConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $                            : { token : configuration.token },
          Name                         : configuration.name,
          UseCount                     : configuration.useCount,
          AnalyticsEngineConfiguration : {
            ...(configuration.analyticsEngineConfiguration.analyticsModule
              && {
                AnalyticsModule : configuration.analyticsEngineConfiguration.analyticsModule.map(toOnvifXMLSchemaObject.config),
              }),
            ...(configuration.analyticsEngineConfiguration.extension
              && { Extension : configuration.analyticsEngineConfiguration.extension }),
          },
          RuleEngineConfiguration : {
            ...(configuration.ruleEngineConfiguration.rule
              && {
                Rule : configuration.ruleEngineConfiguration.rule.map(toOnvifXMLSchemaObject.config),
              }),
            ...(configuration.ruleEngineConfiguration.extension
              && { Extension : configuration.ruleEngineConfiguration.extension }),
          },
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * This operation modifies a metadata configuration. The ForcePersistence flag indicates if the
   * changes shall remain after reboot of the device. Changes in the Multicast settings shall
   * always be persistent. Running streams using this configuration may be updated immediately
   * according to the new settings. The changes are not guaranteed to take effect unless the client
   * requests a new stream URI and restarts any affected streams. NVC methods for changing a
   * running stream are out of scope for this specification.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setMetadataConfiguration({ configuration, forcePersistence }: SetMetadataConfiguration): Promise<void> {
    const body = build({
      SetMetadataConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $ : {
            token           : configuration.token,
            CompressionType : configuration.compressionType,
            GeoLocation     : configuration.geoLocation,
            ShapePolygon    : configuration.shapePolygon,
          },
          Name     : configuration.name,
          UseCount : configuration.useCount,
          ...(configuration.PTZStatus && {
            PTZStatus : {
              Status      : configuration.PTZStatus.status,
              Position    : configuration.PTZStatus.position,
              FieldOfView : configuration.PTZStatus.fieldOfView,
            },
          }),
          ...(configuration.events && {
            Events : {
              ...(configuration.events.filter && { Filter : configuration.events.filter[xsany] }),
              ...(configuration.events.subscriptionPolicy && { SubscriptionPolicy : configuration.events.subscriptionPolicy[xsany] }),
            },
          }),
          Analytics      : configuration.analytics,
          Multicast      : toOnvifXMLSchemaObject.multicastConfiguration(configuration.multicast),
          SessionTimeout : configuration.sessionTimeout,
          ...(configuration.analyticsEngineConfiguration && {
            AnalyticsEngineConfiguration : {
              ...(configuration.analyticsEngineConfiguration.analyticsModule
                && {
                  AnalyticsModule : configuration.analyticsEngineConfiguration.analyticsModule.map(toOnvifXMLSchemaObject.config),
                }),
              ...(configuration.analyticsEngineConfiguration.extension
                && { Extension : configuration.analyticsEngineConfiguration.extension }),
            },
          }),
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * This operation modifies an audio output configuration. The ForcePersistence flag indicates if
   * the changes shall remain after reboot of the device.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setAudioOutputConfiguration({ configuration, forcePersistence }: SetAudioOutputConfiguration): Promise<void> {
    const body = build({
      SetAudioOutputConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $           : { token : configuration.token },
          Name        : configuration.name,
          UseCount    : configuration.useCount,
          OutputToken : configuration.outputToken,
          ...(configuration.sendPrimacy && { SendPrimacy : configuration.sendPrimacy }),
          ...(configuration.outputLevel && { OutputLevel : configuration.outputLevel }),
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * This operation modifies an audio decoder configuration. The ForcePersistence flag indicates if
   * the changes shall remain after reboot of the device.
   * @param options
   * @param options.configuration
   * @param options.forcePersistence
   */
  async setAudioDecoderConfiguration({ configuration, forcePersistence }: SetAudioDecoderConfiguration): Promise<void> {
    const body = build({
      SetAudioDecoderConfiguration : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ForcePersistence : forcePersistence,
        Configuration    : {
          $        : { token : configuration.token },
          Name     : configuration.name,
          UseCount : configuration.useCount,
          // TODO add any handler
        },
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * This operation requests a URI that can be used to initiate a live media stream using RTSP as the control protocol.
   * @param options
   * @param options.profileToken
   * @param options.streamSetup
   */
  async getStreamUri({
    profileToken = this.onvif.activeSource!.profileToken,
    streamSetup = {
      stream    : 'RTP-Unicast',
      transport : {
        protocol : 'RTSP',
      },
    },
  }: Partial<GetStreamUri> = {}): Promise<MediaUri> {
    const body = build({
      GetStreamUri : {
        $            : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ProfileToken : profileToken,
        StreamSetup  : {
          Stream    : streamSetup.stream,
          Transport : { Protocol : streamSetup.transport.protocol },
        },
      },
    });
    const [data] = await this.onvif.request({ service : 'media', body });
    return linerase(data).getStreamUriResponse.mediaUri;
  }

  /**
   * A Network client uses the GetSnapshotUri command to obtain a JPEG snhapshot from the device.
   * @param options
   * @param options.profileToken
   */
  async getSnapshotUri({ profileToken = this.onvif.activeSource!.profileToken }: Partial<GetSnapshotUri> = {}): Promise<MediaUri> {
    const body = build({
      GetSnapshotUri : {
        $            : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ProfileToken : profileToken,
      },
    });
    const [data] = await this.onvif.request({ service : 'media', body });
    return linerase(data).getSnapshotUriResponse.mediaUri;
  }

  /**
   * This command starts multicast streaming using a specified media profile of a device.
   * Streaming continues until StopMulticastStreaming is called for the same Profile. The
   * streaming shall continue after a reboot of the device until a StopMulticastStreaming request is
   * received. The multicast address, port and TTL are configured in the
   * VideoEncoderConfiguration, AudioEncoderConfiguration and MetadataConfiguration
   * respectively.
   * @param options
   * @param options.profileToken
   */
  async startMulticastStreaming({ profileToken = this.onvif.activeSource!.profileToken }: Partial<StartMulticastStreaming> = {}): Promise<void> {
    const body = build({
      StartMulticastStreaming : {
        $            : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ProfileToken : profileToken,
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * This command stop multicast streaming using a specified media profile of a device.
   * @param options
   * @param options.profileToken
   */
  async stopMulticastStreaming({ profileToken = this.onvif.activeSource!.profileToken }: Partial<StopMulticastStreaming> = {}): Promise<void> {
    const body = build({
      StopMulticastStreaming : {
        $            : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ProfileToken : profileToken,
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * Synchronization points allow clients to decode and correctly use all data after the
   * synchronization point.
   * For example, if a video stream is configured with a large I-frame distance and a client loses a
   * single packet, the client does not display video until the next I-frame is transmitted. In such
   * cases, the client can request a Synchronization Point which enforces the device to add an I-Frame as soon as possible.
   * Clients can request Synchronization Points for profiles. The device
   * shall add synchronization points for all streams associated with this profile.
   * Similarly, a synchronization point is used to get an update on full PTZ or event status through
   * the metadata stream.
   * If a video stream is associated with the profile, an I-frame shall be added to this video stream.
   * If a PTZ metadata stream is associated to the profile,
   * the PTZ position shall be repeated within the metadata stream.
   * @param options
   * @param options.profileToken
   */
  async setSynchronizationPoint({ profileToken = this.onvif.activeSource!.profileToken }: Partial<SetSynchronizationPoint> = {}): Promise<void> {
    const body = build({
      SetSynchronizationPoint : {
        $            : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        ProfileToken : profileToken,
      },
    });
    await this.onvif.request({ service : 'media', body });
  }

  /**
   * A device returns the information for current video source mode and settable video source modes of specified video
   * source. A device that indicates a capability of  VideoSourceModes shall support this command.
   * @param options
   * @param options.videoSourceToken
   */
  async getVideoSourceModes({ videoSourceToken = this.onvif.activeSource!.sourceToken }: Partial<GetVideoSourceModes> = {}): Promise<VideoSourceMode[]> {
    const body = build({
      GetVideoSourceModes : {
        $                : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        VideoSourceToken : videoSourceToken,
      },
    });
    const [data] = await this.onvif.request({ service : 'media', body });
    return linerase(data, { array : ['videoSourceModes'] }).getVideoSourceModesResponse.videoSourceModes
      .map((videoSourceMode: any) => ({
        ...videoSourceMode,
        encodings : videoSourceMode.encodings.split(' '),
      }));
  }

  async setVideoSourceMode({ videoSourceToken = this.onvif.activeSource!.sourceToken, videoSourceModeToken }:
    Optional<SetVideoSourceMode, 'videoSourceToken'>): Promise<SetVideoSourceModeResponse> {
    const body = build({
      SetVideoSourceMode : {
        $                    : { xmlns : 'http://www.onvif.org/ver10/media/wsdl' },
        VideoSourceToken     : videoSourceToken,
        VideoSourceModeToken : videoSourceModeToken,
      },
    });
    const [data] = await this.onvif.request({ service : 'media', body });
    return linerase(data).setVideoSourceModeResponse;
  }

  async getOSDs({ configurationToken, OSDToken }: GetOSDs = {}): Promise<GetOSDsResponse> {
    const mediaService = (this.onvif.device.media2Support ? 'media2' : 'media');
    const mediaNS = (this.onvif.device.media2Support
      ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');

    const [data] = await this.onvif.request({
      service : mediaService,
      body    : `<GetOSDs xmlns="${mediaNS}" >${
        configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
      }${
        OSDToken ? `<OSDToken>${configurationToken}</OSDToken>` : ''
      }</GetOSDs>`,
    });
    // this.videoSources = linerase(data).getVideoSourcesResponse.videoSources;
    return linerase(data[0].getOSDsResponse[0], { array : ['OSDs'] });
  }

  async getOSDOptions({ configurationToken = this.onvif.activeSource!.videoSourceConfigurationToken }: GetOSDOptions): Promise<GetOSDOptionsResponse> {
    const mediaService = (this.onvif.device.media2Support ? 'media2' : 'media');
    const mediaNS = (this.onvif.device.media2Support
      ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');

    const [data] = await this.onvif.request({
      service : mediaService,
      body    : `<GetOSDOptions xmlns="${mediaNS}" >`
        + `<ConfigurationToken>${configurationToken}</ConfigurationToken>`
        + '</GetOSDOptions>',
    });
    const result = linerase(data).getOSDOptionsResponse;
    return result;
  }
}

// function v1(originalMethod: any, context: ClassMethodDecoratorContext) {
//   return function v1(this: any, ...args: any[]) {
//     if (this.onvif.device.media2Support) {
//       this.onvif.emit('warn', `Media2 profile has support for this device, you can try to use similar to \`${
//         String(context.name)
//       }' method from \`Media2 class\``);
//     }
//     return originalMethod.call(this, ...args);
//   };
// }
