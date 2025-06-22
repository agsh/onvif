/**
 * Device module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 */
import { Onvif, SetSystemDateAndTimeExtended } from './onvif';
import { DeviceServiceCapabilities, GetCapabilities, GetDeviceInformationResponse, GetServices, GetServicesResponse, Service, SetDNS, SetNetworkInterfaces, SetNetworkInterfacesResponse, SetNTP } from './interfaces/devicemgmt';
import { Capabilities, DNSInformation, HostnameInformation, NetworkInterface, NTPInformation, Scope } from './interfaces/onvif';
import { AnyURI } from './interfaces/basics';
/**
 * Device methods
 */
export declare class Device {
    #private;
    private readonly onvif;
    get services(): Service[];
    media2Support: boolean;
    get scopes(): Scope[];
    get serviceCapabilities(): DeviceServiceCapabilities | undefined;
    get NTP(): NTPInformation | undefined;
    get DNS(): DNSInformation | undefined;
    get networkInterfaces(): NetworkInterface[] | undefined;
    constructor(onvif: Onvif);
    getSystemDateAndTime(): Promise<import("./onvif").SystemDateTimeExtended>;
    setSystemDateAndTime(options: SetSystemDateAndTimeExtended): Promise<import("./onvif").SystemDateTimeExtended>;
    /**
     * Returns information about services of the device.
     */
    getServices({ includeCapability }?: GetServices): Promise<GetServicesResponse>;
    /**
     * This method has been replaced by the more generic {@link Device.getServices | GetServices} method.
     * For capabilities of individual services refer to the GetServiceCapabilities methods.
     * @param options
     * @param options.category
     */
    getCapabilities(options?: GetCapabilities): Promise<Capabilities>;
    /**
     * Receive device information
     */
    getDeviceInformation(): Promise<GetDeviceInformationResponse>;
    /**
     * Receive hostname information
     */
    getHostname(): Promise<HostnameInformation>;
    /**
     * Receive the scope parameters of a device
     */
    getScopes(): Promise<Scope[]>;
    /**
     * Set the scope parameters of a device
     * @param scopes Array of scope's uris
     */
    setScopes(scopes: AnyURI[]): Promise<Scope[]>;
    /**
     * Returns the capabilities of the device service. The result is returned in a typed answer
     */
    getServiceCapabilities(): Promise<DeviceServiceCapabilities>;
    /**
     * This operation reboots the device
     */
    systemReboot(): Promise<string>;
    /**
     * This operation gets the NTP settings from a device. If the device supports NTP, it shall be possible to get the
     * NTP server settings through the GetNTP command.
     */
    getNTP(): Promise<NTPInformation>;
    /**
     * Set the NTP settings on a device
     */
    setNTP(options: SetNTP): Promise<NTPInformation>;
    /**
     * This operation gets the DNS settings from a device. The device shall return its DNS configurations through the
     * GetDNS command.
     */
    getDNS(): Promise<DNSInformation>;
    setDNS(options: SetDNS): Promise<DNSInformation>;
    /**
     * This operation gets the network interface configuration from a device. The device shall support return of network
     * interface configuration settings as defined by the NetworkInterface type through the GetNetworkInterfaces command.
     */
    getNetworkInterfaces(): Promise<NetworkInterface[]>;
    /**
     * Set network interfaces information
     */
    setNetworkInterfaces(options: SetNetworkInterfaces): Promise<SetNetworkInterfacesResponse>;
}
