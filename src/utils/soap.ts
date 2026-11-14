import { OnvifParseError, OnvifResponseError, OnvifSoapFaultError } from './errors';
import { toPascalCase } from './naming';
import { buildXml, parseXml, type ParseXmlOptions } from './xml';

export type OnvifResponse = Promise<[Record<string, any>, string]>;

interface ParseSOAPStringOptions extends ParseXmlOptions {}

function soapFaultText(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = soapFaultText(item);
      if (text) {
        return text;
      }
    }
    return '';
  }
  if (typeof value === 'object' && '_' in value) {
    return soapFaultText((value as { _: unknown })._);
  }
  return '';
}

/** Walk SOAP 1.2 `Code/Subcode` nesting (outermost first). */
function collectSoap12Subcodes(subcode: unknown): string[] {
  const codes: string[] = [];
  let current: any = subcode;
  while (current != null && typeof current === 'object') {
    const value = soapFaultText(current.value);
    if (value) {
      codes.push(value);
    }
    current = current.subcode;
  }
  return codes;
}

/**
 * SOAP 1.1 often puts ONVIF `ter:*` codes as empty detail children
 * (`<detail><ter:NotAuthorized/></detail>` -> `{ notAuthorized: '' }` after NS strip).
 */
function collectSoap11DetailSubcodes(detail: Record<string, unknown> | undefined): string[] {
  if (!detail || typeof detail !== 'object') {
    return [];
  }
  const codes: string[] = [];
  for (const [key, value] of Object.entries(detail)) {
    if (key === 'text' || key === '_' || key === '$') {
      continue;
    }
    if (value === '' || value == null || (typeof value === 'object' && !Array.isArray(value))) {
      codes.push(toPascalCase(key));
    }
  }
  return codes;
}

/**
 * Normalize SOAP 1.2 (`Code` / `Subcode` / `Reason` / `Detail`) and SOAP 1.1
 * (`faultcode` / `faultstring` / `detail`) into one shape.
 * ONVIF mandates 1.2, but many firmwares still emit 1.1 Faults -- accept both.
 */
function extractSoapFault(fault: Record<string, any>): {
  faultCode?: string;
  faultSubcode?: string;
  faultSubcodes?: string[];
  faultReason: string;
  faultDetail: string;
} {
  let faultCode: string | undefined;
  // SOAP 1.1 uses lowercase `faultcode` (stays as-is after camelCase).
  const soap11Code = soapFaultText(fault.faultcode ?? fault.faultCode);
  if (soap11Code) {
    faultCode = soap11Code;
  } else {
    const codeValue = fault.code?.value ?? fault.code;
    if (typeof codeValue === 'string') {
      faultCode = codeValue;
    } else if (codeValue != null && typeof codeValue === 'object') {
      const asText = soapFaultText(codeValue);
      faultCode = asText || undefined;
    }
  }

  const soap12Subcodes = collectSoap12Subcodes(fault.code?.subcode);
  const soap11Subcodes = soap12Subcodes.length ? [] : collectSoap11DetailSubcodes(fault.detail);
  const faultSubcodes = soap12Subcodes.length ? soap12Subcodes : soap11Subcodes;
  const faultSubcode = faultSubcodes[0];

  const faultReason =
    soapFaultText(fault.reason?.text) ||
    soapFaultText(fault.faultstring ?? fault.faultString) ||
    faultCode ||
    '';

  let faultDetail = '';
  const detailText = fault.detail?.text ?? fault.detail?._;
  if (detailText !== undefined) {
    faultDetail = soapFaultText(detailText);
  } else if (typeof fault.detail === 'string' || typeof fault.detail === 'number') {
    faultDetail = String(fault.detail);
  }

  return {
    faultCode,
    faultSubcode,
    ...(faultSubcodes.length ? { faultSubcodes } : {}),
    faultReason,
    faultDetail,
  };
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
  let result: any;
  try {
    result = parseXml(xml, options);
  } catch (cause) {
    throw new OnvifParseError('Failed to parse ONVIF SOAP XML', { xml, cause });
  }
  const body = result.envelope?.body;
  if (!body) {
    throw new OnvifResponseError('Wrong ONVIF SOAP response, not a SOAP message, envelope and body are expected', {
      xml,
    });
  }
  if (body.fault) {
    const { faultCode, faultSubcode, faultSubcodes, faultReason, faultDetail } = extractSoapFault(body.fault);
    const parts = [faultReason, faultDetail].filter((part) => part.length > 0);
    throw new OnvifSoapFaultError(`ONVIF SOAP Fault: ${parts.join(' -- ') || 'unknown'}`, {
      xml,
      faultCode,
      faultSubcode,
      faultSubcodes,
      faultReason,
      faultDetail,
    });
  }
  return [body, xml];
}

/** Serialize a JS tree to compact XML (`$` attrs, `_` text). See {@link buildXml}. */
export function build(object: any) {
  return buildXml(object);
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
