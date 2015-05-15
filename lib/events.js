/**
 * @namespace cam
 * @description Events section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

/**
 * @typedef {object} Cam~CreatePullPointSubscriptionResponse
 * @property {object} subscriptionReference
 * @property {string} subscriptionReference.address
 * @property {Date} currentTime
 * @property {Date} terminationTime
 */

/**
 * Events namespace for the device, stores all information about device events
 * @name Cam#events
 * @type object
 * @property {Cam~EventProperties} properties
 * @property {Cam~CreatePullPointSubscriptionResponse} subscription
 */

const Cam = require('./cam').Cam
	, _linerase = require('./utils').linerase
	, url = require('url')
	;

/**
 * Event properties object
 * @typedef {object} Cam~EventProperties
 * @property {array} topicNamespaceLocation
 * @property {object} topicSet
 * @property {array} topicExpressionDialect
 */

/**
 * @callback Cam~GetEventPropertiesCallback
 * @property {?Error} err
 * @property {Cam~EventProperties} response
 * @property {string} response xml
 */

/**
 * Get event properties of the device. Sets `events` property of the device
 * @param {Cam~GetEventPropertiesCallback} callback
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
 * @param {function} callback
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
 * @param {function} callback
 */
Cam.prototype.createPullPointSubscription = function(callback) {
	this._request({
		body: this._envelopeHeader() +
		'<CreatePullPointSubscription xmlns="http://www.onvif.org/ver10/events/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, res, xml) {
		if (!err) {
			this.events.subscription = _linerase(res[0].createPullPointSubscriptionResponse[0]);
			this.events.subscription.subscriptionReference.address =
				url.parse(this.events.subscription.subscriptionReference.address);
		}
		callback.call(this, err, err ? null : this.events.subscription, xml);
	}.bind(this));
};

/**
 * Pull messages from pull-point subscription
 * @param options
 * @param {number} [options.timeout=30000]
 * @param {number} [options.messageLimit=1]
 * @param {function} callback
 * @throws {Error} {@link Cam#events.subscription} must exists
 */
Cam.prototype.pullMessages = function(options, callback) {
	try {
		var url = this.events.subscription.subscriptionReference.address;
	} catch (e) {
		throw new Error('You should create pull-point subscription first!');
	}
	this._request({
		url: url
		, body: this._envelopeHeader() +
		'<PullMessages xmlns="http://www.onvif.org/ver10/events/wsdl">' +
			'<Timeout>PT' + ((options.timeout || 30000) / 1000) + 'S</Timeout>' +
			'<MessageLimit>' + (options.messageLimit || 1) + '</MessageLimit>' +
		'</PullMessages>' +
		this._envelopeFooter()
	}, function(err, res, xml) {
		if (!err) {
			var data = _linerase(res).pullMessagesResponse;
		}
		callback.call(this, err, data, xml);
	}.bind(this));
};