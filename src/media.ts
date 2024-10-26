import { Onvif } from './onvif';
import { linerase } from './utils';
import {
  AudioEncoderConfiguration, MediaUri,
  Profile, VideoEncoder2Configuration,
  VideoEncoderConfiguration,
  VideoSource, VideoSourceConfiguration,
} from './interfaces/onvif';
import { ReferenceToken } from './interfaces/common';
import { AnyURI } from './interfaces/basics';
import {
  ConfigurationSet,
  GetOSDOptions,
  GetOSDOptionsResponse,
  GetOSDs,
  GetOSDsResponse,
  GetVideoEncoderConfigurations, GetVideoEncoderConfigurationsResponse as GetVideoEncoder2ConfigurationsResponse,
  GetVideoSourceConfigurationOptions,
  GetVideoSourceConfigurationOptionsResponse,
  GetVideoSourceConfigurations, MediaProfile, SetVideoSourceConfigurationResponse,
} from './interfaces/media.2';
import {
  GetVideoSourceConfigurationsResponse,
  GetVideoSourcesResponse,
  GetVideoEncoderConfigurationsResponse,
  GetSnapshotUri,
} from './interfaces/media';

export interface GetStreamUriOptions {
  profileToken?: ReferenceToken;
  stream?: 'RTP-Unicast' | 'RTP-Multicast';
  protocol?:
    'RtspUnicast' | 'RtspMulticast' | 'RTSP' | 'RtspOverHttp' | // for Media2
    'UDP'| 'TCP' | 'HTTP'; // for Media1
}

export class Media {
  private onvif: Onvif;
  public profiles: Profile[] = [];
  public videoSources: VideoSource[] = [];

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * Receive profiles
   */
  async getProfiles(): Promise<(Profile | MediaProfile)[]> {
    if (this.onvif.device.media2Support) {
      // Profile T request using Media2
      // The reply is in a different format to the old API so we convert the data from the new API to the old structure
      // for backwards compatibility with existing users of this library
      const [data] = await this.onvif.request({
        service : 'media2',
        body    : '<GetProfiles xmlns="http://www.onvif.org/ver20/media/wsdl"><Type>All</Type></GetProfiles>',
      });

      // Slight difference in Media1 and Media2 reply XML
      // Generate a reply that looks like a Media1 reply for existing library users
      this.profiles = data[0].getProfilesResponse[0].profiles.map((profile: Record<string, unknown>) => {
        const tmp = linerase(profile) as MediaProfile;
        const conf = tmp.configurations as ConfigurationSet;
        const newProfile: Profile = {
          token : tmp.token,
          name  : tmp.name,
          fixed : tmp.fixed || false,
        };
        // Media2 Spec says there will be these some or all of these configuration entities
        // Video source configuration
        // Audio source configuration
        // Video encoder configuration
        // Audio encoder configuration
        // PTZ configuration
        // Video analytics configuration
        // Metadata configuration
        // Audio output configuration
        // Audio decoder configuration
        if (conf.videoSource) { newProfile.videoSourceConfiguration = conf.videoSource; }
        if (conf.audioSource) { newProfile.audioSourceConfiguration = conf.audioSource; }
        if (conf.videoEncoder) {
          newProfile.videoEncoderConfiguration = conf.videoEncoder as unknown as VideoEncoderConfiguration;
        }
        if (conf.audioEncoder) {
          newProfile.audioEncoderConfiguration = conf.audioEncoder as AudioEncoderConfiguration;
        }
        if (conf.PTZ) { newProfile.PTZConfiguration = conf.PTZ; }
        if (conf.analytics) { newProfile.videoAnalyticsConfiguration = conf.analytics; }
        if (conf.metadata) { newProfile.metadataConfiguration = conf.metadata; }
        if (conf.audioOutput || conf.audioDecoder) {
          newProfile.extension = {
            audioOutputConfiguration  : conf.audioOutput!,
            audioDecoderConfiguration : conf.audioDecoder!,
          };
        }
        // TODO - Add Audio
        return newProfile;
      });
      return this.profiles;
    }
    // Original ONVIF Media support (used in Profile S)
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetProfiles xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    this.profiles = data[0].getProfilesResponse[0].profiles.map(linerase);
    return this.profiles;
  }

  async getVideoSources(): Promise<GetVideoSourcesResponse> {
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetVideoSources xmlns="http://www.onvif.org/ver10/media/wsdl"/>',
    });
    const videoSourcesResponse = linerase(data, { array : ['videoSources'] }).getVideoSourcesResponse;
    this.videoSources = videoSourcesResponse.videoSources;
    return videoSourcesResponse;
  }

  async getVideoSourceConfigurations({ configurationToken, profileToken }: GetVideoSourceConfigurations = {}):
    Promise<GetVideoSourceConfigurationsResponse> {
    const body = `<GetVideoSourceConfigurations xmlns="${
      this.onvif.device.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl'
    }">${
      configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }${
      profileToken ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }</GetVideoSourceConfigurations>`;
    const service = (this.onvif.device.media2Support ? 'media2' : 'media');

    const [data] = await this.onvif.request({ service, body });
    return linerase(data, { array : ['configurations'] }).getVideoSourceConfigurationsResponse;
  }

  async getVideoSourceConfigurationOptions({ configurationToken, profileToken }: GetVideoSourceConfigurationOptions = {}):
    Promise<GetVideoSourceConfigurationOptionsResponse> {
    const body = `<GetVideoSourceConfigurationOptions xmlns="${
      this.onvif.device.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl'
    }">${
      configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }${
      profileToken ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }</GetVideoSourceConfigurationOptions>`;
    const service = (this.onvif.device.media2Support ? 'media2' : 'media');

    const [data] = await this.onvif.request({ service, body });
    return linerase(data, { array : ['videoSourceTokensAvailable'] }).getVideoSourceConfigurationOptionsResponse;
  }

  /** Common setVideoSourceConfiguration for media and media2 profiles. It depends on media2support flag */
  async setVideoSourceConfiguration(configuration: VideoSourceConfiguration | VideoEncoder2Configuration, forcePersistence: boolean = true):
    Promise<any> {
    const service = this.onvif.device.media2Support ? 'media2' : 'media';
    const xmlns = this.onvif.device.media2Support
      ? 'http://www.onvif.org/ver20/media/wsdl'
      : 'http://www.onvif.org/ver10/media/wsdl';
    const body = `<SetVideoEncoderConfiguration xmlns="${xmlns}">`
      + `<Configuration token="${configuration.token}"${
        'govLength' in configuration ? ` GovLength="${configuration.govLength}"` : ''
      }${'profile' in configuration ? ` Profile="${configuration.profile}"` : ''
      }${'anchorFrameDistance' in configuration ? ` AnchorFrameDistance="${configuration.anchorFrameDistance}"` : ''
      }${'guaranteedFrameRate' in configuration ? ` GuaranteedFrameRate="${configuration.guaranteedFrameRate}"` : ''
      }${'viewMode' in configuration ? ` GuaranteedFrameRate="${configuration.viewMode}"` : ''
      }>${
        configuration.name ? `<Name xmlns="http://www.onvif.org/ver10/schema">${configuration.name}</Name>` : ''
      }${configuration.useCount ? `<UseCount xmlns="http://www.onvif.org/ver10/schema">${configuration.useCount}</UseCount>` : ''
      }${'encoding' in configuration && configuration.encoding
        ? `<Encoding xmlns="http://www.onvif.org/ver10/schema">${configuration.encoding}</Encoding>` : ''
      }${'resolution' in configuration && configuration.resolution
        ? `<Resolution xmlns="http://www.onvif.org/ver10/schema">${
          configuration.resolution.width ? `<Width>${configuration.resolution.width}</Width>` : ''
        }${configuration.resolution.height ? `<Height>${configuration.resolution.height}</Height>` : ''
        }</Resolution>` : ''
      }${'quality' in configuration ? `<Quality xmlns="http://www.onvif.org/ver10/schema">${configuration.quality}</Quality>` : ''
      }${'rateControl' in configuration && configuration.rateControl
        ? `<RateControl ConstantBitRate="${configuration.rateControl.constantBitRate}" xmlns="http://www.onvif.org/ver10/schema"><FrameRateLimit>${
          configuration.rateControl.frameRateLimit}</FrameRateLimit><BitrateLimit>${configuration.rateControl.bitrateLimit
        }</BitrateLimit></RateControl>` : ''
      }${'multicast' in configuration && configuration.multicast
        ? `<Multicast xmlns="http://www.onvif.org/ver10/schema">${
          configuration.multicast.address
            ? `<Address>${
              configuration.multicast.address.type ? `<Type>${configuration.multicast.address.type}</Type>` : ''
            }${configuration.multicast.address.IPv4Address ? `<IPv4Address>${configuration.multicast.address.IPv4Address}</IPv4Address>` : ''
            }${configuration.multicast.address.IPv6Address ? `<IPv6Address>${configuration.multicast.address.IPv6Address}</IPv6Address>` : ''
            }</Address>` : ''
        }${configuration.multicast.port !== undefined ? `<Port>${configuration.multicast.port}</Port>` : ''
        }${configuration.multicast.TTL !== undefined ? `<TTL>${configuration.multicast.TTL}</TTL>` : ''
        }${configuration.multicast.autoStart !== undefined ? `<AutoStart>${configuration.multicast.autoStart}</AutoStart>` : ''
        }</Multicast>` : ''
      }${'quality' in configuration ? `<Quality>${configuration.quality}</Quality>` : ''
      }${'sourceToken' in configuration ? `<SourceToken xmlns="http://www.onvif.org/ver10/schema">${configuration.sourceToken}</SourceToken>` : ''
      }${'bounds' in configuration
        ? `<Bounds xmlns="http://www.onvif.org/ver10/schema" x="${
        configuration.bounds!.x
        }" y="${
        configuration.bounds!.y
        }" width="${
        configuration.bounds!.width
        }" height="${
        configuration.bounds!.height
        }">` : ''
      }${'extension' in configuration && configuration.extension
        ? `<Extention xmlns="http://www.onvif.org/ver10/schema">${
          'rotate' in configuration.extension && configuration.extension.rotate ? `<Rotate xmlns="http://www.onvif.org/ver10/schema"><Mode>${
            configuration.extension.rotate.mode}</Mode>${
            configuration.extension.rotate.degree ? `<Degree>${configuration.extension.rotate.degree}</Degree>` : ''
          }</Rotate>` : ''
        }</Extention>` : ''
      }</Configuration>${
        (!this.onvif.device.media2Support ? `<ForcePersistence>${forcePersistence}</ForcePersistence>` : '')
      }`
      + '</SetVideoEncoderConfiguration>';
    const [data] = await this.onvif.request({ service, body });
    return data;
  }

  /**
   * If device supports Media 2.0 returns an array of VideoEncoder2Configuration. Otherwise VideoEncoderConfiguration
   * @param configurationToken
   * @param profileToken
   */
  async getVideoEncoderConfigurations({ configurationToken, profileToken }: GetVideoEncoderConfigurations = {}):
    Promise<GetVideoEncoderConfigurationsResponse | GetVideoEncoder2ConfigurationsResponse> {
    const body = `<GetVideoEncoderConfigurations xmlns="${
      this.onvif.device.media2Support ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl'
    }">${
      configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
    }${
      profileToken ? `<ProfileToken>${profileToken}</ProfileToken>` : ''
    }</GetVideoEncoderConfigurations>`;
    const service = (this.onvif.device.media2Support ? 'media2' : 'media');

    const [data] = await this.onvif.request({ service, body });

    const { getVideoEncoderConfigurationsResponse } = linerase(data, { array : ['configurations'] });
    return getVideoEncoderConfigurationsResponse;
  }

  /**
   * This method requests a URI that can be used to initiate a live media stream using RTSP as the control protocol.
   * The returned URI shall remain valid indefinitely even if the profile is changed.
   * Method uses Media2 if device supports it.
   *
   * For Media2 you need to provide only `protocol` parameter ('RTPS' by default). Here is supported values from the
   * ONVIF documentation:
   * Defined stream types are
   * - RtspUnicast RTSP streaming RTP as UDP Unicast.
   * - RtspMulticast RTSP streaming RTP as UDP Multicast.
   * - RTSP RTSP streaming RTP over TCP.
   * - RtspOverHttp Tunneling both the RTSP control channel and the RTP stream over HTTP or HTTPS.
   *
   * For Media1 you need to set both parameters: protocl and stream (RTP-Unicast by default) If Media2 supported
   * by device, this parameters will be converted to Media2 call. This is excerpt from ONVIF documentation:
   * The correct syntax for the StreamSetup element for these media stream setups defined in 5.1.1 of the streaming specification are as follows:
   * - RTP unicast over UDP: StreamType = "RTP_unicast", TransportProtocol = "UDP"
   * - RTP over RTSP over HTTP over TCP: StreamType = "RTP_unicast", TransportProtocol = "HTTP"
   * - RTP over RTSP over TCP: StreamType = "RTP_unicast", TransportProtocol = "RTSP"
   */
  async getStreamUri(options: GetStreamUriOptions = {}):
    Promise<MediaUri | string> {
    const {
      profileToken,
      stream = 'RTP-Unicast',
    } = options;
    let { protocol = 'RTSP' } = options;
    if (this.onvif.device.media2Support) {
      // Permitted values for options.protocol are :-
      //   RtspUnicast - RTSP streaming RTP via UDP Unicast.
      //   RtspMulticast - RTSP streaming RTP via UDP Multicast.
      //   RTSP - RTSP streaming RTP over TCP.
      //   RtspOverHttp - Tunneling both the RTSP control channel and the RTP stream over HTTP or HTTPS.

      // For backwards compatibility this function will convert Media1 Stream and Transport Protocol to a Media2 protocol
      if (protocol === 'HTTP') { protocol = 'RtspOverHttp'; }
      if (protocol === 'TCP') { protocol = 'RTSP'; }
      if (protocol === 'UDP' && stream === 'RTP-Unicast') { protocol = 'RtspUnicast'; }
      if (protocol === 'UDP' && stream === 'RTP-Multicast') { protocol = 'RtspMulticast'; }

      // Profile T request using Media2
      const [data] = await this.onvif.request({
        service : 'media2',
        body    : '<GetStreamUri xmlns="http://www.onvif.org/ver20/media/wsdl">'
          + `<Protocol>${protocol}</Protocol>`
          + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
          + '</GetStreamUri>',
      });
      return linerase(data).getStreamUriResponse;
    }
    // Original (v.1.0)  ONVIF Specification for Media (used in Profile S)
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetStreamUri xmlns="http://www.onvif.org/ver10/media/wsdl">'
        + '<StreamSetup>'
        + `<Stream xmlns="http://www.onvif.org/ver10/schema">${stream}</Stream>`
        + '<Transport xmlns="http://www.onvif.org/ver10/schema">'
        + `<Protocol>${protocol || 'RTSP'}</Protocol>`
        + '</Transport>'
        + '</StreamSetup>'
        + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
        + '</GetStreamUri>',
    });
    return linerase(data).getStreamUriResponse.mediaUri;
  }

  /**
   * Receive snapshot URI
   * @param profileToken
   */
  async getSnapshotUri({ profileToken }: GetSnapshotUri = {}): Promise<{uri: AnyURI}> {
    if (this.onvif.device.media2Support) {
      // Profile T request using Media2
      const [data] = await this.onvif.request({
        service : 'media2',
        body    : '<GetSnapshotUri xmlns="http://www.onvif.org/ver20/media/wsdl">'
          + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
          + '</GetSnapshotUri>',
      });
      return linerase(data).getSnapshotUriResponse;
    }
    const [data] = await this.onvif.request({
      service : 'media',
      body    : '<GetSnapshotUri xmlns="http://www.onvif.org/ver10/media/wsdl">'
        + `<ProfileToken>${profileToken || this.onvif.activeSource!.profileToken}</ProfileToken>`
        + '</GetSnapshotUri>',
    });
    return linerase(data).getSnapshotUriResponse.mediaUri;
  }

  async getOSDs({ configurationToken, OSDToken }: GetOSDs = {}): Promise<GetOSDsResponse> {
    const mediaService = (this.onvif.device.media2Support ? 'media2' : 'media');
    const mediaNS = (this.onvif.device.media2Support
      ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');

    const [data] = await this.onvif.request({
      service : mediaService,
      body    : `<GetOSDs xmlns="${mediaNS}" >${
        configurationToken ? `<ConfigurationToken>${configurationToken}</ConfigurationToken>` : ''
      }${
        OSDToken ? `<OSDToken>${configurationToken}</OSDToken>` : ''
      }</GetOSDs>`,
    });
    // this.videoSources = linerase(data).getVideoSourcesResponse.videoSources;
    return linerase(data[0].getOSDsResponse[0], { array : ['OSDs'] });
  }

  async getOSDOptions({ configurationToken }: GetOSDOptions = {}): Promise<GetOSDOptionsResponse> {
    const mediaService = (this.onvif.device.media2Support ? 'media2' : 'media');
    const mediaNS = (this.onvif.device.media2Support
      ? 'http://www.onvif.org/ver20/media/wsdl' : 'http://www.onvif.org/ver10/media/wsdl');

    const [data] = await this.onvif.request({
      service : mediaService,
      body    : `<GetOSDOptions xmlns="${mediaNS}" >`
        + `<ConfigurationToken>${configurationToken ?? this.onvif.activeSource!.videoSourceConfigurationToken}</ConfigurationToken>`
        + '</GetOSDOptions>',
    });
    const result = linerase(data).getOSDOptionsResponse;
    return result;
  }
}
