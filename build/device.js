"use strict";
/**
 * Device module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Device = void 0;
const url_1 = __importDefault(require("url"));
const utils_1 = require("./utils");
/**
 * Device methods
 */
class Device {
    onvif;
    #services = [];
    get services() {
        return this.#services;
    }
    media2Support = false;
    #scopes = [];
    get scopes() { return this.#scopes; }
    #serviceCapabilities;
    get serviceCapabilities() { return this.#serviceCapabilities; }
    #NTP;
    get NTP() { return this.#NTP; }
    #DNS;
    get DNS() { return this.#DNS; }
    #networkInterfaces;
    get networkInterfaces() { return this.#networkInterfaces; }
    constructor(onvif) {
        this.onvif = onvif;
    }
    getSystemDateAndTime() {
        return this.onvif.getSystemDateAndTime();
    }
    setSystemDateAndTime(options) {
        return this.onvif.setSystemDateAndTime(options);
    }
    /**
     * Returns information about services of the device.
     */
    async getServices({ includeCapability } = { includeCapability: true }) {
        const [data] = await this.onvif.request({
            body: '<GetServices xmlns="http://www.onvif.org/ver10/device/wsdl">'
                + `<IncludeCapability>${includeCapability}</IncludeCapability>`
                + '</GetServices>',
        });
        const result = (0, utils_1.linerase)(data).getServicesResponse;
        this.#services = result.service;
        // ONVIF Profile T introduced Media2 (ver20) so cameras from around 2020/2021 will have
        // two media entries in the ServicesResponse, one for Media (ver10/media) and one for Media2 (ver20/media)
        // This is so that existing VMS software can still access the video via the orignal ONVIF Media API
        // fill Cam#uri property
        this.#services.forEach((service) => {
            // Look for services with namespaces and XAddr values
            if (Object.prototype.hasOwnProperty.call(service, 'namespace') && Object.prototype.hasOwnProperty.call(service, 'XAddr')) {
                // Only parse ONVIF namespaces. Axis cameras return Axis namespaces in GetServices
                if (!service.namespace || !service.XAddr) {
                    return;
                }
                const parsedNamespace = url_1.default.parse(service.namespace);
                if (parsedNamespace.hostname === 'www.onvif.org' && parsedNamespace.path) {
                    const namespaceSplitted = parsedNamespace.path.substring(1).split('/'); // remove leading Slash, then split
                    if (namespaceSplitted[1] === 'media' && namespaceSplitted[0] === 'ver20') {
                        // special case for Media and Media2 where cameras supporting Profile S and Profile T (2020/2021 models) have two media services
                        this.media2Support = true;
                        namespaceSplitted[1] = 'media2';
                    }
                    else if (namespaceSplitted[1] === 'ptz') {
                        // uppercase PTZ namespace to fit names convention
                        namespaceSplitted[1] = 'PTZ';
                    }
                    this.onvif.uri[namespaceSplitted[1]] = this.onvif.parseUrl(service.XAddr);
                }
            }
        });
        return result;
    }
    /**
     * This method has been replaced by the more generic {@link Device.getServices | GetServices} method.
     * For capabilities of individual services refer to the GetServiceCapabilities methods.
     * @param options
     * @param options.category
     */
    async getCapabilities(options) {
        if (!options || !options.category) {
            options = { category: ['All'] };
        }
        const [data] = await this.onvif.request({
            body: `<GetCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl">${options.category.map((category) => `<Category>${category}</Category>`).join('')}</GetCapabilities>`,
        });
        this.onvif.capabilities = (0, utils_1.linerase)(data).getCapabilitiesResponse.capabilities;
        ['PTZ', 'media', 'imaging', 'events', 'device', 'analytics'].forEach((name) => {
            const capabilityName = name;
            if ('XAddr' in this.onvif.capabilities[capabilityName]) {
                this.onvif.uri[name] = this.onvif.parseUrl(this.onvif.capabilities[capabilityName].XAddr);
            }
        });
        // extensions, eg. deviceIO
        if (this.onvif.capabilities.extension) {
            Object.keys(this.onvif.capabilities.extension).forEach((ext) => {
                const extensionName = ext;
                // TODO think about complex extensions like `telexCapabilities` and `scdlCapabilities`
                if ('XAddr' in this.onvif.capabilities.extension[extensionName]
                    && this.onvif.capabilities.extension[extensionName].XAddr) {
                    this.onvif.uri[extensionName] = new URL(this.onvif.capabilities.extension[extensionName].XAddr);
                }
            });
            // HACK for a Profile G NVR that has 'replay' but did not have 'recording' in GetCapabilities
            if (this.onvif.uri.replay && !this.onvif.uri.recording) {
                const tempRecorderXaddr = this.onvif.uri.replay.href.replace('replay', 'recording');
                this.onvif.emit('warn', `Adding ${tempRecorderXaddr} for bad Profile G device`);
                this.onvif.uri.recording = new URL(tempRecorderXaddr);
            }
        }
        return this.onvif.capabilities;
    }
    /**
     * Receive device information
     */
    async getDeviceInformation() {
        const [data] = await this.onvif.request({ body: '<GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl"/>' });
        this.onvif.deviceInformation = (0, utils_1.linerase)(data).getDeviceInformationResponse;
        return this.onvif.deviceInformation;
    }
    /**
     * Receive hostname information
     */
    async getHostname() {
        const [data] = await this.onvif.request({
            body: '<GetHostname xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
        });
        return (0, utils_1.linerase)(data).getHostnameResponse.hostnameInformation;
    }
    /**
     * Receive the scope parameters of a device
     */
    async getScopes() {
        const [data] = await this.onvif.request({
            body: '<GetScopes xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
        });
        this.#scopes = (0, utils_1.linerase)(data).getScopesResponse.scopes;
        if (this.#scopes === undefined) {
            this.#scopes = [];
        }
        else if (!Array.isArray(this.#scopes)) {
            this.#scopes = [this.#scopes];
        }
        return this.#scopes;
    }
    /**
     * Set the scope parameters of a device
     * @param scopes Array of scope's uris
     */
    async setScopes(scopes) {
        const [data] = await this.onvif.request({
            body: `<SetScopes xmlns="http://www.onvif.org/ver10/device/wsdl">${scopes.map((uri) => `<Scopes>${uri}</Scopes>`).join('')}</SetScopes>`,
        });
        if ((0, utils_1.linerase)(data).setScopesResponse.length !== 0) {
            throw new Error('Wrong `SetScopes` response');
        }
        // get new scopes from device
        return this.getScopes();
    }
    /**
     * Returns the capabilities of the device service. The result is returned in a typed answer
     */
    async getServiceCapabilities() {
        const [data] = await this.onvif.request({
            body: '<GetServiceCapabilities xmlns="http://www.onvif.org/ver10/device/wsdl" />',
        });
        const capabilitiesResponse = (0, utils_1.linerase)(data).getServiceCapabilitiesResponse;
        this.#serviceCapabilities = capabilitiesResponse.capabilities;
        if (capabilitiesResponse.capabilities?.misc?.auxiliaryCommands !== undefined) {
            this.#serviceCapabilities.misc.auxiliaryCommands = capabilitiesResponse.capabilities.misc.auxiliaryCommands.split(' ');
        }
        return this.#serviceCapabilities;
    }
    /**
     * This operation reboots the device
     */
    async systemReboot() {
        return this.onvif.request({
            service: 'device', // or 'deviceIO' ?
            body: '<SystemReboot xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
        }).then(([data]) => data[0].systemRebootResponse[0].message[0]);
    }
    /**
     * This operation gets the NTP settings from a device. If the device supports NTP, it shall be possible to get the
     * NTP server settings through the GetNTP command.
     */
    async getNTP() {
        const [data] = await this.onvif.request({
            service: 'device',
            body: '<GetNTP xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
        });
        this.#NTP = (0, utils_1.linerase)(data).getNTPResponse.NTPInformation;
        if (this.#NTP?.NTPManual && !Array.isArray(this.#NTP.NTPManual)) {
            this.#NTP.NTPManual = [this.#NTP.NTPManual];
        }
        if (this.#NTP?.NTPFromDHCP && !Array.isArray(this.#NTP.NTPFromDHCP)) {
            this.#NTP.NTPFromDHCP = [this.#NTP.NTPFromDHCP];
        }
        return this.#NTP;
    }
    /**
     * Set the NTP settings on a device
     */
    async setNTP(options) {
        let body = '<SetNTP xmlns="http://www.onvif.org/ver10/device/wsdl">'
            + `<FromDHCP>${options.fromDHCP ?? false}</FromDHCP>`;
        if (options.NTPManual && Array.isArray(options.NTPManual)) {
            options.NTPManual.forEach((NTPManual) => {
                body += (NTPManual.type ? '<NTPManual>'
                    + `<Type xmlns="http://www.onvif.org/ver10/schema">${NTPManual.type}</Type>${NTPManual.IPv4Address ? `<IPv4Address xmlns="http://www.onvif.org/ver10/schema">${NTPManual.IPv4Address}</IPv4Address>` : ''}${NTPManual.IPv6Address ? `<IPv6Address xmlns="http://www.onvif.org/ver10/schema">${NTPManual.IPv6Address}</IPv6Address>` : ''}${NTPManual.DNSname ? `<DNSname xmlns="http://www.onvif.org/ver10/schema">${NTPManual.DNSname}</DNSname>` : ''}${NTPManual.extension ? `<Extension xmlns="http://www.onvif.org/ver10/schema">${NTPManual.extension}</Extension>` : ''}</NTPManual>` : '');
            });
        }
        body += '</SetNTP>';
        const [data] = await this.onvif.request({
            service: 'device',
            body,
        });
        if (data['tds:SetNTPResponse'][0] !== '') {
            throw new Error('Wrong `SetNTP` response');
        }
        return this.getNTP();
    }
    /**
     * This operation gets the DNS settings from a device. The device shall return its DNS configurations through the
     * GetDNS command.
     */
    async getDNS() {
        const [data] = await this.onvif.request({
            service: 'device',
            body: '<GetDNS xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
        });
        this.#DNS = (0, utils_1.linerase)(data).getDNSResponse.DNSInformation;
        if (this.#DNS?.DNSManual && !Array.isArray(this.#DNS.DNSManual)) {
            this.#DNS.DNSManual = [this.#DNS.DNSManual];
        }
        if (this.#DNS?.DNSFromDHCP && !Array.isArray(this.#DNS.DNSFromDHCP)) {
            this.#DNS.DNSFromDHCP = [this.#DNS.DNSFromDHCP];
        }
        return this.#DNS;
    }
    async setDNS(options) {
        let body = '<SetDNS xmlns="http://www.onvif.org/ver10/device/wsdl">'
            + `<FromDHCP>\${!!options.fromDHCP}</FromDHCP>${options.searchDomain && Array.isArray(options.searchDomain) ? options.searchDomain
                .map((domain) => `<SearchDomain>${domain}</SearchDomain>`).join('') : ''}`;
        if (options.DNSManual && Array.isArray(options.DNSManual)) {
            options.DNSManual.forEach((DNSManual) => {
                body += (DNSManual.type ? '<DNSManual>'
                    + `<Type xmlns="http://www.onvif.org/ver10/schema">${DNSManual.type}</Type>${DNSManual.IPv4Address ? `<IPv4Address xmlns="http://www.onvif.org/ver10/schema">${DNSManual.IPv4Address}</IPv4Address>` : ''}${DNSManual.IPv6Address ? `<IPv6Address xmlns="http://www.onvif.org/ver10/schema">${DNSManual.IPv6Address}</IPv6Address>` : ''}</DNSManual>` : '');
            });
        }
        body += '</SetDNS>';
        const [data] = await this.onvif.request({
            service: 'device',
            body,
        });
        const a = (0, utils_1.linerase)(data);
        if ((0, utils_1.linerase)(data).setDNSResponse.length !== 0) {
            throw new Error('Wrong `SetDNS` response');
        }
        return this.getDNS();
    }
    /**
     * This operation gets the network interface configuration from a device. The device shall support return of network
     * interface configuration settings as defined by the NetworkInterface type through the GetNetworkInterfaces command.
     */
    async getNetworkInterfaces() {
        const [data] = await this.onvif.request({
            service: 'device',
            body: '<GetNetworkInterfaces xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
        });
        const { networkInterfaces } = (0, utils_1.linerase)(data, { array: ['networkInterfaces', 'manual'] }).getNetworkInterfacesResponse;
        this.#networkInterfaces = Array.isArray(networkInterfaces) ? networkInterfaces : [];
        return this.#networkInterfaces;
    }
    /**
     * Set network interfaces information
     */
    async setNetworkInterfaces(options) {
        const { networkInterface } = options;
        if (!networkInterface) {
            return { rebootNeeded: false };
        }
        const body = '<SetNetworkInterfaces xmlns="http://www.onvif.org/ver10/device/wsdl">'
            + `<InterfaceToken>${options.interfaceToken}</InterfaceToken>`
            + '<NetworkInterface>'
            + `<Enabled xmlns="http://www.onvif.org/ver10/schema">${networkInterface.enabled}</Enabled>${networkInterface.link
                ? '<Link xmlns="http://www.onvif.org/ver10/schema">'
                    + `<AutoNegotiation>${networkInterface.link.autoNegotiation}</AutoNegotiation>`
                    + `<Speed>${networkInterface.link.speed}</Speed>`
                    + `<Duplex>${networkInterface.link.duplex}</Duplex>`
                    + '</Link>'
                : ''}${!Number.isNaN(networkInterface.MTU) ? `<MTU xmlns="http://www.onvif.org/ver10/schema">${networkInterface.MTU}</MTU>` : ''}${networkInterface.IPv4
                ? '<IPv4 xmlns="http://www.onvif.org/ver10/schema">'
                    + `<Enabled>${networkInterface.IPv4.enabled}</Enabled>${networkInterface.IPv4.manual ? networkInterface.IPv4.manual
                        .map((ipv4) => `<Manual><Address>${ipv4.address}</Address><PrefixLength>${ipv4.prefixLength}</PrefixLength></Manual>`).join('') : ''}<DHCP>${networkInterface.IPv4.DHCP}</DHCP>`
                    + '</IPv4>'
                : ''}${networkInterface.IPv6
                ? '<IPv6 xmlns="http://www.onvif.org/ver10/schema">'
                    + `<Enabled>${networkInterface.IPv6.enabled}</Enabled>`
                    + `<AcceptRouterAdvert >${networkInterface.IPv6.acceptRouterAdvert}</AcceptRouterAdvert>`
                    + `${networkInterface.IPv6.manual ? networkInterface.IPv6.manual
                        .map((ipv6) => `<Manual><Address>${ipv6.address}</Address><PrefixLength>${ipv6.prefixLength}</PrefixLength></Manual>`).join('') : ''}`
                    + `<DHCP>${networkInterface.IPv6.DHCP}</DHCP>`
                    + '</IPv6>'
                : ''}</NetworkInterface>`
            + '</SetNetworkInterfaces>';
        const [data] = await this.onvif.request({
            service: 'device',
            body,
        });
        const result = (0, utils_1.linerase)(data).setNetworkInterfacesResponse;
        if (Array.isArray(networkInterface.IPv6?.manual) && networkInterface.IPv6.manual.length > 0) {
            this.onvif.hostname = networkInterface.IPv6.manual[0].address;
        }
        if (Array.isArray(networkInterface.IPv4?.manual) && networkInterface.IPv4.manual.length > 0) {
            this.onvif.hostname = networkInterface.IPv4.manual[0].address;
        }
        return result;
    }
}
exports.Device = Device;
//# sourceMappingURL=device.js.map