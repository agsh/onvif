/**
 * Display ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/display.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { AudioEncoderConfiguration, Layout, PaneConfiguration, PaneLayout } from './interfaces/onvif';
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
import { multicastConfiguration } from './utils/toOnvifXMLSchemaObject';

/**
 * Display service — video output layout and pane configurations.
 *
 * @example Read layout / panes for the first video output, then tweak a pane:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const outputs = await onvif.deviceIO.getVideoOutputs();
 * const videoOutput = outputs[0]!.token;
 *
 * const options = await onvif.display.getDisplayOptions({ videoOutput });
 * const layout = await onvif.display.getLayout({ videoOutput });
 * const panes = await onvif.display.getPaneConfigurations({ videoOutput });
 * console.log(options, layout, panes.map((p) => p.paneName ?? p.token));
 *
 * if (panes[0]) {
 *   await onvif.display.setPaneConfiguration({
 *     videoOutput,
 *     paneConfiguration: { ...panes[0], paneName: panes[0].paneName ?? 'Main' },
 *   });
 * }
 * ```
 * @category Services
 */
export default class Display extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'display');
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
    const paneLayout = layout.paneLayout ? layout.paneLayout.map((item) => Display.paneLayoutToBuild(item)) : undefined;

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
      Multicast: multicastConfiguration(configuration.multicast),
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
    return paneConfigurations.map((paneConfiguration) => Display.paneConfigurationToBuild(paneConfiguration));
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
  async getPaneConfiguration({ videoOutput, pane }: GetPaneConfiguration): Promise<PaneConfiguration> {
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
  async createPaneConfiguration({ videoOutput, paneConfiguration }: CreatePaneConfiguration): Promise<ReferenceToken> {
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
