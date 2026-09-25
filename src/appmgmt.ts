/**
 * AppManagement (appmgmt) ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/appmgmt/wsdl/appmgmt.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import {
  Activate,
  Capabilities,
  Deactivate,
  GetAppsInfo,
  GetAppsInfoResponse,
  GetDeviceIdResponse,
  GetInstalledAppsResponse,
  InstallLicense,
  Uninstall,
} from './interfaces/appmgmt';

/**
 * Application Management service
 * @example
 * ```ts
 *  const apps = await cam.appManagement.getInstalledApps();
 *  const appID = apps.app![0].appID;
 *  console.log((await cam.appManagement.getAppsInfo({ appID })).info?.[0]?.state);
 *  await cam.appManagement.activate({ appID });
 * ```
 */
export default class AppManagement extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'appmgmt');
  }

  /**
   * Returns the capabilities of the application management service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns the list of installed applications.
   */
  async getInstalledApps(): Promise<GetInstalledAppsResponse> {
    const response = await this.request({ GetInstalledApps: {} }, { array: ['app'] });
    return response.getInstalledAppsResponse ?? {};
  }

  /**
   * Returns detailed information for installed applications.
   * @param options
   */
  async getAppsInfo(options: GetAppsInfo = {}): Promise<GetAppsInfoResponse> {
    const response = await this.request(
      {
        GetAppsInfo: {
          ...(options.appID !== undefined && { AppID: options.appID }),
        },
      },
      { array: ['info', 'licenses', 'privileges', 'interfaceDescription'] },
    );
    return response.getAppsInfoResponse ?? {};
  }

  /**
   * Activates an installed application.
   * @param options
   */
  async activate({ appID }: Activate): Promise<void> {
    await this.request({
      Activate: { AppID: appID },
    });
  }

  /**
   * Deactivates an installed application.
   * @param options
   */
  async deactivate({ appID }: Deactivate): Promise<void> {
    await this.request({
      Deactivate: { AppID: appID },
    });
  }

  /**
   * Uninstalls an application. Failures during deinstallation are delivered via events.
   * @param options
   */
  async uninstall({ appID }: Uninstall): Promise<void> {
    await this.request({
      Uninstall: { AppID: appID },
    });
  }

  /**
   * Installs a license associated with an application.
   * @param options
   */
  async installLicense({ appID, license }: InstallLicense): Promise<void> {
    await this.request({
      InstallLicense: {
        ...(appID !== undefined && { AppID: appID }),
        License: license,
      },
    });
  }

  /**
   * Returns the device identifier used for licensing.
   */
  async getDeviceId(): Promise<GetDeviceIdResponse['deviceId']> {
    const response = await this.request({
      GetDeviceId: {},
    });
    return response.getDeviceIdResponse.deviceId;
  }
}
