/**
 * Feature: SOAP XML corpus -- checked-in vendor-like envelopes
 *
 * Ensures `parseXml` / `parseSOAPString` keep accepting representative device
 * replies and normalizing both SOAP 1.2 and SOAP 1.1 Faults.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  OnvifSoapFaultError,
  isSenderNotAuthorizedFault,
  parseSOAPString,
  parseXml,
} from '../../src/utils';

const FIXTURES = path.join(__dirname, '../fixtures/soap');

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

describe('Feature: SOAP XML corpus', () => {
  describe('Scenario: successful device replies', () => {
    it.each([
      ['device.GetSystemDateAndTime.xml', 'getSystemDateAndTimeResponse'],
      ['device.GetSystemDateAndTime.bom.xml', 'getSystemDateAndTimeResponse'],
      ['device.GetServices.xml', 'getServicesResponse'],
      ['media.GetProfiles.xml', 'getProfilesResponse'],
      ['events.PullMessages.xml', 'pullMessagesResponse'],
    ] as const)('parses %s into SOAP body with %s', async (file, bodyKey) => {
      const xml = readFixture(file);
      const [body] = await parseSOAPString<Record<string, any>>(xml);
      expect(body[bodyKey]).toBeDefined();
      // parseXml document wrap still has envelope
      const doc = parseXml(xml);
      expect(doc.envelope?.body?.[bodyKey]).toBeDefined();
    });

    it('keeps PullMessages notification messages as a non-empty list', async () => {
      const [body] = await parseSOAPString<any>(readFixture('events.PullMessages.xml'));
      const messages = body.pullMessagesResponse?.notificationMessage;
      expect(messages).toBeDefined();
      const list = Array.isArray(messages) ? messages : [messages];
      expect(list.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: SOAP Fault fixtures', () => {
    it('throws OnvifSoapFaultError for SOAP 1.2 NotAuthorized', async () => {
      const xml = readFixture('fault.soap12.xml');
      await expect(parseSOAPString(xml)).rejects.toMatchObject({
        name: 'OnvifSoapFaultError',
        faultCode: 's:Sender',
        faultSubcode: 'ter:NotAuthorized',
      });
      const error = await parseSOAPString(xml).then(
        () => undefined,
        (err: unknown) => err,
      );
      expect(error).toBeInstanceOf(OnvifSoapFaultError);
      expect(isSenderNotAuthorizedFault(error)).toBe(true);
    });

    it('throws OnvifSoapFaultError for SOAP 1.1 faultcode / faultstring', async () => {
      const xml = readFixture('fault.soap11.xml');
      await expect(parseSOAPString(xml)).rejects.toMatchObject({
        name: 'OnvifSoapFaultError',
        faultCode: 's:Client',
        faultReason: 'Sender not authorized',
        faultSubcode: 'NotAuthorized',
      });
      const error = await parseSOAPString(xml).then(
        () => undefined,
        (err: unknown) => err,
      );
      expect(isSenderNotAuthorizedFault(error)).toBe(true);
    });
  });
});
