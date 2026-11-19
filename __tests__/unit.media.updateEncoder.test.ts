/**
 * Unit tests for Media1 updateVideoEncoderConfiguration sugar (mocked request).
 * @jest-environment node
 */

import { Onvif, OnvifValidationError } from '../src';
import Media from '../src/services/media';
import type {
  VideoEncoderConfiguration,
  VideoEncoderConfigurationOptions,
} from '../src/interfaces/onvif';

describe('Media.updateVideoEncoderConfiguration (mocked)', () => {
  const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });

  function baseCfg(): VideoEncoderConfiguration {
    return {
      token: 'enc1',
      name: 'Main',
      useCount: 1,
      encoding: 'H264',
      resolution: { width: 1920, height: 1080 },
      quality: 4,
      rateControl: { frameRateLimit: 25, encodingInterval: 1, bitrateLimit: 4096 },
      H264: { govLength: 30, H264Profile: 'Main' },
      multicast: {
        address: { type: 'IPv4', IPv4Address: '0.0.0.0' },
        port: 0,
        TTL: 1,
        autoStart: false,
      },
      sessionTimeout: 'PT60S',
    };
  }

  function options(): VideoEncoderConfigurationOptions {
    return {
      qualityRange: { min: 1, max: 5 },
      MPEG4: {
        resolutionsAvailable: [
          { width: 640, height: 480 },
          { width: 1280, height: 720 },
        ],
        govLengthRange: { min: 1, max: 100 },
        frameRateRange: { min: 1, max: 25 },
        encodingIntervalRange: { min: 1, max: 5 },
        mpeg4ProfilesSupported: ['SP', 'ASP'],
      },
      H264: {
        resolutionsAvailable: [{ width: 1920, height: 1080 }],
        govLengthRange: { min: 1, max: 120 },
        frameRateRange: { min: 1, max: 30 },
        encodingIntervalRange: { min: 1, max: 5 },
        H264ProfilesSupported: ['Baseline', 'Main', 'High'],
      },
      JPEG: {
        resolutionsAvailable: [{ width: 640, height: 480 }],
        frameRateRange: { min: 1, max: 30 },
        encodingIntervalRange: { min: 1, max: 10 },
      },
    };
  }

  it('merges bitrate without fetching options when encoding is unchanged', async () => {
    const media = new Media(onvif);
    const cfg = baseCfg();
    jest.spyOn(media, 'getVideoEncoderConfiguration').mockResolvedValue(cfg);
    const optionsSpy = jest.spyOn(media, 'getVideoEncoderConfigurationOptions');
    const setSpy = jest.spyOn(media, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    const merged = await media.updateVideoEncoderConfiguration({
      configurationToken: 'enc1',
      bitrateLimit: 900,
    });

    expect(merged.rateControl?.bitrateLimit).toBe(900);
    expect(optionsSpy).not.toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalledWith({ configuration: merged, forcePersistence: true });
  });

  it('fetches options and rebuilds bags when encoding changes', async () => {
    const media = new Media(onvif);
    onvif.activeMediaProfile = {
      profileToken: 'p1',
      videoEncoderConfigurationToken: 'enc1',
    } as never;
    const cfg = baseCfg();
    jest.spyOn(media, 'getVideoEncoderConfiguration').mockResolvedValue(cfg);
    const optionsSpy = jest
      .spyOn(media, 'getVideoEncoderConfigurationOptions')
      .mockResolvedValue(options());
    const setSpy = jest.spyOn(media, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    const merged = await media.updateVideoEncoderConfiguration({
      encoding: 'MPEG4',
      govLength: 20,
      profile: 'ASP',
    });

    expect(optionsSpy).toHaveBeenCalledWith({
      configurationToken: 'enc1',
      profileToken: 'p1',
    });
    expect(merged.encoding).toBe('MPEG4');
    expect(merged.H264).toBeUndefined();
    expect(merged.MPEG4).toEqual({ govLength: 20, mpeg4Profile: 'ASP' });
    expect(setSpy).toHaveBeenCalled();
  });

  it('propagates validation error when options lack the target encoding', async () => {
    const media = new Media(onvif);
    jest.spyOn(media, 'getVideoEncoderConfiguration').mockResolvedValue(baseCfg());
    jest.spyOn(media, 'getVideoEncoderConfigurationOptions').mockResolvedValue({
      qualityRange: { min: 1, max: 5 },
    });
    jest.spyOn(media, 'setVideoEncoderConfiguration').mockResolvedValue(undefined);

    await expect(
      media.updateVideoEncoderConfiguration({
        configurationToken: 'enc1',
        encoding: 'JPEG',
      }),
    ).rejects.toBeInstanceOf(OnvifValidationError);
  });
});
