// Direct SOAP example: Call Device.GetServices against a given XAddr
// This script crafts the SOAP 1.2 envelope + WS-Addressing headers and posts to the XAddr
// Default XAddr: http://192.168.15.143/onvif/device_service
//
// Usage examples:
//   node study/get-services-direct.js
//   ONVIF_USERNAME=user ONVIF_PASSWORD=pass node study/get-services-direct.js
//   XADDR_URL=https://192.168.15.143/onvif/device_service node study/get-services-direct.js
//   INCLUDE_CAP=false node study/get-services-direct.js

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');
const zlib = require('zlib');
const xml2js = require('xml2js');

const DEFAULT_XADDR = process.env.XADDR_URL || 'http://192.168.15.143/onvif/device_service';
const USERNAME = process.env.ONVIF_USERNAME || '';
const PASSWORD = process.env.ONVIF_PASSWORD || '';
const INCLUDE_CAP = String(process.env.INCLUDE_CAP || 'true').toLowerCase() !== 'false';
const USE_WSS = String(process.env.USE_WSS || '0') === '1';

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback UUID v4-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function buildEnvelope({ to, includeCapability }) {
  const messageId = 'urn:uuid:' + uuid();
  const action = 'http://www.onvif.org/ver10/device/wsdl/GetServices';
  const security = (USE_WSS && USERNAME && PASSWORD) ? buildWSSUsernameToken(USERNAME, PASSWORD) : '';
  const env = [
    '<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">',
    '  <Header>',
    (security ? `    ${security}` : ''),
    '    <wsa:Action xmlns:wsa="http://www.w3.org/2005/08/addressing">' + action + '</wsa:Action>',
    '    <wsa:MessageID xmlns:wsa="http://www.w3.org/2005/08/addressing">' + messageId + '</wsa:MessageID>',
    '    <wsa:To xmlns:wsa="http://www.w3.org/2005/08/addressing">' + to + '</wsa:To>',
    '  </Header>',
    '  <Body>',
    '    <GetServices xmlns="http://www.onvif.org/ver10/device/wsdl">',
    '      <IncludeCapability>' + (includeCapability ? 'true' : 'false') + '</IncludeCapability>',
    '    </GetServices>',
    '  </Body>',
    '</Envelope>'
  ].join('');
  return { action, body: env };
}

function buildWSSUsernameToken(username, password) {
  const created = new Date().toISOString();
  const nonce = crypto.randomBytes(16);
  const sha1 = crypto.createHash('sha1')
    .update(Buffer.concat([nonce, Buffer.from(created, 'utf8'), Buffer.from(password, 'utf8')]))
    .digest('base64');
  const nonceB64 = nonce.toString('base64');
  return (
    '<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">' +
      '<UsernameToken>' +
        `<Username>${username}</Username>` +
        '<Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">' + sha1 + '</Password>' +
        '<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">' + nonceB64 + '</Nonce>' +
        '<Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' + created + '</Created>' +
      '</UsernameToken>' +
    '</Security>'
  );
}

function parseDigestChallenge(header) {
  const prefix = 'Digest ';
  const idx = header.indexOf(prefix);
  const raw = idx >= 0 ? header.slice(idx + prefix.length) : header;
  const parts = raw.split(',').map(v => v.trim()).filter(Boolean);
  const out = {};
  for (const p of parts) {
    const m = p.match(/^(\w+)=\"?([^\"]*)\"?$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function buildDigestAuth({ method, path, username, password }, wwwAuth) {
  const ch = parseDigestChallenge(wwwAuth);
  const realm = ch.realm;
  const nonce = ch.nonce;
  const qop = ch.qop; // often "auth"
  const opaque = ch.opaque;
  const cnonce = crypto.createHash('md5').update(Math.random().toString(36)).digest('hex').slice(0, 8);
  const nc = '00000001';

  const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${path}`).digest('hex');
  const respSource = qop ? `${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}` : `${ha1}:${nonce}:${ha2}`;
  const response = crypto.createHash('md5').update(respSource).digest('hex');

  const params = [
    `username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${path}"`,
    `response="${response}"`
  ];
  if (opaque) params.push(`opaque="${opaque}"`);
  if (qop) {
    params.push(`qop="${qop}"`);
    params.push(`nc=${nc}`);
    params.push(`cnonce="${cnonce}"`);
  }
  return 'Digest ' + params.join(', ');
}

function postSoap(xaddrUrl, { action, body }, cb) {
  const url = new URL(xaddrUrl);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;
  const headers = {
    'Content-Type': `application/soap+xml; charset=utf-8; action="${action}"`,
    'Content-Length': Buffer.byteLength(body, 'utf8'),
    'Host': url.host,
  };
  if (USERNAME && PASSWORD) {
    // Try Basic first; if server requires Digest, we retry after 401
    const basic = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }

  const options = {
    method: 'POST',
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + (url.search || ''),
    headers,
    rejectUnauthorized: false, // allow self-signed in lab scenarios
    timeout: 15000,
  };

  const req = lib.request(options, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const buf = Buffer.concat(chunks);
      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      const finish = (dataStr) => {
        if (res.statusCode === 401 && res.headers['www-authenticate'] && USERNAME && PASSWORD) {
        // Retry with Digest
        const auth = buildDigestAuth({ method: 'POST', path: options.path, username: USERNAME, password: PASSWORD }, res.headers['www-authenticate']);
        const retryHeaders = Object.assign({}, headers, { Authorization: auth });
        return postSoapWithHeaders(xaddrUrl, { action, body }, retryHeaders, cb);
      }
      cb(null, res, dataStr);
      };
      if (enc.includes('gzip')) {
        zlib.gunzip(buf, (e, out) => finish(e ? buf.toString('utf8') : out.toString('utf8')));
      } else if (enc.includes('deflate')) {
        zlib.inflate(buf, (e, out) => finish(e ? buf.toString('utf8') : out.toString('utf8')));
      } else {
        finish(buf.toString('utf8'));
      }
    });
  });
  req.on('error', (err) => cb(err));
  req.write(body);
  req.end();
}

function postSoapWithHeaders(xaddrUrl, { action, body }, headers, cb) {
  const url = new URL(xaddrUrl);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;
  const options = {
    method: 'POST',
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + (url.search || ''),
    headers: Object.assign({
      'Content-Type': `application/soap+xml; charset=utf-8; action="${action}"`,
      'Content-Length': Buffer.byteLength(body, 'utf8'),
      'Host': url.host,
    }, headers || {}),
    rejectUnauthorized: false,
    timeout: 15000,
  };
  const req = lib.request(options, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const data = Buffer.concat(chunks).toString('utf8');
      cb(null, res, data);
    });
  });
  req.on('error', (err) => cb(err));
  req.write(body);
  req.end();
}

(async () => {
  const { action, body } = buildEnvelope({ to: DEFAULT_XADDR, includeCapability: INCLUDE_CAP });
  console.log('[INFO] POST', DEFAULT_XADDR);
  console.log('[INFO] SOAPAction:', action);
  postSoap(DEFAULT_XADDR, { action, body }, (err, res, xml) => {
    if (err) {
      console.error('[ERROR]', err.message || err);
      process.exitCode = 1;
      return;
    }
    console.log(`[INFO] HTTP ${res.statusCode}`);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Try to parse and summarize services or report SOAP Faults
      summarizeGetServices(xml, (perr, summary) => {
        if (perr) {
          console.warn('[WARN] Parse failed:', perr.message || perr);
          console.log('\n[INFO] Raw SOAP (first 2000 chars):');
          console.log(String(xml).slice(0, 2000));
          return;
        }
        console.log(`[OK] Parsed services: ${summary.length}`);
        summary.forEach((s, i) => {
          const ver = (s.version && (s.version.major !== undefined)) ? ` v${s.version.major}.${s.version.minor}` : '';
          console.log(`  [${i}] ns=${s.namespace}${ver} xaddr=${s.XAddr}`);
        });
      });
    } else {
      console.warn('[WARN] Non-2xx response. Body (first 2000 chars):');
      console.warn(String(xml).slice(0, 2000));
    }
  });
})().catch((e) => {
  console.error('[FATAL]', e && e.stack ? e.stack : e);
  process.exitCode = 1;
});

function summarizeGetServices(xml, cb) {
  // Remove xmlns declarations to simplify json shape
  const filtered = String(xml).replace(/xmlns([^=]*?)=(".*?")/g, '');
  xml2js.parseString(filtered, { tagNameProcessors: [xml2js.processors.stripPrefix] }, (err, result) => {
    if (err) return cb(err);
    let env = result && (result.Envelope || result.envelope);
    env = arrayFirst(env);
    if (!env) return cb(new Error('No SOAP Envelope'));
    let body = env.Body || env.body;
    body = arrayFirst(body);
    if (!body) return cb(new Error('No SOAP Body'));
    // Fault handling
    const fault = body.Fault || body.fault;
    if (fault && fault[0]) {
      // Try to extract reason/detail texts
      let reason = '';
      try {
        const r = fault[0].Reason || fault[0].reason;
        if (r && r[0] && r[0].Text && r[0].Text[0]) {
          reason = (typeof r[0].Text[0] === 'string') ? r[0].Text[0] : (r[0].Text[0]._ || '');
        }
      } catch (_) {}
      let code = '';
      try {
        const c = fault[0].Code || fault[0].code;
        code = JSON.stringify(c);
      } catch (_) {}
      const e = new Error(`SOAP Fault${reason ? ': ' + reason : ''}`);
      e.code = 'SOAP_FAULT';
      e.detail = code;
      return cb(e);
    }
    // Find GetServicesResponse with flexible matching (case-insensitive, any prefix removed)
    let resp = body.GetServicesResponse || body.getServicesResponse;
    if (!resp) {
      const key = Object.keys(body).find(k => /getservicesresponse$/i.test(k));
      if (key) resp = body[key];
    }
    resp = arrayFirst(resp);
    if (!resp) {
      const keys = Object.keys(body);
      const err2 = new Error('No GetServicesResponse');
      err2.availableKeys = keys;
      return cb(err2);
    }
    // Services array can be under 'Service' (case variants)
    let services = resp.Service || resp.service;
    if (!services) {
      const rk = Object.keys(resp).find(k => /^service$/i.test(k));
      if (rk) services = resp[rk];
    }
    if (!services || !services.length) return cb(null, []);
    const mapped = services.map((svc) => {
      const s = svc;
      const ns = pickFirst(s, ['namespace', 'Namespace']);
      const xa = pickFirst(s, ['XAddr', 'xaddr']);
      const ver = arrayFirst(s.version) || arrayFirst(s.Version);
      const major = ver && pickFirst(ver, ['major', 'Major']);
      const minor = ver && pickFirst(ver, ['minor', 'Minor']);
      return {
        namespace: firstText(ns),
        XAddr: firstText(xa),
        version: (major !== undefined || minor !== undefined) ? { major: numberOrText(firstText(major)), minor: numberOrText(firstText(minor)) } : undefined
      };
    });
    cb(null, mapped);
  });
}

function pickFirst(obj, keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}
function firstText(v) {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return firstText(v[0]);
  if (typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, '_')) return v._;
  return v;
}
function numberOrText(v) {
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

function arrayFirst(v) {
  if (v === undefined || v === null) return v;
  return Array.isArray(v) ? (v[0] !== undefined ? v[0] : undefined) : v;
}
