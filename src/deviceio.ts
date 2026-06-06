/**
 * DeviceIO ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/deviceio.wsdl
 */

import { Onvif, OnvifServices } from './onvif';
import Service from './service';
import { ReferenceToken } from './interfaces/common';
import {
  AudioOutputConfiguration,
  AudioOutputConfigurationOptions,
  AudioSourceConfiguration,
  AudioSourceConfigurationOptions,
  DigitalInput,
  RelayOutput,
  VideoOutput,
  VideoOutputConfiguration,
  VideoOutputConfigurationOptions,
  VideoSourceConfiguration,
  VideoSourceConfigurationOptions,
} from './interfaces/onvif';
import { SetRelayOutputState } from './interfaces/devicemgmt';
import {
  Capabilities,
  DigitalInputConfigurationOptions,
  GetAudioOutputConfiguration,
  GetAudioOutputConfigurationOptions,
  GetAudioSourceConfiguration,
  GetAudioSourceConfigurationOptions,
  GetDigitalInputConfigurationOptions,
  GetRelayOutputOptions,
  GetSerialPortConfiguration,
  GetSerialPortConfigurationOptions,
  GetVideoOutputConfiguration,
  GetVideoOutputConfigurationOptions,
  GetVideoSourceConfiguration,
  GetVideoSourceConfigurationOptions,
  RelayOutputOptions,
  SendReceiveSerialCommand,
  SendReceiveSerialCommandResponse,
  SerialPort,
  SerialPortConfiguration,
  SerialPortConfigurationOptions,
  SetAudioOutputConfiguration,
  SetAudioSourceConfiguration,
  SetDigitalInputConfigurations,
  SetRelayOutputSettings,
  SetSerialPortConfiguration,
  SetVideoOutputConfiguration,
  SetVideoSourceConfiguration,
} from './interfaces/deviceio';

/**
 * DeviceIO service
 * @example
 * ```typescript
 * await cam.connect();
 * const caps = await cam.deviceIO.getServiceCapabilities();
 * const relays = await cam.deviceIO.getRelayOutputs();
 * const inputs = await cam.deviceIO.getDigitalInputs();
 * await cam.deviceIO.setRelayOutputState({
 *   relayOutputToken: 'RelayOutputToken_1',
 *   logicalState: 'active',
 * });
 * ```
 */
export class DeviceIO extends Service {
  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
  }

  private videoSourceToken(videoSourceToken?: ReferenceToken): ReferenceToken {
    return videoSourceToken ?? this.onvif.activeSource!.videoSourceToken;
  }

  private static relayOutputToBuild(relayOutput: RelayOutput) {
    return {
      $: { token: relayOutput.token },
      Properties: {
        Mode: relayOutput.properties.mode,
        DelayTime: relayOutput.properties.delayTime,
        IdleState: relayOutput.properties.idleState,
      },
    };
  }

  private static digitalInputsToBuild(digitalInputs: DigitalInput[]) {
    const built = digitalInputs.map((digitalInput) => ({
      $: {
        token: digitalInput.token,
        ...(digitalInput.idleState !== undefined && { IdleState: digitalInput.idleState }),
      },
    }));
    return built.length === 1 ? built[0] : built;
  }

  private static serialPortConfigurationToBuild(configuration: SerialPortConfiguration) {
    return {
      $: { token: configuration.token },
      Type: configuration.type,
      BaudRate: configuration.baudRate,
      ParityBit: configuration.parityBit,
      CharacterLength: configuration.characterLength,
      StopBit: configuration.stopBit,
    };
  }

  private static serialDataToBuild(serialData?: SendReceiveSerialCommand['serialData']) {
    if (!serialData) {
      return undefined;
    }
    if ('binary' in serialData && serialData.binary !== undefined) {
      return { Binary: serialData.binary };
    }
    if ('string' in serialData && serialData.string !== undefined) {
      return { String: serialData.string };
    }
    return serialData;
  }

  private static audioSourceConfigurationToBuild(configuration: AudioSourceConfiguration) {
    return {
      $: { token: configuration.token },
      Name: configuration.name,
      UseCount: configuration.useCount,
      SourceToken: configuration.sourceToken,
    };
  }

  private static audioOutputConfigurationToBuild(configuration: AudioOutputConfiguration) {
    return {
      $: { token: configuration.token },
      Name: configuration.name,
      UseCount: configuration.useCount,
      OutputToken: configuration.outputToken,
      ...(configuration.sendPrimacy && { SendPrimacy: configuration.sendPrimacy }),
      ...(configuration.outputLevel !== undefined && { OutputLevel: configuration.outputLevel }),
    };
  }

  private static videoSourceConfigurationToBuild(configuration: VideoSourceConfiguration) {
    return {
      $: {
        token: configuration.token,
        ...(configuration.viewMode && { ViewMode: configuration.viewMode }),
      },
      Name: configuration.name,
      UseCount: configuration.useCount,
      SourceToken: configuration.sourceToken,
      Bounds: {
        $: {
          x: configuration.bounds.x,
          y: configuration.bounds.y,
          width: configuration.bounds.width,
          height: configuration.bounds.height,
        },
      },
      ...(configuration.extension && {
        Extension: {
          ...(configuration.extension.rotate && {
            Rotate: {
              Mode: configuration.extension.rotate.mode,
              ...(configuration.extension.rotate.degree !== undefined && {
                Degree: configuration.extension.rotate.degree,
              }),
              ...(configuration.extension.rotate.mirror !== undefined && {
                Mirror: configuration.extension.rotate.mirror,
              }),
            },
          }),
          ...(configuration.extension.extension && { Extension: configuration.extension.extension }),
        },
      }),
    };
  }

  private static videoOutputConfigurationToBuild(configuration: VideoOutputConfiguration) {
    return {
      $: { token: configuration.token },
      Name: configuration.name,
      UseCount: configuration.useCount,
      OutputToken: configuration.outputToken,
    };
  }

  /**
   * Returns the capabilities of the device IO service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Request the available settings and ranges for one or all relay outputs.
   * @param options
   */
  async getRelayOutputOptions({ relayOutputToken }: GetRelayOutputOptions = {}): Promise<RelayOutputOptions[]> {
    const response = await this.request(
      {
        GetRelayOutputOptions: {
          ...(relayOutputToken && { RelayOutputToken: relayOutputToken }),
        },
      },
      { array: ['relayOutputOptions', 'mode'] },
    );
    return response.getRelayOutputOptionsResponse?.relayOutputOptions ?? [];
  }

  /**
   * Returns tokens of available video sources.
   */
  async getVideoSources(): Promise<ReferenceToken[]> {
    const response = await this.request({ GetVideoSources: {} }, { array: ['token'] });
    return response.getVideoSourcesResponse?.token ?? [];
  }

  /**
   * Returns tokens of available audio sources.
   */
  async getAudioSources(): Promise<ReferenceToken[]> {
    const response = await this.request({ GetAudioSources: {} }, { array: ['token'] });
    return response.getAudioSourcesResponse?.token ?? [];
  }

  /**
   * Returns tokens of available audio outputs.
   */
  async getAudioOutputs(): Promise<ReferenceToken[]> {
    const response = await this.request({ GetAudioOutputs: {} }, { array: ['token'] });
    return response.getAudioOutputsResponse?.token ?? [];
  }

  /**
   * Returns available physical video outputs.
   */
  async getVideoOutputs(): Promise<VideoOutput[]> {
    const response = await this.request({ GetVideoOutputs: {} }, { array: ['videoOutputs'] });
    return response.getVideoOutputsResponse?.videoOutputs ?? [];
  }

  /**
   * Returns the video source configuration for a physical video source.
   * @param options
   */
  async getVideoSourceConfiguration({
    videoSourceToken,
  }: GetVideoSourceConfiguration): Promise<VideoSourceConfiguration> {
    const response = await this.request({
      GetVideoSourceConfiguration: {
        VideoSourceToken: videoSourceToken,
      },
    });
    return response.getVideoSourceConfigurationResponse.videoSourceConfiguration;
  }

  /**
   * Returns the video output configuration for a physical video output.
   * @param options
   */
  async getVideoOutputConfiguration({
    videoOutputToken,
  }: GetVideoOutputConfiguration): Promise<VideoOutputConfiguration> {
    const response = await this.request({
      GetVideoOutputConfiguration: {
        VideoOutputToken: videoOutputToken,
      },
    });
    return response.getVideoOutputConfigurationResponse.videoOutputConfiguration;
  }

  /**
   * Returns the audio source configuration for a physical audio source.
   * @param options
   */
  async getAudioSourceConfiguration({
    audioSourceToken,
  }: GetAudioSourceConfiguration): Promise<AudioSourceConfiguration> {
    const response = await this.request({
      GetAudioSourceConfiguration: {
        AudioSourceToken: audioSourceToken,
      },
    });
    return response.getAudioSourceConfigurationResponse.audioSourceConfiguration;
  }

  /**
   * Returns the audio output configuration for a physical audio output.
   * @param options
   */
  async getAudioOutputConfiguration({
    audioOutputToken,
  }: GetAudioOutputConfiguration): Promise<AudioOutputConfiguration> {
    const response = await this.request({
      GetAudioOutputConfiguration: {
        AudioOutputToken: audioOutputToken,
      },
    });
    return response.getAudioOutputConfigurationResponse.audioOutputConfiguration;
  }

  /**
   * Modifies a video source configuration.
   * @param options
   */
  async setVideoSourceConfiguration({ configuration, forcePersistence }: SetVideoSourceConfiguration): Promise<void> {
    await this.request({
      SetVideoSourceConfiguration: {
        ForcePersistence: forcePersistence,
        Configuration: DeviceIO.videoSourceConfigurationToBuild(configuration),
      },
    });
  }

  /**
   * Modifies a video output configuration.
   * @param options
   */
  async setVideoOutputConfiguration({ configuration, forcePersistence }: SetVideoOutputConfiguration): Promise<void> {
    await this.request({
      SetVideoOutputConfiguration: {
        ForcePersistence: forcePersistence,
        Configuration: DeviceIO.videoOutputConfigurationToBuild(configuration),
      },
    });
  }

  /**
   * Modifies an audio source configuration.
   * @param options
   */
  async setAudioSourceConfiguration({ configuration, forcePersistence }: SetAudioSourceConfiguration): Promise<void> {
    await this.request({
      SetAudioSourceConfiguration: {
        ForcePersistence: forcePersistence,
        Configuration: DeviceIO.audioSourceConfigurationToBuild(configuration),
      },
    });
  }

  /**
   * Modifies an audio output configuration.
   * @param options
   */
  async setAudioOutputConfiguration({ configuration, forcePersistence }: SetAudioOutputConfiguration): Promise<void> {
    await this.request({
      SetAudioOutputConfiguration: {
        ForcePersistence: forcePersistence,
        Configuration: DeviceIO.audioOutputConfigurationToBuild(configuration),
      },
    });
  }

  /**
   * Returns valid ranges for video source configuration parameters.
   * @param options
   */
  async getVideoSourceConfigurationOptions({
    videoSourceToken,
  }: GetVideoSourceConfigurationOptions): Promise<VideoSourceConfigurationOptions> {
    const response = await this.request({
      GetVideoSourceConfigurationOptions: {
        VideoSourceToken: videoSourceToken ?? this.videoSourceToken(),
      },
    });
    return response.getVideoSourceConfigurationOptionsResponse.videoSourceConfigurationOptions;
  }

  /**
   * Returns valid ranges for video output configuration parameters.
   * @param options
   */
  async getVideoOutputConfigurationOptions({
    videoOutputToken,
  }: GetVideoOutputConfigurationOptions): Promise<VideoOutputConfigurationOptions> {
    const response = await this.request({
      GetVideoOutputConfigurationOptions: {
        VideoOutputToken: videoOutputToken,
      },
    });
    return response.getVideoOutputConfigurationOptionsResponse.videoOutputConfigurationOptions;
  }

  /**
   * Returns valid ranges for audio source configuration parameters.
   * @param options
   */
  async getAudioSourceConfigurationOptions({
    audioSourceToken,
  }: GetAudioSourceConfigurationOptions): Promise<AudioSourceConfigurationOptions> {
    const response = await this.request({
      GetAudioSourceConfigurationOptions: {
        AudioSourceToken: audioSourceToken,
      },
    });
    return response.getAudioSourceConfigurationOptionsResponse.audioSourceOptions;
  }

  /**
   * Returns valid ranges for audio output configuration parameters.
   * @param options
   */
  async getAudioOutputConfigurationOptions({
    audioOutputToken,
  }: GetAudioOutputConfigurationOptions): Promise<AudioOutputConfigurationOptions> {
    const response = await this.request({
      GetAudioOutputConfigurationOptions: {
        AudioOutputToken: audioOutputToken,
      },
    });
    return response.getAudioOutputConfigurationOptionsResponse.audioOutputOptions;
  }

  /**
   * Returns relay outputs available on the device.
   */
  async getRelayOutputs(): Promise<RelayOutput[]> {
    const response = await this.request({ GetRelayOutputs: {} }, { array: ['relayOutputs'] });
    return response.getRelayOutputsResponse?.relayOutputs ?? [];
  }

  /**
   * Modifies relay output settings.
   * @param options
   */
  async setRelayOutputSettings({ relayOutput }: SetRelayOutputSettings): Promise<void> {
    await this.request({
      SetRelayOutputSettings: {
        RelayOutput: DeviceIO.relayOutputToBuild(relayOutput),
      },
    });
  }

  /**
   * Sets the logical state of a relay output.
   * @param options
   */
  async setRelayOutputState({ relayOutputToken, logicalState }: SetRelayOutputState): Promise<void> {
    await this.request({
      SetRelayOutputState: {
        RelayOutputToken: relayOutputToken,
        LogicalState: logicalState,
      },
    });
  }

  /**
   * Returns digital inputs available on the device.
   */
  async getDigitalInputs(): Promise<DigitalInput[]> {
    const response = await this.request({ GetDigitalInputs: {} }, { array: ['digitalInputs'] });
    return response.getDigitalInputsResponse?.digitalInputs ?? [];
  }

  /**
   * Returns configuration options for digital inputs.
   * @param options
   */
  async getDigitalInputConfigurationOptions({
    token,
  }: GetDigitalInputConfigurationOptions = {}): Promise<DigitalInputConfigurationOptions> {
    const response = await this.request(
      {
        GetDigitalInputConfigurationOptions: {
          ...(token && { Token: token }),
        },
      },
      { array: ['idleState'] },
    );
    return response.getDigitalInputConfigurationOptionsResponse.digitalInputOptions;
  }

  /**
   * Modifies digital input configurations.
   * @param options
   */
  async setDigitalInputConfigurations({ digitalInputs }: SetDigitalInputConfigurations): Promise<void> {
    await this.request({
      SetDigitalInputConfigurations: {
        DigitalInputs: DeviceIO.digitalInputsToBuild(digitalInputs!),
      },
    });
  }

  /**
   * Returns serial ports available on the device.
   */
  async getSerialPorts(): Promise<SerialPort[]> {
    const response = await this.request({ GetSerialPorts: {} }, { array: ['serialPort'] });
    return response.getSerialPortsResponse?.serialPort ?? [];
  }

  /**
   * Returns the configuration of a serial port.
   * @param options
   */
  async getSerialPortConfiguration({ serialPortToken }: GetSerialPortConfiguration): Promise<SerialPortConfiguration> {
    const response = await this.request({
      GetSerialPortConfiguration: {
        SerialPortToken: serialPortToken,
      },
    });
    return response.getSerialPortConfigurationResponse.serialPortConfiguration;
  }

  /**
   * Modifies the configuration of a serial port.
   * @param options
   */
  async setSerialPortConfiguration({
    serialPortConfiguration,
    forcePersistance,
  }: SetSerialPortConfiguration): Promise<void> {
    await this.request({
      SetSerialPortConfiguration: {
        SerialPortConfiguration: DeviceIO.serialPortConfigurationToBuild(serialPortConfiguration),
        ForcePersistance: forcePersistance,
      },
    });
  }

  /**
   * Returns configuration options for a serial port.
   * @param options
   */
  async getSerialPortConfigurationOptions({
    serialPortToken,
  }: GetSerialPortConfigurationOptions): Promise<SerialPortConfigurationOptions> {
    const response = await this.request({
      GetSerialPortConfigurationOptions: {
        SerialPortToken: serialPortToken,
      },
    });
    return response.getSerialPortConfigurationOptionsResponse.serialPortOptions;
  }

  /**
   * Sends data to a serial port and optionally receives a response.
   * @param options
   */
  async sendReceiveSerialCommand(options: SendReceiveSerialCommand): Promise<SendReceiveSerialCommandResponse> {
    const response = await this.request({
      SendReceiveSerialCommand: {
        ...(options.token && { Token: options.token }),
        ...(options.serialData && { SerialData: DeviceIO.serialDataToBuild(options.serialData) }),
        ...(options.timeOut !== undefined && { TimeOut: options.timeOut }),
        ...(options.dataLength !== undefined && { DataLength: options.dataLength }),
        ...(options.delimiter !== undefined && { Delimiter: options.delimiter }),
      },
    });
    return response.sendReceiveSerialCommandResponse ?? {};
  }
}
