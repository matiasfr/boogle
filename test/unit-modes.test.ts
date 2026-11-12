// Review of ci/unit-speed: the unit run's modes (dev/test-env.ts) as each run gets them. CI's unit job and the
// nightly long run must keep the rail drivers' worlds audited whatever the caller's environment says (the local
// preload, test/helpers/rail-no-audit.ts, turns it off), and a fuzz knob set to something that is not a count must not
// turn a sweep into one that checks nothing (test/helpers/fuzz.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { MODE_VARS, testEnv, type TestMode } from '../dev/test-env.ts';

const url = (p: string) => new URL(p, import.meta.url).href;
/** Runs `code` (an ES module) under a mode's node flags and environment; its stdout, trimmed. */
function under(mode: TestMode, code: string, env: NodeJS.ProcessEnv = {}) {
  const saved = { ...process.env };
  // The mode alone, then `env` on top: this test also runs inside CI's own runs, which export the ci or ship mode's
  // variables (FUZZ_STRIDE=1 once made the local probe read a stride of 1). An undefined value unsets the variable.
  for (const k of MODE_VARS) delete process.env[k];
  for (const [k, v] of Object.entries(env))
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  const run = testEnv(mode);
  process.env = saved;
  const flags = run.flags.filter((f) => !f.startsWith('--test-timeout'));
  const out = spawnSync(process.execPath, [...flags, '--input-type=module', '-e', code], {
    env: run.env,
    encoding: 'utf8',
  });
  return { status: out.status, stdout: out.stdout.trim(), stderr: out.stderr };
}
// The audit checks values at spawn (src/ecs/world.ts): an off-schema int is refused only by an audited world.
const PROBE = `
import { createRailway } from ${JSON.stringify(url('../src/sim/railway-drive.ts'))};
import { Line } from ${JSON.stringify(url('../src/sim/railway-components.ts'))};
let audited = false;
try { createRailway().spawn([Line, { slot: 99, req: 1.5 }]); } catch (e) { audited = /off schema/.test(String(e)); }
console.log(audited ? 'audited' : 'unaudited');`;

test("CI's unit job and the long run audit the rail drivers' worlds; a local run does not", () => {
  assert.equal(under('local', PROBE).stdout, 'unaudited', 'the probe tells the two apart');
  for (const mode of ['ci', 'long'] as const) {
    assert.equal(under(mode, PROBE).stdout, 'audited', mode);
    assert.equal(
      under(mode, PROBE, { RAIL_AUDIT: '0' }).stdout,
      'audited',
      `${mode}, RAIL_AUDIT=0 in the caller's env`,
    );
  }
});

test('FUZZ_STRIDE that is not a whole number of offsets is refused or read as a real stride, never NaN', () => {
  const read = `import { FUZZ_STRIDE } from ${JSON.stringify(url('./helpers/fuzz.ts'))}; console.log(String(FUZZ_STRIDE));`;
  for (const given of ['x', '16x', '2.5']) {
    const out = under('local', read, { FUZZ_STRIDE: given });
    if (out.status !== 0) continue; // refused loudly: fine
    const stride = Number(out.stdout);
    // NaN makes `(t - t0 - 1) % STRIDE` truthy at every offset, so the sweeps in railway-r3a-adversarial.test.ts
    // branch nowhere and pass having checked nothing.
    assert.ok(Number.isInteger(stride) && stride >= 1, `FUZZ_STRIDE=${given} reads as ${out.stdout}`);
  }
});

test("a ship's CI keeps the audit and a real stride, and runs one seed of each fuzz", () => {
  assert.equal(under('ship', PROBE, { RAIL_AUDIT: '0' }).stdout, 'audited');
  const read = (own: string) =>
    `import { FUZZ_STRIDE, fuzzSeeds } from ${JSON.stringify(url('./helpers/fuzz.ts'))}; console.log(FUZZ_STRIDE, fuzzSeeds(${own}).join());`;
  assert.equal(under('ship', read('[7, 8, 9]')).stdout, '16 7');
  assert.equal(under('ci', read('[7, 8, 9]')).stdout, '1 7,8,9');
  assert.equal(under('local', read('[7, 8, 9]')).stdout, '16 7,8,9');
});
