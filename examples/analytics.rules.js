/**
 * Profile T / M: list analytics rules and modules for the active profile.
 *
 * Run after build:
 *   node examples/analytics.rules.js
 */

const { Onvif } = require('../build');

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
  });

  await onvif.connect();

  if (!onvif.uri.analytics) {
    console.log('Device does not advertise Analytics service');
    await onvif.close();
    return;
  }

  const configurationToken =
    onvif.defaultProfile?.videoAnalyticsConfiguration?.token ??
    (await onvif.media.getVideoAnalyticsConfigurations().catch(() => []))[0]?.token;

  if (!configurationToken) {
    console.log('No video analytics configuration token found');
    await onvif.close();
    return;
  }

  console.log('Analytics configuration token:', configurationToken);

  const supportedRules = await onvif.analytics.getSupportedRules({ configurationToken });
  const rules = await onvif.analytics.getRules({ configurationToken });
  const supportedModules = await onvif.analytics.getSupportedAnalyticsModules({ configurationToken });
  const modules = await onvif.analytics.getAnalyticsModules({ configurationToken });

  console.log(
    'Supported rules:',
    supportedRules.ruleDescription?.map((r) => r.name) ?? [],
  );
  console.log(
    'Configured rules:',
    rules.map((r) => ({ name: r.name, type: r.type })),
  );
  console.log(
    'Supported modules:',
    supportedModules.analyticsModuleDescription?.map((m) => m.name) ?? [],
  );
  console.log(
    'Configured modules:',
    modules.map((m) => ({ name: m.name, type: m.type })),
  );

  await onvif.close();
})().catch(console.error);
