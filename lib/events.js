/**
 * @namespace cam
 * @description Events section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */
module.exports = function(Cam) {

	/**
	 * @typedef {object} Cam~CreatePullPointSubscriptionResponse
	 * @property {object} subscriptionReference
	 * @property {string|object} subscriptionReference.address
	 * @property {Date} currentTime
	 * @property {Date} terminationTime
	 */

	/**
	 * Events namespace for the device, stores all information about device events
	 * @name Cam#events
	 * @type object
	 * @property {Cam~EventProperties} properties
	 * @property {Cam~CreatePullPointSubscriptionResponse} subscription
	 * @property {Date} terminationTime Time when pull-point subscription is over
	 * @property {number} messageLimit Pull message count
	 */

	const linerase = require('./utils').linerase
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
			service: 'events'
			, body: this._envelopeHeader() +
			'<GetEventProperties xmlns="http://www.onvif.org/ver10/events/wsdl"/>' +
			this._envelopeFooter()
		}, function(err, res, xml) {
			if (!err) {
				this.events.properties = linerase(res).getEventPropertiesResponse;
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
			service: 'events'
			, body: this._envelopeHeader() +
			'<GetServiceCapabilities xmlns="http://www.onvif.org/ver10/events/wsdl"/>' +
			this._envelopeFooter()
		}, function(err, res, xml) {
			if (!err) {
				var data = linerase(res[0].getServiceCapabilitiesResponse[0].capabilities[0].$);
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
			service: 'events'
			, body: this._envelopeHeader() +
			'<CreatePullPointSubscription xmlns="http://www.onvif.org/ver10/events/wsdl">' +
				'<InitialTerminationTime>PT60S</InitialTerminationTime>' +
			'</CreatePullPointSubscription>' +
			this._envelopeFooter()
		}, function(err, res, xml) {
			if (!err) {
				this.events.subscription = linerase(res[0].createPullPointSubscriptionResponse[0]);
				this.events.subscription.subscriptionReference.address =
					this._parseUrl(this.events.subscription.subscriptionReference.address);
				this.events.terminationTime = _terminationTime(this.events.subscription);
			}
			callback.call(this, err, err ? null : this.events.subscription, xml);
		}.bind(this));
	};


	/**
	 * Renew pull-point subscription
	 * @param {options} callback
	 * @param {function} callback
	 */

	Cam.prototype.renew = function(options, callback) {
		let urlAddress = null;
		let subscriptionId = null;
		try {
			urlAddress = this.events.subscription.subscriptionReference.address;
		} catch (e) {
			throw new Error('You should create pull-point subscription first!');
		}

		try {
			subscriptionId = this.events.subscription.subscriptionReference.referenceParameters.subscriptionId
		} catch (e) {
			subscriptionId = null;
		}

		let sendXml = this._envelopeHeader(true)
		
		if (!subscriptionId) {
			sendXml += '<a:To>' + urlAddress.href + '</a:To>'
		} else {
			// Axis Cameras use a PullPoint URL and the Subscription ID
			sendXml += '<a:To mustUnderstand="1">' + urlAddress.href + '</a:To>' +
					'<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">' + this.events.subscription.subscriptionReference.referenceParameters.subscriptionId + '</SubscriptionId>'
		}
		sendXml += '</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<Renew xmlns="http://docs.oasis-open.org/wsn/b-2">' +
					'<TerminationTime>PT60S</TerminationTime>' +
				'</Renew>' +
			this._envelopeFooter()
		this._request({
			url: urlAddress,
			body: sendXml
		}, function(err, res, xml) {
			if (!err) {
				var data = linerase(res).renewResponse;
			}
			callback.call(this, err, data, xml);
		}.bind(this));
	};

	

	/**
	 * @typedef {object} Cam~Event
	 * @property {Date} currentTime
	 * @property {Date} terminationTime
	 * @property {Cam~NotificationMessage|Array.<Cam~NotificationMessage>} [notificationMessage]
	 */

	/**
	 * @typedef {object} Cam~NotificationMessage
	 * @property {string} subscriptionReference.address Pull-point address
	 * @property {string} topic._ Namespace of message topic
	 * @property {object} message Message object
	 */

	/**
	 * @callback Cam~PullMessagesResponse
	 * @property {?Error} error
	 * @property {Cam~Event} response Message
	 * @property {string} xml Raw SOAP response
	 */

	/**
	 * Pull messages from pull-point subscription
	 * @param options
	 * @param {number} [options.messageLimit=10]
	 * @param {Cam~PullMessagesResponse} callback
	 * @throws {Error} {@link Cam#events.subscription} must exists
	 */
	Cam.prototype.pullMessages = function(options, callback) {
		let urlAddress = null;
		let subscriptionId = null;
		try {
			urlAddress = this.events.subscription.subscriptionReference.address;
		} catch (e) {
			throw new Error('You should create pull-point subscription first!');
		}

		try {
			subscriptionId = this.events.subscription.subscriptionReference.referenceParameters.subscriptionId
		} catch (e) {
			subscriptionId = null;
		}

		let sendXml = this._envelopeHeader(true)
		
		if (!subscriptionId) {
			sendXml += '<a:To>' + urlAddress.href + '</a:To>'
		} else {
			// Axis Cameras use a PullPoint URL and the Subscription ID
			sendXml += '<a:To mustUnderstand="1">' + urlAddress.href + '</a:To>' +
					'<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">' + this.events.subscription.subscriptionReference.referenceParameters.subscriptionId + '</SubscriptionId>'
		}
		sendXml += '</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<PullMessages xmlns="http://www.onvif.org/ver10/events/wsdl">' +
					'<Timeout>PT' + ((options.timeout || 5000) / 1000) + 'S</Timeout>' +
					'<MessageLimit>' + (options.messageLimit || 10) + '</MessageLimit>' +
				'</PullMessages>' +
			this._envelopeFooter()
		this._request({
			url: urlAddress,
			timeout: !isNaN(options.timeout) ? options.timeout + 5000 : 10000, // Socket timeout must be longer than pull timeout or we will get a socket error when there are no new events
			body: sendXml
		}, function(err, res, xml) {
			if (!err) {
				var data = linerase(res).pullMessagesResponse;
			}
			callback.call(this, err, data, xml);
		}.bind(this));
	};

	/**
	 * Unsubscribe from pull-point subscription
	 * @param {Cam~PullMessagesResponse} callback
	 * @throws {Error} {@link Cam#events.subscription} must exists
	 */
	Cam.prototype.unsubscribe = function(callback) {
		let urlAddress = null;
		let subscriptionId = null;
		try {
			urlAddress = this.events.subscription.subscriptionReference.address;
		} catch (e) {
			throw new Error('You should create pull-point subscription first!');
		}

		try {
			subscriptionId = this.events.subscription.subscriptionReference.referenceParameters.subscriptionId
		} catch (e) {
			subscriptionId = null;
		}

		let sendXml = this._envelopeHeader(true)
		
		if (!subscriptionId) {
			sendXml += '<a:To>' + urlAddress.href + '</a:To>'
		} else {
			// Axis Cameras use a PullPoint URL and the Subscription ID
			sendXml += '<a:To mustUnderstand="1">' + urlAddress.href + '</a:To>' +
					'<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">' + this.events.subscription.subscriptionReference.referenceParameters.subscriptionId + '</SubscriptionId>'
		}
		sendXml += '</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<Unsubscribe xmlns="http://docs.oasis-open.org/wsn/b-2"/>' +
			this._envelopeFooter()
		this._request({
			url: urlAddress,
			body: sendXml
		}, function(err, res, xml) {
			if (!err) {
				var data = linerase(res).unsubscribeResponse;
			}
			if (callback) {
				callback.call(this, err, data, xml);
			}
		}.bind(this));
	};
	
	/**
	 * Count time before pull-point subscription terminates
	 * @param {Cam~CreatePullPointSubscriptionResponse} response
	 * @returns {Date}
	 * @private
	 */
	function _terminationTime(response) {
		return new Date(Date.now() - response.currentTime.getTime() + response.terminationTime.getTime());
	}

	/**
	 * Bind event handling to the `event` event
	 */
	Cam.prototype.on('newListener', function(name) {
		// if this is the first listener, start pulling
		if (name === 'event' && this.listeners(name).length === 0) {
			this._eventRequest();
		}
	});

	/**
	 * Event loop for pullMessages request
	 * @private
	 */
	Cam.prototype._eventRequest = function() {
		this.events.timeout = this.events.timeout || 30000; // setting timeout
		this.events.messageLimit = this.events.messageLimit || 10; // setting message limit
		if (!this.events.terminationTime || (this.events.terminationTime < Date.now() + this.events.timeout)) {
			// if there is no pull-point subscription or it will be dead soon, create new
			this.createPullPointSubscription(this._eventPull.bind(this));
		} else {
			this._eventPull();
		}
	};

	/**
	 * Event loop for pullMessages request
	 * @private
	 */
	Cam.prototype._eventPull = function() {
		if (this.listeners('event').length) { // check for event listeners, if zero, stop pulling
			this.pullMessages({
				messageLimit: this.events.messageLimit
				, timeout: this.events.timeout
			}, function(err, data, xml) {
				if (!err) {
					if (data.notificationMessage) {
						if (!Array.isArray(data.notificationMessage)) {
							data.notificationMessage = [data.notificationMessage];
						}
						data.notificationMessage.forEach(function(message) {
							/**
							 * Indicates message from device.
							 * @event Cam#event
							 * @type {Cam~NotificationMessage}
							 */
							this.emit('event', message, xml);
						}.bind(this));
					}
					this.events.terminationTime = _terminationTime(data); // Axis does not increment the termination time. Use RENEW
					// console.log ("PULL COMPLETE. TERMINATE AT " + data.terminationTime )

					// Axis cameras require us to Rewew the Pull Point Subscription
					this.renew({},function(err,data) {
						if (!err) {
							this.events.terminationTime = _terminationTime(data);
						}
					})
				}
				this._eventRequest();
			}.bind(this));
		} else {
			delete this.events.terminationTime;

			this.unsubscribe();
		}
	};
};
