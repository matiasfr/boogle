// The one reader of src/ and server/src/, shared by the atlas (dev/atlas/extract.ts) and the registry check
// (dev/registry/scan.mjs), so they can't disagree about who owns a presence key, a message or a frame hook. It parses
// with the TypeScript compiler API, which reads `.js` and `.ts` alike (a module keeps its facts when it moves from
// one to the other). readFile(path, text) returns what a file registers as a raw record: names with line numbers,
// `sends` apart from `reads`, literal-order flags. Each caller projects it into its own shape. Pure; never throws:
// a file the parser rejects gets a `parseError`. Needs `typescript` (a devDependency): not for `atlas --gate`.
import ts from 'typescript';
import path from 'node:path';

const posix = path.posix;

export interface Frame {
  phase: string | null;
  order: number | null;
  /** true when `order` is an integer literal */
  explicit: boolean;
  name: string;
  line: number;
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
  frames: Frame[];
  owner: Keyed[]; // addPresenceField
  host: Keyed[]; // addHostField
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

// Depth-first walk over every node. `fn(node)` runs before the children.
function walk(node: ts.Node, fn: (n: ts.Node) => void) {
  fn(node);
  ts.forEachChild(node, (c) => walk(c, fn));
}

// `x as T`, `x satisfies T`, `(x)` and `x!` are the value x here.
function unwrap(n: ts.Node | undefined): ts.Node | undefined {
  while (
    n &&
    (ts.isAsExpression(n) ||
      ts.isSatisfiesExpression(n) ||
      ts.isParenthesizedExpression(n) ||
      ts.isNonNullExpression(n))
  )
    n = n.expression;
  return n;
}

const strOf = (n: ts.Node | undefined): string | undefined => {
  const u = unwrap(n);
  return u && ts.isStringLiteral(u) ? u.text : undefined;
};
const isFn = (n: ts.Node | undefined): boolean => !!n && (ts.isFunctionExpression(n) || ts.isArrowFunction(n));

// Name of a call's callee: `f(...)` gives 'f', `a.b?.f(...)` gives 'f'. Null for anything else.
function calleeName(call: ts.CallExpression): string | null {
  const c = unwrap(call.expression);
  if (c && ts.isIdentifier(c)) return c.text;
  if (c && ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.name)) return c.name.text;
  return null;
}

// A number literal, with an optional leading sign. Undefined when it is not one.
function numberOf(n: ts.Node | undefined): number | undefined {
  const u = unwrap(n);
  if (!u) return undefined;
  if (ts.isNumericLiteral(u)) return Number(u.text);
  if (
    ts.isPrefixUnaryExpression(u) &&
    (u.operator === ts.SyntaxKind.MinusToken || u.operator === ts.SyntaxKind.PlusToken)
  ) {
    const v = numberOf(u.operand);
    if (v !== undefined) return u.operator === ts.SyntaxKind.MinusToken ? -v : v;
  }
  return undefined;
}

type Member = ts.ObjectLiteralElementLike;

const objectOf = (n: ts.Node | undefined): ts.ObjectLiteralExpression | undefined => {
  const u = unwrap(n);
  return u && ts.isObjectLiteralExpression(u) ? u : undefined;
};

// A member's key, unless it is computed or a spread.
function memberKey(m: Member): string | null {
  if (ts.isSpreadAssignment(m)) return null;
  const name = m.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}
// A member's value node: the initializer, the shorthand's identifier, or the method itself.
function memberValue(m: Member): ts.Node | undefined {
  if (ts.isPropertyAssignment(m)) return m.initializer;
  if (ts.isShorthandPropertyAssignment(m)) return m.name;
  if (ts.isSpreadAssignment(m)) return undefined;
  return m; // a method or accessor
}

// Finds `key` in an object literal: its value node, or undefined.
function prop(obj: ts.Node | undefined, key: string): ts.Node | undefined {
  for (const m of objectOf(obj)?.properties ?? []) if (memberKey(m) === key) return memberValue(m);
  return undefined;
}

// The first statement's call in a function body (or the arrow's expression body), awaits removed.
function bodyCall(fn: ts.Node): ts.CallExpression | null {
  let e: ts.Node | undefined = (fn as ts.FunctionExpression | ts.ArrowFunction).body;
  if (e && ts.isBlock(e)) {
    const s = e.statements[0];
    e = s && ts.isExpressionStatement(s) ? s.expression : undefined;
  }
  e = unwrap(e);
  if (e && ts.isAwaitExpression(e)) e = unwrap(e.expression);
  return e && ts.isCallExpression(e) ? e : null;
}

// What an onFrame hook is called: the function it passes, or the call its body makes, else the file's name.
function frameName(fn: ts.Node | undefined, file: string): string {
  const fallback = posix.basename(file).replace(/\.[jt]s$/, '');
  const u = unwrap(fn);
  if (u && ts.isIdentifier(u)) return u.text;
  if (!u || !isFn(u)) return fallback;
  const call = bodyCall(u);
  return (call && calleeName(call)) || fallback;
}

function frameOf(call: ts.CallExpression, file: string, lineOf: (n: ts.Node) => number): Frame {
  const opts = call.arguments[1];
  const read = <T>(key: string, dflt: T, get: (v: ts.Node) => T | undefined): T | null => {
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

// An import specifier as a repo path ('src/net/room.ts'), or null for packages, JSON and anything not code. Imports
// name their file as it is (`.js` or `.ts`), so the path is exact.
function resolveImport(file: string, spec: string | undefined): string | null {
  if (typeof spec !== 'string' || !spec.startsWith('.') || !/\.[jt]s$/.test(spec)) return null;
  return posix.normalize(posix.join(posix.dirname(file), spec));
}

const uniq = <T>(list: T[]): T[] => [...new Set(list)];

// A hook is core when it is outside src/features/ and sits in a range src/loop.js reserves for the core modules:
// below the feature range, or 3000 and up in 'late'. Lazy feature parts outside src/features/ use the feature range.
export const MIN_FEATURE_ORDER = -10;
export const CORE_LATE = 3000;
export const isCoreHook = (file: string, order: number | null): boolean =>
  !file.startsWith('src/features/') && typeof order === 'number' && (order < MIN_FEATURE_ORDER || order >= CORE_LATE);

// `a.b` for a member call on an identifier, else the plain callee name: 'world.step', 'renderFrame'.
function dotted(call: ts.CallExpression): string | null {
  const c = unwrap(call.expression);
  if (c && ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && ts.isIdentifier(c.name))
    return `${c.expression.text}.${c.name.text}`;
  return calleeName(call);
}

// The frame loop in main: the function handed to setAnimationLoop(fn). pre = its top-level calls before the first
// runFrame (what runs ahead of the onFrame hooks: remote poses, the physics step); render = the call after the last
// runFrame (the draw). Profiling marks are not steps. Null when it cannot be found.
const PROFILING = new Set(['beginFrame', 'endFrame', 'mark']);
function loopOf(sf: ts.SourceFile): Loop | null {
  let fnName: string | null = null;
  walk(sf, (n) => {
    if (!ts.isCallExpression(n) || calleeName(n) !== 'setAnimationLoop') return;
    const a0 = n.arguments[0];
    if (a0 && ts.isIdentifier(a0)) fnName = a0.text;
  });
  const fn = sf.statements.find(
    (n): n is ts.FunctionDeclaration => ts.isFunctionDeclaration(n) && !!fnName && n.name?.text === fnName,
  );
  if (!fn?.body) return null;
  const calls = fn.body.statements
    .map((st) => (ts.isExpressionStatement(st) ? unwrap(st.expression) : undefined))
    .map((e) => (e && ts.isAwaitExpression(e) ? unwrap(e.expression) : e))
    .filter((e): e is ts.CallExpression => !!e && ts.isCallExpression(e))
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
    owner: [],
    host: [],
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

const hasModifier = (n: ts.Node, kind: ts.SyntaxKind) =>
  ts.canHaveModifiers(n) && !!ts.getModifiers(n)?.some((m) => m.kind === kind);

const EQUALITY = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

const isTProp = (x: ts.Node) => {
  const u = unwrap(x);
  return !!u && ts.isPropertyAccessExpression(u) && u.name.text === 't';
};

export function readFile(file: string, text: string): FileRecord {
  const loc = text.split('\n').length;
  const rec = emptyRecord(file, loc);
  const kind = file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  // The parser recovers from errors; its syntax errors are only on the (internal) parseDiagnostics list.
  const bad = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics?.[0];
  if (bad) {
    rec.parseError = ts.flattenDiagnosticMessageText(bad.messageText, ' ');
    return rec;
  }
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  // The line comments before the first statement.
  rec.head = (ts.getLeadingCommentRanges(text, 0) ?? [])
    .filter((c) => c.kind === ts.SyntaxKind.SingleLineCommentTrivia)
    .map((c) => text.slice(c.pos + 2, c.end).trim())
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

  walk(sf, (n) => {
    if (ts.isImportDeclaration(n)) {
      if (!n.importClause?.isTypeOnly) imports.push(resolveImport(file, strOf(n.moduleSpecifier)));
    } else if (ts.isExportDeclaration(n)) {
      if (n.isTypeOnly) return;
      if (n.moduleSpecifier) imports.push(resolveImport(file, strOf(n.moduleSpecifier)));
      if (n.exportClause && ts.isNamedExports(n.exportClause))
        for (const s of n.exportClause.elements) if (!s.isTypeOnly) exportsList.push(s.name.text);
    } else if (ts.isExportAssignment(n)) {
      if (!n.isExportEquals) exportsList.push('default');
    } else if (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) {
      if (n.name) names.push(n.name.text);
      if (hasModifier(n, ts.SyntaxKind.ExportKeyword))
        exportsList.push(hasModifier(n, ts.SyntaxKind.DefaultKeyword) ? 'default' : (n.name?.text ?? ''));
      if (ts.isFunctionDeclaration(n) && n.name?.text === 'buildPresence' && n.body) {
        for (const st of n.body.statements) {
          if (!ts.isVariableStatement(st)) continue;
          for (const d of st.declarationList.declarations) {
            const init = objectOf(d.initializer);
            if (ts.isIdentifier(d.name) && d.name.text === 'pr' && init)
              for (const m of init.properties) {
                const k = memberKey(m);
                if (k) rec.corePresence.push(k);
              }
          }
        }
      }
    } else if (ts.isVariableStatement(n)) {
      if (hasModifier(n, ts.SyntaxKind.ExportKeyword))
        for (const d of n.declarationList.declarations) {
          if (!ts.isIdentifier(d.name)) continue;
          exportsList.push(d.name.text);
          const init = unwrap(d.initializer);
          if (d.name.text === 'PAD' && init && ts.isArrayLiteralExpression(init))
            rec.padSlots = init.elements.map(strOf).filter((s): s is string => s !== undefined);
        }
    } else if (ts.isVariableDeclaration(n)) {
      if (ts.isIdentifier(n.name)) names.push(n.name.text);
    } else if (ts.isObjectLiteralExpression(n)) {
      // Members of an object literal: a function-valued one names a function; `t: '...'` is a message type.
      for (const m of n.properties) {
        const k = memberKey(m);
        if (!k) continue;
        const v = memberValue(m);
        if (v === m || isFn(v)) names.push(k);
        if (k === 't' && ts.isPropertyAssignment(m) && strOf(m.initializer) !== undefined)
          tProps.push(strOf(m.initializer)!);
      }
    } else if (ts.isBinaryExpression(n)) {
      if (EQUALITY.has(n.operatorToken.kind)) {
        const [a, b] = [n.left, n.right];
        if (isTProp(a) && strOf(b) !== undefined) reads.push(strOf(b)!);
        else if (isTProp(b) && strOf(a) !== undefined) reads.push(strOf(a)!);
      }
    } else if (ts.isCallExpression(n)) {
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        lazy.push(resolveImport(file, strOf(n.arguments[0])));
        return;
      }
      const name = calleeName(n);
      const s0 = strOf(n.arguments[0]);
      if (name === 'send' || name === 'onMessage') sendsOrListens = true;
      if (name === 'send' && !ts.isIdentifier(unwrap(n.expression)!)) rec.memberSend = true;
      if (name === 'onMessage') rec.onMessage = true;
      else if (name === 'submitEdit') rec.submits = true;
      else if (name === 'onFrame') rec.frames.push(frameOf(n, file, lineOf));
      else if (name === 'addPresenceField' && s0 !== undefined) rec.owner.push({ key: s0, line: lineOf(n) });
      else if (name === 'addHostField' && s0 !== undefined) rec.host.push({ key: s0, line: lineOf(n) });
      else if (name === 'registerOp' && s0 !== undefined) rec.ops.push(s0);
      else if (name === 'registerState' && s0 !== undefined) rec.states.push(s0);
      else if (name === 'onTick' && strOf(n.arguments[1]) !== undefined) rec.ticks.push(strOf(n.arguments[1])!);
      else if (name === 'registerInteractable') rec.interact++;
      else if (name === 'registerAction')
        rec.actions.push({ id: s0 ?? null, pad: strOf(prop(n.arguments[1], 'pad')) ?? null, line: lineOf(n) });
      else if (isServer && ['get', 'put', 'post', 'delete', 'use'].includes(name ?? '') && s0 !== undefined) {
        const c = unwrap(n.expression);
        if (c && ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && c.expression.text === 'app')
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
