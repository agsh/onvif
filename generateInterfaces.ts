/**
 * Read:
 * https://shadeglare.medium.com/typescript-code-generation-using-its-compiler-api-4c50ad9f7884
 */

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

function dataTypes(xsdType?: string): string {
  if (!xsdType) {
    return 'any';
  }
  const type = xsdType.slice(3);
  switch (type) {
    case 'double': return 'number';
    case 'float': return 'number';
    case 'int': return 'number';
    case 'short': return 'number';
    case 'signedInt': return 'number';
    case 'unsignedInt': return 'number';
    case 'unsignedShort': return 'number';
    case 'dateTime': return 'Date';
    case 'anyURI': return 'AnyURI';
    default: return type;
  }
}

interface ISimpleType {
  meta: {
    name: string;
  };
  'xs:annotation': {
    'xs:documentation': string[];
  }[];
  'xs:restriction': {
    meta: {
      base: string;
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
      type: string;
      use: 'required' | 'optional';
    };
  }[];
  'xs:sequence'?: {
    'xs:element': {
      meta: {
        name: string;
        type: string;
        use: 'required' | 'optional';
      };
      'xs:annotation': {
        'xs:documentation': string[];
      }[];
    }[];
  }[];
  'xs:annotation'?: {
    'xs:documentation': string[];
  }[];
}

interface IXSDSchemaDefinition {
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
  return serviceDefinition['xs:schema'] as IXSDSchemaDefinition;
}

function generateSimpleTypeInterface(simpleType: ISimpleType): ts.Node {
  const interfaceSymbol = ts.factory.createIdentifier(simpleType.meta.name);
  if (simpleType['xs:restriction'][0]['xs:enumeration']) {
    // ts.factory.createEnumDeclaration(
    //   exportModifier,
    //   interfaceSymbol, // interface name
    //   simpleType['xs:restriction'][0]['xs:enumeration'].map((enumValue) => ts.factory.createEnumMember(enumValue.meta.value, ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(enumValue.meta.value)))),
    // ),
    return createAnnotationIfExists(
      simpleType,
      ts.factory.createTypeAliasDeclaration(
        exportModifier,
        interfaceSymbol, // interface name
        undefined,
        ts.factory.createUnionTypeNode(simpleType['xs:restriction'][0]['xs:enumeration'].map((enumValue) => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(enumValue.meta.value)))),
      ),
    );
  }
  return createAnnotationIfExists(
    simpleType,
    ts.factory.createTypeAliasDeclaration(
      exportModifier,
      interfaceSymbol,
      undefined,
      ts.factory.createTypeReferenceNode(dataTypes(simpleType['xs:restriction'][0].meta.base)),
    ),
  );
}

function createAnnotationIfExists(attribute: any, node: any) {
  if (attribute['xs:annotation']) {
    return ts.addSyntheticLeadingComment(
      node,
      ts.SyntaxKind.MultiLineCommentTrivia,
      `* ${attribute['xs:annotation']?.[0]['xs:documentation'][0]} `,
      true,
    );
  }
  return node;
}

function createProperty(attribute: any) {
  const property = ts.factory.createPropertySignature(
    undefined,
    attribute.meta.name,
    attribute.meta.use !== 'required' ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    ts.factory.createTypeReferenceNode(dataTypes(attribute.meta.type)),
  );
  return createAnnotationIfExists(attribute, property);
}

function generateComplexTypeInterface(complexType: IComplexType) : ts.Node {
  const interfaceSymbol = ts.factory.createIdentifier(complexType.meta.name);

  let members: ts.TypeElement[] = [];
  // attribute.use === 'required'; // optional
  if (complexType['xs:attribute']) {
    members = members.concat(
      complexType['xs:attribute'].map((attribute) => {
        const cl = createProperty(attribute);
        return cl;
      }),
    );
  }
  if (complexType['xs:sequence']) {
    if (!Array.isArray(complexType['xs:sequence'][0]['xs:element'])) {
      // return ts.factory.createPropertySignature(
      //   undefined,
      //   complexType.meta.name,
      //   ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      //   ts.factory.createTypeReferenceNode('any'),
      // );
    } else {
      members = members.concat(
        members = complexType['xs:sequence'][0]['xs:element'].map((attribute) => {
          const cl = createProperty(attribute);
          return cl;
        }),
      );
    }
  }

  const node = ts.factory.createInterfaceDeclaration(
    exportModifier, // modifiers
    interfaceSymbol, // interface name
    undefined, // no generic type parameters
    undefined, // no heritage clauses (extends, implements)
    members,
  );

  return createAnnotationIfExists(complexType, node);
}

async function main() {
  // const wsdls = await glob('../specs/wsdl/**/*.wsdl');
  // console.log(wsdls);
  // const serviceDefinition = await processWSDL('../specs/wsdl/ver10/device/wsdl/devicemgmt.wsdl');
  const serviceDefinition = await processXSD('../specs/wsdl/ver10/schema/common.xsd');

  const simpleTypeInterfaces = serviceDefinition['xs:simpleType'].map(
    generateSimpleTypeInterface,
  );

  const complexTypeInterfaces = serviceDefinition['xs:complexType'].map(
    generateComplexTypeInterface,
  );

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
