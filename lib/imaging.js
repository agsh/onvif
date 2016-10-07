/**
 * @namespace cam
 * @description Media section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

const Cam = require('./cam').Cam
	, linerase = require('./utils').linerase
	;

/**
 * @typedef {object} Cam~ImagingSettings
 * @property {number} brightness
 * @property {number} colorSaturation
 * @property {object} focus
 * @property {string} focus.autoFocusMode
 * @property {number} sharpness
 */

/**
 * @callback Cam~GetImagingSettingsCallback
 * @property {?Error} error
 * @property {Cam~ImagingSettings} status
 */

/**
 * Get the ImagingConfiguration for the requested VideoSource (default - the activeSource)
 * @param {object} [options]
 * @param {string} [options.token] {@link Cam#activeSource.profileToken}
 * @param {Cam~GetImagingSettingsCallback} callback
 */
Cam.prototype.getImagingSettings = function(options, callback) {
	if (typeof callback === 'undefined') {
		callback = options;
		options = {};
	}
	this._request({
		service: 'imaging'
		, body: this._envelopeHeader() +
		'<GetImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
			'<VideoSourceToken  xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' + ( options.token || this.activeSource.sourceToken ) + '</VideoSourceToken>' +
		'</GetImagingSettings>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) { 
			callback.call(this, err, err ? null : linerase(data).getImagingSettingsResponse.imagingSettings, xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~ImagingSetting
 * @property {string} token Video source token
 * @property {number} brightness
 * @property {number} colorSaturation
 * @property {number} contrast
 * @property {number} sharpness
 */

/**
 * Set the ImagingConfiguration for the requested VideoSource (default - the activeSource)
 * @param {Cam~ImagingSetting} options
 * @param callback
 */
Cam.prototype.setImagingSettings = function(options, callback) {
	this._request({
		service: 'imaging'
		, body: this._envelopeHeader() +
		'<SetImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
			'<VideoSourceToken  xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
				( options.token || this.activeSource.sourceToken) +
			'</VideoSourceToken>' +
 
			'<ImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
				( 
					options.brightness ? 
					(
						'<Brightness xmlns="http://www.onvif.org/ver10/schema">' +
							options.brightness +
						'</Brightness>' 
					) : ''
				)

			+

				( 
					options.colorSaturation ? 
					(
						'<ColorSaturation xmlns="http://www.onvif.org/ver10/schema">' +
							options.colorSaturation +
						'</ColorSaturation>' 
					) : ''
				)

			+

				( 
					options.contrast ? 
					(
						'<Contrast xmlns="http://www.onvif.org/ver10/schema">' +
							options.contrast +
						'</Contrast>' 
					) : ''
				)

			+

				( 
					options.sharpness ? 
					(
						'<Sharpness xmlns="http://www.onvif.org/ver10/schema">' +
							options.sharpness +
						'</Sharpness>' 
					) : ''
				)

			+
			'</ImagingSettings>' +
		'</SetImagingSettings>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) { 
			callback.call(this, err, err ? null : linerase(data).setImagingSettingsResponse, xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~ImagingServiceCapabilities
 * @property {boolean} ImageStabilization Indicates whether or not Image Stabilization feature is supported
 * @property {boolean} [Presets] Indicates whether or not Imaging Presets feature is supported
 */

/**
 * @callback Cam~GetImagingServiceCapabilitiesCallback
 * @property {?Error} error
 * @property {Cam~ImagingServiceCapabilities} capabilities
 */

/**
 * Returns the capabilities of the imaging service
 * @property {Cam~GetImagingServiceCapabilitiesCallback}
 */
Cam.prototype.getImagingServiceCapabilities = function(callback) {
	this._request({
		service: 'imaging'
		, body: this._envelopeHeader() +
		'<GetServiceCapabilities xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
		'</GetServiceCapabilities>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data[0].getServiceCapabilitiesResponse[0].capabilities[0].$), xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~ImagingPreset
 * @property {string} token
 * @property {string} type Indicates Imaging Preset Type
 * @property {string} Name Human readable name of the Imaging Preset
 */

/**
 * @callback Cam~GetCurrentImagingPresetCallback
 * @property {?Error} error
 * @property {Cam~ImagingPreset} preset
 */

/**
 * Get the last Imaging Preset applied
 * @param {object} [options]
 * @param {string} [options.token] Reference token to the VideoSource where the current Imaging Preset should be requested
 * @param {Cam~GetCurrentImagingPresetCallback} callback
 */
Cam.prototype.getCurrentImagingPreset = function(options, callback) {
	if (typeof callback === 'undefined') {
		callback = options;
		options = {};
	}
	this._request({
		service: 'imaging'
		, body: this._envelopeHeader() +
		'<GetCurrentPreset xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
			'<VideoSourceToken>' + ( options.token || this.activeSource.sourceToken ) + '</VideoSourceToken>' +
		'</GetCurrentPreset>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data).getCurrentPresetResponse.preset, xml);
		}
	}.bind(this));
};

/**
 * Set the ImagingConfiguration for the requested or current VideoSource
 * @param options
 * @param {string} [options.token] Reference token to the VideoSource to which the specified Imaging Preset should be applied.
 * @param {string} options.presetToken Reference token to the Imaging Preset to be applied to the specified Video Source
 * @param {Cam~RequestCallback} callback
 */
Cam.prototype.setCurrentImagingPreset = function(options, callback) {
	this._request({
		service: 'imaging'
		, body: this._envelopeHeader() +
		'<SetCurrentPreset xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
			'<VideoSourceToken>' + ( options.token || this.activeSource.sourceToken ) + '</VideoSourceToken>' +
			'<PresetToken>' + options.presetToken + '</PresetToken>' +
		'</SetCurrentPreset>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data).setCurrentPresetResponse, xml);
		}
	}.bind(this));
};