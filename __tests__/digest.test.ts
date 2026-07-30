/**
 * Mock-based Digest Authentication tests (no digest / MD5 / SHA-256 / prefer SHA-256).
 *
 * Exercises the 401 retry path in Onvif.rawRequest that reads multiple
 * WWW-Authenticate headers from rawHeaders (HikVision-style MD5 + SHA-256).
 */

import crypto from 'crypto';
import http from 'http';
import { AddressInfo } from 'net';
import { Onvif } from '../src';

const USERNAME = 'admin';
const PASSWORD = 'secret';
const REALM = 'IP Camera';
const PATH = '/onvif/device_service';
const METHOD = 'POST';

/** HikVision-style challenges (no algorithm ⇒ MD5 per Digest RFC) */
const CHALLENGE_MD5 =
  'Digest qop="auth", realm="IP Camera", nonce="396539323a38326531323232323a2974d610e80a9fd6cab88e14e7592747", stale="FALSE"';
const CHALLENGE_SHA256 =
  'Digest qop="auth", realm="IP Camera", nonce="353066323a38326531323232323a2974d610e80a9fd6cab88e14e7592747", algorithm="SHA-256", stale="FALSE"';

const SOAP_OK =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">' +
  '<s:Body><tds:GetSystemDateAndTimeResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl"/>' +
  '</s:Body></s:Envelope>';

type DigestAlgorithm = 'md5' | 'sha256';

function expectedDigestResponse(
  algorithm: DigestAlgorithm,
  opts: {
    username: string;
    password: string;
    realm: string;
    method: string;
    path: string;
    nonce: string;
    nc?: string;
    cnonce?: string;
    qop?: string;
  },
): string {
  const hashName = algorithm === 'sha256' ? 'sha256' : 'md5';
  const ha1 = crypto
    .createHash(hashName)
    .update([opts.username, opts.realm, opts.password].join(':'))
    .digest('hex');
  const ha2 = crypto
    .createHash(hashName)
    .update([opts.method, opts.path].join(':'))
    .digest('hex');
  const parts = [ha1, opts.nonce];
  if (opts.qop) {
    parts.push(opts.nc!, opts.cnonce!, opts.qop);
  }
  parts.push(ha2);
  return crypto.createHash(hashName).update(parts.join(':')).digest('hex');
}

function parseAuthorizationHeader(header: string): Record<string, string> {
  expect(header.startsWith('Digest ')).toBe(true);
  const body = header.slice('Digest '.length);
  const result: Record<string, string> = {};
  const re = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|([^\s,]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    result[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return result;
}

function createCam(port: number): Onvif {
  return new Onvif({
    hostname: '127.0.0.1',
    username: USERNAME,
    password: PASSWORD,
    port,
    path: PATH,
    timeout: 5000,
    useWSSecurity: false,
    // Disable keep-alive so Jest can exit without waiting for idle sockets
    agent: false,
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Mock server that either returns 200 immediately, or 401 with Digest challenge(s)
 * then 200 after a valid Authorization retry.
 */
function startDigestMockServer(options: {
  challenges?: string | string[];
  requireDigest?: boolean;
}): Promise<{
  server: http.Server;
  port: number;
  captured: { authHeader?: string; requestCount: number };
  close: () => Promise<void>;
}> {
  const captured = { authHeader: undefined as string | undefined, requestCount: 0 };
  const requireDigest = options.requireDigest ?? Boolean(options.challenges);

  const server = http.createServer((req, res) => {
    captured.requestCount += 1;

    if (!requireDigest) {
      res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
      res.end(SOAP_OK);
      return;
    }

    if (captured.requestCount === 1) {
      expect(req.headers.authorization).toBeUndefined();
      const challenges = options.challenges!;
      res.writeHead(401, { 'WWW-Authenticate': challenges });
      res.end();
      return;
    }

    captured.authHeader = req.headers.authorization;
    res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
    res.end(SOAP_OK);
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        server,
        port,
        captured,
        close: () => closeServer(server),
      });
    });
    server.on('error', reject);
  });
}

async function requestGetSystemDateAndTime(cam: Onvif) {
  return cam.request({
    body: '<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>',
  });
}

describe('Digest authentication (mock server)', () => {
  describe('without digest', () => {
    it('should succeed with a single request and no Authorization header', async () => {
      const mock = await startDigestMockServer({ requireDigest: false });
      try {
        const cam = createCam(mock.port);
        const [data] = await requestGetSystemDateAndTime(cam);
        expect(data).toBeDefined();
        expect(mock.captured.requestCount).toBe(1);
        expect(mock.captured.authHeader).toBeUndefined();
      } finally {
        await mock.close();
      }
    });
  });

  describe('digest with MD5', () => {
    it('should retry with MD5 Digest Authorization after 401', async () => {
      const mock = await startDigestMockServer({ challenges: CHALLENGE_MD5 });
      try {
        const cam = createCam(mock.port);
        await requestGetSystemDateAndTime(cam);

        expect(mock.captured.requestCount).toBe(2);
        expect(mock.captured.authHeader).toBeDefined();
        const auth = parseAuthorizationHeader(mock.captured.authHeader!);
        expect(auth.username).toBe(USERNAME);
        expect(auth.realm).toBe(REALM);
        expect(auth.uri).toBe(PATH);
        expect(auth.qop).toBe('auth');
        expect(auth.algorithm).not.toBe('SHA-256');
        expect(auth.response).toHaveLength(32);

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
        expect(auth.response).toBe(expected);
      } finally {
        await mock.close();
      }
    });

    it('should produce MD5 response when algorithm=MD5 is explicit', async () => {
      const challenge =
        'Digest qop="auth", realm="IP Camera", nonce="abc123nonce", algorithm="MD5", stale="FALSE"';
      const mock = await startDigestMockServer({ challenges: challenge });
      try {
        const cam = createCam(mock.port);
        await requestGetSystemDateAndTime(cam);

        const auth = parseAuthorizationHeader(mock.captured.authHeader!);
        expect(auth.algorithm).toBe('MD5');
        expect(
          expectedDigestResponse('md5', {
            username: USERNAME,
            password: PASSWORD,
            realm: REALM,
            method: METHOD,
            path: PATH,
            nonce: 'abc123nonce',
            nc: auth.nc,
            cnonce: auth.cnonce,
            qop: 'auth',
          }),
        ).toBe(auth.response);
      } finally {
        await mock.close();
      }
    });
  });

  describe('digest with SHA-256', () => {
    it('should retry with SHA-256 Digest Authorization after 401', async () => {
      const mock = await startDigestMockServer({ challenges: CHALLENGE_SHA256 });
      try {
        const cam = createCam(mock.port);
        await requestGetSystemDateAndTime(cam);

        expect(mock.captured.requestCount).toBe(2);
        const auth = parseAuthorizationHeader(mock.captured.authHeader!);
        expect(auth.algorithm).toBe('SHA-256');
        expect(auth.response).toHaveLength(64);

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
        expect(auth.response).toBe(expected);
      } finally {
        await mock.close();
      }
    });

    it('should not use MD5 hash when challenge requests SHA-256', async () => {
      const mock = await startDigestMockServer({ challenges: CHALLENGE_SHA256 });
      try {
        const cam = createCam(mock.port);
        await requestGetSystemDateAndTime(cam);

        const auth = parseAuthorizationHeader(mock.captured.authHeader!);
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
        expect(auth.response).not.toBe(md5Response);
      } finally {
        await mock.close();
      }
    });
  });

  describe('multiple digest headers (prefer SHA-256)', () => {
    it('should prefer SHA-256 when both MD5 and SHA-256 challenges are offered', async () => {
      const mock = await startDigestMockServer({
        challenges: [CHALLENGE_MD5, CHALLENGE_SHA256],
      });
      try {
        const cam = createCam(mock.port);
        await requestGetSystemDateAndTime(cam);

        expect(mock.captured.requestCount).toBe(2);
        const auth = parseAuthorizationHeader(mock.captured.authHeader!);
        expect(auth.algorithm).toBe('SHA-256');
        expect(auth.nonce).toBe('353066323a38326531323232323a2974d610e80a9fd6cab88e14e7592747');
        expect(auth.response).toHaveLength(64);

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
        expect(auth.response).toBe(expected);
      } finally {
        await mock.close();
      }
    });

    it('should prefer SHA-256 even when SHA-256 challenge is listed first', async () => {
      const mock = await startDigestMockServer({
        challenges: [CHALLENGE_SHA256, CHALLENGE_MD5],
      });
      try {
        const cam = createCam(mock.port);
        await requestGetSystemDateAndTime(cam);

        const auth = parseAuthorizationHeader(mock.captured.authHeader!);
        expect(auth.algorithm).toBe('SHA-256');
        expect(auth.response).toHaveLength(64);
      } finally {
        await mock.close();
      }
    });
  });

  describe('401 without digest', () => {
    it('should reject when 401 has no Digest WWW-Authenticate headers', async () => {
      const server = http.createServer((_req, res) => {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="IP Camera"' });
        res.end();
      });

      await new Promise<void>((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve());
        server.on('error', reject);
      });

      const { port } = server.address() as AddressInfo;
      try {
        const cam = createCam(port);
        await expect(requestGetSystemDateAndTime(cam)).rejects.toThrow(
          'Digest authentication headers not found in the server response',
        );
      } finally {
        await closeServer(server);
      }
    });

    it('should reject when Digest credentials are rejected again with 401', async () => {
      const server = http.createServer((_req, res) => {
        res.writeHead(401, { 'WWW-Authenticate': CHALLENGE_MD5 });
        res.end();
      });

      await new Promise<void>((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve());
        server.on('error', reject);
      });

      const { port } = server.address() as AddressInfo;
      try {
        const cam = createCam(port);
        await expect(requestGetSystemDateAndTime(cam)).rejects.toThrow('Digest authentication failed');
      } finally {
        await closeServer(server);
      }
    });
  });
});
