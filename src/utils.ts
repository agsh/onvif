import xml2js from 'xml2js';
import { Config, MulticastConfiguration } from './interfaces/onvif';

const numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/;
const dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
const prefixMatch = /(?!xmlns)^.*:/;

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

interface OnvifErrorOptions {
  /**
   * Raw error response from the server
   */
  xml?: string;
}

export const xsany = '__any__';

export class OnvifError extends Error {
  public readonly xml?: string;
  constructor(message: string, options?: OnvifErrorOptions) {
    super(message);
    this.name = 'OnvifError';
    if (options) {
      this.xml = options.xml;
    }
  }
}

interface LineraseOptions {
  array: string[];
  rawXML?: string[];
  name?: string;
}

/**
 * Parse SOAP object to pretty JS-object
 * @param xml xml2js object
 * @param options
 * @param options.array these tags will always be treated as arrays
 * @param options.rawXML values of these tags will be in xml2js format
 */
export function linerase(xml: any, options: LineraseOptions = { array : [], rawXML : [] }): any {
  if (options.rawXML === undefined) { options.rawXML = []; }
  /* if we have xs:any
    put it content to the Symbol.any
   */
  if (options.rawXML.includes(options.name!)) {
    if (options.array.includes(options.name!)) {
      return xml.map((item: any) => linerase(item, { ...options, name : xsany, rawXML : [xsany] }));
    }
    if (Array.isArray(xml)) {
      [xml] = xml;
    }
    const rawXMLObject = linerase(xml, { ...options, rawXML : [] });
    Object.defineProperty(rawXMLObject, xsany, {
      value        : xml,
      writable     : true,
      enumerable   : true, // false,
      configurable : true,
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

    if (xml.length === 1 && !options.array.includes(options.name!) /* do not simplify array if its key in array prop */) {
      [xml] = xml;
    } else {
      return xml.map((item: any) => linerase(item, options));
    }
  }
  if (typeof xml === 'object') {
    let obj: any = {};
    Object.keys(xml).forEach((key) => {
      if (key === '$') { // for the xml attributes
        obj = {
          ...obj,
          ...linerase(xml.$, options),
        };
      } else {
        obj[camelCase(key)] = linerase(xml[key], { ...options, name : camelCase(key) });
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
export function guid() {
  return (`${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`);
}

export type OnvifResponse = Promise<[Record<string, any>, string]>;

/**
 * @param tagName
 */
export function camelCase(tagName: string) {
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

function stripPrefix(tagName: string) {
  return tagName.replace(prefixMatch, '');
}

/**
 * Parse SOAP response
 * @param xml
 */
export async function parseSOAPString(xml: string): OnvifResponse {
  /* Filter out xml namespaces */
  // const xml = rawXml.replace(/xmlns([^=]*?)=(".*?")/g, '');

  let prefix = '';
  const result = await xml2js.parseStringPromise(xml);
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
  } catch (e) {
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
    } catch (e) {
      reason = '';
    }
    if (!reason) {
      try {
        reason = JSON.stringify(linerase(fault.code[0]));
      } catch (e) {
        reason = '';
      }
    }
    let detail;
    try {
      [detail] = fault[`${prefix}Detail`][0][`${prefix}Text`];
    } catch (e) {
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
export function struct<T, K extends keyof T>(list: T[], groupKey: K): Record<string, T> {
  return Object.fromEntries(list.map((item) => [item[groupKey], item]));
}

const builder = new xml2js.Builder({
  headless   : true,
  renderOpts : {
    pretty : false,
  },
});

export function build(object: any) {
  return builder.buildObject(object);
}

export const toOnvifXMLSchemaObject = {
  multicastConfiguration(multicast: MulticastConfiguration) {
    return {
      Address : {
        Type : multicast.address.type,
        ...(multicast.address.IPv4Address && { IPv4Address : multicast.address.IPv4Address }),
        ...(multicast.address.IPv6Address && { IPv4Address : multicast.address.IPv6Address }),
      },
      Port      : multicast.port,
      TTL       : multicast.TTL,
      AutoStart : multicast.autoStart,
    };
  },
  config(config: Config) {
    return {
      $ : {
        Name : config.name,
        Type : config.type,
      },
      Parameters : {
        ...(config.parameters.simpleItem
          && {
            SimpleItem : config.parameters.simpleItem.map((simpleItem) => ({
              $ : { Name : simpleItem.name, Value : simpleItem.value },
            })),
          }
        ),
        ...(config.parameters.elementItem
          && {
            // don't forget that we have proxy getter here to the `__any__` field
            ElementItem : config.parameters.elementItem.map((elementItem) => ({
              ...elementItem[xsany] as object,
              Name : elementItem.name,
            })),
          }
        ),
        ...(config.parameters.extension && { Extension : config.parameters.extension }),
      },
    };
  },
};
