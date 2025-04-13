/**
 * Media ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media2-Service-Spec.pdf
 */

import { Onvif } from './onvif';
import {
  MediaProfile,
  GetProfiles,
  CreateProfile,
  ConfigurationRef,
  ConfigurationEnumeration,
  AddConfiguration,
  RemoveConfiguration,
  DeleteProfile,
  GetConfiguration,
  GetVideoSourceConfigurations,
  GetAudioEncoderConfigurations,
  GetVideoEncoderConfigurations,
  GetAnalyticsConfigurations,
  GetMetadataConfigurations,
  GetAudioOutputConfigurations,
  GetAudioDecoderConfigurations,
  WebRTCConfiguration, GetWebRTCConfigurations,
} from './interfaces/media.2';
import { linerase } from './utils';
import { ReferenceToken } from './interfaces/common';
import {
  AudioDecoderConfiguration,
  AudioEncoder2Configuration,
  AudioOutputConfiguration,
  AudioSourceConfiguration,
  MetadataConfiguration,
  VideoAnalyticsConfiguration,
  VideoEncoder2Configuration,
  VideoSourceConfiguration,
} from './interfaces/onvif';

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

interface GetConfigurationExtended extends GetConfiguration {
  entityName: ConfigurationEnumeration;
}

type ConfigurationEntityExtended = VideoSourceConfiguration & AudioSourceConfiguration
  & VideoEncoder2Configuration & AudioEncoder2Configuration & VideoAnalyticsConfiguration
  & MetadataConfiguration & AudioOutputConfiguration & WebRTCConfiguration;

/**
 * Media service, ver20 profile
 */
export class Media2 {
  private onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * Retrieve the profile with the specified token or all defined media profiles.
   * - If no Type is provided the returned profiles shall contain no configuration information.
   * - If a single Type with value 'All' is provided the returned profiles shall include all associated configurations.
   * - Otherwise the requested list of configurations shall for each profile include the configurations present as Type.
   * @param options
   * @param options.token Optional token to retrieve exactly one profile.
   * @param options.type If one or more types are passed only the corresponding configurations will be returned.
   */
  @v2
  async getProfiles({ token, type }: GetProfiles = {}): Promise<(MediaProfile)[]> {
    const body = `<GetProfiles xmlns="http://www.onvif.org/ver20/media/wsdl">${
      token !== undefined ? `<Token>${token}</Token>` : ''
    }${
      type !== undefined ? `<Type>${type.join(' ')}</Type>` : '<Type>All</Type>'
    }</GetProfiles>`;
    const [data] = await this.onvif.request({
      service : 'media2',
      body,
    });
    return linerase(data, { array : ['profiles'] }).getProfilesResponse.profiles;
  }

  /**
   * This operation creates a new media profile. A created profile created via this method may be deleted via the
   * DeleteProfile method. Optionally Configurations can be assigned to the profile on creation. For details regarding
   * profile assignment check also the method AddConfiguration.
   * @param options
   * @param options.name
   * @param options.configuration
   */
  @v2
  async createProfile({ name, configuration }: CreateProfileExtended): Promise<ReferenceToken> {
    const [data] = await this.onvif.request({
      service : 'media2',
      body    : '<CreateProfile xmlns="http://www.onvif.org/ver20/media/wsdl">'
        + `<Name>${name}</Name>${
          configuration
            ? `<Configuration>${configuration.map((configurationRef) => (
              `<Type>${configurationRef.type}</Type>${
                configurationRef.token ? `<Token>${configurationRef.token}</Token>` : ''}`
            ))}</Configuration>`
            : ''
        }</CreateProfile>`,
    });
    return linerase(data).createProfileResponse.token;
  }

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
  @v2
  async addConfiguration({ profileToken, name, configuration }: AddConfigurationExtended): Promise<void> {
    const body = '<AddConfiguration xmlns="http://www.onvif.org/ver20/media/wsdl">'
      + `<ProfileToken>${profileToken}</ProfileToken>${
        name !== undefined ? `<Name>${name}</Name>` : ''
      }${
        configuration
          ? configuration.map((configurationRef) => (
            `<Configuration><Type>${configurationRef.type}</Type>${
              configurationRef.token ? `<Token>${configurationRef.token}</Token></Configuration>` : ''}`
          )).join('')
          : ''
      }</AddConfiguration>`;
    await this.onvif.request({
      service : 'media2',
      body,
    });
  }

  /**
   * This operation removes one or more configurations from an existing media profile. Tokens appearing in the
   * configuration list shall be ignored. Presence of the "All" type shall result in an empty profile. Removing a
   * non-existing configuration shall be ignored and not result in an error. A device supporting the Media2 service
   * shall support this command
   * @param options
   * @param options.profileToken
   * @param options.configuration
   */
  @v2
  async removeConfiguration({ profileToken, configuration }: RemoveConfigurationExtended): Promise<void> {
    await this.onvif.request({
      service : 'media2',
      body    : '<RemoveConfiguration xmlns="http://www.onvif.org/ver20/media/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>${
          configuration?.length
            ? configuration
              .map((configurationRef) => `<Configuration><Type>${configurationRef.type}</Type></Configuration>`)
            : ''
        }</RemoveConfiguration>`,
    });
  }

  /**
   * This operation deletes a profile. The device shall support the deletion of a media profile through the DeletePro-
   * file command.
   * A device signaling support for MultiTrackStreaming shall support deleting of virtual profiles via the command.
   * Note that deleting a profile of a virtual profile set may invalidate the virtual profile.
   * @param options
   * @param options.token
   */
  @v2
  async deleteProfile({ token }: DeleteProfile): Promise<void> {
    await this.onvif.request({
      service : 'media2',
      body    : '<DeleteProfile xmlns="http://www.onvif.org/ver20/media/wsdl">'
        + `<Token>${token}</Token>`
        + '</DeleteProfile>',
    });
  }

  /**
   * Common function to get configurations
   * @private
   * @param options
   * @param options.profileToken
   * @param options.configurationToken
   */
  @v2
  private async getConfigurations({ entityName, profileToken, configurationToken }: GetConfigurationExtended): Promise<ConfigurationEntityExtended[]> {
    const body = `<Get${entityName}Configurations xmlns="http://www.onvif.org/ver20/media/wsdl">${
      profileToken !== undefined ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }${configurationToken !== undefined ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }</Get${entityName}Configurations>`;
    const [data] = await this.onvif.request({
      service : 'media2',
      body,
    });
    return linerase(data, { array : ['configurations'] })[`get${entityName}ConfigurationsResponse`].configurations;
  }

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
  @v2
  async getVideoSourceConfigurations(options: GetVideoSourceConfigurations): Promise<VideoSourceConfiguration[]> {
    return this.getConfigurations({ entityName : 'VideoSource', ...options });
  }

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
  @v2
  async getVideoEncoderConfigurations(options: GetVideoEncoderConfigurations): Promise<VideoEncoder2Configuration[]> {
    return this.getConfigurations({ entityName : 'VideoEncoder', ...options });
  }

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
  @v2
  async getAudioSourceConfigurations(options: GetVideoSourceConfigurations): Promise<AudioSourceConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioSource', ...options });
  }

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
  @v2
  async getAudioEncoderConfigurations(options: GetAudioEncoderConfigurations): Promise<AudioEncoder2Configuration[]> {
    return this.getConfigurations({ entityName : 'AudioEncoder', ...options });
  }

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
  @v2
  async getAnalyticsConfigurations(options: GetAnalyticsConfigurations): Promise<VideoAnalyticsConfiguration[]> {
    return this.getConfigurations({ entityName : 'Analytics', ...options });
  }

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
  @v2
  async getMetadataConfigurations(options: GetMetadataConfigurations): Promise<MetadataConfiguration[]> {
    return this.getConfigurations({ entityName : 'Metadata', ...options });
  }

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
  @v2
  async getAudioOutputConfigurations(options: GetAudioOutputConfigurations): Promise<AudioOutputConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioOutput', ...options });
  }

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
  @v2
  async getAudioDecoderConfigurations(options: GetAudioDecoderConfigurations): Promise<AudioDecoderConfiguration[]> {
    return this.getConfigurations({ entityName : 'AudioDecoder', ...options });
  }

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
   * @param options.profileToken
   * @param options.configurationToken
   */
  @v2
  private async getWebRTCConfigurations(options: GetWebRTCConfigurations): Promise<WebRTCConfiguration[]> {
    // return this.getConfigurations({ entityName : 'WebRTC', ...options });
    return [];
  }
}

function v2(originalMethod: any, context: ClassMethodDecoratorContext) {
  return function v2(this: any, ...args: any[]) {
    if (!this.onvif.device.media2Support) {
      throw new Error('Media2 is not supported for this device');
    }
    return originalMethod.call(this, ...args);
  };
}
