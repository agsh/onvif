import { readFileSync, writeFileSync } from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
// import { glob } from 'glob';
import { Parser } from 'xml2js';
// eslint-disable-next-line import/no-extraneous-dependencies
import ts from 'typescript';

const sourceFile = ts.createSourceFile(
  'soap-types.ts', // the output file name
  '', // the text of the source code, not needed for our purposes
  ts.ScriptTarget.Latest, // the target language version for the output file
  false,
  ts.ScriptKind.TS, // output script kind. options include JS, TS, JSX, TSX and others
);

// used for adding `export` directive to generated type
const exportModifier = ts.factory.createModifiersFromModifierFlags(
  ts.ModifierFlags.Export,
);

const anyURI = ts.factory.createTypeAliasDeclaration(
  exportModifier,
  'AnyURI',
  undefined,
  ts.factory.createTypeReferenceNode('string'),
);

// Primitive datatypes defined by SOAP (there are more)
type SoapPrimitive =
  | 'xs:boolean'
  | 'xs:double'
  | 'xs:float'
  | 'xs:int'
  | 'xs:short'
  | 'xs:signedInt'
  | 'xs:string'
  | 'xs:unsignedInt'
  | 'xs:unsignedShort'
  | 'xs:dateTime'
  | 'xs:anyURI'
;

const dataTypes: Record<SoapPrimitive, string> = {
  'xs:boolean'       : 'boolean',
  'xs:double'        : 'number',
  'xs:float'         : 'number',
  'xs:int'           : 'number',
  'xs:string'        : 'string',
  'xs:short'         : 'number',
  'xs:signedInt'     : 'number',
  'xs:unsignedInt'   : 'number',
  'xs:dateTime'      : 'date',
  'xs:unsignedShort' : 'number',
  'xs:anyURI'        : 'AnyURI',
};

interface ISimpleType {
  meta: {
    name: string;
  };
  'xs:annotation': {
    'xs:documentation': string[];
  }[];
  'xs:restriction': {
    meta: {
      base: SoapPrimitive;
    };
    'xs:enumeration'?: {
      meta: {
        value: string;
      };
    }[];
  }[];
}

interface IComplexType {
  meta: {
    name: string;
  };
  'xs:attribute'?: {
    meta : {
      name: string;
      type: SoapPrimitive;
      use: 'required' | 'optional';
    };
    'xs:annotation': {
      'xs:documentation': string[];
    }[];
  }[];
}

interface ISchemaDefinition {
  'xs:simpleType': ISimpleType[];
  'xs:complexType': IComplexType[];
}

async function processXSD(filePath: string) {
  const wsdlData = readFileSync(filePath, { encoding : 'utf-8' })
    .replace(/<xs:documentation>([\s\S]*?)<\/xs:documentation>/g, (_, b) => `<xs:documentation><![CDATA[${b}]]></xs:documentation>`);

  const xmlParser = new Parser({
    attrkey : 'meta',
  });

  const serviceDefinition = await xmlParser.parseStringPromise(wsdlData);
  return serviceDefinition['xs:schema'] as ISchemaDefinition;
}

function generateSimpleTypeInterface(simpleType: ISimpleType): ts.Node[] {
  const cl: ts.Node[] = [];
  const interfaceSymbol = ts.factory.createIdentifier(simpleType.meta.name);
  if (simpleType['xs:annotation']) {
    cl.push(ts.factory.createJSDocComment(simpleType['xs:annotation']?.[0]['xs:documentation'][0]));
  }
  if (simpleType['xs:restriction'][0]['xs:enumeration']) {
    cl.push(
      // ts.factory.createEnumDeclaration(
      //   exportModifier,
      //   interfaceSymbol, // interface name
      //   simpleType['xs:restriction'][0]['xs:enumeration'].map((enumValue) => ts.factory.createEnumMember(enumValue.meta.value, ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(enumValue.meta.value)))),
      // ),
      ts.factory.createTypeAliasDeclaration(
        exportModifier,
        interfaceSymbol, // interface name
        undefined,
        ts.factory.createUnionTypeNode(simpleType['xs:restriction'][0]['xs:enumeration'].map((enumValue) => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(enumValue.meta.value)))),
      ),
    );
  } else {
    cl.push(ts.factory.createTypeAliasDeclaration(
      exportModifier,
      interfaceSymbol,
      undefined,
      ts.factory.createTypeReferenceNode(dataTypes[simpleType['xs:restriction'][0].meta.base]),
    ));
  }
  return cl;
}

function createDocComment(node: any) {
  if (node['xs:annotation']) {
    return ts.addSyntheticLeadingComment(
      ts.factory.createPropertySignature(
        undefined,
        node.meta.name,
        undefined,
        ts.factory.createTypeReferenceNode(dataTypes[node.meta.type as SoapPrimitive]),
      ),
      ts.SyntaxKind.MultiLineCommentTrivia,
      `* ${node['xs:annotation']?.[0]['xs:documentation'][0]}`,
      true,
    );
  }
  return ts.factory.createPropertySignature(
    undefined,
    node.meta.name,
    undefined,
    ts.factory.createTypeReferenceNode(dataTypes[node.meta.type as SoapPrimitive]),
  );
}

function generateComplexTypeInterface(complexType: IComplexType) : ts.Node[] {
  const interfaceSymbol = ts.factory.createIdentifier(complexType.meta.name);

  let members: ts.TypeElement[] = [];
  // attribute.use === 'required'; // optional
  if (complexType['xs:attribute']) {
    members = complexType['xs:attribute'].map((attribute) => {
      const cl = createDocComment(attribute);
      return cl;
    });
  }

  const cl = ts.factory.createInterfaceDeclaration(
    exportModifier, // modifiers
    interfaceSymbol, // interface name
    undefined, // no generic type parameters
    undefined, // no heritage clauses (extends, implements)
    members,
  );

  return [cl];
}

async function main() {
  // const wsdls = await glob('../specs/wsdl/**/*.wsdl');
  // console.log(wsdls);
  // const serviceDefinition = await processWSDL('../specs/wsdl/ver10/device/wsdl/devicemgmt.wsdl');
  const serviceDefinition = await processXSD('../specs/wsdl/ver10/schema/common.xsd');

  const simpleTypeInterfaces = serviceDefinition['xs:simpleType'].map(
    generateSimpleTypeInterface,
  ).flat();

  const complexTypeInterfaces = serviceDefinition['xs:complexType'].map(
    generateComplexTypeInterface,
  ).flat();

  const nodes: ts.Node[] = [anyURI, ...simpleTypeInterfaces, ...complexTypeInterfaces];

  const nodeArr = ts.factory.createNodeArray(nodes);

  // printer for writing the AST to a file as code
  const printer = ts.createPrinter({ newLine : ts.NewLineKind.LineFeed });
  const result = printer.printList(
    ts.ListFormat.MultiLine,
    nodeArr,
    sourceFile,
  );

  // write the code to file
  writeFileSync('soap-types.ts', result, { encoding : 'utf-8' });
}

// eslint-disable-next-line no-console
main().then(console.log).catch(console.error);
