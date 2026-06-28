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
  Seek,
} from './interfaces/event';
import { build, linerase, msToIsoDuration } from './utils';
import { AnyURI } from './interfaces/basics';
import { ItemList } from './interfaces/onvif';
import { EventEmitter } from 'events';

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

export interface CreatePullPointSubscriptionExtended extends Omit<CreatePullPointSubscription, 'filter'> {
  filter?: PullPointSubscriptionFilter;
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
const MAX_EVENT_RECONNECT_MS = 2 * 60 * 1000;
const MIN_EVENT_RECONNECT_MS = 1000;
const MESSAGE_LIMIT = 10;

function isSoapError(error: any): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && RETRY_ERROR_CODES.includes(error.code);
}

function localTerminationTime(response: TerminationTimeResponse): Date {
  return new Date(Date.now() - response.currentTime.getTime() + response.terminationTime.getTime());
}

interface PullPointSubscription {
  subscriptionReference: { address: AnyURI; referenceParameters?: { subscriptionId: string } };
  currentTime: Date;
  terminationTime: Date;
}

interface SubscribeOptions {
  /** URL of the event service */
  url: string;
  /** Subscription duration in milliseconds */
  terminationTime?: number;
  /** Renew subscription after the termination time */
  renew?: boolean;
}

/**
 * Events service
 */
export class Events {
  private readonly onvif: Onvif;
  private events: OnvifEvents = {
    messageLimit: 10,
  };

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  /**
   * The WS-BaseNotification specification defines a set of OPTIONAL WS-ResouceProperties. This specification does not
   * require the implementation of the WS-ResourceProperty interface. Instead, the subsequent direct interface shall be
   * implemented by an ONVIF compliant device in order to provide information about the FilterDialects, Schema files
   * and topics supported by the device.
   */
  async getEventProperties(): Promise<GetEventPropertiesResponse> {
    const body = build({
      GetEventProperties: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    });
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data).getEventPropertiesResponse;
  }

  async getServiceCapabilities(): Promise<Capabilities> {
    const body = build({
      GetServiceCapabilities: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    });
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data).getServiceCapabilitiesResponse.capabilities;
  }

  /**
   * Event loop for pullMessages request
   */
  async eventRequest() {
    if (this.onvif.listeners('event').length > 0) {
      // check for event listeners, if zero, stop pulling
      this.events.messageLimit = this.events.messageLimit ?? 10; // setting message limit
      if (
        !this.events.subscription ||
        !this.events.subscription?.terminationTime ||
        Date.now() > +this.events.subscription?.terminationTime
      ) {
        // if there is no pull-point subscription, or it has expired, create new subscription
        try {
          await this.createPullPointSubscription();
          await this.setSynchronizationPoint();
          delete this.events.eventReconnectMs;
          this.eventPull();
        } catch (error) {
          this.onvif.emit('eventsError', error as Error);
          if (isSoapError(error)) {
            // connection reset on creation - restart Event loop for pullMessages request
            this.restartEventRequest();
          }
        }
      } else {
        this.eventPull();
      }
    } else {
      await this.unsubscribe();
    }
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
    const body = build({
      CreatePullPointSubscription: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
          'xmlns:tns1': 'http://www.onvif.org/ver10/topics',
          'xmlns:wsnt': 'http://docs.oasis-open.org/wsn/b-2',
        },
        InitialTerminationTime: options?.initialTerminationTime ?? 'PT2M',
        ...(filter && { Filter: filter }),
        SubscriptionPolicy: options?.subscriptionPolicy,
      },
    });
    const [data] = await this.onvif.request({ service: 'events', body });
    const pullPointSubscription: PullPointSubscription = linerase(data).createPullPointSubscriptionResponse;
    this.events.subscription = pullPointSubscription;
    return pullPointSubscription;
  }

  /**
   * Event loop for pullMessages request
   * @private
   */
  async eventPull() {
    // check for event listeners, if zero, or no subscription then stop pulling
    if (this.onvif.listeners('event').length && this.events.subscription) {
      try {
        const msgs = await this.pullMessages({
          messageLimit: this.events.messageLimit,
          timeout: 'PT1M',
        });
        delete this.events.eventReconnectMs;
        msgs.notificationMessage?.forEach((msg: NotificationMessage) => {
          this.onvif.emit('event', msg);
        });
        if (+msgs.terminationTime <= Date.now()) {
          // this.events.subscription.terminationTime = localTerminationTime(msgs); // Account for camera clock skew when the reported termination time looks expired.
          // Axis cameras require us to Rewew the Pull Point Subscription
          const renewData = await this.renew();
          this.events.subscription.terminationTime = localTerminationTime(renewData);
        } else {
          this.events.subscription.terminationTime = msgs.terminationTime;
        }
        this.eventRequest(); // go around the loop again, once the RENEW has completed (and terminationTime updated)
      } catch (error) {
        this.onvif.emit('eventsError', error as Error);
        if (isSoapError(error)) {
          // connection reset (request ended without messages, closed connection) - restart Event loop for pullMessages request
          this.restartEventRequest();
        } else {
          // there was an error pulling the message
          await this.unsubscribe();
          // await this.renew();
          this.eventRequest();
        }
      }

      // TODO rest of the method
    } else {
      if (this.events.subscription) {
        await this.unsubscribe();
      }
    }
  }

  async pullMessages(options?: PullMessages): Promise<PullMessagesResponse> {
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
    );
    const body = build({
      PullMessages: {
        $: { xmlns: 'http://www.onvif.org/ver10/events/wsdl' },
        Timeout: options?.timeout ?? 'PT2M', // ONVIF Spec says cameras must support 1 Minute wait times. Ensure network socket has a replyTimeout that is larger that 1 minute
        MessageLimit: options?.messageLimit ?? 10,
      },
    });
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      timeout: 80 * 1000, // 80 seconds - ensures the socket does not get closed too early while the camera has up to 1 minute to reply
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
    return { notificationMessage: [], ...linerase(data, { array: ['notificationMessage'] }).pullMessagesResponse };
  }

  async renew(): Promise<TerminationTimeResponse> {
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/RenewRequest',
    );
    const body = build({
      Renew: {
        $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' },
        TerminationTime: 'PT2M', // 2 mins (larger than the 1 min Pull timeout)
      },
    });
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      timeout: 80 * 1000, // 80 seconds - ensures the socket does not get closed too early while the camera has up to 1 minute to reply
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
    return linerase(data).renewResponse;
  }

  /**
   * Restart the event request with an increasing interval when the connection to the device is refused
   * @private
   */
  private restartEventRequest() {
    if (!this.events.eventReconnectMs) {
      this.events.eventReconnectMs = 10;
    }
    setTimeout(this.eventRequest.bind(this), this.events.eventReconnectMs);
    if (this.events.eventReconnectMs < MAX_EVENT_RECONNECT_MS) {
      this.events.eventReconnectMs = 1.111 * this.events.eventReconnectMs;
    }
  }

  /**
   * The device shall provide the following Unsubscribe command for all SubscriptionManager endpoints returned
   * by the CreatePullPointSubscription command.
   * This command shall terminate the lifetime of a pull point.
   */
  async unsubscribe() {
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/UnsubscribeRequest',
    );
    const body = build({
      Unsubscribe: {
        $: {
          xmlns: 'http://docs.oasis-open.org/wsn/b-2',
        },
      },
    });
    await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
    this.onvif.removeAllListeners('event');
    delete this.events.subscription;
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
    const body = build({
      SetSynchronizationPoint: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
      },
    });
    await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
  }

  /**
   * Seek to a specific point in the stored notification history.
   */
  async seek({ utcTime, reverse }: Seek): Promise<void> {
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/SeekRequest',
    );
    const body = build({
      Seek: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        UtcTime: utcTime,
        ...(reverse && { Reverse: reverse }),
      },
    });
    await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
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
    const body = build({
      AddEventBroker: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        EventBroker: Events.eventBrokerToBuild(eventBroker),
      },
    });
    await this.onvif.request({ service: 'events', body });
  }

  async deleteEventBroker({ address }: DeleteEventBroker): Promise<void> {
    const body = build({
      DeleteEventBroker: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        Address: address,
      },
    });
    await this.onvif.request({ service: 'events', body });
  }

  async getEventBrokers({ address }: GetEventBrokers = {}): Promise<EventBrokerConfig[]> {
    const body = build({
      GetEventBrokers: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        ...(address !== undefined && { Address: address }),
      },
    });
    const [data] = await this.onvif.request({ service: 'events', body });
    return linerase(data, { array: ['eventBroker'] }).getEventBrokersResponse.eventBroker ?? [];
  }

  /**
   * Get params for concrete subscription
   * @private
   */
  private getSubscriptionUrlAndHeaders(
    soapAction = 'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
  ) {
    if (!this.events.subscription?.subscriptionReference.address) {
      throw new Error(`You should have pull-point subscription. ${JSON.stringify(this.events.subscription)}`);
    }
    const url = new URL(this.events.subscription.subscriptionReference.address);
    const axisSubscriptionId = this.events.subscription?.subscriptionReference.referenceParameters?.subscriptionId;
    const additionalSoapHeaders = `
<a:To mustUnderstand="1">${url.href}</a:To>
<a:Action s:mustUnderstand="1">${soapAction}</a:Action>
${axisSubscriptionId ? `<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">${axisSubscriptionId}</SubscriptionId>` : ''}
`;
    return { url, axisSubscriptionId, additionalSoapHeaders };
  }

  /**
   * Subscribe to events using notification producer
   * @param options
   */
  async subscribe(options: SubscribeOptions): Promise<PullPointSubscription> {
    const initialTerminationTime = options.terminationTime ?? 2 * 60 * 1000;
    const body = build({
      Subscribe: {
        $: {
          xmlns: 'http://docs.oasis-open.org/wsn/b-2',
          'xmlns:a': 'http://www.w3.org/2005/08/addressing',
        },
        ConsumerReference: {
          'a:Address': options.url,
        },
        InitialTerminationTime: msToIsoDuration(initialTerminationTime),
      },
    });
    const [data] = await this.onvif.request({
      service: 'events',
      body,
      soapHeaders: `
<a:Action s:mustUnderstand="1">http://docs.oasis-open.org/wsn/bw-2/NotificationProducer/SubscribeRequest</a:Action>
<a:To s:mustUnderstand="1">${this.onvif.uri.events}</a:To>
`,
    });
    this.events.subscription = linerase(data).subscribeResponse;
    if (options.renew) {
      setTimeout(() => {
        if (this.events.subscription) {
          this.subscribe(options);
        }
      }, initialTerminationTime);
    }
    return this.events.subscription!;
  }
}

type SubscriptionType = 'pullPoint' | 'basicNotification';

interface SubscriptionEvents {
  data: [msg: NotificationMessage];
  error: [error: Error];
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
  private eventReconnectMs: number;
  private readonly type: SubscriptionType;
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
  declare error: (error: Error) => void;

  constructor(onvif: Onvif, type?: SubscriptionType, options: CreatePullPointSubscriptionExtended = {}) {
    super({ captureRejections: true });
    this.messageLimit = MESSAGE_LIMIT;
    this.eventReconnectMs = MIN_EVENT_RECONNECT_MS;
    this.onvif = onvif;
    this.type = type ?? 'pullPoint';
    this.options = options;
  }

  async subscribe() {
    switch (this.type) {
      case 'pullPoint':
        await this.createPullPointSubscription(this.options);
        this.eventPull();
        return;
      case 'basicNotification':
        return; // this.createNotificationProducerSubscription(options);
    }
  }

  async createPullPointSubscription(options?: CreatePullPointSubscriptionExtended): Promise<PullPointSubscription> {
    const filter = Events.filterToBuild(options?.filter);
    const body = build({
      CreatePullPointSubscription: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
          'xmlns:tns1': 'http://www.onvif.org/ver10/topics',
          'xmlns:wsnt': 'http://docs.oasis-open.org/wsn/b-2',
        },
        InitialTerminationTime: options?.initialTerminationTime ?? 'PT2M',
        ...(filter && { Filter: filter }),
        SubscriptionPolicy: options?.subscriptionPolicy,
      },
    });
    const [data] = await this.onvif.request({ service: 'events', body });
    const pullPointSubscription: PullPointSubscription = linerase(data).createPullPointSubscriptionResponse;
    this.subscription = pullPointSubscription;
    await this.setSynchronizationPoint();
    return pullPointSubscription;
  }

  /**
   * Loop events from the subscription
   */
  async eventPull() {
    if (this.subscription) {
      try {
        const msgs = await this.pullMessages({
          messageLimit: this.messageLimit,
          timeout: 'PT1M',
        });
        this.eventReconnectMs = MIN_EVENT_RECONNECT_MS;
        msgs.notificationMessage.forEach((msg: NotificationMessage) => {
          this.emit('data', msg);
        });
        if (+msgs.terminationTime <= Date.now()) {
          // Axis cameras require us to Rewew the Pull Point Subscription
          const renewData = await this.renew();
          this.subscription.terminationTime = localTerminationTime(renewData);
        } else {
          this.subscription.terminationTime = msgs.terminationTime;
        }
        this.eventPull(); // go around the loop again, once the RENEW has completed (and terminationTime updated)
      } catch (error) {
        // this.emit('error', error as Error);
        if (isSoapError(error)) {
          // connection reset (request ended without messages, closed connection) - restart Event loop for pullMessages request
          this.restartEventRequest();
        } else {
          // there was an error pulling the message
          await this.unsubscribe();
          this.subscribe();
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
    const body = build({
      PullMessages: {
        $: { xmlns: 'http://www.onvif.org/ver10/events/wsdl' },
        Timeout: options?.timeout ?? 'PT2M', // ONVIF Spec says cameras must support 1 Minute wait times. Ensure network socket has a replyTimeout that is larger that 1 minute
        MessageLimit: options?.messageLimit ?? 10,
      },
    });
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      timeout: 80 * 1000, // 80 seconds - ensures the socket does not get closed too early while the camera has up to 1 minute to reply
      soapHeaders: subscriptionParams.additionalSoapHeaders,
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
    const body = build({
      SetSynchronizationPoint: { $: { xmlns: 'http://www.onvif.org/ver10/events/wsdl' } },
    });
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
    const body = build({
      Renew: {
        $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' },
        TerminationTime: 'PT2M', // 2 mins (larger than the 1 min Pull timeout)
      },
    });
    const [data] = await this.onvif.request({
      url: subscriptionParams.url,
      body,
      timeout: 80 * 1000, // 80 seconds - ensures the socket does not get closed too early while the camera has up to 1 minute to reply
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
    const subscriptionParams = this.getSubscriptionUrlAndHeaders(
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/UnsubscribeRequest',
    );
    const body = build({
      Unsubscribe: { $: { xmlns: 'http://docs.oasis-open.org/wsn/b-2' } },
    });
    await this.onvif.request({
      url: subscriptionParams.url,
      body,
      soapHeaders: subscriptionParams.additionalSoapHeaders,
    });
    this.removeAllListeners();
    delete this.subscription;
  }

  /**
   * Restart the event request with an increasing interval when the connection to the device is refused
   * @private
   */
  private restartEventRequest() {
    setTimeout(this.eventPull.bind(this), this.eventReconnectMs);
    if (this.eventReconnectMs < MAX_EVENT_RECONNECT_MS) {
      this.eventReconnectMs = 1.111 * this.eventReconnectMs;
    }
  }

  /**
   * Get params for concrete subscription
   * @private
   */
  private getSubscriptionUrlAndHeaders(
    soapAction = 'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
  ) {
    if (!this.subscription?.subscriptionReference.address) {
      throw new Error(`You should have pull-point subscription. ${JSON.stringify(this.subscription)}`);
    }
    const url = new URL(this.subscription.subscriptionReference.address);
    const axisSubscriptionId = this.subscription?.subscriptionReference.referenceParameters?.subscriptionId;
    const additionalSoapHeaders = `
<a:To mustUnderstand="1">${url.href}</a:To>
<a:Action s:mustUnderstand="1">${soapAction}</a:Action>
${axisSubscriptionId ? `<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">${axisSubscriptionId}</SubscriptionId>` : ''}
`;
    return { url, axisSubscriptionId, additionalSoapHeaders };
  }
}
