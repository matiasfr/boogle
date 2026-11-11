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
  assert.equal(run(''), 'unit_full=true\nunit_shards=[1,2,3,4]\nunit_only=\n');
  assert.equal(run('src/sim/railway.ts\n'), 'unit_full=true\nunit_shards=[1,2,3,4]\nunit_only=\n');
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
// (git) loads no repo file.
const CHILD = new Set(['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec', 'execSync', 'fork']);
const BUNDLE = new Set(['build', 'buildSync', 'context']);
const SOURCE = new Set(['sourceFunction', 'sourceModule']);
const RUNNERS = /^(?:node|npm|npx|tsx)(?:\s|$)/;
/** What a call loads, by where its callee was imported from: `child`, `bundle`, `source` or nothing. Local names and
 * namespaces both: `import { spawnSync as run }`, `import * as cp`, `import esbuild from 'esbuild'`. */
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
          : undefined;
    if (!kind) return;
    const names = kind === 'child' ? CHILD : kind === 'bundle' ? BUNDLE : SOURCE;
    for (const sp of n.specifiers) {
      if (sp.type === 'ImportSpecifier') {
        const imported = sp.imported.type === 'Identifier' ? sp.imported.name : String(sp.imported.value);
        if (names.has(imported)) named.set(sp.local.name, `${kind}:${imported}`);
      } else spaces.set(sp.local.name, kind);
    }
  });
  return (callee: Node): { kind: string; name: string } | undefined => {
    if (callee.type === 'Identifier') {
      const v = named.get(callee.name);
      return v ? { kind: v.slice(0, v.indexOf(':')), name: v.slice(v.indexOf(':') + 1) } : undefined;
    }
    if (
      callee.type === 'MemberExpression' &&
      callee.object.type === 'Identifier' &&
      callee.property.type === 'Identifier'
    ) {
      const kind = spaces.get(callee.object.name);
      const name = callee.property.name;
      const names = kind === 'child' ? CHILD : kind === 'bundle' ? BUNDLE : SOURCE;
      if (kind && names.has(name)) return { kind, name };
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

type Sites = { unfollowed: Set<string>; missed: string[] };
/** Load sites in one file. A literal file target must be one of the walker's direct loads of that file; a folder URL
 * (below the root) must have every file in it there. */
function loadSites(file: string, src: string, direct: Set<string>, sites: Sites) {
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
  walk(program, (n: Node) => {
    if (n.type === 'ImportDeclaration' && n.importKind !== 'type' && n.source.value.startsWith('.'))
      check(n.source.value);
    else if (n.type === 'ImportExpression') {
      const s = literal(n.source);
      if (s === undefined) sites.unfollowed.add(`${file}: import`);
      else if (s.startsWith('.')) check(s);
    } else if (n.type === 'NewExpression' && n.callee.type === 'Identifier') {
      if (n.callee.name === 'URL' && isMetaUrl(n.arguments[1] as Node | undefined)) {
        const first = n.arguments[0] as Node | undefined;
        const s = literal(first);
        // A computed URL under a literal folder (`../src/sim/${f}`) is that folder; under the root it is unfollowed.
        const head = first?.type === 'TemplateLiteral' ? (first.quasis[0]!.value.cooked ?? '') : '';
        const folder = head.includes('/') ? head.slice(0, head.lastIndexOf('/') + 1) : '';
        if (s !== undefined) check(s, true);
        else if (!folder || !check(folder, true)) sites.unfollowed.add(`${file}: new URL`);
      }
      if (n.callee.name === 'Worker' && !followed(n.arguments as Node[])) sites.unfollowed.add(`${file}: new Worker`);
    } else if (n.type === 'CallExpression') {
      const name = calleeName(n.callee as Node);
      const args = n.arguments as Node[];
      if (n.callee.type === 'MemberExpression' && n.callee.object.type === 'MetaProperty' && name === 'glob') {
        const first = args[0];
        const patterns = first?.type === 'ArrayExpression' ? (first.elements as Node[]).map(literal) : [literal(first)];
        if (patterns.some((p) => p === undefined)) return void sites.unfollowed.add(`${file}: import.meta.glob`);
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
      if (name === 'registerHooks') return void sites.unfollowed.add(`${file}: registerHooks`);
      const call = kindOf(n.callee as Node);
      if (!call) return;
      if (call.kind !== 'child') {
        if (!followed(args)) sites.unfollowed.add(`${file}: ${call.name}`);
      } else {
        if (followed(args)) return;
        const name = call.name;
        const command = literal(args[0]);
        const runsNode =
          name === 'fork' ||
          (command === undefined ? !(args[0]?.type === 'Identifier' && args[0].name === 'git') : RUNNERS.test(command));
        if (runsNode) sites.unfollowed.add(`${file}: ${name}`);
      }
    }
  });
}

test('every load in every test closure is followed by the walk or listed in UNFOLLOWED', () => {
  const walker = createWalker(ROOT);
  const reach = new Map<string, string[]>(); // file -> tests whose closure holds it
  for (const t of unitTests(ROOT)) for (const f of walker.closure([t])) reach.set(f, [...(reach.get(f) ?? []), t]);
  assert.ok(reach.size > 1000, `the walk reached only ${reach.size} files`);
  const sites: Sites = { unfollowed: new Set(), missed: [] };
  for (const f of reach.keys())
    if (/\.[mc]?ts$/.test(f) && !f.endsWith('.d.ts'))
      loadSites(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), new Set(walker.loads(f)), sites);
  const unknown = [...sites.unfollowed].filter((k) => !(k in UNFOLLOWED));
  const stale = Object.keys(UNFOLLOWED).filter((k) => !sites.unfollowed.has(k));
  assert.deepEqual(sites.missed, [], 'dev/ci/unit-select.ts createWalker() misses these');
  assert.deepEqual(unknown, [], 'make the walk follow these, or list them in UNFOLLOWED with what they reach');
  assert.deepEqual(stale, [], 'these listed loads are gone: drop them from UNFOLLOWED');
  for (const [key, { reaches, why }] of Object.entries(UNFOLLOWED)) {
    assert.ok(why.length > 10, `${key}: say what covers it`);
    for (const r of reaches) assert.ok(fs.existsSync(`${ROOT}/${r}`), `${key}: ${r} is gone`);
  }
});

test('the guard flags each kind of load it cannot see followed, and not a git call', () => {
  const sites: Sites = { unfollowed: new Set(), missed: [] };
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
    [...sites.unfollowed].sort(),
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
