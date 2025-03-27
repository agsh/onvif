import { Onvif } from './onvif';
import { linerase } from './utils';
import { PTZStatus, PTZVector, ReferenceToken } from './interfaces/common';
import {
  PTZConfiguration, PTZConfigurationOptions,
  PTZNode, PTZPreset,
  PTZSpeed,
} from './interfaces/onvif';
import {
  AbsoluteMove,
  ContinuousMove, GetConfigurationOptions, GetPresets,
  GetStatus,
  GotoHomePosition, GotoPreset,
  RelativeMove, RemovePreset,
  SetHomePosition, SetPreset, SetPresetResponse,
  Stop,
} from './interfaces/ptz.2';

/**
 * Simplified structure of PTZ vector to use as an input argument for position and speed in movement commands.
 * */
export interface PTZInputVector {
  /** Pan value */
  pan?: number;
  /** Synonym for pan value */
  x?: number;
  /** Tilt value */
  tilt?: number;
  /** Synonym for tilt value */
  y?: number;
  /** Zoom value */
  zoom?: number;
}

/**
 * Structure consists of the PTZ nodes name and its properties
 */
export type GetNodesExtended = Record<ReferenceToken, PTZNode>

/**
 * Structure consists of the PTZ configurations name and its properties
 */
export type GetConfigurationsExtended = Record<ReferenceToken, PTZConfiguration>

/**
 * PTZ methods
 */
export class PTZ {
  private readonly onvif: Onvif;
  #nodes: GetNodesExtended = {};
  get nodes() {
    return this.#nodes;
  }
  #configurations: GetConfigurationsExtended = {};
  get configurations() {
    return this.#configurations;
  }
  #presets: Record<ReferenceToken, PTZPreset> = {};
  get presets() {
    return this.#presets;
  }

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
  * Returns an object of the existing PTZ Nodes on the device: node name -> PTZNode.
  * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
  */
  async getNodesExtended(): Promise<GetNodesExtended> {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetNodes xmlns="http://www.onvif.org/ver20/ptz/wsdl" />',
    });
    this.#nodes = {};
    data[0].getNodesResponse.forEach((ptzNode: any) => {
      const node: PTZNode = linerase(ptzNode.PTZNode[0]);
      this.#nodes[node.token] = node;
    });
    return this.#nodes;
  }

  /**
   * Returns list of the existing PTZ Nodes on the device
   * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
   */
  async getNodes() {
    return this.getNodesExtended().then((nodesObject) => Object.values(nodesObject));
  }

  /**
   * Get an object with all the existing PTZConfigurations from the device
   */
  async getConfigurationsExtended(): Promise<GetConfigurationsExtended> {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetConfigurations xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + '</GetConfigurations>',
    });
    this.#configurations = {};
    data[0].getConfigurationsResponse[0].PTZConfiguration.forEach((configuration: any) => {
      const result = linerase(configuration);
      this.#configurations[result.token] = result;
    });
    return this.#configurations;
  }

  /**
   * Get an array with all the existing PTZConfigurations from the device
   */
  async getConfigurations() {
    return this.getConfigurationsExtended().then((configurationsObject) => Object.values(configurationsObject));
  }

  /**
   * List supported coordinate systems including their range limitations.
   * Therefore, the options MAY differ depending on whether the PTZ Configuration is assigned to a Profile containing
   * a Video Source Configuration. In that case, the options may additionally contain coordinate systems referring to
   * the image coordinate system described by the Video Source Configuration. If the PTZ Node supports continuous
   * movements, it shall return a Timeout Range within which Timeouts are accepted by the PTZ Node
   * @param options
   * @param options.configurationToken Token of an existing configuration that the options are intended for
   */
  async getConfigurationOptions({ configurationToken }: GetConfigurationOptions):
    Promise<PTZConfigurationOptions> {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetConfigurationOptions xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ConfigurationToken>${configurationToken}</ConfigurationToken>`
        + '</GetConfigurationOptions>',
    });
    return linerase(data).getConfigurationOptionsResponse.PTZConfigurationOptions;
  }

  /**
   * Operation to request all PTZ presets with token names as an object for the PTZNode in the selected profile.
   * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
   */
  async getPresetsExtended({ profileToken }: GetPresets) {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetPresets xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
        + '</GetPresets>',
    });
    this.#presets = {};
    const result = linerase(data[0].getPresetsResponse[0].preset);
    if (Array.isArray(result)) {
      // eslint-disable-next-line no-return-assign
      linerase(result).forEach((preset: any) => this.#presets[preset.token] = preset);
    } else {
      this.#presets[result.token] = result;
    }
    return this.#presets;
  }

  /**
   * Operation to request a list of all PTZ presets for the PTZNode in the selected profile.
   * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
   */
  async getPresets(options: GetPresets) {
    return this.getPresetsExtended(options).then((result) => Object.values(result));
  }

  private static formatPTZSimpleVector({
    pan, tilt, x, y, zoom,
  }: PTZInputVector = {
    x : 0, y : 0, zoom : 0,
  }): PTZVector {
    return <PTZVector>{
      panTilt : {
        x : pan || x,
        y : tilt || y,
      },
      zoom : {
        x : zoom,
      },
    };
  }

  private static PTZVectorToXML(input: PTZVector | PTZInputVector | PTZSpeed) {
    const vector: PTZVector = ('x' in input || 'pan' in input) ? PTZ.formatPTZSimpleVector(input) : (input as PTZVector);
    return (
      (vector.panTilt ? `<PanTilt x="${vector.panTilt.x}" y="${vector.panTilt.y}" xmlns="http://www.onvif.org/ver10/schema"/>` : '')
        + (vector.zoom ? `<Zoom x="${vector.zoom.x}" xmlns="http://www.onvif.org/ver10/schema"/>` : '')
    );
  }

  /**
   * Operation to go to a saved preset position for the PTZNode in the selected profile. The operation is supported if
   * there is support for at least on PTZ preset by the PTZNode.
   * @param options
   */
  async gotoPreset({ profileToken, presetToken, speed }: GotoPreset): Promise<void> {
    await this.onvif.request({
      service : 'PTZ',
      body    : '<GotoPreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
        + `<PresetToken>${presetToken}</PresetToken>${
          speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''
        }</GotoPreset>`,
    });
  }

  /**
   * The SetPreset command saves the current device position parameters so that the device can move to the saved preset
   * position through the GotoPreset operation. In order to create a new preset, the SetPresetRequest contains no
   * PresetToken. If creation is successful, the Response contains the PresetToken which uniquely identifies the Preset.
   * An existing Preset can be overwritten by specifying the PresetToken of the corresponding Preset. In both cases
   * (overwriting or creation) an optional PresetName can be specified. The operation fails if the PTZ device is moving
   * during the SetPreset operation. The device MAY internally save additional states such as imaging properties in the
   * PTZ Preset which then should be recalled in the GotoPreset operation.
   * @param options
   */
  async setPreset({ profileToken, presetName, presetToken }: SetPreset): Promise<SetPresetResponse> {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<SetPreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken ?? this.onvif.activeSource!.profileToken}</ProfileToken>`
        + `<PresetName>${presetName}</PresetName>${
          presetToken ? `<PresetToken>${presetToken}</PresetToken>` : ''
        }</SetPreset>`,
    });
    return linerase(data[0].setPresetResponse);
  }

  /**
   * Operation to remove a PTZ preset for the Node in the selected profile. The operation is supported if the
   * PresetPosition capability exists for teh Node in the selected profile.
   * @param options
   */
  async removePreset({ profileToken = this.onvif.activeSource!.profileToken, presetToken }: RemovePreset): Promise<void> {
    await this.onvif.request({
      service : 'PTZ',
      body    : '<RemovePreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + `<PresetToken>${presetToken}</PresetToken>`
        + '</RemovePreset>',
    });
  }

  /**
   * Operation to move the PTZ device to it's "home" position. The operation is supported if the HomeSupported element
   * in the PTZNode is true.
   * @param options
   */
  async gotoHomePosition({ profileToken = this.onvif.activeSource!.profileToken, speed }: GotoHomePosition): Promise<void> {
    await this.onvif.request({
      service : 'PTZ',
      body    : '<GotoHomePosition xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>${
          speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''
        }</GotoHomePosition>`,
    });
  }

  /**
   * Operation to save current position as the home position. The SetHomePosition command returns with a failure if
   * the “home” position is fixed and cannot be overwritten. If the SetHomePosition is successful, it is possible
   * to recall the Home Position with the GotoHomePosition command.
   * @param options
   */
  async setHomePosition({ profileToken = this.onvif.activeSource!.profileToken }: SetHomePosition) {
    await this.onvif.request({
      service : 'PTZ',
      body    : '<SetHomePosition xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + '</SetHomePosition>',
    });
  }

  /**
   * Operation to request PTZ status for the Node in the selected profile.
   * @param options
   */
  async getStatus({ profileToken = this.onvif.activeSource!.profileToken }: GetStatus): Promise<PTZStatus> {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetStatus xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + '</GetStatus>',
    });
    return linerase(data).getStatusResponse.PTZStatus;
  }

  /**
   * Operation to move pan,tilt or zoom to a absolute destination.
   *
   * The speed argument is optional. If an x/y speed value is given it is up to the device to either use the x value as
   * absolute resoluting speed vector or to map x and y to the component speed. If the speed argument is omitted, the
   * default speed set by the PTZConfiguration will be used.
   * @param options
   */
  async absoluteMove({
    profileToken = this.onvif.activeSource!.profileToken,
    position,
    speed,
  }: AbsoluteMove): Promise<void> {
    if (!position) {
      throw new Error('\'position\' is required');
    }
    await this.onvif.request({
      service : 'PTZ',
      body    : '<AbsoluteMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + `<Position>${PTZ.PTZVectorToXML(position)}</Position>${
          speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''
        }</AbsoluteMove>`,
    });
  }

  /**
   * Operation for Relative Pan/Tilt and Zoom Move. The operation is supported if the PTZNode supports at least one
   * relative Pan/Tilt or Zoom space.
   *
   * The speed argument is optional. If an x/y speed value is given it is up to the device to either use the x value as
   * absolute resoluting speed vector or to map x and y to the component speed. If the speed argument is omitted,
   * the default speed set by the PTZConfiguration will be used.
   * @param options
   */
  async relativeMove({
    profileToken = this.onvif.activeSource!.profileToken,
    translation,
    speed,
  }: RelativeMove): Promise<void> {
    if (!translation) {
      throw new Error('\'translation\' is required');
    }
    await this.onvif.request({
      service : 'PTZ',
      body    : '<RelativeMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + `<Translation>${
          PTZ.PTZVectorToXML(translation)
        }</Translation>${
          speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''
        }</RelativeMove>`,
    });
  }

  /**
   * Operation for continuous Pan/Tilt and Zoom movements. The operation is supported if the PTZNode supports at least
   * one continuous Pan/Tilt or Zoom space. If the space argument is omitted, the default space set by the
   * PTZConfiguration will be used.
   * @param options
   */
  async continuousMove({
    profileToken = this.onvif.activeSource!.profileToken,
    velocity,
    timeout,
  }: ContinuousMove): Promise<void> {
    if (!velocity) {
      throw new Error('\'velocity\' is required');
    }
    await this.onvif.request({
      service : 'PTZ',
      body    : '<ContinuousMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken>`
        + `<Velocity>${PTZ.PTZVectorToXML(velocity)}</Velocity>${
          timeout ? `<Timeout>${typeof timeout === 'number' ? `PT${timeout / 1000}S` : timeout}</Timeout>` : ''
        }</ContinuousMove>`,
    });
  }

  /**
   * Operation to stop ongoing pan, tilt and zoom movements of absolute relative and continuous type. If no stop
   * argument for pan, tilt or zoom is set, the device will stop all ongoing pan, tilt and zoom movements.
   * @param options
   */
  async stop(options?: Stop) {
    const profileToken = options?.profileToken || this.onvif?.activeSource?.profileToken;
    const panTilt = options?.panTilt ?? true;
    const zoom = options?.zoom ?? true;
    await this.onvif.request({
      service : 'PTZ',
      body    : '<Stop xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ProfileToken>${profileToken}</ProfileToken><PanTilt>${panTilt}</PanTilt><Zoom>${zoom}</Zoom>`
        + '</Stop>',
    });
  }
}
