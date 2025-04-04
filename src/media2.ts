import { Onvif } from './onvif';
import { MediaProfile } from './interfaces/media.2';
import { linerase } from './utils';

/**
 * Media service, common for media1 and media2 profiles
 */
export class Media2 {
  private onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * Receive profiles in Media ver20 format
   */
  @v2
  async getProfiles(): Promise<(MediaProfile)[]> {
    const [data] = await this.onvif.request({
      service : 'media2',
      body    : '<GetProfiles xmlns="http://www.onvif.org/ver20/media/wsdl"><Type>All</Type></GetProfiles>',
    });
    return linerase(data, { array : ['profiles'] }).getProfilesResponse.profiles;
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
