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
import { build, linerase } from './utils';
import { AnyURI } from './interfaces/basics';
import { ItemList } from './interfaces/onvif';

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
  subscriptionReference?: EndpointReference;
  producerReference?: EndpointReference;
  message: { message: EventMessage };
}

export interface Topic {
  _: string; // ex. "tns1:RuleEngine/CellMotionDetector/Motion"
  dialect?: string; // ex. "http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet"
}

export interface EndpointReference {
  address?: any;
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
        // if there is no pull-point subscription or it has expired, create new subscription
        try {
          await this.createPullPointSubscription();
          await this.setSynchronizationPoint();
          delete this.events.eventReconnectMs;
          this.eventPull();
        } catch (error) {
          this.onvif.emit('eventsError', error);
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

  /**
   * This method returns a PullPointSubscription that can be polled using PullMessages. This message contains the same
   * elements as the SubscriptionRequest of the WS-BaseNotification without the ConsumerReference.
   * If no Filter is specified the pullpoint notifies all occurring events to the client.
   * This method is mandatory.
   */
  async createPullPointSubscription(options?: CreatePullPointSubscription): Promise<PullPointSubscription> {
    const body = build({
      CreatePullPointSubscription: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        InitialTerminationTime: options?.initialTerminationTime ?? 'PT2M',
        Filter: options?.filter,
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
        this.onvif.emit('eventsError', error);
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
    const subscriptionParams = this.getSubsctiptionUrlAndHeaders(
      'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest',
    );
    const body = build({
      PullMessages: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
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
    const subscriptionParams = this.getSubsctiptionUrlAndHeaders(
      'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/RenewRequest',
    );
    const body = build({
      Renew: {
        $: {
          xmlns: 'http://docs.oasis-open.org/wsn/b-2',
        },
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
    const subscriptionParams = this.getSubsctiptionUrlAndHeaders(
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
    const subscriptionParams = this.getSubsctiptionUrlAndHeaders(
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
    const subscriptionParams = this.getSubsctiptionUrlAndHeaders(
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
  private getSubsctiptionUrlAndHeaders(
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
}
