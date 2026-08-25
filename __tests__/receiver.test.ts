import { Onvif } from '../src';
import { ReceiverConfiguration } from '../src/interfaces/onvif';
import happytimeOnvifOptions from './happytime.json';

const MEDIA_URI = 'rtsp://127.0.0.1:554/stream1';

const defaultReceiverConfiguration = (): ReceiverConfiguration => ({
  mode: 'AutoConnect',
  mediaUri: MEDIA_URI,
  streamSetup: {
    stream: 'RTP-Unicast',
    transport: { protocol: 'RTSP' },
  },
});

let cam: Onvif;
const createdReceiverTokens: string[] = [];

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
});

afterEach(async () => {
  while (createdReceiverTokens.length > 0) {
    const token = createdReceiverTokens.pop()!;
    try {
      await cam.receiver.deleteReceiver({ receiverToken: token });
    } catch {
      // receiver may already have been deleted in the test
    }
  }
});

describe('Receiver', () => {
  beforeAll(() => {
    if (!cam.uri.receiver) {
      throw new Error('Receiver service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return receiver service capabilities as an object', async () => {
      const caps = await cam.receiver.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.receiver.getServiceCapabilities();
      expect(caps.RTP_Multicast).toBe(true);
      expect(caps.RTP_TCP).toBe(true);
      expect(caps.RTP_RTSP_TCP).toBe(true);
      expect(caps.supportedReceivers).toBe(10);
      expect(caps.maximumRTSPURILength).toBe(256);
    });
  });

  describe('getReceivers', () => {
    it('should return a list of receivers', async () => {
      const receivers = await cam.receiver.getReceivers();
      expect(Array.isArray(receivers)).toBe(true);
    });
  });

  describe('createReceiver / getReceiver / deleteReceiver', () => {
    it('should create, read back, and delete a receiver', async () => {
      const created = await cam.receiver.createReceiver({
        configuration: defaultReceiverConfiguration(),
      });
      createdReceiverTokens.push(created.token);

      expect(created.token).toBeDefined();
      expect(created.configuration).toMatchObject({
        mode: 'AutoConnect',
        mediaUri: MEDIA_URI,
        streamSetup: {
          stream: 'RTP-Unicast',
          transport: { protocol: 'RTSP' },
        },
      });

      const receivers = await cam.receiver.getReceivers();
      expect(receivers.some((item) => item.token === created.token)).toBe(true);

      const receiver = await cam.receiver.getReceiver({ receiverToken: created.token });
      expect(receiver.token).toBe(created.token);
      expect(receiver.configuration.mediaUri).toBe(MEDIA_URI);

      await cam.receiver.deleteReceiver({ receiverToken: created.token });
      createdReceiverTokens.pop();

      await expect(cam.receiver.getReceiver({ receiverToken: created.token })).rejects.toThrow();
    });

    it('should reject an invalid receiver token', async () => {
      await expect(cam.receiver.getReceiver({ receiverToken: 'InvalidToken' })).rejects.toThrow(
        'The receiver indicated by ReceiverToken does not exist',
      );
    });
  });

  describe('getReceiverState / setReceiverMode', () => {
    it('should return receiver state and update connection mode', async () => {
      const created = await cam.receiver.createReceiver({
        configuration: defaultReceiverConfiguration(),
      });
      createdReceiverTokens.push(created.token);

      const initialState = await cam.receiver.getReceiverState({ receiverToken: created.token });
      expect(initialState.state).toBe('NotConnected');
      expect(initialState.autoCreated).toBe(false);

      await cam.receiver.setReceiverMode({ receiverToken: created.token, mode: 'NeverConnect' });

      const receiver = await cam.receiver.getReceiver({ receiverToken: created.token });
      expect(receiver.configuration.mode).toBe('NeverConnect');
    });
  });

  describe('configureReceiver', () => {
    it('should update receiver configuration', async () => {
      const created = await cam.receiver.createReceiver({
        configuration: defaultReceiverConfiguration(),
      });
      createdReceiverTokens.push(created.token);

      const updatedUri = 'rtsp://127.0.0.1:554/stream2';
      await cam.receiver.configureReceiver({
        receiverToken: created.token,
        configuration: {
          ...defaultReceiverConfiguration(),
          mode: 'AlwaysConnect',
          mediaUri: updatedUri,
        },
      });

      const receiver = await cam.receiver.getReceiver({ receiverToken: created.token });
      expect(receiver.configuration.mode).toBe('AlwaysConnect');
      expect(receiver.configuration.mediaUri).toBe(updatedUri);
    });
  });
});
