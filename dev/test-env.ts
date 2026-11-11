// The unit tests' run settings, in one place for `npm run test:unit` (dev/test-unit.ts) and the pre-push gate
// (dev/ship-check.ts). docs/agents/ship-pipeline.md, "Unit test settings", says what each mode leaves out and where it
// runs; the fuzz knobs are read in test/helpers/fuzz.ts.
//
//   local   the rail drivers' worlds unaudited (test/helpers/rail-no-audit.ts); the every-offset sweeps at every
//           16th offset. `npm run test:unit`, `npm run check`, the pre-push gate. RAIL_AUDIT=1 keeps the audit.
//   ci      the audit and every offset (FUZZ_STRIDE=1): CI's unit job, `npm run test:unit -- --ci`
//   ship    a non-review ship's CI (batch 2 of docs/plans/ci-diet.md): the audit on, the sweeps at every 16th offset and one
//           fuzz seed per fuzz; only the affected tests and the core run (dev/ci/unit-select.ts). Main runs ci.
//   long    ci plus the reviews' long save checks and their five fuzz seeds: `npm run test:long`, nightly. Its tests
//           may take over the 5 s a unit test gets, so it gets 10 minutes a test.
export type TestMode = 'local' | 'ci' | 'ship' | 'long';
const MODES: Record<TestMode, NodeJS.ProcessEnv> = {
  local: {},
  ci: { RAIL_AUDIT: '1', FUZZ_STRIDE: '1' },
  ship: { RAIL_AUDIT: '1', FUZZ_STRIDE: '16', FUZZ_FIRST_SEED: '1' },
  long: { RAIL_AUDIT: '1', FUZZ_STRIDE: '1', SAVE_TICKS: '2500', FUZZ_SEEDS: 'c0ffee,777,15a4d,5eed,bee' },
};
/** The environment and the node flags (the preload and the per-test timeout) to put ahead of `--test`. */
export function testEnv(mode: TestMode = 'local'): { env: NodeJS.ProcessEnv; flags: string[] } {
  // Never a git hook's environment: pre-push exports GIT_DIR and friends, which beat `git -C <dir>`, so a test's scratch
  // `git init`/`git config` once wrote into this repository's config (11 November). Tests find the repo from their cwd.
  const outside = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  const env = { ...outside, ...MODES[mode] };
  const preload = env.RAIL_AUDIT === '1' ? [] : ['--import', './test/helpers/rail-no-audit.ts'];
  return { env, flags: [...preload, `--test-timeout=${mode === 'long' ? 600_000 : 5000}`] };
}
