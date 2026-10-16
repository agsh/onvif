import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-SOAP-call store: transport metadata plus optional request/response XML.
 *
 * - Transport always enters this ALS (or mutates the active store) with
 *   `host` / `service` / `action` so {@link OnvifError} can pick them up.
 * - For XML capture, wrap the call in {@link requestContext}.run with a store
 *   you own; {@link Onvif.request} writes `requestXml` / `responseXml` into
 *   that same object.
 *
 * See [innerDocs/soap-xml.md](../../innerDocs/soap-xml.md).
 */
export type OnvifRequestContext = {
  host?: string;
  service?: string;
  action?: string;
  requestXml?: string;
  responseXml?: string;
};

export const requestContext = new AsyncLocalStorage<OnvifRequestContext>();
