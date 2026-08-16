/**
 * Mock-based Digest Authentication tests (MD5 and SHA-256).
 *
 * Covers Cam.prototype._parseChallenge / digestAuth and the 401 retry path
 * that reads multiple WWW-Authenticate headers from rawHeaders (HikVision-style).
 *
 * SHA-256 Digest is defined by RFC 7616; implementation is expected later.
 */

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const onvif = require('../lib/onvif');

const USERNAME = 'admin';
const PASSWORD = 'secret';
const REALM = 'IP Camera';
const PATH = '/onvif/device_service';
const METHOD = 'POST';

/** HikVision-style challenges from the comment in lib/cam.js */
const CHALLENGE_MD5 =
	'Digest qop="auth", realm="IP Camera", nonce="396539323a38326531323232323a2974d610e80a9fd6cab88e14e7592747", stale="FALSE"';
const CHALLENGE_SHA256 =
	'Digest qop="auth", realm="IP Camera", nonce="353066323a38326531323232323a2974d610e80a9fd6cab88e14e7592747", algorithm="SHA-256", stale="FALSE"';

/**
 * Compute Digest response for a fixed challenge (RFC 2617 MD5 / RFC 7616 SHA-256).
 * @param {'md5'|'sha256'} algorithm
 * @param {object} opts
 * @returns {string} hex response
 */
function expectedDigestResponse(algorithm, opts) {
	const hashName = algorithm === 'sha256' ? 'sha256' : 'md5';
	const ha1 = crypto.createHash(hashName)
		.update([opts.username, opts.realm, opts.password].join(':'))
		.digest('hex');
	const ha2 = crypto.createHash(hashName)
		.update([opts.method, opts.path].join(':'))
		.digest('hex');
	const parts = [ha1, opts.nonce];
	if (opts.qop) {
		parts.push(opts.nc, opts.cnonce, opts.qop);
	}
	parts.push(ha2);
	return crypto.createHash(hashName).update(parts.join(':')).digest('hex');
}

/**
 * Parse Authorization: Digest ... header into a key/value map (unquoted).
 * @param {string} header
 * @returns {Record<string, string>}
 */
function parseAuthorizationHeader(header) {
	assert.ok(header && header.startsWith('Digest '), 'Authorization must start with Digest ');
	const body = header.slice('Digest '.length);
	const result = {};
	const re = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|([^\s,]+))/g;
	let match;
	while ((match = re.exec(body)) !== null) {
		result[match[1]] = match[2] !== undefined ? match[2] : match[3];
	}
	return result;
}

function createCam() {
	return new onvif.Cam({
		hostname: '127.0.0.1',
		username: USERNAME,
		password: PASSWORD,
		port: 9,
		path: PATH,
		autoconnect: false,
		timeout: 2000,
	});
}

describe('Digest authentication', () => {
	describe('_parseChallenge', () => {
		it('should parse MD5 challenge without algorithm (default MD5)', () => {
			const cam = createCam();
			const challenge = cam._parseChallenge(CHALLENGE_MD5);
			assert.strictEqual(challenge.realm, REALM);
			assert.strictEqual(challenge.qop, 'auth');
			assert.strictEqual(challenge.nonce, '396539323a38326531323232323a2974d610e80a9fd6cab88e14e7592747');
			assert.strictEqual(challenge.stale, 'FALSE');
			assert.strictEqual(challenge.algorithm, undefined);
		});

		it('should parse MD5 challenge with explicit algorithm=MD5', () => {
			const cam = createCam();
			const challenge = cam._parseChallenge(
				'Digest algorithm=MD5, realm="happytimesoft", qop="auth", nonce="36160F746AFA5913"'
			);
			assert.strictEqual(challenge.algorithm, 'MD5');
			assert.strictEqual(challenge.realm, 'happytimesoft');
			assert.strictEqual(challenge.nonce, '36160F746AFA5913');
		});

		it('should parse SHA-256 challenge', () => {
			const cam = createCam();
			const challenge = cam._parseChallenge(CHALLENGE_SHA256);
			assert.strictEqual(challenge.algorithm, 'SHA-256');
			assert.strictEqual(challenge.realm, REALM);
			assert.strictEqual(challenge.qop, 'auth');
			assert.strictEqual(challenge.nonce, '353066323a38326531323232323a2974d610e80a9fd6cab88e14e7592747');
		});

		it('should keep qop="auth,auth-int" values for digestAuth to normalize', () => {
			const cam = createCam();
			const challenge = cam._parseChallenge(
				'Digest algorithm=MD5,realm="happytimesoft",qop="auth,auth-int",nonce="36160F746AFA5913"'
			);
			assert.strictEqual(challenge.qop, 'auth,auth-int');
		});
	});

	describe('digestAuth — MD5', () => {
		let randomStub;

		beforeEach(() => {
			// Fixed entropy so cnonce is deterministic: md5("fixed").hex.substring(0, 8)
			randomStub = Math.random;
			Math.random = () => 0.42;
		});

		afterEach(() => {
			Math.random = randomStub;
		});

		it('should build a Digest Authorization header with MD5 response', () => {
			const cam = createCam();
			const header = cam.digestAuth([CHALLENGE_MD5], { method: METHOD, path: PATH });
			const auth = parseAuthorizationHeader(header);

			assert.strictEqual(auth.username, USERNAME);
			assert.strictEqual(auth.realm, REALM);
			assert.strictEqual(auth.nonce, '396539323a38326531323232323a2974d610e80a9fd6cab88e14e7592747');
			assert.strictEqual(auth.uri, PATH);
			assert.strictEqual(auth.qop, 'auth');
			assert.strictEqual(auth.nc, '00000001');
			assert.ok(auth.cnonce);
			assert.ok(auth.response);

			const expected = expectedDigestResponse('md5', {
				username: USERNAME,
				password: PASSWORD,
				realm: REALM,
				method: METHOD,
				path: PATH,
				nonce: auth.nonce,
				nc: auth.nc,
				cnonce: auth.cnonce,
				qop: 'auth',
			});
			assert.strictEqual(auth.response, expected);
			// Default / MD5 must not claim SHA-256
			assert.notStrictEqual(auth.algorithm, 'SHA-256');
		});

		it('should produce MD5 response when algorithm=MD5 is explicit', () => {
			const cam = createCam();
			const challenge =
				'Digest qop="auth", realm="IP Camera", nonce="abc123nonce", algorithm="MD5", stale="FALSE"';
			const header = cam.digestAuth([challenge], { method: METHOD, path: PATH });
			const auth = parseAuthorizationHeader(header);

			const expected = expectedDigestResponse('md5', {
				username: USERNAME,
				password: PASSWORD,
				realm: REALM,
				method: METHOD,
				path: PATH,
				nonce: 'abc123nonce',
				nc: auth.nc,
				cnonce: auth.cnonce,
				qop: 'auth',
			});
			assert.strictEqual(auth.response, expected);
		});

		it('should increment nc on subsequent MD5 challenges', () => {
			const cam = createCam();
			const first = parseAuthorizationHeader(
				cam.digestAuth([CHALLENGE_MD5], { method: METHOD, path: PATH })
			);
			const second = parseAuthorizationHeader(
				cam.digestAuth([CHALLENGE_MD5], { method: METHOD, path: PATH })
			);
			assert.strictEqual(first.nc, '00000001');
			assert.strictEqual(second.nc, '00000002');
		});
	});

	describe('digestAuth — SHA-256', () => {
		let randomStub;

		beforeEach(() => {
			randomStub = Math.random;
			Math.random = () => 0.42;
		});

		afterEach(() => {
			Math.random = randomStub;
		});

		it('should build a Digest Authorization header with SHA-256 response', () => {
			const cam = createCam();
			const header = cam.digestAuth([CHALLENGE_SHA256], { method: METHOD, path: PATH });
			const auth = parseAuthorizationHeader(header);

			assert.strictEqual(auth.username, USERNAME);
			assert.strictEqual(auth.realm, REALM);
			assert.strictEqual(auth.nonce, '353066323a38326531323232323a2974d610e80a9fd6cab88e14e7592747');
			assert.strictEqual(auth.uri, PATH);
			assert.strictEqual(auth.qop, 'auth');
			assert.strictEqual(auth.nc, '00000001');
			assert.ok(auth.cnonce);
			assert.strictEqual(auth.algorithm, 'SHA-256');

			const expected = expectedDigestResponse('sha256', {
				username: USERNAME,
				password: PASSWORD,
				realm: REALM,
				method: METHOD,
				path: PATH,
				nonce: auth.nonce,
				nc: auth.nc,
				cnonce: auth.cnonce,
				qop: 'auth',
			});
			assert.strictEqual(auth.response, expected);
			// SHA-256 digest is 64 hex chars; MD5 is 32
			assert.strictEqual(auth.response.length, 64);
		});

		it('should not use MD5 hash when challenge requests SHA-256', () => {
			const cam = createCam();
			const header = cam.digestAuth([CHALLENGE_SHA256], { method: METHOD, path: PATH });
			const auth = parseAuthorizationHeader(header);

			const md5Response = expectedDigestResponse('md5', {
				username: USERNAME,
				password: PASSWORD,
				realm: REALM,
				method: METHOD,
				path: PATH,
				nonce: auth.nonce,
				nc: auth.nc,
				cnonce: auth.cnonce,
				qop: 'auth',
			});
			assert.notStrictEqual(auth.response, md5Response);
		});
	});

	describe('401 retry with mock HTTP server', () => {
		const soapOk =
			'<?xml version="1.0" encoding="UTF-8"?>' +
			'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
			'<s:Body><tds:GetSystemDateAndTimeResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl"/>' +
			'</s:Body></s:Envelope>';

		/**
		 * Starts a 401→200 digest mock server and drives one Cam._requestPart2 call.
		 * Captures the challenge passed to digestAuth and the Authorization on the retry.
		 */
		function runDigest401Scenario(challenges, done) {
			let requestCount = 0;
			const captured = {
				authHeader: undefined,
				digestAuthArgs: [],
			};

			const server = http.createServer((req, res) => {
				requestCount += 1;
				if (requestCount === 1) {
					assert.strictEqual(req.headers.authorization, undefined);
					res.writeHead(401, { 'WWW-Authenticate': challenges });
					res.end();
					return;
				}
				captured.authHeader = req.headers.authorization;
				res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
				res.end(soapOk);
			});

			server.listen(0, '127.0.0.1', () => {
				const { port } = server.address();
				const cam = new onvif.Cam({
					hostname: '127.0.0.1',
					username: USERNAME,
					password: PASSWORD,
					port,
					path: PATH,
					autoconnect: false,
					timeout: 5000,
					useWSSecurity: false,
				});

				const originalDigestAuth = cam.digestAuth.bind(cam);
				cam.digestAuth = function(wwwAuthenticate, reqOptions) {
					captured.digestAuthArgs.push({ wwwAuthenticate, reqOptions });
					try {
						return originalDigestAuth(wwwAuthenticate, reqOptions);
					} catch (e) {
						// Keep the scenario alive so assertions can inspect the challenge that was selected
						captured.digestAuthError = e;
						return 'Digest username="admin",realm="IP Camera",nonce="x",uri="/onvif/device_service",response="0"';
					}
				};

				let finished = false;
				let poll;
				const finish = (err) => {
					if (finished) {
						return;
					}
					finished = true;
					if (poll) {
						clearInterval(poll);
					}
					server.close(() => done(err, captured));
				};

				cam._requestPart2(
					{
						action: 'http://www.onvif.org/ver10/device/wsdl/GetSystemDateAndTime',
						body: '<GetSystemDateAndTime/>',
					},
					() => {
						// First response may fire an empty callback because 401 path does not return
						// before registering res.on('end'). Wait for the authenticated retry.
					}
				);

				const started = Date.now();
				poll = setInterval(() => {
					if (captured.authHeader) {
						finish(null);
					} else if (Date.now() - started > 4000) {
						finish(new Error(
							'Timed out waiting for digest retry. digestAuth calls: '
							+ JSON.stringify(captured.digestAuthArgs.map((a) => a.wwwAuthenticate))
						));
					}
				}, 25);
			});
		}

		it('should retry with MD5 Digest Authorization after 401', function(done) {
			this.timeout(10000);
			runDigest401Scenario([CHALLENGE_MD5], (err, captured) => {
				if (err) {
					return done(err);
				}
				try {
					assert.ok(captured.digestAuthArgs.length >= 1, 'digestAuth must be called');
					assert.ok(captured.authHeader, 'retry must send Authorization');
					const auth = parseAuthorizationHeader(captured.authHeader);
					assert.notStrictEqual(auth.algorithm, 'SHA-256');
					const expected = expectedDigestResponse('md5', {
						username: USERNAME,
						password: PASSWORD,
						realm: REALM,
						method: METHOD,
						path: PATH,
						nonce: auth.nonce,
						nc: auth.nc,
						cnonce: auth.cnonce,
						qop: 'auth',
					});
					assert.strictEqual(auth.response, expected);
					done();
				} catch (e) {
					done(e);
				}
			});
		});

		it('should retry with SHA-256 Digest Authorization after 401', function(done) {
			this.timeout(10000);
			runDigest401Scenario([CHALLENGE_SHA256], (err, captured) => {
				if (err) {
					return done(err);
				}
				try {
					assert.ok(captured.digestAuthArgs.length >= 1, 'digestAuth must be called');
					assert.ok(captured.authHeader, 'retry must send Authorization');
					const auth = parseAuthorizationHeader(captured.authHeader);
					assert.strictEqual(auth.algorithm, 'SHA-256');
					assert.strictEqual(auth.response.length, 64);
					const expected = expectedDigestResponse('sha256', {
						username: USERNAME,
						password: PASSWORD,
						realm: REALM,
						method: METHOD,
						path: PATH,
						nonce: auth.nonce,
						nc: auth.nc,
						cnonce: auth.cnonce,
						qop: 'auth',
					});
					assert.strictEqual(auth.response, expected);
					done();
				} catch (e) {
					done(e);
				}
			});
		});

		it('should prefer SHA-256 when both MD5 and SHA-256 challenges are offered', function(done) {
			this.timeout(10000);
			runDigest401Scenario([CHALLENGE_MD5, CHALLENGE_SHA256], (err, captured) => {
				if (err) {
					return done(err);
				}
				try {
					assert.ok(captured.digestAuthArgs.length >= 1, 'digestAuth must be called');
					const passed = captured.digestAuthArgs[0].wwwAuthenticate;
					// digestAuth receives all Digest WWW-Authenticate headers and picks the strongest itself
					assert.deepStrictEqual(passed, [CHALLENGE_MD5, CHALLENGE_SHA256]);
					assert.ok(captured.authHeader, 'retry must send Authorization');
					const auth = parseAuthorizationHeader(captured.authHeader);
					assert.strictEqual(auth.algorithm, 'SHA-256');
					assert.strictEqual(
						auth.nonce,
						'353066323a38326531323232323a2974d610e80a9fd6cab88e14e7592747'
					);
					const expected = expectedDigestResponse('sha256', {
						username: USERNAME,
						password: PASSWORD,
						realm: REALM,
						method: METHOD,
						path: PATH,
						nonce: auth.nonce,
						nc: auth.nc,
						cnonce: auth.cnonce,
						qop: 'auth',
					});
					assert.strictEqual(auth.response, expected);
					done();
				} catch (e) {
					done(e);
				}
			});
		});
	});
});
