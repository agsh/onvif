# SOAP XML: build, parse, `request` / `rawRequest`

This note covers how the library turns JS objects into SOAP envelopes, parses responses, and how
to inspect per-call request/response XML. Vendor `xs:any` / `xs:anyAttribute` details live in
[vendor-extensions.md](vendor-extensions.md).

There is **no** runtime XML dependency. Build and parse are small in-repo helpers tuned for
machine-generated ONVIF SOAP 1.2 (not a general-purpose XML stack):

| Module | Role |
| --- | --- |
| `src/utils/builder.ts` (`buildXml`) | Compact serializer (`$` / `_` object model) |
| `src/utils/parser.ts` (`parseXml`) | Stack / `indexOf` / `charCodeAt` parser (normal / `xsanyTree` / `rawXML`) |
| `src/utils/xml.ts` | Re-exports + test helper `soapEnvelope` |
| `src/utils/soap.ts` | `build` / `parseSOAPString` on top of the above |

### Stack parser (1.1.0+)

`parseXml` walks the document with an explicit element stack: find the next `<`, copy text,
push on open tags, finalize + pop on close. Names and attributes use `charCodeAt` bounds (no
per-character `charAt` walker). Entities early-return when there is no `&`. `rawXML` hosts
accumulate the camelCase tree and the `xsany` write-back tree in **one** pass (no second scan of
the same subtree). Leaf coerce and camelCase keep the same public shapes as `1.0.0`, with a
fast path + name cache.

On representative ONVIF SOAP workloads (device / media / events / large NVR-style envelopes),
parse speed is about **~4x** vs `1.0.0`. Among ONVIF clients for Node.js, this parse path sits in
the top tier for SOAP XML throughput. See also [performance.md](performance.md).

## Object model (`$` / `_`)

Build and (for `rawXML` / `xsany`) parse use an
[xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)-style tree:

| Key | Meaning |
| --- | --- |
| `$` | XML attributes (object) |
| `_` | Element text content |
| other keys | Child elements (PascalCase / prefixed names when building) |

Example fragment:

```ts
{
  Password: {
    $: { Type: '...#PasswordDigest' },
    _: 'base64digest...',
  },
}
```

becomes:

```xml
<Password Type="...#PasswordDigest">base64digest...</Password>
```

## Building XML - `build()` / `buildXml`

```ts
import { build } from 'onvif';

const xml = build({
  's:Envelope': {
    $: { 'xmlns:s': 'http://www.w3.org/2003/05/soap-envelope' },
    's:Body': {
      GetHostname: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } },
    },
  },
});
```

`build` is a thin wrapper around `buildXml`:

- **Compact** output (no pretty-print). Some cameras reject indented SOAP (#497).
- `$` -> attributes, `_` -> text, other keys -> children; arrays repeat the same tag.
- Empty / `null` / `{}` / empty string -> self-closing `<Tag/>`.
- `true` / `"true"` attributes emit a bare name (no `="..."`).
- `Date` -> UTC ISO-8601 (`xs:dateTime`).
- Escapes `& < > " '` in text and attribute values.
- Does **not** emit `<?xml ...?>` or other PIs -- callers prepend the declaration when needed
  (`soapEnvelope` in tests, or the request path).

## Parsing XML - `parseXml` / `parseSOAPString()`

`parseXml` is a single-pass stack reader (no DOM, no schema, no runtime XML package). Options:

| Option | Effect |
| --- | --- |
| (default) | Strip NS prefixes, camelCase tags/attrs, flatten attrs, trim text; coerce leaf strings (see below) |
| `array: ['item']` | Force listed camelCase tags to always be arrays |
| `rawXML: ['elementItem']` | Dual parse: camelCase flatten + non-enumerable `xsany` (xml2js-shaped write-back tree) |
| `xsanyTree: true` | Whole document as write-back tree: keep prefixes, attrs in `$`, every element an array |

```ts
import { parseSOAPString } from 'onvif';

const [body, xml] = await parseSOAPString(rawSoapString, {
  array: ['profiles'],
  rawXML: ['elementItem'],
});
```

`parseSOAPString` calls `parseXml` (normal mode coerces leaf strings in one pass; `xsany` /
`xsanyTree` stay strings), then:

- Expects SOAP `Envelope` / `Body`. Empty or non-SOAP bodies throw `OnvifResponseError`.
  Malformed XML throws `OnvifParseError`.
- SOAP Faults throw `OnvifSoapFaultError` with SOAP 1.2 `Code` / `Subcode` / `Reason` / `Detail`
  (`faultCode`, `faultSubcode` / `faultSubcodes`, `faultReason`, `faultDetail`) - see
  [errors.md](errors.md).
- Returns `[body, originalXmlString]`.
- Typed service methods usually run the body through `linerase()` and unwrap a single useful value.

### Intentional ONVIF SOAP simplifications

The parser targets **machine-generated SOAP 1.2** from cameras / NVRs, not full XML 1.0:

| Supported | Intentionally omitted / simplified |
| --- | --- |
| Leading UTF-8 BOM (`\uFEFF`), e.g. some XiongMai / XM firmwares | -- |
| Leading `<?xml version="..." encoding="..."?>` only (stripped) | Other PIs, mid-document / trailing PIs |
| Elements, attributes, text, entities (`&amp;` / `&#...;`) | Comments (`<!-- -->`) |
| CDATA -> text (mixed with entities; several CDATA ok) for vendor / `xs:any` | DOCTYPE / DTD / external entities |
| SOAP 1.2 Fault fields only | SOAP 1.1 `faultcode` / `faultstring` |
| Leaf coerce: bool / number / ISO `...T...Z` Date; `001` stays string | Date-only `YYYY-MM-DD` stays string; no full XSD typing |
| Duplicate siblings -> arrays; optional `array` force | -- |

Why keep it narrow: less code, predictable trees for ONVIF services, and no security surface from
DOCTYPE / entity expansion. Quirky vendor markup that still fits elements + text + CDATA is
handled; human-edited XML with comments or DOCTYPE is out of scope.

## `Onvif.request()` - public SOAP API

```ts
const [body, xml] = await onvif.request({
  service: 'device', // optional; selects path from onvif.uri[service]
  body: {
    GetHostname: {}, // operation name -> children; xmlns often injected by Service.request
  },
  array: ['scopes'],
  rawXML: ['elementItem'],
  soapHeaders: {
    /* extra Header children */
  },
  signal, // AbortSignal
  timeout, // ms
  url, // override URL (events / pull-point)
});
```

What it sends on the wire:

1. Wraps `body` in SOAP 1.2 envelope:
   - `s:Envelope` with `xmlns:s` + `xmlns:a` (WS-Addressing)
   - `s:Header` from `envelopeHeader()` - WS-Security UsernameToken PasswordDigest when
     `useWSSecurity` and credentials are set, plus optional `soapHeaders`
   - `s:Body` with XSD/XSI xmlns plus your operation tree (`envelopeBody`)
2. Serializes with `build()` -> **one compact XML string**.
3. POSTs with
   `Content-Type: application/soap+xml;charset=utf-8;action="<namespace>/<Operation>"`
   (action derived from the body root + xmlns, like v0.x).
4. Parses the HTTP response with `parseSOAPString` and resolves to `[parsedBody, responseXml]`.

Typical app code uses service helpers (`onvif.device.getHostname()`), which call
`Service.request` -> `onvif.request` and return unwrapped data. Use `onvif.request` when you need
a raw body / XML pair or an operation without a typed wrapper.

```ts
// Escape hatch - same transport as typed methods
const [data, xml] = await onvif.request({
  service: 'device',
  body: {
    GetHostname: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } },
  },
});
console.log(data.getHostnameResponse, xml);
```

## `rawRequest()` - private transport

`Onvif.rawRequest` is **not** part of the public API (TypeScript `private`). It is the HTTP/Digest
layer used by `request()` and a few internal paths (e.g. unauthenticated `GetSystemDateAndTime`
before `timeShift` exists).

Differences from `request()`:

| | `request()` | `rawRequest()` (internal) |
| --- | --- | --- |
| `body` | JS object (`OnvifSoapBody`) | **pre-built XML string** |
| Envelope / WS-Security | built for you | caller supplies full envelope string |
| SOAP `action` | derived from body object | optional `action` string, else guessed from XML |
| Return | `[parsedBody, xml]` | same |

Internal example shape (do not rely on calling this from app code):

```ts
// Conceptual - rawRequest is private
await this.rawRequest({
  body: build({
    's:Envelope': {
      $: { 'xmlns:s': 'http://www.w3.org/2003/05/soap-envelope' },
      's:Body': this.envelopeBody({
        GetSystemDateAndTime: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } },
      }),
    },
  }),
  action: 'http://www.onvif.org/ver10/device/wsdl/GetSystemDateAndTime',
});
```

For custom envelopes from application code, prefer `build(...)` + the public surface you need, or
open an issue if a typed/public escape hatch is missing - do not depend on `rawRequest`.

## Per-call store - `requestContext`

One [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage)
holds both transport metadata and optional SOAP XML.

| Field | Set when |
| --- | --- |
| `host` / `service` / `action` | Transport enters or mutates the active store for each SOAP HTTP call |
| `requestXml` | `Onvif.request` built the outbound envelope **and** a store was already active |
| `responseXml` | Response body paired with that call (same store) |

`OnvifError` (and `assignErrorContext` for plain transport Errors) read `host` / `service` /
`action` from the store so deep helpers like `parseSOAPString` do not need those fields
threaded through every call.

To capture XML for a specific call (including under `Promise.all`), wrap it in
`requestContext.run` with a store you own:

```ts
import { Onvif, requestContext, type OnvifRequestContext } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

const store: OnvifRequestContext = {};
const info = await requestContext.run(store, () => onvif.device.getDeviceInformation());

console.log(store.requestXml); // outbound SOAP envelope (string from build)
console.log(store.responseXml); // inbound SOAP envelope
console.log(store.host, store.service, store.action); // filled by transport
console.log(info.manufacturer);

// Inside the async chain you can also read the active store:
await requestContext.run({}, async () => {
  await onvif.media.getProfiles();
  const { requestXml, responseXml } = requestContext.getStore() ?? {};
  console.log(requestXml, responseXml);
});

await onvif.close();
```

Without a caller wrap, transport still enters a fresh store for error context, but you will
not keep a reference to `requestXml` / `responseXml` after the call returns.

Events `rawRequest` / `rawResponse` still fire for every HTTP exchange, but they are **not**
correlated to a particular `Promise.all` caller - prefer `requestContext` when you need that
pairing.

The v0 compatibility `Cam` callback third argument (`xml`) is the **response** envelope for that
call (same per-request store).

## Related

- Vendor extensions / `xsany`: [vendor-extensions.md](vendor-extensions.md)
- Events long-poll + `AbortSignal` on `request`: [events.md](events.md)
- Automated tests / HappyTime: [testing.md](testing.md)
- Fault shape: [errors.md](errors.md)
