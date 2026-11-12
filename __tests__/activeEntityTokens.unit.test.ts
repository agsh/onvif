/**
 * active*Token defaults for AccessControl / Recording / DeviceIO omit-token DX.
 *
 * @jest-environment node
 */

import { Onvif } from '../src';
import {
  connectSteps,
  getActiveAccessPoint,
  getActiveRecording,
  getActiveRelayOutput,
  setActiveAccessPoint,
  setActiveRecording,
  setActiveRecordingJob,
  setActiveRelayOutput,
} from '../src/connection';
import AccessControl from '../src/accesscontrol';
import Recording from '../src/recording';
import DeviceIO from '../src/deviceio';
import Replay from '../src/replay';
import Search from '../src/search';

describe('activeAccessPointToken', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getActiveAccessPoint sets the first access point', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.accesscontrol = new URL('http://127.0.0.1/onvif/accesscontrol');
    jest.spyOn(onvif.accessControl, 'getAccessPointInfoList').mockResolvedValue({
      accessPointInfo: [{ token: 'AccessPointToken_1' } as never, { token: 'AccessPointToken_2' } as never],
    });

    await getActiveAccessPoint(onvif);
    expect(onvif.activeAccessPointToken).toBe('AccessPointToken_1');
  });

  it('omit-token AccessControl calls use activeAccessPointToken', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    setActiveAccessPoint(onvif, 'AccessPointToken_2');
    const ac = new AccessControl(onvif);
    const req = jest.spyOn(ac as any, 'request').mockResolvedValue({
      getAccessPointStateResponse: { accessPointState: { enabled: true } },
    });

    await ac.getAccessPointState();
    await ac.disableAccessPoint();

    expect(req.mock.calls.map((c) => c[0])).toEqual([
      { GetAccessPointState: { Token: 'AccessPointToken_2' } },
      { DisableAccessPoint: { Token: 'AccessPointToken_2' } },
    ]);
  });
});

describe('activeRecordingToken / activeRecordingJobToken', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getActiveRecording sets first recording and job tokens', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.recording = new URL('http://127.0.0.1/onvif/recording');
    jest.spyOn(onvif.recording, 'getRecordings').mockResolvedValue([
      { recordingToken: 'RecordingToken_1' } as never,
    ]);
    jest.spyOn(onvif.recording, 'getRecordingJobs').mockResolvedValue([
      { jobToken: 'JobToken_1' } as never,
    ]);

    await getActiveRecording(onvif);
    expect(onvif.activeRecordingToken).toBe('RecordingToken_1');
    expect(onvif.activeRecordingJobToken).toBe('JobToken_1');
  });

  it('Recording / Replay / Search omit-token calls use activeRecordingToken', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    setActiveRecording(onvif, 'RecordingToken_9');
    setActiveRecordingJob(onvif, 'JobToken_9');

    const recording = new Recording(onvif);
    const replay = new Replay(onvif);
    const search = new Search(onvif);

    const recordingReq = jest.spyOn(recording as any, 'request').mockResolvedValue({
      getRecordingConfigurationResponse: { recordingConfiguration: {} },
      getRecordingJobStateResponse: { state: {} },
    });
    const replayReq = jest.spyOn(replay as any, 'request').mockResolvedValue({
      getReplayUriResponse: { uri: 'rtsp://x' },
    });
    const searchReq = jest.spyOn(search as any, 'request').mockResolvedValue({
      getRecordingInformationResponse: { recordingInformation: {} },
    });

    await recording.getRecordingConfiguration();
    await recording.getRecordingJobState();
    await replay.getReplayUri({ protocol: 'RTSP' });
    await search.getRecordingInformation();

    expect(recordingReq.mock.calls.map((c) => c[0])).toEqual([
      { GetRecordingConfiguration: { RecordingToken: 'RecordingToken_9' } },
      { GetRecordingJobState: { JobToken: 'JobToken_9' } },
    ]);
    expect(replayReq.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        GetReplayUri: expect.objectContaining({ RecordingToken: 'RecordingToken_9' }),
      }),
    );
    expect(searchReq.mock.calls[0][0]).toEqual({
      GetRecordingInformation: { RecordingToken: 'RecordingToken_9' },
    });
  });
});

describe('activeRelayOutputToken', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getActiveRelayOutput sets the first relay', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    onvif.uri.deviceIO = new URL('http://127.0.0.1/onvif/deviceio');
    jest.spyOn(onvif.deviceIO, 'getRelayOutputs').mockResolvedValue([
      { token: 'RelayToken_1' } as never,
      { token: 'RelayToken_2' } as never,
    ]);

    await getActiveRelayOutput(onvif);
    expect(onvif.activeRelayOutputToken).toBe('RelayToken_1');
  });

  it('setRelayOutputState omit-token uses activeRelayOutputToken', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    setActiveRelayOutput(onvif, 'RelayToken_2');
    const io = new DeviceIO(onvif);
    const req = jest.spyOn(io as any, 'request').mockResolvedValue({});

    await io.setRelayOutputState({ logicalState: 'active' });

    expect(req.mock.calls[0][0]).toEqual({
      SetRelayOutputState: {
        RelayOutputToken: 'RelayToken_2',
        LogicalState: 'active',
      },
    });
  });

  it('getRelayOutputOptions without token does not force activeRelayOutputToken', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    setActiveRelayOutput(onvif, 'RelayToken_2');
    const io = new DeviceIO(onvif);
    const req = jest.spyOn(io as any, 'request').mockResolvedValue({
      getRelayOutputOptionsResponse: { relayOutputOptions: [] },
    });

    await io.getRelayOutputOptions();

    expect(req.mock.calls[0][0]).toEqual({ GetRelayOutputOptions: {} });
  });
});

describe('connect getActiveEntityTokens', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connect calls getActiveEntityTokens', async () => {
    const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
    jest.spyOn(onvif, 'getSystemDateAndTime').mockResolvedValue({} as never);
    jest.spyOn(connectSteps, 'getServices').mockResolvedValue([] as never);
    const spy = jest.spyOn(connectSteps, 'getActiveEntityTokens').mockResolvedValue(undefined);

    await onvif.connect({ media: false });
    expect(spy).toHaveBeenCalled();
  });
});
