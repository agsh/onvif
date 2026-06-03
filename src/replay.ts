/**
 * Replay ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/replay.wsdl
 */

import { Onvif } from './onvif';
import { build, linerase } from './utils';
import { AnyURI } from './interfaces/basics';
import { ReplayConfiguration, StreamSetup, StreamType, TransportProtocol } from './interfaces/onvif';
import { Capabilities, GetReplayUri, SetReplayConfiguration } from './interfaces/replay';

const REPLAY_XMLNS = 'http://www.onvif.org/ver10/replay/wsdl';
const SCHEMA_XMLNS = 'http://www.onvif.org/ver10/schema';

/**
 * GetReplayUri with optional stream and transport protocol shortcuts.
 */
export interface GetReplayUriOptions extends Omit<GetReplayUri, 'streamSetup'> {
  streamSetup?: StreamSetup;
  /** Defines if a multicast or unicast stream is requested. Used when streamSetup is omitted. */
  stream?: StreamType;
  /** Defines the network protocol for streaming. Used when streamSetup is omitted. */
  protocol?: TransportProtocol;
}

/**
 * Replay service
 */
export class Replay {
  private readonly onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  private static streamSetupToBuild({ stream, transport }: StreamSetup) {
    return {
      Stream: {
        $: { xmlns: SCHEMA_XMLNS },
        _: stream,
      },
      Transport: {
        $: { xmlns: SCHEMA_XMLNS },
        Protocol: transport.protocol,
        ...(transport.tunnel && {
          Tunnel: {
            Protocol: transport.tunnel.protocol,
          },
        }),
      },
    };
  }

  private static resolveStreamSetup(options: GetReplayUriOptions): StreamSetup {
    if (options.streamSetup) {
      return options.streamSetup;
    }
    return {
      stream: options.stream ?? 'RTP-Unicast',
      transport: { protocol: options.protocol ?? 'RTSP' },
    };
  }

  /**
   * Returns the capabilities of the replay service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const body = build({
      GetServiceCapabilities: {
        $: { xmlns: REPLAY_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'replay', body });
    return linerase(data).getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Requests a URI that can be used to initiate playback of a recorded stream using RTSP.
   * @param options
   */
  async getReplayUri(options: GetReplayUriOptions): Promise<AnyURI> {
    const body = build({
      GetReplayUri: {
        $: { xmlns: REPLAY_XMLNS },
        StreamSetup: Replay.streamSetupToBuild(Replay.resolveStreamSetup(options)),
        RecordingToken: options.recordingToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'replay', body });
    return linerase(data).getReplayUriResponse.uri;
  }

  /**
   * Returns the current configuration of the replay service.
   */
  async getReplayConfiguration(): Promise<ReplayConfiguration> {
    const body = build({
      GetReplayConfiguration: {
        $: { xmlns: REPLAY_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'replay', body });
    return linerase(data).getReplayConfigurationResponse.configuration;
  }

  /**
   * Changes the current configuration of the replay service.
   * @param options
   */
  async setReplayConfiguration({ configuration }: SetReplayConfiguration): Promise<void> {
    const body = build({
      SetReplayConfiguration: {
        $: { xmlns: REPLAY_XMLNS },
        Configuration: {
          SessionTimeout: configuration.sessionTimeout,
        },
      },
    });
    await this.onvif.request({ service: 'replay', body });
  }
}
