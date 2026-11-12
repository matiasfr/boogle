// Shared local pre-push gate. CI remains the full check on the exact branch head.
import './node-version.ts'; // first: re-runs under the pinned Node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { changeClass } from './ci/change-class.ts';
import { affectedTests } from './ci/unit-select.ts';
import { testEnv } from './test-env.ts';

const [base = 'origin/main', head = 'HEAD'] = process.argv.slice(2);
const start = performance.now();
const elapsed = () => `${((performance.now() - start) / 1000).toFixed(2)}s`;
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const files = new Set(
  [
    git('diff', '--name-only', '-z', `${base}...${head}`),
    git('diff', '--name-only', '-z', 'HEAD'),
    git('ls-files', '--others', '--exclude-standard', '-z'),
  ]
    .flatMap((s) => s.split('\0'))
    .filter(Boolean),
);
function run(args: string[]) {
  execFileSync(process.execPath, args, { stdio: 'inherit' });
}
// Tests run in ./test-env.ts's environment, which leaves out the hook's GIT_* variables; this script's own git calls
// keep the hook's view.
function runTests(args: string[], env = testEnv().env) {
  execFileSync(process.execPath, ['--test', ...args], { stdio: 'inherit', env });
}
// `npm run registry`, as CI's docs and registry jobs run it, on every diff: about 2s, and prose (must-read budgets, the
// live agent-calls table) breaks it as easily as code.
run(['dev/registry/check.ts', '--base', base]);
// Docs-only (dev/ci/change-class.ts): the same fast checks as CI's docs job, no lint, typecheck or unit tests.
if (changeClass([...files]) === 'docs') {
  runTests(['--test-timeout=5000', 'test/models.test.ts', 'test/change-class.test.ts']);
  console.log(`ship-check: docs only (${files.size} files), registry and agent checks; ${elapsed()}`);
  process.exit(0);
}
const lint = [...files].filter((f) => /\.(?:ts|mts|cts|js|mjs|cjs)$/.test(f) && fs.existsSync(f));
// Config/policy changes affect unchanged files too. Full lint stays cheap relative to build.
const policy = [...files].some((f) => /^(dev\/lint\/|\.oxlint|lint-suppressions|package(?:-lock)?\.json)/.test(f));
if (policy || lint.length) run(['dev/lint/run.ts', ...(policy ? [] : lint)]);
run(['node_modules/typescript/bin/tsc', '-p', '.']);

// The tests whose closure holds a changed file, plus the core: the same walk and core as CI's selection
// (dev/ci/unit-select.ts), in the local unit run's settings below. A lockstep diff still runs only these here; CI runs
// the full suite for it.
const tests = affectedTests([...files]);
if (tests.length) {
  // The unit run's settings (./test-env.ts): the rail audit off unless RAIL_AUDIT=1, as `npm run test:unit` runs.
  const { env, flags } = testEnv();
  runTests([...flags, ...tests], env);
}
console.log(`ship-check: registry, ${lint.length} lint files, typecheck, ${tests.length} affected tests; ${elapsed()}`);
