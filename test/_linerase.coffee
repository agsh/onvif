_linerase = (require '../lib/onvif')._linerase
assert = require 'assert'
parseString = (require 'xml2js').parseString

describe 'linerase function', () ->

  it 'should handle tag', (done) ->
    parseString '<a><b>text</b><c>text</c></a>', (err, result) ->
      assert.deepEqual _linerase(result), {
        a: {
          b: 'text'
          c: 'text'
        }
      }
      done()

  it 'should handle multiply tags', (done) ->
    parseString '<a><b>text</b><b>text</b></a>', (err, result) ->
      assert.deepEqual _linerase(result), {
        a: {
          b: [
            'text'
            'text'
          ]
        }
      }
      done()

  it 'should handle multiply tags deeply', (done) ->
    parseString '<a><b><c>text</c><d>t</d></b><b><c>text</c><d>t</d></b></a>', (err, result) ->
      assert.deepEqual _linerase(result), {
        a: {
          b: [
            {c: 'text', d: 't'}
            {c: 'text', d: 't'}
          ]
        }
      }
      done()

  it 'should remove xml namespaces', (done) ->
    parseString '<ns:a><q:b>text</q:b><c>text</c></ns:a>', (err, result) ->
      assert.deepEqual _linerase(result), {
        a: {
          b: 'text'
          c: 'text'
        }
      }
      done()

  it 'should camelcase names', (done) ->
    parseString '<ns:Abc><q:ABC>text</q:ABC><abc>text</abc></ns:Abc>', (err, result) ->
      assert.deepEqual _linerase(result), {
        abc: {
          ABC: 'text'
          abc: 'text'
        }
      }
      done()