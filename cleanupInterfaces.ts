/**
 * Lists types/interfaces from ./src/interfaces/*.ts that are used by ./src/*.ts
 * Optionally removes unused declarations (with transitive deps kept).
 *
 * Usage:
 *   npx tsx cleanupInterfaces.ts           # report only
 *   npx tsx cleanupInterfaces.ts --apply   # remove unused types/interfaces
 */
import * as fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line n/no-unpublished-import
import * as ts from 'typescript';

type SymbolKind = 'interface' | 'type' | 'enum' | 'class' | 'other';

type ExportedSymbol = {
  name: string;
  kind: SymbolKind;
  file: string;
};

type UsedSymbol = ExportedSymbol & {
  usedIn: string[];
};

type DeclInfo = {
  key: string;
  name: string;
  kind: SymbolKind;
  file: string;
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.ClassDeclaration;
};

type Args = {
  apply: boolean;
};

function parseArgs(argv: string[]): Args {
  return { apply: argv.includes('--apply') };
}

function projectRoot(): string {
  return path.resolve(__dirname);
}

function listTopLevelTs(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => path.join(dir, e.name))
    .sort();
}

function createSourceFile(filePath: string, text?: string): ts.SourceFile {
  const content = text ?? fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function hasExportModifier(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

function kindOf(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.ClassDeclaration,
): SymbolKind {
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  return 'class';
}

function symbolKey(file: string, name: string): string {
  return `${path.normalize(file)}::${name}`;
}

function resolveRelativeTs(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(c)) return path.normalize(c);
  }
  return null;
}

function isInterfacesImport(spec: string): boolean {
  return /(^|\/)interfaces(\/|$)/.test(spec.replace(/\\/g, '/'));
}

function resolveInterfacesModule(fromFile: string, spec: string, interfacesDir: string): string | null {
  if (!isInterfacesImport(spec)) return null;
  const resolved = resolveRelativeTs(fromFile, spec);
  if (!resolved) return null;
  const normDir = path.normalize(interfacesDir) + path.sep;
  if (!resolved.startsWith(normDir)) return null;
  return resolved;
}

function collectExportedSymbols(filePath: string): ExportedSymbol[] {
  const sf = createSourceFile(filePath);
  const result: ExportedSymbol[] = [];

  for (const stmt of sf.statements) {
    if (
      (ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt) ||
        ts.isClassDeclaration(stmt)) &&
      hasExportModifier(stmt) &&
      stmt.name
    ) {
      result.push({ name: stmt.name.text, kind: kindOf(stmt), file: filePath });
    }
  }

  return result;
}

/** Named imports: localName -> { originalName, moduleFile } */
function collectNamedImports(
  sf: ts.SourceFile,
  resolveModule: (spec: string) => string | null,
): Map<string, { originalName: string; moduleFile: string }> {
  const map = new Map<string, { originalName: string; moduleFile: string }>();

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const moduleFile = resolveModule(stmt.moduleSpecifier.text);
    if (!moduleFile) continue;
    if (!stmt.importClause?.namedBindings || !ts.isNamedImports(stmt.importClause.namedBindings)) continue;

    for (const el of stmt.importClause.namedBindings.elements) {
      map.set(el.name.text, {
        originalName: (el.propertyName ?? el.name).text,
        moduleFile,
      });
    }
  }

  return map;
}

function entityNameRoot(name: ts.EntityName): string {
  let n: ts.EntityName = name;
  while (ts.isQualifiedName(n)) n = n.left;
  return n.text;
}

/** Type-position identifiers referenced by a declaration. */
function collectTypeReferenceNames(node: ts.Node): Set<string> {
  const refs = new Set<string>();

  const visit = (n: ts.Node) => {
    if (ts.isTypeReferenceNode(n)) {
      refs.add(entityNameRoot(n.typeName));
    } else if (ts.isExpressionWithTypeArguments(n) && ts.isIdentifier(n.expression)) {
      refs.add(n.expression.text);
    } else if (ts.isTypeQueryNode(n)) {
      refs.add(entityNameRoot(n.exprName));
    } else if (ts.isImportTypeNode(n) && n.qualifier) {
      refs.add(entityNameRoot(n.qualifier));
    }
    ts.forEachChild(n, visit);
  };

  visit(node);
  return refs;
}

function collectDeclarations(sf: ts.SourceFile): DeclInfo[] {
  const result: DeclInfo[] = [];
  for (const stmt of sf.statements) {
    if (
      (ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt) ||
        ts.isClassDeclaration(stmt)) &&
      stmt.name
    ) {
      result.push({
        key: symbolKey(sf.fileName, stmt.name.text),
        name: stmt.name.text,
        kind: kindOf(stmt),
        file: path.normalize(sf.fileName),
        node: stmt,
      });
    }
  }
  return result;
}

function buildDependencyGraph(
  interfaceFiles: string[],
): { decls: Map<string, DeclInfo>; deps: Map<string, Set<string>> } {
  const decls = new Map<string, DeclInfo>();
  const deps = new Map<string, Set<string>>();

  for (const file of interfaceFiles) {
    const sf = createSourceFile(file);
    const fileDecls = collectDeclarations(sf);
    const localByName = new Map(fileDecls.map((d) => [d.name, d.key]));
    const imports = collectNamedImports(sf, (spec) => resolveRelativeTs(file, spec));

    for (const d of fileDecls) {
      decls.set(d.key, d);
      const depKeys = new Set<string>();
      for (const ref of collectTypeReferenceNames(d.node)) {
        const localKey = localByName.get(ref);
        if (localKey) {
          depKeys.add(localKey);
          continue;
        }
        const imp = imports.get(ref);
        if (imp) depKeys.add(symbolKey(imp.moduleFile, imp.originalName));
      }
      deps.set(d.key, depKeys);
    }
  }

  return { decls, deps };
}

function transitiveKeep(seeds: Iterable<string>, deps: Map<string, Set<string>>): Set<string> {
  const keep = new Set<string>();
  const queue = [...seeds];
  while (queue.length) {
    const key = queue.pop()!;
    if (keep.has(key)) continue;
    keep.add(key);
    for (const dep of deps.get(key) ?? []) {
      if (!keep.has(dep)) queue.push(dep);
    }
  }
  return keep;
}

function applyTextRemovals(text: string, ranges: Array<{ start: number; end: number }>): string {
  const sorted = [...ranges].sort((a, b) => b.start - a.start);
  let out = text;
  for (const r of sorted) {
    out = out.slice(0, r.start) + out.slice(r.end);
  }
  return out;
}

function removeDeclarations(text: string, filePath: string, removeNames: Set<string>): string {
  const sf = createSourceFile(filePath, text);
  const ranges: Array<{ start: number; end: number }> = [];

  for (const stmt of sf.statements) {
    if (
      (ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt) ||
        ts.isClassDeclaration(stmt)) &&
      stmt.name &&
      removeNames.has(stmt.name.text)
    ) {
      ranges.push({ start: stmt.getFullStart(), end: stmt.end });
    }
  }

  return applyTextRemovals(text, ranges);
}

function referencedIdentifiersOutsideImports(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
}

function formatImportSpecifier(el: ts.ImportSpecifier): string {
  if (el.propertyName) return `${el.propertyName.text} as ${el.name.text}`;
  return el.name.text;
}

function cleanUnusedImports(text: string, filePath: string): string {
  const sf = createSourceFile(filePath, text);
  const referenced = referencedIdentifiersOutsideImports(sf);
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!stmt.importClause?.namedBindings || !ts.isNamedImports(stmt.importClause.namedBindings)) continue;
    if (!stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;

    const elements = stmt.importClause.namedBindings.elements;
    const kept = elements.filter((el) => referenced.has(el.name.text));
    const start = stmt.getFullStart();
    const end = stmt.end;

    if (kept.length === 0) {
      replacements.push({ start, end, text: '' });
      continue;
    }

    if (kept.length === elements.length) continue;

    const typeOnly = stmt.importClause.isTypeOnly ? 'type ' : '';
    const spec = stmt.moduleSpecifier.text;
    let newImport: string;
    if (kept.length === 1) {
      newImport = `import ${typeOnly}{ ${formatImportSpecifier(kept[0])} } from '${spec}';`;
    } else {
      const body = kept.map((el) => `  ${formatImportSpecifier(el)},`).join('\n');
      newImport = `import ${typeOnly}{\n${body}\n} from '${spec}';`;
    }

    // Preserve a single leading newline if the original had leading trivia with newline
    const leading = text.slice(start, stmt.getStart(sf));
    const prefix = leading.includes('\n') ? '\n' : leading;
    replacements.push({ start, end, text: prefix + newImport });
  }

  replacements.sort((a, b) => b.start - a.start);
  let out = text;
  for (const r of replacements) {
    out = out.slice(0, r.start) + r.text + out.slice(r.end);
  }
  return out;
}

function hasRemainingDeclarations(text: string, filePath: string): boolean {
  const sf = createSourceFile(filePath, text);
  return sf.statements.some(
    (stmt) =>
      (ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt) ||
        ts.isClassDeclaration(stmt)) &&
      !!stmt.name,
  );
}

function normalizeFileText(text: string): string {
  // Collapse 3+ blank lines → 2; trim end; ensure trailing newline
  let out = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '');
  out = out.replace(/^\n+/, '');
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = projectRoot();
  const srcDir = path.join(root, 'src');
  const interfacesDir = path.join(srcDir, 'interfaces');

  if (!fs.existsSync(srcDir)) throw new Error(`Missing ${srcDir}`);
  if (!fs.existsSync(interfacesDir)) throw new Error(`Missing ${interfacesDir}`);

  const interfaceFiles = listTopLevelTs(interfacesDir);
  const srcFiles = listTopLevelTs(srcDir);

  const exportsByKey = new Map<string, ExportedSymbol>();
  for (const file of interfaceFiles) {
    for (const sym of collectExportedSymbols(file)) {
      exportsByKey.set(symbolKey(sym.file, sym.name), sym);
    }
  }

  const used = new Map<string, UsedSymbol>();

  for (const srcFile of srcFiles) {
    let sf: ts.SourceFile;
    try {
      sf = createSourceFile(srcFile);
    } catch (e) {
      console.warn(`WARN: failed to parse ${srcFile}: ${(e as Error).message}`);
      continue;
    }

    // Any symbol imported by src/*.ts is treated as used — even if the import is
    // currently unused in the body (dead import) or only appears as an object key.
    // Removing those from interfaces would break compilation while imports remain.
    const imports = collectNamedImports(sf, (spec) => resolveInterfacesModule(srcFile, spec, interfacesDir));

    for (const info of imports.values()) {
      const key = symbolKey(info.moduleFile, info.originalName);
      const exported = exportsByKey.get(key);
      const relSrc = path.relative(root, srcFile);

      if (used.has(key)) {
        const entry = used.get(key)!;
        if (!entry.usedIn.includes(relSrc)) entry.usedIn.push(relSrc);
      } else {
        used.set(key, {
          name: info.originalName,
          kind: exported?.kind ?? 'other',
          file: info.moduleFile,
          usedIn: [relSrc],
        });
      }
    }
  }

  const usedList = [...used.values()].sort((a, b) => {
    const fa = path.relative(root, a.file);
    const fb = path.relative(root, b.file);
    return fa.localeCompare(fb) || a.name.localeCompare(b.name);
  });

  console.log(`Imported by src/*.ts: ${usedList.length}`);

  const { decls, deps } = buildDependencyGraph(interfaceFiles);
  const keep = transitiveKeep(used.keys(), deps);

  const unused = [...decls.values()]
    .filter((d) => !keep.has(d.key))
    .sort((a, b) => {
      const fa = path.relative(root, a.file);
      const fb = path.relative(root, b.file);
      return fa.localeCompare(fb) || a.name.localeCompare(b.name);
    });

  const keptOnlyAsDeps = keep.size - used.size;

  console.log(`Kept (incl. transitive deps): ${keep.size} (+${Math.max(0, keptOnlyAsDeps)} deps)`);
  console.log(`Unused declarations: ${unused.length}`);

  if (!args.apply) {
    let currentFile = '';
    for (const sym of unused) {
      const relFile = path.relative(root, sym.file);
      if (relFile !== currentFile) {
        currentFile = relFile;
        console.log(`\n${relFile}`);
      }
      console.log(`  ${sym.kind.padEnd(9)} ${sym.name}`);
    }
    console.log(`\nDry run only. Re-run with --apply to remove these ${unused.length} declarations.`);
    return;
  }

  // Group removals by file
  const removeByFile = new Map<string, Set<string>>();
  for (const d of unused) {
    let set = removeByFile.get(d.file);
    if (!set) {
      set = new Set();
      removeByFile.set(d.file, set);
    }
    set.add(d.name);
  }

  let removedDecls = 0;
  let deletedFiles = 0;
  let rewrittenFiles = 0;

  for (const file of interfaceFiles) {
    const removeNames = removeByFile.get(path.normalize(file));
    if (!removeNames || removeNames.size === 0) {
      // Still clean unused imports that may reference nothing after other files change? 
      // Imports within this file only reference other modules' symbols — if this file's
      // kept decls still need them, keep. If some imports became unused because we removed
      // decls in THIS file, handle below only when removeNames is non-empty.
      continue;
    }

    let text = fs.readFileSync(file, 'utf8');
    text = removeDeclarations(text, file, removeNames);
    text = cleanUnusedImports(text, file);
    text = normalizeFileText(text);
    removedDecls += removeNames.size;

    if (!hasRemainingDeclarations(text, file)) {
      fs.unlinkSync(file);
      deletedFiles++;
      console.log(`Deleted empty file: ${path.relative(root, file)}`);
    } else {
      fs.writeFileSync(file, text, 'utf8');
      rewrittenFiles++;
      console.log(
        `Updated ${path.relative(root, file)} (−${removeNames.size} declarations)`,
      );
    }
  }

  // Second pass: files that only had import cleanups needed because they keep decls
  // but imported symbols from deleted/cleared modules — already handled per-file above.
  // Files with zero removals may still import types only used by removed decls in the
  // same file — those are covered when removeNames was non-empty.
  //
  // Files with no local removals might import from a now-deleted file — those imports
  // would already be unused only if local decls referencing them were removed; if local
  // decls remain and referenced deleted file symbols, that would be a graph bug.
  // Re-clean imports on all remaining interface files for safety.
  const remainingFiles = listTopLevelTs(interfacesDir);
  for (const file of remainingFiles) {
    if (removeByFile.has(path.normalize(file))) continue; // already cleaned
    const before = fs.readFileSync(file, 'utf8');
    const after = normalizeFileText(cleanUnusedImports(before, file));
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      rewrittenFiles++;
      console.log(`Cleaned imports: ${path.relative(root, file)}`);
    }
  }

  console.log(
    `\nDone. Removed ${removedDecls} declarations across ${rewrittenFiles} files; deleted ${deletedFiles} empty files.`,
  );
}

main();
