/**
 * AccessControl ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/accesscontrol/wsdl/accesscontrol.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { ReferenceToken } from './interfaces/common';
import { OnvifValidationError } from './utils/errors';
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
  GetAccessPointList,
  GetAccessPointListResponse,
  GetAccessPoints,
  GetAccessPointState,
  GetAreaInfo,
  GetAreaInfoList,
  GetAreaInfoListResponse,
  GetAreaList,
  GetAreaListResponse,
  GetAreas,
  ModifyAccessPoint,
  ModifyArea,
  SetAccessPoint,
  SetAccessPointAuthenticationProfile,
  SetArea,
} from './interfaces/accesscontrol';
import { stringListToBuild } from './utils/toOnvifXMLSchemaObject';

/**
 * AccessControl service (Profiles C / A / D).
 *
 * Profile D clients listen for Request events and answer with
 * {@link AccessControl.externalAuthorization} (decision lives in the app, not on the device).
 *
 * @example List access points, inspect state, temporarily disable one:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect({ media: false });
 *
 * // connect() sets activeAccessPointToken -- omit token on calls
 * const state = await onvif.accessControl.getAccessPointState();
 * console.log(state.enabled);
 * await onvif.accessControl.disableAccessPoint();
 * await onvif.accessControl.enableAccessPoint();
 * ```
 * @category Services
 */
export default class AccessControl extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'accesscontrol');
  }

  private static tokensToBuild(tokens?: ReferenceToken[]) {
    if (!tokens?.length) {
      return undefined;
    }
    return tokens.length === 1 ? tokens[0] : tokens;
  }

  /** Resolve a single access-point token: explicit arg, else {@link Onvif.activeAccessPointToken}. */
  private accessPointToken(token?: ReferenceToken): ReferenceToken {
    const resolved = token ?? this.onvif.activeAccessPointToken;
    if (resolved === undefined || resolved === '') {
      throw new OnvifValidationError(
        'Access point token is required (pass token or connect with AccessControl so activeAccessPointToken is set)',
      );
    }
    return resolved;
  }

  /** Resolve token list: explicit list, else `[activeAccessPointToken]`. */
  private accessPointTokens(tokens?: ReferenceToken[]): ReferenceToken[] {
    if (tokens?.length) {
      return tokens;
    }
    return [this.accessPointToken()];
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
   * Paginated access point info list (items + optional `nextStartReference`).
   * Kept as the ONVIF list response for paging — contrast {@link getAccessPointInfo}, which unwraps to an array.
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
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   * @returns Access point info items
   */
  async getAccessPointInfo(options: GetAccessPointInfo = {}): Promise<AccessPointInfo[]> {
    const response = await this.request(
      { GetAccessPointInfo: { Token: AccessControl.tokensToBuild(this.accessPointTokens(options.token)) } },
      { array: ['accessPointInfo'] },
    );
    return response.getAccessPointInfoResponse?.accessPointInfo ?? [];
  }

  /**
   * Paginated access point list (items + optional `nextStartReference`).
   * Kept as the ONVIF list response for paging — contrast {@link getAccessPoints}, which unwraps to an array.
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
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   * @returns Access points
   */
  async getAccessPoints(options: GetAccessPoints = {}): Promise<AccessPoint[]> {
    const response = await this.request(
      { GetAccessPoints: { Token: AccessControl.tokensToBuild(this.accessPointTokens(options.token)) } },
      { array: ['accessPoint'] },
    );
    return response.getAccessPointsResponse?.accessPoint ?? [];
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
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async deleteAccessPoint(options: Partial<DeleteAccessPoint> = {}): Promise<void> {
    await this.request({ DeleteAccessPoint: { Token: this.accessPointToken(options.token) } });
  }

  /**
   * Sets the authentication profile of an access point.
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async setAccessPointAuthenticationProfile(
    options: Partial<SetAccessPointAuthenticationProfile> &
      Pick<SetAccessPointAuthenticationProfile, 'authenticationProfileToken'>,
  ): Promise<void> {
    await this.request({
      SetAccessPointAuthenticationProfile: {
        Token: this.accessPointToken(options.token),
        AuthenticationProfileToken: options.authenticationProfileToken,
      },
    });
  }

  /**
   * Deletes the authentication profile reference from an access point.
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async deleteAccessPointAuthenticationProfile(
    options: Partial<DeleteAccessPointAuthenticationProfile> = {},
  ): Promise<void> {
    await this.request({
      DeleteAccessPointAuthenticationProfile: { Token: this.accessPointToken(options.token) },
    });
  }

  /**
   * Paginated area info list (items + optional `nextStartReference`).
   * Kept as the ONVIF list response for paging — contrast {@link getAreaInfo}, which unwraps to an array.
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
   * @returns Area info items
   */
  async getAreaInfo({ token }: GetAreaInfo): Promise<AreaInfo[]> {
    const response = await this.request({ GetAreaInfo: { Token: token } }, { array: ['areaInfo'] });
    return response.getAreaInfoResponse?.areaInfo ?? [];
  }

  /**
   * Paginated area list (items + optional `nextStartReference`).
   * Kept as the ONVIF list response for paging — contrast {@link getAreas}, which unwraps to an array.
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
   * @returns Areas
   */
  async getAreas({ token }: GetAreas): Promise<Area[]> {
    const response = await this.request({ GetAreas: { Token: token } }, { array: ['area'] });
    return response.getAreasResponse?.area ?? [];
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
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async getAccessPointState(options: Partial<GetAccessPointState> = {}): Promise<AccessPointState> {
    const response = await this.request({
      GetAccessPointState: { Token: this.accessPointToken(options.token) },
    });
    return response.getAccessPointStateResponse.accessPointState;
  }

  /**
   * Enables an access point.
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async enableAccessPoint(options: Partial<EnableAccessPoint> = {}): Promise<void> {
    await this.request({ EnableAccessPoint: { Token: this.accessPointToken(options.token) } });
  }

  /**
   * Disables an access point.
   * When `token` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async disableAccessPoint(options: Partial<DisableAccessPoint> = {}): Promise<void> {
    await this.request({ DisableAccessPoint: { Token: this.accessPointToken(options.token) } });
  }

  /**
   * Informs the device about an external authorization decision.
   * When `accessPointToken` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async externalAuthorization(
    options: Partial<ExternalAuthorization> & Pick<ExternalAuthorization, 'decision'>,
  ): Promise<void> {
    await this.request({
      ExternalAuthorization: {
        AccessPointToken: this.accessPointToken(options.accessPointToken),
        ...(options.credentialToken && { CredentialToken: options.credentialToken }),
        ...(options.reason && { Reason: options.reason }),
        Decision: options.decision,
      },
    });
  }

  /**
   * Provides feedback for an access point.
   * When `accessPointToken` is omitted, uses {@link Onvif.activeAccessPointToken}.
   * @param options
   */
  async feedback(options: Partial<Feedback> & Pick<Feedback, 'feedbackType'>): Promise<void> {
    await this.request({
      Feedback: {
        AccessPointToken: this.accessPointToken(options.accessPointToken),
        FeedbackType: options.feedbackType,
        ...(options.recognitionType && { RecognitionType: options.recognitionType }),
        ...(options.textMessage && { TextMessage: options.textMessage }),
      },
    });
  }
}
