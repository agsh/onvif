/**
 * Mocked unit tests for Discovery error paths (parse failures, bad SOAP, socket errors).
 * Integration tests live in discovery.test.ts without mocks.
 *
 * @jest-environment node
 */

import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import os from 'os';
import { Discovery, Onvif, OnvifResponseError, parseSOAPString } from '../src';

const WS_DISCOVERY_IPV4 = '239.255.255.250';
const WS_DISCOVERY_IPV6 = 'FF02::C';
const WS_DISCOVERY_PORT = 3702;

jest.mock('dgram', () => {
  const actual = jest.requireActual<typeof import('dgram')>('dgram');
  return {
    ...actual,
    createSocket: jest.fn(),
  };
});

jest.mock('../src/utils', () => {
  const actual = jest.requireActual<typeof import('../src/utils')>('../src/utils');
  return {
    ...actual,
    parseSOAPString: jest.fn(),
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
    probeMatches: {
      probeMatch: {
        endpointReference: { address: 'urn:uuid:cam-1' },
        XAddrs: 'http://192.168.1.10/onvif/device_service',
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

    const probePromise = Discovery.probe({ timeout: 25 });

    getMessageListener()(Buffer.from('not-xml'), { address: '192.168.1.10', family: 'IPv4', port: 3702, size: 0 });

    await jest.advanceTimersByTimeAsync(50);
    await expect(probePromise).resolves.toEqual([]);
    expect(onError).toHaveBeenCalledWith(parseErr, undefined);
  });

  it('resolves empty and emits when the SOAP body has no probeMatches', async () => {
    mockedParseSOAPString.mockResolvedValue([{ hello: 'world' }, '<empty/>']);
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout: 25 });

    getMessageListener()(Buffer.from('<soap/>'), { address: '192.168.1.10', family: 'IPv4', port: 3702, size: 0 });

    await jest.advanceTimersByTimeAsync(25);
    await expect(probePromise).resolves.toEqual([]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'OnvifResponseError',
        message: expect.stringContaining('Wrong SOAP message'),
        xml: '<empty/>',
      }),
      '<empty/>',
    );
    expect(onError.mock.calls[0][0]).toBeInstanceOf(OnvifResponseError);
  });

  it('emits OnvifResponseError when probeMatches is missing', async () => {
    mockedParseSOAPString.mockResolvedValue([{ foo: 1 }, '<bad/>']);
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout: 20 });

    await getMessageListener()(Buffer.from('<soap/>'), { address: '10.0.0.1', family: 'IPv4', port: 3702, size: 0 });
    await jest.advanceTimersByTimeAsync(20);

    await expect(probePromise).resolves.toEqual([]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Wrong SOAP message from 10.0.0.1:3702',
        xml: '<bad/>',
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

    const probePromise = Discovery.probe({ timeout: 30 });
    const onMock = jest.mocked(mockSocket.on);
    const errorHandler = onMock.mock.calls.find((call) => call[0] === 'error')?.[1] as (e: Error) => void;
    expect(errorHandler).toBeDefined();
    errorHandler(sockErr);

    await getMessageListener()(Buffer.from('<soap/>'), {
      address: '192.168.1.10',
      family: 'IPv4',
      port: 3702,
      size: 0,
    });
    await jest.advanceTimersByTimeAsync(30);

    const cams = await probePromise;
    expect(cams).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(sockErr);
  });

  it('resolves empty when only socket errors occur', async () => {
    const sockErr = new Error('socket failure');
    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout: 30 });
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
    mockedParseSOAPString.mockResolvedValueOnce([validProbeBody, '<ok/>']).mockRejectedValueOnce(parseErr);

    const onError = jest.fn();
    Discovery.once('error', onError);

    const probePromise = Discovery.probe({ timeout: 40 });

    const listener = getMessageListener();
    const rinfo = { address: '192.168.1.10', family: 'IPv4' as const, port: 3702, size: 0 };
    await listener(Buffer.from('one'), rinfo);
    await listener(Buffer.from('two'), rinfo);

    await jest.advanceTimersByTimeAsync(40);

    const cams = await probePromise;
    expect(cams).toHaveLength(1);
    expect((cams[0] as { urn?: string }).urn).toBe('urn:uuid:cam-1');
    expect(onError).toHaveBeenCalledWith(parseErr, undefined);
  });

  describe('defaultMedia from ProbeMatch scopes', () => {
    const matchingXml =
      '<s:Envelope><s:Header><wsa:RelatesTo>urn:uuid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</wsa:RelatesTo></s:Header></s:Envelope>';

    async function probeOne(probeMatch: Record<string, unknown>): Promise<Onvif> {
      mockedParseSOAPString.mockResolvedValue([
        {
          probeMatches: {
            probeMatch: {
              endpointReference: { address: `urn:uuid:${Math.random().toString(16).slice(2)}` },
              XAddrs: 'http://192.168.1.10/onvif/device_service',
              ...probeMatch,
            },
          },
        },
        matchingXml,
      ]);
      const probePromise = Discovery.probe({
        timeout: 25,
        messageId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      });
      await getMessageListener()(Buffer.from('<soap/>'), {
        address: '192.168.1.10',
        family: 'IPv4',
        port: 3702,
        size: 0,
      });
      await jest.advanceTimersByTimeAsync(25);
      const cams = await probePromise;
      expect(cams).toHaveLength(1);
      expect(cams[0]).toBeInstanceOf(Onvif);
      return cams[0] as Onvif;
    }

    it('sets defaultMedia false for Profile C without video scopes', async () => {
      const cam = await probeOne({ scopes: 'onvif://www.onvif.org/Profile/C onvif://www.onvif.org/name/Door' });
      expect(cam.defaultMedia).toBe(false);
    });

    it('sets defaultMedia true for Profile C + Streaming (video doorbell)', async () => {
      const cam = await probeOne({
        scopes: 'onvif://www.onvif.org/Profile/C onvif://www.onvif.org/Profile/Streaming',
      });
      expect(cam.defaultMedia).toBe(true);
    });

    it('sets defaultMedia true when scopes omit access profiles', async () => {
      const cam = await probeOne({
        scopes: 'onvif://www.onvif.org/Profile/T',
        types: 'tds:Device dn:NetworkVideoTransmitter',
      });
      expect(cam.defaultMedia).toBe(true);
    });
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
      await getMessageListener()(Buffer.from('<soap/>'), {
        address: '192.168.1.10',
        family: 'IPv4',
        port: 3702,
        size: 0,
      });
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
      await getMessageListener()(Buffer.from('<soap/>'), {
        address: '192.168.1.10',
        family: 'IPv4',
        port: 3702,
        size: 0,
      });
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
      await getMessageListener()(Buffer.from('<soap/>'), {
        address: '192.168.1.10',
        family: 'IPv4',
        port: 3702,
        size: 0,
      });
      await jest.advanceTimersByTimeAsync(25);

      await expect(probePromise).resolves.toHaveLength(1);
    });

    it('treats RelatesTo without urn:uuid: prefix as matching', async () => {
      const bareXml =
        '<s:Envelope><s:Header><RelatesTo>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</RelatesTo></s:Header></s:Envelope>';
      mockedParseSOAPString.mockResolvedValue([validProbeBody, bareXml]);
      const probePromise = Discovery.probe({ timeout: 25, messageId });
      await getMessageListener()(Buffer.from('<soap/>'), {
        address: '192.168.1.10',
        family: 'IPv4',
        port: 3702,
        size: 0,
      });
      await jest.advanceTimersByTimeAsync(25);

      await expect(probePromise).resolves.toHaveLength(1);
    });
  });

  it('os.networkInterfaces is used when device option is set (bind path)', async () => {
    const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
      eth0: [
        {
          address: '172.16.0.5',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: '00:00:00:00:00:00',
          internal: false,
          cidr: '172.16.0.5/24',
        },
      ],
    });

    const probePromise = Discovery.probe({ timeout: 10, device: 'eth0', listeningPort: 5353 });
    await jest.advanceTimersByTimeAsync(10);
    await probePromise;

    expect(mockSocket.bind).toHaveBeenCalledWith(5353, '172.16.0.5');
    niSpy.mockRestore();
  });

  describe('probe destination address/port', () => {
    const iface = {
      eth0: [
        {
          address: '172.16.0.5',
          netmask: '255.255.255.0',
          family: 'IPv4' as const,
          mac: '00:00:00:00:00:00',
          internal: false,
          cidr: '172.16.0.5/24',
        },
      ],
    };

    beforeEach(() => {
      mockSocket.bind.mockImplementation(() => {
        mockSocket.emit('listening');
        return mockSocket as unknown as dgram.Socket;
      });
    });

    it('sends to WS-Discovery IPv4 multicast:3702 by default', async () => {
      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue(iface);
      const probePromise = Discovery.probe({ timeout: 10, device: 'eth0' });
      await jest.advanceTimersByTimeAsync(10);
      await probePromise;

      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        WS_DISCOVERY_PORT,
        WS_DISCOVERY_IPV4,
      );
      niSpy.mockRestore();
    });

    it('honors options.address and options.port for directed Probe', async () => {
      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue(iface);
      const probePromise = Discovery.probe({
        timeout: 10,
        device: 'eth0',
        address: '192.168.1.50',
        port: 3703,
      });
      await jest.advanceTimersByTimeAsync(10);
      await probePromise;

      expect(mockSocket.send).toHaveBeenCalledWith(expect.any(Buffer), 0, expect.any(Number), 3703, '192.168.1.50');
      niSpy.mockRestore();
    });

    it('exposes WS-Discovery destination defaults (incl. IPv6 FF02::C)', () => {
      expect(WS_DISCOVERY_IPV4).toBe('239.255.255.250');
      expect(WS_DISCOVERY_IPV6).toBe('FF02::C');
      expect(WS_DISCOVERY_PORT).toBe(3702);
    });

    it('type udp6 probes from link-local (zone bind) to FF02::C and skips ::1', async () => {
      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        eth0: [
          {
            address: '192.168.1.10',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:11:22:33:44:55',
            internal: false,
            cidr: '192.168.1.10/24',
          },
          {
            address: 'fe80::1',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:11:22:33:44:55',
            internal: false,
            cidr: 'fe80::1/64',
            scopeid: 2,
          },
          {
            address: '::1',
            netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
            family: 'IPv6',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: '::1/128',
            scopeid: 0,
          },
        ],
      });

      const probePromise = Discovery.probe({ timeout: 10, device: 'eth0', type: 'udp6' });
      await jest.advanceTimersByTimeAsync(10);
      await probePromise;

      expect(mockedCreateSocket).toHaveBeenCalledWith({ type: 'udp6', reuseAddr: true });
      expect(mockSocket.bind).toHaveBeenCalledWith(undefined, 'fe80::1%eth0');
      expect(mockSocket.bind).not.toHaveBeenCalledWith(undefined, '::1');
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        WS_DISCOVERY_PORT,
        WS_DISCOVERY_IPV6,
      );
      niSpy.mockRestore();
    });

    it('type udp6 on Windows binds link-local with numeric scopeid zone', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        Ethernet: [
          {
            address: 'fe80::1',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:11:22:33:44:55',
            internal: false,
            cidr: 'fe80::1/64',
            scopeid: 12,
          },
        ],
      });

      try {
        const probePromise = Discovery.probe({ timeout: 10, device: 'Ethernet', type: 'udp6' });
        await jest.advanceTimersByTimeAsync(10);
        await probePromise;

        expect(mockSocket.bind).toHaveBeenCalledWith(undefined, 'fe80::1%12');
        expect(mockSocket.bind).not.toHaveBeenCalledWith(undefined, 'fe80::1%Ethernet');
      } finally {
        niSpy.mockRestore();
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      }
    });

    it('type udp4 does not open udp6 sockets even when IPv6 addresses exist', async () => {
      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        eth0: [
          {
            address: '172.16.0.5',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: false,
            cidr: '172.16.0.5/24',
          },
          {
            address: 'fe80::abcd',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:00:00:00:00:00',
            internal: false,
            cidr: 'fe80::abcd/64',
            scopeid: 2,
          },
        ],
      });

      const probePromise = Discovery.probe({ timeout: 10, device: 'eth0', type: 'udp4' });
      await jest.advanceTimersByTimeAsync(10);
      await probePromise;

      expect(mockedCreateSocket).toHaveBeenCalledWith({ type: 'udp4', reuseAddr: true });
      expect(mockedCreateSocket).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'udp6' }));
      expect(mockSocket.bind).toHaveBeenCalledWith(undefined, '172.16.0.5');
      niSpy.mockRestore();
    });
  });

  describe('sendList edge cases', () => {
    function listeningSocket(): MockDgramSocket {
      const socket = new MockDgramSocket();
      socket.bind.mockImplementation(() => {
        socket.emit('listening');
        return socket as unknown as dgram.Socket;
      });
      return socket;
    }

    it('empty sendList resolves [] without opening sockets', async () => {
      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        lo: [
          {
            address: '::1',
            netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
            family: 'IPv6',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: '::1/128',
            scopeid: 0,
          },
        ],
        eth0: [
          {
            address: 'fe80::1',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:11:22:33:44:55',
            internal: false,
            cidr: 'fe80::1/64',
            scopeid: 2,
          },
        ],
      });

      // udp4 + only IPv6 on NICs → empty sendList; unknown device → also empty
      const emptyFamily = Discovery.probe({ timeout: 10, type: 'udp4' });
      await jest.advanceTimersByTimeAsync(10);
      await expect(emptyFamily).resolves.toEqual([]);
      expect(mockedCreateSocket).not.toHaveBeenCalled();

      mockedCreateSocket.mockClear();
      const missingDevice = Discovery.probe({ timeout: 10, device: 'no-such-nic' });
      await jest.advanceTimersByTimeAsync(10);
      await expect(missingDevice).resolves.toEqual([]);
      expect(mockedCreateSocket).not.toHaveBeenCalled();

      niSpy.mockRestore();
    });

    it('probes from every address on every NIC (multi-homed)', async () => {
      const sockEth = listeningSocket();
      const sockWlan = listeningSocket();
      const sockV6 = listeningSocket();
      mockedCreateSocket
        .mockReturnValueOnce(sockEth as unknown as dgram.Socket)
        .mockReturnValueOnce(sockWlan as unknown as dgram.Socket)
        .mockReturnValueOnce(sockV6 as unknown as dgram.Socket);

      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        eth0: [
          {
            address: '192.168.1.10',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:11:22:33:44:55',
            internal: false,
            cidr: '192.168.1.10/24',
          },
        ],
        wlan0: [
          {
            address: '10.0.0.5',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: 'aa:bb:cc:dd:ee:ff',
            internal: false,
            cidr: '10.0.0.5/24',
          },
          {
            address: 'fe80::abcd',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: 'aa:bb:cc:dd:ee:ff',
            internal: false,
            cidr: 'fe80::abcd/64',
            scopeid: 3,
          },
        ],
      });

      const probePromise = Discovery.probe({ timeout: 10 });
      await jest.advanceTimersByTimeAsync(10);
      await expect(probePromise).resolves.toEqual([]);

      expect(mockedCreateSocket).toHaveBeenCalledTimes(3);
      expect(mockedCreateSocket).toHaveBeenNthCalledWith(1, { type: 'udp4', reuseAddr: true });
      expect(mockedCreateSocket).toHaveBeenNthCalledWith(2, { type: 'udp4', reuseAddr: true });
      expect(mockedCreateSocket).toHaveBeenNthCalledWith(3, { type: 'udp6', reuseAddr: true });

      expect(sockEth.bind).toHaveBeenCalledWith(undefined, '192.168.1.10');
      expect(sockWlan.bind).toHaveBeenCalledWith(undefined, '10.0.0.5');
      expect(sockV6.bind).toHaveBeenCalledWith(undefined, 'fe80::abcd%wlan0');

      expect(sockEth.send).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        WS_DISCOVERY_PORT,
        WS_DISCOVERY_IPV4,
      );
      expect(sockWlan.send).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        WS_DISCOVERY_PORT,
        WS_DISCOVERY_IPV4,
      );
      expect(sockV6.send).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        WS_DISCOVERY_PORT,
        WS_DISCOVERY_IPV6,
      );

      niSpy.mockRestore();
    });

    it('directed unicast Probe sends to options.address:port from each local NIC', async () => {
      const sockA = listeningSocket();
      const sockB = listeningSocket();
      mockedCreateSocket
        .mockReturnValueOnce(sockA as unknown as dgram.Socket)
        .mockReturnValueOnce(sockB as unknown as dgram.Socket);

      const niSpy = jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        eth0: [
          {
            address: '192.168.1.10',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:11:22:33:44:55',
            internal: false,
            cidr: '192.168.1.10/24',
          },
        ],
        eth1: [
          {
            address: '192.168.2.10',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:11:22:33:44:66',
            internal: false,
            cidr: '192.168.2.10/24',
          },
        ],
      });

      const probePromise = Discovery.probe({
        timeout: 10,
        address: '192.168.1.50',
        port: 3703,
        type: 'udp4',
      });
      await jest.advanceTimersByTimeAsync(10);
      await probePromise;

      expect(sockA.bind).toHaveBeenCalledWith(undefined, '192.168.1.10');
      expect(sockB.bind).toHaveBeenCalledWith(undefined, '192.168.2.10');
      expect(sockA.send).toHaveBeenCalledWith(expect.any(Buffer), 0, expect.any(Number), 3703, '192.168.1.50');
      expect(sockB.send).toHaveBeenCalledWith(expect.any(Buffer), 0, expect.any(Number), 3703, '192.168.1.50');
      expect(sockA.send).not.toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        WS_DISCOVERY_PORT,
        WS_DISCOVERY_IPV4,
      );

      niSpy.mockRestore();
    });
  });
});
