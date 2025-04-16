/**
 * Media ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media-Service-Spec.pdf
 */

import { Onvif } from './onvif';
import { linerase, build, schemaMulticastConfiguration } from './utils';
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
  VideoEncoder2Configuration,
  VideoEncoderConfiguration,
  VideoEncoderConfigurationOptions,
  VideoSource,
  VideoSourceConfiguration,
  VideoSourceConfigurationOptions,
} from './interfaces/onvif';
import { ReferenceToken } from './interfaces/common';
import { AnyURI } from './interfaces/basics';
import {
  GetOSDOptions,
  GetOSDOptionsResponse,
  GetOSDs,
  GetOSDsResponse,
  GetVideoSourceConfigurationOptions,
  GetVideoSourceConfigurationOptionsResponse,
  MediaProfile, SetVideoSourceConfigurationResponse,
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
  SetVideoSourceConfiguration, SetVideoEncoderConfiguration,
} from './interfaces/media';

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
  @v1
  async getProfiles(): Promise<Profile[]> {
    // Original ONVIF Media support (used in Profile S)
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.profiles = data[0].getProfilesResponse[0].profiles.map(linerase);
    return this.profiles;
  }

  /**
   * If the profile token is already known, a profile can be fetched through the GetProfile command.
   * @param options
   * @param options.profileToken
   */
  @v1
  async getProfile({ profileToken }: GetProfile): Promise<Profile> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : `<GetProfile xmlns="http://www.onvif.org/ver10/media/wsdl"><ProfileToken>${profileToken}</ProfileToken></GetProfile>`,
    });
    return linerase(data[0].getProfileResponse[0].profile);
  }

  /**
   * This operation creates a new empty media profile. The media profile shall be created in the device and shall be
   * persistent (remain after reboot). A created profile shall be deletable and a device shall set the “fixed” attribute
   * to false in the returned Profile.
   * @param options
   * @param options.name
   * @param options.token
   */
  @v1
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
   * the media profile, it will be replaced. The change shall be persistent. The device shall support addition of a
   * video source configuration to a profile through the AddVideoSourceConfiguration command.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addVideoSourceConfiguration(options: AddVideoSourceConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddVideoSourceConfiguration', ...options });
  }

  /**
   * This operation adds an AudioSourceConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it will be replaced. The change shall be persistent. A device that supports audio streaming from
   * device to client shall support addition of audio source configuration to a profile through the AddAudioSource-
   * Configuration command.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addAudioSourceConfiguration(options: AddAudioSourceConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddAudioSourceConfiguration', ...options });
  }

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
  addVideoEncoderConfiguration(options: AddVideoEncoderConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddVideoEncoderConfiguration', ...options });
  }

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
  addAudioEncoderConfiguration(options: AddAudioEncoderConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddAudioEncoderConfiguration', ...options });
  }

  /**
   * This operation adds a VideoAnalytics configuration to an existing media profile. If a configuration exists in
   * the media profile, it will be replaced. The change shall be persistent. A device that supports video analytics
   * shall support addition of video analytics configurations to a profile through the AddVideoAnalyticsConfiguration
   * command.
   * Adding a VideoAnalyticsConfiguration to a media profile means that streams using that media profile can con-
   * tain video analytics data (in the metadata) as defined by the submitted configuration reference. Video analyt-
   * ics data is specified in the document Video Analytics Specification and analytics configurations are managed
   * through the commands defined in Section 5.9.
   * A profile containing only a video analytics configuration but no video source configuration is incomplete. There-
   * fore, a client should first add a video source configuration to a profile before adding a video analytics configu-
   * ration. The device can deny adding of a video analytics configuration before a video source configuration. In
   * this case, it should respond with a ConfigurationConflict Fault.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addVideoAnalyticsConfiguration(options: AddVideoAnalyticsConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddVideoAnalyticsConfiguration', ...options });
  }

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
  addPTZConfiguration(options: AddPTZConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddPTZConfiguration', ...options });
  }

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
  addMetadataConfiguration(options: AddMetadataConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddMetadataConfiguration', ...options });
  }

  /**
   * This operation adds an AudioOutputConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it will be replaced. The change shall be persistent. An device that signals support for Audio
   * outputs via its Device IO AudioOutputs capability shall support the addition of an audio output configuration to
   * a profile through the AddAudioOutputConfiguration command.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  addAudioOutputConfiguration(options: AddAudioOutputConfiguration): Promise<void> {
    return this.addConfiguration({ name : 'AddAudioOutputConfiguration', ...options });
  }

  /**
   * This operation adds an AudioDecoderConfiguration to an existing media profile. If a configuration exists in the
   * media profile, it shall be replaced. The change shall be persistent. An device that signals support for Audio
   * outputs via its Device IO AudioOutputs capability shall support the addition of an audio decoder configuration
   * to a profile through the AddAudioDecoderConfiguration command
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
   * not contain a VideoSourceConfiguration, the operation has no effect. The removal shall be persistent. The
   * device shall support removal of a video source configuration from a profile through the
   * RemoveVideoSourceConfiguration command.
   * Video source configurations should only be removed after removing a VideoEncoderConfiguration from the
   * media profile.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeVideoSourceConfiguration(options: RemoveVideoSourceConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveVideoSourceConfiguration', ...options });
  }

  /**
   * This operation removes an AudioSourceConfiguration from an existing media profile. If the media profile does
   * not contain an AudioSourceConfiguration, the operation has no effect. The removal shall be persistent. A device
   * that supports audio streaming from device to client shall support removal of an audio source configuration from
   * a profile through the RemoveAudioSourceConfiguration command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeAudioSourceConfiguration(options: RemoveAudioSourceConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveAudioSourceConfiguration', ...options });
  }

  /**
   * This operation removes a VideoEncoderConfiguration from an existing media profile. If the media profile does
   * not contain a VideoEncoderConfiguration, the operation has no effect. The removal shall be persistent. The
   * device shall support removal of a video encoder configuration from a profile through the
   * RemoveVideoEncoderConfiguration command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeVideoEncoderConfiguration(options: RemoveVideoEncoderConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveVideoEncoderConfiguration', ...options });
  }

  /**
   * This operation removes an AudioEncoderConfiguration from an existing media profile. If the media profile does
   * not contain an AudioEncoderConfiguration, the operation has no effect. The removal shall be persistent. A
   * device that supports audio streaming from device to client shall support removal of audio encoder configurations
   * from a profile through the RemoveAudioEncoderConfiguration command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeAudioEncoderConfiguration(options: RemoveAudioEncoderConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveAudioEncoderConfiguration', ...options });
  }

  /**
   * This operation removes a VideoAnalyticsConfiguration from an existing media profile. If the media profile does
   * not contain a VideoAnalyticsConfiguration, the operation has no effect. The removal shall be persistent. A
   * device that supports video analytics shall support removal of a video analytics configuration from a profile
   * through the RemoveVideoAnalyticsConfiguration command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeVideoAnalyticsConfiguration(options: RemoveVideoAnalyticsConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveVideoAnalyticsConfiguration', ...options });
  }

  /**
   * This operation removes a PTZConfiguration from an existing media profile. If the media profile does not contain
   * a PTZConfiguration, the operation has no effect. The removal shall be persistent. A device that supports
   * PTZ control shall support removal of PTZ configurations from a profile through the RemovePTZConfiguration
   * command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removePTZConfiguration(options: RemovePTZConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemovePTZConfiguration', ...options });
  }

  /**
   * This operation removes a MetadataConfiguration from an existing media profile. If the media profile does not
   * contain a MetadataConfiguration, the operation has no effect. The removal shall be persistent. A device shall
   * support the removal of a metadata configuration from a profile through the RemoveMetadataConfiguration
   * command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeMetadataConfiguration(options: RemoveMetadataConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveMetadataConfiguration', ...options });
  }

  /**
   * This operation removes an AudioOutputConfiguration from an existing media profile. If the media profile does
   * not contain an AudioOutputConfiguration, the operation has no effect. The removal shall be persistent. An
   * device that signals support for Audio outputs via its Device IO AudioOutputs capability shall support the removal
   * of an audio output configuration from a profile through the RemoveAudioOutputConfiguration command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeAudioOutputConfiguration(options: RemoveAudioOutputConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveAudioOutputConfiguration', ...options });
  }

  /**
   * This operation removes an AudioDecoderConfiguration from an existing media profile. If the media profile does
   * not contain an AudioDecoderConfiguration, the operation has no effect. The removal shall be persistent. An
   * device that signals support for Audio outputs via its Device IO AudioOutputs capability shall support the removal
   * of an audio decoder configuration from a profile through the RemoveAudioDecoderConfiguration command.
   * @param options
   * @param options.profileToken
   */
  @v1
  removeAudioDecoderConfiguration(options: RemoveAudioDecoderConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveAudioDecoderConfiguration', ...options });
  }

  /**
   * This operation lists all available video sources for the device. The device shall support the listing of available
   * video sources through the GetVideoSources command
   */
  @v1
  async getVideoSources(): Promise<VideoSource[]> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetVideoSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.videoSources = linerase(data, { array : ['videoSources'] }).getVideoSourcesResponse.videoSources;
    return this.videoSources;
  }

  /**
   * This operation lists all available audio sources of the device. A device that supports audio streaming from
   * device to client shall support listing of available audio sources through the GetAudioSources command.
   */
  @v1
  async getAudioSources(): Promise<AudioSource[]> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetAudioSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.audioSources = linerase(data, { array : ['audioSources'] }).getAudioSourcesResponse.audioSources;
    return this.audioSources;
  }

  /**
   * This command lists all available audio outputs of a device. An device that signals support for Audio outputs
   * via its Device IO AudioOutputs capability shall support listing of available audio outputs through the GetAu-
   * dioOutputs command.
   */
  @v1
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
    return linerase(data, { array : ['configurations', 'analyticsModule', 'rule'] })[`get${entityName}ConfigurationsResponse`].configurations;
  }

  /**
   * This operation lists all existing video source configurations for a device. This command lists all video source
   * configurations in a device. The client need not know anything about the video source configurations in order
   * to use the command. The device shall support the listing of available video source configurations through the
   * GetVideoSourceConfigurations command.
   */
  @v1
  getVideoSourceConfigurations(): Promise<VideoSourceConfiguration[]> {
    return this.getConfigurations({ entityName : 'VideoSource' });
  }

  /**
   * This operation lists all existing video encoder configurations of a device. This command lists all configured
   * video encoder configurations in a device. The client does not need to know anything apriori about the video
   * encoder configurations in order to use the command. The device shall support the listing of available video
   * encoder configurations through the GetVideoEncoderConfigurations command
   */
  @v1
  getVideoEncoderConfigurations(): Promise<VideoEncoderConfiguration[]> {
    return this.getConfigurations({ entityName : 'VideoEncoder' });
  }

  /**
   * This operation lists all existing audio source configurations of a device. This command lists all audio source
   * configurations in a device. The client does not need to know anything apriori about the audio source configurations
   * in order to use the command. A device that supports audio streaming from device to client shall support
   * listing of available audio source configurations through the GetAudioSourceConfigurations command
   */
  @v1
  getAudioSourceConfigurations(): Promise<AudioSourceConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioSource' });
  }

  /**
   * This operation lists all existing device audio encoder configurations. The client does not need to know anything
   * apriori about the audio encoder configurations in order to use the command. A device that supports audio
   * streaming from device to client shall support the listing of available audio encoder configurations through the
   * GetAudioEncoderConfigurations command
   */
  @v1
  getAudioEncoderConfigurations(): Promise<AudioEncoderConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioEncoder' });
  }

  /**
   * This operation lists all video analytics configurations of a device. This command lists all configured video an-
   * alytics in a device. The client does not need to know anything apriori about the video analytics in order to
   * use the command. A device that supports video analytics shall support the listing of available video analytics
   * configuration through the GetVideoAnalyticsConfigurations command.
   */
  @v1
  getVideoAnalyticsConfigurations(): Promise<VideoAnalyticsConfiguration[]> {
    return this.getConfigurations({ entityName : 'VideoAnalytics' });
  }

  /**
   * This operation lists all existing metadata configurations. The client does not need to know anything apriori about
   * the metadata in order to use the command. A device or another device that supports metadata streaming shall
   * support the listing of existing metadata configurations through the GetMetadataConfigurations command.
   */
  @v1
  getMetadataConfigurations(): Promise<MetadataConfiguration[]> {
    return this.getConfigurations({ entityName : 'Metadata' });
  }

  /**
   * This command lists all existing AudioOutputConfigurations of a device. The client does not need to know any-
   * thing apriori about the audio configurations to use this command. A device that signals support for Audio out-
   * puts via its Device IO AudioOutputs capability shall support the listing of AudioOutputConfigurations through
   * this command
   */
  @v1
  getAudioOutputConfigurations(): Promise<AudioOutputConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioOutput' });
  }

  /**
   * This command lists all existing AudioDecoderConfigurations of a device.
   * The client does not need to know anything apriori about the audio decoder configurations in order to use this
   * command. An device that signals support for Audio outputs via its Device IO AudioOutputs capability shall
   * support the listing of AudioOutputConfigurations through this command.
   */
  @v1
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
  @v1
  getCompatibleVideoSourceConfigurations(options: GetCompatibleVideoSourceConfigurations): Promise<VideoSourceConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'VideoSource', ...options });
  }

  /**
   * This operation lists all the video encoder configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the AddVideoEncoderConfig-
   * uration command on the media profile. The result will vary depending on the capabilities, configurations and
   * settings in the device. The device shall support the listing of compatible (with a specific profile) video encoder
   * configurations through the GetCompatibleVideoEncoderConfigurations command
   * @param options
   * @param options.profileToken
   */
  @v1
  getCompatibleVideoEncoderConfigurations(options: GetCompatibleVideoEncoderConfigurations): Promise<VideoEncoderConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'VideoEncoder', ...options });
  }

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
  @v1
  getCompatibleAudioSourceConfigurations(options: GetCompatibleAudioSourceConfigurations): Promise<AudioSourceConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'AudioSource', ...options });
  }

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
  @v1
  getCompatibleAudioEncoderConfigurations(options: GetCompatibleAudioEncoderConfigurations): Promise<AudioEncoderConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'AudioEncoder', ...options });
  }

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
  @v1
  getCompatibleVideoAnalyticsConfigurations(options: GetCompatibleVideoAnalyticsConfigurations): Promise<VideoAnalyticsConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'VideoAnalytics', ...options });
  }

  /**
   * This operation requests all the metadata configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the AddMetadataConfiguration
   * command on the media profile. The result varies depending on the capabilities, configurations and settings in
   * the device. A device or other device that supports metadata streaming shall support the listing of compatible
   * (with a specific profile) metadata configuration through the GetCompatibleMetadataConfigurations command.
   * @param options
   * @param options.profileToken
   */
  @v1
  getCompatibleMetadataConfigurations(options: GetCompatibleMetadataConfigurations): Promise<MetadataConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'Metadata', ...options });
  }

  /**
   * This command lists all audio output configurations of a device that are compatible with a certain media profile.
   * Each returned configuration shall be a valid input for the AddAudioOutputConfiguration command. An device
   * that signals support for Audio outputs via its Device IO AudioOutputs capability shall support the listing of
   * compatible (with a specific profile) AudioOutputConfigurations through the
   * GetCompatibleAudioOutputConfigurations command
   * @param options
   * @param options.profileToken
   */
  @v1
  getCompatibleAudioOutputConfigurations(options: GetCompatibleAudioOutputConfigurations): Promise<AudioOutputConfiguration[]> {
    return this.getCompatibleConfigurations({ entityName : 'AudioOutput', ...options });
  }

  /**
   * This operation lists all the audio decoder configurations of the device that are compatible with a certain media
   * profile. Each of the returned configurations shall be a valid input parameter for the
   * AddAudioDecoderConfiguration command on the media profile. An device that signals support for Audio outputs via its
   * Device IO AudioOutputs capability shall support the listing of compatible (with a specific profile) audio decoder
   * configurations through the GetCompatibleAudioDecoderConfigurations command
   * @param options
   * @param options.profileToken
   */
  @v1
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
    return linerase(data, { array : ['analyticsModule', 'rule'] })[`get${entityName}ConfigurationResponse`].configuration;
  }

  /**
   * If the video source configuration token is already known, the video source configuration can be fetched through
   * the GetVideoSourceConfiguration command. The device shall support retrieval of specific video source configurations
   * through the GetVideoSourceConfiguration command
   * @param options
   * @param options.configurationToken
   */
  @v1
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
  @v1
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
  @v1
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
  @v1
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
  @v1
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
  @v1
  getMetadataConfiguration(options: GetMetadataConfiguration): Promise<MetadataConfiguration> {
    return this.getConfiguration({ entityName : 'Metadata', ...options });
  }

  /**
   * If the audio output configuration token is already known, the output configuration can be fetched through the
   * GetAudioOutputConfiguration command. An device that signals support for Audio outputs via its Device IO
   * AudioOutputs capability shall support the retrieval of a specific audio output configuration through the
   * GetAudioOutputConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  @v1
  getAudioOutputConfiguration(options: GetAudioOutputConfiguration): Promise<AudioOutputConfiguration> {
    return this.getConfiguration({ entityName : 'AudioOutput', ...options });
  }

  /**
   * If the audio decoder configuration token is already known, the decoder configuration can be fetched through
   * the GetAudioDecoderConfiguration command. An device that signals support for Audio outputs via its Device
   * IO AudioOutputs capability shall support the retrieval of a specific audio decoder configuration through the
   * GetAudioDecoderConfiguration command.
   * @param options
   * @param options.configurationToken
   */
  @v1
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
    return linerase(data[0][`get${entityName}ConfigurationOptionsResponse`][0].options, {
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
   * If a video source configuration token is provided, the device shall return the options compatible with that con-
   * figuration. If a media profile token is specified, the device shall return the options compatible with that media
   * profile. If both a media profile token and a video source configuration token are specified, the device shall
   * return the options compatible with both that media profile and that configuration. If no tokens are specified, the
   * options shall be considered generic for the device.
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  @v1
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
   * options shall be considered generic for the device
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  @v1
  getVideoEncoderConfigurationOptions(options: GetVideoEncoderConfigurationOptions = {}): Promise<VideoEncoderConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'VideoEncoder', ...options });
  }

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
  @v1
  getAudioSourceConfigurationOptions(options: GetAudioSourceConfigurationOptions = {}): Promise<AudioSourceConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioSource', ...options });
  }

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
  @v1
  getAudioEncoderConfigurationOptions(options: GetAudioEncoderConfigurationOptions = {}): Promise<AudioEncoderConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioEncoder', ...options });
  }

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
  @v1
  getMetadataConfigurationOptions(options: GetMetadataConfigurationOptions = {}): Promise<MetadataConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'Metadata', ...options });
  }

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
  @v1
  getAudioOutputConfigurationOptions(options: GetAudioOutputConfigurationOptions = {}): Promise<AudioOutputConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioOutput', ...options });
  }

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
  @v1
  getAudioDecoderConfigurationOptions(options: GetAudioDecoderConfigurationOptions = {}): Promise<AudioDecoderConfigurationOptions> {
    return this.getConfigurationOptions({ entityName : 'AudioDecoder', ...options });
  }

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
  async setVideoSourceConfiguration({ configuration, forcePersistence = true }: SetVideoSourceConfiguration): Promise<void> {
    const body = build({
      SetVideoSourceConfiguration : {
        $ : {
          xmlns : 'http://www.onvif.org/ver10/media/wsdl',
        },
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
            configuration.extension && configuration.extension.rotate
            && {
              Extension : {
                $ : {
                  xmlns : 'http://www.onvif.org/ver10/schema',
                },
                Rotate : {
                  Mode   : configuration.extension.rotate.mode,
                  Degree : configuration.extension.rotate.degree,
                },
              },
            }
          ),
        },
      },
    });
    await this.onvif.request({
      service : 'media',
      body,
    });
  }

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
  async setVideoEncoderConfiguration({ configuration, forcePersistence = true }: SetVideoEncoderConfiguration): Promise<void> {
    const body = build({
      SetVideoEncoderConfiguration : {
        $ : {
          xmlns : 'http://www.onvif.org/ver10/media/wsdl',
        },
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
          Multicast      : schemaMulticastConfiguration(configuration.multicast),
          SessionTimeout : configuration.sessionTimeout,
        },
      },
    });
    await this.onvif.request({
      service : 'media',
      body,
    });
  }

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
  async getStreamUri(options: GetStreamUriOptions = {}):
    Promise<MediaUri | string> {
    const {
      profileToken,
      stream = 'RTP-Unicast',
    } = options;
    let { protocol = 'RTSP' } = options;
    if (this.onvif.device.media2Support) {
      // Permitted values for options.protocol are :-
      //   RtspUnicast - RTSP streaming RTP via UDP Unicast.
      //   RtspMulticast - RTSP streaming RTP via UDP Multicast.
      //   RTSP - RTSP streaming RTP over TCP.
      //   RtspOverHttp - Tunneling both the RTSP control channel and the RTP stream over HTTP or HTTPS.

      // For backwards compatibility this function will convert Media1 Stream and Transport Protocol to a Media2 protocol
      if (protocol === 'HTTP') { protocol = 'RtspOverHttp'; }
      if (protocol === 'TCP') { protocol = 'RTSP'; }
      if (protocol === 'UDP' && stream === 'RTP-Unicast') { protocol = 'RtspUnicast'; }
      if (protocol === 'UDP' && stream === 'RTP-Multicast') { protocol = 'RtspMulticast'; }

      // Profile T request using Media2
      const [data] = await this.onvif.request({
        service : 'media2',
        body    : '<GetStreamUri xmlns="http://www.onvif.org/ver20/media/wsdl">'
          + `<Protocol>${protocol}</Protocol>`
          + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
          + '</GetStreamUri>',
      });
      return linerase(data).getStreamUriResponse;
    }
    // Original (v.1.0)  ONVIF Specification for Media (used in Profile S)
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">'
        + '<StreamSetup>'
        + `<Stream xmlns="http://www.onvif.org/ver10/schema">${stream}</Stream>`
        + '<Transport xmlns="http://www.onvif.org/ver10/schema">'
        + `<Protocol>${protocol || 'RTSP'}</Protocol>`
        + '</Transport>'
        + '</StreamSetup>'
        + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
        + '</GetStreamUri>',
    });
    return linerase(data).getStreamUriResponse.mediaUri;
  }

  /**
   * Receive snapshot URI
   * @param profileToken
   */
  async getSnapshotUri({ profileToken = this.onvif.activeSource!.profileToken }: GetSnapshotUri): Promise<{uri: AnyURI}> {
    if (this.onvif.device.media2Support) {
      // Profile T request using Media2
      const [data] = await this.onvif.request({
        service : 'media2',
        body    : '<GetSnapshotUri xmlns="http://www.onvif.org/ver20/media/wsdl">'
          + `<ProfileToken>${profileToken}</ProfileToken>`
          + '</GetSnapshotUri>',
      });
      return linerase(data).getSnapshotUriResponse;
    }
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetSnapshotUri xmlns="http://www.onvif.org/ver10/media/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + '</GetSnapshotUri>',
    });
    return linerase(data).getSnapshotUriResponse.mediaUri;
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

function v1(originalMethod: any, context: ClassMethodDecoratorContext) {
  return function v1(this: any, ...args: any[]) {
    if (this.onvif.device.media2Support) {
      this.onvif.emit('warn', `Media2 profile has support for this device, you can try to use similar to \`${
        String(context.name)
      }' method from \`Media2 class\``);
    }
    return originalMethod.call(this, ...args);
  };
}
