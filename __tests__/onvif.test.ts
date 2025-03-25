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

describe('Common', () => {
  it('should connect to the cam, fill startup properties', () => {
    expect(cam.uri.PTZ?.href).toBeDefined();
    expect(cam.uri.media).toBeDefined();
    expect(cam.media.videoSources).toBeDefined();
    expect(cam.media.profiles).toBeDefined();
    expect(cam.defaultProfile).toBeDefined();
    expect(cam.activeSource).toBeDefined();
  });

  it('should throw an error when trying to send empty request', () => {
    expect(() => (cam as any).request({})).toThrow();
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

    it('should return valid object from devices module', async () => {
      const result = await cam.device.getSystemDateAndTime();
      expect(result.dateTime).toBeInstanceOf(Date);
      expect(result.dateTimeType).toBeDefined();
      expect(result.UTCDateTime).toBeDefined();
      expect(result.UTCDateTime).toHaveProperty('date');
      expect(result.UTCDateTime).toHaveProperty('time');
      expect(result.timeZone?.TZ).toBeDefined();
    });

    it('should try to send request with WSSecurity if authorization is required', async () => {
      jest.spyOn(cam as any, 'rawRequest')
        .mockImplementationOnce(() => Promise.resolve([{}, 'sender not authorized']));
      jest.spyOn(cam as any, 'request')
        .mockImplementationOnce(() => (cam as any).rawRequest({
          // Try the Unauthenticated Request first. Do not use this._envelopeHeader() as we don't have timeShift yet.
          body :
            '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">'
            + '<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">'
            + '<GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>'
            + '</s:Body>'
            + '</s:Envelope>',
        }));
      const result = await cam.getSystemDateAndTime();
      expect(result.dateTime).toBeInstanceOf(Date);
      expect((cam as any).timeShift).toBeGreaterThanOrEqual(0);
    });

    it('should use current time if there is no UTCDateTime in the response', async () => {
      jest.spyOn(cam as any, 'rawRequest')
        .mockImplementationOnce(async (options) => {
          const [data, xml] = await (cam as any).rawRequest(options);
          delete data[0].getSystemDateAndTimeResponse[0].systemDateAndTime[0].UTCDateTime;
          return [data, xml];
        });
      const result = await cam.getSystemDateAndTime();
      expect(result.dateTime).toBeInstanceOf(Date);
      expect((cam as any).timeShift).toBeGreaterThanOrEqual(0);
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

    it('should throw an error when the response from the device is not empty string', () => {
      jest.spyOn(cam as any, 'request')
        .mockReturnValueOnce('whatever');
      expect(
        cam.setSystemDateAndTime({
          dateTimeType : 'NTP',
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

    it('should set date and time using device module', async () => {
      const result = await cam.device.setSystemDateAndTime({
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
