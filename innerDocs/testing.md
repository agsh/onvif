# Testing

All tests use Jest. Suites live under `__tests__/`.

## Commands

```bash
npm test          # lint + HappyTime mock server + full Jest suite
npm run test-local  # Jest only (expects HappyTime already running on :8000)
npm run build
npm run lint
```

`npm test` starts [happytime-onvif-server](https://github.com/agsh/happytime-onvif-server) from
[HappyTimeSoft](https://www.happytimesoft.com/index.html)
(products: https://www.happytimesoft.com/product.html), runs the suite, then stops the server.

Integration suites also cover the v0.x compatibility layer (`onvif/compatibility` and
`onvif/compatibility/promises`).

Golden suite `__tests__/compatibility.golden.test.ts` runs the same scenarios against npm `onvif@0.8.2`
(`onvif-v0`) and the compatibility `Cam`, comparing callback args (`err`, `data`, `xml`), key result fields,
post-connect properties, and `rawRequest` / `rawResponse` events.

## Pointing tests at another device

Default connection options are in `__tests__/happytime.json` (`127.0.0.1:8000`). To exercise a different
ONVIF device, start or configure that endpoint and adjust hostname / port / credentials accordingly before
`npm run test-local`.
