import { ReferenceToken } from './common';
import { Layout, LayoutOptions, CodingCapabilities, PaneConfiguration } from './onvif';

export interface Capabilities {
  /** Indication that the SetLayout command supports only predefined layouts. */
  fixedLayout?: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetLayout {
  /** Token of the Video Output whose Layout is requested */
  videoOutput: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface SetLayout {
  /** Token of the Video Output whose Layout shall be changed. */
  videoOutput: ReferenceToken;
  /** Layout to be set */
  layout: Layout;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetDisplayOptions {
  /** Token of the Video Output whose options are requested */
  videoOutput: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetDisplayOptionsResponse {
  /**
   * The LayoutOptions describe the fixed and predefined layouts of a device. If the device does
   * not offer fixed layouts and allows setting the layout free this element is empty.
   */
  layoutOptions?: LayoutOptions;
  /** decoding and encoding capabilities of the device */
  codingCapabilities: CodingCapabilities;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetPaneConfigurations {
  /** Reference Token of the Video Output whose Pane Configurations are requested */
  videoOutput: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetPaneConfiguration {
  /** Reference Token of the Video Output the requested pane belongs to */
  videoOutput: ReferenceToken;
  /** Reference Token of the Pane whose Configuration is requested */
  pane: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface SetPaneConfigurations {
  /** Token of the video output whose panes to set. */
  videoOutput: ReferenceToken;
  /** Pane Configuration to be set. */
  paneConfiguration?: PaneConfiguration[];
}
export interface SetPaneConfiguration {
  /** Token of the video output whose panes to set. */
  videoOutput: ReferenceToken;
  /** Pane Configuration to be set. */
  paneConfiguration: PaneConfiguration;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface CreatePaneConfiguration {
  /** Token of the video output where the pane shall be created. */
  videoOutput: ReferenceToken;
  /** Configuration of the pane to be created. */
  paneConfiguration: PaneConfiguration;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface DeletePaneConfiguration {
  /** Token of the video output where the pane shall be deleted. */
  videoOutput: ReferenceToken;
  /** Token of the pane to be deleted. */
  paneToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
