// Conservative, binding-based may-reach graph. No hand-maintained list of construction export names.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseSync, type Node, type Program } from 'oxc-parser';
import { analyze } from '@typescript-eslint/scope-manager';
import { walk, literal } from '../scan/parse.ts';
import { createModuleResolver, moduleEdges, isCapability, PREFAB_DOORS } from './prefab-boundaries.ts';
import type { ModuleEdge, ModuleResolver, PrefabDebt } from './prefab-boundaries.ts';

export type ConstructionKind = 'colliders' | 'seats';
export type ConstructionRecord = { kinds: ConstructionKind[]; importers: string[] };
export type LegacyGraph = {
  files: string[];
  constructors: Record<string, ConstructionRecord>;
  surfaces: Record<string, string[]>;
  modules: Record<string, string[]>;
};
type Facts = {
  file: string;
  program: Program;
  edges: ModuleEdge[];
  scope: ReturnType<typeof analyze>;
  parent: Map<Node, Node>;
  refs: Map<number, string>;
  names: Map<string, string>;
  exports: Map<string, string>;
  stars: string[];
};
type Binding = { file: string; nodes: Node[]; fn?: Node; params: string[][] };
const kinds = ['colliders', 'seats'] as const;
const exportId = (file: string, name: string) => `E:${file}#${name}`;
const namespaceId = (file: string) => `N:${file}`;
const member = (n: Node): string | undefined =>
  n.type === 'MemberExpression'
    ? n.computed
      ? literal(n.property)
      : n.property.type === 'Identifier'
        ? n.property.name
        : undefined
    : undefined;
const functionNode = (n: Node): boolean =>
  [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ClassDeclaration',
    'ClassExpression',
  ].includes(n.type);

/** A graph over lexical bindings and explicit export nodes; aliases and barrels preserve identity. */
export function computeLegacyGraph(
  sources: Record<string, string>,
  debt: PrefabDebt,
  resolve: ModuleResolver,
): LegacyGraph {
  const deps = new Map<string, Set<string>>();
  const aliases = new Map<string, Set<string>>();
  const bindings = new Map<string, Binding>();
  const parameters = new Set<string>();
  const modules = new Map<string, Facts>();
  const seeds = new Map<string, Set<ConstructionKind>>();
  const add = (graph: Map<string, Set<string>>, from: string, to: string) => {
    let set = graph.get(from);
    if (!set) graph.set(from, (set = new Set()));
    const grew = !set.has(to);
    set.add(to);
    return grew;
  };
  const link = (from: string, to: string, alias = false) => {
    const grew = add(deps, from, to);
    return (alias ? add(aliases, from, to) : false) || grew;
  };
  const seed = (id: string, kind: ConstructionKind) => {
    let set = seeds.get(id);
    if (!set) seeds.set(id, (set = new Set()));
    set.add(kind);
  };
  const namespace = new Map<string, Set<string>>();
  for (const [file, text] of Object.entries(sources)) {
    const parsed = parseSync(file, text, { astType: 'ts', range: true, preserveParens: false });
    if (parsed.errors.length) throw new Error(`prefab edges cannot parse ${file}: ${parsed.errors[0]!.message}`);
    const program = parsed.program;
    const scope = analyze(program as unknown as Parameters<typeof analyze>[0], { sourceType: 'module', lib: [] });
    const f: Facts = {
      file,
      program,
      scope,
      edges: moduleEdges(program),
      parent: new Map(),
      refs: new Map(),
      names: new Map(),
      exports: new Map(),
      stars: [],
    };
    modules.set(file, f);
    walk(program, (n, p) => {
      if (p) f.parent.set(n, p);
    });
    const ids = new Map<object, string>();
    for (const s of scope.scopes)
      for (const variable of s.variables) {
        const defs = variable.defs.filter((d) => d.isVariableDefinition);
        if (!defs.length) continue;
        const first = defs[0]!.name as unknown as Node;
        const id = `B:${file}:${first.start}:${variable.name}`;
        ids.set(variable, id);
        const nodes: Node[] = [];
        let fn: Node | undefined;
        for (const def of defs) {
          const n = def.node as unknown as Node;
          if (
            n.type === 'ImportSpecifier' ||
            n.type === 'ImportNamespaceSpecifier' ||
            n.type === 'ImportDefaultSpecifier' ||
            n.type === 'TSImportEqualsDeclaration'
          )
            continue;
          const impl =
            def.type === 'Parameter' ? (def.name as unknown as Node) : n.type === 'VariableDeclarator' ? n.init : n;
          if (impl) {
            nodes.push(impl as Node);
            if (functionNode(impl as Node)) fn = impl as Node;
          }
        }
        bindings.set(id, { file, nodes, ...(fn ? { fn } : {}), params: [] });
        if (defs.some((d) => d.type === 'Parameter')) parameters.add(id);
        if (s.type === 'module') f.names.set(variable.name, id);
      }
    for (const s of scope.scopes)
      for (const ref of s.references)
        if (ref.isValueReference && ref.resolved && ids.has(ref.resolved))
          f.refs.set((ref.identifier as unknown as Node).start, ids.get(ref.resolved)!);
    for (const s of scope.scopes)
      for (const variable of s.variables) {
        const id = ids.get(variable);
        if (!id) continue;
        for (const def of variable.defs) {
          const n = def.node as unknown as Node;
          const p = def.parent as unknown as Node | undefined;
          if (def.type !== 'ImportBinding') continue;
          if (p?.type === 'ImportDeclaration') {
            if (p.importKind === 'type' || ('importKind' in n && n.importKind === 'type')) continue;
            const target = resolve(file, p.source.value);
            if (!target) continue;
            if (n.type === 'ImportNamespaceSpecifier') {
              link(id, namespaceId(target), true);
              namespace.set(id, new Set([target]));
            } else if (n.type === 'ImportDefaultSpecifier') link(id, exportId(target, 'default'), true);
            else if (n.type === 'ImportSpecifier')
              link(id, exportId(target, n.imported.type === 'Identifier' ? n.imported.name : n.imported.value), true);
          } else if (
            n.type === 'TSImportEqualsDeclaration' &&
            n.importKind !== 'type' &&
            n.moduleReference.type === 'TSExternalModuleReference'
          ) {
            const target = resolve(file, n.moduleReference.expression.value);
            if (target) {
              link(id, namespaceId(target), true);
              namespace.set(id, new Set([target]));
            }
          }
        }
      }
  }
  // Public binding identities (including defaults and re-export aliases) before resolving star chains.
  for (const f of modules.values())
    for (const n of f.program.body) {
      if (n.type === 'ExportAllDeclaration' && n.exportKind !== 'type' && n.source) {
        const target = resolve(f.file, n.source.value);
        if (target) f.stars.push(target);
        continue;
      }
      if (n.type === 'ExportDefaultDeclaration') {
        const id = exportId(f.file, 'default');
        f.exports.set('default', id);
        if (n.declaration.type === 'Identifier') {
          const b = f.names.get(n.declaration.name);
          if (b) link(id, b, true);
        } else
          bindings.set(id, {
            file: f.file,
            nodes: [n.declaration as Node],
            ...(functionNode(n.declaration as Node) ? { fn: n.declaration as Node } : {}),
            params: [],
          });
      }
      if (n.type !== 'ExportNamedDeclaration' || n.exportKind === 'type') continue;
      for (const spec of n.specifiers) {
        if (spec.exportKind === 'type') continue;
        const name = spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value;
        const id = exportId(f.file, name);
        f.exports.set(name, id);
        if (n.source) {
          const target = resolve(f.file, n.source.value);
          if (target)
            link(id, exportId(target, spec.local.type === 'Identifier' ? spec.local.name : spec.local.value), true);
        } else {
          const b = f.names.get(spec.local.type === 'Identifier' ? spec.local.name : spec.local.value);
          if (b) link(id, b, true);
        }
      }
      if (n.declaration) {
        const d = n.declaration;
        const names: string[] = [];
        const collect = (p: Node) => {
          if (p.type === 'Identifier') names.push(p.name);
          else if (p.type === 'ObjectPattern')
            for (const e of p.properties) collect(e.type === 'RestElement' ? e.argument : e.value);
          else if (p.type === 'ArrayPattern') {
            for (const e of p.elements) if (e) collect(e);
          } else if (p.type === 'AssignmentPattern') collect(p.left);
          else if (p.type === 'RestElement') collect(p.argument);
        };
        if (d.type === 'VariableDeclaration') for (const v of d.declarations) collect(v.id);
        else if ((d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id) names.push(d.id.name);
        for (const name of names) {
          const b = f.names.get(name);
          if (b) {
            const id = exportId(f.file, name);
            f.exports.set(name, id);
            link(id, b, true);
          }
        }
      }
    }
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of modules.values())
      for (const target of f.stars)
        for (const [name] of modules.get(target)?.exports ?? []) {
          if (name === 'default' || f.exports.has(name)) continue;
          const id = exportId(f.file, name);
          f.exports.set(name, id);
          link(id, exportId(target, name), true);
          changed = true;
        }
  }
  for (const f of modules.values()) for (const id of f.exports.values()) link(namespaceId(f.file), id, true);
  const owners = new Map<Node, string[]>();
  for (const [id, b] of bindings)
    for (const n of b.nodes) {
      const list = owners.get(n) ?? [];
      list.push(id);
      owners.set(n, list);
    }
  // Dynamic module values and destructuring: conservatively retain all modules in an initializer.
  for (const [id, b] of bindings) {
    const f = modules.get(b.file)!;
    for (const n of b.nodes)
      if (!functionNode(n))
        for (const edge of f.edges) {
          if (edge.erased || !edge.source || edge.node.start < n.start || edge.node.end > n.end) continue;
          const target = resolve(b.file, edge.source);
          if (!target) continue;
          link(id, namespaceId(target), true);
          const set = namespace.get(id) ?? new Set<string>();
          set.add(target);
          namespace.set(id, set);
        }
  }
  const refTargets = (f: Facts, node: Node): Set<string> => {
    const out = new Set<string>();
    walk(node, (n, p) => {
      if (n.type !== 'Identifier') return;
      const id = f.refs.get(n.start);
      if (!id) return;
      const spaces = namespace.get(id);
      if (spaces && p?.type === 'MemberExpression' && p.object === n && member(p) !== undefined)
        for (const target of spaces) out.add(exportId(target, member(p)!));
      else out.add(id);
    });
    return out;
  };
  for (const f of modules.values()) {
    walk(f.program, (n) => {
      if (n.type !== 'Identifier' || !f.refs.has(n.start)) return;
      let current: Node | undefined = n;
      const targets = refTargets(f, n);
      // For member selection, refTargets needs the member parent as well.
      const p = f.parent.get(n);
      if (p?.type === 'MemberExpression' && p.object === n) {
        targets.clear();
        for (const t of refTargets(f, p)) targets.add(t);
      }
      while (current) {
        for (const owner of owners.get(current) ?? []) for (const target of targets) link(owner, target);
        current = f.parent.get(current);
      }
    });
  }
  // Value aliases for call targets do not follow a function's body. This prevents argument flow through unrelated callees.
  for (const [id, b] of bindings)
    if (!b.fn)
      for (const n of b.nodes) for (const target of refTargets(modules.get(b.file)!, n)) add(aliases, id, target);
  // Calls through opaque callback/dependency parameters may reach construction. Fail closed rather than
  // pretending an unresolvable callback is pure; aliases of those parameters retain the same provenance.
  for (const f of modules.values())
    walk(f.program, (n) => {
      if (n.type === 'AssignmentExpression') {
        let left: Node = n.left;
        while (left.type === 'MemberExpression') left = left.object;
        if (left.type === 'Identifier') {
          const id = f.refs.get(left.start);
          if (id) for (const target of refTargets(f, n.right)) link(id, target);
        }
      }
      if (n.type !== 'CallExpression' && n.type !== 'NewExpression') return;
      const todo = [...refTargets(f, n.callee)];
      const seen = new Set<string>();
      while (todo.length) {
        const id = todo.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        if (parameters.has(id)) for (const kind of kinds) seed(id, kind);
        if (bindings.get(id)?.fn) continue;
        for (const dep of aliases.get(id) ?? []) todo.push(dep);
      }
    });
  // Map actual arguments to lexical parameters (including destructured dependency bags).
  for (const [id, b] of bindings)
    if (b.fn && 'params' in b.fn) {
      const f = modules.get(b.file)!;
      b.params = b.fn.params.map(() => []);
      // Parameters' definitions are the pattern itself; identify their exact scopes, not matching names globally.
      for (const s of f.scope.scopes)
        for (const variable of s.variables)
          for (const def of variable.defs)
            if (def.type === 'Parameter' && (def.node as unknown as Node) === b.fn) {
              const v = `B:${f.file}:${(variable.defs[0]!.name as unknown as Node).start}:${variable.name}`;
              const name = def.name as unknown as Node;
              const index = b.fn.params.findIndex((p) => p.start <= name.start && p.end >= name.end);
              if (index >= 0) b.params[index]!.push(v);
            }
      void id;
    }
  const calls: { targets: Set<string>; args: Set<string>[] }[] = [];
  const invokedParameters = new Set<string>();
  for (const f of modules.values())
    walk(f.program, (n) => {
      if (n.type === 'CallExpression' || n.type === 'NewExpression') {
        calls.push({ targets: refTargets(f, n.callee), args: n.arguments.map((a) => refTargets(f, a as Node)) });
        if (n.callee.type === 'Identifier') {
          const id = f.refs.get(n.callee.start);
          if (id) invokedParameters.add(id);
        }
      }
    });
  // Namespace dependency bags are capability values explicitly advertised by typeof-import types. Read their
  // type aliases mechanically, rather than merging every arbitrary object passed to an unrelated parameter.
  const typeModules = new Map<string, Set<string>>();
  const typeDeps = new Map<string, Set<string>>();
  for (const f of modules.values())
    for (const n of f.program.body) {
      const d = n.type === 'ExportNamedDeclaration' ? n.declaration : n;
      if (d?.type !== 'TSTypeAliasDeclaration' && d?.type !== 'TSInterfaceDeclaration') continue;
      const id = `${f.file}#${d.id.name}`;
      const found = new Set<string>();
      const refs = new Set<string>();
      walk(d, (t) => {
        if (t.type === 'TSTypeQuery' && t.exprName.type === 'TSImportType') {
          const spec = literal(t.exprName.source);
          const target = spec ? resolve(f.file, spec) : null;
          if (target) found.add(target);
        }
        if (t.type === 'TSTypeReference' && t.typeName.type === 'Identifier') refs.add(`${f.file}#${t.typeName.name}`);
      });
      typeModules.set(id, found);
      typeDeps.set(id, refs);
    }
  changed = true;
  while (changed) {
    changed = false;
    for (const [id, refs] of typeDeps) {
      const set = typeModules.get(id)!;
      for (const ref of refs)
        for (const module of typeModules.get(ref) ?? [])
          if (!set.has(module)) {
            set.add(module);
            changed = true;
          }
    }
  }
  for (const f of modules.values())
    for (const s of f.scope.scopes)
      for (const variable of s.variables)
        for (const def of variable.defs)
          if (def.type === 'Parameter') {
            const name = def.name as unknown as Node;
            const id = `B:${f.file}:${(variable.defs[0]!.name as unknown as Node).start}:${variable.name}`;
            const fn = def.node as unknown as Node;
            if (!('params' in fn)) continue;
            const param = fn.params.find((p) => p.start <= name.start && p.end >= name.end);
            if (!param) continue;
            walk(param, (t) => {
              if (t.type === 'TSTypeReference' && t.typeName.type === 'Identifier')
                for (const target of typeModules.get(`${f.file}#${t.typeName.name}`) ?? [])
                  link(id, namespaceId(target));
              if (t.type === 'TSTypeQuery' && t.exprName.type === 'TSImportType') {
                const spec = literal(t.exprName.source);
                const target = spec ? resolve(f.file, spec) : null;
                if (target) link(id, namespaceId(target));
              }
            });
          }
  {
    const targetCache = new Map<string, Set<string>>();
    const targetsOf = (starts: Set<string>) => {
      const found = new Set<string>();
      for (const start of starts) {
        let cached = targetCache.get(start);
        if (!cached) {
          cached = new Set();
          const seen = new Set<string>();
          const todo = [start];
          while (todo.length) {
            const id = todo.pop()!;
            if (seen.has(id)) continue;
            seen.add(id);
            if (bindings.get(id)?.fn) {
              cached.add(id);
              continue;
            }
            for (const d of aliases.get(id) ?? []) todo.push(d);
          }
          targetCache.set(start, cached);
        }
        for (const id of cached) found.add(id);
      }
      return found;
    };
    for (const call of calls) {
      const targets = targetsOf(call.targets);
      for (const target of targets) {
        const b = bindings.get(target);
        if (!b?.fn) continue;
        for (const [i, args] of call.args.entries())
          for (const p of b.params[i] ?? []) if (invokedParameters.has(p)) for (const actual of args) link(p, actual);
      }
    }
  }
  // Calls into a capability module are terminal roots. Function-valued aliases and closures inherit these roots.
  for (const [id, b] of bindings) if (b.fn) for (const kind of kinds) if (isCapability(kind, b.file)) seed(id, kind);
  const reverse = new Map<string, Set<string>>();
  for (const [from, to] of deps) for (const d of to) add(reverse, d, from);
  const propagate = <T extends string>(initial: Map<string, Set<T>>, stop = new Set<string>()) => {
    const values = new Map<string, Set<T>>([...initial].map(([k, v]) => [k, new Set(v)]));
    const queue = [...values.keys()];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]!;
      for (const user of reverse.get(id) ?? []) {
        if (stop.has(user)) continue;
        const set = values.get(user) ?? new Set<T>();
        let grow = false;
        for (const v of values.get(id)!)
          if (!set.has(v)) {
            set.add(v);
            grow = true;
          }
        if (grow) {
          values.set(user, set);
          queue.push(user);
        }
      }
    }
    return values;
  };
  const reached = propagate(seeds);
  const providers = new Set([
    ...Object.keys(debt.colliders),
    ...Object.keys(debt.seats),
    ...Object.values(PREFAB_DOORS).flat(),
  ]);
  const constructors: LegacyGraph['constructors'] = {};
  const roots = new Map<string, Set<string>>();
  for (const file of [...providers].sort())
    for (const [name, id] of modules.get(file)?.exports ?? []) {
      // The record-only instantiate door is intentionally open to new authored content.
      if (file === 'src/prefab/instantiate.ts') continue;
      const found = reached.get(id);
      if (!found?.size) continue;
      const key = `${file}#${name}`;
      constructors[key] = { kinds: [...found].sort(), importers: [] };
      roots.set(id, new Set([key]));
    }
  const origins = propagate(
    roots,
    new Set([...roots.keys(), ...[...(modules.get('src/prefab/instantiate.ts')?.exports.values() ?? [])]]),
  );
  const surfaces: LegacyGraph['surfaces'] = {};
  const moduleOrigins: LegacyGraph['modules'] = {};
  for (const f of modules.values()) {
    const all = new Set<string>();
    for (const [name, id] of f.exports) {
      const keys = [...(origins.get(id) ?? [])].sort();
      if (keys.length) surfaces[`${f.file}#${name}`] = keys;
      for (const key of keys) all.add(key);
    }
    if (all.size) moduleOrigins[f.file] = [...all].sort();
  }
  const result: LegacyGraph = { files: Object.keys(sources).sort(), constructors, surfaces, modules: moduleOrigins };
  for (const f of modules.values())
    for (const edge of f.edges)
      for (const key of acquiredConstruction(result, f.file, edge, resolve)) {
        const list = constructors[key]!.importers;
        if (!list.includes(f.file)) list.push(f.file);
      }
  for (const record of Object.values(constructors)) record.importers.sort();
  return result;
}

export function acquiredConstruction(
  graph: LegacyGraph,
  file: string,
  edge: ModuleEdge,
  resolve: ModuleResolver,
): string[] {
  if (edge.erased || !edge.source) return [];
  const target = resolve(file, edge.source);
  if (!target) return [];
  const n = edge.node;
  const keys = new Set<string>();
  if (
    (n.type === 'ImportDeclaration' && n.specifiers.length) ||
    (n.type === 'ExportNamedDeclaration' && n.specifiers.length)
  ) {
    for (const spec of n.specifiers) {
      const name =
        spec.type === 'ImportSpecifier'
          ? spec.imported.type === 'Identifier'
            ? spec.imported.name
            : spec.imported.value
          : spec.type === 'ExportSpecifier'
            ? spec.local.type === 'Identifier'
              ? spec.local.name
              : spec.local.value
            : spec.type === 'ImportDefaultSpecifier'
              ? 'default'
              : undefined;
      for (const key of name === undefined
        ? (graph.modules[target] ?? [])
        : (graph.surfaces[`${target}#${name}`] ?? []))
        keys.add(key);
    }
  } else for (const key of graph.modules[target] ?? []) keys.add(key);
  return [...keys].sort();
}

const TOOL_HASH = createHash('sha256')
  .update(fs.readFileSync(new URL('./prefab-edges.ts', import.meta.url)))
  .update(fs.readFileSync(new URL('./prefab-boundaries.ts', import.meta.url)))
  .update(fs.readFileSync(new URL('../scan/parse.ts', import.meta.url)))
  .digest('hex');
export function loadLegacyGraph(
  root: string,
  debt: PrefabDebt,
  options: { cache?: boolean; ref?: string } = {},
): LegacyGraph {
  const sources: Record<string, string> = {};
  const hash = createHash('sha256').update(TOOL_HASH);
  hash.update(fs.realpathSync(root));
  const lock = path.join(root, 'package-lock.json');
  if (fs.existsSync(lock)) hash.update(fs.readFileSync(lock));
  const providers = [...new Set([...Object.keys(debt.colliders), ...Object.keys(debt.seats)])].sort();
  hash.update(JSON.stringify(providers));
  const config = path.join(root, 'tsconfig.json');
  if (fs.existsSync(config)) hash.update(fs.readFileSync(config));
  if (options.ref) {
    const rows = execFileSync('git', ['ls-tree', '-r', '-z', options.ref], { cwd: root, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
      .map((line) => line.split('\t'))
      .filter((row) => isAnalysedCode(row[1]!));
    const objects = execFileSync('git', ['cat-file', '--batch'], {
      cwd: root,
      input: rows.map((row) => row[0]!.split(' ')[2]).join('\n') + '\n',
      maxBuffer: 40_000_000,
    });
    let offset = 0;
    for (const row of rows) {
      const end = objects.indexOf(10, offset);
      const size = Number(objects.subarray(offset, end).toString().split(' ')[2]);
      offset = end + 1;
      sources[row[1]!] = objects.subarray(offset, offset + size).toString('utf8');
      offset += size + 1;
    }
  } else
    for (const file of fs
      .globSync('**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}', {
        cwd: root,
        exclude: ['**/node_modules/**', '.git/**', '.look/**', 'dist/**', '.claude/**', '.codex/**', '.agents/**'],
      })
      .filter(isAnalysedCode)
      .sort())
      sources[file] = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [file, text] of Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(file).update('\0').update(text);
  }
  const fingerprint = hash.digest('hex');
  const file = path.join(root, `.look/cache/prefab-edges${options.ref ? '-base' : ''}.json`);
  if (options.cache !== false && fs.existsSync(file)) {
    try {
      const old = JSON.parse(fs.readFileSync(file, 'utf8')) as { fingerprint: string; graph: LegacyGraph };
      if (old.fingerprint === fingerprint) return old.graph;
    } catch {
      /* A cache is expendable, never an authority. */
    }
  }
  const graph = computeLegacyGraph(sources, debt, createModuleResolver(root));
  if (options.cache !== false) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({ fingerprint, graph }));
    fs.renameSync(temporary, file);
  }
  return graph;
}

const isAnalysedCode = (file: string) =>
  /\.(?:[cm]?[jt]s|[jt]sx)$/.test(file) &&
  !/(^|\/)(node_modules|\.git|\.look|dist|\.claude|\.codex|\.agents)\//.test(file);
export const unanalysedProjectCode = (graph: LegacyGraph, target: string) =>
  /\.(?:[cm]?[jt]s|[jt]sx)$/.test(target) && !target.startsWith('node_modules/') && !graph.files.includes(target);

export function checkLegacyRecords(actual: LegacyGraph['constructors'], recorded: PrefabDebt['legacy']): string[] {
  const errors: string[] = [];
  const door = 'Use src/prefab/instantiate.ts and prefab records.';
  for (const [key, value] of Object.entries(actual)) {
    const old = recorded?.[key];
    if (!old) {
      errors.push(`Unrecorded computed legacy construction export ${key}. ${door}`);
      continue;
    }
    if (JSON.stringify(value.kinds) !== JSON.stringify(old.kinds))
      errors.push(`Legacy capability kinds changed for ${key}; computed set must equal recorded set. ${door}`);
    for (const file of value.importers)
      if (!old.importers.includes(file)) errors.push(`New legacy importer ${file} → ${key}. ${door}`);
    for (const file of old.importers)
      if (!value.importers.includes(file)) errors.push(`Remove stale legacy importer ${file} → ${key}. ${door}`);
    if (new Set(old.importers).size !== old.importers.length)
      errors.push(`Duplicate legacy importer for ${key}. ${door}`);
  }
  for (const key of Object.keys(recorded ?? {}))
    if (!actual[key]) errors.push(`Remove stale computed legacy construction export ${key}. ${door}`);
  return errors;
}

export function compareLegacyRecords(base: PrefabDebt['legacy'], head: PrefabDebt['legacy']): string[] {
  const errors: string[] = [];
  const door = 'Use src/prefab/instantiate.ts and prefab records.';
  for (const [key, value] of Object.entries(head ?? {})) {
    const old = base?.[key];
    if (!old) {
      errors.push(`New legacy construction export ${key}; the set may only shrink. ${door}`);
      continue;
    }
    for (const kind of value.kinds)
      if (!old.kinds.includes(kind)) errors.push(`Legacy construction kinds grew: ${key}/${kind}. ${door}`);
    for (const file of value.importers)
      if (!old.importers.includes(file)) errors.push(`Legacy importer edges grew: ${file} → ${key}. ${door}`);
  }
  return errors;
}
