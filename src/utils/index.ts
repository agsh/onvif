export {
  OnvifError,
  OnvifErrorOptions,
  OnvifResponseError,
  OnvifSoapFaultError,
  OnvifAuthError,
  OnvifValidationError,
  isSenderNotAuthorizedFault,
} from './errors';
export { CommonDuration, toIsoDuration, toMs, guid, struct, soapXml, type SoapXmlStore } from './helpers';
export { splitArgs, getDigestHeaders } from './digest';
export { camelCase } from './naming';

export {
  LineraseOptions,
  ITEM_LIST_PARSE,
  ANALYTICS_CONFIG_PARSE,
  MEDIA_NESTED_PARSE,
  MEDIA_CONFIGURATION_PARSE,
  linerase,
} from './linerase';
export {
  OnvifResponse,
  parseSOAPString,
  build,
  soapActionFromBody,
  soapActionFromXml,
  formatXMLValues,
} from './soap';
