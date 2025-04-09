/**
 * Media ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/srv/media/ONVIF-Media2-Service-Spec.pdf
 */

import { Onvif } from './onvif';
import {
  MediaProfile,
  GetProfiles,
  CreateProfile,
  ConfigurationRef,
  ConfigurationEnumeration, CreateProfileResponse, AddConfiguration,
} from './interfaces/media.2';
import { linerase } from './utils';
import { ReferenceToken } from './interfaces/common';

/**
 * Configurations as defined by tr2:ConfigurationEnumeration
 */
export interface ConfigurationRefExtended extends ConfigurationRef {
  type: ConfigurationEnumeration;
}

interface CreateProfileExtended extends CreateProfile {
  configuration?: ConfigurationRefExtended[];
}

interface AddConfigurationExtended extends AddConfiguration {
  configuration?: ConfigurationRefExtended[];
}

export class Media2 {
  private onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * Retrieve the profile with the specified token or all defined media profiles.
   * - If no Type is provided the returned profiles shall contain no configuration information.
   * - If a single Type with value 'All' is provided the returned profiles shall include all associated configurations.
   * - Otherwise the requested list of configurations shall for each profile include the configurations present as Type.
   * @param token Optional token to retrieve exactly one profile.
   * @param type If one or more types are passed only the corresponding configurations will be returned.
   */
  @v2
  async getProfiles({ token, type }: GetProfiles = {}): Promise<(MediaProfile)[]> {
    const body = `<GetProfiles xmlns="http://www.onvif.org/ver20/media/wsdl">${
      token !== undefined ? `<Token>${token}</Token>` : ''
    }${
      type !== undefined ? `<Type>${type.join(' ')}</Type>` : '<Type>All</Type>'
    }</GetProfiles>`;
    const [data, xml] = await this.onvif.request({
      service : 'media2',
      body,
    });
    return linerase(data, { array : ['profiles'] }).getProfilesResponse.profiles;
  }

  /**
   * This operation creates a new media profile. A created profile created via this method may be deleted via the
   * DeleteProfile method. Optionally Configurations can be assigned to the profile on creation. For details regarding
   * profile assignment check also the method AddConfiguration.
   */
  @v2
  async createProfile({ name, configuration }: CreateProfileExtended): Promise<ReferenceToken> {
    const [data] = await this.onvif.request({
      service : 'media2',
      body    : '<CreateProfile xmlns="http://www.onvif.org/ver20/media/wsdl">'
        + `<Name>${name}</Name>${
          configuration
            ? `<Configuration>${configuration.map((configurationRef) => (
              `<Type>${configurationRef.type}</Type>${
                configurationRef.token ? `<Token>${configurationRef.token}</Token>` : ''}`
            ))}</Configuration>`
            : ''
        }</CreateProfile>`,
    });
    return linerase(data).createProfileResponse.token;
  }

  /**
   * This operation adds one or more Configurations to an existing media profile. If a configuration exists in the media
   * profile, it will be replaced. A device shall support adding a compatible Configuration to a Profile containing a
   * VideoSourceConfiguration and shall support streaming video data of such a profile.
   *
   * Note that OSD elements must be added via the CreateOSD command.
   */
  @v2
  async addConfiguration({ profileToken, name, configuration }: AddConfigurationExtended): Promise<void> {
    const body = '<AddConfiguration xmlns="http://www.onvif.org/ver20/media/wsdl">'
    + `<ProfileToken>${profileToken}</ProfileToken>${
      name !== undefined ? `<Name>${name}</Name>` : ''
    }${
      configuration
        ? configuration.map((configurationRef) => (
          `<Configuration><Type>${configurationRef.type}</Type>${
            configurationRef.token ? `<Token>${configurationRef.token}</Token></Configuration>` : ''}`
        )).join('')
        : ''
    }</AddConfiguration>`;
    await this.onvif.request({
      service : 'media2',
      body,
    });
  }
}

function v2(originalMethod: any, context: ClassMethodDecoratorContext) {
  return function v2(this: any, ...args: any[]) {
    if (!this.onvif.device.media2Support) {
      throw new Error('Media2 is not supported for this device');
    }
    return originalMethod.call(this, ...args);
  };
}
