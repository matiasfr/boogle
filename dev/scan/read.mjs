// The one acorn reader of src/ and server/src/, shared by the atlas (dev/atlas/extract.mjs) and the registry check
// (dev/registry/scan.mjs). readFile(path, text) returns what a file registers as a raw record: names with line
// numbers, `sends` apart from `reads`, literal-order flags. Each caller projects it into its own shape. Pure; never
// throws: a file acorn cannot parse gets a `parseError`. Needs acorn (a devDependency): not for `atlas --gate`.
import * as acorn from 'acorn';
import path from 'node:path';

const posix = path.posix;

// Depth-first walk over every AST node. `fn(node)` runs before the children.
function walk(node, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) walk(c, fn);
    else if (v && typeof v === 'object') walk(v, fn);
  }
}

const isStr = (n) => n?.type === 'Literal' && typeof n.value === 'string';
const isFn = (n) => n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression';

// Name of a call's callee: `f(...)` gives 'f', `a.b?.f(...)` gives 'f'. Null for anything else.
function calleeName(call) {
  let c = call.callee;
  if (c?.type === 'ChainExpression') c = c.expression;
  if (c?.type === 'Identifier') return c.name;
  if (c?.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') return c.property.name;
  return null;
}

// A number literal, with an optional leading sign (`-280` is a UnaryExpression). Undefined when it is not one.
function numberOf(n) {
  if (n?.type === 'Literal' && typeof n.value === 'number') return n.value;
  if (n?.type === 'UnaryExpression' && (n.operator === '-' || n.operator === '+')) {
    const v = numberOf(n.argument);
    if (v !== undefined) return n.operator === '-' ? -v : v;
  }
  return undefined;
}

function propKey(p) {
  if (p.computed) return null;
  if (p.key.type === 'Identifier') return p.key.name;
  if (p.key.type === 'Literal') return String(p.key.value);
  return null;
}

// Finds `key` in an object literal: its value node, or undefined.
function prop(obj, key) {
  if (obj?.type !== 'ObjectExpression') return undefined;
  for (const p of obj.properties) if (p.type === 'Property' && propKey(p) === key) return p.value;
  return undefined;
}

// What an onFrame hook is called: the function it passes, or the call its body makes, else the file's name.
function frameName(fn, file) {
  const fallback = posix.basename(file, '.js');
  if (fn?.type === 'Identifier') return fn.name;
  if (!isFn(fn)) return fallback;
  let e = fn.body;
  if (e.type === 'BlockStatement') {
    const s = e.body[0];
    e = s?.type === 'ExpressionStatement' ? s.expression : null;
  }
  if (e?.type === 'ChainExpression') e = e.expression;
  if (e?.type === 'AwaitExpression') e = e.argument;
  return (e?.type === 'CallExpression' && calleeName(e)) || fallback;
}

function frameOf(call, file) {
  const opts = call.arguments[1];
  const read = (key, dflt, get) => {
    if (opts === undefined) return dflt;
    const v = prop(opts, key);
    if (v === undefined) return opts.type === 'ObjectExpression' ? dflt : null;
    return get(v) ?? null;
  };
  const order = read('order', 0, numberOf);
  return {
    phase: read('phase', 'update', (v) => (isStr(v) ? v.value : undefined)),
    order,
    explicit: Number.isInteger(prop(opts, 'order') && numberOf(prop(opts, 'order'))),
    name: frameName(call.arguments[0], file),
    line: call.loc.start.line,
  };
}

function resolveImport(file, spec) {
  if (typeof spec !== 'string' || !spec.startsWith('.') || !spec.endsWith('.js')) return null;
  return posix.normalize(posix.join(posix.dirname(file), spec));
}

const uniq = (list) => [...new Set(list)];

// A hook is core when it is outside src/features/ and sits in a range src/loop.js reserves for the core modules:
// below the feature range, or 3000 and up in 'late'. Lazy feature parts outside src/features/ use the feature range.
export const MIN_FEATURE_ORDER = -10;
export const CORE_LATE = 3000;
export const isCoreHook = (file, order) =>
  !file.startsWith('src/features/') && typeof order === 'number' && (order < MIN_FEATURE_ORDER || order >= CORE_LATE);

// `a.b` for a member call on an identifier, else the plain callee name: 'world.step', 'renderFrame'.
function dotted(call) {
  let c = call.callee;
  if (c?.type === 'ChainExpression') c = c.expression;
  if (
    c?.type === 'MemberExpression' &&
    !c.computed &&
    c.object.type === 'Identifier' &&
    c.property.type === 'Identifier'
  )
    return `${c.object.name}.${c.property.name}`;
  return calleeName(call);
}

// The frame loop in main.js: the function handed to setAnimationLoop(fn). pre = its top-level calls up to and
// including world.step; render = its last top-level call. Null when it cannot be found.
function loopOf(ast) {
  let fnName = null;
  walk(ast, (n) => {
    if (n.type === 'CallExpression' && calleeName(n) === 'setAnimationLoop' && n.arguments[0]?.type === 'Identifier')
      fnName = n.arguments[0].name;
  });
  const fn = fnName && ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id?.name === fnName);
  if (!fn) return null;
  const calls = fn.body.body
    .map((st) => (st.type === 'ExpressionStatement' ? st.expression : null))
    .map((e) => (e?.type === 'AwaitExpression' ? e.argument : e))
    .filter((e) => e?.type === 'CallExpression')
    .map(dotted);
  const at = calls.indexOf('world.step');
  if (at < 0) return null;
  return { pre: calls.slice(0, at + 1), render: calls.length > at + 1 ? calls.at(-1) : null };
}

function emptyRecord(f, loc) {
  return {
    f,
    loc,
    head: '',
    imports: [],
    lazy: [],
    exports: [],
    names: [],
    frames: [], // { phase, order, explicit, name, line }: explicit is true when order is an integer literal
    owner: [], // { key, line }: addPresenceField
    host: [], // { key, line }: addHostField
    corePresence: [], // keys of the object buildPresence() builds
    ops: [],
    states: [],
    ticks: [],
    sends: [], // message types in `t: '...'` of a file that calls .send(
    reads: [], // message types compared with `.t`, in a file that calls send or onMessage
    memberSend: false,
    onMessage: false,
    submits: false,
    actions: [], // { id, pad, line }: id and pad are string literals or null
    padSlots: [], // the strings of `export const PAD = [...]`
    interact: 0,
    routes: [],
    loop: null,
  };
}

export function readFile(file, text) {
  const loc = text.split('\n').length;
  const rec = emptyRecord(file, loc);
  const comments = [];
  let ast;
  try {
    ast = acorn.parse(text, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      onComment: (block, value, start, end) => comments.push({ block, value, start, end }),
    });
  } catch (err) {
    rec.parseError = String(err?.message ?? err);
    return rec;
  }

  const first = ast.body[0]?.start ?? Infinity;
  rec.head = comments
    .filter((c) => !c.block && c.end <= first)
    .map((c) => c.value.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 260);

  const imports = [];
  const lazy = [];
  const exportsList = [];
  const names = [];
  const routes = [];
  const tProps = [];
  const reads = [];
  const isServer = file.startsWith('server/');
  let sendsOrListens = false;

  walk(ast, (n) => {
    switch (n.type) {
      case 'ImportDeclaration':
      case 'ExportAllDeclaration':
        imports.push(resolveImport(file, n.source?.value));
        break;
      case 'ExportNamedDeclaration':
        if (n.source) imports.push(resolveImport(file, n.source.value));
        if (n.declaration) {
          const d = n.declaration;
          if (d.id) exportsList.push(d.id.name);
          else if (d.declarations)
            for (const v of d.declarations) {
              if (v.id.type === 'Identifier') exportsList.push(v.id.name);
              if (v.id.name === 'PAD' && v.init?.type === 'ArrayExpression')
                rec.padSlots = v.init.elements.filter(isStr).map((e) => e.value);
            }
        }
        for (const s of n.specifiers) exportsList.push(s.exported.name ?? s.exported.value);
        break;
      case 'ExportDefaultDeclaration':
        exportsList.push('default');
        break;
      case 'ImportExpression':
        if (isStr(n.source)) lazy.push(resolveImport(file, n.source.value));
        break;
      case 'FunctionDeclaration':
        if (n.id) names.push(n.id.name);
        if (n.id?.name === 'buildPresence') {
          for (const st of n.body.body) {
            if (st.type !== 'VariableDeclaration') continue;
            for (const d of st.declarations) {
              if (d.id.name === 'pr' && d.init?.type === 'ObjectExpression')
                for (const p of d.init.properties)
                  if (p.type === 'Property' && propKey(p)) rec.corePresence.push(propKey(p));
            }
          }
        }
        break;
      case 'ClassDeclaration':
        if (n.id) names.push(n.id.name);
        break;
      case 'VariableDeclarator':
        if (n.id.type === 'Identifier') names.push(n.id.name);
        break;
      case 'Property': {
        const k = propKey(n);
        if (k && isFn(n.value)) names.push(k);
        if (k === 't' && isStr(n.value)) tProps.push(n.value.value);
        break;
      }
      case 'BinaryExpression':
        if (['===', '!==', '==', '!='].includes(n.operator)) {
          const [a, b] = [n.left, n.right];
          const member = (x) => x.type === 'MemberExpression' && !x.computed && x.property.name === 't';
          const unchain = (x) => (x.type === 'ChainExpression' ? x.expression : x);
          if (member(unchain(a)) && isStr(b)) reads.push(b.value);
          else if (member(unchain(b)) && isStr(a)) reads.push(a.value);
        }
        break;
      case 'CallExpression': {
        const name = calleeName(n);
        const a0 = n.arguments[0];
        if (name === 'send' || name === 'onMessage') sendsOrListens = true;
        if (name === 'send' && n.callee.type !== 'Identifier') rec.memberSend = true;
        if (name === 'onMessage') rec.onMessage = true;
        else if (name === 'submitEdit') rec.submits = true;
        else if (name === 'onFrame') rec.frames.push(frameOf(n, file));
        else if (name === 'addPresenceField' && isStr(a0)) rec.owner.push({ key: a0.value, line: n.loc.start.line });
        else if (name === 'addHostField' && isStr(a0)) rec.host.push({ key: a0.value, line: n.loc.start.line });
        else if (name === 'registerOp' && isStr(a0)) rec.ops.push(a0.value);
        else if (name === 'registerState' && isStr(a0)) rec.states.push(a0.value);
        else if (name === 'onTick' && isStr(n.arguments[1])) rec.ticks.push(n.arguments[1].value);
        else if (name === 'registerInteractable') rec.interact++;
        else if (name === 'registerAction') {
          const pad = prop(n.arguments[1], 'pad');
          rec.actions.push({
            id: isStr(a0) ? a0.value : null,
            pad: isStr(pad) ? pad.value : null,
            line: n.loc.start.line,
          });
        } else if (
          isServer &&
          ['get', 'put', 'post', 'delete', 'use'].includes(name) &&
          n.callee.type === 'MemberExpression' &&
          n.callee.object.type === 'Identifier' &&
          n.callee.object.name === 'app' &&
          isStr(a0)
        ) {
          routes.push(`${name.toUpperCase()} ${a0.value}`);
        }
        break;
      }
      default:
    }
  });

  rec.imports = uniq(imports.filter(Boolean));
  rec.lazy = uniq(lazy.filter(Boolean));
  rec.exports = uniq(exportsList);
  rec.names = uniq(names);
  rec.ops = uniq(rec.ops);
  rec.states = uniq(rec.states);
  rec.ticks = uniq(rec.ticks);
  rec.sends = rec.memberSend ? uniq(tProps) : [];
  rec.reads = sendsOrListens ? uniq(reads) : [];
  rec.routes = uniq(routes);
  rec.loop = loopOf(ast);
  return rec;
}
