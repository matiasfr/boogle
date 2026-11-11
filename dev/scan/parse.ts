// Shared ESTree traversal and UTF-16 source lines for the static readers.
import { parseSync, visitorKeys, type Node } from 'oxc-parser';

export function walk(node: Node, fn: (node: Node, parent?: Node) => void, parent?: Node) {
  fn(node, parent);
  for (const key of visitorKeys[node.type] ?? []) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const n of child) if (n) walk(n as Node, fn, node);
    } else if (child) walk(child as Node, fn, node);
  }
}

export function lineOf(text: string): (node: { start: number }) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\r' && text[i + 1] === '\n') i++;
    if ('\r\n\u2028\u2029'.includes(text[i]!)) starts.push(i + 1);
  }
  return ({ start }) => {
    let lo = 0;
    let hi = starts.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1;
      if (starts[mid]! <= start) lo = mid;
      else hi = mid;
    }
    return lo + 1;
  };
}

// A string literal or a backtick string without `${}`; anything else is not a path a walk can follow.
export function literal(node: Node | null | undefined): string | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]!.value.cooked ?? undefined;
  return undefined;
}

/** True for `import.meta.url`. */
export function isMetaUrl(node: Node | null | undefined): boolean {
  return (
    node?.type === 'MemberExpression' &&
    node.object.type === 'MetaProperty' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'url'
  );
}

// Specifiers a module loads at runtime, from the parsed module (comments and strings can't fake or hide one).
// Whole `import type` / `export type` statements are erased by type stripping; `import { type A }` still loads.
// `new URL('…', import.meta.url)` counts: workers, forks and files read by URL.
export function runtimeSpecifiers(source: string): string[] {
  const out: string[] = [];
  walk(parseSync('module.ts', source, { lang: 'ts' }).program, (n) => {
    if (n.type === 'ImportDeclaration' && n.importKind !== 'type') out.push(n.source.value);
    else if ((n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration') && n.source) {
      if (n.exportKind !== 'type') out.push(n.source.value);
    } else if (n.type === 'ImportExpression') {
      const spec = literal(n.source);
      if (spec !== undefined) out.push(spec);
    } else if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && n.callee.name === 'URL') {
      const [first, base] = n.arguments;
      const spec = literal(first as Node | undefined);
      if (spec !== undefined && isMetaUrl(base as Node | undefined)) out.push(spec);
    }
  });
  return out;
}
