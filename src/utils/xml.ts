/**
 * Low-level XML parse / build used by SOAP helpers (no runtime XML dependencies).
 */
export { buildXml } from './builder';
export { parseXml, type ParseXmlOptions } from './parser';

/** SOAP 1.2 envelope namespace. */
export const SOAP_NS = 'http://www.w3.org/2003/05/soap-envelope';
/** ONVIF schema (`tt:`) namespace. */
export const TT_NS = 'http://www.onvif.org/ver10/schema';
/** ONVIF device WSDL (`tds:`) namespace. */
export const TDS_NS = 'http://www.onvif.org/ver10/device/wsdl';

/** Wrap a Body child fragment in a minimal SOAP 1.2 envelope. */
export function soapEnvelope(bodyInner: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<s:Envelope xmlns:s="${SOAP_NS}">` +
    `<s:Body>${bodyInner}</s:Body>` +
    `</s:Envelope>`
  );
}
