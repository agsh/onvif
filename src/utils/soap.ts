import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { DATE_RE, NUMBER_RE } from './helpers';

import { OnvifResponseError, OnvifSoapFaultError } from './errors';
import { toCamelCase, toPascalCase } from './naming';
import { xsany } from './toOnvifXMLSchemaObject';

export type OnvifResponse = Promise<[Record<string, any>, string]>;

interface ParseSOAPStringOptions {
  array?: string[];
  rawXML?: string[];
  attributesGroupName?: string;
  attributeNamePrefix?: string;
}

function soapFaultText(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object' && '_' in value) {
    return soapFaultText((value as { _: unknown })._);
  }
  return '';
}

function extractSoapFault(fault: Record<string, any>): {
  faultCode?: string;
  faultSubcode?: string;
  faultReason: string;
  faultDetail: string;
} {
  let faultCode: string | undefined;
  const codeValue = fault.code?.value ?? fault.code?.Value ?? fault.code;
  if (typeof codeValue === 'string') {
    faultCode = codeValue;
  } else if (codeValue != null && typeof codeValue === 'object') {
    // Prefer the top-level Code/Value string; nested objects may be Subcode bags
    const asText = soapFaultText(codeValue);
    faultCode = asText || undefined;
  }

  const subcodeRaw = fault.code?.subcode?.value ?? fault.code?.Subcode?.Value ?? fault.code?.subcode;
  const faultSubcode = soapFaultText(subcodeRaw) || undefined;

  let faultReason = '';
  try {
    faultReason = soapFaultText(fault.reason?.text) || faultCode || '';
  } catch {
    // ignore malformed reason
  }

  let faultDetail = '';
  try {
    const detailText = fault.detail?.text;
    if (Array.isArray(detailText)) {
      faultDetail = soapFaultText(detailText[0]);
    } else {
      faultDetail = soapFaultText(detailText);
    }
  } catch {
    // ignore malformed detail
  }

  return { faultCode, faultSubcode, faultReason, faultDetail };
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
  // Only use text content as inner XML — never stringify the attribute bag (`[object Object]`).
  const innerXml =
    typeof value === 'object' && value !== null ? String(value._ ?? '') : String(value ?? '');
  const xmlToParse = `<root>${innerXml}</root>`;
  let parsed: any = parse(xmlToParse, { array: options.array }).root;
  const wrapped = parse(xmlToParse, { attributesGroupName: '$' }).root;
  let xsAnyParsed: any = Array.isArray(wrapped) ? wrapped[0] : wrapped;

  // Text-only / empty stop nodes: root may be a string, '', or undefined — always attach xsany to an object.
  if (parsed == null || parsed === '') {
    parsed = {};
  } else if (typeof parsed !== 'object') {
    parsed = { _: parsed };
  }
  if (xsAnyParsed == null || xsAnyParsed === '') {
    xsAnyParsed = {};
  } else if (typeof xsAnyParsed !== 'object') {
    xsAnyParsed = { _: xsAnyParsed };
  }

  if (typeof value === 'object' && value !== null) {
    Object.assign(parsed, value);
    delete parsed._;
    const $: Record<string, unknown> = {};
    for (const [key, attrValue] of Object.entries(value)) {
      if (key !== '_') {
        $[toPascalCase(key)] = attrValue;
      }
    }
    if (Object.keys($).length) {
      xsAnyParsed.$ = { ...$, ...xsAnyParsed.$ };
    }
    // Text-only ElementItem: keep payload on xsany._ when there are no child elements
    const hasElementChildren = Object.keys(xsAnyParsed).some((k) => k !== '$' && k !== '_');
    if (!hasElementChildren && typeof value._ === 'string' && value._ !== '') {
      xsAnyParsed._ = value._;
    }
  }
  formatXMLValues(parsed, { array: options.array });
  Object.defineProperty(parsed, xsany, {
    value: xsAnyParsed,
    writable: true,
    enumerable: false,
    configurable: true,
  });
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
  if (!xml?.trim()) {
    throw new OnvifResponseError('Empty ONVIF SOAP response (camera returned no body)', {
      xml: xml ?? '',
    });
  }
  const result = parse(xml, options);
  formatXMLValues(result, options);
  const body = result.envelope?.body;
  if (!body) {
    throw new OnvifResponseError('Wrong ONVIF SOAP response, not a SOAP message, envelope and body are expected', {
      xml,
    });
  }
  if (body.fault) {
    const { faultCode, faultSubcode, faultReason, faultDetail } = extractSoapFault(body.fault);
    throw new OnvifSoapFaultError(`ONVIF SOAP Fault: ${faultReason}${faultDetail}`, {
      xml,
      faultCode,
      faultSubcode,
      faultReason,
      faultDetail,
    });
  }
  return [body, xml];
}

// Compact SOAP like v0.x (no pretty-print). Some cameras (e.g. Pelco) reject or
// mishandle indented SOAP and return an empty HTTP body — see #497.
const newBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributesGroupName: '$',
  attributeNamePrefix: '',
  textNodeName: '_',
  format: false,
  suppressEmptyNode: true,
});

export function build(object: any) {
  return newBuilder.build(object);
}

/**
 * Derive SOAP 1.2 `action` URI from a request body object (first child of Body + its xmlns).
 * Matches v0.x Content-Type `action="namespace/Operation"` behaviour.
 */
export function soapActionFromBody(body: Record<string, unknown>, fallbackXmlns?: string): string | undefined {
  const keys = Object.keys(body).filter((key) => key !== '$');
  if (keys.length === 0) {
    return undefined;
  }
  const operation = keys[0];
  const operationNode = body[operation];
  const xmlns =
    (typeof operationNode === 'object' &&
      operationNode !== null &&
      '$' in operationNode &&
      typeof (operationNode as { $?: { xmlns?: unknown } }).$?.xmlns === 'string' &&
      (operationNode as { $: { xmlns: string } }).$.xmlns) ||
    fallbackXmlns;
  if (!xmlns || typeof xmlns !== 'string') {
    return undefined;
  }
  return `${xmlns}/${operation}`;
}

/**
 * Derive SOAP 1.2 `action` from a pre-built envelope string (rawRequest paths).
 */
export function soapActionFromXml(xml: string): string | undefined {
  const bodyMatch = xml.match(/<(?:[\w-]+:)?Body\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?Body>/i);
  if (!bodyMatch) {
    return undefined;
  }
  const opMatch = bodyMatch[1].match(/<([\w-]+)([^>]*)\/?>/);
  if (!opMatch) {
    return undefined;
  }
  const local = opMatch[1].includes(':') ? opMatch[1].split(':').pop()! : opMatch[1];
  const nsMatch = opMatch[2].match(/\bxmlns(?::\w+)?="([^"]+)"/);
  if (!nsMatch) {
    return undefined;
  }
  return `${nsMatch[1]}/${local}`;
}

/**
 * Mutable function to convert string values to their appropriate types.
 * Tags in `rawXML` are re-parsed and get `xsany` as the xml2js object.
 */
export function formatXMLValues(xml: any, options: ParseSOAPStringOptions = {}) {
  const rawXML = options.rawXML ?? [];
  // if (Array.isArray(xml)) {
  //   return xml.forEach((item) => formatXMLValues(item, options));
  // }
  if (typeof xml === 'object' && xml !== null) {
    for (const [key, value] of Object.entries(xml)) {
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
