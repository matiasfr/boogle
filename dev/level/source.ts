// Bounded audit adapters execute source-owned pure functions with explicit dependencies, without importing render setup.
// Only trusted checkout/Git source belongs here. This is not a sandbox for external code.
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import ts from 'typescript';

export function sourceModule<T>(source: string, bindings: Record<string, unknown>, names?: string[]): T {
  const ast = ts.createSourceFile('fixture.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  names ??= ast.statements.flatMap((node) => {
    if (!ts.canHaveModifiers(node) || !ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      return [];
    if (ts.isFunctionDeclaration(node)) return node.name ? [node.name.text] : [];
    if (ts.isVariableStatement(node)) return node.declarationList.declarations.map((d) => d.name.getText(ast));
    return [];
  });
  const statements = ast.statements
    .filter((node) => !ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
    .map((node) => node.getText(ast).replace(/^export\s+(default\s+)?/, ''));
  const js = stripTypeScriptTypes(statements.join('\n'));
  return new Function(...Object.keys(bindings), `${js}\nreturn {${names.join(',')}};`)(...Object.values(bindings)) as T;
}

export function sourceTextFunction<T>(source: string, symbol: string, bindings: Record<string, unknown>): T {
  const ast = ts.createSourceFile('fixture.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const node = ast.statements.find(
    (n) =>
      (ts.isFunctionDeclaration(n) && n.name?.text === symbol) ||
      (ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => d.name.getText(ast) === symbol)),
  );
  if (!node) throw new Error(`No top-level source symbol: ${symbol}`);
  return sourceModule<Record<string, T>>(node.getText(ast), bindings, [symbol])[symbol]!;
}

export function sourceFunction<T>(file: string, symbol: string, bindings: Record<string, unknown>): T {
  return sourceTextFunction<T>(fs.readFileSync(file, 'utf8'), symbol, bindings);
}
