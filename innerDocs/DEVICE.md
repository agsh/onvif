# Device Management (`devicemgmt.wsdl`)

Legend:

| Column | Meaning |
|--------|---------|
| **Code** | Implemented in `../src/device.ts` |
| **Happytime** | Supported by `__tests__/happytime-onvif-server` |
| **Tests** | Covered in `__tests__/device.test.ts` (or noted otherwise) |

All 103 WSDL operations are implemented. `GetSystemDateAndTime` / `SetSystemDateAndTime` delegate to `Onvif`.

| Operation | Code | Happytime | Tests |
|-----------|:----:|:---------:|:-----:|
| GetServices | x | x | x |
| GetServiceCapabilities | x | x | x |
| GetDeviceInformation | x | x | x |
| GetSystemDateAndTime | x | x | onvif.test |
| SetSystemDateAndTime | x | x | onvif.test |
| SetSystemFactoryDefault | x | x | x |
| UpgradeSystemFirmware | x | x | |
| SystemReboot | x | x | x |
| RestoreSystem | x | | |
| GetSystemBackup | x | | |
| GetSystemLog | x | x | x |
| GetSystemSupportInformation | x | | |
| GetScopes | x | x | x |
| SetScopes | x | x | x |
| AddScopes | x | x | x |
| RemoveScopes | x | x | x |
| GetDiscoveryMode | x | x | x |
| SetDiscoveryMode | x | x | x |
| GetRemoteDiscoveryMode | x | | |
| SetRemoteDiscoveryMode | x | | |
| GetDPAddresses | x | | |
| SetDPAddresses | x | | |
| GetEndpointReference | x | x | x |
| GetUserRoles | x | | |
| SetUserRole | x | | |
| DeleteUserRole | x | | |
| GetRemoteUser | x | x | x |
| SetRemoteUser | x | x | x |
| GetUsers | x | x | x |
| CreateUsers | x | x | x |
| DeleteUsers | x | x | x |
| SetUser | x | x | |
| GetWsdlUrl | x | x | x |
| GetPasswordComplexityOptions | x | | |
| GetPasswordComplexityConfiguration | x | | |
| SetPasswordComplexityConfiguration | x | | |
| GetPasswordHistoryConfiguration | x | | |
| SetPasswordHistoryConfiguration | x | | |
| GetAuthFailureWarningOptions | x | | |
| GetAuthFailureWarningConfiguration | x | | |
| SetAuthFailureWarningConfiguration | x | | |
| GetCapabilities | x | x | x |
| GetHostname | x | x | x |
| SetHostname | x | x | x |
| SetHostnameFromDHCP | x | x | x |
| GetDNS | x | x | x |
| SetDNS | x | x | x |
| GetNTP | x | x | x |
| SetNTP | x | x | x |
| GetDynamicDNS | x | x | x |
| SetDynamicDNS | x | x | x |
| GetNetworkInterfaces | x | x | x |
| SetNetworkInterfaces | x | x | x |
| GetNetworkProtocols | x | x | x |
| SetNetworkProtocols | x | x | x |
| GetNetworkDefaultGateway | x | x | x |
| SetNetworkDefaultGateway | x | x | x |
| GetZeroConfiguration | x | x | x |
| SetZeroConfiguration | x | x | x |
| GetIPAddressFilter | x | x | x |
| SetIPAddressFilter | x | x | x |
| AddIPAddressFilter | x | x | x |
| RemoveIPAddressFilter | x | x | x |
| GetAccessPolicy | x | | |
| SetAccessPolicy | x | | |
| CreateCertificate | x | | |
| GetCertificates | x | x | x |
| GetCertificatesStatus | x | x | x |
| SetCertificatesStatus | x | | |
| DeleteCertificates | x | | |
| GetPkcs10Request | x | | |
| LoadCertificates | x | | |
| GetClientCertificateMode | x | | |
| SetClientCertificateMode | x | | |
| GetCACertificates | x | | |
| LoadCertificateWithPrivateKey | x | | |
| GetCertificateInformation | x | | |
| LoadCACertificates | x | | |
| CreateDot1XConfiguration | x | | |
| SetDot1XConfiguration | x | | |
| GetDot1XConfiguration | x | | |
| GetDot1XConfigurations | x | | |
| DeleteDot1XConfiguration | x | | |
| GetRelayOutputs | x | x | x |
| SetRelayOutputSettings | x | x | x |
| SetRelayOutputState | x | x | x |
| SendAuxiliaryCommand | x | | |
| GetDot11Capabilities | x | x | x |
| GetDot11Status | x | x | x |
| ScanAvailableDot11Networks | x | x | x |
| GetSystemUris | x | x | x |
| StartFirmwareUpgrade | x | x | x |
| UpgradeFirmware | x | | |
| StartSystemRestore | x | x | x |
| SetHashingAlgorithm | x | x | x |
| GetStorageConfigurations | x | x | x |
| CreateStorageConfiguration | x | x | x |
| GetStorageConfiguration | x | x | x |
| SetStorageConfiguration | x | x | x |
| DeleteStorageConfiguration | x | x | x |
| GetGeoLocation | x | x | x |
| SetGeoLocation | x | x | x |
| DeleteGeoLocation | x | x | x |

**Summary:** 103/103 in code · 62/103 on happytime · 53/103 in `device.test.ts` (+2 date/time in `onvif.test.ts`)
