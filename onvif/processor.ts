// eslint-disable-next-line import/no-extraneous-dependencies
import { readFileSync, writeFileSync } from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
// import { glob } from 'glob';
import { Parser } from 'xml2js';
// eslint-disable-next-line import/no-extraneous-dependencies
import ts, { TypeNode } from 'typescript';

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
    case 'anyType': return 'any';
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
      'xs:complexType'?: IComplexType[];
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

/**
 * Common class to process xml-files
 */
export class Processor {
  private filePath: string;
  private nodes: ts.Node[] = [];
  private schema?: IXSDSchemaDefinition;
  constructor(filePath: string, nodes: ts.Node[]) {
    this.filePath = filePath;
    this.nodes = nodes;
  }

  async main(): Promise<ts.Node[]> {
    // const wsdls = await glob('../specs/wsdl/**/*.wsdl');
    // console.log(wsdls);
    // const serviceDefinition = await processWSDL('../specs/wsdl/ver10/device/wsdl/devicemgmt.wsdl');
    await this.processXSD();
    this.schema!['xs:simpleType'].forEach((simpleType) => this.generateSimpleTypeInterface(simpleType));
    this.schema!['xs:complexType'].forEach((complexType) => this.generateComplexTypeInterface(complexType));
    // const complexTypeInterfaces = serviceDefinition['xs:complexType'].map(
    //   generateComplexTypeInterface,
    // );

    // const nodes: ts.Node[] = [anyURI, ...simpleTypeInterfaces, ...complexTypeInterfaces];

    return this.nodes;
  }

  async processXSD() {
    const xsdData = readFileSync(this.filePath, { encoding : 'utf-8' })
      .replace(/<xs:documentation>([\s\S]*?)<\/xs:documentation>/g, (_, b) => `<xs:documentation><![CDATA[${b}]]></xs:documentation>`);

    const xmlParser = new Parser({
      attrkey : 'meta',
    });

    const serviceDefinition = await xmlParser.parseStringPromise(xsdData);
    this.schema = serviceDefinition['xs:schema'] as IXSDSchemaDefinition;
  }

  createAnnotationIfExists(attribute: any, node: any) {
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

  generateSimpleTypeInterface(simpleType: ISimpleType) {
    const interfaceSymbol = ts.factory.createIdentifier(simpleType.meta.name);
    if (simpleType['xs:restriction'][0]['xs:enumeration']) {
      this.nodes.push(
        this.createAnnotationIfExists(
          simpleType,
          ts.factory.createTypeAliasDeclaration(
            exportModifier,
            interfaceSymbol, // interface name
            undefined,
            ts.factory.createUnionTypeNode(simpleType['xs:restriction'][0]['xs:enumeration']
              .map((enumValue) => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(enumValue.meta.value)))),
          ),
        ),
      );
    } else {
      this.nodes.push(
        this.createAnnotationIfExists(
          simpleType,
          ts.factory.createTypeAliasDeclaration(
            exportModifier,
            interfaceSymbol,
            undefined,
            ts.factory.createTypeReferenceNode(dataTypes(simpleType['xs:restriction'][0].meta.base)),
          ),
        ),
      );
    }
  }

  createProperty(attribute: any) {
    let type: TypeNode = ts.factory.createTypeReferenceNode(dataTypes(attribute.meta.type));
    if (attribute.meta.maxOccurs === 'unbounded') {
      type = ts.factory.createArrayTypeNode(type);
    }
    const property = ts.factory.createPropertySignature(
      undefined,
      this.camelCase(attribute.meta.name),
      attribute.meta.use !== 'required' ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type,
    );
    return this.createAnnotationIfExists(attribute, property);
  }

  generateComplexTypeInterface(complexType: IComplexType) {
    const interfaceSymbol = ts.factory.createIdentifier(complexType.meta.name);

    let members: ts.TypeElement[] = [];
    // attribute.use === 'required'; // optional
    if (complexType['xs:attribute']) {
      members = members.concat(
        complexType['xs:attribute'].map((attribute) => this.createProperty(attribute)),
      );
    }
    if (complexType['xs:sequence']) {
      if (!Array.isArray(complexType['xs:sequence'][0]['xs:element'])) {
        /** TODO Any and so on */
        // console.log(complexType);
        // console.log('--------------');
        // return ts.factory.createPropertySignature(
        //   undefined,
        //   complexType.meta.name,
        //   ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        //   ts.factory.createTypeReferenceNode('any'),
        // );
      } else {
        // console.log(complexType);
        members = members.concat(
          members = complexType['xs:sequence'][0]['xs:element'].map((attribute) => {
            // console.log(attribute.meta.name);
            /** TODO complex type inside complex type */
            if (attribute['xs:complexType']) {
              attribute['xs:complexType'][0].meta = { name : attribute.meta.name };
              this.generateComplexTypeInterface(attribute['xs:complexType'][0]);
              attribute.meta.type = `tt:${attribute.meta.name}`;
            }
            const cl = this.createProperty(attribute);
            return cl;
          }),
        );
        // console.log('------------');
      }
    }

    const node = ts.factory.createInterfaceDeclaration(
      exportModifier, // modifiers
      interfaceSymbol, // interface name
      undefined, // no generic type parameters
      undefined, // no heritage clauses (extends, implements)
      members,
    );

    this.nodes.push(
      this.createAnnotationIfExists(complexType, node),
    );
  }

  camelCase(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
}

const proc = new Processor('../specs/wsdl/ver10/schema/common.xsd', []);
proc.main().then((nodes) => {
  nodes = [anyURI, ...nodes];
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
}).catch(console.log);
