import {
  config,
  itemList,
  multicastConfiguration,
  ptzVectorToBuild,
  streamSetupToBuild,
  stringListToBuild,
  xsany,
} from '../src/utils/toOnvifXMLSchemaObject';

describe('toOnvifXMLSchemaObject', () => {
  describe('itemList', () => {
    it('serializes simpleItem, elementItem with __any__, and extension', () => {
      expect(
        itemList({
          simpleItem: [{ name: 'A', value: '1' }],
          elementItem: [
            {
              name: 'E1',
              [xsany]: {
                Param: [{ Data: ['42'] }],
                $: { Extra: 'x' },
              },
            },
          ],
          extension: { vendor: true },
        }),
      ).toEqual({
        SimpleItem: [{ $: { Name: 'A', Value: '1' } }],
        ElementItem: [
          {
            Param: [{ Data: ['42'] }],
            $: { Name: 'E1', Extra: 'x' },
          },
        ],
        Extension: { vendor: true },
      });
    });

    it('handles elementItem without __any__', () => {
      expect(itemList({ elementItem: [{ name: 'OnlyName' }] })).toEqual({
        ElementItem: [{ $: { Name: 'OnlyName' } }],
      });
    });
  });

  describe('config', () => {
    it('wraps name, type and parameters', () => {
      expect(
        config({
          name: 'cfg',
          type: 'tt:Rule',
          parameters: { simpleItem: [{ name: 'S', value: 'v' }] },
        }),
      ).toEqual({
        $: { Name: 'cfg', Type: 'tt:Rule' },
        Parameters: {
          SimpleItem: [{ $: { Name: 'S', Value: 'v' } }],
        },
      });
    });
  });

  describe('multicastConfiguration', () => {
    it('serializes IPv4 and IPv6 addresses', () => {
      expect(
        multicastConfiguration({
          address: { type: 'IPv4', IPv4Address: '239.0.0.1', IPv6Address: 'ff02::1' },
          port: 4000,
          TTL: 5,
          autoStart: true,
        }),
      ).toEqual({
        Address: {
          Type: 'IPv4',
          IPv4Address: '239.0.0.1',
          IPv6Address: 'ff02::1',
        },
        Port: 4000,
        TTL: 5,
        AutoStart: true,
      });
    });
  });

  describe('streamSetupToBuild', () => {
    it('includes optional transport tunnel', () => {
      expect(
        streamSetupToBuild({
          stream: 'RTP-Unicast',
          transport: { protocol: 'RTSP', tunnel: { protocol: 'HTTP' } },
        }),
      ).toEqual({
        Stream: 'RTP-Unicast',
        Transport: {
          Protocol: 'RTSP',
          Tunnel: { Protocol: 'HTTP' },
        },
      });
    });

    it('omits tunnel when absent', () => {
      expect(
        streamSetupToBuild({
          stream: 'RTP-Multicast',
          transport: { protocol: 'UDP' },
        }),
      ).toEqual({
        Stream: 'RTP-Multicast',
        Transport: { Protocol: 'UDP' },
      });
    });
  });

  describe('ptzVectorToBuild', () => {
    it('serializes panTilt and zoom', () => {
      expect(ptzVectorToBuild({ panTilt: { x: 0.1, y: -0.2 }, zoom: { x: 0.5 } })).toEqual({
        PanTilt: { $: { x: 0.1, y: -0.2 } },
        Zoom: { $: { x: 0.5 } },
      });
    });

    it('omits missing axes', () => {
      expect(ptzVectorToBuild({ zoom: { x: 1 } })).toEqual({ Zoom: { $: { x: 1 } } });
      expect(ptzVectorToBuild({})).toEqual({});
    });
  });

  describe('stringListToBuild', () => {
    it('joins lists and returns undefined for empty input', () => {
      expect(stringListToBuild(['a', 'b'])).toBe('a b');
      expect(stringListToBuild([])).toBeUndefined();
      expect(stringListToBuild(undefined)).toBeUndefined();
    });
  });
});
