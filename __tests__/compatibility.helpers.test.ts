import {
  activeSourceToken,
  ensureArray,
  invoke,
  isCallback,
  mapCompatibilityPTZVector,
  mapCreateRecordingJobOptions,
  mapImagingToken,
  mapJobToken,
  mapRecordingToken,
  normalizeMediaUriResponse,
  normalizeStreamUriResponse,
  presetsToMap,
  profileToken,
  splitOptionalCallback,
  splitTokenCallback,
  videoSourceToken,
} from '../src/compatibility/helpers';
import type { Onvif } from '../src/onvif';

describe('compatibility helpers', () => {
  describe('isCallback / splitOptionalCallback / splitTokenCallback', () => {
    it('detects callbacks', () => {
      expect(isCallback(() => undefined)).toBe(true);
      expect(isCallback({})).toBe(false);
      expect(isCallback(undefined)).toBe(false);
    });

    it('splits options/callback overloads', () => {
      const cb = jest.fn();
      expect(splitOptionalCallback(cb)).toEqual({ options: {}, callback: cb });
      expect(splitOptionalCallback({ a: 1 }, cb)).toEqual({ options: { a: 1 }, callback: cb });
      expect(splitOptionalCallback(undefined, cb)).toEqual({ options: {}, callback: cb });
      expect(splitOptionalCallback({ a: 1 })).toEqual({ options: { a: 1 }, callback: undefined });
    });

    it('splits token/callback overloads', () => {
      const cb = jest.fn();
      expect(splitTokenCallback(cb)).toEqual({ token: undefined, callback: cb });
      expect(splitTokenCallback('tok', cb)).toEqual({ token: 'tok', callback: cb });
      expect(splitTokenCallback('tok')).toEqual({ token: 'tok', callback: undefined });
      expect(splitTokenCallback()).toEqual({ token: undefined, callback: undefined });
    });
  });

  describe('invoke', () => {
    it('forwards resolved values and transforms', async () => {
      const cb = jest.fn();
      invoke(Promise.resolve({ n: 1 }), cb, (r) => r.n * 2);
      await Promise.resolve();
      expect(cb).toHaveBeenCalledWith(null, 2);
    });

    it('forwards rejections to the callback', async () => {
      const cb = jest.fn();
      const error = new Error('fail');
      invoke(Promise.reject(error), cb);
      await Promise.resolve();
      await Promise.resolve();
      expect(cb).toHaveBeenCalledWith(error);
    });

    it('does not re-invoke callback when the callback throws', async () => {
      const boom = new Error('boom');
      const cb = jest.fn(() => {
        throw boom;
      });
      invoke(Promise.resolve(42), cb);
      await Promise.resolve();
      await Promise.resolve();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(null, 42);
    });
  });

  describe('token helpers', () => {
    const onvif = {
      activeSource: { sourceToken: 'src', profileToken: 'prof' },
    } as Onvif;

    it('resolves videoSourceToken and profileToken with fallbacks', () => {
      expect(videoSourceToken(onvif, { token: 'explicit' })).toBe('explicit');
      expect(videoSourceToken(onvif, {})).toBe('src');
      expect(profileToken(onvif, { profileToken: 'p2' })).toBe('p2');
      expect(profileToken(onvif, {})).toBe('prof');
      expect(activeSourceToken(onvif.activeSource)).toBe('src');
      expect(activeSourceToken(undefined)).toBeUndefined();
    });

    it('maps imaging and recording tokens', () => {
      expect(mapImagingToken(onvif, { token: 't1' })).toEqual({
        token: 't1',
        videoSourceToken: 't1',
      });
      expect(mapRecordingToken({ RecordingToken: 'R1' })).toEqual({ recordingToken: 'R1' });
      expect(mapRecordingToken({ recordingToken: 'r2' })).toEqual({ recordingToken: 'r2' });
      expect(mapJobToken({ JobToken: 'J1' })).toEqual({ jobToken: 'J1' });
      expect(mapJobToken({ jobToken: 'j2' })).toEqual({ jobToken: 'j2' });
    });

    it('maps createRecordingJob options', () => {
      expect(
        mapCreateRecordingJobOptions({
          scheduleToken: 's',
          recordingToken: 'r',
          mode: 'Idle',
          priority: 1,
          source: {
            sourceToken: { type: 'Video', token: 'v' },
            autoCreateReceiver: true,
            tracks: ['Video'],
          },
        }),
      ).toEqual({
        jobConfiguration: {
          scheduleToken: 's',
          recordingToken: 'r',
          mode: 'Idle',
          priority: 1,
          source: {
            sourceToken: { type: 'Video', token: 'v' },
            autoCreateReceiver: true,
            tracks: ['Video'],
          },
        },
      });
    });
  });

  describe('mapCompatibilityPTZVector', () => {
    it('includes only provided axes and keeps zeros', () => {
      expect(mapCompatibilityPTZVector({ x: 0.5, y: 0.5 })).toEqual({
        panTilt: { x: 0.5, y: 0.5 },
      });
      expect(mapCompatibilityPTZVector({ zoom: 0 })).toEqual({ zoom: { x: 0 } });
      expect(mapCompatibilityPTZVector({ x: 0, y: 0, zoom: 0 })).toEqual({
        panTilt: { x: 0, y: 0 },
        zoom: { x: 0 },
      });
    });

    it('honors onlySendPanTilt / onlySendZoom', () => {
      expect(mapCompatibilityPTZVector({ x: 0, y: 0, zoom: 0, onlySendPanTilt: true })).toEqual({
        panTilt: { x: 0, y: 0 },
      });
      expect(mapCompatibilityPTZVector({ x: 0, y: 0, zoom: 0, onlySendZoom: true })).toEqual({
        zoom: { x: 0 },
      });
    });
  });

  describe('ensureArray / presetsToMap / normalize responses', () => {
    it('normalizes arrays', () => {
      expect(ensureArray(undefined)).toEqual([]);
      expect(ensureArray(1)).toEqual([1]);
      expect(ensureArray([1, 2])).toEqual([1, 2]);
    });

    it('builds preset name-to-token map from array or record', () => {
      expect(
        presetsToMap([
          { name: 'Home', token: 'p1' },
          { name: undefined, token: 'x' },
          { name: 'Away', token: 'p2' },
        ]),
      ).toEqual({ Home: 'p1', x: 'x', Away: 'p2' });
      expect(presetsToMap({ a: { name: 'A', token: '1' } })).toEqual({ A: '1' });
      expect(presetsToMap([{ name: 'Legacy', $: { token: 't1' } } as any])).toEqual({ Legacy: 't1' });
      expect(presetsToMap(undefined)).toEqual({});
      expect(presetsToMap([])).toEqual({});
    });

    it('normalizes media and stream URI shapes', () => {
      expect(normalizeMediaUriResponse({ uri: 'http://a' })).toEqual({ uri: 'http://a' });
      expect(normalizeMediaUriResponse({ mediaUri: { uri: 'http://b' } })).toEqual({ uri: 'http://b' });
      expect(normalizeMediaUriResponse({})).toEqual({});

      expect(normalizeStreamUriResponse({ uri: 'rtsp://a' })).toEqual({ uri: 'rtsp://a' });
      expect(normalizeStreamUriResponse({ mediaUri: { uri: 'rtsp://b' } })).toEqual({ uri: 'rtsp://b' });
      expect(normalizeStreamUriResponse({ mediaUri: {} })).toEqual({ mediaUri: {} });
    });
  });
});
