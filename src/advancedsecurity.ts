/**
 * AdvancedSecurity ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/advancedsecurity/wsdl/advancedsecurity.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { stringListToBuild } from './utils/toOnvifXMLSchemaObject';
import {
  AddCertPathValidationPolicyAssignment,
  AddDot1XConfiguration,
  AddMediaSigningCertificateAssignment,
  AddServerCertificateAssignment,
  AlgorithmIdentifier,
  AuthorizationServerConfiguration,
  AuthorizationServerConfigurationData,
  Capabilities,
  CertificateIDs,
  CertificationPath,
  CertPathValidationParameters,
  CertPathValidationPolicy,
  CreateAuthorizationServerConfiguration,
  CreateAuthorizationServerConfigurationResponse,
  CreateCertPathValidationPolicy,
  CreateCertPathValidationPolicyResponse,
  CreateCertificationPath,
  CreateCertificationPathResponse,
  CreateECCKeyPair,
  CreateECCKeyPairResponse,
  CreatePKCS10CSR,
  CreatePKCS10CSRResponse,
  CreateRSAKeyPair,
  CreateRSAKeyPairResponse,
  CreateSelfSignedCertificate,
  CreateSelfSignedCertificateResponse,
  CustomClaim,
  DeleteAuthorizationServerConfiguration,
  DeleteCertificate,
  DeleteCertPathValidationPolicy,
  DeleteCertificationPath,
  DeleteCRL,
  DeleteDot1XConfiguration,
  DeleteKey,
  DeleteNetworkInterfaceDot1XConfiguration,
  DeleteNetworkInterfaceDot1XConfigurationResponse,
  DeletePassphrase,
  DistinguishedName,
  DNAttributeTypeAndValue,
  Dot1XConfiguration,
  Dot1XStage,
  GetAllCertificatesResponse,
  GetAllCertificationPathsResponse,
  GetAllCertPathValidationPoliciesResponse,
  GetAllCRLsResponse,
  GetAllDot1XConfigurationsResponse,
  GetAllKeysResponse,
  GetAllPassphrasesResponse,
  GetAssignedCertPathValidationPoliciesResponse,
  GetAssignedMediaSigningCertificatesResponse,
  GetAssignedServerCertificatesResponse,
  GetAuthorizationServerConfigurations,
  GetAuthorizationServerConfigurationsResponse,
  GetCertificate,
  GetCertificateResponse,
  GetCertificationPath,
  GetCertificationPathResponse,
  GetCertPathValidationPolicy,
  GetCertPathValidationPolicyResponse,
  GetClientAuthenticationRequiredResponse,
  GetCnMapsToUserResponse,
  GetCRL,
  GetCRLResponse,
  GetDot1XConfiguration,
  GetDot1XConfigurationResponse,
  GetEnabledTLSVersionsResponse,
  GetJWTConfigurationResponse,
  GetKeyStatus,
  GetNetworkInterfaceDot1XConfiguration,
  GetNetworkInterfaceDot1XConfigurationResponse,
  GetPrivateKeyStatus,
  JWTConfiguration,
  MultiValuedRDN,
  RemoveCertPathValidationPolicyAssignment,
  RemoveMediaSigningCertificateAssignment,
  RemoveServerCertificateAssignment,
  ReplaceCertPathValidationPolicyAssignment,
  ReplaceServerCertificateAssignment,
  SetAuthorizationServerConfiguration,
  SetCertPathValidationPolicy,
  SetCertificationPath,
  SetClientAuthenticationRequired,
  SetCnMapsToUser,
  SetEnabledTLSVersions,
  SetJWTConfiguration,
  SetNetworkInterfaceDot1XConfiguration,
  SetNetworkInterfaceDot1XConfigurationResponse,
  TrustAnchor,
  UploadCertificate,
  UploadCertificateResponse,
  UploadCertificateWithPrivateKeyInPKCS12,
  UploadCertificateWithPrivateKeyInPKCS12Response,
  UploadCRL,
  UploadCRLResponse,
  UploadKeyPairInPKCS8,
  UploadKeyPairInPKCS8Response,
  UploadPassphrase,
  UploadPassphraseResponse,
  X509v3Extension,
  AddDot1XConfigurationResponse,
} from './interfaces/advancedsecurity';

/**
 * AdvancedSecurity service
 * @example
 * ```ts
 *  const caps = await cam.advancedSecurity.getServiceCapabilities();
 *  const keys = await cam.advancedSecurity.getAllKeys();
 *  console.log(caps.keystoreCapabilities, keys);
 * ```
 */
export default class AdvancedSecurity extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'advancedsecurity');
  }

  private static dnAttributeToBuild(attribute: DNAttributeTypeAndValue) {
    return { Type: attribute.type, Value: attribute.value };
  }

  private static multiValuedRDNToBuild(rdn: MultiValuedRDN) {
    return {
      ...(rdn.attribute && {
        Attribute: rdn.attribute.map(AdvancedSecurity.dnAttributeToBuild),
      }),
    };
  }

  private static distinguishedNameToBuild(subject: DistinguishedName) {
    return {
      ...(subject.country && { Country: subject.country }),
      ...(subject.organization && { Organization: subject.organization }),
      ...(subject.organizationalUnit && { OrganizationalUnit: subject.organizationalUnit }),
      ...(subject.distinguishedNameQualifier && {
        DistinguishedNameQualifier: subject.distinguishedNameQualifier,
      }),
      ...(subject.stateOrProvinceName && { StateOrProvinceName: subject.stateOrProvinceName }),
      ...(subject.commonName && { CommonName: subject.commonName }),
      ...(subject.serialNumber && { SerialNumber: subject.serialNumber }),
      ...(subject.locality && { Locality: subject.locality }),
      ...(subject.title && { Title: subject.title }),
      ...(subject.surname && { Surname: subject.surname }),
      ...(subject.givenName && { GivenName: subject.givenName }),
      ...(subject.initials && { Initials: subject.initials }),
      ...(subject.pseudonym && { Pseudonym: subject.pseudonym }),
      ...(subject.generationQualifier && { GenerationQualifier: subject.generationQualifier }),
      ...(subject.genericAttribute && {
        GenericAttribute: subject.genericAttribute.map(AdvancedSecurity.dnAttributeToBuild),
      }),
      ...(subject.multiValuedRDN && {
        MultiValuedRDN: subject.multiValuedRDN.map(AdvancedSecurity.multiValuedRDNToBuild),
      }),
      ...(subject.anyAttribute && {
        anyAttribute: {
          ...(subject.anyAttribute.domainComponent && {
            DomainComponent: subject.anyAttribute.domainComponent,
          }),
        },
      }),
    };
  }

  private static algorithmIdentifierToBuild(algorithm: AlgorithmIdentifier) {
    return {
      algorithm: algorithm.algorithm,
      ...(algorithm.parameters !== undefined && { parameters: algorithm.parameters }),
      ...(algorithm.anyParameters && { anyParameters: algorithm.anyParameters }),
    };
  }

  private static x509v3ExtensionToBuild(extension: X509v3Extension) {
    return {
      ExtnOID: extension.extnOID,
      Critical: extension.critical,
      ExtnValue: extension.extnValue,
    };
  }

  private static certificateIDsToBuild(certificateIDs: CertificateIDs) {
    return {
      CertificateID: certificateIDs.certificateID,
    };
  }

  private static certificationPathToBuild(path: CertificationPath) {
    return {
      CertificateID: path.certificateID,
      ...(path.alias && { Alias: path.alias }),
      ...(path.anyElement && { anyElement: path.anyElement }),
    };
  }

  private static certPathValidationParametersToBuild(parameters: CertPathValidationParameters) {
    return {
      ...(parameters.requireTLSWWWClientAuthExtendedKeyUsage !== undefined && {
        RequireTLSWWWClientAuthExtendedKeyUsage: parameters.requireTLSWWWClientAuthExtendedKeyUsage,
      }),
      ...(parameters.useDeltaCRLs !== undefined && { UseDeltaCRLs: parameters.useDeltaCRLs }),
      ...(parameters.anyParameters && { anyParameters: parameters.anyParameters }),
    };
  }

  private static trustAnchorToBuild(anchor: TrustAnchor) {
    return { CertificateID: anchor.certificateID };
  }

  private static certPathValidationPolicyToBuild(policy: CertPathValidationPolicy) {
    return {
      CertPathValidationPolicyID: policy.certPathValidationPolicyID,
      ...(policy.alias && { Alias: policy.alias }),
      Parameters: AdvancedSecurity.certPathValidationParametersToBuild(policy.parameters),
      ...(policy.trustAnchor && {
        TrustAnchor: policy.trustAnchor.map(AdvancedSecurity.trustAnchorToBuild),
      }),
      ...(policy.anyParameters && { anyParameters: policy.anyParameters }),
    };
  }

  private static customClaimToBuild(claim: CustomClaim) {
    return {
      Name: claim.name,
      SupportedValues: stringListToBuild(claim.supportedValues),
    };
  }

  private static jwtConfigurationToBuild(configuration: JWTConfiguration) {
    return {
      Audiences: stringListToBuild(configuration.audiences),
      ...(configuration.trustedIssuers && { TrustedIssuers: configuration.trustedIssuers }),
      ...(configuration.keyID && { KeyID: configuration.keyID }),
      ...(configuration.validationPolicy && { ValidationPolicy: configuration.validationPolicy }),
      ...(configuration.customClaims && {
        CustomClaims: configuration.customClaims.map(AdvancedSecurity.customClaimToBuild),
      }),
    };
  }

  private static dot1XStageToBuild(stage: Dot1XStage): Record<string, unknown> {
    return {
      $: {
        Method: stage.method,
        ...(stage.certPathValidationPolicyID && {
          CertPathValidationPolicyID: stage.certPathValidationPolicyID,
        }),
      },
      ...(stage.identity && { Identity: stage.identity }),
      ...(stage.certificationPathID && { CertificationPathID: stage.certificationPathID }),
      ...(stage.passphraseID && { PassphraseID: stage.passphraseID }),
      ...(stage.inner && { Inner: AdvancedSecurity.dot1XStageToBuild(stage.inner) }),
      ...(stage.extension && { Extension: stage.extension }),
    };
  }

  private static dot1XConfigurationToBuild(configuration: Dot1XConfiguration) {
    return {
      ...(configuration.dot1XID && { Dot1XID: configuration.dot1XID }),
      ...(configuration.alias && { Alias: configuration.alias }),
      Outer: AdvancedSecurity.dot1XStageToBuild(configuration.outer),
    };
  }

  private static authorizationServerConfigurationDataToBuild(data: AuthorizationServerConfigurationData) {
    return {
      $: {
        Type: data.type,
        ...(data.clientAuth && { ClientAuth: data.clientAuth }),
      },
      ServerUri: data.serverUri,
      ...(data.clientID && { ClientID: data.clientID }),
      ...(data.clientSecret && { ClientSecret: data.clientSecret }),
      ...(data.scope && { Scope: data.scope }),
      ...(data.keyID && { KeyID: data.keyID }),
      ...(data.certificateID && { CertificateID: data.certificateID }),
      ...(data.certPathValidationPolicyID && {
        CertPathValidationPolicyID: data.certPathValidationPolicyID,
      }),
    };
  }

  private static authorizationServerConfigurationToBuild(configuration: AuthorizationServerConfiguration) {
    return {
      $: { token: configuration.token },
      Data: AdvancedSecurity.authorizationServerConfigurationDataToBuild(configuration.data),
    };
  }

  /**
   * Returns the capabilities of the advanced security service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({ GetServiceCapabilities: {} }, { array: ['signatureAlgorithms', 'source'] });
    return response.getServiceCapabilitiesResponse?.capabilities || {};
  }

  /**
   * Returns the JWT configuration.
   */
  async getJWTConfiguration(): Promise<GetJWTConfigurationResponse['configuration']> {
    const response = await this.request(
      { GetJWTConfiguration: {} },
      { array: ['trustedIssuers', 'keyID', 'customClaims'] },
    );
    return response.getJWTConfigurationResponse.configuration;
  }

  /**
   * Sets the JWT configuration.
   * @param options
   */
  async setJWTConfiguration({ configuration }: SetJWTConfiguration): Promise<void> {
    await this.request({
      SetJWTConfiguration: { Configuration: AdvancedSecurity.jwtConfigurationToBuild(configuration) },
    });
  }

  /**
   * Creates an RSA key pair.
   * @param options
   */
  async createRSAKeyPair(options: CreateRSAKeyPair): Promise<CreateRSAKeyPairResponse> {
    const response = await this.request({
      CreateRSAKeyPair: {
        KeyLength: options.keyLength,
        ...(options.alias && { Alias: options.alias }),
      },
    });
    return response.createRSAKeyPairResponse;
  }

  /**
   * Creates an ECC key pair.
   * @param options
   */
  async createECCKeyPair(options: CreateECCKeyPair): Promise<CreateECCKeyPairResponse> {
    const response = await this.request({
      CreateECCKeyPair: {
        EllipticCurve: options.ellipticCurve,
        ...(options.alias && { Alias: options.alias }),
      },
    });
    return response.createECCKeyPairResponse;
  }

  /**
   * Uploads a key pair in PKCS#8 format.
   * @param options
   */
  async uploadKeyPairInPKCS8(options: UploadKeyPairInPKCS8): Promise<UploadKeyPairInPKCS8Response['keyID']> {
    const response = await this.request({
      UploadKeyPairInPKCS8: {
        KeyPair: options.keyPair,
        ...(options.alias && { Alias: options.alias }),
        ...(options.encryptionPassphraseID && {
          EncryptionPassphraseID: options.encryptionPassphraseID,
        }),
        ...(options.encryptionPassphrase && {
          EncryptionPassphrase: options.encryptionPassphrase,
        }),
      },
    });
    return response.uploadKeyPairInPKCS8Response.keyID;
  }

  /**
   * Uploads a certificate with private key in PKCS#12 format.
   * @param options
   */
  async uploadCertificateWithPrivateKeyInPKCS12(
    options: UploadCertificateWithPrivateKeyInPKCS12,
  ): Promise<UploadCertificateWithPrivateKeyInPKCS12Response> {
    const response = await this.request({
      UploadCertificateWithPrivateKeyInPKCS12: {
        CertWithPrivateKey: options.certWithPrivateKey,
        ...(options.certificationPathAlias && {
          CertificationPathAlias: options.certificationPathAlias,
        }),
        ...(options.keyAlias && { KeyAlias: options.keyAlias }),
        ...(options.ignoreAdditionalCertificates !== undefined && {
          IgnoreAdditionalCertificates: options.ignoreAdditionalCertificates,
        }),
        ...(options.integrityPassphraseID && {
          IntegrityPassphraseID: options.integrityPassphraseID,
        }),
        ...(options.encryptionPassphraseID && {
          EncryptionPassphraseID: options.encryptionPassphraseID,
        }),
        ...(options.passphrase && { Passphrase: options.passphrase }),
      },
    });
    return response.uploadCertificateWithPrivateKeyInPKCS12Response;
  }

  /**
   * Returns the status of a key.
   * @param options
   */
  async getKeyStatus({ keyID }: GetKeyStatus): Promise<string> {
    const response = await this.request({ GetKeyStatus: { KeyID: keyID } });
    return response.getKeyStatusResponse.keyStatus;
  }

  /**
   * Returns whether a key pair contains a private key.
   * @param options
   */
  async getPrivateKeyStatus({ keyID }: GetPrivateKeyStatus): Promise<boolean> {
    const response = await this.request({ GetPrivateKeyStatus: { KeyID: keyID } });
    return response.getPrivateKeyStatusResponse.hasPrivateKey;
  }

  /**
   * Returns information about all keys in the keystore.
   */
  async getAllKeys(): Promise<GetAllKeysResponse['keyAttribute']> {
    const response = await this.request({ GetAllKeys: {} }, { array: ['keyAttribute'] });
    return response.getAllKeysResponse?.keyAttribute || [];
  }

  /**
   * Deletes a key from the keystore.
   * @param options
   */
  async deleteKey({ keyID }: DeleteKey): Promise<void> {
    await this.request({ DeleteKey: { KeyID: keyID } });
  }

  /**
   * Creates a PKCS#10 certificate signing request.
   * @param options
   */
  async createPKCS10CSR(options: CreatePKCS10CSR): Promise<CreatePKCS10CSRResponse['PKCS10CSR']> {
    const response = await this.request({
      CreatePKCS10CSR: {
        Subject: AdvancedSecurity.distinguishedNameToBuild(options.subject),
        KeyID: options.keyID,
        ...(options.CSRAttribute && { CSRAttribute: options.CSRAttribute }),
        SignatureAlgorithm: AdvancedSecurity.algorithmIdentifierToBuild(options.signatureAlgorithm),
      },
    });
    return response.createPKCS10CSRResponse.PKCS10CSR;
  }

  /**
   * Creates a self-signed certificate.
   * @param options
   */
  async createSelfSignedCertificate(
    options: CreateSelfSignedCertificate,
  ): Promise<CreateSelfSignedCertificateResponse['certificateID']> {
    const response = await this.request({
      CreateSelfSignedCertificate: {
        ...(options.X509Version !== undefined && { X509Version: options.X509Version }),
        Subject: AdvancedSecurity.distinguishedNameToBuild(options.subject),
        KeyID: options.keyID,
        ...(options.alias && { Alias: options.alias }),
        ...(options.notValidBefore && { NotValidBefore: options.notValidBefore }),
        ...(options.notValidAfter && { NotValidAfter: options.notValidAfter }),
        SignatureAlgorithm: AdvancedSecurity.algorithmIdentifierToBuild(options.signatureAlgorithm),
        ...(options.extension && {
          Extension: options.extension.map(AdvancedSecurity.x509v3ExtensionToBuild),
        }),
      },
    });
    return response.createSelfSignedCertificateResponse.certificateID;
  }

  /**
   * Uploads an X.509 certificate.
   * @param options
   */
  async uploadCertificate(options: UploadCertificate): Promise<UploadCertificateResponse> {
    const response = await this.request({
      UploadCertificate: {
        Certificate: options.certificate,
        ...(options.alias && { Alias: options.alias }),
        ...(options.keyAlias && { KeyAlias: options.keyAlias }),
        ...(options.privateKeyRequired !== undefined && {
          PrivateKeyRequired: options.privateKeyRequired,
        }),
      },
    });
    return response.uploadCertificateResponse;
  }

  /**
   * Returns a certificate by ID.
   * @param options
   */
  async getCertificate({ certificateID }: GetCertificate): Promise<GetCertificateResponse['certificate']> {
    const response = await this.request({ GetCertificate: { CertificateID: certificateID } });
    return response.getCertificateResponse.certificate;
  }

  /**
   * Returns all certificates in the keystore.
   */
  async getAllCertificates(): Promise<GetAllCertificatesResponse['certificate']> {
    const response = await this.request({ GetAllCertificates: {} }, { array: ['certificate'] });
    return response.getAllCertificatesResponse?.certificate || [];
  }

  /**
   * Deletes a certificate from the keystore.
   * @param options
   */
  async deleteCertificate({ certificateID }: DeleteCertificate): Promise<void> {
    await this.request({ DeleteCertificate: { CertificateID: certificateID } });
  }

  /**
   * Creates a certification path.
   * @param options
   */
  async createCertificationPath(
    options: CreateCertificationPath,
  ): Promise<CreateCertificationPathResponse['certificationPathID']> {
    const response = await this.request({
      CreateCertificationPath: {
        CertificateIDs: AdvancedSecurity.certificateIDsToBuild(options.certificateIDs),
        ...(options.alias && { Alias: options.alias }),
      },
    });
    return response.createCertificationPathResponse.certificationPathID;
  }

  /**
   * Returns a certification path by ID.
   * @param options
   */
  async getCertificationPath({
    certificationPathID,
  }: GetCertificationPath): Promise<GetCertificationPathResponse['certificationPath']> {
    const response = await this.request(
      { GetCertificationPath: { CertificationPathID: certificationPathID } },
      { array: ['certificateID'] },
    );
    return response.getCertificationPathResponse.certificationPath;
  }

  /**
   * Returns IDs of all certification paths.
   */
  async getAllCertificationPaths(): Promise<GetAllCertificationPathsResponse['certificationPathID']> {
    const response = await this.request({ GetAllCertificationPaths: {} }, { array: ['certificationPathID'] });
    return response.getAllCertificationPathsResponse?.certificationPathID || [];
  }

  /**
   * Updates a certification path.
   * @param options
   */
  async setCertificationPath(options: SetCertificationPath): Promise<void> {
    await this.request({
      SetCertificationPath: {
        CertificationPathID: options.certificationPathID,
        CertificationPath: AdvancedSecurity.certificationPathToBuild(options.certificationPath),
      },
    });
  }

  /**
   * Deletes a certification path.
   * @param options
   */
  async deleteCertificationPath({ certificationPathID }: DeleteCertificationPath): Promise<void> {
    await this.request({
      DeleteCertificationPath: { CertificationPathID: certificationPathID },
    });
  }

  /**
   * Uploads a passphrase.
   * @param options
   */
  async uploadPassphrase(options: UploadPassphrase): Promise<UploadPassphraseResponse['passphraseID']> {
    const response = await this.request({
      UploadPassphrase: {
        Passphrase: options.passphrase,
        ...(options.passphraseAlias && { PassphraseAlias: options.passphraseAlias }),
      },
    });
    return response.uploadPassphraseResponse.passphraseID;
  }

  /**
   * Returns all passphrases in the keystore.
   */
  async getAllPassphrases(): Promise<GetAllPassphrasesResponse['passphraseAttribute']> {
    const response = await this.request({ GetAllPassphrases: {} }, { array: ['passphraseAttribute'] });
    return response.getAllPassphrasesResponse?.passphraseAttribute || [];
  }

  /**
   * Deletes a passphrase.
   * @param options
   */
  async deletePassphrase({ passphraseID }: DeletePassphrase): Promise<void> {
    await this.request({ DeletePassphrase: { PassphraseID: passphraseID } });
  }

  /**
   * Uploads a CRL.
   * @param options
   */
  async uploadCRL(options: UploadCRL): Promise<UploadCRLResponse['crlID']> {
    const response = await this.request({
      UploadCRL: {
        CRL: options.crl,
        ...(options.alias && { Alias: options.alias }),
        ...(options.anyParameters && { anyParameters: options.anyParameters }),
      },
    });
    return response.uploadCRLResponse.crlID;
  }

  /**
   * Returns a CRL by ID.
   * @param options
   */
  async getCRL({ crlID }: GetCRL): Promise<GetCRLResponse['crl']> {
    const response = await this.request({ GetCRL: { CRLID: crlID } });
    return response.getCRLResponse.crl;
  }

  /**
   * Returns all CRLs in the keystore.
   */
  async getAllCRLs(): Promise<GetAllCRLsResponse['crl']> {
    const response = await this.request({ GetAllCRLs: {} }, { array: ['crl'] });
    return response.getAllCRLsResponse?.crl || [];
  }

  /**
   * Deletes a CRL.
   * @param options
   */
  async deleteCRL({ crlID }: DeleteCRL): Promise<void> {
    await this.request({ DeleteCRL: { CRLID: crlID } });
  }

  /**
   * Creates a certification path validation policy.
   * @param options
   */
  async createCertPathValidationPolicy(
    options: CreateCertPathValidationPolicy,
  ): Promise<CreateCertPathValidationPolicyResponse['certPathValidationPolicyID']> {
    const response = await this.request({
      CreateCertPathValidationPolicy: {
        ...(options.alias && { Alias: options.alias }),
        Parameters: AdvancedSecurity.certPathValidationParametersToBuild(options.parameters),
        ...(options.trustAnchor && {
          TrustAnchor: options.trustAnchor.map(AdvancedSecurity.trustAnchorToBuild),
        }),
        ...(options.anyParameters && { anyParameters: options.anyParameters }),
      },
    });
    return response.createCertPathValidationPolicyResponse.certPathValidationPolicyID;
  }

  /**
   * Returns a certification path validation policy by ID.
   * @param options
   */
  async getCertPathValidationPolicy({
    certPathValidationPolicyID,
  }: GetCertPathValidationPolicy): Promise<GetCertPathValidationPolicyResponse['certPathValidationPolicy']> {
    const response = await this.request(
      {
        GetCertPathValidationPolicy: {
          CertPathValidationPolicyID: certPathValidationPolicyID,
        },
      },
      { array: ['trustAnchor'] },
    );
    return response.getCertPathValidationPolicyResponse.certPathValidationPolicy;
  }

  /**
   * Returns all certification path validation policies.
   */
  async getAllCertPathValidationPolicies(): Promise<
    GetAllCertPathValidationPoliciesResponse['certPathValidationPolicy']
  > {
    const response = await this.request(
      { GetAllCertPathValidationPolicies: {} },
      { array: ['certPathValidationPolicy', 'trustAnchor'] },
    );
    return response.getAllCertPathValidationPoliciesResponse?.certPathValidationPolicy || [];
  }

  /**
   * Updates a certification path validation policy.
   * @param options
   */
  async setCertPathValidationPolicy(options: SetCertPathValidationPolicy): Promise<void> {
    await this.request({
      SetCertPathValidationPolicy: {
        ...(options.certPathValidationPolicyID && {
          CertPathValidationPolicyID: options.certPathValidationPolicyID,
        }),
        CertPathValidationPolicy: AdvancedSecurity.certPathValidationPolicyToBuild(options.certPathValidationPolicy),
      },
    });
  }

  /**
   * Deletes a certification path validation policy.
   * @param options
   */
  async deleteCertPathValidationPolicy({ certPathValidationPolicyID }: DeleteCertPathValidationPolicy): Promise<void> {
    await this.request({
      DeleteCertPathValidationPolicy: {
        CertPathValidationPolicyID: certPathValidationPolicyID,
      },
    });
  }

  /**
   * Assigns a certification path to the TLS server.
   * @param options
   */
  async addServerCertificateAssignment({ certificationPathID }: AddServerCertificateAssignment): Promise<void> {
    await this.request({
      AddServerCertificateAssignment: { CertificationPathID: certificationPathID },
    });
  }

  /**
   * Removes a TLS server certificate assignment.
   * @param options
   */
  async removeServerCertificateAssignment({ certificationPathID }: RemoveServerCertificateAssignment): Promise<void> {
    await this.request({
      RemoveServerCertificateAssignment: { CertificationPathID: certificationPathID },
    });
  }

  /**
   * Replaces a TLS server certificate assignment.
   * @param options
   */
  async replaceServerCertificateAssignment(options: ReplaceServerCertificateAssignment): Promise<void> {
    await this.request({
      ReplaceServerCertificateAssignment: {
        OldCertificationPathID: options.oldCertificationPathID,
        NewCertificationPathID: options.newCertificationPathID,
      },
    });
  }

  /**
   * Returns certification paths assigned to the TLS server.
   */
  async getAssignedServerCertificates(): Promise<GetAssignedServerCertificatesResponse['certificationPathID']> {
    const response = await this.request({ GetAssignedServerCertificates: {} }, { array: ['certificationPathID'] });
    return response.getAssignedServerCertificatesResponse?.certificationPathID || [];
  }

  /**
   * Sets enabled TLS versions.
   * @param options
   */
  async setEnabledTLSVersions({ versions }: SetEnabledTLSVersions): Promise<void> {
    await this.request({
      SetEnabledTLSVersions: { Versions: stringListToBuild(versions) },
    });
  }

  /**
   * Returns enabled TLS versions.
   */
  async getEnabledTLSVersions(): Promise<GetEnabledTLSVersionsResponse['versions']> {
    const response = await this.request({ GetEnabledTLSVersions: {} });
    const versions = response.getEnabledTLSVersionsResponse.versions;
    if (typeof versions === 'string') {
      return versions.split(/\s+/).filter(Boolean);
    }
    return versions;
  }

  /**
   * Sets whether client authentication is required.
   * @param options
   */
  async setClientAuthenticationRequired({
    clientAuthenticationRequired,
  }: SetClientAuthenticationRequired): Promise<void> {
    await this.request({
      SetClientAuthenticationRequired: {
        ClientAuthenticationRequired: clientAuthenticationRequired,
      },
    });
  }

  /**
   * Returns whether client authentication is required.
   */
  async getClientAuthenticationRequired(): Promise<
    GetClientAuthenticationRequiredResponse['clientAuthenticationRequired']
  > {
    const response = await this.request({ GetClientAuthenticationRequired: {} });
    return response.getClientAuthenticationRequiredResponse.clientAuthenticationRequired;
  }

  /**
   * Sets whether CN maps to a local user.
   * @param options
   */
  async setCnMapsToUser({ cnMapsToUser }: SetCnMapsToUser): Promise<void> {
    await this.request({ SetCnMapsToUser: { CnMapsToUser: cnMapsToUser } });
  }

  /**
   * Returns whether CN maps to a local user.
   */
  async getCnMapsToUser(): Promise<GetCnMapsToUserResponse['cnMapsToUser']> {
    const response = await this.request({ GetCnMapsToUser: {} });
    return response.getCnMapsToUserResponse.cnMapsToUser;
  }

  /**
   * Assigns a certification path validation policy to the TLS server.
   * @param options
   */
  async addCertPathValidationPolicyAssignment({
    certPathValidationPolicyID,
  }: AddCertPathValidationPolicyAssignment): Promise<void> {
    await this.request({
      AddCertPathValidationPolicyAssignment: {
        CertPathValidationPolicyID: certPathValidationPolicyID,
      },
    });
  }

  /**
   * Removes a certification path validation policy assignment.
   * @param options
   */
  async removeCertPathValidationPolicyAssignment({
    certPathValidationPolicyID,
  }: RemoveCertPathValidationPolicyAssignment): Promise<void> {
    await this.request({
      RemoveCertPathValidationPolicyAssignment: {
        CertPathValidationPolicyID: certPathValidationPolicyID,
      },
    });
  }

  /**
   * Replaces a certification path validation policy assignment.
   * @param options
   */
  async replaceCertPathValidationPolicyAssignment(options: ReplaceCertPathValidationPolicyAssignment): Promise<void> {
    await this.request({
      ReplaceCertPathValidationPolicyAssignment: {
        OldCertPathValidationPolicyID: options.oldCertPathValidationPolicyID,
        NewCertPathValidationPolicyID: options.newCertPathValidationPolicyID,
      },
    });
  }

  /**
   * Returns assigned certification path validation policies.
   */
  async getAssignedCertPathValidationPolicies(): Promise<
    GetAssignedCertPathValidationPoliciesResponse['certPathValidationPolicyID']
  > {
    const response = await this.request(
      { GetAssignedCertPathValidationPolicies: {} },
      { array: ['certPathValidationPolicyID'] },
    );
    return response.getAssignedCertPathValidationPoliciesResponse?.certPathValidationPolicyID || [];
  }

  /**
   * Adds an 802.1X configuration.
   * @param options
   */
  async addDot1XConfiguration({
    dot1XConfiguration,
  }: AddDot1XConfiguration): Promise<AddDot1XConfigurationResponse['dot1XID']> {
    const response = await this.request({
      AddDot1XConfiguration: {
        Dot1XConfiguration: AdvancedSecurity.dot1XConfigurationToBuild(dot1XConfiguration),
      },
    });
    return response.addDot1XConfigurationResponse.dot1XID;
  }

  /**
   * Returns all 802.1X configurations.
   */
  async getAllDot1XConfigurations(): Promise<GetAllDot1XConfigurationsResponse['configuration']> {
    const response = await this.request({ GetAllDot1XConfigurations: {} }, { array: ['configuration'] });
    return response.getAllDot1XConfigurationsResponse?.configuration || [];
  }

  /**
   * Returns an 802.1X configuration by ID.
   * @param options
   */
  async getDot1XConfiguration({
    dot1XID,
  }: GetDot1XConfiguration): Promise<GetDot1XConfigurationResponse['dot1XConfiguration']> {
    const response = await this.request({ GetDot1XConfiguration: { Dot1XID: dot1XID } });
    return response.getDot1XConfigurationResponse.dot1XConfiguration;
  }

  /**
   * Deletes an 802.1X configuration.
   * @param options
   */
  async deleteDot1XConfiguration({ dot1XID }: DeleteDot1XConfiguration): Promise<void> {
    await this.request({ DeleteDot1XConfiguration: { Dot1XID: dot1XID } });
  }

  /**
   * Assigns an 802.1X configuration to a network interface.
   * @param options
   */
  async setNetworkInterfaceDot1XConfiguration(
    options: SetNetworkInterfaceDot1XConfiguration,
  ): Promise<SetNetworkInterfaceDot1XConfigurationResponse['rebootNeeded']> {
    const response = await this.request({
      SetNetworkInterfaceDot1XConfiguration: {
        Token: options.token,
        Dot1XID: options.dot1XID,
      },
    });
    return response.setNetworkInterfaceDot1XConfigurationResponse.rebootNeeded;
  }

  /**
   * Returns the 802.1X configuration assigned to a network interface.
   * @param options
   */
  async getNetworkInterfaceDot1XConfiguration({
    token,
  }: GetNetworkInterfaceDot1XConfiguration): Promise<GetNetworkInterfaceDot1XConfigurationResponse['dot1XID']> {
    const response = await this.request({
      GetNetworkInterfaceDot1XConfiguration: { Token: token },
    });
    return response.getNetworkInterfaceDot1XConfigurationResponse?.dot1XID;
  }

  /**
   * Removes the 802.1X configuration from a network interface.
   * @param options
   */
  async deleteNetworkInterfaceDot1XConfiguration({
    token,
  }: DeleteNetworkInterfaceDot1XConfiguration): Promise<
    DeleteNetworkInterfaceDot1XConfigurationResponse['rebootNeeded']
  > {
    const response = await this.request({
      DeleteNetworkInterfaceDot1XConfiguration: { Token: token },
    });
    return response.deleteNetworkInterfaceDot1XConfigurationResponse.rebootNeeded;
  }

  /**
   * Assigns a certification path for media signing.
   * @param options
   */
  async addMediaSigningCertificateAssignment({
    certificationPathID,
  }: AddMediaSigningCertificateAssignment): Promise<void> {
    await this.request({
      AddMediaSigningCertificateAssignment: { CertificationPathID: certificationPathID },
    });
  }

  /**
   * Removes a media signing certificate assignment.
   * @param options
   */
  async removeMediaSigningCertificateAssignment({
    certificationPathID,
  }: RemoveMediaSigningCertificateAssignment): Promise<void> {
    await this.request({
      RemoveMediaSigningCertificateAssignment: { CertificationPathID: certificationPathID },
    });
  }

  /**
   * Returns certification paths assigned for media signing.
   */
  async getAssignedMediaSigningCertificates(): Promise<
    GetAssignedMediaSigningCertificatesResponse['certificationPathID']
  > {
    const response = await this.request(
      { GetAssignedMediaSigningCertificates: {} },
      { array: ['certificationPathID'] },
    );
    return response.getAssignedMediaSigningCertificatesResponse?.certificationPathID;
  }

  /**
   * Returns authorization server configurations.
   * @param options
   */
  async getAuthorizationServerConfigurations(
    options: GetAuthorizationServerConfigurations = {},
  ): Promise<GetAuthorizationServerConfigurationsResponse['configuration']> {
    const response = await this.request(
      {
        GetAuthorizationServerConfigurations: {
          ...(options.token && { Token: options.token }),
        },
      },
      { array: ['configuration'] },
    );
    return response.getAuthorizationServerConfigurationsResponse?.configuration || [];
  }

  /**
   * Creates an authorization server configuration.
   * @param options
   */
  async createAuthorizationServerConfiguration({
    configuration,
  }: CreateAuthorizationServerConfiguration): Promise<CreateAuthorizationServerConfigurationResponse['token']> {
    const response = await this.request({
      CreateAuthorizationServerConfiguration: {
        Configuration: AdvancedSecurity.authorizationServerConfigurationDataToBuild(configuration),
      },
    });
    return response.createAuthorizationServerConfigurationResponse.token;
  }

  /**
   * Updates an authorization server configuration.
   * @param options
   */
  async setAuthorizationServerConfiguration({ configuration }: SetAuthorizationServerConfiguration): Promise<void> {
    await this.request({
      SetAuthorizationServerConfiguration: {
        Configuration: AdvancedSecurity.authorizationServerConfigurationToBuild(configuration),
      },
    });
  }

  /**
   * Deletes an authorization server configuration.
   * @param options
   */
  async deleteAuthorizationServerConfiguration({ token }: DeleteAuthorizationServerConfiguration): Promise<void> {
    await this.request({ DeleteAuthorizationServerConfiguration: { Token: token } });
  }
}
