/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.14.
 */

'use strict';

var http = require('http')
	, parseString = require('xml2js').parseString
	, crypto = require('crypto')
	, util = require('util')
	, events = require('events')
	, url = require('url')
	, _linerase = require('./soapHelpers')._linerase
	, extend = require('util')._extend
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
 * @param options
 * @param callback
 * @property presets
 * @class
 * @constructor
 */
var Cam = function(options, callback) {
	this.hostname = options.hostname;
	this.username = options.username;
	this.password = options.password;
	this.port = options.port ? options.port : 80;
	this.path = '/onvif/device_service';

	/**
	 * Camera profile information
	 * @type {Object.<string, Profile>}
	 */
	this.profiles = {};

	this.connect(callback);
};

// events.EventEmitter inheritance
util.inherits(Cam, events.EventEmitter);

/**
 * Connect to the camera and fill device information properties
 * @param {Function} callback
 */
Cam.prototype.connect = function(callback) {
	var upstartFunctions = [this.getCapabilities, this.getVideoSources, this.getProfiles]
		, count = upstartFunctions.length
		, self = this
		;
	upstartFunctions.forEach(function(fun) {
		fun.call(self, function(err) {
			if (err) {
				if (callback) {
					callback.call(this, err);
				}
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
 * @param {object} options.body SOAP body
 * @param {boolean} [options.ptz] make request to PTZ uri or not
 * @param {Function} callback response callback
 * @param {Cam.requestCallback} callback
 * @private
 */
Cam.prototype._request = function(options, callback) {
	if (options.ptz && !this.ptzUri) {
		return callback(new Error('PTZ uri is absent'));
	}
	var _this = this;
	var req = http.request({
		hostname: options.ptz ? this.ptzUri.hostname : this.hostname
		, headers: {
			'Content-Type': 'application/soap+xml'
			, charset: 'utf-8'
		}
		, port: options.ptz ? this.ptzUri.port : this.port
		, path: options.ptz ? this.ptzUri.path : this.path
		, method: 'POST'
	}, function(res) {
		var bufs = [], length = 0;
		res.on('data', function(chunk) {
			bufs.push(chunk);
			length += chunk.length;
		});
		res.on('end', function() {
			var xml = Buffer.concat(bufs, length).toString('utf8');
			_this.emit('rawResponse', xml);
			parseString(xml, function(err, result) {
				if (!result || !result['SOAP-ENV:Envelope'] || !result['SOAP-ENV:Envelope']['SOAP-ENV:Body']) {
					callback(new Error('Wrong ONVIF SOAP response'));
				} else {
					callback(err, result['SOAP-ENV:Envelope']['SOAP-ENV:Body'], xml);
				}
			});
		})
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
		var dt = _linerase(data[0]['tds:GetSystemDateAndTimeResponse'][0]['tds:SystemDateAndTime'][0]['tt:UTCDateTime'][0]);
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
			this.capabilities = _linerase(data[0]['tds:GetCapabilitiesResponse'][0]['tds:Capabilities'][0]);
			if (this.capabilities.PTZ.XAddr) {
				/**
				 * PTZ URI object
				 */
				this.ptzUri = url.parse(this.capabilities.PTZ.XAddr);
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
				this.serviceCapabilities.auxiliaryCommands = data.getServiceCapabilitiesResponse.capabilities.misc.$.auxiliaryCommands.split(' ')
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
	var req = this._passwordDigest();
	this._request({
		body: this._envelopeHeader() +
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
 * Get active sources
 * @private
 */
Cam.prototype.getActiveSources = function() {
	if (this.videoSources.$) { // NVT is a camera
		if (this.videoSources.$.token === this.defaultProfile.videoSourceConfiguration.sourceToken) {
			this.activeSource = {
				sourceToken: this.videoSources.$.token
				, profileToken: this.defaultProfile.name
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
				}
			}
		} else {
			throw new Error('Unrecognized configuration');
		}
	} else {
		// TODO NVT is an encoder
		throw new Error ('not implemented');
	}
};

/**
 * Receive profiles
 * @param [callback]
 */
Cam.prototype.getProfiles = function(callback) {
	this._request({
		body: this._envelopeHeader() +
			'<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			// this.profiles = _linerase(data).getProfilesResponse.profiles;
			this.profiles = data[0]['trt:GetProfilesResponse'][0]['trt:Profiles'].map(function(profile) {
				return _linerase(profile);
			});
			if (this.profiles.length) {
				this.defaultProfile = this.profiles[0]; // setting up default profile
			}
		}
		if (callback) {
			callback.call(this, err, this.profiles, xml);
		}
	}.bind(this));
};

/**
 * Receive services
 * @param [callback]
 */
Cam.prototype.getServices = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetServices xmlns="http://www.onvif.org/ver10/device/wsdl"><IncludeCapability>false</IncludeCapability></GetServices>' +
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
 * @param {Object} options
 * @param {string} [options.stream]
 * @param {string} [options.protocol]
 * @param [callback]
 */
Cam.prototype.getStreamUri = function(options, callback) {
	var profile = options.profileToken || this.activeSource.profileToken;
	this._request({
		body: this._envelopeHeader() +
		'<GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<StreamSetup>' +
				'<Stream xmlns="http://www.onvif.org/ver10/schema">'+ (options.stream || 'RTP-Unicast') +'</Stream>' +
				'<Transport xmlns="http://www.onvif.org/ver10/schema">' +
					'<Protocol>'+ (options.protocol || 'RTSP') +'</Protocol>' +
				'</Transport>' +
			'</StreamSetup>' +
			'<ProfileToken>'+ profile +'</ProfileToken>' +
		'</GetStreamUri>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		// TODO save sream uri as a property?
		// if (!err) {
		// this.profiles[profile].streamUri = _linerase(data);
		// }
		if (callback) {
			callback.call(this, err, err ? null : _linerase(data).getStreamUriResponse.mediaUri, xml);
		}
	}.bind(this));
};

/**
 * Receive cam presets
 * @param {Object} options
 * @param {string} [options.stream]
 * @param {string} [options.protocol]
 * @param [callback]
 */
Cam.prototype.getPresets = function(options, callback) {
	this._request({
		body: this._envelopeHeader() +
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
 * Receive cam status
 * @param {Object} options
 * @param {string} [options.stream]
 * @param {string} [options.protocol]
 * @param {Function} callback
 */
Cam.prototype.getStatus = function(options, callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetStatus xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
		'<ProfileToken>'+ (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetStatus>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			var res = _linerase(data).getStatusResponse.PTZStatus;
			var status = {
				position: {
					x: res.position.panTilt.$.x
					, y: res.position.panTilt.$.y
					, zoom: res.position.zoom.$.x
				}
				, moveStatus: res.moveStatus
				, utcTime: res.utcTime
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
		body: this._envelopeHeader() +
			'<GetNodes xmlns="http://www.onvif.org/ver20/ptz/wsdl" />' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			var nodes = this.nodes = {};
			data[0]['tptz:GetNodesResponse'].forEach(function(ptzNode) {
				nodes[ptzNode['tptz:PTZNode'][0].$.token] = _linerase(ptzNode['tptz:PTZNode'][0]);
				delete nodes[ptzNode['tptz:PTZNode'][0].$.token].$;
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
		body: this._envelopeHeader() +
			'<GetConfigurations xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'</GetConfigurations>' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			var configurations = {};
			data[0]['tptz:GetConfigurationsResponse'].forEach(function(configuration) {
				configurations[configuration['tptz:PTZConfiguration'][0]['tt:Name']] = {
					useCount: parseInt(configuration['tptz:PTZConfiguration'][0]['tt:UseCount'])
					, nodeToken: configuration['tptz:PTZConfiguration'][0]['tt:NodeToken'][0]
					, defaultPTZSpeed: {
						x: configuration['tptz:PTZConfiguration'][0]['tt:DefaultPTZSpeed'][0]['tt:PanTilt'][0].$.x
						, y: configuration['tptz:PTZConfiguration'][0]['tt:DefaultPTZSpeed'][0]['tt:PanTilt'][0].$.y
						, zoom: configuration['tptz:PTZConfiguration'][0]['tt:DefaultPTZSpeed'][0]['tt:Zoom'][0].$.x
					}
					, defaultPTZTimeout: configuration['tptz:PTZConfiguration'][0]['tt:DefaultPTZTimeout'][0]
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
		body: this._envelopeHeader() +
			'<GetConfigurationOptions xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
				'<ConfigurationToken>'+ configurationToken + '</ConfigurationToken>' +
			'</GetConfigurationOptions>' +
			this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			var sp = data[0]['tptz:GetConfigurationOptionsResponse'][0]['tptz:PTZConfigurationOptions'][0]['tt:Spaces'][0];
			var configOptions = {
				ptzTimeout: {
					min: data[0]['tptz:GetConfigurationOptionsResponse'][0]['tptz:PTZConfigurationOptions'][0]['tt:PTZTimeout'][0]['tt:Min']
					, max: data[0]['tptz:GetConfigurationOptionsResponse'][0]['tptz:PTZConfigurationOptions'][0]['tt:PTZTimeout'][0]['tt:Max']
				}
				, spaces: {
					absolute: {
						x: {
							min: parseFloat(sp['tt:AbsolutePanTiltPositionSpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:AbsolutePanTiltPositionSpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:AbsolutePanTiltPositionSpace'][0]['tt:URI']
						}
						, y: {
							min: parseFloat(sp['tt:AbsolutePanTiltPositionSpace'][0]['tt:YRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:AbsolutePanTiltPositionSpace'][0]['tt:YRange'][0]['tt:Max'][0])
							, uri: sp['tt:AbsolutePanTiltPositionSpace'][0]['tt:URI']
						}
						, zoom: {
							min: parseFloat(sp['tt:AbsoluteZoomPositionSpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:AbsoluteZoomPositionSpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:AbsoluteZoomPositionSpace'][0]['tt:URI']
						}
					}
					, relative: {
						x: {
							min: parseFloat(sp['tt:RelativePanTiltTranslationSpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:RelativePanTiltTranslationSpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:RelativePanTiltTranslationSpace'][0]['tt:URI']
						}
						, y: {
							min: parseFloat(sp['tt:RelativePanTiltTranslationSpace'][0]['tt:YRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:RelativePanTiltTranslationSpace'][0]['tt:YRange'][0]['tt:Max'][0])
							, uri: sp['tt:RelativePanTiltTranslationSpace'][0]['tt:URI']
						}
						, zoom: {
							min: parseFloat(sp['tt:RelativeZoomTranslationSpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:RelativeZoomTranslationSpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:RelativeZoomTranslationSpace'][0]['tt:URI']
						}
					}
					, continuous: {
						x: {
							min: parseFloat(sp['tt:ContinuousPanTiltVelocitySpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:ContinuousPanTiltVelocitySpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:ContinuousPanTiltVelocitySpace'][0]['tt:URI']
						}
						, y: {
							min: parseFloat(sp['tt:ContinuousPanTiltVelocitySpace'][0]['tt:YRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:ContinuousPanTiltVelocitySpace'][0]['tt:YRange'][0]['tt:Max'][0])
							, uri: sp['tt:ContinuousPanTiltVelocitySpace'][0]['tt:URI']
						}
						, zoom: {
							min: parseFloat(sp['tt:ContinuousZoomVelocitySpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:ContinuousZoomVelocitySpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:ContinuousZoomVelocitySpace'][0]['tt:URI']
						}
					}
					, common: {
						x: {
							min: parseFloat(sp['tt:PanTiltSpeedSpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:PanTiltSpeedSpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:PanTiltSpeedSpace'][0]['tt:URI']
						}
						, zoom: {
							min: parseFloat(sp['tt:ZoomSpeedSpace'][0]['tt:XRange'][0]['tt:Min'][0])
							, max: parseFloat(sp['tt:ZoomSpeedSpace'][0]['tt:XRange'][0]['tt:Max'][0])
							, uri: sp['tt:ZoomSpeedSpace'][0]['tt:URI']
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
 * PTZ relative move
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
	this._request({
		body: this._envelopeHeader() +
			'<RelativeMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			'<Translation>' +
			(options.x && options.y ? '<PanTilt x="' + options.x + '" y="' + options.y + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
			(options.zoom ? '<Zoom x="' + options.zoom + '" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
			'</Translation>' +
			(options.speed ?
				'<Speed>' +
					(options.speed.x && options.speed.y ? '<PanTilt x="' + options.speed.x + '" y="' + options.speed.y + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
					(options.zoom ? '<Zoom x="' + options.zoom + '" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
					'</Speed>'
				: '') +
			'</RelativeMove>' +
			this._envelopeFooter()
	}, callback);
};

/**
 * PTZ absolute move
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
	this._request({
		body: this._envelopeHeader() +
			'<AbsoluteMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
				'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
				'<Position>' +
					(options.x && options.y ? '<PanTilt x="' + options.x + '" y="' + options.y + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
					(options.zoom ? '<Zoom x="' + options.zoom + '" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
				'</Position>' +
				(options.speed ?
					'<Speed>' +
						(options.speed.x && options.speed.y ? '<PanTilt x="' + options.speed.x + '" y="' + options.speed.y + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
						(options.zoom ? '<Zoom x="' + options.zoom + '" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' : '') +
					'</Speed>'
					: '') +
			'</AbsoluteMove>' +
			this._envelopeFooter()
	}, callback);
};

/**
 * Send auxiliary commands to the PTZ device mapped by the PTZNode in the selected profile.
 * @param options
 * @param {string} options.data auxiliary command
 * @param {Function} callback
 */
Cam.prototype.sendAuxiliaryCommand = function(options, callback) {
	this._request({
		body: this._envelopeHeader() +
			'<SendAuxiliaryCommand xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
			'<AuxiliaryData>' +
			options.data +
			'</AuxiliaryData>' +
			'</SendAuxiliaryCommand>' +
			this._envelopeFooter()
	}, function(err, data) {
		console.log(err || JSON.stringify(data));
	});
};

/**
 * Generate arguments for digest auth
 * @return {{passdigest: *, nonce: (*|String), timestamp: string}}
 * @private
 */
Cam.prototype._passwordDigest = function() {
	if (!timestamp) {
		var timestamp = new Date().toISOString(); // TODO timestamp and nonce
	}
	if (!nonce) {
		var nonce = Math.ceil(Math.random()*10000000000).toString()
	}
	var cryptoDigest = crypto.createHash('sha1');
	cryptoDigest.update(nonce + timestamp + this.password);
	var passdigest = cryptoDigest.digest('base64');
	return {
		passdigest: passdigest
		, nonce: new Buffer(nonce).toString('base64')
		, timestamp: timestamp
	}
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

module.exports.Cam = Cam;