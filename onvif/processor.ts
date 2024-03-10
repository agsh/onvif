// eslint-disable-next-line import/no-extraneous-dependencies
import { readFileSync, writeFileSync } from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
// import { glob } from 'glob';
import { Parser } from 'xml2js';
// eslint-disable-next-line import/no-extraneous-dependencies
import ts, { TypeNode } from 'typescript';
// eslint-disable-next-line import/no-extraneous-dependencies
import { glob } from 'glob';

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
  // const type = xsdType.slice(3);
  switch (xsdType) {
    case 'xs:double': return 'number';
    case 'xs:float': return 'number';
    case 'xs:int': return 'number';
    case 'xs:integer': return 'number';
    case 'xs:short': return 'number';
    case 'xs:signedInt': return 'number';
    case 'xs:unsignedInt': return 'number';
    case 'xs:unsignedShort': return 'number';
    case 'xs:dateTime': return 'Date';
    case 'xs:token': return 'string';
    case 'xs:anyURI': return 'AnyURI';
    case 'xs:anyType': return 'any';
    case 'xs:hexBinary': return 'any';
    case 'xs:base64Binary': return 'any';
    case 'xs:duration': return 'any';
    case 'wsnt:FilterType': return 'any';
    case 'wsnt:NotificationMessageHolderType': return 'any';
    case 'soapenv:Envelope': return 'any';
    case 'soapenv:Fault': return 'any';
    case 'xs:anySimpleType': return 'any';
    case 'xs:QName': return 'any';
    default: return xsdType.slice(xsdType.indexOf(':') + 1);
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
  'xs:list': {
    meta: {
      itemType: string;
    };
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
    return this.nodes;
  }

  async processXSD() {
    const xsdData = readFileSync(this.filePath, { encoding : 'utf-8' })
      .replace(/<xs:documentation>([\s\S]*?)<\/xs:documentation>/g, (_, b) => `<xs:documentation><![CDATA[${b.replace(/(\s)+\n/, '\n')}]]></xs:documentation>`);

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
    const interfaceSymbol = ts.factory.createIdentifier(this.cleanName(simpleType.meta.name));
    if (simpleType['xs:restriction']) {
      /** RESTRICTIONS */
      if (simpleType['xs:restriction'][0]['xs:enumeration']) {
        this.nodes.push(
          this.createAnnotationIfExists(
            simpleType,
            ts.factory.createTypeAliasDeclaration(
              exportModifier,
              interfaceSymbol, // interface name
              undefined,
              ts.factory.createUnionTypeNode(simpleType['xs:restriction'][0]['xs:enumeration']
                .map((enumValue) => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(enumValue.meta.value, true)))),
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
    } else if (simpleType['xs:list']) {
      /** LISTS */
      this.nodes.push(
        this.createAnnotationIfExists(
          simpleType,
          ts.factory.createTypeAliasDeclaration(
            exportModifier,
            interfaceSymbol,
            undefined,
            ts.factory.createArrayTypeNode(ts.factory.createTypeReferenceNode(dataTypes(simpleType['xs:list'][0].meta.itemType))),
          ),
        ),
      );
    }
  }

  createProperty(attribute: any) {
    let type: TypeNode = ts.factory.createTypeReferenceNode(this.cleanName(dataTypes(attribute.meta.type)));
    /** REFS FOR XMIME */
    if (!attribute.meta.name && attribute.meta.ref) {
      attribute.meta.name = attribute.meta.ref.slice(6);
    }
    /** ARRAYS */
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
    const secondLetter = name.charAt(1);
    if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
      name = name.charAt(0).toLowerCase() + name.slice(1);
    }
    if (/[-.]/g.test(name)) {
      name = `'${name}'`;
    }
    return name;
  }

  cleanName(name: string): string {
    return name.replace(/[-.]/g, '');
  }
}
async function start() {
  let xsds = await glob('../specs/wsdl/**/*.xsd');
  console.log(xsds);
  xsds = [xsds[6], xsds[4]];
  console.log(xsds);
  const nodes: ts.Node[] = [anyURI];

  for (const xsd of xsds) {
    console.log(`processing ${xsd}`);
    const proc = new Processor(xsd, nodes);
    await proc.main();
  }

  const nodeArr = ts.factory.createNodeArray(nodes);

  // printer for writing the AST to a file as code
  const printer = ts.createPrinter({ newLine : ts.NewLineKind.LineFeed });
  const result = printer.printList(
    ts.ListFormat.MultiLine,
    nodeArr,
    sourceFile,
  );

  // write the code to file
  writeFileSync('./onvif/interfaces/interface.ts', result, { encoding : 'utf-8' });

  // const name = 'onvif';
  // const proc = new Processor(`../specs/wsdl/ver10/schema/${name}.xsd`, []);
  // proc.main().then((nodes) => {
  //   nodes = [anyURI, ...nodes];
  //   const nodeArr = ts.factory.createNodeArray(nodes);
  //
  //   // printer for writing the AST to a file as code
  //   const printer = ts.createPrinter({ newLine : ts.NewLineKind.LineFeed });
  //   const result = printer.printList(
  //     ts.ListFormat.MultiLine,
  //     nodeArr,
  //     sourceFile,
  //   );
  //
  //   // write the code to file
  //   writeFileSync(`./onvif/interfaces/${name}.ts`, result, { encoding : 'utf-8' });
  // }).catch(console.log);
}
start().catch(console.error);
