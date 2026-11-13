// Module identities and frozen public surfaces, rather than syntax or binding-name guesses.
import fs from 'node:fs';
import path from 'node:path';
import { ResolverFactory } from 'oxc-resolver';
import type { Node, Program } from 'oxc-parser';
import { walk, literal } from '../scan/parse.ts';

export type PrefabBudget = { count: number; reason: string; exports?: string[] };
export type PrefabDebt = {
  version?: number;
  colliders: Record<string, PrefabBudget>;
  seats: Record<string, PrefabBudget>;
  doors?: Record<string, string[]>;
  legacy?: Record<string, number>;
  forwards?: Record<string, string[]>;
  doorCounts?: Record<string, Partial<Record<'colliders' | 'seats', number>>>;
};
export const CAPABILITIES = {
  colliders: [
    'src/physics/engine.ts',
    'src/physics/backend-rapier.ts',
    'src/physics/physics.ts',
    'src/place/land.ts',
    'src/entities/railway/works-box-view.ts',
    'src/entities/route-greybox/boxes.ts',
  ],
  seats: ['src/entities/railway/seat.ts'],
};
export const PREFAB_DOORS = {
  colliders: [
    'src/prefab/instantiate.ts',
    'src/physics/engine.ts',
    'src/physics/backend-rapier.ts',
    'src/physics/physics.ts',
    'src/place/land.ts',
  ],
  seats: ['src/prefab/instantiate.ts'],
};
export const isCapability = (kind: keyof typeof CAPABILITIES, target: string) =>
  CAPABILITIES[kind].includes(target) ||
  (kind === 'colliders' && /^node_modules\/@dimforge\/rapier3d(?:-simd)?\//.test(target));

// This mixed helper module also exports a pure descriptor function. Never grant its namespace/constructors.
export const SAFE_HELPER_EXPORTS: Record<string, readonly string[]> = {
  'src/entities/route-greybox/boxes.ts': ['span'],
};
export function pureHelperEdge(edge: ModuleEdge, target: string): boolean {
  const names = SAFE_HELPER_EXPORTS[target];
  const n = edge.node;
  return (
    !!names &&
    (n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration') &&
    n.specifiers.length > 0 &&
    n.specifiers.every((s) => {
      if (s.type === 'ImportSpecifier')
        return (
          s.importKind === 'type' ||
          names.includes(s.imported.type === 'Identifier' ? s.imported.name : s.imported.value)
        );
      if (s.type === 'ExportSpecifier')
        return s.exportKind === 'type' || names.includes(s.local.type === 'Identifier' ? s.local.name : s.local.value);
      return false;
    })
  );
}

export function createModuleResolver(root: string) {
  root = fs.realpathSync(root);
  const configFile = path.join(root, 'tsconfig.json');
  const resolver = new ResolverFactory({
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.json'],
    extensionAlias: { '.js': ['.ts', '.js'] },
    conditionNames: ['import', 'browser', 'default'],
    ...(fs.existsSync(configFile) ? { tsconfig: { configFile } } : {}),
  });
  const cache = new Map<string, string | null>();
  // A pathname is not file identity on macOS (or through a hard link). Canonicalize protected files by inode.
  const identities = new Map<string, string>();
  for (const file of [...new Set([...Object.values(CAPABILITIES).flat(), ...Object.values(PREFAB_DOORS).flat()])]) {
    const absolute = path.join(root, file);
    if (fs.existsSync(absolute)) {
      const st = fs.statSync(absolute);
      identities.set(`${st.dev}:${st.ino}`, file);
    }
  }
  return (file: string, specifier: string): string | null => {
    const key = file + '\0' + specifier;
    if (cache.has(key)) return cache.get(key)!;
    const bare = specifier.replace(/(?<=.)[?#].*$/, '');
    const request = bare.startsWith('/src/') ? path.join(root, bare.slice(1)) : bare;
    const result = resolver.sync(path.dirname(path.join(root, file)), request);
    let target: string | null = null;
    if (result.path) {
      const st = fs.statSync(result.path);
      target =
        identities.get(`${st.dev}:${st.ino}`) ??
        path.relative(root, fs.realpathSync(result.path)).split(path.sep).join('/');
    }
    cache.set(key, target);
    return target;
  };
}
export type ModuleResolver = ReturnType<typeof createModuleResolver>;

function unwrap(node: Node): Node {
  return 'expression' in node && node.expression ? unwrap(node.expression as Node) : node;
}
export type ModuleEdge = { node: Node; source?: string; erased: boolean; reexport: boolean };
/** Exactly the declarations Node/Vite strip erase; `import {type T}` still loads its module. */
export function moduleEdges(program: Program): ModuleEdge[] {
  const edges: ModuleEdge[] = [];
  walk(program, (node, parent) => {
    // Vite macros (including glob) and aliases of import.meta are opaque module loaders. Only data env/url
    // reads are safe without resolving an edge; this also covers future macro names and computed access.
    if (node.type === 'MetaProperty' && node.meta.name === 'import') {
      const key =
        parent?.type === 'MemberExpression' && parent.object === node
          ? parent.computed
            ? literal(parent.property)
            : parent.property.type === 'Identifier'
              ? parent.property.name
              : undefined
          : undefined;
      if (key !== 'url' && key !== 'env') edges.push({ node, source: undefined, erased: false, reexport: false });
    }
    if (node.type === 'ImportDeclaration')
      edges.push({ node, source: node.source.value, erased: node.importKind === 'type', reexport: false });
    else if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source)
      edges.push({ node, source: node.source.value, erased: node.exportKind === 'type', reexport: true });
    else if (node.type === 'ImportExpression' || node.type === 'TSImportType')
      edges.push({ node, source: literal(unwrap(node.source)), erased: node.type === 'TSImportType', reexport: false });
    else if (node.type === 'TSImportEqualsDeclaration' && node.moduleReference.type === 'TSExternalModuleReference')
      edges.push({
        node,
        source: literal(node.moduleReference.expression),
        erased: node.importKind === 'type',
        reexport: false,
      });
    else if (
      node.type === 'CallExpression' &&
      ((node.callee.type === 'Identifier' && node.callee.name === 'require') ||
        (node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'module'))
    )
      edges.push({
        node,
        source: node.arguments[0] ? literal(unwrap(node.arguments[0] as Node)) : undefined,
        erased: false,
        reexport: false,
      });
  });
  return edges;
}

/** Runtime names only. Unbounded star exports are never a declared public surface. */
export function runtimeExports(program: Program): string[] {
  const names = new Set<string>();
  const binding = (node: Node) => {
    if (node.type === 'Identifier') names.add(node.name);
    else if (node.type === 'ObjectPattern')
      for (const p of node.properties) binding(p.type === 'RestElement' ? p.argument : p.value);
    else if (node.type === 'ArrayPattern') {
      for (const e of node.elements) if (e) binding(e);
    } else if (node.type === 'AssignmentPattern') binding(node.left);
    else if (node.type === 'RestElement') binding(node.argument);
  };
  for (const node of program.body) {
    if (node.type === 'ExportAllDeclaration' && node.exportKind !== 'type') names.add('*');
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    if (node.type !== 'ExportNamedDeclaration' || node.exportKind === 'type') continue;
    for (const s of node.specifiers)
      if (s.exportKind !== 'type') names.add(s.exported.type === 'Identifier' ? s.exported.name : s.exported.value);
    const d = node.declaration;
    if (!d || ('declare' in d && d.declare)) continue;
    if (d.type === 'VariableDeclaration') for (const v of d.declarations) binding(v.id);
    else if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') {
      if (d.id) names.add(d.id.name);
    }
  }
  return [...names].sort();
}
