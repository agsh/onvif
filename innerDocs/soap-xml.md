# SOAP XML: build, parse, `request` / `rawRequest`

This note covers how the library turns JS objects into SOAP envelopes, parses responses, and how
to inspect per-call request/response XML. Vendor `xs:any` / `xs:anyAttribute` details live in
[vendor-extensions.md](vendor-extensions.md).

## Object model (`$` / `_`)

Build and (for `rawXML` / `xsany`) parse use an [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)-style
tree:

| Key | Meaning |
| --- | --- |
| `$` | XML attributes (object) |
| `_` | Element text content |
| other keys | Child elements (PascalCase / prefixed names when building) |

Example fragment:

```ts
{
  Password: {
    $: { Type: '…#PasswordDigest' },
    _: 'base64digest…',
  },
}
```

becomes:

```xml
<Password Type="…#PasswordDigest">base64digest…</Password>
```

## Building XML — `build()`

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

- Output is **compact** (no pretty-print). Some cameras reject indented SOAP (#497).
- `build` is a thin wrapper around `fast-xml-parser` `XMLBuilder` with `attributesGroupName: '$'`
  and `textNodeName: '_'`.

## Parsing XML — `parseSOAPString()`

```ts
import { parseSOAPString } from 'onvif';

const [body, xml] = await parseSOAPString(rawSoapString, {
  array: ['profiles'], // force these tag names to arrays
  rawXML: ['elementItem'], // keep xml2js-style trees (+ xsany) for these tags
});
```

- Expects a SOAP `Envelope` / `Body`. Empty or non-SOAP bodies throw `OnvifResponseError`.
- SOAP Faults throw `OnvifSoapFaultError` (with `faultCode`, `faultReason`, …).
- Returns `[body, originalXmlString]`. Tag names are camelCased; namespaces are stripped on the
  normal parse path (except under `rawXML` / `xsany`).
- Typed service methods usually run the body through `linerase()` and unwrap a single useful value.

## `Onvif.request()` — public SOAP API

```ts
const [body, xml] = await onvif.request({
  service: 'device', // optional; selects path from onvif.uri[service]
  body: {
    GetHostname: {}, // operation name → children; xmlns often injected by Service.request
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
   - `s:Header` from `envelopeHeader()` — WS-Security UsernameToken PasswordDigest when
     `useWSSecurity` and credentials are set, plus optional `soapHeaders`
   - `s:Body` with XSD/XSI xmlns plus your operation tree (`envelopeBody`)
2. Serializes with `build()` → **one compact XML string**.
3. POSTs with
   `Content-Type: application/soap+xml;charset=utf-8;action="<namespace>/<Operation>"`
   (action derived from the body root + xmlns, like v0.x).
4. Parses the HTTP response with `parseSOAPString` and resolves to `[parsedBody, responseXml]`.

Typical app code uses service helpers (`onvif.device.getHostname()`), which call
`Service.request` → `onvif.request` and return unwrapped data. Use `onvif.request` when you need
a raw body / XML pair or an operation without a typed wrapper.

```ts
// Escape hatch — same transport as typed methods
const [data, xml] = await onvif.request({
  service: 'device',
  body: {
    GetHostname: { $: { xmlns: 'http://www.onvif.org/ver10/device/wsdl' } },
  },
});
console.log(data.getHostnameResponse, xml);
```

## `rawRequest()` — private transport

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
// Conceptual — rawRequest is private
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
open an issue if a typed/public escape hatch is missing — do not depend on `rawRequest`.

## Inspecting request / response XML — `soapXml`

Service methods return parsed data only. To read the raw SOAP **request** and **response** envelopes
for a specific call (including under `Promise.all`), wrap the call in `soapXml`
([`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage)).
Keep a store object you own — `Onvif.request` writes into it when the call runs inside `soapXml.run`:

```ts
import { Onvif, soapXml, type SoapXmlStore } from 'onvif';

const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
await onvif.connect();

const store: SoapXmlStore = {};
const info = await soapXml.run(store, () => onvif.device.getDeviceInformation());

console.log(store.requestXml); // outbound SOAP envelope (string from build)
console.log(store.responseXml); // inbound SOAP envelope
console.log(info.manufacturer);

// Inside the async chain you can also read the active store:
await soapXml.run({}, async () => {
  await onvif.media.getProfiles();
  const { requestXml, responseXml } = soapXml.getStore() ?? {};
  console.log(requestXml, responseXml);
});

await onvif.close();
```

`SoapXmlStore` fields:

| Field | Set when |
| --- | --- |
| `requestXml` | `Onvif.request` has built the outbound envelope |
| `responseXml` | HTTP response body has been received and paired with that call |

Events `rawRequest` / `rawResponse` still fire for every HTTP exchange, but they are **not**
correlated to a particular `Promise.all` caller — prefer `soapXml` when you need that pairing.

The v0 compatibility `Cam` callback third argument (`xml`) is the **response** envelope for that
call (same per-request store).

## Related

- Vendor extensions / `xsany`: [vendor-extensions.md](vendor-extensions.md)
- Events long-poll + `AbortSignal` on `request`: [events.md](events.md)
- Automated tests / HappyTime: [testing.md](testing.md)
