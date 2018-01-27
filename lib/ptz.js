/**
 * @namespace cam
 * @description PTZ section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

const Cam = require('./cam').Cam
	, extend = require('util')._extend
	, linerase = require('./utils').linerase
	, url = require('url')
	;

/**
 * Receive cam presets
 * @param {object} [options]
 * @param {string} [options.profileToken]
 * @param [callback]
 */
Cam.prototype.getPresets = function(options, callback) {
	if (callback === undefined) { callback = options; options = {};	}
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GetPresets xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetPresets>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.presets = {};
			var presets = linerase(data).getPresetsResponse.preset;
			if (typeof presets !== 'undefined') {
				if (!Array.isArray(presets)) {
					presets = [presets];
				}
				presets.forEach(function(preset) {
					this.presets[preset.name] = preset.$.token;
				}.bind(this));
			}
		}
		if (callback) {
			callback.call(this, err, this.presets, xml);
		}
	}.bind(this));
};

/**
 * /PTZ/ Go to preset
 * @param {object} options
 * @param {string} [options.profileToken]
 * @param {string} options.preset PresetName from {@link Cam#presets} property
 * @param {string} options.speed
 * @param {function} callback
 */
Cam.prototype.gotoPreset = function(options, callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GotoPreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			'<PresetToken>' + options.preset + '</PresetToken>' +
			(options.speed ? '<Speed>' + this._panTiltZoomVectors(options.speed) + '</Speed>' : '') +
		'</GotoPreset>' +
		this._envelopeFooter()
	}, callback.bind(this));
};
/**
 * /PTZ/ Set preset
 * @param {object} options
 * @param {string} [options.profileToken]
 * @param {string} options.presetName
 * @param {string} [options.presetToken]
 * @param {function} callback
 */
Cam.prototype.setPreset = function(options, callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<SetPreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
		'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
		'<PresetName>' + options.presetName + '</PresetName>' +
		(options.presetToken ? '<PresetToken>' + options.presetToken + '</PresetToken>' : '') +
		'</SetPreset>' +
		this._envelopeFooter()
	}, callback.bind(this));
};
/**
 * /PTZ/ Remove preset
 * @param {object} options
 * @param {string} [options.profileToken]
 * @param {string} options.presetToken
 * @param {function} callback
 */
Cam.prototype.removePreset = function(options,callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<RemovePreset xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
		'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
		'<PresetToken>' + options.presetToken + '</PresetToken>' +
		'</RemovePreset>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * /PTZ/ Go to home position
 * @param {object} options
 * @param {string} [options.profileToken]
 * @param {object} [options.speed] If the speed argument is omitted, the default speed set by the PTZConfiguration will be used.
 * @param {number} [options.speed.x] Pan speed, float within 0 to 1
 * @param {number} [options.speed.y] Tilt speed, float within 0 to 1
 * @param {number} [options.speed.zoom] Zoom speed, float within 0 to 1
 * @param {function} callback
 */
Cam.prototype.gotoHomePosition = function(options, callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GotoHomePosition xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			(options.speed ? '<Speed>' + this._panTiltZoomVectors(options.speed) + '</Speed>' : '') +
		'</GotoHomePosition>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * /PTZ/ Set home position
 * @param {object} options
 * @param {string} [options.profileToken]
 * @param {function} callback
 */
Cam.prototype.setHomePosition = function(options, callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<SetHomePosition xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
		'</SetHomePosition>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * @typedef {object} Cam~PTZStatus
 * @property {object} position
 * @property {number} position.x
 * @property {number} position.y
 * @property {number} position.zoom
 * @property {string} moveStatus
 * @property {?Error} error
 * @property {Date} utcTime
 */

/**
 * @callback Cam~GetPTZStatusCallback
 * @property {?Error} error
 * @property {Cam~PTZStatus} status
 */

/**
 * /PTZ/ Receive cam status
 * @param {Object} [options]
 * @param {string} [options.profileToken={@link Cam#activeSource.profileToken}]
 * @param {Cam~GetPTZStatusCallback} callback
 */
Cam.prototype.getStatus = function(options, callback) {
	if (callback === undefined) { callback = options; options = {};	}
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GetStatus xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetStatus>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			// Fix for TypeError: Cannot read property 'panTilt' of undefined #91
			var res = linerase(data);
			var status = {};
			if ('getStatusResponse' in res) {
				if ('PTZStatus' in res.getStatusResponse) {
					if ('position' in res.getStatusResponse.PTZStatus) {
						status.position = {};
						if ('zoom' in res.getStatusResponse.PTZStatus.position) {
							status.position.zoom = res.getStatusResponse.PTZStatus.position.zoom.$.x;
						}
						if ('panTilt' in res.getStatusResponse.PTZStatus.position) {
							status.position.x = res.getStatusResponse.PTZStatus.position.panTilt.$.x;
							status.position.y = res.getStatusResponse.PTZStatus.position.panTilt.$.y;
						}
					}
					if ('moveStatus' in res.getStatusResponse.PTZStatus) {
						status.moveStatus = res.getStatusResponse.PTZStatus.moveStatus;
					}
					if ('utcTime' in res.getStatusResponse.PTZStatus) {
						status.utcTime = res.getStatusResponse.PTZStatus.utcTime;
					}
					if ('error' in res.getStatusResponse.PTZStatus) {
						status.error = res.getStatusResponse.PTZStatus.error;
					}
				}
			}
		}
		callback.call(this, err, err ? null : status, xml);
	}.bind(this));
};

/**
 * /PTZ/ Returns the properties of the requested PTZ node, if it exists.
 * Use this function to get maximum number of presets, ranges of admitted values for x, y, zoom, iris, focus
 * @param {Function} callback
 */
Cam.prototype.getNodes = function(callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GetNodes xmlns="http://www.onvif.org/ver20/ptz/wsdl" />' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			var nodes = this.nodes = {};
			data[0]['getNodesResponse'].forEach(function(ptzNode) {
				nodes[ptzNode['PTZNode'][0].$.token] = linerase(ptzNode['PTZNode'][0]);
				delete nodes[ptzNode['PTZNode'][0].$.token].$;
			});
		}
		callback.call(this, err, nodes, xml);
	}.bind(this));
};

/**
 * /PTZ/ Get an array with configuration names
 * @param {Function} callback
 */
Cam.prototype.getConfigurations = function(callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GetConfigurations xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
		'</GetConfigurations>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			var configurations = {};
			data[0]['getConfigurationsResponse'].forEach(function(configuration) {
				var pTZConfiguration = configuration['PTZConfiguration'][0];
				var name = pTZConfiguration['name'];
				// some cameras have this as an array instead of a string
				if (Array.isArray(name)) {
					name = name[0];
				}
				configurations[name] = {};
				configurations[name].useCount = parseInt(pTZConfiguration['useCount']);
				if ('$' in pTZConfiguration) {
					configurations[name].token = pTZConfiguration['$']['token'];
				}
				if ('nodeToken' in pTZConfiguration) {
					configurations[name].nodeToken = pTZConfiguration['nodeToken'][0];
				}
				if ('defaultPTZSpeed' in pTZConfiguration) {
					var defaultPTZSpeed = pTZConfiguration['defaultPTZSpeed'][0];
					configurations[name].defaultPTZSpeed = {};
					if ('panTilt' in defaultPTZSpeed) {
						configurations[name].defaultPTZSpeed.x = defaultPTZSpeed['panTilt'][0].$.x;
						configurations[name].defaultPTZSpeed.y = defaultPTZSpeed['panTilt'][0].$.y;
					}
					if ('zoom' in defaultPTZSpeed) {
						configurations[name].defaultPTZSpeed.zoom = defaultPTZSpeed['zoom'][0].$.x;
					}
				}
				if ('defaultPTZTimeout' in pTZConfiguration) {
					configurations[name].defaultPTZTimeout = pTZConfiguration['defaultPTZTimeout'][0];
				}
				if ('panTiltLimits' in pTZConfiguration) {
					configurations[name].panTiltLimits = {};
					var panTiltLimits = pTZConfiguration['panTiltLimits'][0]['range'][0];
					configurations[name].panTiltLimits.XRange = {};
					configurations[name].panTiltLimits.XRange.min = panTiltLimits.XRange[0].min[0];
					configurations[name].panTiltLimits.XRange.max = panTiltLimits.XRange[0].max[0];
					configurations[name].panTiltLimits.YRange = {};
					configurations[name].panTiltLimits.YRange.min = panTiltLimits.YRange[0].min[0];
					configurations[name].panTiltLimits.YRange.max = panTiltLimits.YRange[0].max[0];
				}
				if ('zoomLimits' in pTZConfiguration) {
					configurations[name].zoomLimits = {};
					var zoomLimits = pTZConfiguration['zoomLimits'][0]['range'][0];
					configurations[name].zoomLimits.XRange = {};
					configurations[name].zoomLimits.XRange.min = zoomLimits.XRange[0].min[0];
					configurations[name].zoomLimits.XRange.max = zoomLimits.XRange[0].max[0];
				}
			});
			this.configurations = configurations;
		}
		if (callback) {
			callback.call(this, err, this.configurations, xml);
		}
	}.bind(this));
};

/**
 * /PTZ/ Get options for the PTZ configuration
 * @param {string} configurationToken
 * @param {Function} callback
 */
Cam.prototype.getConfigurationOptions = function(configurationToken, callback) {
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GetConfigurationOptions xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ConfigurationToken>' + configurationToken + '</ConfigurationToken>' +
		'</GetConfigurationOptions>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		var configOptions;
		if (!err) {
			var sp = data[0]['getConfigurationOptionsResponse'][0]['PTZConfigurationOptions'][0]['spaces'][0];
			configOptions = {
				ptzTimeout: {
					min: data[0]['getConfigurationOptionsResponse'][0]['PTZConfigurationOptions'][0]['PTZTimeout'][0]['min']
					, max: data[0]['getConfigurationOptionsResponse'][0]['PTZConfigurationOptions'][0]['PTZTimeout'][0]['max']
				}
				, spaces: {
					absolute: {
						x: {
							min: parseFloat(sp['absolutePanTiltPositionSpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['absolutePanTiltPositionSpace'][0]['XRange'][0]['max'][0])
							, uri: sp['absolutePanTiltPositionSpace'][0]['URI']
						}
						, y: {
							min: parseFloat(sp['absolutePanTiltPositionSpace'][0]['YRange'][0]['min'][0])
							, max: parseFloat(sp['absolutePanTiltPositionSpace'][0]['YRange'][0]['max'][0])
							, uri: sp['absolutePanTiltPositionSpace'][0]['URI']
						}
						, zoom: {
							min: parseFloat(sp['absoluteZoomPositionSpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['absoluteZoomPositionSpace'][0]['XRange'][0]['max'][0])
							, uri: sp['absoluteZoomPositionSpace'][0]['URI']
						}
					}
					, relative: {
						x: {
							min: parseFloat(sp['relativePanTiltTranslationSpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['relativePanTiltTranslationSpace'][0]['XRange'][0]['max'][0])
							, uri: sp['relativePanTiltTranslationSpace'][0]['URI']
						}
						, y: {
							min: parseFloat(sp['relativePanTiltTranslationSpace'][0]['YRange'][0]['min'][0])
							, max: parseFloat(sp['relativePanTiltTranslationSpace'][0]['YRange'][0]['max'][0])
							, uri: sp['relativePanTiltTranslationSpace'][0]['URI']
						}
						, zoom: {
							min: parseFloat(sp['relativeZoomTranslationSpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['relativeZoomTranslationSpace'][0]['XRange'][0]['max'][0])
							, uri: sp['relativeZoomTranslationSpace'][0]['URI']
						}
					}
					, continuous: {
						x: {
							min: parseFloat(sp['continuousPanTiltVelocitySpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['continuousPanTiltVelocitySpace'][0]['XRange'][0]['max'][0])
							, uri: sp['continuousPanTiltVelocitySpace'][0]['URI']
						}
						, y: {
							min: parseFloat(sp['continuousPanTiltVelocitySpace'][0]['YRange'][0]['min'][0])
							, max: parseFloat(sp['continuousPanTiltVelocitySpace'][0]['YRange'][0]['max'][0])
							, uri: sp['continuousPanTiltVelocitySpace'][0]['URI']
						}
						, zoom: {
							min: parseFloat(sp['continuousZoomVelocitySpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['continuousZoomVelocitySpace'][0]['XRange'][0]['max'][0])
							, uri: sp['continuousZoomVelocitySpace'][0]['URI']
						}
					}
					, common: {
						x: {
							min: parseFloat(sp['panTiltSpeedSpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['panTiltSpeedSpace'][0]['XRange'][0]['max'][0])
							, uri: sp['panTiltSpeedSpace'][0]['URI']
						}
						, zoom: {
							min: parseFloat(sp['zoomSpeedSpace'][0]['XRange'][0]['min'][0])
							, max: parseFloat(sp['zoomSpeedSpace'][0]['XRange'][0]['max'][0])
							, uri: sp['zoomSpeedSpace'][0]['URI']
						}
					}
				}
			};
			if (this.configurations[configurationToken]) {
				extend(this.configurations[configurationToken], configOptions);
			}
		}
		if (callback) {
			callback.call(this, err, configOptions, xml);
		}
	}.bind(this));
};

/**
 * /PTZ/ relative move
 * @param {object} options
 * @param {string} [options.profileToken=Cam#activeSource.profileToken]
 * @param {number} [options.x=0] Pan, float within -1 to 1
 * @param {number} [options.y=0] Tilt, float within -1 to 1
 * @param {number} [options.zoom=0] Zoom, float within 0 to 1
 * @param {object} [options.speed] If the speed argument is omitted, the default speed set by the PTZConfiguration will be used.
 * @param {number} [options.speed.x] Pan speed, float within 0 to 1
 * @param {number} [options.speed.y] Tilt speed, float within 0 to 1
 * @param {number} [options.speed.zoom] Zoom speed, float within 0 to 1
 * @param {Cam~RequestCallback} [callback]
 */
Cam.prototype.relativeMove = function(options, callback) {
	callback = callback ? callback.bind(this) : function() {};
	// Due to some glitches in testing cam forcibly set undefined move parameters to zero
	options.x = options.x || 0;
	options.y = options.y || 0;
	options.zoom = options.zoom || 0;
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<RelativeMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			'<Translation>' +
				this._panTiltZoomVectors(options) +
			'</Translation>' +
			(options.speed ? '<Speed>' + this._panTiltZoomVectors(options.speed) + '</Speed>' : '') +
		'</RelativeMove>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * /PTZ/ absolute move
 * @param {object} options
 * @param {string} [options.profileToken=Cam#activeSource.profileToken]
 * @param {number} [options.x] Pan, float within -1 to 1
 * @param {number} [options.y] Tilt, float within -1 to 1
 * @param {number} [options.zoom] Zoom, float within 0 to 1
 * @param {object} [options.speed] If the speed argument is omitted, the default speed set by the PTZConfiguration will be used.
 * @param {number} [options.speed.x] Pan speed, float within 0 to 1
 * @param {number} [options.speed.y] Tilt speed, float within 0 to 1
 * @param {number} [options.speed.zoom] Zoom speed, float within 0 to 1
 * @param {Cam~RequestCallback} [callback]
 */
Cam.prototype.absoluteMove = function(options, callback) {
	callback = callback ? callback.bind(this) : function() {};
	// Due to some glitches in testing cam forcibly set undefined move parameters to zero
	options.x = options.x || 0;
	options.y = options.y || 0;
	options.zoom = options.zoom || 0;
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<AbsoluteMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			'<Position>' +
				this._panTiltZoomVectors(options) +
			'</Position>' +
			(options.speed ? '<Speed>' + this._panTiltZoomVectors(options.speed) + '</Speed>' : '') +
		'</AbsoluteMove>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * /PTZ/ Operation for continuous Pan/Tilt and Zoom movements
 * @param options
 * @param {string} [options.profileToken=Cam#activeSource.profileToken]
 * @param {number} [options.x=0] pan velocity, float within 0 to 1
 * @param {number} [options.y=0] tilt velocity, float within 0 to 1
 * @param {number} [options.zoom=0] zoom velocity, float within 0 to 1
 * @param {number} [options.timeout=Infinity] timeout in milliseconds
 * @param {Cam~RequestCallback} callback
 */
Cam.prototype.continuousMove = function(options, callback) {
	callback = callback ? callback.bind(this) : function() {};
	// Due to some glitches in testing cam forcibly set undefined move parameters to zero
	options.x = options.x || 0;
	options.y = options.y || 0;
	options.zoom = options.zoom || 0;
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<ContinuousMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			'<Velocity>' +
				this._panTiltZoomVectors(options) +
			'</Velocity>' +
			(options.timeout ? '<Timeout>PT' + (options.timeout / 1000) + 'S</Timeout>' : '') +
		'</ContinuousMove>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * Stop ongoing pan, tilt and zoom movements of absolute relative and continuous type
 * @param {object} [options]
 * @param {string} [options.profileToken]
 * @param {boolean|string} [options.panTilt]
 * @param {boolean|string} [options.zoom]
 * @param {Cam~RequestCallback} [callback]
 */
Cam.prototype.stop = function(options, callback) {
	if (callback === undefined) {
		switch (typeof options) {
			case 'object': callback = function() {}; break;
			case 'function': callback = options; options = {}; break;
			default: callback = function() {}; options = {};
		}
	}
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<Stop xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			(options.panTilt ? '<PanTilt>' + options.panTilt + '</PanTilt>' : '') +
			(options.zoom ? '<Zoom>' + options.zoom + '</Zoom>' : '') +
		'</Stop>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * Create ONVIF soap vector
 * @param [ptz.x]
 * @param [ptz.y]
 * @param [ptz.zoom]
 * @return {string}
 * @private
 */
Cam.prototype._panTiltZoomVectors = function(ptz) {
	return ptz
		?
	(ptz.x !== undefined && ptz.y !== undefined
		? '<PanTilt x="' + ptz.x
	+ '" y="' + ptz.y + '" xmlns="http://www.onvif.org/ver10/schema"/>'
		: '') +
	(ptz.zoom !== undefined
		? '<Zoom x="'
	+ ptz.zoom + '" xmlns="http://www.onvif.org/ver10/schema"/>'
		: '')
		: '';
};
