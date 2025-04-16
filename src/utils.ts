import xml2js from 'xml2js';
import { MulticastConfiguration } from './interfaces/onvif';

const numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/;
const dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
const prefixMatch = /(?!xmlns)^.*:/;

interface OnvifErrorOptions {
  /**
   * Raw error response from the server
   */
  xml?: string;
}

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

/**
 * Parse SOAP object to pretty JS-object
 * @param xml xml2js object
 * @param options
 */
export function linerase(xml: any, options?: { array: string[]; name?: string } | number): any {
  if (typeof options !== 'object') {
    options = { array : [] };
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
      if (key === '$') { // for xml attributes
        obj = {
          ...obj,
          ...linerase(xml.$, options),
        };
      } else {
        obj[key] = linerase(xml[key], { ...options, name : key });
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
 * @private
 * @param tag
 */
export function camelCase(tag: string) {
  const str = tag.replace(prefixMatch, '');
  const secondLetter = str.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
  return str;
}

/**
 * Parse SOAP response
 * @param rawXml
 */
export async function parseSOAPString(rawXml: string): OnvifResponse {
  /* Filter out xml name spaces */
  const xml = rawXml.replace(/xmlns([^=]*?)=(".*?")/g, '');

  const result = await xml2js.parseStringPromise(xml, {
    tagNameProcessors  : [camelCase],
    attrNameProcessors : [camelCase],
    normalize          : true,
  });
  if (!result || !result.envelope || !result.envelope.body) {
    throw new OnvifError('Wrong ONVIF SOAP response, envelope and body expected', {
      xml : rawXml,
    });
  }
  if (result.envelope.body[0].fault) {
    const fault = result.envelope.body[0].fault[0];
    let reason;
    try {
      if (fault.reason[0].text[0]._) {
        reason = fault.reason[0].text[0]._;
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
      [detail] = fault.detail[0].text;
    } catch (e) {
      detail = '';
    }

    throw new OnvifError(`${reason}${detail}`, {
      xml : rawXml,
    });
  }
  return [result.envelope.body, xml];
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

export function schemaMulticastConfiguration(multicast: MulticastConfiguration) {
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
}
