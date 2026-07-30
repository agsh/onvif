/**
 * Events ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/core/ONVIF-Core-Specification.pdf
 * @see https://www.onvif.org/ver10/events/wsdl/event.wsdl
 */

import { Onvif } from './onvif';
import {
  AddEventBroker,
  Capabilities,
  CreatePullPointSubscription,
  DeleteEventBroker,
  EventBrokerConfig,
  GetEventBrokers,
  GetEventPropertiesResponse,
  PullMessages,
} from './interfaces/event';
import { build, CommonDuration, toMs, linerase, toIsoDuration } from './utils';
import { AnyURI } from './interfaces/basics';
import { ItemList } from './interfaces/onvif';
import { EventEmitter } from 'events';
import https, { Agent as HttpsAgent } from 'https';
import http, { Agent as HttpAgent } from 'http';
import ErrnoException = NodeJS.ErrnoException;

interface TerminationTimeResponse {
  currentTime: Date;
  terminationTime: Date;
}

interface OnvifEvents {
  name?: string;
  messageLimit: number;
  subscription?: PullPointSubscription;
  eventReconnectMs?: number;
}

/** ONVIF topic expression dialects from WS-Topics and [event.wsdl](https://www.onvif.org/ver10/events/wsdl/event.wsdl). */
export type TopicExpressionDialect =
  | 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet'
  | 'http://docs.oasis-open.org/wsn/t-1/TopicExpression/Concrete'
  | 'http://docs.oasis-open.org/wsn/t-1/TopicExpression/Full'
  | 'http://docs.oasis-open.org/wsn/t-1/TopicExpression/Simple';

/**
 * Popular ONVIF topic expressions (`tns1` = `http://www.onvif.org/ver10/topics`).
 * Subtree patterns ending with `//.` are defined in ONVIF Core 9.6.3.
 */
export type OnvifTopicExpression =
  | 'tns1:RuleEngine/CellMotionDetector/Motion'
  | 'tns1:RuleEngine/LineDetector/Crossed'
  | 'tns1:RuleEngine/FieldDetector/ObjectsInside'
  | 'tns1:RuleEngine/TamperDetector/Tamper'
  | 'tns1:RuleEngine/LineDetector//.'
  | 'tns1:RuleEngine/FieldDetector//.'
  | 'tns1:RuleEngine//.'
  | 'tns1:VideoSource/MotionAlarm'
  | 'tns1:VideoSource/GlobalSceneChange'
  | 'tns1:VideoSource/ImageTooDark/ImagingService'
  | 'tns1:VideoSource/ImageTooBright/ImagingService'
  | 'tns1:VideoSource/ImageTooBlurry/ImagingService'
  | 'tns1:VideoSource/ImageTooNoisy/ImagingService'
  | 'tns1:VideoAnalytics//.'
  | 'tns1:VideoAnalytics/tnsanalytics:CellMotionDetector'
  | 'tns1:Device/Trigger/DigitalInput'
  | 'tns1:Device/Trigger/Relay'
  | 'tns1:Device/HardwareFailure/StorageFailure'
  | 'tns1:Device/HardwareFailure/FanFailure'
  | 'tns1:Device/HardwareFailure/PowerSupplyFailure'
  | 'tns1:Device/HardwareFailure/TemperatureCritical'
  | 'tns1:Monitoring/ProcessorUsage'
  | 'tns1:Monitoring/OperatingTime/LastReset'
  | 'tns1:Monitoring/OperatingTime/LastReboot'
  | 'tns1:Monitoring/OperatingTime/LastClockSynchronization'
  | 'tns1:RecordingConfig/RecordingJobState'
  | 'tns1:RecordingConfig/TrackConfiguration'
  | 'tns1:Media/ConfigurationChanged'
  | 'tns1:Media/ProfileChanged'
  /** Vendor-specific topics, e.g. `tns1:RuleEngine/MyRuleDetector/FaceDetect` */
  | 'tns1:RuleEngine/PeopleDetector/People'
  | (string & {});

export interface TopicExpression {
  dialect: TopicExpressionDialect;
  expression: OnvifTopicExpression;
}

export interface PullPointSubscriptionFilter {
  topicExpression?: TopicExpression[];
  /** XPath for message content filtering (ItemFilter dialect). */
  messageContent?: string;
}

export interface CreatePullPointSubscriptionExtended extends Omit<
  CreatePullPointSubscription,
  'filter' | 'initialTerminationTime'
> {
  filter?: PullPointSubscriptionFilter;
  /** Initial termination time. */
  initialTerminationTime?: CommonDuration;
}

export interface PullMessagesResponse {
  /** The date and time when the messages have been delivered by the web server to the client. */
  currentTime: Date;
  /** Date time when the PullPoint will be shut down without further pull requests. */
  terminationTime: Date;
  /** List of messages. This list shall be empty in case of a timeout. */
  notificationMessage: NotificationMessage[];
}

export interface NotificationMessage {
  topic: Topic;
  subscriptionReference?: { address?: any };
  producerReference?: { address?: any };
  message: { message: EventMessage };
}

export interface Topic {
  _: OnvifTopicExpression;
  dialect?: TopicExpressionDialect;
}

export interface EventMessage {
  utcTime: Date;
  propertyOperation?: PropertyOperation;

  source?: ItemList;
  key?: ItemList;
  data?: ItemList;
}

export type PropertyOperation = 'Initialized' | 'Changed' | 'Deleted';

const RETRY_ERROR_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'HPE_CLOSED_CONNECTION'] as const;
const PULL_TIMEOUT = 'PT1M';
const MAX_EVENT_RECONNECT_MS = toMs(PULL_TIMEOUT) * 2;
const MIN_EVENT_RECONNECT_MS = 1000;
const MESSAGE_LIMIT = 10;
const PULL_TERMINATION_TIME = toIsoDuration(toMs(PULL_TIMEOUT) * 4);
const PUSH_TERMINATION_TIME = 2 * 60 * 60 * 1000;

function isSoapError(error: any): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && RETRY_ERROR_CODES.includes(error.code);
}

function localTerminationTime(response: TerminationTimeResponse): Date {
  return new Date(Date.now() - response.currentTime.getTime() + response.terminationTime.getTime());
}

export interface PullPointSubscription {
  subscriptionReference: { address: AnyURI; referenceParameters?: { subscriptionId: string } };
  currentTime: Date;
  terminationTime: Date;
}

interface StatusResponse {
  currentTime: Date;
  terminationTime: Date;
}

interface SubscribeOptions {
  /** URL of the event service */
  url: string;
  /** Subscription duration in milliseconds */
  terminationTime?: CommonDuration;
  /** Renew subscription after the termination time */
  renew?: boolean;
  /** Filter */
  filter?: PullPointSubscriptionFilter;
}

/**
 * Events service
 */
export class Events {
  private readonly onvif: Onvif;
  public agent: HttpsAgent | HttpAgent;
  public globalSubscription: Subscription;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
    // For events (PullMessages, Renew) we need to disable keep-alive and keep connection close
    this.agent = this.createAgent();
    this.globalSubscription = new Subscription(onvif);
    this.globalSubscription.on('data', (msg) => onvif.emit('event', msg));
  }

  private createAgent(): HttpsAgent | HttpAgent {
    const httpLibrary = this.onvif.useSecure ? https : http;
    return new httpLibrary.Agent({ keepAlive: false });
  }

  /**
   * Drop in-flight PullMessages sockets (long-poll up to PULL_TIMEOUT) so unsubscribe
   * does not leave Happytime / cameras stuck with an open request.
   */
  resetAgent() {
    try {
      this.agent.destroy();
    } catch {
      // ignore
    }
    this.agent = this.createAgent();
  }

  /**
   * The WS-BaseNotification specification defines a set of OPTIONAL WS-ResouceProperties. This specification does not
   * require the implementation of the WS-ResourceProperty interface. Instead, the subsequent direct interface shall be
   * implemented by an ONVIF compliant device in order to provide information about the FilterDialects, Schema files
   * and topics supported by the device.
   */
  async getEventProperties(): Promise<GetEventPropertiesResponse> {
    const body = {
      GetEventProperties: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    };
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data).getEventPropertiesResponse;
  }

  async getServiceCapabilities(): Promise<Capabilities> {
    const body = {
      GetServiceCapabilities: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    };
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data).getServiceCapabilitiesResponse.capabilities;
  }

  static filterToBuild(filter?: PullPointSubscriptionFilter) {
    if (!filter) {
      return undefined;
    }
    const built: Record<string, unknown> = {};
    if (filter.topicExpression?.length) {
      built['wsnt:TopicExpression'] = filter.topicExpression.map(({ dialect, expression }) => ({
        $: { Dialect: dialect },
        _: expression,
      }));
    }
    if (filter.messageContent) {
      built['wsnt:MessageContent'] = {
        $: {
          Dialect: 'http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter',
        },
        _: filter.messageContent,
      };
    }
    return Object.keys(built).length ? built : undefined;
  }

  /**
   * This method returns a PullPointSubscription that can be polled using PullMessages. This message contains the same
   * elements as the SubscriptionRequest of the WS-BaseNotification without the ConsumerReference.
   * If no Filter is specified the pullpoint notifies all occurring events to the client.
   * This method is mandatory.
   */
  async createPullPointSubscription(options?: CreatePullPointSubscriptionExtended): Promise<PullPointSubscription> {
    const filter = Events.filterToBuild(options?.filter);
    const body = {
      CreatePullPointSubscription: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
          'xmlns:tns1': 'http://www.onvif.org/ver10/topics',
          'xmlns:wsnt': 'http://docs.oasis-open.org/wsn/b-2',
        },
        InitialTerminationTime: toIsoDuration(options?.initialTerminationTime ?? 'PT2M'),
        ...(filter && { Filter: filter }),
        SubscriptionPolicy: options?.subscriptionPolicy ?? {},
      },
    };
    const [data] = await this.onvif.request({ service: 'events', body });
    const pullPointSubscription: PullPointSubscription = linerase(data).createPullPointSubscriptionResponse;
    return pullPointSubscription;
  }

  private static eventBrokerToBuild(eventBroker: EventBrokerConfig) {
    return {
      Address: eventBroker.address,
      TopicPrefix: eventBroker.topicPrefix,
      ...(eventBroker.userName !== undefined && { UserName: eventBroker.userName }),
      ...(eventBroker.password !== undefined && { Password: eventBroker.password }),
      ...(eventBroker.certificateID !== undefined && { CertificateID: eventBroker.certificateID }),
      ...(eventBroker.publishFilter !== undefined && { PublishFilter: eventBroker.publishFilter }),
      ...(eventBroker.qoS !== undefined && { QoS: eventBroker.qoS }),
      ...(eventBroker.certPathValidationPolicyID !== undefined && {
        CertPathValidationPolicyID: eventBroker.certPathValidationPolicyID,
      }),
      ...(eventBroker.metadataFilter !== undefined && { MetadataFilter: eventBroker.metadataFilter }),
    };
  }

  async addEventBroker({ eventBroker }: AddEventBroker): Promise<void> {
    const body = {
      AddEventBroker: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        EventBroker: Events.eventBrokerToBuild(eventBroker),
      },
    };
    await this.onvif.request({ service: 'events', body });
  }

  async deleteEventBroker({ address }: DeleteEventBroker): Promise<void> {
    const body = {
      DeleteEventBroker: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        Address: address,
      },
    };
    await this.onvif.request({ service: 'events', body });
  }

  async getEventBrokers({ address }: GetEventBrokers = {}): Promise<EventBrokerConfig[]> {
    const body = {
      GetEventBrokers: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        ...(address !== undefined && { Address: address }),
      },
    };
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data, { array: ['eventBroker'] }).getEventBrokersResponse.eventBroker ?? [];
  }

  /**
   * Subscribe to events using WS-BaseNotification producer
   * @param options
   */
  async subscribe(options: SubscribeOptions): Promise<PullPointSubscription> {
    const initialTerminationTime = options.terminationTime ?? PUSH_TERMINATION_TIME;
    const filter = Events.filterToBuild(options?.filter);
    const body = {
      Subscribe: {
        $: {
          xmlns: 'http://docs.oasis-open.org/wsn/b-2',
          'xmlns:a': 'http://www.w3.org/2005/08/addressing',
        },
        ConsumerReference: {
          'a:Address': options.url,
        },
        InitialTerminationTime: toIsoDuration(initialTerminationTime),
        ...(filter && { Filter: filter }),
      },
    };
    const [data] = await this.onvif.request({
      service: 'events',
      body,
      soapHeaders: {
        'a:Action': {
          $: { 's:mustUnderstand': '1' },
          _: 'http://docs.oasis-open.org/wsn/bw-2/NotificationProducer/SubscribeRequest',
        },
        'a:To': {
          $: { 's:mustUnderstand': '1' },
          _: String(this.onvif.uri.events),
        },
      },
    });
    if (options.renew) {
      setTimeout(() => {
        this.subscribe(options);
      }, toMs(initialTerminationTime));
    }
    return linerase(data).subscribeResponse;
  }

  /**
   * Unsubscribe from WS-BaseNotification push events
   */
  async unsubscribe(subscription: PullPointSubscription): Promise<void> {
    const subscriptionParams = getSubscriptionUrlAndHeaders(
      subscription,
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/UnsubscribeRequest',
    );
    const body = {
      Unsubscribe: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' } },
    };
    await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
  }

  /**
   * Renew for WS-BaseNotification push event
   * @param subscription
   * @param terminationTime time in milliseconds
   */
  async renew(subscription: PullPointSubscription, terminationTime: CommonDuration): Promise<StatusResponse> {
    const subscriptionParams = getSubscriptionUrlAndHeaders(
      subscription,
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/RenewRequest',
    );
    const body = {
      Renew: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' }, TerminationTime: toIsoDuration(terminationTime) },
    };
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
    return linerase(data).renewResponse;
  }

  /**
   * Get status for WS-BaseNotification push events
   */
  async getStatus(subscription: PullPointSubscription): Promise<StatusResponse> {
    const subscriptionParams = getSubscriptionUrlAndHeaders(
      subscription,
      'http://docs.oasis-open.org/wsn/bw-2/GetStatusRequest',
    );
    const body = {
      GetStatus: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' } },
    };
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
    return linerase(data).getStatusResponse;
  }
}

interface SubscriptionEvents {
  data: [msg: NotificationMessage];
  error: [error: NodeJS.ErrnoException];
  connectionError: [error: NodeJS.ErrnoException];
}

/**
 * Subscription to events class
 * @event data - emitted when event is received
 * @event error - emitted when error occurs
 * @example
 * ```ts
 *   const sub = new Subscription(cam, 'pullPoint', {
 *     filter: {
 *       topicExpression: [
 *         {
 *           expression: 'tns1:RuleEngine/PeopleDetector/People',
 *           dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
 *         },
 *       ],
 *     },
 *   });
 *   sub.on('data', console.log);
 *   await sub.subscribe();
 * ```
 */
export class Subscription extends EventEmitter<SubscriptionEvents> {
  private readonly onvif: Onvif;
  subscription?: PullPointSubscription;
  private readonly messageLimit: number;
  public eventReconnectMs: number;
  private readonly options: CreatePullPointSubscriptionExtended;
  /**
   * Event received from subscription
   * @event
   * @param msg Notification message
   */
  declare data: (msg: NotificationMessage) => void;
  /**
   * Any subscription error
   * @event
   * @param error Error object
   */
  declare error: (error: NodeJS.ErrnoException) => void;
  declare connectionError: (error: NodeJS.ErrnoException) => void;

  constructor(onvif: Onvif, options: CreatePullPointSubscriptionExtended = {}) {
    super({ captureRejections: true });
    this.messageLimit = MESSAGE_LIMIT;
    this.eventReconnectMs = MIN_EVENT_RECONNECT_MS;
    this.onvif = onvif;
    this.options = options;
  }

  /** When false, in-flight pull loops must not renew or auto-resubscribe. */
  private pulling = false;

  async subscribe() {
    this.subscription = await this.onvif.events.createPullPointSubscription({
      initialTerminationTime: PULL_TERMINATION_TIME,
      ...this.options,
    });
    this.pulling = true;
    this.eventPull();
  }

  /**
   * Loop events from the subscription
   */
  async eventPull() {
    if (!this.pulling || !this.subscription) {
      return;
    }
    try {
      const msgs = await this.pullMessages({
        messageLimit: this.messageLimit,
        timeout: PULL_TIMEOUT,
      });
      if (!this.pulling || !this.subscription) {
        return;
      }
      this.eventReconnectMs = MIN_EVENT_RECONNECT_MS;
      msgs.notificationMessage.forEach((msg: NotificationMessage) => {
        this.emit('data', msg);
      });
      if (+msgs.terminationTime <= Date.now()) {
        // Axis cameras require us to Rewew the Pull Point Subscription
        const renewData = await this.renew();
        if (!this.pulling || !this.subscription) {
          return;
        }
        this.subscription.terminationTime = localTerminationTime(renewData);
      } else {
        this.subscription.terminationTime = msgs.terminationTime;
      }
      this.eventPull(); // go around the loop again, once the RENEW has completed (and terminationTime updated)
    } catch (error) {
      if (!this.pulling || !this.subscription) {
        return;
      }
      if (isSoapError(error) && +this.subscription.terminationTime > Date.now()) {
        // connection reset (request ended without messages, closed connection) when we're still on the surrent
        // subscription - restart Event loop for pullMessages request
        try {
          // force renew and resync
          const renewData = await this.renew();
          if (this.pulling && this.subscription) {
            this.subscription.terminationTime = localTerminationTime(renewData);
            await this.setSynchronizationPoint();
          }
        } catch (renewError) {
          // do nothing, we're just trying not to lose subscription
          this.emit('connectionError', renewError as ErrnoException);
        }
        if (!this.pulling) {
          return;
        }
        this.emit('connectionError', error as ErrnoException);
        this.restartEventRequest();
      } else {
        // there was an error pulling the message (device shut down, corrupted)
        this.emit('error', error as NodeJS.ErrnoException);
        const shouldResubscribe = this.pulling;
        await this.unsubscribe();
        if (shouldResubscribe) {
          await this.subscribe();
        }
      }
    }
  }

  /**
   * Pull messages from the subscription
   * @param options
   */
  async pullMessages(options?: PullMessages): Promise<PullMessagesResponse> {
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
    );
    // ONVIF Spec says cameras must support 1 Minute wait times. Ensure network socket has a replyTimeout that is larger than 1 minute
    const timeout = options?.timeout ?? PULL_TIMEOUT;
    const body = {
      'tev:PullMessages': {
        $: {
          'xmlns:wsnt': 'http://docs.oasis-open.org/wsn/b-2',
          'xmlns:tev': 'http://www.onvif.org/ver10/events/wsdl',
        },
        'tev:Timeout': timeout,
        'tev:MessageLimit': options?.messageLimit ?? 10,
      },
    };
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      // timeout + 2 sec
      // ensures the socket does not get closed too early while the camera has up to 1 minute to reply
      timeout: toMs(timeout) + 2 * 1000,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
      agent: this.onvif.events.agent,
    });
    return { notificationMessage: [], ...linerase(data, { array: ['notificationMessage'] }).pullMessagesResponse };
  }

  /**
   * Properties inform a client about property creation, changes and deletion in a uniform way. When a client wants to
   * synchronize its properties with the properties of the device, it can request a synchronization point which repeats
   * the current status of all properties to which a client has subscribed. The PropertyOperation of all produced
   * notifications is set to “Initialized”. The Synchronization Point is requested directly from the SubscriptionManager
   * which was returned in either the SubscriptionResponse or in the CreatePullPointSubscriptionResponse. The property
   * update is transmitted via the notification transportation of the notification interface. This method is mandatory.
   */
  async setSynchronizationPoint(): Promise<void> {
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/SetSynchronizationPointRequest',
    );
    const body = { SetSynchronizationPoint: { $: { xmlns: 'http://www.onvif.org/ver10/events/wsdl' } } };
    await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
  }

  /**
   * Renew the subscription
   */
  async renew(): Promise<TerminationTimeResponse> {
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/RenewRequest',
    );
    // x2 larger than the pull timeout
    const terminationTime = PULL_TERMINATION_TIME;
    const body = {
      Renew: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' }, TerminationTime: terminationTime },
    };
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
    return linerase(data).renewResponse;
  }

  /**
   * The device shall provide the following Unsubscribe command for all SubscriptionManager endpoints returned
   * by the CreatePullPointSubscription command.
   * This command shall terminate the lifetime of a pull point.
   */
  async unsubscribe() {
    this.pulling = false;
    if (!this.subscription) {
      return;
    }
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/UnsubscribeRequest',
    );
    const body = {
      Unsubscribe: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' } },
    };
    // Drop local state first so an in-flight eventPull cannot auto-resubscribe after a race.
    delete this.subscription;
    // Abort long-poll PullMessages before/while sending Unsubscribe.
    this.onvif.events.resetAgent();
    try {
      await this.onvif.request({
        url: subscriptionParams.url,
        body,
        soapHeaders: subscriptionParams.additionalSoapHeaders,
      });
    } catch {
      // Subscription may already be gone on the device; local state is cleared.
    }
  }

  /**
   * Restart the event request with an increasing interval when the connection to the device is refused
   * @private
   */
  private restartEventRequest() {
    if (!this.pulling) {
      return;
    }
    setTimeout(() => {
      if (this.pulling) {
        this.eventPull();
      }
    }, this.eventReconnectMs);
    if (this.eventReconnectMs < MAX_EVENT_RECONNECT_MS) {
      this.eventReconnectMs = 1.111 * this.eventReconnectMs;
    } else {
      this.eventReconnectMs = MAX_EVENT_RECONNECT_MS;
    }
  }

  /**
   * Get params for concrete subscription
   * @private
   */
  private getSubscriptionUrlAndHeaders(
    soapAction = 'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
  ) {
    return getSubscriptionUrlAndHeaders(this.subscription!, soapAction);
  }
}

function getSubscriptionUrlAndHeaders(
  subscription: PullPointSubscription,
  soapAction = 'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
) {
  if (!subscription?.subscriptionReference?.address) {
    throw new Error(`You should have working subscription. ${JSON.stringify(subscription)}`);
  }
  const url = new URL(subscription.subscriptionReference.address);
  const axisSubscriptionId = subscription?.subscriptionReference.referenceParameters?.subscriptionId;
  const additionalSoapHeaders = {
    'a:Action': { $: { 's:mustUnderstand': '1' }, _: soapAction },
    'a:To': { $: { 's:mustUnderstand': '1' }, _: url.href },
    ...(axisSubscriptionId && {
      SubscriptionId: {
        $: { 'a:IsReferenceParameter': 'true', xmlns: 'http://www.axis.com/2009/event' },
        _: axisSubscriptionId,
      },
    }),
  };
  return { url, axisSubscriptionId, additionalSoapHeaders };
}
