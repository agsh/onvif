/**
 * Thermal ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/thermal/wsdl/thermal.wsdl
 */

import { Onvif, OnvifServices } from './onvif';
import Service from './service';
import {
  Capabilities,
  ColorPalette,
  Configuration,
  ConfigurationOptions,
  Cooler,
  GetConfiguration,
  GetConfigurationOptions,
  GetConfigurationsResponse,
  GetRadiometryConfiguration,
  GetRadiometryConfigurationOptions,
  NUCTable,
  RadiometryConfiguration,
  RadiometryConfigurationOptions,
  RadiometryGlobalParameters,
  SetConfiguration,
  SetRadiometryConfiguration,
} from './interfaces/thermal';

/**
 * Thermal service
 * @example
 * ```ts
 *  const configs = await cam.thermal.getConfigurations();
 *  const token = configs.configurations![0].token;
 *  console.log((await cam.thermal.getConfiguration({ videoSourceToken: token })).polarity);
 *  await cam.thermal.setConfiguration({
 *    videoSourceToken: token,
 *    configuration: {
 *      colorPalette: configs.configurations![0].configuration.colorPalette,
 *      polarity: 'WhiteHot',
 *    },
 *  });
 * ```
 */
export class Thermal extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'thermal');
  }

  private static colorPaletteToBuild(colorPalette: ColorPalette) {
    return {
      $: {
        token: colorPalette.token,
        Type: colorPalette.type,
      },
      Name: colorPalette.name,
    };
  }

  private static NUCTableToBuild(nucTable: NUCTable) {
    return {
      $: {
        token: nucTable.token,
        ...(nucTable.lowTemperature !== undefined && { LowTemperature: nucTable.lowTemperature }),
        ...(nucTable.highTemperature !== undefined && { HighTemperature: nucTable.highTemperature }),
      },
      Name: nucTable.name,
    };
  }

  private static coolerToBuild(cooler: Cooler) {
    return {
      Enabled: cooler.enabled,
      ...(cooler.runTime !== undefined && { RunTime: cooler.runTime }),
    };
  }

  private static configurationToBuild(configuration: Configuration) {
    return {
      ColorPalette: Thermal.colorPaletteToBuild(configuration.colorPalette),
      Polarity: configuration.polarity,
      ...(configuration.NUCTable && { NUCTable: Thermal.NUCTableToBuild(configuration.NUCTable) }),
      ...(configuration.cooler && { Cooler: Thermal.coolerToBuild(configuration.cooler) }),
    };
  }

  private static radiometryGlobalParametersToBuild(parameters: RadiometryGlobalParameters) {
    return {
      ReflectedAmbientTemperature: parameters.reflectedAmbientTemperature,
      Emissivity: parameters.emissivity,
      DistanceToObject: parameters.distanceToObject,
      ...(parameters.relativeHumidity !== undefined && {
        RelativeHumidity: parameters.relativeHumidity,
      }),
      ...(parameters.atmosphericTemperature !== undefined && {
        AtmosphericTemperature: parameters.atmosphericTemperature,
      }),
      ...(parameters.atmosphericTransmittance !== undefined && {
        AtmosphericTransmittance: parameters.atmosphericTransmittance,
      }),
      ...(parameters.extOpticsTemperature !== undefined && {
        ExtOpticsTemperature: parameters.extOpticsTemperature,
      }),
      ...(parameters.extOpticsTransmittance !== undefined && {
        ExtOpticsTransmittance: parameters.extOpticsTransmittance,
      }),
    };
  }

  private static radiometryConfigurationToBuild(configuration: RadiometryConfiguration) {
    return {
      ...(configuration.radiometryGlobalParameters && {
        RadiometryGlobalParameters: Thermal.radiometryGlobalParametersToBuild(configuration.radiometryGlobalParameters),
      }),
    };
  }

  /**
   * Returns the capabilities of the thermal service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Gets the valid ranges for the Thermal parameters that have device specific ranges.
   * @param options
   */
  async getConfigurationOptions({ videoSourceToken }: GetConfigurationOptions): Promise<ConfigurationOptions> {
    const response = await this.request(
      {
        GetConfigurationOptions: {
          VideoSourceToken: videoSourceToken,
        },
      },
      { array: ['colorPalette', 'NUCTable'] },
    );
    return response.getConfigurationOptionsResponse.configurationOptions;
  }

  /**
   * Gets the Thermal Configuration for the requested VideoSource.
   * @param options
   */
  async getConfiguration({ videoSourceToken }: GetConfiguration): Promise<Configuration> {
    const response = await this.request({
      GetConfiguration: {
        VideoSourceToken: videoSourceToken,
      },
    });
    return response.getConfigurationResponse.configuration;
  }

  /**
   * Gets the Thermal Configuration for all thermal VideoSources of the Device.
   */
  async getConfigurations(): Promise<GetConfigurationsResponse> {
    const response = await this.request(
      {
        GetConfigurations: {},
      },
      { array: ['configurations'] },
    );
    return response.getConfigurationsResponse ?? {};
  }

  /**
   * Sets the Thermal Configuration for the requested VideoSource.
   * @param options
   */
  async setConfiguration({ videoSourceToken, configuration }: SetConfiguration): Promise<void> {
    await this.request({
      SetConfiguration: {
        VideoSourceToken: videoSourceToken,
        Configuration: Thermal.configurationToBuild(configuration),
      },
    });
  }

  /**
   * Gets the valid ranges for the Radiometry parameters that have device specific ranges.
   * @param options
   */
  async getRadiometryConfigurationOptions({
    videoSourceToken,
  }: GetRadiometryConfigurationOptions): Promise<RadiometryConfigurationOptions> {
    const response = await this.request({
      GetRadiometryConfigurationOptions: {
        VideoSourceToken: videoSourceToken,
      },
    });
    return response.getRadiometryConfigurationOptionsResponse.configurationOptions;
  }

  /**
   * Gets the Radiometry Configuration for the requested VideoSource.
   * @param options
   */
  async getRadiometryConfiguration({ videoSourceToken }: GetRadiometryConfiguration): Promise<RadiometryConfiguration> {
    const response = await this.request({
      GetRadiometryConfiguration: {
        VideoSourceToken: videoSourceToken,
      },
    });
    return response.getRadiometryConfigurationResponse.configuration;
  }

  /**
   * Sets the Radiometry Configuration for the requested VideoSource.
   * @param options
   */
  async setRadiometryConfiguration({ videoSourceToken, configuration }: SetRadiometryConfiguration): Promise<void> {
    await this.request({
      SetRadiometryConfiguration: {
        VideoSourceToken: videoSourceToken,
        Configuration: Thermal.radiometryConfigurationToBuild(configuration),
      },
    });
  }
}
