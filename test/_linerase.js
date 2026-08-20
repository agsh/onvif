const linerase = require('../lib/utils').linerase;
const splitArgs = require('../lib/utils').splitArgs;
const assert = require('assert');
const parseString = require('xml2js').parseString;

describe('Linerase function', () => {
	it('should handle tag', (done) => {
		parseString('<a><b>text</b><c>text</c></a>', (err, result) => {
			assert.deepStrictEqual(linerase(result), {
				a: {
					b: 'text',
					c: 'text',
				}
			});
			done();
		});
	});
	it('should handle multiply tags', (done) => {
		parseString('<a><b>text</b><b>text</b></a>', (err, result) => {
			assert.deepStrictEqual(linerase(result), {
				a: {
					b: [
						'text',
						'text',
					]
				}
			});
			done();
		});
	});
	it('should handle multiply tags deeply', (done) => {
		parseString('<a><b><c>text</c><d>t</d></b><b><c>text</c><d>t</d></b></a>', (err, result) => {
			assert.deepStrictEqual(linerase(result), {
				a: {
					b: [
						{c: 'text', d: 't'},
						{c: 'text', d: 't'}
					]
				}
			});
			done();
		});
	});
	it('should deals with numbers', () => {
		assert.deepStrictEqual(linerase({a: '34.23'}), {a: 34.23});
		assert.deepStrictEqual(linerase({a: '34'}), {a: 34});
		assert.deepStrictEqual(linerase({a: '0.34'}), {a: 0.34});
		assert.deepStrictEqual(linerase({a: '00.34'}), {a: '00.34'});
		assert.deepStrictEqual(linerase({a: '-0.34'}), {a: -0.34});
		assert.deepStrictEqual(linerase({a: '-12'}), {a: -12});
		assert.deepStrictEqual(linerase({a: '000'}), {a: '000'});
		assert.deepStrictEqual(linerase({a: '012'}), {a: '012'});
	});
	it('should deals with datetime and converts it to Date', () =>
		assert.deepStrictEqual(
			linerase({a: '2015-01-20T16:33:03Z'}), {a: new Date('2015-01-20T16:33:03Z')}
		)
	);
});

describe('splitArgs function', () => {
	it('should parse args', (done) => {
		const result = splitArgs('algorithm=MD5,realm="happytimesoft",qop="auth,auth-int",nonce="36160F746AFA5913"');
		assert.equal(result.length, 4);
		assert.equal(result[0], 'algorithm=MD5');
		assert.equal(result[1], 'realm="happytimesoft"');
		assert.equal(result[2], 'qop="auth,auth-int"');
		assert.equal(result[3], 'nonce="36160F746AFA5913"');
		done();
	});
	it('should parse args with spaces', (done) => {
		const result = splitArgs('algorithm=MD5, realm="happytimesoft",qop="auth,auth-int", nonce="36160F746AFA5913"');
		assert.equal(result.length, 4);
		assert.equal(result[0], 'algorithm=MD5');
		assert.equal(result[1], 'realm="happytimesoft"');
		assert.equal(result[2], 'qop="auth,auth-int"');
		assert.equal(result[3], 'nonce="36160F746AFA5913"');
		done();
	});
});
