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
 * @typedef {object} Cam~ImagingSetting
 * @property {string} $.token Video source token
 * @property {number} brightness
 * @property {number} colorsaturation
 * @property {number} contrast
 * @property {number} sharpness
 */

Cam.prototype.getImagingSettings = function(options, callback) {
	this._request({
		service: 'imging'
		, body: this._envelopeHeader() +
		'<GetImagingSettingss xmlns="http://www.onvif.org/ver20/imaging/wsdl"/>' +
		'<VideoSourceToken>' + options.token + '</VideoSourceToken>' + 
		'/<GetImagingSettings>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
//FIXME need to know 'linerase'  QAQ
		if (callback) { 
			callback.call(this, err, err ? null : linerase(data).getImagingSettingsResponse.imaingUri, xml);
		}
	}.bind(this));
};

