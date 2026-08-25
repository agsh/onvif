/**
 * Unit tests for Cam compatibility methods that are awkward or destructive against a live device
 * (users, reboot, factory default, recording jobs, auxiliary, imaging preset) plus Discovery/xaddrs.
 */

import { Onvif } from '../src/onvif';
import { Discovery as MasterDiscovery } from '../src/discovery';
import { Cam, Callback } from '../src/compatibility/cam';
import { Discovery } from '../src/compatibility/discovery';

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

function mockCam(): { cam: Cam; onvif: Onvif } {
  const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
  const cam = Object.create(Cam.prototype) as Cam;
  (cam as unknown as { onvif: Onvif }).onvif = onvif;
  return { cam, onvif };
}

describe('compatibility Cam methods (mocked)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes get/set xaddrs like v0.x Discovery cams', () => {
    const { cam } = mockCam();
    const urls = [new URL('http://10.0.0.5/onvif/device_service')];
    cam.xaddrs = urls;
    expect(cam.xaddrs).toEqual(urls);
  });

  it('forwards updateNC and digestAuth to Onvif (v0.x public API)', () => {
    const { cam, onvif } = mockCam();
    onvif.username = 'admin';
    onvif.password = 'secret';

    expect(cam.updateNC()).toBe('00000001');
    expect(cam.updateNC()).toBe('00000002');

    const header = cam.digestAuth(
      ['Digest realm="ONVIF", nonce="abc", qop="auth", algorithm=MD5'],
      { method: 'POST', path: '/onvif/device_service' },
    );
    expect(header).toMatch(/^Digest /);
    expect(header).toContain('username="admin"');
    expect(header).toContain('nc=00000003');
    expect(header).toContain('qop=auth');
  });

  it('passes lastResponseXml as the third callback argument', async () => {
    const { cam, onvif } = mockCam();
    onvif.lastResponseXml = '<s:Envelope>ok</s:Envelope>';
    jest.spyOn(onvif.device, 'getHostname').mockResolvedValue({ name: 'cam-1' } as any);

    const payload = await new Promise<{ data: any; xml?: string }>((resolve, reject) => {
      cam.getHostname((error, data, xml) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ data, xml });
      });
    });
    expect(payload.data).toEqual({ name: 'cam-1' });
    expect(payload.xml).toBe('<s:Envelope>ok</s:Envelope>');
  });

  it('setNTP mutates caller options like v0.x (fills NTPManual)', async () => {
    const { cam, onvif } = mockCam();
    const setNTP = jest.spyOn(onvif.device, 'setNTP').mockResolvedValue({} as any);
    const options: any = {
      fromDHCP: false,
      type: 'IPv4',
      ipv4Address: '192.168.1.1',
    };

    await promisify<void>((callback) => cam.setNTP(options, callback));

    expect(Array.isArray(options.NTPManual)).toBe(true);
    expect(options.NTPManual).toEqual([
      {
        type: 'IPv4',
        IPv4Address: '192.168.1.1',
        IPv6Address: undefined,
        DNSname: undefined,
      },
    ]);
    expect(setNTP).toHaveBeenCalledWith(options);
  });

  it('getStreamUri forwards stream/protocol when profileToken is omitted', async () => {
    const { cam, onvif } = mockCam();
    const Media = (await import('../src/media')).default;
    Object.defineProperty(onvif, 'media', { value: new Media(onvif), configurable: true });
    const spy = jest.spyOn(onvif.media, 'getStreamUri').mockResolvedValue({
      uri: 'rtsp://127.0.0.1/stream',
    } as any);

    await promisify<any>((callback) =>
      cam.getStreamUri({ stream: 'RTP-Unicast', protocol: 'UDP' }, callback),
    );

    expect(spy).toHaveBeenCalledWith({ stream: 'RTP-Unicast', protocol: 'UDP' });
  });

  it('gotoPreset maps v0 { preset } to presetToken', async () => {
    const { cam, onvif } = mockCam();
    const PTZ = (await import('../src/ptz')).default;
    Object.defineProperty(onvif, 'ptz', { value: new PTZ(onvif), configurable: true });
    const spy = jest.spyOn(onvif.ptz, 'gotoPreset').mockResolvedValue(undefined);

    await promisify<void>((callback) => cam.gotoPreset({ preset: 'tok-1' } as any, callback));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ presetToken: 'tok-1' }));

    await promisify<void>((callback) => cam.gotoPreset({ presetToken: 'tok-2' } as any, callback));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ presetToken: 'tok-2' }));
  });

  it('setSystemFactoryDefault Soft/Hard and systemReboot', async () => {
    const { cam, onvif } = mockCam();
    const soft = jest.spyOn(onvif.device, 'setSystemFactoryDefault').mockResolvedValue(undefined);
    const reboot = jest.spyOn(onvif.device, 'systemReboot').mockResolvedValue('Rebooting');

    await promisify<void>((callback) => cam.setSystemFactoryDefault(callback));
    expect(soft).toHaveBeenCalledWith({ factoryDefault: 'Soft' });

    await promisify<void>((callback) => cam.setSystemFactoryDefault(true, callback));
    expect(soft).toHaveBeenCalledWith({ factoryDefault: 'Hard' });

    await expect(promisify<string>((callback) => cam.systemReboot(callback))).resolves.toBe('Rebooting');
    expect(reboot).toHaveBeenCalled();
  });

  it('createUsers / deleteUsers', async () => {
    const { cam, onvif } = mockCam();
    const create = jest.spyOn(onvif.device, 'createUsers').mockResolvedValue(undefined);
    const del = jest.spyOn(onvif.device, 'deleteUsers').mockResolvedValue(undefined);

    await promisify<void>((callback) =>
      cam.createUsers({ user: [{ username: 'u', password: 'p', userLevel: 'User' }] }, callback),
    );
    expect(create).toHaveBeenCalledWith({
      user: [{ username: 'u', password: 'p', userLevel: 'User' }],
    });

    await promisify<void>((callback) => cam.deleteUsers({ username: ['u'] }, callback));
    expect(del).toHaveBeenCalledWith({ username: ['u'] });
  });

  it('sendAuxiliaryCommand maps data → auxiliaryCommand', async () => {
    const { cam, onvif } = mockCam();
    const spy = jest.spyOn(onvif.device, 'sendAuxiliaryCommand').mockResolvedValue('ok' as any);

    await expect(
      promisify<string>((callback) => cam.sendAuxiliaryCommand({ data: 'tt:Wiper|On' }, callback)),
    ).resolves.toBe('ok');
    expect(spy).toHaveBeenCalledWith({ auxiliaryCommand: 'tt:Wiper|On' });
  });

  it('setCurrentImagingPreset', async () => {
    const { cam, onvif } = mockCam();
    const Imaging = (await import('../src/imaging')).default;
    Object.defineProperty(onvif, 'imaging', { value: new Imaging(onvif), configurable: true });
    onvif.activeSource = { sourceToken: 'vs1', profileToken: 'p1' } as any;
    const spy = jest.spyOn(onvif.imaging, 'setCurrentPreset').mockResolvedValue(undefined);

    await promisify<void>((callback) =>
      cam.setCurrentImagingPreset({ presetToken: 'ip1', token: 'vs1' }, callback),
    );
    expect(spy).toHaveBeenCalledWith({ videoSourceToken: 'vs1', presetToken: 'ip1' });
  });

  it('createRecordingJob / deleteRecordingJob with v0 JobToken shape', async () => {
    const { cam, onvif } = mockCam();
    const Recording = (await import('../src/recording')).default;
    Object.defineProperty(onvif, 'recording', { value: new Recording(onvif), configurable: true });
    const create = jest.spyOn(onvif.recording, 'createRecordingJob').mockResolvedValue({ jobToken: 'j1' } as any);
    const del = jest.spyOn(onvif.recording, 'deleteRecordingJob').mockResolvedValue(undefined);

    await promisify<any>((callback) =>
      cam.createRecordingJob(
        {
          recordingToken: 'r1',
          mode: 'Idle',
          priority: 1,
        },
        callback,
      ),
    );
    expect(create).toHaveBeenCalledWith({
      jobConfiguration: {
        scheduleToken: undefined,
        recordingToken: 'r1',
        mode: 'Idle',
        priority: 1,
      },
    });

    await promisify<void>((callback) => cam.deleteRecordingJob({ JobToken: 'j1' }, callback));
    expect(del).toHaveBeenCalledWith({ jobToken: 'j1' });
  });
});

describe('compatibility Discovery (callback)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('probe maps Onvif → Cam and preserves xaddrs', async () => {
    const onvif = new Onvif({
      hostname: '192.168.1.50',
      port: 80,
      path: '/onvif/device_service',
      urn: 'urn:uuid:test',
      autoConnect: false,
      xaddrs: [new URL('http://192.168.1.50/onvif/device_service')],
    });
    jest.spyOn(MasterDiscovery, 'probe').mockResolvedValue([onvif, { raw: true }]);

    const devices = await promisify<(Cam | Record<string, unknown>)[]>((callback) =>
      Discovery.probe({ timeout: 10 }, callback),
    );
    expect(devices).toHaveLength(2);
    expect(devices[0]).toBeInstanceOf(Cam);
    expect((devices[0] as Cam).hostname).toBe('192.168.1.50');
    expect((devices[0] as Cam).xaddrs).toEqual(onvif.xaddrs);
    expect(devices[1]).toEqual({ raw: true });
  });

  it('probe(callback) overload without options', async () => {
    jest.spyOn(MasterDiscovery, 'probe').mockResolvedValue([]);
    await expect(promisify<unknown[]>((callback) => Discovery.probe(callback))).resolves.toEqual([]);
  });

  it('re-emits device and error events from master Discovery', () => {
    const onvif = new Onvif({
      hostname: '10.0.0.1',
      autoConnect: false,
      xaddrs: [new URL('http://10.0.0.1/')],
    });
    const deviceHandler = jest.fn();
    const errorHandler = jest.fn();
    Discovery.on('device', deviceHandler);
    Discovery.on('error', errorHandler);

    MasterDiscovery.emit('device', onvif, { address: '10.0.0.1' }, '<xml/>');
    MasterDiscovery.emit('error', new Error('probe failed'), '<bad/>');

    expect(deviceHandler).toHaveBeenCalled();
    expect(deviceHandler.mock.calls[0][0]).toBeInstanceOf(Cam);
    expect(deviceHandler.mock.calls[0][0].xaddrs).toEqual(onvif.xaddrs);
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), '<bad/>');

    Discovery.off('device', deviceHandler);
    Discovery.off('error', errorHandler);
  });
});
