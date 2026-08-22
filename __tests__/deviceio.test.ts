import { Onvif } from '../src';

const VIDEO_SOURCE_TOKEN = 'VideoSourceToken_1';
const AUDIO_SOURCE_TOKEN = 'AudioSourceToken_1';
const AUDIO_OUTPUT_TOKEN = 'AudioOutputToken_1';
const RELAY_OUTPUT_TOKEN = 'RelayOutputToken_1';
const DIGITAL_INPUT_TOKEN = 'DigitalInputToken_1';
const SERIAL_PORT_TOKEN = 'SerialPortToken_1';

let cam: Onvif;

beforeAll(async () => {
  cam = new Onvif({
    hostname: '127.0.0.1',
    username: 'admin',
    password: 'admin',
    port: 8000,
  });
  await cam.connect();
});

describe('DeviceIO', () => {
  beforeAll(() => {
    if (!cam.uri.deviceIO) {
      throw new Error('DeviceIO service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return device IO service capabilities as an object', async () => {
      const caps = await cam.deviceIO.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability counters from the happytime mock server', async () => {
      const caps = await cam.deviceIO.getServiceCapabilities();
      expect(caps.videoSources).toBe(1);
      expect(caps.audioSources).toBe(1);
      expect(caps.audioOutputs).toBe(1);
      expect(caps.relayOutputs).toBe(1);
      expect(caps.serialPorts).toBe(1);
      expect(caps.digitalInputs).toBe(1);
      expect(caps.digitalInputOptions).toBe(true);
    });
  });

  describe('physical IO listings', () => {
    it('should return video and audio source tokens', async () => {
      const videoSources = await cam.deviceIO.getVideoSources();
      const audioSources = await cam.deviceIO.getAudioSources();
      const audioOutputs = await cam.deviceIO.getAudioOutputs();

      expect(videoSources).toContain(VIDEO_SOURCE_TOKEN);
      expect(audioSources).toContain(AUDIO_SOURCE_TOKEN);
      expect(audioOutputs).toContain(AUDIO_OUTPUT_TOKEN);
    });
  });

  describe('relay outputs', () => {
    it('should return relay outputs from the mock server', async () => {
      const relays = await cam.deviceIO.getRelayOutputs();
      expect(relays.length).toBeGreaterThanOrEqual(1);
      expect(relays[0].token).toBe(RELAY_OUTPUT_TOKEN);
      expect(relays[0].properties.mode).toBe('Monostable');
    });

    it('should return relay output options', async () => {
      const options = await cam.deviceIO.getRelayOutputOptions({ relayOutputToken: RELAY_OUTPUT_TOKEN });
      expect(options.length).toBeGreaterThanOrEqual(1);
      expect(options[0].token).toBe(RELAY_OUTPUT_TOKEN);
      expect(options[0].mode).toEqual(expect.arrayContaining(['Monostable', 'Bistable']));
    });

    it('should accept setRelayOutputState without error', async () => {
      await expect(
        cam.deviceIO.setRelayOutputState({ relayOutputToken: RELAY_OUTPUT_TOKEN, logicalState: 'active' }),
      ).resolves.toBeUndefined();
      await expect(
        cam.deviceIO.setRelayOutputState({ relayOutputToken: RELAY_OUTPUT_TOKEN, logicalState: 'inactive' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('digital inputs', () => {
    it('should return digital inputs from the mock server', async () => {
      const inputs = await cam.deviceIO.getDigitalInputs();
      expect(inputs.length).toBeGreaterThanOrEqual(1);
      expect(inputs[0].token).toBe(DIGITAL_INPUT_TOKEN);
      expect(inputs[0].idleState).toBe('closed');
    });

    it('should return digital input configuration options', async () => {
      const options = await cam.deviceIO.getDigitalInputConfigurationOptions({ token: DIGITAL_INPUT_TOKEN });
      expect(options.idleState).toEqual(expect.arrayContaining(['closed', 'open']));
    });
  });

  describe('serial ports', () => {
    it('should return serial ports from the mock server', async () => {
      const ports = await cam.deviceIO.getSerialPorts();
      expect(ports.length).toBeGreaterThanOrEqual(1);
      expect(ports[0].token).toBe(SERIAL_PORT_TOKEN);
    });

    it('should return serial port configuration and options', async () => {
      const configuration = await cam.deviceIO.getSerialPortConfiguration({ serialPortToken: SERIAL_PORT_TOKEN });
      const options = await cam.deviceIO.getSerialPortConfigurationOptions({ serialPortToken: SERIAL_PORT_TOKEN });

      expect(configuration.type).toBe('RS485FullDuplex');
      expect(configuration.baudRate).toBe(115200);
      expect(options.baudRateList.items).toEqual(expect.arrayContaining([115200, 98000]));
    });
  });

  describe('audio output configuration', () => {
    it('should return audio output configuration from the mock server', async () => {
      const configuration = await cam.deviceIO.getAudioOutputConfiguration({ audioOutputToken: AUDIO_OUTPUT_TOKEN });
      expect(configuration).toBeDefined();
      expect(configuration.outputToken).toBe(AUDIO_OUTPUT_TOKEN);
    });

    it('should return audio output configuration options', async () => {
      const options = await cam.deviceIO.getAudioOutputConfigurationOptions({ audioOutputToken: AUDIO_OUTPUT_TOKEN });
      expect(options.outputTokensAvailable).toContain(AUDIO_OUTPUT_TOKEN);
    });
  });

  describe('errors', () => {
    it('should reject an invalid relay output token', async () => {
      await expect(
        cam.deviceIO.getRelayOutputOptions({ relayOutputToken: 'InvalidToken' }),
      ).rejects.toThrow();
    });

    it('should reject getAudioSourceConfiguration when not implemented on the mock server', async () => {
      await expect(
        cam.deviceIO.getAudioSourceConfiguration({ audioSourceToken: AUDIO_SOURCE_TOKEN }),
      ).rejects.toThrow('Action Not Implemented');
    });
  });
});
