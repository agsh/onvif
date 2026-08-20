/**
 * Credential ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/credential/wsdl/credential.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { Attribute } from './interfaces/types';
import {
  AddToBlacklist,
  AddToWhitelist,
  Capabilities,
  CreateCredential,
  CreateCredentialResponse,
  Credential as CredentialEntity,
  CredentialAccessProfile,
  CredentialData,
  CredentialIdentifier,
  CredentialIdentifierItem,
  CredentialInfo,
  CredentialState,
  DeleteCredential,
  DeleteCredentialAccessProfiles,
  DeleteCredentialIdentifier,
  DisableCredential,
  EnableCredential,
  GetBlacklist,
  GetBlacklistResponse,
  GetCredentialAccessProfiles,
  GetCredentialAccessProfilesResponse,
  GetCredentialIdentifiers,
  GetCredentialIdentifiersResponse,
  GetCredentialInfo,
  GetCredentialInfoList,
  GetCredentialInfoListResponse,
  GetCredentialInfoResponse,
  GetCredentialList,
  GetCredentialListResponse,
  GetCredentials,
  GetCredentialsResponse,
  GetCredentialState,
  GetSupportedFormatTypes,
  GetSupportedFormatTypesResponse,
  GetWhitelist,
  GetWhitelistResponse,
  ModifyCredential,
  RemoveFromBlacklist,
  RemoveFromWhitelist,
  ResetAntipassbackViolation,
  SetCredential,
  SetCredentialAccessProfiles,
  SetCredentialIdentifier,
} from './interfaces/credential';

/**
 * Credential service
 * @example
 * ```ts
 *  const list = await cam.credential.getCredentialInfoList();
 *  const token = list.credentialInfo![0].token;
 *  console.log((await cam.credential.getCredentialState({ token })).enabled);
 *  await cam.credential.enableCredential({ token });
 * ```
 */
export default class Credential extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'credential');
  }

  private static attributeToBuild(attribute: Attribute) {
    return {
      $: {
        Name: attribute.name,
        ...(attribute.value !== undefined && { Value: attribute.value }),
      },
    };
  }

  private static credentialIdentifierTypeToBuild(type: CredentialIdentifier['type']) {
    return { Name: type.name, FormatType: type.formatType };
  }

  private static credentialIdentifierToBuild(identifier: CredentialIdentifier) {
    return {
      Type: Credential.credentialIdentifierTypeToBuild(identifier.type),
      ExemptedFromAuthentication: identifier.exemptedFromAuthentication,
      Value: identifier.value,
    };
  }

  private static credentialIdentifierItemToBuild(identifier: CredentialIdentifierItem) {
    return {
      Type: Credential.credentialIdentifierTypeToBuild(identifier.type),
      Value: identifier.value,
    };
  }

  private static credentialAccessProfileToBuild(profile: CredentialAccessProfile) {
    return {
      AccessProfileToken: profile.accessProfileToken,
      ...(profile.validFrom !== undefined && { ValidFrom: profile.validFrom }),
      ...(profile.validTo !== undefined && { ValidTo: profile.validTo }),
    };
  }

  private static credentialStateToBuild(state: CredentialState) {
    return {
      Enabled: state.enabled,
      ...(state.reason && { Reason: state.reason }),
      ...(state.antipassbackState && {
        AntipassbackState: {
          AntipassbackViolated: state.antipassbackState.antipassbackViolated,
        },
      }),
      ...(state.extension && { Extension: state.extension }),
    };
  }

  private static credentialInfoToBuild(credential: CredentialInfo | CredentialEntity) {
    return {
      $: { token: credential.token },
      ...(credential.description && { Description: credential.description }),
      CredentialHolderReference: credential.credentialHolderReference,
      ...(credential.validFrom !== undefined && { ValidFrom: credential.validFrom }),
      ...(credential.validTo !== undefined && { ValidTo: credential.validTo }),
    };
  }

  private static credentialToBuild(credential: CredentialEntity) {
    return {
      ...Credential.credentialInfoToBuild(credential),
      CredentialIdentifier: credential.credentialIdentifier.map(Credential.credentialIdentifierToBuild),
      ...(credential.credentialAccessProfile && {
        CredentialAccessProfile: credential.credentialAccessProfile.map(Credential.credentialAccessProfileToBuild),
      }),
      ...(credential.extendedGrantTime !== undefined && {
        ExtendedGrantTime: credential.extendedGrantTime,
      }),
      ...(credential.attribute && {
        Attribute: credential.attribute.map(Credential.attributeToBuild),
      }),
      ...(credential.extension && { Extension: credential.extension }),
    };
  }

  private static credentialDataToBuild(credentialData: CredentialData) {
    return {
      Credential: Credential.credentialToBuild(credentialData.credential),
      CredentialState: Credential.credentialStateToBuild(credentialData.credentialState),
      ...(credentialData.extension && { Extension: credentialData.extension }),
    };
  }

  /**
   * Returns the capabilities of the credential service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({ GetServiceCapabilities: {} }, { array: ['supportedIdentifierType'] });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns supported format types for a credential identifier type.
   * @param options
   */
  async getSupportedFormatTypes({
    credentialIdentifierTypeName,
  }: GetSupportedFormatTypes): Promise<GetSupportedFormatTypesResponse['formatTypeInfo']> {
    const response = await this.request(
      { GetSupportedFormatTypes: { CredentialIdentifierTypeName: credentialIdentifierTypeName } },
      { array: ['formatTypeInfo'] },
    );
    return response.getSupportedFormatTypesResponse.formatTypeInfo ?? [];
  }

  /**
   * Returns credential info items for the requested tokens.
   * @param options
   */
  async getCredentialInfo({ token }: GetCredentialInfo): Promise<GetCredentialInfoResponse> {
    const response = await this.request({ GetCredentialInfo: { Token: token } }, { array: ['credentialInfo'] });
    return response.getCredentialInfoResponse ?? {};
  }

  /**
   * Returns a list of credential info items.
   * @param options
   */
  async getCredentialInfoList(options: GetCredentialInfoList = {}): Promise<GetCredentialInfoListResponse> {
    const response = await this.request(
      {
        GetCredentialInfoList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['credentialInfo'] },
    );
    return response.getCredentialInfoListResponse ?? {};
  }

  /**
   * Returns credential items for the requested tokens.
   * @param options
   */
  async getCredentials({ token }: GetCredentials): Promise<GetCredentialsResponse> {
    const response = await this.request(
      { GetCredentials: { Token: token } },
      { array: ['credential', 'credentialIdentifier', 'credentialAccessProfile', 'attribute'] },
    );
    return response.getCredentialsResponse ?? {};
  }

  /**
   * Returns a list of credential items.
   * @param options
   */
  async getCredentialList(options: GetCredentialList = {}): Promise<GetCredentialListResponse> {
    const response = await this.request(
      {
        GetCredentialList: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
        },
      },
      { array: ['credential', 'credentialIdentifier', 'credentialAccessProfile', 'attribute'] },
    );
    return response.getCredentialListResponse ?? {};
  }

  /**
   * Creates a new credential.
   * @param options
   */
  async createCredential({ credential, state }: CreateCredential): Promise<CreateCredentialResponse['token']> {
    const response = await this.request({
      CreateCredential: {
        Credential: Credential.credentialToBuild(credential),
        State: Credential.credentialStateToBuild(state),
      },
    });
    return response.createCredentialResponse.token;
  }

  /**
   * Creates or replaces a credential (requires ClientSuppliedTokenSupported).
   * @param options
   */
  async setCredential({ credentialData }: SetCredential): Promise<void> {
    await this.request({ SetCredential: { CredentialData: Credential.credentialDataToBuild(credentialData) } });
  }

  /**
   * Modifies an existing credential.
   * @param options
   */
  async modifyCredential({ credential }: ModifyCredential): Promise<void> {
    await this.request({ ModifyCredential: { Credential: Credential.credentialToBuild(credential) } });
  }

  /**
   * Deletes a credential.
   * @param options
   */
  async deleteCredential({ token }: DeleteCredential): Promise<void> {
    await this.request({ DeleteCredential: { Token: token } });
  }

  /**
   * Returns the current state of a credential.
   * @param options
   */
  async getCredentialState({ token }: GetCredentialState): Promise<CredentialState> {
    const response = await this.request({ GetCredentialState: { Token: token } });
    return response.getCredentialStateResponse.state;
  }

  /**
   * Enables a credential.
   * @param options
   */
  async enableCredential({ token, reason }: EnableCredential): Promise<void> {
    await this.request({ EnableCredential: { Token: token, ...(reason && { Reason: reason }) } });
  }

  /**
   * Disables a credential.
   * @param options
   */
  async disableCredential({ token, reason }: DisableCredential): Promise<void> {
    await this.request({ DisableCredential: { Token: token, ...(reason && { Reason: reason }) } });
  }

  /**
   * Resets an anti-passback violation for a credential.
   * @param options
   */
  async resetAntipassbackViolation({ credentialToken }: ResetAntipassbackViolation): Promise<void> {
    await this.request({ ResetAntipassbackViolation: { CredentialToken: credentialToken } });
  }

  /**
   * Returns identifiers of a credential.
   * @param options
   */
  async getCredentialIdentifiers({
    credentialToken,
  }: GetCredentialIdentifiers): Promise<GetCredentialIdentifiersResponse['credentialIdentifier']> {
    const response = await this.request(
      {
        GetCredentialIdentifiers: {
          CredentialToken: credentialToken,
        },
      },
      { array: ['credentialIdentifier'] },
    );
    return response.getCredentialIdentifiersResponse.credentialIdentifier ?? [];
  }

  /**
   * Sets a credential identifier.
   * @param options
   */
  async setCredentialIdentifier({ credentialToken, credentialIdentifier }: SetCredentialIdentifier): Promise<void> {
    await this.request({
      SetCredentialIdentifier: {
        CredentialToken: credentialToken,
        CredentialIdentifier: Credential.credentialIdentifierToBuild(credentialIdentifier),
      },
    });
  }

  /**
   * Deletes a credential identifier by type name.
   * @param options
   */
  async deleteCredentialIdentifier({
    credentialToken,
    credentialIdentifierTypeName,
  }: DeleteCredentialIdentifier): Promise<void> {
    await this.request({
      DeleteCredentialIdentifier: {
        CredentialToken: credentialToken,
        CredentialIdentifierTypeName: credentialIdentifierTypeName,
      },
    });
  }

  /**
   * Returns access profiles associated with a credential.
   * @param options
   */
  async getCredentialAccessProfiles({
    credentialToken,
  }: GetCredentialAccessProfiles): Promise<GetCredentialAccessProfilesResponse['credentialAccessProfile']> {
    const response = await this.request(
      {
        GetCredentialAccessProfiles: {
          CredentialToken: credentialToken,
        },
      },
      { array: ['credentialAccessProfile'] },
    );
    return response.getCredentialAccessProfilesResponse.credentialAccessProfile ?? [];
  }

  /**
   * Sets access profiles associated with a credential.
   * @param options
   */
  async setCredentialAccessProfiles({
    credentialToken,
    credentialAccessProfile,
  }: SetCredentialAccessProfiles): Promise<void> {
    await this.request({
      SetCredentialAccessProfiles: {
        CredentialToken: credentialToken,
        CredentialAccessProfile: credentialAccessProfile.map(Credential.credentialAccessProfileToBuild),
      },
    });
  }

  /**
   * Deletes access profiles associated with a credential.
   * @param options
   */
  async deleteCredentialAccessProfiles({
    credentialToken,
    accessProfileToken,
  }: DeleteCredentialAccessProfiles): Promise<void> {
    await this.request({
      DeleteCredentialAccessProfiles: {
        CredentialToken: credentialToken,
        AccessProfileToken: accessProfileToken,
      },
    });
  }

  /**
   * Returns whitelisted credential identifiers.
   * @param options
   */
  async getWhitelist(options: GetWhitelist = {}): Promise<GetWhitelistResponse> {
    const response = await this.request(
      {
        GetWhitelist: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
          ...(options.identifierType && { IdentifierType: options.identifierType }),
          ...(options.formatType && { FormatType: options.formatType }),
          ...(options.value !== undefined && { Value: options.value }),
        },
      },
      { array: ['identifier'] },
    );
    return response.getWhitelistResponse ?? {};
  }

  /**
   * Adds credential identifiers to the whitelist.
   * @param options
   */
  async addToWhitelist({ identifier }: AddToWhitelist): Promise<void> {
    await this.request({
      AddToWhitelist: {
        ...(identifier && {
          Identifier: identifier.map(Credential.credentialIdentifierItemToBuild),
        }),
      },
    });
  }

  /**
   * Removes credential identifiers from the whitelist.
   * @param options
   */
  async removeFromWhitelist({ identifier }: RemoveFromWhitelist): Promise<void> {
    await this.request({
      RemoveFromWhitelist: {
        ...(identifier && {
          Identifier: identifier.map(Credential.credentialIdentifierItemToBuild),
        }),
      },
    });
  }

  /**
   * Deletes all whitelisted credential identifiers.
   */
  async deleteWhitelist(): Promise<void> {
    await this.request({ DeleteWhitelist: {} });
  }

  /**
   * Returns blacklisted credential identifiers.
   * @param options
   */
  async getBlacklist(options: GetBlacklist = {}): Promise<GetBlacklistResponse> {
    const response = await this.request(
      {
        GetBlacklist: {
          ...(options.limit !== undefined && { Limit: options.limit }),
          ...(options.startReference && { StartReference: options.startReference }),
          ...(options.identifierType && { IdentifierType: options.identifierType }),
          ...(options.formatType && { FormatType: options.formatType }),
          ...(options.value !== undefined && { Value: options.value }),
        },
      },
      { array: ['identifier'] },
    );
    return response.getBlacklistResponse ?? {};
  }

  /**
   * Adds credential identifiers to the blacklist.
   * @param options
   */
  async addToBlacklist({ identifier }: AddToBlacklist): Promise<void> {
    await this.request({
      AddToBlacklist: {
        ...(identifier && {
          Identifier: identifier.map(Credential.credentialIdentifierItemToBuild),
        }),
      },
    });
  }

  /**
   * Removes credential identifiers from the blacklist.
   * @param options
   */
  async removeFromBlacklist({ identifier }: RemoveFromBlacklist): Promise<void> {
    await this.request({
      RemoveFromBlacklist: {
        ...(identifier && {
          Identifier: identifier.map(Credential.credentialIdentifierItemToBuild),
        }),
      },
    });
  }

  /**
   * Deletes all blacklisted credential identifiers.
   */
  async deleteBlacklist(): Promise<void> {
    await this.request({ DeleteBlacklist: {} });
  }
}
