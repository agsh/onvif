/**
 * @namespace discovery
 * @description Discovery module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

const
	Cam = require('./cam').Cam,
	events = require('events'),
	guid = require('../lib/utils').guid,
	linerase = require('../lib/utils').linerase,
	parseSOAPString = require('../lib/utils').parseSOAPString,
	url = require('url'),
	os = require('os');

/**
 * Discovery singleton
 * @type {Object}
 * @class
 */
var Discovery = Object.create(new events.EventEmitter());

/**
 * @callback Discovery~ProbeCallback
 * @property {?Error} error
 * @property {Array<Cam|object>} found devices
 */

/**
 * Discover NVT devices in the subnetwork
 * @param {object} [options]
 * @param {number} [options.timeout=5000] timeout in milliseconds for discovery responses
 * @param {boolean} [options.resolve=true] set to `false` if you want omit creating of Cam objects
 * @param {string} [options.messageId=GUID] WS-Discovery message id
 * @param {string} [options.device=defaultroute] Interface to bind on for discovery ex. `eth0`
 * @param {number} [options.listeningPort=null] client will listen to discovery data device sent
 * @param {Discovery~ProbeCallback} [callback] timeout callback
 * @fires Discovery#device
 * @fires Discovery#error
 * @example
 * var onvif = require('onvif');
 * onvif.Discovery.on('device', function(cam){
 *   // function would be called as soon as NVT responses
 *   cam.username = <USERNAME>;
 *   cam.password = <PASSWORD>;
 *   cam.connect(console.log);
 * })
 * onvif.Discovery.probe();
 * @example
 * var onvif = require('onvif');
 * onvif.Discovery.probe(function(err, cams) {
 *   // function would be called only after timeout (5 sec by default)
 *   if (err) { throw err; }
 *   cams.forEach(function(cam) {
 *       cam.username = <USERNAME>;
 *       cam.password = <PASSWORD>;
 *       cam.connect(console.log);
 *   });
 * });
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

	var cams = {},
		errors = [],
		messageID = 'urn:uuid:' + (options.messageId || guid()),
		request = Buffer.from(
			'<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">' +
			'<Header>' +
			'<wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">' + messageID + '</wsa:MessageID>' +
			'<wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>' +
			'<wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>' +
			'</Header>' +
			'<Body>' +
			'<Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
			'<Types>dn:NetworkVideoTransmitter</Types>' +
			'<Scopes />' +
			'</Probe>' +
			'</Body>' +
			'</Envelope>'
		),
		socket = require('dgram').createSocket('udp4');

	socket.on('error', function(err) {
		Discovery.emit('error', err);
		callback(err);
	});

	const httpOK200 = 200;
	const listener = function(msg, rinfo) {
		parseSOAPString(msg.toString(), function(err, data, xml, _statusCode) {
			// TODO check for matching RelatesTo field and messageId
			if (err || !data[0].probeMatches) {
				errors.push(err || new Error('Wrong SOAP message from ' + rinfo.address + ':' + rinfo.port, xml));
				/**
				 * Indicates error response from device.
				 * @event Discovery#error
				 * @type {string}
				 */
				Discovery.emit('error', 'Wrong SOAP message from ' + rinfo.address + ':' + rinfo.port, xml);
			} else {
				data = linerase(data);

				// Possible to get multiple matches for the same camera
				// when your computer has more than one network adapter in the same subnet
				var camAddr = data.probeMatches.probeMatch.endpointReference.address;
				if (!cams[camAddr]) {
					var cam;
					if (options.resolve !== false) {
						// Create cam with one of the XAddrs uri
						var camUris = data.probeMatches.probeMatch.XAddrs.split(' ').map(url.parse),
							camUri = matchXAddr(camUris, rinfo.address);
						cam = new Cam({
							hostname: camUri.hostname,
							port: camUri.port,
							path: camUri.path,
							urn: camAddr
						});
						/**
						 * All available XAddr fields from discovery
						 * @name xaddrs
						 * @memberOf Cam#
						 * @type {Array.<Url>}
						 */
						cam.xaddrs = camUris;
					} else {
						cam = data;
					}
					cams[camAddr] = cam;
					/**
					 * Indicates discovered device.
					 * @event Discovery#device
					 * @type {Cam|object}
					 */
					Discovery.emit('device', cam, rinfo, xml);
				}
			}
		}, httpOK200);
	};

	// If device is specified try to bind to that interface
	if (options.device) {
		var interfaces = os.networkInterfaces();
		// Try to find the interface based on the device name
		if (options.device in interfaces) {
			interfaces[options.device].some(function(address) {
				// Only use IPv4 addresses
				if (address.family === 'IPv4') {
					socket.bind(options.listeningPort || null, address.address);
					return true;
				}
			});
		}
	}

	socket.on('message', listener);
	socket.send(request, 0, request.length, 3702, '239.255.255.250');

	setTimeout(function() {
		socket.removeListener('message', listener);
		socket.close();
		callback(errors.length ? errors : null, Object.keys(cams).map(function(addr) { return cams[addr]; }));
	}.bind(this), options.timeout || 5000);
};

/**
 * Try to find the most suitable record
 * Now it is simple ip match
 * @param {Array<Url>} xaddrs
 * @param {string} address
 */
function matchXAddr(xaddrs, address) {
	var ipMatch = xaddrs.filter(function(xaddr) {
		return xaddr.hostname === address;
	});
	return ipMatch[0] || xaddrs[0];
}

module.exports = {
	Discovery: Discovery
};
