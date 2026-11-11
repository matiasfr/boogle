// Shared local pre-push gate. CI remains the full check on the exact branch head.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { changeClass } from './ci/change-class.ts';
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
// Docs-only (dev/ci/change-class.ts): the same fast checks as CI's docs job, no lint, typecheck or unit tests.
if (changeClass([...files]) === 'docs') {
  run(['dev/registry/check.ts', '--base', base]);
  run(['--test', '--test-timeout=5000', 'test/models.test.ts', 'test/change-class.test.ts']);
  console.log(`ship-check: docs only (${files.size} files), registry and agent checks; ${elapsed()}`);
  process.exit(0);
}
const lint = [...files].filter((f) => /\.(?:ts|mts|cts|js|mjs|cjs)$/.test(f) && fs.existsSync(f));
// Config/policy changes affect unchanged files too. Full lint stays cheap relative to build.
const policy = [...files].some((f) => /^(dev\/lint\/|\.oxlint|lint-suppressions|package(?:-lock)?\.json)/.test(f));
if (policy || lint.length) run(['dev/lint/run.ts', ...(policy ? [] : lint)]);
run(['node_modules/typescript/bin/tsc', '-p', '.']);

// Follow static relative imports transitively. Unknown/dynamic dependencies remain covered by full CI.
const memo = new Map<string, boolean>();
function affected(file: string, seen = new Set<string>()): boolean {
  if (files.has(file)) return true;
  if (memo.has(file)) return memo.get(file)!;
  if (seen.has(file) || !fs.existsSync(file)) return false;
  seen.add(file);
  const imports = [...fs.readFileSync(file, 'utf8').matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)];
  const result = imports.some((m) => affected(path.normalize(path.join(path.dirname(file), m[1]!)), seen));
  if (result) memo.set(file, true);
  return result;
}
const tests = git('ls-files', 'test/**/*.test.ts', 'test/*.test.ts')
  .split('\n')
  .filter((f) => f && affected(f));
if (tests.length) {
  // The unit run's settings (./test-env.ts): the rail audit off unless RAIL_AUDIT=1, as `npm run test:unit` runs.
  const { env, flags } = testEnv();
  execFileSync(process.execPath, ['--test', ...flags, ...tests], { stdio: 'inherit', env });
}
console.log(`ship-check: ${lint.length} lint files, typecheck, ${tests.length} affected tests; ${elapsed()}`);
