/**
 * Provisioning ver10 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver10/provisioning/wsdl/provisioning.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import {
  Capabilities,
  FocusMove,
  GetUsage,
  PanMove,
  RollMove,
  Stop,
  TiltMove,
  Usage,
  ZoomMove,
} from './interfaces/provisioning';

/**
 * Provisioning service
 * @example
 * ```ts
 *  const caps = await cam.provisioning.getServiceCapabilities();
 *  const videoSource = caps.source![0].videoSourceToken;
 *  await cam.provisioning.panMove({ videoSource, direction: 'Left', timeout: 'PT1S' });
 *  await cam.provisioning.stop({ videoSource });
 * ```
 */
export default class Provisioning extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'provisioning');
  }

  /**
   * Returns the capabilities of the provisioning service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const response = await this.request({ GetServiceCapabilities: {} }, { array: ['source'] });
    return response.getServiceCapabilitiesResponse?.capabilities || {};
  }

  /**
   * Moves the device on the pan axis.
   * @param options
   */
  async panMove({ videoSource, direction, timeout }: PanMove): Promise<void> {
    await this.request({
      PanMove: {
        VideoSource: videoSource,
        Direction: direction,
        ...(timeout !== undefined && { Timeout: timeout }),
      },
    });
  }

  /**
   * Moves the device on the tilt axis.
   * @param options
   */
  async tiltMove({ videoSource, direction, timeout }: TiltMove): Promise<void> {
    await this.request({
      TiltMove: {
        VideoSource: videoSource,
        Direction: direction,
        ...(timeout !== undefined && { Timeout: timeout }),
      },
    });
  }

  /**
   * Changes the focal length relative to the video source.
   * @param options
   */
  async zoomMove({ videoSource, direction, timeout }: ZoomMove): Promise<void> {
    await this.request({
      ZoomMove: {
        VideoSource: videoSource,
        Direction: direction,
        ...(timeout !== undefined && { Timeout: timeout }),
      },
    });
  }

  /**
   * Moves the device on the roll axis.
   * @param options
   */
  async rollMove({ videoSource, direction, timeout }: RollMove): Promise<void> {
    await this.request({
      RollMove: {
        VideoSource: videoSource,
        Direction: direction,
        ...(timeout !== undefined && { Timeout: timeout }),
      },
    });
  }

  /**
   * Moves the focal plane relative to the video source.
   * @param options
   */
  async focusMove({ videoSource, direction, timeout }: FocusMove): Promise<void> {
    await this.request({
      FocusMove: {
        VideoSource: videoSource,
        Direction: direction,
        ...(timeout !== undefined && { Timeout: timeout }),
      },
    });
  }

  /**
   * Stops all provisioning movements for a video source.
   * @param options
   */
  async stop({ videoSource }: Stop): Promise<void> {
    await this.request({ Stop: { VideoSource: videoSource } });
  }

  /**
   * Returns lifetime usage counters for provisioning movements.
   * @param options
   */
  async getUsage({ videoSource }: GetUsage): Promise<Usage> {
    const response = await this.request({ GetUsage: { VideoSource: videoSource } });
    return response.getUsageResponse?.usage || {};
  }
}
