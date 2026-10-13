/**
 * Receiver ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/receiver/wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { Receiver as ReceiverInfo, ReceiverConfiguration, ReceiverStateInformation } from './interfaces/onvif';
import {
  Capabilities,
  ConfigureReceiver,
  CreateReceiver,
  CreateReceiverResponse,
  DeleteReceiver,
  GetReceiver,
  GetReceiverState,
  SetReceiverMode,
} from './interfaces/receiver';
import { streamSetupToBuild } from './utils/toOnvifXMLSchemaObject';

/**
 * Receiver service — configure stream receivers on the device.
 *
 * @example List receivers, inspect state, toggle mode:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * const caps = await onvif.receiver.getServiceCapabilities();
 * const receivers = await onvif.receiver.getReceivers();
 * console.log(caps, receivers.map((r) => r.token));
 *
 * const receiverToken = receivers[0]!.token;
 * const state = await onvif.receiver.getReceiverState({ receiverToken });
 * console.log(state);
 *
 * await onvif.receiver.setReceiverMode({ receiverToken, mode: 'AlwaysConnect' });
 * // await onvif.receiver.deleteReceiver({ receiverToken });
 * ```
 * @category Services
 */
export default class Receiver extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'receiver');
  }

  private static receiverConfigurationToBuild(configuration: ReceiverConfiguration) {
    return {
      Mode: configuration.mode,
      MediaUri: configuration.mediaUri,
      StreamSetup: streamSetupToBuild(configuration.streamSetup),
    };
  }

  /**
   * Returns the capabilities of the receiver service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns all receivers on the device.
   */
  async getReceivers(): Promise<ReceiverInfo[]> {
    const response = await this.request({ GetReceivers: {} }, { array: ['receivers'] });
    return response.getReceiversResponse?.receivers ?? [];
  }

  /**
   * Returns a receiver by token.
   * @param options
   */
  async getReceiver({ receiverToken }: GetReceiver): Promise<ReceiverInfo> {
    const response = await this.request({
      GetReceiver: {
        ReceiverToken: receiverToken,
      },
    });
    return response.getReceiverResponse.receiver;
  }

  /**
   * Creates a new receiver.
   * @param options
   */
  async createReceiver({ configuration }: CreateReceiver): Promise<CreateReceiverResponse['receiver']> {
    const response = await this.request({
      CreateReceiver: {
        Configuration: Receiver.receiverConfigurationToBuild(configuration),
      },
    });
    return response.createReceiverResponse.receiver;
  }

  /**
   * Deletes a receiver.
   * @param options
   */
  async deleteReceiver({ receiverToken }: DeleteReceiver): Promise<void> {
    await this.request({
      DeleteReceiver: {
        ReceiverToken: receiverToken,
      },
    });
  }

  /**
   * Configures an existing receiver.
   * @param options
   */
  async configureReceiver({ receiverToken, configuration }: ConfigureReceiver): Promise<void> {
    await this.request({
      ConfigureReceiver: {
        ReceiverToken: receiverToken,
        Configuration: Receiver.receiverConfigurationToBuild(configuration),
      },
    });
  }

  /**
   * Sets the connection mode of a receiver.
   * @param options
   */
  async setReceiverMode({ receiverToken, mode }: SetReceiverMode): Promise<void> {
    await this.request({
      SetReceiverMode: {
        ReceiverToken: receiverToken,
        Mode: mode,
      },
    });
  }

  /**
   * Returns the current state of a receiver.
   * @param options
   */
  async getReceiverState({ receiverToken }: GetReceiverState): Promise<ReceiverStateInformation> {
    const response = await this.request({
      GetReceiverState: {
        ReceiverToken: receiverToken,
      },
    });
    return response.getReceiverStateResponse.receiverState;
  }
}
