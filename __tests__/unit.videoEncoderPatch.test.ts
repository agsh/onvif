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
});
