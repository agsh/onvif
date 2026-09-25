/**
 * Uplink ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/uplink/wsdl/uplink.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { stringListToBuild } from './utils/toOnvifXMLSchemaObject';
import {
  Capabilities,
  Configuration,
  DeleteUplink,
  GetUplinksResponse,
  SetUplink,
} from './interfaces/uplink';

/**
 * Uplink service
 * @example
 * ```ts
 *  const uplinks = await cam.uplink.getUplinks();
 *  console.log(uplinks.configuration?.[0]?.remoteAddress);
 *  await cam.uplink.setUplink({
 *    configuration: {
 *      remoteAddress: 'https://uplink.example.com/path',
 *      userLevel: ['Administrator'],
 *    },
 *  });
 * ```
 */
export default class Uplink extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'uplink');
  }

  private static configurationToBuild(configuration: Configuration) {
    return {
      RemoteAddress: configuration.remoteAddress,
      ...(configuration.certificateID !== undefined && { CertificateID: configuration.certificateID }),
      UserLevel: stringListToBuild(configuration.userLevel),
      // Status and Error are read-only and must be ignored by the device on SetUplink
      ...(configuration.certPathValidationPolicyID !== undefined && {
        CertPathValidationPolicyID: configuration.certPathValidationPolicyID,
      }),
      ...(configuration.authorizationServer !== undefined && {
        AuthorizationServer: configuration.authorizationServer,
      }),
    };
  }

  /**
   * Returns the capabilities of the uplink service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns the configured uplink configurations.
   */
  async getUplinks(): Promise<GetUplinksResponse> {
    const response = await this.request(
      {
        GetUplinks: {},
      },
      { array: ['configuration'] },
    );
    return response.getUplinksResponse ?? {};
  }

  /**
   * Adds or modifies an uplink configuration.
   * RemoteAddress is used to decide whether to update an existing entry or create a new one.
   * @param options
   */
  async setUplink({ configuration }: SetUplink): Promise<void> {
    await this.request({
      SetUplink: {
        Configuration: Uplink.configurationToBuild(configuration),
      },
    });
  }

  /**
   * Removes an uplink configuration.
   * @param options
   */
  async deleteUplink({ remoteAddress }: DeleteUplink): Promise<void> {
    await this.request({
      DeleteUplink: {
        RemoteAddress: remoteAddress,
      },
    });
  }
}
