/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.14.
 */

'use strict';

var http = require('http')
	, async = require('async')
	, parseString = require('xml2js').parseString
	, crypto = require('crypto')
	, util = require('util')
	, events = require('events')
	, url = require('url')
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

	async.parallel({
		getCapabilities: this.getCapabilities.bind(this)
		, getVideoSources: this.getVideoSources.bind(this)
		, getProfiles: this.getProfiles.bind(this)
	}, function(err, results) {
		if (err && callback) {
			return callback.call(this, err);
		}
		this.getActiveSources();
		if (callback) {
			callback.call(this, err);
		}
	}.bind(this));
};

// events.EventEmitter inheritance
util.inherits(Cam, events.EventEmitter);

Cam.prototype.connect = function(callback) {
	this.getCapabilities(function(err, caps) {
		if (err) {
			return callback(err);
		}
		this._processOnvifInformation();
	});
};

/**
 * @callback Cam.requestCallback
 * @param {Error} err
 * @param {object} responseMessage
 */

/**
 * Common camera request
 * @param {object} options
 * @param {object} options.body SOAP body
 * @param {boolean} [options.ptz] make request to PTZ uri or not
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
					callback(err, result['SOAP-ENV:Envelope']['SOAP-ENV:Body']);
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
	}, function(err, data) {
		var dt = _linerase(data[0]['tds:GetSystemDateAndTimeResponse'][0]['tds:SystemDateAndTime'][0]['tt:UTCDateTime'][0]);
		callback(err, err ? null : new Date(dt.date.year, dt.date.month, dt.date.day, dt.time.hour, dt.time.minute, dt.time.second));
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
	}, function(err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		this.capabilities = _linerase(data[0]['tds:GetCapabilitiesResponse'][0]['tds:Capabilities'][0]);
		if (this.capabilities.PTZ.XAddr) {
			/**
			 * PTZ URI object
			 */
			this.ptzUri = url.parse(this.capabilities.PTZ.XAddr);
		}
		if (callback) {
			callback(null, this.capabilities);
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
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		this.videoSources = _linerase(data).getVideoSourcesResponse.videoSources;
		if (callback) {
			callback(null, this.videoSources);
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
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		// this.profiles = _linerase(data).getProfilesResponse.profiles;
		this.profiles = data[0]['trt:GetProfilesResponse'][0]['trt:Profiles'].map(function(profile) {
			return _linerase(profile);
		});
		if (this.profiles.length) {
			this.defaultProfile = this.profiles[0]; // setting up default profile
		}
		if (callback) {
			callback(null, this.profiles);
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
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		this.services = _linerase(data).getServicesResponse.service;
		if (callback) {
			callback(null, this.services);
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
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		this.deviceInformation = _linerase(data).getDeviceInformationResponse;
		if (callback) {
			callback(null, this.deviceInformation);
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
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		// TODO save sream uri as a property?
		// this.profiles[profile].streamUri = _linerase(data);
		if (callback) {
			callback(null, _linerase(data).getStreamUriResponse.mediaUri);
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
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		this.presets = {};
		_linerase(data).getPresetsResponse.preset.forEach(function(preset) {
			this.presets[preset.name] = preset.$.token;
		}.bind(this));
		if (callback) {
			callback(null, this.presets);
		}
	}.bind(this));
};

/**
 * PTZ relative move
 * @param {object} options
 * @param {string} [options.profileToken]
 * @param {string} options.translationPanTiltX
 * @param {string} options.translationPanTiltY
 * @param {string} options.speedPanTiltX
 * @param {string} options.speedPanTiltY
 * @param callback
 * @constructor
 */
Cam.prototype.PTZrelativeMove = function(options, callback) {
	this._request({
		body: this._envelopeHeader() +
			'<RelativeMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
				'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
				'<Translation>' +
					'<PanTilt x="' + options.translationPanTiltX + '" y="' + options.translationPanTiltY + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/TranslationGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' +
				'</Translation>' +
				'<Speed>' +
					'<PanTilt x="' + options.speedPanTiltX + '" y="' + options.speedPanTiltY + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/GenericSpeedSpace" xmlns="http://www.onvif.org/ver10/schema"/>' +
				'</Speed>' +
			'</RelativeMove>' +
			this._envelopeFooter()
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		console.log(JSON.stringify(data));
		if (callback) {
			callback(null);
		}
	}.bind(this));
};

/**
 * PTZ relative move
 * @param {object} options
 * @param {string} [options.profileToken]
 * @param {string} options.positionPanTiltX
 * @param {string} options.positionPanTiltY
 * @param {string} options.zoom
 * @param callback
 * @constructor
 */
Cam.prototype.PTZabsoluteMove = function(options, callback) {
	this._request({
		body: this._envelopeHeader() +
			'<AbsoluteMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
				'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
				'<Position>' +
					'<PanTilt x="' + options.positionPanTiltX + '" y="' + options.positionPanTiltY + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' +
					'<Zoom x="' + options.zoom + '" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' +
				'</Position>' +
			'</AbsoluteMove>' +
			this._envelopeFooter()
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		console.log(JSON.stringify(data));
		if (callback) {
			callback(null);
		}
	}.bind(this));
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

var _cropName = exports._cropName = function (name) {
	var colonPos = name.indexOf(':')
		;
	if (~colonPos) {
		name = name.substr(colonPos + 1);
	}
	var secondLetter = name[1];
	if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
		name = name[0].toLowerCase() + name.substr(1);
	}
	return name;
};

var _linerase = exports._linerase = function (xml) {
	if (Array.isArray(xml)) {
		if (xml.length > 1) {
			return xml.map(_linerase);
		} else {
			xml = xml[0];
		}
	}
	if (typeof xml === 'object') {
		var obj = {};
		Object.keys(xml).forEach(function (key) {
			if (key === '$') {
				obj.$ = xml.$;
			} else {
				obj[_cropName(key)] = _linerase(xml[key]);
			}
		});
		return obj;
	} else {
		if (xml === 'true') { return true; }
		if (xml === 'false') { return false; }
		if (!isNaN(parseInt(xml))) { return parseInt(xml); }
		return xml;
	}
};

module.exports.Cam = Cam;

//var cam = new Cam({hostname: 'localhost', port: 10101, username: 'admin', password: '9999'}, function(err) {
/*
var cam = new Cam({hostname: '192.168.68.111', username: 'admin', password: '9999'}, function(err) {
	if (err) {
		return console.log(err);
	}
	console.log(JSON.stringify(this));
	this.PTZabsoluteMove({
		speedPanTiltX: 1
		, speedPanTiltY: 1
		, translationPanTiltX: 1
		, translationPanTiltY: 1
		, positionPanTiltX: 1 //(Math.random() * 2) - 1
		, positionPanTiltY: 1
		, zoom: 1
	});
	//console.log(this.ptzUri);
	//this.getProfiles(function(err,d){console.log(JSON.stringify(d));});
});
cam.on('rawResponse', function(data) {
	console.log(data);
});
*/

/*
var cam = new Cam({hostname: '192.168.68.111', username: 'admin', password: '9999'}, function(err) {
	if (err) {
		return console.log(err);
	}
	console.log(JSON.stringify(this));
	setInterval(function() {
		this.PTZabsoluteMove({
			speedPanTiltX: 1
			, speedPanTiltY: 1
			, translationPanTiltX: 1
			, translationPanTiltY: 1
			, positionPanTiltX: 1 //(Math.random() * 2) - 1
			, positionPanTiltY: 1
			, zoom: 1
		});
	}.bind(this), 5000);
});
*/
