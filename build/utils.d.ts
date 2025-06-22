import { Config, MulticastConfiguration } from './interfaces/onvif';
interface OnvifErrorOptions {
    /**
     * Raw error response from the server
     */
    xml?: string;
}
export declare const xsany = "__any__";
export declare class OnvifError extends Error {
    readonly xml?: string;
    constructor(message: string, options?: OnvifErrorOptions);
}
interface LineraseOptions {
    array: string[];
    rawXML?: string[];
    name?: string;
}
/**
 * Parse SOAP object to pretty JS-object
 * @param xml xml2js object
 * @param options
 * @param options.array these tags will always be treated as arrays
 * @param options.rawXML values of these tags will be in xml2js format
 */
export declare function linerase(xml: any, options?: LineraseOptions): any;
/**
 * Generate GUID
 * @returns {string}
 */
export declare function guid(): string;
export type OnvifResponse = Promise<[Record<string, any>, string]>;
/**
 * @param tagName
 */
export declare function camelCase(tagName: string): string;
/**
 * Parse SOAP response
 * @param xml
 */
export declare function parseSOAPString(xml: string): OnvifResponse;
/**
 * Create a record from the list where the key is commonly used parameter
 * For example, from the profiles array get an object where we can have rapid access to profile using its token
 * @param list
 * @param groupKey
 */
export declare function struct<T, K extends keyof T>(list: T[], groupKey: K): Record<string, T>;
export declare function build(object: any): string;
export declare const toOnvifXMLSchemaObject: {
    multicastConfiguration(multicast: MulticastConfiguration): {
        Address: {
            IPv4Address?: string | undefined;
            Type: import("./interfaces/onvif").IPType;
        };
        Port: number;
        TTL: number;
        AutoStart: boolean;
    };
    config(config: Config): {
        $: {
            Name: string;
            Type: unknown;
        };
        Parameters: {
            Extension?: import("./interfaces/onvif").ItemListExtension | undefined;
            ElementItem?: {
                Name: string;
            }[] | undefined;
            SimpleItem?: {
                $: {
                    Name: string;
                    Value: unknown;
                };
            }[] | undefined;
        };
    };
};
export {};
