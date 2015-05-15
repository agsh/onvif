/**
 * @namespace cam
 * @description Common camera module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

const http = require('http')
	, crypto = require('crypto')
	, util = require('util')
	, events = require('events')
	, url = require('url')
	, linerase = require('./utils').linerase
	, parseSOAPString = require('./utils').parseSOAPString
	, emptyFn = function() {}
	;

/**
 * @callback Cam~MessageCallback
 * @property {?Error} error
 * @property {?string} message
 */

/**
 * @callback Cam~ConnectionCallback
 * @property {?Error} error
 */

/**
 * Camera class
 * @param {object} options
 * @param {string} options.hostname
 * @param {string} [options.username]
 * @param {string} [options.password]
 * @param {number} [options.port=80]
 * @param {string} [options.path=/onvif/device_service]
 * @param {Cam~ConnectionCallback} [callback]
 * @fires Cam#rawResponse
 * @property presets
 * @class
 * @constructor
 * @extends events.EventEmitter
 * @example
 * var
 *   http = require('http'),
 *   Cam = require('onvif').Cam;
 *
 * new Cam({
 *   hostname: <CAMERA_HOST>,
 *   username: <USERNAME>,
 *   password: <PASSWORD>
 * }, function(err) {
 *   this.absoluteMove({x: 1, y: 1, zoom: 1});
 *   this.getStreamUri({protocol:'RTSP'}, function(err, stream) {
 *     http.createServer(function (req, res) {
 *       res.writeHead(200, {'Content-Type': 'text/html'});
 *       res.end('<html><body>' +
 *         '<embed type="application/x-vlc-plugin" target="' + stream.uri + '"></embed>' +
 *         '</body></html>');
 *     }).listen(3030);
 *   });
 * });
 */
var Cam = function(options, callback) {
	callback = callback || emptyFn;
	this.hostname = options.hostname;
	this.username = options.username;
	this.password = options.password;
	this.port = options.port ? options.port : 80;
	this.path = options.path || '/onvif/device_service';

	this.events = {};

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
 * @param {Cam~ConnectionCallback} callback
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
				fun.call(self, function(err) {
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
 * @callback Cam~RequestCallback
 * @param {Error} err
 * @param {object} response message
 * @param {string} xml response
 */

/**
 * Common camera request
 * @param {object} options
 * @param {string} [options.service] Name of service (ptz, media, etc)
 * @param {object} options.body SOAP body
 * @param {Url} [options.url] Defines another url to request
 * @param {string} [options.service] service name (media, ptz)
 * @param {boolean} [options.ptz] make request to PTZ uri or not
 * @param {Cam~RequestCallback} callback response callback
 * @private
 */
Cam.prototype._request = function(options, callback) {
	var _this = this;
	var reqOptions = options.url || {
			hostname: this.hostname
			, port: this.port
			, path: options.service
				? (this.uri[options.service] ? this.uri[options.service].path : options.service)
				: this.path
		};
	reqOptions.headers = {
		'Content-Type': 'application/soap+xml'
		, 'Content-Length': options.body.length
		, charset: 'utf-8'
	};
	reqOptions.auth = this.username + ':' + this.password;
	reqOptions.method = 'POST';

	var req = http.request(reqOptions, function(res) {
		var bufs = [], length = 0;
		res.on('data', function(chunk) {
			bufs.push(chunk);
			length += chunk.length;
		});
		res.on('end', function() {
			var xml = Buffer.concat(bufs, length).toString('utf8');
			/**
			 * Indicates raw xml response from device.
			 * @event Cam#rawResponse
			 * @type {string}
			 */
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
 * @callback Cam~DateTimeCallback
 * @property {Date} date-time
 */

/**
 * Receive date and time from cam
 * @param {Cam~DateTimeCallback} callback
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
		if (!err) {
			var dt = linerase(data[0]['getSystemDateAndTimeResponse'][0]['systemDateAndTime'][0]['UTCDateTime'][0]);
		}
		callback.call(this, err, err ? null : new Date(dt.date.year, dt.date.month, dt.date.day, dt.time.hour, dt.time.minute, dt.time.second), xml);
	});
};

/**
 * Capability list
 * @typedef {object} Cam~Capabilities
 * @property {object} device Device capabilities
 * @property {string} device.XAddr Device service URI
 * @property {object} [device.network] Network capabilities
 * @property {boolean} device.network.IPFilter Indicates support for IP filtering
 * @property {boolean} device.network.zeroConfiguration Indicates support for zeroconf
 * @property {boolean} device.network.IPVersion6 Indicates support for IPv6
 * @property {boolean} device.network.dynDNS Indicates support for dynamic DNS configuration
 * @property {object} [device.system] System capabilities
 * @property {boolean} device.system.discoveryResolve Indicates support for WS Discovery resolve requests
 * @property {boolean} device.system.discoveryBye Indicates support for WS-Discovery Bye
 * @property {boolean} device.system.remoteDiscovery Indicates support for remote discovery
 * @property {boolean} device.system.systemBackup Indicates support for system backup through MTOM
 * @property {boolean} device.system.systemLogging Indicates support for retrieval of system logging through MTOM
 * @property {boolean} device.system.firmwareUpgrade Indicates support for firmware upgrade through MTOM
 * @property {boolean} device.system.httpFirmwareUpgrade Indicates support for firmware upgrade through HTTP
 * @property {boolean} device.system.httpSystemBackup Indicates support for system backup through HTTP
 * @property {boolean} device.system.httpSystemLogging Indicates support for retrieval of system logging through HTTP
 * @property {object} [device.IO] I/O capabilities
 * @property {number} device.IO.inputConnectors Number of input connectors
 * @property {number} device.IO.relayOutputs Number of relay outputs
 * @property {object} [device.IO.extension]
 * @property {boolean} device.IO.extension.auxiliary
 * @property {object} device.IO.extension.auxiliaryCommands
 * @property {object} [device.security] Security capabilities
 * @property {boolean} device.security.'TLS1.1' Indicates support for TLS 1.1
 * @property {boolean} device.security.'TLS1.2' Indicates support for TLS 1.2
 * @property {boolean} device.security.onboardKeyGeneration Indicates support for onboard key generation
 * @property {boolean} device.security.accessPolicyConfig Indicates support for access policy configuration
 * @property {boolean} device.security.'X.509Token' Indicates support for WS-Security X.509 token
 * @property {boolean} device.security.SAMLToken Indicates support for WS-Security SAML token
 * @property {boolean} device.security.kerberosToken Indicates support for WS-Security Kerberos token
 * @property {boolean} device.security.RELToken Indicates support for WS-Security REL token
 * @property {object} events Event capabilities
 * @property {string} events.XAddr Event service URI
 * @property {boolean} events.WSSubscriptionPolicySupport Indicates whether or not WS Subscription policy is supported
 * @property {boolean} events.WSPullPointSupport Indicates whether or not WS Pull Point is supported
 * @property {boolean} events.WSPausableSubscriptionManagerInterfaceSupport Indicates whether or not WS Pausable Subscription Manager Interface is supported
 * @property {object} imaging Imaging capabilities
 * @property {string} imaging.XAddr Imaging service URI
 * @property {object} media Media capabilities
 * @property {string} media.XAddr Media service URI
 * @property {object} media.streamingCapabilities Streaming capabilities
 * @property {boolean} media.streamingCapabilities.RTPMulticast Indicates whether or not RTP multicast is supported
 * @property {boolean} media.streamingCapabilities.RTP_TCP Indicates whether or not RTP over TCP is supported
 * @property {boolean} media.streamingCapabilities.RTP_RTSP_TCP Indicates whether or not RTP/RTSP/TCP is supported
 * @property {object} media.streamingCapabilities.extension
 * @property {object} PTZ PTZ capabilities
 * @property {string} PTZ.XAddr PTZ service URI
 * @property {object} [extension]
 * @property {object} extension.deviceIO DeviceIO capabilities
 * @property {string} extension.deviceIO.XAddr DeviceIO service URI
 * @property {number} extension.deviceIO.videoSources
 * @property {number} extension.deviceIO.videoOutputs
 * @property {number} extension.deviceIO.audioSources
 * @property {number} extension.deviceIO.audioOutputs
 * @property {number} extension.deviceIO.relayOutputs
 * @property {object} [extension.extensions]
 * @property {object} [extension.extensions.telexCapabilities]
 * @property {object} [extension.extensions.scdlCapabilities]
 */

/**
 * @callback Cam~GetCapabilitiesCallback
 * @property {?Error} error
 * @property {Cam~Capabilities} capabilities
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive cam capabilities
 * @param {Cam~GetCapabilitiesCallback} [callback]
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
			/**
			 * Device capabilities
			 * @name Cam#capabilities
			 * @type {Cam~Capabilities}
			 */
			this.capabilities = linerase(data[0]['getCapabilitiesResponse'][0]['capabilities'][0]);
			// fill Cam#uri property
			if (!this.uri) {
				/**
				 * Device service URIs
				 * @name Cam#uri
				 * @property {url} [PTZ]
				 * @property {url} [media]
				 * @property {url} [imaging]
				 * @property {url} [events]
				 * @property {url} [device]
				 */
				this.uri = {};
			}
			['PTZ', 'media', 'imaging', 'events', 'device'].forEach(function(name) {
				if (this.capabilities[name] && this.capabilities[name].XAddr) {
					this.uri[name.toLowerCase()] = url.parse(this.capabilities[name].XAddr);
				}
			}.bind(this));
			// extensions, eg. deviceIO
			if (this.capabilities.extension) {
				Object.keys(this.capabilities.extension).forEach(function(ext) {
					// TODO think about complex entensions like `telexCapabilities` and `scdlCapabilities`
					if (this.capabilities.extension[ext].XAddr) {
						this.uri[ext] = url.parse(this.capabilities.extension[ext].XAddr);
					}
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
			data = linerase(data);
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
 * Get active sources
 * @throws {Error}
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
		/**
		 * Default selected profile for the device
		 * @name Cam#defaultProfile
		 * @type {Cam~Profile}
		 */
		this.defaultProfile = appropriateProfiles[0];
		/**
		 * Current active video source
		 * @name Cam#activeSource
		 * @type {object}
		 * @property {string} sourceToken video source token
		 * @property {string} profileToken profile token
		 */
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
 * @typedef {object} Cam~Service
 * @property {string} namespace Namespace uri
 * @property {string} XAddr Uri for requests
 * @property {number} version.minor Minor version
 * @property {number} version.major Major version
 */

/**
 * @callback Cam~GetServicesCallback
 * @property {?Error} error
 * @property {Array.<Cam~Service>} services
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive services
 * @param {Cam~GetServicesCallback} [callback]
 */
Cam.prototype.getServices = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetServices xmlns="http://www.onvif.org/ver10/device/wsdl"><IncludeCapability>true</IncludeCapability></GetServices>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			/**
			 * Supported services and their URLs
			 * @type {Array.<Cam~Service>}
			 */
			this.services = linerase(data).getServicesResponse.service;
		}
		if (callback) {
			callback.call(this, err, this.services, xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~DeviceInformation
 * @property {string} manufacturer The manufactor of the device
 * @property {string} model The device model
 * @property {string} firmwareVersion The firmware version in the device
 * @property {string} serialNumber The serial number of the device
 * @property {string} hardwareId The hardware ID of the device
 */

/**
 * @callback Cam~GetDeviceInformationCallback
 * @property {?Error} error
 * @property {Cam~DeviceInformation} deviceInformation Device information
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive device information
 * @param {Cam~GetDeviceInformationCallback} [callback]
 */
Cam.prototype.getDeviceInformation = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.deviceInformation = linerase(data).getDeviceInformationResponse;
		}
		if (callback) {
			callback.call(this, err, this.deviceInformation, xml);
		}
	}.bind(this));
};

/**
 * /Device/ Reboot the device
 * @param {Cam~MessageCallback} callback
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
		nonce = Math.ceil(Math.random() * 10000000000).toString();
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

/**
 * Envelope header for all SOAP messages
 * @returns {string}
 * @private
 */
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

/**
 * Envelope footer for all SOAP messages
 * @returns {string}
 * @private
 */
Cam.prototype._envelopeFooter = function() {
	return '</s:Body>' +
		'</s:Envelope>';
};

module.exports = {
	Cam: Cam
};

// extending Camera prototype
require('./events');
require('./media');
require('./ptz');