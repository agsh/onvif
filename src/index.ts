export * from './onvif';
export * from './events';
export { default as Events } from './events';
export * from './discovery';
export * from './utils';
export { xsany } from './utils/toOnvifXMLSchemaObject';

// Service classes are type-only here so CommonJS `require('onvif')` does not load them.
// Runtime instances come from lazy getters on Onvif (e.g. onvif.recording).
export type { default as Device } from './device';
export type { default as Media, GetStreamUriOptions } from './media';
export type {
  default as Media2,
  ConfigurationRefExtended,
  AudioOutputConfigurationExtended,
} from './media2';
export type { default as PTZ, GetPresetsExtended } from './ptz';
export type { default as Replay, GetReplayUriOptions } from './replay';
export type { default as Imaging } from './imaging';
export type { default as Recording } from './recording';
export type { default as DoorControl } from './doorcontrol';
export type { default as AccessControl } from './accesscontrol';
export type { default as Credential } from './credential';
export type { default as AccessRules } from './accessrules';
export type { default as Schedule } from './schedule';
export type { default as Provisioning } from './provisioning';
export type { default as AdvancedSecurity } from './advancedsecurity';
export type { default as Thermal } from './thermal';
export type { default as Analytics } from './analytics';
export type { default as DeviceIO } from './deviceio';
export type { default as Display } from './display';
export type { default as ActionEngine } from './actionengine';
export type { default as Search } from './search';
export type { default as AnalyticsDevice } from './analyticsdevice';
export type { default as Receiver } from './receiver';
export type { default as Service } from './service';
// export * from './compatibility/cam'; // use compatibility directly, ex.: require('onvif/compatibility/promises')
