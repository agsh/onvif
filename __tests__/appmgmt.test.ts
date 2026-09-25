/**
 * Mocked unit tests for the AppManagement (appmgmt) service.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import { OnvifError } from '../src/utils';
import { AppInfo } from '../src/interfaces/appmgmt';
import happytimeOnvifOptions from './happytime.json';

const APPMGMT_XMLNS = 'http://www.onvif.org/ver10/appmgmt/wsdl';
const APP_ID = 'App_1';
const APP_ID_2 = 'App_2';

const mockAppInfo = {
  appID: APP_ID,
  name: 'Demo App',
  version: '1.2.3',
  licenses: [{ name: 'Trial', validFrom: new Date('2024-01-01T00:00:00Z') }],
  privileges: ['ptz', 'media'],
  installationDate: new Date('2024-01-01T00:00:00Z'),
  lastUpdate: new Date('2024-06-01T00:00:00Z'),
  state: 'Inactive',
  status: 'Ready',
  autostart: false,
  website: 'https://example.com/app',
  openSource: 'https://example.com/oss',
  configuration: 'https://example.com/config',
  interfaceDescription: ['https://example.com/api.wsdl'],
} as unknown as AppInfo;

let cam: Onvif;

function mockAppManagementResponse(body: Record<string, unknown>) {
  return jest.spyOn(cam as any, 'request').mockResolvedValueOnce([body, '<mock/>']);
}

beforeEach(() => {
  cam = new Onvif(happytimeOnvifOptions);
  cam.uri.appmgmt = new URL('http://127.0.0.1:8000/onvif/appmgmt_service');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AppManagement (mocked)', () => {
  describe('getServiceCapabilities', () => {
    it('should return application management service capabilities', async () => {
      mockAppManagementResponse({
        getServiceCapabilitiesResponse: {
          capabilities: {
            formatsSupported: ['tar', 'zip'],
            licensing: true,
            uploadPath: '/onvif/app_upload',
            eventTopicPrefix: 'tns1:Application',
          },
        },
      });

      const caps = await cam.appManagement.getServiceCapabilities();
      expect(caps.licensing).toBe(true);
      expect(caps.uploadPath).toBe('/onvif/app_upload');
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'appmgmt',
          body: {
            GetServiceCapabilities: {
              $: { xmlns: APPMGMT_XMLNS },
            },
          },
        }),
      );
    });

    it('should return an empty object when capabilities are absent', async () => {
      mockAppManagementResponse({
        getServiceCapabilitiesResponse: {},
      });

      const caps = await cam.appManagement.getServiceCapabilities();
      expect(caps).toEqual({});
    });
  });

  describe('getInstalledApps', () => {
    it('should return installed apps as an array', async () => {
      mockAppManagementResponse({
        getInstalledAppsResponse: {
          app: [
            { name: 'Demo App', appID: APP_ID },
            { name: 'Other App', appID: APP_ID_2 },
          ],
        },
      });

      const list = await cam.appManagement.getInstalledApps();
      expect(list.app).toHaveLength(2);
      expect(list.app?.[0].appID).toBe(APP_ID);
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'appmgmt',
          body: {
            GetInstalledApps: {
              $: { xmlns: APPMGMT_XMLNS },
            },
          },
          array: ['app'],
        }),
      );
    });

    it('should return an empty object when no apps are installed', async () => {
      mockAppManagementResponse({
        getInstalledAppsResponse: {},
      });

      const list = await cam.appManagement.getInstalledApps();
      expect(list).toEqual({});
    });
  });

  describe('getAppsInfo', () => {
    it('should return app info list without AppID filter', async () => {
      mockAppManagementResponse({
        getAppsInfoResponse: {
          info: [mockAppInfo],
        },
      });

      const response = await cam.appManagement.getAppsInfo();
      expect(response.info).toHaveLength(1);
      expect(response.info?.[0].name).toBe('Demo App');
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'appmgmt',
          body: {
            GetAppsInfo: {
              $: { xmlns: APPMGMT_XMLNS },
            },
          },
          array: ['info', 'licenses', 'privileges', 'interfaceDescription'],
        }),
      );
    });

    it('should send optional AppID when filtering', async () => {
      mockAppManagementResponse({
        getAppsInfoResponse: {
          info: [mockAppInfo],
        },
      });

      await cam.appManagement.getAppsInfo({ appID: APP_ID });
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            GetAppsInfo: {
              $: { xmlns: APPMGMT_XMLNS },
              AppID: APP_ID,
            },
          },
        }),
      );
    });
  });

  describe('activate / deactivate / uninstall', () => {
    it('should send Activate with AppID', async () => {
      mockAppManagementResponse({ activateResponse: {} });

      await expect(cam.appManagement.activate({ appID: APP_ID })).resolves.toBeUndefined();
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            Activate: {
              $: { xmlns: APPMGMT_XMLNS },
              AppID: APP_ID,
            },
          },
        }),
      );
    });

    it('should send Deactivate with AppID', async () => {
      mockAppManagementResponse({ deactivateResponse: {} });

      await expect(cam.appManagement.deactivate({ appID: APP_ID })).resolves.toBeUndefined();
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            Deactivate: {
              $: { xmlns: APPMGMT_XMLNS },
              AppID: APP_ID,
            },
          },
        }),
      );
    });

    it('should send Uninstall with AppID', async () => {
      mockAppManagementResponse({ uninstallResponse: {} });

      await expect(cam.appManagement.uninstall({ appID: APP_ID })).resolves.toBeUndefined();
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            Uninstall: {
              $: { xmlns: APPMGMT_XMLNS },
              AppID: APP_ID,
            },
          },
        }),
      );
    });

    it('should reject when the app does not exist', async () => {
      jest.spyOn(cam as any, 'request').mockRejectedValueOnce(new OnvifError('Unknown app'));

      await expect(cam.appManagement.activate({ appID: 'missing' })).rejects.toThrow('Unknown app');
    });
  });

  describe('installLicense', () => {
    it('should send InstallLicense with license and optional AppID', async () => {
      mockAppManagementResponse({ installLicenseResponse: {} });

      await expect(
        cam.appManagement.installLicense({ appID: APP_ID, license: 'LICENSE-BLOB' }),
      ).resolves.toBeUndefined();

      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            InstallLicense: {
              $: { xmlns: APPMGMT_XMLNS },
              AppID: APP_ID,
              License: 'LICENSE-BLOB',
            },
          },
        }),
      );
    });

    it('should omit AppID when not provided', async () => {
      mockAppManagementResponse({ installLicenseResponse: {} });

      await cam.appManagement.installLicense({ license: 'LICENSE-BLOB' });

      const call = (cam.request as jest.Mock).mock.calls[0][0];
      expect(call.body.InstallLicense).not.toHaveProperty('AppID');
      expect(call.body.InstallLicense.License).toBe('LICENSE-BLOB');
    });
  });

  describe('getDeviceId', () => {
    it('should return the device identifier', async () => {
      mockAppManagementResponse({
        getDeviceIdResponse: {
          deviceId: 'Device-ABC-123',
        },
      });

      const deviceId = await cam.appManagement.getDeviceId();
      expect(deviceId).toBe('Device-ABC-123');
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            GetDeviceId: {
              $: { xmlns: APPMGMT_XMLNS },
            },
          },
        }),
      );
    });
  });
});
