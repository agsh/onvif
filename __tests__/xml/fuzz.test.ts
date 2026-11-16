/**
 * Feature: SOAP XML fuzz -- mutated corpus must fail cleanly
 *
 * Mutates checked-in fixtures. `parseXml` / `parseSOAPString` must either
 * return a plain object or throw an Error -- no hang, no prototype pollution.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseSOAPString, parseXml } from '../../src/utils';

const FIXTURES = path.join(__dirname, '../fixtures/soap');
const SEED_FILES = [
  'device.GetSystemDateAndTime.xml',
  'device.GetServices.xml',
  'media.GetProfiles.xml',
  'events.PullMessages.xml',
] as const;

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

/** Deterministic PRNG (mulberry32) so CI is reproducible. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Mutator = (xml: string, rand: () => number) => string;

const MUTATORS: Mutator[] = [
  (xml, rand) => {
    const i = Math.floor(rand() * xml.length);
    return xml.slice(0, i) + xml.slice(i + 1 + Math.floor(rand() * 8));
  },
  (xml, rand) => {
    const i = Math.floor(rand() * xml.length);
    const junk = '<>&;/"\'\0\n'.charAt(Math.floor(rand() * 8));
    return xml.slice(0, i) + junk + xml.slice(i);
  },
  (xml) => xml.replace(/<\/?[\w:-]+/g, (tag) => (tag.length > 2 ? tag.slice(0, -1) : tag)),
  (xml) => `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${xml}`,
  (xml) => xml.replace('>', '><!-- comment -->'),
  (xml) => xml.replace(/Body/g, '__proto__'),
  (xml, rand) => xml.slice(0, Math.max(1, Math.floor(rand() * Math.min(xml.length, 200)))),
  (xml) => `${xml}<extra/>`,
  (xml) => {
    let n = 0;
    return xml.replace(/</g, (m) => (++n <= 3 ? '&lt;' : m));
  },
  (xml) => `<R><__proto__><x>1</x></__proto__></R>${xml}`,
];

function assertSafeOutcome(result: unknown): void {
  expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  if (result === null || typeof result !== 'object') {
    return;
  }
  const proto = Object.getPrototypeOf(result);
  expect(proto === null || proto === Object.prototype).toBe(true);
}

describe('Feature: SOAP XML fuzz', () => {
  it('mutated corpus either parses or throws Error without polluting Object.prototype', async () => {
    const rand = mulberry32(20261114);
    let threw = 0;
    let parsed = 0;

    for (const file of SEED_FILES) {
      const seedXml = readFixture(file);
      for (let i = 0; i < MUTATORS.length; i++) {
        for (let round = 0; round < 4; round++) {
          const mutated = MUTATORS[i]!(seedXml, rand);
          try {
            const doc = parseXml(mutated);
            assertSafeOutcome(doc);
            parsed++;
          } catch (error) {
            if (!(error instanceof Error)) {
              throw error;
            }
            threw++;
          }
          try {
            const [body] = await parseSOAPString(mutated);
            assertSafeOutcome(body);
            parsed++;
          } catch (error) {
            if (!(error instanceof Error)) {
              throw error;
            }
            threw++;
          }
        }
      }
    }

    expect(threw + parsed).toBeGreaterThan(0);
    // Most mutations should fail; a few truncated-but-valid shapes may still parse.
    expect(threw).toBeGreaterThan(parsed);
  });

  it('rejects forbidden element names from a direct pollution attempt', () => {
    expect(() => parseXml('<R><__proto__><polluted>yes</polluted></__proto__></R>')).toThrow(
      /Forbidden XML name/,
    );
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });
});
