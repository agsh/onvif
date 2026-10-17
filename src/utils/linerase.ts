import { DATE_RE, NUMBER_RE } from './helpers';

import { camelCase } from './naming';
import { xsany } from './toOnvifXMLSchemaObject';

export interface LineraseOptions {
  array: string[];
  rawXML?: string[];
  name?: string;
}

/**
 * Parse hints for `tt:ItemList` (`SimpleItem` / `ElementItem`).
 * Use on Gets whose result may later go through `itemList()` / `config()`.
 */
export const ITEM_LIST_PARSE: LineraseOptions = {
  array: ['simpleItem', 'elementItem'],
  rawXML: ['elementItem'],
};

/**
 * Parse hints for VideoAnalytics / Rule `Config` lists plus nested ItemList.
 * (`AnalyticsModule` / `Rule` / `SimpleItem` / `ElementItem` are all maxOccurs unbounded.)
 */
export const ANALYTICS_CONFIG_PARSE: LineraseOptions = {
  array: ['analyticsModule', 'rule', 'simpleItem', 'elementItem'],
  rawXML: ['elementItem'],
};

/**
 * Nested analytics / metadata inside one Profile or one Configuration entity.
 * Do not include `configurations` / `profiles` — those are response-list wrappers.
 * `Filter` and `SubscriptionPolicy` are single objects (rawXML only).
 */
export const MEDIA_NESTED_PARSE: LineraseOptions = {
  array: ['analyticsModule', 'rule', 'simpleItem', 'elementItem'],
  rawXML: ['elementItem', 'subscriptionPolicy', 'filter'],
};

/**
 * Media Get*Configurations / GetCompatible* — `Configurations` is unbounded.
 */
export const MEDIA_CONFIGURATION_PARSE: LineraseOptions = {
  array: ['configurations', ...MEDIA_NESTED_PARSE.array],
  rawXML: MEDIA_NESTED_PARSE.rawXML,
};

/**
 * Parse SOAP object to pretty JS-object
 * @param xml xml2js object
 * @param options
 * @param options.array these tags will always be treated as arrays
 * @param options.rawXML values of these tags will be in xml2js format
 */
export function linerase<T = any>(xml: any, options: LineraseOptions = { array: [], rawXML: [] }): T {
  if (options.rawXML === undefined) {
    options.rawXML = [];
  }
  /* if we have xs:any
    put its content on the xsany symbol (non-enumerable)
   */
  if (options.name !== undefined && options.rawXML.includes(options.name)) {
    if (options.array.includes(options.name)) {
      return xml.map((item: any) => {
        const rawXMLObject = linerase(item, { ...options, rawXML: [] });
        Object.defineProperty(rawXMLObject, xsany, {
          value: item,
          writable: true,
          enumerable: false,
          configurable: true,
        });
        return rawXMLObject;
      });
    }
    if (Array.isArray(xml)) {
      [xml] = xml;
    }
    const rawXMLObject = linerase<T>(xml, { ...options, rawXML: [] });
    Object.defineProperty(rawXMLObject, xsany, {
      value: xml,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    return rawXMLObject;
  }

  if (Array.isArray(xml)) {
    /* trim empty nodes in xml
      ex.:
      <Node>
      </Node>
      becomes text node { node: ["\r\n"] }, this is not what we expected
     */
    xml = xml.filter((item) => !(typeof item === 'string' && item.trim() === ''));

    if (
      xml.length === 1 &&
      !options.array.includes(options.name!) /* do not simplify array if its key in array prop */
    ) {
      [xml] = xml;
    } else {
      return xml.map((item: any) => linerase(item, options));
    }
  }
  if (typeof xml === 'object') {
    let obj: any = {};
    Object.keys(xml).forEach((key) => {
      if (key === '$') {
        // for the xml attributes
        obj = {
          ...obj,
          ...linerase(xml.$, options),
        };
      } else {
        obj[camelCase(key)] = linerase(xml[key], { ...options, name: camelCase(key) });
      }
    });
    return obj;
  }
  if (xml === 'true') {
    return true as T;
  }
  if (xml === 'false') {
    return false as T;
  }
  if (NUMBER_RE.test(xml)) {
    return parseFloat(xml) as T;
  }
  if (DATE_RE.test(xml)) {
    return new Date(xml) as T;
  }
  return xml as T;
}
