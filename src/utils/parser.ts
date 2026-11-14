/**
 * Character-level XML parser for ONVIF SOAP.
 *
 * Normal mode: strip NS prefixes, camelCase, flatten attrs, trim text;
 * coerce leaf strings (`true`/`false`, numbers without leading zeros, ISO UTC dates).
 * `xsanyTree` mode: keep prefixes, `$` attrs, every element an array; **no** coercion (write-back).
 * `rawXML` tags (normal mode): camelCase flatten (coerced) + non-enumerable `xsany` (strings).
 */
import { DATE_RE, NUMBER_RE } from './helpers';
import { toCamelCase } from './naming';
import { xsany } from './toOnvifXMLSchemaObject';

/**
 * Coerce a trimmed XML text/attr string for ONVIF response trees.
 * `001` stays a string; `42` -> number; `true`/`false` -> boolean; `...T...Z` -> Date.
 */
function coerceXmlValue(value: string): string | number | boolean | Date {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (NUMBER_RE.test(value)) {
    return Number.parseFloat(value);
  }
  if (DATE_RE.test(value)) {
    return new Date(value);
  }
  return value;
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

const NAME_START = /[A-Za-z_:]/;
const NAME_CHAR = /[A-Za-z0-9._:-]/;
const ENTITY_RE = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;

function isXmlnsAttr(name: string): boolean {
  return name === 'xmlns' || name.startsWith('xmlns:');
}

function stripPrefix(name: string): string {
  const i = name.indexOf(':');
  return i === -1 ? name : name.slice(i + 1);
}

function decodeEntities(text: string): string {
  return text.replace(ENTITY_RE, (match, body: string) => {
    if (body.charAt(0) === '#') {
      const code =
        body.charAt(1) === 'x' || body.charAt(1) === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code)) {
        return match;
      }
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    switch (body) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        return match;
    }
  });
}

class XmlReader {
  readonly xml: string;
  i = 0;
  readonly xml2js: boolean;
  readonly arrayTags: Set<string>;
  readonly rawXMLTags: Set<string>;

  constructor(xml: string, options?: ParseXmlOptions) {
    this.xml = xml;
    this.xml2js = options?.xsanyTree === true;
    this.arrayTags = new Set(options?.array ?? []);
    this.rawXMLTags = new Set(options?.rawXML ?? []);
  }

  private get end(): boolean {
    return this.i >= this.xml.length;
  }

  private peek(): string {
    return this.xml.charAt(this.i);
  }

  private advance(): string {
    return this.xml.charAt(this.i++);
  }

  private startsWith(s: string): boolean {
    return this.xml.startsWith(s, this.i);
  }

  private skipWs(): void {
    while (!this.end) {
      const c = this.peek();
      if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
        break;
      }
      this.i++;
    }
  }

  private expect(ch: string): void {
    if (this.advance() !== ch) {
      throw new Error(`Expected '${ch}' at position ${this.i - 1}`);
    }
  }

  private readName(): string {
    if (!NAME_START.test(this.peek())) {
      throw new Error(`Invalid name at position ${this.i}`);
    }
    const start = this.i;
    this.i++;
    while (!this.end && NAME_CHAR.test(this.peek())) {
      this.i++;
    }
    return this.xml.slice(start, this.i);
  }

  /** Skip until `end` (exclusive of end marker length handling by caller). */
  private indexOf(marker: string, from = this.i): number {
    return this.xml.indexOf(marker, from);
  }

  /**
   * Lex `<![CDATA[...]]>` into ordinary character data (entities are not expanded inside CDATA).
   * Kept for vendor / `xs:any` extensions and quirky NVR firmware.
   */
  private readCdataText(): string {
    if (!this.startsWith('<![CDATA[')) {
      throw new Error('Expected CDATA');
    }
    this.i += 9;
    const close = this.indexOf(']]>');
    if (close === -1) {
      throw new Error('Unclosed CDATA');
    }
    const text = this.xml.slice(this.i, close);
    this.i = close + 3;
    return text;
  }

  /**
   * Next text token inside an element: CDATA (literal) or character data until `<` (entity-decoded).
   * Returns null when the next token is a markup tag (caller handles elements / close).
   */
  private readTextToken(): string | null {
    if (this.startsWith('<![CDATA[')) {
      return this.readCdataText();
    }
    if (this.end || this.peek() === '<') {
      return null;
    }
    const start = this.i;
    const next = this.indexOf('<', start);
    const end = next === -1 ? this.xml.length : next;
    this.i = end;
    return decodeEntities(this.xml.slice(start, end));
  }

  private parseAttributes(): { raw: Record<string, string>; flat: Record<string, string> } {
    const raw: Record<string, string> = {};
    const flat: Record<string, string> = {};
    for (;;) {
      this.skipWs();
      if (this.end || this.peek() === '/' || this.peek() === '>') {
        break;
      }
      const name = this.readName();
      this.skipWs();
      this.expect('=');
      this.skipWs();
      const quote = this.advance();
      if (quote !== '"' && quote !== "'") {
        throw new Error(`Expected attribute quote at position ${this.i - 1}`);
      }
      const start = this.i;
      const end = this.indexOf(quote, start);
      if (end === -1) {
        throw new Error('Unclosed attribute value');
      }
      const value = decodeEntities(this.xml.slice(start, end));
      this.i = end + 1;
      raw[name] = value;
      if (!isXmlnsAttr(name)) {
        flat[toCamelCase(stripPrefix(name))] = value;
      }
    }
    return { raw, flat };
  }

  /**
   * Assign a child onto a parent object (handles array / duplicate rules).
   * @param parent - Object that receives the child property.
   * @param key - Child property name (camelCase or raw, depending on mode).
   * @param value - Parsed child value (string, object, or nested tree).
   * @param forceArray - Always wrap as a one-element array (`xsanyTree` / `array` option).
   *   Duplicates still become arrays even when `forceArray` is false.
   */
  private assignChild(parent: Record<string, any>, key: string, value: unknown, forceArray: boolean): void {
    if (Object.prototype.hasOwnProperty.call(parent, key)) {
      const existing = parent[key];
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
   */
  private finalizeNormal(attrs: Record<string, string>, children: Record<string, any>, texts: string[]): any {
    const text = texts.join('').trim();
    const childKeys = Object.keys(children);
    const attrKeys = Object.keys(attrs);
    if (childKeys.length === 0 && attrKeys.length === 0) {
      return text === '' ? text : coerceXmlValue(text);
    }
    const obj: Record<string, any> = {};
    for (const key of attrKeys) {
      obj[key] = coerceXmlValue(attrs[key]);
    }
    Object.assign(obj, children);
    if (text !== '') {
      obj._ = coerceXmlValue(text);
    }
    return obj;
  }

  private finalizeXml2js(attrs: Record<string, string>, children: Record<string, any>, texts: string[]): any {
    const text = texts.join('').trim();
    const childKeys = Object.keys(children);
    const attrKeys = Object.keys(attrs);
    if (childKeys.length === 0 && attrKeys.length === 0) {
      return text;
    }
    const obj: Record<string, any> = { ...children };
    if (attrKeys.length) {
      obj.$ = attrs;
    }
    if (text !== '') {
      obj._ = text;
    }
    return obj;
  }

  /**
   * Walk element content until matching close tag.
   * Text tokens (CDATA / char data / entities) go to `onText`; child elements to `onChild`.
   * Mixed content may interleave plain text, entities, and several CDATA sections.
   * ONVIF SOAP has no comments / DOCTYPE / mid-document PIs.
   */
  private walkElementContent(rawName: string, onChild: () => void, onText: (text: string) => void): void {
    for (;;) {
      if (this.end) {
        throw new Error(`Unclosed tag <${rawName}>`);
      }
      if (this.startsWith('</')) {
        this.i += 2;
        const closeName = this.readName();
        this.skipWs();
        this.expect('>');
        if (closeName !== rawName) {
          throw new Error(`Mismatched close tag </${closeName}>, expected </${rawName}>`);
        }
        return;
      }
      const text = this.readTextToken();
      if (text !== null) {
        onText(text);
        continue;
      }
      if (this.peek() === '<') {
        onChild();
        continue;
      }
      throw new Error(`Unexpected content in <${rawName}> at position ${this.i}`);
    }
  }

  /** Parse one element starting at `<`. */
  private parseElement(): { name: string; key: string; value: any; xsValue?: any } {
    this.expect('<');
    const rawName = this.readName();
    const localCamel = toCamelCase(stripPrefix(rawName));
    const key = this.xml2js ? rawName : localCamel;
    const { raw: rawAttrs, flat: flatAttrs } = this.parseAttributes();
    this.skipWs();

    // Self-closing
    if (this.peek() === '/') {
      this.advance();
      this.expect('>');
      if (this.xml2js) {
        const value = Object.keys(rawAttrs).length === 0 ? '' : this.finalizeXml2js(rawAttrs, {}, []);
        return { name: rawName, key, value };
      }
      if (this.rawXMLTags.has(localCamel)) {
        // rawXML nodes are always objects so `xsany` can be attached (even when empty).
        const value: Record<string, any> = { ...flatAttrs };
        const xsObj: Record<string, any> = Object.keys(rawAttrs).length === 0 ? {} : { $: rawAttrs };
        Object.defineProperty(value, xsany, {
          value: xsObj,
          writable: true,
          enumerable: false,
          configurable: true,
        });
        return { name: rawName, key, value };
      }
      const value = Object.keys(flatAttrs).length === 0 ? '' : this.finalizeNormal(flatAttrs, {}, []);
      return { name: rawName, key, value };
    }

    this.expect('>');

    // rawXML: build camelCase + xsany in one pass over children
    if (!this.xml2js && this.rawXMLTags.has(localCamel)) {
      return this.parseRawXmlElement(rawName, key, rawAttrs, flatAttrs);
    }

    const children: Record<string, any> = {};
    const texts: string[] = [];

    this.walkElementContent(
      rawName,
      () => {
        const child = this.parseElement();
        const forceArray = this.xml2js || this.arrayTags.has(child.key);
        // xml2js stores empty text-only as string inside array via assign
        this.assignChild(children, child.key, child.value, forceArray);
      },
      (text) => texts.push(text),
    );

    if (this.xml2js) {
      return {
        name: rawName,
        key,
        value: this.finalizeXml2js(rawAttrs, children, texts),
      };
    }
    return {
      name: rawName,
      key,
      value: this.finalizeNormal(flatAttrs, children, texts),
    };
  }

  /**
   * Dual-parse children of a rawXML tag: normal camelCase object + xml2js xsany tree.
   */
  private parseRawXmlElement(
    rawName: string,
    key: string,
    rawAttrs: Record<string, string>,
    flatAttrs: Record<string, string>,
  ): { name: string; key: string; value: any } {
    const normalChildren: Record<string, any> = {};
    const xsChildren: Record<string, any> = {};
    const texts: string[] = [];

    // Single pass: for each child element, take its slice and dual-parse (normal + xsanyTree).
    this.walkElementContent(
      rawName,
      () => {
        const start = this.i;
        const extentEnd = this.skipElementExtent();
        const slice = this.xml.slice(start, extentEnd);
        const normal = new XmlReader(slice, { array: [...this.arrayTags] }).parseDocumentElement();
        const xs = new XmlReader(slice, { xsanyTree: true }).parseDocumentElement();
        this.assignChild(normalChildren, normal.key, normal.value, this.arrayTags.has(normal.key));
        this.assignChild(xsChildren, xs.key, xs.value, true);
      },
      (text) => texts.push(text),
    );

    let parsed = this.finalizeNormal(flatAttrs, normalChildren, texts);
    let xsAnyParsed = this.finalizeXml2js(rawAttrs, xsChildren, texts);

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

    // Text-only: keep `_` on xsany when there are no element children
    const hasElementChildren = Object.keys(xsAnyParsed).some((k) => k !== '$' && k !== '_');
    const text = texts.join('').trim();
    if (!hasElementChildren && text !== '') {
      xsAnyParsed._ = text;
    }

    Object.defineProperty(parsed, xsany, {
      value: xsAnyParsed,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    return { name: rawName, key, value: parsed };
  }

  /** Advance past one full element (start at `<`), return end index. */
  private skipElementExtent(): number {
    this.expect('<');
    const name = this.readName();
    // skip attrs
    for (;;) {
      this.skipWs();
      if (this.peek() === '/' || this.peek() === '>') {
        break;
      }
      this.readName();
      this.skipWs();
      this.expect('=');
      this.skipWs();
      const q = this.advance();
      const end = this.indexOf(q, this.i);
      if (end === -1) {
        throw new Error('Unclosed attribute in element extent');
      }
      this.i = end + 1;
    }
    this.skipWs();
    if (this.peek() === '/') {
      this.advance();
      this.expect('>');
      return this.i;
    }
    this.expect('>');
    for (;;) {
      if (this.end) {
        throw new Error(`Unclosed tag <${name}> while scanning extent`);
      }
      if (this.startsWith('</')) {
        this.i += 2;
        const closeName = this.readName();
        this.skipWs();
        this.expect('>');
        if (closeName !== name) {
          throw new Error(`Mismatched close </${closeName}> in extent`);
        }
        return this.i;
      }
      if (this.startsWith('<![CDATA[')) {
        this.readCdataText();
        continue;
      }
      if (this.peek() === '<') {
        this.skipElementExtent();
        continue;
      }
      const next = this.indexOf('<', this.i);
      this.i = next === -1 ? this.xml.length : next;
    }
  }

  /** Parse a document that is a single root element. */
  private parseDocumentElement(): { name: string; key: string; value: any } {
    this.skipWs();
    if (this.peek() !== '<') {
      throw new Error('Expected element');
    }
    return this.parseElement();
  }

  parseDocument(): any {
    this.skipWs();
    if (this.end || this.peek() !== '<') {
      throw new Error('Start tag expected');
    }
    const root = this.parseElement();
    this.skipWs();
    // xml2js mode wraps every element in an array, including the document root.
    return { [root.key]: this.xml2js ? [root.value] : root.value };
  }
}

/** Strip leading BOM and optional `<?xml ...?>` declaration (only PI we accept in SOAP). */
function stripXmlPreamble(xml: string): string {
  let s = xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml;
  let i = 0;
  while (i < s.length) {
    const c = s.charAt(i);
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    break;
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
  return new XmlReader(stripXmlPreamble(xml), options).parseDocument();
}
