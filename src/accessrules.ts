/**
 * AccessRules ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/accessrules/wsdl/accessrules.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import {
  AccessPolicy,
  AccessProfile,
  AccessProfileInfo,
  Capabilities,
  CreateAccessProfile,
  CreateAccessProfileResponse,
  DeleteAccessProfile,
  GetAccessProfileInfo,
  GetAccessProfileInfoList,
  GetAccessProfileInfoListResponse,
  GetAccessProfileInfoResponse,
  GetAccessProfileList,
  GetAccessProfileListResponse,
  GetAccessProfiles,
  GetAccessProfilesResponse,
  ModifyAccessProfile,
  SetAccessProfile,
} from './interfaces/accessrules';

/**
 * AccessRules service
 *
 * @example List access profiles and dump rules for the first one:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const caps = await onvif.accessRules.getServiceCapabilities();
 * const list = await onvif.accessRules.getAccessProfileInfoList();
 * const token = list.accessProfileInfo![0].token;
 * const { accessProfile } = await onvif.accessRules.getAccessProfiles({ token: [token] });
 * console.log(
 *   caps,
 *   list.accessProfileInfo?.map((p) => p.name),
 *   accessProfile?.[0]?.accessPolicy,
 * );
 * ```
 * @category Services
 */
export default class AccessRules extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'accessrules');
  }

  private static accessPolicyToBuild(policy: AccessPolicy) {
    return {
      ScheduleToken: policy.scheduleToken,
      Entity: policy.entity,
      ...(policy.entityType !== undefined && { EntityType: policy.entityType }),
      ...(policy.extension && { Extension: policy.extension }),
    };
  }

  private static accessProfileInfoToBuild(profile: AccessProfileInfo | AccessProfile) {
    return {
      $: { token: profile.token },
      Name: profile.name,
      ...(profile.description && { Description: profile.description }),
    };
  }

  private static accessProfileToBuild(profile: AccessProfile) {
    return {
      ...AccessRules.accessProfileInfoToBuild(profile),
      ...(profile.accessPolicy && {
        AccessPolicy: profile.accessPolicy.map(AccessRules.accessPolicyToBuild),
      }),
      ...(profile.extension && { Extension: profile.extension }),
    };
  }

  /**
   * Returns the capabilities of the access rules service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({ GetServiceCapabilities: {} });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns access profile info items for the requested tokens.
   * @param options
   */
  async getAccessProfileInfo({ token }: GetAccessProfileInfo): Promise<GetAccessProfileInfoResponse> {
    const response = await this.request({ GetAccessProfileInfo: { Token: token } }, { array: ['accessProfileInfo'] });
    return response.getAccessProfileInfoResponse ?? {};
  }

  /**
   * Returns a list of access profile info items.
   * @param options
   */
  async getAccessProfileInfoList(options: GetAccessProfileInfoList = {}): Promise<GetAccessProfileInfoListResponse> {
    const response = await this.request(
      {
        GetAccessProfileInfoList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['accessProfileInfo'] },
    );
    return response.getAccessProfileInfoListResponse ?? {};
  }

  /**
   * Returns access profile items for the requested tokens.
   * @param options
   */
  async getAccessProfiles({ token }: GetAccessProfiles): Promise<GetAccessProfilesResponse> {
    const response = await this.request(
      { GetAccessProfiles: { Token: token } },
      { array: ['accessProfile', 'accessPolicy'] },
    );
    return response.getAccessProfilesResponse ?? {};
  }

  /**
   * Returns a list of access profile items.
   * @param options
   */
  async getAccessProfileList(options: GetAccessProfileList = {}): Promise<GetAccessProfileListResponse> {
    const response = await this.request(
      {
        GetAccessProfileList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['accessProfile', 'accessPolicy'] },
    );
    return response.getAccessProfileListResponse ?? {};
  }

  /**
   * Creates a new access profile.
   * @param options
   */
  async createAccessProfile({ accessProfile }: CreateAccessProfile): Promise<CreateAccessProfileResponse['token']> {
    const response = await this.request({
      CreateAccessProfile: { AccessProfile: AccessRules.accessProfileToBuild(accessProfile) },
    });
    return response.createAccessProfileResponse.token;
  }

  /**
   * Creates or replaces an access profile (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setAccessProfile({ accessProfile }: SetAccessProfile): Promise<void> {
    await this.request({ SetAccessProfile: { AccessProfile: AccessRules.accessProfileToBuild(accessProfile) } });
  }

  /**
   * Modifies an existing access profile.
   * @param options
   */
  async modifyAccessProfile({ accessProfile }: ModifyAccessProfile): Promise<void> {
    await this.request({ ModifyAccessProfile: { AccessProfile: AccessRules.accessProfileToBuild(accessProfile) } });
  }

  /**
   * Deletes an access profile.
   * @param options
   */
  async deleteAccessProfile({ token }: DeleteAccessProfile): Promise<void> {
    await this.request({ DeleteAccessProfile: { Token: token } });
  }
}
