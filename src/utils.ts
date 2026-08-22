import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { Duration } from './interfaces/basics';
import { xsany } from './utils/toOnvifXMLSchemaObject';

const NUMBER_RE = /^-?([1-9]\d*|0)(\.\d*)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
const PREFIX_MATCH_RE = /(?!xmlns)^.*:/;
const ISO_DURATION_RE = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?=\d+)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/;

interface OnvifErrorOptions {
  /**
   * Raw error response from the server
   */
  xml?: string;
}

/**
 * Type for common duration values, ISO duration or milliseconds
 */
export type CommonDuration = string | number;

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

export interface LineraseOptions {
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
export function linerase<T = any>(xml: any, options: LineraseOptions = { array: [], rawXML: [] }): T {
  if (options.rawXML === undefined) {
    options.rawXML = [];
  }
  /* if we have xs:any
    put it content to the Symbol.any
   */
  if (options.rawXML.includes(options.name!)) {
    if (options.array.includes(options.name!)) {
      return xml.map((item: any) => linerase(item, { ...options, name: xsany, rawXML: [xsany] }));
    }
    if (Array.isArray(xml)) {
      [xml] = xml;
    }
    const rawXMLObject = linerase<T>(xml, { ...options, rawXML: [] });
    Object.defineProperty(rawXMLObject, xsany, {
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

    if (
      xml.length === 1 &&
      !options.array.includes(options.name!) /* do not simplify array if its key in array prop */
    ) {
      [xml] = xml;
    } else {
      return xml.map((item: any) => linerase(item, options));
    }
  }
  if (typeof xml === 'object') {
    let obj: any = {};
    Object.keys(xml).forEach((key) => {
      if (key === '$') {
        // for the xml attributes
        obj = {
          ...obj,
          ...linerase(xml.$, options),
        };
      } else {
        obj[camelCase(key)] = linerase(xml[key], { ...options, name: camelCase(key) });
      }
    });
    return obj;
  }
  if (xml === 'true') {
    return true as T;
  }
  if (xml === 'false') {
    return false as T;
  }
  if (NUMBER_RE.test(xml)) {
    return parseFloat(xml) as T;
  }
  if (DATE_RE.test(xml)) {
    return new Date(xml) as T;
  }
  return xml as T;
}

function s4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

/**
 * Generate GUID
 */
export function guid() {
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/**
 * Split Digest authentication string
 */
export function splitArgs(args: string): string[] {
  let buffer = '';
  const result = [];
  let quoteOpen = false;
  for (const i of args) {
    if (quoteOpen) {
      if (i === '"') {
        quoteOpen = false;
      }
      buffer += i;
      continue;
    }
    if (i === ',') {
      result.push(buffer.trim());
      buffer = '';
    } else {
      if (i === '"') {
        quoteOpen = true;
      }
      buffer += i;
    }
  }
  result.push(buffer.trim());
  return result;
}

export type OnvifResponse = Promise<[Record<string, any>, string]>;

/**
 * @param tagName
 */
export function camelCase(tagName: string) {
  const str = tagName.replace(PREFIX_MATCH_RE, '');
  if (str.length === 1) {
    return str.toLowerCase();
  }
  const secondLetter = str.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
  return str;
}

function toCamelCase(name: string) {
  const secondLetter = name.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
  return name;
}

function toPascalCase(name: string) {
  const secondLetter = name.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}

interface ParseSOAPStringOptions {
  array?: string[];
  rawXML?: string[];
  attributesGroupName?: string;
  attributeNamePrefix?: string;
}

function parse(xml: string, options?: ParseSOAPStringOptions) {
  const xml2jsMode = options?.attributesGroupName === '$';
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: options?.attributesGroupName,
    attributeNamePrefix: options?.attributeNamePrefix ?? '',
    textNodeName: '_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: xml2jsMode
      ? (_tagName, _jPath, _isLeafNode, isAttribute) => !isAttribute
      : (tagName) => !!options?.array?.includes(tagName),
    removeNSPrefix: !xml2jsMode,
    ...(!xml2jsMode && {
      transformTagName: toCamelCase,
      transformAttributeName: toCamelCase,
    }),
    stopNodes: options?.rawXML?.map((tag) => `..${tag}`),
  });
  return parser.parse(xml);
}

function hydrateStopNode(value: any, options: ParseSOAPStringOptions): any {
  if (Array.isArray(value)) {
    return value.map((item) => hydrateStopNode(item, options));
  }
  const xmlToParse = `<root>${value._ ?? value}</root>`;
  const parsed = parse(xmlToParse, { array: options.array }).root || {};
  const wrapped = parse(xmlToParse, { attributesGroupName: '$' }).root;
  let xsAnyParsed = (Array.isArray(wrapped) ? wrapped[0] : wrapped) || {};
  if (typeof value === 'object') {
    Object.assign(parsed, value);
    delete parsed._;
    if (typeof xsAnyParsed !== 'object') {
      xsAnyParsed = { _: xsAnyParsed };
    }
    const $: Record<string, unknown> = {};
    for (const [key, attrValue] of Object.entries(value)) {
      if (key !== '_') {
        $[toPascalCase(key)] = attrValue;
      }
    }
    if (Object.keys($).length) {
      xsAnyParsed.$ = { ...$, ...xsAnyParsed.$ };
    }
  }
  formatXMLValues(parsed, { array: options.array });
  parsed[xsany] = xsAnyParsed;
  return parsed;
}

/**
 * Parse SOAP response
 * @param xml
 * @param options
 */
export async function parseSOAPString<T>(xml: string, options?: ParseSOAPStringOptions): Promise<[T, string]> {
  /* Filter out xml namespaces */
  // const xml = rawXml.replace(/xmlns([^=]*?)=(".*?")/g, '');
  const result = parse(xml, options);
  formatXMLValues(result, options);
  const body = result.envelope?.body;
  if (!body) {
    throw new OnvifError('Wrong ONVIF SOAP response, not a SOAP message, envelope and body are expected', {
      xml,
    });
  }
  if (body.fault) {
    const fault = body.fault;
    let reason = '';
    let detail = '';

    try {
      const text = fault.reason.text;
      reason = (typeof text === 'object' ? text._ : text) || JSON.stringify(fault.code);
    } catch (_e) {
      // Ignore error if reason extraction fails
    }

    try {
      [detail] = fault.detail.text;
    } catch (_e) {
      // Ignore error if detail extraction fails
    }

    throw new Error(`ONVIF SOAP Fault: ${reason}${detail}`);
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

// old builder with xml2js library
// const builder = new xml2js.Builder({
//   headless: true,
//   renderOpts: {
//     pretty: false,
//   },
// });
//
// export function build(object: any) {
//   return builder.buildObject(object);
// }

const newBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributesGroupName: '$',
  attributeNamePrefix: '',
  textNodeName: '_',
  format: true,
  indentBy: '  ',
});

export function build(object: any) {
  return newBuilder.build(object);
}

/**
 * Use ISO duration or convert milliseconds to ISO duration
 * @param duration
 */
export function toIsoDuration(duration: CommonDuration): Duration {
  if (typeof duration === 'string') {
    if (!ISO_DURATION_RE.test(duration)) {
      throw new Error(`"${duration}" is not a valid ISO duration value`);
    }
    return duration;
  }

  if (duration <= 0) return 'PT0S';

  let totalSeconds = Math.floor(duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0) result += `${minutes}M`;
  if (seconds > 0 || result === 'PT') result += `${seconds}S`;

  return result;
}

/**
 * Converts an ISO Duration (H, M, S) to milliseconds.
 * @param duration - The duration string (e.g., "PT5S", "PT1M", "PT1H30M")
 */
export function toMs(duration: CommonDuration): number {
  if (typeof duration === 'number') {
    return duration;
  }
  // Matches strict time duration: T followed by Hours, Minutes, and/or Seconds (including decimals)
  const regex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.(\d+))?S)?$/;
  const matches = duration.match(regex);

  if (!matches) {
    throw new Error(`Invalid ISO Time Duration format: ${duration}`);
  }

  const hours = parseInt(matches[1]) || 0;
  const minutes = parseInt(matches[2]) || 0;
  const seconds = parseInt(matches[3]) || 0;
  const ms = matches[4] ? Math.round(parseFloat(`0.${matches[4]}`) * 1000) : 0;

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

/**
 * Get Digest headers from headers array
 * @param headersArray
 */
export function getDigestHeaders(headersArray: string[]) {
  const wwwAuthenticateArray = [];
  for (let x = 0; x < headersArray.length; x = x + 2) {
    if (headersArray[x].toLowerCase() === 'www-authenticate' && headersArray[x + 1].startsWith('Digest')) {
      wwwAuthenticateArray.push(headersArray[x + 1]);
    }
  }
  return wwwAuthenticateArray;
}

/**
 * Mutable function to convert string values to their appropriate types.
 * Tags in `rawXML` are re-parsed and get `__any__` as the xml2js object.
 */
export function formatXMLValues(xml: any, options: ParseSOAPStringOptions = {}) {
  const rawXML = options.rawXML ?? [];
  // if (Array.isArray(xml)) {
  //   return xml.forEach((item) => formatXMLValues(item, options));
  // }
  if (typeof xml === 'object' && xml !== null) {
    for (const [key, value] of Object.entries(xml)) {
      if (key === xsany) {
        continue;
      }
      if (rawXML.includes(key)) {
        xml[key] = hydrateStopNode(value, options);
        continue;
      }
      if (value === 'true') {
        xml[key] = true;
      }
      if (value === 'false') {
        xml[key] = false;
      }
      if (typeof value === 'string') {
        if (NUMBER_RE.test(value)) {
          xml[key] = Number.parseFloat(value);
        }
        if (DATE_RE.test(value)) {
          xml[key] = new Date(value);
        }
      }
      if (typeof value === 'object') {
        formatXMLValues(value, options);
      }
    }
  }
}
