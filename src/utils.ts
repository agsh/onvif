import xml2js from 'xml2js';

const numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/;
const dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
const prefixMatch = /(?!xmlns)^.*:/;

/**
 * Parse SOAP object to pretty JS-object
 */
export function linerase(xml: any, options?: { array: string[]; name?: string } | number): any {
  if (typeof options !== 'object') {
    options = { array : [] };
  }
  if (Array.isArray(xml)) {
    if (xml.length === 1 && !options.array.includes(options.name!)) {
      [xml] = xml;
    } else {
      return xml.map((item) => linerase(item, options));
    }
  }
  if (typeof xml === 'object') {
    let obj: any = {};
    Object.keys(xml).forEach((key) => {
      if (key === '$') { // for xml attributes
        obj = {
          ...obj,
          ...linerase(xml.$, options),
        };
      } else {
        obj[key] = linerase(xml[key], { ...options, name : key });
      }
    });
    return obj;
  }
  if (xml === 'true') {
    return true;
  }
  if (xml === 'false') {
    return false;
  }
  if (numberRE.test(xml)) {
    return parseFloat(xml);
  }
  if (dateRE.test(xml)) {
    return new Date(xml);
  }
  return xml;
}

function s4() {
  // eslint-disable-next-line no-bitwise
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

/**
 * Generate GUID
 * @returns {string}
 */
export function guid() {
  return (`${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`);
}

export type CamResponse = Promise<[Record<string, any>, string]>;

/**
 * Parse SOAP response
 */
export async function parseSOAPString(rawXml: string): CamResponse {
  /* Filter out xml name spaces */
  const xml = rawXml.replace(/xmlns([^=]*?)=(".*?")/g, '');

  const result = await xml2js.parseStringPromise(xml, {
    tagNameProcessors : [(tag) => {
      const str = tag.replace(prefixMatch, '');
      const secondLetter = str.charAt(1);
      if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
        return str.charAt(0).toLowerCase() + str.slice(1);
      }
      return str;
    }],
  });
  if (!result || !result.envelope || !result.envelope.body) {
    throw new Error('Wrong ONVIF SOAP response');
  }
  if (result.envelope.body[0].fault) {
    const fault = result.envelope.body[0].fault[0];
    let reason;
    try {
      if (fault.reason[0].text[0]._) {
        reason = fault.reason[0].text[0]._;
      }
    } catch (e) {
      reason = '';
    }
    if (!reason) {
      try {
        reason = JSON.stringify(linerase(fault.code[0]));
      } catch (e) {
        reason = '';
      }
    }
    let detail;
    try {
      [detail] = fault.detail[0].text;
    } catch (e) {
      detail = '';
    }

    // console.error('Fault:', reason, detail);
    throw new Error(`ONVIF SOAP Fault: ${reason}${detail}`);
  }
  return [result.envelope.body, xml];
}
