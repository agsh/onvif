/**
 * Profile D: listen for AccessControl request events, decide grant/deny
 * externally, then command the peripheral (ExternalAuthorization + optional
 * Feedback / DoorControl).
 *
 * Same AccessControl / DoorControl / Credential services as Profiles C / A;
 * the client owns rules and schedules (device is a peripheral).
 *
 * Run after build:
 *   node examples/access.externalAuthorization.js
 *
 * Ctrl+C to exit.
 */

const { Onvif, Subscription } = require('../build');

const HOSTNAME = '192.168.1.13';
const PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'admin';

/** Demo policy: grant when IdentifierValue is in this set (replace with your AC). */
const ALLOWED_IDENTIFIERS = new Set(['12345678', 'AABBCCDDEEFF']);

function itemValue(list, name) {
  const hit = list?.simpleItem?.find((item) => item.name === name);
  return hit?.value === undefined ? undefined : String(hit.value);
}

function looksLikeAccessRequest(topic) {
  const bare = topic.includes(':') ? topic.slice(topic.indexOf(':') + 1) : topic;
  return (
    bare === 'AccessControl/Request/Credential' ||
    bare === 'AccessControl/Request/Identifier' ||
    bare === 'AccessControl/Request/Anonymous' ||
    bare.endsWith('/Request/Credential') ||
    bare.endsWith('/Request/Identifier') ||
    bare.endsWith('/Request/Anonymous')
  );
}

(async () => {
  const onvif = new Onvif({
    hostname: HOSTNAME,
    username: USERNAME,
    password: PASSWORD,
    port: PORT,
  });

  // Peripherals often have no Media; Discovery may already set defaultMedia false
  await onvif.connect({ media: false });

  if (!onvif.uri.accesscontrol) {
    console.log('Device does not advertise AccessControl service');
    await onvif.close();
    return;
  }

  const caps = await onvif.accessControl.getServiceCapabilities();
  console.log('AccessControl capabilities:', caps);

  const { accessPointInfo = [] } = await onvif.accessControl.getAccessPointInfoList();
  console.log(
    'Access points:',
    accessPointInfo.map((ap) => ({
      token: ap.token,
      name: ap.name,
      externalAuthorization: ap.capabilities?.externalAuthorization,
      identifierAccess: ap.capabilities?.identifierAccess,
    })),
  );

  if (!accessPointInfo.length && !onvif.activeAccessPointToken) {
    console.log('No access point token');
    await onvif.close();
    return;
  }

  const defaultAp =
    accessPointInfo.find((ap) => ap.capabilities?.externalAuthorization)?.token ??
    accessPointInfo[0]?.token ??
    onvif.activeAccessPointToken;

  if (defaultAp) {
    await onvif.setActiveAccessPoint(defaultAp);
  }

  // Optional: local whitelist when the device supports Credential lists
  if (onvif.uri.credential) {
    try {
      const formatTypes = await onvif.credential.getSupportedFormatTypes({
        credentialIdentifierTypeName: 'pt:Card',
      });
      console.log('Credential format types (pt:Card):', formatTypes.length);
    } catch (err) {
      console.log('Credential format types unavailable:', err.message);
    }
  }

  const sub = new Subscription(onvif, {
    filter: {
      topicExpression: [{ expression: 'tns1:AccessControl//.' }],
    },
  });
  sub.on('error', console.error);

  sub.on('data', async (msg) => {
    const topic = String(msg.topic?._ ?? '');
    if (!looksLikeAccessRequest(topic)) {
      console.log('event', topic);
      return;
    }

    const m = msg.message.message;
    const accessPointToken =
      itemValue(m.source, 'AccessPointToken') ?? onvif.activeAccessPointToken;
    const credentialToken = itemValue(m.source, 'CredentialToken') ?? itemValue(m.data, 'CredentialToken');
    const identifierValue =
      itemValue(m.data, 'IdentifierValue') ?? itemValue(m.data, 'CredentialIdentifierValue');

    const granted =
      (identifierValue && ALLOWED_IDENTIFIERS.has(identifierValue)) ||
      // Anonymous / unknown demo: deny unless you map credentialToken yourself
      false;

    const decision = granted ? 'Granted' : 'Denied';
    console.log('Access request', {
      topic,
      accessPointToken,
      credentialToken,
      identifierValue,
      decision,
    });

    try {
      await onvif.accessControl.externalAuthorization({
        accessPointToken,
        ...(credentialToken && { credentialToken }),
        decision,
        reason: granted ? 'AllowList' : 'Deny',
      });

      // Optional reader/LED/buzzer feedback when the access point advertises types
      const apCaps = accessPointInfo.find((ap) => ap.token === accessPointToken)?.capabilities;
      if (apCaps?.supportedFeedbackTypes?.length) {
        await onvif.accessControl.feedback({
          accessPointToken,
          feedbackType: granted ? 'pt:Ok' : 'pt:Error',
        });
      }

      // Optional door pulse when DoorControl is present (same as Profile C)
      if (granted && onvif.uri.doorcontrol) {
        const doorToken = onvif.activeDoorToken;
        if (doorToken) {
          await onvif.doorControl.accessDoor({ token: doorToken });
        }
      }
    } catch (err) {
      console.error('Decision / door command failed:', err.message);
    }
  });

  await sub.subscribe();
  console.log('Listening for AccessControl requests (Ctrl+C to stop)...');

  const shutdown = async () => {
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
    try {
      await sub.unsubscribe();
    } catch {
      // ignore
    }
    await onvif.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch(console.error);
