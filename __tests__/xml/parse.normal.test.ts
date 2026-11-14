/**
 * Feature: XML parsing -- normal (ONVIF response) mode
 *
 * Strip NS prefixes, camelCase names, flatten attributes onto the element,
 * coerce leaf strings (booleans / numbers / ISO UTC dates) during parse.
 */
import { parseXml, soapEnvelope, TT_NS } from '../../src/utils/xml';
import { xsany } from '../../src/utils/toOnvifXMLSchemaObject';

describe('Feature: XML parsing (normal mode)', () => {
  describe('Scenario: namespaces and naming', () => {
    it('strips namespace prefixes and camelCases tags', () => {
      const parsed = parseXml(
        soapEnvelope(
          `<tds:GetSystemDateAndTimeResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns:tt="${TT_NS}">` +
            `<tt:DateTimeType>Manual</tt:DateTimeType>` +
            `</tds:GetSystemDateAndTimeResponse>`,
        ),
      );
      expect(parsed.envelope.body.getSystemDateAndTimeResponse.dateTimeType).toBe('Manual');
    });

    it('preserves acronym-style names when the second letter is uppercase (UTCDateTime)', () => {
      const parsed = parseXml(
        soapEnvelope(`<R><tt:UTCDateTime xmlns:tt="${TT_NS}" ZONE="Earth"><tt:Hour>1</tt:Hour></tt:UTCDateTime></R>`),
      );
      expect(parsed.envelope.body.r.UTCDateTime).toEqual({
        hour: 1,
        ZONE: 'Earth',
      });
    });

    it('camelCases attribute names and flattens them onto the element (no $ bag)', () => {
      const parsed = parseXml(soapEnvelope('<R><Self FooBar="1"/></R>'));
      expect(parsed.envelope.body.r.self).toEqual({ fooBar: 1 });
      expect(parsed.envelope.body.r.self.$).toBeUndefined();
    });

    it('drops xmlns and xmlns:* attributes in normal mode', () => {
      const parsed = parseXml(
        soapEnvelope(`<R xmlns:tt="${TT_NS}" xmlns="http://default"><Self tt:foo="1" Kind="x"/></R>`),
      );
      expect(parsed.envelope.body.r.xmlns).toBeUndefined();
      expect(parsed.envelope.body.r.self).toEqual({ foo: 1, kind: 'x' });
    });
  });

  describe('Scenario: text, empty, and mixed content', () => {
    it('returns element text as a string when there are no attributes or children', () => {
      const parsed = parseXml(soapEnvelope('<R><Token>abc</Token></R>'));
      expect(parsed.envelope.body.r.token).toBe('abc');
    });

    it('trims leading and trailing whitespace in text values', () => {
      const parsed = parseXml(soapEnvelope('<R><T>  hi  </T></R>'));
      expect(parsed.envelope.body.r.t).toBe('hi');
    });

    it('maps empty / self-closing elements to an empty string', () => {
      const parsed = parseXml(soapEnvelope('<R><Empty/><Also></Also></R>'));
      expect(parsed.envelope.body.r.empty).toBe('');
      expect(parsed.envelope.body.r.also).toBe('');
    });

    it('puts text in _ when the element also has attributes or children', () => {
      const parsed = parseXml(soapEnvelope('<R><Mixed b="2">txt<Child>c</Child></Mixed></R>'));
      expect(parsed.envelope.body.r.mixed).toEqual({
        child: 'c',
        _: 'txt',
        b: 2,
      });
    });
  });

  describe('Scenario: type coercion of leaf strings', () => {
    it('coerces numbers, booleans, and ISO UTC dates', () => {
      const parsed = parseXml(
        soapEnvelope(
          '<R>' +
            '<Count>2</Count>' +
            '<Flag>true</Flag>' +
            '<Off>false</Off>' +
            '<When>2015-01-20T16:33:03Z</When>' +
            '<Neg>-1.5</Neg>' +
            '<Pad>001</Pad>' +
            '<Day>2026-11-14</Day>' +
            '</R>',
        ),
      );
      const r = parsed.envelope.body.r;
      expect(r.count).toBe(2);
      expect(r.flag).toBe(true);
      expect(r.off).toBe(false);
      expect(r.when).toEqual(new Date('2015-01-20T16:33:03Z'));
      expect(r.neg).toBe(-1.5);
      // Leading zeros and date-only (no T...Z) stay strings.
      expect(r.pad).toBe('001');
      expect(r.day).toBe('2026-11-14');
    });

    it('coerces attribute values the same way', () => {
      const parsed = parseXml(soapEnvelope('<R><Cell Columns="13" Rows="18" Flag="true"/></R>'));
      expect(parsed.envelope.body.r.cell).toEqual({ columns: 13, rows: 18, flag: true });
    });
  });

  describe('Scenario: repeated tags and array option', () => {
    it('collects duplicate sibling tags into an array even without array option', () => {
      const parsed = parseXml(soapEnvelope('<R><Item>1</Item><Item>2</Item></R>'));
      expect(parsed.envelope.body.r.item).toEqual([1, 2]);
    });

    it('keeps a single occurrence as a scalar unless listed in array', () => {
      const parsed = parseXml(soapEnvelope('<R><Item>1</Item></R>'));
      expect(parsed.envelope.body.r.item).toBe(1);
    });

    it('forces a singleton into an array when the tag is listed in array', () => {
      const parsed = parseXml(soapEnvelope('<R><Item>1</Item></R>'), { array: ['item'] });
      expect(parsed.envelope.body.r.item).toEqual([1]);
    });

    it('uses camelCase tag names in the array option', () => {
      const parsed = parseXml(soapEnvelope('<R><ElementItem>a</ElementItem></R>'), {
        array: ['elementItem'],
      });
      expect(parsed.envelope.body.r.elementItem).toEqual(['a']);
    });
  });

  describe('Scenario: entities and CDATA', () => {
    it('decodes XML entities in text', () => {
      const parsed = parseXml(soapEnvelope('<R><T>&lt;esc&gt; &amp; ok</T></R>'));
      expect(parsed.envelope.body.r.t).toBe('<esc> & ok');
    });

    it('unwraps CDATA as text content', () => {
      const parsed = parseXml(soapEnvelope('<R><T><![CDATA[<raw>&]]></T></R>'));
      expect(parsed.envelope.body.r.t).toBe('<raw>&');
    });

    it('merges interleaved text, entities, and multiple CDATA sections', () => {
      const parsed = parseXml(
        soapEnvelope('<R><T>a&amp;b<![CDATA[<x>]]><![CDATA[&]]>c</T></R>'),
      );
      expect(parsed.envelope.body.r.t).toBe('a&b<x>&c');
    });
  });

  describe('Scenario: rawXML dual parse (camelCase + xsany)', () => {
    it('parses children as camelCase and attaches xml2js xsany', () => {
      const parsed = parseXml(
        soapEnvelope(
          '<R><ElementItem Name="Layout"><tt:CellLayout Columns="13"/></ElementItem></R>',
        ),
        { rawXML: ['elementItem'] },
      );
      const item = parsed.envelope.body.r.elementItem;
      expect(item.name).toBe('Layout');
      expect(item.cellLayout).toEqual({ columns: 13 });
      expect(item[xsany]).toEqual({
        $: { Name: 'Layout' },
        'tt:CellLayout': [{ $: { Columns: '13' } }],
      });
      expect(Object.getOwnPropertyDescriptor(item, xsany)?.enumerable).toBe(false);
    });

    it('still flattens attributes of the rawXML node onto the object', () => {
      const parsed = parseXml(soapEnvelope('<R><ElementItem Name="x"/></R>'), {
        rawXML: ['elementItem'],
      });
      const item = parsed.envelope.body.r.elementItem;
      expect(item.name).toBe('x');
      expect(item[xsany]).toEqual({ $: { Name: 'x' } });
    });
  });

  describe('Scenario: XML declaration and BOM', () => {
    it('strips the leading <?xml ...?> declaration', () => {
      const parsed = parseXml('<?xml version="1.0" encoding="utf-8"?><R>ok</R>');
      expect(parsed).toEqual({ r: 'ok' });
    });

    // XiongMai / XM firmwares sometimes prepend UTF-8 BOM before the declaration.
    it('strips a leading UTF-8 BOM before the root element', () => {
      const parsed = parseXml('\uFEFF<R>ok</R>');
      expect(parsed).toEqual({ r: 'ok' });
    });

    it('strips BOM then <?xml ...?> (XiongMai-style preamble)', () => {
      const parsed = parseXml('\uFEFF<?xml version="1.0" encoding="utf-8"?><R>ok</R>');
      expect(parsed).toEqual({ r: 'ok' });
    });
  });

  describe('Scenario: malformed input', () => {
    it('throws on a lone open angle bracket', () => {
      expect(() => parseXml('<')).toThrow();
    });
  });

});
