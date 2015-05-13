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
 * @typedef {object} Cam~CreatePullPointSubscriptionResponse
 * @property {object} subscriptionReference
 * @property {string} subscriptionReference.address
 * @property {Date} currentTime
 * @property {Date} terminationTime
 */

/**
 * @name Cam#events
 * @type object
 * @property {Cam~EventProperties} properties
 * @property {Cam~CreatePullPointSubscriptionResponse} subscription
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
			this.events.properties = _linerase(res).getEventPropertiesResponse;
		}
		callback.call(this, err, err ? null : this.events.properties, xml);
	}.bind(this));
};

/**
 * Get event service capabilities
 * @param callback
 */
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
	}.bind(this));
};

/**
 * Create pull-point subscription
 * @param options
 * @param callback
 */
Cam.prototype.createPullPointSubscription = function(options, callback) {
	this._request({
		body: this._envelopeHeader() +
		'<CreatePullPointSubscription xmlns="http://www.onvif.org/ver10/events/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, res, xml) {
		if (!err) {
			this.events.subscription = _linerase(res[0].createPullPointSubscriptionResponse[0]);
		}
		callback.call(this, err, err ? null : this.events.subscription, xml);
	}.bind(this));
};

Cam.prototype.pullMessages = function(options, callback) {
	this._request({
		body: this._envelopeHeader() +
		'<PullMessages xmlns="http://www.onvif.org/ver10/events/wsdl" />' +
		this._envelopeFooter()
	}, function(err, res, xml) {
		if (!err) {
			var data;
		}
		callback.call(this, err, res, xml);
	}.bind(this));
};