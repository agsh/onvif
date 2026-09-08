/**
 * xs:any / xs:anyAttribute round-trips matching README
 * "Support for `xs:any` and `xs:anyAttribute`".
 *
 * @see ../README.md
 */
import { build, parseSOAPString } from '../src/utils';
import { config, itemList, xsany } from '../src/utils/toOnvifXMLSchemaObject';
import AdvancedSecurity from '../src/advancedsecurity';

const TT = 'http://www.onvif.org/ver10/schema';
const VV = 'http://www.vendor.example/schema';
const WSNT = 'http://docs.oasis-open.org/wsn/b-2';
const COLORSPACE_YCBCR = 'http://www.onvif.org/ver10/colorspace/YCbCr';
const COLORSPACE_RGB = 'http://www.onvif.org/ver10/colorspace/RGB';
const TOPIC_DIALECT = 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet';
const TOPIC_MOTION = 'tns1:RuleEngine/CellMotionDetector/Motion';

function soapBody(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope"
  xmlns:tt="${TT}" xmlns:vv="${VV}" xmlns:wsnt="${WSNT}">
  <SOAP-ENV:Body>
    ${inner}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function xsanyOf(obj: object): Record<string, any> {
  return (obj as Record<symbol, Record<string, any>>)[xsany];
}

/** README: Camera example — Cell Motion ElementItem */
describe('README ElementItem CellLayout (xs:any)', () => {
  const analyticsSoap = soapBody(`
    <GetVideoAnalyticsConfigurationsResponse>
      <Configurations>
        <AnalyticsEngineConfiguration>
          <AnalyticsModule Name="Cell" Type="tt:CellMotionEngine">
            <Parameters vv:VendorParam="keep-me">
              <SimpleItem Name="Sensitivity" Value="50"/>
              <ElementItem Name="Layout">
                <tt:CellLayout Columns="8" Rows="6">
                  <tt:Transformation>
                    <tt:Translate x="-1" y="-1"/>
                    <tt:Scale x="0.25" y="0.333"/>
                  </tt:Transformation>
                </tt:CellLayout>
              </ElementItem>
            </Parameters>
          </AnalyticsModule>
        </AnalyticsEngineConfiguration>
      </Configurations>
    </GetVideoAnalyticsConfigurationsResponse>`);

  async function parseAnalyticsModule() {
    const [body] = await parseSOAPString<any>(analyticsSoap, {
      array: ['elementItem', 'simpleItem', 'analyticsModule'],
      rawXML: ['elementItem'],
    });
    return body.getVideoAnalyticsConfigurationsResponse.configurations.analyticsEngineConfiguration
      .analyticsModule[0];
  }

  it('parses camelCase fields and xml2js-style xsany as in README', async () => {
    const module = await parseAnalyticsModule();
    const elementItem = module.parameters.elementItem[0];

    expect(elementItem.name).toBe('Layout');
    expect(elementItem.cellLayout.columns).toBe(8);
    expect(elementItem.cellLayout.rows).toBe(6);
    expect(elementItem.cellLayout.transformation.translate).toEqual({ x: -1, y: -1 });
    expect(elementItem.cellLayout.transformation.scale).toEqual({ x: 0.25, y: 0.333 });

    expect(Object.keys(elementItem)).not.toContain(String(xsany));
    expect(Object.getOwnPropertyDescriptor(elementItem, xsany)?.enumerable).toBe(false);

    expect(xsanyOf(elementItem)).toEqual({
      $: { Name: 'Layout' },
      'tt:CellLayout': [
        {
          $: { Columns: '8', Rows: '6' },
          'tt:Transformation': [
            {
              'tt:Translate': [{ $: { x: '-1', y: '-1' } }],
              'tt:Scale': [{ $: { x: '0.25', y: '0.333' } }],
            },
          ],
        },
      ],
    });
  });

  it('mutates CellLayout + Transformation via xsany like README send example', async () => {
    const module = await parseAnalyticsModule();
    const layout = module.parameters.elementItem[0];

    layout.name = 'Layout';
    xsanyOf(layout)['tt:CellLayout'][0].$.Columns = '10';
    xsanyOf(layout)['tt:CellLayout'][0].$.Rows = '7';
    xsanyOf(layout)['tt:CellLayout'][0]['tt:Transformation'][0]['tt:Translate'][0].$ = {
      x: '-1',
      y: '-1',
    };
    xsanyOf(layout)['tt:CellLayout'][0]['tt:Transformation'][0]['tt:Scale'][0].$ = {
      x: '0.25',
      y: '0.333',
    };

    const xml = build({ AnalyticsModule: config(module) });
    expect(xml).toContain('Name="Layout"');
    expect(xml).toContain('Columns="10"');
    expect(xml).toContain('Rows="7"');
    expect(xml).toContain('<tt:Translate x="-1" y="-1"');
    expect(xml).toContain('<tt:Scale x="0.25" y="0.333"');
  });

  it('adds a vendor child under xsany and keeps it on rebuild', async () => {
    const module = await parseAnalyticsModule();
    const elementItem = module.parameters.elementItem[0];

    xsanyOf(elementItem)['vv:VendorRegion'] = [{ $: { Id: 'roi-1' }, _: 'active' }];

    const built = itemList(module.parameters) as any;
    expect(built.ElementItem[0]['vv:VendorRegion']).toEqual([{ $: { Id: 'roi-1' }, _: 'active' }]);

    const xml = build({ Parameters: built });
    expect(xml).toContain('<vv:VendorRegion Id="roi-1">active</vv:VendorRegion>');
  });
});

/** README: Camera example — Metadata Filter TopicExpression */
describe('README Metadata Filter (xs:any)', () => {
  async function parseEvents() {
    const soap = soapBody(`
      <GetMetadataConfigurationsResponse>
        <Configurations>
          <Events>
            <Filter>
              <wsnt:TopicExpression Dialect="${TOPIC_DIALECT}">
                ${TOPIC_MOTION}
              </wsnt:TopicExpression>
            </Filter>
            <SubscriptionPolicy>
              <wsnt:ChangedOnly>true</wsnt:ChangedOnly>
            </SubscriptionPolicy>
          </Events>
        </Configurations>
      </GetMetadataConfigurationsResponse>`);
    const [body] = await parseSOAPString<any>(soap, {
      rawXML: ['filter', 'subscriptionPolicy'],
    });
    return body.getMetadataConfigurationsResponse.configurations.events;
  }

  it('parses Filter dialect and xsany TopicExpression as in README', async () => {
    const events = await parseEvents();

    expect(events.filter.topicExpression.dialect).toBe(TOPIC_DIALECT);
    expect(Object.getOwnPropertyDescriptor(events.filter, xsany)?.enumerable).toBe(false);
    expect(xsanyOf(events.filter)).toEqual({
      'wsnt:TopicExpression': [
        {
          $: { Dialect: TOPIC_DIALECT },
          _: TOPIC_MOTION,
        },
      ],
    });

    expect(events.subscriptionPolicy.changedOnly).toBe(true);
    expect(xsanyOf(events.subscriptionPolicy)).toEqual({
      'wsnt:ChangedOnly': ['true'],
    });
  });

  it('sends Filter via filter[xsany] like README MetadataConfiguration rebuild', async () => {
    const events = await parseEvents();
    const filterAny = xsanyOf(events.filter);
    filterAny['wsnt:TopicExpression'][0]._ = TOPIC_MOTION;

    const xml = build({
      Events: {
        Filter: filterAny,
        SubscriptionPolicy: xsanyOf(events.subscriptionPolicy),
      },
    });

    expect(xml).toContain(`Dialect="${TOPIC_DIALECT}"`);
    expect(xml).toContain(TOPIC_MOTION);
    expect(xml).toContain('<wsnt:ChangedOnly>true</wsnt:ChangedOnly>');
  });
});

/** README: Camera example — Color + ItemList Parameters (xs:anyAttribute) */
describe('README Color and Parameters (xs:anyAttribute)', () => {
  it('parses Color known attrs and vendorFlag as in README', async () => {
    const soap = soapBody(`
      <GetResponse>
        <Color X="0.1" Y="0.2" Z="0.3"
          Colorspace="${COLORSPACE_YCBCR}"
          vv:VendorFlag="extra"/>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const color = body.getResponse.color;

    expect(color).toMatchObject({
      x: 0.1,
      y: 0.2,
      z: 0.3,
      colorspace: COLORSPACE_YCBCR,
      vendorFlag: 'extra',
    });
  });

  it('builds Color attributes under $ as in README', async () => {
    const xml = build({
      Color: {
        $: {
          X: 0.4,
          Y: 0.5,
          Z: 0.6,
          Colorspace: COLORSPACE_RGB,
          Likelihood: 0.75,
          'vv:VendorFlag': 'painted',
        },
      },
    });

    expect(xml).toContain('X="0.4"');
    expect(xml).toContain(`Colorspace="${COLORSPACE_RGB}"`);
    expect(xml).toContain('vv:VendorFlag="painted"');
  });

  it('parses Parameters vendorParam flattened as in README', async () => {
    const soap = soapBody(`
      <GetResponse>
        <Parameters vv:VendorParam="keep-me">
          <SimpleItem Name="Sensitivity" Value="50"/>
        </Parameters>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { array: ['simpleItem'] });
    const parameters = body.getResponse.parameters;

    expect(parameters.vendorParam).toBe('keep-me');
    expect(parameters.simpleItem[0]).toMatchObject({ name: 'Sensitivity', value: 50 });
  });

  it('builds Parameters vendor attrs under $ as in README', async () => {
    const xml = build({
      Parameters: {
        $: { 'vv:VendorParam': 'keep-me' },
        SimpleItem: [{ $: { Name: 'Sensitivity', Value: '50' } }],
      },
    });

    expect(xml).toContain('vv:VendorParam="keep-me"');
    expect(xml).toContain('Name="Sensitivity"');
    expect(xml).toContain('Value="50"');
  });
});

/** README: Both at once — PTZStatus */
describe('README PTZStatus (xs:any + xs:anyAttribute)', () => {
  it('parses vendor attribute and child as in README', async () => {
    const soap = soapBody(`
      <GetStatusResponse>
        <PTZStatus vv:FirmwareChannel="A">
          <Position>
            <PanTilt x="0.1" y="-0.2"/>
            <Zoom x="0.5"/>
          </Position>
          <vv:VendorExtension>
            <vv:Stable>true</vv:Stable>
          </vv:VendorExtension>
        </PTZStatus>
      </GetStatusResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const status = body.getStatusResponse.PTZStatus;

    expect(status.firmwareChannel).toBe('A');
    expect(status.position.panTilt).toMatchObject({ x: 0.1, y: -0.2 });
    expect(status.position.zoom).toMatchObject({ x: 0.5 });
    expect(status.vendorExtension.stable).toBe(true);
  });

  it('builds PTZStatus with $ attribute and vendor child as in README', async () => {
    const xml = build({
      PTZStatus: {
        $: { 'vv:FirmwareChannel': 'B' },
        Position: {
          PanTilt: { $: { x: 0.3, y: 0.4 } },
          Zoom: { $: { x: 0.1 } },
        },
        'vv:VendorExtension': { 'vv:Stable': false },
      },
    });

    expect(xml).toContain('vv:FirmwareChannel="B"');
    expect(xml).toContain('<vv:VendorExtension>');
    expect(xml).toContain('<vv:Stable>false</vv:Stable>');
    expect(xml).toContain('x="0.3"');
  });
});

describe('AudioSource (xs:any + xs:anyAttribute)', () => {
  it('reads channels, vendor attribute and vendor child', async () => {
    const soap = soapBody(`
      <GetAudioSourcesResponse>
        <AudioSources token="AudioSrcToken" vv:GainDb="12">
          <Channels>2</Channels>
          <vv:VendorMic>
            <vv:Model>ACM-1</vv:Model>
          </vv:VendorMic>
        </AudioSources>
      </GetAudioSourcesResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const source = body.getAudioSourcesResponse.audioSources;

    expect(source.token).toBe('AudioSrcToken');
    expect(source.channels).toBe(2);
    expect(source.gainDb).toBe(12);
    expect(source.vendorMic.model).toBe('ACM-1');
  });

  it('sets vendor anyAttribute and xs:any child on rebuild', async () => {
    const xml = build({
      AudioSources: {
        $: { token: 'AudioSrcToken', 'vv:GainDb': 6 },
        Channels: 1,
        'vv:VendorMic': { 'vv:Model': 'ACM-2' },
      },
    });

    expect(xml).toContain('token="AudioSrcToken"');
    expect(xml).toContain('vv:GainDb="6"');
    expect(xml).toContain('<vv:Model>ACM-2</vv:Model>');
  });
});

describe('DistinguishedName.anyAttribute (AdvancedSecurity WSDL)', () => {
  it('sets domainComponent inside anyAttribute extension element', () => {
    const AS = AdvancedSecurity as any;
    const built = AS.distinguishedNameToBuild({
      commonName: ['cam.example'],
      organization: ['ONVIF'],
      anyAttribute: { domainComponent: ['devices', 'example', 'com'] },
    });

    expect(built).toMatchObject({
      CommonName: ['cam.example'],
      Organization: ['ONVIF'],
      anyAttribute: { DomainComponent: ['devices', 'example', 'com'] },
    });

    const xml = build({ Subject: built });
    expect(xml).toContain('<anyAttribute>');
    expect(xml).toContain('<DomainComponent>devices</DomainComponent>');
    expect(xml).toContain('<DomainComponent>example</DomainComponent>');
    expect(xml).toContain('<DomainComponent>com</DomainComponent>');
  });
});
