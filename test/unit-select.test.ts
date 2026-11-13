// Review of CI diet Batch 2: which unit tests a ship's CI runs (dev/ci/unit-select.ts). Lockstep and review-path ships
// keep the full suite (owner, 11 November: "lockstep ships can keep the unit suite for now"); a ship that touches
// neither runs the tests that import a changed file plus the core, and nothing may leave it with an empty selection.
// Reads the repository's files only; spawns nothing but the classifier's own CLI.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseSync, type Node } from 'oxc-parser';
import { CORE_TESTS, FULL_ON, UNFOLLOWED, createWalker, unitPlan, unitTests } from '../dev/ci/unit-select.ts';
import { isMetaUrl, literal, walk } from '../dev/scan/parse.ts';
import { REVIEW_PATHS } from '../dev/review-stamp.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const plan = (...files: string[]) => unitPlan(files, ROOT);

test('every review path, and what every test shares, takes the full suite', () => {
  for (const p of REVIEW_PATHS) assert.ok(FULL_ON.includes(`${p}/`), p);
  for (const f of [
    'src/sim/railway.ts',
    'src/net/ws-wire.ts',
    'src/world/sync.ts',
    'src/ecs/world.ts',
    'server/src/server.ts',
  ])
    assert.equal(plan(f).full, true, f);
  for (const f of [
    'test/helpers/rail.ts',
    'dev/test-env.ts',
    'package-lock.json',
    'tsconfig.json',
    '.github/workflows/ci.yml',
  ])
    assert.equal(plan(f).full, true, f);
});

test('an empty diff, a deleted file and a test that asserts lockstep code are full too', () => {
  assert.equal(plan().full, true);
  assert.equal(plan('src/features/gone-for-good.ts').full, true);
  assert.equal(plan('test/railway-ops.test.ts').full, true, 'it reaches src/sim');
});

test('a client-only change runs the tests that import it plus the core, not the suite', () => {
  const p = plan('src/features/ambience.ts');
  assert.equal(p.full, false);
  if (p.full) return;
  for (const t of CORE_TESTS) assert.ok(p.tests.includes(t), `core ${t}`);
  assert.ok(p.tests.length < 40, `${p.tests.length} tests`);
  const importers = fs
    .globSync('test/**/*.test.ts', { cwd: ROOT })
    .filter((t) => /features\/ambience/.test(fs.readFileSync(`${ROOT}/${t}`, 'utf8')));
  for (const t of importers) assert.ok(p.tests.includes(t.split(path.sep).join('/')), `importer ${t}`);
});

test('the core is real, unique and always selected, even for a tool nothing imports', () => {
  assert.equal(new Set(CORE_TESTS).size, CORE_TESTS.length);
  for (const t of CORE_TESTS) assert.ok(fs.existsSync(`${ROOT}/${t}`), t);
  const p = plan('dev/heartbeat.sh');
  assert.deepEqual(p.full ? [] : p.tests, [...CORE_TESTS].sort());
});

test('CLI prints the CI outputs; main and an empty diff are full', () => {
  const run = (input: string) =>
    execFileSync(process.execPath, ['dev/ci/unit-select.ts'], {
      cwd: ROOT,
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  assert.equal(run(''), 'unit_full=true\nunit_shards=[1,2,3,4,5,6,7,8]\nunit_only=\n');
  assert.equal(run('src/sim/railway.ts\n'), 'unit_full=true\nunit_shards=[1,2,3,4,5,6,7,8]\nunit_only=\n');
  const lines = run('dev/heartbeat.sh\n').trimEnd().split('\n');
  assert.deepEqual(lines.slice(0, 2), ['unit_full=false', 'unit_shards=[1]']);
  assert.match(lines[2]!, /^unit_only=test\/\S+\.test\.ts( test\/\S+\.test\.ts)*$/);
});

test('--ship refuses to run with no selection', () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, ['dev/test-unit.ts', '--ship'], {
        cwd: ROOT,
        env: { ...process.env, UNIT_ONLY: '' },
        stdio: 'pipe',
      }),
    /status 1|Command failed/,
  );
});

// The guard (P1 of the Batch 2 review): every load in every test's closure is one the walk follows or one UNFOLLOWED
// lists. The parser finds each load site; a literal target must be in the closure, and a site with no literal target
// must be listed: a computed import or URL, a worker, a child process running node or npm, an esbuild bundle, a source
// evaluated by dev/level/source.ts, import.meta.glob, Node's module hooks. A child process running another program
// (git) loads no repo file. Sites are counted per `<file>: <call>`, and the count must match the entry's `count`
// (default 1): a second unlisted load of a listed kind in a listed file fails, and so does a listed one that went.
//
// An fs read (FS_READS, imported from node:fs or node:fs/promises) is a load when its path is built into a repo source
// path: the path argument, with the file's own variable bindings substituted, has a literal segment naming src, dev,
// server, protos or test/fixtures after nothing but bases (ROOT, a parameter: any expression the guard cannot read)
// and ./ or ../. So `join(ROOT, 'src', name)`, `${ROOT}/dev/${f}` and `const DIR = join(ROOT, 'src/x'); readdirSync(DIR)`
// count; `join(tmp, 'src')` with tmp from mkdtemp or tmpdir, `ROOT + 'docs/src'`, 'assets/src' and a URL (the URL
// rules above) do not. A fully literal path, a glob included, passes when the walk has every file it names; any other
// must be listed. Files that only core tests reach are exempt: a ship always runs those. Not traced: a path that
// reaches a read through a function parameter (`read(`src/${f}`)` into `readFileSync(path.join(ROOT, f))`).
const CHILD = new Set(['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec', 'execSync', 'fork']);
const BUNDLE = new Set(['build', 'buildSync', 'context']);
const SOURCE = new Set(['sourceFunction', 'sourceModule']);
const FS_READS = new Set([
  'readFileSync',
  'readdirSync',
  'statSync',
  'lstatSync',
  'existsSync',
  'globSync',
  'readFile',
  'readdir',
  'stat',
  'lstat',
  'glob',
]);
const RUNNERS = /^(?:node|npm|npx|tsx)(?:\s|$)/;
const namesOf = (kind: string | undefined) =>
  kind === 'child' ? CHILD : kind === 'bundle' ? BUNDLE : kind === 'read' ? FS_READS : SOURCE;
/** What a call loads, by where its callee was imported from: `child`, `bundle`, `source`, `read` or nothing. Local
 * names and namespaces both: `import { spawnSync as run }`, `import * as cp`, `import esbuild from 'esbuild'`,
 * `fs.promises.readFile`, `import { promises as fsp } from 'node:fs'`. */
function importedKinds(program: Node) {
  const named = new Map<string, string>();
  const spaces = new Map<string, string>();
  walk(program, (n) => {
    if (n.type !== 'ImportDeclaration' || n.importKind === 'type') return;
    const from = n.source.value;
    const kind = /^(?:node:)?child_process$/.test(from)
      ? 'child'
      : from === 'esbuild'
        ? 'bundle'
        : /(?:^|\/)level\/source\.ts$/.test(from)
          ? 'source'
          : /^(?:node:)?fs(?:\/promises)?$/.test(from)
            ? 'read'
            : undefined;
    if (!kind) return;
    const names = namesOf(kind);
    for (const sp of n.specifiers) {
      if (sp.type === 'ImportSpecifier') {
        const imported = sp.imported.type === 'Identifier' ? sp.imported.name : String(sp.imported.value);
        if (names.has(imported)) named.set(sp.local.name, `${kind}:${imported}`);
        else if (kind === 'read' && imported === 'promises') spaces.set(sp.local.name, kind);
      } else spaces.set(sp.local.name, kind);
    }
  });
  return (callee: Node): { kind: string; name: string } | undefined => {
    if (callee.type === 'Identifier') {
      const v = named.get(callee.name);
      return v ? { kind: v.slice(0, v.indexOf(':')), name: v.slice(v.indexOf(':') + 1) } : undefined;
    }
    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
      let object = callee.object as Node;
      // fs.promises.readFile: the promises member of an fs namespace.
      if (
        object.type === 'MemberExpression' &&
        object.property.type === 'Identifier' &&
        object.property.name === 'promises'
      )
        object = object.object as Node;
      if (object.type !== 'Identifier') return undefined;
      const kind = spaces.get(object.name);
      const name = callee.property.name;
      if (kind && namesOf(kind).has(name)) return { kind, name };
    }
    return undefined;
  };
}

function strings(node: Node | undefined, out: string[] = []): string[] {
  if (!node) return out;
  walk(node, (n) => {
    const s = literal(n);
    if (s !== undefined) out.push(s);
  });
  return out;
}
const calleeName = (n: Node): string =>
  n.type === 'Identifier'
    ? n.name
    : n.type === 'MemberExpression' && n.property.type === 'Identifier'
      ? n.property.name
      : '';
/** The repo file or folder a literal names, from the file's folder (./, ../) or the root; undefined if none exists. */
function target(file: string, spec: string): string | undefined {
  const s = spec.replace(/[?#].*$/, '');
  const tries = /^\.{1,2}\//.test(s) ? [path.posix.join(path.posix.dirname(file), s)] : [];
  if (/^(?:\.\/)?[A-Za-z][\w.-]*\//.test(s)) tries.push(s.replace(/^\.\//, ''));
  for (const t of tries.map((t) => path.posix.normalize(t)))
    if (!t.startsWith('..') && fs.existsSync(`${ROOT}/${t}`)) return t;
  return undefined;
}

// A path built for an fs read, as parts: literal text, BASE (an expression the guard cannot read: ROOT, a parameter),
// TEMP (mkdtemp, tmpdir: never the repo) or URL_PART (left to the URL rules).
const BASE = '\0';
const TEMP = '\x01';
const URL_PART = '\x02';
const PATH_JOIN = new Set(['join', 'resolve']);
const PASS_THROUGH = new Set(['fileURLToPath', 'normalize', 'String']);
const TEMP_CALLS = new Set(['mkdtempSync', 'mkdtemp', 'tmpdir']);
const SOURCE_ROOTS = new Set(['src', 'dev', 'server', 'protos']);

/** A file's variable initializers by name (every one, for a name bound in several scopes). */
function bindings(program: Node) {
  const inits = new Map<string, Node[]>();
  walk(program, (n) => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init)
      inits.set(n.id.name, [...(inits.get(n.id.name) ?? []), n.init as Node]);
  });
  return inits;
}

/** The parts of a path expression, its identifiers replaced by their initializers a few levels deep. */
function pathParts(node: Node | undefined, inits: Map<string, Node[]>, depth = 0): string[] {
  if (!node) return [BASE];
  const s = literal(node);
  if (s !== undefined) return [s];
  const deeper = (n: Node | undefined) => pathParts(n, inits, depth + 1);
  switch (node.type) {
    case 'TemplateLiteral':
      return node.quasis.flatMap((q, i) => [
        q.value.cooked ?? '',
        ...(i < node.expressions.length ? deeper(node.expressions[i] as Node) : []),
      ]);
    case 'BinaryExpression':
      return node.operator === '+' ? [...deeper(node.left as Node), ...deeper(node.right as Node)] : [BASE];
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'ParenthesizedExpression':
      return deeper(node.expression as Node);
    case 'NewExpression':
      return node.callee.type === 'Identifier' && node.callee.name === 'URL' ? [URL_PART] : [BASE];
    case 'CallExpression': {
      const name = calleeName(node.callee as Node);
      const args = node.arguments as Node[];
      if (TEMP_CALLS.has(name)) return [TEMP];
      if (PASS_THROUGH.has(name)) return deeper(args[0]);
      if (PATH_JOIN.has(name)) return args.flatMap((a, i) => [...(i ? ['/'] : []), ...deeper(a)]);
      return [BASE];
    }
    case 'Identifier': {
      const options = (depth < 6 ? (inits.get(node.name) ?? []) : []).map((n) => deeper(n));
      // A name bound in several scopes: a binding that reaches a source path wins.
      return options.find((p) => sourceTail(p) !== undefined) ?? options[0] ?? [BASE];
    }
    default:
      return [BASE];
  }
}

/** The repo source path a built path names, from its source-root segment (`src/x/<BASE>`); undefined unless such a
 * segment follows nothing but bases, ./ and ../, or when the path is a temp dir's or a URL. */
function sourceTail(parts: readonly string[]): string | undefined {
  const joined = parts.join('');
  if (joined.includes(TEMP) || joined.includes(URL_PART)) return undefined;
  const segs = joined.split(/[\\/]/);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]!;
    if (SOURCE_ROOTS.has(seg) || (seg === 'test' && segs[i + 1] === 'fixtures')) return segs.slice(i).join('/');
    if (seg !== '' && seg !== '.' && seg !== '..' && seg !== BASE) return undefined;
  }
  return undefined;
}

/** True when a fully literal source path (a file, a folder or a glob) reads only files the walk has for this file. */
function readFollowed(tail: string, direct: Set<string>): boolean {
  if (tail.includes(BASE)) return false;
  const rel = path.posix.normalize(tail).replace(/\/$/, '');
  const abs = (f: string) => `${ROOT}/${f}`;
  let files: string[];
  if (/[*?{[]/.test(rel)) files = fs.globSync(rel, { cwd: ROOT }).map((f) => f.split(path.sep).join('/'));
  else if (!fs.existsSync(abs(rel)))
    return true; // reads nothing: an existsSync probe of a missing path
  else if (fs.statSync(abs(rel)).isFile()) files = [rel];
  else files = fs.readdirSync(abs(rel)).map((f) => `${rel}/${f}`);
  return files.filter((f) => fs.statSync(abs(f)).isFile()).every((f) => direct.has(f));
}

/** Load sites no walk follows, counted by `<file>: <call>`, and literal targets the walk missed. */
type Sites = { unfollowed: Map<string, number>; missed: string[] };
const newSites = (): Sites => ({ unfollowed: new Map(), missed: [] });
/** Load sites in one file. A literal file target must be one of the walker's direct loads of that file; a folder URL
 * (below the root) must have every file in it there. `core`: only core tests reach the file, so its fs reads pass. */
function loadSites(file: string, src: string, direct: Set<string>, sites: Sites, core = false) {
  const unfollowed = (call: string) => {
    const key = `${file}: ${call}`;
    sites.unfollowed.set(key, (sites.unfollowed.get(key) ?? 0) + 1);
  };
  const check = (spec: string, folders = false) => {
    const t = target(file, spec);
    if (t === undefined || t.split('/').includes('node_modules')) return false;
    if (fs.statSync(`${ROOT}/${t}`).isFile()) {
      if (!direct.has(t)) sites.missed.push(`${file} loads ${spec}`);
      return true;
    }
    if (!folders || t === '.' || t === './') return false;
    for (const d of fs.readdirSync(`${ROOT}/${t}`, { withFileTypes: true }))
      if (d.isFile() && !direct.has(path.posix.join(t, d.name))) sites.missed.push(`${file} reads ${spec} (${d.name})`);
    return true;
  };
  const followed = (args: readonly Node[]) => {
    const found = args.flatMap((a) => strings(a)).map((s) => check(s));
    return found.some(Boolean);
  };
  const program = parseSync(file, src, { lang: 'ts' }).program;
  const kindOf = importedKinds(program);
  let inits: Map<string, Node[]> | undefined; // read on the first fs call
  walk(program, (n: Node) => {
    if (n.type === 'ImportDeclaration' && n.importKind !== 'type' && n.source.value.startsWith('.'))
      check(n.source.value);
    else if (n.type === 'ImportExpression') {
      const s = literal(n.source);
      if (s === undefined) unfollowed('import');
      else if (s.startsWith('.')) check(s);
    } else if (n.type === 'NewExpression' && n.callee.type === 'Identifier') {
      if (n.callee.name === 'URL' && isMetaUrl(n.arguments[1] as Node | undefined)) {
        const first = n.arguments[0] as Node | undefined;
        const s = literal(first);
        // A computed URL under a literal folder (`../src/sim/${f}`) is that folder; under the root it is unfollowed.
        const head = first?.type === 'TemplateLiteral' ? (first.quasis[0]!.value.cooked ?? '') : '';
        const folder = head.includes('/') ? head.slice(0, head.lastIndexOf('/') + 1) : '';
        if (s !== undefined) check(s, true);
        else if (!folder || !check(folder, true)) unfollowed('new URL');
      }
      if (n.callee.name === 'Worker' && !followed(n.arguments as Node[])) unfollowed('new Worker');
    } else if (n.type === 'CallExpression') {
      const name = calleeName(n.callee as Node);
      const args = n.arguments as Node[];
      if (n.callee.type === 'MemberExpression' && n.callee.object.type === 'MetaProperty' && name === 'glob') {
        const first = args[0];
        const patterns = first?.type === 'ArrayExpression' ? (first.elements as Node[]).map(literal) : [literal(first)];
        if (patterns.some((p) => p === undefined)) return void unfollowed('import.meta.glob');
        for (const s of patterns as string[]) {
          if (s.startsWith('!')) continue;
          const cwd = s.startsWith('/') ? ROOT : path.join(ROOT, path.dirname(file));
          for (const f of fs.globSync(s.replace(/^\//, ''), { cwd })) {
            const rel = f.split(path.sep).join('/');
            check(s.startsWith('/') ? rel : `./${rel}`);
          }
        }
        return;
      }
      if (name === 'registerHooks') return void unfollowed('registerHooks');
      const call = kindOf(n.callee as Node);
      if (!call) return;
      if (call.kind === 'read') {
        if (core) return;
        const tail = sourceTail(pathParts(args[0], (inits ??= bindings(program))));
        if (tail !== undefined && !readFollowed(tail, direct)) unfollowed(call.name);
      } else if (call.kind !== 'child') {
        if (!followed(args)) unfollowed(call.name);
      } else {
        if (followed(args)) return;
        const name = call.name;
        const command = literal(args[0]);
        const runsNode =
          name === 'fork' ||
          (command === undefined ? !(args[0]?.type === 'Identifier' && args[0].name === 'git') : RUNNERS.test(command));
        if (runsNode) unfollowed(name);
      }
    }
  });
}

/** Sites against a table: more of a kind than listed is unknown, fewer (none included) is stale. */
function against(sites: Sites, table: typeof UNFOLLOWED = UNFOLLOWED) {
  const listed = (k: string) => (k in table ? (table[k]!.count ?? 1) : 0);
  const unknown = [...sites.unfollowed]
    .filter(([k, n]) => n > listed(k))
    .map(([k, n]) => (listed(k) ? `${k} (${n} sites, ${listed(k)} listed)` : k));
  const stale = Object.keys(table)
    .filter((k) => (sites.unfollowed.get(k) ?? 0) < listed(k))
    .map((k) => (sites.unfollowed.has(k) ? `${k} (${sites.unfollowed.get(k)} sites, ${listed(k)} listed)` : k));
  return { unknown, stale };
}

test('every load in every test closure is followed by the walk or listed in UNFOLLOWED', () => {
  const walker = createWalker(ROOT);
  const reach = new Map<string, string[]>(); // file -> tests whose closure holds it
  for (const t of unitTests(ROOT)) for (const f of walker.closure([t])) reach.set(f, [...(reach.get(f) ?? []), t]);
  assert.ok(reach.size > 1000, `the walk reached only ${reach.size} files`);
  const sites = newSites();
  const core = new Set<string>(CORE_TESTS);
  for (const [f, tests] of reach)
    if (/\.[mc]?ts$/.test(f) && !f.endsWith('.d.ts')) {
      const onlyCore = tests.every((t) => core.has(t));
      loadSites(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), new Set(walker.loads(f)), sites, onlyCore);
    }
  const { unknown, stale } = against(sites);
  assert.deepEqual(sites.missed, [], 'dev/ci/unit-select.ts createWalker() misses these');
  assert.deepEqual(unknown, [], 'make the walk follow these, or list them in UNFOLLOWED with what they reach');
  assert.deepEqual(stale, [], 'these listed loads are gone: drop them from UNFOLLOWED or lower its count');
  for (const [key, { reaches, why, count }] of Object.entries(UNFOLLOWED)) {
    assert.ok(why.length > 10, `${key}: say what covers it`);
    assert.ok(count === undefined || (Number.isInteger(count) && count > 1), `${key}: count is 2 or more, or left out`);
    for (const r of reaches) assert.ok(fs.existsSync(`${ROOT}/${r}`), `${key}: ${r} is gone`);
  }
});

test('the guard flags each kind of load it cannot see followed, and not a git call', () => {
  const sites = newSites();
  const src = [
    "import { execFileSync as run, spawnSync } from 'node:child_process';",
    "import * as esbuild from 'esbuild';",
    "import { sourceModule } from '../dev/level/source.ts';",
    'run(process.execPath, [script]);',
    "spawnSync('git', ['status']);",
    "spawnSync('npm', ['run', name]);",
    'await esbuild.build({ entryPoints: [entry] });',
    'sourceModule(text, {});',
    'await import(name);',
    'new URL(`../${f}`, import.meta.url);',
    'new URL(`../src/sim/${f}`, import.meta.url);',
    "run(process.execPath, ['dev/level/rail-map.ts', '--check']);",
  ].join('\n');
  loadSites('test/zz-probe.test.ts', src, new Set(['dev/level/source.ts']), sites);
  const at = (k: string) => `test/zz-probe.test.ts: ${k}`;
  assert.deepEqual(
    [...sites.unfollowed.keys()].sort(),
    [at('build'), at('execFileSync'), at('import'), at('new URL'), at('sourceModule'), at('spawnSync')].sort(),
  );
  // A literal the walker did not report as a load of this file is a miss: here the script and src/sim's files.
  const missed = sites.missed.join('\n');
  assert.ok(sites.missed.includes('test/zz-probe.test.ts loads dev/level/rail-map.ts'), missed);
  assert.ok(
    sites.missed.some((m) => m.includes('reads ../src/sim/')),
    missed,
  );
});

test('the guard counts fs reads built into a source path, not a temp dir, a docs path or a parameter', () => {
  const src = [
    "import fs from 'node:fs';",
    "import os from 'node:os';",
    "import path from 'node:path';",
    "import { readdirSync as list, promises } from 'node:fs';",
    "import { readFile } from 'node:fs/promises';",
    "import * as fsp from 'node:fs/promises';",
    "const ROOT = path.resolve(import.meta.dirname, '..');",
    "const DIR = path.join(ROOT, 'dev', 'ci');",
    // Loads: built into src/, dev/, server/, protos/ or test/fixtures and not followed.
    "fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');",
    'fs.readFileSync(`${ROOT}/src/entities/${kind}/state.ts`);',
    'list(DIR);',
    'await readFile(`${ROOT}/dev/${f}.ts`);',
    "await fsp.stat(ROOT + '/server/' + f);",
    "await promises.readdir(path.join(ROOT, 'protos'));",
    "await fs.promises.readFile(path.join(import.meta.dirname, '..', 'test', 'fixtures', name));",
    "fs.globSync('test/fixtures/*.json', { cwd: ROOT });",
    // Followed: a literal path the walk has for this file.
    "fs.existsSync(path.join(ROOT, 'src/constants.ts'));",
    // Not into a repo source path: a temp dir, docs, assets, a parameter, a URL (the URL rules' own).
    "const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-'));",
    "fs.readFileSync(path.join(tmp, 'src', 'a.ts'));",
    "fs.writeFileSync(path.join(ROOT, 'src', 'x.ts'), '');",
    "fs.readFileSync(path.join(ROOT, 'docs', 'src', 'notes'));",
    "fs.readdirSync(path.join(ROOT, 'assets/src'));",
    "const read = (dir: string) => fs.readFileSync(path.join(dir, 'fixture.json'));",
    "fs.readFileSync(new URL('./fixtures/rail-schema.json', import.meta.url));",
  ].join('\n');
  const sites = newSites();
  loadSites('test/zz-probe.test.ts', src, new Set(['src/constants.ts', 'test/fixtures/rail-schema.json']), sites);
  const at = (k: string) => `test/zz-probe.test.ts: ${k}`;
  assert.deepEqual(
    [...sites.unfollowed].sort(),
    [
      [at('globSync'), 1],
      [at('readFile'), 2],
      [at('readFileSync'), 2],
      [at('readdir'), 1],
      [at('readdirSync'), 1],
      [at('stat'), 1],
    ].sort(),
  );
  assert.deepEqual(sites.missed, []);
  // A file only core tests reach may read what it likes.
  const core = newSites();
  loadSites('test/zz-probe.test.ts', src, new Set(), core, true);
  assert.deepEqual([...core.unfollowed], []);
});

test('UNFOLLOWED counts each kind: a second unlisted load in a listed file fails, a gone one is stale', () => {
  const sites = newSites();
  const src = "import { spawnSync } from 'node:child_process';\nawait import(a);\nspawnSync('node', [x]);\n";
  loadSites('test/zz-probe.test.ts', src, new Set(), sites);
  const one = { reaches: [], why: 'probe' };
  const imp = 'test/zz-probe.test.ts: import';
  const spawn = 'test/zz-probe.test.ts: spawnSync';
  assert.deepEqual(against(sites, { [imp]: one, [spawn]: one }), { unknown: [], stale: [] });
  // The same file gains a second computed import: listed once, so it fails.
  const more = newSites();
  loadSites('test/zz-probe.test.ts', `${src}await import(b);\n`, new Set(), more);
  assert.deepEqual(against(more, { [imp]: one, [spawn]: one }), {
    unknown: [`${imp} (2 sites, 1 listed)`],
    stale: [],
  });
  assert.deepEqual(against(more, { [imp]: { ...one, count: 2 }, [spawn]: one }), { unknown: [], stale: [] });
  // A listed count above what is there is stale, so a count cannot hide a later addition.
  assert.deepEqual(against(sites, { [imp]: { ...one, count: 2 }, [spawn]: one }), {
    unknown: [],
    stale: [`${imp} (1 sites, 2 listed)`],
  });
});
