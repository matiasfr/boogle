// Step 9's two additional construction APIs. Keep query helpers in their modules freely importable.
import { walk, literal } from '../scan/parse.ts';
import type { Program, Node } from 'oxc-parser';
import type { ModuleResolver } from './prefab-boundaries.ts';
import { moduleEdges } from './prefab-boundaries.ts';
export const registrationKinds = {
  signs: {
    api: 'signBoard',
    module: 'src/render/sign-board.ts',
    rule: 'boogle/signs-from-records',
    doors: ['src/prefab/builders/greybox-label.ts', 'src/render/sign-board.ts'],
  },
  interactions: {
    api: 'registerInteractable',
    module: 'src/player/hands.ts',
    rule: 'boogle/interactions-from-records',
    doors: ['src/prefab/instantiate.ts', 'src/player/hands.ts'],
  },
} as const;
export function registrationSites(
  program: Program,
  file: string,
  resolve: ModuleResolver,
  kind: keyof typeof registrationKinds,
): Node[] {
  const { api, module } = registrationKinds[kind];
  const sites: Node[] = [],
    aliases = new Set<string>([api]);
  for (const edge of moduleEdges(program)) {
    if (edge.erased || !edge.source || resolve(file, edge.source) !== module) continue;
    const n = edge.node;
    if (n.type === 'ImportDeclaration') {
      for (const s of n.specifiers) {
        if (s.type !== 'ImportSpecifier') {
          sites.push(s);
          continue;
        }
        if (s.importKind === 'type') continue;
        const name = s.imported.type === 'Identifier' ? s.imported.name : s.imported.value;
        if (name === api) {
          aliases.add(s.local.name);
          sites.push(s);
        }
      }
    } else if (n.type === 'ExportNamedDeclaration') {
      for (const s of n.specifiers)
        if (
          s.type === 'ExportSpecifier' &&
          s.exportKind !== 'type' &&
          (s.local.type === 'Identifier' ? s.local.name : s.local.value) === api
        )
          sites.push(s);
    } else sites.push(n);
  }
  walk(program, (n) => {
    if (n.type !== 'CallExpression') return;
    const c = n.callee;
    const name =
      c.type === 'Identifier'
        ? c.name
        : c.type === 'MemberExpression'
          ? c.computed
            ? literal(c.property)
            : c.property.type === 'Identifier'
              ? c.property.name
              : undefined
          : undefined;
    if (typeof name === 'string' && aliases.has(name)) sites.push(n);
  });
  return sites;
}
