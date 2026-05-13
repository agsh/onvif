/**
 * Events ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/specs/core/ONVIF-Core-Specification.pdf
 * @see https://www.onvif.org/ver10/events/wsdl/event.wsdl
 */

import { Onvif } from './onvif';
import {
  Capabilities,
  CreatePullPointSubscription,
  CreatePullPointSubscriptionResponse,
  GetEventPropertiesResponse,
  GetServiceCapabilitiesResponse,
  PullMessages,
  PullMessagesResponse,
} from './interfaces/event';
import { build, linerase } from './utils';
import { ReferenceToken } from './interfaces/common';
import { AnyURI } from './interfaces/basics';

interface OnvifEvents {
  name?: string;
  messageLimit?: number;
  subscription?: PullPointSubscription;
  eventReconnectMs?: number;
}

const retryErrorCodes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH'];

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
  private events: OnvifEvents = {};

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
          delete this.events.eventReconnectMs;
          this.eventPull();
        } catch (error: any) {
          this.onvif.emit('eventsError', error);
          if (error.code && retryErrorCodes.includes(error.code)) {
            // connection reset on creation - restart Event loop for pullMessages request
            //TODO this._restartEventRequest();
          }
        }
      } else {
        this.eventPull();
      }
    } else {
      delete this.events.subscription;
      //TODO this.unsubscribe();
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
        InitialTerminationTime: options?.initialTerminationTime ?? 'PT5M',
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
  eventPull() {
    if (this.onvif.listeners('event').length && this.events.subscription) {
      // check for event listeners, if zero, or no subscription then stop pulling
    } else {
      delete this.events.subscription;
      if (this.events.subscription) {
        //TODO this.unsubscribe();
      }
    }
  }

  async pullMessages(options?: PullMessages): Promise<PullMessagesResponse> {
    if (!this.events.subscription?.subscriptionReference.address) {
      throw new Error('You should create pull-point subscription first.');
    }
    const url = new URL(this.events.subscription.subscriptionReference.address);

    const axisSubscriptionId = this.events.subscription?.subscriptionReference.referenceParameters?.subscriptionId; // hack for axis cams

    const body = build({
      PullMessages: {
        $: {
          xmlns: 'http://www.onvif.org/ver10/events/wsdl',
        },
        Timeout: options?.timeout ?? 'PT1M', // ONVIF Spec says cameras must support 1 Minute wait times. Ensure network socket has a replyTimeout that is larger that 1 minute
        MessageLimit: options?.messageLimit ?? 10,
      },
    });
    // console.log(url, body);
    const [data] = await this.onvif.request({
      url,
      body,
      timeout: 80 * 1000, // 80 seconds - ensures the socket does not get closed too early while the camera has up to 1 minute to reply
      soapHeaders: `
<a:To mustUnderstand="1">${url.href}</a:To>
<a:Action s:mustUnderstand="1">http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest</a:Action>
${axisSubscriptionId ? `<SubscriptionId xmlns="http://www.axis.com/2009/event" a:IsReferenceParameter="true">${axisSubscriptionId}</SubscriptionId>` : ''}
`,
    });
    return linerase(data, { array: ['notificationMessage'] }).pullMessagesResponse;
  }
}
