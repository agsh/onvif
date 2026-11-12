/**
 * Replay ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/replay.wsdl
 */

import { Onvif } from './onvif';
import { AnyURI } from './interfaces/basics';
import { ReferenceToken } from './interfaces/common';
import { ReplayConfiguration, StreamSetup, StreamType, TransportProtocol } from './interfaces/onvif';
import { Capabilities, GetReplayUri, SetReplayConfiguration } from './interfaces/replay';
import Service from './service';
import { OnvifValidationError } from './utils/errors';
import { streamSetupToBuild } from './utils/toOnvifXMLSchemaObject';

/**
 * GetReplayUri with optional stream and transport protocol shortcuts.
 * `recordingToken` defaults to {@link Onvif.activeRecordingToken}.
 */
export interface GetReplayUriOptions extends Omit<GetReplayUri, 'streamSetup' | 'recordingToken'> {
  recordingToken?: ReferenceToken;
  streamSetup?: StreamSetup;
  /** Defines if a multicast or unicast stream is requested. Used when streamSetup is omitted. */
  stream?: StreamType;
  /** Defines the network protocol for streaming. Used when streamSetup is omitted. */
  protocol?: TransportProtocol;
}

/**
 * Replay service (Profile G) — replay URI and replay configuration.
 *
 * @example After connect, omit recordingToken to use activeRecordingToken:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const uri = await onvif.replay.getReplayUri({ protocol: 'RTSP' });
 * console.log('replay', uri);
 * ```
 * @category Services
 */
export default class Replay extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'replay');
  }

  private recordingToken(recordingToken?: ReferenceToken): ReferenceToken {
    const resolved = recordingToken ?? this.onvif.activeRecordingToken;
    if (resolved === undefined || resolved === '') {
      throw new OnvifValidationError(
        'recordingToken is required (pass it or connect with Recording so activeRecordingToken is set)',
      );
    }
    return resolved;
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
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Requests a URI that can be used to initiate playback of a recorded stream using RTSP.
   * When `recordingToken` is omitted, uses {@link Onvif.activeRecordingToken}.
   * @param options
   */
  async getReplayUri(options: GetReplayUriOptions = {}): Promise<AnyURI> {
    const response = await this.request({
      GetReplayUri: {
        StreamSetup: streamSetupToBuild(Replay.resolveStreamSetup(options)),
        RecordingToken: this.recordingToken(options.recordingToken),
      },
    });
    return response.getReplayUriResponse.uri;
  }

  /**
   * Returns the current configuration of the replay service.
   */
  async getReplayConfiguration(): Promise<ReplayConfiguration> {
    const response = await this.request({
      GetReplayConfiguration: {},
    });
    return response.getReplayConfigurationResponse.configuration;
  }

  /**
   * Changes the current configuration of the replay service.
   * @param options
   */
  async setReplayConfiguration({ configuration }: SetReplayConfiguration): Promise<void> {
    return this.request({
      SetReplayConfiguration: {
        Configuration: {
          SessionTimeout: configuration.sessionTimeout,
        },
      },
    });
  }
}
