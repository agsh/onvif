/**
 * Options shared by {@link OnvifError} and its subclasses.
 */
export interface OnvifErrorOptions {
  /** Raw SOAP / HTTP body associated with the failure */
  xml?: string;
  /** HTTP status code when the failure came from an HTTP response */
  statusCode?: number;
  /** Nested cause (network error, parser error, etc.) */
  cause?: unknown;
}

/**
 * Base error for the ONVIF client. Prefer subclasses when the failure kind is known.
 * @category Errors
 */
export class OnvifError extends Error {
  public readonly xml?: string;
  public readonly statusCode?: number;

  constructor(message: string, options?: OnvifErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.xml = options?.xml;
    this.statusCode = options?.statusCode;
  }
}

/** Empty, non-SOAP, or otherwise unexpected response body.
 * @category Errors
 */
export class OnvifResponseError extends OnvifError {}

/** SOAP 1.2 Fault from the device.
 * @category Errors
 */
export class OnvifSoapFaultError extends OnvifError {
  public readonly faultCode?: string;
  /** SOAP 1.2 Subcode Value when present (e.g. `ter:NotAuthorized`). */
  public readonly faultSubcode?: string;
  public readonly faultReason?: string;
  public readonly faultDetail?: string;

  constructor(
    message: string,
    options?: OnvifErrorOptions & {
      faultCode?: string;
      faultSubcode?: string;
      faultReason?: string;
      faultDetail?: string;
    },
  ) {
    super(message, options);
    this.faultCode = options?.faultCode;
    this.faultSubcode = options?.faultSubcode;
    this.faultReason = options?.faultReason;
    this.faultDetail = options?.faultDetail;
  }
}

/** HTTP Digest / credentials rejected by the device.
 * @category Errors
 */
export class OnvifAuthError extends OnvifError {}

/** Invalid arguments or unexpected response shape from a client-side check.
 * @category Errors
 */
export class OnvifValidationError extends OnvifError {}

/**
 * True when a SOAP Fault means the unauthenticated (or unauthorized) request was rejected
 * and should be retried with credentials — e.g. Panasonic / Digital Barriers GetSystemDateAndTime.
 */
export function isSenderNotAuthorizedFault(error: unknown): boolean {
  if (!(error instanceof OnvifSoapFaultError)) {
    return false;
  }
  const normalized = [error.faultCode, error.faultSubcode, error.faultReason, error.faultDetail]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .map((part) => part.toLowerCase().replace(/[\s_-]+/g, ''));
  return normalized.some(
    (part) => part.includes('notauthorized') || part.includes('sendernotauthorized'),
  );
}
