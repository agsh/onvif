import {
  applyVideoEncoder2Patch,
  applyVideoEncoderPatch,
} from '../src/utils/videoEncoderPatch';
import type {
  VideoEncoder2Configuration,
  VideoEncoderConfiguration,
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

  it('updates H264 govLength when present', () => {
    const cfg = baseMedia1();
    applyVideoEncoderPatch(cfg, { govLength: 15 });
    expect(cfg.H264).toEqual({ govLength: 15, H264Profile: 'Main' });
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

  it('switches encoding and fills MPEG4 govLength when MPEG4 block is present', () => {
    const cfg = baseMedia1();
    delete cfg.H264;
    cfg.encoding = 'MPEG4';
    cfg.MPEG4 = { govLength: 10, mpeg4Profile: 'SP' };
    applyVideoEncoderPatch(cfg, { encoding: 'MPEG4', govLength: 20 });
    expect(cfg.encoding).toBe('MPEG4');
    expect(cfg.MPEG4).toEqual({ govLength: 20, mpeg4Profile: 'SP' });
  });

  it('creates H264 / MPEG4 blocks from encoding when govLength is set without codec bags', () => {
    const h264 = baseMedia1();
    delete h264.H264;
    applyVideoEncoderPatch(h264, { encoding: 'H264', govLength: 12 });
    expect(h264.H264).toEqual({ govLength: 12, H264Profile: 'Main' });

    const mpeg4 = baseMedia1();
    delete mpeg4.H264;
    mpeg4.encoding = 'JPEG';
    applyVideoEncoderPatch(mpeg4, { encoding: 'MPEG4', govLength: 8 });
    expect(mpeg4.MPEG4).toEqual({ govLength: 8, mpeg4Profile: 'SP' });
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

  it('sets encoding / quality and creates rateControl defaults when absent', () => {
    const cfg = baseMedia2();
    delete cfg.rateControl;
    applyVideoEncoder2Patch(cfg, {
      encoding: 'H265',
      quality: 2,
      frameRateLimit: 20,
    });
    expect(cfg.encoding).toBe('H265');
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
});
