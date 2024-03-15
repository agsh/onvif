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

const builtInTypes = Object.entries({
  AnyURI     : 'string',
  FilterType : 'any',
}).map(([name, typeName]) => ts.factory.createTypeAliasDeclaration(
  exportModifier,
  name,
  undefined,
  ts.factory.createTypeReferenceNode(typeName),
));

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
    case 'tt:Object': return 'OnvifObject';
    default: return xsdType.slice(xsdType.indexOf(':') + 1);
  }
}

function cleanName(name: string): string {
  if (name === 'Object') {
    return 'OnvifObject';
  }
  return name.replace(/[-.]/g, '');
}

function camelCase(name: string): string {
  const secondLetter = name.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    name = name.charAt(0).toLowerCase() + name.slice(1);
  }
  if (/[-.]/g.test(name)) {
    name = `'${name}'`;
  }
  return name;
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
  'xs:complexContent': {
    'xs:extension': {
      meta: {
        base: string;
      };
      'xs:sequence': any[];
    }[];
  }[];
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

interface ISchemaDefinition {
  'xs:simpleType': ISimpleType[];
  'xs:complexType': IComplexType[];
}

interface ProcessorConstructor {
  filePath: string;
  nodes: ts.Node[];
  types: Set<string>;
}

/**
 * Common class to process xml-files
 */
export class Processor {
  private filePath: string;
  private readonly nodes: ts.Node[] = [];
  protected schema?: ISchemaDefinition;
  private readonly types: Set<string>;
  constructor({
    filePath,
    nodes,
    types,
  }: ProcessorConstructor) {
    this.filePath = filePath;
    this.nodes = nodes;
    this.types = types;
  }

  async main(): Promise<ts.Node[]> {
    await this.process();
    if (this.schema?.['xs:simpleType']) {
      this.schema['xs:simpleType'].forEach((simpleType) => this.generateSimpleTypeInterface(simpleType));
    }
    if (this.schema?.['xs:complexType']) {
      this.schema['xs:complexType'].forEach((complexType) => this.generateComplexTypeInterface(complexType));
    }
    return this.nodes;
  }

  async processXML() {
    const xsdData = readFileSync(this.filePath, { encoding : 'utf-8' })
      .replace(/<xs:documentation>([\s\S]*?)<\/xs:documentation>/g, (_, b) => `<xs:documentation><![CDATA[${b.replace(/(\s)+\n/, '\n')}]]></xs:documentation>`);

    const xmlParser = new Parser({
      attrkey : 'meta',
    });

    return xmlParser.parseStringPromise(xsdData);
  }

  async process() {
    throw new Error('Not implemented');
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
    const name = cleanName(simpleType.meta.name);
    if (this.types.has(name)) {
      return;
    }
    this.types.add(name);
    const interfaceSymbol = ts.factory.createIdentifier(name);
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
    let type: TypeNode = ts.factory.createTypeReferenceNode(cleanName(dataTypes(attribute.meta.type)));
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
      camelCase(attribute.meta.name),
      attribute.meta.use !== 'required' ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type,
    );
    return this.createAnnotationIfExists(attribute, property);
  }

  generateComplexTypeInterface(complexType: IComplexType) {
    const interfaceSymbol = ts.factory.createIdentifier(cleanName(complexType.meta.name));

    let members: ts.TypeElement[] = [];
    let heritage;

    /** Complex Content */
    if (Array.isArray(complexType['xs:complexContent'])) {
      const name = complexType['xs:complexContent'][0]['xs:extension'][0].meta.base;
      const heritageName = name.slice(name.indexOf(':') + 1);
      heritage = extendInterface(heritageName);
      if (complexType['xs:sequence']) {
        throw new Error('complexType[\'xs:sequence\'] in complexContent: complexType.meta.name');
      }
      complexType['xs:sequence'] = complexType['xs:complexContent'][0]['xs:extension'][0]['xs:sequence'];
    }

    // attribute.use === 'required'; // optional
    if (complexType['xs:attribute']) {
      members = members.concat(
        complexType['xs:attribute'].map((attribute) => this.createProperty(attribute)),
      );
    }
    if (complexType['xs:sequence']) {
      if (!Array.isArray(complexType['xs:sequence'][0]['xs:element'])) {
        /** TODO Any */

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
      heritage,
      members,
    );

    this.nodes.push(
      this.createAnnotationIfExists(complexType, node),
    );
  }
}

function extendInterface(interfaceName?: string) {
  if (interfaceName) {
    return [ts.factory.createHeritageClause(
      ts.SyntaxKind.ExtendsKeyword,
      [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(interfaceName), [])],
    )];
  }
  return undefined;
}

class ProcessorXSD extends Processor {
  constructor(options: ProcessorConstructor) {
    super(options);
  }

  async process() {
    this.schema = (await this.processXML())['xs:schema'] as ISchemaDefinition;
  }
}

class ProcessorWSDL extends Processor {
  constructor(options: ProcessorConstructor) {
    super(options);
  }

  async process() {
    this.schema = (await this.processXML())['wsdl:definitions']['wsdl:types'][0]['xs:schema'][0] as ISchemaDefinition;
  }
}

class InterfaceProcessor {
  private nodes: ts.Node[];
  private types: Set<string>;
  constructor() {
    this.nodes = [];
    this.types = new Set();
  }
  async start() {
    const xsds = await glob('../specs/wsdl/**/*.xsd');
    console.log(xsds);
    // xsds = ['../specs/wsdl/ver10/schema/common.xsd', '../specs/wsdl/ver10/schema/onvif.xsd'];
    // console.log(xsds);
    this.nodes = builtInTypes;

    for (const xsd of xsds) {
      console.log(`processing ${xsd}`);
      const proc = new ProcessorXSD({
        filePath : xsd,
        nodes    : this.nodes,
        types    : this.types,
      });
      await proc.main();
    }

    // const wsdls = await glob('../specs/wsdl/**/*.wsdl');
    // console.log(wsdls);
    // console.log(wsdls[24]);
    const proc = new ProcessorWSDL({
      filePath : '../specs/wsdl/ver10/device/wsdl/devicemgmt.wsdl',
      nodes    : this.nodes,
      types    : this.types,
    });
    await proc.main();

    const nodeArr = ts.factory.createNodeArray(this.nodes);

    // printer for writing the AST to a file as code
    const printer = ts.createPrinter({ newLine : ts.NewLineKind.LineFeed });
    const result = printer.printList(
      ts.ListFormat.MultiLine,
      nodeArr,
      sourceFile,
    );

    // write the code to file
    writeFileSync('./onvif/interfaces/interface.ts', result, { encoding : 'utf-8' });
  }
}

(new InterfaceProcessor()).start().catch(console.error);
