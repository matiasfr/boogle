// q3-done with two newly abandoned log piles, aged by the same accepted whole-minute pulse as the host.
// Leave both on the ground at age 21 so the host must choose their destinations when the proof room opens.
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { act } from '../../src/sim/railway-seed-route.ts';
import { account, trees } from '../../src/sim/railway-rows.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { railSupplyPulse } from '../../src/sim/railway-sys-away.ts';
import { railGrowthMask, RECOVERY_MINUTES } from '../../src/sim/railway-supply.ts';
import { invariant, need } from '../../src/sim/railway-drive.ts';
import { seedDoc } from './ring-mid-seed.ts';

export function yardRecoverySeed() {
  const seed = buildSeedWorld('q3-done');
  for (const [x, y, z, n] of [
    [92200, 1800, -1200, 4],
    [100000, 2400, 3000, 6],
  ] as const) {
    while (account(seed.w, 'a')!.carry < n) {
      const k = trees(seed.w).findIndex((t) => t.left > 0);
      need(
        k >= 0 && act(seed, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }) > 0,
        'recovery timber',
      );
    }
    need(act(seed, 'a', 'rail.drop', { x, y, z, n, kind: 0 }) === n, 'recovery pile');
  }
  const marker = Math.floor(Date.now() / 60000),
    grow = railGrowthMask([]);
  railSupplyPulse(seed.w, { marker: marker - RECOVERY_MINUTES, grow, recover: [] });
  railSupplyPulse(seed.w, { marker, grow, recover: [] });
  need(invariant(seed.w) === null, 'halt yard recovery seed');
  return seedDoc(seed);
}
