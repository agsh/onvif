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
export {
  type CommonDuration,
  toIsoDuration,
  toMs,
  toDate,
  type DateLike,
  guid,
  struct,
  withUrlCredentials,
} from './helpers';
export {
  coerceRecordingSummary,
  coerceRecordingInformation,
  coerceMediaAttributes,
  coerceMediaAttributesList,
  coerceFindResultList,
  coerceStatusTimes,
  coercePTZStatus,
  coerceAppInfo,
  coerceAppInfoList,
  coerceCredentialValidity,
  coerceCredentialEntity,
  coerceCredentialEntityList,
  coerceCertificateInformation,
  coerceNotificationMessage,
  coerceNotificationMessages,
} from './dates';

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
} from './soap';
export { type ParseXmlOptions, parseXml, buildXml } from './xml';
export {
  type VideoEncoderResolutionPatch,
  type UpdateVideoEncoderConfiguration,
  type UpdateVideoEncoder2Configuration,
  applyVideoEncoderPatch,
  applyVideoEncoder2Patch,
  applyMedia1EncodingSwitch,
  applyMedia2EncodingSwitch,
  findVideoEncoder2Options,
} from './videoEncoderPatch';
