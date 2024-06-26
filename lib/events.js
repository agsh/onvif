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

	const linerase = require('./utils').linerase;
	const parseSOAPString = require('./utils').parseSOAPString;
	const retryErrorCodes = ['ECONNREFUSED','ECONNRESET','ETIMEDOUT', 'ENETUNREACH'];
	const maxEventReconnectMs = 2 * 60 * 1000;


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
	 * Create Base Subscription
	 * This allows Cameras and NVTs to send events to a URL via a POST message
	 * TODO - Add Termination Time
	 * @param {object} options
	 * @param {string} options.url
	 * @param {function} callback
	 */

	Cam.prototype.subscribe = function(options, callback) {
		let sendXml = this._envelopeHeader(true);

		// TODO Add a:Action ??
		// TODO Add a:MessageID ??
		sendXml += '<a:ReplyTo><a:Address>' + options.url + '</a:Address></a:ReplyTo>';

		sendXml += '</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
			'<Subscribe xmlns="http://docs.oasis-open.org/wsn/b-2">' +
			'<ConsumerReference><a:Address>' + options.url + '</a:Address></ConsumerReference>' +
			'<InitialTerminationTime>PT2M</InitialTerminationTime>' + // 2 mins (a value greater than the 1 min Pull Timeout)
			'</Subscribe>' +
			this._envelopeFooter();

		this._request({
			service: 'events',
			body: sendXml
		}, function(err, res, xml) {
			if (!err) {
				this.events.subscription = linerase(res[0].subscribeResponse[0]);
				this.events.subscription.subscriptionReference.address =
					this._parseUrl(this.events.subscription.subscriptionReference.address);
				this.events.terminationTime = _terminationTime(this.events.subscription);
			}
			callback.call(this, err, err ? null : this.events.subscription, xml);
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
				'<InitialTerminationTime>PT2M</InitialTerminationTime>' +
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
	 * @param {Object|Function} [options]
	 * @param {Function} callback
	 */
	Cam.prototype.renew = function(options, callback) {
		if (!callback) {
			callback = options;
		}
		let urlAddress = null;
		let subscriptionId = null;
		try {
			urlAddress = this.events.subscription.subscriptionReference.address;
		} catch (e) {
			if (callback && callback.call) {
				callback.call(this, new Error('You should create pull-point subscription first!'));
			}
			return;
		}

		try {
			subscriptionId = this.events.subscription.subscriptionReference.referenceParameters.subscriptionId;
		} catch (e) {
			subscriptionId = null;
		}

		let sendXml = this._envelopeHeader(true);

		if (!subscriptionId) {
			sendXml += '<a:To>' + urlAddress.href + '</a:To>';
		} else {
			// Axis Cameras use a PullPoint URL and the Subscription ID
			sendXml += '<a:To mustUnderstand="1">' + urlAddress.href + '</a:To>' +
					'<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">' + this.events.subscription.subscriptionReference.referenceParameters.subscriptionId + '</SubscriptionId>';
		}
		sendXml += '</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<Renew xmlns="http://docs.oasis-open.org/wsn/b-2">' +
					'<TerminationTime>PT2M</TerminationTime>' + // 2 mins (larger than the 1 min Pull timeout)
				'</Renew>' +
			this._envelopeFooter();
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
			if (callback && callback.call) {
				callback.call(this, new Error('You should create pull-point subscription first!'));
			} else {
				throw new Error('You should create pull-point subscription first!');
			}
			return;
		}

		try {
			subscriptionId = this.events.subscription.subscriptionReference.referenceParameters.subscriptionId;
		} catch (e) {
			subscriptionId = null;
		}

		let sendXml = this._envelopeHeader(true);

		if (!subscriptionId) {
			sendXml += '<a:To>' + urlAddress.href + '</a:To>';
		} else {
			// Axis Cameras use a PullPoint URL and the Subscription ID
			sendXml += '<a:To mustUnderstand="1">' + urlAddress.href + '</a:To>' +
					'<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">' + subscriptionId + '</SubscriptionId>';
		}
		sendXml += '</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<PullMessages xmlns="http://www.onvif.org/ver10/events/wsdl">' +
					'<Timeout>PT1M</Timeout>' + // ONVIF Spec says cameras must support 1 Minute wait times. Ensure network socket has a replyTimeout that is larger that 1 minute
					'<MessageLimit>' + (options.messageLimit || 10) + '</MessageLimit>' +
				'</PullMessages>' +
			this._envelopeFooter();
		this._request({
			url: urlAddress,
			body: sendXml,
			replyTimeout: (80 * 1000) // 80 seconds - ensures the socket does not get closed too early while the camera has up to 1 minute to reply
		}, function(err, res, xml) {
			if (!err) {
				var data = linerase(res).pullMessagesResponse;
			}
			callback.call(this, err, data, xml);
		}.bind(this));
	};

	/**
	 * Unsubscribe from pull-point subscription
	 * @param {Cam~PullMessagesResponse} [callback]
	 * @param {boolean} [preserveListeners=false] Don't remove listeners on 'event'
	 * @throws {Error} {@link Cam#events.subscription} must exists
	 */
	Cam.prototype.unsubscribe = function(callback, preserveListeners) {
		let urlAddress = null;
		let subscriptionId = null;
		try {
			urlAddress = this.events.subscription.subscriptionReference.address;
		} catch (e) {
			if (callback && callback.call) {
				callback.call(this, new Error('You should create pull-point subscription first!'));
			}
			return;
		}

		try {
			subscriptionId = this.events.subscription.subscriptionReference.referenceParameters.subscriptionId;
		} catch (e) {
			subscriptionId = null;
		}

		delete this.events.subscription;
		delete this.events.terminationTime;

		let sendXml = this._envelopeHeader(true);

		if (!subscriptionId) {
			sendXml += '<a:To>' + urlAddress.href + '</a:To>';
		} else {
			// Axis Cameras use a PullPoint URL and the Subscription ID
			sendXml += '<a:To mustUnderstand="1">' + urlAddress.href + '</a:To>' +
					'<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">' + subscriptionId + '</SubscriptionId>';
		}
		sendXml += '</s:Header>' +
			'<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
				'<Unsubscribe xmlns="http://docs.oasis-open.org/wsn/b-2"/>' +
			this._envelopeFooter();
		this._request({
			url: urlAddress,
			body: sendXml
		}, function(err, res, xml) {
			if (!err) {
				if (!preserveListeners) {
					this.removeAllListeners('event'); // We can subscribe again only if there is no 'event' listener
				}
				var data = linerase(res).unsubscribeResponse;
			}
			if (callback && callback.call) {
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
	 * Event loop for pullMessages request
	 * @private
	 */
	Cam.prototype._eventRequest = function() {
		if (this.listeners('event').length) { // check for event listeners, if zero, stop pulling
			this.events.messageLimit = this.events.messageLimit || 10; // setting message limit
			if (!this.events.subscription || !this.events.terminationTime || (Date.now() > this.events.terminationTime)) {
				// if there is no pull-point subscription or it has expired, create new subscription
				this.createPullPointSubscription(function(error) {
					if (!error) {
						delete this._eventReconnectms;
						this._eventPull();
					} else {
						this.emit('eventsError', error);
						if (typeof error === 'object' && retryErrorCodes.includes(error.code)) {
							// connection reset on creation - restart Event loop for pullMessages request
							this._restartEventRequest();
						}
					}
				}.bind(this));
			} else {
				this._eventPull();
			}
		} else {
			delete this.events.terminationTime;
			this.unsubscribe();
		}
	};

	/**
	 * Event loop for pullMessages request
	 * @private
	 * @throws {Error} {@link Cam#events.subscription} must exists
	 */
	Cam.prototype._eventPull = function() {
		if (this.listeners('event').length && this.events.subscription) { // check for event listeners, if zero, or no subscription then stop pulling
			this.pullMessages({
				messageLimit: this.events.messageLimit
			}, function(error, data, xml) {
				if (!error) {
					delete this._eventReconnectms;
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
					this.events.terminationTime = _terminationTime(data); // Axis does not increment the termination time. Use RENEW. Vista returns a termination time with the time now (ie we have expired) even if there was still time left over. Use RENEW

					// Axis cameras require us to Rewew the Pull Point Subscription
					this.renew({},function(error, data) {
						if (!error) {
							this.events.terminationTime = _terminationTime(data);
						}
						this._eventRequest();  // go around the loop again, once the RENEW has completed (and terminationTime updated)
					});
				} else {
					this.emit('eventsError', error);
					if (typeof error === 'object' && retryErrorCodes.includes(error.code)) {
						// connection reset - restart Event loop for pullMessages request
						this._restartEventRequest();
					} else {
						// there was an error pulling the message
						this.unsubscribe(function(_err, _data, _xml) {
							// once the unsubsribe has completed (even if it failed), go around the loop again
							this._eventRequest();
						}, true);
					}
				}
			}.bind(this));
		} else {
			delete this.events.terminationTime;
			if (this.events.subscription) {
				this.unsubscribe();
			}
		}
	};

	/**
	 * Restart the event request with an increasing interval when the connection to the device is refused
	 * @private
	 */
	Cam.prototype._restartEventRequest = function() {
		// TODO maybe stop trying to connect after some time
		if (!this._eventReconnectms) {
			this._eventReconnectms = 10;
		}
		setTimeout(this._eventRequest.bind(this), this._eventReconnectms);
		if (this._eventReconnectms < maxEventReconnectMs) {
			this._eventReconnectms = 1.111 * this._eventReconnectms;
		}
	};

	/**
	 * Helper Function to Parse XML Event data received by an external TCP port and
	 * a camera in Event PUSH mode (ie not in subscribe mode)
	 */
	Cam.prototype.parseEventXML = function(xml, callback) {
		let innerFunction = function(err, data, _xml, _statusCode) {
			let result = linerase(data).notify.notificationMessage;
			callback(err, result);
		};

		parseSOAPString(xml, innerFunction, 0);
	};

};
