/**
 * Mocked unit tests for the Uplink service.
 *
 * Happytime ONVIF server does not expose the Uplink service, so request/response
 * handling is validated against mocked SOAP payloads (same approach as Display).
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import { OnvifError } from '../src/utils';
import { Configuration } from '../src/interfaces/uplink';
import happytimeOnvifOptions from './happytime.json';

const UPLINK_XMLNS = 'http://www.onvif.org/ver10/uplink/wsdl';
const REMOTE_ADDRESS = 'https://uplink.example.com/path';
const REMOTE_ADDRESS_2 = 'wss://uplink.example.com/ws';

const mockConfiguration: Configuration = {
  remoteAddress: REMOTE_ADDRESS,
  certificateID: 'Certificate_1',
  userLevel: ['Administrator', 'Operator'],
  status: 'Offline',
  certPathValidationPolicyID: 'Policy_1',
  authorizationServer: 'AuthServerToken_1',
};

let cam: Onvif;

function mockUplinkResponse(body: Record<string, unknown>) {
  return jest.spyOn(cam as any, 'request').mockResolvedValueOnce([body, '<mock/>']);
}

beforeEach(() => {
  cam = new Onvif(happytimeOnvifOptions);
  cam.uri.uplink = new URL('http://127.0.0.1:8000/onvif/uplink_service');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Uplink (mocked)', () => {
  describe('getServiceCapabilities', () => {
    it('should return uplink service capabilities', async () => {
      mockUplinkResponse({
        getServiceCapabilitiesResponse: {
          capabilities: {
            maxUplinks: 4,
            protocols: ['https', 'wss'],
            authorizationModes: ['mTLS', 'AccessToken'],
            streamingOverUplink: true,
          },
        },
      });

      const caps = await cam.uplink.getServiceCapabilities();
      expect(caps.maxUplinks).toBe(4);
      expect(caps.streamingOverUplink).toBe(true);
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'uplink',
          body: {
            GetServiceCapabilities: {
              $: { xmlns: UPLINK_XMLNS },
            },
          },
        }),
      );
    });

    it('should return an empty object when capabilities are absent', async () => {
      mockUplinkResponse({
        getServiceCapabilitiesResponse: {},
      });

      const caps = await cam.uplink.getServiceCapabilities();
      expect(caps).toEqual({});
    });
  });

  describe('getUplinks', () => {
    it('should return configured uplink list as an array', async () => {
      mockUplinkResponse({
        getUplinksResponse: {
          configuration: [
            mockConfiguration,
            {
              remoteAddress: REMOTE_ADDRESS_2,
              userLevel: ['Administrator'],
              status: 'Connected',
            },
          ],
        },
      });

      const list = await cam.uplink.getUplinks();
      expect(list.configuration).toHaveLength(2);
      expect(list.configuration?.[0].remoteAddress).toBe(REMOTE_ADDRESS);
      expect(list.configuration?.[1].status).toBe('Connected');
      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'uplink',
          body: {
            GetUplinks: {
              $: { xmlns: UPLINK_XMLNS },
            },
          },
          array: ['configuration'],
        }),
      );
    });

    it('should return an empty object when no uplinks are configured', async () => {
      mockUplinkResponse({
        getUplinksResponse: {},
      });

      const list = await cam.uplink.getUplinks();
      expect(list).toEqual({});
    });
  });

  describe('setUplink', () => {
    it('should send SetUplink with configuration fields and space-separated UserLevel', async () => {
      mockUplinkResponse({
        setUplinkResponse: {},
      });

      await expect(
        cam.uplink.setUplink({
          configuration: mockConfiguration,
        }),
      ).resolves.toBeUndefined();

      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'uplink',
          body: {
            SetUplink: {
              $: { xmlns: UPLINK_XMLNS },
              Configuration: {
                RemoteAddress: REMOTE_ADDRESS,
                CertificateID: 'Certificate_1',
                UserLevel: 'Administrator Operator',
                CertPathValidationPolicyID: 'Policy_1',
                AuthorizationServer: 'AuthServerToken_1',
              },
            },
          },
        }),
      );
    });

    it('should omit read-only Status and Error fields from SetUplink', async () => {
      mockUplinkResponse({
        setUplinkResponse: {},
      });

      await cam.uplink.setUplink({
        configuration: {
          remoteAddress: REMOTE_ADDRESS,
          userLevel: ['Administrator'],
          status: 'Connected',
          error: 'should not be sent',
        },
      });

      const call = (cam.request as jest.Mock).mock.calls[0][0];
      expect(call.body.SetUplink.Configuration).not.toHaveProperty('Status');
      expect(call.body.SetUplink.Configuration).not.toHaveProperty('Error');
      expect(call.body.SetUplink.Configuration.UserLevel).toBe('Administrator');
    });
  });

  describe('deleteUplink', () => {
    it('should send DeleteUplink with RemoteAddress', async () => {
      mockUplinkResponse({
        deleteUplinkResponse: {},
      });

      await expect(cam.uplink.deleteUplink({ remoteAddress: REMOTE_ADDRESS })).resolves.toBeUndefined();

      expect(cam.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'uplink',
          body: {
            DeleteUplink: {
              $: { xmlns: UPLINK_XMLNS },
              RemoteAddress: REMOTE_ADDRESS,
            },
          },
        }),
      );
    });

    it('should reject when the remote address is unknown', async () => {
      jest.spyOn(cam as any, 'request').mockRejectedValueOnce(new OnvifError('Unknown uplink'));

      await expect(cam.uplink.deleteUplink({ remoteAddress: 'https://unknown/' })).rejects.toThrow(
        'Unknown uplink',
      );
    });
  });
});
