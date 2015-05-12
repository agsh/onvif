/**
 * @description Events section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

/**
 * Event properties object
 * @typedef {object} Cam~EventProperties
 * @property {array} topicNamespaceLocation
 * @property {object} topicSet
 * @property {array} topicExpressionDialect
 */

/**
 * @name Cam#events
 * @type object
 * @property {Cam~EventProperties} properties
 * @property {function} getServiceCapabilities
 */

var Cam = require('./onvif').Cam
	, _linerase = require('./soapHelpers')._linerase
	;

/**
 * Get event properties of the device. Sets `events` property of the device
 * @param {function(Error,Cam~EventProperties,string)} callback
 */
Cam.prototype.getEventProperties = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetEventProperties xmlns="http://www.onvif.org/ver10/events/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, res, xml) {
		if (!err) {
			this.events = {
				properties: _linerase(res).getEventPropertiesResponse
			};
		}
		callback.call(this, err, err ? null : this.events.properties, xml);
	});
};


Cam.prototype.getEventServiceCapabilities = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<GetServiceCapabilities xmlns="http://www.onvif.org/ver10/events/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, res, xml) {
		if (!err) {
			var data = _linerase(res[0].getServiceCapabilitiesResponse[0].capabilities[0].$);
		}
		callback.call(this, err, data, xml);
	});
};