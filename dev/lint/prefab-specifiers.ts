// A set of imported capabilities and directly selected namespace members, never a reference/taint graph.
import { analyze } from '@typescript-eslint/scope-manager';
import type { Node, Program } from 'oxc-parser';
import { walk } from '../scan/parse.ts';
import { isCapability, moduleEdges, pureHelperEdge, type ModuleResolver } from './prefab-boundaries.ts';

export function capabilitySpecifiers(
  program: Program,
  file: string,
  resolve: ModuleResolver,
  kind: 'colliders' | 'seats',
): Node[] {
  const entries = new Map<string, Node>(),
    namespaces = new Map<number, string>();
  for (const edge of moduleEdges(program)) {
    if (edge.erased || !edge.source) continue;
    const target = resolve(file, edge.source);
    if (!target || !isCapability(kind, target) || pureHelperEdge(edge, target)) continue;
    const n = edge.node;
    if (n.type !== 'ImportDeclaration' && n.type !== 'ExportNamedDeclaration') continue;
    for (const spec of n.specifiers) {
      if (('importKind' in spec && spec.importKind === 'type') || ('exportKind' in spec && spec.exportKind === 'type'))
        continue;
      if (spec.type === 'ImportSpecifier')
        entries.set(
          `${target}:${spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value}:${spec.local.name}`,
          spec,
        );
      else if (spec.type === 'ExportSpecifier')
        entries.set(
          `${target}:${spec.local.type === 'Identifier' ? spec.local.name : spec.local.value}:${spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value}`,
          spec,
        );
      else if (spec.type === 'ImportNamespaceSpecifier' || spec.type === 'ImportDefaultSpecifier') {
        entries.set(`${target}:namespace:${spec.local.name}`, spec);
        namespaces.set(spec.local.start, `${target}:${spec.local.name}`);
      }
    }
  }
  if (!namespaces.size) return [...entries.values()];
  const scope = analyze(program as unknown as Parameters<typeof analyze>[0], { sourceType: 'module', lib: [] });
  const uses = new Map<number, string>();
  for (const s of scope.scopes)
    for (const ref of s.references)
      if (ref.isValueReference && ref.resolved)
        for (const def of ref.resolved.defs) {
          const name = namespaces.get((def.name as unknown as Node).start);
          if (name) uses.set((ref.identifier as unknown as Node).start, name);
        }
  walk(program, (n) => {
    if (n.type !== 'MemberExpression' || n.object.type !== 'Identifier') return;
    const name = uses.get(n.object.start);
    if (!name) return;
    const key = n.computed
      ? n.property.type === 'Literal'
        ? String(n.property.value)
        : undefined
      : n.property.type === 'Identifier'
        ? n.property.name
        : undefined;
    if (key !== undefined) entries.set(`${name}.${key}`, n);
  });
  return [...entries.values()];
}
