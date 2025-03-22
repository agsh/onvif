import { Onvif } from '../src';

let cam: Onvif;
beforeAll(async () => {
  cam = new Onvif({
    hostname : 'localhost',
    username : 'admin',
    password : 'admin',
    port     : 8000,
  });
  await cam.connect();
});

describe('Startup', () => {
  it('should connect to the cam, fill startup properties', () => {
    expect(cam.uri.PTZ?.href).toBeDefined();
    expect(cam.uri.media).toBeDefined();
    expect(cam.media.videoSources).toBeDefined();
    expect(cam.media.profiles).toBeDefined();
    expect(cam.defaultProfile).toBeDefined();
    expect(cam.activeSource).toBeDefined();
  });
});

describe('Date and time', () => {
  describe('getSystemDateAndTime', () => {
    it('should return valid object', async () => {
      const result = await cam.getSystemDateAndTime();
      expect(result.dateTime).toBeInstanceOf(Date);
      expect(result.dateTimeType).toBeDefined();
      expect(result.UTCDateTime).toBeDefined();
      expect(result.UTCDateTime).toHaveProperty('date');
      expect(result.UTCDateTime).toHaveProperty('time');
      expect(result.timeZone?.TZ).toBeDefined();
    });
  });

  describe('getOnlySystemDateAndTime', () => {
    it('should return Date object', async () => {
      const result = await cam.getOnlySystemDateAndTime();
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('setSystemDateAndTime', () => {
    it('should throw an error when `dateTimeType` is missing or wrong', () => {
      expect(
        cam.setSystemDateAndTime({
          dateTime : new Date(),
        }),
      ).rejects.toThrow();
    });

    it('should throw an error when `UTCDateTime` and `dateTime` are missing or wrong in manual mode', () => {
      expect(
        cam.setSystemDateAndTime({
          dateTimeType : 'Manual',
        }),
      ).rejects.toThrow();
    });

    it('should set date and time using SOAP Date and Time types', async () => {
      const result = await cam.setSystemDateAndTime({
        dateTimeType : 'Manual',
        UTCDateTime  : {
          date : {
            year  : 2021,
            month : 6,
            day   : 15,
          },
          time : {
            hour   : 19,
            minute : 14,
            second : 37,
          },
        },
      });
      expect(result.dateTime).toBeInstanceOf(Date);
      expect(result.dateTimeType).toBeDefined();
      expect(result.UTCDateTime).toBeDefined();
      expect(result.timeZone?.TZ).toBeDefined();
    });

    it('should set date and time using js Date object', async () => {
      const result = await cam.setSystemDateAndTime({
        dateTimeType : 'Manual',
        dateTime     : new Date(2021, 5, 15, 19, 14, 37),
      });
      expect(result.dateTime).toBeInstanceOf(Date);
      expect(result.dateTimeType).toBeDefined();
      expect(result.UTCDateTime).toBeDefined();
      expect(result.timeZone?.TZ).toBeDefined();
    });
  });
});
