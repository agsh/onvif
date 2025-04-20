import { ReferenceToken } from './common';
import {
  RelayMode,
  FloatList,
  DigitalIdleState,
  DeviceEntity,
  IntItems,
  FloatItems,
  Capabilities,
  VideoOutput,
  AudioSourceConfiguration,
  AudioOutputConfiguration,
  VideoSourceConfiguration,
  VideoOutputConfiguration,
  VideoSourceConfigurationOptions,
  VideoOutputConfigurationOptions,
  AudioSourceConfigurationOptions,
  AudioOutputConfigurationOptions,
  RelayOutput,
  DigitalInput,
} from './onvif';
import { Duration } from './basics';

/** The type of serial port.Generic can be signaled as a vendor specific serial port type. */
export type SerialPortType =
  | 'RS232'
  | 'RS422HalfDuplex'
  | 'RS422FullDuplex'
  | 'RS485HalfDuplex'
  | 'RS485FullDuplex'
  | 'Generic';
/** The parity for the data error detection. */
export type ParityBit = 'None' | 'Even' | 'Odd' | 'Mark' | 'Space' | 'Extended';
export interface RelayOutputOptions {
  /** Token of the relay output. */
  token: ReferenceToken;
  /** Supported Modes. */
  mode?: RelayMode[];
  /** Supported delay time range or discrete values in seconds. This element must be present if MonoStable mode is supported. */
  delayTimes?: FloatList;
  /** True if the relay only supports the exact values for the DelayTimes listed. Default is false. */
  discrete?: boolean;
  extension?: RelayOutputOptionsExtension;
}
export interface RelayOutputOptionsExtension {
  [key: string]: unknown;
}
export interface Get {}
export interface GetResponse {
  /** List tokens of a physical IO of a device. */
  token?: ReferenceToken[];
}
export interface DigitalInputConfigurationOptions {
  /** Configuration Options for a digital input. */
  idleState?: DigitalIdleState[];
  [key: string]: unknown;
}
/** The serial port data. */
export interface SerialData {}
/** Lists all available serial ports of a device */
export interface SerialPort extends DeviceEntity {
  [key: string]: unknown;
}
/** The parameters for configuring the serial port. */
export interface SerialPortConfiguration {
  token: ReferenceToken;
  type: SerialPortType;
  /** The transfer bitrate. */
  baudRate: number;
  /** The parity for the data error detection. */
  parityBit: ParityBit;
  /** The bit length for each character. */
  characterLength: number;
  /** The number of stop bits used to terminate each character. */
  stopBit: number;
  [key: string]: unknown;
}
/** The configuration options that relates to serial port. */
export interface SerialPortConfigurationOptions {
  token: ReferenceToken;
  /** The list of configurable transfer bitrate. */
  baudRateList: IntItems;
  /** The list of configurable parity for the data error detection. */
  parityBitList: ParityBitList;
  /** The list of configurable bit length for each character. */
  characterLengthList: IntItems;
  /** The list of configurable number of stop bits used to terminate each character. */
  stopBitList: FloatItems;
  [key: string]: unknown;
}
/** The list of configurable parity for the data error detection. */
export interface ParityBitList {
  items?: ParityBit[];
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the device IO service is returned in the Capabilities element. */
  capabilities: Capabilities;
}
export interface GetRelayOutputOptions {
  /** Optional reference token to the relay for which the options are requested. */
  relayOutputToken?: ReferenceToken;
}
export interface GetRelayOutputOptionsResponse {
  /** Valid values and ranges for the configuration of a relay output. */
  relayOutputOptions?: RelayOutputOptions[];
}
export interface GetVideoSources extends Get {}
export interface GetVideoSourcesResponse extends GetResponse {}
export interface GetAudioSources extends Get {}
export interface GetAudioSourcesResponse extends GetResponse {}
export interface GetAudioOutputs extends Get {}
export interface GetAudioOutputsResponse extends GetResponse {}
export interface GetVideoOutputs {}
export interface GetVideoOutputsResponse {
  /** List containing all physical Video output connections of a device. */
  videoOutputs?: VideoOutput[];
}
export interface GetAudioSourceConfiguration {
  /** Token of the requested AudioSource. */
  audioSourceToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetAudioSourceConfigurationResponse {
  /** Current configuration of the Audio input. */
  audioSourceConfiguration: AudioSourceConfiguration;
  [key: string]: unknown;
}
export interface GetAudioOutputConfiguration {
  /** Token of the physical Audio output. */
  audioOutputToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetAudioOutputConfigurationResponse {
  /** Current configuration of the Audio output. */
  audioOutputConfiguration: AudioOutputConfiguration;
  [key: string]: unknown;
}
export interface GetVideoSourceConfiguration {
  /** Token of the requested VideoSource. */
  videoSourceToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetVideoSourceConfigurationResponse {
  /** Current configuration of the Video input. */
  videoSourceConfiguration: VideoSourceConfiguration;
  [key: string]: unknown;
}
export interface GetVideoOutputConfiguration {
  /** Token of the requested VideoOutput. */
  videoOutputToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetVideoOutputConfigurationResponse {
  /** Current configuration of the Video output. */
  videoOutputConfiguration: VideoOutputConfiguration;
  [key: string]: unknown;
}
export interface SetAudioSourceConfiguration {
  configuration: AudioSourceConfiguration;
  /**
   * The ForcePersistence element determines how configuration
   * changes shall be stored. If true, changes shall be persistent. If false, changes MAY revert to previous values
   * after reboot.
   */
  forcePersistence: boolean;
  [key: string]: unknown;
}
export interface SetAudioSourceConfigurationResponse {
  [key: string]: unknown;
}
export interface SetAudioOutputConfiguration {
  configuration: AudioOutputConfiguration;
  /**
   * The ForcePersistence element determines how configuration
   * changes shall be stored. If true, changes shall be persistent. If false, changes MAY revert to previous values
   * after reboot.
   */
  forcePersistence: boolean;
  [key: string]: unknown;
}
export interface SetAudioOutputConfigurationResponse {
  [key: string]: unknown;
}
export interface SetVideoSourceConfiguration {
  configuration: VideoSourceConfiguration;
  /**
   * The ForcePersistence element determines how configuration
   * changes shall be stored. If true, changes shall be persistent. If false, changes MAY revert to previous values
   * after reboot.
   */
  forcePersistence: boolean;
  [key: string]: unknown;
}
export interface SetVideoSourceConfigurationResponse {
  [key: string]: unknown;
}
export interface SetVideoOutputConfiguration {
  configuration: VideoOutputConfiguration;
  /**
   * The ForcePersistence element determines how configuration
   * changes shall be stored. If true, changes shall be persistent. If false, changes MAY revert to previous values
   * after reboot.
   */
  forcePersistence: boolean;
  [key: string]: unknown;
}
export interface SetVideoOutputConfigurationResponse {
  [key: string]: unknown;
}
export interface GetVideoSourceConfigurationOptions {
  /** Token of the Video input whose options are requested.. */
  videoSourceToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetVideoSourceConfigurationOptionsResponse {
  videoSourceConfigurationOptions: VideoSourceConfigurationOptions;
  [key: string]: unknown;
}
export interface GetVideoOutputConfigurationOptions {
  /** Token of the Video Output whose options are requested.. */
  videoOutputToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetVideoOutputConfigurationOptionsResponse {
  videoOutputConfigurationOptions: VideoOutputConfigurationOptions;
  [key: string]: unknown;
}
export interface GetAudioSourceConfigurationOptions {
  /** Token of the physical Audio input whose options are requested.. */
  audioSourceToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetAudioSourceConfigurationOptionsResponse {
  /** Returns the AudioSourceToken available. */
  audioSourceOptions: AudioSourceConfigurationOptions;
  [key: string]: unknown;
}
export interface GetAudioOutputConfigurationOptions {
  /** Token of the physical Audio Output whose options are requested.. */
  audioOutputToken: ReferenceToken;
  [key: string]: unknown;
}
export interface GetAudioOutputConfigurationOptionsResponse {
  /** Available settings and ranges for the requested Audio output. */
  audioOutputOptions: AudioOutputConfigurationOptions;
  [key: string]: unknown;
}
export interface SetRelayOutputSettings {
  relayOutput: RelayOutput;
}
export interface SetRelayOutputSettingsResponse {}
export interface GetDigitalInputs {}
export interface GetDigitalInputsResponse {
  digitalInputs?: DigitalInput[];
}
export interface GetDigitalInputConfigurationOptions {
  token?: ReferenceToken;
}
export interface GetDigitalInputConfigurationOptionsResponse {
  digitalInputOptions: DigitalInputConfigurationOptions;
}
export interface SetDigitalInputConfigurations {
  digitalInputs?: DigitalInput[];
}
export interface SetDigitalInputConfigurationsResponse {}
export interface GetSerialPorts {}
export interface GetSerialPortsResponse {
  serialPort?: SerialPort[];
}
export interface GetSerialPortConfiguration {
  serialPortToken: ReferenceToken;
}
export interface GetSerialPortConfigurationResponse {
  serialPortConfiguration: SerialPortConfiguration;
}
export interface SetSerialPortConfiguration {
  serialPortConfiguration: SerialPortConfiguration;
  forcePersistance: boolean;
}
export interface SetSerialPortConfigurationResponse {}
export interface GetSerialPortConfigurationOptions {
  serialPortToken: ReferenceToken;
}
export interface GetSerialPortConfigurationOptionsResponse {
  serialPortOptions: SerialPortConfigurationOptions;
}
export interface SendReceiveSerialCommand {
  /** The physical serial port reference to be used when this request is invoked. */
  token?: ReferenceToken;
  /** The serial port data. */
  serialData?: SerialData;
  /** Indicates that the command should be responded back within the specified period of time. */
  timeOut?: Duration;
  /** This element may be put in the case that data length returned from the connected serial device is already determined as some fixed bytes length. It indicates the length of received data which can be regarded as available. */
  dataLength?: number;
  /** This element may be put in the case that the delimiter codes returned from the connected serial device is already known. It indicates the termination data sequence of the responded data. In case the string has more than one character a device shall interpret the whole string as a single delimiter. Furthermore a device shall return the delimiter character(s) to the client. */
  delimiter?: string;
}
export interface SendReceiveSerialCommandResponse {
  serialData?: SerialData;
}
