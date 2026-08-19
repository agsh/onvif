/**
 * Analytics Device ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/analyticsDevice/wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { AnyURI } from './interfaces/basics';
import {
  AnalyticsDeviceEngineConfiguration,
  AnalyticsEngine,
  AnalyticsEngineControl,
  AnalyticsEngineInput,
  AnalyticsEngineInputInfo,
  AnalyticsStateInformation,
  EngineConfiguration,
  MetadataInput,
  SourceIdentification,
  VideoAnalyticsConfiguration,
  VideoEncoderConfiguration,
} from './interfaces/onvif';
import {
  Capabilities,
  CreateAnalyticsEngineControl,
  CreateAnalyticsEngineControlResponse,
  CreateAnalyticsEngineInputs,
  CreateAnalyticsEngineInputsResponse,
  DeleteAnalyticsEngineControl,
  DeleteAnalyticsEngineInputs,
  GetAnalyticsDeviceStreamUri,
  GetAnalyticsEngine,
  GetAnalyticsEngineControl,
  GetAnalyticsEngineInput,
  GetAnalyticsState,
  GetVideoAnalyticsConfiguration,
  SetAnalyticsEngineControl,
  SetAnalyticsEngineInput,
  SetVideoAnalyticsConfiguration,
} from './interfaces/analyticsdevice';
import { config, multicastConfiguration, streamSetupToBuild } from './utils/toOnvifXMLSchemaObject';

/**
 * Analytics Device service
 */
export class AnalyticsDevice extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'analyticsdevice');
  }

  private static tokensToBuild(tokens?: string[]) {
    if (!tokens?.length) {
      return undefined;
    }
    return tokens.length === 1 ? tokens[0] : tokens;
  }

  private static configurationEntityToBuild(configuration: { token: string; name: string; useCount: number }) {
    return {
      $: { token: configuration.token },
      Name: configuration.name,
      UseCount: configuration.useCount,
    };
  }

  private static sourceIdentificationToBuild(sourceIdentification: SourceIdentification) {
    return {
      Name: sourceIdentification.name,
      ...(sourceIdentification.token && {
        Token: AnalyticsDevice.tokensToBuild(sourceIdentification.token),
      }),
      ...(sourceIdentification.extension && { Extension: sourceIdentification.extension }),
    };
  }

  private static videoEncoderConfigurationToBuild(configuration: VideoEncoderConfiguration) {
    return {
      ...AnalyticsDevice.configurationEntityToBuild(configuration),
      Encoding: configuration.encoding,
      Resolution: {
        Width: configuration.resolution.width,
        Height: configuration.resolution.height,
      },
      Quality: configuration.quality,
      ...(configuration.rateControl && {
        RateControl: {
          FrameRateLimit: configuration.rateControl.frameRateLimit,
          EncodingInterval: configuration.rateControl.encodingInterval,
          BitrateLimit: configuration.rateControl.bitrateLimit,
        },
      }),
      ...(configuration.MPEG4 && {
        MPEG4: {
          GovLength: configuration.MPEG4.govLength,
          Mpeg4Profile: configuration.MPEG4.mpeg4Profile,
        },
      }),
      ...(configuration.H264 && {
        H264: {
          GovLength: configuration.H264.govLength,
          H264Profile: configuration.H264.H264Profile,
        },
      }),
      Multicast: multicastConfiguration(configuration.multicast),
      SessionTimeout: configuration.sessionTimeout,
    };
  }

  private static metadataInputToBuild(metadataInput: MetadataInput) {
    return {
      ...(metadataInput.metadataConfig && {
        MetadataConfig: metadataInput.metadataConfig.map((item) => config(item)),
      }),
      ...(metadataInput.extension && { Extension: metadataInput.extension }),
    };
  }

  private static analyticsEngineInputToBuild(configuration: AnalyticsEngineInput) {
    return {
      ...AnalyticsDevice.configurationEntityToBuild(configuration),
      SourceIdentification: AnalyticsDevice.sourceIdentificationToBuild(configuration.sourceIdentification),
      VideoInput: AnalyticsDevice.videoEncoderConfigurationToBuild(configuration.videoInput),
      MetadataInput: AnalyticsDevice.metadataInputToBuild(configuration.metadataInput),
    };
  }

  private static videoAnalyticsConfigurationToBuild(configuration: VideoAnalyticsConfiguration) {
    return {
      ...AnalyticsDevice.configurationEntityToBuild(configuration),
      AnalyticsEngineConfiguration: {
        ...(configuration.analyticsEngineConfiguration.analyticsModule && {
          AnalyticsModule: configuration.analyticsEngineConfiguration.analyticsModule.map(config),
        }),
        ...(configuration.analyticsEngineConfiguration.extension && {
          Extension: configuration.analyticsEngineConfiguration.extension,
        }),
      },
      RuleEngineConfiguration: {
        ...(configuration.ruleEngineConfiguration.rule && {
          Rule: configuration.ruleEngineConfiguration.rule.map(config),
        }),
        ...(configuration.ruleEngineConfiguration.extension && {
          Extension: configuration.ruleEngineConfiguration.extension,
        }),
      },
    };
  }

  private static analyticsEngineInputInfoToBuild(inputInfo: AnalyticsEngineInputInfo) {
    return {
      ...(inputInfo.inputInfo && { InputInfo: config(inputInfo.inputInfo) }),
      ...(inputInfo.extension && { Extension: inputInfo.extension }),
    };
  }

  private static engineConfigurationToBuild(engineConfiguration: EngineConfiguration) {
    return {
      VideoAnalyticsConfiguration: AnalyticsDevice.videoAnalyticsConfigurationToBuild(
        engineConfiguration.videoAnalyticsConfiguration,
      ),
      AnalyticsEngineInputInfo: AnalyticsDevice.analyticsEngineInputInfoToBuild(
        engineConfiguration.analyticsEngineInputInfo,
      ),
    };
  }

  private static analyticsEngineConfigurationToBuild(analyticsEngineConfiguration: AnalyticsDeviceEngineConfiguration) {
    const engineConfiguration = analyticsEngineConfiguration.engineConfiguration
      ? analyticsEngineConfiguration.engineConfiguration.map((item) => AnalyticsDevice.engineConfigurationToBuild(item))
      : undefined;
    return {
      ...(engineConfiguration && {
        EngineConfiguration: engineConfiguration.length === 1 ? engineConfiguration[0] : engineConfiguration,
      }),
      ...(analyticsEngineConfiguration.extension && {
        Extension: analyticsEngineConfiguration.extension,
      }),
    };
  }

  private static analyticsEngineToBuild(configuration: AnalyticsEngine) {
    return {
      ...AnalyticsDevice.configurationEntityToBuild(configuration),
      AnalyticsEngineConfiguration: AnalyticsDevice.analyticsEngineConfigurationToBuild(
        configuration.analyticsEngineConfiguration,
      ),
    };
  }

  private static analyticsEngineControlToBuild(configuration: AnalyticsEngineControl) {
    return {
      ...AnalyticsDevice.configurationEntityToBuild(configuration),
      EngineToken: configuration.engineToken,
      EngineConfigToken: configuration.engineConfigToken,
      ...(configuration.inputToken && {
        InputToken: AnalyticsDevice.tokensToBuild(configuration.inputToken),
      }),
      ...(configuration.receiverToken && {
        ReceiverToken: AnalyticsDevice.tokensToBuild(configuration.receiverToken),
      }),
      ...(configuration.multicast && {
        Multicast: multicastConfiguration(configuration.multicast),
      }),
      Subscription: config(configuration.subscription),
      Mode: configuration.mode,
      ...(configuration.extension !== undefined ? { Extension: configuration.extension } : {}),
    };
  }

  /**
   * Returns the capabilities of the analytics device service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Deletes an analytics engine control configuration.
   * @param options
   */
  async deleteAnalyticsEngineControl({ configurationToken }: DeleteAnalyticsEngineControl): Promise<void> {
    await this.request({
      DeleteAnalyticsEngineControl: {
        ConfigurationToken: configurationToken,
      },
    });
  }

  /**
   * Creates analytics engine input configurations.
   * @param options
   */
  async createAnalyticsEngineInputs({
    configuration,
    forcePersistence,
  }: CreateAnalyticsEngineInputs): Promise<AnalyticsEngineInput[]> {
    const response = await this.request(
      {
        CreateAnalyticsEngineInputs: {
          Configuration: configuration.map((item) => AnalyticsDevice.analyticsEngineInputToBuild(item)),
          ForcePersistence: forcePersistence.length === 1 ? forcePersistence[0] : forcePersistence,
        },
      },
      { array: ['configuration'] },
    );
    return response.createAnalyticsEngineInputsResponse.configuration ?? [];
  }

  /**
   * Creates an analytics engine control configuration.
   * @param options
   */
  async createAnalyticsEngineControl({ configuration }: CreateAnalyticsEngineControl): Promise<AnalyticsEngineInput[]> {
    const response = await this.request(
      {
        CreateAnalyticsEngineControl: {
          Configuration: AnalyticsDevice.analyticsEngineControlToBuild(configuration),
        },
      },
      { array: ['configuration'] },
    );
    return response.createAnalyticsEngineControlResponse.configuration ?? [];
  }

  /**
   * Modifies an analytics engine control configuration.
   * @param options
   */
  async setAnalyticsEngineControl({ configuration, forcePersistence }: SetAnalyticsEngineControl): Promise<void> {
    await this.request({
      SetAnalyticsEngineControl: {
        Configuration: AnalyticsDevice.analyticsEngineControlToBuild(configuration),
        ForcePersistence: forcePersistence,
      },
    });
  }

  /**
   * Returns an analytics engine control configuration.
   * @param options
   */
  async getAnalyticsEngineControl({ configurationToken }: GetAnalyticsEngineControl): Promise<AnalyticsEngineControl> {
    const response = await this.request({
      GetAnalyticsEngineControl: {
        ConfigurationToken: configurationToken,
      },
    });
    return response.getAnalyticsEngineControlResponse.configuration;
  }

  /**
   * Returns all analytics engine control configurations.
   */
  async getAnalyticsEngineControls(): Promise<AnalyticsEngineControl[]> {
    const response = await this.request({ GetAnalyticsEngineControls: {} }, { array: ['analyticsEngineControls'] });
    return response.getAnalyticsEngineControlsResponse.analyticsEngineControls ?? [];
  }

  /**
   * Returns an analytics engine configuration.
   * @param options
   */
  async getAnalyticsEngine({ configurationToken }: GetAnalyticsEngine): Promise<AnalyticsEngine> {
    const response = await this.request({
      GetAnalyticsEngine: {
        ConfigurationToken: configurationToken,
      },
    });
    return response.getAnalyticsEngineResponse.configuration;
  }

  /**
   * Returns all analytics engine configurations.
   */
  async getAnalyticsEngines(): Promise<AnalyticsEngine[]> {
    const response = await this.request({ GetAnalyticsEngines: {} }, { array: ['configuration'] });
    return response.getAnalyticsEnginesResponse.configuration ?? [];
  }

  /**
   * Modifies a video analytics configuration.
   * @param options
   */
  async setVideoAnalyticsConfiguration({
    configuration,
    forcePersistence,
  }: SetVideoAnalyticsConfiguration): Promise<void> {
    await this.request({
      SetVideoAnalyticsConfiguration: {
        Configuration: AnalyticsDevice.videoAnalyticsConfigurationToBuild(configuration),
        ForcePersistence: forcePersistence,
      },
    });
  }

  /**
   * Modifies an analytics engine input configuration.
   * @param options
   */
  async setAnalyticsEngineInput({ configuration, forcePersistence }: SetAnalyticsEngineInput): Promise<void> {
    await this.request({
      SetAnalyticsEngineInput: {
        Configuration: AnalyticsDevice.analyticsEngineInputToBuild(configuration),
        ForcePersistence: forcePersistence,
      },
    });
  }

  /**
   * Returns an analytics engine input configuration.
   * @param options
   */
  async getAnalyticsEngineInput({ configurationToken }: GetAnalyticsEngineInput): Promise<AnalyticsEngineInput> {
    const response = await this.request({
      GetAnalyticsEngineInput: {
        ConfigurationToken: configurationToken,
      },
    });
    return response.getAnalyticsEngineInputResponse.configuration;
  }

  /**
   * Returns all analytics engine input configurations.
   */
  async getAnalyticsEngineInputs(): Promise<AnalyticsEngineInput[]> {
    const response = await this.request({ GetAnalyticsEngineInputs: {} }, { array: ['configuration'] });
    return response.getAnalyticsEngineInputsResponse.configuration ?? [];
  }

  /**
   * Requests a URI for an analytics device stream.
   * @param options
   */
  async getAnalyticsDeviceStreamUri({
    streamSetup,
    analyticsEngineControlToken,
  }: GetAnalyticsDeviceStreamUri): Promise<AnyURI> {
    const response = await this.request({
      GetAnalyticsDeviceStreamUri: {
        StreamSetup: streamSetupToBuild(streamSetup),
        AnalyticsEngineControlToken: analyticsEngineControlToken,
      },
    });
    return response.getAnalyticsDeviceStreamUriResponse.uri;
  }

  /**
   * Returns a video analytics configuration.
   * @param options
   */
  async getVideoAnalyticsConfiguration({
    configurationToken,
  }: GetVideoAnalyticsConfiguration): Promise<VideoAnalyticsConfiguration> {
    const response = await this.request({
      GetVideoAnalyticsConfiguration: {
        ConfigurationToken: configurationToken,
      },
    });
    return response.getVideoAnalyticsConfigurationResponse.configuration;
  }

  /**
   * Deletes analytics engine input configurations.
   * @param options
   */
  async deleteAnalyticsEngineInputs({ configurationToken }: DeleteAnalyticsEngineInputs): Promise<void> {
    await this.request({
      DeleteAnalyticsEngineInputs: {
        ConfigurationToken: AnalyticsDevice.tokensToBuild(configurationToken),
      },
    });
  }

  /**
   * Returns the state of an analytics engine control.
   * @param options
   */
  async getAnalyticsState({ analyticsEngineControlToken }: GetAnalyticsState): Promise<AnalyticsStateInformation> {
    const response = await this.request({
      GetAnalyticsState: {
        AnalyticsEngineControlToken: analyticsEngineControlToken,
      },
    });
    return response.getAnalyticsStateResponse.state;
  }
}
