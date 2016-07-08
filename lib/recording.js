/**
 * @namespace cam
 * @description Recording section for Cam class
 * @author Roger Hardiman <opensource@rjh.org.uk>
 * @licence MIT
 */

const Cam = require('./cam').Cam
	, linerase = require('./utils').linerase
	;

/**
 * @typedef {object} Cam~RecordingItem
 * @property {string} $.token Recording token
 * @property {string} configuration.source.sourceid
 * @property {string} configuration.content
 * @property {string} configuration.maximumretentiontime
 * @property {string} tracks.track.tracktoken
 * @property {string} tracks.configuration.tracktype
 * @property {string} tracks.configuration.description
 */

/**
 * @callback Cam~GetRecordingsCallback
 * @property {?Error} error
 * @property {Cam~RecordingItem|Array.<Cam~RecordingItem>} recording items
 * @property {string} xml Raw SOAP response
 */

/**
 * Get Recording Items (links Video Sources to Recording Tracks)
 * @param {Cam~GetRecordingsCallback} [callback]
 */
Cam.prototype.getRecordings = function(callback) {
	this._request({
		service: 'recording'
		, body: this._envelopeHeader() +
		'<GetRecordings xmlns="http://www.onvif.org/ver10/recording/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			/**
			 * Recording Item
			 * @name Cam#recordingItem
			 * @type {Cam~RecordingItem|Array.<Cam~RecordingItem>}
			 */
			this.recordingItems = linerase(data).getRecordingsResponse.recordingItem;
		}
		if (callback) {
			callback.call(this, err, this.recordingItems, xml);
		}
	}.bind(this));
};
