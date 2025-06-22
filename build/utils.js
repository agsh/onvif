"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toOnvifXMLSchemaObject = exports.OnvifError = exports.xsany = void 0;
exports.linerase = linerase;
exports.guid = guid;
exports.camelCase = camelCase;
exports.parseSOAPString = parseSOAPString;
exports.struct = struct;
exports.build = build;
const xml2js_1 = __importDefault(require("xml2js"));
const numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/;
const dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
const prefixMatch = /(?!xmlns)^.*:/;
exports.xsany = '__any__';
class OnvifError extends Error {
    xml;
    constructor(message, options) {
        super(message);
        this.name = 'OnvifError';
        if (options) {
            this.xml = options.xml;
        }
    }
}
exports.OnvifError = OnvifError;
/**
 * Parse SOAP object to pretty JS-object
 * @param xml xml2js object
 * @param options
 * @param options.array these tags will always be treated as arrays
 * @param options.rawXML values of these tags will be in xml2js format
 */
function linerase(xml, options = { array: [], rawXML: [] }) {
    if (options.rawXML === undefined) {
        options.rawXML = [];
    }
    /* if we have xs:any
      put it content to the Symbol.any
     */
    if (options.rawXML.includes(options.name)) {
        if (options.array.includes(options.name)) {
            return xml.map((item) => linerase(item, { ...options, name: exports.xsany, rawXML: [exports.xsany] }));
        }
        if (Array.isArray(xml)) {
            [xml] = xml;
        }
        const rawXMLObject = linerase(xml, { ...options, rawXML: [] });
        Object.defineProperty(rawXMLObject, exports.xsany, {
            value: xml,
            writable: true,
            enumerable: true, // false,
            configurable: true,
        });
        return rawXMLObject;
    }
    if (Array.isArray(xml)) {
        /* trim empty nodes in xml
          ex.:
          <Node>
          </Node>
          becomes text node { node: ["\r\n"] }, this is not what we expected
         */
        xml = xml.filter((item) => !(typeof item === 'string' && item.trim() === ''));
        if (xml.length === 1 && !options.array.includes(options.name) /* do not simplify array if its key in array prop */) {
            [xml] = xml;
        }
        else {
            return xml.map((item) => linerase(item, options));
        }
    }
    if (typeof xml === 'object') {
        let obj = {};
        Object.keys(xml).forEach((key) => {
            if (key === '$') { // for the xml attributes
                obj = {
                    ...obj,
                    ...linerase(xml.$, options),
                };
            }
            else {
                obj[camelCase(key)] = linerase(xml[key], { ...options, name: camelCase(key) });
            }
        });
        return obj;
    }
    if (xml === 'true') {
        return true;
    }
    if (xml === 'false') {
        return false;
    }
    if (numberRE.test(xml)) {
        return parseFloat(xml);
    }
    if (dateRE.test(xml)) {
        return new Date(xml);
    }
    return xml;
}
function s4() {
    // eslint-disable-next-line no-bitwise
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
/**
 * Generate GUID
 * @returns {string}
 */
function guid() {
    return (`${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`);
}
/**
 * @param tagName
 */
function camelCase(tagName) {
    const str = tagName.replace(prefixMatch, '');
    if (str.length === 1) {
        return str.toLowerCase();
    }
    const secondLetter = str.charAt(1);
    if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
    return str;
}
function stripPrefix(tagName) {
    return tagName.replace(prefixMatch, '');
}
/**
 * Parse SOAP response
 * @param xml
 */
async function parseSOAPString(xml) {
    /* Filter out xml namespaces */
    // const xml = rawXml.replace(/xmlns([^=]*?)=(".*?")/g, '');
    let prefix = '';
    const result = await xml2js_1.default.parseStringPromise(xml);
    try {
        // eslint-disable-next-line
        for (const envelopeKey in result) {
            for (const [xmlns, url] of Object.entries(result[envelopeKey].$)) {
                if (url === 'http://www.w3.org/2003/05/soap-envelope') {
                    prefix = `${xmlns.slice(6)}:`;
                    break;
                }
            }
            break;
        }
    }
    catch (e) {
        throw new OnvifError('Wrong ONVIF SOAP response, not a SOAP message', {
            xml,
        });
    }
    if (!result[`${prefix}Envelope`]?.[`${prefix}Body`]) {
        throw new OnvifError('Wrong ONVIF SOAP response, envelope and body are expected', {
            xml,
        });
    }
    const body = result[`${prefix}Envelope`][`${prefix}Body`][0];
    // SOAP Fault Element
    // https://www.w3.org/2003/05/soap-envelope/
    // https://www.w3schools.com/xml/xml_soap.asp
    if (body[`${prefix}Fault`]) {
        const fault = body[`${prefix}Fault`][0];
        let reason;
        try {
            if (fault[`${prefix}Reason`][0][`${prefix}Text`][0]._) {
                reason = fault[`${prefix}Reason`][0][`${prefix}Text`][0]._;
            }
        }
        catch (e) {
            reason = '';
        }
        if (!reason) {
            try {
                reason = JSON.stringify(linerase(fault.code[0]));
            }
            catch (e) {
                reason = '';
            }
        }
        let detail;
        try {
            [detail] = fault[`${prefix}Detail`][0][`${prefix}Text`];
        }
        catch (e) {
            detail = '';
        }
        throw new OnvifError(`${reason}${detail}`, {
            xml,
        });
    }
    return [body, xml];
}
/**
 * Create a record from the list where the key is commonly used parameter
 * For example, from the profiles array get an object where we can have rapid access to profile using its token
 * @param list
 * @param groupKey
 */
function struct(list, groupKey) {
    return Object.fromEntries(list.map((item) => [item[groupKey], item]));
}
const builder = new xml2js_1.default.Builder({
    headless: true,
    renderOpts: {
        pretty: false,
    },
});
function build(object) {
    return builder.buildObject(object);
}
exports.toOnvifXMLSchemaObject = {
    multicastConfiguration(multicast) {
        return {
            Address: {
                Type: multicast.address.type,
                ...(multicast.address.IPv4Address && { IPv4Address: multicast.address.IPv4Address }),
                ...(multicast.address.IPv6Address && { IPv4Address: multicast.address.IPv6Address }),
            },
            Port: multicast.port,
            TTL: multicast.TTL,
            AutoStart: multicast.autoStart,
        };
    },
    config(config) {
        return {
            $: {
                Name: config.name,
                Type: config.type,
            },
            Parameters: {
                ...(config.parameters.simpleItem
                    && {
                        SimpleItem: config.parameters.simpleItem.map((simpleItem) => ({
                            $: { Name: simpleItem.name, Value: simpleItem.value },
                        })),
                    }),
                ...(config.parameters.elementItem
                    && {
                        // don't forget that we have proxy getter here to the `__any__` field
                        ElementItem: config.parameters.elementItem.map((elementItem) => ({
                            ...elementItem[exports.xsany],
                            Name: elementItem.name,
                        })),
                    }),
                ...(config.parameters.extension && { Extension: config.parameters.extension }),
            },
        };
    },
};
//# sourceMappingURL=utils.js.map