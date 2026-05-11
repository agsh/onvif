/**
 * Mocked unit tests for Discovery error paths (parse failures, bad SOAP, socket errors).
 * Integration tests live in discovery.test.ts without mocks.
 *
 * @jest-environment node
 */

import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import os from 'os';
import { Discovery, parseSOAPString } from '../src';

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
    swallowDiscoveryErrors.mockClear();
    jest.useRealTimers();
  });

  it('rejects when SOAP parsing fails', async () => {
    const parseErr = new Error('bad xml');
    mockedParseSOAPString.mockRejectedValue(parseErr);
    const probePromise = Discovery.probe({ timeout : 25 });
    // eslint-disable-next-line jest/valid-expect -- handler attached before timers (see comment below)
    const rejectsAssertion = expect(probePromise).rejects.toEqual([parseErr]);

    getMessageListener()(
      Buffer.from('not-xml'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(25);
    await rejectsAssertion;
  });

  it('rejects when the SOAP body has no probeMatches', async () => {
    mockedParseSOAPString.mockResolvedValue([{ hello : 'world' }, '<empty/>']);
    const probePromise = Discovery.probe({ timeout : 25 });
    // eslint-disable-next-line jest/valid-expect
    const rejectsAssertion = expect(probePromise).rejects.toMatchObject([
      expect.objectContaining({
        name    : 'OnvifError',
        message : expect.stringContaining('Wrong SOAP message'),
      }),
    ]);

    getMessageListener()(
      Buffer.from('<soap/>'),
      { address : '192.168.1.10', family : 'IPv4', port : 3702, size : 0 },
    );

    await jest.advanceTimersByTimeAsync(25);
    await rejectsAssertion;
  });

  it('emits error with a string detail when probeMatches is missing', async () => {
    mockedParseSOAPString.mockResolvedValue([{ foo : 1 }, '<bad/>']);
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout : 20 });
    // eslint-disable-next-line jest/valid-expect
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

  it('rejects the probe when any response fails parse even after a valid device', async () => {
    mockedParseSOAPString
      .mockResolvedValueOnce([validProbeBody, '<ok/>'])
      .mockRejectedValueOnce(new Error('second packet corrupt'));

    const probePromise = Discovery.probe({ timeout : 40 });
    // eslint-disable-next-line jest/valid-expect
    const rejectsAssertion = expect(probePromise).rejects.toEqual([
      expect.objectContaining({ message : 'second packet corrupt' }),
    ]);

    const listener = getMessageListener();
    const rinfo = { address : '192.168.1.10', family : 'IPv4' as const, port : 3702, size : 0 };
    await listener(Buffer.from('one'), rinfo);
    await listener(Buffer.from('two'), rinfo);

    await jest.advanceTimersByTimeAsync(40);
    await rejectsAssertion;
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
