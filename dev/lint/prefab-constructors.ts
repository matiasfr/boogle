// Targeted debt-only call graph and compact importer-count ratchet.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseSync, type Node, type Program } from 'oxc-parser';
import { moduleValues } from './prefab-values.ts';
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
  selections: Record<string, Record<number, string[] | null>>;
  constructionProof: Record<string, { creates: boolean; kinds: string[]; allocation: boolean; uncertain: boolean }>;
  conservative: string[];
  conservativeSites: Record<string, number[]>;
  exemptionAudit: Record<string, { creates: boolean; kinds: string[]; allocation: boolean; uncertain: boolean }>;
  ownedFactories: Record<string, { creates: boolean; kinds: string[]; allocation: boolean; uncertain: boolean }>;
};
type Facts = {
  file: string;
  program: Program;
  edges: ModuleEdge[];
  refs: Map<number, string>;
  defs: Map<number, string>;
  names: Map<string, string>;
  exports: Map<string, string>;
  stars: string[];
};
type Binding = { file: string; nodes: Node[]; fn?: Node; dataSafe?: boolean; aliasable?: boolean };
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
  const modules = new Map<string, Facts>();
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
  const namespace = new Map<string, Set<string>>();
  for (const [file, text] of Object.entries(sources)) {
    const parsed = parseSync(file, text, { astType: 'ts', range: true, preserveParens: false });
    if (parsed.errors.length) throw new Error(`prefab edges cannot parse ${file}: ${parsed.errors[0]!.message}`);
    const program = parsed.program;
    const scope = analyze(program as unknown as Parameters<typeof analyze>[0], { sourceType: 'module', lib: [] });
    const f: Facts = {
      file,
      program,
      edges: moduleEdges(program),
      refs: new Map(),
      defs: new Map(),
      names: new Map(),
      exports: new Map(),
      stars: [],
    };
    modules.set(file, f);
    const ids = new Map<object, string>();
    for (const s of scope.scopes)
      for (const variable of s.variables) {
        const defs = variable.defs.filter((d) => d.isVariableDefinition);
        if (!defs.length) continue;
        const first = defs[0]!.name as unknown as Node;
        const id = `B:${file}:${first.start}:${variable.name}`;
        ids.set(variable, id);
        for (const def of defs) f.defs.set((def.name as unknown as Node).start, id);
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
        bindings.set(id, {
          file,
          nodes,
          ...(fn ? { fn } : {}),
          aliasable: defs.every((def) => {
            const n = def.node as unknown as Node;
            return n.type === 'VariableDeclarator' && n.id.type === 'Identifier';
          }),
          dataSafe: defs.every((def) => {
            const p = def.parent as unknown as Node;
            return p?.type === 'VariableDeclaration' && p.kind === 'const';
          }),
        });
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
        if (target) {
          if (n.exported) {
            const name = n.exported.type === 'Identifier' ? n.exported.name : n.exported.value;
            const id = exportId(f.file, name);
            f.exports.set(name, id);
            link(id, namespaceId(target), true);
          } else f.stars.push(target);
        }
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
  const providers = new Set([...Object.keys(debt.colliders), ...Object.keys(debt.seats)]);
  const doors = new Set(Object.values(PREFAB_DOORS).flat());
  const targets = (f: Facts, node: Node): Set<string> => {
    const out = new Set<string>();
    if (node.type === 'Identifier') {
      const id = f.refs.get(node.start);
      if (id) out.add(id);
    } else if (node.type === 'MemberExpression' && node.object.type === 'Identifier') {
      const id = f.refs.get(node.object.start);
      const spaces = new Set<string>();
      const seen = new Set<string>();
      const todo = id ? [id] : [];
      while (todo.length) {
        const alias = todo.pop()!;
        if (seen.has(alias)) continue;
        seen.add(alias);
        for (const module of namespace.get(alias) ?? []) spaces.add(module);
        for (const next of aliases.get(alias) ?? []) todo.push(next);
      }
      for (const module of spaces) {
        const name = member(node);
        if (name !== undefined) out.add(exportId(module, name));
        else out.add(namespaceId(module));
      }
    } else if ('expression' in node && node.expression && typeof node.expression === 'object')
      return targets(f, node.expression as Node);
    return out;
  };
  // Only identity expressions forward a callable. A factory call's result, an object containing callbacks,
  // or an arbitrary initializer reference is not an alias of that factory.
  const identity = (f: Facts, id: string, node: Node): void => {
    if ('expression' in node && node.expression && typeof node.expression === 'object')
      return identity(f, id, node.expression as Node);
    if (node.type === 'AwaitExpression') return identity(f, id, node.argument);
    if (node.type === 'Identifier') {
      const target = f.refs.get(node.start);
      if (target) link(id, target, true);
    }
    if (
      node.type === 'ImportExpression' ||
      (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'require')
    ) {
      const source = node.type === 'ImportExpression' ? literal(node.source) : literal(node.arguments[0] as Node);
      const target = source ? resolve(f.file, source) : null;
      if (target) {
        link(id, namespaceId(target), true);
        namespace.set(id, new Set([target]));
      }
    }
  };
  for (const [id, b] of bindings)
    if (!b.fn && b.aliasable && !(b.file in NOT_CONSTRUCTORS))
      for (const node of b.nodes) identity(modules.get(b.file)!, id, node);
  for (const [id, b] of bindings)
    if (!b.fn && b.aliasable && !(b.file in NOT_CONSTRUCTORS))
      for (const node of b.nodes)
        if (node.type === 'MemberExpression')
          for (const target of targets(modules.get(b.file)!, node)) link(id, target, true);
  // Anonymous callbacks are callable bindings too, so named .then handlers and local helpers preserve identity.
  const functions = new Map<string, { file: string; fn: Node }>();
  for (const [id, b] of bindings) if (b.fn) functions.set(id, { file: b.file, fn: b.fn });
  for (const f of modules.values())
    walk(f.program, (n) => {
      if (functionNode(n)) {
        const id = `F:${f.file}:${n.start}`;
        functions.set(id, { file: f.file, fn: n });
        bindings.set(id, { file: f.file, nodes: [n], fn: n });
      }
    });
  for (const f of modules.values())
    walk(f.program, (n) => {
      if (n.type !== 'AssignmentExpression' && n.type !== 'UpdateExpression') return;
      let left: Node = n.type === 'AssignmentExpression' ? n.left : n.argument;
      while (left.type === 'MemberExpression') left = left.object;
      if (left.type === 'Identifier') {
        const id = f.refs.get(left.start);
        const b = id ? bindings.get(id) : undefined;
        if (b) b.dataSafe = false;
      }
    });
  const values = moduleValues(
    [...modules.values()],
    new Map([...aliases].map(([id, refs]) => [id, new Set(refs)])),
    resolve,
    functions,
    new Map([...modules].map(([file, f]) => [file, new Set(f.exports.keys())])),
    bindings,
  );
  // Re-exported dynamic locals/aggregates retain the same identities as static namespace barrels.
  for (const [id, refs] of values.forwarded) for (const ref of refs) if (id !== ref) link(id, ref, true);
  const callees = (f: Facts, n: Node) => new Set([...targets(f, n), ...values.targets(f.file, n)]);
  const isOwnedCall = (refs: Set<string>) => {
    const todo = [...refs],
      seen = new Set<string>();
    while (todo.length) {
      const id = todo.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      if (id === 'E:src/render/owned-view.ts#createOwnedView') return true;
      for (const alias of aliases.get(id) ?? []) todo.push(alias);
    }
    return false;
  };
  const owned = new Set<string>();
  for (const [id, b] of bindings)
    if (b.fn) {
      const f = modules.get(b.file)!;
      walk(b.fn, (n) => {
        if (n.type === 'CallExpression' && isOwnedCall(callees(f, n.callee))) owned.add(id);
      });
    }
  for (const id of aliases.get('E:src/render/owned-view.ts#createOwnedView') ?? [])
    if (bindings.get(id)?.fn) owned.add(id);
  for (const [id, b] of bindings)
    if (b.fn && 'returnType' in b.fn && b.fn.returnType)
      walk(b.fn.returnType as Node, (n) => {
        if (n.type === 'TSTypeReference' && n.typeName.type === 'Identifier' && n.typeName.name === 'OwnedView')
          owned.add(id);
      });
  const ownedFiles = new Set([...owned].map((id) => bindings.get(id)!.file));
  const analysisFile = (file: string) =>
    providers.has(file) || ownedFiles.has(file) || kinds.some((kind) => isCapability(kind, file));
  const conservative = new Set<string>();
  const conservativeSeeds = new Map<string, Set<ConstructionKind>>();
  // Do not prune exemptions before proving their debt-local callees safe. Never traverse the prefab door.
  for (const [id, b] of bindings) {
    if (
      !b.fn ||
      !analysisFile(b.file) ||
      ['src/prefab/instantiate.ts', 'src/physics/engine.ts', 'src/physics/backend-rapier.ts'].includes(b.file)
    )
      continue;
    const f = modules.get(b.file)!;
    walk(b.fn, (n) => {
      if (n.type !== 'CallExpression' && n.type !== 'NewExpression') return;
      for (const target of callees(f, n.callee)) link(id, target);
      // Passing an existing creation function/module grants capability in this caller, not in the generic
      // helper receiving it. Private lexical callbacks are analyzed in their own bodies as well.
      for (const arg of n.arguments) for (const target of callees(f, arg as Node)) link(id, target);
      for (const target of values.extraCalls.get(n) ?? []) link(id, target);
    });
    const unknown = values.fallback.get(b.file) ?? new Set<number>();
    let unresolved = [...unknown].some((start) => start >= b.fn!.start && start < b.fn!.end);
    if (unknown.size)
      walk(b.fn, (n) => {
        if (n.type === 'Identifier' && [...values.origins(b.file, n)].some((origin) => unknown.has(origin)))
          unresolved = true;
      });
    if (unresolved) {
      conservative.add(b.file);
      conservativeSeeds.set(id, new Set(kinds));
    }
  }
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
  // Creation proof uses actual allocation/seat-registration endpoints, rather than treating queries as creation.
  // Physics/land helper implementations participate in this proof; the record-only prefab door does not.
  const allocationSeeds = new Map<string, Set<ConstructionKind>>();
  for (const f of modules.values())
    for (const [name, id] of f.exports) {
      if (kinds.some((kind) => isCapability(kind, f.file)) && ['createBody', 'setShapes'].includes(name))
        for (const implementation of deps.get(id) ?? []) allocationSeeds.set(implementation, new Set(['colliders']));
      if (f.file === 'src/entities/railway/seat.ts' && name === 'registerSeat')
        for (const implementation of deps.get(id) ?? []) allocationSeeds.set(implementation, new Set(['seats']));
    }
  // Injected recipe constructors carry creation authority by their declared descriptor -> Body contract.
  // This is not arbitrary callback taint: numeric pose callbacks and existing-body getters do not qualify.
  for (const f of modules.values()) {
    if (!analysisFile(f.file)) continue;
    const typeAliases = new Map<string, Node>(),
      physicalTypes = new Map<string, string>();
    for (const n of f.program.body) {
      const d = n.type === 'ExportNamedDeclaration' ? n.declaration : n;
      if (d?.type === 'TSTypeAliasDeclaration') typeAliases.set(d.id.name, d.typeAnnotation);
      if (n.type === 'ImportDeclaration' && isCapability('colliders', resolve(f.file, n.source.value) ?? ''))
        for (const spec of n.specifiers)
          if (spec.type === 'ImportSpecifier')
            physicalTypes.set(
              spec.local.name,
              spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value,
            );
    }
    const type = (node: Node, seen = new Set<string>()): Node => {
      if (node.type === 'TSTypeAnnotation') return type(node.typeAnnotation, seen);
      if (
        node.type === 'TSTypeReference' &&
        node.typeName.type === 'Identifier' &&
        !seen.has(node.typeName.name) &&
        typeAliases.has(node.typeName.name)
      ) {
        seen.add(node.typeName.name);
        return type(typeAliases.get(node.typeName.name)!, seen);
      }
      return node;
    };
    const physical = (node: Node, name: string) => {
      const n = type(node);
      return (
        n.type === 'TSTypeReference' && n.typeName.type === 'Identifier' && physicalTypes.get(n.typeName.name) === name
      );
    };
    for (const b of bindings.values())
      if (b.file === f.file && b.fn && 'params' in b.fn)
        for (const param of b.fn.params)
          if (param.type === 'Identifier' && param.typeAnnotation) {
            const t = type(param.typeAnnotation);
            if (t.type !== 'TSFunctionType' || !physical(t.returnType, 'Body')) continue;
            let shape = false;
            for (const p of t.params)
              walk(p, (n) => {
                if (n.type === 'TSTypeReference' && (physical(n, 'Shape') || physical(n, 'BodyOptions'))) shape = true;
              });
            const id = f.defs.get(param.start);
            if (shape && id) allocationSeeds.set(id, new Set(['colliders']));
          }
  }
  const allocationReached = propagate(allocationSeeds);
  const uncertainReached = propagate(conservativeSeeds);
  const creationSeeds = new Map<string, Set<ConstructionKind>>(allocationSeeds);
  for (const [id, found] of conservativeSeeds)
    creationSeeds.set(id, new Set([...(creationSeeds.get(id) ?? []), ...found]));
  const creationReached = propagate(creationSeeds);
  const creationOf = (id: string) =>
    new Set([
      ...(creationReached.get(id) ?? []),
      ...[...(deps.get(id) ?? [])].flatMap((dep) => [...(creationReached.get(dep) ?? [])]),
    ]);
  const proof = (id: string) => ({
    creates: creationOf(id).size > 0,
    kinds: [...creationOf(id)].sort(),
    allocation: !!allocationReached.get(id)?.size,
    uncertain: !!uncertainReached.get(id)?.size,
  });
  const exemptionAudit: LegacyGraph['exemptionAudit'] = {};
  for (const f of modules.values())
    for (const [name, id] of f.exports)
      if (f.file in NOT_CONSTRUCTORS || `${f.file}#${name}` in NOT_CONSTRUCTION_EXPORTS)
        exemptionAudit[`${f.file}#${name}`] = proof(id);
  const ownedFactories: LegacyGraph['ownedFactories'] = {};
  for (const id of owned) {
    const b = bindings.get(id)!;
    const exports = [...modules.get(b.file)!.exports].filter(([, e]) => (aliases.get(e) ?? new Set()).has(id));
    if (exports.length) for (const [name] of exports) ownedFactories[`${b.file}#${name}`] = proof(id);
    else if (
      id.startsWith('B:') ||
      ![...owned].some((other) => other !== id && bindings.get(other)?.fn?.start === b.fn?.start)
    )
      ownedFactories[`${b.file}:${b.fn!.start}`] = proof(id);
  }
  const constructors: LegacyGraph['constructors'] = {};
  const constructionProof: LegacyGraph['constructionProof'] = {};
  const roots = new Map<string, Set<string>>();
  for (const file of [...new Set([...providers, ...ownedFiles])].sort())
    for (const [name, id] of modules.get(file)?.exports ?? []) {
      // The record-only instantiate door is intentionally open to new authored content.
      if (doors.has(file)) continue;
      // Whole-module acquisition bans remain separate. A helper calling a query/attachment API is not
      // construction: only allocation/registration or opaque dynamic use justifies an importer budget.
      const found = creationOf(id);
      if (!found?.size) continue;
      const key = `${file}#${name}`;
      constructors[key] = { kinds: [...found].sort(), importers: [] };
      constructionProof[key] = proof(id);
      roots.set(id, new Set([key]));
    }
  // Provenance for importer counting follows aliases and barrels only, never function-body calls.
  reverse.clear();
  for (const [from, to] of aliases) for (const d of to) add(reverse, d, from);
  const origins = propagate(roots);
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
  const result: LegacyGraph = {
    files: Object.keys(sources).sort(),
    constructors,
    surfaces,
    modules: moduleOrigins,
    selections: values.selections(),
    constructionProof,
    conservative: [...conservative].sort(),
    conservativeSites: Object.fromEntries(
      [...conservative]
        .sort()
        .map((file) => [
          file,
          [...(values.fallback.get(file) ?? [])]
            .filter((start) => modules.get(file)!.edges.some((edge) => !edge.erased && edge.node.start === start))
            .sort((a, b) => a - b),
        ]),
    ),
    exemptionAudit,
    ownedFactories,
  };
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
  if (n.type === 'ImportExpression' || n.type === 'CallExpression') {
    const selected = graph.selections[file]?.[n.start];
    if (selected !== undefined && selected !== null) {
      for (const ref of selected) for (const key of graph.surfaces[ref.slice(2)] ?? []) keys.add(key);
      return [...keys].sort();
    }
  }
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

export const constructionCounts = (graph: LegacyGraph): Record<string, number> =>
  Object.fromEntries(Object.entries(graph.constructors).map(([key, value]) => [key, value.importers.length]));

// Exemption candidates: allocation/unknown-use reachability overrides every entry, including ownership factories.
export const NOT_CONSTRUCTORS = {
  'src/entity/entity.ts': 'Lifecycle registration/attachment of finished entities; no body or seat creation.',
  'src/entities/player/state.ts': 'Singleton player movement, grounding and respawn; not placed-content factories.',
  'src/entities/ball/state.ts': 'Singleton ball state, ownership and play controls; not placed-content factories.',
  'src/render/owned-view.ts':
    'Ownership/disposal factory for finished meshes and bodies; required prefab lifecycle door.',
  'src/physics/platforms.ts': 'Platform registration, coordinate conversion and carry state over existing bodies.',
} as const;

// Export-level exemption candidates in mixed modules; each must retain a negative allocation/opaque-use proof.
export const NOT_CONSTRUCTION_EXPORTS = {
  'src/player/camera-arm.ts#makeCameraArm': 'Camera obstruction query/solver lifecycle; sweepSphere only.',
  'src/place/pose.ts#createPosePolicy': 'Placement preview pose/query policy; sweepSphere only.',
  'src/render/locomotion-surfaces.ts#stepSurfaceAt': 'Reads existing static surfaces; creates no bodies.',
  'src/guest/collision.ts#gatherSurfaces': 'Copies existing static surfaces into guest collision data.',
  'src/guest/play.ts#startGuest': 'Guest mode lifecycle over the existing singleton player body.',
  'src/guest/play.ts#stopGuest': 'Restores the existing singleton player body motion and disposes its view.',
  'src/boogler/boogler.ts#booglerBodyStep': 'Moves the existing Boogler body; createBoogler remains counted.',
  'src/boogler/play.ts#checkStandingOnBoogler': 'Reads contacts/time for the existing singleton rider.',
  'src/boogler/play.ts#carryBooglerRider': 'Moves an existing rider; no creation.',
  'src/entities/railway/car.ts#snapCar': 'Teleports an existing car; makeCar remains counted.',
  'src/debug/perf-poses.ts#putPlayer': 'Debug positioning of the existing player body.',
  'src/place/sites.ts#housePlan': 'Returns building plan data at a queried terrain height; hullBodies remains counted.',
  'src/place/sites.ts#towerPlan': 'Returns building plan data at a queried terrain height.',
  'src/place/sites.ts#blockPlan': 'Returns building plan data at a queried terrain height.',
  'src/place/folk.ts#crewStart': 'Selects existing villagers and queries terrain height; creates no bodies.',
  'src/place/folk.ts#updateFolk': 'Updates existing villagers over queried terrain height.',
  'src/place/look-kit.ts#installContact': 'Owned visual contact-shadow animation over terrain queries; no collider.',
} as const;

/** Only forwarded construction identities, not every ordinary module export or importer path. */
export const constructionForwards = (graph: LegacyGraph): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(graph.surfaces)
      .map(([key, values]) => [key, values.filter((value) => value !== key)] as const)
      .filter(([, values]) => values.length),
  );

export function compareConstructionForwards(base: PrefabDebt['forwards'], head: PrefabDebt['forwards']): string[] {
  const errors: string[] = [];
  for (const [key, values] of Object.entries(head ?? {}))
    for (const value of values)
      if (!base?.[key]?.includes(value))
        errors.push(`Construction forwarding surface grew: ${key} → ${value}; use src/prefab/instantiate.ts.`);
  return errors;
}

export function checkConstructionForwards(graph: LegacyGraph, recorded: PrefabDebt['forwards']): string[] {
  const actual = constructionForwards(graph);
  const errors = compareConstructionForwards(recorded, actual);
  for (const [key, values] of Object.entries(recorded ?? {})) {
    if (!actual[key] || !values.length)
      errors.push(`Remove stale construction forwarding surface ${key}; use src/prefab/instantiate.ts.`);
    if (new Set(values).size !== values.length)
      errors.push(`Duplicate construction forwarding surface ${key}; use src/prefab/instantiate.ts.`);
    for (const value of values)
      if (!actual[key]?.includes(value))
        errors.push(`Remove stale construction forwarding surface ${key} → ${value}; use src/prefab/instantiate.ts.`);
  }
  return errors;
}

const TOOL_HASH = createHash('sha256')
  .update(fs.readFileSync(new URL('./prefab-constructors.ts', import.meta.url)))
  .update(fs.readFileSync(new URL('./prefab-boundaries.ts', import.meta.url)))
  .update(fs.readFileSync(new URL('./prefab-values.ts', import.meta.url)))
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
  const file = path.join(root, `.look/cache/prefab-constructors${options.ref ? '-base' : ''}.json`);
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
    const count = recorded?.[key];
    if (count === undefined) errors.push(`Unrecorded computed legacy construction export ${key}. ${door}`);
    else if (!Number.isSafeInteger(count) || count < 0) errors.push(`Invalid importer count ${key}. ${door}`);
    else if (value.importers.length > count)
      errors.push(`Legacy importer count grew for ${key}: ${value.importers.length} > ${count}. ${door}`);
    else if (value.importers.length < count)
      errors.push(`Legacy importer count for ${key}: lower the count to ${value.importers.length}. ${door}`);
  }
  for (const key of Object.keys(recorded ?? {}))
    if (!actual[key]) errors.push(`Remove stale computed legacy construction export ${key}. ${door}`);
  return errors;
}

export function compareLegacyRecords(base: PrefabDebt['legacy'], head: PrefabDebt['legacy']): string[] {
  const errors: string[] = [];
  for (const [key, count] of Object.entries(head ?? {})) {
    const old = base?.[key];
    if (old === undefined || count > old)
      errors.push(`Legacy construction importer count grew: ${key}; use src/prefab/instantiate.ts.`);
  }
  return errors;
}
