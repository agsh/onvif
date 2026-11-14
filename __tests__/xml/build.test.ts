/**
 * Feature: XML serialization (buildXml)
 *
 * Compact XML for ONVIF SOAP: `$` = attributes, `_` = text, other keys = children.
 * No pretty-print (cameras like Pelco reject indented envelopes -- #497).
 */
import { buildXml, SOAP_NS, TDS_NS } from '../../src/utils/xml';

describe('Feature: XML serialization (buildXml)', () => {
  describe('Scenario: attributes and text via $ / _', () => {
    it('emits attributes from $ and text from _', () => {
      expect(
        buildXml({
          Password: {
            $: { Type: 'http://example#PasswordDigest' },
            _: 'base64digest',
          },
        }),
      ).toBe('<Password Type="http://example#PasswordDigest">base64digest</Password>');
    });

    it('emits attribute-only elements as self-closing', () => {
      expect(buildXml({ Self: { $: { a: '1' } } })).toBe('<Self a="1"/>');
    });

    it('emits boolean true attributes as name="true" (valid XML, not HTML bare flags)', () => {
      expect(buildXml({ Configuration: { $: { enabled: true } } })).toBe(
        '<Configuration enabled="true"/>',
      );
      expect(buildXml({ Configuration: { $: { enabled: 'true' } } })).toBe(
        '<Configuration enabled="true"/>',
      );
    });

    it('emits boolean false attributes as name="false"', () => {
      expect(buildXml({ Configuration: { $: { enabled: false } } })).toBe(
        '<Configuration enabled="false"/>',
      );
    });

    it('emits mixed attributes, children, and text', () => {
      expect(
        buildXml({
          Parent: {
            $: { a: '1' },
            Z: 'z',
            A: 'a',
            _: 'text',
          },
        }),
      ).toBe('<Parent a="1"><Z>z</Z><A>a</A>text</Parent>');
    });
  });

  describe('Scenario: empty / missing children', () => {
    it('serializes empty string, null, and {} as self-closing tags', () => {
      expect(buildXml({ Item: '' })).toBe('<Item/>');
      expect(buildXml({ Item: null })).toBe('<Item/>');
      expect(buildXml({ Item: {} })).toBe('<Item/>');
    });

    it('omits undefined children', () => {
      expect(buildXml({ A: { B: undefined, C: 'c' } })).toBe('<A><C>c</C></A>');
    });

    it('keeps 0 and false as text content; empty string child is self-closing', () => {
      expect(buildXml({ A: { N: 0, S: '', B: false } })).toBe('<A><N>0</N><S/><B>false</B></A>');
    });
  });

  describe('Scenario: repeated child elements', () => {
    it('repeats a tag for each array entry (string values)', () => {
      expect(buildXml({ Parent: { Child: ['a', 'b'] } })).toBe('<Parent><Child>a</Child><Child>b</Child></Parent>');
    });

    it('repeats a tag for each array entry (object values with _)', () => {
      expect(buildXml({ Parent: { Child: [{ _: 'a' }, { _: 'b' }] } })).toBe(
        '<Parent><Child>a</Child><Child>b</Child></Parent>',
      );
    });
  });

  describe('Scenario: namespaces and prefixes', () => {
    it('preserves prefixed tag names and xmlns attributes', () => {
      expect(
        buildXml({
          's:Envelope': {
            $: { 'xmlns:s': SOAP_NS },
            's:Body': {
              GetHostname: { $: { xmlns: TDS_NS } },
            },
          },
        }),
      ).toBe(`<s:Envelope xmlns:s="${SOAP_NS}"><s:Body><GetHostname xmlns="${TDS_NS}"/></s:Body></s:Envelope>`);
    });

    it('preserves tt: children under a namespaced parent', () => {
      expect(
        buildXml({
          'tt:Foo': {
            $: { 'xmlns:tt': 'http://www.onvif.org/ver10/schema' },
            'tt:Bar': '1',
          },
        }),
      ).toBe('<tt:Foo xmlns:tt="http://www.onvif.org/ver10/schema"><tt:Bar>1</tt:Bar></tt:Foo>');
    });
  });

  describe('Scenario: escaping', () => {
    it('escapes special characters in text content', () => {
      expect(buildXml({ A: { _: `a<b>&"'` } })).toBe('<A>a&lt;b&gt;&amp;&quot;&apos;</A>');
    });

    it('escapes special characters in attribute values', () => {
      expect(buildXml({ A: { $: { x: 'a"b&c<d' } } })).toBe('<A x="a&quot;b&amp;c&lt;d"/>');
    });
  });

  describe('Scenario: scalars as element content', () => {
    it('stringifies numbers and booleans as text', () => {
      expect(buildXml({ A: { N: 12, F: 1.5, B: true } })).toBe('<A><N>12</N><F>1.5</F><B>true</B></A>');
    });

    it('serializes Date as UTC ISO-8601 xs:dateTime', () => {
      const when = new Date('2015-01-20T16:33:03.000Z');
      expect(buildXml({ StartPoint: when })).toBe('<StartPoint>2015-01-20T16:33:03.000Z</StartPoint>');
      expect(buildXml({ A: { _: when } })).toBe('<A>2015-01-20T16:33:03.000Z</A>');
      expect(buildXml({ A: { $: { t: when } } })).toBe('<A t="2015-01-20T16:33:03.000Z"/>');
    });
  });

  describe('Scenario: compact output', () => {
    it('does not pretty-print or insert insignificant whitespace between tags', () => {
      const xml = buildXml({
        Root: {
          A: { B: '1' },
          C: '2',
        },
      });
      expect(xml).toBe('<Root><A><B>1</B></A><C>2</C></Root>');
      expect(xml).not.toMatch(/>\s+</);
    });

    it('does not emit an XML declaration (callers prepend it if needed)', () => {
      expect(buildXml({ Root: { A: 1 } })).toBe('<Root><A>1</A></Root>');
      expect(buildXml({ Root: { A: 1 } })).not.toMatch(/^<\?xml/);
    });
  });

  describe('Scenario: suppressEmptyNode', () => {
    it('collapses empty elements rather than emitting open/close pairs', () => {
      expect(buildXml({ GetFoo: { $: { xmlns: TDS_NS } } })).toBe(`<GetFoo xmlns="${TDS_NS}"/>`);
    });
  });
});
