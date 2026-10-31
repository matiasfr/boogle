// Atlas fact extractor: reads src/ and server/src/ with acorn and reports what each file registers (imports, frame
// hooks, presence keys, ops, messages, actions, routes). Pure apart from listSources (reads the tree) and gitFacts
// (runs git). Never throws on bad input: a file acorn cannot parse gets a `parseError` record. Same tree and history
// give the same JSON (no timestamps). Schema: docs/plans/atlas.md, "Facts schema".
import * as acorn from 'acorn';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { dirOf } from '../../atlas/model.js';
import { git } from './git.mjs';

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
  return {
    phase: read('phase', 'update', (v) => (isStr(v) ? v.value : undefined)),
    order: read('order', 0, numberOf),
    name: frameName(call.arguments[0], file),
  };
}

function resolveImport(file, spec) {
  if (typeof spec !== 'string' || !spec.startsWith('.') || !spec.endsWith('.js')) return null;
  return posix.normalize(posix.join(posix.dirname(file), spec));
}

const uniq = (list) => [...new Set(list)];

function emptyRecord(f, loc) {
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
    ops: [],
    states: [],
    ticks: [],
    msgs: [],
    onMessage: false,
    submits: false,
    actions: [],
    interact: 0,
    routes: [],
  };
}

export function extractFile(file, text) {
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
  const owner = [];
  const host = [];
  const ops = [];
  const states = [];
  const ticks = [];
  const actions = [];
  const routes = [];
  const msgCandidates = [];
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
            for (const v of d.declarations) if (v.id.type === 'Identifier') exportsList.push(v.id.name);
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
      case 'ClassDeclaration':
        if (n.id) names.push(n.id.name);
        break;
      case 'VariableDeclarator':
        if (n.id.type === 'Identifier') names.push(n.id.name);
        break;
      case 'Property': {
        const k = propKey(n);
        if (k && isFn(n.value)) names.push(k);
        if (k === 't' && isStr(n.value)) msgCandidates.push(n.value.value);
        break;
      }
      case 'BinaryExpression':
        if (['===', '!==', '==', '!='].includes(n.operator)) {
          const [a, b] = [n.left, n.right];
          const member = (x) => x.type === 'MemberExpression' && !x.computed && x.property.name === 't';
          const unchain = (x) => (x.type === 'ChainExpression' ? x.expression : x);
          if (member(unchain(a)) && isStr(b)) msgCandidates.push(b.value);
          else if (member(unchain(b)) && isStr(a)) msgCandidates.push(a.value);
        }
        break;
      case 'CallExpression': {
        const name = calleeName(n);
        const a0 = n.arguments[0];
        if (name === 'send' || name === 'onMessage') sendsOrListens = true;
        if (name === 'onMessage') rec.onMessage = true;
        else if (name === 'submitEdit') rec.submits = true;
        else if (name === 'onFrame') rec.frames.push(frameOf(n, file));
        else if (name === 'addPresenceField' && isStr(a0)) owner.push(a0.value);
        else if (name === 'addHostField' && isStr(a0)) host.push(a0.value);
        else if (name === 'registerOp' && isStr(a0)) ops.push(a0.value);
        else if (name === 'registerState' && isStr(a0)) states.push(a0.value);
        else if (name === 'onTick' && isStr(n.arguments[1])) ticks.push(n.arguments[1].value);
        else if (name === 'registerInteractable') rec.interact++;
        else if (name === 'registerAction' && isStr(a0)) actions.push(a0.value);
        else if (
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
  rec.owner = uniq(owner);
  rec.host = uniq(host);
  rec.ops = uniq(ops);
  rec.states = uniq(states);
  rec.ticks = uniq(ticks);
  rec.msgs = sendsOrListens ? uniq(msgCandidates) : [];
  rec.actions = uniq(actions);
  rec.routes = uniq(routes);
  return rec;
}

// Every .js file under src/ and server/src/, as posix paths sorted with localeCompare.
export function listSources(root) {
  const out = [];
  for (const dir of ['src', 'server/src']) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const rel of fs.readdirSync(abs, { recursive: true })) {
      const p = posix.join(dir, String(rel).split(path.sep).join('/'));
      if (!p.endsWith('.js')) continue;
      if (!fs.statSync(path.join(root, p)).isFile()) continue;
      out.push(p);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

// { head, commits, first } (the short sha, the commit count and the date of the first commit), or null when this is
// not a git checkout. Never throws. A shallow clone has no usable history, so it reports only the head.
export function gitFacts(root) {
  try {
    git(root, 'rev-parse', '--git-dir');
    const head = git(root, 'rev-parse', '--short', 'HEAD');
    if (git(root, 'rev-parse', '--is-shallow-repository') === 'true') return { head, commits: null, first: null };
    const commits = Number(git(root, 'rev-list', '--count', 'HEAD'));
    const rootSha = git(root, 'rev-list', '--max-parents=0', 'HEAD').split('\n').pop();
    const first = git(root, 'log', '-1', '--format=%cI', rootSha);
    return { head, commits, first };
  } catch {
    return null;
  }
}

// extractFacts({ root, git, sources }): sources ([{ path, text }]) replaces reading the tree, for tests.
export function extractFacts({ root = process.cwd(), git: withGit = true, sources } = {}) {
  const src = sources ?? listSources(root).map((p) => ({ path: p, text: fs.readFileSync(path.join(root, p), 'utf8') }));
  const files = src.map((s) => extractFile(s.path, s.text)).sort((a, b) => a.f.localeCompare(b.f));
  return { schema: 1, git: withGit ? gitFacts(root) : null, files };
}

// The facts as they were at a git ref, for `npm run atlas -- --changes`: the ref's src/ and server/src/ unpacked with
// one `git archive` into a temp dir (as baseTree in dev/registry/check.mjs does), then read like the working tree.
export function factsAt(root, ref) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-atlas-'));
  try {
    const tar = execFileSync('git', ['archive', ref, 'src', 'server/src'], { cwd: root, maxBuffer: 1 << 28 });
    execFileSync('tar', ['-x', '-C', dir], { input: tar });
    return extractFacts({ root: dir, git: false });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// The kinds of key diffFacts compares: each is a list of names on a file record.
const KEY_KINDS = ['ops', 'states', 'owner', 'host', 'msgs', 'actions', 'routes'];

// What changed between two facts objects: files and folders added or removed, and keys added or removed per kind.
export function diffFacts(before, after) {
  const paths = (facts) => new Set(facts.files.map((f) => f.f));
  const [pb, pa] = [paths(before), paths(after)];
  const only = (a, b) => [...a].filter((x) => !b.has(x)).sort();
  const folders = (set) => new Set([...set].map(dirOf));
  const keys = {};
  for (const kind of KEY_KINDS) {
    const [kb, ka] = [new Set(before.files.flatMap((f) => f[kind])), new Set(after.files.flatMap((f) => f[kind]))];
    const added = only(ka, kb);
    const removed = only(kb, ka);
    if (added.length || removed.length) keys[kind] = { added, removed };
  }
  return {
    filesAdded: only(pa, pb),
    filesRemoved: only(pb, pa),
    foldersAdded: only(folders(pa), folders(pb)),
    foldersRemoved: only(folders(pb), folders(pa)),
    keys,
  };
}
