/**
 * Stack / indexOf XML parser for ONVIF SOAP.
 *
 * Normal mode: strip NS prefixes, camelCase, flatten attrs, trim text;
 * coerce leaf strings (`true`/`false`, numbers without leading zeros, ISO UTC dates).
 * `xsanyTree` mode: keep prefixes, `$` attrs, every element an array; **no** coercion (write-back).
 * `rawXML` tags (normal mode): camelCase flatten (coerced) + non-enumerable `xsany` (strings).
 * Under `rawXML`, children are dual-accumulated in one stack pass (normal + xsany), no re-parse.
 */
import { DATE_RE, NUMBER_RE } from './helpers';
import { xsany } from './toOnvifXMLSchemaObject';

/**
 * Coerce a trimmed XML text/attr string for ONVIF response trees.
 * `001` stays a string; `42` -> number; `true`/`false` -> boolean; `...T...Z` -> Date.
 * Fast path: skip NUMBER_RE / DATE_RE unless the first character looks numeric.
 */
function coerceXmlValue(value: string): string | number | boolean | Date {
  const len = value.length;
  if (len === 0) {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  const c0 = value.charCodeAt(0);
  // '-' then digit -> maybe number
  if (c0 === 0x2d) {
    if (len > 1 && NUMBER_RE.test(value)) {
      return Number.parseFloat(value);
    }
    return value;
  }
  // Digit -> maybe number or ISO UTC date
  if (c0 < 0x30 || c0 > 0x39) {
    return value;
  }
  if (NUMBER_RE.test(value)) {
    return Number.parseFloat(value);
  }
  // Cheap reject before DATE_RE: needs `T`, ends with `Z`, looks like YYYY-...
  if (
    len >= 20 &&
    value.charCodeAt(len - 1) === 0x5a &&
    value.charCodeAt(4) === 0x2d &&
    value.indexOf('T') !== -1 &&
    DATE_RE.test(value)
  ) {
    return new Date(value);
  }
  return value;
}

/** Cache localName -> camelCase key (ONVIF tag set is small and repeats heavily). */
const CAMEL_CACHE = new Map<string, string>();

/**
 * Lowercase the first letter only when the second char is a lowercase letter.
 * Keeps acronyms / digit-led tags as-is: `UTCDateTime`, `H264`, `G711DecOptions`, `MPEG4`.
 * Matches `camelCase()` in naming.ts (charCodes, no whole-string case ops).
 */
function toCamelCaseFast(local: string): string {
  const len = local.length;
  if (len === 0) {
    return local;
  }
  const c0 = local.charCodeAt(0);
  if (c0 >= 97 && c0 <= 122) {
    // Already lower-first (common after a prior camelCase pass / lowercase tags).
    return local;
  }
  if (len === 1) {
    return c0 >= 65 && c0 <= 90 ? String.fromCharCode(c0 + 32) : local.toLowerCase();
  }
  const c1 = local.charCodeAt(1);
  // Second is lowercase a-z -> VideoEncoder -> videoEncoder; else keep (H264, UTC...).
  if (c1 < 97 || c1 > 122) {
    return local;
  }
  if (c0 >= 65 && c0 <= 90) {
    return String.fromCharCode(c0 + 32) + local.slice(1);
  }
  return local.charAt(0).toLowerCase() + local.slice(1);
}

/** Strip `prefix:` then camelCase, with a process-wide cache. */
function elementKey(rawName: string): string {
  const colon = rawName.indexOf(':');
  const local = colon === -1 ? rawName : rawName.slice(colon + 1);
  const cached = CAMEL_CACHE.get(local);
  if (cached !== undefined) {
    return cached;
  }
  const key = toCamelCaseFast(local);
  CAMEL_CACHE.set(local, key);
  return key;
}

export interface ParseXmlOptions {
  /** Tag names (after camelCase / NS strip) that must always be arrays. */
  array?: string[];
  /**
   * Tag names (after camelCase / NS strip) that get a dual parse:
   * camelCase flatten on the object plus xml2js-style tree on `xsany`.
   */
  rawXML?: string[];
  /**
   * Parse the whole document as an `xsany` / write-back tree:
   * keep NS prefixes, put attrs in `$`, wrap every element in an array.
   */
  xsanyTree?: boolean;
}

const EMPTY_SET: ReadonlySet<string> = new Set();
const FORBIDDEN_NAMES: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);
function emptyMap(): Record<string, any> {
  return Object.create(null);
}

/**
 * Reject element/attribute names that would become dangerous object keys.
 * Checks the full name and the local part after `prefix:`.
 */
function assertSafeName(name: string): void {
  if (FORBIDDEN_NAMES.has(name)) {
    throw new Error(`Forbidden XML name: ${name}`);
  }
  const colon = name.indexOf(':');
  if (colon !== -1 && FORBIDDEN_NAMES.has(name.slice(colon + 1))) {
    throw new Error(`Forbidden XML name: ${name}`);
  }
}

/** Cache Sets by array identity (stable module-level option arrays). */
const TAG_SET_BY_ARRAY = new WeakMap<readonly string[], ReadonlySet<string>>();
/** Cache Sets by tag content (ephemeral `{ array: ['x'] }` literals). */
const TAG_SET_BY_KEY = new Map<string, ReadonlySet<string>>();
const TAG_SET_BY_KEY_MAX = 64;

/**
 * Reuse `Set` for `array` / `rawXML` option lists across `parseXml` calls.
 * Same array reference -> WeakMap hit; same tag list content -> string-key hit.
 */
function tagSetFrom(tags: readonly string[] | undefined): ReadonlySet<string> {
  if (tags === undefined || tags.length === 0) {
    return EMPTY_SET;
  }
  const byRef = TAG_SET_BY_ARRAY.get(tags);
  if (byRef !== undefined) {
    return byRef;
  }
  let key = tags[0]!;
  for (let i = 1; i < tags.length; i++) {
    key += `\0${tags[i]}`;
  }
  const byKey = TAG_SET_BY_KEY.get(key);
  if (byKey !== undefined) {
    TAG_SET_BY_ARRAY.set(tags, byKey);
    return byKey;
  }
  const set: ReadonlySet<string> = new Set(tags);
  TAG_SET_BY_ARRAY.set(tags, set);
  if (TAG_SET_BY_KEY.size >= TAG_SET_BY_KEY_MAX) {
    const oldest = TAG_SET_BY_KEY.keys().next().value;
    if (oldest !== undefined) {
      TAG_SET_BY_KEY.delete(oldest);
    }
  }
  TAG_SET_BY_KEY.set(key, set);
  return set;
}

const isWhitespace = (code: number): boolean => code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;

/**
 * Like `String.prototype.trim`, but skip the scan/alloc when edges are already non-ws
 * (common for ONVIF leaf text and pretty-printed element bodies with no padding).
 */
function trimXmlText(text: string): string {
  const len = text.length;
  if (len === 0) {
    return text;
  }
  if (!isWhitespace(text.charCodeAt(0)) && !isWhitespace(text.charCodeAt(len - 1))) {
    return text;
  }
  return text.trim();
}

/** True if `text` has any non-whitespace character (no alloc). */
function hasNonWhitespace(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (!isWhitespace(text.charCodeAt(i))) {
      return true;
    }
  }
  return false;
}

/** Name-start: A-Z a-z _ : */
const isNameStart = (code: number): boolean =>
  (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95 || code === 58;

/** Name char: name-start | 0-9 | . | - */
const isNameChar = (code: number): boolean =>
  isNameStart(code) || (code >= 48 && code <= 57) || code === 46 || code === 45;

function isXmlnsAttr(name: string): boolean {
  return name === 'xmlns' || name.startsWith('xmlns:');
}

/**
 * Expand XML entities in text/attr values.
 * Fast path: no `&` -> return the same string (common for ONVIF SOAP).
 * Unknown / invalid refs are left unchanged (tolerant vendor XML).
 */
function decodeEntities(text: string): string {
  let ampersand = text.indexOf('&');
  if (ampersand === -1) {
    return text;
  }
  let result = '';
  let last = 0;
  while (ampersand !== -1) {
    const semicolon = text.indexOf(';', ampersand + 1);
    if (semicolon === -1) {
      break;
    }
    const body = text.slice(ampersand + 1, semicolon);
    let decoded: string | undefined;
    switch (body) {
      case 'amp':
        decoded = '&';
        break;
      case 'lt':
        decoded = '<';
        break;
      case 'gt':
        decoded = '>';
        break;
      case 'quot':
        decoded = '"';
        break;
      case 'apos':
        decoded = "'";
        break;
      default: {
        if (body.charCodeAt(0) === 0x23) {
          const hex = body.charCodeAt(1) === 0x78 || body.charCodeAt(1) === 0x58;
          const digits = body.slice(hex ? 2 : 1);
          const code = Number.parseInt(digits, hex ? 16 : 10);
          if (Number.isFinite(code)) {
            try {
              decoded = String.fromCodePoint(code);
            } catch {
              decoded = undefined;
            }
          }
        }
      }
    }
    if (decoded !== undefined) {
      result += text.slice(last, ampersand) + decoded;
      last = semicolon + 1;
      ampersand = text.indexOf('&', last);
    } else {
      // Leave the `&...;` as-is; keep scanning after this `&`.
      ampersand = text.indexOf('&', ampersand + 1);
    }
  }
  return last === 0 ? text : result + text.slice(last);
}

/** True if `obj` has at least one own enumerable key (avoids `Object.keys` alloc). */
function hasOwnKeys(obj: Record<string, any>): boolean {
  for (const _key in obj) {
    return true;
  }
  return false;
}

/**
 * Assign a child onto a parent object (handles array / duplicate rules).
 * Uses `!== undefined` instead of `hasOwnProperty` (parser never stores undefined children).
 * @param parent - Object that receives the child property.
 * @param key - Child property name (camelCase or raw, depending on mode).
 * @param value - Parsed child value (string, object, or nested tree).
 * @param forceArray - Always wrap as a one-element array (`xsanyTree` / `array` option).
 *   Duplicates still become arrays even when `forceArray` is false.
 */
function assignChild(parent: Record<string, any>, key: string, value: unknown, forceArray: boolean): void {
  assertSafeName(key);
  const existing = parent[key];
  if (existing !== undefined) {
    if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      parent[key] = [existing, value];
    }
    return;
  }
  parent[key] = forceArray ? [value] : value;
}

/**
 * Finalize element value from collected text + children + attrs (normal mode).
 * Empty -> ''; text-only -> coerced scalar; else object with coerced attrs and optional `_`.
 * Reuses `children` / `attrs` maps when possible (frame is discarded after finalize).
 */
function finalizeNormal(
  attrs: Record<string, string> | undefined,
  children: Record<string, any> | undefined,
  textRaw: string,
): any {
  const text = trimXmlText(textRaw);
  const hasChildren = children !== undefined && hasOwnKeys(children);
  const hasAttrs = attrs !== undefined && hasOwnKeys(attrs);
  if (!hasChildren && !hasAttrs) {
    return text === '' ? text : coerceXmlValue(text);
  }
  // Attrs first, then children overwrite on key conflict (same as Object.assign order).
  if (hasChildren) {
    if (hasAttrs) {
      for (const key in attrs!) {
        // Same rule as assignChild: undefined means unset (never a stored child value).
        if (children![key] === undefined) {
          children![key] = coerceXmlValue(attrs![key]);
        }
      }
    }
    if (text !== '') {
      children!._ = coerceXmlValue(text);
    }
    return children;
  }
  for (const key in attrs!) {
    (attrs as Record<string, any>)[key] = coerceXmlValue(attrs![key]);
  }
  if (text !== '') {
    (attrs as Record<string, any>)._ = coerceXmlValue(text);
  }
  return attrs;
}

/**
 * xml2js-shaped finalize. Reuses `children` as the result object when present.
 */
function finalizeXml2js(
  attrs: Record<string, string> | undefined,
  children: Record<string, any> | undefined,
  textRaw: string,
): any {
  const text = trimXmlText(textRaw);
  const hasChildren = children !== undefined && hasOwnKeys(children);
  const hasAttrs = attrs !== undefined && hasOwnKeys(attrs);
  if (!hasChildren && !hasAttrs) {
    return text;
  }
  const obj = children ?? emptyMap();
  if (hasAttrs) {
    obj.$ = attrs;
  }
  if (text !== '') {
    obj._ = text;
  }
  return obj;
}

type Frame = {
  rawName: string;
  key: string;
  localCamel: string;
  flatAttrs: Record<string, string> | undefined;
  rawAttrs: Record<string, string> | undefined;
  /** Lazy: allocated on first child assign. */
  children: Record<string, any> | undefined;
  xsChildren: Record<string, any> | undefined;
  text: string;
  /** This open element is a rawXML host (`xsany` attached on close). */
  rawXML: boolean;
  /**
   * Inside a rawXML subtree: finalize both normal + xsany shapes and assign both
   * to the parent (one pass, no slice re-parse).
   */
  dual: boolean;
};

/**
 * Attach non-enumerable `xsany` write-back tree onto a normal-mode object.
 */
function attachXsany(parsed: Record<string, any>, xsAnyParsed: any, textRaw: string): Record<string, any> {
  let xs = xsAnyParsed;
  if (xs == null || xs === '') {
    xs = emptyMap();
  } else if (typeof xs !== 'object') {
    xs = emptyMap();
    xs._ = xsAnyParsed;
  }
  let hasElementChildren = false;
  for (const k in xs) {
    if (k !== '$' && k !== '_') {
      hasElementChildren = true;
      break;
    }
  }
  const text = trimXmlText(textRaw);
  if (!hasElementChildren && text !== '') {
    xs._ = text;
  }
  Object.defineProperty(parsed, xsany, {
    value: xs,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return parsed;
}

/**
 * Parse a document that is a single root element; return that element's key/value
 * (without the outer `{ key: value }` document wrap / root array wrap).
 */
function parseElementTree(xml: string, options?: ParseXmlOptions): { key: string; value: any } {
  const xsanyTree = options?.xsanyTree === true;
  const arrayTags = tagSetFrom(options?.array);
  const rawXMLTags = xsanyTree ? EMPTY_SET : tagSetFrom(options?.rawXML);

  const root: Frame = {
    rawName: '',
    key: '',
    localCamel: '',
    flatAttrs: undefined,
    rawAttrs: undefined,
    children: undefined,
    xsChildren: undefined,
    text: '',
    rawXML: false,
    dual: false,
  };
  const stack: Frame[] = [root];
  let current = root;
  let position = 0;
  let seenRoot = false;
  let rootKey = '';
  let rootValue: any;

  while (position < xml.length) {
    const lt = xml.indexOf('<', position);
    const textEnd = lt === -1 ? xml.length : lt;

    if (textEnd > position) {
      const chunk = decodeEntities(xml.slice(position, textEnd));
      if (current === root) {
        if (hasNonWhitespace(chunk)) {
          throw new Error('Text outside of the root element');
        }
      } else {
        current.text += chunk;
      }
    }
    if (lt === -1) {
      break;
    }

    const next = xml.charCodeAt(lt + 1);

    // <? ... ?> -- only a leading xml declaration is accepted (already stripped by caller).
    if (next === 0x3f) {
      throw new Error('Processing instructions are not allowed');
    }

    // <! ... -- CDATA only (no comments / DOCTYPE).
    if (next === 0x21) {
      if (xml.startsWith('<![CDATA[', lt)) {
        if (current === root) {
          throw new Error('CDATA outside of the root element');
        }
        const end = xml.indexOf(']]>', lt + 9);
        if (end === -1) {
          throw new Error('Unclosed CDATA');
        }
        current.text += xml.slice(lt + 9, end);
        position = end + 3;
        continue;
      }
      throw new Error('DOCTYPE and markup declarations are not allowed');
    }

    // </close>
    if (next === 0x2f) {
      const gt = xml.indexOf('>', lt + 2);
      if (gt === -1) {
        throw new Error('Unterminated closing tag');
      }
      const closeName = trimXmlText(xml.slice(lt + 2, gt));
      if (current === root || closeName !== current.rawName) {
        throw new Error(
          current === root
            ? `Unexpected closing tag </${closeName}>`
            : `Mismatched close tag </${closeName}>, expected </${current.rawName}>`,
        );
      }

      const closed = current;
      stack.pop();
      current = stack[stack.length - 1]!;

      const parentWantsDual = current.rawXML || current.dual;

      if (closed.rawXML) {
        let parsed = finalizeNormal(closed.flatAttrs, closed.children, closed.text);
        const xsAnyParsed = finalizeXml2js(closed.rawAttrs, closed.xsChildren, closed.text);
        if (parsed == null || parsed === '') {
          parsed = emptyMap();
        } else if (typeof parsed !== 'object') {
          const wrap = emptyMap();
          wrap._ = parsed;
          parsed = wrap;
        }
        const value = attachXsany(parsed, xsAnyParsed, closed.text);
        if (current === root) {
          seenRoot = true;
          rootKey = closed.key;
          rootValue = value;
        } else if (parentWantsDual) {
          assignChild((current.children ??= emptyMap()), closed.localCamel, value, arrayTags.has(closed.localCamel));
          assignChild((current.xsChildren ??= emptyMap()), closed.rawName, xsAnyParsed, true);
        } else {
          assignChild((current.children ??= emptyMap()), closed.key, value, arrayTags.has(closed.key));
        }
      } else if (closed.dual) {
        const normalVal = finalizeNormal(closed.flatAttrs, closed.children, closed.text);
        const xsVal = finalizeXml2js(closed.rawAttrs, closed.xsChildren, closed.text);
        assignChild((current.children ??= emptyMap()), closed.localCamel, normalVal, arrayTags.has(closed.localCamel));
        assignChild((current.xsChildren ??= emptyMap()), closed.rawName, xsVal, true);
      } else if (xsanyTree) {
        const value = finalizeXml2js(closed.rawAttrs, closed.children, closed.text);
        if (current === root) {
          seenRoot = true;
          rootKey = closed.key;
          rootValue = value;
        } else {
          assignChild((current.children ??= emptyMap()), closed.key, value, true);
        }
      } else {
        const value = finalizeNormal(closed.flatAttrs, closed.children, closed.text);
        if (current === root) {
          seenRoot = true;
          rootKey = closed.key;
          rootValue = value;
        } else {
          assignChild((current.children ??= emptyMap()), closed.key, value, arrayTags.has(closed.key));
        }
      }
      position = gt + 1;
      continue;
    }

    if (current === root && seenRoot) {
      throw new Error('Multiple root elements');
    }

    // Open tag: read name
    let cursor = lt + 1;
    if (!isNameStart(xml.charCodeAt(cursor))) {
      throw new Error(`Invalid name at position ${cursor}`);
    }
    const nameStart = cursor;
    cursor++;
    while (isNameChar(xml.charCodeAt(cursor))) {
      cursor++;
    }
    const rawName = xml.slice(nameStart, cursor);
    const localCamel = elementKey(rawName);
    const key = xsanyTree ? rawName : localCamel;
    // Reject before attrs / subtree work (covers camelCase forms like Constructor -> constructor).
    assertSafeName(rawName);
    assertSafeName(localCamel);
    const underDual = current.rawXML || current.dual;
    const isRawXML = !xsanyTree && rawXMLTags.has(localCamel);
    const isDual = underDual;

    let flatAttrs: Record<string, string> | undefined;
    let rawAttrs: Record<string, string> | undefined;
    let selfClosing = false;

    for (;;) {
      while (isWhitespace(xml.charCodeAt(cursor))) {
        cursor++;
      }
      const code = xml.charCodeAt(cursor);
      if (code === 0x3e) {
        cursor++;
        break;
      }
      if (code === 0x2f) {
        if (xml.charCodeAt(cursor + 1) !== 0x3e) {
          throw new Error(`Expected '>' after '/' at position ${cursor}`);
        }
        selfClosing = true;
        cursor += 2;
        break;
      }
      if (Number.isNaN(code)) {
        throw new Error(`Unterminated tag <${rawName}>`);
      }
      if (!isNameStart(code)) {
        throw new Error(`Invalid attribute name at position ${cursor}`);
      }

      const attrStart = cursor;
      cursor++;
      while (isNameChar(xml.charCodeAt(cursor))) {
        cursor++;
      }
      const attrName = xml.slice(attrStart, cursor);

      while (isWhitespace(xml.charCodeAt(cursor))) {
        cursor++;
      }
      if (xml.charCodeAt(cursor) !== 0x3d) {
        throw new Error(`Expected '=' after '${attrName}' at position ${cursor}`);
      }
      cursor++;
      while (isWhitespace(xml.charCodeAt(cursor))) {
        cursor++;
      }
      const quote = xml.charCodeAt(cursor);
      if (quote !== 0x22 && quote !== 0x27) {
        throw new Error(`Expected attribute quote at position ${cursor}`);
      }
      const q = quote === 0x22 ? '"' : "'";
      const valueEnd = xml.indexOf(q, cursor + 1);
      if (valueEnd === -1) {
        throw new Error('Unclosed attribute value');
      }
      const attrValue = decodeEntities(xml.slice(cursor + 1, valueEnd));
      cursor = valueEnd + 1;

      if (xsanyTree || isRawXML || isDual) {
        assertSafeName(attrName);
        (rawAttrs ??= emptyMap())[attrName] = attrValue;
      }
      if (!xsanyTree && !isXmlnsAttr(attrName)) {
        const flatKey = elementKey(attrName);
        assertSafeName(flatKey);
        (flatAttrs ??= emptyMap())[flatKey] = attrValue;
      }
    }

    if (selfClosing) {
      if (isRawXML) {
        // Self-closing rawXML: keep flat attr strings; attach xsany (reuse flatAttrs map).
        const value: Record<string, any> = flatAttrs !== undefined ? flatAttrs : emptyMap();
        let xsObj: Record<string, any>;
        if (rawAttrs === undefined || !hasOwnKeys(rawAttrs)) {
          xsObj = emptyMap();
        } else {
          xsObj = emptyMap();
          xsObj.$ = rawAttrs;
        }
        Object.defineProperty(value, xsany, {
          value: xsObj,
          writable: true,
          enumerable: false,
          configurable: true,
        });
        if (current === root) {
          seenRoot = true;
          rootKey = key;
          rootValue = value;
        } else if (underDual) {
          assignChild((current.children ??= emptyMap()), localCamel, value, arrayTags.has(localCamel));
          assignChild((current.xsChildren ??= emptyMap()), rawName, finalizeXml2js(rawAttrs, undefined, ''), true);
        } else {
          assignChild((current.children ??= emptyMap()), key, value, arrayTags.has(key));
        }
      } else if (isDual) {
        const normalVal =
          flatAttrs === undefined || !hasOwnKeys(flatAttrs) ? '' : finalizeNormal(flatAttrs, undefined, '');
        const xsVal = rawAttrs === undefined || !hasOwnKeys(rawAttrs) ? '' : finalizeXml2js(rawAttrs, undefined, '');
        assignChild((current.children ??= emptyMap()), localCamel, normalVal, arrayTags.has(localCamel));
        assignChild((current.xsChildren ??= emptyMap()), rawName, xsVal, true);
      } else if (xsanyTree) {
        const value = rawAttrs === undefined || !hasOwnKeys(rawAttrs) ? '' : finalizeXml2js(rawAttrs, undefined, '');
        if (current === root) {
          seenRoot = true;
          rootKey = key;
          rootValue = value;
        } else {
          assignChild((current.children ??= emptyMap()), key, value, true);
        }
      } else {
        const value = flatAttrs === undefined || !hasOwnKeys(flatAttrs) ? '' : finalizeNormal(flatAttrs, undefined, '');
        if (current === root) {
          seenRoot = true;
          rootKey = key;
          rootValue = value;
        } else {
          assignChild((current.children ??= emptyMap()), key, value, arrayTags.has(key));
        }
      }
      position = cursor;
      continue;
    }

    // Push open element frame (children / xsChildren allocated lazily on first child).
    const frame: Frame = {
      rawName,
      key,
      localCamel,
      flatAttrs,
      rawAttrs,
      children: undefined,
      xsChildren: undefined,
      text: '',
      rawXML: isRawXML,
      dual: isDual,
    };
    stack.push(frame);
    current = frame;
    position = cursor;
  }

  if (current !== root) {
    throw new Error(`Unclosed tag <${current.rawName}>`);
  }
  if (!seenRoot) {
    throw new Error('Start tag expected');
  }
  return { key: rootKey, value: rootValue };
}

/** Strip leading BOM and optional `<?xml ...?>` declaration (only PI we accept in SOAP). */
function stripXmlPreamble(xml: string): string {
  let s = xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml;
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) {
      break;
    }
    i++;
  }
  if (s.startsWith('<?xml', i)) {
    const close = s.indexOf('?>', i + 5);
    if (close === -1) {
      throw new Error('Unclosed XML declaration');
    }
    s = s.slice(close + 2);
  }
  return s;
}

/**
 * Parse an XML document into a JS tree for ONVIF SOAP.
 */
export function parseXml(xml: string, options?: ParseXmlOptions): any {
  if (typeof xml !== 'string') {
    throw new Error('XML data must be a string');
  }
  const { key, value } = parseElementTree(stripXmlPreamble(xml), options);
  // xsanyTree wraps every element in an array, including the document root.
  assertSafeName(key);
  const doc = emptyMap();
  doc[key] = options?.xsanyTree === true ? [value] : value;
  return doc;
}
