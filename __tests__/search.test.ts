import { Onvif } from '../src';
import { Date as OnvifDateTime, RecordingSummary } from '../src/interfaces/onvif';
import { happytimeOnvifOptions } from './happytime';

const RECORDING_TOKEN = 'RecordingToken_1';
const KEEP_ALIVE_TIME = 'PT10S';
const SEARCH_START = '2026-01-01T00:00:00Z' as unknown as OnvifDateTime;
const SEARCH_END = '2026-12-31T23:59:59Z' as unknown as OnvifDateTime;
const MEDIA_ATTRIBUTES_TIME = '2026-08-19T14:00:00Z' as unknown as OnvifDateTime;

let cam: Onvif;
let recordingSummary: RecordingSummary;

const searchScope = () => ({
  includedRecordings: [RECORDING_TOKEN],
});

beforeAll(async () => {
  cam = new Onvif(happytimeOnvifOptions);
  await cam.connect();
  recordingSummary = await cam.search.getRecordingSummary();
});

describe('Search', () => {
  beforeAll(() => {
    if (!cam.uri.search) {
      throw new Error('Search service is not available on the test device');
    }
  });

  describe('getServiceCapabilities', () => {
    it('should return search service capabilities as an object', async () => {
      const caps = await cam.search.getServiceCapabilities();
      expect(caps).toBeDefined();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps)).toBe(false);
    });

    it('should return capability flags from the happytime mock server', async () => {
      const caps = await cam.search.getServiceCapabilities();
      expect(caps.metadataSearch).toBe(true);
      expect(caps.generalStartEvents).toBe(true);
    });
  });

  describe('getRecordingSummary', () => {
    it('should return a recording summary for the device', async () => {
      const summary = await cam.search.getRecordingSummary();
      expect(summary).toBeDefined();
      expect(summary.numberRecordings).toBe(1);
      expect(summary).toHaveProperty('dataFrom');
      expect(summary).toHaveProperty('dataUntil');
    });

    it('should return the same summary on repeated calls', async () => {
      const summary = await cam.search.getRecordingSummary();
      expect(summary.numberRecordings).toBe(recordingSummary.numberRecordings);
    });
  });

  describe('getRecordingInformation', () => {
    it('should return detailed information about an existing recording', async () => {
      const information = await cam.search.getRecordingInformation({
        recordingToken: RECORDING_TOKEN,
      });
      expect(information.recordingToken).toBe(RECORDING_TOKEN);
      expect(information.recordingStatus).toBe('Initiated');
      expect(information.content).toBe('Recording from device');
      expect(information.source).toMatchObject({
        sourceId: 'http://localhost/sourceID',
        name: 'CameraName',
        location: 'LocationDescription',
        description: 'SourceDescription',
      });
      expect(information.track?.length).toBeGreaterThanOrEqual(3);
      expect(information.track?.map((track) => track.trackToken)).toEqual(
        expect.arrayContaining(['VIDEO001', 'AUDIO001', 'META001']),
      );
    });

    it('should reject an invalid recording token', async () => {
      await expect(
        cam.search.getRecordingInformation({ recordingToken: 'InvalidToken' }),
      ).rejects.toThrow('The Token is not valid');
    });
  });

  describe('getMediaAttributes', () => {
    it('should return media attributes for a recording at a specific time', async () => {
      const mediaAttributes = await cam.search.getMediaAttributes({
        recordingTokens: [RECORDING_TOKEN],
        time: MEDIA_ATTRIBUTES_TIME,
      });
      expect(mediaAttributes.length).toBeGreaterThanOrEqual(1);
      expect(mediaAttributes[0].recordingToken).toBe(RECORDING_TOKEN);
      expect(mediaAttributes[0].trackAttributes?.length).toBeGreaterThanOrEqual(3);
      expect(mediaAttributes[0].from).toBeInstanceOf(Date);
      expect(mediaAttributes[0].until).toBeInstanceOf(Date);
    });

    it('should return media attributes when recording tokens are omitted', async () => {
      const mediaAttributes = await cam.search.getMediaAttributes({
        time: MEDIA_ATTRIBUTES_TIME,
      });
      expect(Array.isArray(mediaAttributes)).toBe(true);
    });
  });

  describe('findRecordings / getRecordingSearchResults / getSearchState / endSearch', () => {
    let searchToken: string;

    afterEach(async () => {
      if (searchToken) {
        await cam.search.endSearch({ searchToken });
        searchToken = '';
      }
    });

    it('should start a recording search and return a search token', async () => {
      searchToken = await cam.search.findRecordings({
        scope: searchScope(),
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      expect(typeof searchToken).toBe('string');
      expect(searchToken.length).toBeGreaterThan(0);
    });

    it('should return recording search results for an active session', async () => {
      searchToken = await cam.search.findRecordings({
        scope: searchScope(),
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      const results = await cam.search.getRecordingSearchResults({
        searchToken,
        maxResults: 10,
      });
      expect(results.searchState).toBe('Completed');
      expect(results.recordingInformation?.length).toBeGreaterThanOrEqual(1);
      expect(results.recordingInformation?.[0].recordingToken).toBe(RECORDING_TOKEN);
    });

    it('should return the search session state', async () => {
      searchToken = await cam.search.findRecordings({
        scope: searchScope(),
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      const state = await cam.search.getSearchState({ searchToken });
      expect(state).toBe('Completed');
    });

    it('should end a recording search session', async () => {
      searchToken = await cam.search.findRecordings({
        scope: searchScope(),
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      const endpoint = await cam.search.endSearch({ searchToken });
      expect(endpoint).toBeDefined();
      searchToken = '';
    });
  });

  describe('findEvents / getEventSearchResults', () => {
    let searchToken: string;

    afterEach(async () => {
      if (searchToken) {
        await cam.search.endSearch({ searchToken });
        searchToken = '';
      }
    });

    it('should start an event search and return a search token', async () => {
      searchToken = await cam.search.findEvents({
        startPoint: SEARCH_START,
        endPoint: SEARCH_END,
        scope: searchScope(),
        searchFilter: {},
        includeStartState: false,
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      expect(typeof searchToken).toBe('string');
      expect(searchToken.length).toBeGreaterThan(0);
    });

    it('should return event search results for an active session', async () => {
      searchToken = await cam.search.findEvents({
        startPoint: SEARCH_START,
        endPoint: SEARCH_END,
        scope: searchScope(),
        searchFilter: {},
        includeStartState: false,
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      const results = await cam.search.getEventSearchResults({
        searchToken,
        maxResults: 10,
      });
      expect(results.searchState).toBe('Completed');
      expect(results.result?.length).toBeGreaterThanOrEqual(1);
      expect(results.result?.[0].recordingToken).toBe(RECORDING_TOKEN);
      expect(results.result?.[0]).toHaveProperty('time');
      expect(results.result?.[0]).toHaveProperty('event');
    });
  });

  describe('findPTZPosition / getPTZPositionSearchResults', () => {
    let searchToken: string;

    afterEach(async () => {
      if (searchToken) {
        await cam.search.endSearch({ searchToken });
        searchToken = '';
      }
    });

    it('should start a PTZ position search and return a search token', async () => {
      searchToken = await cam.search.findPTZPosition({
        startPoint: SEARCH_START,
        endPoint: SEARCH_END,
        scope: searchScope(),
        searchFilter: {
          minPosition: { panTilt: { x: -1, y: -1 }, zoom: { x: 0 } },
          maxPosition: { panTilt: { x: 1, y: 1 }, zoom: { x: 1 } },
          enterOrExit: false,
        },
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      expect(typeof searchToken).toBe('string');
      expect(searchToken.length).toBeGreaterThan(0);
    });

    it('should return PTZ position search results for an active session', async () => {
      searchToken = await cam.search.findPTZPosition({
        startPoint: SEARCH_START,
        endPoint: SEARCH_END,
        scope: searchScope(),
        searchFilter: {
          minPosition: {},
          maxPosition: {},
          enterOrExit: false,
        },
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      const results = await cam.search.getPTZPositionSearchResults({
        searchToken,
        maxResults: 10,
      });
      expect(results.searchState).toBe('Completed');
      expect(results.result?.length).toBeGreaterThanOrEqual(1);
      expect(results.result?.[0].recordingToken).toBe(RECORDING_TOKEN);
      expect(results.result?.[0].trackToken).toBe('META001');
      expect(results.result?.[0]).toHaveProperty('position');
    });
  });

  describe('findMetadata / getMetadataSearchResults', () => {
    let searchToken: string;

    afterEach(async () => {
      if (searchToken) {
        await cam.search.endSearch({ searchToken });
        searchToken = '';
      }
    });

    it('should start a metadata search and return a search token', async () => {
      searchToken = await cam.search.findMetadata({
        startPoint: SEARCH_START,
        endPoint: SEARCH_END,
        scope: searchScope(),
        metadataFilter: {
          metadataStreamFilter: '//tt:MetadataStream',
        },
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      expect(typeof searchToken).toBe('string');
      expect(searchToken.length).toBeGreaterThan(0);
    });

    it('should return metadata search results for an active session', async () => {
      searchToken = await cam.search.findMetadata({
        startPoint: SEARCH_START,
        endPoint: SEARCH_END,
        scope: searchScope(),
        metadataFilter: {
          metadataStreamFilter: '//tt:MetadataStream',
        },
        keepAliveTime: KEEP_ALIVE_TIME,
        maxMatches: 5,
      });
      const results = await cam.search.getMetadataSearchResults({
        searchToken,
        maxResults: 10,
      });
      expect(results.searchState).toBe('Completed');
    });
  });
});
