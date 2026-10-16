/**
 * GetSnapshotUri + HTTP GET of the JPEG with Digest auth from this library.
 *
 * ONVIF only returns a snapshot URL; downloading the image is plain HTTP.
 * Many cameras answer that GET with Digest (same credentials as SOAP).
 * This example uses {@link Onvif.digestAuth} / {@link getDigestHeaders} — there is
 * no built-in `fetchSnapshot`.
 *
 * Run (TypeScript against source, or after `npm run build` point imports at `../build`):
 *   npx tsx examples/media.snapshot.ts
 *
 * Optional: set `preserveAddress: true` if the snapshot host/port in the URI is
 * unreachable (NAT / loopback) — same flag as for service XAddrs.
 */

import fs from 'node:fs';
import { getDigestHeaders, Onvif } from '../src';

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';
const OUT_FILE = 'snapshot.jpg';

/** Flatten Fetch {@link Headers} into Node-style rawHeaders for {@link getDigestHeaders}. */
// eslint-disable-next-line n/no-unsupported-features/node-builtins
function headersToRaw(headers: Headers): string[] {
  const raw: string[] = [];
  headers.forEach((value, key) => {
    raw.push(key, value);
  });
  return raw;
}

/** One HTTP(S) GET via built-in `fetch`; returns status, raw headers, and body. */
async function httpGet(
  url: URL,
  headers: Record<string, string> = {},
): Promise<{
  statusCode: number;
  rawHeaders: string[];
  body: Buffer;
}> {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const res = await fetch(url, { method: 'GET', headers });
  return {
    statusCode: res.status,
    rawHeaders: headersToRaw(res.headers),
    body: Buffer.from(await res.arrayBuffer()),
  };
}

/**
 * GET with one Digest retry (401 → Authorization → GET again).
 * Reuses the connected client's username/password and nonce counter.
 */
async function getWithDigest(url: URL, onvif: Onvif): Promise<Buffer> {
  const path = `${url.pathname}${url.search}`;
  let response = await httpGet(url);

  if (response.statusCode === 401) {
    const challenges = getDigestHeaders(response.rawHeaders);
    if (challenges.length === 0) {
      throw new Error('HTTP 401 without Digest WWW-Authenticate (camera may want Basic or anonymous access)');
    }
    const authorization = onvif.digestAuth(challenges, { method: 'GET', path });
    response = await httpGet(url, { authorization });
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Snapshot HTTP ${response.statusCode} (${response.body.length} bytes)`);
  }
  if (response.body.length < 3 || response.body[0] !== 0xff || response.body[1] !== 0xd8) {
    throw new Error(`Response is not a JPEG (got ${response.body.length} bytes; Content may be an HTML error page)`);
  }
  return response.body;
}

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    port: PORT,
    username: USERNAME,
    password: PASSWORD,
    // preserveAddress: true, // uncomment behind NAT / wrong XAddr host
  });

  await onvif.connect();

  const snapshot = await onvif.media.getSnapshotUri();
  const uriText = snapshot.mediaUri?.uri;
  if (!uriText) {
    throw new Error('getSnapshotUri returned no uri');
  }

  // Optional rewrite of host/port when preserveAddress is set (path/query kept).
  const url = onvif.parseUrl(uriText);
  console.log('Snapshot URI:', url.href);

  const jpeg = await getWithDigest(url, onvif);
  fs.writeFileSync(OUT_FILE, jpeg);
  console.log(`Wrote ${jpeg.length} bytes to ${OUT_FILE}`);

  await onvif.close();
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
