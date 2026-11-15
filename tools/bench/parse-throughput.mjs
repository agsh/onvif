/**
 * Internal SOAP XML parse throughput bench (same fixture shapes as common ONVIF benches).
 *
 * In-process (Node): this package parseXml, optional @2bad/onvif parseXml, fast-xml-parser, xml2js.
 * Out-of-process peers (skipped if tooling missing): Python xml.etree / lxml, Go encoding/xml,
 * Rust quick-xml -- mirrors the cross-language field used in public ONVIF client benches.
 *
 * Usage (from repo root, after npm run build):
 *   npm install --no-save @2bad/onvif@2.3.0 fast-xml-parser
 *   npm run bench:xml
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturesDir = path.join(root, '__tests__/fixtures/soap');
const peersDir = path.join(root, 'tools/bench/peers');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onvif-bench-'));

function loadOptional(name) {
  try {
    return require(path.join(root, 'node_modules', name));
  } catch {
    return null;
  }
}

const { parseXml: ours } = require(path.join(root, 'build/utils/parser.js'));

let peerOnvifParse;
try {
  ({ parseXml: peerOnvifParse } = await import(
    pathToFileURL(path.join(root, 'node_modules/@2bad/onvif/build/soap/parse.js')).href
  ));
} catch {
  peerOnvifParse = null;
}

const fxpMod = loadOptional('fast-xml-parser');
const xml2js = loadOptional('xml2js');

const fxpParser = fxpMod
  ? new fxpMod.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      attributesGroupName: '$',
      textNodeName: '_',
      removeNSPrefix: true,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
      ignoreDeclaration: true,
      ignorePiTags: true,
      htmlEntities: false,
    })
  : null;

/** @type {Record<string, (xml: string) => unknown>} */
const inProcess = {
  'onvif parseXml': (xml) => ours(xml),
};
if (peerOnvifParse) {
  inProcess['@2bad/onvif parseXml'] = (xml) => peerOnvifParse(xml);
}
if (fxpParser) {
  inProcess['fast-xml-parser'] = (xml) => fxpParser.parse(xml);
}
if (xml2js) {
  inProcess.xml2js = (xml) => {
    let out;
    xml2js.parseString(
      xml,
      { explicitArray: false, explicitRoot: true, mergeAttrs: false },
      (err, result) => {
        if (err) throw err;
        out = result;
      },
    );
    return out;
  };
}

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

const fixtureFiles = {
  small: path.join(tmpDir, 'small.xml'),
  medium: path.join(tmpDir, 'medium.xml'),
  large: path.join(tmpDir, 'large.xml'),
  nvrProfiles: path.join(tmpDir, 'nvrProfiles.xml'),
  events: path.join(tmpDir, 'events.xml'),
  eventBatch: path.join(tmpDir, 'eventBatch.xml'),
};
fs.writeFileSync(fixtureFiles.small, small);
fs.writeFileSync(fixtureFiles.medium, medium);
fs.writeFileSync(fixtureFiles.large, large);
fs.writeFileSync(fixtureFiles.nvrProfiles, nvrProfiles);
fs.writeFileSync(fixtureFiles.events, events);
fs.writeFileSync(fixtureFiles.eventBatch, eventBatch);

function which(bin) {
  const r = spawnSync('sh', ['-c', `command -v ${bin}`], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout).trim() : '';
}

function runJson(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  }
  const line = String(r.stdout).trim().split('\n').filter(Boolean).pop();
  return JSON.parse(line);
}

const goDir = path.join(peersDir, 'go_encodingxml');
const goMain = path.join(goDir, 'main.go');
const rustDir = path.join(peersDir, 'rust_quickxml');
let goBin = '';
let rustBin = '';
if (which('go')) {
  console.error('Building go encoding/xml peer...');
  goBin = path.join(tmpDir, 'onvif_bench_encodingxml');
  const build = spawnSync('go', ['build', '-o', goBin, goMain], {
    cwd: goDir,
    encoding: 'utf8',
    env: process.env,
  });
  if (build.status !== 0) {
    console.error('Go peer skipped:', (build.stderr || build.stdout || '').slice(0, 200));
    goBin = '';
  }
}
if (which('cargo')) {
  console.error('Building rust quick-xml peer (release)...');
  const build = spawnSync('cargo', ['build', '--release', '--quiet'], {
    cwd: rustDir,
    encoding: 'utf8',
    env: process.env,
  });
  if (build.status === 0) {
    rustBin = path.join(rustDir, 'target/release/onvif_bench_quickxml');
  } else {
    console.error('Rust peer skipped:', (build.stderr || build.stdout || '').slice(0, 200));
  }
}

/** @type {{ name: string, run: (mode: string, file: string, arg?: string|number) => any, cold: (file: string) => number }[]} */
const external = [];

/** Wall-clock cold: new process + read fixture + one parse (matches Node cold intent). */
function coldProcessWallMs(cmd, args) {
  const samples = [];
  for (let i = 0; i < 12; i++) {
    const t0 = performance.now();
    const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    const wall = performance.now() - t0;
    if (r.status !== 0) {
      throw new Error(`cold ${cmd} failed: ${r.stderr || r.stdout}`);
    }
    samples.push(wall);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

if (which('python3')) {
  const etreeScript = path.join(peersDir, 'python_etree.py');
  external.push({
    name: 'python xml.etree',
    run: (mode, file, arg) =>
      runJson('python3', [etreeScript, mode, file, String(arg ?? '')].filter((x) => x !== '')),
    cold: (file) => coldProcessWallMs('python3', [etreeScript, 'cold', file]),
  });
  const lxmlScript = path.join(peersDir, 'python_lxml.py');
  const lxmlProbe = spawnSync('python3', [lxmlScript, 'cold', fixtureFiles.small], {
    encoding: 'utf8',
  });
  if (lxmlProbe.status === 0 && !String(lxmlProbe.stdout).includes('"skip"')) {
    external.push({
      name: 'python lxml',
      run: (mode, file, arg) =>
        runJson('python3', [lxmlScript, mode, file, String(arg ?? '')].filter((x) => x !== '')),
      cold: (file) => coldProcessWallMs('python3', [lxmlScript, 'cold', file]),
    });
  }
}

if (goBin && fs.existsSync(goBin)) {
  external.push({
    name: 'go encoding/xml',
    run: (mode, file, arg) =>
      runJson(goBin, [mode, file, String(arg ?? '')].filter((x) => x !== '')),
    cold: (file) => coldProcessWallMs(goBin, ['cold', file]),
  });
}

if (rustBin && fs.existsSync(rustBin)) {
  external.push({
    name: 'rust quick-xml',
    run: (mode, file, arg) =>
      runJson(rustBin, [mode, file, String(arg ?? '')].filter((x) => x !== '')),
    cold: (file) => coldProcessWallMs(rustBin, ['cold', file]),
  });
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

function measureThroughput(fn, seconds = 1.5) {
  for (let i = 0; i < 20; i++) fn();
  const { n: batch } = calibrate(fn, 50);
  const deadline = performance.now() + seconds * 1000;
  let ops = 0;
  const t0 = performance.now();
  while (performance.now() < deadline) {
    for (let i = 0; i < batch; i++) fn();
    ops += batch;
  }
  const elapsed = (performance.now() - t0) / 1000;
  return { ops, elapsed, perSec: ops / elapsed };
}

function measureLatencyMs(fn, repeats = 40) {
  for (let i = 0; i < 5; i++) fn();
  const samples = [];
  for (let i = 0; i < repeats; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const median = samples[Math.floor(samples.length / 2)];
  return { mean, median, min: samples[0], max: samples[samples.length - 1] };
}

function measureBurst(parseOne, eventsPerDoc, targetEvents = 5000) {
  const docsNeeded = Math.ceil(targetEvents / eventsPerDoc);
  for (let i = 0; i < 3; i++) parseOne();
  const t0 = performance.now();
  const cpu0 = process.cpuUsage();
  for (let i = 0; i < docsNeeded; i++) parseOne();
  const wallMs = performance.now() - t0;
  const cpu = process.cpuUsage(cpu0);
  const cpuMs = (cpu.user + cpu.system) / 1000;
  return { docs: docsNeeded, events: docsNeeded * eventsPerDoc, wallMs, cpuMs };
}

function measureCpuPerRequest(fn, ops = 600) {
  for (let i = 0; i < 20; i++) fn();
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  for (let i = 0; i < ops; i++) fn();
  const wallMs = performance.now() - t0;
  const cpu = process.cpuUsage(cpu0);
  const cpuMs = (cpu.user + cpu.system) / 1000;
  return { ops, wallMs, cpuMs, cpuPerOpMs: cpuMs / ops, wallPerOpMs: wallMs / ops };
}

function measureColdStartMs(code) {
  const samples = [];
  for (let i = 0; i < 12; i++) {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8',
      env: process.env,
    });
    if (r.status !== 0) {
      throw new Error(`cold start failed: ${r.stderr || r.stdout}`);
    }
    const ms = Number.parseFloat(String(r.stdout).trim());
    if (!Number.isFinite(ms)) {
      throw new Error(`cold start bad output: ${r.stdout}`);
    }
    samples.push(ms);
  }
  samples.sort((a, b) => a - b);
  const usable = samples.slice(1);
  return {
    mean: usable.reduce((a, b) => a + b, 0) / usable.length,
    median: usable[Math.floor(usable.length / 2)],
    min: usable[0],
    max: usable[usable.length - 1],
  };
}

const workloads = {
  'small GetSystemDateAndTime': { xml: small, file: fixtureFiles.small, key: 'small' },
  'medium GetServices': { xml: medium, file: fixtureFiles.medium, key: 'medium' },
  'large GetProfiles': { xml: large, file: fixtureFiles.large, key: 'large' },
  'nvrProfiles ~511 KiB (x32)': { xml: nvrProfiles, file: fixtureFiles.nvrProfiles, key: 'nvrProfiles' },
  'events PullMessages': { xml: events, file: fixtureFiles.events, key: 'events' },
  'eventBatch (210 notifs)': { xml: eventBatch, file: fixtureFiles.eventBatch, key: 'eventBatch' },
};

console.log('Node', process.version);
console.log('Workloads (bytes):', {
  small: small.length,
  medium: medium.length,
  large: large.length,
  nvrProfiles: nvrProfiles.length,
  eventSingle: events.length,
  eventBatch: eventBatch.length,
  batchNotifs,
});
console.log('In-process:', Object.keys(inProcess).join(', '));
console.log('External:', external.map((p) => p.name).join(', ') || '(none)');
console.log('');

for (const [name, parse] of Object.entries(inProcess)) {
  for (const [wname, { xml }] of Object.entries(workloads)) {
    try {
      parse(xml);
    } catch (e) {
      console.error(`FAIL ${name} on ${wname}:`, e.message);
      process.exit(1);
    }
  }
}
for (const peer of external) {
  try {
    peer.run('latency', fixtureFiles.small, 1);
  } catch (e) {
    console.error(`FAIL peer ${peer.name}:`, e.message);
    process.exit(1);
  }
}
console.log('Smoke OK\n');

const summary = {};
for (const name of [...Object.keys(inProcess), ...external.map((p) => p.name)]) {
  summary[name] = {};
}

console.log('Warm-up...');
for (const parse of Object.values(inProcess)) {
  for (const { xml } of Object.values(workloads)) {
    for (let i = 0; i < 5; i++) parse(xml);
  }
}
for (const peer of external) {
  peer.run('throughput', fixtureFiles.small, 0.2);
}
console.log('Warm-up done\n');

console.log('=== Parse throughput (docs/s, higher better) ===');
for (const [wname, { xml, file, key }] of Object.entries(workloads)) {
  console.log(`\n-- ${wname} --`);
  for (const [pname, parse] of Object.entries(inProcess)) {
    const r = measureThroughput(() => parse(xml), 1.2);
    console.log(`  ${pname.padEnd(22)} ${r.perSec.toFixed(0).padStart(8)} /s`);
    summary[pname][key] = Math.round(r.perSec);
  }
  for (const peer of external) {
    const r = peer.run('throughput', file, 1.2);
    console.log(`  ${peer.name.padEnd(22)} ${r.perSec.toFixed(0).padStart(8)} /s`);
    summary[peer.name][key] = Math.round(r.perSec);
  }
}

console.log('\n=== Parsing ~500 KiB response (ms/parse, lower better) ===');
for (const [pname, parse] of Object.entries(inProcess)) {
  const r = measureLatencyMs(() => parse(nvrProfiles), 30);
  console.log(
    `  ${pname.padEnd(22)} mean ${r.mean.toFixed(2)} ms  median ${r.median.toFixed(2)} ms`,
  );
  summary[pname].kiB_median_ms = Number(r.median.toFixed(2));
}
for (const peer of external) {
  const r = peer.run('latency', fixtureFiles.nvrProfiles, 30);
  console.log(
    `  ${peer.name.padEnd(22)} mean ${r.mean.toFixed(2)} ms  median ${r.median.toFixed(2)} ms`,
  );
  summary[peer.name].kiB_median_ms = Number(r.median.toFixed(2));
}

console.log('\n=== Event notif/s from eventBatch (higher better) ===');
for (const [pname, parse] of Object.entries(inProcess)) {
  const r = measureThroughput(() => parse(eventBatch), 1.5);
  const notifPerSec = r.perSec * batchNotifs;
  console.log(`  ${pname.padEnd(22)} ${notifPerSec.toFixed(0).padStart(8)} notif/s`);
  summary[pname].notif_per_s = Math.round(notifPerSec);
}
for (const peer of external) {
  const r = peer.run('throughput', fixtureFiles.eventBatch, 1.5);
  const notifPerSec = r.perSec * batchNotifs;
  console.log(`  ${peer.name.padEnd(22)} ${notifPerSec.toFixed(0).padStart(8)} notif/s`);
  summary[peer.name].notif_per_s = Math.round(notifPerSec);
}

const burstDocs = Math.ceil(5000 / batchNotifs);
console.log('\n=== Burst of ~5,000 events via eventBatch (wall ms, lower better) ===');
for (const [pname, parse] of Object.entries(inProcess)) {
  const r = measureBurst(() => parse(eventBatch), batchNotifs, 5000);
  console.log(`  ${pname.padEnd(22)} wall ${r.wallMs.toFixed(0).padStart(6)} ms`);
  summary[pname].burst_wall_ms = Math.round(r.wallMs);
}
for (const peer of external) {
  const r = peer.run('burst', fixtureFiles.eventBatch, burstDocs);
  console.log(`  ${peer.name.padEnd(22)} wall ${r.wallMs.toFixed(0).padStart(6)} ms`);
  summary[peer.name].burst_wall_ms = Math.round(r.wallMs);
}

console.log('\n=== CPU time per request (GetProfiles parse, Node in-process only) ===');
for (const [pname, parse] of Object.entries(inProcess)) {
  const r = measureCpuPerRequest(() => parse(large), 600);
  console.log(`  ${pname.padEnd(22)} cpu ${r.cpuPerOpMs.toFixed(3).padStart(7)} ms/req`);
  summary[pname].cpu_ms_req = Number(r.cpuPerOpMs.toFixed(3));
}

const coldXml = JSON.stringify(small);
const coldScripts = {
  'onvif parseXml': `
    const t0 = performance.now();
    const { parseXml } = await import(${JSON.stringify(pathToFileURL(path.join(root, 'build/utils/parser.js')).href)});
    parseXml(${coldXml});
    process.stdout.write(String(performance.now() - t0));
  `,
};
if (peerOnvifParse) {
  coldScripts['@2bad/onvif parseXml'] = `
    const t0 = performance.now();
    const { parseXml } = await import(${JSON.stringify(pathToFileURL(path.join(root, 'node_modules/@2bad/onvif/build/soap/parse.js')).href)});
    parseXml(${coldXml});
    process.stdout.write(String(performance.now() - t0));
  `;
}
if (fxpMod) {
  coldScripts['fast-xml-parser'] = `
    const t0 = performance.now();
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { XMLParser } = require(${JSON.stringify(path.join(root, 'node_modules/fast-xml-parser'))});
    const p = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    p.parse(${coldXml});
    process.stdout.write(String(performance.now() - t0));
  `;
}

console.log('\n=== Cold start (import/process + 1 tiny parse, ms, lower better) ===');
for (const [pname, code] of Object.entries(coldScripts)) {
  const r = measureColdStartMs(code);
  console.log(`  ${pname.padEnd(22)} median ${r.median.toFixed(1).padStart(6)} ms`);
  summary[pname].cold_median_ms = Number(r.median.toFixed(1));
}
for (const peer of external) {
  const median = peer.cold(fixtureFiles.small);
  console.log(`  ${peer.name.padEnd(22)} median ${median.toFixed(1).padStart(6)} ms`);
  summary[peer.name].cold_median_ms = Number(median.toFixed(1));
}

function cell(v, digits = 0) {
  if (!Number.isFinite(v)) return 'n/a';
  return digits ? v.toFixed(digits) : String(Math.round(v));
}

const names = Object.keys(summary);
console.log('\n=== Summary (parse step only; cross-runtime peers included when available) ===');
console.log('| Metric | ' + names.join(' | ') + ' |');
console.log('| --- | ' + names.map(() => '---:').join(' | ') + ' |');
for (const [label, key, digits] of [
  ['small docs/s', 'small', 0],
  ['medium docs/s', 'medium', 0],
  ['large docs/s', 'large', 0],
  ['~500 KiB median ms', 'kiB_median_ms', 2],
  ['eventBatch notif/s', 'notif_per_s', 0],
  ['burst ~5k wall ms', 'burst_wall_ms', 0],
  ['CPU ms/req (GetProfiles)', 'cpu_ms_req', 3],
  ['cold start median ms', 'cold_median_ms', 1],
]) {
  console.log(
    `| ${label} | ` + names.map((n) => cell(summary[n][key], digits)).join(' | ') + ' |',
  );
}

console.log(`\nTemp fixtures: ${tmpDir}`);
