import { Capabilities, Layout, LayoutOptions, CodingCapabilities, PaneConfiguration } from './onvif';
import { ReferenceToken } from './common';

export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the display service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetLayout {
  /** Token of the Video Output whose Layout is requested */
  videoOutput?: ReferenceToken;
}
export interface GetLayoutResponse {
  /** Current layout of the video output. */
  layout?: Layout;
}
export interface SetLayout {
  /** Token of the Video Output whose Layout shall be changed. */
  videoOutput?: ReferenceToken;
  /** Layout to be set */
  layout?: Layout;
}
export interface SetLayoutResponse {}
export interface GetDisplayOptions {
  /** Token of the Video Output whose options are requested */
  videoOutput?: ReferenceToken;
}
export interface GetDisplayOptionsResponse {
  /**
   * The LayoutOptions describe the fixed and predefined layouts of a device. If the device does
   * not offer fixed layouts and allows setting the layout free this element is empty.
   */
  layoutOptions?: LayoutOptions;
  /** decoding and encoding capabilities of the device */
  codingCapabilities?: CodingCapabilities;
}
export interface GetPaneConfigurations {
  /** Reference Token of the Video Output whose Pane Configurations are requested */
  videoOutput?: ReferenceToken;
}
export interface GetPaneConfigurationsResponse {
  /** Contains a list of defined Panes of the specified VideoOutput. Each VideoOutput has at least one PaneConfiguration. */
  paneConfiguration?: PaneConfiguration[];
}
export interface GetPaneConfiguration {
  /** Reference Token of the Video Output the requested pane belongs to */
  videoOutput?: ReferenceToken;
  /** Reference Token of the Pane whose Configuration is requested */
  pane?: ReferenceToken;
}
export interface GetPaneConfigurationResponse {
  /** returns the configuration of the requested pane. */
  paneConfiguration?: PaneConfiguration;
}
export interface SetPaneConfigurations {
  /** Token of the video output whose panes to set. */
  videoOutput?: ReferenceToken;
  /** Pane Configuration to be set. */
  paneConfiguration?: PaneConfiguration[];
}
export interface SetPaneConfigurationsResponse {}
export interface SetPaneConfiguration {
  /** Token of the video output whose panes to set. */
  videoOutput?: ReferenceToken;
  /** Pane Configuration to be set. */
  paneConfiguration?: PaneConfiguration;
}
export interface SetPaneConfigurationResponse {}
export interface CreatePaneConfiguration {
  /** Token of the video output where the pane shall be created. */
  videoOutput?: ReferenceToken;
  /** Configuration of the pane to be created. */
  paneConfiguration?: PaneConfiguration;
}
export interface CreatePaneConfigurationResponse {
  /** Token of the new pane configuration. */
  paneToken?: ReferenceToken;
}
export interface DeletePaneConfiguration {
  /** Token of the video output where the pane shall be deleted. */
  videoOutput?: ReferenceToken;
  /** Token of the pane to be deleted. */
  paneToken?: ReferenceToken;
}
export interface DeletePaneConfigurationResponse {}
