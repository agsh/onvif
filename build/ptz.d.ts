/**
 * PTZ ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/onvif/ver20/ptz/wsdl/ptz.wsdl
 * @see https://www.onvif.org/specs/srv/ptz/ONVIF-PTZ-Service-Spec-v1712.pdf
 */
import { Onvif } from './onvif';
import { PTZStatus, PTZVector, ReferenceToken } from './interfaces/common';
import { PTZConfiguration, PTZConfigurationOptions, PTZNode, PTZPreset, PTZSpeed } from './interfaces/onvif';
import { AbsoluteMove, ContinuousMove, GetConfiguration, GetConfigurationOptions, GetPresets, GetStatus, GotoHomePosition, GotoPreset, RelativeMove, RemovePreset, SetHomePosition, SetPreset, Stop } from './interfaces/ptz.2';
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
interface ContinuousMoveExtended extends Omit<ContinuousMove, 'profileToken' | 'velocity'> {
    profileToken?: ReferenceToken;
    velocity: PTZSpeed | PTZInputVector;
}
/**
 * SetHomePosition interface which uses active source profile token by default
 */
interface StopExtended extends Omit<Stop, 'profileToken'> {
    profileToken?: ReferenceToken;
}
export type GetPresetsExtended = Record<ReferenceToken, PTZPreset>;
/**
 * PTZ methods
 */
export declare class PTZ {
    #private;
    private readonly onvif;
    get nodes(): GetNodesExtended;
    get configurations(): GetConfigurationsExtended;
    get presets(): Record<string, PTZPreset>;
    constructor(onvif: Onvif);
    /**
    * Returns an object of the existing PTZ Nodes on the device: node name -> PTZNode.
    * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
    */
    getNodesExtended(): Promise<GetNodesExtended>;
    /**
     * Returns list of the existing PTZ Nodes on the device
     * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
     */
    getNodes(): Promise<PTZNode[]>;
    /**
     * Get an object with all the existing PTZConfigurations from the device
     */
    getConfigurationsExtended(): Promise<GetConfigurationsExtended>;
    /**
     * Get an array with all the existing PTZConfigurations from the device
     */
    getConfigurations(): Promise<PTZConfiguration[]>;
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
    getConfiguration(options: GetConfiguration): Promise<PTZConfiguration>;
    /**
     * List supported coordinate systems including their range limitations.
     * Therefore, the options MAY differ depending on whether the PTZ Configuration is assigned to a Profile containing
     * a Video Source Configuration. In that case, the options may additionally contain coordinate systems referring to
     * the image coordinate system described by the Video Source Configuration. If the PTZ Node supports continuous
     * movements, it shall return a Timeout Range within which Timeouts are accepted by the PTZ Node
     * @param options
     * @param options.configurationToken Token of an existing configuration that the options are intended for
     */
    getConfigurationOptions({ configurationToken }: GetConfigurationOptions): Promise<PTZConfigurationOptions>;
    /**
     * Operation to request all PTZ presets with token names as an object for the PTZNode in the selected profile.
     * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
     */
    getPresetsExtended({ profileToken }?: GetPresets): Promise<GetPresetsExtended>;
    /**
     * Operation to request a list of all PTZ presets for the PTZNode in the selected profile.
     * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
     */
    getPresets({ profileToken }?: GetPresets): Promise<PTZPreset[]>;
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
    setPreset({ profileToken, presetName, presetToken }: SetPresetExtended): Promise<ReferenceToken>;
    /**
     * Operation to remove a PTZ preset for the Node in the selected profile.
     * The operation is supported if the PresetPosition capability exists for the Node in the selected profile.
     * @param options
     */
    removePreset({ profileToken, presetToken }: RemovePresetExtended): Promise<void>;
    private static formatPTZSimpleVector;
    private static PTZVectorToXML;
    /**
     * Operation to go to a saved preset position for the PTZNode in the selected profile. The operation is supported if
     * there is support for at least on PTZ preset by the PTZNode.
     * @param options
     */
    gotoPreset({ profileToken, presetToken, speed }: GotoPresetExtended): Promise<void>;
    /**
     * Operation to move the PTZ device to it's "home" position. The operation is supported if the HomeSupported element
     * in the PTZNode is true.
     * @param options
     */
    gotoHomePosition({ profileToken, speed }: GotoHomePositionExtended): Promise<void>;
    /**
     * Operation to save current position as the home position. The SetHomePosition command returns with a failure if
     * the “home” position is fixed and cannot be overwritten. If the SetHomePosition is successful, it is possible
     * to recall the Home Position with the GotoHomePosition command.
     * @param options
     */
    setHomePosition({ profileToken }: SetHomePositionExtended): Promise<void>;
    /**
     * Operation to request PTZ status for the Node in the selected profile.
     * @param options
     */
    getStatus({ profileToken }: GetStatusExtended): Promise<PTZStatus>;
    /**
     * Operation to move pan,tilt or zoom to a absolute destination.
     *
     * The speed argument is optional. If an x/y speed value is given it is up to the device to either use the x value as
     * absolute resoluting speed vector or to map x and y to the component speed. If the speed argument is omitted, the
     * default speed set by the PTZConfiguration will be used.
     * @param options
     */
    absoluteMove({ profileToken, position, speed, }: AbsoluteMoveExtended): Promise<void>;
    /**
     * Operation for Relative Pan/Tilt and Zoom Move. The operation is supported if the PTZNode supports at least one
     * relative Pan/Tilt or Zoom space.
     *
     * The speed argument is optional. If an x/y speed value is given it is up to the device to either use the x value as
     * absolute resoluting speed vector or to map x and y to the component speed. If the speed argument is omitted,
     * the default speed set by the PTZConfiguration will be used.
     * @param options
     */
    relativeMove({ profileToken, translation, speed, }: RelativeMoveExtended): Promise<void>;
    /**
     * Operation for continuous Pan/Tilt and Zoom movements. The operation is supported if the PTZNode supports at least
     * one continuous Pan/Tilt or Zoom space. If the space argument is omitted, the default space set by the
     * PTZConfiguration will be used.
     * @param options
     */
    continuousMove({ profileToken, velocity, timeout, }: ContinuousMoveExtended): Promise<void>;
    /**
     * Operation to stop ongoing pan, tilt and zoom movements of absolute relative and continuous type. If no stop
     * argument for pan, tilt or zoom is set, the device will stop all ongoing pan, tilt and zoom movements.
     * @param options
     */
    stop(options?: StopExtended): Promise<void>;
}
export {};
