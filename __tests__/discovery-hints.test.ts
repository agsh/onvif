import {
  defaultMediaOnConnect,
  isAccessControlOnlyDevice,
  splitDiscoveryList,
} from '../src/utils/discovery-hints';

describe('splitDiscoveryList', () => {
  it('splits space-separated ProbeMatch strings', () => {
    expect(splitDiscoveryList('onvif://www.onvif.org/Profile/C onvif://www.onvif.org/name/Door')).toEqual([
      'onvif://www.onvif.org/Profile/C',
      'onvif://www.onvif.org/name/Door',
    ]);
  });

  it('flattens arrays', () => {
    expect(splitDiscoveryList(['tds:Device', 'dn:NetworkVideoTransmitter'])).toEqual([
      'tds:Device',
      'dn:NetworkVideoTransmitter',
    ]);
  });
});

describe('defaultMediaOnConnect from device-advertised scopes', () => {
  it('skips media for Profile C door station without video scopes', () => {
    const scopes = ['onvif://www.onvif.org/Profile/C', 'onvif://www.onvif.org/name/FrontDoor'];
    expect(isAccessControlOnlyDevice(scopes)).toBe(true);
    expect(defaultMediaOnConnect(scopes)).toBe(false);
  });

  it('skips media for Profile A without video', () => {
    expect(defaultMediaOnConnect(['onvif://www.onvif.org/Profile/A'])).toBe(false);
  });

  it('skips media for Profile D peripheral without video', () => {
    const scopes = ['onvif://www.onvif.org/Profile/D', 'onvif://www.onvif.org/name/Reader'];
    expect(isAccessControlOnlyDevice(scopes)).toBe(true);
    expect(defaultMediaOnConnect(scopes)).toBe(false);
  });

  it('keeps media for video doorbell (Profile C + Streaming)', () => {
    expect(
      defaultMediaOnConnect([
        'onvif://www.onvif.org/Profile/C',
        'onvif://www.onvif.org/Profile/Streaming',
      ]),
    ).toBe(true);
  });

  it('keeps media for Profile T / NVT types', () => {
    expect(defaultMediaOnConnect(['onvif://www.onvif.org/Profile/T'])).toBe(true);
    expect(defaultMediaOnConnect([], ['tds:Device', 'dn:NetworkVideoTransmitter'])).toBe(true);
  });

  it('keeps media when scopes empty (manual Onvif — assume camera)', () => {
    expect(defaultMediaOnConnect()).toBe(true);
    expect(defaultMediaOnConnect([])).toBe(true);
  });
});
