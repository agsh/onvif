/**
 * @namespace cam
 * @description Media section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */
module.exports = function(Cam) {

	const linerase = require('./utils').linerase;

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
				// videoSources is an array of video sources, but linerase remove the array if there is only one element inside
				// so we convert it back to an array
				if (!Array.isArray(this.videoSources)) {this.videoSources = [this.videoSources];}
			}
			if (callback) {
				callback.call(this, err, this.videoSources, xml);
			}
		}.bind(this));
	};

	/**
	 * @typedef {object} Cam~VideoSourceConfiguration
	 * @property {string} token Token that uniquely references this configuration
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
	 * @property {string} $.token Token that uniquely references this configuration
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
	 * Get video encoder configuration options by video encoder configuration token or media profile token
	 * If options is omitted, returns camera generic video encoder configuration options
	 * If both token are set, returns video encoder configuration options compatible with both
	 * If options is a string it is considered as configurationToken (for backward compatibility)
	 * @param {object|string} [options]
	 * @param {string} [options.configurationToken] The video encoder configuration token
	 * @param {string} [options.profileToken] The media profile token
	 * @param {Cam~VideoEncoderConfigurationOptionsCallback} callback
	 */
	Cam.prototype.getVideoEncoderConfigurationOptions = function(options, callback) {
		if (callback === undefined) {
			callback = options;
			if (this.videoEncoderConfigurations && this.videoEncoderConfigurations[0]) {
				options = { configurationToken: this.videoEncoderConfigurations[0].$.token };
			} else {
				return callback(new Error('No video encoder configuration token is present!'));
			}
		} else if (typeof options == "string") { // For backward compatibility
			options = { configurationToken: options };
		} else if (!(options && (options.configurationToken || options.profileToken))) {
			return callback(new Error("'options' must have one or both 'configurationToken' or 'profileToken'"));
		}
		this._request({
			service: 'media'
			, body: this._envelopeHeader() +
			(
				(options) ?
					(
						'<GetVideoEncoderConfigurationOptions xmlns="http://www.onvif.org/ver10/media/wsdl">' +
					(
						(options.configurationToken)
							? '<ConfigurationToken>' + options.configurationToken + '</ConfigurationToken>'
							: ""
					) +
					(
						(options.profileToken)
							? '<ProfileToken>' + options.profileToken + '</ProfileToken>'
							: ""
					) +
					'</GetVideoEncoderConfigurationOptions>'
					)
					: '<GetVideoEncoderConfigurationOptions xmlns="http://www.onvif.org/ver10/media/wsdl" />'
			) +
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
	 * Get existing audio encoder configuration by its token
	 * If token is omitted tries first from #audioEncoderConfigurations array
	 * @param {string} [token] Token of the requested audio encoder configuration
	 * @param {Cam~AudioEncoderConfigurationCallback} callback
	 */
	Cam.prototype.getAudioEncoderConfiguration = function(token, callback) {
		if (callback === undefined) {
			callback = token;
			if (this.audioEncoderConfigurations && this.audioEncoderConfigurations[0]) {
				token = this.audioEncoderConfigurations[0].$.token;
			} else {
				return callback(new Error('No audio encoder configuration token is present!'));
			}
		}
		this._request({
			service: 'media'
			, body: this._envelopeHeader() +
			'<GetAudioEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ConfigurationToken>' + token + '</ConfigurationToken>' +
			'</GetAudioEncoderConfiguration>' +
			this._envelopeFooter()
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, err ? null : linerase(data[0].getAudioEncoderConfigurationResponse[0].configuration), xml);
			}
		}.bind(this));
	};

	/**
	 * Get existing audio encoder configuration options by its token
	 * If token is omitted tries first from #audioEncoderConfigurations array
	 * @param {string} [token] Token of the requested audio encoder configuration
	 * @param {Cam~AudioEncoderConfigurationOptionsCallback} callback
	 */
	Cam.prototype.getAudioEncoderConfigurationOptions = function(token, callback) {
		if (callback === undefined) {
			callback = token;
			if (this.audioEncoderConfigurations && this.audioEncoderConfigurations[0]) {
				token = this.audioEncoderConfigurations[0].$.token;
			} else {
				return callback(new Error('No audio encoder configuration token is present!'));
			}
		}
		this._request({
			service: 'media'
			, body: this._envelopeHeader() +
			'<GetAudioEncoderConfigurationOptions xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ConfigurationToken>' + token + '</ConfigurationToken>' +
			'</GetAudioEncoderConfigurationOptions>' +
			this._envelopeFooter()
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, err ? null : linerase(data[0].getAudioEncoderConfigurationOptionsResponse[0].options), xml);
			}
		}.bind(this));
	};

	/**
	 * Set the device audio encoder configuration
	 * @param {object} options
	 * @param {string} [options.token] Token that uniquely references this configuration.
	 * @param {string} [options.$.token] Token that uniquely references this configuration.
	 * @param {string} [options.name] User readable name.
	 * @param {number} [options.useCount] Number of internal references (read-only)
	 * @param {string} [options.encoding] { 'G711', 'G726', 'AAC' }
	 * @param {number} [options.bitrate] The output bitrate in kbps.
	 * @param {number} [options.sampleRate] The output sample rate in kHz.
	 * @param {object} [options.multicast]
	 * @param {object|number} [options.multicast.address] The multicast address (if this address is set to 0 no multicast streaming is enaled)
	 * @param {string} options.multicast.address.type Indicates if the address is an IPv4 or IPv6 address ( IPv4 | IPv6)
	 * @param {string} [options.multicast.address.IPv4Address]
	 * @param {string} [options.multicast.address.IPv6Address]
	 * @param {number} [options.multicast.port] The RTP mutlicast destination port
	 * @param {number} [options.multicast.TTL]
	 * @param {boolean} [options.multicast.autoStart]
	 * @param {string} options.sessionTimeout
	 * @param {Cam~AudioEncoderConfigurationCallback} callback
	 */
	Cam.prototype.setAudioEncoderConfiguration = function(options, callback) {
		if (!options.token && !(options.$ && options.$.token)) {
			return callback(new Error('No audio encoder configuration token is present!'));
		}
		this._request({
			service: 'media',
			body: this._envelopeHeader() +
			'<SetAudioEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<Configuration token = "' + (options.token || options.$.token) + '">' +
				( options.name ? '<Name xmlns="http://www.onvif.org/ver10/schema">' + options.name + '</Name>' : '' ) +
				( options.useCount ? '<UseCount xmlns="http://www.onvif.org/ver10/schema">' + options.useCount + '</UseCount>' : '' ) +
				( options.encoding ? '<Encoding xmlns="http://www.onvif.org/ver10/schema">' + options.encoding + '</Encoding>' : '' ) +
				( options.bitrate ? '<Bitrate xmlns="http://www.onvif.org/ver10/schema">' + options.bitrate + '</Bitrate>' : '' ) +
				( options.sampleRate ? '<SampleRate xmlns="http://www.onvif.org/ver10/schema">' + options.sampleRate + '</SampleRate>' : '' ) +
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
			'</SetAudioEncoderConfiguration>' +
			this._envelopeFooter()
		}, function(err, data, xml) {
			if (err || linerase(data).setAudioEncoderConfigurationResponse !== '') {
				return callback.call(this, linerase(data).setAudioEncoderConfigurationResponse !== ''
					? new Error('Wrong `SetAudioEncoderConfiguration` response')
					: err, data, xml);
			}
			this.getAudioEncoderConfiguration(options.token || options.$.token, callback);
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

	/**
	 * @callback Cam~AddAudioEncoderConfigurationCallback
	 * @property {?Error} error
	 * @property {null}
	 * @property {string} xml Raw XML response
	 */

	/**
	 * This operation adds an AudioEncoderConfiguration to an existing media profile. If a configuration exists in the media profile, it will be replaced. The change shall be persistent. A device shall support adding a compatible AudioEncoderConfiguration to a profile containing an AudioSourceConfiguration and shall support streaming audio data of such a profile.
	 * @param {object} options
	 * @param {string} options.profileToken Reference to the profile where the configuration should be added
	 * @param {string} options.configurationToken Contains a reference to the AudioSourceConfiguration to add
	 * @param {Cam~AddAudioEncoderConfigurationCallback} callback
	 */
	Cam.prototype.addAudioEncoderConfiguration = function(options,callback) {
		let body = this._envelopeHeader() +
			'<AddAudioEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ProfileToken>' + options.profileToken + '</ProfileToken>' +
				'<ConfigurationToken>' + options.configurationToken + '</ConfigurationToken>' +
			'</AddAudioEncoderConfiguration>' +
			this._envelopeFooter();
		this._request({
			service: 'media',
			body: body,
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, null, xml);
			}
		}.bind(this));
	};

	/**
	 * @callback Cam~AddAudioSourceConfigurationCallback
	 * @property {?Error} error
	 * @property {null}
	 * @property {string} xml Raw XML response
	 */

	/**
	 * This operation adds an AudioSourceConfiguration to an existing media profile. If a configuration exists in the media profile, it will be replaced. The change shall be persistent.
	 * @param {object} options
	 * @param {string} options.profileToken Reference to the profile where the configuration should be added
	 * @param {string} options.configurationToken Contains a reference to the AudioSourceConfiguration to add
	 * @param {Cam~AddAudioSourceConfigurationCallback} callback
	 */
	Cam.prototype.addAudioSourceConfiguration = function(options,callback) {
		let body = this._envelopeHeader() +
			'<AddAudioSourceConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ProfileToken>' + options.profileToken + '</ProfileToken>' +
				'<ConfigurationToken>' + options.configurationToken + '</ConfigurationToken>' +
			'</AddAudioSourceConfiguration>' +
			this._envelopeFooter();
		this._request({
			service: 'media',
			body: body,
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, null, xml);
			}
		}.bind(this));
	};

	/**
	 * @callback Cam~AddVideoEncoderConfigurationCallback
	 * @property {?Error} error
	 * @property {null}
	 * @property {string} xml Raw XML response
	 */

	/**
	 * This operation adds a VideoEncoderConfiguration to an existing media profile. If a configuration exists in the media profile, it will be replaced. The change shall be persistent. A device shall support adding a compatible VideoEncoderConfiguration to a Profile containing a VideoSourceConfiguration and shall support streaming video data of such a profile.
	 * @param {object} options
	 * @param {string} options.profileToken Reference to the profile where the configuration should be added
	 * @param {string} options.configurationToken Contains a reference to the VideoEncoderConfiguration to add
	 * @param {Cam~AddVideoEncoderConfigurationCallback} callback
	 */
	Cam.prototype.addVideoEncoderConfiguration = function(options,callback) {
		let body = this._envelopeHeader() +
			'<AddVideoEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ProfileToken>' + options.profileToken + '</ProfileToken>' +
				'<ConfigurationToken>' + options.configurationToken + '</ConfigurationToken>' +
			'</AddVideoEncoderConfiguration>' +
			this._envelopeFooter();
		this._request({
			service: 'media',
			body: body,
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, null, xml);
			}
		}.bind(this));
	};

	/**
	 * @callback Cam~AddVideoSourceConfigurationCallback
	 * @property {?Error} error
	 * @property {null}
	 * @property {string} xml Raw XML response
	 */

	/**
	 * This operation adds a VideoSourceConfiguration to an existing media profile. If such a configuration exists in the media profile, it will be replaced. The change shall be persistent.
	 * @param {object} options
	 * @param {string} options.profileToken Reference to the profile where the configuration should be added
	 * @param {string} options.configurationToken Contains a reference to the VideoSourceConfiguration to add
	 * @param {Cam~AddVideoSourceConfigurationCallback} callback
	 */
	Cam.prototype.addVideoSourceConfiguration = function(options,callback) {
		let body = this._envelopeHeader() +
			'<AddVideoSourceConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ProfileToken>' + options.profileToken + '</ProfileToken>' +
				'<ConfigurationToken>' + options.configurationToken + '</ConfigurationToken>' +
			'</AddVideoSourceConfiguration>' +
			this._envelopeFooter();
		this._request({
			service: 'media',
			body: body,
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, null, xml);
			}
		}.bind(this));
	};

	/**
	 * @callback Cam~RemoveAudioEncoderConfigurationCallback
	 * @property {?Error} error
	 * @property {null}
	 * @property {string} xml Raw XML response
	 */

	/**
	 * This operation removes an AudioEncoderConfiguration from an existing media profile. If the media profile does not contain an AudioEncoderConfiguration, the operation has no effect. The removal shall be persistent.
	 * @param {string} profileToken Contains a reference to the media profile from which the AudioEncoderConfiguration shall be removed.
	 * @param {Cam~RemoveAudioEncoderConfigurationCallback} callback
	 */
	Cam.prototype.removeAudioEncoderConfiguration = function(profileToken,callback) {
		let body = this._envelopeHeader() +
			'<RemoveAudioEncoderConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ProfileToken>' + profileToken + '</ProfileToken>' +
			'</RemoveAudioEncoderConfiguration>' +
			this._envelopeFooter();
		this._request({
			service: 'media',
			body: body,
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, null, xml);
			}
		}.bind(this));
	};

	/**
	 * @callback Cam~RemoveAudioSourceConfigurationCallback
	 * @property {?Error} error
	 * @property {null}
	 * @property {string} xml Raw XML response
	 */

	/**
	 * This operation removes an AudioSourceConfiguration from an existing media profile. If the media profile does not contain an AudioSourceConfiguration, the operation has no effect. The removal shall be persistent. Audio source configurations should only be removed after removing an AudioEncoderConfiguration from the media profile.
	 * @param {string} profileToken Contains a reference to the media profile from which the AudioOutputConfiguration shall be removed.
	 * @param {Cam~RemoveAudioSourceConfigurationCallback} callback
	 */
	Cam.prototype.removeAudioSourceConfiguration = function(profileToken,callback) {
		let body = this._envelopeHeader() +
			'<RemoveAudioSourceConfiguration xmlns="http://www.onvif.org/ver10/media/wsdl">' +
				'<ProfileToken>' + profileToken + '</ProfileToken>' +
			'</RemoveAudioSourceConfiguration>' +
			this._envelopeFooter();
		this._request({
			service: 'media',
			body: body,
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, null, xml);
			}
		}.bind(this));
	};

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
		if (this.media2Support) {
			// Profile T request using Media2
			// The reply is in a different format to the old API so we convert the data from the new API to the old structure
			// for backwards compatibility with existing users of this library
			this._request({
				service: 'media2'
				, body: this._envelopeHeader() +
					'<GetProfiles xmlns="http://www.onvif.org/ver20/media/wsdl">' +
					'<Type>All</Type>' +
					'</GetProfiles>' +
					this._envelopeFooter()
			}, function(err, data, xml) {
				// Slight difference in Media1 and Media2 reply XML
				// Generate a reply that looks like a Media1 reply for existing library users

				if (!err) {
					/**
					 * Array of all device profiles
					 * @name Cam#profiles
					 * @type {Array<Cam~Profile>}
					 */
					this.profiles = data[0]['getProfilesResponse'][0]['profiles'].map(function(profile) {
						let tmp = linerase(profile);
						let newProfile = {};
						newProfile.$ = tmp.$; // copy Profile Token
						newProfile.name = tmp.name;
						// Media2 Spec says there will be these some or all of these configuration entities
						// Video source configuration
						// Audio source configuration
						// Video encoder configuration
						// Audio encoder configuration
						// PTZ configuration
						// Video analytics configuration 
						// Metadata configuration
						// Audio output configuration
						// Audio decoder configuration 
						if (tmp.configurations.videoSource) {newProfile.videoSourceConfiguration = tmp.configurations.videoSource;}
						if (tmp.configurations.audioSource) {newProfile.audioSourceConfiguration = tmp.configurations.audioSource;}
						if (tmp.configurations.videoEncoder) {newProfile.videoEncoderConfiguration = tmp.configurations.videoEncoder;}
						if (tmp.configurations.audioEncoder) {newProfile.audioEncoderConfiguration = tmp.configurations.audioEncoder;}
						if (tmp.configurations.PTZ) {newProfile.PTZConfiguration = tmp.configurations.PTZ;}
						if (tmp.configurations.analytics) {newProfile.analyticsConfiguration = tmp.configurations.analytics;}
						if (tmp.configurations.metadata) {newProfile.metadataConfiguration = tmp.configurations.metadata;}
						if (tmp.configurations.audioOutput) {newProfile.audioOutputConfiguration = tmp.configurations.audioOutput;}
						if (tmp.configurations.audioOutput) {newProfile.audioDecoderConfiguration = tmp.configurations.audioDecoder;}

						// TODO - Add Audio
						return newProfile;
					});
				}
				if (callback) {
					callback.call(this, err, this.profiles, xml);
				}
			}.bind(this));

		} else {
			// Original ONVIF Media support (used in Profile S)
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
		}
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
		if (this.media2Support) {
			// Permitted values for options.protocol are :-
			//   RtspUnicast - RTSP streaming RTP via UDP Unicast.
			//   RtspMulticast - RTSP streaming RTP via UDP Multicast.
			//   RTSP - RTSP streaming RTP over TCP.
			//   RtspOverHttp - Tunneling both the RTSP control channel and the RTP stream over HTTP or HTTPS. 
			let protocol = options.protocol || 'RTSP';

			// For backwards compatibility this function will convert Media1 Stream and Transport Protocol to a Media2 protocol
			let stream = options.stream || 'RTP-Unicast';
			if (protocol == 'HTTP') {protocol = 'RtspOverHttp';}
			if (protocol == 'UDP' && stream == "RTP-Unicast") {protocol = 'RtspUnicast';}
			if (protocol == 'UDP' && stream == "RTP-Multicast") {protocol = 'RtspMulticast';}

			// Profile T request using Media2
			this._request({
				service: 'media2'
				, body: this._envelopeHeader() +
					'<GetStreamUri xmlns="http://www.onvif.org/ver20/media/wsdl">' +
					'<Protocol>' + protocol + '</Protocol>' +
					'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
					'</GetStreamUri>' +
					this._envelopeFooter()
			}, function(err, data, xml) {
				if (callback) {
					callback.call(this, err, err ? null : linerase(data).getStreamUriResponse, xml);
				}
			}.bind(this));
		} else {
			// Original ONVIF Specification for Media (used in Profile S)
			this._request({
				service: 'media'
				, body: this._envelopeHeader() +
				'<GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">' +
					'<StreamSetup>' +
						'<Stream xmlns="http://www.onvif.org/ver10/schema">' + (options.stream || 'RTP-Unicast') + '</Stream>' +
						'<Transport xmlns="http://www.onvif.org/ver10/schema">' +
							'<Protocol>' + (options.protocol || 'RTSP') + '</Protocol>' +
						'</Transport>' +
					'</StreamSetup>' +
					'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
				'</GetStreamUri>' +
				this._envelopeFooter()
			}, function(err, data, xml) {
				if (callback) {
					callback.call(this, err, err ? null : linerase(data).getStreamUriResponse.mediaUri, xml);
				}
			}.bind(this));
		}
	};

	/**
	 * Receive snapshot URI
	 * @param {Object} [options]
	 * @param {string} [options.profileToken]
	 * @param {Cam~ResponseUriCallback} [callback]
	 */
	Cam.prototype.getSnapshotUri = function(options, callback) {
		if (callback === undefined) { callback = options; options = {}; }
		if (this.media2Support) {
			// Profile T request using Media2
			this._request({
				service: 'media2'
				, body: this._envelopeHeader() +
					// Note - Namespace difference for Media2
					'<GetSnapshotUri xmlns="http://www.onvif.org/ver20/media/wsdl">' +
						'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
					'</GetSnapshotUri>' +
					this._envelopeFooter()
			}, function(err, data, xml) {
				if (callback) {
					// Slight difference in Media1 and Media2 reply XML
					// Generate a reply that looks like a Media1 reply for existing library users
					callback.call(this, err, err ? null : { uri: linerase(data).getSnapshotUriResponse.uri }, xml);
				}
			}.bind(this));
		} else {
			// Original ONVIF Specification for Media (used in Profile S)
			this._request({
				service: 'media'
				, body: this._envelopeHeader() +
				'<GetSnapshotUri xmlns="http://www.onvif.org/ver10/media/wsdl">' +
					'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
				'</GetSnapshotUri>' +
				this._envelopeFooter()
			}, function(err, data, xml) {
				if (callback) {
					callback.call(this, err, err ? null : linerase(data).getSnapshotUriResponse.mediaUri, xml);
				}
			}.bind(this));
		}
	};

	/**
	 * Set Synchronization Point (keyframe / i-frame)
	 * @param {Object} [options]
	 * @param {string} [options.profileToken]
	 * @param {Cam~SetSynchronizationPointCallback} [callback]
	 */
	Cam.prototype.setSynchronizationPoint = function(options, callback) {
		if (callback === undefined) { callback = options; options = {}; }
		if (this.media2Support) {
			// Profile T request using Media2
			this._request({
				service: 'media2'
				, body: this._envelopeHeader() +
						// Note - Namespace difference for Media2
						'<SetSynchronizationPoint xmlns="http://www.onvif.org/ver20/media/wsdl">' +
							'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
						'</SetSynchronizationPoint>' +
						this._envelopeFooter()
			}, function(err, data, xml) {
				if (callback) {
					callback.call(this, err, null, xml);
				}
			}.bind(this));
		} else {
			// Original ONVIF Specification for Media (used in Profile S)
			this._request({
				service: 'media'
				, body: this._envelopeHeader() +
					'<SetSynchronizationPoint xmlns="http://www.onvif.org/ver10/media/wsdl">' +
						'<ProfileToken>' + (options.profileToken || this.activeSource.profileToken) + '</ProfileToken>' +
					'</SetSynchronizationPoint>' +
					this._envelopeFooter()
			}, function(err, data, xml) {
				if (callback) {
					callback.call(this, err, null, xml);
				}
			}.bind(this));
		}
	};

	/**
	 * Get the OSDs.
	 * @param {string} [token] Token of the Video Source Configuration, which has OSDs associated with are requested.
	 * If token not exist, request all available OSDs.
	 * @param {Cam~GetOSDsCallback} callback
	 */
	Cam.prototype.getOSDs = function(token, callback) {
		if (callback === undefined) { callback = token; token = ''; }
		let mediaType = (this.media2Support ? 'media2' : 'media');
		let mediaNS = (this.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');
		this._request({
			service: mediaType
			, body: this._envelopeHeader() +
				'<GetOSDs xmlns="' + mediaNS + '" >' +
				(token ? '<ConfigurationToken>' + token + '</ConfigurationToken>' : '') +
			'</GetOSDs>' +
				this._envelopeFooter()
		}, function(err, data, xml) {
			let result = {};
			if (!err) {
				result = linerase(data);
				// OSDs is an array of OSD Items, but linerase remove the array if there is only one element inside
				// so we convert it back to an array
				if (!Array.isArray(result.getOSDsResponse.OSDs)) {
					result.getOSDsResponse.OSDs = [result.getOSDsResponse.OSDs];
				}
			}

			if (callback) {
				callback.call(this, err, err ? null : result, xml);
			}
		}.bind(this));
	};

	/**
	 * Get the OSD Options.
	 * @param {Object} [options]
	 * @param {string} [options.videoSourceConfigurationToken] Token of the Video Source Configuration, which has associated OSDs
	 * @param {Cam~GetOSDOptionsCallback} callback
	 */
	Cam.prototype.getOSDOptions = function(options, callback) {
		if (callback === undefined) { callback = options; options = {}; }
		let mediaType = (this.media2Support ? 'media2' : 'media');
		let mediaNS = (this.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');
		this._request({
			service: mediaType
			, body: this._envelopeHeader() +

				'<GetOSDOptions xmlns="' + mediaNS + '" >' +
				'<ConfigurationToken>' + (options.videoSourceConfiguationToken || this.activeSource.videoSourceConfigurationToken) + '</ConfigurationToken>' +
				'</GetOSDOptions>' +
				this._envelopeFooter()
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, err ? null : linerase(data), xml);
			}
		}.bind(this));
	};

	/**
   * CreateOSD
   * ONVIF can handle custom positons, date/time, text, font sizes, transparency, images etc.
   * Support - Plain Text, DateAndTime, Font size and Font color.
   * @param {Object} [options]
   * @param {string} [options.videoSourceConfigurationToken] Token of the Video Source Configuration, which has associated OSDs. Defaults to Active Source
   * @param {object|string} [options.position] String options: UpperLeft, UpperRight, LowerLeft or LowerRight. Default LowerLeft. Or an object with x and y position
   * @param {number} [options.position.x] x position of OSD, range: -1 to 1, counting from left to right
   * @param {number} [options.position.y] y position of OSD, range: -1 to 1, counting from up to down
   * @param {string} [options.plaintext] Plain text to overlay
   * @param {string} [options.dateFormat] Date to overlay. Must be used with timeFormat, otherwise plaintext will be used.
   * @param {string} [options.timeFormat] Time to overlay. Must be used with dateFormat, otherwise plaintext will be used.
   * @param {number} [options.fontSize] The text font size.
   * @param {string} [options.colorspace] Colorspace - RGB or YCbCr. Default RGB.
   * @param {object} [options.fontColor] The color of the text font (OSDColor), should be object with properties - X, Y, Z.
   * @param {float} [options.fontColor.X] For RGB means R value, For YCbCr means Y value.
   * @param {float} [options.fontColor.Y] For RGB means G value, For YCbCr means Cb value.
   * @param {float} [options.fontColor.Z] For RGB means B value, For YCbCr means Cr value.
   * @param {Cam~GetOSDOptionsCallback} callback
   * @example
   * await cam.createOSD({
   *           position: "LowerLeft",
   *           timeFormat: "HH:mm:ss",
   *           dateFormat: "YYYY-MM-DD",
   *           fontSize: 1,
   *           colorspace: "RGB",
   *           fontColor: {
   *             X: 1,
   *             Y: 0.7,
   *             Z: 0.9,
   *           }
   * });
   *
   */
	Cam.prototype.createOSD = function(options, callback) {
		if (callback === undefined) { callback = options; options = {}; }
		let mediaType = (this.media2Support ? 'media2' : 'media');
		let mediaNS = (this.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');
		this._request({
			service: mediaType
			, body: this._envelopeHeader() +
              `<wsdl:CreateOSD xmlns:wsdl="${mediaNS}" xmlns:sch="http://www.onvif.org/ver10/schema">
         <wsdl:OSD token="">
            <sch:VideoSourceConfigurationToken>${options.videoSourceConfiguationToken || this.activeSource.videoSourceConfigurationToken}</sch:VideoSourceConfigurationToken>
						<sch:Type>Text</sch:Type>
						<sch:Position>
							<sch:Type>${ typeof options.position === "object" ? "Custom" : options.position ? options.position : "LowerLeft"}</sch:Type>
				   ${typeof options.position === "object" ? '<sch:Pos x="' + options.position.x + '" y="' + options.position.y + '"/>' : ""}
				</sch:Position>
				  <sch:TextString IsPersistentText="false">
					${ options.dateFormat && options.timeFormat ? 
		`<sch:Type>DateAndTime</sch:Type>
									<sch:DateFormat>${options.dateFormat}</sch:DateFormat>
									<sch:TimeFormat>${options.timeFormat}</sch:TimeFormat>`
		: `<sch:Type>Plain</sch:Type>
									<sch:PlainText>${options.plaintext}</sch:PlainText>`}

					${options.fontSize ? `<sch:FontSize>${options.fontSize}</sch:FontSize>` : ""}				
					${ options.fontColor && options.fontColor.X && options.fontColor.Y && options.fontColor.Z ? 
		`
									<sch:FontColor>
									${ '<sch:Color Z="' + options.fontColor.Z + '" Y="' + options.fontColor.Y + '" X="' + options.fontColor.X + '" Colorspace="' + `${ options.colorspace === "YCbCr" ? "http://www.onvif.org/ver10/colorspace/YCbCr" : "http://www.onvif.org/ver10/colorspace/RGB" }` + '"/>' }
									</sch:FontColor>` : "" }
					</sch:TextString>
         </wsdl:OSD>
      </wsdl:CreateOSD>` +
              this._envelopeFooter(),
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, err ? null : linerase(data), xml);
			}
		}.bind(this));
	};

	/**
   * SetOSD
   * ONVIF can handle custom positons, date/time, text, font sizes, transparency, images etc. 
   * Support - Plain Text, DateAndTime, Font size and Font color.
   * @param {Object} options
   * @param {Object} options.OSDToken
   * @param {string} [options.videoSourceConfigurationToken] Token of the Video Source Configuration, which has associated OSDs. Defaults to Active Source
   * @param {object|string} [options.position] String options: UpperLeft, UpperRight, LowerLeft or LowerRight. Default LowerLeft. Or an object with x and y position
   * @param {number} [options.position.x] x position of OSD, range: -1 to 1, counting from left to right
   * @param {number} [options.position.y] y position of OSD, range: -1 to 1, counting from up to down
   * @param {string} [options.plaintext] Plain text to overlay
   * @param {string} [options.dateFormat] Date to overlay. Must be used with timeFormat, otherwise plaintext will be used.
   * @param {string} [options.timeFormat] Time to overlay. Must be used with dateFormat, otherwise plaintext will be used.
   * @param {number} [options.fontSize] The text font size.
   * @param {string} [options.colorspace] Colorspace - RGB or YCbCr. Default RGB. 
   * @param {object} [options.fontColor] The color of the text font (OSDColor), should be object with properties - X, Y, Z.
   * @param {float} [options.fontColor.X] For RGB means R value, For YCbCr means Y value.
   * @param {float} [options.fontColor.Y] For RGB means G value, For YCbCr means Cb value.
   * @param {float} [options.fontColor.Z] For RGB means B value, For YCbCr means Cr value.
   * @param {Cam~GetOSDOptionsCallback} callback
   * @see {Cam~createOSD} 
   */
	Cam.prototype.setOSD = function(options, callback) {
		let mediaType = (this.media2Support ? 'media2' : 'media');
		let mediaNS = (this.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');
		if (callback === undefined) { callback = options; options = {}; }
		this._request({
			service: mediaType
			, body: this._envelopeHeader() +
					`<wsdl:SetOSD xmlns:wsdl="${mediaNS}" xmlns:sch="http://www.onvif.org/ver10/schema">
			 <wsdl:OSD token="${options.OSDToken}">
				<sch:VideoSourceConfigurationToken>${(options.videoSourceConfigurationToken || this.activeSource.videoSourceConfigurationToken)}</sch:VideoSourceConfigurationToken>
				<sch:Type>Text</sch:Type>
				<sch:Position>
				   <sch:Type>${typeof(options.position) === "object" ? "Custom" : (options.position ? options.position : "LowerLeft")}</sch:Type>
				   ${typeof(options.position) === "object" ? ("<sch:Pos x=\"" + options.position.x + "\" y=\"" + options.position.y + "\"/>") : ""}
				</sch:Position>
				  <sch:TextString IsPersistentText="false">
					${
	options.dateFormat && options.timeFormat
		? `<sch:Type>DateAndTime</sch:Type>
									<sch:DateFormat>${options.dateFormat}</sch:DateFormat>
									<sch:TimeFormat>${options.timeFormat}</sch:TimeFormat>`
		: `<sch:Type>Plain</sch:Type>
									<sch:PlainText>${options.plaintext}</sch:PlainText>`}
									${
	options.fontSize ?
		`<sch:FontSize>${options.fontSize}</sch:FontSize>` : ''
}				
									${ options.fontColor && options.fontColor.X && options.fontColor.Y && options.fontColor.Z ? 
		`
																	<sch:FontColor>
																${ '<sch:Color Z="' + options.fontColor.Z + '" Y="' + options.fontColor.Y + '" X="' + options.fontColor.X + '" Colorspace="' + `${ options.colorspace === "YCbCr" ? "http://www.onvif.org/ver10/colorspace/YCbCr" : "http://www.onvif.org/ver10/colorspace/RGB" }` + '"/>' }
																	</sch:FontColor>` : "" }
														</sch:TextString>
												   </wsdl:OSD>
												</wsdl:SetOSD>` + 
					
				this._envelopeFooter(),
		},
		function(err, data, xml) {
			if (callback) {
				callback.call(this, err, err ? null : linerase(data), xml);
			}
		}.bind(this)
		);
	};

	/**
	 * Delete OSD
	 * @param {string} token
	 * @param {Cam~MessageCallback} callback
	 */
	Cam.prototype.deleteOSD = function(token, callback) {
		let mediaType = (this.media2Support ? 'media2' : 'media');
		let mediaNS = (this.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');
		this._request({
			service: mediaType
			, body: this._envelopeHeader() +
				'<DeleteOSD xmlns="' + mediaNS + '">' +
				'<OSDToken>' + token + '</OSDToken>' +
				'</DeleteOSD>' +
				this._envelopeFooter()
		}, function(err, data, xml) {
			if (callback) {
				callback.call(this, err, err ? null : linerase(data), xml);
			}
		}.bind(this));
	};


	/**
	 * @typedef Cam~ProfileCapabilities
	 * @property {number} $.maximumNumberOfProfiles Maximum number of profiles supported.
	 */

	/**
	 * @typedef Cam~StreamCapabilities
	 * @property {boolean} $.RTPMulticast Indicates support for RTP multicast.
	 * @property {boolean} $.TRP_TCP Indicates support for RTP over TCP.
	 * @property {boolean} $.TRP_RTSP_TCP Indicates support for RTP/RTSP/TCP.
	 * @property {boolean} $.NonAggregateControl Indicates support for non aggregate RTSP control.
	 * @property {boolean} $.NoRTSPStreaming Indicates the device does not support live media streaming via RTSP.

	 */

	/**
	 * @typedef Cam~MediaCapabilities
	 * @property {boolean} $.SnapshotUri Indicates if GetSnapshotUri is supported.
	 * @property {boolean} $.Rotation Indicates whether or not Rotation feature is supported.
	 * @property {boolean} $.VideoSourceMode Indicates the support for changing video source mode.
	 * @property {boolean} $.OSD Indicates if OSD is supported.
	 * @property {boolean} $.TemporaryOSDText Indicates the support for temporary osd text configuration.
	 * @property {boolean} $.EXICompression Indicates the support for the Efficient XML Interchange (EXI) binary XML format.
	 * @property {Cam~ProfileCapabilities} profileCapabilities Media profile capabilities.
	 * @property {Cam~StreamCapabilities} streamCapabilities Streaming capabilities.
	 */

	/**
	 * @callback Cam~GetServiceCapabilitiesCallback
	 * @property {?Error} error
	 * @property {Cam~MediaCapabilities} mediaCapabilities The capabilities for the media service is returned in the Capabilities element.
	 * @property {string} xml Raw XML response
	 */

	/**
	 * Returns the capabilities of the media service. The result is returned in a typed answer.
	 * @param {Cam~GetServiceCapabilitiesCallback} callback
	 */
	Cam.prototype.getMediaServiceCapabilities = function(callback) {
		this._request({
			service: 'media'
			, body: this._envelopeHeader() +
			'<GetServiceCapabilities xmlns="http://www.onvif.org/ver10/media/wsdl" />' +
			this._envelopeFooter()
		}, function(err, data, xml) {
			if (callback) {
				if (!err) {
					data = linerase(data[0].getServiceCapabilitiesResponse[0].capabilities);
					this.mediaCapabilities = data;
				}
				callback.call(this, err, data, xml);
			}
		}.bind(this));
	};
};