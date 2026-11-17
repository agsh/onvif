/**
 * Unit tests for Media2 updateVideoEncoderConfiguration sugar (mocked request).
 * @jest-environment node
 */

import { Onvif, OnvifValidationError } from '../src';
import Media2 from '../src/services/media2';
import type {
  VideoEncoder2Configuration,
  VideoEncoder2ConfigurationOptions,
} from '../src/interfaces/onvif';

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

  function optionsList(): VideoEncoder2ConfigurationOptions[] {
    return [
      {
        encoding: 'H264',
        qualityRange: { min: 1, max: 5 },
        govLengthRange: [1, 120],
        frameRatesSupported: [30, 25],
        profilesSupported: ['Main', 'High'],
        resolutionsAvailable: [{ width: 1280, height: 720 }],
        bitrateRange: { min: 64, max: 8192 },
      },
      {
        encoding: 'H265',
        qualityRange: { min: 1, max: 5 },
        govLengthRange: [1, 120],
        frameRatesSupported: [30, 25],
        profilesSupported: ['Main', 'High'],
        resolutionsAvailable: [
          { width: 1280, height: 720 },
          { width: 1920, height: 1080 },
        ],
        bitrateRange: { min: 64, max: 8192 },
      },
    ];
  }

  it('merges patch without options when encoding is unchanged', async () => {
    const media2 = new Media2(onvif);
    const cfg = baseCfg();
    jest.spyOn(media2, 'getVideoEncoderConfigurations').mockResolvedValue([cfg]);
    const optionsSpy = jest.spyOn(media2, 'getVideoEncoderConfigurationOptions');
    const setSpy = jest.spyOn(media2, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    const merged = await media2.updateVideoEncoderConfiguration({
      configurationToken: 'enc2',
      bitrateLimit: 900,
      encoding: 'H264',
    });

    expect(merged.rateControl?.bitrateLimit).toBe(900);
    expect(merged.encoding).toBe('H264');
    expect(optionsSpy).not.toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalledWith(merged);
  });

  it('fetches options and switches encoding when codec changes', async () => {
    const media2 = new Media2(onvif);
    onvif.activeMediaProfile = {
      profileToken: 'p1',
      videoEncoderConfigurationToken: 'enc2',
    } as never;
    const cfg = baseCfg();
    jest.spyOn(media2, 'getVideoEncoderConfigurations').mockResolvedValue([cfg]);
    const optionsSpy = jest
      .spyOn(media2, 'getVideoEncoderConfigurationOptions')
      .mockResolvedValue(optionsList());
    jest.spyOn(media2, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    const merged = await media2.updateVideoEncoderConfiguration({
      encoding: 'H265',
      profile: 'High',
      govLength: 45,
    });

    expect(optionsSpy).toHaveBeenCalledWith({
      configurationToken: 'enc2',
      profileToken: 'p1',
    });
    expect(merged.encoding).toBe('H265');
    expect(merged.profile).toBe('High');
    expect(merged.govLength).toBe(45);
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

  it('throws when target encoding is absent from options', async () => {
    const media2 = new Media2(onvif);
    jest.spyOn(media2, 'getVideoEncoderConfigurations').mockResolvedValue([baseCfg()]);
    jest.spyOn(media2, 'getVideoEncoderConfigurationOptions').mockResolvedValue([optionsList()[0]]);
    jest.spyOn(media2, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    await expect(
      media2.updateVideoEncoderConfiguration({
        configurationToken: 'enc2',
        encoding: 'H265',
      }),
    ).rejects.toThrow(/not reported/);
  });
});
