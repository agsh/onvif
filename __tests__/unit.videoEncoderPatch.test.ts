import {
  applyMedia1EncodingSwitch,
  applyMedia2EncodingSwitch,
  applyVideoEncoder2Patch,
  applyVideoEncoderPatch,
  findVideoEncoder2Options,
} from '../src/utils/videoEncoderPatch';
import { OnvifValidationError } from '../src/utils/errors';
import type {
  VideoEncoder2Configuration,
  VideoEncoder2ConfigurationOptions,
  VideoEncoderConfiguration,
  VideoEncoderConfigurationOptions,
} from '../src/interfaces/onvif';

function baseMedia1(): VideoEncoderConfiguration {
  return {
    token: 'enc1',
    name: 'Main',
    useCount: 1,
    encoding: 'H264',
    resolution: { width: 1920, height: 1080 },
    quality: 4,
    rateControl: {
      frameRateLimit: 25,
      encodingInterval: 1,
      bitrateLimit: 4096,
    },
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

function baseMedia2(): VideoEncoder2Configuration {
  return {
    token: 'enc2',
    name: 'Main',
    useCount: 1,
    encoding: 'H264',
    resolution: { width: 1280, height: 720 },
    quality: 3,
    rateControl: {
      frameRateLimit: 30,
      bitrateLimit: 2048,
      constantBitRate: false,
    },
    govLength: 60,
    profile: 'Main',
  };
}

function media1Options(): VideoEncoderConfigurationOptions {
  return {
    qualityRange: { min: 1, max: 5 },
    JPEG: {
      resolutionsAvailable: [
        { width: 640, height: 480 },
        { width: 1280, height: 720 },
      ],
      frameRateRange: { min: 1, max: 30 },
      encodingIntervalRange: { min: 1, max: 10 },
    },
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
      resolutionsAvailable: [
        { width: 1280, height: 720 },
        { width: 1920, height: 1080 },
      ],
      govLengthRange: { min: 1, max: 120 },
      frameRateRange: { min: 1, max: 30 },
      encodingIntervalRange: { min: 1, max: 5 },
      H264ProfilesSupported: ['Baseline', 'Main', 'High'],
    },
    extension: {
      H264: {
        resolutionsAvailable: [{ width: 1920, height: 1080 }],
        govLengthRange: { min: 1, max: 120 },
        frameRateRange: { min: 1, max: 30 },
        encodingIntervalRange: { min: 1, max: 5 },
        H264ProfilesSupported: ['Main'],
        bitrateRange: { min: 64, max: 8192 },
      },
      MPEG4: {
        resolutionsAvailable: [{ width: 640, height: 480 }],
        govLengthRange: { min: 1, max: 100 },
        frameRateRange: { min: 1, max: 25 },
        encodingIntervalRange: { min: 1, max: 5 },
        mpeg4ProfilesSupported: ['SP'],
        bitrateRange: { min: 64, max: 4096 },
      },
      JPEG: {
        resolutionsAvailable: [{ width: 640, height: 480 }],
        frameRateRange: { min: 1, max: 30 },
        encodingIntervalRange: { min: 1, max: 10 },
        bitrateRange: { min: 64, max: 2048 },
      },
    },
  };
}

function media2Options(encoding: string): VideoEncoder2ConfigurationOptions {
  return {
    encoding,
    qualityRange: { min: 1, max: 5 },
    govLengthRange: [1, 120],
    frameRatesSupported: [30, 25, 15],
    profilesSupported: ['Main', 'High'],
    resolutionsAvailable: [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ],
    bitrateRange: { min: 64, max: 8192 },
  };
}

describe('applyVideoEncoderPatch (Media 1.0)', () => {
  it('merges bitrate / fps / resolution / quality and keeps other fields', () => {
    const cfg = baseMedia1();
    applyVideoEncoderPatch(cfg, {
      bitrateLimit: 1024,
      frameRateLimit: 15,
      resolution: { width: 1280 },
      quality: 5,
    });
    expect(cfg.rateControl).toEqual({
      frameRateLimit: 15,
      encodingInterval: 1,
      bitrateLimit: 1024,
    });
    expect(cfg.resolution).toEqual({ width: 1280, height: 1080 });
    expect(cfg.quality).toBe(5);
    expect(cfg.encoding).toBe('H264');
    expect(cfg.H264?.govLength).toBe(30);
  });

  it('updates H264 govLength and profile when present', () => {
    const cfg = baseMedia1();
    applyVideoEncoderPatch(cfg, { govLength: 15, profile: 'High' });
    expect(cfg.H264).toEqual({ govLength: 15, H264Profile: 'High' });
  });

  it('creates rateControl when missing and only bitrate is patched', () => {
    const cfg = baseMedia1();
    delete cfg.rateControl;
    applyVideoEncoderPatch(cfg, { bitrateLimit: 512 });
    expect(cfg.rateControl).toEqual({
      frameRateLimit: 0,
      encodingInterval: 1,
      bitrateLimit: 512,
    });
  });

  it('leaves resolution unchanged when patch.resolution is omitted', () => {
    const cfg = baseMedia1();
    applyVideoEncoderPatch(cfg, { quality: 1 });
    expect(cfg.resolution).toEqual({ width: 1920, height: 1080 });
  });

  it('updates MPEG4 govLength when MPEG4 bag is present without switching', () => {
    const cfg = baseMedia1();
    delete cfg.H264;
    cfg.encoding = 'MPEG4';
    cfg.MPEG4 = { govLength: 10, mpeg4Profile: 'SP' };
    applyVideoEncoderPatch(cfg, { encoding: 'MPEG4', govLength: 20, profile: 'ASP' });
    expect(cfg.encoding).toBe('MPEG4');
    expect(cfg.MPEG4).toEqual({ govLength: 20, mpeg4Profile: 'ASP' });
  });

  it('does not invent H264 / MPEG4 bags without options', () => {
    const h264 = baseMedia1();
    delete h264.H264;
    applyVideoEncoderPatch(h264, { encoding: 'H264', govLength: 12 });
    expect(h264.H264).toBeUndefined();

    const jpeg = baseMedia1();
    delete jpeg.H264;
    jpeg.encoding = 'JPEG';
    applyVideoEncoderPatch(jpeg, { govLength: 8, profile: 'SP' });
    expect(jpeg.MPEG4).toBeUndefined();
    expect(jpeg.H264).toBeUndefined();
  });

  it('throws when encoding changes without options', () => {
    const cfg = baseMedia1();
    expect(() => applyVideoEncoderPatch(cfg, { encoding: 'MPEG4' })).toThrow(OnvifValidationError);
  });

  it('keeps existing rateControl axes when only encodingInterval is patched', () => {
    const cfg = baseMedia1();
    applyVideoEncoderPatch(cfg, { encodingInterval: 2 });
    expect(cfg.rateControl).toEqual({
      frameRateLimit: 25,
      encodingInterval: 2,
      bitrateLimit: 4096,
    });
  });

  it('fills rateControl defaults when cfg.rateControl is missing and patch is sparse', () => {
    const cfg = baseMedia1();
    delete cfg.rateControl;
    applyVideoEncoderPatch(cfg, { encodingInterval: 3 });
    expect(cfg.rateControl).toEqual({
      frameRateLimit: 0,
      encodingInterval: 3,
      bitrateLimit: 0,
    });
  });
});

describe('applyMedia1EncodingSwitch', () => {
  it('H264 -> MPEG4 clears H264, builds MPEG4 from options, keeps gov when in range', () => {
    const cfg = baseMedia1();
    applyVideoEncoderPatch(cfg, { encoding: 'MPEG4' }, media1Options());
    expect(cfg.encoding).toBe('MPEG4');
    expect(cfg.H264).toBeUndefined();
    expect(cfg.MPEG4).toEqual({ govLength: 30, mpeg4Profile: 'SP' });
    expect(cfg.resolution).toEqual({ width: 640, height: 480 });
  });

  it('H264 -> JPEG clears codec bags and clamps rate / quality', () => {
    const cfg = baseMedia1();
    applyMedia1EncodingSwitch(
      cfg,
      {
        encoding: 'JPEG',
        quality: 99,
        frameRateLimit: 100,
        bitrateLimit: 500,
      },
      media1Options(),
    );
    expect(cfg.encoding).toBe('JPEG');
    expect(cfg.H264).toBeUndefined();
    expect(cfg.MPEG4).toBeUndefined();
    expect(cfg.quality).toBe(5);
    expect(cfg.rateControl?.frameRateLimit).toBe(30);
    expect(cfg.resolution).toEqual({ width: 640, height: 480 });
  });

  it('uses requested profile / govLength when supported', () => {
    const cfg = baseMedia1();
    applyVideoEncoderPatch(
      cfg,
      { encoding: 'H264', profile: 'High', govLength: 15, resolution: { width: 1280, height: 720 } },
      media1Options(),
    );
    // same encoding -- not a switch; bags updated via field path
    expect(cfg.H264).toEqual({ govLength: 15, H264Profile: 'High' });
    expect(cfg.resolution).toEqual({ width: 1280, height: 720 });
  });

  it('JPEG -> H264 builds H264 bag from options profiles', () => {
    const cfg = baseMedia1();
    delete cfg.H264;
    cfg.encoding = 'JPEG';
    applyVideoEncoderPatch(
      cfg,
      { encoding: 'H264', profile: 'Baseline', govLength: 200 },
      media1Options(),
    );
    expect(cfg.encoding).toBe('H264');
    expect(cfg.MPEG4).toBeUndefined();
    expect(cfg.H264).toEqual({ govLength: 120, H264Profile: 'Baseline' });
  });

  it('throws when target encoding is absent from options', () => {
    const cfg = baseMedia1();
    const options = media1Options();
    delete options.MPEG4;
    delete options.extension!.MPEG4;
    expect(() => applyVideoEncoderPatch(cfg, { encoding: 'MPEG4' }, options)).toThrow(
      /not reported/,
    );
  });

  it('throws when H264ProfilesSupported is empty', () => {
    const cfg = baseMedia1();
    delete cfg.H264;
    cfg.encoding = 'JPEG';
    const options = media1Options();
    options.H264 = {
      ...options.H264!,
      H264ProfilesSupported: [],
    };
    delete options.extension;
    expect(() => applyVideoEncoderPatch(cfg, { encoding: 'H264' }, options)).toThrow(
      /H264ProfilesSupported/,
    );
  });

  it('falls back to extension codec options when top-level missing', () => {
    const cfg = baseMedia1();
    const options = media1Options();
    delete options.MPEG4;
    applyVideoEncoderPatch(cfg, { encoding: 'MPEG4', govLength: 10 }, options);
    expect(cfg.MPEG4).toEqual({ govLength: 10, mpeg4Profile: 'SP' });
  });
});

describe('applyVideoEncoder2Patch (Media 2.0)', () => {
  it('merges rate control and govLength / profile', () => {
    const cfg = baseMedia2();
    applyVideoEncoder2Patch(cfg, {
      bitrateLimit: 1500,
      constantBitRate: true,
      govLength: 45,
      profile: 'High',
      resolution: { height: 1080 },
    });
    expect(cfg.rateControl).toMatchObject({
      frameRateLimit: 30,
      bitrateLimit: 1500,
      constantBitRate: true,
    });
    expect(cfg.govLength).toBe(45);
    expect(cfg.profile).toBe('High');
    expect(cfg.resolution).toEqual({ width: 1280, height: 1080 });
  });

  it('sets quality and creates rateControl defaults when absent (same encoding)', () => {
    const cfg = baseMedia2();
    delete cfg.rateControl;
    applyVideoEncoder2Patch(cfg, {
      encoding: 'H264',
      quality: 2,
      frameRateLimit: 20,
    });
    expect(cfg.encoding).toBe('H264');
    expect(cfg.quality).toBe(2);
    expect(cfg.rateControl).toEqual({
      frameRateLimit: 20,
      bitrateLimit: 0,
      constantBitRate: undefined,
      averageBitRate: undefined,
    });
  });

  it('keeps averageBitRate and fills missing rateControl axes from defaults', () => {
    const cfg = baseMedia2();
    cfg.rateControl = { averageBitRate: 1000 } as never;
    applyVideoEncoder2Patch(cfg, { constantBitRate: true });
    expect(cfg.rateControl).toEqual({
      frameRateLimit: 0,
      bitrateLimit: 0,
      constantBitRate: true,
      averageBitRate: 1000,
    });
  });

  it('no-ops when patch fields are omitted', () => {
    const cfg = baseMedia2();
    const before = structuredClone(cfg);
    applyVideoEncoder2Patch(cfg, {});
    expect(cfg).toEqual(before);
  });

  it('throws when encoding changes without options', () => {
    const cfg = baseMedia2();
    expect(() => applyVideoEncoder2Patch(cfg, { encoding: 'H265' })).toThrow(OnvifValidationError);
  });
});

describe('applyMedia2EncodingSwitch', () => {
  it('H264 -> H265 picks profile / clamps gov and bitrate / picks fps from list', () => {
    const cfg = baseMedia2();
    applyVideoEncoder2Patch(
      cfg,
      { encoding: 'H265', govLength: 999, bitrateLimit: 50, frameRateLimit: 12, quality: 9 },
      media2Options('H265'),
    );
    expect(cfg.encoding).toBe('H265');
    expect(cfg.profile).toBe('Main');
    expect(cfg.govLength).toBe(120);
    expect(cfg.rateControl?.bitrateLimit).toBe(64);
    expect(cfg.rateControl?.frameRateLimit).toBe(30);
    expect(cfg.quality).toBe(5);
    expect(cfg.resolution).toEqual({ width: 1280, height: 720 });
  });

  it('honors requested profile when listed', () => {
    const cfg = baseMedia2();
    applyMedia2EncodingSwitch(cfg, { encoding: 'h265', profile: 'High' }, media2Options('H265'));
    expect(cfg.encoding).toBe('h265');
    expect(cfg.profile).toBe('High');
  });

  it('accepts space-separated profilesSupported / govLengthRange quirks', () => {
    const cfg = baseMedia2();
    const options = media2Options('H265');
    options.profilesSupported = 'Main High' as never;
    options.govLengthRange = '1 60' as never;
    applyVideoEncoder2Patch(cfg, { encoding: 'H265', govLength: 40 }, options);
    expect(cfg.profile).toBe('Main');
    expect(cfg.govLength).toBe(40);
  });
});

describe('findVideoEncoder2Options', () => {
  it('matches exact then case-insensitive encoding', () => {
    const list = [media2Options('H264'), media2Options('H265')];
    expect(findVideoEncoder2Options(list, 'H265')?.encoding).toBe('H265');
    expect(findVideoEncoder2Options(list, 'h264')?.encoding).toBe('H264');
    expect(findVideoEncoder2Options(list, 'JPEG')).toBeUndefined();
  });
});
