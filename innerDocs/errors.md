# Errors

Typed failures from the ONVIF client. Prefer `instanceof` on the subclasses below rather than
matching message strings.

All of these extend `OnvifError` and may carry:

| Field | Meaning |
| --- | --- |
| `host` / `service` / `action` | Filled from the active `requestContext` when known |
| `statusCode` | HTTP status when the failure came from a response |
| `xml` | Raw response body when available |
| `cause` | Underlying error (socket, parser, …) |

## Class map

| Class | When |
| --- | --- |
| `OnvifTimeoutError` | HTTP socket timeout. `code === 'ETIMEDOUT'` (same as the old plain errno Error). |
| `OnvifTransportError` | Other network failures (`ECONNRESET`, `ECONNREFUSED`, DNS, …). `code` mirrors the errno when present. |
| `OnvifParseError` | Response body is not well-formed XML. |
| `OnvifResponseError` | Empty body, or a non-SOAP HTTP body (HTML / proxy noise) that is not a Fault envelope. |
| `OnvifSoapFaultError` | Device returned a SOAP `Fault` (see below). |
| `OnvifAuthError` | Digest / credentials rejected (missing challenge, failed auth after retry). |
| `OnvifValidationError` | Bad client-side arguments or unexpected response shape in a helper. |

`AbortSignal` cancellation still rejects with a native `AbortError` (not wrapped).

```ts
import {
  Onvif,
  OnvifTimeoutError,
  OnvifTransportError,
  OnvifSoapFaultError,
  isSenderNotAuthorizedFault,
} from 'onvif';

try {
  await onvif.device.getDeviceInformation();
} catch (err) {
  if (err instanceof OnvifTimeoutError) {
    // camera slow / unreachable within `timeout`
  } else if (err instanceof OnvifTransportError) {
    console.error(err.code, err.cause); // e.g. ECONNRESET
  } else if (err instanceof OnvifSoapFaultError) {
    console.error(err.faultCode, err.faultSubcode, err.faultReason);
  } else {
    throw err;
  }
}
```

There is **no** automatic retry on Get* / ordinary SOAP calls. A dead camera and a brief 502 look
similar at the transport layer — the application decides whether to retry.

## SOAP Faults — 1.1 and 1.2

ONVIF prefers SOAP 1.2, but some devices still emit SOAP 1.1 Faults. Field names differ on the wire;
`parseSOAPString` normalizes both into `OnvifSoapFaultError`:

| Normalized field | SOAP 1.2 | SOAP 1.1 |
| --- | --- | --- |
| `faultCode` | `Code/Value` (`s:Sender`, `s:Receiver`, …) | `faultcode` (`s:Client`, `s:Server`, …) |
| `faultSubcode` | First `Code/Subcode/Value` | First meaningful `detail` child name (e.g. `NotAuthorized`) |
| `faultSubcodes` | Full nested Subcode chain, outermost first | Detail-derived codes (same source as `faultSubcode`) |
| `faultReason` | `Reason/Text` | `faultstring` |
| `faultDetail` | `Detail` text when present | `detail` text when present |

Wire values are kept as reported (`s:Client` is not rewritten to `s:Sender`).

```ts
// SOAP 1.2 example shape after parse
err.faultCode; // 's:Sender'
err.faultSubcode; // 'ter:NotAuthorized'
err.faultSubcodes; // ['ter:NotAuthorized'] or ['ter:InvalidArgVal', 'ter:PasswordTooWeak']
err.faultReason; // human-readable Reason/Text
```

`isSenderNotAuthorizedFault(err)` is true when any of those fields indicates a not-authorized /
Sender-not-authorized Fault (used internally for Digest / WS-Security retry paths).

## Related

- SOAP build / parse / `requestContext`: [soap-xml.md](soap-xml.md)
- Connect failures and mid-session transport errors: [connection.md](connection.md)
