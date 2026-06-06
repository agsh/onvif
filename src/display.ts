/**
 * Display ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/display.wsdl
 */

import { Onvif, OnvifServices } from './onvif';
import Service from './service';
import { toOnvifXMLSchemaObject } from './utils';
import {
  AudioEncoderConfiguration,
  Layout,
  PaneConfiguration,
  PaneLayout,
} from './interfaces/onvif';
import { ReferenceToken } from './interfaces/common';
import {
  Capabilities,
  CreatePaneConfiguration,
  DeletePaneConfiguration,
  GetDisplayOptions,
  GetDisplayOptionsResponse,
  GetLayout,
  GetPaneConfiguration,
  GetPaneConfigurations,
  SetLayout,
  SetPaneConfiguration,
  SetPaneConfigurations,
} from './interfaces/display';

/**
 * Display service
 */
export class Display extends Service {
  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
  }

  private static paneLayoutToBuild(paneLayout: PaneLayout) {
    return {
      Pane: paneLayout.pane,
      Area: {
        $: {
          bottom: paneLayout.area.bottom,
          top: paneLayout.area.top,
          right: paneLayout.area.right,
          left: paneLayout.area.left,
        },
      },
    };
  }

  private static layoutToBuild(layout: Layout) {
    const paneLayout = layout.paneLayout
      ? layout.paneLayout.map((item) => Display.paneLayoutToBuild(item))
      : undefined;

    return {
      ...(paneLayout && { PaneLayout: paneLayout.length === 1 ? paneLayout[0] : paneLayout }),
      ...(layout.extension && { Extension: layout.extension }),
    };
  }

  private static audioEncoderConfigurationToBuild(configuration: AudioEncoderConfiguration) {
    return {
      $: { token: configuration.token },
      Name: configuration.name,
      UseCount: configuration.useCount,
      Encoding: configuration.encoding,
      Bitrate: configuration.bitrate,
      SampleRate: configuration.sampleRate,
      Multicast: toOnvifXMLSchemaObject.multicastConfiguration(configuration.multicast),
      SessionTimeout: configuration.sessionTimeout,
    };
  }

  private static paneConfigurationToBuild(paneConfiguration: PaneConfiguration) {
    return {
      $: { token: paneConfiguration.token },
      ...(paneConfiguration.paneName && { PaneName: paneConfiguration.paneName }),
      ...(paneConfiguration.audioOutputToken && { AudioOutputToken: paneConfiguration.audioOutputToken }),
      ...(paneConfiguration.audioSourceToken && { AudioSourceToken: paneConfiguration.audioSourceToken }),
      ...(paneConfiguration.receiverToken && { ReceiverToken: paneConfiguration.receiverToken }),
      ...(paneConfiguration.audioEncoderConfiguration && {
        AudioEncoderConfiguration: Display.audioEncoderConfigurationToBuild(
          paneConfiguration.audioEncoderConfiguration,
        ),
      }),
    };
  }

  private static paneConfigurationsToBuild(paneConfigurations?: PaneConfiguration[]) {
    if (!paneConfigurations?.length) {
      return undefined;
    }
    const built = paneConfigurations.map((paneConfiguration) =>
      Display.paneConfigurationToBuild(paneConfiguration),
    );
    return built.length === 1 ? built[0] : built;
  }

  /**
   * Returns the capabilities of the display service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns the current layout of a video output.
   * @param options
   */
  async getLayout({ videoOutput }: GetLayout) {
    const response = await this.request(
      {
        GetLayout: {
          VideoOutput: videoOutput,
        },
      },
      { array: ['paneLayout'] },
    );
    return response.getLayoutResponse.layout;
  }

  /**
   * Sets the layout of a video output.
   * @param options
   */
  async setLayout({ videoOutput, layout }: SetLayout): Promise<void> {
    await this.request({
      SetLayout: {
        VideoOutput: videoOutput,
        Layout: Display.layoutToBuild(layout),
      },
    });
  }

  /**
   * Returns display options for a video output.
   * @param options
   */
  async getDisplayOptions({ videoOutput }: GetDisplayOptions): Promise<GetDisplayOptionsResponse> {
    const response = await this.request(
      {
        GetDisplayOptions: {
          VideoOutput: videoOutput,
        },
      },
      { array: ['paneLayoutOptions', 'area'] },
    );
    return response.getDisplayOptionsResponse;
  }

  /**
   * Returns pane configurations for a video output.
   * @param options
   */
  async getPaneConfigurations({ videoOutput }: GetPaneConfigurations): Promise<PaneConfiguration[]> {
    const response = await this.request(
      {
        GetPaneConfigurations: {
          VideoOutput: videoOutput,
        },
      },
      { array: ['paneConfiguration'] },
    );
    return response.getPaneConfigurationsResponse?.paneConfiguration ?? [];
  }

  /**
   * Returns a pane configuration for a video output.
   * @param options
   */
  async getPaneConfiguration({
    videoOutput,
    pane,
  }: GetPaneConfiguration): Promise<PaneConfiguration> {
    const response = await this.request({
      GetPaneConfiguration: {
        VideoOutput: videoOutput,
        Pane: pane,
      },
    });
    return response.getPaneConfigurationResponse.paneConfiguration;
  }

  /**
   * Sets pane configurations for a video output.
   * @param options
   */
  async setPaneConfigurations({ videoOutput, paneConfiguration }: SetPaneConfigurations): Promise<void> {
    await this.request({
      SetPaneConfigurations: {
        VideoOutput: videoOutput,
        PaneConfiguration: Display.paneConfigurationsToBuild(paneConfiguration),
      },
    });
  }

  /**
   * Sets a pane configuration for a video output.
   * @param options
   */
  async setPaneConfiguration({ videoOutput, paneConfiguration }: SetPaneConfiguration): Promise<void> {
    await this.request({
      SetPaneConfiguration: {
        VideoOutput: videoOutput,
        PaneConfiguration: Display.paneConfigurationToBuild(paneConfiguration),
      },
    });
  }

  /**
   * Creates a pane configuration on a video output.
   * @param options
   */
  async createPaneConfiguration({
    videoOutput,
    paneConfiguration,
  }: CreatePaneConfiguration): Promise<ReferenceToken> {
    const response = await this.request({
      CreatePaneConfiguration: {
        VideoOutput: videoOutput,
        PaneConfiguration: Display.paneConfigurationToBuild(paneConfiguration),
      },
    });
    return response.createPaneConfigurationResponse.paneToken;
  }

  /**
   * Deletes a pane configuration from a video output.
   * @param options
   */
  async deletePaneConfiguration({ videoOutput, paneToken }: DeletePaneConfiguration): Promise<void> {
    await this.request({
      DeletePaneConfiguration: {
        VideoOutput: videoOutput,
        PaneToken: paneToken,
      },
    });
  }
}
