// q3-done with two newly abandoned log piles, aged by the same accepted whole-minute pulse as the host.
// Leave both on the ground at age 21 so the host must choose their destinations when the proof room opens.
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { act, advance, leaveTimber } from '../../src/sim/railway-seed-route.ts';
import { buildWorksStage, chopTo } from '../../src/sim/railway-seed-works.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { giftAboard, workAboard } from '../../src/sim/railway-queries-gift.ts';
import { account, trees } from '../../src/sim/railway-rows.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { railSupplyPulse } from '../../src/sim/railway-sys-away.ts';
import { railGrowthMask, RECOVERY_MINUTES } from '../../src/sim/railway-supply.ts';
import { invariant, need } from '../../src/sim/railway-drive.ts';
import { seedDoc } from './ring-mid-seed.ts';

/** The guest stayed at Home after the deposit. Capture the first incline frame after delivery. */
export function inclineGiftSeed() {
  const seed = buildSeedWorld('incline-open');
  chopTo(seed, 'a', 8);
  const amount = act(seed, 'a', 'rail.haltPut', { yard: 0, kind: 0 });
  need(amount >= 8, 'Village gift');
  for (let ticks = 0; legRow(seed.w, 1).logs < amount; ticks++) {
    need(ticks < 12000, 'incline delivery');
    advance(seed, 1);
  }
  need(invariant(seed.w) === null, 'incline gift seed');
  return seedDoc(seed);
}

export function stackGiftSeed() {
  const s = buildSeedWorld('stack-rails');
  chopTo(s, 'a', 8);
  const extra = account(s.w, 'a')!.carry - 8;
  if (extra)
    need(act(s, 'a', 'rail.drop', { kind: 0, n: extra, x: 100000, y: 2000, z: 3000 }) === extra, 'eight logs retained');
  need(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 0 }) === 8, 'Village gift');
  for (let ticks = 0; !giftAboard(s.w, undefined, 'giftRails'); ticks++) {
    need(ticks < 6000, 'Stack gift dispatch');
    advance(s, 1);
  }
  need(giftAboard(s.w, undefined, 'giftRails') === 4 && invariant(s.w) === null, 'four rails aboard');
  return seedDoc(s);
}

export function q6GiftSeed(phase: string) {
  const s = buildSeedWorld('trains-on');
  need(act(s, 'a', 'rail.pack') === 1, 'pack for the kiln load');
  for (const stage of ['works-open', 'works-lit', 'stall-done', 'cradle-fitted'] as const) buildWorksStage(s, stage);
  chopTo(s, 'a', 8);
  const extra = account(s.w, 'a')!.carry - 8;
  if (extra) act(s, 'a', 'rail.drop', { kind: 0, n: extra, x: 100000, y: 2000, z: 3000 });
  need(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 0 }) === 8, 'eight logs given at Home');
  if (phase !== 'queued') {
    for (let i = 0; workAboard(s.w, 2) !== 8; i++) {
      need(i < 6000, 'eight aboard for Q6');
      advance(s, 1);
    }
    if (phase === 'landed') {
      for (let i = 0; workAboard(s.w, 2); i++) {
        need(i < 6000, 'Q6 accepts its logs');
        advance(s, 1);
      }
    }
  }
  return seedDoc(s, 'Robin');
}

export function pierGiftSeed(yard = 0) {
  const s = buildSeedWorld('crossing-done');
  chopTo(s, 'a', 8);
  leaveTimber(s, 'a', yard, 8);
  for (let ticks = 0; workAboard(s.w, 3) !== 8; ticks++) {
    need(ticks < 6000, 'Pier cargo aboard');
    advance(s, 1);
  }
  return seedDoc(s, 'Robin');
}

/** Ordinary bin stock placed before Q7 opens, ready for a live guest to lift and give. */
export function quarryGuestSeed() {
  const s = buildSeedWorld('crossing-finishing');
  chopTo(s, 'a', 8);
  leaveTimber(s, 'a', 2, 8);
  buildWorksStage(s, 'crossing-done');
  return seedDoc(s);
}

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
