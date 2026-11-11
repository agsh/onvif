export {
  OnvifError,
  type OnvifErrorOptions,
  OnvifResponseError,
  OnvifParseError,
  OnvifTimeoutError,
  OnvifTransportError,
  OnvifSoapFaultError,
  OnvifAuthError,
  OnvifValidationError,
  assignErrorContext,
  isSenderNotAuthorizedFault,
} from './errors';
export { type CommonDuration, toIsoDuration, toMs, guid, struct } from './helpers';
export { requestContext, type OnvifRequestContext } from './request-context';
export { splitArgs, getDigestHeaders } from './digest';
export { camelCase } from './naming';

export {
  type LineraseOptions,
  ITEM_LIST_PARSE,
  ANALYTICS_CONFIG_PARSE,
  MEDIA_NESTED_PARSE,
  MEDIA_CONFIGURATION_PARSE,
  linerase,
} from './linerase';
export {
  type OnvifResponse,
  parseSOAPString,
  build,
  soapActionFromBody,
  soapActionFromXml,
  formatXMLValues,
} from './soap';
