import { parseStringPromise } from 'xml2js';
import { guid, linerase } from '../src/utils';

describe('Linerase function', () => {
  it('should handle tag', async () => {
    const result = await parseStringPromise('<a><b>text</b><c>text</c></a>');
    expect(linerase(result)).toEqual({
      a : {
        b : 'text',
        c : 'text',
      },
    });
  });

  it('should handle multiply tags', async () => {
    const result = await parseStringPromise('<a><b>text</b><b>text</b></a>');
    expect(linerase(result)).toEqual({
      a : {
        b : [
          'text',
          'text',
        ],
      },
    });
  });

  it('should handle multiply tags deeply', async () => {
    const result = await parseStringPromise('<a><b><c>text</c><d>t</d></b><b><c>text</c><d>t</d></b></a>');
    expect(linerase(result)).toEqual({
      a : {
        b : [
          { c : 'text', d : 't' },
          { c : 'text', d : 't' },
        ],
      },
    });
  });

  it('should deals with numbers', () => {
    expect(linerase({ a : '34.23' })).toEqual({ a : 34.23 });
    expect(linerase({ a : '34' })).toEqual({ a : 34 });
    expect(linerase({ a : '0.34' })).toEqual({ a : 0.34 });
    expect(linerase({ a : '00.34' })).toEqual({ a : '00.34' });
    expect(linerase({ a : '-0.34' })).toEqual({ a : -0.34 });
    expect(linerase({ a : '-12' })).toEqual({ a : -12 });
    expect(linerase({ a : '000' })).toEqual({ a : '000' });
    expect(linerase({ a : '012' })).toEqual({ a : '012' });
  });

  it('should deals with booleans', () => {
    expect(linerase({ a : 'true' })).toEqual({ a : true });
    expect(linerase({ a : 'false' })).toEqual({ a : false });
  });

  it('should deals with datetime and converts it to Date', () => expect(linerase({ a : '2015-01-20T16:33:03Z' })).toEqual({ a : new Date('2015-01-20T16:33:03Z') }));

  it('should handle xml attributes', async () => {
    const result = linerase({
      a : {
        b : {
          $ : { c : 'text', d : 't' },
          e : 'text',
        },
      },
    });
    expect(result).toEqual({ a : { b : { c : 'text', d : 't', e : 'text' } } });
  });
});

describe('GUID function', () => {
  it('should generate GUID', () => expect(guid())
    .toMatch(/^(?:\{{0,1}(?:[0-9a-fA-F]){8}-(?:[0-9a-fA-F]){4}-(?:[0-9a-fA-F]){4}-(?:[0-9a-fA-F]){4}-(?:[0-9a-fA-F]){12}\}{0,1})$/));
});
