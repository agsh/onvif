/**
 * @jest-environment node
 */

import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import os from 'os';
import { Discovery } from '../src/discovery';
import { Onvif } from '../src/onvif';
import { parseSOAPString } from '../src/utils';

jest.mock('dgram', () => {
  const actual = jest.requireActual<typeof import('dgram')>('dgram');
  return {
    ...actual,
    createSocket : jest.fn(),
  };
});

jest.mock('../src/utils', () => {
  const actual = jest.requireActual<typeof import('../src/utils')>('../src/utils');
  return {
    ...actual,
    parseSOAPString : jest.fn(),
  };
});

const mockedParseSOAPString = jest.mocked(parseSOAPString);
const mockedCreateSocket = jest.mocked(dgram.createSocket);

class MockDgramSocket extends EventEmitter {
  send = jest.fn();
  bind = jest.fn();
  close = jest.fn();
}

describe('Discovery', () => {
  let mockSocket: MockDgramSocket;
  /** Avoid unhandled `error` events when Discovery emits without a per-test listener. */
  const swallowDiscoveryErrors = jest.fn();

  const validProbeBody = {
    probeMatches : {
      probeMatch : {
        endpointReference : { address : 'urn:uuid:cam-1' },
        XAddrs            : 'http://192.168.1.10/onvif/device_service',
      },
    },
  };

  function getMessageListener(): (msg: Buffer, rinfo: dgram.RemoteInfo) => void {
    const onMock = jest.mocked(mockSocket.on);
    const calls = onMock.mock.calls.filter((call) => call[0] === 'message');
    const last = calls[calls.length - 1];
    expect(last).toBeDefined();
    return last[1] as (msg: Buffer, rinfo: dgram.RemoteInfo) => void;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    mockSocket = new MockDgramSocket();
    jest.spyOn(mockSocket, 'on');
    jest.spyOn(mockSocket, 'removeListener');
    mockedCreateSocket.mockReturnValue(mockSocket as unknown as dgram.Socket);
    mockedCreateSocket.mockClear();
    mockedParseSOAPString.mockReset();
    Discovery.on('error', swallowDiscoveryErrors);
  });

  afterEach(() => {
    Discovery.off('error', swallowDiscoveryErrors);
    swallowDiscoveryErrors.mockClear();
    jest.useRealTimers();
  });

  it('sends a WS-Discovery Probe to the multicast address and closes the socket after timeout', async () => {
    mockedParseSOAPString.mockResolvedValue([validProbeBody, '<xml/>']);
    const probePromise = Discovery.probe({ timeout : 50 });

    const listener = getMessageListener();
    await listener(Buffer.from('<soap/>'), { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 });

    await jest.advanceTimersByTimeAsync(50);
    await probePromise;

    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.any(Buffer),
      0,
      expect.any(Number),
      3702,
      '239.255.255.250',
    );
    expect(mockSocket.close).toHaveBeenCalled();
    expect(mockSocket.removeListener).toHaveBeenCalledWith('message', listener);
  });

  it('resolves with an empty array when no devices respond', async () => {
    const probePromise = Discovery.probe({ timeout : 30 });
    await jest.advanceTimersByTimeAsync(30);
    await expect(probePromise).resolves.toEqual([]);
    expect(mockedParseSOAPString).not.toHaveBeenCalled();
  });

  it('resolves with Onvif instances when resolve is true (default)', async () => {
    mockedParseSOAPString.mockResolvedValue([validProbeBody, '<xml/>']);
    const probePromise = Discovery.probe({ timeout : 40 });

    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(40);
    const cams = await probePromise;

    expect(cams).toHaveLength(1);
    expect(cams[0]).toBeInstanceOf(Onvif);
    const cam = cams[0] as Onvif;
    expect(cam.hostname).toBe('192.168.1.10');
    expect(cam.path).toBe('/onvif/device_service');
    expect(cam.urn).toBe('urn:uuid:cam-1');
  });

  it('picks the XAddr whose hostname matches the responder address when several are present', async () => {
    const body = {
      probeMatches : {
        probeMatch : {
          endpointReference : { address : 'urn:uuid:multi' },
          XAddrs            : 'http://192.168.1.1/onvif/device_service http://10.0.0.7/onvif/device_service',
        },
      },
    };
    mockedParseSOAPString.mockResolvedValue([body, '<xml/>']);
    const probePromise = Discovery.probe({ timeout : 40 });

    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '10.0.0.7', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(40);
    const [cam] = (await probePromise) as Onvif[];

    expect(cam.hostname).toBe('10.0.0.7');
  });

  it('resolves with raw parsed body when resolve is false', async () => {
    mockedParseSOAPString.mockResolvedValue([validProbeBody, '<xml/>']);
    const probePromise = Discovery.probe({ timeout : 40, resolve : false });

    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(40);
    const cams = await probePromise;

    expect(cams).toHaveLength(1);
    expect(cams[0]).not.toBeInstanceOf(Onvif);
    expect(cams[0]).toEqual(expect.objectContaining({ probeMatches : validProbeBody.probeMatches }));
  });

  it('deduplicates devices by endpoint reference address', async () => {
    mockedParseSOAPString.mockResolvedValue([validProbeBody, '<xml/>']);
    const probePromise = Discovery.probe({ timeout : 40 });
    const listener = getMessageListener();
    const rinfoA = { address : '192.168.1.10', family : 'IPv4' as const, port : 3702, size : 0 };
    const rinfoB = { address : '192.168.1.11', family : 'IPv4' as const, port : 3702, size : 0 };

    await listener(Buffer.from('1'), rinfoA);
    await listener(Buffer.from('2'), rinfoB);

    await jest.advanceTimersByTimeAsync(40);
    const cams = await probePromise;
    expect(cams).toHaveLength(1);
  });

  it('emits device when a new camera is discovered', async () => {
    mockedParseSOAPString.mockResolvedValue([validProbeBody, '<xml/>']);
    const onDevice = jest.fn();
    Discovery.once('device', onDevice);

    const probePromise = Discovery.probe({ timeout : 40 });
    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );
    await jest.advanceTimersByTimeAsync(40);
    await probePromise;

    expect(onDevice).toHaveBeenCalledTimes(1);
    expect(onDevice.mock.calls[0][0]).toBeInstanceOf(Onvif);
    expect(onDevice.mock.calls[0][1]).toMatchObject({ address : '192.168.1.10' });
    expect(onDevice.mock.calls[0][2]).toBe('<xml/>');
  });

  it('rejects when SOAP parsing fails', async () => {
    const parseErr = new Error('bad xml');
    mockedParseSOAPString.mockRejectedValue(parseErr);
    const probePromise = Discovery.probe({ timeout : 25 });
    // Subscribe before timers so `probePromise` is never briefly unhandled (fake timers + reject).
    // eslint-disable-next-line jest/valid-expect -- assertion completed via `await rejectsAssertion` below
    const rejectsAssertion = expect(probePromise).rejects.toEqual([parseErr]);

    await getMessageListener()(
      Buffer.from('not-xml'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(25);
    await rejectsAssertion;
  });

  it('rejects when the message has no probeMatches', async () => {
    mockedParseSOAPString.mockResolvedValue([{ hello : 'world' }, '<empty/>']);
    const probePromise = Discovery.probe({ timeout : 25 });
    // eslint-disable-next-line jest/valid-expect -- assertion completed via `await rejectsAssertion` below
    const rejectsAssertion = expect(probePromise).rejects.toMatchObject([
      expect.objectContaining({
        name    : 'OnvifError',
        message : expect.stringContaining('Wrong SOAP message'),
      }),
    ]);

    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(25);
    await rejectsAssertion;
  });

  it('emits error with a string when probeMatches is missing', async () => {
    mockedParseSOAPString.mockResolvedValue([{ foo : 1 }, '<bad/>']);
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 20 });
    // eslint-disable-next-line jest/valid-expect -- assertion completed via `await rejectsAssertion` below
    const rejectsAssertion = expect(probePromise).rejects.toBeDefined();

    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '10.0.0.1', family : 'IPv4', port : 3702, size : 0 },
    );
    await jest.advanceTimersByTimeAsync(20);
    await rejectsAssertion;

    expect(onError).toHaveBeenCalledWith(
      'Wrong SOAP message from 10.0.0.1:3702',
      '<bad/>',
    );
  });

  it('forwards socket errors on the Discovery emitter', async () => {
    mockedParseSOAPString.mockResolvedValue([validProbeBody, '<xml/>']);
    const sockErr = new Error('socket failure');
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 30 });
    const onMock = jest.mocked(mockSocket.on);
    const errorHandler = onMock.mock.calls.find((call) => call[0] === 'error')?.[1] as (e: Error) => void;
    expect(errorHandler).toBeDefined();
    errorHandler(sockErr);

    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );
    await jest.advanceTimersByTimeAsync(30);
    await probePromise;

    expect(onError).toHaveBeenCalledWith(sockErr);
  });

  it('uses options.messageId in the outbound Probe envelope', async () => {
    const probePromise = Discovery.probe({ timeout : 10, messageId : 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' });
    await jest.advanceTimersByTimeAsync(10);
    await probePromise;

    const [buf] = mockSocket.send.mock.calls[0] as [Buffer];
    expect(buf.toString()).toContain('urn:uuid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('passes socket type udp6 to createSocket when requested', async () => {
    const probePromise = Discovery.probe({ timeout : 10, type : 'udp6' });
    await jest.advanceTimersByTimeAsync(10);
    await probePromise;

    expect(mockedCreateSocket).toHaveBeenCalledWith('udp6');
  });

  it('binds to the IPv4 address of the named interface when device is set', async () => {
    const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
      eth0 : [
        { address : '172.16.0.5', netmask : '255.255.255.0', family : 'IPv4', mac : '00:00:00:00:00:00', internal : false, cidr : '172.16.0.5/24' },
      ],
    });

    const probePromise = Discovery.probe({ timeout : 10, device : 'eth0', listeningPort : 5353 });
    await jest.advanceTimersByTimeAsync(10);
    await probePromise;

    expect(mockSocket.bind).toHaveBeenCalledWith(5353, '172.16.0.5');
    niSpy.mockRestore();
  });
});
