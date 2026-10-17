/**
 * Analytics ver20 module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @see https://www.onvif.org/ver20/analytics/wsdl/analytics.wsdl
 */

import { Onvif } from './onvif';
import Service from './service';
import { Config, SupportedAnalyticsModules, SupportedRules } from './interfaces/onvif';
import type { ReferenceToken } from './interfaces/common';
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
import { ITEM_LIST_PARSE, OnvifValidationError } from './utils';
import { config } from './utils/toOnvifXMLSchemaObject';

/** GetRules / GetAnalyticsModules — Rule and AnalyticsModule lists + ItemList (all unbounded). */
const CONFIG_LIST_PARSE = {
  array: ['rule', 'analyticsModule', ...ITEM_LIST_PARSE.array],
  rawXML: ITEM_LIST_PARSE.rawXML,
};

/** Allow omitting configurationToken when {@link Onvif.activeMediaProfile} has analytics. */
type WithOptionalConfigToken<T extends { configurationToken: ReferenceToken }> = Omit<T, 'configurationToken'> & {
  configurationToken?: ReferenceToken;
};

/**
 * Analytics service — rules and analytics modules on a configuration.
 *
 * @example Discover supported rules/modules for the active profile configuration:
 * ```ts
 * import { Onvif } from 'onvif';
 *
 * const onvif = new Onvif({ hostname: '192.168.1.13', username: 'admin', password: 'admin' });
 * await onvif.connect();
 *
 * // Uses activeMediaProfile.videoAnalyticsConfigurationToken when omitted:
 * const supportedRules = await onvif.analytics.getSupportedRules();
 * const rules = await onvif.analytics.getRules();
 * const supportedModules = await onvif.analytics.getSupportedAnalyticsModules();
 * const modules = await onvif.analytics.getAnalyticsModules();
 *
 * console.log(supportedRules.ruleDescription?.map((r) => r.name));
 * console.log(rules.map((r) => r.name), modules.map((m) => m.name));
 * console.log(supportedModules.analyticsModuleDescription?.map((m) => m.name));
 * ```
 * @category Services
 */
export default class Analytics extends Service {
  constructor(onvif: Onvif) {
    super(onvif, 'analytics');
  }

  /** Prefer explicit token; otherwise {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken. */
  private resolveConfigurationToken(configurationToken?: ReferenceToken): ReferenceToken {
    const token =
      configurationToken ?? this.onvif.activeMediaProfile?.videoAnalyticsConfigurationToken;
    if (!token) {
      throw new OnvifValidationError(
        'configurationToken is required (pass it or connect with a profile that has VideoAnalyticsConfiguration)',
      );
    }
    return token;
  }

  private static configsToBuild(configs?: Config[]) {
    if (!configs?.length) {
      return undefined;
    }
    return configs.map((cfg) => config(cfg));
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
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async getSupportedRules(options: Partial<GetSupportedRules> = {}): Promise<SupportedRules> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
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
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async createRules(options: WithOptionalConfigToken<CreateRules>): Promise<void> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    await this.request({
      CreateRules: {
        ConfigurationToken: configurationToken,
        Rule: Analytics.configsToBuild(options.rule),
      },
    });
  }

  /**
   * Deletes rules from a video analytics configuration.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async deleteRules(options: WithOptionalConfigToken<DeleteRules>): Promise<void> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    await this.request({
      DeleteRules: {
        ConfigurationToken: configurationToken,
        RuleName: Analytics.namesToBuild(options.ruleName),
      },
    });
  }

  /**
   * Modifies rules on a video analytics configuration.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async modifyRules(options: WithOptionalConfigToken<ModifyRules>): Promise<void> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    await this.request({
      ModifyRules: {
        ConfigurationToken: configurationToken,
        Rule: Analytics.configsToBuild(options.rule),
      },
    });
  }

  /**
   * Returns the rules configured on a video analytics configuration.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async getRules(options: Partial<GetRules> = {}): Promise<Config[]> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    const response = await this.request(
      {
        GetRules: {
          ConfigurationToken: configurationToken,
        },
      },
      CONFIG_LIST_PARSE,
    );
    return response.getRulesResponse.rule ?? [];
  }

  /**
   * Returns options for a supported rule type.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async getRuleOptions(options: WithOptionalConfigToken<GetRuleOptions> = {}): Promise<ConfigOptions[]> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    const response = await this.request(
      {
        GetRuleOptions: {
          ConfigurationToken: configurationToken,
          ...(options.ruleType !== undefined && { RuleType: options.ruleType }),
        },
      },
      { array: ['ruleOptions'] },
    );
    return response.getRuleOptionsResponse.ruleOptions ?? [];
  }

  /**
   * Returns the types of analytics modules supported by the device.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async getSupportedAnalyticsModules(
    options: Partial<GetSupportedAnalyticsModules> = {},
  ): Promise<SupportedAnalyticsModules> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
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
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async createAnalyticsModules(options: WithOptionalConfigToken<CreateAnalyticsModules> = {}): Promise<void> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    await this.request({
      CreateAnalyticsModules: {
        ConfigurationToken: configurationToken,
        AnalyticsModule: Analytics.configsToBuild(options.analyticsModule),
      },
    });
  }

  /**
   * Deletes analytics modules from a video analytics configuration.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async deleteAnalyticsModules(options: WithOptionalConfigToken<DeleteAnalyticsModules>): Promise<void> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    await this.request({
      DeleteAnalyticsModules: {
        ConfigurationToken: configurationToken,
        AnalyticsModuleName: Analytics.namesToBuild(options.analyticsModuleName),
      },
    });
  }

  /**
   * Returns analytics modules configured on a video analytics configuration.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async getAnalyticsModules(options: Partial<GetAnalyticsModules> = {}): Promise<Config[]> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    const response = await this.request(
      {
        GetAnalyticsModules: {
          ConfigurationToken: configurationToken,
        },
      },
      CONFIG_LIST_PARSE,
    );
    return response.getAnalyticsModulesResponse.analyticsModule ?? [];
  }

  /**
   * Modifies analytics modules on a video analytics configuration.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async modifyAnalyticsModules(options: WithOptionalConfigToken<ModifyAnalyticsModules> = {}): Promise<void> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    await this.request({
      ModifyAnalyticsModules: {
        ConfigurationToken: configurationToken,
        AnalyticsModule: Analytics.configsToBuild(options.analyticsModule),
      },
    });
  }

  /**
   * Returns options for a supported analytics module type.
   * @param options.configurationToken defaults to {@link Onvif.activeMediaProfile}.videoAnalyticsConfigurationToken
   */
  async getAnalyticsModuleOptions(
    options: WithOptionalConfigToken<GetAnalyticsModuleOptions> = {},
  ): Promise<ConfigOptions[]> {
    const configurationToken = this.resolveConfigurationToken(options.configurationToken);
    const response = await this.request(
      {
        GetAnalyticsModuleOptions: {
          ConfigurationToken: configurationToken,
          ...(options.type !== undefined && { Type: options.type }),
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
