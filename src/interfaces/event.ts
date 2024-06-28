import { AnyURI } from './basics';
import { Date } from './onvif';

export type EventBrokerProtocol = 'mqtt' | 'mqtts' | 'ws' | 'wss';
export type ConnectionStatus = 'Offline' | 'Connecting' | 'Connected';
export interface Capabilities {
  /** Indicates that the WS Subscription policy is supported. */
  WSSubscriptionPolicySupport?: boolean;
  /** Indicates that the WS Pull Point is supported. */
  WSPullPointSupport?: boolean;
  /** Indicates that the WS Pausable Subscription Manager Interface is supported. */
  WSPausableSubscriptionManagerInterfaceSupport?: boolean;
  /** Maximum number of supported notification producers as defined by WS-BaseNotification. */
  maxNotificationProducers?: number;
  /** Maximum supported number of notification pull points. */
  maxPullPoints?: number;
  /** Indication if the device supports persistent notification storage. */
  persistentNotificationStorage?: boolean;
  /** A space separated list of supported event broker protocols as defined by the tev:EventBrokerProtocol datatype. */
  eventBrokerProtocols?: string;
  /** Maxiumum number of event broker configurations that can be added to the device. */
  maxEventBrokers?: number;
  /** Indicates that metadata streaming over MQTT is supported */
  metadataOverMQTT?: boolean;
}
export interface EventBrokerConfig {
  /** Event broker address in the format "scheme://host:port[/resource]". The supported schemes shall be returned by the EventBrokerProtocols capability. The resource part of the URL is only valid when using websocket. The Address must be unique. */
  address?: AnyURI;
  /** Prefix that will be prepended to all topics before they are published. This is used to make published topics unique for each device. TopicPrefix is not allowed to be empty. */
  topicPrefix?: string;
  /** User name for the event broker. */
  userName?: string;
  /** Password for the event broker. Password shall not be included when returned with GetEventBrokers. */
  password?: string;
  /** Optional certificate ID in the key store pointing to a client certificate to be used for authenticating the device at the message broker. */
  certificateID?: string;
  /** Concrete Topic Expression to select specific event topics to publish. */
  publishFilter?: any;
  /** Quality of service level to use when publishing. This defines the guarantee of delivery for a specific message: 0 = At most once, 1 = At least once, 2 = Exactly once. */
  qoS?: number;
  /** Current connection status (see tev:ConnectionStatus for possible values). */
  status?: string;
  /** The ID of the certification path validation policy used to validate the broker certificate. In case encryption is used but no validation policy is specified, the device shall not validate the broker certificate. */
  certPathValidationPolicyID?: string;
  /** Concrete Topic Expression to select specific metadata topics to publish. */
  metadataFilter?: any;
}
export interface GetServiceCapabilities {}
export interface GetServiceCapabilitiesResponse {
  /** The capabilities for the event service is returned in the Capabilities element. */
  capabilities?: Capabilities;
}
export interface SubscriptionPolicy {}
export interface CreatePullPointSubscription {
  /** Optional XPATH expression to select specific topics. */
  filter?: any;
  /** Initial termination time. */
  initialTerminationTime?: any;
  /** Refer to Web Services Base Notification 1.3 (WS-BaseNotification). */
  subscriptionPolicy?: SubscriptionPolicy;
}
export interface CreatePullPointSubscriptionResponse {
  /** Endpoint reference of the subscription to be used for pulling the messages. */
  subscriptionReference?: any;
  /** Current time of the server for synchronization purposes. */
  urrentTime?: any;
  /** Date time when the PullPoint will be shut down without further pull requests. */
  erminationTime?: any;
}
export interface PullMessages {
  /** Maximum time to block until this method returns. */
  timeout?: any;
  /** Upper limit for the number of messages to return at once. A server implementation may decide to return less messages. */
  messageLimit?: number;
}
export interface PullMessagesResponse {
  /** The date and time when the messages have been delivered by the web server to the client. */
  currentTime?: Date;
  /** Date time when the PullPoint will be shut down without further pull requests. */
  terminationTime?: Date;
  /** List of messages. This list shall be empty in case of a timeout. */
  otificationMessage?: any[];
}
export interface PullMessagesFaultResponse {
  /** Maximum timeout supported by the device. */
  maxTimeout?: any;
  /** Maximum message limit supported by the device. */
  maxMessageLimit?: number;
}
export interface Seek {
  /** The date and time to match against stored messages. */
  utcTime?: Date;
  /** Reverse the pull direction of PullMessages. */
  reverse?: boolean;
}
export interface SeekResponse {}
export interface SetSynchronizationPoint {}
export interface SetSynchronizationPointResponse {}
export interface GetEventProperties {}
export interface GetEventPropertiesResponse {
  /** List of topic namespaces supported. */
  topicNamespaceLocation?: AnyURI[];
  /** True when topicset is fixed for all times. */
  ixedTopicSet?: any;
  /** Set of topics supported. */
  topicSet?: any;
  /**
   * Defines the XPath expression syntax supported for matching topic expressions.
   * The following TopicExpressionDialects are mandatory for an ONVIF compliant device :
   *
   * http://docs.oasis-open.org/wsn/t-1/TopicExpression/Concrete
   * http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet.
   *
   */
  opicExpressionDialect?: any[];
  /**
   * Defines the XPath function set supported for message content filtering.
   * The following MessageContentFilterDialects should be returned if a device supports the message content filtering:
   *
   * http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter.
   *
   * A device that does not support any MessageContentFilterDialect returns a single empty url.
   */
  messageContentFilterDialect?: AnyURI[];
  /** Optional ProducerPropertiesDialects. Refer to Web Services Base Notification 1.3 (WS-BaseNotification) for advanced filtering. */
  producerPropertiesFilterDialect?: AnyURI[];
  /**
   * The Message Content Description Language allows referencing
   * of vendor-specific types. In order to ease the integration of such types into a client application,
   * the GetEventPropertiesResponse shall list all URI locations to schema files whose types are
   * used in the description of notifications, with MessageContentSchemaLocation elements.
   * This list shall at least contain the URI of the ONVIF schema file.
   */
  messageContentSchemaLocation?: AnyURI[];
}
export interface AddEventBroker {
  eventBroker?: EventBrokerConfig;
}
export interface AddEventBrokerResponse {}
export interface DeleteEventBroker {
  address?: AnyURI;
}
export interface DeleteEventBrokerResponse {}
export interface GetEventBrokers {
  address?: AnyURI;
}
export interface GetEventBrokersResponse {
  eventBroker?: EventBrokerConfig[];
}
