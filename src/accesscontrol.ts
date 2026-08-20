/**
 * AccessControl ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/accesscontrol/wsdl/accesscontrol.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import {
  AccessPoint,
  AccessPointCapabilities,
  AccessPointInfo,
  AccessPointState,
  Area,
  AreaInfo,
  Capabilities,
  CreateAccessPoint,
  CreateAccessPointResponse,
  CreateArea,
  CreateAreaResponse,
  DeleteAccessPoint,
  DeleteAccessPointAuthenticationProfile,
  DeleteArea,
  DisableAccessPoint,
  EnableAccessPoint,
  ExternalAuthorization,
  Feedback,
  GetAccessPointInfo,
  GetAccessPointInfoList,
  GetAccessPointInfoListResponse,
  GetAccessPointInfoResponse,
  GetAccessPointList,
  GetAccessPointListResponse,
  GetAccessPoints,
  GetAccessPointsResponse,
  GetAccessPointState,
  GetAreaInfo,
  GetAreaInfoList,
  GetAreaInfoListResponse,
  GetAreaInfoResponse,
  GetAreaList,
  GetAreaListResponse,
  GetAreas,
  GetAreasResponse,
  ModifyAccessPoint,
  ModifyArea,
  SetAccessPoint,
  SetAccessPointAuthenticationProfile,
  SetArea,
} from './interfaces/accesscontrol';
import { stringListToBuild } from './utils/toOnvifXMLSchemaObject';

/**
 * AccessControl service
 * @example
 * ```ts
 *  const list = await cam.accessControl.getAccessPointInfoList();
 *  const token = list.accessPointInfo![0].token;
 *  console.log((await cam.accessControl.getAccessPointState({ token })).enabled);
 *  await cam.accessControl.disableAccessPoint({ token });
 * ```
 */
export default class AccessControl extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'accesscontrol');
  }

  private static accessPointCapabilitiesToBuild(capabilities: AccessPointCapabilities) {
    return {
      $: {
        DisableAccessPoint: capabilities.disableAccessPoint,
        ...(capabilities.duress !== undefined && { Duress: capabilities.duress }),
        ...(capabilities.anonymousAccess !== undefined && {
          AnonymousAccess: capabilities.anonymousAccess,
        }),
        ...(capabilities.accessTaken !== undefined && { AccessTaken: capabilities.accessTaken }),
        ...(capabilities.externalAuthorization !== undefined && {
          ExternalAuthorization: capabilities.externalAuthorization,
        }),
        ...(capabilities.supportedRecognitionTypes && {
          SupportedRecognitionTypes: stringListToBuild(capabilities.supportedRecognitionTypes),
        }),
        ...(capabilities.identifierAccess !== undefined && {
          IdentifierAccess: capabilities.identifierAccess,
        }),
        ...(capabilities.supportedFeedbackTypes && {
          SupportedFeedbackTypes: stringListToBuild(capabilities.supportedFeedbackTypes),
        }),
      },
      ...(capabilities.supportedSecurityLevels && {
        SupportedSecurityLevels: capabilities.supportedSecurityLevels,
      }),
      ...(capabilities.extension && { Extension: capabilities.extension }),
    };
  }

  private static accessPointInfoToBuild(accessPoint: AccessPointInfo | AccessPoint) {
    return {
      $: { token: accessPoint.token },
      Name: accessPoint.name,
      ...(accessPoint.description && { Description: accessPoint.description }),
      ...(accessPoint.areaFrom && { AreaFrom: accessPoint.areaFrom }),
      ...(accessPoint.areaTo && { AreaTo: accessPoint.areaTo }),
      ...(accessPoint.entityType !== undefined && { EntityType: accessPoint.entityType }),
      Entity: accessPoint.entity,
      Capabilities: AccessControl.accessPointCapabilitiesToBuild(accessPoint.capabilities),
    };
  }

  private static accessPointToBuild(accessPoint: AccessPoint) {
    return {
      ...AccessControl.accessPointInfoToBuild(accessPoint),
      ...(accessPoint.authenticationProfileToken && {
        AuthenticationProfileToken: accessPoint.authenticationProfileToken,
      }),
      ...(accessPoint.extension && { Extension: accessPoint.extension }),
    };
  }

  private static areaInfoToBuild(area: AreaInfo | Area) {
    return {
      $: { token: area.token },
      Name: area.name,
      ...(area.description && { Description: area.description }),
    };
  }

  private static areaToBuild(area: Area) {
    return {
      ...AccessControl.areaInfoToBuild(area),
      ...(area.extension && { Extension: area.extension }),
    };
  }

  /**
   * Returns the capabilities of the access control service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({ GetServiceCapabilities: {} });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns a list of access point info items.
   * @param options
   */
  async getAccessPointInfoList(options: GetAccessPointInfoList = {}): Promise<GetAccessPointInfoListResponse> {
    const response = await this.request(
      {
        GetAccessPointInfoList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['accessPointInfo'] },
    );
    return response.getAccessPointInfoListResponse ?? {};
  }

  /**
   * Returns access point info items for the requested tokens.
   * @param options
   */
  async getAccessPointInfo({ token }: GetAccessPointInfo): Promise<GetAccessPointInfoResponse> {
    const response = await this.request({ GetAccessPointInfo: { Token: token } }, { array: ['accessPointInfo'] });
    return response.getAccessPointInfoResponse ?? {};
  }

  /**
   * Returns a list of access point items.
   * @param options
   */
  async getAccessPointList(options: GetAccessPointList = {}): Promise<GetAccessPointListResponse> {
    const response = await this.request(
      {
        GetAccessPointList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['accessPoint'] },
    );
    return response.getAccessPointListResponse ?? {};
  }

  /**
   * Returns access point items for the requested tokens.
   * @param options
   */
  async getAccessPoints({ token }: GetAccessPoints): Promise<GetAccessPointsResponse> {
    const response = await this.request({ GetAccessPoints: { Token: token } }, { array: ['accessPoint'] });
    return response.getAccessPointsResponse ?? {};
  }

  /**
   * Creates a new access point.
   * @param options
   */
  async createAccessPoint({ accessPoint }: CreateAccessPoint): Promise<CreateAccessPointResponse['token']> {
    const response = await this.request({
      CreateAccessPoint: { AccessPoint: AccessControl.accessPointToBuild(accessPoint) },
    });
    return response.createAccessPointResponse.token;
  }

  /**
   * Creates or replaces an access point (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setAccessPoint({ accessPoint }: SetAccessPoint): Promise<void> {
    await this.request({ SetAccessPoint: { AccessPoint: AccessControl.accessPointToBuild(accessPoint) } });
  }

  /**
   * Modifies an existing access point.
   * @param options
   */
  async modifyAccessPoint({ accessPoint }: ModifyAccessPoint): Promise<void> {
    await this.request({ ModifyAccessPoint: { AccessPoint: AccessControl.accessPointToBuild(accessPoint) } });
  }

  /**
   * Deletes an access point.
   * @param options
   */
  async deleteAccessPoint({ token }: DeleteAccessPoint): Promise<void> {
    await this.request({ DeleteAccessPoint: { Token: token } });
  }

  /**
   * Sets the authentication profile of an access point.
   * @param options
   */
  async setAccessPointAuthenticationProfile({
    token,
    authenticationProfileToken,
  }: SetAccessPointAuthenticationProfile): Promise<void> {
    await this.request({
      SetAccessPointAuthenticationProfile: {
        Token: token,
        AuthenticationProfileToken: authenticationProfileToken,
      },
    });
  }

  /**
   * Deletes the authentication profile reference from an access point.
   * @param options
   */
  async deleteAccessPointAuthenticationProfile({ token }: DeleteAccessPointAuthenticationProfile): Promise<void> {
    await this.request({ DeleteAccessPointAuthenticationProfile: { Token: token } });
  }

  /**
   * Returns a list of area info items.
   * @param options
   */
  async getAreaInfoList(options: GetAreaInfoList = {}): Promise<GetAreaInfoListResponse> {
    const response = await this.request(
      {
        GetAreaInfoList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['areaInfo'] },
    );
    return response.getAreaInfoListResponse ?? {};
  }

  /**
   * Returns area info items for the requested tokens.
   * @param options
   */
  async getAreaInfo({ token }: GetAreaInfo): Promise<GetAreaInfoResponse> {
    const response = await this.request({ GetAreaInfo: { Token: token } }, { array: ['areaInfo'] });
    return response.getAreaInfoResponse ?? {};
  }

  /**
   * Returns a list of area items.
   * @param options
   */
  async getAreaList(options: GetAreaList = {}): Promise<GetAreaListResponse> {
    const response = await this.request(
      {
        GetAreaList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['area'] },
    );
    return response.getAreaListResponse ?? {};
  }

  /**
   * Returns area items for the requested tokens.
   * @param options
   */
  async getAreas({ token }: GetAreas): Promise<GetAreasResponse> {
    const response = await this.request({ GetAreas: { Token: token } }, { array: ['area'] });
    return response.getAreasResponse ?? {};
  }

  /**
   * Creates a new area.
   * @param options
   */
  async createArea({ area }: CreateArea): Promise<CreateAreaResponse['token']> {
    const response = await this.request({ CreateArea: { Area: AccessControl.areaToBuild(area) } });
    return response.createAreaResponse.token;
  }

  /**
   * Creates or replaces an area (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setArea({ area }: SetArea): Promise<void> {
    await this.request({ SetArea: { Area: AccessControl.areaToBuild(area) } });
  }

  /**
   * Modifies an existing area.
   * @param options
   */
  async modifyArea({ area }: ModifyArea): Promise<void> {
    await this.request({ ModifyArea: { Area: AccessControl.areaToBuild(area) } });
  }

  /**
   * Deletes an area.
   * @param options
   */
  async deleteArea({ token }: DeleteArea): Promise<void> {
    await this.request({ DeleteArea: { Token: token } });
  }

  /**
   * Returns the current state of an access point.
   * @param options
   */
  async getAccessPointState({ token }: GetAccessPointState): Promise<AccessPointState> {
    const response = await this.request({ GetAccessPointState: { Token: token } });
    return response.getAccessPointStateResponse.accessPointState;
  }

  /**
   * Enables an access point.
   * @param options
   */
  async enableAccessPoint({ token }: EnableAccessPoint): Promise<void> {
    await this.request({ EnableAccessPoint: { Token: token } });
  }

  /**
   * Disables an access point.
   * @param options
   */
  async disableAccessPoint({ token }: DisableAccessPoint): Promise<void> {
    await this.request({ DisableAccessPoint: { Token: token } });
  }

  /**
   * Informs the device about an external authorization decision.
   * @param options
   */
  async externalAuthorization({
    accessPointToken,
    credentialToken,
    reason,
    decision,
  }: ExternalAuthorization): Promise<void> {
    await this.request({
      ExternalAuthorization: {
        AccessPointToken: accessPointToken,
        ...(credentialToken && { CredentialToken: credentialToken }),
        ...(reason && { Reason: reason }),
        Decision: decision,
      },
    });
  }

  /**
   * Provides feedback for an access point.
   * @param options
   */
  async feedback({ accessPointToken, feedbackType, recognitionType, textMessage }: Feedback): Promise<void> {
    await this.request({
      Feedback: {
        AccessPointToken: accessPointToken,
        FeedbackType: feedbackType,
        ...(recognitionType && { RecognitionType: recognitionType }),
        ...(textMessage && { TextMessage: textMessage }),
      },
    });
  }
}
