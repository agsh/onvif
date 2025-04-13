/**
 * Media ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media-Service-Spec.pdf
 */

import { Onvif } from './onvif';
import { linerase } from './utils';
import {
  AudioDecoderConfiguration,
  AudioEncoderConfiguration, AudioOutputConfiguration,
  AudioSource, AudioSourceConfiguration, MediaUri, MetadataConfiguration,
  Profile, PTZConfiguration, VideoAnalyticsConfiguration, VideoEncoder2Configuration,
  VideoEncoderConfiguration,
  VideoSource, VideoSourceConfiguration,
} from './interfaces/onvif';
import { ReferenceToken } from './interfaces/common';
import { AnyURI } from './interfaces/basics';
import {
  GetOSDOptions,
  GetOSDOptionsResponse,
  GetOSDs,
  GetOSDsResponse,
  GetVideoEncoderConfigurations, GetVideoEncoderConfigurationsResponse as GetVideoEncoder2ConfigurationsResponse,
  GetVideoSourceConfigurationOptions,
  GetVideoSourceConfigurationOptionsResponse,
  GetVideoSourceConfigurations, MediaProfile, SetVideoSourceConfigurationResponse,
} from './interfaces/media.2';
import {
  GetVideoSourceConfigurationsResponse,
  GetVideoEncoderConfigurationsResponse,
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
  RemoveMetadataConfiguration, RemoveAudioOutputConfiguration, RemoveAudioDecoderConfiguration,
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

function media2ProfileToMedia1Profile(media2Profile: MediaProfile) {
  const configurationSet = media2Profile.configurations!;
  const newProfile: Profile = {
    token : media2Profile.token,
    name  : media2Profile.name,
    fixed : media2Profile.fixed || false,
  };
  // Media2 Spec says there will be these some or all of these configuration entities
  // Video source configuration
  // Audio source configuration
  // Video encoder configuration
  // Audio encoder configuration
  // PTZ configuration
  // Video analytics configuration
  // Metadata configuration
  // Audio output configuration
  // Audio decoder configuration
  if (configurationSet.videoSource) { newProfile.videoSourceConfiguration = configurationSet.videoSource; }
  if (configurationSet.audioSource) { newProfile.audioSourceConfiguration = configurationSet.audioSource; }
  if (configurationSet.videoEncoder) {
    newProfile.videoEncoderConfiguration = configurationSet.videoEncoder as unknown as VideoEncoderConfiguration;
  }
  if (configurationSet.audioEncoder) {
    newProfile.audioEncoderConfiguration = configurationSet.audioEncoder as AudioEncoderConfiguration;
  }
  if (configurationSet.PTZ) { newProfile.PTZConfiguration = configurationSet.PTZ; }
  if (configurationSet.analytics) { newProfile.videoAnalyticsConfiguration = configurationSet.analytics; }
  if (configurationSet.metadata) { newProfile.metadataConfiguration = configurationSet.metadata; }
  if (configurationSet.audioOutput || configurationSet.audioDecoder) {
    newProfile.extension = {
      audioOutputConfiguration  : configurationSet.audioOutput!,
      audioDecoderConfiguration : configurationSet.audioDecoder!,
    };
  }
  // TODO - Add Audio
  return newProfile;
}

/**
 * Media service, ver10 profile
 */
export class Media {
  private onvif: Onvif;
  public profiles: Profile[] = [];
  public videoSources: VideoSource[] = [];
  public audioSources: AudioSource[] = [];

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * Receive profiles in Media ver10 format
   * Any endpoint can ask for the existing media profiles of a device using the GetProfiles command. Pre-configured or
   * dynamically configured profiles can be retrieved using this command. This command lists all configured profiles in
   * a device. The client does not need to know the media profile in order to use the command.
   */
  async getProfiles(): Promise<(Profile)[]> {
    if (this.onvif.device.media2Support) {
      // Profile T request using Media2
      // The reply is in a different format to the old API so we convert the data from the new API to the old structure
      // for backwards compatibility with existing users of this library
      const profiles = await this.onvif.media2.getProfiles();

      // Slight difference in Media1 and Media2 reply XML
      // Generate a reply that looks like a Media1 reply for existing library users
      this.profiles = profiles.map(media2ProfileToMedia1Profile);
      return this.profiles;
    }
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
   */
  async getProfile({ profileToken }: GetProfile): Promise<Profile> {
    if (this.onvif.device.media2Support) {
      const [result] = await this.onvif.media2.getProfiles({ token : profileToken });
      return media2ProfileToMedia1Profile(result);
    }
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
  removeAudioDecoderConfiguration(options: RemoveAudioDecoderConfiguration): Promise<void> {
    return this.removeConfiguration({ name : 'RemoveAudioDecoderConfiguration', ...options });
  }

  /**
   * This operation lists all available video sources for the device. The device shall support the listing of available
   * video sources through the GetVideoSources command
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
   * This operation lists all available audio sources of the device. A device that supports audio streaming from
   * device to client shall support listing of available audio sources through the GetAudioSources command.
   */
  async getAudioSources(): Promise<AudioSource[]> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetAudioSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.audioSources = linerase(data, { array : ['audioSources'] }).getAudioSourcesResponse.audioSources;
    return this.audioSources;
  }

  async getAudioOutputConfigurations(): Promise<AudioOutputConfiguration[]> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetAudioOutputConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    return linerase(data, { array : ['configurations'] }).getAudioOutputConfigurationsResponse.configurations;
  }

  async getVideoSourceConfigurations({ configurationToken, profileToken }: GetVideoSourceConfigurations = {}):
    Promise<GetVideoSourceConfigurationsResponse> {
    const body = `<GetVideoSourceConfigurations xmlns="${
      this.onvif.device.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl'
    }">${
      configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }${
      profileToken ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }</GetVideoSourceConfigurations>`;
    const service = (this.onvif.device.media2Support ? 'media2' : 'media');

    const [data] = await this.onvif.request({ service, body });
    return linerase(data, { array : ['configurations'] }).getVideoSourceConfigurationsResponse;
  }

  async getVideoSourceConfigurationOptions({ configurationToken, profileToken }: GetVideoSourceConfigurationOptions = {}):
    Promise<GetVideoSourceConfigurationOptionsResponse> {
    const body = `<GetVideoSourceConfigurationOptions xmlns="${
      this.onvif.device.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl'
    }">${
      configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }${
      profileToken ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }</GetVideoSourceConfigurationOptions>`;
    const service = (this.onvif.device.media2Support ? 'media2' : 'media');

    const [data] = await this.onvif.request({ service, body });
    return linerase(data, { array : ['videoSourceTokensAvailable'] }).getVideoSourceConfigurationOptionsResponse;
  }

  /** Common setVideoSourceConfiguration for media and media2 profiles. It depends on media2support flag */
  async setVideoSourceConfiguration(configuration: VideoSourceConfiguration | VideoEncoder2Configuration, forcePersistence: boolean = true):
    Promise<SetVideoSourceConfigurationResponse> {
    const service = this.onvif.device.media2Support ? 'media2' : 'media';
    const xmlns = this.onvif.device.media2Support
      ? 'http://www.onvif.org/ver20/media/wsdl'
      : 'http://www.onvif.org/ver10/media/wsdl';
    const body = `<SetVideoEncoderConfiguration xmlns="${xmlns}">`
      + `<Configuration token="${configuration.token}"${
        'govLength' in configuration ? ` GovLength="${configuration.govLength}"` : ''
      }${'profile' in configuration ? ` Profile="${configuration.profile}"` : ''
      }${'anchorFrameDistance' in configuration ? ` AnchorFrameDistance="${configuration.anchorFrameDistance}"` : ''
      }${'guaranteedFrameRate' in configuration ? ` GuaranteedFrameRate="${configuration.guaranteedFrameRate}"` : ''
      }${'viewMode' in configuration ? ` GuaranteedFrameRate="${configuration.viewMode}"` : ''
      }>${
        configuration.name ? `<Name xmlns="http://www.onvif.org/ver10/schema">${configuration.name}</Name>` : ''
      }${configuration.useCount ? `<UseCount xmlns="http://www.onvif.org/ver10/schema">${configuration.useCount}</UseCount>` : ''
      }${'encoding' in configuration
        ? `<Encoding xmlns="http://www.onvif.org/ver10/schema">${configuration.encoding}</Encoding>` : ''
      }${'resolution' in configuration
        ? `<Resolution xmlns="http://www.onvif.org/ver10/schema">${
          configuration.resolution.width ? `<Width>${configuration.resolution.width}</Width>` : ''
        }${configuration.resolution.height ? `<Height>${configuration.resolution.height}</Height>` : ''
        }</Resolution>` : ''
      }${'quality' in configuration ? `<Quality xmlns="http://www.onvif.org/ver10/schema">${configuration.quality}</Quality>` : ''
      }${'rateControl' in configuration && configuration.rateControl !== undefined
        ? `<RateControl ConstantBitRate="${configuration.rateControl.constantBitRate}" xmlns="http://www.onvif.org/ver10/schema"><FrameRateLimit>${
          configuration.rateControl.frameRateLimit}</FrameRateLimit><BitrateLimit>${configuration.rateControl.bitrateLimit
        }</BitrateLimit></RateControl>` : ''
      }${'multicast' in configuration && configuration.multicast !== undefined
        ? `<Multicast xmlns="http://www.onvif.org/ver10/schema">${
          configuration.multicast.address
            ? `<Address>${
              configuration.multicast.address.type ? `<Type>${configuration.multicast.address.type}</Type>` : ''
            }${configuration.multicast.address.IPv4Address ? `<IPv4Address>${configuration.multicast.address.IPv4Address}</IPv4Address>` : ''
            }${configuration.multicast.address.IPv6Address ? `<IPv6Address>${configuration.multicast.address.IPv6Address}</IPv6Address>` : ''
            }</Address>` : ''
        }${configuration.multicast.port !== undefined ? `<Port>${configuration.multicast.port}</Port>` : ''
        }${configuration.multicast.TTL !== undefined ? `<TTL>${configuration.multicast.TTL}</TTL>` : ''
        }${configuration.multicast.autoStart !== undefined ? `<AutoStart>${configuration.multicast.autoStart}</AutoStart>` : ''
        }</Multicast>` : ''
      }${'quality' in configuration ? `<Quality>${configuration.quality}</Quality>` : ''
      }${'sourceToken' in configuration ? `<SourceToken xmlns="http://www.onvif.org/ver10/schema">${configuration.sourceToken}</SourceToken>` : ''
      }${'bounds' in configuration
        ? `<Bounds xmlns="http://www.onvif.org/ver10/schema" x="${
        configuration.bounds!.x
        }" y="${
        configuration.bounds!.y
        }" width="${
        configuration.bounds!.width
        }" height="${
        configuration.bounds!.height
        }">` : ''
      }${'extension' in configuration && configuration.extension
        ? `<Extention xmlns="http://www.onvif.org/ver10/schema">${
          'rotate' in configuration.extension && configuration.extension.rotate ? `<Rotate xmlns="http://www.onvif.org/ver10/schema"><Mode>${
            configuration.extension.rotate.mode}</Mode>${
            configuration.extension.rotate.degree ? `<Degree>${configuration.extension.rotate.degree}</Degree>` : ''
          }</Rotate>` : ''
        }</Extention>` : ''
      }</Configuration>${
        (!this.onvif.device.media2Support ? `<ForcePersistence>${forcePersistence}</ForcePersistence>` : '')
      }`
      + '</SetVideoEncoderConfiguration>';
    const [data] = await this.onvif.request({ service, body });
    return data;
  }

  /**
   * If device supports Media 2.0 returns an array of VideoEncoder2Configuration. Otherwise VideoEncoderConfiguration
   * @param options
   * @param options.configurationToken
   * @param options.profileToken
   */
  async getVideoEncoderConfigurations({ configurationToken, profileToken }: GetVideoEncoderConfigurations = {}):
    Promise<GetVideoEncoderConfigurationsResponse | GetVideoEncoder2ConfigurationsResponse> {
    const body = `<GetVideoEncoderConfigurations xmlns="${
      this.onvif.device.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl'
    }">${
      configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }${
      profileToken ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }</GetVideoEncoderConfigurations>`;
    const service = (this.onvif.device.media2Support ? 'media2' : 'media');

    const [data] = await this.onvif.request({ service, body });

    const { getVideoEncoderConfigurationsResponse } = linerase(data, { array : ['configurations'] });
    return getVideoEncoderConfigurationsResponse;
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
