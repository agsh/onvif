/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.14.
 */

'use strict';

var http = require('http')
	, crypto = require('crypto')
	, util = require('util')
	, events = require('events')
	, url = require('url')
	, _linerase = require('./soapHelpers')._linerase
	, parseSOAPString = require('./soapHelpers').parseSOAPString
	, extend = require('util')._extend
	, emptyFn = function() {}
	;

/**
 * @name Profile
 * @property {object} streamUri
 */

/**
 * @typedef Profile
 * @type {object}
 * @property {object} streamUri
 */

/**
 * Camera class
 * @param {object} options
 * @param {string} options.hostname
 * @param {string} [options.username]
 * @param {string} [options.password]
 * @param {number} [options.port]
 * @param {string} [options.path]
 * @param {function} [callback]
 * @property presets
 * @class
 * @constructor
 */
var Cam = function(options, callback) {
	callback = callback || emptyFn;
	this.hostname = options.hostname;
	this.username = options.username;
	this.password = options.password;
	this.port = options.port ? options.port : 80;
	this.path = options.path || '/onvif/device_service';

	/**
	 * Camera profile information
	 * @type {Object.<string, Profile>}
	 */
	this.profiles = {};
	/**
	 * Services URIs
	 * @type {{}}
	 */
	this.uri = {};
	/**
	 * Options storage
	 * @type {{}}
	 */
	this.options = {};

	if (this.username && this.password) {
		this.connect(callback);
	} else {
		callback(new Error('Missing username or password'));
	}
};

// events.EventEmitter inheritance
util.inherits(Cam, events.EventEmitter);

/**
 * Connect to the camera and fill device information properties
 * @param {Function} callback
 */
Cam.prototype.connect = function(callback) {
	var upstartFunctions = [this.getProfiles, this.getVideoSources]
		, count = upstartFunctions.length
		, self = this
		, errCall = false
		;
	this.getCapabilities(function(err, data) {
		if (err) {
			callback.call(this, err);
		} else {
			upstartFunctions.forEach(function(fun) {
				fun.call(self, function (err) {
					if (err && !errCall) {
						if (callback) {
							callback.call(this, err);
						}
						errCall = true;
					} else {
						if (!--count) {
							self.getActiveSources();
							if (callback) {
								callback.call(this, err);
							}
						}
					}
				});
			});
		}
	});
};

/**
 * @callback Cam.requestCallback
 * @param {Error} err
 * @param {object} response message
 * @param {string} xml response
 */

/**
 * Common camera request
 * @param {object} options
 * @param {string} [options.service] Name of service (ptz, media, etc)
 * @param {object} options.body SOAP body
 * @param {string} [options.service] service name (media, ptz)
 * @param {boolean} [options.ptz] make request to PTZ uri or not
 * @param {Function} callback response callback
 * @param {Cam.requestCallback} callback
 * @private
 */
Cam.prototype._request = function(options, callback) {
	var _this = this;
	var reqOptions = {
		hostname: this.hostname
		, headers: {
			'Content-Type': 'application/soap+xml'
			, 'Content-Length': options.body.length
			, charset: 'utf-8'
		}
		, port: this.port
		, path: options.service && this.uri[options.service] ? this.uri[options.service].path : this.path
		, auth: this.username + ':' + this.password
		, method: 'POST'
	};
	var req = http.request(reqOptions, function(res) {
		var bufs = [], length = 0;
		res.on('data', function(chunk) {
			bufs.push(chunk);
			length += chunk.length;
		});
		res.on('end', function() {
			var xml = Buffer.concat(bufs, length).toString('utf8');
			_this.emit('rawResponse', xml);
			parseSOAPString(xml, callback);
		});
	});
	req.on('error', function(err) {
		callback(err);
	});
	req.write(options.body);
	req.end();
};

/**
 * Receive date and time from cam
 * @param callback
 */
Cam.prototype.getSystemDateAndTime = function(callback) {
	this._request({
		body:
		'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
			'</s:Body>' +
		'</s:Envelope>'
	}, function(err, data, xml) {
    var dt;
		if (!err) {
			dt = _linerase(data[0]['getSystemDateAndTimeResponse'][0]['systemDateAndTime'][0]['UTCDateTime'][0]);
		}
		callback.call(this, err, err ? null : new Date(dt.date.year, dt.date.month, dt.date.day, dt.time.hour, dt.time.minute, dt.time.second), xml);
	});
};

/**
 * Receive cam capabilities
 * @param [callback]
 */
Cam.prototype.getCapabilities = function(callback) {
	this._request({
		body: this._envelopeHeader() +
			'<GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl">' +
				'<Category>All</Category>' +
			'</GetCapabilities>' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.capabilities = _linerase(data[0]['getCapabilitiesResponse'][0]['capabilities'][0]);
			if (this.capabilities.PTZ && this.capabilities.PTZ.XAddr) {
				this.uri.ptz = url.parse(this.capabilities.PTZ.XAddr);
			}
			if (this.capabilities.media && this.capabilities.media.XAddr) {
				this.uri.media = url.parse(this.capabilities.media.XAddr);
			}
			if (this.capabilities.imaging && this.capabilities.imaging.XAddr) {
				this.uri.imaging = url.parse(this.capabilities.imaging.XAddr);
			}
			// extensions, eg. deviceIO
			if (this.capabilities.extension) {
				Object.keys(this.capabilities.extension).forEach(function(ext) {
					this.uri[ext] = url.parse(this.capabilities.extension[ext].XAddr);
				}.bind(this));
			}
		}
		if (callback) {
			callback.call(this, err, this.capabilities, xml);
		}
	}.bind(this));
};

/**
 * Returns the capabilities of the device service
 * @param [callback]
 */
Cam.prototype.getServiceCapabilities = function(callback) {
	this._request({
		body: this._envelopeHeader() +
			'<GetServiceCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl" />' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			data = _linerase(data);
			this.serviceCapabilities = {
				network: data.getServiceCapabilitiesResponse.capabilities.network.$
				, security: data.getServiceCapabilitiesResponse.capabilities.security.$
				, system: data.getServiceCapabilitiesResponse.capabilities.system.$
			};
			if (data.getServiceCapabilitiesResponse.capabilities.misc) {
				this.serviceCapabilities.auxiliaryCommands = data.getServiceCapabilitiesResponse.capabilities.misc.$.AuxiliaryCommands.split(' ');
			}
		}
		if (callback) {
			callback.call(this, err, this.serviceCapabilities, xml);
		}
	}.bind(this));
};

/**
 * Receive video sources
 * @param [callback]
 */
Cam.prototype.getVideoSources = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
			'<GetVideoSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.videoSources = _linerase(data).getVideoSourcesResponse.videoSources;
		}
		if (callback) {
			callback.call(this, err, this.videoSources, xml);
		}
	}.bind(this));
};

/**
 * Receive video sources
 * @param [callback]
 */
Cam.prototype.getVideoSourceConfigurations = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetVideoSourceConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.videoSourceConfigurations = _linerase(data).getVideoSourceConfigurationsResponse.configurations;
		}
		if (callback) {
			callback.call(this, err, this.videoSources, xml);
		}
	}.bind(this));
};

/**
 * Get all existing video encoder configurations of a device
 * @param callback
 */
Cam.prototype.getVideoEncoderConfigurations = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetVideoEncoderConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		console.log(data[0].getVideoEncoderConfigurationsResponse);
		if (!err) {
			this.videoEncoderConfigurations = data[0].getVideoEncoderConfigurationsResponse[0].configurations.map(function(config) {
				return _linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.videoEncoderConfigurations, xml);
		}
	}.bind(this));
};

// TODO AddVideoEncoderConfiguration

Cam.prototype.getVideoEncoderConfigurationOptions = function(options, callback) {
	if (callback === undefined) {callback = options; options = {};}
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
			'<GetVideoEncoderConfigurationOptions xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		//console.log(util.inspect(data[0], {depth: 10}));
		console.log(xml);
		if (!err) {
		}
		if (callback) {
			callback.call(this, err, this.videoEncoderConfigurations, xml);
		}
	}.bind(this));
};

/**
 * Get active sources
 * @private
 */
Cam.prototype.getActiveSources = function() {
	if (this.videoSources.$) { // NVT is a camera with one video source
		// let's choose first appropriate profile for our video source and make it default
		var videoSrcToken = this.videoSources.$.token
			, appropriateProfiles = this.profiles.filter(function(profile) {
				return profile.videoSourceConfiguration
					? profile.videoSourceConfiguration.sourceToken === videoSrcToken
					: false;
			});
		if (appropriateProfiles.length === 0) {
			throw new Error('Unrecognized configuration');
		}
		this.defaultProfile = appropriateProfiles[0];
		this.activeSource = {
			sourceToken: this.videoSources.$.token
			, profileToken: this.defaultProfile.$.token
			, encoding: this.defaultProfile.videoEncoderConfiguration.encoding
			, width: this.defaultProfile.videoEncoderConfiguration.resolution.width
			, height: this.defaultProfile.videoEncoderConfiguration.resolution.height
			, fps: this.defaultProfile.videoEncoderConfiguration.rateControl.frameLimit
			, bitrate: this.defaultProfile.videoEncoderConfiguration.rateControl.bitrateLimit
		};
		if (this.defaultProfile.PTZConfiguration) {
			this.activeSource.ptz = {
				name: this.defaultProfile.PTZConfiguration.name
				, token: this.defaultProfile.PTZConfiguration.$.token
			};
		}
	} else {
		// TODO NVT is an encoder with several video sources
		throw new Error ('not implemented');
	}
};

/**
 * /Media/ Receive profiles
 * @param [callback]
 */
Cam.prototype.getProfiles = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
			'<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			// this.profiles = _linerase(data).getProfilesResponse.profiles;
			this.profiles = data[0]['getProfilesResponse'][0]['profiles'].map(function(profile) {
				return _linerase(profile);
			});
		}
		if (callback) {
			callback.call(this, err, this.profiles, xml);
		}
	}.bind(this));
};

/**
 * Create an empty new deletable media profile
 * @param options
 * @param {string} options.name Profile name
 * @param {string} [options.token] Profile token
 * @param callback
 */
Cam.prototype.createProfile = function(options, callback) {
	// TODO name and token check
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<CreateProfile xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<Name>' + options.name + '</Name>' +
			'<Token>' + options.name + '</Token>' +
		'</CreateProfile>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		//console.log(xml);
		if (callback) {
			callback.call(this, err, this.services, xml);
		}
	}.bind(this));
};

/**
 * Delete a profile
 * @param token
 * @param callback
 */
Cam.prototype.deleteProfile = function(token, callback) {

};

/**
 * Receive services
 * @param [callback]
 */
Cam.prototype.getServices = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetServices xmlns="http://www.onvif.org/ver10/device/wsdl"><IncludeCapability>true</IncludeCapability></GetServices>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.services = _linerase(data).getServicesResponse.service;
		}
		if (callback) {
			callback.call(this, err, this.services, xml);
		}
	}.bind(this));
};

/**
 * Receive device information
 * @param [callback]
 */
Cam.prototype.getDeviceInformation = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.deviceInformation = _linerase(data).getDeviceInformationResponse;
		}
		if (callback) {
			callback.call(this, err, this.deviceInformation, xml);
		}
	}.bind(this));
};

/**
 * Receive stream URI
 * @param {Object} [options]
 * @param {string} [options.stream]
 * @param {string} [options.protocol]
 * @param [callback]
 */
Cam.prototype.getStreamUri = function(options, callback) {
	if (callback === undefined) { callback = options; options = {};	}
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<StreamSetup>' +
				'<Stream xmlns="http://www.onvif.org/ver10/schema">'+ (options.stream || 'RTP-Unicast') +'</Stream>' +
				'<Transport xmlns="http://www.onvif.org/ver10/schema">' +
					'<Protocol>'+ (options.protocol || 'RTSP') +'</Protocol>' +
				'</Transport>' +
			'</StreamSetup>' +
			'<ProfileToken>'+ (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetStreamUri>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		// TODO save srteam uri as a property?
		// if (!err) {
		// this.profiles[profile].streamUri = _linerase(data);
		// }
		if (callback) {
			callback.call(this, err, err ? null : _linerase(data).getStreamUriResponse.mediaUri, xml);
		}
	}.bind(this));
};

/**
 * Receive snapshot URI
 * @param {Object} [options]
 * @param {string} [options.profileToken]
 * @param [callback]
 */
Cam.prototype.getSnapshotUri = function(options, callback) {
	if (callback === undefined) { callback = options; options = {}; }
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
			'<GetSnapshotUri xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ProfileToken>'+ (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
			'</GetSnapshotUri>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
        if (callback) {
			callback.call(this, err, err ? null : _linerase(data).getSnapshotUriResponse.mediaUri, xml);
		}
	}.bind(this));
};

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
			'<ProfileToken>'+ (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetPresets>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.presets = {};
			_linerase(data).getPresetsResponse.preset.forEach(function(preset) {
				this.presets[preset.name] = preset.$.token;
			}.bind(this));
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
 * @param {string} options.preset PresetName from #presets property
 * @param {string|number} [options.speed.x] Pan speed, float
 * @param {string|number} [options.speed.y] Tilt speed, float
 * @param {string|number} [options.speed.zoom] Zoom speed, float
 * @param callback
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
 * /PTZ/ Receive cam status
 * @param {Object} [options]
 * @param {string} [options.profileToken]
 * @param {Function} callback
 */
Cam.prototype.getStatus = function(options, callback) {
	if (callback === undefined) { callback = options; options = {};	}
	this._request({
		service: 'ptz'
		, body: this._envelopeHeader() +
		'<GetStatus xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
		'<ProfileToken>'+ (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetStatus>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
    var status;
		if (!err) {
			var res = _linerase(data).getStatusResponse.PTZStatus;
			status = {
				position: {
					x: res.position.panTilt.$.x
					, y: res.position.panTilt.$.y
					, zoom: res.position.zoom.$.x
				}
				, moveStatus: res.moveStatus
				, error: res.error
				, utcTime: res.utcTime
			};
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
    var nodes;
		if (!err) {
			nodes = this.nodes = {};
			data[0]['getNodesResponse'].forEach(function(ptzNode) {
				nodes[ptzNode['PTZNode'][0].$.token] = _linerase(ptzNode['PTZNode'][0]);
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
				configurations[configuration['PTZConfiguration'][0]['name']] = {
					useCount: parseInt(configuration['PTZConfiguration'][0]['useCount'])
					, nodeToken: configuration['PTZConfiguration'][0]['nodeToken'][0]
					, defaultPTZSpeed: {
						x: configuration['PTZConfiguration'][0]['defaultPTZSpeed'][0]['panTilt'][0].$.x
						, y: configuration['PTZConfiguration'][0]['defaultPTZSpeed'][0]['panTilt'][0].$.y
						, zoom: configuration['PTZConfiguration'][0]['defaultPTZSpeed'][0]['zoom'][0].$.x
					}
					, defaultPTZTimeout: configuration['PTZConfiguration'][0]['defaultPTZTimeout'][0]
				};
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
				'<ConfigurationToken>'+ configurationToken + '</ConfigurationToken>' +
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
 * @param {string} [options.profileToken]
 * @param {string|number} [options.x] Pan, float
 * @param {string|number} [options.y] Tilt, float
 * @param {string|number} [options.zoom] Zoom, float
 * @param {object} [options.speed] If the speed argument is omitted, the default speed set by the PTZConfiguration will be used.
 * @param {string|number} [options.speed.x] Pan speed, float
 * @param {string|number} [options.speed.y] Tilt speed, float
 * @param {string|number} [options.speed.zoom] Zoom speed, float
 * @param {Function} [callback]
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
 * @param {string} [options.profileToken]
 * @param {string|number} [options.x] Pan, float
 * @param {string|number} [options.y] Tilt, float
 * @param {string|number} [options.zoom] Zoom, float
 * @param {object} [options.speed] If the speed argument is omitted, the default speed set by the PTZConfiguration will be used.
 * @param {string|number} [options.speed.x] Pan speed, float
 * @param {string|number} [options.speed.y] Tilt speed, float
 * @param {string|number} [options.speed.zoom] Zoom speed, float
 * @param {Function} [callback]
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
 * @param {string|number} [options.x] pan velocity, float
 * @param {string|number} [options.y] tilt velocity, float
 * @param {string|number} [options.zoom] zoom velocity, float
 * @param {number} [options.timeout] timeout in milliseconds
 * @param callback
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
 * @param {function} [callback]
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
 * /Device/ Reboot the device
 * @param {function(string)} callback
 */
Cam.prototype.systemReboot = function(callback) {
	this._request({
		service: 'deviceIO'
		, body: this._envelopeHeader() +
		'<SystemReboot xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, res, xml) {
		if (!err) {
			res = res[0].systemRebootResponse[0].message[0];
		}
		callback.call(this, err, res, xml);
	});
};

/**
 * Generate arguments for digest auth
 * @return {{passdigest: *, nonce: (*|String), timestamp: string}}
 * @private
 */
Cam.prototype._passwordDigest = function() {
  var timestamp
    , nonce;
  
	if (!timestamp) {
		timestamp = new Date().toISOString(); // TODO timestamp and nonce
	}
	if (!nonce) {
		nonce = Math.ceil(Math.random()*10000000000).toString();
	}
	var cryptoDigest = crypto.createHash('sha1');
	cryptoDigest.update(nonce + timestamp + this.password);
	var passdigest = cryptoDigest.digest('base64');
	return {
		passdigest: passdigest
		, nonce: new Buffer(nonce).toString('base64')
		, timestamp: timestamp
	};
};

Cam.prototype._envelopeHeader = function() {
	var req = this._passwordDigest();
	return '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
		'<s:Header>' +
			'<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">' +
				'<UsernameToken>' +
					'<Username>' + this.username + '</Username>' +
					'<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">' + req.passdigest + '</Password>' +
					'<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">' + req.nonce + '</Nonce>' +
					'<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' + req.timestamp + '</Created>' +
				'</UsernameToken>' +
			'</Security>' +
		'</s:Header>' +
		'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
};

Cam.prototype._envelopeFooter = function() {
	return '</s:Body>' +
		'</s:Envelope>';
};

/**
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
					+ '" y="' + ptz.y + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>'
				: '') +
		(ptz.zoom !== undefined
				? '<Zoom x="'
					+ ptz.zoom + '" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>'
				: '')
		: '';
};

var Discovery = Object.create(new events.EventEmitter());

/**
 * Discover NVT devices in the subnetwork
 * @param {object} [options]
 * @param {number} [options.timeout] timeout for discovery responses
 * @param {boolean} [options.resolve] set to `false` if you want omit creating of Cam objects
 * @param {function(Array<Cam|object>)} [callback]
 */
Discovery.probe = function(options, callback) {
	if (callback === undefined) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		} else {
			options = options || {};
		}
	}
	callback = callback || function() {};

	var cams = []
    , seenCams = []
		, messageID = 'urn:uuid:' + '01234567-dead-beef-baad-abcdeffedcba' // No needs for real uuid here
		, request = new Buffer(
			'<s:Envelope ' +
				'xmlns:s="http://www.w3.org/2003/05/soap-envelope" ' +
				'xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing">' +
				'<s:Header>' +
					'<a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>' +
					'<a:MessageID>' + messageID + '</a:MessageID>' +
					'<a:ReplyTo><a:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</a:Address></a:ReplyTo>' +
					'<a:To s:mustUnderstand="1">urn:docs-oasis-open-org:ws-dd:ns:discovery:2009:01</a:To>' +
				'</s:Header>' +
				'<s:Body>' +
					'<Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">' +
						'<d:Types xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dp0="http://www.onvif.org/ver10/network/wsdl">dp0:NetworkVideoTransmitter</d:Types>' +
					'</Probe>' +
				'</s:Body>' +
			'</s:Envelope>'
		)
		, socket = require('dgram').createSocket('udp4');

	socket.on('error', function (err) {
		Discovery.emit('error', err);
		callback(err);
	});

	var listener = function(msg, rinfo) {
		parseSOAPString(msg, function(err, data, xml) {
			if (err || !data[0].probeMatches) {
				Discovery.emit('error', 'Wrong SOAP message from ' + rinfo.address + ':' + rinfo.port, xml);
			} else {
				data = _linerase(data);

        // Possible to get multiple matches for the same camera
        // when your computer has more than one network adapter in the same subnet
        var camAddr = data.probeMatches.probeMatch.endpointReference.address;
        if(!seenCams[camAddr]) {
          seenCams[camAddr] = true;

          var cam;
          if (options.resolve !== false) {
            var camUri = url.parse(data.probeMatches.probeMatch.XAddrs);
            cam = new Cam({
              hostname: camUri.hostname
              , port: camUri.port
              , path: camUri.path
            });
          } else {
            cam = data;
          }
          cams.push(cam);
          Discovery.emit('device', cam, rinfo, xml);
        }
      }
		});
	};

	socket.on('message', listener);
	socket.send(request, 0, request.length, 3702, '239.255.255.250');

	setTimeout(function() {
		socket.removeListener('message', listener);
		socket.close();
		callback(null, cams);
	}.bind(this), options.timeout || 5000);
};

module.exports = {
	Cam: Cam
	, Discovery: Discovery
};
