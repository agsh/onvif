import { NCName, AnyURI } from './basics';
import { PositiveInteger } from './types';
import { DeviceEntity, StringList, Date } from './onvif';
import { ReferenceToken } from './common';

/** Unique identifier for keys in the keystore. */
export type KeyID = NCName;
/** Unique identifier for certificates in the keystore. */
export type CertificateID = NCName;
/** Unique identifier for certification paths in the keystore. */
export type CertificationPathID = NCName;
/** Unique identifier for passphrases in the keystore. */
export type PassphraseID = NCName;
/** Unique identifier for 802.1X configurations in the keystore. */
export type Dot1XID = NCName;
/** The status of a key in the keystore. */
export type KeyStatus = 'ok' | 'generating' | 'corrupt';
/** An object identifier (OID) in dot-decimal form as specified in RFC4512. */
export type DotDecimalOID = string;
/** The distinguished name attribute type encoded as specified in RFC 4514. */
export type DNAttributeType = string;
export type DNAttributeValue = string;
/** A base64-encoded ASN.1 value. */
export type Base64DERencodedASN1Value = unknown;
/** A list of supported 802.1X authentication methods, such as "EAP-PEAP/MSCHAPv2" and "EAP-MD5".  The '/' character is used as a separator between the outer and inner methods. */
export type Dot1XMethods = string[];
export type CRLID = NCName;
export type CertPathValidationPolicyID = NCName;
/** A list of RSA key lenghts in bits. */
export type RSAKeyLengths = number[];
/** A list of elliptic curves. */
export type EllipticCurves = string[];
/** A list of X.509 versions. */
export type X509Versions = number[];
/** A list of TLS versions. */
export type TLSVersions = string[];
/** A list of password based encryption algorithms. */
export type PasswordBasedEncryptionAlgorithms = string[];
/** A list of password based MAC algorithms. */
export type PasswordBasedMACAlgorithms = string[];
export type AuthorizationServerConfigurationType =
  | 'OAuthAuthorizationCode'
  | 'OAuthClientCredentials'
  | 'OIDC2AuthorizationCode';
/** Client Authentication methods listed are referenced from  IANA OAuth Token Endpoint Authentication Methods. */
export type ClientAuthenticationMethod =
  | 'client_secret_basic'
  | 'client_secret_post'
  | 'client_secret_jwt'
  | 'private_key_jwt'
  | 'tls_client_auth'
  | 'self_signed_tls_client_auth';
export interface Extension {}
/** The attributes of a key in the keystore. */
export interface KeyAttribute {
  /** The ID of the key. */
  keyID?: KeyID;
  /** The client-defined alias of the key. */
  alias?: string;
  /** Absent if the key is not a key pair. True if and only if the key is a key pair and contains a private key. False if and only if the key is a key pair and does not contain a private key. */
  hasPrivateKey?: boolean;
  /** The status of the key. The value should be one of the values in the tas:KeyStatus enumeration. */
  keyStatus?: string;
  /** True if and only if the key was generated outside the device. */
  externallyGenerated?: boolean;
  /** True if and only if the key is stored in a specially protected hardware component inside the device. */
  securelyStored?: boolean;
  extension?: Extension;
}
/** A distinguished name attribute type and value pair. */
export interface DNAttributeTypeAndValue {
  /** The attribute type. */
  type?: DNAttributeType;
  /** The value of the attribute. */
  value?: DNAttributeValue;
}
/** A multi-valued RDN */
export interface MultiValuedRDN {
  /** A list of types and values defining a multi-valued RDN */
  attribute?: DNAttributeTypeAndValue[];
}
export interface anyAttribute {
  /** Domain Component as specified in RFC3739 */
  domainComponent?: DNAttributeValue[];
}
export interface DistinguishedName {
  /**
   * A country name as specified in
   * X.500.
   */
  country?: DNAttributeValue[];
  /**
   * An organization name as specified in
   * X.500.
   */
  organization?: DNAttributeValue[];
  /**
   * An organizational unit name as specified in
   * X.500.
   */
  organizationalUnit?: DNAttributeValue[];
  /**
   * A distinguished name qualifier as specified in
   * X.500.
   */
  distinguishedNameQualifier?: DNAttributeValue[];
  /**
   * A state or province name as specified in
   * X.500.
   */
  stateOrProvinceName?: DNAttributeValue[];
  /**
   * A common name as specified in
   * X.500.
   */
  commonName?: DNAttributeValue[];
  /**
   * A serial number as specified in
   * X.500.
   */
  serialNumber?: DNAttributeValue[];
  /** A locality as specified in X.500. */
  locality?: DNAttributeValue[];
  /** A title as specified in X.500. */
  title?: DNAttributeValue[];
  /** A surname as specified in X.500. */
  surname?: DNAttributeValue[];
  /** A given name as specified in X.500. */
  givenName?: DNAttributeValue[];
  /** Initials as specified in X.500. */
  initials?: DNAttributeValue[];
  /** A pseudonym as specified in X.500. */
  pseudonym?: DNAttributeValue[];
  /**
   * A generation qualifier as specified in
   * X.500.
   */
  generationQualifier?: DNAttributeValue[];
  /**
   * A generic type-value pair
   * attribute.
   */
  genericAttribute?: DNAttributeTypeAndValue[];
  /** A multi-valued RDN */
  multiValuedRDN?: MultiValuedRDN[];
  /** Required extension point. It is recommended to not use this element, and instead use GenericAttribute and the numeric Distinguished Name Attribute Type. */
  anyAttribute?: anyAttribute;
}
export interface anyParameters {}
/** An identifier of an algorithm. */
export interface AlgorithmIdentifier {
  /** The OID of the algorithm in dot-decimal form. */
  algorithm?: DotDecimalOID;
  /** Optional parameters of the algorithm (depending on the algorithm). */
  parameters?: Base64DERencodedASN1Value;
  anyParameters?: anyParameters;
}
/** A CSR attribute as specified in RFC 2986. */
export interface BasicRequestAttribute {
  /** The OID of the attribute. */
  OID?: DotDecimalOID;
  /** The value of the attribute as a base64-encoded DER representation of an ASN.1 value. */
  value?: Base64DERencodedASN1Value;
}
/** A CSR attribute as specified in PKCS#10. */
export interface CSRAttribute {}
/** An X.509v3 extension field as specified in RFC 5280 */
export interface X509v3Extension {
  /** The OID of the extension field. */
  extnOID?: DotDecimalOID;
  /** True if and only if the extension is critical. */
  critical?: boolean;
  /** The value of the extension field as a base64-encoded DER representation of an ASN.1 value. */
  extnValue?: Base64DERencodedASN1Value;
}
/** An X.509 cerficiate as specified in RFC 5280. */
export interface X509Certificate {
  /** The ID of the certificate. */
  certificateID?: CertificateID;
  /** The ID of the key that this certificate associates to the certificate subject. */
  keyID?: KeyID;
  /** The client-defined alias of the certificate. */
  alias?: string;
  /** The base64-encoded DER representation of the X.509 certificate. */
  certificateContent?: Base64DERencodedASN1Value;
}
/** A sequence of certificate IDs. */
export interface CertificateIDs {
  /** A certificate ID. */
  certificateID?: CertificateID[];
}
export interface anyElement {}
/** An X.509 certification path as defined in RFC 5280. */
export interface CertificationPath {
  /** A certificate in the certification path. */
  certificateID?: CertificateID[];
  /** The client-defined alias of the certification path. */
  alias?: string;
  anyElement?: anyElement;
}
export interface PassphraseAttribute {
  /** The ID of the passphrase. */
  passphraseID?: PassphraseID;
  /** The alias of the passphrase. */
  alias?: string;
}
/** The capabilities of the 802.1X implementation on a device. */
export interface Dot1XCapabilities {
  /** The maximum number of 802.1X configurations that may be defined simultaneously. */
  maximumNumberOfDot1XConfigurations?: PositiveInteger;
  /** The authentication methods supported by the 802.1X implementation. */
  dot1XMethods?: Dot1XMethods;
}
/** The configuration parameters required for a particular authentication method. */
export interface Dot1XStage {
  /** The authentication method for this stage (e.g., "EAP-PEAP"). */
  method: string;
  /** The identity used in this authentication method, if required. */
  identity?: string;
  /** The unique identifier of the certification path used in this authentication method, if required. */
  certificationPathID?: CertificationPathID;
  /** The identifier for the password used in this authentication method, if required.  If Identity is used as an anonymous identity for this authentication method, PassphraseID is ignored. */
  passphraseID?: PassphraseID;
  /** The configuration of the next stage of authentication, if required. */
  inner?: Dot1XStage;
  extension?: Dot1XStageExtension;
}
export interface Dot1XStageExtension {}
export interface Dot1XConfiguration {
  /** The unique identifier of the IEEE 802.1X configuration. */
  dot1XID?: Dot1XID;
  /** The client-defined alias of the 802.1X configuration. */
  alias?: string;
  /** The outer level authentication method used in this 802.1X configuration. */
  outer?: Dot1XStage;
}
export interface CRL {
  CRLID?: CRLID;
  alias?: string;
  CRLContent?: Base64DERencodedASN1Value;
}
export interface CertPathValidationParameters {
  /** True if and only if the TLS server shall not authenticate client certificates that do not contain the TLS WWW client authentication key usage extension as specified in RFC 5280, Sect. 4.2.1.12. */
  requireTLSWWWClientAuthExtendedKeyUsage?: boolean;
  /** True if and only if delta CRLs, if available, shall be applied to CRLs. */
  useDeltaCRLs?: boolean;
  anyParameters?: anyParameters;
}
export interface TrustAnchor {
  /** The certificate ID of the certificate to be used as trust anchor. */
  certificateID?: CertificateID;
}
export interface CertPathValidationPolicy {
  certPathValidationPolicyID?: CertPathValidationPolicyID;
  alias?: string;
  parameters?: CertPathValidationParameters;
  trustAnchor?: TrustAnchor[];
  anyParameters?: anyParameters;
}
/** The capabilities of a keystore implementation on a device. */
export interface KeystoreCapabilities {
  /** Indicates the maximum number of keys that the device can store simultaneously. */
  maximumNumberOfKeys?: PositiveInteger;
  /** Indicates the maximum number of certificates that the device can store simultaneously. */
  maximumNumberOfCertificates?: PositiveInteger;
  /** Indicates the maximum number of certification paths that the device can store simultaneously. */
  maximumNumberOfCertificationPaths?: PositiveInteger;
  /** Indication that the device supports on-board RSA key pair generation. */
  RSAKeyPairGeneration?: boolean;
  /** Indication that the device supports on-board ECC key pair generation. */
  ECCKeyPairGeneration?: boolean;
  /** Indicates which RSA key lengths are supported by the device. */
  RSAKeyLengths?: RSAKeyLengths;
  /** Indicates which elliptic curves are supported by the device. */
  ellipticCurves?: EllipticCurves;
  /** Indicates support for creating PKCS#10 requests for RSA keys and uploading the certificate obtained from a CA.. */
  PKCS10ExternalCertificationWithRSA?: boolean;
  /** Indicates support for creating PKCS#10 requests for keypairs and uploading the certificate obtained from a CA. */
  PKCS10?: boolean;
  /** Indicates support for creating self-signed certificates for RSA keys. */
  selfSignedCertificateCreationWithRSA?: boolean;
  /** Indicates support for creating self-signed certificates. */
  selfSignedCertificateCreation?: boolean;
  /** Indicates which X.509 versions are supported by the device. */
  X509Versions?: X509Versions;
  /** Indicates the maximum number of passphrases that the device is able to store simultaneously. */
  maximumNumberOfPassphrases?: number;
  /** Indicates support for uploading an RSA key pair in a PKCS#8 data structure. */
  PKCS8RSAKeyPairUpload?: boolean;
  /** Indicates support for uploading a key pair in a PKCS#8 data structure. */
  PKCS8?: boolean;
  /** Indicates support for uploading a certificate along with an RSA private key in a PKCS#12 data structure. */
  PKCS12CertificateWithRSAPrivateKeyUpload?: boolean;
  /** Indicates support for uploading a certificate along with a private key in a PKCS#12 data structure. */
  PKCS12?: boolean;
  /** Indicates which password-based encryption algorithms are supported by the device. */
  passwordBasedEncryptionAlgorithms?: PasswordBasedEncryptionAlgorithms;
  /** Indicates which password-based MAC algorithms are supported by the device. */
  passwordBasedMACAlgorithms?: PasswordBasedMACAlgorithms;
  /** Indicates the maximum number of CRLs that the device is able to store simultaneously. */
  maximumNumberOfCRLs?: number;
  /** Indicates the maximum number of certification path validation policies that the device is able to store simultaneously. */
  maximumNumberOfCertificationPathValidationPolicies?: number;
  /** Indicates whether a device supports checking for the TLS WWW client auth extended key usage extension while validating certification paths. */
  enforceTLSWebClientAuthExtKeyUsage?: boolean;
  /** Indicates the device requires that each certificate with private key has its own unique key. */
  noPrivateKeySharing?: boolean;
  /** The signature algorithms supported by the keystore implementation. */
  signatureAlgorithms?: AlgorithmIdentifier[];
  anyElement?: anyElement;
}
/** The capabilities of a TLS server implementation on a device. */
export interface TLSServerCapabilities {
  /** Indicates which TLS versions are supported by the device. */
  TLSServerSupported?: TLSVersions;
  /** Indicates whether the device supports enabling and disabling specific TLS versions. */
  enabledVersionsSupported?: boolean;
  /** Indicates the maximum number of certification paths that may be assigned to the TLS server simultaneously. */
  maximumNumberOfTLSCertificationPaths?: PositiveInteger;
  /** Indicates whether the device supports TLS client authentication. */
  TLSClientAuthSupported?: boolean;
  /** Indicates whether the device supports TLS client authorization using common name to local user mapping. */
  cnMapsToUserSupported?: boolean;
  /** Indicates the maximum number of certification path validation policies that may be assigned to the TLS server simultaneously. */
  maximumNumberOfTLSCertificationPathValidationPolicies?: number;
}
export interface AuthorizationServerConfigurationData {
  /** The type of configuration, tas:AuthorizationServerConfigurationType lists the acceptable values */
  type: string;
  /** How to authenticate with the server, tas:ClientAuthenticationMethod lists the acceptable values */
  clientAuth?: string;
  /** Authorization server address */
  serverUri?: AnyURI;
  /** Client identifier issued by the authorization server */
  clientID?: string;
  /** Client secret used to authenticate with the authorization server */
  clientSecret?: string;
  /** The requested access scope(s) */
  scope?: string;
  /** Key identifier for the private_key_jwt authentication method */
  keyID?: KeyID;
  /** Certificate identifier for the self_signed_tls_client_auth authentication method */
  certificateID?: CertificateID;
}
export interface AuthorizationServerConfiguration extends DeviceEntity {
  data?: AuthorizationServerConfigurationData;
}
export interface AuthorizationServerConfigurationCapabilities {
  /** Indicates maximum number of authorization server configurations supported. */
  maxConfigurations?: number;
  /** Enumerates the supported authorization server configuration types, see tas:AuthorizationServerConfigurationType. */
  configurationTypesSupported?: StringList;
  /** Enumerates the supported client authentication methods, see tas:ClientAuthenticationMethod. */
  clientAuthenticationMethodsSupported?: StringList;
}
/** The capabilities of a Security Configuration Service implementation on a device. */
export interface Capabilities {
  /** The capabilities of the keystore implementation. */
  keystoreCapabilities?: KeystoreCapabilities;
  /** The capabilities of the TLS server implementation. */
  TLSServerCapabilities?: TLSServerCapabilities;
  /** The capabilities of the 802.1X implementation. */
  dot1XCapabilities?: Dot1XCapabilities;
  /** The capabilities for external authorization server capabilities. */
  authorizationServer?: AuthorizationServerConfigurationCapabilities;
}
export interface JWTConfiguration {
  /** The list of all the aud claims, which the recipient identifies with. */
  audiences?: StringList;
  /** If present, this is the list to URIs pointing to the metadata file conforming to RFC8414, such as "https://your.domain/.well-known/openid-configuration" , of the trusted Open ID Connect servers issuing JWT tokens. Using metadata, the device can reach the information about the JWKS and implement the rotation of the keys accordingly. */
  trustedIssuers?: AnyURI[];
  /** If present, this is the list of keys provided out of band to verify the origin and integrity of the JWT. */
  keyID?: KeyID[];
  /** If present, the device will validate the certification path of the Open ID Connect servers. The OIDC server iso considered to be valid if its certificate is validated by one of the provided certification path validation policies. */
  validationPolicy?: CertPathValidationPolicyID[];
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the security configuration service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface GetJWTConfiguration {}
export interface GetJWTConfigurationResponse {
  configuration?: JWTConfiguration;
}
export interface SetJWTConfiguration {
  configuration?: JWTConfiguration;
}
export interface SetJWTConfigurationResponse {}
export interface CreateRSAKeyPair {
  /** The length of the key to be created. */
  keyLength?: number;
  /** The client-defined alias of the key. */
  alias?: string;
}
export interface CreateRSAKeyPairResponse {
  /** The key ID of the key pair being generated. */
  keyID?: KeyID;
  /** Best-effort estimate of how long the key generation will take. */
  estimatedCreationTime?: string;
}
export interface CreateECCKeyPair {
  /** The name of the elliptic curve to be used for generating the ECC keypair. */
  ellipticCurve?: string;
  /** The client-defined alias of the key. */
  alias?: string;
}
export interface CreateECCKeyPairResponse {
  /** The key ID of the key pair being generated. */
  keyID?: KeyID;
  /** Best-effort estimate of how long the key generation will take. */
  estimatedCreationTime?: string;
}
export interface UploadKeyPairInPKCS8 {
  /** The key pair to be uploaded in a PKCS#8 data structure. */
  keyPair?: Base64DERencodedASN1Value;
  /** The client-defined alias of the key pair. */
  alias?: string;
  /** The ID of the passphrase to use for decrypting the uploaded key pair. */
  encryptionPassphraseID?: PassphraseID;
  /** The passphrase to use for decrypting the uploaded key pair. */
  encryptionPassphrase?: string;
}
export interface UploadKeyPairInPKCS8Response {
  /** The key ID of the uploaded key pair. */
  keyID?: KeyID;
}
export interface UploadCertificateWithPrivateKeyInPKCS12 {
  /** The certificates and key pair to be uploaded in a PKCS#12 data structure. */
  certWithPrivateKey?: Base64DERencodedASN1Value;
  /** The client-defined alias of the certification path. */
  certificationPathAlias?: string;
  /** The client-defined alias of the key pair. */
  keyAlias?: string;
  /** True if and only if the device shall behave as if the client had only supplied the first certificate in the sequence of certificates. */
  ignoreAdditionalCertificates?: boolean;
  /** The ID of the passphrase to use for integrity checking of the uploaded PKCS#12 data structure. */
  integrityPassphraseID?: PassphraseID;
  /** The ID of the passphrase to use for decrypting the uploaded PKCS#12 data structure. */
  encryptionPassphraseID?: PassphraseID;
  /** The passphrase to use for integrity checking and decrypting the uploaded PKCS#12 data structure. */
  passphrase?: string;
}
export interface UploadCertificateWithPrivateKeyInPKCS12Response {
  /** The certification path ID of the uploaded certification path. */
  certificationPathID?: CertificationPathID;
  /** The key ID of the uploaded key pair. */
  keyID?: KeyID;
}
export interface GetKeyStatus {
  /** The ID of the key for which to return the status. */
  keyID?: KeyID;
}
export interface GetKeyStatusResponse {
  /** Status of the requested key. The value should be one of the values in the tas:KeyStatus enumeration. */
  keyStatus?: string;
}
export interface GetPrivateKeyStatus {
  /** The ID of the key pair for which to return whether it contains a private key. */
  keyID?: KeyID;
}
export interface GetPrivateKeyStatusResponse {
  /** True if and only if the key pair contains a private key. */
  hasPrivateKey?: boolean;
}
export interface GetAllKeys {}
export interface GetAllKeysResponse {
  /** Information about a key in the keystore. */
  keyAttribute?: KeyAttribute[];
}
export interface DeleteKey {
  /** The ID of the key that is to be deleted from the keystore. */
  keyID?: KeyID;
}
export interface DeleteKeyResponse {}
export interface CreatePKCS10CSR {
  /** The subject to be included in the CSR. */
  subject?: DistinguishedName;
  /** The ID of the key for which the CSR shall be created. */
  keyID?: KeyID;
  /** An attribute to be included in the CSR. */
  CSRAttribute?: CSRAttribute[];
  /** The signature algorithm to be used to sign the CSR. */
  signatureAlgorithm?: AlgorithmIdentifier;
}
export interface CreatePKCS10CSRResponse {
  /** The DER encoded PKCS#10 certification request. */
  PKCS10CSR?: Base64DERencodedASN1Value;
}
export interface CreateSelfSignedCertificate {
  /** The X.509 version that the generated certificate shall comply to. */
  X509Version?: PositiveInteger;
  /** Distinguished name of the entity that the certificate shall belong to. */
  subject?: DistinguishedName;
  /** The ID of the key for which the certificate shall be created. */
  keyID?: KeyID;
  /** The client-defined alias of the certificate to be created. */
  alias?: string;
  /** The X.509 not valid before information to be included in the certificate. Defaults to the device's current time or a time before the device's current time. */
  notValidBefore?: Date;
  /** The X.509 not valid after information to be included in the certificate. Defaults to the time 99991231235959Z as specified in RFC 5280. */
  notValidAfter?: Date;
  /** The signature algorithm to be used for signing the certificate. */
  signatureAlgorithm?: AlgorithmIdentifier;
  /** An X.509v3 extension to be included in the certificate. */
  extension?: X509v3Extension[];
}
export interface CreateSelfSignedCertificateResponse {
  /** The ID of the generated certificate. */
  certificateID?: CertificateID;
}
export interface UploadCertificate {
  /** The base64-encoded DER representation of the X.509 certificate to be uploaded. */
  certificate?: Base64DERencodedASN1Value;
  /** The client-defined alias of the certificate. */
  alias?: string;
  /** The client-defined alias of the key pair. */
  keyAlias?: string;
  /** Indicates if the device shall verify that a matching key pair with a private key exists in the keystore. */
  privateKeyRequired?: boolean;
}
export interface UploadCertificateResponse {
  /** The ID of the uploaded certificate. */
  certificateID?: CertificateID;
  /** The ID of the key that the uploaded certificate certifies. */
  keyID?: KeyID;
}
export interface GetCertificate {
  /** The ID of the certificate to retrieve. */
  certificateID?: CertificateID;
}
export interface GetCertificateResponse {
  /** The DER representation of the certificate. */
  certificate?: X509Certificate;
}
export interface GetAllCertificates {}
/** A list with all certificates stored in the keystore. */
export interface GetAllCertificatesResponse {
  /** A certificate stored in the keystore. */
  certificate?: X509Certificate[];
}
export interface DeleteCertificate {
  /** The ID of the certificate to delete. */
  certificateID?: CertificateID;
}
export interface DeleteCertificateResponse {}
export interface CreateCertificationPath {
  /** The IDs of the certificates to include in the certification path, where each certificate signature except for the last one in the path must be verifiable with the public key certified by the next certificate in the path. */
  certificateIDs?: CertificateIDs;
  /** The client-defined alias of the certification path. */
  alias?: string;
}
export interface CreateCertificationPathResponse {
  /** The ID of the generated certification path. */
  certificationPathID?: CertificationPathID;
}
export interface GetCertificationPath {
  /** The ID of the certification path to retrieve. */
  certificationPathID?: CertificationPathID;
}
export interface GetCertificationPathResponse {
  /** The certification path that is stored under the given ID in the keystore. */
  certificationPath?: CertificationPath;
}
export interface GetAllCertificationPaths {}
export interface GetAllCertificationPathsResponse {
  /** An ID of a certification path in the keystore. */
  certificationPathID?: CertificationPathID[];
}
export interface DeleteCertificationPath {
  /** The ID of the certification path to delete. */
  certificationPathID?: CertificationPathID;
}
export interface DeleteCertificationPathResponse {}
export interface UploadPassphrase {
  /** The passphrase to upload. */
  passphrase?: string;
  /** The alias for the passphrase to upload. */
  passphraseAlias?: string;
}
export interface UploadPassphraseResponse {
  /** The PassphraseID of the uploaded passphrase. */
  passphraseID?: PassphraseID;
}
export interface GetAllPassphrases {}
export interface GetAllPassphrasesResponse {
  /** Information about a passphrase in the keystore. */
  passphraseAttribute?: PassphraseAttribute[];
}
export interface DeletePassphrase {
  /** The ID of the passphrase that is to be deleted from the keystore. */
  passphraseID?: PassphraseID;
}
export interface DeletePassphraseResponse {}
export interface AddServerCertificateAssignment {
  certificationPathID?: CertificationPathID;
}
export interface AddServerCertificateAssignmentResponse {}
export interface RemoveServerCertificateAssignment {
  certificationPathID?: CertificationPathID;
}
export interface RemoveServerCertificateAssignmentResponse {}
export interface ReplaceServerCertificateAssignment {
  oldCertificationPathID?: CertificationPathID;
  newCertificationPathID?: CertificationPathID;
}
export interface ReplaceServerCertificateAssignmentResponse {}
export interface GetAssignedServerCertificates {}
export interface GetAssignedServerCertificatesResponse {
  /** The IDs of all certification paths that are assigned to the TLS server on the device. */
  certificationPathID?: CertificationPathID[];
}
export interface SetEnabledTLSVersions {
  /** List of TLS versions to allow. */
  versions?: TLSVersions;
}
export interface SetEnabledTLSVersionsResponse {}
export interface GetEnabledTLSVersions {}
export interface GetEnabledTLSVersionsResponse {
  /** List of allowed TLS versions. */
  versions?: TLSVersions;
}
export interface UploadCRL {
  /** The CRL to be uploaded to the device. */
  crl?: Base64DERencodedASN1Value;
  /** The alias to assign to the uploaded CRL. */
  alias?: string;
  anyParameters?: anyParameters;
}
export interface UploadCRLResponse {
  /** The ID of the uploaded CRL. */
  crlID?: CRLID;
}
export interface GetCRL {
  /** The ID of the CRL to be returned. */
  crlID?: CRLID;
}
export interface GetCRLResponse {
  /** The CRL with the requested ID. */
  crl?: CRL;
}
export interface GetAllCRLs {}
export interface GetAllCRLsResponse {
  /** A list of all CRLs that are stored in the keystore on the device. */
  crl?: CRL[];
}
export interface DeleteCRL {
  /** The ID of the CRL to be deleted. */
  crlID?: CRLID;
}
export interface DeleteCRLResponse {}
export interface CreateCertPathValidationPolicy {
  /** The alias to assign to the created certification path validation policy. */
  alias?: string;
  /** The parameters of the certification path validation policy to be created. */
  parameters?: CertPathValidationParameters;
  /** The trust anchors of the certification path validation policy to be created. */
  trustAnchor?: TrustAnchor[];
  anyParameters?: anyParameters;
}
export interface CreateCertPathValidationPolicyResponse {
  /** The ID of the created certification path validation policy. */
  certPathValidationPolicyID?: CertPathValidationPolicyID;
}
export interface GetCertPathValidationPolicy {
  /** The ID of the certification path validation policy to be created. */
  certPathValidationPolicyID?: CertPathValidationPolicyID;
}
export interface GetCertPathValidationPolicyResponse {
  /** The certification path validation policy that is stored under the requested ID. */
  certPathValidationPolicy?: CertPathValidationPolicy;
}
export interface GetAllCertPathValidationPolicies {}
export interface GetAllCertPathValidationPoliciesResponse {
  /** A list of all certification path validation policies that are stored in the keystore on the device. */
  certPathValidationPolicy?: CertPathValidationPolicy[];
}
export interface DeleteCertPathValidationPolicy {
  /** The ID of the certification path validation policy to be deleted. */
  certPathValidationPolicyID?: CertPathValidationPolicyID;
}
export interface DeleteCertPathValidationPolicyResponse {}
export interface SetClientAuthenticationRequired {
  clientAuthenticationRequired?: boolean;
}
export interface SetClientAuthenticationRequiredResponse {}
export interface GetClientAuthenticationRequired {}
export interface GetClientAuthenticationRequiredResponse {
  clientAuthenticationRequired?: boolean;
}
export interface SetCnMapsToUser {
  cnMapsToUser?: boolean;
}
export interface SetCnMapsToUserResponse {}
export interface GetCnMapsToUser {}
export interface GetCnMapsToUserResponse {
  cnMapsToUser?: boolean;
}
export interface AddCertPathValidationPolicyAssignment {
  /** The ID of the certification path validation policy to assign to the TLS server. */
  certPathValidationPolicyID?: CertPathValidationPolicyID;
}
export interface AddCertPathValidationPolicyAssignmentResponse {}
export interface RemoveCertPathValidationPolicyAssignment {
  /** The ID of the certification path validation policy to de-assign from the TLS server. */
  certPathValidationPolicyID?: CertPathValidationPolicyID;
}
export interface RemoveCertPathValidationPolicyAssignmentResponse {}
export interface ReplaceCertPathValidationPolicyAssignment {
  /** The ID of the certification path validation policy to be de-assigned from the TLS server. */
  oldCertPathValidationPolicyID?: CertPathValidationPolicyID;
  /** The ID of the certification path validation policy to assign to the TLS server. */
  newCertPathValidationPolicyID?: CertPathValidationPolicyID;
}
export interface ReplaceCertPathValidationPolicyAssignmentResponse {}
export interface GetAssignedCertPathValidationPolicies {}
export interface GetAssignedCertPathValidationPoliciesResponse {
  /** A list of IDs of the certification path validation policies that are assigned to the TLS server. */
  certPathValidationPolicyID?: CertPathValidationPolicyID[];
}
export interface AddDot1XConfiguration {
  /** The desired 802.1X configuration. */
  dot1XConfiguration?: Dot1XConfiguration;
}
export interface AddDot1XConfigurationResponse {
  /** The unique identifier of the created 802.1X configuration. */
  dot1XID?: Dot1XID;
}
export interface GetAllDot1XConfigurations {}
export interface GetAllDot1XConfigurationsResponse {
  /** The list of unique identifiers of 802.1X configurations on the device. */
  configuration?: Dot1XConfiguration[];
}
export interface GetDot1XConfiguration {
  /** The unique identifier of the desired 802.1X configuration. */
  dot1XID?: Dot1XID;
}
export interface GetDot1XConfigurationResponse {
  /** The 802.1X configuration, without password information. */
  dot1XConfiguration?: Dot1XConfiguration;
}
export interface DeleteDot1XConfiguration {
  /** The unique identifier of the 802.1X configuration to be deleted. */
  dot1XID?: Dot1XID;
}
export interface DeleteDot1XConfigurationResponse {}
export interface SetNetworkInterfaceDot1XConfiguration {
  /** The unique identifier of the Network Interface on which the 802.1X configuration is to be set. (NOTE: the network interface token is defined in devicemgmt.wsdl as tt:ReferenceToken, which is a derived type of xs:string.  To avoid importing all of common.xsd for this single type, the base type is used here.) */
  token?: string;
  /** The unique identifier of the 802.1X configuration to be set. */
  dot1XID?: Dot1XID;
}
export interface SetNetworkInterfaceDot1XConfigurationResponse {
  /** Indicates whether or not a reboot is required after configuration updates. */
  rebootNeeded?: boolean;
}
export interface GetNetworkInterfaceDot1XConfiguration {
  /** The unique identifier of the Network Interface for which the 802.1X configuration is to be retrieved. (NOTE: the network interface token is defined in devicemgmt.wsdl as tt:ReferenceToken, which is a derived type of xs:string.  To avoid importing all of common.xsd for this single type, the base type is used here.) */
  token?: string;
}
export interface GetNetworkInterfaceDot1XConfigurationResponse {
  /** The unique identifier of 802.1X configuration assigned to the Network Interface. */
  dot1XID?: Dot1XID;
}
export interface DeleteNetworkInterfaceDot1XConfiguration {
  /** The unique identifier of the Network Interface for which the 802.1X configuration is to be deleted. (NOTE: the network interface token is defined in devicemgmt.wsdl as tt:ReferenceToken, which is a derived type of xs:string.  To avoid importing all of common.xsd for this single type, the base type is used here.) */
  token?: string;
}
export interface DeleteNetworkInterfaceDot1XConfigurationResponse {
  /** Indicates whether or not a reboot is required after configuration updates. */
  rebootNeeded?: boolean;
}
export interface GetAuthorizationServerConfigurations {
  token?: ReferenceToken;
}
export interface GetAuthorizationServerConfigurationsResponse {
  configuration?: AuthorizationServerConfiguration[];
}
export interface CreateAuthorizationServerConfiguration {
  configuration?: AuthorizationServerConfigurationData;
}
export interface CreateAuthorizationServerConfigurationResponse {
  token?: ReferenceToken;
}
export interface SetAuthorizationServerConfiguration {
  configuration?: AuthorizationServerConfiguration;
}
export interface SetAuthorizationServerConfigurationResponse {}
export interface DeleteAuthorizationServerConfiguration {
  token?: ReferenceToken;
}
export interface DeleteAuthorizationServerConfigurationResponse {}
