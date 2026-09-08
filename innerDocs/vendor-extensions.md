# Vendor XML / `xs:any` and `xs:anyAttribute`

ONVIF schemas use two extension points everywhere (analytics modules, metadata filters, PTZ status, Color, …):

```xml
<xs:any namespace="##any" processContents="lax" minOccurs="0" maxOccurs="unbounded"/>
<xs:anyAttribute processContents="lax"/>
```

| Wildcard | Meaning in XML | How this library exposes it |
| --- | --- | --- |
| `xs:any` | Extra child elements (vendor-/type-specific trees) | camelCase fields + raw rebuild tree on `xsany` |
| `xs:anyAttribute` | Extra XML attributes | Flattened on read; put under `$` when writing |

Import the symbol once:

```ts
import { xsany } from 'onvif';
```

`xsany` is `Symbol('any')`. The property is non-enumerable, so it does not show up in `Object.keys`, `JSON.stringify`,
or object spreads — use `obj[xsany]` explicitly.

The shape of `obj[xsany]` (and how you send it back) follows the
[xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) object style: element names as keys, attributes under `$`,
text under `_`, and children as arrays.

---

## What you get after parsing (`xs:any`)

Tags marked as raw XML (for example `elementItem`, `filter`, `subscriptionPolicy` in Media) are parsed twice:

1. Normal fields — camelCase, typed where possible (`name`, `cellLayout.columns`, …)
2. `obj[xsany]` — xml2js-style tree with original element/attribute names (with prefixes), arrays, and `$` / `_` — ready
   to send back to the camera

### Camera example: Cell Motion `ElementItem` (`onvif.xsd` ItemList)

Typical analytics layout from Hikvision / Dahua / HappyTime-style devices:

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

After `getVideoAnalyticsConfigurations` / similar:

```js
elementItem.name                         // 'Layout'
elementItem.cellLayout.columns           // 8
elementItem.cellLayout.rows              // 6
elementItem.cellLayout.transformation.translate  // { x: -1, y: -1 }
elementItem.cellLayout.transformation.scale      // { x: 0.25, y: 0.333 }

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

### Camera example: Metadata `Filter` (WS-BaseNotification TopicExpression)

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

---

## Sending `xs:any` back (so nothing breaks)

Cameras often reject configs if child trees lose namespaces, attribute casing, or array shape. Do not rebuild `xs:any`
from the camelCase view. Mutate `[xsany]` (and known typed fields), then pass the object into the library setter.

```ts
import { xsany } from 'onvif';

const configs = await onvif.media.getVideoAnalyticsConfigurations();
const module = configs[0].analyticsEngineConfiguration.analyticsModule[0];
const layout = module.parameters.elementItem[0];

// 1) Known typed field — safe to change directly
layout.name = 'Layout';

// 2) xs:any tree — change only inside [xsany]
layout[xsany]['tt:CellLayout'][0].$.Columns = '10';
layout[xsany]['tt:CellLayout'][0].$.Rows = '7';
layout[xsany]['tt:CellLayout'][0]['tt:Transformation'][0]['tt:Translate'][0].$ = {
  x: '-1',
  y: '-1',
};
layout[xsany]['tt:CellLayout'][0]['tt:Transformation'][0]['tt:Scale'][0].$ = {
  x: '0.25',
  y: '0.333',
};

await onvif.media.setVideoAnalyticsConfiguration({
  configuration: configs[0],
  forcePersistence: true,
});
```

Same idea for metadata event filters — Media sends `Filter: configuration.events.filter[xsany]`:

```ts
const meta = await onvif.media.getMetadataConfigurations();
const filterAny = meta[0].events.filter[xsany];

filterAny['wsnt:TopicExpression'][0]._ =
  'tns1:RuleEngine/CellMotionDetector/Motion';

await onvif.media.setMetadataConfiguration({
  configuration: meta[0],
  forcePersistence: true,
});
```

Rules of thumb:

- Change typed fields on the object (`name`, `sensitivity`, …).
- Change unknown / vendor / layout XML only under `[xsany]`.
- Keep prefixed tags (`tt:…`, `wsnt:…`) and `$` / `_` as returned — that is what the device expects.

---

## What you get after parsing (`xs:anyAttribute`)

Extra attributes are merged into the same object as normal camelCase properties (namespace prefixes are stripped).

### Camera example: `Color` (`common.xsd`)

```xml
<Color X="0.1" Y="0.2" Z="0.3"
       Colorspace="http://www.onvif.org/ver10/colorspace/YCbCr"
       vv:VendorFlag="extra"/>
```

```js
{
  x: 0.1,
  y: 0.2,
  z: 0.3,
  colorspace: 'http://www.onvif.org/ver10/colorspace/YCbCr',
  vendorFlag: 'extra'   // xs:anyAttribute
}
```

### Camera example: `ItemList` / `Parameters` attribute

```xml
<Parameters vv:VendorParam="keep-me">
  <SimpleItem Name="Sensitivity" Value="50"/>
</Parameters>
```

```js
parameters.vendorParam  // 'keep-me'
parameters.simpleItem   // [{ name: 'Sensitivity', value: 50 }]
```

---

## Sending `xs:anyAttribute` back — use `$`

When building XML for the device, attributes live under `$`. Putting a vendor flag next to child elements as a plain
property often drops it or turns it into a wrong child tag.

```js
// Correct: attributes in $
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

// Correct: ItemList vendor attribute preserved
{
  Parameters: {
    $: { 'vv:VendorParam': 'keep-me' },
    SimpleItem: [{ $: { Name: 'Sensitivity', Value: '50' } }],
  },
}
```

Inside an `[xsany]` tree the same rule applies: attributes are already under `$` — edit those keys, do not invent a
parallel camelCase attribute object for rebuild.

---

## Both at once: `PTZStatus` (`common.xsd`)

Devices may add a vendor attribute and a vendor child on the same element:

```xml
<PTZStatus vv:FirmwareChannel="A">
  <Position>
    <PanTilt x="0.1" y="-0.2"/>
    <Zoom x="0.5"/>
  </Position>
  <vv:VendorExtension><vv:Stable>true</vv:Stable></vv:VendorExtension>
</PTZStatus>
```

Read: `status.firmwareChannel`, `status.vendorExtension.stable`, plus normal `position` / `moveStatus`.  
Write: put `vv:FirmwareChannel` in `$`, and keep `vv:VendorExtension` as a child element (or under `[xsany]` when that
node is rawXML).

---

## Summary at the end

For everyday reading, use the camelCase fields. When you need to change vendor or layout XML and send it back, edit
`obj[xsany]` — that tree is what Media setters already pass through for things like `ElementItem` and `Filter`. Extra
attributes belong under `$` on write (keep the prefixes the camera used). Do not rebuild the SOAP payload from the
camelCase view alone: that is the usual way round-trips break.

More coverage of the snippets above:
[`__tests__/any.test.ts`](__tests__/any.test.ts).
