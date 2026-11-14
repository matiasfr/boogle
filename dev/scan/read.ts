// The one reader of src/ and server/src/, shared by the atlas (dev/atlas/extract.ts) and the registry check
// (dev/registry/scan.ts), so they can't disagree about who owns a presence key, a message or a frame hook. It parses
// with Oxc's ESTree parser, which reads `.js` and `.ts` alike (a module keeps its facts when it moves from
// one to the other). readFile(path, text) returns what a file registers as a raw record: names with line numbers,
// `sends` apart from `reads`, literal-order flags. Each caller projects it into its own shape. Pure; never throws:
// a file the parser rejects gets a `parseError`. Needs `oxc-parser` (a devDependency): not for `atlas --gate`.
import { parseSync, type Node, type CallExpression, type Program, type ObjectPropertyKind } from 'oxc-parser';
import path from 'node:path';
import { walk, lineOf as sourceLine } from './parse.ts';

const posix = path.posix;

export interface Frame {
  phase: string | null;
  order: number | null;
  /** true when `order` is an integer literal */
  explicit: boolean;
  name: string;
  line: number;
  /** set on a defineKind entry: the entity kind this hook walks */
  kind?: string;
}
export interface Keyed {
  key: string;
  line: number;
}
export interface Action {
  id: string | null;
  pad: string | null;
  line: number;
}
export interface Loop {
  pre: (string | null)[];
  render: string | null;
}
export interface FileRecord {
  f: string;
  loc: number;
  head: string;
  imports: string[];
  lazy: string[];
  exports: string[];
  names: string[];
  frames: Frame[]; // onFrame, onPreStep / onPostStep (phases fixedPre, fixedPost), and each entry of a defineKind
  badKinds: string[]; // a defineKind the reader can't read, with why: orders must be literals
  owner: Keyed[]; // addPresenceField
  corePresence: string[]; // keys of the object buildPresence() builds
  ops: string[];
  states: string[];
  ticks: string[];
  sends: string[]; // message types in `t: '...'` of a file that calls .send(
  reads: string[]; // message types compared with `.t`, in a file that calls send or onMessage
  memberSend: boolean;
  onMessage: boolean;
  submits: boolean;
  actions: Action[];
  padSlots: string[]; // the strings of `export const PAD = [...]`
  interact: number;
  routes: string[];
  loop: Loop | null;
  parseError?: string;
}

// `x as T`, `x satisfies T`, `(x)` and `x!` are the value x here.
function unwrap(n: Node | null | undefined): Node | undefined {
  while (
    n &&
    (n.type === 'TSAsExpression' ||
      n.type === 'TSSatisfiesExpression' ||
      n.type === 'ParenthesizedExpression' ||
      n.type === 'TSNonNullExpression' ||
      n.type === 'ChainExpression')
  )
    n = n.expression;
  return n ?? undefined;
}

const strOf = (n: Node | null | undefined): string | undefined => {
  const u = unwrap(n);
  return u?.type === 'Literal' && typeof u.value === 'string' ? u.value : undefined;
};
const isFn = (n: Node | undefined): boolean =>
  n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression';

// Name of a call's callee: `f(...)` gives 'f', `a.b?.f(...)` gives 'f'. Null for anything else.
function calleeName(call: CallExpression): string | null {
  const c = unwrap(call.callee);
  if (c?.type === 'Identifier') return c.name;
  if (c?.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') return c.property.name;
  return null;
}

// A number literal, with an optional leading sign. Undefined when it is not one.
function numberOf(n: Node | undefined): number | undefined {
  const u = unwrap(n);
  if (!u) return undefined;
  if (u.type === 'Literal' && typeof u.value === 'number') return u.value;
  if (u.type === 'UnaryExpression' && (u.operator === '-' || u.operator === '+')) {
    const v = numberOf(u.argument);
    if (v !== undefined) return u.operator === '-' ? -v : v;
  }
  return undefined;
}

type Member = ObjectPropertyKind;

const objectOf = (n: Node | null | undefined) => {
  const u = unwrap(n);
  return u?.type === 'ObjectExpression' ? u : undefined;
};

// A member's key, unless it is computed or a spread.
function memberKey(m: Member): string | null {
  if (m.type === 'SpreadElement' || m.computed) return null;
  const name = m.key;
  if (name.type === 'Identifier') return name.name;
  if (name.type === 'Literal' && (typeof name.value === 'string' || typeof name.value === 'number'))
    return String(name.value);
  return null;
}
// A member's value node: the initializer, the shorthand's identifier, or the method itself.
function memberValue(m: Member): Node | undefined {
  if (m.type === 'SpreadElement') return undefined;
  return m.value;
}

// Finds `key` in an object literal: its value node, or undefined.
function prop(obj: Node | undefined, key: string): Node | undefined {
  for (const m of objectOf(obj)?.properties ?? []) if (memberKey(m) === key) return memberValue(m);
  return undefined;
}

// The first statement's call in a function body (or the arrow's expression body), awaits removed.
function bodyCall(fn: Node): CallExpression | null {
  let e: Node | undefined =
    (fn.type === 'FunctionExpression' || fn.type === 'ArrowFunctionExpression' ? fn.body : undefined) ?? undefined;
  if (e?.type === 'BlockStatement') {
    const s = e.body[0];
    e = s?.type === 'ExpressionStatement' ? s.expression : undefined;
  }
  e = unwrap(e);
  if (e?.type === 'AwaitExpression') e = unwrap(e.argument);
  return e?.type === 'CallExpression' ? e : null;
}

// What an onFrame hook is called: the function it passes, or the call its body makes, else the file's name.
function frameName(fn: Node | undefined, file: string): string {
  const fallback = posix.basename(file).replace(/\.[jt]s$/, '');
  const u = unwrap(fn);
  if (u?.type === 'Identifier') return u.name;
  if (!u || !isFn(u)) return fallback;
  const call = bodyCall(u);
  return (call && calleeName(call)) || fallback;
}

function frameOf(call: CallExpression, file: string, lineOf: (n: Node) => number): Frame {
  const opts = call.arguments[1];
  const read = <T>(key: string, dflt: T, get: (v: Node) => T | undefined): T | null => {
    if (opts === undefined) return dflt;
    const v = prop(opts, key);
    if (v === undefined) return objectOf(opts) ? dflt : null;
    return get(v) ?? null;
  };
  const orderNode = prop(opts, 'order');
  return {
    phase: read<string>('phase', 'update', strOf),
    order: read<number>('order', 0, numberOf),
    explicit: orderNode !== undefined && Number.isInteger(numberOf(orderNode)),
    name: frameName(call.arguments[0], file),
    line: lineOf(call),
  };
}

const DEFAULT_STEP_ORDER = 1000; // an unnumbered onPreStep or onPostStep (src/physics/backend-rapier.ts)

// defineKind's phases, as the hook each one runs on (src/entity/entity.ts).
const KIND_PHASE: Record<string, string> = {
  fixedPre: 'fixedPre',
  fixedPost: 'fixedPost',
  prePhysics: 'prePhysics',
  postPhysics: 'world',
  update: 'update',
  lateUpdate: 'late',
};

// defineKind('ball', { update: -300 }): one frame per entry, or a complaint. The kind and every order must be literals, so
// this reader sees them.
function kindOf(call: CallExpression, lineOf: (n: Node) => number, rec: FileRecord) {
  const line = lineOf(call);
  const kind = strOf(call.arguments[0]);
  const orders = objectOf(call.arguments[1]);
  if (kind === undefined || !orders) {
    rec.badKinds.push(`line ${line}: defineKind takes a literal kind and a literal { phase: order }`);
    return;
  }
  for (const m of orders.properties) {
    const key = memberKey(m);
    const phase = key === null ? undefined : KIND_PHASE[key];
    const order = numberOf(memberValue(m));
    if (phase === undefined || order === undefined || !Number.isInteger(order)) {
      rec.badKinds.push(`line ${line}: defineKind('${kind}') needs a known phase and a literal integer order`);
      continue;
    }
    rec.frames.push({ phase, order, explicit: true, name: `${kind} ${key}`, line, kind });
  }
}

// An import specifier as a repo path ('src/net/room.ts'), or null for packages, JSON and anything not code. Imports
// name their file as it is (`.js` or `.ts`), so the path is exact.
function resolveImport(file: string, spec: string | undefined): string | null {
  if (typeof spec !== 'string' || !spec.startsWith('.') || !/\.[jt]s$/.test(spec)) return null;
  return posix.normalize(posix.join(posix.dirname(file), spec));
}

const uniq = <T>(list: T[]): T[] => [...new Set(list)];

// A hook is core when it is outside src/features/ and sits in a range src/loop.ts reserves for the core modules:
// below the feature range, or 3000 and up in 'late'. Lazy feature parts outside src/features/ use the feature range.
export const MIN_FEATURE_ORDER = -10;
const CORE_LATE = 3000;
export const isCoreHook = (file: string, order: number | null): boolean =>
  !file.startsWith('src/features/') && typeof order === 'number' && (order < MIN_FEATURE_ORDER || order >= CORE_LATE);

// `a.b` for a member call on an identifier, else the plain callee name: 'world.step', 'renderFrame'.
function dotted(call: CallExpression): string | null {
  const c = unwrap(call.callee);
  if (
    c?.type === 'MemberExpression' &&
    !c.computed &&
    c.object.type === 'Identifier' &&
    c.property.type === 'Identifier'
  )
    return `${c.object.name}.${c.property.name}`;
  return calleeName(call);
}

// The frame loop in main: the function handed to setAnimationLoop(fn). pre = its top-level calls before the first
// runFrame that follows the step (the physics step: runFrame('prePhysics') is hooks, listed with their phase); render =
// the call after the last runFrame (the draw). Profiling marks are not steps. Null when it cannot be found.
const PROFILING = new Set(['beginFrame', 'endFrame', 'mark']);
function loopOf(sf: Program): Loop | null {
  let fnName: string | null = null;
  walk(sf, (n) => {
    if (n.type !== 'CallExpression' || calleeName(n) !== 'setAnimationLoop') return;
    // setAnimationLoop(frame), or a wrapper around it: setAnimationLoop(guardGraphicsFrame(frame)).
    let a0 = n.arguments[0];
    if (a0?.type === 'CallExpression' && a0.arguments[0]?.type === 'Identifier') a0 = a0.arguments[0];
    if (a0?.type === 'Identifier') fnName = a0.name;
  });
  const fn = sf.body
    .map((n) => (n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration' ? n.declaration : n))
    .find((n) => n?.type === 'FunctionDeclaration' && !!fnName && n.id?.name === fnName);
  if (fn?.type !== 'FunctionDeclaration' || !fn.body) return null;
  const calls = fn.body.body
    .map((st) => (st.type === 'ExpressionStatement' ? unwrap(st.expression) : undefined))
    .map((e) => (e?.type === 'AwaitExpression' ? unwrap(e.argument) : e))
    .filter((e): e is CallExpression => e?.type === 'CallExpression')
    .filter((c) => !(calleeName(c) === 'runFrame' && strOf(c.arguments[0]) === 'prePhysics'))
    .map(dotted)
    .filter((name) => !PROFILING.has(name ?? ''));
  const first = calls.indexOf('runFrame');
  const last = calls.lastIndexOf('runFrame');
  if (first < 0) return null;
  return { pre: calls.slice(0, first), render: calls[last + 1] ?? null };
}

function emptyRecord(f: string, loc: number): FileRecord {
  return {
    f,
    loc,
    head: '',
    imports: [],
    lazy: [],
    exports: [],
    names: [],
    frames: [],
    badKinds: [],
    owner: [],
    corePresence: [],
    ops: [],
    states: [],
    ticks: [],
    sends: [],
    reads: [],
    memberSend: false,
    onMessage: false,
    submits: false,
    actions: [],
    padSlots: [],
    interact: 0,
    routes: [],
    loop: null,
  };
}

const EQUALITY = new Set(['===', '!==', '==', '!=']);

const isTProp = (x: Node) => {
  const u = unwrap(x);
  return u?.type === 'MemberExpression' && !u.computed && u.property.type === 'Identifier' && u.property.name === 't';
};

export function readFile(file: string, text: string): FileRecord {
  const loc = text.split('\n').length;
  const rec = emptyRecord(file, loc);
  const parsed = parseSync(file, text, { lang: file.endsWith('.ts') ? 'ts' : 'js' });
  const bad = parsed.errors[0];
  if (bad) {
    rec.parseError = bad.message;
    return rec;
  }
  const sf = parsed.program;
  const lineOf = sourceLine(text);

  // The line comments before the first statement.
  rec.head = parsed.comments
    .filter((c) => c.start < (sf.body[0]?.start ?? text.length) && c.type === 'Line')
    .map((c) => c.value.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 260);

  const imports: (string | null)[] = [];
  const lazy: (string | null)[] = [];
  const exportsList: string[] = [];
  const names: string[] = [];
  const routes: string[] = [];
  const tProps: string[] = [];
  const reads: string[] = [];
  const isServer = file.startsWith('server/');
  let sendsOrListens = false;

  walk(sf, (n, parent) => {
    if (n.type === 'ImportDeclaration') {
      if (n.importKind !== 'type') imports.push(resolveImport(file, strOf(n.source)));
    } else if (n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration') {
      if (n.exportKind === 'type') return;
      if (n.source) imports.push(resolveImport(file, strOf(n.source)));
      if (n.type === 'ExportNamedDeclaration')
        for (const s of n.specifiers)
          if (s.exportKind !== 'type')
            exportsList.push(s.exported.type === 'Identifier' ? s.exported.name : s.exported.value);
    } else if (n.type === 'ExportDefaultDeclaration') {
      exportsList.push('default');
    } else if (n.type === 'FunctionDeclaration' || n.type === 'TSDeclareFunction' || n.type === 'ClassDeclaration') {
      if (n.id) names.push(n.id.name);
      if (parent?.type === 'ExportNamedDeclaration') exportsList.push(n.id?.name ?? '');
      if (n.type === 'FunctionDeclaration' && n.id?.name === 'buildPresence' && n.body) {
        for (const st of n.body.body) {
          if (st.type !== 'VariableDeclaration') continue;
          for (const d of st.declarations) {
            const init = objectOf(d.init);
            if (d.id.type === 'Identifier' && d.id.name === 'pr' && init)
              for (const m of init.properties) {
                const k = memberKey(m);
                if (k) rec.corePresence.push(k);
              }
          }
        }
      }
    } else if (n.type === 'VariableDeclaration') {
      if (parent?.type === 'ExportNamedDeclaration')
        for (const d of n.declarations) {
          if (d.id.type !== 'Identifier') continue;
          exportsList.push(d.id.name);
          const init = unwrap(d.init);
          if (d.id.name === 'PAD' && init?.type === 'ArrayExpression')
            rec.padSlots = init.elements.map(strOf).filter((s): s is string => s !== undefined);
        }
    } else if (n.type === 'VariableDeclarator') {
      if (n.id.type === 'Identifier') names.push(n.id.name);
    } else if (n.type === 'CatchClause') {
      if (n.param?.type === 'Identifier') names.push(n.param.name);
    } else if (n.type === 'ObjectExpression') {
      // Members of an object literal: a function-valued one names a function; `t: '...'` is a message type.
      for (const m of n.properties) {
        const k = memberKey(m);
        if (!k) continue;
        const v = memberValue(m);
        if (isFn(v)) names.push(k);
        if (k === 't' && m.type === 'Property' && !m.shorthand && !m.method && strOf(m.value) !== undefined)
          tProps.push(strOf(m.value)!);
      }
    } else if (n.type === 'BinaryExpression') {
      if (EQUALITY.has(n.operator)) {
        const [a, b] = [n.left, n.right];
        if (isTProp(a) && strOf(b) !== undefined) reads.push(strOf(b)!);
        else if (isTProp(b) && strOf(a) !== undefined) reads.push(strOf(a)!);
      }
    } else if (n.type === 'ImportExpression') {
      lazy.push(resolveImport(file, strOf(n.source)));
    } else if (n.type === 'CallExpression') {
      const name = calleeName(n);
      const s0 = strOf(n.arguments[0]);
      if (name === 'send' || name === 'onMessage') sendsOrListens = true;
      if (name === 'send' && unwrap(n.callee)?.type !== 'Identifier') rec.memberSend = true;
      if (name === 'onMessage') rec.onMessage = true;
      else if (name === 'act' && unwrap(n.callee)?.type === 'MemberExpression') rec.submits = true;
      else if (name === 'onFrame') rec.frames.push(frameOf(n, file, lineOf));
      else if (name === 'onPreStep' || name === 'onPostStep') {
        const f = frameOf(n, file, lineOf);
        const phase = name === 'onPreStep' ? 'fixedPre' : 'fixedPost';
        rec.frames.push({ ...f, phase, order: f.explicit ? f.order : DEFAULT_STEP_ORDER });
      } else if (name === 'defineKind') kindOf(n, lineOf, rec);
      else if (name === 'addPresenceField' && s0 !== undefined) rec.owner.push({ key: s0, line: lineOf(n) });
      else if (name === 'define' && s0 !== undefined && unwrap(n.callee)?.type === 'MemberExpression') rec.ops.push(s0);
      else if (name === 'registerState' && s0 !== undefined) rec.states.push(s0);
      else if (name === 'onTick' && strOf(n.arguments[1]) !== undefined) rec.ticks.push(strOf(n.arguments[1])!);
      else if (name === 'registerInteractable') rec.interact++;
      else if (name === 'registerAction')
        rec.actions.push({ id: s0 ?? null, pad: strOf(prop(n.arguments[1], 'pad')) ?? null, line: lineOf(n) });
      else if (isServer && ['get', 'put', 'post', 'delete', 'use'].includes(name ?? '') && s0 !== undefined) {
        const c = unwrap(n.callee);
        if (c?.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' && c.object.name === 'app')
          routes.push(`${name!.toUpperCase()} ${s0}`);
      }
    }
  });

  rec.imports = uniq(imports.filter((x): x is string => !!x));
  rec.lazy = uniq(lazy.filter((x): x is string => !!x));
  rec.exports = uniq(exportsList.filter(Boolean));
  rec.names = uniq(names);
  rec.ops = uniq(rec.ops);
  rec.states = uniq(rec.states);
  rec.ticks = uniq(rec.ticks);
  rec.sends = rec.memberSend ? uniq(tProps) : [];
  rec.reads = sendsOrListens ? uniq(reads) : [];
  rec.routes = uniq(routes);
  rec.loop = loopOf(sf);
  return rec;
}
