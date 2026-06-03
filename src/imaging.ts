/**
 * Imaging ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver20/imaging/wsdl/imaging.wsdl
 */

import { Onvif } from './onvif';
import { build, linerase } from './utils';
import { ReferenceToken } from './interfaces/common';
import {
  BacklightCompensation20,
  Exposure20,
  FocusConfiguration20,
  FocusMove,
  ImagingOptions20,
  ImagingSettings20,
  ImagingStatus20,
  MoveOptions20,
  WhiteBalance20,
  WideDynamicRange20,
} from './interfaces/onvif';
import {
  Capabilities,
  GetCurrentPreset,
  GetCurrentPresetResponse,
  GetImagingSettings,
  GetMoveOptions,
  GetOptions,
  GetPresets,
  GetStatus,
  ImagingPreset,
  Move,
  SetCurrentPreset,
  SetImagingSettings,
  Stop,
} from './interfaces/imaging.2';

const IMAGING_XMLNS = 'http://www.onvif.org/ver20/imaging/wsdl';
const SCHEMA_XMLNS = 'http://www.onvif.org/ver10/schema';

interface VideoSourceTokenExtended {
  videoSourceToken?: ReferenceToken;
}

type GetImagingSettingsExtended = VideoSourceTokenExtended & Omit<GetImagingSettings, 'videoSourceToken'>;
type SetImagingSettingsExtended = VideoSourceTokenExtended & Omit<SetImagingSettings, 'videoSourceToken'>;
type GetOptionsExtended = VideoSourceTokenExtended & Omit<GetOptions, 'videoSourceToken'>;
type MoveExtended = VideoSourceTokenExtended & Omit<Move, 'videoSourceToken'>;
type GetMoveOptionsExtended = VideoSourceTokenExtended & Omit<GetMoveOptions, 'videoSourceToken'>;
type StopExtended = VideoSourceTokenExtended & Omit<Stop, 'videoSourceToken'>;
type GetStatusExtended = VideoSourceTokenExtended & Omit<GetStatus, 'videoSourceToken'>;
type GetPresetsExtended = VideoSourceTokenExtended & Omit<GetPresets, 'videoSourceToken'>;
type GetCurrentPresetExtended = VideoSourceTokenExtended & Omit<GetCurrentPreset, 'videoSourceToken'>;
type SetCurrentPresetExtended = VideoSourceTokenExtended & Omit<SetCurrentPreset, 'videoSourceToken'>;

/**
 * Imaging service
 * @example
 * ```ts
 *   const is = await cam.imaging.getImagingSettings();
 *   is.brightness = 70;
 *   await cam.imaging.setImagingSettings({
 *     imagingSettings: is,
 *     forcePersistence: true,
 *   });
 * ```
 */
export class Imaging {
  private readonly onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  private videoSourceToken(videoSourceToken?: ReferenceToken): ReferenceToken {
    return videoSourceToken ?? this.onvif.activeSource!.videoSourceToken;
  }

  private static backlightCompensationToBuild(backlightCompensation: BacklightCompensation20) {
    return {
      Mode: backlightCompensation.mode,
      ...(backlightCompensation.level !== undefined && { Level: backlightCompensation.level }),
    };
  }

  private static exposureToBuild(exposure: Exposure20) {
    return {
      Mode: exposure.mode,
      ...(exposure.priority && { Priority: exposure.priority }),
      ...(exposure.window && {
        Window: {
          Bottom: exposure.window.bottom,
          Top: exposure.window.top,
          Right: exposure.window.right,
          Left: exposure.window.left,
        },
      }),
      ...(exposure.minExposureTime && { MinExposureTime: exposure.minExposureTime }),
      ...(exposure.maxExposureTime && { MaxExposureTime: exposure.maxExposureTime }),
      ...(exposure.minGain && { MinGain: exposure.minGain }),
      ...(exposure.maxGain && { MaxGain: exposure.maxGain }),
      ...(exposure.minIris && { MinIris: exposure.minIris }),
      ...(exposure.maxIris && { MaxIris: exposure.maxIris }),
      ...(exposure.exposureTime && { ExposureTime: exposure.exposureTime }),
      ...(exposure.gain && { Gain: exposure.gain }),
      ...(exposure.iris && { Iris: exposure.iris }),
    };
  }

  private static focusConfigurationToBuild(focus: FocusConfiguration20) {
    return {
      ...(focus.AFMode && { AFMode: focus.AFMode }),
      AutoFocusMode: focus.autoFocusMode,
      ...(focus.defaultSpeed && { DefaultSpeed: focus.defaultSpeed }),
      ...(focus.nearLimit && { NearLimit: focus.nearLimit }),
      ...(focus.farLimit && { FarLimit: focus.farLimit }),
      ...(focus.extension && { Extension: focus.extension }),
    };
  }

  private static wideDynamicRangeToBuild(wideDynamicRange: WideDynamicRange20) {
    return {
      Mode: wideDynamicRange.mode,
      ...(wideDynamicRange.level && { Level: wideDynamicRange.level }),
    };
  }

  private static whiteBalanceToBuild(whiteBalance: WhiteBalance20) {
    return {
      Mode: whiteBalance.mode,
      ...(whiteBalance.crGain && { CrGain: whiteBalance.crGain }),
      ...(whiteBalance.cbGain && { CbGain: whiteBalance.cbGain }),
      ...(whiteBalance.extension && { Extension: whiteBalance.extension }),
    };
  }

  private static imagingSettingsToBuild(settings: ImagingSettings20) {
    return {
      $: { xmlns: SCHEMA_XMLNS },
      ...(settings.backlightCompensation && {
        BacklightCompensation: Imaging.backlightCompensationToBuild(settings.backlightCompensation),
      }),
      ...(settings.brightness && { Brightness: settings.brightness }),
      ...(settings.colorSaturation && { ColorSaturation: settings.colorSaturation }),
      ...(settings.contrast && { Contrast: settings.contrast }),
      ...(settings.exposure && { Exposure: Imaging.exposureToBuild(settings.exposure) }),
      ...(settings.focus && { Focus: Imaging.focusConfigurationToBuild(settings.focus) }),
      ...(settings.irCutFilter && { IrCutFilter: settings.irCutFilter }),
      ...(settings.sharpness && { Sharpness: settings.sharpness }),
      ...(settings.wideDynamicRange && {
        WideDynamicRange: Imaging.wideDynamicRangeToBuild(settings.wideDynamicRange),
      }),
      ...(settings.whiteBalance && {
        WhiteBalance: Imaging.whiteBalanceToBuild(settings.whiteBalance),
      }),
      ...(settings.extension && { Extension: settings.extension }),
    };
  }

  private static focusMoveToBuild(focus: FocusMove) {
    return {
      ...(focus.absolute && {
        Absolute: {
          Position: focus.absolute.position,
          ...(focus.absolute.speed && { Speed: focus.absolute.speed }),
        },
      }),
      ...(focus.relative && {
        Relative: {
          Distance: focus.relative.distance,
          ...(focus.relative.speed && { Speed: focus.relative.speed }),
        },
      }),
      ...(focus.continuous && {
        Continuous: {
          Speed: focus.continuous.speed,
        },
      }),
    };
  }

  /**
   * Returns the capabilities of the imaging service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const body = build({
      GetServiceCapabilities: {
        $: { xmlns: IMAGING_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'imaging', body });
    return linerase(data).getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Get the imaging configuration for the requested video source.
   * @param options
   */
  async getImagingSettings({ videoSourceToken }: GetImagingSettingsExtended = {}): Promise<ImagingSettings20> {
    const body = build({
      GetImagingSettings: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
      },
    });
    const [data] = await this.onvif.request({ service: 'imaging', body });
    return linerase(data).getImagingSettingsResponse.imagingSettings;
  }

  /**
   * Set the imaging configuration for the requested video source.
   * @param options
   */
  async setImagingSettings({
    videoSourceToken,
    imagingSettings,
    forcePersistence,
  }: SetImagingSettingsExtended): Promise<void> {
    const body = build({
      SetImagingSettings: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
        ImagingSettings: Imaging.imagingSettingsToBuild(imagingSettings),
        ...(forcePersistence && { ForcePersistence: forcePersistence }),
      },
    });
    await this.onvif.request({ service: 'imaging', body });
  }

  /**
   * Get valid ranges for imaging parameters that have device-specific ranges.
   * @param options
   */
  async getOptions({ videoSourceToken }: GetOptionsExtended = {}): Promise<ImagingOptions20> {
    const body = build({
      GetOptions: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
      },
    });
    const [data] = await this.onvif.request({ service: 'imaging', body });
    return linerase(data).getOptionsResponse.imagingOptions;
  }

  /**
   * Move the focus lens in absolute, relative, or continuous manner.
   * @param options
   */
  async move({ videoSourceToken, focus }: MoveExtended): Promise<void> {
    const body = build({
      Move: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
        Focus: Imaging.focusMoveToBuild(focus),
      },
    });
    await this.onvif.request({ service: 'imaging', body });
  }

  /**
   * Get valid ranges for focus lens move options.
   * @param options
   */
  async getMoveOptions({ videoSourceToken }: GetMoveOptionsExtended = {}): Promise<MoveOptions20> {
    const body = build({
      GetMoveOptions: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
      },
    });
    const [data] = await this.onvif.request({ service: 'imaging', body });
    return linerase(data).getMoveOptionsResponse.moveOptions;
  }

  /**
   * Stop ongoing focus movement for the requested video source.
   * @param options
   */
  async stop({ videoSourceToken }: StopExtended = {}): Promise<void> {
    const body = build({
      Stop: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
      },
    });
    await this.onvif.request({ service: 'imaging', body });
  }

  /**
   * Get imaging status for the requested video source.
   * @param options
   */
  async getStatus({ videoSourceToken }: GetStatusExtended = {}): Promise<ImagingStatus20> {
    const body = build({
      GetStatus: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
      },
    });
    const [data] = await this.onvif.request({ service: 'imaging', body });
    return linerase(data).getStatusResponse.status;
  }

  /**
   * Get imaging presets available for the requested video source.
   * @param options
   */
  async getPresets({ videoSourceToken }: GetPresetsExtended = {}): Promise<ImagingPreset[]> {
    const body = build({
      GetPresets: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
      },
    });
    const [data] = await this.onvif.request({ service: 'imaging', body });
    return linerase(data, { array: ['preset'] }).getPresetsResponse.preset ?? [];
  }

  /**
   * Get the current imaging preset for the requested video source.
   * @param options
   */
  async getCurrentPreset({ videoSourceToken }: GetCurrentPresetExtended = {}): Promise<ImagingPreset> {
    const body = build({
      GetCurrentPreset: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
      },
    });
    const [data] = await this.onvif.request({ service: 'imaging', body });
    return linerase(data).getCurrentPresetResponse.preset;
  }

  /**
   * Apply an imaging preset to the requested video source.
   * @param options
   */
  async setCurrentPreset({ videoSourceToken, presetToken }: SetCurrentPresetExtended): Promise<void> {
    const body = build({
      SetCurrentPreset: {
        $: { xmlns: IMAGING_XMLNS },
        VideoSourceToken: this.videoSourceToken(videoSourceToken),
        PresetToken: presetToken,
      },
    });
    await this.onvif.request({ service: 'imaging', body });
  }
}
