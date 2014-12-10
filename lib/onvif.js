/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.14.
 */

'use strict';

var http = require('http')
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
		//console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.on('data', function(chunk) {
			// console.log('CHUNK: ' + chunk);
			bufs.push(chunk);
			length += chunk.length;
		});
		res.on('end', function() {
			// console.log('END');
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

Cam.prototype.getSystemDateAndTime = function(callback) {
	this._request({
		body:
		'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
			'</s:Body>' +
		'</s:Envelope>'
	}, function(err, data) {
		if (err) { return callback(err); }
		callback(null, _linerase(data[0]['tds:GetSystemDateAndTimeResponse'][0]['tds:SystemDateAndTime'][0]['tt:UTCDateTime'][0]));
	});
};

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
			return callback(err);
		}
		this.capabilities = _linerase(data[0]['tds:GetCapabilitiesResponse'][0]['tds:Capabilities'][0]);
		this._processOnvifInformation();
		/*
		this.getVideoSources(function(err, data) {

		});
		*/
		callback(null, this.capabilities);
	}.bind(this));
};

Cam.prototype._processOnvifInformation = function() {
	if (this.capabilities.device.system.supportedVersions) {
		this.onvifVersion = {
			major: this.capabilities.device.system.supportedVersions.major
			, minor: this.capabilities.device.system.supportedVersions.minor
		}
	}
	this.mediaURI = this.capabilities.media.XAddr;
	this.deviceURI = this.capabilities.device.XAddr;
	this.PTZURI = this.capabilities.PTZ.XAddr;
	this.baseURI = /^http(.*)onvif\//.exec(this.mediaURI)[1];
};

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
			return callback(err);
		}
		callback(null, _linerase(data));
	});
};

/**
 * Generate arguments for digest auth
 * @return {{passdigest: *, nonce: (*|String), timestamp: string}}
 * @private
 */
Cam.prototype._passwordDigest = function() {
	if (!timestamp) {
		var timestamp = new Date().toISOString();
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
	if (secondLetter.toUpperCase() !== secondLetter) {
		name = name[0].toLowerCase() + name.substr(1);
	}
	return name;
}

function _linerase(xml) {
	if (Array.isArray(xml)) {
		xml = xml[0];
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
}

exports.Cam = Cam;

var cam = new Cam({hostname: '192.168.68.111', username: 'admin', password: '9999'});

/*
cam.getCapabilities(function(err, data) {
});*/
