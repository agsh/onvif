/**
 * Feature: XML parsing -- xsanyTree mode
 *
 * Used to build xsany trees for write-back: keep prefixes, `$` for attrs,
 * every element value is an array (except the attribute bag).
 */
import { parseXml, soapEnvelope, TT_NS } from '../../src/utils/xml';

describe('Feature: XML parsing (xsanyTree mode)', () => {
  const xml2js = { xsanyTree: true as const };

  describe('Scenario: preserve names and structure', () => {
    it('keeps namespace prefixes on element names', () => {
      const parsed = parseXml(
        soapEnvelope(`<tt:CellLayout xmlns:tt="${TT_NS}" Columns="13"><tt:Scale x="0.1"/></tt:CellLayout>`),
        xml2js,
      );
      const layout = parsed['s:Envelope'][0]['s:Body'][0]['tt:CellLayout'][0];
      expect(layout.$).toEqual({
        'xmlns:tt': TT_NS,
        Columns: '13',
      });
      expect(layout['tt:Scale']).toEqual([{ $: { x: '0.1' } }]);
    });

    it('puts attributes in $ and does not camelCase names', () => {
      const parsed = parseXml(soapEnvelope('<R><Self FooBar="1"/></R>'), xml2js);
      expect(parsed['s:Envelope'][0]['s:Body'][0].R[0].Self[0]).toEqual({
        $: { FooBar: '1' },
      });
    });

    it('wraps every element in an array', () => {
      const parsed = parseXml(soapEnvelope('<R><Token>a</Token><Token>b</Token></R>'), xml2js);
      const r = parsed['s:Envelope'][0]['s:Body'][0].R[0];
      expect(r.Token).toEqual(['a', 'b']);
    });

    it('wraps a singleton element in a one-element array', () => {
      const parsed = parseXml(soapEnvelope('<R><Token>a</Token></R>'), xml2js);
      expect(parsed['s:Envelope'][0]['s:Body'][0].R[0].Token).toEqual(['a']);
    });
  });

  describe('Scenario: text and mixed content', () => {
    it('stores plain text as a string array entry', () => {
      const parsed = parseXml(soapEnvelope('<R><T>hi</T></R>'), xml2js);
      expect(parsed['s:Envelope'][0]['s:Body'][0].R[0].T).toEqual(['hi']);
    });

    it('uses _ for text when attributes or children are present', () => {
      const parsed = parseXml(soapEnvelope('<R><Mixed b="2">txt<Child>c</Child></Mixed></R>'), xml2js);
      expect(parsed['s:Envelope'][0]['s:Body'][0].R[0].Mixed[0]).toEqual({
        Child: ['c'],
        _: 'txt',
        $: { b: '2' },
      });
    });

    it('maps empty elements to [""]', () => {
      const parsed = parseXml(soapEnvelope('<R><Empty/></R>'), xml2js);
      expect(parsed['s:Envelope'][0]['s:Body'][0].R[0].Empty).toEqual(['']);
    });
  });

  describe('Scenario: no type coercion', () => {
    it('keeps numeric-looking text as strings inside arrays', () => {
      const parsed = parseXml(soapEnvelope('<R><N>13</N><F>true</F></R>'), xml2js);
      const r = parsed['s:Envelope'][0]['s:Body'][0].R[0];
      expect(r.N).toEqual(['13']);
      expect(r.F).toEqual(['true']);
    });
  });

  describe('Scenario: vendor-style fragment for xsany', () => {
    it('parses a CellLayout fragment the way hydrateStopNode expects', () => {
      const inner =
        `<tt:CellLayout Columns="13" Rows="18" xmlns:tt="${TT_NS}">` +
        `<tt:Transformation>` +
        `<tt:Translate x="-1.000000" y="-1.000000"/>` +
        `<tt:Scale x="0.090909" y="0.111111"/>` +
        `</tt:Transformation>` +
        `</tt:CellLayout>`;
      const parsed = parseXml(`<root>${inner}</root>`, xml2js);
      const root = Array.isArray(parsed.root) ? parsed.root[0] : parsed.root;
      expect(root['tt:CellLayout']).toEqual([
        {
          $: { Columns: '13', Rows: '18', 'xmlns:tt': TT_NS },
          'tt:Transformation': [
            {
              'tt:Translate': [{ $: { x: '-1.000000', y: '-1.000000' } }],
              'tt:Scale': [{ $: { x: '0.090909', y: '0.111111' } }],
            },
          ],
        },
      ]);
    });
  });
});
