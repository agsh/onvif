/**
 * @namespace cam
 * @description Device section for Cam class
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */
module.exports = function(Cam) {
	const {linerase} = require('./utils');

	/**
	 * @typedef {object} Cam~NTPManual
	 * @property {string} options.type Network host type: IPv4, IPv6 or DNS. - enum { 'IPv4', 'IPv6', 'DNS' }
	 * @property {string} [options.IPv4Address] IPv4 address
	 * @property {string} [options.IPv6Address] IPv6 address
	 * @property {string} [options.DNSname] DNS name
	 * @property {string} [options.extension]
	 */

	/**
	 * @typedef {object} Cam~NTPFromDHCP
	 * @property {string} options.type Network host type: IPv4, IPv6 or DNS. - enum { 'IPv4', 'IPv6', 'DNS' }
	 * @property {string} [options.IPv4Address] IPv4 address
	 * @property {string} [options.IPv6Address] IPv6 address
	 * @property {string} [options.DNSname] DNS name
	 * @property {string} [options.extension]
	 */

	/**
	 * @typedef {object} Cam~NTPInformation
	 * @property {boolean} fromDHCP Indicates if NTP information is to be retrieved by using DHCP
	 * @property {Array.<Cam~NTPFromDHCP>} [NTPFromDHCP] List of NTP addresses retrieved by using DHCP
	 * @property {Array.<Cam~NTPManual>} [NTPManual] List of manually entered NTP addresses
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
			service : 'device'
			, body    : `${this._envelopeHeader() 
			}<GetNTP xmlns="http://www.onvif.org/ver10/device/wsdl"/>` +
			`</s:Body>` +
			`</s:Envelope>`
		}, function(err, data, xml) {
			if (!err) {
				this.NTP = linerase(data[0].getNTPResponse[0].NTPInformation[0]);
			}
			callback.call(this, err, err ? null : this.NTP, xml);
		});
	};

	/**
	 * Set the NTP settings on a device
	 * @param {object} options
	 * @param {boolean} options.fromDHCP Indicate if NTP address information is to be retrieved using DHCP
	 * @param {Array.<Cam~NTPManual>} [options.NTPManual] List of NTP addresses
	 * @param {Cam~RequestCallback} [callback]
	 */
	Cam.prototype.setNTP = function(options, callback) {
		if (!Array.isArray(options.NTPManual)) {
			options.NTPManual = [];
		}
		// For backward compatibility
		if (options.type || options.ipv4Address || options.ipv6Address || options.dnsName || options.extension) {
			// Note the case changes to follow the xml parser rules
			options.NTPManual.push({
				type        : options.type,
				IPv4Address : options.ipv4Address,
				IPv6Address : options.ipv6Address,
				DNSname     : options.dnsName,
				extension   : options.extension,
			});
		}
		let body = `${this._envelopeHeader() 
			}<SetNTP xmlns="http://www.onvif.org/ver10/device/wsdl">` +
			`<FromDHCP>${  options.fromDHCP  }</FromDHCP>`;
		if (options.NTPManual && Array.isArray(options.NTPManual)) {
			options.NTPManual.forEach((NTPManual)=>{
				body += ( NTPManual.type ? `<NTPManual>` +
					`<Type xmlns="http://www.onvif.org/ver10/schema">${  NTPManual.type  }</Type>${ 
					 NTPManual.IPv4Address ? `<IPv4Address xmlns="http://www.onvif.org/ver10/schema">${  NTPManual.IPv4Address  }</IPv4Address>` : '' 
					 }${NTPManual.IPv6Address ? `<IPv6Address xmlns="http://www.onvif.org/ver10/schema">${  NTPManual.IPv6Address  }</IPv6Address>` : '' 
					 }${NTPManual.DNSname ? `<DNSname xmlns="http://www.onvif.org/ver10/schema">${  NTPManual.DNSname  }</DNSname>` : '' 
					 }${NTPManual.extension ? `<Extension xmlns="http://www.onvif.org/ver10/schema">${  NTPManual.extension  }</Extension>` : '' 
				}</NTPManual>` : '');
			});
		}
		body += `</SetNTP>${ 
			this._envelopeFooter()}`;
		this._request({
			service : 'device'
			, body
		}, callback.bind(this));
	};

	/**
	 * @typedef {object} Cam~NetworkInterface
	 * @property {object} $
	 * @property {string} $.token Unique identifier referencing the physical entity.
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
	 * @property {boolean} IPv4.config.DHCP Indicates whether or not DHCP is used.
	 * @property {object} [IPv6] IPv6 network interface configuration.
	 * @property {boolean} IPv6.enabled Indicates whether or not IPv6 is enabled.
	 * @property {object} IPv6.config  IPv6 configuration.
	 * @property {boolean} [IPv6.config.acceptRouterAdvert] Indicates whether router advertisement is used.
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
	 * @property {object} [IPv6.config.fromRA] List of IPv6 addresses configured by using router advertisement.
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
	 * @typedef {object} Cam~NetworkInterfaceSetConfiguration
	 * @property {boolean} [enabled] Indicates whether or not an interface is enabled.
	 * @property {object} [link] Link configuration
	 * @property {boolean} link.autoNegotiation Auto negotiation on/off.
	 * @property {number} link.speed Speed.
	 * @property {string} link.duplex Duplex type, Half or Full. - enum { 'Full', 'Half' }
	 * @property {number} [MTU] Maximum transmission unit.
	 * @property {object} [IPv4] IPv4 network interface configuration.
	 * @property {boolean} [IPv4.enabled] Indicates whether or not IPv4 is enabled.
	 * @property {object} [IPv4.manual] List of manually added IPv4 addresses.
	 * @property {string} IPv4.manual.address IPv4 address.
	 * @property {number} IPv4.manual.prefixLength Prefix/submask length.
	 * @property {boolean} [IPv4.DHCP] Indicates whether or not DHCP is used.
	 * @property {object} [IPv6] IPv6 network interface configuration.
	 * @property {boolean} [IPv6.enabled] Indicates whether or not IPv6 is enabled.
	 * @property {boolean} [IPv6.acceptRouterAdvert] Indicates whether router advertisement is used.
	 * @property {object} [IPv6.manual] List of manually added IPv6 addresses.
	 * @property {string} IPv6.manual.address IPv6 address.
	 * @property {number} IPv6.manual.prefixLength Prefix/submask length.
	 * @property {string} [IPv6.DHCP] DHCP configuration. - enum { 'Auto', 'Stateful', 'Stateless', 'Off' }
	 * @property {object} [extension]
	 * @property {object} [extension.Dot3]
	 * @property {object} extension.[Dot11
	 * @property {string} extension].Dot11.SSID
	 * @property {string} extension.Dot11.mode - enum { 'Ad-hoc', 'Infrastructure', 'Extended' }
	 * @property {string} extension.Dot11.alias
	 * @property {string} extension.Dot11.priority
	 * @property {object} extension.Dot11.security
	 * @property {string} extension.Dot11.security.mode - enum { 'None', 'WEP', 'PSK', 'Dot1X', 'Extended' }
	 * @property {string} [extension.Dot11.security.algorithm] - enum { 'CCMP', 'TKIP', 'Any', 'Extended' }
	 * @property {object} [extension.Dot11.security.PSK]
	 * @property {string} [extension.Dot11.security.PSK.key] According to IEEE802.11-2007 H.4.1 the RSNA PSK consists of 256 bits, or 64 octets when represented in hex
													   Either Key or Passphrase shall be given, if both are supplied Key shall be used by the device and Passphrase ignored.
	 * @property {string} [extension.Dot11.security.PSK.passphrase] According to IEEE802.11-2007 H.4.1 a pass-phrase is a sequence of between 8 and 63 ASCII-encoded characters and each character in the pass-phrase must have an encoding in the range of 32 to 126 (decimal),inclusive.
															  If only Passpharse is supplied the Key shall be derived using the algorithm described in IEEE802.11-2007 section H.4
	 * @property {object} [extension.Dot11.security.PSK.extension]
	 * @property {string} [extension.Dot11.security.dot1X]
	 * @property {object} [extension.Dot11.security.extension]
	 * @property {object} [extension.extension]
	*/

	/**
	 * @callback Cam~GetNetworkInterfacesCallback
	 * @property {?Error} error
	 * @property {Array.<Cam~NetworkInterface>} networkInterfaces Network interfaces information
	 * @property {string} xml Raw SOAP response
	 */

	/**
	 * Receive network interfaces information
	 * @param {Cam~GetNetworkInterfacesCallback} [callback]
	 */
	Cam.prototype.getNetworkInterfaces = function(callback) {
		this._request({
			service : 'device'
			, body    : `${this._envelopeHeader() 
			}<GetNetworkInterfaces xmlns="http://www.onvif.org/ver10/device/wsdl"/>${ 
			this._envelopeFooter()}`
		}, (err, data, xml) => {
			if (!err) {
				this.networkInterfaces = linerase(data).getNetworkInterfacesResponse.networkInterfaces;
				// networkInterfaces is an array of network interfaces, but linerase remove the array if there is only one element inside
				// so we convert it back to an array
				if (!Array.isArray(this.networkInterfaces)) {this.networkInterfaces = [this.networkInterfaces];}
			}
			if (callback) {
				callback.call(this, err, this.networkInterfaces, xml);
			}
		});
	};

	/**
	 * @callback Cam~SetNetworkInterfacesCallback
	 * @property {?Error} error
	 * @property {boolean} data.rebootNeeded
	 * @property {string} xml Raw SOAP response
	 */

	/**
	 * Set network interfaces information
	 * @param {object} options
	 * @param {string} options.interfaceToken Network interface token
	 * @param {Cam~NetworkInterfaceSetConfiguration} options.networkInterface Network interface
	 * @param {Cam~SetNetworkInterfacesCallback} [callback]
	 */
	Cam.prototype.setNetworkInterfaces = function(options,callback) {
		const ni = options.networkInterface;
		let modifyIpv4 = false;
		let modifyIpv6 = false;
		if (ni.IPv4) {
			try {
				modifyIpv4 = ni.IPv4.manual.address !== this.hostname;
			} catch (e) {
				modifyIpv4 = false;
			}
		} else if (ni.IPv6) {
			try {
				modifyIpv6 = ni.IPv6.manual.address !== this.hostname;
			} catch (e) {
				modifyIpv6 = false;
			}
		}
		const body = `${this._envelopeHeader() 
			}<SetNetworkInterfaces xmlns="http://www.onvif.org/ver10/device/wsdl">` +
				`<InterfaceToken>${  options.interfaceToken  }</InterfaceToken>` +
				`<NetworkInterface>` +
					`<Enabled xmlns="http://www.onvif.org/ver10/schema">${  ni.enabled  }</Enabled>${ 
					ni.link ?
						`<Link xmlns="http://www.onvif.org/ver10/schema">` +
							`<AutoNegotiation>${  ni.link.autoNegotiation  }</AutoNegotiation>` +
							`<Speed>${  ni.link.speed  }</Speed>` +
							`<Duplex>${  ni.link.duplex  }</Duplex>` +
						`</Link>`
						: '' 
					}${!isNaN(ni.MTU) ? `<MTU xmlns="http://www.onvif.org/ver10/schema">${  ni.MTU  }</MTU>` : '' 
					}${ni.IPv4 ?
						`<IPv4 xmlns="http://www.onvif.org/ver10/schema">` +
							`<Enabled>${  ni.IPv4.enabled  }</Enabled>` +
							`<Manual>` +
							`<Address>${  ni.IPv4.manual.address  }</Address>` +
							`<PrefixLength>${  ni.IPv4.manual.prefixLength  }</PrefixLength>` +
							`</Manual>` +
							`<DHCP>${  ni.IPv4.DHCP  }</DHCP>` +
						`</IPv4>`
						: '' 
					}${ni.IPv6 ?
						`<IPv6 xmlns="http://www.onvif.org/ver10/schema">` +
							`<Enabled>${  ni.IPv6.enabled  }</Enabled>` +
							`<AcceptRouterAdvert >${  ni.IPv6.acceptRouterAdvert  }</AcceptRouterAdvert>` +
							`<Manual>` +
							`<Address>${  ni.IPv6.manual.address  }</Address>` +
							`<PrefixLength>${  ni.IPv6.manual.prefixLength  }</PrefixLength>` +
							`</Manual>` +
							`<DHCP>${  ni.IPv6.DHCP  }</DHCP>` +
						`</IPv6>`
						: '' 
				}</NetworkInterface>` +
			`</SetNetworkInterfaces>${ 
			this._envelopeFooter()}`;
		this._request({
			service : 'device'
			, body,
		}, (err, data, xml) => {
			if (callback) {
				if (!err) {
					if (modifyIpv4) {this.hostname = ni.IPv4.manual.address;}
					if (modifyIpv6) {this.hostname = ni.IPv6.manual.address;}
					data = linerase(data[0].setNetworkInterfacesResponse);
				}
				callback.call(this, err, data, xml);
			}
		});
	};

	/**
	 * @typedef {object} Cam~NetworkGateway
	 * @property {string} IPv4Address
	 * @property {string} IPv6Address
	 */

	/**
	 * @callback Cam~GetNetworkDefaultGatewayCallback
	 * @property {?Error} error
	 * @property {Array.<Cam~NetworkGateway>} networkGateway Network Gateway information
	 * @property {string} xml Raw SOAP response
	 */

	/**
	 * Get network default gateway information
	 * @param {Cam~GetNetworkDefaultGatewayCallback} [callback]
	 */
	Cam.prototype.getNetworkDefaultGateway = function(callback) {
		this._request({
			service : 'device'
			, body    : `${this._envelopeHeader() 
			}<GetNetworkDefaultGateway xmlns="http://www.onvif.org/ver10/device/wsdl"/>${ 
			this._envelopeFooter()}`
		}, (err, data, xml) => {
			if (callback) {
				if (!err) {
					this.networkDefaultGateway = linerase(data[0].getNetworkDefaultGatewayResponse[0].networkGateway);
				}
				callback.call(this, err, this.networkDefaultGateway, xml);
			}
		});
	};

	/**
	 * Set network default gateway information
	 * @param {Cam~NetworkGateway} options
	 * @param {Cam~GetNetworkDefaultGatewayCallback} [callback]
	 */
	Cam.prototype.setNetworkDefaultGateway = function(options,callback) {
		this._request({
			service : 'device'
			, body    : `${this._envelopeHeader() 
			}<SetNetworkDefaultGateway xmlns="http://www.onvif.org/ver10/device/wsdl">${ 
				options.IPv4Address ? `<IPv4Address>${  options.IPv4Address  }</IPv4Address>` : '' 
				}${options.IPv6Address ? `<IPv6Address>${  options.IPv6Address  }</IPv6Address>` : '' 
			}</SetNetworkDefaultGateway>${ 
			this._envelopeFooter()}`
		}, (err, data, xml) => {
			if (callback) {
				if (err) {
					return callback.call(this,err,data,xml);
				}
				this.getNetworkDefaultGateway(callback.bind(this));
			}
		});
	};

	/**
	 * @typedef {object} Cam~IPAddress
	 * @property {string} type Indicates if the address is an IPv4 or IPv6 address. - enum { 'IPv4', 'IPv6' }
	 * @property {string} IPv4Address IPv4 address.
	 * @property {string} IPv6Address IPv6 address.
	 */

	/**
	 * @typedef {object} Cam~DNSInformation
	 * @property {string} fromDHCP Indicates whether or not DNS information is retrieved from DHCP.
	 * @property {string} searchDomain Search domain.
	 * @property {Array.<Cam~IPAddress>} DNSFromDHCP List of DNS addresses received from DHCP.
	 * @property {Array.<Cam~IPAddress>} DNSManual List of manually entered DNS addresses.
	 */

	/**
	 * @callback Cam~GetDNSCallback
	 * @property {?Error} error
	 * @property {Array.<Cam~DNSInformation>} DNSInformation DNS information
	 * @property {string} xml Raw SOAP response
	 */

	/**
	 * Get DNS information
	 * @param {Cam~GetDNSCallback} [callback]
	 */
	Cam.prototype.getDNS = function(callback) {
		this._request({
			service : 'device'
			, body    : `${this._envelopeHeader() 
			}<GetDNS xmlns="http://www.onvif.org/ver10/device/wsdl"/>${ 
			this._envelopeFooter()}`
		}, (err, data, xml) => {
			if (callback) {
				if (!err) {
					this.DNS = linerase(data[0].getDNSResponse[0].DNSInformation);
					if (this.DNS.DNSManual && !Array.isArray(this.DNS.DNSManual)) {this.DNS.DNSManual = [this.DNS.DNSManual];}
					if (this.DNS.DNSFromDHCP && !Array.isArray(this.DNS.DNSFromDHCP)) {this.DNS.DNSFromDHCP = [this.DNS.DNSFromDHCP];}
				}
				callback.call(this, err, this.DNS, xml);
			}
		});
	};

	/**
	 * Set DNS information
	 * @param {Cam~DNSInformation} options
	 * @param {Cam~GetDNSCallback} [callback]
	 */
	Cam.prototype.setDNS = function(options,callback) {
		let body = `${this._envelopeHeader() 
			}<SetDNS xmlns="http://www.onvif.org/ver10/device/wsdl">` +
				`<FromDHCP>${  !!options.fromDHCP  }</FromDHCP>${ 
				options.searchDomain ? `<SearchDomain>${  options.searchDomain  }</SearchDomain>` : ''}`;
		options.DNSManual.forEach((dns) => {
			body += `<DNSManual>` +
					`<Type xmlns="http://www.onvif.org/ver10/schema">${ 
						(dns.type === "IPv6") ? "IPv6" : 'IPv4' 
					}</Type>${ 
					dns.IPv4Address ? `<IPv4Address xmlns="http://www.onvif.org/ver10/schema">${  dns.IPv4Address  }</IPv4Address>` : '' 
					}${dns.IPv6Address ? `<IPv6Address xmlns="http://www.onvif.org/ver10/schema">${  dns.IPv6Address  }</IPv6Address>` : '' 
				}</DNSManual>`;
		});
		body += `</SetDNS>${ 
			this._envelopeFooter()}`;
		this._request({
			service : 'device'
			, body,
		}, (err, data, xml) => {
			if (callback) {
				if (err) {
					return callback.call(this, err, null, xml);
				}
				this.getDNS(callback);
			}
		});
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
			service : 'device'
			, body    : `${this._envelopeHeader() 
			}<GetNetworkProtocols xmlns="http://www.onvif.org/ver10/device/wsdl"/>${ 
			this._envelopeFooter()}`
		}, (err, data, xml) => {
			if (!err) {
				this.networkProtocols = linerase(data).getNetworkProtocolsResponse;
			}
			if (callback) {
				callback.call(this, err, this.networkProtocols, xml);
			}
		});
	};

	/**
	 * @typedef {object} Cam~User
	 * @property {string} username
	 * @property {string} password
	 * @property {string} userLevel 'Administrator', 'Operator', 'User', 'Anonymous' or 'Extended'
	 */

	/**
	 * @callback Cam~GetUsersCallback
	 * @property {?Error} error
	 * @property {Array.<Cam~User>} videoSourceConfigurations
	 * @property {string} xml Raw SOAP response
	 * The password is not included in the response even if it is present in Cam~User
	 */

	/**
	 * Get the list of Username and their User level.
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.getUsers = function(callback) {
		this._request({
			service : 'device'
			, body    : `${this._envelopeHeader() 
			}<GetUsers xmlns="http://www.onvif.org/ver10/device/wsdl" />${ 
			this._envelopeFooter()}`
		}, (err, data, xml) => {
			if (callback) {
				if (!err) {
					let users = data[0].getUsersResponse[0].user;
					users = users.map((user) => linerase(user));
					this.users = users;
					data = users;
				}
				callback.call(this, err, data, xml);
			}
		});
	};

	/**
	 * Create one or more users
	 * @param {Array.<Cam~User>} users
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.createUsers = function(users,callback) {
		const usersOk = users.every((user) => {
			if (!user.username || !user.password || !user.userLevel) {
				return false;
			}
			return true;
		});
		if (!usersOk) {
			callback.call(this,new Error('Missing username, password or user level'),null,null);
			return;
		}
		let usersXml = '';
		users.forEach((user) => {
			usersXml += `<User>` +
				`<Username xmlns="http://www.onvif.org/ver10/schema">${  user.username  }</Username>` +
				`<Password xmlns="http://www.onvif.org/ver10/schema">${  user.password  }</Password>` +
				`<UserLevel xmlns="http://www.onvif.org/ver10/schema">${  user.userLevel  }</UserLevel>` +
			`</User>`;
		});
		const body = `${this._envelopeHeader() 
			}<CreateUsers xmlns="http://www.onvif.org/ver10/device/wsdl">${ 
				usersXml 
			}</CreateUsers>${ 
			this._envelopeFooter()}`;
		this._request({
			service : 'device'
			, body,
		}, (err, data, xml) => {
			if (callback) {
				if (err) {
					callback.call(this, err, data, xml);
				} else {
					this.getUsers(callback);
				}
			}
		});
	};

	/**
	 * Set the Password and User level of one or more users by their Username
	 * @param {Array.<Cam~User>} users
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.setUsers = function(users,callback) {
		const usersOk = users.every((user) => {
			if (!user.username || !user.password || !user.userLevel) {
				return false;
			}
			return true;
		});
		if (!usersOk) {
			callback.call(this,new Error('Missing username, password or user level'),null,null);
			return;
		}
		let usersXml = '';
		users.forEach((user) => {
			usersXml += `<User>` +
				`<Username xmlns="http://www.onvif.org/ver10/schema">${  user.username  }</Username>` +
				`<Password xmlns="http://www.onvif.org/ver10/schema">${  user.password  }</Password>` +
				`<UserLevel xmlns="http://www.onvif.org/ver10/schema">${  user.userLevel  }</UserLevel>` +
			`</User>`;
		});
		const body = `${this._envelopeHeader() 
			}<SetUser xmlns="http://www.onvif.org/ver10/device/wsdl">${  // Although SetUser is not plural, we can set multiple users at a time
				usersXml 
			}</SetUser>${ 
			this._envelopeFooter()}`;
		this._request({
			service : 'device'
			, body,
		}, (err, data, xml) => {
			if (callback) {
				if (err) {
					callback.call(this, err, data, xml);
				} else {
					let delayGet = false;
					users.some(function(usr) {
						if (usr.username === this.username) {
							delayGet = true;
							this.password = usr.password;
							return true;
						}
					});
					if (delayGet) { // On some cameras, changing the user password we currently use is not effective right away
						setTimeout((() => {this.getUsers(callback);}),2000);
					} else {
						this.getUsers(callback);
					}
				}
			}
		});
	};

	/**
	 * Delete one or more users by their Username
	 * @param {Array.<Cam~User> | Array.<string>} users
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.deleteUsers = function(users,callback) {
		const usernames = [];
		users.forEach((user) => {
			if (typeof user === 'string' && user.length > 0) {
				usernames.push(user);
			} else if (typeof user === 'object' && user.username) {
				usernames.push(user.username);
			}
		});
		if (!usernames.length) {
			return callback.call(this,new Error('No username'),null,null);
		}
		let usersXml = '';
		usernames.forEach((username) => {
			usersXml += `<Username>${  username  }</Username>`;
		});
		const body = `${this._envelopeHeader() 
			}<DeleteUsers xmlns="http://www.onvif.org/ver10/device/wsdl">${ 
				usersXml 
			}</DeleteUsers>${ 
			this._envelopeFooter()}`;
		this._request({
			service : 'device'
			, body,
		}, (err, data, xml) => {
			if (callback) {
				if (err) {
					callback.call(this, err, data, xml);
				} else {
					this.getUsers(callback);
				}
			}
		});
	};

	/**
	 * Send supported auxiliary commands
	 * @param {object} options
	 * @param {string} [options.data]
	 * @param {function} callback
	 */
	Cam.prototype.sendAuxiliaryCommand = function(options, callback) {
		const body = `${this._envelopeHeader() 
			}<SendAuxiliaryCommand xmlns="http://www.onvif.org/ver10/device/wsdl">`
			+ `<AuxiliaryCommand xmlns="http://www.onvif.org/ver10/schema">${  options.data  }</AuxiliaryCommand>`
			+ `</SendAuxiliaryCommand>${  this._envelopeFooter()}`;
		this._request({
			service : 'device',
			body,
		}, (err, data, xml) => {
			if (callback) {
				callback.call(this, err, data, xml);
			}
		});
	};
};
