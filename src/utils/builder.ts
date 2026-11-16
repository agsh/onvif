/**
 * Compact XML serializer (`$` = attributes, `_` = text, other keys = children).
 * Used for ONVIF SOAP envelopes (no pretty-print).
 */

const XML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/**
 * Stringify a scalar for XML text/attrs, then escape `& < > " '`.
 * `Date` -> UTC ISO-8601 (`xs:dateTime`).
 */
function encodeXmlValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value).replace(/[&<>"']/g, (ch) => XML_ESCAPE[ch]!);
}

function formatAttributes(attrs: Record<string, unknown>): string {
  let out = '';
  for (const [name, raw] of Object.entries(attrs)) {
    if (raw === undefined) {
      continue;
    }
    out += ` ${name}="${encodeXmlValue(raw)}"`;
  }
  return out;
}

function renderElement(name: string, value: unknown): string {
  if (value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    // Empty arrays emit nothing.
    let out = '';
    for (const item of value) {
      out += renderElement(name, item);
    }
    return out;
  }

  if (value === null || value === '') {
    return `<${name}/>`;
  }

  // Date is typeof 'object' but must serialize as xs:dateTime text, not an empty element.
  if (typeof value !== 'object' || value instanceof Date) {
    const text = encodeXmlValue(value);
    return text === '' ? `<${name}/>` : `<${name}>${text}</${name}>`;
  }

  const node = value as Record<string, unknown>;
  const attrs =
    node.$ !== undefined && node.$ !== null && typeof node.$ === 'object' && !Array.isArray(node.$)
      ? formatAttributes(node.$ as Record<string, unknown>)
      : '';

  let inner = '';
  let hasContent = false;
  for (const [key, child] of Object.entries(node)) {
    if (key === '$') {
      continue;
    }
    if (key === '_') {
      if (child !== undefined && child !== null && child !== '') {
        inner += encodeXmlValue(child);
        hasContent = true;
      }
      continue;
    }
    if (child === undefined) {
      continue;
    }
    if (Array.isArray(child) && child.length === 0) {
      continue;
    }
    const rendered = renderElement(key, child);
    if (rendered !== '') {
      inner += rendered;
      hasContent = true;
    }
  }

  if (!hasContent) {
    return `<${name}${attrs}/>`;
  }
  return `<${name}${attrs}>${inner}</${name}>`;
}

/**
 * Serialize a JS tree to compact XML (no pretty-print, empty nodes self-closing).
 * Object model: `$` = attributes, `_` = text, other keys = child elements (arrays => repeats).
 * `Date` values become UTC ISO-8601 (`xs:dateTime`). XML declaration / PIs are not supported.
 */
export function buildXml(object: unknown): string {
  if (object === undefined || object === null) {
    return '';
  }
  if (typeof object !== 'object' || object instanceof Date) {
    return encodeXmlValue(object);
  }
  if (Array.isArray(object)) {
    let out = '';
    for (const item of object) {
      out += buildXml(item);
    }
    return out;
  }

  let out = '';
  for (const [name, value] of Object.entries(object as Record<string, unknown>)) {
    out += renderElement(name, value);
  }
  return out;
}
