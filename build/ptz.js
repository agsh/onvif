"use strict";
/**
 * PTZ ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/onvif/ver20/ptz/wsdl/ptz.wsdl
 * @see https://www.onvif.org/specs/srv/ptz/ONVIF-PTZ-Service-Spec-v1712.pdf
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PTZ = void 0;
const utils_1 = require("./utils");
/**
 * PTZ methods
 */
class PTZ {
    onvif;
    #nodes = {};
    get nodes() {
        return this.#nodes;
    }
    #configurations = {};
    get configurations() {
        return this.#configurations;
    }
    #presets = {};
    get presets() {
        return this.#presets;
    }
    constructor(onvif) {
        this.onvif = onvif;
    }
    /**
    * Returns an object of the existing PTZ Nodes on the device: node name -> PTZNode.
    * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
    */
    async getNodesExtended() {
        const [data] = await this.onvif.request({
            service: 'PTZ',
            body: '<GetNodes xmlns="http://www.onvif.org/ver20/ptz/wsdl" />',
        });
        this.#nodes = {};
        (0, utils_1.linerase)(data, { array: ['getNodesResponse'] }).getNodesResponse.forEach((ptzNode) => {
            const node = ptzNode.PTZNode;
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
    async getConfigurationsExtended() {
        const [data] = await this.onvif.request({
            service: 'PTZ',
            body: '<GetConfigurations xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + '</GetConfigurations>',
        });
        this.#configurations = {};
        (0, utils_1.linerase)(data, { array: ['PTZConfiguration'] }).getConfigurationsResponse.PTZConfiguration.forEach((configuration) => {
            const result = (0, utils_1.linerase)(configuration);
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
    async getConfiguration(options) {
        const [data] = await this.onvif.request({
            service: 'PTZ',
            body: '<GetConfiguration xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<PTZConfigurationToken>${options.PTZConfigurationToken}</PTZConfigurationToken>`
                + '</GetConfiguration>',
        });
        return (0, utils_1.linerase)(data).getConfigurationResponse.PTZConfiguration;
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
    async getConfigurationOptions({ configurationToken }) {
        const [data] = await this.onvif.request({
            service: 'PTZ',
            body: '<GetConfigurationOptions xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ConfigurationToken>${configurationToken}</ConfigurationToken>`
                + '</GetConfigurationOptions>',
        });
        return (0, utils_1.linerase)(data).getConfigurationOptionsResponse.PTZConfigurationOptions;
    }
    /**
     * Operation to request all PTZ presets with token names as an object for the PTZNode in the selected profile.
     * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
     */
    async getPresetsExtended({ profileToken } = { profileToken: this.onvif.activeSource.profileToken }) {
        const [data] = await this.onvif.request({
            service: 'PTZ',
            body: '<GetPresets xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + '</GetPresets>',
        });
        this.#presets = {};
        const result = (0, utils_1.linerase)(data, { array: ['preset'] }).getPresetsResponse.preset;
        result.forEach((preset) => { this.#presets[preset.token] = preset; });
        return this.#presets;
    }
    /**
     * Operation to request a list of all PTZ presets for the PTZNode in the selected profile.
     * The operation is supported if there is support for at least on PTZ preset by the PTZNode.
     */
    async getPresets({ profileToken } = { profileToken: this.onvif.activeSource.profileToken }) {
        return this.getPresetsExtended({ profileToken }).then((result) => Object.values(result));
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
    async setPreset({ profileToken = this.onvif.activeSource.profileToken, presetName, presetToken }) {
        const [data] = await this.onvif.request({
            service: 'PTZ',
            body: '<SetPreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + `<PresetName>${presetName}</PresetName>${presetToken ? `<PresetToken>${presetToken}</PresetToken>` : ''}</SetPreset>`,
        });
        return (0, utils_1.linerase)(data).setPresetResponse.presetToken;
    }
    /**
     * Operation to remove a PTZ preset for the Node in the selected profile.
     * The operation is supported if the PresetPosition capability exists for the Node in the selected profile.
     * @param options
     */
    async removePreset({ profileToken = this.onvif.activeSource.profileToken, presetToken }) {
        await this.onvif.request({
            service: 'PTZ',
            body: '<RemovePreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + `<PresetToken>${presetToken}</PresetToken>`
                + '</RemovePreset>',
        });
    }
    static formatPTZSimpleVector({ pan, tilt, x, y, zoom, } = {
        x: 0, y: 0, zoom: 0,
    }) {
        return {
            panTilt: {
                x: pan || x,
                y: tilt || y,
            },
            zoom: {
                x: zoom,
            },
        };
    }
    static PTZVectorToXML(input) {
        const vector = ('x' in input || 'pan' in input) ? PTZ.formatPTZSimpleVector(input) : input;
        return ((vector.panTilt ? `<PanTilt x="${vector.panTilt.x}" y="${vector.panTilt.y}" xmlns="http://www.onvif.org/ver10/schema"/>` : '')
            + (vector.zoom ? `<Zoom x="${vector.zoom.x}" xmlns="http://www.onvif.org/ver10/schema"/>` : ''));
    }
    /**
     * Operation to go to a saved preset position for the PTZNode in the selected profile. The operation is supported if
     * there is support for at least on PTZ preset by the PTZNode.
     * @param options
     */
    async gotoPreset({ profileToken = this.onvif.activeSource.profileToken, presetToken, speed }) {
        await this.onvif.request({
            service: 'PTZ',
            body: '<GotoPreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + `<PresetToken>${presetToken}</PresetToken>${speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''}</GotoPreset>`,
        });
    }
    /**
     * Operation to move the PTZ device to it's "home" position. The operation is supported if the HomeSupported element
     * in the PTZNode is true.
     * @param options
     */
    async gotoHomePosition({ profileToken = this.onvif.activeSource.profileToken, speed }) {
        await this.onvif.request({
            service: 'PTZ',
            body: '<GotoHomePosition xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>${speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''}</GotoHomePosition>`,
        });
    }
    /**
     * Operation to save current position as the home position. The SetHomePosition command returns with a failure if
     * the “home” position is fixed and cannot be overwritten. If the SetHomePosition is successful, it is possible
     * to recall the Home Position with the GotoHomePosition command.
     * @param options
     */
    async setHomePosition({ profileToken = this.onvif.activeSource.profileToken }) {
        await this.onvif.request({
            service: 'PTZ',
            body: '<SetHomePosition xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + '</SetHomePosition>',
        });
    }
    /**
     * Operation to request PTZ status for the Node in the selected profile.
     * @param options
     */
    async getStatus({ profileToken = this.onvif.activeSource.profileToken }) {
        const [data] = await this.onvif.request({
            service: 'PTZ',
            body: '<GetStatus xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + '</GetStatus>',
        });
        return (0, utils_1.linerase)(data).getStatusResponse.PTZStatus;
    }
    /**
     * Operation to move pan,tilt or zoom to a absolute destination.
     *
     * The speed argument is optional. If an x/y speed value is given it is up to the device to either use the x value as
     * absolute resoluting speed vector or to map x and y to the component speed. If the speed argument is omitted, the
     * default speed set by the PTZConfiguration will be used.
     * @param options
     */
    async absoluteMove({ profileToken = this.onvif.activeSource.profileToken, position, speed, }) {
        if (!position) {
            throw new Error('\'position\' is required');
        }
        await this.onvif.request({
            service: 'PTZ',
            body: '<AbsoluteMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + `<Position>${PTZ.PTZVectorToXML(position)}</Position>${speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''}</AbsoluteMove>`,
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
    async relativeMove({ profileToken = this.onvif.activeSource.profileToken, translation, speed, }) {
        if (!translation) {
            throw new Error('\'translation\' is required');
        }
        await this.onvif.request({
            service: 'PTZ',
            body: '<RelativeMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + `<Translation>${PTZ.PTZVectorToXML(translation)}</Translation>${speed ? `<Speed>${PTZ.PTZVectorToXML(speed)}</Speed>` : ''}</RelativeMove>`,
        });
    }
    /**
     * Operation for continuous Pan/Tilt and Zoom movements. The operation is supported if the PTZNode supports at least
     * one continuous Pan/Tilt or Zoom space. If the space argument is omitted, the default space set by the
     * PTZConfiguration will be used.
     * @param options
     */
    async continuousMove({ profileToken = this.onvif.activeSource.profileToken, velocity, timeout, }) {
        if (!velocity) {
            throw new Error('\'velocity\' is required');
        }
        await this.onvif.request({
            service: 'PTZ',
            body: '<ContinuousMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>`
                + `<Velocity>${PTZ.PTZVectorToXML(velocity)}</Velocity>${timeout ? `<Timeout>${typeof timeout === 'number' ? `PT${timeout / 1000}S` : timeout}</Timeout>` : ''}</ContinuousMove>`,
        });
    }
    /**
     * Operation to stop ongoing pan, tilt and zoom movements of absolute relative and continuous type. If no stop
     * argument for pan, tilt or zoom is set, the device will stop all ongoing pan, tilt and zoom movements.
     * @param options
     */
    async stop(options) {
        const profileToken = options?.profileToken || this.onvif?.activeSource?.profileToken;
        const panTilt = options?.panTilt ?? true;
        const zoom = options?.zoom ?? true;
        await this.onvif.request({
            service: 'PTZ',
            body: '<Stop xmlns="http://www.onvif.org/ver20/ptz/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken><PanTilt>${panTilt}</PanTilt><Zoom>${zoom}</Zoom>`
                + '</Stop>',
        });
    }
}
exports.PTZ = PTZ;
//# sourceMappingURL=ptz.js.map