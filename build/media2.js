"use strict";
/**
 * Media ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media2-Service-Spec.pdf
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Media2 = void 0;
const utils_1 = require("./utils");
/**
 * Media service, ver20 profile
 */
let Media2 = (() => {
    let _instanceExtraInitializers = [];
    let _getProfiles_decorators;
    let _createProfile_decorators;
    let _addConfiguration_decorators;
    let _removeConfiguration_decorators;
    let _deleteProfile_decorators;
    let _getConfigurations_decorators;
    let _getVideoSourceConfigurations_decorators;
    let _getVideoEncoderConfigurations_decorators;
    let _getAudioSourceConfigurations_decorators;
    let _getAudioEncoderConfigurations_decorators;
    let _getAnalyticsConfigurations_decorators;
    let _getMetadataConfigurations_decorators;
    let _getAudioOutputConfigurations_decorators;
    let _getAudioDecoderConfigurations_decorators;
    let _getWebRTCConfigurations_decorators;
    return class Media2 {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getProfiles_decorators = [v2];
            _createProfile_decorators = [v2];
            _addConfiguration_decorators = [v2];
            _removeConfiguration_decorators = [v2];
            _deleteProfile_decorators = [v2];
            _getConfigurations_decorators = [v2];
            _getVideoSourceConfigurations_decorators = [v2];
            _getVideoEncoderConfigurations_decorators = [v2];
            _getAudioSourceConfigurations_decorators = [v2];
            _getAudioEncoderConfigurations_decorators = [v2];
            _getAnalyticsConfigurations_decorators = [v2];
            _getMetadataConfigurations_decorators = [v2];
            _getAudioOutputConfigurations_decorators = [v2];
            _getAudioDecoderConfigurations_decorators = [v2];
            _getWebRTCConfigurations_decorators = [v2];
            __esDecorate(this, null, _getProfiles_decorators, { kind: "method", name: "getProfiles", static: false, private: false, access: { has: obj => "getProfiles" in obj, get: obj => obj.getProfiles }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createProfile_decorators, { kind: "method", name: "createProfile", static: false, private: false, access: { has: obj => "createProfile" in obj, get: obj => obj.createProfile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _addConfiguration_decorators, { kind: "method", name: "addConfiguration", static: false, private: false, access: { has: obj => "addConfiguration" in obj, get: obj => obj.addConfiguration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _removeConfiguration_decorators, { kind: "method", name: "removeConfiguration", static: false, private: false, access: { has: obj => "removeConfiguration" in obj, get: obj => obj.removeConfiguration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _deleteProfile_decorators, { kind: "method", name: "deleteProfile", static: false, private: false, access: { has: obj => "deleteProfile" in obj, get: obj => obj.deleteProfile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getConfigurations_decorators, { kind: "method", name: "getConfigurations", static: false, private: false, access: { has: obj => "getConfigurations" in obj, get: obj => obj.getConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getVideoSourceConfigurations_decorators, { kind: "method", name: "getVideoSourceConfigurations", static: false, private: false, access: { has: obj => "getVideoSourceConfigurations" in obj, get: obj => obj.getVideoSourceConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getVideoEncoderConfigurations_decorators, { kind: "method", name: "getVideoEncoderConfigurations", static: false, private: false, access: { has: obj => "getVideoEncoderConfigurations" in obj, get: obj => obj.getVideoEncoderConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAudioSourceConfigurations_decorators, { kind: "method", name: "getAudioSourceConfigurations", static: false, private: false, access: { has: obj => "getAudioSourceConfigurations" in obj, get: obj => obj.getAudioSourceConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAudioEncoderConfigurations_decorators, { kind: "method", name: "getAudioEncoderConfigurations", static: false, private: false, access: { has: obj => "getAudioEncoderConfigurations" in obj, get: obj => obj.getAudioEncoderConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAnalyticsConfigurations_decorators, { kind: "method", name: "getAnalyticsConfigurations", static: false, private: false, access: { has: obj => "getAnalyticsConfigurations" in obj, get: obj => obj.getAnalyticsConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getMetadataConfigurations_decorators, { kind: "method", name: "getMetadataConfigurations", static: false, private: false, access: { has: obj => "getMetadataConfigurations" in obj, get: obj => obj.getMetadataConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAudioOutputConfigurations_decorators, { kind: "method", name: "getAudioOutputConfigurations", static: false, private: false, access: { has: obj => "getAudioOutputConfigurations" in obj, get: obj => obj.getAudioOutputConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAudioDecoderConfigurations_decorators, { kind: "method", name: "getAudioDecoderConfigurations", static: false, private: false, access: { has: obj => "getAudioDecoderConfigurations" in obj, get: obj => obj.getAudioDecoderConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getWebRTCConfigurations_decorators, { kind: "method", name: "getWebRTCConfigurations", static: false, private: false, access: { has: obj => "getWebRTCConfigurations" in obj, get: obj => obj.getWebRTCConfigurations }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        onvif = __runInitializers(this, _instanceExtraInitializers);
        constructor(onvif) {
            this.onvif = onvif;
        }
        /**
         * Retrieve the profile with the specified token or all defined media profiles.
         * - If no Type is provided the returned profiles shall contain no configuration information.
         * - If a single Type with value 'All' is provided the returned profiles shall include all associated configurations.
         * - Otherwise the requested list of configurations shall for each profile include the configurations present as Type.
         * @param options
         * @param options.token Optional token to retrieve exactly one profile.
         * @param options.type If one or more types are passed only the corresponding configurations will be returned.
         */
        async getProfiles({ token, type } = {}) {
            const body = `<GetProfiles xmlns="http://www.onvif.org/ver20/media/wsdl">${token !== undefined ? `<Token>${token}</Token>` : ''}${type !== undefined ? `<Type>${type.join(' ')}</Type>` : '<Type>All</Type>'}</GetProfiles>`;
            const [data] = await this.onvif.request({
                service: 'media2',
                body,
            });
            return (0, utils_1.linerase)(data, { array: ['profiles'] }).getProfilesResponse.profiles;
        }
        /**
         * This operation creates a new media profile. A created profile created via this method may be deleted via the
         * DeleteProfile method. Optionally Configurations can be assigned to the profile on creation. For details regarding
         * profile assignment check also the method AddConfiguration.
         * @param options
         * @param options.name
         * @param options.configuration
         */
        async createProfile({ name, configuration }) {
            const [data] = await this.onvif.request({
                service: 'media2',
                body: '<CreateProfile xmlns="http://www.onvif.org/ver20/media/wsdl">'
                    + `<Name>${name}</Name>${configuration
                        ? `<Configuration>${configuration.map((configurationRef) => (`<Type>${configurationRef.type}</Type>${configurationRef.token ? `<Token>${configurationRef.token}</Token>` : ''}`))}</Configuration>`
                        : ''}</CreateProfile>`,
            });
            return (0, utils_1.linerase)(data).createProfileResponse.token;
        }
        /**
         * This operation adds one or more Configurations to an existing media profile. If a configuration exists in the media
         * profile, it will be replaced. A device shall support adding a compatible Configuration to a Profile containing a
         * VideoSourceConfiguration and shall support streaming video data of such a profile.
         *
         * Note that OSD elements must be added via the CreateOSD command.
         * @param options
         * @param options.profileToken
         * @param options.name
         * @param options.configuration
         */
        async addConfiguration({ profileToken, name, configuration }) {
            const body = '<AddConfiguration xmlns="http://www.onvif.org/ver20/media/wsdl">'
                + `<ProfileToken>${profileToken}</ProfileToken>${name !== undefined ? `<Name>${name}</Name>` : ''}${configuration
                    ? configuration.map((configurationRef) => (`<Configuration><Type>${configurationRef.type}</Type>${configurationRef.token ? `<Token>${configurationRef.token}</Token></Configuration>` : ''}`)).join('')
                    : ''}</AddConfiguration>`;
            await this.onvif.request({
                service: 'media2',
                body,
            });
        }
        /**
         * This operation removes one or more configurations from an existing media profile. Tokens appearing in the
         * configuration list shall be ignored. Presence of the "All" type shall result in an empty profile. Removing a
         * non-existing configuration shall be ignored and not result in an error. A device supporting the Media2 service
         * shall support this command
         * @param options
         * @param options.profileToken
         * @param options.configuration
         */
        async removeConfiguration({ profileToken, configuration }) {
            await this.onvif.request({
                service: 'media2',
                body: '<RemoveConfiguration xmlns="http://www.onvif.org/ver20/media/wsdl">'
                    + `<ProfileToken>${profileToken}</ProfileToken>${configuration?.length
                        ? configuration
                            .map((configurationRef) => `<Configuration><Type>${configurationRef.type}</Type></Configuration>`)
                        : ''}</RemoveConfiguration>`,
            });
        }
        /**
         * This operation deletes a profile. The device shall support the deletion of a media profile through the DeletePro-
         * file command.
         * A device signaling support for MultiTrackStreaming shall support deleting of virtual profiles via the command.
         * Note that deleting a profile of a virtual profile set may invalidate the virtual profile.
         * @param options
         * @param options.token
         */
        async deleteProfile({ token }) {
            await this.onvif.request({
                service: 'media2',
                body: '<DeleteProfile xmlns="http://www.onvif.org/ver20/media/wsdl">'
                    + `<Token>${token}</Token>`
                    + '</DeleteProfile>',
            });
        }
        /**
         * Common function to get configurations
         * @private
         * @param options
         * @param options.entityName
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getConfigurations({ entityName, profileToken, configurationToken }) {
            const body = `<Get${entityName}Configurations xmlns="http://www.onvif.org/ver20/media/wsdl">${profileToken !== undefined ? `<ProfileToken>${profileToken}</ProfileToken>` : ''}${configurationToken !== undefined ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''}</Get${entityName}Configurations>`;
            const [data] = await this.onvif.request({
                service: 'media2',
                body,
            });
            return (0, utils_1.linerase)(data, { array: ['configurations'] })[`get${entityName}ConfigurationsResponse`].configurations;
        }
        /**
         * The `getVideoSourceConfigurations` operation allows to retrieve the video source settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getVideoSourceConfigurations(options) {
            return this.getConfigurations({ entityName: 'VideoSource', ...options });
        }
        /**
         * The `getVideoEncoderConfigurations` operation allows to retrieve the video encoder settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getVideoEncoderConfigurations(options) {
            return this.getConfigurations({ entityName: 'VideoEncoder', ...options });
        }
        /**
         * The `getAudioSourceConfigurations` operation allows to retrieve the audio source settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getAudioSourceConfigurations(options) {
            return this.getConfigurations({ entityName: 'AudioSource', ...options });
        }
        /**
         * The `getAudioEncoderConfigurations` operation allows to retrieve the audio encoder settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getAudioEncoderConfigurations(options) {
            return this.getConfigurations({ entityName: 'AudioEncoder', ...options });
        }
        /**
         * The `getAnalyticsConfigurations` operation allows to retrieve the analytics settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getAnalyticsConfigurations(options) {
            return this.getConfigurations({ entityName: 'Analytics', ...options });
        }
        /**
         * The `getMetadataConfigurations` operation allows to retrieve the metadata settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getMetadataConfigurations(options) {
            return this.getConfigurations({ entityName: 'Metadata', ...options });
        }
        /**
         * The `getAudioOutputConfigurations` operation allows to retrieve the audio output settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getAudioOutputConfigurations(options) {
            return this.getConfigurations({ entityName: 'AudioOutput', ...options });
        }
        /**
         * The `getAudioDecoderConfigurations` operation allows to retrieve the audio decoder settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @param options
         * @param options.profileToken
         * @param options.configurationToken
         */
        async getAudioDecoderConfigurations(options) {
            return this.getConfigurations({ entityName: 'AudioDecoder', ...options });
        }
        /**
         * The `getWebRTCConfigurations` operation allows to retrieve the WebRTC settings of one ore more
         * configurations.
         * - If a configuration token is provided the device shall respond with the requested configuration or provide
         * an error if it does not exist.
         * - In case only a profile token is provided the device shall respond with all configurations that are compatible
         * to the provided media profile.
         * - If no tokens are provided the device shall respond with all available configurations.
         * @protected Specs not ready yet, this method is for the future development
         * @param options
         */
        async getWebRTCConfigurations(options) {
            // return this.getConfigurations({ entityName : 'WebRTC', ...options });
            return [];
        }
        async setVideoSourceConfiguration({ configuration }) {
            const body = (0, utils_1.build)({
                SetVideoSourceConfiguration: {
                    $: {
                        xmlns: 'http://www.onvif.org/ver20/media/wsdl',
                    },
                    Configuration: {
                        $: {
                            token: configuration.token,
                            ViewMode: configuration.viewMode,
                        },
                        Name: configuration.name,
                        UseCount: configuration.useCount,
                        SourceToken: configuration.sourceToken,
                        Bounds: {
                            $: {
                                x: configuration.bounds.x,
                                y: configuration.bounds.y,
                                width: configuration.bounds.width,
                                height: configuration.bounds.height,
                            },
                        },
                        ...(configuration.extension
                            && {
                                Extension: {
                                    ...(configuration.extension.rotate && {
                                        Rotate: {
                                            Mode: configuration.extension.rotate.mode,
                                            Degree: configuration.extension.rotate.degree,
                                        },
                                    }),
                                    ...(configuration.extension.extension && {
                                        Extension: {
                                            LensDescription: configuration.extension.extension.lensDescription?.map((lensDescription) => ({
                                                FocalLength: lensDescription.focalLength,
                                                Offset: {
                                                    $: {
                                                        x: lensDescription.offset.x,
                                                        y: lensDescription.offset.y,
                                                    },
                                                },
                                                Projection: lensDescription.projection?.map((lensProjection) => ({
                                                    Angle: lensProjection.angle,
                                                    Radius: lensProjection.radius,
                                                    Transmittance: lensProjection.transmittance,
                                                })),
                                                XFactor: lensDescription.XFactor,
                                            })),
                                            ...(configuration.extension.extension.sceneOrientation && {
                                                SceneOrientation: {
                                                    mode: configuration.extension.extension.sceneOrientation.mode,
                                                    orientation: configuration.extension.extension.sceneOrientation.orientation,
                                                },
                                            }),
                                        },
                                    }),
                                },
                            }),
                    },
                },
            });
            await this.onvif.request({ service: 'media2', body });
        }
    };
})();
exports.Media2 = Media2;
function v2(originalMethod, context) {
    return function v2(...args) {
        if (!this.onvif.device.media2Support) {
            throw new Error('Media2 profile is not supported for this device');
        }
        return originalMethod.call(this, ...args);
    };
}
//# sourceMappingURL=media2.js.map