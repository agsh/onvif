/**
 * PTZ ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/onvif/ver20/ptz/wsdl/ptz.wsdl
 * @see https://www.onvif.org/specs/srv/ptz/ONVIF-PTZ-Service-Spec-v1712.pdf
 */

import { Onvif, OnvifServices } from './onvif';
import Service from './service';
import { GeoLocation, PTZStatus, PTZVector, ReferenceToken } from './interfaces/common';
import {
  AuxiliaryData,
  PTZConfiguration,
  PTZConfigurationOptions,
  PTZNode,
  PTZPreset,
  PresetTour,
  PTZPresetTourOptions,
  PTZPresetTourPresetDetail,
  PTZPresetTourSpot,
  PTZSpeed,
} from './interfaces/onvif';
import {
  AbsoluteMove,
  Capabilities,
  ContinuousMove,
  CreatePresetTour,
  GeoMove,
  GetCompatibleConfigurations,
  GetConfiguration,
  GetConfigurationOptions,
  GetNode,
  GetPresets,
  GetPresetTour,
  GetPresetTourOptions,
  GetPresetTours,
  GetStatus,
  GotoHomePosition,
  GotoPreset,
  ModifyPresetTour,
  OperatePresetTour,
  RelativeMove,
  RemovePreset,
  RemovePresetTour,
  SendAuxiliaryCommand,
  SetConfiguration,
  SetHomePosition,
  SetPreset,
  Stop,
} from './interfaces/ptz.2';

/**
 * Simplified structure of PTZ vector to use as an input argument for position and speed in movement commands.
 * */
interface PTZInputVector {
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
type GetNodesExtended = Record<ReferenceToken, PTZNode>;
/**
 * Structure consists of the PTZ configurations name and its properties
 */
type GetConfigurationsExtended = Record<ReferenceToken, PTZConfiguration>;
/**
 * SetPreset interface which uses active source profile token by default
 */
interface SetPresetExtended extends Omit<SetPreset, 'profileToken'> {
  profileToken?: ReferenceToken;
}
/**
 * RemovePreset interface which uses active source profile token by default
 */
interface RemovePresetExtended extends Omit<RemovePreset, 'profileToken'> {
  profileToken?: ReferenceToken;
}
/**
 * GotoPreset interface which uses active source profile token by default
 */
interface GotoPresetExtended extends Omit<GotoPreset, 'profileToken'> {
  profileToken?: ReferenceToken;
}
/**
 * GotoHomePosition interface which uses active source profile token by default
 */
interface GotoHomePositionExtended extends Omit<GotoHomePosition, 'profileToken'> {
  profileToken?: ReferenceToken;
}
/**
 * SetHomePosition interface which uses active source profile token by default
 */
interface SetHomePositionExtended extends Omit<SetHomePosition, 'profileToken'> {
  profileToken?: ReferenceToken;
}
/**
 * SetHomePosition interface which uses active source profile token by default
 */
interface GetStatusExtended extends Omit<GetStatus, 'profileToken'> {
  profileToken?: ReferenceToken;
}
/**
 * SetHomePosition interface which uses active source profile token by default
 */
interface AbsoluteMoveExtended extends Omit<AbsoluteMove, 'profileToken' | 'position'> {
  profileToken?: ReferenceToken;
  position: PTZVector | PTZInputVector;
}
/**
 * SetHomePosition interface which uses active source profile token by default
 */
interface RelativeMoveExtended extends Omit<RelativeMove, 'profileToken' | 'translation' | 'speed'> {
  profileToken?: ReferenceToken;
  translation: PTZVector | PTZInputVector;
  speed?: PTZSpeed | PTZInputVector;
}
/**
 * SetHomePosition interface which uses active source profile token by default
 */
interface ContinuousMoveExtended extends Omit<ContinuousMove, 'profileToken' | 'velocity' | 'timeout'> {
  profileToken?: ReferenceToken;
  velocity: PTZSpeed | PTZInputVector;
  timeout?: number | string;
}
/**
 * SetHomePosition interface which uses active source profile token by default
 */
interface StopExtended extends Omit<Stop, 'profileToken'> {
  profileToken?: ReferenceToken;
}
/**
 * MoveAndStartTracking with simplified target position vector.
 */
interface MoveAndStartTrackingExtended {
  profileToken?: ReferenceToken;
  presetToken?: ReferenceToken;
  geoLocation?: GeoLocation;
  targetPosition?: PTZVector | PTZInputVector;
  speed?: PTZSpeed;
  objectID?: number;
}

export type GetPresetsExtended = Record<ReferenceToken, PTZPreset>;

/**
 * PTZ methods
 */
export class PTZ extends Service {
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

  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
  }

  /**
   * Returns the capabilities of the PTZ service. The result is returned in a typed answer.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? [];
  }

  /**
   * Get a specific PTZ Node identified by a reference token or a name.
   * @param nodeToken
   */
  async getNode({ nodeToken }: GetNode): Promise<PTZNode> {
    const response = await this.request({
      GetNode: {
        NodeToken: nodeToken,
      },
    });
    return response.getNodeResponse?.PTZNode;
  }

  /**
   * Returns an object of the existing PTZ Nodes on the device: node name -> PTZNode.
   * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
   */
  async getNodesExtended(): Promise<GetNodesExtended> {
    const response = await this.request({ GetNodes: {} }, { array: ['getNodesResponse'] });
    this.#nodes = {};
    response.getNodesResponse.forEach((ptzNode: any) => {
      const node: PTZNode = ptzNode.PTZNode;
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
    const response = await this.request({ GetConfigurations: {} }, { array: ['PTZConfiguration'] });
    this.#configurations = {};
    response.getConfigurationsResponse.PTZConfiguration.forEach((configuration: any) => {
      this.#configurations[configuration.token] = configuration;
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
   * Get a specific PTZconfiguration from the device, identified by its reference token or name.
   *
   * The default Position/Translation/Velocity Spaces are introduced to allow NVCs sending move requests without
   * the need to specify a certain coordinate system. The default Speeds are introduced to control the speed of move
   * requests (absolute, relative, preset), where no explicit speed has been set.
   *
   * The allowed pan and tilt range for Pan/Tilt Limits is defined by a two-dimensional space range that is mapped
   * to a specific Absolute Pan/Tilt Position Space. At least one Pan/Tilt Position Space is required by the PTZNode
   * to support Pan/Tilt limits. The limits apply to all supported absolute, relative and continuous Pan/Tilt movements.
   * The limits shall be checked within the coordinate system for which the limits have been specified. That means that
   * even if movements are specified in a different coordinate system, the requested movements shall be transformed
   * to the coordinate system of the limits where the limits can be checked. When a relative or continuous movements
   * is specified, which would leave the specified limits, the PTZ unit has to move along the specified limits.
   * The Zoom Limits have to be interpreted accordingly.
   * @param options
   */
  async getConfiguration(options: GetConfiguration): Promise<PTZConfiguration> {
    const response = await this.request({
      GetConfiguration: {
        PTZConfigurationToken: options.PTZConfigurationToken,
      },
    });
    return response.getConfigurationResponse.PTZConfiguration;
  }

  /**
   * Set/update a existing PTZConfiguration on the device.
   * @param options
   */
  async setConfiguration(options: SetConfiguration) {
    await this.request({
      SetConfiguration: {
        PTZConfiguration: {
          $: {
            token: options.PTZConfiguration.token,
            MoveRamp: options.PTZConfiguration.moveRamp,
            PresetRamp: options.PTZConfiguration.presetRamp,
            PresetTourRamp: options.PTZConfiguration.presetTourRamp,
          },
          Name: options.PTZConfiguration.name,
          UseCount: options.PTZConfiguration.useCount,
          NodeToken: options.PTZConfiguration.nodeToken,
          DefaultAbsolutePantTiltPositionSpace: options.PTZConfiguration.defaultAbsolutePantTiltPositionSpace,
          DefaultAbsoluteZoomPositionSpace: options.PTZConfiguration.defaultAbsoluteZoomPositionSpace,
          DefaultRelativePanTiltTranslationSpace: options.PTZConfiguration.defaultRelativePanTiltTranslationSpace,
          DefaultRelativeZoomTranslationSpace: options.PTZConfiguration.defaultRelativeZoomTranslationSpace,
          DefaultContinuousPanTiltVelocitySpace: options.PTZConfiguration.defaultContinuousPanTiltVelocitySpace,
          DefaultContinuousZoomVelocitySpace: options.PTZConfiguration.defaultContinuousZoomVelocitySpace,
          DefaultPTZSpeed: PTZ.PTZVectorToXML(options.PTZConfiguration.defaultPTZSpeed),
          DefaultPTZTimeout: options.PTZConfiguration.defaultPTZTimeout,
          ...(options.PTZConfiguration.panTiltLimits && {
            PanTiltLimits: {
              Range: {
                URI: options.PTZConfiguration.panTiltLimits.range.URI,
                XRange: {
                  Min: options.PTZConfiguration.panTiltLimits.range.XRange.min,
                  Max: options.PTZConfiguration.panTiltLimits.range.XRange.max,
                },
                YRange: {
                  Min: options.PTZConfiguration.panTiltLimits.range.YRange.min,
                  Max: options.PTZConfiguration.panTiltLimits.range.YRange.max,
                },
              },
            },
          }),
          ...(options.PTZConfiguration.zoomLimits && {
            ZoomLimits: {
              Range: {
                URI: options.PTZConfiguration.zoomLimits.range.URI,
                XRange: {
                  Min: options.PTZConfiguration.zoomLimits.range.XRange.min,
                  Max: options.PTZConfiguration.zoomLimits.range.XRange.max,
                },
              },
            },
          }),
          Extension: options.PTZConfiguration.extension,
        },
        ForcePersistence: options.forcePersistence,
      },
    });
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
  async getConfigurationOptions({ configurationToken }: GetConfigurationOptions): Promise<PTZConfigurationOptions> {
    const response = await this.request({
      GetConfigurationOptions: { ConfigurationToken: configurationToken },
    });
    return response.getConfigurationOptionsResponse.PTZConfigurationOptions;
  }

  /**
   * Operation to get all available PTZConfigurations that can be added to the referenced media profile.
   * @param options
   */
  async getCompatibleConfigurations({
    profileToken = this.onvif.activeSource!.profileToken,
  }: GetCompatibleConfigurations = {}): Promise<PTZConfiguration[]> {
    const response = await this.request(
      { GetCompatibleConfigurations: { ProfileToken: profileToken } },
      { array: ['PTZConfiguration'] },
    );
    return response.getCompatibleConfigurationsResponse.PTZConfiguration ?? [];
  }

  /**
   * Operation to send auxiliary commands to the PTZ device mapped by the PTZNode in the selected profile.
   * The operation is supported if the AuxiliarySupported element of the PTZNode is true
   * @param options
   */
  async sendAuxiliaryCommand(options: SendAuxiliaryCommand): Promise<AuxiliaryData> {
    const response = await this.request({
      SendAuxiliaryCommand: {
        ProfileToken: options.profileToken ?? this.onvif.activeSource!.profileToken,
        AuxiliaryData: options.auxiliaryData,
      },
    });
    const auxiliaryResponse = response.sendAuxiliaryCommandResponse.auxiliaryResponse;
    if (Array.isArray(auxiliaryResponse)) {
      return auxiliaryResponse[0] ?? '';
    }
    return auxiliaryResponse ?? '';
  }

  /**
   * Operation to request all PTZ presets with token names as an object for the PTZNode in the selected profile.
   * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
   */
  async getPresetsExtended(
    { profileToken }: GetPresets = { profileToken: this.onvif.activeSource!.profileToken },
  ): Promise<GetPresetsExtended> {
    const response = await this.request({ GetPresets: { ProfileToken: profileToken } }, { array: ['preset'] });
    this.#presets = {};
    const result = response.getPresetsResponse.preset;
    result.forEach((preset: PTZPreset) => {
      this.#presets[preset.token!] = preset;
    });
    return this.#presets;
  }

  /**
   * Operation to request a list of all PTZ presets for the PTZNode in the selected profile.
   * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
   */
  async getPresets({ profileToken }: GetPresets = { profileToken: this.onvif.activeSource!.profileToken }) {
    return this.getPresetsExtended({ profileToken }).then((result) => Object.values(result));
  }

  /**
   * Operation to request all existing preset tours in the selected profile.
   * @param options
   */
  async getPresetTours(
    { profileToken }: GetPresetTours = { profileToken: this.onvif.activeSource!.profileToken },
  ): Promise<PresetTour[]> {
    const response = await this.request({ GetPresetTours: { ProfileToken: profileToken } }, { array: ['presetTour'] });
    return response.getPresetToursResponse.presetTour ?? [];
  }

  /**
   * Operation to request a specific preset tour in the selected profile.
   * @param options
   */
  async getPresetTour({
    profileToken = this.onvif.activeSource!.profileToken,
    presetTourToken,
  }: GetPresetTour): Promise<PresetTour> {
    const response = await this.request({
      GetPresetTour: {
        ProfileToken: profileToken,
        PresetTourToken: presetTourToken,
      },
    });
    return response.getPresetTourResponse.presetTour;
  }

  /**
   * Operation to request available options to create and modify preset tours.
   * @param options
   */
  async getPresetTourOptions({
    profileToken = this.onvif.activeSource!.profileToken,
    presetTourToken,
  }: GetPresetTourOptions = {}): Promise<PTZPresetTourOptions> {
    const response = await this.request({
      GetPresetTourOptions: {
        ProfileToken: profileToken,
        PresetTourToken: presetTourToken,
      },
    });
    return response.getPresetTourOptionsResponse.options;
  }

  /**
   * Operation to create a new preset tour for the selected profile.
   * @param options
   */
  async createPresetTour({
    profileToken = this.onvif.activeSource!.profileToken,
  }: CreatePresetTour = {}): Promise<ReferenceToken> {
    const response = await this.request({
      CreatePresetTour: {
        ProfileToken: profileToken,
      },
    });
    return response.createPresetTourResponse.presetTourToken;
  }

  /**
   * Operation to modify the specified preset tour for the selected profile.
   * @param options
   */
  async modifyPresetTour({
    profileToken = this.onvif.activeSource!.profileToken,
    presetTour,
  }: ModifyPresetTour): Promise<void> {
    await this.request({
      ModifyPresetTour: {
        ProfileToken: profileToken,
        PresetTour: PTZ.presetTourToXML(presetTour),
      },
    });
  }

  /**
   * Operation to perform an operation on the specified preset tour.
   * @param options
   */
  async operatePresetTour({
    profileToken = this.onvif.activeSource!.profileToken,
    presetTourToken,
    operation,
  }: OperatePresetTour): Promise<void> {
    await this.request({
      OperatePresetTour: {
        ProfileToken: profileToken,
        PresetTourToken: presetTourToken,
        Operation: operation,
      },
    });
  }

  /**
   * Operation to delete the specified preset tour.
   * @param options
   */
  async removePresetTour({
    profileToken = this.onvif.activeSource!.profileToken,
    presetTourToken,
  }: RemovePresetTour): Promise<void> {
    await this.request({
      RemovePresetTour: {
        ProfileToken: profileToken,
        PresetTourToken: presetTourToken,
      },
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
   * @param options.profileToken One of the device profile tokens, if omitted, uses profile token from the active source
   * @param options.presetToken Preset token if we want to replace existing
   * @returns Preset token
   */
  async setPreset({
    profileToken = this.onvif.activeSource!.profileToken,
    presetName,
    presetToken,
  }: SetPresetExtended): Promise<ReferenceToken> {
    const response = await this.request({
      SetPreset: {
        ProfileToken: profileToken,
        PresetName: presetName,
        ...(presetToken && { PresetToken: presetToken }),
      },
    });
    return response.setPresetResponse.presetToken;
  }

  /**
   * Operation to remove a PTZ preset for the Node in the selected profile.
   * The operation is supported if the PresetPosition capability exists for the Node in the selected profile.
   * @param options
   */
  async removePreset({
    profileToken = this.onvif.activeSource!.profileToken,
    presetToken,
  }: RemovePresetExtended): Promise<void> {
    await this.request({
      RemovePreset: {
        ProfileToken: profileToken,
        PresetToken: presetToken,
      },
    });
  }

  private static formatPTZSimpleVector(
    { pan, tilt, x, y, zoom }: PTZInputVector = {
      x: 0,
      y: 0,
      zoom: 0,
    },
  ) {
    return {
      panTilt: {
        x: pan || x,
        y: tilt || y,
      },
      zoom: {
        x: zoom,
      },
    } as PTZVector;
  }

  private static presetTourPresetDetailToXML(detail: PTZPresetTourPresetDetail) {
    const result: Record<string, unknown> = {};
    if (detail.presetToken !== undefined) {
      result.PresetToken = detail.presetToken;
    }
    if (detail.home !== undefined) {
      result.Home = detail.home;
    }
    if (detail.PTZPosition !== undefined) {
      result.PTZPosition = detail.PTZPosition;
    }
    if (detail.extension) {
      result.Extension = detail.extension;
    }
    return result;
  }

  private static presetTourSpotToXML(spot: PTZPresetTourSpot) {
    return {
      PresetDetail: PTZ.presetTourPresetDetailToXML(spot.presetDetail),
      ...(spot.speed && { Speed: PTZ.PTZVectorToXML(spot.speed) }),
      ...(spot.stayTime !== undefined && { StayTime: spot.stayTime }),
      ...(spot.extension && { Extension: spot.extension }),
    };
  }

  private static presetTourToXML(presetTour: PresetTour) {
    return {
      ...(presetTour.token && {
        $: { token: presetTour.token },
      }),
      ...(presetTour.name && { Name: presetTour.name }),
      ...(presetTour.status && {
        Status: {
          State: presetTour.status.state,
          ...(presetTour.status.currentTourSpot && {
            CurrentTourSpot: PTZ.presetTourSpotToXML(presetTour.status.currentTourSpot),
          }),
          ...(presetTour.status.extension && { Extension: presetTour.status.extension }),
        },
      }),
      ...(presetTour.autoStart && { AutoStart: presetTour.autoStart }),
      ...(presetTour.startingCondition && {
        StartingCondition: {
          ...(presetTour.startingCondition.randomPresetOrder && {
            RandomPresetOrder: presetTour.startingCondition.randomPresetOrder,
          }),
          ...(presetTour.startingCondition.recurringTime && {
            RecurringTime: presetTour.startingCondition.recurringTime,
          }),
          ...(presetTour.startingCondition.recurringDuration && {
            RecurringDuration: presetTour.startingCondition.recurringDuration,
          }),
          ...(presetTour.startingCondition.direction && {
            Direction: presetTour.startingCondition.direction,
          }),
          ...(presetTour.startingCondition.extension && {
            Extension: presetTour.startingCondition.extension,
          }),
        },
      }),
      ...(presetTour.tourSpot && {
        TourSpot: presetTour.tourSpot.map((spot) => PTZ.presetTourSpotToXML(spot)),
      }),
      ...(presetTour.extension && { Extension: presetTour.extension }),
    };
  }

  private static PTZVectorToXML(input: PTZVector | PTZInputVector | PTZSpeed | undefined) {
    if (!input) {
      return undefined;
    }
    const vector: PTZVector = 'x' in input || 'pan' in input ? PTZ.formatPTZSimpleVector(input) : (input as PTZVector);
    // return (
    //   (vector.panTilt
    //     ? `<PanTilt x="${vector.panTilt.x}" y="${vector.panTilt.y}" xmlns="http://www.onvif.org/ver10/schema"/>`
    //     : '') + (vector.zoom ? `<Zoom x="${vector.zoom.x}" xmlns="http://www.onvif.org/ver10/schema"/>` : '')
    // );
    return {
      ...(vector.panTilt && {
        PanTilt: {
          $: {
            xmlns: 'http://www.onvif.org/ver10/schema',
            x: vector.panTilt.x,
            y: vector.panTilt.y,
          },
        },
      }),
      ...(vector.zoom && {
        Zoom: {
          $: {
            xmlns: 'http://www.onvif.org/ver10/schema',
            x: vector.zoom.x,
          },
        },
      }),
    };
  }

  /**
   * Operation to go to a saved preset position for the PTZNode in the selected profile. The operation is supported if
   * there is support for at least on PTZ preset by the PTZNode.
   * @param options
   */
  async gotoPreset({
    profileToken = this.onvif.activeSource!.profileToken,
    presetToken,
    speed,
  }: GotoPresetExtended): Promise<void> {
    await this.request({
      GotoPreset: {
        ProfileToken: profileToken,
        PresetToken: presetToken,
        speed: PTZ.PTZVectorToXML(speed),
      },
    });
  }

  /**
   * Operation to move the PTZ device to it's "home" position. The operation is supported if the HomeSupported element
   * in the PTZNode is true.
   * @param options
   */
  async gotoHomePosition({
    profileToken = this.onvif.activeSource!.profileToken,
    speed,
  }: GotoHomePositionExtended): Promise<void> {
    await this.request({
      GotoHomePosition: {
        ProfileToken: profileToken,
        speed: PTZ.PTZVectorToXML(speed),
      },
    });
  }

  /**
   * Operation to save current position as the home position. The SetHomePosition command returns with a failure if
   * the “home” position is fixed and cannot be overwritten. If the SetHomePosition is successful, it is possible
   * to recall the Home Position with the GotoHomePosition command.
   * @param options
   */
  async setHomePosition({ profileToken = this.onvif.activeSource!.profileToken }: SetHomePositionExtended) {
    await this.request({
      SetHomePosition: { ProfileToken: profileToken },
    });
  }

  /**
   * Operation to request PTZ status for the Node in the selected profile.
   * @param options
   */
  async getStatus({ profileToken = this.onvif.activeSource!.profileToken }: GetStatusExtended): Promise<PTZStatus> {
    const response = await this.request({
      GetStatus: { ProfileToken: profileToken },
    });
    return response.getStatusResponse.PTZStatus;
  }

  /**
   * Operation to move pan,tilt or zoom to a absolute destination.
   *
   * The speed argument is optional. If an x/y speed value is given it is up to the device to either use the x value as
   * absolute resoluting speed vector or to map x and y to the component speed. If the speed argument is omitted, the
   * default speed set by the PTZConfiguration will be used.
   * @param options
   */
  async absoluteMove({ profileToken = this.onvif.activeSource!.profileToken, position, speed }: AbsoluteMoveExtended) {
    if (!position) {
      throw new Error("'position' is required");
    }
    await this.request({
      AbsoluteMove: {
        ProfileToken: profileToken,
        Position: PTZ.PTZVectorToXML(position),
        Speed: PTZ.PTZVectorToXML(speed),
      },
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
  }: RelativeMoveExtended): Promise<void> {
    if (!translation) {
      throw new Error("'translation' is required");
    }
    await this.request({
      RelativeMove: {
        ProfileToken: profileToken,
        Translation: PTZ.PTZVectorToXML(translation),
        Speed: PTZ.PTZVectorToXML(speed),
      },
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
  }: ContinuousMoveExtended): Promise<void> {
    if (!velocity) {
      throw new Error("'velocity' is required");
    }
    await this.request({
      RelativeMove: {
        ProfileToken: profileToken,
        Velocity: PTZ.PTZVectorToXML(velocity),
        Timeout: typeof timeout === 'number' ? `PT${timeout / 1000}S` : timeout,
      },
    });
  }

  /**
   * Operation to move pan,tilt or zoom to point to a destination based on the geolocation of the target.
   *
   * The speed argument is optional. If an x/y speed value is given it is up to the device to either use the x value as
   * absolute resoluting speed vector or to map x and y to the component speed. If the speed argument is omitted,
   * the default speed set by the PTZConfiguration will be used. The area height and area dwidth parameters are optional,
   * they can be used independently and may be used by the device to automatically determine the best zoom level to show
   * the target.
   * @param options
   */
  async geoMove(options: GeoMove) {
    await this.request({
      GeoMove: {
        ProfileToken: options.profileToken ?? this.onvif.activeSource!.profileToken,
        Target: {
          Lon: options.target.lon,
          Lat: options.target.lat,
          Elevation: options.target.elevation,
        },
        Speed: PTZ.PTZVectorToXML(options.speed),
        AreaHeight: options.areaHeight,
        AreaWidth: options.areaWidth,
      },
    });
  }

  /**
   * Operation to move the camera to a target position and delegate PTZ control to the tracking algorithm.
   * @param options
   */
  async moveAndStartTracking({
    profileToken = this.onvif.activeSource!.profileToken,
    presetToken,
    geoLocation,
    targetPosition,
    speed,
    objectID,
  }: MoveAndStartTrackingExtended = {}): Promise<void> {
    return this.request({
      MoveAndStartTracking: {
        ProfileToken: profileToken,
        ...(presetToken && { PresetToken: presetToken }),
        ...(geoLocation && {
          GeoLocation: {
            Lon: geoLocation.lon,
            Lat: geoLocation.lat,
            Elevation: geoLocation.elevation,
          },
        }),
        ...(targetPosition && { TargetPosition: PTZ.PTZVectorToXML(targetPosition) }),
        ...(speed && { Speed: PTZ.PTZVectorToXML(speed) }),
        ...(objectID && { ObjectID: objectID }),
      },
    });
  }

  /**
   * Operation to stop ongoing pan, tilt and zoom movements of absolute relative and continuous type. If no stop
   * argument for pan, tilt or zoom is set, the device will stop all ongoing pan, tilt and zoom movements.
   * @param options
   */
  async stop(options?: StopExtended) {
    const profileToken = options?.profileToken || this.onvif?.activeSource?.profileToken;
    const panTilt = options?.panTilt ?? true;
    const zoom = options?.zoom ?? true;
    await this.request({
      Stop: {
        ProfileToken: profileToken,
        PanTilt: panTilt,
        Zoom: zoom,
      },
    });
  }
}
