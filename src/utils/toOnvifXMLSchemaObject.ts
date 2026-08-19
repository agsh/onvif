/**
 * Helper functions for representing commonly used ONVIF types in XML format
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */

import { Config, ItemList, MulticastConfiguration } from '../interfaces/onvif';

export type XSAny = Record<string, any> | undefined;

export const xsany = '__any__';

export function itemList(itemList: ItemList) {
  return {
    ...(itemList.simpleItem && {
      SimpleItem: itemList.simpleItem.map((item) => ({
        $: { Name: item.name, Value: item.value },
      })),
    }),
    ...(itemList.elementItem && {
      ElementItem: itemList.elementItem.map((elementItem) => {
        const anyXml = (elementItem[xsany] ?? {}) as XSAny;
        return {
          ...anyXml,
          $: { Name: elementItem.name, ...anyXml?.$ },
        };
      }),
    }),
    ...(itemList.extension && { Extension: itemList.extension }),
  };
}

export function config(config: Config) {
  return {
    $: {
      Name: config.name,
      Type: config.type,
    },
    Parameters: itemList(config.parameters),
  };
}

export function multicastConfiguration(multicast: MulticastConfiguration) {
  return {
    Address: {
      Type: multicast.address.type,
      ...(multicast.address.IPv4Address && { IPv4Address: multicast.address.IPv4Address }),
      ...(multicast.address.IPv6Address && { IPv4Address: multicast.address.IPv6Address }),
    },
    Port: multicast.port,
    TTL: multicast.TTL,
    AutoStart: multicast.autoStart,
  };
}
