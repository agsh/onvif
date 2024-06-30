import { Date, StringAttrList, Capabilities } from './onvif';
import { AnyURI } from './basics';

export type AppState = 'Active' | 'Inactive' | 'Installing' | 'Uninstalling' | 'Removed' | 'InstallationFailed';
export interface AppInfo {
  /** Unique app identifier of the application instance. */
  appID?: string;
  /** User readable application name */
  name?: string;
  /** Version of the installed application. The details of the format are outside of the scope of this specificaton. */
  version?: string;
  /** Licenses associated with the application. */
  licenses?: LicenseInfo[];
  /** List of privileges granted to the application. */
  privileges?: string[];
  /** Date and time when the application has been installed. */
  installationDate?: Date;
  /** Time of last update to this app, i.e. the time when this particular version was installed. */
  lastUpdate?: Date;
  /** InstallationFailed state shall not be used here. */
  state?: AppState;
  /** Supplemental information why the application is in the current state. In error cases this field contains the error reason. */
  status?: string;
  /** If set the application will start automatically after booting of the device. */
  autostart?: boolean;
  /** Link to supplementary information about the application or its vendor. */
  website?: AnyURI;
  /** Link to a list of open source licenses used by the application. */
  openSource?: AnyURI;
  /** Optional Uri for backup and restore of the application configuration. */
  configuration?: AnyURI;
  /** Optional reference to the interface definition of the application. */
  interfaceDescription?: AnyURI[];
}
export interface LicenseInfo {
  /** Textual name of the license */
  name?: string;
  /** Start time of validity */
  validFrom?: Date;
  /** End time of validity */
  validUntil?: Date;
}
export interface Uninstall {
  /** App to be uninstalled. Possible failures during deinstallation will be delivered via an event. */
  appID?: string;
}
export interface UninstallResponse {}
export interface GetAppsInfo {
  /** Optional ID to only retrieve information for a single application. */
  appID?: string;
}
export interface GetAppsInfoResponse {
  info?: AppInfo[];
}
export interface GetInstalledApps {}
export interface App {
  name?: string;
  appID?: string;
}
export interface GetInstalledAppsResponse {
  /** List of installed apps providing both user readable name and token. */
  app?: App[];
}
export interface Activate {
  /** App identifier. */
  appID?: string;
}
export interface ActivateResponse {}
export interface Deactivate {
  /** App identifier. */
  appID?: string;
}
export interface DeactivateResponse {}
export interface InstallLicense {
  /** Application the license shall be associated to. */
  appID?: string;
  /** Opaque machine readable license string. */
  license?: string;
}
export interface InstallLicenseResponse {}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities of the service. */
  capabilities?: Capabilities;
}
export interface GetDeviceId {}
export interface GetDeviceIdResponse {
  deviceId?: string;
}
