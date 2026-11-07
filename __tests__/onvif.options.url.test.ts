import { Onvif, OnvifValidationError } from '../src';

describe('OnvifOptions.url', () => {
  it('fills hostname/port/path/useSecure from http url', () => {
    const onvif = new Onvif({
      url: 'http://192.168.1.13:8000/onvif/device_service',
      autoConnect: false,
    });
    expect(onvif.hostname).toBe('192.168.1.13');
    expect(onvif.port).toBe(8000);
    expect(onvif.path).toBe('/onvif/device_service');
    expect(onvif.useSecure).toBe(false);
  });

  it('defaults https port and path when omitted', () => {
    const onvif = new Onvif({
      url: 'https://cam.example',
      autoConnect: false,
    });
    expect(onvif.hostname).toBe('cam.example');
    expect(onvif.port).toBe(443);
    expect(onvif.path).toBe('/onvif/device_service');
    expect(onvif.useSecure).toBe(true);
  });

  it('accepts URL instance', () => {
    const onvif = new Onvif({
      url: new URL('http://127.0.0.1/custom'),
      autoConnect: false,
    });
    expect(onvif.port).toBe(80);
    expect(onvif.path).toBe('/custom');
  });

  it('rejects credentials in url', () => {
    expect(
      () =>
        new Onvif({
          url: 'http://admin:secret@192.168.1.1/onvif/device_service',
          autoConnect: false,
        }),
    ).toThrow(OnvifValidationError);
  });

  it('rejects url and hostname together', () => {
    expect(
      () =>
        new Onvif({
          url: 'http://192.168.1.1/onvif/device_service',
          hostname: '192.168.1.1',
          autoConnect: false,
        }),
    ).toThrow(/url.*hostname/i);
  });

  it('requires url or hostname', () => {
    expect(() => new Onvif({ autoConnect: false } as never)).toThrow(/hostname|url/i);
  });
});
