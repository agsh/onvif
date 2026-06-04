/**
 * Analytics ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver20/analytics/wsdl/analytics.wsdl
 */

import { Onvif } from './onvif';
import { build, linerase, toOnvifXMLSchemaObject } from './utils';
import { Config, SupportedAnalyticsModules, SupportedRules } from './interfaces/onvif';
import {
  Capabilities,
  ConfigOptions,
  CreateAnalyticsModules,
  CreateRules,
  DeleteAnalyticsModules,
  DeleteRules,
  GetAnalyticsModuleOptions,
  GetAnalyticsModules,
  GetRuleOptions,
  GetRules,
  GetSupportedAnalyticsModules,
  GetSupportedMetadata,
  GetSupportedMetadataResponse,
  GetSupportedRules,
  MetadataInfo,
  ModifyAnalyticsModules,
  ModifyRules,
} from './interfaces/analytics.2';

const ANALYTICS_XMLNS = 'http://www.onvif.org/ver20/analytics/wsdl';

/**
 * Analytics service
 */
export class Analytics {
  private readonly onvif: Onvif;

  constructor(onvif: Onvif) {
    this.onvif = onvif;
  }

  private static configsToBuild(configs?: Config[]) {
    if (!configs?.length) {
      return undefined;
    }
    const built = configs.map((config) => toOnvifXMLSchemaObject.config(config));
    return built.length === 1 ? built[0] : built;
  }

  private static namesToBuild(names?: string[]) {
    if (!names?.length) {
      return undefined;
    }
    return names.length === 1 ? names[0] : names;
  }

  /**
   * Returns the capabilities of the analytics service.
   */
  async getServiceCapabilities(): Promise<Capabilities> {
    const body = build({
      GetServiceCapabilities: {
        $: { xmlns: ANALYTICS_XMLNS },
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data).getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns the types of rules supported by the device for a video analytics configuration.
   * @param options
   */
  async getSupportedRules({ configurationToken }: GetSupportedRules): Promise<SupportedRules> {
    const body = build({
      GetSupportedRules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data, { array: ['ruleDescription'] }).getSupportedRulesResponse.supportedRules;
  }

  /**
   * Creates one or more rules on a video analytics configuration.
   * @param options
   */
  async createRules({ configurationToken, rule }: CreateRules): Promise<void> {
    const body = build({
      CreateRules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        Rule: Analytics.configsToBuild(rule),
      },
    });
    await this.onvif.request({ service: 'analytics', body });
  }

  /**
   * Deletes rules from a video analytics configuration.
   * @param options
   */
  async deleteRules({ configurationToken, ruleName }: DeleteRules): Promise<void> {
    const body = build({
      DeleteRules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        RuleName: Analytics.namesToBuild(ruleName),
      },
    });
    await this.onvif.request({ service: 'analytics', body });
  }

  /**
   * Modifies rules on a video analytics configuration.
   * @param options
   */
  async modifyRules({ configurationToken, rule }: ModifyRules): Promise<void> {
    const body = build({
      ModifyRules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        Rule: Analytics.configsToBuild(rule),
      },
    });
    await this.onvif.request({ service: 'analytics', body });
  }

  /**
   * Returns the rules configured on a video analytics configuration.
   * @param options
   */
  async getRules({ configurationToken }: GetRules): Promise<Config[]> {
    const body = build({
      GetRules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data, { array: ['rule'] }).getRulesResponse.rule ?? [];
  }

  /**
   * Returns options for a supported rule type.
   * @param options
   */
  async getRuleOptions({ configurationToken, ruleType }: GetRuleOptions): Promise<ConfigOptions[]> {
    const body = build({
      GetRuleOptions: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        ...(ruleType !== undefined && { RuleType: ruleType }),
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data, { array: ['ruleOptions'] }).getRuleOptionsResponse.ruleOptions ?? [];
  }

  /**
   * Returns the types of analytics modules supported by the device.
   * @param options
   */
  async getSupportedAnalyticsModules({
    configurationToken,
  }: GetSupportedAnalyticsModules): Promise<SupportedAnalyticsModules> {
    const body = build({
      GetSupportedAnalyticsModules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data, { array: ['analyticsModuleDescription'] }).getSupportedAnalyticsModulesResponse
      .supportedAnalyticsModules;
  }

  /**
   * Creates analytics modules on a video analytics configuration.
   * @param options
   */
  async createAnalyticsModules({ configurationToken, analyticsModule }: CreateAnalyticsModules): Promise<void> {
    const body = build({
      CreateAnalyticsModules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        AnalyticsModule: Analytics.configsToBuild(analyticsModule),
      },
    });
    await this.onvif.request({ service: 'analytics', body });
  }

  /**
   * Deletes analytics modules from a video analytics configuration.
   * @param options
   */
  async deleteAnalyticsModules({ configurationToken, analyticsModuleName }: DeleteAnalyticsModules): Promise<void> {
    const body = build({
      DeleteAnalyticsModules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        AnalyticsModuleName: Analytics.namesToBuild(analyticsModuleName),
      },
    });
    await this.onvif.request({ service: 'analytics', body });
  }

  /**
   * Returns analytics modules configured on a video analytics configuration.
   * @param options
   */
  async getAnalyticsModules({ configurationToken }: GetAnalyticsModules): Promise<Config[]> {
    const body = build({
      GetAnalyticsModules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data, { array: ['analyticsModule'] }).getAnalyticsModulesResponse.analyticsModule ?? [];
  }

  /**
   * Modifies analytics modules on a video analytics configuration.
   * @param options
   */
  async modifyAnalyticsModules({ configurationToken, analyticsModule }: ModifyAnalyticsModules): Promise<void> {
    const body = build({
      ModifyAnalyticsModules: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        AnalyticsModule: Analytics.configsToBuild(analyticsModule),
      },
    });
    await this.onvif.request({ service: 'analytics', body });
  }

  /**
   * Returns options for a supported analytics module type.
   * @param options
   */
  async getAnalyticsModuleOptions({ configurationToken, type }: GetAnalyticsModuleOptions): Promise<ConfigOptions[]> {
    const body = build({
      GetAnalyticsModuleOptions: {
        $: { xmlns: ANALYTICS_XMLNS },
        ConfigurationToken: configurationToken,
        ...(type !== undefined && { Type: type }),
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data, { array: ['options'] }).getAnalyticsModuleOptionsResponse.options ?? [];
  }

  /**
   * Returns sample metadata produced by analytics modules.
   * @param options
   */
  async getSupportedMetadata(options: GetSupportedMetadata = {}): Promise<MetadataInfo[]> {
    const body = build({
      GetSupportedMetadata: {
        $: { xmlns: ANALYTICS_XMLNS },
        ...(options.type !== undefined && { Type: options.type }),
      },
    });
    const [data] = await this.onvif.request({ service: 'analytics', body });
    return linerase(data, { array: ['analyticsModule'] }).getSupportedMetadataResponse?.analyticsModule ?? [];
  }
}
