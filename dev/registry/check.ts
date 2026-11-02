// npm run registry [-- --base <ref>]: checks the shared registries in this tree (dev/registry/scan.ts), then diffs
// them against <ref> (default origin/main, skipped if it isn't there) for changes that break mixed-build rooms.
// `--json` prints this tree's registry instead.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { scanSources, checkRegistry, compareRegistries, shapeOf } from './scan.ts';
import type { Registry, Source, StateInfo } from './scan.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

function sources(root: string): Source[] {
  const out: Source[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.[jt]s$/.test(e.name)) out.push({ path: path.relative(root, p), text: fs.readFileSync(p, 'utf8') });
    }
  };
  walk(path.join(root, 'src'));
  return out;
}

// Installs the rules on a recording stand-in for sync: module order, ops, and each state's version and saved shape.
type RulesModule = { name: string; install: (sync: unknown, land: unknown, installed: unknown) => unknown };

async function rulesOf(root: string) {
  const url = (p: string) => pathToFileURL(path.join(root, p)).href;
  // .ts since the rules moved to TypeScript; main's tree may still have the .js.
  const rulesIndex = ['ts', 'js']
    .map((x) => `src/world/rules/index.${x}`)
    .find((f) => fs.existsSync(path.join(root, f)));
  const { RULES } = (await import(url(rulesIndex!))) as { RULES: RulesModule[] };
  // Likewise test/helpers/land: .ts once test/ is converted, .mjs before.
  const land = ['ts', 'mjs'].map((x) => `test/helpers/land.${x}`).find((f) => fs.existsSync(path.join(root, f)));
  const { homeLand } = await import(url(land!));
  const ops: Record<string, string> = {};
  const states: Record<string, StateInfo & { serialize?: () => unknown }> = {};
  let current = '?';
  const sync = {
    world: { tick: 0, seed: 1 },
    registerOp: (op: string) => (ops[op] = current),
    registerState: (key: string, h: { version?: number; serialize: () => unknown }) =>
      (states[key] = { module: current, version: h.version ?? 0, serialize: h.serialize }),
    onTick() {},
    onApplied() {},
    onSnapshot() {},
  };
  // installRules' own loop, recording which module registers what.
  const installed: Record<string, unknown> = {};
  for (const m of RULES) {
    current = m.name;
    installed[m.name] = m.install(sync, homeLand(), installed);
  }
  for (const s of Object.values(states)) {
    s.shape = shapeOf(JSON.parse(JSON.stringify(s.serialize!())));
    delete s.serialize;
  }
  // The world namespace (absent in trees from before 0.1): a different one is a clean break (scan.ts).
  const nsFile = path.join(root, 'src/world/namespace.ts');
  const ns: string | undefined = fs.existsSync(nsFile)
    ? (await import(url('src/world/namespace.ts'))).WORLD_NS
    : undefined;
  return { rules: RULES.map((m) => m.name), ops, states, ns };
}

async function registryOf(root: string): Promise<Registry> {
  return { ...scanSources(sources(root)), ...(await rulesOf(root)) };
}

function baseTree(ref: string): string | null {
  try {
    execFileSync('git', ['rev-parse', '--verify', '-q', `${ref}^{commit}`], { cwd: ROOT, stdio: 'pipe' });
  } catch {
    return null;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-registry-'));
  const tar = execFileSync('git', ['archive', ref, 'src', 'test/helpers', 'test/fixtures'], {
    cwd: ROOT,
    maxBuffer: 1 << 28,
  });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  return dir;
}

const args = process.argv.slice(2);
const baseRef = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
const head = await registryOf(ROOT);

if (args.includes('--json')) {
  console.log(JSON.stringify(head, null, 2));
  process.exit(0);
}

const errors = checkRegistry(head);
const dir = baseTree(baseRef);
let notes: string[] = [];
if (dir) {
  try {
    const diff = compareRegistries(await registryOf(dir), head);
    errors.push(...diff.errors);
    notes = diff.notes;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
} else {
  notes.push(`no ${baseRef} here: skipped the comparison with main (git fetch origin main to run it)`);
}

for (const n of notes) console.log(`registry: ${n}`);
if (errors.length) {
  console.error(`\nregistry: ${errors.length} problem(s) (AGENTS.md, "Shared registries" and "Mixed builds"):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `registry: ok (${Object.keys(head.presence).length} presence keys, ${Object.keys(head.messages).length} message types, ${Object.keys(head.ops!).length} ops, ${Object.keys(head.states!).length} states)`,
);
