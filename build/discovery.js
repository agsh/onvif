"use strict";
/**
 * Discovery module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Discovery = exports.DiscoverySingleton = void 0;
const events_1 = require("events");
const dgram_1 = require("dgram");
const url_1 = __importDefault(require("url"));
const os_1 = __importDefault(require("os"));
const utils_1 = require("./utils");
const onvif_1 = require("./onvif");
/**
 * Try to find the most suitable record
 * Now it is simple ip match
 */
function matchXAddr(xaddrs, address) {
    const ipMatch = xaddrs.filter((xaddr) => xaddr.hostname === address);
    return ipMatch[0] || xaddrs[0];
}
/**
 * Class for `Discovery` singleton
 */
class DiscoverySingleton extends events_1.EventEmitter {
    /**
     * Fires when device found
     * @param onvif Onvif instance {@link Onvif} or just information object about found device
     * @event device
     * @example
     * ```typescript
     * discovery.on('device', console.log);
     * ```
     */
    static device = 'device';
    /**
     * Indicates any errors
     * @param error Error instance or array of error instances from {@link OnvifError}
     * @event error
     * @example
     * ```typescript
     * discovery.on('error', console.error);
     * ```
     */
    static error = 'error';
    static instance;
    static get getInstance() {
        if (!DiscoverySingleton.instance) {
            DiscoverySingleton.instance = new DiscoverySingleton();
        }
        return DiscoverySingleton.instance;
    }
    // eslint-disable-next-line no-useless-constructor
    constructor() {
        super();
    }
    /**
     * Discover NVT devices in the subnetwork
     * @param options
     * @example
     * ```typescript
     * import { Discovery } from 'onvif';
     * Discovery.on('device', async (cam) => {
     *   // function would be called as soon as NVT responses
     *   cam.username = <USERNAME>;
     *   cam.password = <PASSWORD>;
     *   await cam.connect();
     * })
     * Discovery.probe();
     * ```
     * @example
     * import { Discovery } from 'onvif';
     * (async () => {
     *   const cams = Promise.all((await Discovery.probe()).map(camera => camera.connect());
     *   console.log(await cams[0]?.getSystemDateAndTime());
     * })();
     */
    probe(options = {}) {
        return new Promise((resolve, reject) => {
            const cams = new Map();
            const errors = [];
            const messageID = `urn:uuid:${options.messageId || (0, utils_1.guid)()}`;
            const request = Buffer.from('<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">'
                + '<Header>'
                + `<wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">${messageID}</wsa:MessageID>`
                + '<wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>'
                + '<wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>'
                + '</Header>'
                + '<Body>'
                + '<Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
                + '<Types>dn:NetworkVideoTransmitter</Types>'
                + '<Scopes />'
                + '</Probe>'
                + '</Body>'
                + '</Envelope>');
            const socket = (0, dgram_1.createSocket)(options.type ?? 'udp4');
            socket.on('error', (err) => {
                this.emit('error', err);
            });
            const listener = async (msg, rinfo) => {
                let data;
                let xml;
                try {
                    [data, xml] = await (0, utils_1.parseSOAPString)(msg.toString());
                    data = (0, utils_1.linerase)(data);
                }
                catch (error) {
                    errors.push(error);
                    this.emit('error', error, xml);
                    return;
                }
                // TODO check for matching RelatesTo field and messageId
                if (!data.probeMatches) {
                    errors.push(new utils_1.OnvifError(`Wrong SOAP message from ${rinfo.address}:${rinfo.port}\n${xml}`));
                    this.emit('error', `Wrong SOAP message from ${rinfo.address}:${rinfo.port}`, xml);
                }
                else {
                    // Possible to get multiple matches for the same camera
                    // when your computer has more than one network adapter in the same subnet
                    const camAddr = data.probeMatches.probeMatch.endpointReference.address;
                    if (!cams.has(camAddr)) {
                        let cam;
                        if (options.resolve !== false) {
                            // Create cam with one of the XAddrs uri
                            const camUris = data.probeMatches.probeMatch.XAddrs.split(' ').map(url_1.default.parse);
                            const camUri = matchXAddr(camUris, rinfo.address);
                            cam = new onvif_1.Onvif({
                                hostname: camUri.hostname,
                                port: parseInt(camUri.port, 10),
                                path: camUri.pathname,
                                urn: camAddr,
                            });
                        }
                        else {
                            cam = data;
                        }
                        cams.set(camAddr, cam);
                        this.emit('device', cam, rinfo, xml);
                    }
                }
            };
            // If device is specified try to bind to that interface
            if (options.device) {
                const interfaces = os_1.default.networkInterfaces();
                // Try to find the interface based on the device name
                if (options.device in interfaces) {
                    interfaces[options.device]?.forEach((iface) => {
                        // Only use IPv4 addresses
                        if (iface.family === 'IPv4') {
                            socket.bind(options.listeningPort, iface.address);
                        }
                    });
                }
            }
            socket.on('message', listener);
            socket.send(request, 0, request.length, 3702, '239.255.255.250');
            setTimeout(() => {
                socket.removeListener('message', listener);
                socket.close();
                if (errors.length === 0) {
                    resolve(Array.from(cams.values()));
                }
                else {
                    reject(errors);
                }
            }, options.timeout || 5000);
        });
    }
}
exports.DiscoverySingleton = DiscoverySingleton;
/**
 * Singleton for the discovery to provide `probe` method
 * {@link Discovery.probe}
 * @example
 * ```typescript
 * import { Discovery } from 'onvif';
 * Discovery.on('device', async (cam) => {
 *   // function would be called as soon as NVT responses
 *   cam.username = <USERNAME>;
 *   cam.password = <PASSWORD>;
 *   await cam.connect();
 * })
 * Discovery.probe();
 * ```
 * @example
 * import { Discovery } from 'onvif';
 * (async () => {
 *   const cams = Promise.all((await Discovery.probe()).map(camera => camera.connect());
 *   console.log(await cams[0]?.getSystemDateAndTime());
 * })();
 */
exports.Discovery = DiscoverySingleton.getInstance;
//# sourceMappingURL=discovery.js.map