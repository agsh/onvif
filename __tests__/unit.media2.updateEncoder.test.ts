/**
 * Unit tests for Media2 updateVideoEncoderConfiguration sugar (mocked request).
 * @jest-environment node
 */

import { Onvif, OnvifValidationError } from '../src';
import Media2 from '../src/media2';
import type { VideoEncoder2Configuration } from '../src/interfaces/onvif';

describe('Media2.updateVideoEncoderConfiguration (mocked)', () => {
  const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });
  onvif.media2Support = true;

  function baseCfg(): VideoEncoder2Configuration {
    return {
      token: 'enc2',
      name: 'Main',
      useCount: 1,
      encoding: 'H264',
      resolution: { width: 1280, height: 720 },
      quality: 3,
      rateControl: { frameRateLimit: 30, bitrateLimit: 2048, constantBitRate: false },
      govLength: 60,
      profile: 'Main',
    };
  }

  it('merges patch, calls Set, and returns the merged config', async () => {
    const media2 = new Media2(onvif);
    const cfg = baseCfg();
    jest.spyOn(media2, 'getVideoEncoderConfigurations').mockResolvedValue([cfg]);
    const setSpy = jest.spyOn(media2, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    const merged = await media2.updateVideoEncoderConfiguration({
      configurationToken: 'enc2',
      bitrateLimit: 900,
      encoding: 'H265',
    });

    expect(merged.rateControl?.bitrateLimit).toBe(900);
    expect(merged.encoding).toBe('H265');
    expect(setSpy).toHaveBeenCalledWith(merged);
  });

  it('uses activeMediaProfile token when patch omits configurationToken', async () => {
    const media2 = new Media2(onvif);
    onvif.activeMediaProfile = {
      profileToken: 'p1',
      videoEncoderConfigurationToken: 'enc2',
    } as never;
    const cfg = baseCfg();
    const getSpy = jest.spyOn(media2, 'getVideoEncoderConfigurations').mockResolvedValue([cfg]);
    jest.spyOn(media2, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    await media2.updateVideoEncoderConfiguration({ quality: 1 });
    expect(getSpy).toHaveBeenCalledWith({ configurationToken: 'enc2' });
  });

  it('throws when token is missing and when Get returns an empty list', async () => {
    const media2 = new Media2(onvif);
    onvif.activeMediaProfile = undefined;
    await expect(media2.updateVideoEncoderConfiguration({ bitrateLimit: 1 })).rejects.toBeInstanceOf(
      OnvifValidationError,
    );

    onvif.activeMediaProfile = {
      profileToken: 'p1',
      videoEncoderConfigurationToken: 'missing',
    } as never;
    jest.spyOn(media2, 'getVideoEncoderConfigurations').mockResolvedValue([]);
    await expect(
      media2.updateVideoEncoderConfiguration({ configurationToken: 'missing', bitrateLimit: 1 }),
    ).rejects.toThrow(/not found/);
  });
});
