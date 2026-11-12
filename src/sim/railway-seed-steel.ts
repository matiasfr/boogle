// Seeds for Ring Island build 2 (docs/plans/ring-island-build2.md, R4, v30), on ./railway-seed-ring.ts's
// `ring-joined` (./railway-seeds.ts is the catalog and how to add a stage). Accepted sim ops and ticks only, no direct
// state writes: the kit train to the island yard, the bill fed by hand, the casts, the ride home and the install.
//
//   steel-kit     the whole kit (8 logs, 12 rails) in the island yard; the works cold
//   steel-lit     the bill fed by one player and lit; the first steel on its rack
//   steel-home    the first steel in the Roundhouse bay; line 2's longer boiler not yet installed
//   boiler-long   the install made at the table, and every line 2 train wearing the longer boiler
import { act, type Seed } from './railway-seed-route.ts';
import { invariant, need, restore } from './railway-drive.ts';
import { advanceWorks } from './railway-seed-works.ts';
import { railwayAtRing } from './railway-seed-ring.ts';
import { account, line, shed, steel, train } from './railway-rows.ts';
import { STEEL } from './railway-ring-layout.ts';
import { LINE2 } from './railway-lines.ts';
import { LINE_SLOTS } from './railway-trains.ts';

export type SteelStage = 'steel-kit' | 'steel-lit' | 'steel-home' | 'boiler-long';
export const STEEL_STAGES: readonly SteelStage[] = ['steel-kit', 'steel-lit', 'steel-home', 'boiler-long'];

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<SteelStage, Seed>();
/** The railway at a steel works stage, each built on the one before it (`ring-joined` first). */
export function railwayAtSteel(stage: SteelStage): Seed {
  const k = STEEL_STAGES.indexOf(stage);
  need(k >= 0, stage);
  let base = cache.get(stage);
  if (!base) {
    const before = k ? railwayAtSteel(STEEL_STAGES[k - 1]!) : railwayAtRing('ring-joined');
    base = build(before, stage);
    need(invariant(base.w) === null, stage);
    cache.set(stage, base);
  }
  return { w: restore(base.w), t: base.t };
}

/** Advance (checking the world every tick) until `ok`, at most `max` ticks. */
function until(s: Seed, ok: () => boolean, max: number, what: string) {
  for (let guard = 0; !ok(); guard++) {
    need(guard < max, what);
    advanceWorks(s, 1);
  }
}

function build(s: Seed, stage: SteelStage): Seed {
  const w = s.w;
  switch (stage) {
    case 'steel-kit':
      until(
        s,
        () => steel(w).yardLogs === STEEL.logs && steel(w).yardRails === STEEL.rails,
        4000,
        'the kit in the island yard',
      );
      need(steel(w).lit < 0, 'the works cold');
      break;
    case 'steel-lit':
      // One player carries it in: a back of a kind at a time, fed until the yard is empty.
      for (const kind of [0, 1])
        for (let guard = 0; kind ? steel(w).yardRails : steel(w).yardLogs; guard++) {
          need(guard < 8, 'the yard emptied');
          need(act(s, 'a', 'rail.steelTake', { kind }) > 0, 'kit taken off the yard');
          need(act(s, 'a', 'rail.steel') > 0, 'kit fed into the works');
        }
      need(steel(w).lit >= 0, 'the works lit');
      need(account(w, 'a')!.carry + account(w, 'a')!.rails === 0, 'nothing left on a back');
      until(s, () => steel(w).rack >= 1, 200, 'the first steel on the rack');
      break;
    case 'steel-home':
      until(s, () => shed(w).steel >= 1, 6000, 'the first steel in the bay');
      need(line(w, LINE2).boiler === 0, 'not yet installed');
      break;
    case 'boiler-long':
      need(act(s, 'a', 'rail.install', { line: LINE2, part: 1, revision: line(w, LINE2).boiler }) === 1, 'installed');
      until(
        s,
        () => LINE_SLOTS[LINE2]!.every((k) => train(w, k).boiler === 1),
        3000,
        'every line 2 train wearing the longer boiler',
      );
      break;
  }
  return s;
}
