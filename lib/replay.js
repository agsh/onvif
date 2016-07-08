/**
 * @namespace cam
 * @description Replay section for Cam class
 * @author Roger Hardiman <opensource@rjh.org.uk>
 * @licence MIT
 */

const Cam = require('./cam').Cam
	, linerase = require('./utils').linerase
	;

/**
 * @callback Cam~ResponseUriCallback
 * @property {string} uri
 */

/**
 * Receive Replay Stream URI
 * @param {Object} [options]
 * @param {string} [options.stream]
 * @param {string} [options.protocol]
 * @param {string} [options.recordingToken]
 * @param {Cam~ResponseUriCallback} [callback]
 */
Cam.prototype.getReplayUri = function(options, callback) {
	if (callback === undefined) { callback = options; options = {};	}
	this._request({
		service: 'replay'
		, body: this._envelopeHeader() +
		'<GetReplayUri xmlns="http://www.onvif.org/ver10/replay/wsdl">' +
			'<StreamSetup>' +
				'<Stream xmlns="http://www.onvif.org/ver10/schema">' + (options.stream || 'RTP-Unicast') +'</Stream>' +
				'<Transport xmlns="http://www.onvif.org/ver10/schema">' +
					'<Protocol>' + (options.protocol || 'RTSP') +'</Protocol>' +
				'</Transport>' +
			'</StreamSetup>' +
			'<RecordingToken>' + (options.recordingToken) +'</RecordingToken>' +
		'</GetReplayUri>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (callback) {
			callback.call(this, err, err ? null : linerase(data).getReplayUriResponse.uri, xml);
		}
	}.bind(this));
};