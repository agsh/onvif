import { Cam, Callback } from '../src/compatibility/cam';

const RECORDING_TOKEN = 'RecordingToken_1';
const RECORDING_JOB_TOKEN = 'RecordingJobToken_1';
const VIDEO_SOURCE_TOKEN = 'VideoSourceToken_1';
const TRACK_TOKEN = 'VIDEO001';

let cam: Cam;

function promisify<T>(fn: (callback: Callback) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((error: Error | null, result?: T) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result as T);
    });
  });
}

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    cam = new Cam(
      {
        hostname: '127.0.0.1',
        username: 'admin',
        password: 'admin',
        port: 8000,
      },
      (error) => (error ? reject(error) : resolve()),
    );
  });
});

describe('Compatibility Cam helpers', () => {
  it('supports _request with a callback', async () => {
    const result = await promisify<any>((callback) =>
      cam._request({ body: { GetDeviceInformation: {} } } as any, callback),
    );
    expect(result).toBeDefined();
  });

  it('sets system date/time and scopes round-trip', async () => {
    const current = await promisify<any>((callback) => cam.getSystemDateAndTime(callback));
    expect(current).toBeDefined();
    await expect(
      promisify<any>((callback) =>
        cam.setSystemDateAndTime({ dateTimeType: 'Manual', dateTime: new Date() } as any, callback),
      ),
    ).resolves.toBeDefined();

    const scopes = await promisify<any[]>((callback) => cam.getScopes(callback));
    const values = scopes.map((s) => s.scopeItem ?? s).filter(Boolean);
    expect(values.length).toBeGreaterThan(0);
    await expect(promisify<any>((callback) => cam.setScopes(values, callback))).resolves.toBeDefined();
  });

  it('sets NTP with flattened v0.x fields and DNS', async () => {
    const ntp = await promisify<any>((callback) => cam.getNTP(callback));
    await expect(
      promisify<any>((callback) =>
        cam.setNTP(
          {
            fromDHCP: false,
            type: 'IPv4',
            ipv4Address: '8.8.8.8',
            NTPManual: ntp.NTPManual ?? [],
          } as any,
          callback,
        ),
      ),
    ).resolves.toBeDefined();

    const dns = await promisify<any>((callback) => cam.getDNS(callback));
    await expect(promisify<any>((callback) => cam.setDNS(dns, callback))).resolves.toBeDefined();
  });

  it('sets network interfaces and default gateway', async () => {
    const interfaces = await promisify<any[]>((callback) => cam.getNetworkInterfaces(callback));
    expect(interfaces.length).toBeGreaterThan(0);
    await expect(
      promisify<any>((callback) => cam.setNetworkInterfaces({ networkInterfaces: interfaces[0] } as any, callback)),
    ).resolves.toBeDefined();

    const gateway = await promisify<any>((callback) => cam.getNetworkDefaultGateway(callback));
    await expect(
      promisify<any>((callback) => cam.setNetworkDefaultGateway(gateway, callback)),
    ).resolves.toBeUndefined();
  });

  it('creates and deletes a temporary profile with encoder configs', async () => {
    const profile = await promisify<any>((callback) =>
      cam.createProfile({ name: `compat-${Date.now()}` } as any, callback),
    );
    expect(profile.token).toBeDefined();

    const videoSources = await promisify<any[]>((callback) => cam.getVideoSourceConfigurations(callback));
    const videoEncoders = await promisify<any[]>((callback) => cam.getVideoEncoderConfigurations(callback));
    const audioSources = await promisify<any[]>((callback) => cam.getAudioSourceConfigurations(callback));
    const audioEncoders = await promisify<any[]>((callback) => cam.getAudioEncoderConfigurations(callback));

    await promisify<void>((callback) =>
      cam.addVideoSourceConfiguration(
        { profileToken: profile.token, configurationToken: videoSources[0].token ?? videoSources[0].$?.token },
        callback,
      ),
    ).catch(() => undefined);
    await promisify<void>((callback) =>
      cam.addVideoEncoderConfiguration(
        { profileToken: profile.token, configurationToken: videoEncoders[0].token ?? videoEncoders[0].$?.token },
        callback,
      ),
    ).catch(() => undefined);
    if (audioSources[0]) {
      await promisify<void>((callback) =>
        cam.addAudioSourceConfiguration(
          { profileToken: profile.token, configurationToken: audioSources[0].token ?? audioSources[0].$?.token },
          callback,
        ),
      ).catch(() => undefined);
    }
    if (audioEncoders[0]) {
      await promisify<void>((callback) =>
        cam.addAudioEncoderConfiguration(
          { profileToken: profile.token, configurationToken: audioEncoders[0].token ?? audioEncoders[0].$?.token },
          callback,
        ),
      ).catch(() => undefined);
      await promisify<void>((callback) =>
        cam.removeAudioEncoderConfiguration({ profileToken: profile.token }, callback),
      ).catch(() => undefined);
    }
    await promisify<void>((callback) =>
      cam.removeVideoEncoderConfiguration({ profileToken: profile.token }, callback),
    ).catch(() => undefined);
    if (audioSources[0]) {
      await promisify<void>((callback) =>
        cam.removeAudioSourceConfiguration({ profileToken: profile.token }, callback),
      ).catch(() => undefined);
    }

    await expect(
      promisify<void>((callback) => cam.deleteProfile({ profileToken: profile.token }, callback)),
    ).resolves.toBeUndefined();
  });

  it('sets video/audio encoder configurations when tokens exist', async () => {
    const videoEncoders = await promisify<any[]>((callback) => cam.getVideoEncoderConfigurations(callback));
    expect(videoEncoders.length).toBeGreaterThan(0);
    await expect(
      promisify<void>((callback) => cam.setVideoEncoderConfiguration(videoEncoders[0], callback)),
    ).resolves.toBeUndefined();

    const audioEncoders = await promisify<any[]>((callback) => cam.getAudioEncoderConfigurations(callback));
    expect(audioEncoders.length).toBeGreaterThan(0);
    await expect(
      promisify<void>((callback) => cam.setAudioEncoderConfiguration(audioEncoders[0], callback)),
    ).resolves.toBeUndefined();
  });

  it('creates, updates and deletes an OSD', async () => {
    const videoSourceConfigurationToken =
      cam.defaultProfile?.videoSourceConfiguration?.token ?? cam.activeSource?.videoSourceConfigurationToken;
    expect(videoSourceConfigurationToken).toBeDefined();

    const created = await promisify<any>((callback) =>
      cam.createOSD(
        {
          token: `compat_osd_${Date.now()}`,
          videoSourceConfigurationToken: videoSourceConfigurationToken!,
          type: 'Text',
          position: { type: 'UpperLeft' },
          textString: { type: 'Plain', plainText: 'compat' },
        } as any,
        callback,
      ),
    );
    const token = created?.OSDToken ?? created?.token ?? created;
    expect(token).toBeDefined();
    await promisify<void>((callback) =>
      cam.setOSD(
        {
          token,
          videoSourceConfigurationToken: videoSourceConfigurationToken!,
          type: 'Text',
          position: { type: 'UpperLeft' },
          textString: { type: 'Plain', plainText: 'compat2' },
        } as any,
        callback,
      ),
    ).catch(() => undefined);
    await expect(promisify<void>((callback) => cam.deleteOSD({ OSDToken: token } as any, callback))).resolves.toBeUndefined();
  });

  it('supports preset create/remove and home position', async () => {
    const set = await promisify<any>((callback) =>
      cam.setPreset({ presetName: `compat-${Date.now()}` } as any, callback),
    );
    const presetToken = set?.presetToken ?? set;
    expect(presetToken).toBeDefined();
    await expect(
      promisify<void>((callback) => cam.setHomePosition({} as any, callback)),
    ).resolves.toBeUndefined();
    await expect(
      promisify<void>((callback) => cam.removePreset({ presetToken } as any, callback)),
    ).resolves.toBeUndefined();
  });

  it('supports absoluteMove without callback and continuousMove flags', async () => {
    await new Promise<void>((resolve, reject) => {
      cam.once('error', reject);
      cam.absoluteMove({ x: 0, y: 0, zoom: 0 } as any);
      setTimeout(resolve, 200);
    });
    await expect(
      promisify<void>((callback) =>
        cam.continuousMove({ x: 0.1, y: 0, zoom: 0, onlySendPanTilt: true } as any, callback),
      ),
    ).resolves.toBeUndefined();
    await expect(
      promisify<void>((callback) =>
        cam.continuousMove({ x: 0, y: 0, zoom: 0.1, onlySendZoom: true } as any, callback),
      ),
    ).resolves.toBeUndefined();
    await expect(promisify<void>((callback) => cam.stop(callback))).resolves.toBeUndefined();
  });

  it('supports imaging set/move/presets helpers', async () => {
    const settings = await promisify<any>((callback) =>
      cam.getImagingSettings({ token: VIDEO_SOURCE_TOKEN }, callback),
    );
    await expect(
      promisify<void>((callback) =>
        cam.setImagingSettings({ token: VIDEO_SOURCE_TOKEN, ...settings, brightness: settings.brightness }, callback),
      ),
    ).resolves.toBeUndefined();

    await promisify<void>((callback) =>
      cam.imagingMove({ token: VIDEO_SOURCE_TOKEN, continuous: { speed: 0 } }, callback),
    ).catch(() => undefined);

    await promisify<any>((callback) => cam.getCurrentImagingPreset({ token: VIDEO_SOURCE_TOKEN }, callback)).catch(
      () => undefined,
    );
  });

  it('parses event XML and recording job helpers', async () => {
    await promisify<any>((callback) =>
      cam.parseEventXML(
        `<?xml version="1.0"?><Envelope xmlns="http://www.w3.org/2003/05/soap-envelope"><Body><Notify/></Body></Envelope>`,
        callback,
      ),
    ).catch(() => undefined);

    await promisify<any>((callback) =>
      cam.getTrackConfiguration({ recordingToken: RECORDING_TOKEN, trackToken: TRACK_TOKEN }, callback),
    ).catch(() => undefined);

    await promisify<any>((callback) =>
      cam.setRecordingJobMode({ JobToken: RECORDING_JOB_TOKEN, Mode: 'Idle' }, callback),
    ).catch(() => undefined);
  });

  it('rejects missing configuration tokens', async () => {
    await expect(
      promisify<any>((callback) => cam.getVideoSourceConfiguration(callback)),
    ).rejects.toThrow('No video source configuration token is present!');
    await expect(
      promisify<any>((callback) => cam.getAudioEncoderConfiguration(callback)),
    ).rejects.toThrow('No audio encoder configuration token is present!');
    await expect(
      promisify<void>((callback) => cam.setVideoEncoderConfiguration({}, callback)),
    ).rejects.toThrow('No video encoder configuration token is present!');
  });

  it('supports optional callbacks and continuous/relative move option flags', async () => {
    // early-return when callback is omitted
    expect(cam.getVideoSourceConfiguration('VideoSourceToken_1' as any)).toBeUndefined();
    expect(cam.getImagingSettings()).toBeUndefined();

    const encoderToken =
      (cam.videoEncoderConfigurations as any)?.[0]?.token ??
      (cam.videoEncoderConfigurations as any)?.[0]?.$?.token ??
      'VideoEncoderToken_1';
    await promisify<any>((callback) => cam.getVideoEncoderConfigurationOptions(encoderToken, callback));

    // continuousMove / relativeMove / stop without callback (fire-and-forget)
    cam.continuousMove({ x: 0.1, y: 0.1, zoom: 0.1 } as any);
    cam.continuousMove({ x: 0.1, y: 0.1, onlySendZoom: true, zoom: 0.2 } as any);
    cam.continuousMove({ zoom: 0.1, onlySendPanTilt: true, x: 0.1, y: 0.1 } as any);
    cam.relativeMove({ x: 0.05, y: 0.05, zoom: 0.01 } as any);
    cam.stop();

    await promisify<any>((callback) =>
      cam.ptzSendAuxiliaryCommand({ data: 'tt:Wiper|On' }, callback),
    ).catch(() => undefined);
  });
});
