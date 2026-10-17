/**
 * HTTPS + HTTP Digest authentication (SHA-1 / SHA-256).
 *
 * Starts a self-signed HTTPS mock ONVIF endpoint in-process, then connects with
 * `useSecure` and `useWSSecurity: false` so credentials go in the HTTP
 * `Authorization: Digest …` header (not WS-Security SOAP headers).
 *
 * Requires: openssl on PATH (to mint a one-day localhost certificate).
 *
 * Run after build:
 *   node examples/https.digest.mjs
 *
 * ---------------------------------------------------------------------------
 * Real camera (no mock) — HTTPS + Digest:
 *
 *   import { Onvif } from 'onvif';
 *   const onvif = new Onvif({
 *     hostname: '192.168.1.13',
 *     port: 443,
 *     username: 'admin',
 *     password: 'admin',
 *     useSecure: true,
 *     useWSSecurity: false,                 // Digest in HTTP Authorization
 *     secureOptions: { rejectUnauthorized: false }, // self-signed camera cert
 *   });
 *   await onvif.connect();
 *   console.log(await onvif.device.getDeviceInformation());
 *   await onvif.close();
 *
 * Default `useWSSecurity: true` puts PasswordDigest in the SOAP header instead.
 * ---------------------------------------------------------------------------
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Onvif } from '../build/index.js';

const USERNAME = 'admin';
const PASSWORD = 'secret';
const REALM = 'ONVIF Digest Demo';
const SERVICE_PATH = '/onvif/device_service';

function envelope(inner) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"' +
    ' xmlns:tds="http://www.onvif.org/ver10/device/wsdl"' +
    ' xmlns:tt="http://www.onvif.org/ver10/schema">' +
    `<s:Body>${inner}</s:Body></s:Envelope>`
  );
}

function dateTimeSoap() {
  const now = new Date();
  return envelope(`
    <tds:GetSystemDateAndTimeResponse>
      <tds:SystemDateAndTime>
        <tt:DateTimeType>NTP</tt:DateTimeType>
        <tt:DaylightSavings>false</tt:DaylightSavings>
        <tt:TimeZone><tt:TZ>UTC</tt:TZ></tt:TimeZone>
        <tt:UTCDateTime>
          <tt:Time>
            <tt:Hour>${now.getUTCHours()}</tt:Hour>
            <tt:Minute>${now.getUTCMinutes()}</tt:Minute>
            <tt:Second>${now.getUTCSeconds()}</tt:Second>
          </tt:Time>
          <tt:Date>
            <tt:Year>${now.getUTCFullYear()}</tt:Year>
            <tt:Month>${now.getUTCMonth() + 1}</tt:Month>
            <tt:Day>${now.getUTCDate()}</tt:Day>
          </tt:Date>
        </tt:UTCDateTime>
      </tds:SystemDateAndTime>
    </tds:GetSystemDateAndTimeResponse>`);
}

/** Two Service entries so the parser yields an array (single item becomes an object). */
function servicesSoap(port) {
  const xaddr = `https://127.0.0.1:${port}${SERVICE_PATH}`;
  const service = (ns) => `
    <tds:Service>
      <tds:Namespace>${ns}</tds:Namespace>
      <tds:XAddr>${xaddr}</tds:XAddr>
      <tds:Version><tt:Major>2</tt:Major><tt:Minor>0</tt:Minor></tds:Version>
    </tds:Service>`;
  return envelope(`
    <tds:GetServicesResponse>
      ${service('http://www.onvif.org/ver10/device/wsdl')}
      ${service('http://www.onvif.org/ver10/events/wsdl')}
    </tds:GetServicesResponse>`);
}

function deviceInfoSoap() {
  return envelope(`
    <tds:GetDeviceInformationResponse>
      <tds:Manufacturer>onvif-example</tds:Manufacturer>
      <tds:Model>HTTPS Digest Mock</tds:Model>
      <tds:FirmwareVersion>1.0.0</tds:FirmwareVersion>
      <tds:SerialNumber>demo-0001</tds:SerialNumber>
      <tds:HardwareId>1</tds:HardwareId>
    </tds:GetDeviceInformationResponse>`);
}

function parseAuthorizationHeader(header) {
  if (!header?.startsWith('Digest ')) return null;
  const result = {};
  const re = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|([^\s,]+))/g;
  let match;
  while ((match = re.exec(header.slice('Digest '.length))) !== null) {
    result[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return result;
}

function expectedDigestResponse(algorithm, opts) {
  const hashName = algorithm.replace(/-/g, '').toLowerCase(); // SHA-256 → sha256
  const ha1 = crypto.createHash(hashName).update([opts.username, opts.realm, opts.password].join(':')).digest('hex');
  const ha2 = crypto.createHash(hashName).update([opts.method, opts.path].join(':')).digest('hex');
  const parts = [ha1, opts.nonce];
  if (opts.qop) parts.push(opts.nc, opts.cnonce, opts.qop);
  parts.push(ha2);
  return crypto.createHash(hashName).update(parts.join(':')).digest('hex');
}

function challengeHeader(algorithm, nonce) {
  return `Digest qop="auth", realm="${REALM}", nonce="${nonce}", algorithm="${algorithm}", stale="FALSE"`;
}

function makeSelfSignedTls() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'onvif-https-'));
  const keyFile = path.join(dir, 'key.pem');
  const certFile = path.join(dir, 'cert.pem');
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-keyout',
        keyFile,
        '-out',
        certFile,
        '-days',
        '1',
        '-nodes',
        '-subj',
        '/CN=localhost',
      ],
      { stdio: 'ignore' },
    );
  } catch {
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error('openssl is required to mint a self-signed certificate for this example');
  }
  return {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

/**
 * HTTPS mock: 401 + WWW-Authenticate until a valid Digest Authorization arrives.
 * @param {{ algorithms: string[] }} options e.g. { algorithms: ['SHA-256'] }
 */
function startHttpsDigestMock({ algorithms }) {
  const tls = makeSelfSignedTls();
  const challenges = algorithms.map((alg) => challengeHeader(alg, crypto.randomBytes(16).toString('hex')));
  const captured = { authHeaders: [], requestCount: 0 };

  const server = https.createServer({ key: tls.key, cert: tls.cert }, (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      captured.requestCount += 1;
      const auth = parseAuthorizationHeader(req.headers.authorization);

      if (!auth) {
        res.writeHead(401, { 'WWW-Authenticate': challenges });
        res.end();
        return;
      }

      captured.authHeaders.push(req.headers.authorization);
      const alg = auth.algorithm || 'MD5';
      const expected = expectedDigestResponse(alg, {
        username: USERNAME,
        password: PASSWORD,
        realm: REALM,
        method: req.method,
        path: req.url,
        nonce: auth.nonce,
        nc: auth.nc,
        cnonce: auth.cnonce,
        qop: auth.qop,
      });

      if (auth.username !== USERNAME || auth.response !== expected) {
        res.writeHead(401, { 'WWW-Authenticate': challenges });
        res.end();
        return;
      }

      const { port } = server.address();
      let soap = dateTimeSoap();
      if (body.includes('GetDeviceInformation')) soap = deviceInfoSoap();
      else if (body.includes('GetServices')) soap = servicesSoap(port);
      res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
      res.end(soap);
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        port,
        captured,
        close: () =>
          new Promise((res, rej) => {
            server.closeAllConnections?.();
            server.close((err) => {
              tls.cleanup();
              if (err) rej(err);
              else res();
            });
          }),
      });
    });
    server.on('error', reject);
  });
}

async function demo(label, algorithms) {
  console.log(`\n=== ${label} ===`);
  const mock = await startHttpsDigestMock({ algorithms });
  try {
    const onvif = new Onvif({
      hostname: '127.0.0.1',
      port: mock.port,
      path: SERVICE_PATH,
      username: USERNAME,
      password: PASSWORD,
      useSecure: true,
      useWSSecurity: false, // Digest Authorization header
      secureOptions: { rejectUnauthorized: false }, // trust mock self-signed cert
      agent: false,
      timeout: 5000,
    });

    await onvif.connect({ media: false });
    const info = await onvif.device.getDeviceInformation();
    console.log('Device:', info);

    const lastAuth = mock.captured.authHeaders.at(-1);
    const auth = parseAuthorizationHeader(lastAuth);
    console.log('Digest algorithm used:', auth?.algorithm);
    console.log('Authorization (truncated):', `${lastAuth?.slice(0, 96)}…`);
    console.log('HTTP requests (incl. 401 challenges):', mock.captured.requestCount);

    await onvif.close();
  } finally {
    await mock.close();
  }
}

try {
  await demo('HTTPS + Digest SHA-256', ['SHA-256']);
  await demo('HTTPS + Digest SHA-1', ['SHA-1']);
  // Offer SHA-256 first so the client selects it when both are present.
  await demo('HTTPS + Digest SHA-256 and SHA-1 (both offered)', ['SHA-256', 'SHA-1']);
  console.log('\nDone.');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
