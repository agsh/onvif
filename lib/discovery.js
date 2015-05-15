/**
 * @description Discovery module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

'use strict';

const
	Cam = require('./cam')
	, events = require('events')
	, guid = require('./soapHelpers').guid
	, _linerase = require('./soapHelpers')._linerase
	, parseSOAPString = require('./soapHelpers').parseSOAPString
	, url = require('url')
	;

var Discovery = Object.create(new events.EventEmitter());

/**
 * Discover NVT devices in the subnetwork
 * @param {object} [options]
 * @param {number} [options.timeout] timeout for discovery responses
 * @param {boolean} [options.resolve] set to `false` if you want omit creating of Cam objects
 * @param {function(null|Error,Array<Cam|object>)} [callback]
 */
Discovery.probe = function(options, callback) {
	if (callback === undefined) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		} else {
			options = options || {};
		}
	}
	callback = callback || function() {};

	var cams = {}
		, errors = []
		, messageID = 'urn:uuid:' + (options.messageId || guid())
		, request = new Buffer(
			'<s:Envelope ' +
			'xmlns:s="http://www.w3.org/2003/05/soap-envelope" ' +
			'xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing">' +
			'<s:Header>' +
			'<a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>' +
			'<a:MessageID>' + messageID + '</a:MessageID>' +
			'<a:ReplyTo><a:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</a:Address></a:ReplyTo>' +
			'<a:To s:mustUnderstand="1">urn:docs-oasis-open-org:ws-dd:ns:discovery:2009:01</a:To>' +
			'</s:Header>' +
			'<s:Body>' +
			'<Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">' +
			'<d:Types xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dp0="http://www.onvif.org/ver10/network/wsdl">dp0:NetworkVideoTransmitter</d:Types>' +
			'</Probe>' +
			'</s:Body>' +
			'</s:Envelope>'
		)
		, socket = require('dgram').createSocket('udp4');

	socket.on('error', function(err) {
		Discovery.emit('error', err);
		callback(err);
	});

	const listener = function(msg, rinfo) {
		parseSOAPString(msg, function(err, data, xml) {
			// TODO check for matching RelatesTo field and messageId
			if (err || !data[0].probeMatches) {
				errors.push(err || new Error('Wrong SOAP message from ' + rinfo.address + ':' + rinfo.port, xml));
				Discovery.emit('error', 'Wrong SOAP message from ' + rinfo.address + ':' + rinfo.port, xml);
			} else {
				data = _linerase(data);

				// Possible to get multiple matches for the same camera
				// when your computer has more than one network adapter in the same subnet
				var camAddr = data.probeMatches.probeMatch.endpointReference.address;
				if (!cams[camAddr]) {
					var cam;
					if (options.resolve !== false) {
						var camUri = url.parse(data.probeMatches.probeMatch.XAddrs);
						cam = new Cam({
							hostname: camUri.hostname
							, port: camUri.port
							, path: camUri.path
						});
					} else {
						cam = data;
					}
					cams[camAddr] = cam;
					Discovery.emit('device', cam, rinfo, xml);
				}
			}
		});
	};

	socket.on('message', listener);
	socket.send(request, 0, request.length, 3702, '239.255.255.250');

	setTimeout(function() {
		socket.removeListener('message', listener);
		socket.close();
		callback(errors.length ? errors : null, Object.keys(cams).map(function(addr) { return cams[addr]; }));
	}.bind(this), options.timeout || 5000);
};

module.exports = Discovery;