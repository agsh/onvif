import { ReferenceToken } from './common';
import {
  RelayMode,
  FloatList,
  DigitalIdleState,
  DeviceEntity,
  IntItems,
  FloatItems,
  AudioSourceConfiguration,
  AudioOutputConfiguration,
  VideoSourceConfiguration,
  VideoOutputConfiguration,
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
export interface Capabilities {
  /** Number of video sources (defaults to none). */
  videoSources?: number;
  /** Number of video outputs (defaults to none). */
  videoOutputs?: number;
  /** Number of audio sources (defaults to none). */
  audioSources?: number;
  /** Number of audio outputs (defaults to none). */
  audioOutputs?: number;
  /** Number of relay outputs (defaults to none). */
  relayOutputs?: number;
  /** Number of serial ports (defaults to none). */
  serialPorts?: number;
  /** Number of digital inputs (defaults to none). */
  digitalInputs?: number;
  /** Indicates support for DigitalInput configuration of the idle state (defaults to false). */
  digitalInputOptions?: boolean;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
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
  [key: symbol]: unknown;
}
export interface DigitalInputConfigurationOptions {
  /** Configuration Options for a digital input. */
  idleState?: DigitalIdleState[];
  [key: string]: unknown;
  [key: symbol]: unknown;
}
/** The serial port data. */
export interface SerialData {
  binary?: unknown;
  string?: string;
}
/** Lists all available serial ports of a device */
export interface SerialPort extends DeviceEntity {
  [key: string]: unknown;
  [key: symbol]: unknown;
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
  [key: symbol]: unknown;
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
  [key: symbol]: unknown;
}
/** The list of configurable parity for the data error detection. */
export interface ParityBitList {
  items?: ParityBit[];
}
export interface GetRelayOutputOptions {
  /** Optional reference token to the relay for which the options are requested. */
  relayOutputToken?: ReferenceToken;
}
export interface GetAudioSourceConfiguration {
  /** Token of the requested AudioSource. */
  audioSourceToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetAudioOutputConfiguration {
  /** Token of the physical Audio output. */
  audioOutputToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetVideoSourceConfiguration {
  /** Token of the requested VideoSource. */
  videoSourceToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetVideoOutputConfiguration {
  /** Token of the requested VideoOutput. */
  videoOutputToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
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
  [key: symbol]: unknown;
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
  [key: symbol]: unknown;
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
  [key: symbol]: unknown;
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
  [key: symbol]: unknown;
}
export interface GetVideoSourceConfigurationOptions {
  /** Token of the Video input whose options are requested.. */
  videoSourceToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetVideoOutputConfigurationOptions {
  /** Token of the Video Output whose options are requested.. */
  videoOutputToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetAudioSourceConfigurationOptions {
  /** Token of the physical Audio input whose options are requested.. */
  audioSourceToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface GetAudioOutputConfigurationOptions {
  /** Token of the physical Audio Output whose options are requested.. */
  audioOutputToken: ReferenceToken;
  [key: string]: unknown;
  [key: symbol]: unknown;
}
export interface SetRelayOutputSettings {
  relayOutput: RelayOutput;
}
export interface GetDigitalInputConfigurationOptions {
  token?: ReferenceToken;
}
export interface SetDigitalInputConfigurations {
  digitalInputs?: DigitalInput[];
}
export interface GetSerialPortConfiguration {
  serialPortToken: ReferenceToken;
}
export interface SetSerialPortConfiguration {
  serialPortConfiguration: SerialPortConfiguration;
  forcePersistance: boolean;
}
export interface GetSerialPortConfigurationOptions {
  serialPortToken: ReferenceToken;
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
