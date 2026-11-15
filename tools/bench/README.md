# Internal parse benches

`parse-throughput.mjs` - workloads in the usual ONVIF parse-bench shape
(small / medium / large / nvrProfiles x32 / eventBatch) against:

In-process (Node, skipped if missing):

- this package `parseXml`
- `@2bad/onvif` `build/soap/parse.js`
- `fast-xml-parser`
- `xml2js`

Out-of-process peers (skipped if tooling / deps missing):

- Python `xml.etree.ElementTree` / optional `lxml`
- Go `encoding/xml` (token decoder)
- Rust `quick-xml`

```sh
npm run build
npm install --no-save @2bad/onvif@2.3.0 fast-xml-parser
npm run bench:xml
# snapshot-style multi-run (example: 15 runs, drop 2 best + 2 worst):
BENCH_RUNS=15 BENCH_DROP=2 npm run bench:xml
```

The script warms up, prints per-section detail, then a compact summary table
(docs/s, ~500 KiB median ms, notif/s, burst wall ms, CPU ms/req, cold start).
With `BENCH_RUNS` / `BENCH_DROP`, each metric is sampled that many times and the
summary is a trimmed mean (sorted ascending; drop DROP lowest and DROP highest).

Fixtures live in `__tests__/fixtures/soap/`. Numbers are machine-local.

A longer write-up of methodology + a snapshot table lives at the **end** of
`innerDocs/performance.md` (appendix; not linked from README Features). Prefer
that appendix for agents; keep RELEASE / README soft on named head-to-head claims.
