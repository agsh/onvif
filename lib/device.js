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
				'<Type>' + options.type + '</Type>' +
				( options.ipv4Address ? '<IPv4Address>' + options.ipv4Address + '</IPv4Address>' : '' ) +
				( options.ipv6Address ? '<IPv6Address>' + options.ipv6Address + '</IPv6Address>' : '' ) +
				( options.dnsName ? '<DNSname>' + options.dnsName + '</DNSname>' : '' ) +
				( options.extension ? '<Extension>' + options.extension + '</Extension>' : '' ) +
			'</NTPManual>' : '') +
		'</SetNTP>' +
		this._envelopeFooter()
	}, callback.bind(this));
};