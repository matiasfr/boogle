// npm run checkpoints [-- <stage> ...]: the production route's checkpoints are accepted --rail-seed server saves, built
// per run from the lockstep sim through the real host's save path (dev/look/rail-seed.ts). There are no client fixtures to
// keep or migrate. This writes each stage the routed checks and `playthrough --from` use (or the stages named) into a
// throwaway data directory, so a world or route change that breaks a seed shows here, before a browser run needs it.
// With no stages named it also builds every jump-in the server offers (docs/plans/playtest-jump-in.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeRailSeed } from './rail-seed.ts';
import { RAIL_FROM } from './segments.ts';
import { OFFERED_STAGES } from '../../src/world/railway-jump.ts';

const args = process.argv.slice(2);
if (args.some((a) => a.startsWith('--')))
  throw new Error('Seeds are server saves built per run; name stages to check, or none for the routed ones');
// Routed stages, then every jump-in the server offers (src/world/railway-jump.ts).
const stages = args.length ? args : [...new Set(['awake', ...Object.keys(RAIL_FROM), ...OFFERED_STAGES])];
let failed = 0;
for (const stage of stages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-seed-'));
  const started = Date.now();
  try {
    await writeRailSeed(dir, 'checkpoints', stage);
    const saved = fs.readdirSync(dir, { recursive: true }).length;
    if (!saved) throw new Error('the host saved nothing');
    console.log(`ok   ${stage.padEnd(14)} ${((Date.now() - started) / 1000).toFixed(1)} s`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${stage.padEnd(14)} ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
console.log(
  failed ? `${failed} of ${stages.length} seeds failed` : `${stages.length} seeds build through the host save path`,
);
process.exit(failed ? 1 : 0);
