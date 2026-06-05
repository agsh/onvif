/**
 * Analytics ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver20/analytics/wsdl/analytics.wsdl
 */

import { Onvif, OnvifServices } from './onvif';
import { toOnvifXMLSchemaObject } from './utils';
import Service from './service';
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

/**
 * Analytics service
 */
export class Analytics extends Service {
  constructor(onvif: Onvif, service: keyof OnvifServices) {
    super(onvif, service);
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
    const response = await this.request({
      GetServiceCapabilities: {},
    });
    return response.getServiceCapabilitiesResponse?.capabilities ?? {};
  }

  /**
   * Returns the types of rules supported by the device for a video analytics configuration.
   * @param options
   */
  async getSupportedRules({ configurationToken }: GetSupportedRules): Promise<SupportedRules> {
    const response = await this.request(
      {
        GetSupportedRules: {
          ConfigurationToken: configurationToken,
        },
      },
      { array: ['ruleDescription'] },
    );
    return response.getSupportedRulesResponse.supportedRules;
  }

  /**
   * Creates one or more rules on a video analytics configuration.
   * @param options
   */
  async createRules({ configurationToken, rule }: CreateRules): Promise<void> {
    await this.request({
      CreateRules: {
        ConfigurationToken: configurationToken,
        Rule: Analytics.configsToBuild(rule),
      },
    });
  }

  /**
   * Deletes rules from a video analytics configuration.
   * @param options
   */
  async deleteRules({ configurationToken, ruleName }: DeleteRules): Promise<void> {
    await this.request({
      DeleteRules: {
        ConfigurationToken: configurationToken,
        RuleName: Analytics.namesToBuild(ruleName),
      },
    });
  }

  /**
   * Modifies rules on a video analytics configuration.
   * @param options
   */
  async modifyRules({ configurationToken, rule }: ModifyRules): Promise<void> {
    await this.request({
      ModifyRules: {
        ConfigurationToken: configurationToken,
        Rule: Analytics.configsToBuild(rule),
      },
    });
  }

  /**
   * Returns the rules configured on a video analytics configuration.
   * @param options
   */
  async getRules({ configurationToken }: GetRules): Promise<Config[]> {
    const response = await this.request(
      {
        GetRules: {
          ConfigurationToken: configurationToken,
        },
      },
      { array: ['rule'] },
    );
    return response.getRulesResponse.rule ?? [];
  }

  /**
   * Returns options for a supported rule type.
   * @param options
   */
  async getRuleOptions({ configurationToken, ruleType }: GetRuleOptions): Promise<ConfigOptions[]> {
    const response = await this.request(
      {
        GetRuleOptions: {
          ConfigurationToken: configurationToken,
          ...(ruleType !== undefined && { RuleType: ruleType }),
        },
      },
      { array: ['ruleOptions'] },
    );
    return response.getRuleOptionsResponse.ruleOptions ?? [];
  }

  /**
   * Returns the types of analytics modules supported by the device.
   * @param options
   */
  async getSupportedAnalyticsModules({
    configurationToken,
  }: GetSupportedAnalyticsModules): Promise<SupportedAnalyticsModules> {
    const response = await this.request(
      {
        GetSupportedAnalyticsModules: {
          ConfigurationToken: configurationToken,
        },
      },
      { array: ['analyticsModuleDescription'] },
    );
    return response.getSupportedAnalyticsModulesResponse.supportedAnalyticsModules;
  }

  /**
   * Creates analytics modules on a video analytics configuration.
   * @param options
   */
  async createAnalyticsModules({ configurationToken, analyticsModule }: CreateAnalyticsModules): Promise<void> {
    await this.request({
      CreateAnalyticsModules: {
        ConfigurationToken: configurationToken,
        AnalyticsModule: Analytics.configsToBuild(analyticsModule),
      },
    });
  }

  /**
   * Deletes analytics modules from a video analytics configuration.
   * @param options
   */
  async deleteAnalyticsModules({ configurationToken, analyticsModuleName }: DeleteAnalyticsModules): Promise<void> {
    await this.request({
      DeleteAnalyticsModules: {
        ConfigurationToken: configurationToken,
        AnalyticsModuleName: Analytics.namesToBuild(analyticsModuleName),
      },
    });
  }

  /**
   * Returns analytics modules configured on a video analytics configuration.
   * @param options
   */
  async getAnalyticsModules({ configurationToken }: GetAnalyticsModules): Promise<Config[]> {
    const response = await this.request(
      {
        GetAnalyticsModules: {
          ConfigurationToken: configurationToken,
        },
      },
      { array: ['analyticsModule'] },
    );
    return response.getAnalyticsModulesResponse.analyticsModule ?? [];
  }

  /**
   * Modifies analytics modules on a video analytics configuration.
   * @param options
   */
  async modifyAnalyticsModules({ configurationToken, analyticsModule }: ModifyAnalyticsModules): Promise<void> {
    await this.request({
      ModifyAnalyticsModules: {
        ConfigurationToken: configurationToken,
        AnalyticsModule: Analytics.configsToBuild(analyticsModule),
      },
    });
  }

  /**
   * Returns options for a supported analytics module type.
   * @param options
   */
  async getAnalyticsModuleOptions({ configurationToken, type }: GetAnalyticsModuleOptions): Promise<ConfigOptions[]> {
    const response = await this.request(
      {
        GetAnalyticsModuleOptions: {
          ConfigurationToken: configurationToken,
          ...(type !== undefined && { Type: type }),
        },
      },
      { array: ['options'] },
    );
    return response.getAnalyticsModuleOptionsResponse.options ?? [];
  }

  /**
   * Returns sample metadata produced by analytics modules.
   * @param options
   */
  async getSupportedMetadata(options: GetSupportedMetadata = {}): Promise<MetadataInfo[]> {
    const response = await this.request(
      {
        GetSupportedMetadata: {
          ...(options.type !== undefined && { Type: options.type }),
        },
      },
      { array: ['analyticsModule'] },
    );
    return response.getSupportedMetadataResponse?.analyticsModule ?? [];
  }
}
