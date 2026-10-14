/**
 * Mocked unit tests for Discovery error paths (parse failures, bad SOAP, socket errors).
 * Integration tests live in discovery.test.ts without mocks.
 *
 * @jest-environment node
 */

import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import os from 'os';
import { Discovery, OnvifResponseError, parseSOAPString } from '../src';

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

describe('Discovery error handling (mocked)', () => {
  let mockSocket: MockDgramSocket;
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
    Discovery.removeAllListeners();
    swallowDiscoveryErrors.mockClear();
    jest.useRealTimers();
  });

  it('resolves empty and emits when SOAP parsing fails', async () => {
    const parseErr = new Error('bad xml');
    mockedParseSOAPString.mockRejectedValue(parseErr);
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 25 });

    getMessageListener()(
      Buffer.from('not-xml'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(25);
    await expect(probePromise).resolves.toEqual([]);
    expect(onError).toHaveBeenCalledWith(parseErr, undefined);
  });

  it('resolves empty and emits when the SOAP body has no probeMatches', async () => {
    mockedParseSOAPString.mockResolvedValue([{ hello : 'world' }, '<empty/>']);
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 25 });

    getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(25);
    await expect(probePromise).resolves.toEqual([]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        name    : 'OnvifResponseError',
        message : expect.stringContaining('Wrong SOAP message'),
        xml     : '<empty/>',
      }),
      '<empty/>',
    );
    expect(onError.mock.calls[0][0]).toBeInstanceOf(OnvifResponseError);
  });

  it('emits OnvifResponseError when probeMatches is missing', async () => {
    mockedParseSOAPString.mockResolvedValue([{ foo : 1 }, '<bad/>']);
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 20 });

    await getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '10.0.0.1', family : 'IPv4', port : 3702, size : 0 },
    );
    await jest.advanceTimersByTimeAsync(20);

    await expect(probePromise).resolves.toEqual([]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message : 'Wrong SOAP message from 10.0.0.1:3702',
        xml     : '<bad/>',
      }),
      '<bad/>',
    );
    expect(onError.mock.calls[0][0]).toBeInstanceOf(OnvifResponseError);
  });

  it('emits socket errors but still resolves when a device was found', async () => {
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

    const cams = await probePromise;
    expect(cams).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(sockErr);
  });

  it('resolves empty when only socket errors occur', async () => {
    const sockErr = new Error('socket failure');
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 30 });
    const onMock = jest.mocked(mockSocket.on);
    const errorHandler = onMock.mock.calls.find((call) => call[0] === 'error')?.[1] as (e: Error) => void;
    expect(errorHandler).toBeDefined();
    errorHandler(sockErr);

    await jest.advanceTimersByTimeAsync(30);

    await expect(probePromise).resolves.toEqual([]);
    expect(onError).toHaveBeenCalledWith(sockErr);
  });

  it('keeps valid devices when another response fails parse', async () => {
    const parseErr = new Error('second packet corrupt');
    mockedParseSOAPString
      .mockResolvedValueOnce([validProbeBody, '<ok/>'])
      .mockRejectedValueOnce(parseErr);

    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 40 });

    const listener = getMessageListener();
    const rinfo = { address : '192.168.1.10', family : 'IPv4' as const, port : 3702, size : 0 };
    await listener(Buffer.from('one'), rinfo);
    await listener(Buffer.from('two'), rinfo);

    await jest.advanceTimersByTimeAsync(40);

    const cams = await probePromise;
    expect(cams).toHaveLength(1);
    expect((cams[0] as { urn?: string }).urn).toBe('urn:uuid:cam-1');
    expect(onError).toHaveBeenCalledWith(parseErr, undefined);
  });

  describe('RelatesTo / MessageID filtering', () => {
    const messageId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const matchingXml =
      '<s:Envelope><s:Header><wsa:RelatesTo>urn:uuid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</wsa:RelatesTo></s:Header></s:Envelope>';
    const foreignXml =
      '<s:Envelope><s:Header><wsa:RelatesTo>urn:uuid:00000000-0000-0000-0000-000000000000</wsa:RelatesTo></s:Header></s:Envelope>';

    it('accepts ProbeMatch when RelatesTo matches our Probe MessageID', async () => {
      mockedParseSOAPString.mockResolvedValue([validProbeBody, matchingXml]);
      const onDevice = jest.fn();
      Discovery.on('device', onDevice);

      const probePromise = Discovery.probe({ timeout: 25, messageId });
      await getMessageListener()(
        Buffer.from('<soap/>'),
        { address: '192.168.1.10', family: 'IPv4', port: 3702, size: 0 },
      );
      await jest.advanceTimersByTimeAsync(25);

      const cams = await probePromise;
      expect(cams).toHaveLength(1);
      expect(onDevice).toHaveBeenCalled();
      Discovery.off('device', onDevice);
    });

    it('ignores ProbeMatch meant for another Probe (mismatched RelatesTo)', async () => {
      mockedParseSOAPString.mockResolvedValue([validProbeBody, foreignXml]);
      const onDevice = jest.fn();
      const onError = jest.fn();
      Discovery.on('device', onDevice);
      Discovery.on('error', onError);

      const probePromise = Discovery.probe({ timeout: 25, messageId });
      await getMessageListener()(
        Buffer.from('<soap/>'),
        { address: '192.168.1.10', family: 'IPv4', port: 3702, size: 0 },
      );
      await jest.advanceTimersByTimeAsync(25);

      await expect(probePromise).resolves.toEqual([]);
      expect(onDevice).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      Discovery.off('device', onDevice);
      Discovery.off('error', onError);
    });

    it('accepts ProbeMatch with no RelatesTo (broken devices)', async () => {
      mockedParseSOAPString.mockResolvedValue([validProbeBody, '<s:Envelope><s:Body/></s:Envelope>']);
      const probePromise = Discovery.probe({ timeout: 25, messageId });
      await getMessageListener()(
        Buffer.from('<soap/>'),
        { address: '192.168.1.10', family: 'IPv4', port: 3702, size: 0 },
      );
      await jest.advanceTimersByTimeAsync(25);

      await expect(probePromise).resolves.toHaveLength(1);
    });

    it('treats RelatesTo without urn:uuid: prefix as matching', async () => {
      const bareXml =
        '<s:Envelope><s:Header><RelatesTo>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</RelatesTo></s:Header></s:Envelope>';
      mockedParseSOAPString.mockResolvedValue([validProbeBody, bareXml]);
      const probePromise = Discovery.probe({ timeout: 25, messageId });
      await getMessageListener()(
        Buffer.from('<soap/>'),
        { address: '192.168.1.10', family: 'IPv4', port: 3702, size: 0 },
      );
      await jest.advanceTimersByTimeAsync(25);

      await expect(probePromise).resolves.toHaveLength(1);
    });
  });

  it('os.networkInterfaces is used when device option is set (bind path)', async () => {
    const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
      eth0 : [
        {
          address  : '172.16.0.5',
          netmask  : '255.255.255.0',
          family   : 'IPv4',
          mac      : '00:00:00:00:00:00',
          internal : false,
          cidr     : '172.16.0.5/24',
        },
      ],
    });

    const probePromise = Discovery.probe({ timeout : 10, device : 'eth0', listeningPort : 5353 });
    await jest.advanceTimersByTimeAsync(10);
    await probePromise;

    expect(mockSocket.bind).toHaveBeenCalledWith(5353, '172.16.0.5');
    niSpy.mockRestore();
  });
});
