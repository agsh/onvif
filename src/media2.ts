/**
 * Media ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media2-Service-Spec.pdf
 * @see http://www.onvif.org/ver20/media/wsdl
 */

import { Onvif, OnvifServices } from './onvif';
import Service from './service';
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
  WebRTCConfiguration,
  GetStreamUriResponse,
  GetSnapshotUri,
  GetSnapshotUriResponse,
  GetAudioSourceConfigurations,
  GetVideoEncoderInstances,
  EncoderInstanceInfo,
  SetSynchronizationPoint,
  StartMulticastStreaming,
  StopMulticastStreaming,
  GetVideoSourceModes,
  VideoSourceMode,
  SetVideoSourceMode,
  GetOSDs,
  GetOSDOptions,
  DeleteOSD,
  GetMasks,
  Mask,
  CreateOSDResponse,
  CreateMaskResponse,
  GetMaskOptions,
  MaskOptions,
  DeleteMask,
  Capabilities2,
} from './interfaces/media.2';
import { toOnvifXMLSchemaObject } from './utils';
import { ReferenceToken } from './interfaces/common';
import {
  AudioDecoderConfiguration,
  AudioDecoderConfigurationOptions,
  AudioEncoder2Configuration,
  AudioEncoderConfigurationOption,
  AudioOutputConfiguration,
  AudioOutputConfigurationOptions,
  AudioSourceConfiguration,
  AudioSourceConfigurationOptions,
  MetadataConfiguration,
  MetadataConfigurationOptions,
  OSDConfiguration,
  OSDConfigurationOptions,
  VideoAnalyticsConfiguration,
  VideoEncoder2Configuration,
  VideoEncoder2ConfigurationOptions,
  VideoSourceConfiguration,
  VideoSourceConfigurationOptions,
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

type ConfigurationEntityExtended = VideoSourceConfiguration &
  AudioSourceConfiguration &
  VideoEncoder2Configuration &
  AudioEncoder2Configuration &
  VideoAnalyticsConfiguration &
  MetadataConfiguration &
  AudioOutputConfigurationExtended &
  WebRTCConfiguration &
  AudioDecoderConfiguration;

interface GetStreamUri {
  profileToken?: ReferenceToken;
  protocol?: 'RtspUnicast' | 'RtspMulticast' | 'RTSP' | 'RtspOverHttp';
}

export interface AudioOutputConfigurationExtended extends AudioOutputConfiguration {
  sendPrimacy:
    | 'www.onvif.org/ver20/HalfDuplex/Server'
    | 'www.onvif.org/ver20/HalfDuplex/Client'
    | 'www.onvif.org/ver20/HalfDuplex/Auto';
}

/**
 * Media service, ver20 profile
 */
export class Media2 extends Service {
  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
  }

  /**
   * Returns the capabilities of the media service. The result is returned in a typed answer.
   */
  @v2
  async getServiceCapabilities(): Promise<Capabilities2> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse.capabilities;
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
  async getProfiles({ token, type }: GetProfiles = {}): Promise<MediaProfile[]> {
    const response = await this.request(
      {
        GetProfiles: {
          ...(token !== undefined && { Token: token }),
          Type: type !== undefined ? type.join(' ') : 'All',
        },
      },
      { array: ['profiles'] },
    );
    return response.getProfilesResponse.profiles;
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
    const response = await this.request({
      CreateProfile: {
        Name: name,
        ...(configuration && {
          Configuration: configuration.map((configurationRef) => ({
            Type: configurationRef.type,
            ...(configurationRef.token && { Token: configurationRef.token }),
          })),
        }),
      },
    });
    return response.createProfileResponse.token;
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
    await this.request({
      AddConfiguration: {
        ProfileToken: profileToken,
        ...(name !== undefined && { Name: name }),
        ...(configuration && {
          Configuration: configuration.map((configurationRef) => ({
            Type: configurationRef.type,
            ...(configurationRef.token && { Token: configurationRef.token }),
          })),
        }),
      },
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
    await this.request({
      RemoveConfiguration: {
        ProfileToken: profileToken,
        ...(configuration?.length && {
          Configuration: configuration.map((configurationRef) => ({
            Type: configurationRef.type,
          })),
        }),
      },
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
    await this.request({
      DeleteProfile: {
        Token: token,
      },
    });
  }

  /**
   * Common function to get configurations
   * @private
   * @param options
   * @param options.entityName
   * @param options.profileToken
   * @param options.configurationToken
   */
  @v2
  private async getConfigurations({
    entityName,
    profileToken,
    configurationToken,
  }: GetConfigurationExtended): Promise<ConfigurationEntityExtended[]> {
    const response = await this.request(
      {
        [`Get${entityName}Configurations`]: {
          ...(profileToken !== undefined && { ProfileToken: profileToken }),
          ...(configurationToken !== undefined && { ConfigurationToken: configurationToken }),
        },
      },
      { array: ['configurations'] },
    );
    return response[`get${entityName}ConfigurationsResponse`].configurations;
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
  async getVideoSourceConfigurations(options?: GetVideoSourceConfigurations): Promise<VideoSourceConfiguration[]> {
    return this.getConfigurations({ entityName: 'VideoSource', ...options });
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
  async getVideoEncoderConfigurations(options?: GetVideoEncoderConfigurations): Promise<VideoEncoder2Configuration[]> {
    return this.getConfigurations({ entityName: 'VideoEncoder', ...options });
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
  async getAudioSourceConfigurations(options?: GetAudioSourceConfigurations): Promise<AudioSourceConfiguration[]> {
    return this.getConfigurations({ entityName: 'AudioSource', ...options });
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
  async getAudioEncoderConfigurations(options?: GetAudioEncoderConfigurations): Promise<AudioEncoder2Configuration[]> {
    return this.getConfigurations({ entityName: 'AudioEncoder', ...options });
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
  async getAnalyticsConfigurations(options?: GetAnalyticsConfigurations): Promise<VideoAnalyticsConfiguration[]> {
    return this.getConfigurations({ entityName: 'Analytics', ...options });
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
  async getMetadataConfigurations(options?: GetMetadataConfigurations): Promise<MetadataConfiguration[]> {
    return this.getConfigurations({ entityName: 'Metadata', ...options });
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
  async getAudioOutputConfigurations(
    options?: GetAudioOutputConfigurations,
  ): Promise<AudioOutputConfigurationExtended[]> {
    return this.getConfigurations({ entityName: 'AudioOutput', ...options });
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
  async getAudioDecoderConfigurations(options?: GetAudioDecoderConfigurations): Promise<AudioDecoderConfiguration[]> {
    return this.getConfigurations({ entityName: 'AudioDecoder', ...options });
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
   * @experimental
   */
  @v2
  protected async getWebRTCConfigurations(): Promise<WebRTCConfiguration[]> {
    const response = await this.request({ GetWebRTCConfigurations: {} }, { array: ['webRTCConfiguration'] });
    return response.getWebRTCConfigurationsResponse.webRTCConfiguration;
  }

  /**
   * This operation modifies a video encoder configuration. Running streams using this configuration may be immediately
   * updated according to the new settings. The changes are not guaranteed to take effect unless the client requests a
   * new stream URI and restarts any affected stream. NVC methods for changing a running stream are out of scope for
   * this specification.
   * SessionTimeout is provided as a hint for keeping rtsp session by a device. If necessary the device may adapt
   * parameter values for SessionTimeout elements without returning an error. For the time between keep alive calls the
   * client shall adhere to the timeout value signaled via RTSP.
   * @param configuration
   */
  @v2
  async setVideoEncoderConfiguration(configuration: VideoEncoder2Configuration): Promise<void> {
    await this.request({
      SetVideoEncoderConfiguration: {
        Configuration: {
          $: {
            token: configuration.token,
            GovLength: configuration.govLength,
            AnchorFrameDistance: configuration.anchorFrameDistance,
            Profile: configuration.profile,
            GuaranteedFrameRate: configuration.guaranteedFrameRate,
            Signed: configuration.signed,
          },
          Name: configuration.name,
          UseCount: configuration.useCount,
          Encoding: configuration.encoding,
          Resolution: {
            Width: configuration.resolution.width,
            Height: configuration.resolution.height,
          },
          ...(configuration.rateControl && {
            RateControl: {
              ConstantBitRate: configuration.rateControl.constantBitRate,
              FrameRateLimit: configuration.rateControl.frameRateLimit,
              BitrateLimit: configuration.rateControl.bitrateLimit,
            },
          }),
          ...(configuration.multicast && {
            Multicast: {
              Address: {
                Type: configuration.multicast.address.type,
                IPv4Address: configuration.multicast.address.IPv4Address,
                IPv6Address: configuration.multicast.address.IPv6Address,
              },
              Port: configuration.multicast.port,
              TTL: configuration.multicast.TTL,
              AutoStart: configuration.multicast.autoStart,
            },
          }),
          Quality: configuration.quality,
        },
      },
    });
  }

  /**
   * This operation modifies a video source configuration. Running streams using this configuration may be immediately
   * updated according to the new settings. The changes are not guaranteed to take effect unless the client requests a
   * new stream URI and restarts any affected stream. NVC methods for changing a running stream are out of scope for
   * this specification.
   * @param configuration
   */
  @v2
  async setVideoSourceConfiguration(configuration: VideoSourceConfiguration): Promise<void> {
    await this.request({
      SetVideoSourceConfiguration: {
        Configuration: {
          $: {
            token: configuration.token,
            ViewMode: configuration.viewMode,
          },
          Name: configuration.name,
          UseCount: configuration.useCount,
          SourceToken: configuration.sourceToken,
          Bounds: {
            $: {
              x: configuration.bounds.x,
              y: configuration.bounds.y,
              width: configuration.bounds.width,
              height: configuration.bounds.height,
            },
          },
          ...(configuration.extension && {
            Extension: {
              ...(configuration.extension.rotate && {
                Rotate: {
                  Mode: configuration.extension.rotate.mode,
                  Degree: configuration.extension.rotate.degree,
                },
              }),
              ...(configuration.extension.extension && {
                Extension: {
                  LensDescription: configuration.extension.extension.lensDescription?.map((lensDescription) => ({
                    FocalLength: lensDescription.focalLength,
                    Offset: {
                      $: {
                        x: lensDescription.offset.x,
                        y: lensDescription.offset.y,
                      },
                    },
                    Projection: lensDescription.projection?.map((lensProjection) => ({
                      Angle: lensProjection.angle,
                      Radius: lensProjection.radius,
                      Transmittance: lensProjection.transmittance,
                    })),
                    XFactor: lensDescription.XFactor,
                  })),
                  ...(configuration.extension.extension.sceneOrientation && {
                    SceneOrientation: {
                      mode: configuration.extension.extension.sceneOrientation.mode,
                      orientation: configuration.extension.extension.sceneOrientation.orientation,
                    },
                  }),
                },
              }),
            },
          }),
        },
      },
    });
  }

  /**
   * This operation modifies an audio encoder configuration. Running streams using this configuration may be immediately
   * updated according to the new settings. The changes are not guaranteed to take effect unless the client requests a
   * new stream URI and restarts any affected streams. NVC methods for changing a running stream are out of scope for
   * this specification.
   * @param configuration
   */
  @v2
  async setAudioEncoderConfiguration(configuration: AudioEncoder2Configuration): Promise<void> {
    await this.request({
      SetAudioEncoderConfiguration: {
        Configuration: {
          $: {
            token: configuration.token,
          },
          Name: configuration.name,
          UseCount: configuration.useCount,
          Encoding: configuration.encoding,
          ...(configuration.multicast && {
            Multicast: {
              Address: {
                Type: configuration.multicast.address.type,
                IPv4Address: configuration.multicast.address.IPv4Address,
                IPv6Address: configuration.multicast.address.IPv6Address,
              },
              Port: configuration.multicast.port,
              TTL: configuration.multicast.TTL,
              AutoStart: configuration.multicast.autoStart,
            },
          }),
          Bitrate: configuration.bitrate,
          SampleRate: configuration.sampleRate,
        },
      },
    });
  }

  /**
   * This operation modifies an audio source configuration. Running streams using this configuration may be immediately
   * updated according to the new settings. The changes are not guaranteed to take effect unless the client requests a
   * new stream URI and restarts any affected stream NVC methods for changing a running stream are out of scope for this
   * specification.
   * @param configuration
   */
  @v2
  async setAudioSourceConfiguration(configuration: AudioSourceConfiguration): Promise<void> {
    await this.request({
      SetAudioSourceConfiguration: {
        Configuration: {
          $: {
            token: configuration.token,
          },
          Name: configuration.name,
          UseCount: configuration.useCount,
          SourceToken: configuration.sourceToken,
        },
      },
    });
  }

  /**
   * This operation modifies a metadata configuration. Running streams using this configuration may be updated
   * immediately according to the new settings. The changes are not guaranteed to take effect unless the client requests
   * a new stream URI and restarts any affected streams. NVC methods for changing a running stream are out of scope for
   * this specification.
   * @param configuration
   */
  @v2
  async setMetadataConfiguration(configuration: MetadataConfiguration): Promise<void> {
    await this.request({
      SetMetadataConfiguration: {
        Configuration: {
          $: {
            token: configuration.token,
            CompressionType: configuration.compressionType,
            GeoLocation: configuration.geoLocation,
            ShapePolygon: configuration.shapePolygon,
          },
          Name: configuration.name,
          UseCount: configuration.useCount,
          ...(configuration.PTZStatus && {
            PTZStatus: {
              Status: configuration.PTZStatus.status,
              Position: configuration.PTZStatus.position,
              FieldOfView: configuration.PTZStatus.fieldOfView,
            },
          }),
          ...(configuration.events && {
            Events: {
              Filter: configuration.events.filter,
              SubscriptionPolicy: configuration.events.filter,
            },
          }),
          Analytics: configuration.analytics,
          ...(configuration.multicast && {
            Multicast: {
              Address: {
                Type: configuration.multicast.address.type,
                IPv4Address: configuration.multicast.address.IPv4Address,
                IPv6Address: configuration.multicast.address.IPv6Address,
              },
              Port: configuration.multicast.port,
              TTL: configuration.multicast.TTL,
              AutoStart: configuration.multicast.autoStart,
            },
          }),
          SessionTimeout: configuration.sessionTimeout,
          ...(configuration.analyticsEngineConfiguration && {
            AnalyticsEngineConfiguration: {
              ...(configuration.analyticsEngineConfiguration.analyticsModule && {
                AnalyticsModule: configuration.analyticsEngineConfiguration.analyticsModule.map(
                  toOnvifXMLSchemaObject.config,
                ),
              }),
              ...(configuration.analyticsEngineConfiguration.extension && {
                Extension: configuration.analyticsEngineConfiguration.extension,
              }),
            },
          }),
          ...(configuration.extension && {
            Extension: configuration.extension,
          }),
        },
      },
    });
  }

  /**
   * This operation modifies an audio output configuration.
   * @param configuration
   */
  @v2
  async setAudioOutputConfiguration(configuration: AudioOutputConfigurationExtended): Promise<void> {
    configuration.sendPrimacy = 'www.onvif.org/ver20/HalfDuplex/Server';
    await this.request({
      SetAudioOutputConfiguration: {
        Configuration: {
          $: {
            token: configuration.token,
          },
          Name: configuration.name,
          UseCount: configuration.useCount,
          OutputToken: configuration.outputToken,
          SendPrimacy: configuration.sendPrimacy,
        },
      },
    });
  }

  /**
   * This operation modifies an audio decoder configuration.
   * @param configuration
   */
  @v2
  async setAudioDecoderConfiguration(configuration: AudioDecoderConfiguration): Promise<void> {
    configuration.sendPrimacy = 'www.onvif.org/ver20/HalfDuplex/Server';
    await this.request({
      SetAudioDecoderConfiguration: {
        Configuration: {
          $: {
            token: configuration.token,
          },
          Name: configuration.name,
          UseCount: configuration.useCount,
        },
      },
    });
  }

  private async getConfigurationOptions(options: GetConfiguration & { entityName: string }): Promise<any> {
    const { configurationToken, profileToken, entityName } = options;
    const response = await this.request(
      {
        [`Get${entityName}ConfigurationOptions`]: {
          ConfigurationToken: configurationToken,
          ProfileToken: profileToken,
        },
      },
      { array: ['configurations'] },
    );
    return response[`get${entityName}ConfigurationOptionsResponse`].options;
  }

  /**
   * This operation returns the available options (supported values and ranges for video source configuration
   * parameters) when the video source parameters are reconfigured If a video source configuration is specified, the
   * options shall concern that particular configuration. If a media profile is specified, the options shall be
   * compatible with that media profile.
   * @param options
   */
  @v2
  async getVideoSourceConfigurationOptions(options: GetConfiguration = {}): Promise<VideoSourceConfigurationOptions> {
    return this.getConfigurationOptions({ ...options, entityName: 'VideoSource' });
  }

  /**
   * This operation returns the available options (supported values and ranges for video encoder configuration
   * parameters) when the video encoder parameters are reconfigured.
   *
   * This response contains the available video encoder configuration options. If a video encoder configuration is
   * specified, the options shall concern that particular configuration. If a media profile is specified, the options
   * shall be compatible with that media profile. If no tokens are specified, the options shall be considered generic
   * for the device.
   * @param options
   */
  @v2
  async getVideoEncoderConfigurationOptions(
    options: GetConfiguration = {},
  ): Promise<VideoEncoder2ConfigurationOptions[]> {
    return this.getConfigurationOptions({ ...options, entityName: 'VideoEncoder' });
  }

  /**
   * This operation returns the available options (supported values and ranges for audio source configuration
   * parameters) when the audio source parameters are reconfigured. If an audio source configuration is specified, the
   * options shall concern that particular configuration. If a media profile is specified, the options shall be
   * compatible with that media profile.
   * @param options
   */
  @v2
  async getAudioSourceConfigurationOptions(options: GetConfiguration = {}): Promise<AudioSourceConfigurationOptions> {
    return this.getConfigurationOptions({ ...options, entityName: 'AudioSource' });
  }

  /**
   * This operation returns the available options (supported values and ranges for audio encoder configuration
   * parameters) when the audio encoder parameters are reconfigured.
   * @param options
   */
  @v2
  async getAudioEncoderConfigurationOptions(
    options: GetConfiguration = {},
  ): Promise<AudioEncoderConfigurationOption[]> {
    return this.getConfigurationOptions({ ...options, entityName: 'AudioEncoder' });
  }

  /**
   * This operation returns the available options (supported values and ranges for metadata configuration parameters)
   * for changing the metadata configuration.
   * @param options
   */
  @v2
  async getMetadataConfigurationOptions(options: GetConfiguration = {}): Promise<MetadataConfigurationOptions> {
    return this.getConfigurationOptions({ ...options, entityName: 'Metadata' });
  }

  /**
   * This operation returns the available options (supported values and ranges for audio output configuration
   * parameters) for configuring an audio output. To retrieve the EQPresetList, a valid ConfigurationToken must be
   * provided. If EQPreset is supported and isFrequencyDecibelEditable is signaled as true, the response shall include
   * the FrequencyDecibelPair.
   * @param options
   */
  @v2
  async getAudioOutputConfigurationOptions(options: GetConfiguration = {}): Promise<AudioOutputConfigurationOptions> {
    return this.getConfigurationOptions({ ...options, entityName: 'AudioOutput' });
  }

  /**
   * This command list the audio decoding capabilities for a given profile and configuration of a device.
   * @param options
   */
  @v2
  async getAudioDecoderConfigurationOptions(options: GetConfiguration = {}): Promise<AudioDecoderConfigurationOptions> {
    return this.getConfigurationOptions({ ...options, entityName: 'AudioDecoder' });
  }

  /**
   * The GetVideoEncoderInstances command can be used to request the minimum number of guaranteed video encoder
   * instances (applications) per Video Source Configuration.
   * @param options
   */
  @v2
  async getVideoEncoderInstances(options: GetVideoEncoderInstances): Promise<EncoderInstanceInfo> {
    const { configurationToken } = options;
    const response = await this.request({
      GetVideoEncoderInstances: {
        ConfigurationToken: configurationToken,
      },
    });
    return response.getVideoEncoderInstancesResponse.info;
  }

  @v2
  async setSynchronizationPoint({ profileToken }: SetSynchronizationPoint) {
    await this.request({
      SetSynchronizationPoint: {
        ProfileToken: profileToken,
      },
    });
  }

  /**
   * This command starts multicast streaming using a specified media profile of a device. Streaming continues until
   * StopMulticastStreaming is called for the same Profile. The streaming shall continue after a reboot of the device
   * until a StopMulticastStreaming request is received. The multicast address, port and TTL are configured in the
   * VideoEncoderConfiguration, AudioEncoderConfiguration and MetadataConfiguration respectively.
   * @param profileToken
   */
  @v2
  async startMulticastStreaming({ profileToken }: StartMulticastStreaming = {}): Promise<void> {
    await this.request({
      StartMulticastStreaming: {
        ProfileToken: profileToken ?? this.onvif.activeSource?.profileToken,
      },
    });
  }

  /**
   * This command stops multicast streaming using a specified media profile of a device
   * @param profileToken
   */
  @v2
  async stopMulticastStreaming({ profileToken }: StopMulticastStreaming = {}): Promise<void> {
    await this.request({
      StopMulticastStreaming: {
        ProfileToken: profileToken ?? this.onvif.activeSource?.profileToken,
      },
    });
  }

  /**
   * A device returns the information for current video source mode and settable video source modes of specified video
   * source. A device that indicates a capability of VideoSourceModes shall support this command.
   * @param options
   */
  @v2
  async getVideoSourceModes(options?: GetVideoSourceModes): Promise<VideoSourceMode[]> {
    const videoSourceToken = options?.videoSourceToken ?? this.onvif.activeSource?.videoSourceToken;
    const response = await this.request(
      {
        GetVideoSourceModes: {
          VideoSourceToken: videoSourceToken,
        },
      },
      { array: ['videoSourceModes'] },
    );
    const modes = response.getVideoSourceModesResponse.videoSourceModes ?? [];
    return modes.map((mode: any) => ({ ...mode, encodings: mode.encodings.split(' ') }));
  }

  /**
   * SetVideoSourceMode changes the media profile structure relating to video source for the specified video source
   * mode. A device that indicates a capability of VideoSourceModes shall support this command. The behavior after
   * changing the mode is not defined in this specification.
   * @param options
   */
  @v2
  async setVideoSourceMode({ videoSourceToken, videoSourceModeToken }: SetVideoSourceMode): Promise<void> {
    await this.request({
      SetVideoSourceMode: {
        VideoSourceToken: videoSourceToken,
        VideoSourceModeToken: videoSourceModeToken,
      },
    });
  }

  /**
   * This operation lists existing OSD configurations for the device.
   * - If an OSD token is provided the device shall respond with the requested configuration or provide an error if it does not exist.
   * - In case only a video source configuration token is provided the device shall respond with all configurations that exist for the video source configuration.
   * - If no tokens are provided the device shall respond with all available OSD configurations.
   * @param options
   */
  @v2
  async getOSDs(options?: GetOSDs): Promise<OSDConfiguration[]> {
    const { configurationToken, OSDToken } = options ?? {};
    const response = await this.request(
      {
        GetOSDs: {
          OSDToken: OSDToken,
          ConfigurationToken: configurationToken,
        },
      },
      { array: ['OSDs'] },
    );
    return response.getOSDsResponse.OSDs;
  }

  /**
   * Set the OSD
   * @param options
   */
  @v2
  async setOSD(options: OSDConfiguration): Promise<void> {
    await this.request({
      SetOSD: {
        OSD: {
          $: {
            token: options.token,
          },
          VideoSourceConfigurationToken: options.videoSourceConfigurationToken,
          Type: options.type,
          Position: {
            Type: options.position.type,
            Pos: options.position.pos,
            ...(options.position.extension && { Extension: options.position.extension }),
          },
          ...(options.textString && {
            TextString: {
              IsPersistentText: options.textString.isPersistentText,
              Type: options.textString.type,
              DateFormat: options.textString.dateFormat,
              TimeFormat: options.textString.timeFormat,
              FontSize: options.textString.fontSize,
              ...(options.textString.fontColor && {
                FontColor: {
                  Color: options.textString.fontColor.color,
                  Transparent: options.textString.fontColor.transparent,
                },
              }),
              ...(options.textString.backgroundColor && {
                BackgroundColor: {
                  Color: options.textString.backgroundColor.color,
                  Transparent: options.textString.backgroundColor.transparent,
                },
              }),
              PlainText: options.textString.plainText,
              Extension: options.textString.extension,
            },
          }),
          ...(options.image && {
            Image: {
              ImgPath: options.image.imgPath,
              Extension: options.image.extension,
            },
          }),
          Extension: options.extension,
        },
      },
    });
  }

  /**
   * Get the OSD Options.
   * @param configurationToken
   */
  @v2
  async getOSDOptions({ configurationToken }: GetOSDOptions): Promise<OSDConfigurationOptions> {
    const response = await this.request({
      GetOSDOptions: {
        ConfigurationToken: configurationToken,
      },
    });
    return response.getOSDOptionsResponse.OSDOptions;
  }

  /**
   * Create the OSD.
   * NB!: Unlike the reference implementation, this method returns the generated configuration, since not all
   * implementations allow you to specify the token yourself; it is often generated on the server side.
   * @param options
   */
  @v2
  async createOSD(options: OSDConfiguration): Promise<CreateOSDResponse> {
    const response = await this.request({
      CreateOSD: {
        OSD: {
          $: {
            token: options.token,
          },
          VideoSourceConfigurationToken: options.videoSourceConfigurationToken,
          Type: options.type,
          Position: {
            Type: options.position.type,
            Pos: options.position.pos,
            ...(options.position.extension && { Extension: options.position.extension }),
          },
          ...(options.textString && {
            TextString: {
              IsPersistentText: options.textString.isPersistentText,
              Type: options.textString.type,
              DateFormat: options.textString.dateFormat,
              TimeFormat: options.textString.timeFormat,
              FontSize: options.textString.fontSize,
              ...(options.textString.fontColor && {
                FontColor: {
                  Color: options.textString.fontColor.color,
                  Transparent: options.textString.fontColor.transparent,
                },
              }),
              ...(options.textString.backgroundColor && {
                BackgroundColor: {
                  Color: options.textString.backgroundColor.color,
                  Transparent: options.textString.backgroundColor.transparent,
                },
              }),
              PlainText: options.textString.plainText,
              Extension: options.textString.extension,
            },
          }),
          ...(options.image && {
            Image: {
              ImgPath: options.image.imgPath,
              Extension: options.image.extension,
            },
          }),
          Extension: options.extension,
        },
      },
    });
    return response.createOSDResponse;
  }

  /**
   * Delete the OSD.
   * @param OSDToken
   */
  @v2
  async deleteOSD({ OSDToken }: DeleteOSD): Promise<void> {
    await this.request({
      DeleteOSD: {
        OSDToken,
      },
    });
  }

  /**
   * This operation lists existing Mask configurations for the device.
   * - If an Mask token is provided the device shall respond with the requested configuration or provide an error if it does not exist.
   * - In case only a video source configuration token is provided the device shall respond with all configurations that exist for the video source configuration.
   * - If no tokens are provided the device shall respond with all available Mask configurations.
   * @param options
   */
  @v2
  async getMasks(options?: GetMasks): Promise<Mask[]> {
    const { configurationToken, token } = options ?? {};
    const response = await this.request(
      {
        GetMasks: {
          Token: token,
          ConfigurationToken: configurationToken,
        },
      },
      { array: ['masks'] },
    );
    return response.getMasksResponse.masks ?? [];
  }

  /**
   * Create the Mask.
   * @param options
   * @example
   * const { token } = await cam.media2.createMask({
   *     type: 'Color',
   *     token: 'mask_token_1',
   *     color: { X: 1, Y: 2, Z: 3, colorspace: 'http://www.onvif.org/ver10/colorspace/YCbCr' },
   *     configurationToken: 'VideoSourceConfigurationToken_1',
   *     enabled: true,
   *     polygon: {
   *       point: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }],
   *     }
   *   });
   */
  async createMask(options: Mask): Promise<CreateMaskResponse> {
    const response = await this.request({
      CreateMask: {
        Mask: {
          $: {
            token: options.token,
          },
          ConfigurationToken: options.configurationToken,
          Polygon: {
            Point: options.polygon.point?.map((point) => ({
              $: {
                x: point.x,
                y: point.y,
              },
            })),
          },
          Name: options.name,
          Type: options.type,
          ...(options.color && {
            Color: {
              $: {
                Colorspace: options.color.colorspace,
                Likelihood: options.color.likelihood,
                X: options.color.x,
                Y: options.color.y,
                Z: options.color.z,
              },
            },
          }),
          Enabled: options.enabled,
        },
      },
    });
    return response.createMaskResponse;
  }

  /**
   * Set the Mask
   * @see {@link createMask}
   * @param options
   */
  @v2
  async setMask(options: Mask): Promise<void> {
    await this.request({
      SetMask: {
        Mask: {
          $: {
            token: options.token,
          },
          ConfigurationToken: options.configurationToken,
          Polygon: {
            Point: options.polygon.point?.map((point) => ({
              $: {
                x: point.x,
                y: point.y,
              },
            })),
          },
          Name: options.name,
          Type: options.type,
          ...(options.color && {
            Color: {
              $: {
                Colorspace: options.color.colorspace,
                Likelihood: options.color.likelihood,
                X: options.color.x,
                Y: options.color.y,
                Z: options.color.z,
              },
            },
          }),
          Enabled: options.enabled,
        },
      },
    });
  }

  /**
   * Get the Mask Options.
   * @param configurationToken
   * @example
   * const res = await cam.media2.getMaskOptions({ configurationToken: 'MaskToken_1' });
   * console.log(res.types);
   */
  @v2
  async getMaskOptions({ configurationToken }: GetMaskOptions): Promise<MaskOptions> {
    const response = await this.request({
      GetMaskOptions: {
        ConfigurationToken: configurationToken,
      },
    });
    return response.getMaskOptionsResponse.options;
  }

  /**
   * Delete the Mask.
   * @param token
   */
  @v2
  async deleteMask({ token }: DeleteMask): Promise<void> {
    await this.request({
      DeleteMask: {
        Token: token,
      },
    });
  }

  /**
   * This operation requests a URI that can be used to initiate a live media stream using RTSP as the control protocol.
   * The returned URI shall remain valid indefinitely even if the profile is changed.
   *
   * Defined stream types are:
   *     RtspUnicast RTSP streaming RTP as UDP Unicast.
   *     RtspMulticast RTSP streaming RTP as UDP Multicast.
   *     RTSP RTSP streaming RTP over TCP.
   *     RtspOverHttp Tunneling both the RTSP control channel and the RTP stream over HTTP or HTTPS.
   *
   * If a multicast stream is requested at least one of VideoEncoder2Configuration, AudioEncoder2Configuration and
   * MetadataConfiguration shall have a valid multicast setting.
   */
  @v2
  async getStreamUri({ protocol = 'RtspUnicast', profileToken }: GetStreamUri): Promise<GetStreamUriResponse> {
    const response = await this.request({
      GetStreamUri: {
        Protocol: protocol,
        ProfileToken: profileToken ?? this.onvif.activeSource?.profileToken,
      },
    });
    return response.getStreamUriResponse;
  }

  @v2
  async getSnapshotUri(options?: GetSnapshotUri): Promise<GetSnapshotUriResponse> {
    const { profileToken } = options ?? {};
    const response = await this.request({
      GetSnapshotUri: {
        ProfileToken: profileToken ?? this.onvif.activeSource?.profileToken,
      },
    });
    return response.getSnapshotUriResponse;
  }
}
function v2(originalMethod: any, context: ClassMethodDecoratorContext) {
  return function v2(this: any, ...args: any[]) {
    if (!this.onvif.device.media2Support) {
      throw new Error('Media2 profile is not supported for this device');
    }
    return originalMethod.call(this, ...args);
  };
}
