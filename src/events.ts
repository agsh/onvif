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
  GetEventPropertiesResponse,
  PullMessages,
  PullMessagesResponse,
} from './interfaces/event';
import { build, linerase } from './utils';
import { AnyURI } from './interfaces/basics';

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

type EventMessage = any;

const retryErrorCodes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH'];

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
  async eventPull() {
    // check for event listeners, if zero, or no subscription then stop pulling
    if (this.onvif.listeners('event').length && this.events.subscription) {
      const msgs = await this.pullMessages({
        messageLimit: this.events.messageLimit,
        timeout: 'PT1M',
      });
      console.log('> pull', JSON.stringify(msgs));
      delete this.events.eventReconnectMs;
      msgs.notificationMessage?.forEach((msg: EventMessage) => {
        this.onvif.emit('event', msg);
      });
      if (+msgs.terminationTime <= Date.now()) {
        // this.events.subscription.terminationTime = localTerminationTime(msgs); // Account for camera clock skew when the reported termination time looks expired.
        // Axis cameras require us to Rewew the Pull Point Subscription
        const renewData = await this.renew();
        console.log('>>>> renew', renewData);
        this.events.subscription.terminationTime = localTerminationTime(renewData);
      } else {
        this.events.subscription.terminationTime = msgs.terminationTime;
      }
      this.eventRequest(); // go around the loop again, once the RENEW has completed (and terminationTime updated)

      // TODO rest of the method
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

  async renew(): Promise<TerminationTimeResponse> {
    if (!this.events.subscription?.subscriptionReference.address) {
      throw new Error('You should create pull-point subscription first.');
    }
    const url = new URL(this.events.subscription.subscriptionReference.address);
    const axisSubscriptionId = this.events.subscription?.subscriptionReference.referenceParameters?.subscriptionId;

    const body = build({
      Renew: {
        $: {
          xmlns: 'http://docs.oasis-open.org/wsn/b-2',
        },
        TerminationTime: 'PT2M', // 2 mins (larger than the 1 min Pull timeout)
      },
    });
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
    return linerase(data).renewResponse;
  }
}
