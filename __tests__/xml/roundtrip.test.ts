/**
 * Feature: buildXml <-> parseXml roundtrips that ONVIF write-back depends on
 *
 * xml2js mode is the path used for xsany reconstruct; normal mode is lossy
 * (camelCase + NS strip) so roundtrips go through xml2js where fidelity matters.
 */
import { buildXml, parseXml, SOAP_NS, TDS_NS, TT_NS } from '../../src/utils/xml';

describe('Feature: XML roundtrip', () => {
  const xml2js = { xsanyTree: true as const };

  describe('Scenario: request envelope build is stable', () => {
    it('builds the same compact SOAP envelope twice', () => {
      const tree = {
        's:Envelope': {
          $: { 'xmlns:s': SOAP_NS },
          's:Body': {
            GetHostname: { $: { xmlns: TDS_NS } },
          },
        },
      };
      expect(buildXml(tree)).toBe(buildXml(tree));
    });
  });

  describe('Scenario: xml2js parse then buildXml', () => {
    it('roundtrips a PasswordDigest-style element', () => {
      const original = {
        Password: {
          $: { Type: 'http://example#PasswordDigest' },
          _: 'abc+/=',
        },
      };
      const xml = buildXml(original);
      const parsed = parseXml(xml, xml2js);
      // xml2js wraps the root element in an array
      const password = parsed.Password[0];
      expect(buildXml({ Password: password })).toBe(xml);
    });

    it('roundtrips prefixed vendor children under ElementItem', () => {
      const original = {
        ElementItem: {
          $: { Name: 'Layout' },
          'tt:CellLayout': {
            $: { Columns: '13', Rows: '18', 'xmlns:tt': TT_NS },
            'tt:Scale': { $: { x: '0.1', y: '0.2' } },
          },
        },
      };
      const xml = buildXml(original);
      const parsed = parseXml(xml, xml2js);
      const item = parsed.ElementItem[0];
      expect(buildXml({ ElementItem: item })).toBe(xml);
    });

    it('roundtrips repeated ElementItem entries', () => {
      const original = {
        Parameters: {
          ElementItem: [
            { $: { Name: 'a' }, Param1: '1' },
            { $: { Name: 'b' }, Param2: '2' },
          ],
        },
      };
      const xml = buildXml(original);
      const parsed = parseXml(xml, xml2js);
      expect(buildXml({ Parameters: parsed.Parameters[0] })).toBe(xml);
    });
  });

  describe('Scenario: normal parse reads what buildXml wrote', () => {
    it('reads camelCased body fields from a built envelope', () => {
      const xml = buildXml({
        's:Envelope': {
          $: { 'xmlns:s': SOAP_NS },
          's:Body': {
            GetFooResponse: {
              $: { xmlns: TDS_NS, Kind: 'demo' },
              Token: 'cam-1',
              Nested: { Value: 'x' },
            },
          },
        },
      });
      const parsed = parseXml(xml);
      // xmlns* attributes are dropped in normal mode; other attrs are flattened + camelCased.
      expect(parsed.envelope.body.getFooResponse).toEqual({
        kind: 'demo',
        token: 'cam-1',
        nested: { value: 'x' },
      });
    });

    it('reads array option tags from built repeated children', () => {
      const xml = buildXml({
        's:Envelope': {
          $: { 'xmlns:s': SOAP_NS },
          's:Body': {
            R: { Item: ['1', '2'] },
          },
        },
      });
      const parsed = parseXml(xml, { array: ['item'] });
      expect(parsed.envelope.body.r.item).toEqual([1, 2]);
    });
  });

  describe('Scenario: escaping survives a roundtrip', () => {
    it('preserves escaped text through build -> xml2js parse -> build', () => {
      const original = { Msg: { _: 'a<b>&"\'' } };
      const xml = buildXml(original);
      const parsed = parseXml(xml, xml2js);
      expect(buildXml({ Msg: parsed.Msg[0] })).toBe(xml);
      expect(parsed.Msg[0]).toBe('a<b>&"\'');
    });
  });
});
