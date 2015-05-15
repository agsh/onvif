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
			this.videoSourceConfigurations = linerase(data).getVideoSourceConfigurationsResponse.configurations;
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
				return linerase(config);
			});
		}
		if (callback) {
			callback.call(this, err, this.videoEncoderConfigurations, xml);
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
/*Cam.prototype.deleteProfile = function(token, callback) {

 };*/

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