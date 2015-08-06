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
 * @typedef {object} Cam~VideoSource
 * @property {string} $.token Video source token
 * @property {number} framerate
 * @property {number} resolution.width
 * @property {number} resolution.height
 */

/**
 * @callback Cam~GetVideoSourcesCallback
 * @property {?Error} error
 * @property {Cam~VideoSource|Array.<Cam~VideoSource>} videoSources
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive video sources
 * @param {Cam~GetVideoSourcesCallback} [callback]
 */
Cam.prototype.getVideoSources = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetVideoSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			/**
			 * Video sources
			 * @name Cam#videoSources
			 * @type {Cam~VideoSource|Array.<Cam~VideoSource>}
			 */
			this.videoSources = linerase(data).getVideoSourcesResponse.videoSources;
		}
		if (callback) {
			callback.call(this, err, this.videoSources, xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~VideoSourceConfiguration
 * @property {string} token Token that uniquely refernces this configuration
 * @property {string} sourceToken Reference to the physical input
 * @property {string} name User readable name
 * @property {number} useCount Number of internal references currently using this configuration
 * @property {object} bounds
 * @property {number} bounds.height
 * @property {number} bounds.width
 * @property {number} bounds.x
 * @property {number} bounds.y
 */

/**
 * @callback Cam~GetVideoSourceConfigurationsCallback
 * @property {?Error} error
 * @property {Array.<Cam~VideoSourceConfiguration>} videoSourceConfigurations
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive video sources
 * @param {Cam~GetVideoSourceConfigurationsCallback} [callback]
 */
Cam.prototype.getVideoSourceConfigurations = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetVideoSourceConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.videoSourceConfigurations = data[0].getVideoSourceConfigurationsResponse[0].configurations.map(function(data) {
				var obj =  linerase(data);
				return {
					token: obj.$.token
					, name: obj.name
					, useCount: obj.useCount
					, sourceToken: obj.sourceToken
					, bounds: {
						height: obj.bounds.$.height
						, width: obj.bounds.$.width
						, x: obj.bounds.$.x
						, y: obj.bounds.$.y
					}
				}
			});
		}
		if (callback) {
			callback.call(this, err, this.videoSourceConfigurations, xml);
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
				return linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.videoEncoderConfigurations, xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~VideoEncoderConfiguration
 * @property {string} name
 * @property {string} usecount
 * @property {string} token
 * @property {string} encoding
 * @property {int} width
 * @property {int} height
 * @property {float} quality
 * @property {int} frameRaeLimit
 * @property {int} encodingInterval
 * @property {int} bitrateLimit
 * @property {int} H264govLength
 * @property {string} H264profile
 * @property {int} MPEG4govLength
 * @property {string} MPEG4profile
 * @property {string} multicastAddressType
 * @property {string} multicastAddress
 * @property {int} multicastPort
 * @property {int} multicastTTL
 * @property {boolean} multicastAutoStart
 * @property {string} sessionTimeout [duration]
 */

/**
 * Set the device video encoder configuration
 * @param {object} options
 * @param {string} [options.name]
 * @param {int} [options.useCount]
 * @param {string} [options.token]
 * @param {string} [options.encoding] ( JPEG | H264 | MPEG4 )
 * @patam {int} [options.width]
 * @patam {int} [options.height]
 * @patam {float} [options.quality]
 * @patam {int} [options.frameRate]
 * @patam {int} [options.encodingInterval]
 * @patam {int} [options.bitRate]
 * @patam {int} [options.H264govLength]
 * @patam {string} [options.H264profile]
 * @patam {int} [options.MPEG4govLength]
 * @patam {string} [options.MPEG4profile]
 * @patam {string} [options.multicastAddressType]
 * @patam {string} [options.multicastAddress]
 * @patam {int} [options.multicastPort]
 * @patam {int} [options.multicastTTL]
 * @patam {boolean} [options.multicastAutoStart]
 * @patam {string} [options.sessionTimeout]
 * @param {Cam~VideoEncoderConfigurationCallback} callback
 */
Cam.prototype.setVideoEncoderConfiguration = function(options, callback) {
	this._request({
		service: 'media', 
		body: this._envelopeHeader() +
		'<SetVideoEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<Configuration token = "' + (options.token || this.activeSource.sourceToken ) + '">' +
			'<Name xmlns="http://www.onvif.org/ver10/schema">' + options.name + '</Name>' +
			'<UseCount xmlns="http://www.onvif.org/ver10/schema">' + options.useCount + '</UseCount>' +
			'<Encoding xmlns="http://www.onvif.org/ver10/schema">' + options.encoding + '</Encoding>' +
			'<Resolution xmlns="http://www.onvif.org/ver10/schema">' +
				'<Width>' + options.width + '</Width>' +
				'<Height>' + options.height + '</Height>' +
			'</Resolution>' +
			'<Quality xmlns="http://www.onvif.org/ver10/schema">' + options.quality + '</Quality>' +
			'<RateControl xmlns="http://www.onvif.org/ver10/schema">' +
				'<FrameRateLimit>' + options.frameRate + '</FrameRateLimit>' +
				'<EncodingInterval>' + options.encodingInterval + '</EncodingInterval>' +
				'<BitrateLimit>' + options.bitRate + '</BitrateLimit>' +
			'</RateControl>' +
			'<MPEG4 xmlns="http://www.onvif.org/ver10/schema">' +
				'<GovLength>' + options.MPEG4govLength + '</GovLength>' +
				'<MPEG4Profile>' + options.MPEG4profile + '</MPEG4Profile>' +
			'</MPEG4>' +
			'<H264 xmlns="http://www.onvif.org/ver10/schema">' +
				'<GovLength>' + options.H264govLength + '</GovLength>' +
				'<H264Profile>' + options.H264profile + '</H264Profile>' +
			'</H264>' +
			'<Multicast xmlns="http://www.onvif.org/ver10/schema">' +
				'<Address>' + 
					'<Type>' + options.multicastAddressType + '</Type>' +
					(options.multicastAddressType == 'IPv4' ?
					'<IPv4Address>' + options.multicastAddress + '</IPv4Address>' : '') +	
					(options.multicastAddressType == 'IPv6' ?
					'<IPv6Address>' + options.multicastAddress + '</IPv6Address>' : '') +	
				'</Address>' +
				'<Port>' + options.multicastPort + '</Port>' +
				'<TTL>' + options.multicastTTL + '</TTL>' +
				'<AutoStart>' + options.multicastAutoStart + '</AutoStart>' +
			'</Multicast>' +
			'<SessionTimeout xmlns="http://www.onvif.org/ver10/schema">' +
				options.sessionTimeout +
			'</SessionTimeout>' +
			'</Configuration>' +
			'<ForcePersistence> true </ForcePersistence>' +
		'</SetVideoEncoderConfiguration>' +
		'</s:Body>' +
		'</s:Envelope>'
	}, function(err, data, xml) {
		if (err || linerase(data).setVideoEncoderConfigurationResponse !== '') {
			return callback.call(this, linerase(data).setVideoEncoderConfigurationResponse !== ''
				? new Error('Wrong `SetVideoEncoderConfiguration` response')
				: err, data, xml);
		}
		//get new encoding settings from device
		this.getVideoEncoderConfigurations(callback);
	}.bind(this));
};

/**
 * Get all available physical audio iutputs  of a device
 * @param callback
 */
Cam.prototype.getAudioSources = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetAudioSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		console.log(data[0].getAudioSourcesResponse);
		if (!err) {
			this.audioSources = data[0].getAudioSourcesResponse[0].audioSources.map(function(config) {
				return linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.audioSources, xml);
		}
	}.bind(this));
};

/**
 * Get all available audio encoder configurations of a device
 * @param callback
 */
Cam.prototype.getAudioEncoderConfigurations = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetAudioEncoderConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		console.log(data[0].getAudioEncoderConfigurationsResponse);
		if (!err) {
			this.audioEncoderConfigurations = data[0].getAudioEncoderConfigurationsResponse[0].configurations.map(function(config) {
				return linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.audioEncoderConfigurations, xml);
		}
	}.bind(this));
};

/**
 * Get all existing audio source configurations of a device
 * @param callback
 */
Cam.prototype.getAudioSourceConfigurations = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetAudioSourceConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		console.log(data[0].getAudioSourceConfigurationsResponse);
		if (!err) {
			this.audioSourceConfigurations = data[0].getAudioSourceConfigurationsResponse[0].configurations.map(function(config) {
				return linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.audioSourceConfigurations, xml);
		}
	}.bind(this));
};

/**
 * Get all available audio outputs  of a device
 * @param callback
 */
Cam.prototype.getAudioOutputs = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetAudioOutputs xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		console.log(data[0].getAudioOutputsResponse);
		if (!err) {
			this.audioOutputs = data[0].getAudioOutputsResponse[0].audioOutputs.map(function(config) {
				return linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.audioOutputs, xml);
		}
	}.bind(this));
};

/**
 * Get all existing audio output configurations of a device
 * @param callback
 */
Cam.prototype.getAudioOutputConfigurations = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetAudioOutputConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		console.log(data[0].getAudioOutputConfigurationsResponse);
		if (!err) {
			this.audioOutputConfigurations = data[0].getAudioOutputConfigurationsResponse[0].configurations.map(function(config) {
				return linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.audioOutputConfigurations, xml);
		}
	}.bind(this));
};

// TODO AddVideoEncoderConfiguration

/*
 Cam.prototype.getVideoEncoderConfigurationOptions = function(options, callback) {
 if (callback === undefined) {callback = options; options = {};}
 this._request({
 service: 'media'
 , body: this._envelopeHeader() +
 '<GetVideoEncoderConfigurationOptions xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
 this._envelopeFooter()
 }, function(err, data, xml) {
 if (!err) {
 }
 if (callback) {
 callback.call(this, err, this.videoEncoderConfigurations, xml);
 }
 }.bind(this));
 };
 */

/**
 * @typedef {object} Cam~Profile
 * @property {object} $
 * @property {string} $.token profile token
 * @property {boolean} $.fixed is this a system or a user profile
 * @property {object} videoSourceConfiguration
 * @property {string} videoSourceConfiguration.$.token video source token
 * @property {object} videoEncoderConfiguration
 * @property {object} PTZConfiguration
 * @property {string} PTZConfiguration.$.token PTZ token
 * @property {string} PTZConfiguration.name PTZ configuration name
 */

/**
 * @callback Cam~GetProfilesCallback
 * @property {?Error} error
 * @property {Array.<Cam~Profile>} profiles Array of device's profiles
 * @property {string} xml Raw XML response
 */

/**
 * /Media/ Receive profiles
 * @param {Cam~GetProfilesCallback} [callback]
 */
Cam.prototype.getProfiles = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			/**
			 * Array of all device profiles
			 * @name Cam#profiles
			 * @type {Array<Cam~Profile>}
			 */
			this.profiles = data[0]['getProfilesResponse'][0]['profiles'].map(function(profile) {
				return linerase(profile);
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
 * @param {Cam~MessageCallback} callback
 */
Cam.prototype.createProfile = function(options, callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<CreateProfile xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<Name>' + options.name + '</Name>' +
			( options.token ? '<Token>' + options.token + '</Token>' : '' ) +
		'</CreateProfile>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data).createProfileResponse.profile, xml);
		}
	}.bind(this));
};

/**
 * Delete a profile
 * @param {string} token
 * @param {Cam~MessageCallback} callback
 */
Cam.prototype.deleteProfile = function(token, callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<DeleteProfile xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<ProfileToken>' + token + '</ProfileToken>' +
		'</DeleteProfile>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data).deleteProfileResponse, xml);
		}
	}.bind(this));
};

/**
 * @callback Cam~ResponseUriCallback
 * @property {string} uri
 */

/**
 * Receive stream URI
 * @param {Object} [options]
 * @param {string} [options.stream]
 * @param {string} [options.protocol]
 * @param {Cam~ResponseUriCallback} [callback]
 */
Cam.prototype.getStreamUri = function(options, callback) {
	if (callback === undefined) { callback = options; options = {};	}
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<StreamSetup>' +
				'<Stream xmlns="http://www.onvif.org/ver10/schema">' + (options.stream || 'RTP-Unicast') +'</Stream>' +
				'<Transport xmlns="http://www.onvif.org/ver10/schema">' +
					'<Protocol>' + (options.protocol || 'RTSP') +'</Protocol>' +
				'</Transport>' +
			'</StreamSetup>' +
			'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetStreamUri>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data).getStreamUriResponse.mediaUri, xml);
		}
	}.bind(this));
};

/**
 * Receive snapshot URI
 * @param {Object} [options]
 * @param {string} [options.profileToken]
 * @param {Cam~ResponseUriCallback} [callback]
 */
Cam.prototype.getSnapshotUri = function(options, callback) {
	if (callback === undefined) { callback = options; options = {}; }
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetSnapshotUri xmlns="http://www.onvif.org/ver10/media/wsdl">' +
		'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) +'</ProfileToken>' +
		'</GetSnapshotUri>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data).getSnapshotUriResponse.mediaUri, xml);
		}
	}.bind(this));
};
