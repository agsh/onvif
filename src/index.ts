/**
 * ONVIF client library entry point.
 *
 * @categoryDescription Core
 * Main client entry points: connect to a device ({@link Onvif}) and discover cameras on the LAN ({@link Discovery}).
 *
 * @categoryDescription Services
 * Lazy-loaded ONVIF service namespaces accessed via `onvif.media`, `onvif.ptz`, `onvif.doorControl`, etc.
 *
 * @categoryDescription Errors
 * Typed errors thrown by the client and SOAP fault handling.
 *
 * @packageDocumentation
 * @showCategories
 */
export * from './onvif';
export * from './events';
export * from './discovery';
export * from './utils';
export { xsany } from './utils/toOnvifXMLSchemaObject';
export type { ConnectOptions } from './connection';

// Service classes are type-only here so CommonJS `require('onvif')` does not load them.
// Runtime instances come from lazy getters on Onvif (e.g. onvif.recording).
export type { default as Device } from './services/device';
export type { default as Media, GetStreamUriOptions } from './services/media';
export type { default as Media2, ConfigurationRefExtended, AudioOutputConfigurationExtended } from './services/media2';
export type { default as PTZ, GetPresetsExtended } from './services/ptz';
export type { default as Replay, GetReplayUriOptions } from './services/replay';
export type { default as Imaging } from './services/imaging';
export type { default as Recording } from './services/recording';
export type { default as DoorControl } from './services/doorcontrol';
export type { default as AccessControl } from './services/accesscontrol';
export type { default as Credential } from './credential';
export type { default as AccessRules } from './services/accessrules';
export type { default as Schedule } from './services/schedule';
export type { default as Provisioning } from './services/provisioning';
export type { default as AdvancedSecurity } from './services/advancedsecurity';
export type { default as Thermal } from './services/thermal';
export type { default as Uplink } from './services/uplink';
export type { default as AppManagement } from './services/appmgmt';
export type { default as Analytics } from './services/analytics';
export type { default as DeviceIO } from './services/deviceio';
export type { default as Display } from './services/display';
export type { default as ActionEngine } from './services/actionengine';
export type { default as Search } from './services/search';
export type { default as AnalyticsDevice } from './services/analyticsdevice';
export type { default as Receiver } from './services/receiver';
export type { default as Service } from './services/service';
// export * from './compatibility/cam'; // use compatibility directly, ex.: require('onvif/compatibility/promises')
