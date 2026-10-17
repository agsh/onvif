# Vendor XML / `xs:any` and `xs:anyAttribute`

ONVIF schemas use two extension points everywhere (analytics modules, metadata filters, PTZ status, Color, ...):

```xml
<xs:any namespace="##any" processContents="lax" minOccurs="0" maxOccurs="unbounded"/>
<xs:anyAttribute processContents="lax"/>
```

| Wildcard | Meaning in XML | How this library exposes it |
| --- | --- | --- |
| `xs:any` | Extra child elements (vendor-/type-specific trees) | camelCase fields +, for `rawXML` tags, a rebuild tree on `xsany` |
| `xs:anyAttribute` | Extra XML attributes | Flattened camelCase on read; put under `$` (with prefixes) when writing |

Import the symbol once:

```ts
import { xsany } from 'onvif';
```

`xsany` is `Symbol('any')`. The property is **non-enumerable**, so it does not show up in `Object.keys`,
`JSON.stringify`, or object spreads - use `obj[xsany]` explicitly.

The shape of `obj[xsany]` follows the [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) object style:
element names as keys (often with prefixes like `tt:`, `wsnt:`), attributes under `$`, text under `_`,
and children as **arrays**.

If you only see camelCase fields and no `xsany`, that node was not in the request's `rawXML` list.
Shared parse hints in `utils` (`ITEM_LIST_PARSE`, `ANALYTICS_CONFIG_PARSE`, `MEDIA_NESTED_PARSE`,
`MEDIA_CONFIGURATION_PARSE`) mark `elementItem` (and Media metadata `filter` / `subscriptionPolicy`) on Gets
that feed `config()` / `itemList()`. Use nested hints for singular Profile/Configuration responses - do not
force `configurations` / `profiles` wrappers to arrays when the schema says a single object.
You can still pass `rawXML` on `onvif.request({ rawXML: [...] })` for other tags.

---

## Quick helper: walk `xsany` (ignore `$` / `_`)

Useful when hunting a vendor field without knowing the exact path:

```ts
import { xsany } from 'onvif';

/** Depth-first search under an xml2js-style tree (and optional camelCase siblings). */
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

// Example: find any CellLayout under an analytics ElementItem
const layout = findTagged(elementItem, (tag) => tag === 'tt:CellLayout' || tag === 'cellLayout');
```

---

## What you get after parsing (`xs:any`)

Tags listed in `rawXML` are parsed twice:

1. **Normal fields** - camelCase, typed where possible (`name`, `cellLayout.columns`, ...)
2. **`obj[xsany]`** - xml2js-style tree with original element/attribute names (with prefixes), arrays, and `$` / `_`

### 1. Cell Motion `ElementItem` (Hikvision / Dahua / HappyTime)

Typical `tt:CellMotionEngine` layout from Profile S / T analytics:

```xml
<ElementItem Name="Layout">
  <tt:CellLayout Columns="8" Rows="6">
    <tt:Transformation>
      <tt:Translate x="-1" y="-1"/>
      <tt:Scale x="0.25" y="0.333"/>
    </tt:Transformation>
  </tt:CellLayout>
</ElementItem>
```

```js
elementItem.name                         // 'Layout'
elementItem.cellLayout.columns           // 8
elementItem.cellLayout.transformation.translate  // { x: -1, y: -1 }

elementItem[xsany]
// {
//   $: { Name: 'Layout' },
//   'tt:CellLayout': [{
//     $: { Columns: '8', Rows: '6' },
//     'tt:Transformation': [{
//       'tt:Translate': [{ $: { x: '-1', y: '-1' } }],
//       'tt:Scale':     [{ $: { x: '0.25', y: '0.333' } }],
//     }],
//   }],
// }
```

### 2. Hikvision-style sensitivity + layout in one module

```xml
<AnalyticsModule Name="MyMotion" Type="tt:CellMotionEngine">
  <Parameters hik:EngineId="3">
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
```

```js
module.name                              // 'MyMotion'
module.parameters.engineId                // 3  (xs:anyAttribute, prefix stripped)
module.parameters.simpleItem[0].value     // 80
module.parameters.elementItem[0][xsany]['tt:CellLayout'][0].$.Columns  // '22'
```

### 3. Dahua-style line crossing polygon (`tt:PolygonConfiguration`)

```xml
<ElementItem Name="Segments">
  <tt:PolygonConfiguration>
    <tt:Polygon>
      <tt:Point x="-0.5" y="0.0"/>
      <tt:Point x="0.5" y="0.0"/>
      <tt:Point x="0.5" y="0.4"/>
    </tt:Polygon>
  </tt:PolygonConfiguration>
</ElementItem>
```

```js
elementItem.name  // 'Segments'
elementItem.polygonConfiguration.polygon.point
// [{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 0.4 }]  (with array: ['point'])

elementItem[xsany]['tt:PolygonConfiguration'][0]['tt:Polygon'][0]['tt:Point']
// [{ $: { x: '-0.5', y: '0.0' } }, ...]
```

### 4. Axis-style `tt:Polyline` for tripwire

```xml
<ElementItem Name="Field">
  <tt:Polyline>
    <tt:Point x="-0.8" y="-0.2"/>
    <tt:Point x="0.8" y="-0.2"/>
  </tt:Polyline>
</ElementItem>
```

### 5. Metadata `Filter` - TopicExpression (WS-BaseNotification)

```xml
<Filter>
  <wsnt:TopicExpression Dialect="http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet">
    tns1:RuleEngine/CellMotionDetector/Motion
  </wsnt:TopicExpression>
</Filter>
```

```js
filter.topicExpression.dialect
// 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet'

filter[xsany]
// {
//   'wsnt:TopicExpression': [{
//     $: { Dialect: 'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet' },
//     _: 'tns1:RuleEngine/CellMotionDetector/Motion',
//   }],
// }
```

### 6. Multiple topic expressions + MessageContent (Axis / Bosch style)

```xml
<Filter>
  <wsnt:TopicExpression Dialect="http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet">
    tns1:RuleEngine/LineDetector/Crossed
  </wsnt:TopicExpression>
  <wsnt:TopicExpression Dialect="http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet">
    tns1:RuleEngine/FieldDetector/ObjectsInside
  </wsnt:TopicExpression>
  <wsnt:MessageContent Dialect="http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter">
    boolean(//tt:SimpleItem[@Name="IsMotion" and @Value="true"])
  </wsnt:MessageContent>
</Filter>
```

Parse with `array: ['topicExpression']` (or rely on Media's arrays) and always edit via `filter[xsany]` when
sending back - the MessageContent XPath must keep its dialect attribute and text node (`_`).

### 7. `SubscriptionPolicy` (ChangedOnly)

```xml
<SubscriptionPolicy>
  <wsnt:ChangedOnly>true</wsnt:ChangedOnly>
</SubscriptionPolicy>
```

```js
subscriptionPolicy.changedOnly           // true
subscriptionPolicy[xsany]['wsnt:ChangedOnly']  // ['true']
```

### 8. Event `NotificationMessage` / `tt:Message` ItemList

Pull-point payloads often carry analytics data as SimpleItem / ElementItem:

```xml
<wsnt:NotificationMessage>
  <wsnt:Topic Dialect="http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet">
    tns1:RuleEngine/CellMotionDetector/Motion
  </wsnt:Topic>
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
</wsnt:NotificationMessage>
```

Typed path (after linerase / event pull): `msg.message.message.data.simpleItem`, etc.
For a round-trip of `ElementItem` inside Data, pass `rawXML: ['elementItem']` on the parse options
(Events already forces `notificationMessage` as an array).

### 9. Text-only ElementItem (some firmwares)

```xml
<ElementItem Name="VendorBlob">base64-or-opaque</ElementItem>
```

```js
elementItem.name           // 'VendorBlob'
elementItem._              // may appear on camelCase parse
elementItem[xsany]         // { $: { Name: 'VendorBlob' }, _: 'base64-or-opaque' }
```

### 10. Empty ElementItem / empty Filter

```xml
<ElementItem Name="Reserved"/>
<Filter/>
```

Still get `xsany` with `$` / empty object so setters can send the same shape back.

---

## Read vs write: flatten and `xsany` are **not** mixed on write

After parse, a `rawXML` node (e.g. `ElementItem`, `Filter`) has **two views of the same XML**:

| View | What it is | Used for |
| --- | --- | --- |
| CamelCase flatten | `elementItem.name`, `elementItem.cellLayout.columns`, ... | **Reading** / logging / typed access |
| `elementItem[xsany]` | xml2js tree with `tt:...`, `$`, `_`, arrays | **Writing** back to the device |

They are populated together on parse, but **setters do not merge them**. Serializers take the wire tree from
`[xsany]` only. Changing `elementItem.cellLayout.columns = 10` and then calling
`setVideoAnalyticsConfiguration` will **not** put `Columns="10"` in the SOAP - that value lives only on the
read-only flatten view unless you also edit `[xsany]`.

### What Media actually serializes

**`ElementItem`** (`itemList` -> analytics `Parameters`):

```ts
// Conceptual - see src/utils/toOnvifXMLSchemaObject.ts
{
  ...elementItem[xsany],                    // children + $ from Symbol only
  $: { ...elementItem[xsany].$, Name: elementItem.name },  // typed name wins
}
```

- Into XML: spread of `[xsany]` (e.g. `'tt:CellLayout'`, vendor children).
- Plus `Name` from the typed field `elementItem.name` (overrides `$` if both exist).
- **Not** serialized: `cellLayout`, `polygonConfiguration`, `polyline`, and any other camelCase keys.

**`Filter` / `SubscriptionPolicy`** (metadata configuration):

```ts
Filter: configuration.events.filter[xsany]
SubscriptionPolicy: configuration.events.subscriptionPolicy[xsany]
```

Pure `[xsany]` - the flatten (`filter.topicExpression.dialect`) is ignored on write.

### Correct write path

Cameras often reject configs if child trees lose namespaces, attribute casing, or array shape. Mutate `[xsany]`
for layout/vendor XML; use typed fields only where the builder explicitly maps them (`name`, `SimpleItem`, ...).

```ts
import { xsany } from 'onvif';

const configs = await onvif.media.getVideoAnalyticsConfigurations();
const module = configs[0].analyticsEngineConfiguration.analyticsModule[0];
const layout = module.parameters.elementItem[0];

// OK - typed field that itemList maps into $
layout.name = 'Layout';

// WRONG for write - flatten is not sent
// layout.cellLayout.columns = 10;

// OK - this is what becomes SOAP attributes/children
layout[xsany]['tt:CellLayout'][0].$.Columns = '10';
layout[xsany]['tt:CellLayout'][0].$.Rows = '7';

await onvif.media.setVideoAnalyticsConfiguration({
  configuration: configs[0],
  forcePersistence: true,
});
```

Metadata filters:

```ts
const meta = await onvif.media.getMetadataConfigurations();
const filterAny = meta[0].events.filter[xsany];

// WRONG for write:
// meta[0].events.filter.topicExpression = ...;

// OK:
filterAny['wsnt:TopicExpression'][0]._ =
  'tns1:RuleEngine/CellMotionDetector/Motion';

await onvif.media.setMetadataConfiguration({
  configuration: meta[0],
  forcePersistence: true,
});
```

### Anti-patterns

```ts
// 1) Editing only flatten - silent no-op on the wire
layout.cellLayout.columns = 12;

// 2) Spreading the object - xsany is non-enumerable and disappears
const copy = { ...layout };
copy[xsany]; // undefined - do not rebuild SOAP from `copy`

// 3) Rebuilding ElementItem from camelCase by hand
build({
  ElementItem: {
    $: { Name: layout.name },
    CellLayout: { $: { Columns: layout.cellLayout.columns } }, // wrong tags / no tt: prefix
  },
});
```

### Rules of thumb

- **Read** either view; prefer camelCase for app logic.
- **Write** layout / vendor / TopicExpression / MessageContent only under `[xsany]`.
- Keep prefixed tags (`tt:...`, `wsnt:...`, `hik:...`) and `$` / `_` / arrays as returned.
- Typed fields that builders know about (`name`, `simpleItem[].name` / `.value`) are separate - change those on
  the object, not inside `[xsany]`, unless you also keep `$` in sync.

---

## What you get after parsing (`xs:anyAttribute`)

Extra attributes are merged into the same object as normal **camelCase** properties (namespace prefixes are stripped
on the typed view).

### 11. `Color` (`common.xsd`) - OSD / imaging

```xml
<Color X="0.1" Y="0.2" Z="0.3"
       Colorspace="http://www.onvif.org/ver10/colorspace/YCbCr"
       Likelihood="0.9"
       vv:VendorFlag="extra"/>
```

```js
{
  x: 0.1,
  y: 0.2,
  z: 0.3,
  colorspace: 'http://www.onvif.org/ver10/colorspace/YCbCr',
  likelihood: 0.9,
  vendorFlag: 'extra'   // xs:anyAttribute
}
```

### 12. Hikvision `Parameters` engine id

```xml
<Parameters hik:EngineId="3" hik:Channel="1">
  <SimpleItem Name="Sensitivity" Value="50"/>
</Parameters>
```

```js
parameters.engineId   // 3
parameters.channel    // 1
parameters.simpleItem // [{ name: 'Sensitivity', value: 50 }]
```

### 13. Axis `VideoSource` vendor attributes

```xml
<tt:VideoSource token="1" axis:ImageSource="0" axis:Rotation="180">
  <tt:Framerate>25</tt:Framerate>
  <tt:Resolution><tt:Width>1920</tt:Width><tt:Height>1080</tt:Height></tt:Resolution>
</tt:VideoSource>
```

```js
videoSource.token         // '1'
videoSource.imageSource   // 0
videoSource.rotation      // 180
videoSource.framerate     // 25
```

### 14. PTZ `PanTilt` space URIs as attributes (standard + vendor)

```xml
<PanTilt x="0.2" y="-0.1"
         space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/GenericSpeedSpace"
         vv:SpeedProfile="turbo"/>
```

```js
panTilt.x              // 0.2
panTilt.space          // 'http://www.onvif.org/.../GenericSpeedSpace'
panTilt.speedProfile   // 'turbo'
```

---

## Sending `xs:anyAttribute` back - use `$`

When building XML for the device, attributes live under `$`. A vendor flag next to child elements as a plain property
often drops or becomes a wrong child tag. **Reading strips the prefix** (`vv:VendorFlag` -> `vendorFlag`); when writing
you must put the prefixed name back into `$`.

```js
// Correct
{
  Color: {
    $: {
      X: 0.4,
      Y: 0.5,
      Z: 0.6,
      Colorspace: 'http://www.onvif.org/ver10/colorspace/RGB',
      'vv:VendorFlag': 'painted',
    },
  },
}

{
  Parameters: {
    $: { 'hik:EngineId': '3', 'hik:Channel': '1' },
    SimpleItem: [{ $: { Name: 'Sensitivity', Value: '50' } }],
  },
}
```

Inside an `[xsany]` tree the same rule applies: attributes are already under `$`.

---

## Both at once

### 15. `PTZStatus` (`common.xsd`)

```xml
<PTZStatus vv:FirmwareChannel="A">
  <Position>
    <PanTilt x="0.1" y="-0.2"/>
    <Zoom x="0.5"/>
  </Position>
  <Error>None</Error>
  <vv:VendorExtension><vv:Stable>true</vv:Stable></vv:VendorExtension>
</PTZStatus>
```

Read: `status.firmwareChannel`, `status.vendorExtension.stable`, plus `position` / `error`.  
Write: `vv:FirmwareChannel` in `$`, keep `vv:VendorExtension` as a child.

### 16. `AudioSource` with gain attribute + vendor mic child

```xml
<AudioSources token="AudioSrcToken" vv:GainDb="12">
  <Channels>2</Channels>
  <vv:VendorMic><vv:Model>ACM-1</vv:Model></vv:VendorMic>
</AudioSources>
```

### 17. OSD `TextString` with Color anyAttribute

```xml
<TextString>
  <PlainText>CAM-01</PlainText>
  <FontSize>24</FontSize>
  <FontColor>
    <Color X="0" Y="0" Z="0" Colorspace="http://www.onvif.org/ver10/colorspace/RGB" vv:Alpha="1"/>
  </FontColor>
</TextString>
```

### 18. Imaging `Extension` vendor block

```xml
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
```

### 19. Recording job source extension

```xml
<RecordingJobConfiguration>
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
</RecordingJobConfiguration>
```

### 20. AdvancedSecurity `DistinguishedName` / `anyAttribute`

WSDL models an extension element literally named `anyAttribute` (domain components, etc.):

```ts
// Built by AdvancedSecurity helpers - see tests
{
  CommonName: ['cam.example'],
  Organization: ['ONVIF'],
  anyAttribute: { DomainComponent: ['devices', 'example', 'com'] },
}
```

---

## Practical scenarios

### Configure Hikvision-style cell motion via Media analytics

```ts
import { xsany } from 'onvif';

const configs = await onvif.media.getVideoAnalyticsConfigurations();
const module = configs[0].analyticsEngineConfiguration.analyticsModule
  .find((m) => m.type?.includes('CellMotion'));

const sensitivity = module.parameters.simpleItem.find((s) => s.name === 'Sensitivity');
if (sensitivity) sensitivity.value = 70;

const layout = module.parameters.elementItem.find((e) => e.name === 'Layout');
if (layout?.[xsany]?.['tt:CellLayout']?.[0]) {
  layout[xsany]['tt:CellLayout'][0].$.Columns = '22';
  layout[xsany]['tt:CellLayout'][0].$.Rows = '18';
}

await onvif.media.setVideoAnalyticsConfiguration({
  configuration: configs[0],
  forcePersistence: true,
});
```

### Narrow pull-point topics (Axis / Profile T)

Prefer `Subscription` filters (library builds TopicExpression for you). If you already have a Media metadata
configuration with a Filter, edit `filter[xsany]` as above - do not stringify the camelCase `topicExpression` alone.

### Debug raw SOAP when structure is unclear

```ts
onvif.on('rawResponse', (xml) => console.log(xml));
onvif.on('rawRequest', (xml) => console.log(xml));
```

Look for unexpected namespaces (`hik:`, `axis:`, `dahua:`, `vv:`) under analytics Parameters, Metadata Filter,
PTZStatus, and OSD Color.

---

## Caveats (verified behaviour)

1. **`xsany` only for `rawXML` tags** - without `rawXML`, vendor children still appear as camelCase, but you lose the
   prefixed rebuild tree. Media / Analytics / ActionEngine / AnalyticsDevice Gets that round-trip via `config()` /
   `itemList()` set `elementItem` (Media also `filter` / `subscriptionPolicy`).
2. **Write does not mix flatten + `xsany`** - serializers use `[xsany]` (and typed `name` for `ElementItem`). CamelCase
   layout fields are read-only for the wire.
3. **anyAttribute prefixes are lost on read** - `vv:VendorFlag` becomes `vendorFlag`. When writing, restore
   `'vv:VendorFlag'` (or the camera's prefix) under `$`.
4. **Children in `xsany` are arrays** - even a single `tt:CellLayout` is `['tt:CellLayout'][0]`.
5. **Do not spread objects with `xsany`** - the symbol is non-enumerable; `{ ...elementItem }` drops it.
6. **Numbers/booleans in camelCase view** are coerced (`"50"` -> `50`, `"true"` -> `true`); inside `xsany` attribute
   values usually stay **strings** as in the wire XML - keep them as strings when editing `$`.
7. **Numeric-looking tokens** (e.g. `token="1"`) may become numbers after parse - prefer non-numeric tokens in tests,
   or compare with `String(token)`.
8. **Text-only / empty `rawXML` nodes** (e.g. `<ElementItem Name="Blob">...</ElementItem>` with no child elements)
   still get an `xsany` object (`$` + optional `_`).

---

## Summary

For everyday reading, use camelCase fields. When changing vendor or layout XML and sending it back, edit `obj[xsany]` -
that is the only tree Media puts into SOAP for `xs:any` (except mapping `ElementItem.name` into `$`). Extra attributes
belong under `$` on write (keep the prefixes the camera used). Do not rebuild the SOAP payload from the camelCase view
alone, and do not assume flatten edits are merged into `[xsany]`.

Executable coverage of these snippets:
[`__tests__/any.test.ts`](../__tests__/any.test.ts) and
[`__tests__/vendor-extensions.test.ts`](../__tests__/vendor-extensions.test.ts).
