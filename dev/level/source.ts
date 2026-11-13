// Bounded audit adapters execute source-owned pure functions with explicit dependencies, without importing render setup.
// Only trusted checkout/Git source belongs here. This is not a sandbox for external code.
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { parseSync } from 'oxc-parser';

type Statement = {
  type: string;
  start: number;
  end: number;
  declaration?: Statement | null;
  id?: Statement | null;
  name?: string;
  declarations?: { id: Statement }[];
};

function statements(source: string): Statement[] {
  return parseSync('fixture.ts', source).program.body as unknown as Statement[];
}

function declaration(node: Statement): Statement {
  return node.declaration ?? node;
}

function namesOf(node: Statement, source: string): string[] {
  if (node.type === 'FunctionDeclaration') return node.id ? [source.slice(node.id.start, node.id.end)] : [];
  if (node.type === 'VariableDeclaration')
    // An identifier's range includes its type annotation, so read its name.
    return node.declarations!.map(({ id }) => id.name ?? source.slice(id.start, id.end));
  return [];
}

export function sourceModule<T>(source: string, bindings: Record<string, unknown>, names?: string[]): T {
  const nodes = statements(source);
  names ??= nodes.flatMap((node) =>
    node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration'
      ? namesOf(declaration(node), source)
      : [],
  );
  const retained = nodes
    .filter(
      (node) =>
        node.type !== 'ImportDeclaration' &&
        node.type !== 'ExportAllDeclaration' &&
        !(node.type === 'ExportNamedDeclaration' && !node.declaration),
    )
    .map((node) => source.slice(node.start, node.end).replace(/^export\s+(default\s+)?/, ''));
  const js = stripTypeScriptTypes(retained.join('\n'));
  return new Function(...Object.keys(bindings), `${js}\nreturn {${names.join(',')}};`)(...Object.values(bindings)) as T;
}

function sourceTextFunction<T>(source: string, symbol: string, bindings: Record<string, unknown>): T {
  const node = statements(source).find((n) => namesOf(declaration(n), source).includes(symbol));
  if (!node) throw new Error(`No top-level source symbol: ${symbol}`);
  return sourceModule<Record<string, T>>(source.slice(node.start, node.end), bindings, [symbol])[symbol]!;
}

export function sourceFunction<T>(file: string, symbol: string, bindings: Record<string, unknown>): T {
  return sourceTextFunction<T>(fs.readFileSync(file, 'utf8'), symbol, bindings);
}
