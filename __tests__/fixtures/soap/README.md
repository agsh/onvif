# SOAP XML fixtures (corpus)

Checked-in ONVIF SOAP envelopes for parse regression (no live cameras in CI).

| File | Role |
| --- | --- |
| `device.GetSystemDateAndTime.xml` | Small device reply |
| `device.GetServices.xml` | Medium multi-service reply |
| `media.GetProfiles.xml` | Larger Media GetProfiles |
| `events.PullMessages.xml` | PullMessages with notifications |
| `fault.soap12.xml` | SOAP 1.2 Fault |
| `fault.soap11.xml` | SOAP 1.1 Fault (vendor quirk) |
| `device.GetSystemDateAndTime.bom.xml` | UTF-8 BOM + declaration |

XAddrs use documentation IPs (`192.0.2.0/24`). Treat as anonymized vendor-like
captures for parser tests and internal benches, not as conformance samples.
