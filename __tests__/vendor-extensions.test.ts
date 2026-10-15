/**
 * Real-world-ish xs:any / xs:anyAttribute examples from innerDocs/vendor-extensions.md.
 * @jest-environment node
 * @see ../innerDocs/vendor-extensions.md
 */

import { build, parseSOAPString } from '../src/utils';
import { config, itemList, xsany } from '../src/utils/toOnvifXMLSchemaObject';
import AdvancedSecurity from '../src/advancedsecurity';

const TT = 'http://www.onvif.org/ver10/schema';
const WSNT = 'http://docs.oasis-open.org/wsn/b-2';
const HIK = 'http://www.hikvision.com/ver20/XMLSchema';
const AXIS = 'http://www.axis.com/onvif/extensions';
const VV = 'http://www.vendor.example/schema';
const TOPIC_DIALECT = 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet';
const MSG_DIALECT = 'http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter';
const COLORSPACE_RGB = 'http://www.onvif.org/ver10/colorspace/RGB';
const COLORSPACE_YCBCR = 'http://www.onvif.org/ver10/colorspace/YCbCr';

function soapBody(inner: string, extraXmlns = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope"
  xmlns:tt="${TT}" xmlns:wsnt="${WSNT}" xmlns:hik="${HIK}" xmlns:axis="${AXIS}" xmlns:vv="${VV}"
  ${extraXmlns}>
  <SOAP-ENV:Body>${inner}</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function xsanyOf(obj: object): Record<string, any> {
  return (obj as Record<symbol, Record<string, any>>)[xsany];
}

/** Doc helper: walk tree ignoring $ / _ */
function findTagged(
  node: unknown,
  pred: (tag: string, value: unknown) => boolean,
  path: string[] = [],
): { path: string[]; value: unknown } | undefined {
  if (node == null || typeof node !== 'object') return undefined;
  const obj = node as Record<string | symbol, unknown>;
  const anyTree = obj[xsany];
  if (anyTree && typeof anyTree === 'object') {
    const hit = findTagged(anyTree, pred, [...path, '[xsany]']);
    if (hit) return hit;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$' || key === '_') continue;
    if (pred(key, value)) return { path: [...path, key], value };
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const hit = findTagged(value[i], pred, [...path, `${key}[${i}]`]);
        if (hit) return hit;
      }
    } else if (value && typeof value === 'object') {
      const hit = findTagged(value, pred, [...path, key]);
      if (hit) return hit;
    }
  }
  return undefined;
}

describe('vendor-extensions.md — findTagged helper', () => {
  it('finds tt:CellLayout under ElementItem xsany', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Layout">
          <tt:CellLayout Columns="8" Rows="6"/>
        </ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { rawXML: ['elementItem'] });
    const item = body.getResponse.elementItem;
    const hit = findTagged(item, (tag) => tag === 'tt:CellLayout' || tag === 'cellLayout');
    expect(hit?.path.join('.')).toMatch(/CellLayout|cellLayout/);
    expect(hit?.value).toBeDefined();
  });
});

describe('vendor-extensions.md — Hikvision CellMotion module', () => {
  const soap = soapBody(`
    <GetVideoAnalyticsConfigurationsResponse>
      <Configurations>
        <AnalyticsEngineConfiguration>
          <AnalyticsModule Name="MyMotion" Type="tt:CellMotionEngine">
            <Parameters hik:EngineId="3" hik:Channel="1">
              <SimpleItem Name="Sensitivity" Value="80"/>
              <SimpleItem Name="MinObjectSize" Value="10"/>
              <ElementItem Name="Layout">
                <tt:CellLayout Columns="22" Rows="18">
                  <tt:Transformation>
                    <tt:Translate x="-1" y="-1"/>
                    <tt:Scale x="0.0909" y="0.1111"/>
                  </tt:Transformation>
                </tt:CellLayout>
              </ElementItem>
            </Parameters>
          </AnalyticsModule>
        </AnalyticsEngineConfiguration>
      </Configurations>
    </GetVideoAnalyticsConfigurationsResponse>`);

  async function parseModule() {
    const [body] = await parseSOAPString<any>(soap, {
      array: ['elementItem', 'simpleItem', 'analyticsModule'],
      rawXML: ['elementItem'],
    });
    return body.getVideoAnalyticsConfigurationsResponse.configurations.analyticsEngineConfiguration
      .analyticsModule[0];
  }

  it('parses engineId anyAttribute, SimpleItems, and Layout xsany', async () => {
    const module = await parseModule();
    expect(module.name).toBe('MyMotion');
    expect(module.parameters.engineId).toBe(3);
    expect(module.parameters.channel).toBe(1);
    expect(module.parameters.simpleItem[0]).toMatchObject({ name: 'Sensitivity', value: 80 });
    expect(module.parameters.simpleItem[1]).toMatchObject({ name: 'MinObjectSize', value: 10 });

    const layout = module.parameters.elementItem[0];
    expect(layout.name).toBe('Layout');
    expect(layout.cellLayout.columns).toBe(22);
    expect(xsanyOf(layout)['tt:CellLayout'][0].$).toMatchObject({ Columns: '22', Rows: '18' });
  });

  it('round-trips sensitivity + CellLayout via config()/itemList()', async () => {
    const module = await parseModule();
    module.parameters.simpleItem[0].value = 70;
    xsanyOf(module.parameters.elementItem[0])['tt:CellLayout'][0].$.Columns = '20';

    const xml = build({ AnalyticsModule: config(module) });
    expect(xml).toContain('Name="Sensitivity"');
    expect(xml).toContain('Value="70"');
    expect(xml).toContain('Columns="20"');
    expect(xml).toContain('Rows="18"');
    expect(xml).toContain('<tt:Translate');
  });

  it('preserves hik attributes under $ when rebuilding Parameters', async () => {
    const xml = build({
      Parameters: {
        $: { 'hik:EngineId': '3', 'hik:Channel': '1' },
        SimpleItem: [{ $: { Name: 'Sensitivity', Value: '50' } }],
      },
    });
    expect(xml).toContain('hik:EngineId="3"');
    expect(xml).toContain('hik:Channel="1"');
  });
});

describe('vendor-extensions.md — Dahua PolygonConfiguration', () => {
  it('parses polygon points in camelCase and xsany', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Segments">
          <tt:PolygonConfiguration>
            <tt:Polygon>
              <tt:Point x="-0.5" y="0.0"/>
              <tt:Point x="0.5" y="0.0"/>
              <tt:Point x="0.5" y="0.4"/>
            </tt:Polygon>
          </tt:PolygonConfiguration>
        </ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, {
      array: ['point'],
      rawXML: ['elementItem'],
    });
    const item = body.getResponse.elementItem;
    expect(item.name).toBe('Segments');
    expect(item.polygonConfiguration.polygon.point).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.4 },
    ]);
    expect(xsanyOf(item)['tt:PolygonConfiguration'][0]['tt:Polygon'][0]['tt:Point']).toHaveLength(3);
    expect(xsanyOf(item)['tt:PolygonConfiguration'][0]['tt:Polygon'][0]['tt:Point'][0].$).toEqual({
      x: '-0.5',
      y: '0.0',
    });
  });

  it('rebuilds polygon points from xsany', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Segments">
          <tt:PolygonConfiguration>
            <tt:Polygon>
              <tt:Point x="-0.5" y="0.0"/>
              <tt:Point x="0.5" y="0.0"/>
            </tt:Polygon>
          </tt:PolygonConfiguration>
        </ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { rawXML: ['elementItem'] });
    const item = body.getResponse.elementItem;
    xsanyOf(item)['tt:PolygonConfiguration'][0]['tt:Polygon'][0]['tt:Point'].push({
      $: { x: '0.1', y: '0.2' },
    });
    const xml = build({ ElementItem: { ...xsanyOf(item), $: { ...xsanyOf(item).$, Name: item.name } } });
    expect(xml).toContain('x="0.1"');
    expect(xml).toContain('y="0.2"');
    expect(xml).toContain('tt:PolygonConfiguration');
  });
});

describe('vendor-extensions.md — Axis Polyline tripwire', () => {
  it('parses Polyline ElementItem', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Field">
          <tt:Polyline>
            <tt:Point x="-0.8" y="-0.2"/>
            <tt:Point x="0.8" y="-0.2"/>
          </tt:Polyline>
        </ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, {
      array: ['point'],
      rawXML: ['elementItem'],
    });
    const item = body.getResponse.elementItem;
    expect(item.name).toBe('Field');
    expect(item.polyline.point).toEqual([
      { x: -0.8, y: -0.2 },
      { x: 0.8, y: -0.2 },
    ]);
    expect(xsanyOf(item)['tt:Polyline'][0]['tt:Point']).toHaveLength(2);
  });
});

describe('vendor-extensions.md — multi TopicExpression + MessageContent Filter', () => {
  it('parses two topics and MessageContent into xsany', async () => {
    const soap = soapBody(`
      <GetMetadataConfigurationsResponse>
        <Configurations>
          <Events>
            <Filter>
              <wsnt:TopicExpression Dialect="${TOPIC_DIALECT}">
                tns1:RuleEngine/LineDetector/Crossed
              </wsnt:TopicExpression>
              <wsnt:TopicExpression Dialect="${TOPIC_DIALECT}">
                tns1:RuleEngine/FieldDetector/ObjectsInside
              </wsnt:TopicExpression>
              <wsnt:MessageContent Dialect="${MSG_DIALECT}">
                boolean(//tt:SimpleItem[@Name="IsMotion" and @Value="true"])
              </wsnt:MessageContent>
            </Filter>
          </Events>
        </Configurations>
      </GetMetadataConfigurationsResponse>`);
    const [body] = await parseSOAPString<any>(soap, {
      array: ['topicExpression'],
      rawXML: ['filter'],
    });
    const filter = body.getMetadataConfigurationsResponse.configurations.events.filter;
    const any = xsanyOf(filter);
    expect(any['wsnt:TopicExpression']).toHaveLength(2);
    expect(any['wsnt:TopicExpression'][0]._).toContain('LineDetector');
    expect(any['wsnt:TopicExpression'][1]._).toContain('FieldDetector');
    expect(any['wsnt:MessageContent'][0].$).toEqual({ Dialect: MSG_DIALECT });
    expect(any['wsnt:MessageContent'][0]._).toContain('IsMotion');
  });

  it('rebuilds Filter from xsany without losing MessageContent', async () => {
    const soap = soapBody(`
      <GetResponse>
        <Filter>
          <wsnt:TopicExpression Dialect="${TOPIC_DIALECT}">tns1:VideoSource/MotionAlarm</wsnt:TopicExpression>
          <wsnt:MessageContent Dialect="${MSG_DIALECT}">true()</wsnt:MessageContent>
        </Filter>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { rawXML: ['filter'] });
    const filterAny = xsanyOf(body.getResponse.filter);
    filterAny['wsnt:TopicExpression'][0]._ = 'tns1:RuleEngine//.';
    const xml = build({ Filter: filterAny });
    expect(xml).toContain('tns1:RuleEngine//.');
    expect(xml).toContain(`Dialect="${MSG_DIALECT}"`);
    expect(xml).toContain('true()');
  });
});

describe('vendor-extensions.md — NotificationMessage ElementItem BoundingBox', () => {
  it('parses Source/Data SimpleItems and BoundingBox ElementItem xsany', async () => {
    const soap = soapBody(`
      <PullMessagesResponse>
        <NotificationMessage>
          <wsnt:Topic Dialect="${TOPIC_DIALECT}">tns1:RuleEngine/CellMotionDetector/Motion</wsnt:Topic>
          <wsnt:Message>
            <tt:Message UtcTime="2024-06-15T12:00:00Z" PropertyOperation="Changed">
              <tt:Source>
                <tt:SimpleItem Name="VideoSourceConfigurationToken" Value="000"/>
                <tt:SimpleItem Name="Rule" Value="MyMotion"/>
              </tt:Source>
              <tt:Data>
                <tt:SimpleItem Name="IsMotion" Value="true"/>
                <tt:ElementItem Name="BoundingBox">
                  <tt:Rectangle left="-0.2" top="0.1" right="0.3" bottom="-0.4"/>
                </tt:ElementItem>
              </tt:Data>
            </tt:Message>
          </wsnt:Message>
        </NotificationMessage>
      </PullMessagesResponse>`);
    const [body] = await parseSOAPString<any>(soap, {
      array: ['notificationMessage', 'simpleItem', 'elementItem'],
      rawXML: ['elementItem'],
    });
    const msg = body.pullMessagesResponse.notificationMessage[0].message.message;
    expect(msg.propertyOperation).toBe('Changed');
    expect(msg.source.simpleItem).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Rule', value: 'MyMotion' }),
      ]),
    );
    expect(msg.data.simpleItem[0]).toMatchObject({ name: 'IsMotion', value: true });
    const box = msg.data.elementItem[0];
    expect(box.name).toBe('BoundingBox');
    expect(box.rectangle).toMatchObject({ left: -0.2, top: 0.1, right: 0.3, bottom: -0.4 });
    expect(xsanyOf(box)['tt:Rectangle'][0].$).toMatchObject({
      left: '-0.2',
      top: '0.1',
      right: '0.3',
      bottom: '-0.4',
    });
  });
});

describe('vendor-extensions.md — text-only / empty ElementItem', () => {
  it('attaches xsany for text-only ElementItem', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="VendorBlob">cGF5bG9hZA==</ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { rawXML: ['elementItem'] });
    const item = body.getResponse.elementItem;
    expect(item.name).toBe('VendorBlob');
    expect(xsanyOf(item)).toMatchObject({
      $: { Name: 'VendorBlob' },
      _: 'cGF5bG9hZA==',
    });
  });

  it('attaches xsany for empty ElementItem and empty Filter', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Reserved"/>
        <Filter/>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { rawXML: ['elementItem', 'filter'] });
    expect(body.getResponse.elementItem.name).toBe('Reserved');
    expect(xsanyOf(body.getResponse.elementItem).$).toMatchObject({ Name: 'Reserved' });
    expect(xsanyOf(body.getResponse.filter)).toEqual(expect.any(Object));
  });
});

describe('vendor-extensions.md — Color / OSD / PanTilt anyAttribute', () => {
  it('parses Color with Likelihood and vendorFlag', async () => {
    const soap = soapBody(`
      <GetResponse>
        <Color X="0.1" Y="0.2" Z="0.3"
          Colorspace="${COLORSPACE_YCBCR}" Likelihood="0.9" vv:VendorFlag="extra"/>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    expect(body.getResponse.color).toMatchObject({
      x: 0.1,
      y: 0.2,
      z: 0.3,
      colorspace: COLORSPACE_YCBCR,
      likelihood: 0.9,
      vendorFlag: 'extra',
    });
  });

  it('builds OSD FontColor Color with vv:Alpha under $', () => {
    const xml = build({
      TextString: {
        PlainText: 'CAM-01',
        FontSize: 24,
        FontColor: {
          Color: {
            $: {
              X: 0,
              Y: 0,
              Z: 0,
              Colorspace: COLORSPACE_RGB,
              'vv:Alpha': '1',
            },
          },
        },
      },
    });
    expect(xml).toContain('<PlainText>CAM-01</PlainText>');
    expect(xml).toContain('vv:Alpha="1"');
    expect(xml).toContain(`Colorspace="${COLORSPACE_RGB}"`);
  });

  it('parses PanTilt space + vendor SpeedProfile', async () => {
    const soap = soapBody(`
      <GetResponse>
        <PanTilt x="0.2" y="-0.1"
          space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/GenericSpeedSpace"
          vv:SpeedProfile="turbo"/>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    expect(body.getResponse.panTilt).toMatchObject({
      x: 0.2,
      y: -0.1,
      space: 'http://www.onvif.org/ver10/tptz/PanTiltSpaces/GenericSpeedSpace',
      speedProfile: 'turbo',
    });
  });

  it('builds PanTilt with space and vv:SpeedProfile in $', () => {
    const xml = build({
      PanTilt: {
        $: {
          x: 0.2,
          y: -0.1,
          space: 'http://www.onvif.org/ver10/tptz/PanTiltSpaces/GenericSpeedSpace',
          'vv:SpeedProfile': 'turbo',
        },
      },
    });
    expect(xml).toContain('vv:SpeedProfile="turbo"');
    expect(xml).toContain('GenericSpeedSpace');
  });
});

describe('vendor-extensions.md — Axis VideoSource attributes', () => {
  it('flattens axis:ImageSource and axis:Rotation', async () => {
    const soap = soapBody(`
      <GetVideoSourcesResponse>
        <VideoSources token="VS1" axis:ImageSource="0" axis:Rotation="180">
          <Framerate>25</Framerate>
          <Resolution><Width>1920</Width><Height>1080</Height></Resolution>
        </VideoSources>
      </GetVideoSourcesResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const vs = body.getVideoSourcesResponse.videoSources;
    expect(vs).toMatchObject({
      token: 'VS1',
      imageSource: 0,
      rotation: 180,
      framerate: 25,
      resolution: { width: 1920, height: 1080 },
    });
  });
});

describe('vendor-extensions.md — PTZStatus + AudioSource both wildcards', () => {
  it('parses PTZStatus firmwareChannel and VendorExtension', async () => {
    const soap = soapBody(`
      <GetStatusResponse>
        <PTZStatus vv:FirmwareChannel="A">
          <Position>
            <PanTilt x="0.1" y="-0.2"/>
            <Zoom x="0.5"/>
          </Position>
          <Error>None</Error>
          <vv:VendorExtension><vv:Stable>true</vv:Stable></vv:VendorExtension>
        </PTZStatus>
      </GetStatusResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const status = body.getStatusResponse.PTZStatus;
    expect(status.firmwareChannel).toBe('A');
    expect(status.error).toBe('None');
    expect(status.vendorExtension.stable).toBe(true);
  });

  it('parses AudioSources gainDb + VendorMic', async () => {
    const soap = soapBody(`
      <GetAudioSourcesResponse>
        <AudioSources token="AudioSrcToken" vv:GainDb="12">
          <Channels>2</Channels>
          <vv:VendorMic><vv:Model>ACM-1</vv:Model></vv:VendorMic>
        </AudioSources>
      </GetAudioSourcesResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const source = body.getAudioSourcesResponse.audioSources;
    expect(source.gainDb).toBe(12);
    expect(source.vendorMic.model).toBe('ACM-1');
  });
});

describe('vendor-extensions.md — Imaging Extension + Recording job', () => {
  it('parses ImagingSettings Extension with vendor WdrMode', async () => {
    const soap = soapBody(`
      <GetImagingSettingsResponse>
        <ImagingSettings>
          <Brightness>50</Brightness>
          <Contrast>50</Contrast>
          <Extension>
            <ImageStabilization>
              <Mode>ON</Mode>
              <Level>1</Level>
            </ImageStabilization>
            <vv:WdrMode>auto</vv:WdrMode>
          </Extension>
        </ImagingSettings>
      </GetImagingSettingsResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const settings = body.getImagingSettingsResponse.imagingSettings;
    expect(settings.brightness).toBe(50);
    expect(settings.extension.imageStabilization).toMatchObject({ mode: 'ON', level: 1 });
    expect(settings.extension.wdrMode).toBe('auto');
  });

  it('parses RecordingJob Source Extension PreRecordSeconds', async () => {
    const soap = soapBody(`
      <GetRecordingJobsResponse>
        <JobItem>
          <JobConfiguration>
            <RecordingToken>rec1</RecordingToken>
            <Mode>Active</Mode>
            <Source>
              <SourceToken>
                <Token>Profile_1</Token>
                <Type>http://www.onvif.org/ver10/schema/Profile</Type>
              </SourceToken>
              <Extension>
                <vv:PreRecordSeconds>5</vv:PreRecordSeconds>
              </Extension>
            </Source>
          </JobConfiguration>
        </JobItem>
      </GetRecordingJobsResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const source = body.getRecordingJobsResponse.jobItem.jobConfiguration.source;
    expect(source.sourceToken.token).toBe('Profile_1');
    expect(source.extension.preRecordSeconds).toBe(5);
  });
});

describe('vendor-extensions.md — DistinguishedName anyAttribute element', () => {
  it('builds domainComponent list under anyAttribute', () => {
    const AS = AdvancedSecurity as any;
    const built = AS.distinguishedNameToBuild({
      commonName: ['cam.example'],
      organization: ['ONVIF'],
      anyAttribute: { domainComponent: ['devices', 'example', 'com'] },
    });
    const xml = build({ Subject: built });
    expect(xml).toContain('<DomainComponent>devices</DomainComponent>');
    expect(xml).toContain('<DomainComponent>com</DomainComponent>');
  });
});

describe('vendor-extensions.md — caveats', () => {
  it('xsany is non-enumerable and dropped by object spread', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Layout"><tt:CellLayout Columns="1" Rows="1"/></ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { rawXML: ['elementItem'] });
    const item = body.getResponse.elementItem;
    expect(Object.getOwnPropertyDescriptor(item, xsany)?.enumerable).toBe(false);
    expect(Object.keys(item)).not.toContain(String(xsany));
    expect({ ...item }[xsany as unknown as string]).toBeUndefined();
    expect(xsanyOf(item)).toBeDefined();
  });

  it('without rawXML, ElementItem has no xsany (camelCase only)', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Layout"><tt:CellLayout Columns="1" Rows="1"/></ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap);
    const item = body.getResponse.elementItem;
    expect(item.name).toBe('Layout');
    expect(item.cellLayout.columns).toBe(1);
    expect(item[xsany]).toBeUndefined();
  });

  it('xsany attribute values stay strings while camelCase coerces numbers', async () => {
    const soap = soapBody(`
      <GetResponse>
        <ElementItem Name="Layout">
          <tt:CellLayout Columns="8" Rows="6"/>
        </ElementItem>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, { rawXML: ['elementItem'] });
    const item = body.getResponse.elementItem;
    expect(item.cellLayout.columns).toBe(8);
    expect(typeof item.cellLayout.columns).toBe('number');
    expect(xsanyOf(item)['tt:CellLayout'][0].$.Columns).toBe('8');
  });

  it('itemList rebuild keeps Name from typed field over stale xsany $', async () => {
    const soap = soapBody(`
      <GetResponse>
        <Parameters>
          <ElementItem Name="Old">
            <tt:CellLayout Columns="1" Rows="1"/>
          </ElementItem>
        </Parameters>
      </GetResponse>`);
    const [body] = await parseSOAPString<any>(soap, {
      array: ['elementItem'],
      rawXML: ['elementItem'],
    });
    const parameters = body.getResponse.parameters;
    parameters.elementItem[0].name = 'New';
    const built = itemList(parameters) as any;
    expect(built.ElementItem[0].$.Name).toBe('New');
  });
});
