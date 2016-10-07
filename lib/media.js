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
				};
			});
		}
		if (callback) {
			callback.call(this, err, this.videoSourceConfigurations, xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~VideoEncoderConfiguration
 * @property {string} $.token Token that uniquely refernces this configuration
 * @property {string} name User readable name.
 * @property {string} useCount Number of internal references currently using this configuration
 * @property {string} encoding Used video codec ('JPEG' | 'MPEG4' | 'H264' )
 * @property {object} resolution Configured video resolution
 * @property {number} resolution.width
 * @property {number} resolution.height
 * @property {number} quality Relative value for the video quantizers and the quality of the video. A high value within supported quality range means higher quality
 * @property {object} [rateControl] Optional element to configure rate control related parameters
 * @property {number} rateControl.frameRateLimit
 * @property {number} rateControl.encodingInterval
 * @property {number} rateControl.bitrateLimit
 * @property {object} [H264] Optional element to configure H.264 related parameters
 * @property {number} H264.govLength Group of Video frames length
 * @property {string} H264.H264profile the H.264 profile
 * @property {object} [MPEG4] Optional element to configure Mpeg4 related parameters
 * @property {number} MPEG4.govLength Determines the interval in which the I-Frames will be coded.
 * @property {string} MPEG4.MPEG4profile the Mpeg4 profile
 * @property {object} multicast
 * @property {string} multicast.address.type
 * @property {string} [multicast.address.IPv4Address]
 * @property {string} [multicast.address.IPv6Address]
 * @property {number} multicast.port
 * @property {number} multicast.TTL
 * @property {boolean} multicast.autoStart
 * @property {string} sessionTimeout The rtsp session timeout for the related video stream
 */

/**
 * @callback Cam~VideoEncoderConfigurationCallback
 * @property {?Error} error
 * @property {Cam~VideoEncoderConfiguration} videoEncoderConfiguration
 * @property {string} xml Raw SOAP response
 */

/**
 * @callback Cam~VideoEncoderConfigurationsCallback
 * @property {?Error} error
 * @property {Array.<Cam~VideoEncoderConfiguration>} videoEncoderConfigurations
 * @property {string} xml Raw SOAP response
 */

/**
 * Get existing video encoder configuration by its token
 * If token is omitted tries first from #videoEncoderConfigurations array
 * @param {string} [token] Token of the requested video encoder configuration
 * @param {Cam~VideoEncoderConfigurationCallback} callback
 */
Cam.prototype.getVideoEncoderConfiguration = function(token, callback) {
	if (callback === undefined) {
		callback = token;
		if (this.videoEncoderConfigurations && this.videoEncoderConfigurations[0]) {
			token = this.videoEncoderConfigurations[0].$.token;
		} else {
			return callback(new Error('No video encoder configuration token is present!'));
		}
	}
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetVideoEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<ConfigurationToken>' + token + '</ConfigurationToken>' +
		'</GetVideoEncoderConfiguration>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data[0].getVideoEncoderConfigurationResponse[0].configuration), xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~VideoEncoderConfigurationOptions
 * @property {object} qualityRange Range of the quality values. A high value means higher quality
 * @property {number} qualityRange.min
 * @property {number} qualityRange.max
 * @property {object} [JPEG] Optional JPEG encoder settings ranges
 * @property {object} JPEG.resolutionsAvailable List of supported resolutions
 * @property {number} JPEG.resolutionsAvailable.width
 * @property {number} JPEG.resolutionsAvailable.height
 * @property {object} JPEG.frameRateRange Range of frame rate settings
 * @property {number} JPEG.frameRateRange.min
 * @property {number} JPEG.frameRateRange.max
 * @property {object} JPEG.encodingIntervalRange Range of encoding interval settings
 * @property {number} JPEG.encodingInterval.min
 * @property {number} JPEG.encodingInterval.max
 * @property {object} [MPEG4] Optional MPEG4 encoder settings ranges
 * @property {object} MPEG4.resolutionsAvailable List of supported resolutions
 * @property {number} MPEG4.resolutionsAvailable.width
 * @property {number} MPEG4.resolutionsAvailable.height
 * @property {object} MPEG4.resolutionsAvailable List of supported resolutions
 * @property {object} MPEG4.frameRateRange Range of frame rate settings
 * @property {number} MPEG4.frameRateRange.min
 * @property {number} MPEG4.frameRateRange.max
 * @property {object} MPEG4.encodingIntervalRange Range of encoding interval settings
 * @property {number} MPEG4.encodingInterval.min
 * @property {number} MPEG4.encodingInterval.max
 * @property {object} MPEG4.govLengthRange Range of group of video frames length settings
 * @property {number} MPEG4.govLengthRange.min
 * @property {number} MPEG4.govLengthRange.max
 * @property {object} MPEG4.MPEG4ProfilesSupported List of supported MPEG4 profiles enum {'SP', 'ASP'}
 * @property {object} [H264] Optional H.264 encoder settings ranges
 * @property {object} H264.resolutionsAvailable List of supported resolutions
 * @property {number} H264.resolutionsAvailable.width
 * @property {number} H264.resolutionsAvailable.height
 * @property {object} H264.frameRateRange Range of frame rate settings
 * @property {number} H264.frameRateRange.min
 * @property {number} H264.frameRateRange.max
 * @property {object} H264.encodingIntervalRange Range of encoding interval settings
 * @property {number} H264.encodingInterval.min
 * @property {number} H264.encodingInterval.max
 * @property {object} H264.govLengthRange Range of group of video frames length settings
 * @property {number} H264.govLengthRange.min
 * @property {number} H264.govLengthRange.max
 * @property {object} H264.H264ProfilesSupported List of supported H.264 profiles enum {'Baseline', 'Main', 'Extended', 'High'}
 * @property {object} [extension] Optional encoder extensions
 * @property {object} [extension.JPEG] Optional JPEG encoder settings ranges
 * @property {object} extension.JPEG.resolutionsAvailable List of supported resolutions
 * @property {number} extension.JPEG.resolutionsAvailable.width
 * @property {number} extension.JPEG.resolutionsAvailable.height
 * @property {object} extension.JPEG.frameRateRange Range of frame rate settings
 * @property {number} extension.JPEG.frameRateRange.min
 * @property {number} extension.JPEG.frameRateRange.max
 * @property {object} extension.JPEG.encodingIntervalRange Range of encoding interval settings
 * @property {number} extension.JPEG.encodingInterval.min
 * @property {number} extension.JPEG.encodingInterval.max
 * @property {object} extension.JPEG.bitrateRange Range of bitrate settings
 * @property {number} extension.JPEG.bitrateRange.min
 * @property {number} extension.JPEG.bitrateRange.max
 * @property {object} [extension.MPEG4] Optional MPEG4 encoder settings ranges
 * @property {object} extension.MPEG4.resolutionsAvailable List of supported resolutions
 * @property {number} extension.MPEG4.resolutionsAvailable.width
 * @property {number} extension.MPEG4.resolutionsAvailable.height
 * @property {object} extension.MPEG4.resolutionsAvailable List of supported resolutions
 * @property {object} extension.MPEG4.frameRateRange Range of frame rate settings
 * @property {number} extension.MPEG4.frameRateRange.min
 * @property {number} extension.MPEG4.frameRateRange.max
 * @property {object} extension.MPEG4.encodingIntervalRange Range of encoding interval settings
 * @property {number} extension.MPEG4.encodingInterval.min
 * @property {number} extension.MPEG4.encodingInterval.max
 * @property {object} extension.MPEG4.govLengthRange Range of group of video frames length settings
 * @property {number} extension.MPEG4.govLengthRange.min
 * @property {number} extension.MPEG4.govLengthRange.max
 * @property {object} extension.MPEG4.MPEG4ProfilesSupported List of supported MPEG4 profiles enum {'SP', 'ASP'}
 * @property {object} extension.MPEG4.bitrateRange Range of bitrate settings
 * @property {number} extension.MPEG4.bitrateRange.min
 * @property {number} extension.MPEG4.bitrateRange.max
 * @property {object} [extension.H264] Optional H.264 encoder settings ranges
 * @property {object} extension.H264.resolutionsAvailable List of supported resolutions
 * @property {number} extension.H264.resolutionsAvailable.width
 * @property {number} extension.H264.resolutionsAvailable.height
 * @property {object} extension.H264.frameRateRange Range of frame rate settings
 * @property {number} extension.H264.frameRateRange.min
 * @property {number} extension.H264.frameRateRange.max
 * @property {object} extension.H264.encodingIntervalRange Range of encoding interval settings
 * @property {number} extension.H264.encodingInterval.min
 * @property {number} extension.H264.encodingInterval.max
 * @property {object} extension.H264.govLengthRange Range of group of video frames length settings
 * @property {number} extension.H264.govLengthRange.min
 * @property {number} extension.H264.govLengthRange.max
 * @property {object} extension.H264.H264ProfilesSupported List of supported H.264 profiles enum {'Baseline', 'Main', 'Extended', 'High'}
 * @property {object} extension.H264.bitrateRange Range of bitrate settings
 * @property {number} extension.H264.bitrateRange.min
 * @property {number} extension.H264.bitrateRange.max
 * @property {object} [extension.extension] Even more optional extensions
 */

/**
 * @callback Cam~VideoEncoderConfigurationOptionsCallback
 * @property {?Error} error
 * @property {Cam~VideoEncoderConfigurationOptions} videoEncoderConfigurationOptions
 * @property {string} xml Raw SOAP response
 */

/**
 * Get existing video encoder configuration options by its token
 * If token is omitted tries first from #videoEncoderConfigurations array
 * @param {string} [token] Token of the requested video encoder configuration
 * @param {Cam~VideoEncoderConfigurationOptionsCallback} callback
 */
Cam.prototype.getVideoEncoderConfigurationOptions = function(token, callback) {
	if (callback === undefined) {
		callback = token;
		if (this.videoEncoderConfigurations && this.videoEncoderConfigurations[0]) {
			token = this.videoEncoderConfigurations[0].$.token;
		} else {
			return callback(new Error('No video encoder configuration token is present!'));
		}
	}
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetVideoEncoderConfigurationOptions xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<ConfigurationToken>' + token + '</ConfigurationToken>' +
		'</GetVideoEncoderConfigurationOptions>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data[0].getVideoEncoderConfigurationOptionsResponse[0].options), xml);
		}
	}.bind(this));
};

/**
 * Get all existing video encoder configurations of a device
 * @param {Cam~VideoEncoderConfigurationsCallback} callback
 */
Cam.prototype.getVideoEncoderConfigurations = function(callback) {
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetVideoEncoderConfigurations xmlns="http://www.onvif.org/ver10/media/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
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
 * Set the device video encoder configuration
 * @param {object} options
 * @param {string} [options.token] Token that uniquely references this configuration.
 * @param {string} [options.$.token] Token that uniquely references this configuration.
 * @param {string} [options.name] User readable name.
 * @param {number} [options.useCount] Number of internal references (read-only)
 * @param {string} [options.encoding] ( JPEG | H264 | MPEG4 )
 * @param {object} [options.resolution] Configured video resolution
 * @param {number} options.resolution.width Number of the columns of the Video image
 * @param {number} options.resolution.height Number of the lines of the Video image
 * @param {number} options.quality Relative value for the video quantizers and the quality of the video
 * @param {object} [options.rateControl] Optional element to configure rate control related parameters
 * @param {number} options.rateControl.frameRateLimit Maximum output framerate in fps
 * @param {number} options.rateControl.encodingInterval Interval at which images are encoded and transmitted  (A value of 1 means that every frame is encoded, a value of 2 means that every 2nd frame is encoded ...)
 * @param {number} options.rateControl.bitrateLimit the maximum output bitrate in kbps
 * @param {object} [options.MPEG4]
 * @param {number} options.MPEG4.govLength Determines the interval in which the I-Frames will be coded
 * @param {string} options.MPEG4.profile the Mpeg4 profile ( SP | ASP )
 * @param {object} [options.H264]
 * @param {number} options.H264.govLength Group of Video frames length
 * @param {string} options.H264.profile the H.264 profile ( Baseline | Main | Extended | High )
 * @param {object} [options.multicast]
 * @param {object|number} [options.multicast.address] The multicast address (if this address is set to 0 no multicast streaming is enaled)
 * @param {string} options.multicast.address.type Indicates if the address is an IPv4 or IPv6 address ( IPv4 | IPv6)
 * @param {string} [options.multicast.address.IPv4Address]
 * @param {string} [options.multicast.address.IPv6Address]
 * @param {number} [options.multicast.port] The RTP mutlicast destination port
 * @param {number} [options.multicast.TTL]
 * @param {boolean} [options.multicast.autoStart]
 * @param {string} options.sessionTimeout
 * @param {Cam~VideoEncoderConfigurationCallback} callback
 */
Cam.prototype.setVideoEncoderConfiguration = function(options, callback) {
	if (!options.token && !(options.$ && options.$.token)) {
		return callback(new Error('No video encoder configuration token is present!'));
	}
	this._request({
		service: 'media', 
		body: this._envelopeHeader() +
		'<SetVideoEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
			'<Configuration token = "' + (options.token || options.$.token) + '">' +
			( options.name ? '<Name xmlns="http://www.onvif.org/ver10/schema">' + options.name + '</Name>' : '' ) +
			( options.useCount ? '<UseCount xmlns="http://www.onvif.org/ver10/schema">' + options.useCount + '</UseCount>' : '' ) +
			( options.encoding ? '<Encoding xmlns="http://www.onvif.org/ver10/schema">' + options.encoding + '</Encoding>' : '' ) +
			( options.resolution ?
			'<Resolution xmlns="http://www.onvif.org/ver10/schema">' +
				( options.resolution.width ? '<Width>' + options.resolution.width + '</Width>' : '') +
				( options.resolution.height ? '<Height>' + options.resolution.height + '</Height>' : '') +
			'</Resolution>' : '') +
			( options.quality ? '<Quality xmlns="http://www.onvif.org/ver10/schema">' + options.quality + '</Quality>' : '' ) +
			( options.rateControl ?
			'<RateControl xmlns="http://www.onvif.org/ver10/schema">' +
				( options.rateControl.frameRateLimit ? '<FrameRateLimit>' + options.rateControl.frameRateLimit + '</FrameRateLimit>' : '' ) +
				( options.rateControl.encodingInterval ? '<EncodingInterval>' + options.rateControl.encodingInterval + '</EncodingInterval>' : '' ) +
				( options.rateControl.bitrateLimit ? '<BitrateLimit>' + options.rateControl.bitrateLimit + '</BitrateLimit>' : '' ) +
			'</RateControl>' : '' ) +
			( options.MPEG4 ?
			'<MPEG4 xmlns="http://www.onvif.org/ver10/schema">' +
				( options.MPEG4.govLength ? '<GovLength>' + options.MPEG4.govLength + '</GovLength>' : '' ) +
				( options.MPEG4.profile ? '<MPEG4Profile>' + options.MPEG4.profile + '</MPEG4Profile>' : '') +
			'</MPEG4>' : '') +
			( options.H264 ? '<H264 xmlns="http://www.onvif.org/ver10/schema">' +
				( options.H264.govLength ? '<GovLength>' + options.H264.govLength + '</GovLength>' : '' ) +
				( options.H264.profile ? '<H264Profile>' + options.H264.profile + '</H264Profile>' : '' ) +
			'</H264>' : '') +
			( options.multicast ?
			'<Multicast xmlns="http://www.onvif.org/ver10/schema">' +
				( options.multicast.address ?
				'<Address>' +
					( options.multicast.address === 0 ? '0' :
						( options.multicast.address.type ? '<Type>' + options.multicast.address.type + '</Type>' : '' ) +
						( options.multicast.address.IPv4Address ? '<IPv4Address>' + options.multicast.address.IPv4Address + '</IPv4Address>' : '') +
						( options.multicast.address.IPv6Address ? '<IPv6Address>' + options.multicast.address.IPv6Address + '</IPv6Address>' : '')
					) +
				'</Address>' : '') +
				( options.multicast.port !== undefined ? '<Port>' + options.multicast.port + '</Port>' : '' ) +
				( options.multicast.TTL !== undefined ? '<TTL>' + options.multicast.TTL + '</TTL>' : '') +
				( options.multicast.autoStart !== undefined ? '<AutoStart>' + options.multicast.autoStart + '</AutoStart>' : '') +
			'</Multicast>' : '' ) +
			( options.sessionTimeout ?
			'<SessionTimeout xmlns="http://www.onvif.org/ver10/schema">' +
				options.sessionTimeout +
			'</SessionTimeout>' : '' ) +
			'</Configuration>' +
			'<ForcePersistence>true</ForcePersistence>' +
		'</SetVideoEncoderConfiguration>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (err || linerase(data).setVideoEncoderConfigurationResponse !== '') {
			return callback.call(this, linerase(data).setVideoEncoderConfigurationResponse !== ''
				? new Error('Wrong `SetVideoEncoderConfiguration` response')
				: err, data, xml);
		}
		//get new encoding settings from device
		this.getVideoEncoderConfiguration(options.token || options.$.token, callback);
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
 * @param {string} [options.profileToken]
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

/**
 * Get the OSDs.
 * @param {string} [token] Token of the Video Source Configuration, which has OSDs associated with are requested.
 * If token not exist, request all available OSDs.
 * @param {Cam~GetOSDsCallback} callback
 */
Cam.prototype.getOSDs = function(token, callback) {
	if (callback === undefined) { callback = token; token = ''; }
	this._request({
		service: 'media'
		, body: this._envelopeHeader() +
		'<GetOSDs xmlns="http://www.onvif.org/ver10/media/wsdl" >' +
			(token ? '<ConfigurationToken>' + token + '</ConfigurationToken>' : '') +
		'</GetOSDs>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data), xml);
		}
	}.bind(this));
};
