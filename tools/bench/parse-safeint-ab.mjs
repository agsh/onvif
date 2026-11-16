/**
 * A/B: parseXml before vs after safe-integer coerce guard (this package only).
 *
 * Usage (from repo root, after npm run build):
 *   node tools/bench/parse-safeint-ab.mjs
 *
 * Expects baseline at build/utils/parser.before-safeint.js (same dir as helpers so
 * relative requires resolve). Build it by compiling HEAD parser.ts then:
 *   cp build/utils/parser.js build/utils/parser.before-safeint.js
 * and restoring the guarded sources + rebuild. Compares against build/utils/parser.js.
 *
 * BENCH_RUNS=15 BENCH_DROP=2 (defaults) -- trimmed mean like the main harness.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturesDir = path.join(root, '__tests__/fixtures/soap');

const BENCH_RUNS = Math.max(1, Number.parseInt(process.env.BENCH_RUNS || '15', 10) || 15);
const BENCH_DROP = Math.max(0, Number.parseInt(process.env.BENCH_DROP || '2', 10) || 2);
if (BENCH_DROP * 2 >= BENCH_RUNS) {
  throw new Error(`BENCH_DROP=${BENCH_DROP} leaves no samples for BENCH_RUNS=${BENCH_RUNS}`);
}

const beforePath =
  process.env.BENCH_BEFORE || path.join(root, 'build/utils/parser.before-safeint.js');
const afterPath = path.join(root, 'build/utils/parser.js');
if (!fs.existsSync(beforePath)) {
  throw new Error(`Missing baseline parser: ${beforePath}`);
}

const { parseXml: before } = require(beforePath);
const { parseXml: after } = require(afterPath);

const small = fs.readFileSync(path.join(fixturesDir, 'device.GetSystemDateAndTime.xml'), 'utf8');
const medium = fs.readFileSync(path.join(fixturesDir, 'device.GetServices.xml'), 'utf8');
const large = fs.readFileSync(path.join(fixturesDir, 'media.GetProfiles.xml'), 'utf8');
const events = fs.readFileSync(path.join(fixturesDir, 'events.PullMessages.xml'), 'utf8');

function repeatElement(xml, open, close, times) {
  const start = xml.search(open);
  const end = xml.lastIndexOf(close) + close.length;
  if (start === -1 || end < close.length) throw new Error(`Element ${open} not found`);
  const block = xml.slice(start, end);
  const copies = Array.from({ length: times }, (_, index) =>
    block.replaceAll(/token="([^"]+)"/g, `token="$1-${index}"`),
  );
  return xml.slice(0, start) + copies.join('') + xml.slice(end);
}

const nvrProfiles = repeatElement(large, /<trt:Profiles /, '</trt:Profiles>', 32);
const eventBatch = repeatElement(events, /<wsnt:NotificationMessage>/, '</wsnt:NotificationMessage>', 30);
const batchNotifs = (eventBatch.match(/<wsnt:NotificationMessage>/g) || []).length;

function trimmedMean(samples, drop = BENCH_DROP) {
  const sorted = [...samples].sort((a, b) => a - b);
  const kept = drop > 0 ? sorted.slice(drop, sorted.length - drop) : sorted;
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}

function calibrate(fn, targetMs = 400) {
  let n = 1;
  for (;;) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn();
    const elapsed = performance.now() - t0;
    if (elapsed >= targetMs || n > 10000000) return { n, elapsed };
    n = Math.max(n * 2, Math.ceil((n * targetMs) / Math.max(elapsed, 0.01)));
  }
}

function measureThroughput(fn, seconds = 1.2) {
  for (let i = 0; i < 20; i++) fn();
  const { n: batch } = calibrate(fn, 50);
  const deadline = performance.now() + seconds * 1000;
  let ops = 0;
  const t0 = performance.now();
  while (performance.now() < deadline) {
    for (let i = 0; i < batch; i++) fn();
    ops += batch;
  }
  return ops / ((performance.now() - t0) / 1000);
}

function measureLatencyMs(fn, repeats = 30) {
  for (let i = 0; i < 5; i++) fn();
  const samples = [];
  for (let i = 0; i < repeats; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

function measureBurst(parseOne, eventsPerDoc, targetEvents = 5000) {
  const docsNeeded = Math.ceil(targetEvents / eventsPerDoc);
  for (let i = 0; i < 3; i++) parseOne();
  const t0 = performance.now();
  for (let i = 0; i < docsNeeded; i++) parseOne();
  return performance.now() - t0;
}

const parsers = {
  'before (no safe-int)': before,
  'after (safe-int)': after,
};

const workloads = {
  small: small,
  medium: medium,
  large: large,
  nvrProfiles: nvrProfiles,
  eventBatch: eventBatch,
};

console.log('Node', process.version);
console.log(`Runs: ${BENCH_RUNS} (drop ${BENCH_DROP}+${BENCH_DROP})`);
console.log('Before:', beforePath);
console.log('After:', afterPath);
console.log('');

for (const [name, parse] of Object.entries(parsers)) {
  for (const xml of Object.values(workloads)) parse(xml);
}
console.log('Smoke OK\n');

/** @type {Record<string, Record<string, number[]>>} */
const samples = { 'before (no safe-int)': {}, 'after (safe-int)': {} };

console.log('Warm-up...');
for (const parse of Object.values(parsers)) {
  for (const xml of Object.values(workloads)) {
    for (let i = 0; i < 5; i++) parse(xml);
  }
}
console.log('Warm-up done\n');

for (let run = 1; run <= BENCH_RUNS; run++) {
  console.log(`=== Run ${run}/${BENCH_RUNS} ===`);
  for (const [pname, parse] of Object.entries(parsers)) {
    for (const [key, xml] of Object.entries(workloads)) {
      const perSec = measureThroughput(() => parse(xml), key === 'eventBatch' ? 1.5 : 1.2);
      if (!samples[pname][key]) samples[pname][key] = [];
      samples[pname][key].push(key === 'eventBatch' ? perSec * batchNotifs : perSec);
      const label = key === 'eventBatch' ? 'notif/s' : 'docs/s';
      console.log(
        `  ${pname.padEnd(24)} ${key.padEnd(12)} ${samples[pname][key].at(-1).toFixed(0).padStart(8)} ${label}`,
      );
    }
    const med = measureLatencyMs(() => parse(nvrProfiles), 30);
    if (!samples[pname].kiB_median_ms) samples[pname].kiB_median_ms = [];
    samples[pname].kiB_median_ms.push(med);
    console.log(`  ${pname.padEnd(24)} ~500KiB ms ${med.toFixed(2)}`);
    const burst = measureBurst(() => parse(eventBatch), batchNotifs, 5000);
    if (!samples[pname].burst_wall_ms) samples[pname].burst_wall_ms = [];
    samples[pname].burst_wall_ms.push(burst);
    console.log(`  ${pname.padEnd(24)} burst ms   ${burst.toFixed(0)}`);
  }
  console.log('');
}

function cell(v, digits = 0) {
  return digits ? v.toFixed(digits) : String(Math.round(v));
}

const names = Object.keys(samples);
const keep = BENCH_RUNS - BENCH_DROP * 2;
console.log(`=== Summary (trimmed mean, keep ${keep}) ===`);
console.log('| Metric | ' + names.join(' | ') + ' | delta (after/before) |');
console.log('| --- | ' + names.map(() => '---:').join(' | ') + ' | ---: |');

for (const [label, key, digits, higherBetter] of [
  ['small docs/s', 'small', 0, true],
  ['medium docs/s', 'medium', 0, true],
  ['large docs/s', 'large', 0, true],
  ['~500 KiB median ms', 'kiB_median_ms', 1, false],
  ['eventBatch notif/s', 'eventBatch', 0, true],
  ['burst ~5k wall ms', 'burst_wall_ms', 0, false],
]) {
  const a = trimmedMean(samples[names[0]][key]);
  const b = trimmedMean(samples[names[1]][key]);
  const ratio = higherBetter ? b / a : a / b;
  console.log(
    `| ${label} | ${cell(a, digits)} | ${cell(b, digits)} | ${((ratio - 1) * 100).toFixed(1)}% |`,
  );
}
