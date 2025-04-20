import { parseStringPromise } from 'xml2js';
import { guid, linerase, parseSOAPString, struct } from '../src/utils';

describe('Linerase function', () => {
  it('should handle tag', async () => {
    const result = await parseStringPromise('<a><b>text</b><c>text</c></a>');
    expect(linerase(result)).toEqual({
      a : {
        b : 'text',
        c : 'text',
      },
    });
  });

  it('should handle multiply tags', async () => {
    const result = await parseStringPromise('<a><b>text</b><b>text</b></a>');
    expect(linerase(result)).toEqual({
      a : {
        b : [
          'text',
          'text',
        ],
      },
    });
  });

  it('should handle multiply tags deeply', async () => {
    const result = await parseStringPromise('<a><b><c>text</c><d>t</d></b><b><c>text</c><d>t</d></b></a>');
    expect(linerase(result)).toEqual({
      a : {
        b : [
          { c : 'text', d : 't' },
          { c : 'text', d : 't' },
        ],
      },
    });
  });

  it('should deal with numbers', () => {
    expect(linerase({ a : '34.23' })).toEqual({ a : 34.23 });
    expect(linerase({ a : '34' })).toEqual({ a : 34 });
    expect(linerase({ a : '0.34' })).toEqual({ a : 0.34 });
    expect(linerase({ a : '00.34' })).toEqual({ a : '00.34' });
    expect(linerase({ a : '-0.34' })).toEqual({ a : -0.34 });
    expect(linerase({ a : '-12' })).toEqual({ a : -12 });
    expect(linerase({ a : '000' })).toEqual({ a : '000' });
    expect(linerase({ a : '012' })).toEqual({ a : '012' });
  });

  it('should deal with booleans', () => {
    expect(linerase({ a : 'true' })).toEqual({ a : true });
    expect(linerase({ a : 'false' })).toEqual({ a : false });
  });

  it('should deal with datetime and converts it to Date', () => expect(linerase({ a : '2015-01-20T16:33:03Z' })).toEqual({ a : new Date('2015-01-20T16:33:03Z') }));

  it('should handle xml attributes', async () => {
    const result = linerase({
      a : {
        b : {
          $ : { c : 'text', d : 't' },
          e : 'text',
        },
      },
    });
    expect(result).toEqual({ a : { b : { c : 'text', d : 't', e : 'text' } } });
  });
});

describe('GUID function', () => {
  it('should generate GUID', () => expect(guid())
    .toMatch(/^(?:\{{0,1}(?:[0-9a-fA-F]){8}-(?:[0-9a-fA-F]){4}-(?:[0-9a-fA-F]){4}-(?:[0-9a-fA-F]){4}-(?:[0-9a-fA-F]){12}\}{0,1})$/));
});

const SOAPResponse = `
<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope" xmlns:SOAP-ENC="http://www.w3.org/2003/05/soap-encoding" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:chan="http://schemas.microsoft.com/ws/2005/02/duplex" xmlns:wsa5="http://www.w3.org/2005/08/addressing" xmlns:c14n="http://www.w3.org/2001/10/xml-exc-c14n#" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:xenc="http://www.w3.org/2001/04/xmlenc#" xmlns:wsc="http://schemas.xmlsoap.org/ws/2005/02/sc" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:xmime5="http://www.w3.org/2005/05/xmlmime" xmlns:xmime="http://tempuri.org/xmime.xsd" xmlns:xop="http://www.w3.org/2004/08/xop/include" xmlns:tt="http://www.onvif.org/ver10/schema" xmlns:wsrfbf="http://docs.oasis-open.org/wsrf/bf-2" xmlns:wstop="http://docs.oasis-open.org/wsn/t-1" xmlns:wsrfr="http://docs.oasis-open.org/wsrf/r-2" xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns:tev="http://www.onvif.org/ver10/events/wsdl" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:timg="http://www.onvif.org/ver20/imaging/wsdl" xmlns:tmd="http://www.onvif.org/ver10/deviceIO/wsdl" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:ter="http://www.onvif.org/ver10/error" xmlns:tnsaxis="http://www.axis.com/2009/event/topics">
    <SOAP-ENV:Body>
        <tds:GetSystemDateAndTimeResponse>
            <tds:SystemDateAndTime>
                <tt:DateTimeType>Manual</tt:DateTimeType>
                <tt:DaylightSavings>true</tt:DaylightSavings>
                <tt:TimeZone>
                    <tt:TZ>MoroccoStandardTime0</tt:TZ>
                </tt:TimeZone>
                <tt:UTCDateTime>
                    <tt:Time>
                        <tt:Hour>19</tt:Hour>
                        <tt:Minute>14</tt:Minute>
                        <tt:Second>37</tt:Second>
                    </tt:Time>
                    <tt:Date>
                        <tt:Year>2014</tt:Year>
                        <tt:Month>12</tt:Month>
                        <tt:Day>24</tt:Day>
                    </tt:Date>
                </tt:UTCDateTime>
            </tds:SystemDateAndTime>
        </tds:GetSystemDateAndTimeResponse>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;

describe('ParseSOAPString', () => {
  it('should parse a SOAP response', async () => {
    const [result, xml] = await parseSOAPString(SOAPResponse);
    expect(xml).toMatch('xmlns');
    const prettyResult = linerase(result);
    expect(prettyResult).toEqual({
      'getSystemDateAndTimeResponse' : {
        'systemDateAndTime' : {
          'dateTimeType'    : 'Manual',
          'daylightSavings' : true,
          'timeZone'        : { 'TZ' : 'MoroccoStandardTime0' },
          'UTCDateTime'     : {
            'time' : { 'hour' : 19, 'minute' : 14, 'second' : 37 },
            'date' : { 'year' : 2014, 'month' : 12, 'day' : 24 },
          },
        },
      },
    });
  });

  it('should throw an error when it is not a SOAP message', async () => {
    await expect(parseSOAPString('<?xml version="1.0" encoding="UTF-8"?><hi></hi>')).rejects
      .toThrow('Wrong ONVIF SOAP response, not a SOAP message');
  });

  it('should throw an error with the wrong SOAP message', async () => {
    await expect(parseSOAPString('<?xml version="1.0" encoding="UTF-8"?><hi a="1"></hi>')).rejects
      .toThrow('Wrong ONVIF SOAP response, envelope and body are expected');
  });
});

describe('struct', () => {
  it('should return a new object with the keys', () => {
    const list = [{ token : '1' }, { token : '2' }];
    const result = struct(list, 'token');
    expect(Object.keys(result)).toEqual(list.map((obj) => obj.token));
  });
});
