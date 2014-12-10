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
		var dt = data[0]['tds:GetSystemDateAndTimeResponse'][0]['tds:SystemDateAndTime'][0]['tt:UTCDateTime'][0];
		callback(null, {
			year: +dt['tt:Date'][0]['tt:Year'][0]
			, month: +dt['tt:Date'][0]['tt:Month'][0]
			, day: +dt['tt:Date'][0]['tt:Day'][0]
			, hour: +dt['tt:Time'][0]['tt:Hour'] [0]
			, minute: +dt['tt:Time'][0]['tt:Minute'][0]
			, second: +dt['tt:Time'][0]['tt:Second'][0]
		});
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
		var caps = data[0]['tds:GetCapabilitiesResponse'][0]['tds:Capabilities'][0];
		console.log(JSON.stringify(caps));
		this.capabilities = {
			device: {
				XAddr: caps['tt:Device'][0]['tt:XAddr'][0]
				, network: {
					ipFilter: caps['tt:Device'][0]['tt:Network'][0]['tt:IPFilter'][0] === 'true'
					, zeroConfiguration: caps['tt:Device'][0]['tt:Network'][0]['tt:ZeroConfiguration'][0] === 'true'
					, ipVersion6: caps['tt:Device'][0]['tt:Network'][0]['tt:IPVersion6'][0] === 'true'
					, dynDNS: caps['tt:Device'][0]['tt:Network'][0]['tt:DynDNS'][0] === 'true'
				}
				, system: {
					discoveryResolve: caps['tt:Device'][0]['tt:System'][0]['tt:DiscoveryResolve'][0] === 'true'
					, discoveryBye: caps['tt:Device'][0]['tt:System'][0]['tt:DiscoveryBye'][0] === 'true'
					, remoteDiscovery: caps['tt:Device'][0]['tt:System'][0]['tt:RemoteDiscovery'][0] === 'true'
					, systemBackup: caps['tt:Device'][0]['tt:System'][0]['tt:SystemBackup'][0] === 'true'
					, systemLogging: caps['tt:Device'][0]['tt:System'][0]['tt:SystemLogging'][0] === 'true'
					, firmwareUpgrade: caps['tt:Device'][0]['tt:System'][0]['tt:FirmwareUpgrade'][0] === 'true'
					, supportedVersions: {
						major: parseInt(caps['tt:Device'][0]['tt:System'][0]['tt:SupportedVersions'][0]['tt:Major'][0])
						, minor: parseInt(caps['tt:Device'][0]['tt:System'][0]['tt:SupportedVersions'][0]['tt:Minor'][0])
					}
				}
				, IO: {
					inputConnectors: parseInt(caps['tt:Device'][0]['tt:IO'][0]['tt:InputConnectors'][0])
					, relayOutputs: parseInt(caps['tt:Device'][0]['tt:IO'][0]['tt:RelayOutputs'][0])
				}, security: {
					'TLS1.1': caps['tt:Device'][0]['tt:Security'][0]['tt:TLS1.1'][0] === 'true'
					, 'TLS1.2': caps['tt:Device'][0]['tt:Security'][0]['tt:TLS1.2'][0] === 'true'
					, onboardKeyGeneration: caps['tt:Device'][0]['tt:Security'][0]['tt:OnboardKeyGeneration'][0] === 'true'
					, accessPolicyConfig: caps['tt:Device'][0]['tt:Security'][0]['tt:AccessPolicyConfig'][0] === 'true'
					, 'X.509Token': caps['tt:Device'][0]['tt:Security'][0]['tt:X.509Token'][0] === 'true'
					, SAMLToken: caps['tt:Device'][0]['tt:Security'][0]['tt:SAMLToken'][0] === 'true'
					, kerberosToken: caps['tt:Device'][0]['tt:Security'][0]['tt:KerberosToken'][0] === 'true'
					, RELToken: caps['tt:Device'][0]['tt:Security'][0]['tt:RELToken'][0] === 'true'
				}
			}
			, events: {
				XAddr: caps['tt:Events'][0]['tt:XAddr'][0]
				, WSSubscriptionPolicySupport: caps['tt:Events'][0]['tt:WSSubscriptionPolicySupport'][0] === 'true'
				, WSPullPointSupport: caps['tt:Events'][0]['tt:WSPullPointSupport'][0] === 'true'
				, WSPausableSubscriptionManagerInterfaceSupport: caps['tt:Events'][0]['tt:WSPausableSubscriptionManagerInterfaceSupport'][0] === 'true'
			}
			, imaging: {
				XAddr: caps['tt:Imaging'][0]['tt:XAddr'][0]
			}
			, media: {
				XAddr: caps['tt:Media'][0]['tt:XAddr'][0]
				, streamingCapabilities: {
					RTPMulticast: caps['tt:Media'][0]['tt:StreamingCapabilities'][0]['tt:RTPMulticast'][0] === 'true'
					, RTP_TCP: caps['tt:Media'][0]['tt:StreamingCapabilities'][0]['tt:RTP_TCP'][0] === 'true'
					, RTP_RTSP_TCP: caps['tt:Media'][0]['tt:StreamingCapabilities'][0]['tt:RTP_RTSP_TCP'][0] === 'true'
				}
			}, PTZ: {
				XAddr: caps['tt:PTZ'][0]['tt:XAddr'][0]
			}, extension: {
				deviceIO: {
					XAddr: caps['tt:Extension'][0]['tt:DeviceIO'][0]['tt:XAddr'][0]
					, videoSources: parseInt(caps['tt:Extension'][0]['tt:DeviceIO'][0]['tt:VideoSources'][0])
					, videoOutputs: parseInt(caps['tt:Extension'][0]['tt:DeviceIO'][0]['tt:VideoOutputs'][0])
					, audioSources: parseInt(caps['tt:Extension'][0]['tt:DeviceIO'][0]['tt:AudioSources'][0])
					, audioOutputs: parseInt(caps['tt:Extension'][0]['tt:DeviceIO'][0]['tt:AudioOutputs'][0])
					, relayOutputs: parseInt(caps['tt:Extension'][0]['tt:DeviceIO'][0]['tt:RelayOutputs'][0])
				}
			}
		};
		this._processOnvifInformation();
		this.getVideoSources(function(err, data) {

		});
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
		callback(null, data);
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

function _linerase(xml) {

}

exports.Cam = Cam;