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
	;

var Cam = function(options, callback) {
	this.hostname = options.hostname;
	this.username = options.username;
	this.password = options.password;
	this.port = options.port ? options.port : 80;
	this.path = '/onvif/device_service';
	async.parallel({
		getCapabilities: this.getCapabilities.bind(this)
		, getVideoSources: this.getVideoSources.bind(this)
		, getProfiles: this.getProfiles.bind(this)
	}, function(err, results) {
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
 * @param {object} options SOAP body
 * @param {Cam.requestCallback} callback
 * @private
 */
Cam.prototype._request = function(options, callback) {
	var req = http.request({
		hostname: this.hostname
		, headers: {
			'Content-Type': 'application/soap+xml'
			, charset: 'utf-8'
		}
		, port: this.port
		, path: this.path
		, method: 'POST'
	}, function(res) {
		var bufs = [], length = 0;
		res.on('data', function(chunk) {
			bufs.push(chunk);
			length += chunk.length;
		});
		res.on('end', function() {
			var xml = Buffer.concat(bufs, length).toString('utf8');
			parseString(xml, function(err, result) {
				callback(err, result['SOAP-ENV:Envelope']['SOAP-ENV:Body']);
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
		if (callback) {
			callback(err, err ? null : _linerase(data[0]['tds:GetSystemDateAndTimeResponse'][0]['tds:SystemDateAndTime'][0]['tt:UTCDateTime'][0]));
		}
	});
};

/**
 * Receive cam capabilities
 * @param [callback]
 */
Cam.prototype.getCapabilities = function(callback) {
	var req = this._passwordDigest();
	//console.log(req);
	this._request({
		body:
		'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
			'<s:Header>' +
				'<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">' +
					'<UsernameToken>' +
						'<Username>' + req.username + '</Username>' +
						'<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">' + req.passdigest + '</Password>' +
						'<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">' + req.nonce + '</Nonce>' +
						'<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' + req.timestamp + '</Created>' +
					'</UsernameToken>' +
				'</Security>' +
			'</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl">' +
					'<Category>All</Category>' +
				'</GetCapabilities>' +
			'</s:Body>' +
		'</s:Envelope>'
	}, function(err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		this.capabilities = _linerase(data[0]['tds:GetCapabilitiesResponse'][0]['tds:Capabilities'][0]);
		/*
		this.getVideoSources(function(err, data) {

		});
		*/
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
		body:
			'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
				'<s:Header>' +
					'<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">' +
						'<UsernameToken>' +
							'<Username>' + this.username + '</Username>' +
							'<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">' + req.passdigest + '</Password>' +
							'<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">' + req.nonce + '</Nonce>' +
							'<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' + req.timestamp + '</Created>' +
						'</UsernameToken></Security>' +
				'</s:Header>' +
				'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
					'<GetVideoSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
				'</s:Body>' +
			'</s:Envelope>'
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
 */
Cam.prototype.getActiveSources = function() {
	if (this.videoSources.$) { // NVT is a camera
		if (this.videoSources.$.token === this.profiles.videoSourceConfiguration.sourceToken) {
			this.activeSource = {
				sourceToken: this.videoSources.$.token
				, profileToken: this.profiles.name
				, encoding: this.profiles.videoEncoderConfiguration.encoding
				, width: this.profiles.videoEncoderConfiguration.resolution.width
				, height: this.profiles.videoEncoderConfiguration.resolution.height
				, fps: this.profiles.videoEncoderConfiguration.rateControl.frameLimit
				, bitrate: this.profiles.videoEncoderConfiguration.rateControl.bitrateLimit
			};
			if (this.profiles.PTZConfiguration) {
				this.activeSource.ptz = {
					name: this.profiles.PTZConfiguration.name
					, token: this.profiles.PTZConfiguration.$.token
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
	var req = this._passwordDigest();
	this._request({
		body:
			'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
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
				'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
					'<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
				'</s:Body>' +
			'</s:Envelope>'
	}, function (err, data) {
		if (err) {
			return callback ? callback(err) : null;
		}
		this.profiles = _linerase(data).getProfilesResponse.profiles;
		if (callback) {
			callback(null, this.profiles);
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
	var req = this._passwordDigest();
	this._request({
		body:
			'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
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
				'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
					'<RelativeMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">' +
						'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
						'<Translation>' +
							'<PanTilt x="' + options.translationPanTiltX + '" y="' + options.translationPanTiltY + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/TranslationGenericSpace" xmlns="http://www.onvif.org/ver10/schema"/>' +
						'</Translation>' +
						'<Speed>' +
							'<PanTilt x="' + options.speedPanTiltX + '" y="' + options.speedPanTiltY + '" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/GenericSpeedSpace" xmlns="http://www.onvif.org/ver10/schema"/>' +
						'</Speed>' +
					'</RelativeMove>' +
				'</s:Body>' +
			'</s:Envelope>'
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

function _cropName(name) {
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
}

var _linerase = exports._linerase = function _linerase(xml) {
	if (Array.isArray(xml)) {
		if (xml.length > 1) {
			return xml.map(_linerase);
			/*return xml.map(function(val) {
				console.log(val);
				return _linerase(val);
			});*/
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

exports.Cam = Cam;


var cam = new Cam({hostname: '192.168.68.111', username: 'admin', password: '9999'}, function(err) {
	console.log(JSON.stringify(this));
	setInterval(function() {
		this.PTZrelativeMove({
			speedPanTiltX: '1'
			, speedPanTiltY: '1'
			, translationPanTiltX: '1'
			, translationPanTiltY: '1'
		});
	}.bind(this), 5000);
});
