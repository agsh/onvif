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
import { CommonDuration, OnvifValidationError, toMs, toIsoDuration } from './utils';
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

const RETRY_ERROR_CODES = ['ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'HPE_CLOSED_CONNECTION'] as const;
const PULL_TIMEOUT = 'PT1M';
const MAX_EVENT_RECONNECT_MS = toMs(PULL_TIMEOUT) * 2;
const MIN_EVENT_RECONNECT_MS = 1000;
const MESSAGE_LIMIT = 10;
const PULL_TERMINATION_TIME = toIsoDuration(toMs(PULL_TIMEOUT) * 4);
const PUSH_TERMINATION_TIME = 2 * 60 * 60 * 1000;

/** True for transient network failures that warrant a pull-loop retry. */
function isRetryableNetworkError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    RETRY_ERROR_CODES.includes((error as { code: string }).code as (typeof RETRY_ERROR_CODES)[number])
  );
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
 * Events service — pull-point / WS-BaseNotification, topic filters, brokers.
 *
 * @example Pull-point via the eager `onvif.on('event')` path, plus topic filter and properties:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const props = await onvif.events.getEventProperties();
 * console.log(Object.keys(props.topicSet ?? {}));
 *
 * onvif.on('event', (msg) => {
 *   console.log(msg.topic, msg.message?.message?.data);
 * });
 * onvif.on('eventsError', (err) => console.error(err));
 *
 * // Or a dedicated filtered subscription:
 * // const sub = new Subscription(onvif, 'pullPoint', {
 * //   filter: {
 * //     topicExpression: [{
 * //       expression: 'tns1:RuleEngine//.',
 * //       dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
 * //     }],
 * //   },
 * // });
 * // await sub.subscribe();
 * ```
 * @category Services
 */
export default class Events {
  private readonly onvif: Onvif;
  public agent: HttpsAgent | HttpAgent;
  public globalSubscription: Subscription;
  /** Timer for WS-BaseNotification `subscribe({ renew: true })`; cleared by {@link clearPushRenew}. */
  private pushRenewTimer?: ReturnType<typeof setTimeout>;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
    // For events (PullMessages, Renew) we need to disable keep-alive and keep connection close
    this.agent = this.createAgent();
    this.globalSubscription = new Subscription(onvif);
    this.globalSubscription.on('data', (msg) => onvif.emit('event', msg));
    this.globalSubscription.on('error', (error) => onvif.emit('eventsError', error));
    this.globalSubscription.on('connectionError', (error) => onvif.emit('eventsError', error));
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

  /** Cancel a pending push-notification renew scheduled by {@link subscribe}. */
  clearPushRenew() {
    if (this.pushRenewTimer !== undefined) {
      clearTimeout(this.pushRenewTimer);
      this.pushRenewTimer = undefined;
    }
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
    return data.getEventPropertiesResponse;
  }

  /**
   * Returns the capabilities of the event service. The result is returned in a typed answer.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const body = {
      GetServiceCapabilities: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    };
    const [data] = await this.onvif.request({ service: 'events', body });
    return data.getServiceCapabilitiesResponse.capabilities;
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
    const pullPointSubscription: PullPointSubscription = data.createPullPointSubscriptionResponse;
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

  /**
   * The AddEventBroker command allows an ONVIF client to add an event broker configuration to device to
   * enable ONVIF events to be transferred to an event broker. If an existing event broker configuration
   * already exists with the same Address, the existing configuration shall be modified.
   * @param options
   */
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

  /**
   * The DeleteEventBroker allows an ONVIF client to delete an event broker configuration from an ONVIF
   * device.
   * @param options
   */
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

  /**
   * The GetEventBrokers command lets a client retrieve event broker configurations from the device.
   * @param options
   */
  async getEventBrokers({ address }: GetEventBrokers = {}): Promise<EventBrokerConfig[]> {
    const body = {
      GetEventBrokers: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        ...(address !== undefined && { Address: address }),
      },
    };
    const [data] = await this.onvif.request({ service: 'events', body, array: ['eventBroker'] });
    return data.getEventBrokersResponse.eventBroker ?? [];
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
      this.clearPushRenew();
      this.pushRenewTimer = setTimeout(() => {
        this.pushRenewTimer = undefined;
        if (!this.onvif.closed) {
          this.subscribe(options).catch(() => undefined);
        }
      }, toMs(initialTerminationTime));
    }
    return data.subscribeResponse;
  }

  /**
   * Unsubscribe from WS-BaseNotification push events
   */
  async unsubscribe(subscription: PullPointSubscription): Promise<void> {
    const subscriptionParams = getSubscriptionUrlAndHeaders(
      this.onvif,
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
      agent: this.agent,
    });
  }

  /**
   * Renew for WS-BaseNotification push event
   * @param subscription
   * @param terminationTime time in milliseconds
   */
  async renew(subscription: PullPointSubscription, terminationTime: CommonDuration): Promise<StatusResponse> {
    const subscriptionParams = getSubscriptionUrlAndHeaders(
      this.onvif,
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
      agent: this.agent,
    });
    return data.renewResponse;
  }

  /**
   * Get status for WS-BaseNotification push events
   */
  async getStatus(subscription: PullPointSubscription): Promise<StatusResponse> {
    const subscriptionParams = getSubscriptionUrlAndHeaders(
      this.onvif,
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
      agent: this.agent,
    });
    return data.getStatusResponse;
  }
}

interface SubscriptionEvents {
  data: [msg: NotificationMessage];
  error: [error: NodeJS.ErrnoException];
  connectionError: [error: NodeJS.ErrnoException];
}

/**
 * Standalone pull-point subscription (separate from {@link Events.globalSubscription}).
 * @event data - emitted when an event notification is received
 * @event error - emitted when a pull / renew error occurs
 *
 * @example Filtered pull-point with renew and clean shutdown:
 * ```ts
 * import { Onvif, Subscription } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const sub = new Subscription(onvif, 'pullPoint', {
 *   filter: {
 *     topicExpression: [
 *       {
 *         expression: 'tns1:RuleEngine/PeopleDetector/People',
 *         dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
 *       },
 *     ],
 *   },
 * });
 *
 * sub.on('data', (msg) => console.log(msg.topic, msg.message));
 * sub.on('error', (err) => console.error('subscription', err));
 * await sub.subscribe();
 * await sub.setSynchronizationPoint();
 *
 * // … later
 * await sub.unsubscribe();
 * ```
 * @category Services
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

  /**
   * When false, in-flight pull loops must not renew or auto-resubscribe.
   * Needed when the user wants to unsubscribe
   */
  private pulling = false;
  /**
   * Flag not to subscribe when user called unsubscribe, but we are in the reconnection loop only
   * @private
   */
  private dontWantToRestartEvent = false;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimerResolve?: () => void;

  private clearReconnectTimer() {
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.reconnectTimerResolve) {
      const resolve = this.reconnectTimerResolve;
      this.reconnectTimerResolve = undefined;
      resolve();
    }
  }

  private scheduleReconnectDelay(ms: number): Promise<void> {
    this.clearReconnectTimer();
    return new Promise((resolve) => {
      this.reconnectTimerResolve = resolve;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = undefined;
        this.reconnectTimerResolve = undefined;
        resolve();
      }, ms);
    });
  }

  /**
   * Create a pull-point subscription and start the background {@link eventPull} loop.
   */
  async subscribe() {
    this.dontWantToRestartEvent = false;
    this.subscription = await this.onvif.events.createPullPointSubscription({
      initialTerminationTime: PULL_TERMINATION_TIME,
      ...this.options,
    });
    // Store expiry in local wall clock so later Date.now() comparisons survive device clock skew.
    if (this.subscription.currentTime && this.subscription.terminationTime) {
      this.subscription.terminationTime = localTerminationTime(this.subscription);
    }
    if (this.dontWantToRestartEvent) {
      await this.unsubscribe(false);
      return;
    }
    this.pulling = true;
    void this.eventPull();
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
      // PullMessages times are device-clock; convert before comparing / storing vs Date.now().
      const localTerm = localTerminationTime(msgs);
      if (+localTerm <= Date.now()) {
        // Axis cameras require us to Renew the Pull Point Subscription
        const renewData = await this.renew();
        if (!this.pulling || !this.subscription) {
          return;
        }
        this.subscription.terminationTime = localTerminationTime(renewData);
      } else {
        this.subscription.terminationTime = localTerm;
      }
      void this.eventPull(); // go around the loop again, once the RENEW has completed (and terminationTime updated)
    } catch (error) {
      if (!this.pulling || !this.subscription) {
        return;
      }
      if (isRetryableNetworkError(error) && +this.subscription.terminationTime > Date.now()) {
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
        // A device that answers every pull with a fault would be re-subscribed as fast as the
        // network allows, and every attempt authenticates, so some devices lock the account. Wait
        // the interval the branch above uses; a successful pull resets it.
        void this.restartEvent();
      }
    }
  }

  /**
   * Pull messages from the subscription (long-poll).
   *
   * @param options ONVIF PullMessages fields, plus optional `signal` to cancel the HTTP request
   * before the device Timeout elapses (see [innerDocs/events.md](../innerDocs/events.md)).
   *
   * @example Abort a one-minute pull after 5 seconds:
   * ```ts
   * const ac = new AbortController();
   * const timer = setTimeout(() => ac.abort(), 5000);
   * try {
   *   const { notificationMessage } = await sub.pullMessages({
   *     timeout: 'PT1M',
   *     signal: ac.signal,
   *   });
   * } catch (err) {
   *   if (!(err instanceof Error) || err.name !== 'AbortError') throw err;
   *   // cancelled
   * } finally {
   *   clearTimeout(timer);
   * }
   * ```
   */
  async pullMessages(options?: Partial<PullMessages> & { signal?: AbortSignal }): Promise<PullMessagesResponse> {
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
      signal: options?.signal,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
      agent: this.onvif.events.agent,
      array: ['notificationMessage'],
    });
    return { notificationMessage: [], ...data.pullMessagesResponse };
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
      // Same Events agent as PullMessages so resetAgent aborts in-flight Renew/SyncPoint too.
      agent: this.onvif.events.agent,
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
    const body = {
      Renew: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' }, TerminationTime: PULL_TERMINATION_TIME },
    };
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
      agent: this.onvif.events.agent,
    });
    return data.renewResponse;
  }

  /**
   * The device shall provide the following Unsubscribe command for all SubscriptionManager endpoints returned
   * by the CreatePullPointSubscription command.
   * This command shall terminate the lifetime of a pull point.
   * @param resetAgent if we want to abort long-pulling connections, default true
   */
  async unsubscribe(resetAgent = true) {
    this.dontWantToRestartEvent = true;
    this.pulling = false;
    this.clearReconnectTimer();
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
    if (resetAgent) {
      this.onvif.events.resetAgent();
    }
    try {
      await this.onvif.request({
        url: subscriptionParams.url,
        body,
        soapHeaders: subscriptionParams.additionalSoapHeaders,
        agent: this.onvif.events.agent,
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
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.pulling) {
        void this.eventPull();
      }
    }, this.eventReconnectMs);
    this.eventReconnectMs = Math.min(1.111 * this.eventReconnectMs, MAX_EVENT_RECONNECT_MS);
  }

  /**
   * We lost the connection to the device. Trying to subscribe again
   * @private
   */
  private async restartEvent() {
    const interval = this.eventReconnectMs;
    this.eventReconnectMs = Math.min(1.111 * interval, MAX_EVENT_RECONNECT_MS);
    await this.scheduleReconnectDelay(interval);
    if (!this.pulling) {
      return;
    }
    try {
      await this.subscribe();
    } catch (_error) {
      void this.restartEvent();
    }
  }

  /**
   * Get params for concrete subscription
   * @private
   */
  private getSubscriptionUrlAndHeaders(
    soapAction = 'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
  ) {
    return getSubscriptionUrlAndHeaders(this.onvif, this.subscription!, soapAction);
  }
}

function getSubscriptionUrlAndHeaders(
  onvif: Onvif,
  subscription: PullPointSubscription,
  soapAction = 'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
) {
  if (!subscription?.subscriptionReference?.address) {
    throw new OnvifValidationError(`You should have working subscription. ${JSON.stringify(subscription)}`);
  }
  // parseUrl so preserveAddress rewrites host/port for NAT/proxy (PullMessages uses options.url).
  const url = onvif.parseUrl(String(subscription.subscriptionReference.address));
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
