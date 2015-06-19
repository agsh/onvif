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
		service: 'imaging'
		, body: this._envelopeHeader() +
		'<GetImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
		'<VideoSourceToken  xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' + ( options.token || this.activeSource.sourceToken) + '</VideoSourceToken>' + 
		'</GetImagingSettings>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (err) {
			console.log("getImagingSettings err:");
			console.log(err);
		}
		if (callback) { 
			console.log(this.videoSources);
			callback.call(this, err, err ? null : linerase(data), xml);
		}
	}.bind(this));
};

Cam.prototype.setImagingSettings = function(options, callback) {
	this._request({
		service: 'imaging'
		, body: this._envelopeHeader() +
		'<SetImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
			'<VideoSourceToken  xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
				( options.token || this.activeSource.sourceToken) +
			'</VideoSourceToken>' +
 
			'<ImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
				( 
					options.brightness ? 
					(
						'<Brightness xmlns="http://www.onvif.org/ver10/schema">' +
							(options.brightness).toString() +
						'</Brightness>' 
					) : ''
				)

			+

				( 
					options.colorSaturation ? 
					(
						'<ColorSaturation xmlns="http://www.onvif.org/ver10/schema">' +
							(options.colorSaturation).toString() +
						'</ColorSaturation>' 
					) : ''
				)

			+

				( 
					options.contrast ? 
					(
						'<Contrast xmlns="http://www.onvif.org/ver10/schema">' +
							(options.contrast).toString() +
						'</Contrast>' 
					) : ''
				)

			+

				( 
					options.sharpness ? 
					(
						'<Sharpness xmlns="http://www.onvif.org/ver10/schema">' +
							(options.sharpness).toString() +
						'</Sharpness>' 
					) : ''
				)

			+
			'</ImagingSettings>' +
		'</SetImagingSettings>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (err) {
			console.log("setImagingSettings err:");
			console.log(err);
		}
		if (callback) { 
			callback.call(this, err, err ? null : linerase(data), xml);
		}
	}.bind(this));
};
