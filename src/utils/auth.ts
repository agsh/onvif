/**
 * WS-Security PasswordDigest and HTTP Digest (RFC 7616) helpers for {@link Onvif}.
 */

import { Buffer } from 'buffer';
import crypto from 'crypto';
import type { RequestOptions } from 'http';
import { splitArgs } from './digest';
import { OnvifAuthError } from './errors';

export interface PasswordDigest {
  passDigest: string;
  nonce: string;
  timestamp: string;
}

/**
 * WS-Security UsernameToken PasswordDigest (SHA-1 over Nonce + Created + Password).
 *
 * When `timeShift` is known (from getSystemDateAndTime) use monotonic `process.uptime()`
 * so Created is immune to wall-clock/NTP jumps. Before that, use `Date.now()` — uptime alone
 * is ~1970 and Axis rejects it as "Sender not authorized". (domotz BT-6835)
 */
export function passwordDigest(password: string, timeShift?: number): PasswordDigest {
  const timestamp = new Date(
    timeShift !== undefined ? process.uptime() * 1000 + timeShift : Date.now(),
  ).toISOString();
  const nonce = crypto.randomBytes(16);
  const digest = crypto.createHash('sha1');
  digest.update(Buffer.concat([nonce, Buffer.from(timestamp, 'ascii'), Buffer.from(password, 'ascii')]));
  return {
    passDigest: digest.digest('base64'),
    nonce: nonce.toString('base64'),
    timestamp,
  };
}

/**
 * RFC 7616 / RFC 7230 quoted-string for Digest parameters.
 * HA1 still uses the raw username (unq); only the wire form is escaped.
 */
export function quoteDigestParam(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Parse a WWW-Authenticate Digest challenge; soft-skips malformed tokens. */
export function parseChallenge(digest: string): Record<string, string> {
  const prefix = 'Digest ';
  const prefixAt = digest.indexOf(prefix);
  const challenge = prefixAt === -1 ? digest : digest.substring(prefixAt + prefix.length);
  const parts: [string, string][] = [];
  for (const part of splitArgs(challenge)) {
    const match = part.match(/^\s*?([a-zA-Z0-9]+)="?([^"]*)"?\s*?$/);
    if (match) {
      parts.push([match[1], match[2]]);
    }
  }
  return Object.fromEntries(parts);
}

/**
 * Build Digest Authorization header.
 * Prefers SHA-256 when both MD5 and SHA-256 challenges are present.
 */
export function digestAuth(
  digestHeadersArray: string[],
  requestOptions: Pick<RequestOptions, 'method' | 'path'>,
  credentials: { username?: string; password?: string },
  nextNc: () => string,
): string {
  // Most cameras have only 1 WWW-Authenticate item.
  // HikVision MD5-then-SHA256 sends two.
  let bestResult: string | undefined;
  let bestAlgorithm: string | undefined;

  for (const digestHeader of digestHeadersArray) {
    const challenge = parseChallenge(digestHeader);
    if (!challenge.realm || !challenge.nonce) {
      continue;
    }
    // if 'algorithm' is undefined, the Digest RFC says we default to MD5
    const algorithm = challenge.algorithm === undefined ? 'MD5' : challenge.algorithm.replace(/-/g, '');
    const ha1 = crypto.createHash(algorithm);
    ha1.update([credentials.username, challenge.realm, credentials.password].join(':'));
    // Sony SRG-XP1 sends qop="auth,auth-int" — accept either; we select "auth".
    // Also handle spaces: "auth, auth-int".
    if (typeof challenge.qop === 'string' && challenge.qop.split(',').some((item) => item.trim() === 'auth')) {
      challenge.qop = 'auth';
    }
    const ha2 = crypto.createHash(algorithm);
    ha2.update([requestOptions.method, requestOptions.path].join(':'));

    let cnonce: string | undefined;
    let nc: string | undefined;
    if (typeof challenge.qop === 'string' && challenge.qop === 'auth') {
      cnonce = crypto.randomBytes(4).toString('hex');
      nc = nextNc();
    }

    // No qop   -> Response = HASH_ALG(HA1:nonce:HA2);
    // With qop -> Response = HASH_ALG(HA1:nonce:nonceCount:cnonce:qop:HA2)
    const response = crypto.createHash(algorithm);
    const responseParams = [ha1.digest('hex'), challenge.nonce];
    if (cnonce && nc) {
      responseParams.push(nc);
      responseParams.push(cnonce);
      responseParams.push(challenge.qop);
    }
    responseParams.push(ha2.digest('hex'));
    response.update(responseParams.join(':'));

    const authParams: Record<string, string> = {
      username: quoteDigestParam(credentials.username ?? ''),
      realm: quoteDigestParam(challenge.realm),
      nonce: quoteDigestParam(challenge.nonce),
      uri: quoteDigestParam(requestOptions.path ?? ''),
    };
    if ('algorithm' in challenge) {
      authParams.algorithm = challenge.algorithm;
    }
    // RFC: only send qop, nc and cnonce if challenge had QOP; qop/nc unquoted
    if ('qop' in challenge && nc) {
      authParams.qop = challenge.qop;
      authParams.nc = nc;
      authParams.cnonce = quoteDigestParam(cnonce!);
    }
    authParams.response = quoteDigestParam(response.digest('hex'));
    if (challenge.opaque) {
      authParams.opaque = quoteDigestParam(challenge.opaque);
    }
    const result = `Digest ${Object.entries(authParams)
      .map(([key, value]) => `${key}=${value}`)
      .join(',')}`;
    if (bestResult === undefined || (algorithm === 'SHA256' && bestAlgorithm === 'MD5')) {
      bestResult = result;
      bestAlgorithm = algorithm;
    }
  }
  if (bestResult === undefined) {
    throw new OnvifAuthError('Unable to parse Digest authentication challenge');
  }
  return bestResult;
}
