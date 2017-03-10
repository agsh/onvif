/**
 * @namespace cam
 * @description Device section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

const Cam = require('./cam').Cam
	, linerase = require('./utils').linerase
	;

/**
 * @typedef {object} Cam~NTPInformation
 * @property {boolean} fromDHCP Indicates if NTP information is to be retrieved by using DHCP
 * @property {object} [NTPFromDHCP] List of NTP addresses retrieved by using DHCP
 * @property {object} [NTPManual] List of manually entered NTP addresses
 */

/**
 * @callback Cam~NTPCallback
 * @property {?Error} error
 * @property {Cam~NTPInformation} NTP information object of current device's NTP manual
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive NTP information from cam
 * @param {Cam~NTPCallback} callback
 */
Cam.prototype.getNTP = function(callback) {
	this._request({
		service: 'device'
		, body: this._envelopeHeader() +
		'<GetNTP xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
		'</s:Body>' +
		'</s:Envelope>'
	}, function(err, data, xml) {
		if (!err) {
			this.NTP = linerase(data[0]['getNTPResponse'][0]['NTPInformation'][0]);
		}
		callback.call(this, err, err ? null : this.NTP, xml);
	});
};

/**
 * Set the NTP settings on a device
 * @param {object} options
 * @param {boolean} options.fromDHCP Indicate if NTP address information is to be retrieved using DHCP
 * @param {string} [options.type] Network host type: IPv4, IPv6 or DNS.
 * @param {string} [options.ipv4Address] IPv4 address
 * @param {string} [options.ipv6Address] IPv6 address
 * @param {string} [options.dnsName] DNS name
 * @param {string} [options.extension]
 * @param {Cam~RequestCallback} [callback]
 */
Cam.prototype.setNTP = function(options, callback) {
	this._request({
		service: 'device'
		, body: this._envelopeHeader() +
		'<SetNTP xmlns="http://www.onvif.org/ver10/device/wsdl">' +
			'<FromDHCP>' + options.fromDHCP + '</FromDHCP>' +
			( options.type ? '<NTPManual>' +
				'<Type xmlns="http://www.onvif.org/ver10/schema">' + options.type + '</Type>' +
				( options.ipv4Address ? '<IPv4Address xmlns="http://www.onvif.org/ver10/schema">' + options.ipv4Address + '</IPv4Address>' : '' ) +
				( options.ipv6Address ? '<IPv6Address xmlns="http://www.onvif.org/ver10/schema">' + options.ipv6Address + '</IPv6Address>' : '' ) +
				( options.dnsName ? '<DNSname>' + options.dnsName + '</DNSname>' : '' ) +
				( options.extension ? '<Extension>' + options.extension + '</Extension>' : '' ) +
			'</NTPManual>' : '') +
		'</SetNTP>' +
		this._envelopeFooter()
	}, callback.bind(this));
};

/**
 * @typedef {object} Cam~NetworkInterface
 * @property {string} token Unique identifier referencing the physical entity.
 * @property {boolean} enabled Indicates whether or not an interface is enabled.
 * @property {object} [info] network interface information
 * @property {string} info.name Network interface name, for example eth0
 * @property {string} info.hwAddress Network interface MAC address
 * @property {number} info.MTU Maximum transmission unit.
 * @property {object} [link] Link configuration.
 * @property {object} link.adminSettings Configured link settings.
 * @property {boolean} link.adminSettings.autoNegotiation Auto negotiation on/off.
 * @property {number} link.adminSettings.speed
 * @property {string} link.adminSettings.duplex Duplex type, Half or Full. - enum { 'Full', 'Half' }
 * @property {object} link.operSettings Current active link settings
 * @property {boolean} link.operSettings.autoNegotiation Auto negotiation on/off.
 * @property {number} link.operSettings.speed
 * @property {string} link.operSettings.duplex Duplex type, Half or Full. - enum { 'Full', 'Half' }
 * @property {number} link.interfaceType Integer indicating interface type, for example: 6 is ethernet.
 * @property {object} [IPv4] IPv4 network interface configuration.
 * @property {boolean} IPv4.enabled Indicates whether or not IPv4 is enabled.
 * @property {object} IPv4.config IPv4 configuration.
 * @property {object} [IPv4.config.manual] List of manually added IPv4 addresses.
 * @property {string} IPv4.config.manual.address IPv4 address.
 * @property {number} IPv4.config.manual.prefixLength Prefix/submask length.
 * @property {object} [IPv4.config.linkLocal] List of manually added IPv4 addresses.
 * @property {string} IPv4.config.linkLocal.address IPv4 address.
 * @property {number} IPv4.config.linkLocal.prefixLength Prefix/submask length.
 * @property {object} [IPv4.config.fromDHCP] IPv4 address configured by using DHCP.
 * @property {string} IPv4.config.fromDHCP.address IPv4 address.
 * @property {number} IPv4.config.fromDHCP.prefixLength Prefix/submask length.
 * @property {boolean} DHCP Indicates whether or not DHCP is used.
 * @property {object} [IPv6] IPv6 network interface configuration.
 * @property {boolean} IPv6.enabled Indicates whether or not IPv6 is enabled.
 * @property {object} IPv6.config  IPv6 configuration.
 * @property {boolean} [IPv6.config.acceptRouterAdvert] Indicates whether router advertisment is used.
 * @property {string} IPv6.config.DHCP DHCP configuration. - enum { 'Auto', 'Stateful', 'Stateless', 'Off' }
 * @property {object} [IPv6.config.manual] List of manually added IPv6 addresses.
 * @property {string} IPv6.config.manual.address IPv6 address.
 * @property {number} IPv6.config.manual.prefixLength Prefix/submask length.
 * @property {object} [IPv6.config.linkLocal] List of link local IPv6 addresses.
 * @property {string} IPv6.config.linkLocal.address IPv6 address.
 * @property {number} IPv6.config.linkLocal.prefixLength Prefix/submask length.
 * @property {object} [IPv6.config.fromDHCP] List of IPv6 addresses configured by using DHCP.
 * @property {string} IPv6.config.fromDHCP.address IPv6 address.
 * @property {number} IPv6.config.fromDHCP.prefixLength Prefix/submask length.
 * @property {object} [IPv6.config.fromRA] List of IPv6 addresses configured by using router advertisment.
 * @property {string} IPv6.config.fromRA.address IPv6 address.
 * @property {number} IPv6.config.fromRA.prefixLength Prefix/submask length.
 * @property {object} [IPv6.config.extension] Extension
 * @property {object} [extension] Extension
 * @property {string} extension.interfaceType
 * @property {object} [extension.dot3] Extension point prepared for future 802.3 configuration.
 * @property {object} [extension.dot11]
 * @property {string} extension.dot11.SSID
 * @property {string} extension.dot11.mode - enum { 'Ad-hoc', 'Infrastructure', 'Extended' }
 * @property {string} extension.dot11.alias
 * @property {string} extension.dot11.priority
 * @property {object} extension.dot11.security
 * @property {string} extension.dot11.security.mode  - enum { 'None', 'WEP', 'PSK', 'Dot1X', 'Extended'
 * @property {string} extension.dot11.security.algorithm - enum { 'CCMP', 'TKIP', 'Any', 'Extended' }
 * @property {object} extension.dot11.security.PSK
 * @property {string} extension.dot11.security.PSK.key According to IEEE802.11-2007 H.4.1 the RSNA PSK consists of 256 bits, or 64 octets when represented in hex
 *						Either Key or Passphrase shall be given, if both are supplied Key shall be used by the device and Passphrase ignored.
 * @property {string} extension.dot11.security.PSK.passphrase According to IEEE802.11-2007 H.4.1 a pass-phrase is a sequence of between 8 and 63 ASCII-encoded characters and each character in the pass-phrase must have an encoding in the range of 32 to 126 (decimal),inclusive.
 *											 if only Passpharse is supplied the Key shall be derived using the algorithm described in IEEE802.11-2007 section H.4
 * @property {object} [extension.dot11.security.PSK.extension]
 * @property {string} [extension.dot11.security.dot1X]
 * @property {object} [extension.dot11.security.extension]
 * @property {object} [extension.extension]
 */

/**
 * @callback Cam~GetNetworkInterfacesCallback
 * @property {?Error} error
 * @property {Array.<Cam~NetworkInterface>} network interfaces information
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive network interfaces information
 * @param {Cam~GetNetworkInterfacesCallback} [callback]
 */
Cam.prototype.getNetworkInterfaces = function(callback) {
	this._request({
		service: 'device'
		, body: this._envelopeHeader() +
		'<GetNetworkInterfaces xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.networkInterfaces = linerase(data).getNetworkInterfacesResponse;
		}
		if (callback) {
			callback.call(this, err, this.networkInterfaces, xml);
		}
	}.bind(this));
};

/**
 * @typedef {object} Cam~NetworkProtocol
 * @property {string} name Network protocol type string. - enum { 'HTTP', 'HTTPS', 'RTSP' }
 * @property {boolean} enabled Indicates if the protocol is enabled or not.
 * @property {number} port The port that is used by the protocol.
 * @property {object} extension
 */

/**
 * @callback Cam~GetNetworkProtocolsCallback
 * @property {?Error} error
 * @property {Array.<Cam~NetworkProtocol>} network protocols information
 * @property {string} xml Raw SOAP response
 */

/**
 * Receive network protocols information
 * @param {Cam~GetNetworkProtocolsCallback} [callback]
 */

Cam.prototype.getNetworkProtocols = function(callback) {
	this._request({
		service: 'device'
		, body: this._envelopeHeader() +
		'<GetNetworkProtocols xmlns="http://www.onvif.org/ver10/device/wsdl"/>' +
		this._envelopeFooter()
	}, function(err, data, xml) {
		if (!err) {
			this.networkProtocols = linerase(data).getNetworkProtocolsResponse;
		}
		if (callback) {
			callback.call(this, err, this.networkProtocols, xml);
		}
	}.bind(this));
};