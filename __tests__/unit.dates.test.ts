/**
 * Unit tests: service-boundary Date coercion (parseXml leaves ISO strings).
 * @jest-environment node
 */
import {
  coerceAppInfo,
  coerceCertificateInformation,
  coerceCredentialEntity,
  coerceFindResultList,
  coerceMediaAttributes,
  coerceNotificationMessage,
  coercePTZStatus,
  coerceRecordingInformation,
  coerceRecordingSummary,
  coerceStatusTimes,
  toDate,
} from '../src/utils';
import { parseXml } from '../src/utils/parser';
import Search from '../src/services/search';
import PTZ from '../src/services/ptz';
import AppMgmt from '../src/services/appmgmt';
import Credential from '../src/credential';
import Device from '../src/services/device';
import Events, { Subscription } from '../src/events';
import { Onvif } from '../src/onvif';

const ISO = '2024-06-15T12:30:45.000Z';
const ISO2 = '2024-06-16T08:00:00Z';

describe('toDate / coerce helpers', () => {
  it('toDate converts ISO strings and passes Date through', () => {
    const d = toDate(ISO);
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe(ISO);
    expect(toDate(d)).toBe(d);
  });

  it('parseXml leaves UtcTime / leaf ISO as strings', () => {
    const doc = parseXml(
      `<R><tt:Message xmlns:tt="http://www.onvif.org/ver10/schema" UtcTime="${ISO}"/><When>${ISO2}</When></R>`,
    );
    expect(doc.r.message.utcTime).toBe(ISO);
    expect(doc.r.when).toBe(ISO2);
  });

  it('coerceRecordingSummary / RecordingInformation / MediaAttributes', () => {
    // Fixtures mimic parseXml output (ISO strings) before service coercion.
    const summary = coerceRecordingSummary({
      dataFrom: ISO,
      dataUntil: ISO2,
      numberRecordings: 1,
    } as any);
    expect(summary.dataFrom).toBeInstanceOf(Date);
    expect(summary.dataUntil).toBeInstanceOf(Date);

    const info = coerceRecordingInformation({
      recordingToken: 'r1',
      earliestRecording: ISO,
      latestRecording: ISO2,
      track: [{ trackToken: 't1', dataFrom: ISO, dataTo: ISO2 }],
    } as any);
    expect(info.earliestRecording).toBeInstanceOf(Date);
    expect(info.track![0]!.dataFrom).toBeInstanceOf(Date);

    const media = coerceMediaAttributes({
      recordingToken: 'r1',
      from: ISO,
      until: ISO2,
      trackAttributes: [{ trackInformation: { dataFrom: ISO, dataTo: ISO2 } }],
    } as any);
    expect(media.from).toBeInstanceOf(Date);
    expect((media.trackAttributes as any)[0].trackInformation.dataFrom).toBeInstanceOf(Date);
  });

  it('coerceFindResultList / status / PTZ / app / credential / cert / notification', () => {
    const found = coerceFindResultList({ searchState: 'Completed', result: [{ time: ISO }] } as any);
    expect((found.result as any)[0].time).toBeInstanceOf(Date);

    const status = coerceStatusTimes({ currentTime: ISO, terminationTime: ISO2 } as any);
    expect(status.currentTime).toBeInstanceOf(Date);

    expect(coercePTZStatus({ utcTime: ISO } as any).utcTime).toBeInstanceOf(Date);

    const app = coerceAppInfo({
      installationDate: ISO,
      lastUpdate: ISO2,
      licenses: [{ name: 'L', validFrom: ISO, validUntil: ISO2 }],
    } as any);
    expect(app.installationDate).toBeInstanceOf(Date);
    expect((app.licenses as any)[0].validFrom).toBeInstanceOf(Date);

    const cred = coerceCredentialEntity({
      validFrom: ISO,
      validTo: ISO2,
      credentialAccessProfile: [{ accessProfileToken: 'a', validFrom: ISO }],
    } as any);
    expect(cred.validFrom).toBeInstanceOf(Date);
    expect((cred.credentialAccessProfile as any)[0].validFrom).toBeInstanceOf(Date);

    expect(
      (coerceCertificateInformation({ validNotBefore: ISO, validNotAfter: ISO2 }) as any).validNotBefore,
    ).toBeInstanceOf(Date);

    const msg = coerceNotificationMessage({
      message: { message: { utcTime: ISO } },
    } as any);
    expect(msg.message!.message!.utcTime).toBeInstanceOf(Date);
  });
});

function mockRequest(service: { request: (...args: any[]) => any }, payload: unknown) {
  return jest.spyOn(service as any, 'request').mockResolvedValue(payload);
}

describe('Service methods coerce Date fields from mocked SOAP trees', () => {
  const onvif = new Onvif({ hostname: '127.0.0.1', autoConnect: false });

  it('Search: summary, recording info, media attributes, find results, endSearch', async () => {
    const search = new Search(onvif);

    mockRequest(search, {
      getRecordingSummaryResponse: { summary: { dataFrom: ISO, dataUntil: ISO2, numberRecordings: 2 } },
    });
    const summary = await search.getRecordingSummary();
    expect(summary.dataFrom).toBeInstanceOf(Date);

    mockRequest(search, {
      getRecordingInformationResponse: {
        recordingInformation: {
          recordingToken: 'r1',
          earliestRecording: ISO,
          track: { trackToken: 't', dataFrom: ISO, dataTo: ISO2 },
        },
      },
    });
    const info = await search.getRecordingInformation({ recordingToken: 'r1' });
    expect(info.earliestRecording).toBeInstanceOf(Date);
    expect((info.track as any).dataFrom).toBeInstanceOf(Date);

    mockRequest(search, {
      getMediaAttributesResponse: {
        mediaAttributes: [{ recordingToken: 'r1', from: ISO, until: ISO2 }],
      },
    });
    const media = await search.getMediaAttributes({ time: new Date(ISO) });
    expect(media[0]!.from).toBeInstanceOf(Date);

    mockRequest(search, {
      getEventSearchResultsResponse: { resultList: { searchState: 'Completed', result: [{ time: ISO }] } },
    });
    const events = await search.getEventSearchResults({ searchToken: 's1' });
    expect((events.result as any)[0].time).toBeInstanceOf(Date);

    mockRequest(search, { endSearchResponse: { endpoint: ISO } });
    const endpoint = await search.endSearch({ searchToken: 's1' });
    expect(endpoint).toBeInstanceOf(Date);
  });

  it('PTZ getStatus coerces utcTime', async () => {
    const ptz = new PTZ(onvif);
    (onvif as any).activeMediaProfile = { profileToken: 'p1' };
    mockRequest(ptz, { getStatusResponse: { PTZStatus: { utcTime: ISO } } });
    const status = await ptz.getStatus();
    expect(status.utcTime).toBeInstanceOf(Date);
  });

  it('AppMgmt getAppsInfo coerces installation / license dates', async () => {
    const apps = new AppMgmt(onvif);
    mockRequest(apps, {
      getAppsInfoResponse: {
        info: [
          {
            appID: 'a1',
            installationDate: ISO,
            lastUpdate: ISO2,
            licenses: [{ name: 'L', validFrom: ISO }],
          },
        ],
      },
    });
    const info = await apps.getAppsInfo();
    expect(info[0]!.installationDate).toBeInstanceOf(Date);
    expect(info[0]!.licenses![0]!.validFrom).toBeInstanceOf(Date);
  });

  it('Credential info / access profiles coerce validity dates', async () => {
    const credential = new Credential(onvif);
    mockRequest(credential, {
      getCredentialInfoResponse: {
        credentialInfo: [{ token: 'c1', validFrom: ISO, validTo: ISO2 }],
      },
    });
    const infos = await credential.getCredentialInfo({ token: ['c1'] });
    expect(infos[0]!.validFrom).toBeInstanceOf(Date);

    mockRequest(credential, {
      getCredentialAccessProfilesResponse: {
        credentialAccessProfile: [{ accessProfileToken: 'ap', validFrom: ISO, validTo: ISO2 }],
      },
    });
    const profiles = await credential.getCredentialAccessProfiles({ credentialToken: 'c1' });
    expect(profiles![0]!.validFrom).toBeInstanceOf(Date);
  });

  it('Device getCertificateInformation coerces validity fields', async () => {
    const device = new Device(onvif);
    mockRequest(device, {
      getCertificateInformationResponse: {
        certificateInformation: { validNotBefore: ISO, validNotAfter: ISO2 },
      },
    });
    const cert = await device.getCertificateInformation({ certificateID: 'c1' });
    expect(cert.validNotBefore).toBeInstanceOf(Date);
    expect(cert.validNotAfter).toBeInstanceOf(Date);
  });

  it('Events createPullPointSubscription / pullMessages coerce times and UtcTime', async () => {
    const events = new Events(onvif);
    jest.spyOn(onvif, 'request').mockResolvedValue([
      {
        createPullPointSubscriptionResponse: {
          subscriptionReference: { address: 'http://127.0.0.1/sub' },
          currentTime: ISO,
          terminationTime: ISO2,
        },
      },
      '<xml/>',
    ] as any);
    const sub = await events.createPullPointSubscription();
    expect(sub.currentTime).toBeInstanceOf(Date);
    expect(sub.terminationTime).toBeInstanceOf(Date);

    const subscription = new Subscription(onvif);
    subscription.subscription = sub;
    jest.spyOn(onvif, 'request').mockResolvedValue([
      {
        pullMessagesResponse: {
          currentTime: ISO,
          terminationTime: ISO2,
          notificationMessage: [
            {
              topic: { _: 'tns1:Device/Trigger/Relay' },
              message: { message: { utcTime: ISO } },
            },
          ],
        },
      },
      '<xml/>',
    ] as any);
    const pulled = await subscription.pullMessages({ messageLimit: 1, timeout: 'PT1S' });
    expect(pulled.currentTime).toBeInstanceOf(Date);
    expect(pulled.notificationMessage[0]!.message.message.utcTime).toBeInstanceOf(Date);
  });
});
