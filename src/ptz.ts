import { Onvif, ReferenceToken } from './onvif';
import { linerase } from './utils';
import {
  Duration, PTZConfiguration, Space1DDescription, Space2DDescription,
} from './media';

interface PTZPresetTourSupported {
  /** Indicates number of preset tours that can be created. Required preset tour operations shall be available for this
   * PTZ Node if one or more preset tour is supported */
  maximumNumberOfPresetTours: number;
  /** Indicates which preset tour operations are available for this PTZ Node */
  ptzPresetTourOperation: 'Start' | 'Stop' | 'Pause' | 'Extended';
}

export interface PTZNode {
  /** Unique identifier referencing the physical entity */
  token: ReferenceToken;
  /** Indication whether the HomePosition of a Node is fixed or it can be changed via the SetHomePosition command */
  fixedHomePosition: boolean;
  /** Indication whether the Node supports the geo-referenced move command */
  geoMove: boolean;
  /** A unique identifier that is used to reference PTZ Nodes */
  name?: string;
  /** A list of Coordinate Systems available for the PTZ Node. For each Coordinate System, the PTZ Node MUST specify
   * its allowed range */
  supportedPTZSpaces: PTZSpace[];
  /** All preset operations MUST be available for this PTZ Node if one preset is supported */
  maximumNumberOfPresets: number;
  /** A boolean operator specifying the availability of a home position. If set to true, the Home Position Operations
   * MUST be available for this PTZ Node */
  homeSupported: boolean;
  /** A list of supported Auxiliary commands. If the list is not empty, the Auxiliary Operations MUST be available for
   * this PTZ Node */
  auxiliaryCommands?: any;
  extension?: {
    /** Detail of supported Preset Tour feature */
    supportedPresetTour?: PTZPresetTourSupported
    extension?: any;
  };
}

export interface PTZSpace {
  /**  The Generic Pan/Tilt Position space is provided by every PTZ node that supports absolute Pan/Tilt, since it
   * does not relate to a specific physical range. Instead, the range should be defined as the full range of the PTZ
   * unit normalized to the range -1 to 1 resulting in the following space description */
  absolutePanTiltPositionSpace?: Space2DDescription;
  /**  The Generic Zoom Position Space is provided by every PTZ node that supports absolute Zoom, since it does not
   * relate to a specific physical range. Instead, the range should be defined as the full range of the Zoom normalized
   * to the range 0 (wide) to 1 (tele). There is no assumption about how the generic zoom range is mapped
   * to magnification, FOV or other physical zoom dimension */
  absoluteZoomPositionSpace?: Space1DDescription;
  /** The Generic Pan/Tilt translation space is provided by every PTZ node that supports relative Pan/Tilt, since it
   * does not relate to a specific physical range. Instead, the range should be defined as the full positive and
   * negative translation range of the PTZ unit normalized to the range -1 to 1, where positive translation would mean
   * clockwise rotation or movement in right/up direction resulting in the following space description */
  relativePanTiltTranslationSpace?: Space2DDescription;
  /** The Generic Zoom Translation Space is provided by every PTZ node that supports relative Zoom, since it does not
   * relate to a specific physical range. Instead, the corresponding absolute range should be defined as the full
   * positive and negative translation range of the Zoom normalized to the range -1 to1, where a positive translation
   * maps to a movement in TELE direction. The translation is signed to indicate direction (negative is to wide,
   * positive is to tele). There is no assumption about how the generic zoom range is mapped to magnification, FOV or
   * other physical zoom dimension. This results in the following space description */
  relativeZoomTranslationSpace?: Space1DDescription;
  /** The generic Pan/Tilt velocity space shall be provided by every PTZ node, since it does not relate to a specific
   * physical range. Instead, the range should be defined as a range of the PTZ unit’s speed normalized to the range
   * -1 to 1, where a positive velocity would map to clockwise rotation or movement in the right/up direction. A signed
   * speed can be independently specified for the pan and tilt component resulting in the following space description */
  continuousPanTiltVelocitySpace?: Space2DDescription;
  /** The generic zoom velocity space specifies a zoom factor velocity without knowing the underlying physical model.
   * The range should be normalized from -1 to 1, where a positive velocity would map to TELE direction. A generic zoom
   * velocity space description resembles the following */
  continuousZoomVelocitySpace?: Space1DDescription;
  /** The speed space specifies the speed for a Pan/Tilt movement when moving to an absolute position or to a relative
   * translation. In contrast to the velocity spaces, speed spaces do not contain any directional information. The speed
   * of a combined Pan/Tilt movement is represented by a single non-negative scalar value */
  panTiltSpeedSpace?: Space1DDescription;
  /** The speed space specifies the speed for a Zoom movement when moving to an absolute position or to a relative
   * translation. In contrast to the velocity spaces, speed spaces do not contain any directional information */
  zoomSpeedSpace?: Space1DDescription;
  extension?: any;
}

type ResponsePTZNode = PTZNode & {$?: ReferenceToken};

interface DurationRange {
  min: Duration;
  max: Duration;
}

interface PTControlDirectionOptions {
  /** Supported options for EFlip feature */
  EFlip?: {
    /** Options of EFlip mode parameter */
    mode?: 'OFF' | 'ON' | 'Extended'
    extension?: any;
  };
  /** Supported options for Reverse feature */
  reverse?: {
    /** Options of Reverse mode parameter */
    mode?: 'OFF' | 'ON' | 'AUTO' | 'Extended'
    extension?: any;
  };
}

/** The requested PTZ configuration options */
interface PTZConfigurationOptions {
  /** The list of acceleration ramps supported by the device. The smallest acceleration value corresponds to the minimal
   * index, the highest acceleration corresponds to the maximum index */
  PTZRamps: number[];
  /** A list of supported coordinate systems including their range limitations */
  spaces: PTZSpace[];
  /** A timeout Range within which Timeouts are accepted by the PTZ Node */
  PTZTimeout: DurationRange;
  /** Supported options for PT Direction Control */
  PTControlDirection?: PTControlDirectionOptions
  extension: any;
}

/**
 * PTZ methods
 */
export class PTZ {
  private readonly onvif: Onvif;
  #nodes: Record<ReferenceToken, PTZNode> = {};
  get nodes() {
    return this.#nodes;
  }
  #configurations: Record<ReferenceToken, PTZConfiguration> = {};
  get configurations() {
    return this.#configurations;
  }

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
  * Returns the properties of the requested PTZ node, if it exists.
  * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
  */
  async getNodes() {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetNodes xmlns="http://www.onvif.org/ver20/ptz/wsdl" />',
    });
    this.#nodes = {};
    data[0].getNodesResponse.forEach((ptzNode: any) => {
      const node: ResponsePTZNode = linerase(ptzNode.PTZNode[0]);
      this.#nodes[node.token] = node;
    });
    return this.#nodes;
  }

  /**
   * Get an array with all the existing PTZConfigurations from the device
   */
  async getConfigurations() {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetConfigurations xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + '</GetConfigurations>',
    });
    this.#configurations = {};
    if (!Array.isArray(data[0].getConfigurationsResponse[0].PTZConfiguration)) {
      return this.#configurations;
    }
    data[0].getConfigurationsResponse[0].PTZConfiguration.forEach((configuration: any) => {
      const result = linerase(configuration);
      this.#configurations[result.token] = result;
    });
    return this.#configurations;
  }

  /**
   * List supported coordinate systems including their range limitations.
   * Therefore, the options MAY differ depending on whether the PTZ Configuration is assigned to a Profile containing
   * a Video Source Configuration. In that case, the options may additionally contain coordinate systems referring to
   * the image coordinate system described by the Video Source Configuration. If the PTZ Node supports continuous
   * movements, it shall return a Timeout Range within which Timeouts are accepted by the PTZ Node
   * @param configurationToken Token of an existing configuration that the options are intended for
   */
  async getConfigurationOptions({ configurationToken }: { configurationToken: ReferenceToken }):
    Promise<PTZConfigurationOptions> {
    const [data] = await this.onvif.request({
      service : 'PTZ',
      body    : '<GetConfigurationOptions xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
        + `<ConfigurationToken>${configurationToken}</ConfigurationToken>`
        + '</GetConfigurationOptions>',
    });
    return linerase(data);
  }
}
