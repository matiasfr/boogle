// npm run registry [-- --base <ref>]: checks the shared registries (dev/registry/scan.ts) and the import knots
// (dev/registry/knots.ts) in this tree, then diffs the registries against <ref> (default origin/main, skipped if it
// isn't there) for changes that break mixed-build rooms.
// `--json` prints this tree's registry instead. Intentional debt growth needs a committed, key-specific owner
// approval in debt.ts, so plain registry and check enforce the same policy locally and in CI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scanSources, checkRegistry, compareRegistries, shapeOf } from './scan.ts';
import { KNOTS, checkKnots, findKnots, importsOf } from './knots.ts';
import type { Registry, Source, StateInfo } from './scan.ts';
import { checkTaskRoutes } from '../scan/task-routes.ts';
import { DEBT_FILES, LEGACY_SUPPRESSIONS, debtFile, debtOf, debtCounts, compareDebt } from './debt.ts';
import { PROTOS } from '../../protos/protos.ts';
import { prototypeReport } from './prototypes.ts';
import { checkAgentDocs } from './agent-docs.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

function baseTree(ref: string): { dir: string | null; note?: string } {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: ROOT,
      stdio: 'pipe',
      maxBuffer: 1 << 28,
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1' },
    });
  try {
    // CI has shallow history but fetches main's tree. Comparing trees needs no merge base or parent history.
    git('rev-parse', '--verify', '-q', `${ref}^{commit}`);
  } catch {
    return { dir: null, note: `no local base ${ref}: skipped mixed-build and debt baseline comparisons (no fetch)` };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-registry-'));
  let tar: Buffer;
  try {
    // Old bases may predate one of the lists. Archive only paths actually in that local tree.
    const debtPaths = git('ls-tree', '--name-only', ref, '--', ...DEBT_FILES, LEGACY_SUPPRESSIONS)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
    tar = git('archive', ref, 'src', 'test/helpers', 'test/fixtures', ...debtPaths);
  } catch {
    fs.rmSync(dir, { recursive: true, force: true });
    return {
      dir: null,
      note: `base ${ref} unavailable locally: skipped mixed-build and debt baseline comparisons (no fetch)`,
    };
  }
  try {
    execFileSync('tar', ['-x', '-C', dir], { input: tar });
    return { dir };
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw error; // A local extraction failure is not permission to skip a readable base.
  }
}

const args = process.argv.slice(2);
if (args.includes('--owner-approved-debt')) {
  console.error(
    'registry: --owner-approved-debt was removed; owner-approved additions must be committed in APPROVED_DEBT in dev/registry/debt.ts. Agents must never add entries on their own.',
  );
  process.exit(1);
}
const baseRef = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
if (baseRef === undefined) {
  console.error('registry: --base needs a ref');
  process.exit(1);
}
const head = await registryOf(ROOT);
const agentDocs = checkAgentDocs(ROOT);
const prototypeStarted = performance.now();
const prototypeFacts = prototypeReport(sources(ROOT), PROTOS);
prototypeFacts.elapsedMs = Number((performance.now() - prototypeStarted).toFixed(2));

if (args.includes('--json')) {
  console.log(JSON.stringify({ ...head, ...prototypeFacts, agentDocs }, null, 2));
  process.exit(prototypeFacts.errors.length || agentDocs.errors.length ? 1 : 0);
}

const errors = [
  ...agentDocs.errors,
  ...checkRegistry(head),
  ...checkKnots(findKnots(importsOf(sources(ROOT))), KNOTS),
  ...checkTaskRoutes(ROOT),
  ...prototypeFacts.errors,
];
const { dir, note } = baseTree(baseRef);
const notes: string[] = [];
notes.push(`agent launch docs: ${agentDocs.elapsedMs} ms (3,000/1,000-byte budgets and launch imports)`);
notes.push(
  `prototype dependencies: ${prototypeFacts.prototypes.length} cards, ${prototypeFacts.elapsedMs} ms (JSON has owner-review notes)`,
);
const currentDebt = await debtOf(ROOT);
notes.push(`debt now: ${debtCounts(currentDebt)}`);
if (dir) {
  try {
    const missing = DEBT_FILES.filter((f) => !fs.existsSync(path.join(dir, debtFile(dir, f))));
    if (missing.length) notes.push(`debt baseline skipped: ${baseRef} predates ${missing.join(', ')} (no fetch)`);
    else {
      const baseDebt = await debtOf(dir);
      notes.push(`debt base ${baseRef}: ${debtCounts(baseDebt)}`);
      errors.push(
        ...compareDebt(baseDebt, currentDebt).map(
          (g) =>
            `${g}. If these additions aren't yours, main may have shrunk the list since your branch was cut; rebase on main. Otherwise remove the growth or obtain owner approval recorded by list/key/count/reason in APPROVED_DEBT in dev/registry/debt.ts. Only the owner approves; agents must never add entries on their own.`,
        ),
      );
    }
    const diff = compareRegistries(await registryOf(dir), head);
    errors.push(...diff.errors);
    notes.push(...diff.notes);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
} else {
  notes.push(note!);
}

// The burn-down: what's left of the entity ratchet (dev/lint/policy.ts; not a registry, so not in --json). Lint only
// notices a stale suppression in a file it lints, so a deleted file's entry is caught here: it would inflate the count.
const suppressions = JSON.parse(fs.readFileSync(path.join(ROOT, 'lint-suppressions.json'), 'utf8')) as Record<
  string,
  Record<string, { count: number }>
>;
let suppressed = 0;
for (const [file, rules] of Object.entries(suppressions)) {
  suppressed += rules['boogle/use-an-entity']?.count ?? 0;
  if (!fs.existsSync(path.join(ROOT, file)))
    errors.push(`lint-suppressions.json lists ${file}, which is gone: npm run lint -- --prune-suppressions`);
}

for (const n of notes) console.log(`registry: ${n}`);
if (errors.length) {
  console.error(`\nregistry: ${errors.length} problem(s) (docs/agents/registries.md and docs/agents/mixed-builds.md):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`registry: entity migration, ${suppressed} suppressions left`);
console.log(
  `registry: ok (${Object.keys(head.presence).length} presence keys, ${Object.keys(head.messages).length} message types, ${Object.keys(head.ops!).length} ops, ${Object.keys(head.states!).length} states)`,
);
