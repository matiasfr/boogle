// A bounded abstract value domain for module identities, aggregate fields and promise results.
// It never executes source. Unknown escapes retain import origins for the caller's fail-closed decision.
import type { Node, Program } from 'oxc-parser';
import { walk, literal } from '../scan/parse.ts';
import type { ModuleResolver } from './prefab-boundaries.ts';

type Value = { refs: Set<string>; fields: Map<string, Value>; origins: Set<number> };
const empty = (): Value => ({ refs: new Set(), fields: new Map(), origins: new Set() });
export type ValueModule = { file: string; program: Program; refs: Map<number, string>; defs: Map<number, string> };
export function moduleValues(
  modules: ValueModule[],
  aliases: Map<string, Set<string>>,
  resolve: ModuleResolver,
  functions: Map<string, { file: string; fn: Node }>,
  exportedNames: Map<string, Set<string>>,
  initializers: Map<string, { file: string; nodes: Node[]; dataSafe?: boolean }>,
) {
  const locals = new Map<string, Value>();
  const fallback = new Map<string, Set<number>>();
  const consumed = new Map<string, Set<number>>();
  const imports = new Map<string, Set<number>>();
  const extraCalls = new Map<Node, Set<string>>();
  let previous = '';
  let converged = false;
  const handledCallbacks = new Set<Node>();
  const parents = new Map<Node, Node>();
  const clipped = new Set<number>();
  const merge = (into: Value, from: Value, depth = 0): void => {
    for (const r of from.refs)
      if (!into.refs.has(r)) {
        into.refs.add(r);
      }
    for (const o of from.origins)
      if (!into.origins.has(o)) {
        into.origins.add(o);
      }
    if (depth >= 8) {
      for (const origin of originSet(from)) {
        into.origins.add(origin);
        clipped.add(origin);
      }
      return;
    }
    for (const [k, v] of from.fields) {
      let dest = into.fields.get(k);
      if (!dest) {
        dest = empty();
        into.fields.set(k, dest);
      }
      merge(dest, v, depth + 1);
    }
  };
  const union = (...values: Value[]) => {
    const v = empty();
    for (const x of values) merge(v, x);
    return v;
  };
  const originSet = (v: Value): Set<number> => {
    const all = new Set(v.origins);
    for (const x of v.fields.values()) for (const o of originSet(x)) all.add(o);
    return all;
  };
  const note = (map: Map<string, Set<number>>, f: ValueModule, v: Value) => {
    const set = map.get(f.file) ?? new Set();
    for (const o of originSet(v)) set.add(o);
    map.set(f.file, set);
  };
  const expand = (ref: string, seen = new Set<string>()): Value => {
    const v = empty();
    if (seen.has(ref)) return v;
    seen.add(ref);
    v.refs.add(ref);
    const local = locals.get(ref);
    if (local) merge(v, local);
    for (const a of aliases.get(ref) ?? []) merge(v, expand(a, seen));
    return v;
  };
  const known = (v: Value) =>
    [...v.refs].some(
      (r) =>
        functions.has(r) ||
        r.startsWith('N:') ||
        (r.startsWith('E:') && exportedNames.get(r.slice(2, r.lastIndexOf('#')))?.has(r.slice(r.lastIndexOf('#') + 1))),
    );
  const staticData = new Set<string>();
  const pureRef = (id: string, seen = new Set<string>()): boolean => {
    if (seen.has(id) || functions.has(id) || id.startsWith('N:')) return false;
    seen.add(id);
    if (staticData.has(id) && !originSet(locals.get(id) ?? empty()).size) return true;
    const refs = aliases.get(id);
    return !!refs?.size && [...refs].every((ref) => pureRef(ref, new Set(seen)));
  };
  const pureNode = (f: ValueModule, n: Node): boolean => {
    if (n.type === 'Literal') return true;
    if (n.type === 'Identifier') {
      const id = f.refs.get(n.start) ?? f.defs.get(n.start);
      return id ? pureRef(id) : ['undefined', 'NaN', 'Infinity'].includes(n.name);
    }
    if (n.type === 'ObjectExpression')
      return n.properties.every((p) => (p.type === 'Property' ? pureNode(f, p.value) : pureNode(f, p.argument)));
    if (n.type === 'ArrayExpression')
      return n.elements.every((p) => !p || pureNode(f, p.type === 'SpreadElement' ? p.argument : (p as Node)));
    if (n.type === 'MemberExpression') return pureNode(f, n.object) && (!n.computed || pureNode(f, n.property));
    if (n.type === 'UnaryExpression') return pureNode(f, n.argument);
    if (n.type === 'BinaryExpression' || n.type === 'LogicalExpression')
      return pureNode(f, n.left as Node) && pureNode(f, n.right);
    if (n.type === 'ConditionalExpression')
      return pureNode(f, n.test) && pureNode(f, n.consequent) && pureNode(f, n.alternate);
    if ('expression' in n && n.expression && typeof n.expression === 'object') return pureNode(f, n.expression as Node);
    return false;
  };
  const project = (f: ValueModule, v: Value, key: string | undefined): Value => {
    const out = empty();
    let namespaceFields = 0,
      onlyData = true;
    for (const o of v.origins) out.origins.add(o);
    if (key === undefined) {
      note(fallback, f, v);
      for (const x of v.fields.values()) merge(out, x);
    } else if (v.fields.has(key)) merge(out, v.fields.get(key)!);
    for (const r of v.refs) {
      const resolved = expand(r);
      if (key !== undefined && resolved.fields.has(key)) merge(out, resolved.fields.get(key)!);
      for (const ref of resolved.refs)
        if (ref.startsWith('N:')) {
          const file = ref.slice(2);
          if (key !== undefined && exportedNames.get(file)?.has(key)) {
            namespaceFields++;
            if (!pureRef(`E:${file}#${key}`)) {
              onlyData = false;
              merge(out, expand(`E:${file}#${key}`));
            }
            note(consumed, f, v);
          } else {
            onlyData = false;
            for (const name of exportedNames.get(file) ?? []) merge(out, expand(`E:${file}#${name}`));
            note(fallback, f, v);
          }
        }
    }
    if (namespaceFields && onlyData && !out.refs.size && !out.fields.size) out.origins.clear();
    if (
      key !== undefined &&
      !namespaceFields &&
      !v.fields.has(key) &&
      !out.refs.size &&
      !out.fields.size &&
      originSet(v).size
    ) {
      note(fallback, f, v);
      for (const origin of originSet(v)) out.origins.add(origin);
    }
    return out;
  };
  const keyOf = (n: Node, computed = false): string | undefined =>
    !computed && n.type === 'Identifier'
      ? n.name
      : (literal(n) ?? (n.type === 'Literal' ? String(n.value) : undefined));
  const bind = (f: ValueModule, p: Node, v: Value): void => {
    if (p.type === 'Identifier') {
      const id = f.defs.get(p.start) ?? f.refs.get(p.start);
      if (id) {
        let dest = locals.get(id);
        if (!dest) {
          dest = empty();
          locals.set(id, dest);
        }
        merge(dest, v);
      } else note(fallback, f, v);
    } else if (p.type === 'ArrayPattern')
      p.elements.forEach((item, i) => {
        if (!item) return;
        if (item.type === 'RestElement') {
          const rest = empty();
          for (const [k, value] of v.fields)
            if (/^\d+$/.test(k) && Number(k) >= i) rest.fields.set(String(Number(k) - i), value);
          for (const o of v.origins) rest.origins.add(o);
          if ([...v.refs].some((ref) => ref.startsWith('N:'))) note(fallback, f, v);
          bind(f, item.argument, rest);
        } else bind(f, item, project(f, v, String(i)));
      });
    else if (p.type === 'ObjectPattern')
      for (const part of p.properties) {
        if (part.type === 'RestElement') bind(f, part.argument, v);
        else bind(f, part.value, project(f, v, keyOf(part.key, part.computed)));
      }
    else if (p.type === 'RestElement') bind(f, p.argument, v);
    else if (p.type === 'AssignmentPattern') bind(f, p.left, union(v, evaluate(f, p.right)));
    else if (p.type === 'MemberExpression' && p.object.type === 'Identifier') {
      const id = f.defs.get(p.object.start) ?? f.refs.get(p.object.start),
        key = keyOf(p.property, p.computed);
      if (id && key !== undefined) {
        let dest = locals.get(id);
        if (!dest) {
          dest = empty();
          locals.set(id, dest);
        }
        let field = dest.fields.get(key);
        if (!field) {
          field = empty();
          dest.fields.set(key, field);
        }
        merge(field, v);
      } else note(fallback, f, v);
    } else note(fallback, f, v);
  };
  const functionRefs = (v: Value) => {
    const found = new Set<string>();
    for (const r of v.refs) for (const id of expand(r).refs) if (functions.has(id)) found.add(id);
    return found;
  };
  const invoke = (f: ValueModule, call: Node, callback: Node, input: Value): Value => {
    const out = empty();
    const refs = functionRefs(evaluate(f, callback));
    if (!refs.size) {
      note(fallback, f, input);
      return out;
    }
    const invoked = extraCalls.get(call) ?? new Set<string>();
    extraCalls.set(call, invoked);
    for (const id of refs) {
      invoked.add(id);
      const fn = functions.get(id)!,
        module = byFile.get(fn.file)!;
      handledCallbacks.add(fn.fn);
      if ('params' in fn.fn && fn.fn.params[0]) bind(module, fn.fn.params[0], input);
      if (
        (fn.fn.type === 'ArrowFunctionExpression' ||
          fn.fn.type === 'FunctionExpression' ||
          fn.fn.type === 'FunctionDeclaration') &&
        fn.fn.body
      ) {
        if (fn.fn.body.type !== 'BlockStatement') merge(out, evaluate(module, fn.fn.body));
        else
          walk(fn.fn.body, (n) => {
            if (n.type === 'ReturnStatement' && n.argument) merge(out, evaluate(module, n.argument));
          });
      }
    }
    return out;
  };
  const byFile = new Map(modules.map((f) => [f.file, f]));
  for (let pass = 0; pass < 24; pass++) {
    const old = staticData.size;
    for (const [id, b] of initializers)
      if (b.dataSafe && b.nodes.length && b.nodes.every((n) => pureNode(byFile.get(b.file)!, n))) staticData.add(id);
    if (staticData.size === old) break;
  }
  const active = new Set<Node>();
  function evaluate(f: ValueModule, n: Node | undefined): Value {
    if (!n || active.has(n)) return empty();
    active.add(n);
    let v = empty();
    try {
      if (n.type === 'Identifier') {
        const id = f.refs.get(n.start) ?? f.defs.get(n.start);
        if (id) v = expand(id);
      } else if (n.type === 'ImportExpression') {
        v.origins.add(n.start);
        const spec = literal(n.source),
          file = spec ? resolve(f.file, spec) : null;
        if (file) v.refs.add(`N:${file}`);
        else note(fallback, f, v);
      } else if (
        n.type === 'CallExpression' &&
        n.callee.type === 'Identifier' &&
        n.callee.name === 'require' &&
        !f.refs.has(n.callee.start)
      ) {
        v.origins.add(n.start);
        const spec = literal(n.arguments[0] as Node),
          file = spec ? resolve(f.file, spec) : null;
        if (file) v.refs.add(`N:${file}`);
        else note(fallback, f, v);
      } else if (n.type === 'AwaitExpression') v = evaluate(f, n.argument);
      else if ('expression' in n && n.expression && typeof n.expression === 'object')
        v = evaluate(f, n.expression as Node);
      else if (n.type === 'MemberExpression') v = project(f, evaluate(f, n.object), keyOf(n.property, n.computed));
      else if (n.type === 'ArrayExpression') {
        let i = 0;
        for (const item of n.elements) {
          if (!item) {
            i++;
            continue;
          }
          if (item.type === 'SpreadElement') {
            const input = evaluate(f, item.argument);
            if ([...input.refs].some((ref) => ref.startsWith('N:')) || !input.fields.size) note(fallback, f, input);
            for (const [, value] of [...input.fields].sort(([a], [b]) => Number(a) - Number(b)))
              v.fields.set(String(i++), value);
          } else v.fields.set(String(i++), evaluate(f, item as Node));
        }
      } else if (n.type === 'SpreadElement') v = evaluate(f, n.argument);
      else if (n.type === 'ObjectExpression')
        for (const prop of n.properties) {
          if (prop.type === 'SpreadElement') merge(v, evaluate(f, prop.argument));
          else if (prop.type === 'Property') {
            const key = keyOf(prop.key, prop.computed),
              value = evaluate(f, prop.value);
            if (key === undefined) note(fallback, f, value);
            else v.fields.set(key, value);
          }
        }
      else if (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression')
        v.refs.add(`F:${f.file}:${n.start}`);
      else if (n.type === 'ConditionalExpression') v = union(evaluate(f, n.consequent), evaluate(f, n.alternate));
      else if (n.type === 'LogicalExpression') v = union(evaluate(f, n.left), evaluate(f, n.right));
      else if (n.type === 'AssignmentExpression') {
        v = evaluate(f, n.right);
        bind(f, n.left, v);
      } else if (n.type === 'CallExpression' || n.type === 'NewExpression') {
        const c = n.callee;
        const promise =
          c.type === 'MemberExpression' &&
          c.object.type === 'Identifier' &&
          c.object.name === 'Promise' &&
          !f.refs.has(c.object.start);
        const name = c.type === 'MemberExpression' ? keyOf(c.property, c.computed) : undefined;
        if (promise && (name === 'all' || name === 'allSettled')) {
          const input = evaluate(f, n.arguments[0] as Node);
          v = input;
          if (name === 'allSettled') {
            v = empty();
            for (const [k, item] of input.fields) {
              const settled = empty();
              settled.fields.set('value', item);
              settled.fields.set('status', empty());
              v.fields.set(k, settled);
            }
          }
        } else if (c.type === 'MemberExpression' && name === 'then') {
          const input = evaluate(f, c.object);
          v = n.arguments[0] ? invoke(f, n, n.arguments[0] as Node, input) : input;
        } else {
          const callee = evaluate(f, c);
          if (known(callee)) note(consumed, f, callee);
          else note(fallback, f, callee);
          const args = n.arguments.map((a) => evaluate(f, a as Node));
          const refs = functionRefs(callee);
          for (const arg of args)
            if (originSet(arg).size) {
              note(fallback, f, arg); // Module identities escaping into arbitrary arguments need a conservative proof.

              if (!refs.size) note(fallback, f, arg);
              else
                for (const id of refs) {
                  const fn = functions.get(id)!,
                    module = byFile.get(fn.file)!;
                  if ('params' in fn.fn)
                    for (const [i, param] of fn.fn.params.entries()) if (args[i]) bind(module, param, args[i]!);
                }
            }
          // Ordinary function results are not aliases of their factories.
        }
      }
    } finally {
      active.delete(n);
    }
    return v;
  }
  const operations: { f: ValueModule; n: Node }[] = [];
  const activeFiles = new Set(
    modules
      .filter((f) => {
        let found = false;
        walk(f.program, (n) => {
          if (
            n.type === 'ImportExpression' ||
            (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'require')
          )
            found = true;
          if (n.type === 'VariableDeclarator' && n.id.type !== 'Identifier' && n.init?.type === 'Identifier') {
            const id = f.refs.get(n.init.start);
            if (id && [...expand(id).refs].some((ref) => ref.startsWith('N:'))) found = true;
          }
        });
        return found;
      })
      .map((f) => f.file),
  );
  for (const f of modules)
    walk(f.program, (n, p) => {
      if (p) parents.set(n, p);
      if (
        n.type === 'ImportExpression' ||
        (n.type === 'CallExpression' &&
          n.callee.type === 'Identifier' &&
          n.callee.name === 'require' &&
          !f.refs.has(n.callee.start))
      ) {
        const set = imports.get(f.file) ?? new Set();
        set.add(n.start);
        imports.set(f.file, set);
      }
      if (
        activeFiles.has(f.file) &&
        (n.type === 'VariableDeclarator' ||
          n.type === 'AssignmentExpression' ||
          n.type === 'CallExpression' ||
          n.type === 'ReturnStatement' ||
          n.type === 'MemberExpression')
      ) {
        if (n.type === 'MemberExpression' && p?.type === 'CallExpression' && p.callee === n) return;
        operations.push({ f, n });
      }
    });
  // The domain is finite (source binding identities/field paths). A depth bound fails closed on exotic structures.
  for (let pass = 0; pass < 24; pass++) {
    fallback.clear();
    consumed.clear();
    extraCalls.clear();
    for (const { f, n } of operations) {
      if (n.type === 'VariableDeclarator' && n.init) bind(f, n.id, evaluate(f, n.init));
      else if (n.type === 'ReturnStatement' && n.argument) {
        let owner = parents.get(n);
        while (owner && !('params' in owner)) owner = parents.get(owner);
        if (!owner || !handledCallbacks.has(owner)) note(fallback, f, evaluate(f, n.argument));
      } else evaluate(f, n);
    }
    // `expand` uses snapshots, so only binding growth determines convergence.
    const signature = JSON.stringify([...locals].map(([id, v]) => [id, flatten(v)]));
    if (signature === previous) {
      converged = true;
      break;
    }
    previous = signature;
  }
  function flatten(v: Value, depth = 0): unknown {
    return [
      [...v.refs].sort(),
      [...v.origins].sort(),
      depth < 8 ? [...v.fields].map(([k, x]) => [k, flatten(x, depth + 1)]) : [],
    ];
  }
  // Audit every read of a module-carrying value. Unsupported consumers must not be hidden by another,
  // separately resolved use of the same import (loops, coercion, opaque escapes, etc.).
  for (const f of modules)
    if (activeFiles.has(f.file))
      walk(f.program, (n, p) => {
        if (!p || !(n.type === 'Identifier' || n.type === 'MemberExpression' || n.type === 'ImportExpression')) return;
        if (n.type === 'Identifier' && f.defs.has(n.start)) return;
        if (
          n.type === 'MemberExpression' &&
          p.type === 'CallExpression' &&
          p.callee === n &&
          keyOf(n.property, n.computed) === 'then'
        )
          return;
        const value = evaluate(f, n);
        if (!originSet(value).size) return;
        if (
          (p.type === 'MemberExpression' && p.object === n) ||
          p.type === 'AwaitExpression' ||
          p.type === 'ArrayExpression' ||
          p.type === 'ObjectExpression' ||
          p.type === 'Property' ||
          p.type === 'SpreadElement' ||
          p.type === 'VariableDeclarator' ||
          p.type === 'AssignmentExpression' ||
          p.type === 'ConditionalExpression' ||
          p.type === 'LogicalExpression' ||
          p.type === 'ArrayPattern' ||
          p.type === 'ObjectPattern' ||
          p.type === 'AssignmentPattern' ||
          p.type === 'RestElement'
        )
          return;
        if (p.type === 'CallExpression' || p.type === 'NewExpression') return; // evaluated above, including opaque arguments
        if (p.type === 'ArrowFunctionExpression' && handledCallbacks.has(p)) return;
        if (p.type === 'ReturnStatement') return; // escape already audited, except recognized .then callbacks
        note(fallback, f, value);
      });
  for (const [f, sites] of imports)
    for (const site of sites)
      if (!converged || clipped.has(site) || !consumed.get(f)?.has(site)) {
        const set = fallback.get(f) ?? new Set();
        set.add(site);
        fallback.set(f, set);
      }
  const refsOf = (v: Value): Set<string> =>
    new Set([...v.refs, ...[...v.fields.values()].flatMap((field) => [...refsOf(field)])]);
  return {
    forwarded: new Map([...locals].map(([id, v]) => [id, refsOf(v)])),
    targets: (file: string, node: Node) => {
      const f = byFile.get(file);
      if (node.type === 'MemberExpression' && keyOf(node.property, node.computed) === 'then') return [];
      return f && activeFiles.has(file) ? [...evaluate(f, node).refs] : [];
    },
    extraCalls,
    fallback,
    origins: (file: string, node: Node) => {
      const f = byFile.get(file);
      return f ? originSet(evaluate(f, node)) : new Set<number>();
    },
  };
}
