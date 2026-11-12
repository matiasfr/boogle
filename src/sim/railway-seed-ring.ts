// Seeds for Ring Island build 1 (docs/plans/ring-island-build1.md, R3b, v27), on ./railway-seed-works.ts's
// `crossing-done` (./railway-seeds.ts is the catalog and how to add a stage). Accepted sim ops only, no direct state
// writes: Q7's kit off the train at the Pier and into its frame, the wagon's ring footings set bent by bent at the
// railhead's jib, the brace, the counterweight and the rivet.
//
//   deck-laid     Q7 laid over the six bents; the railhead at bent 6; the wagon at the Village, the Works rack full
//   gap-footed    the fourteen bent footings set: the railhead at bent 13. The plan has nothing on its rack here, but
//                 the wagon brings six a load (6 + 6 + 6 = 18), so the third load's last four, the counterweight's,
//                 are already on it the moment the fourteenth is set; no accepted op empties it short of hanging them
//   leaf-raised   gap-footed with the wagon away: the four counterweight footings on the railhead rack
//   ring-joined   the leaf braced and down under its counterweight, the rivet struck: three trains run to the island
import { act, type Seed } from './railway-seed-route.ts';
import { invariant, need, restore } from './railway-drive.ts';
import { advanceWorks, railwayAtWorks } from './railway-seed-works.ts';
import { account, aperture, qjob, rail, trains, works } from './railway-rows.ts';
import { LINE2_STATIONS, Q7 } from './railway-line2-layout.ts';
import { WORKS } from './railway-works-layout.ts';
import { TRAIN_PHASE } from './railway-train.ts';

export type RingStage = 'deck-laid' | 'gap-footed' | 'leaf-raised' | 'ring-joined';
export const RING_STAGES: readonly RingStage[] = ['deck-laid', 'gap-footed', 'leaf-raised', 'ring-joined'];

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<RingStage, Seed>();
/** The railway at a Ring Island stage, each built on the one before it (`crossing-done` first). */
export function railwayAtRing(stage: RingStage): Seed {
  const k = RING_STAGES.indexOf(stage);
  need(k >= 0, stage);
  let base = cache.get(stage);
  if (!base) {
    const before = k ? railwayAtRing(RING_STAGES[k - 1]!) : railwayAtWorks('crossing-done');
    base = build(before, stage);
    need(invariant(base.w) === null, stage);
    cache.set(stage, base);
  }
  return { w: restore(base.w), t: base.t };
}

/** Advance (checking footings every tick) until `ok`, at most `max` ticks. */
function until(s: Seed, ok: () => boolean, max: number, what: string) {
  for (let guard = 0; !ok(); guard++) {
    need(guard < max, what);
    advanceWorks(s, 1);
  }
}
/** The railhead's footings from its rack to the jib while `more` holds, the wagon bringing them. */
function setFootings(s: Seed, more: () => boolean, what: string) {
  for (let guard = 0; more(); guard++) {
    need(guard < 30000, what);
    if (aperture(s.w).rack > 0) {
      need(act(s, 'a', 'rail.footTake', { rack: 2 }) === 1, 'a footing off the railhead rack');
      need(act(s, 'a', 'rail.footSet', { site: 3 }) === 1, 'a footing set at the jib');
    } else advanceWorks(s, 1);
  }
}

function build(s: Seed, stage: RingStage): Seed {
  const w = s.w;
  switch (stage) {
    case 'deck-laid': {
      need(rail(w).glide, 'the room has the glider (trainBase takes it)');
      // Q7's kit is its bill (call 63), loaded at the Village and off at the Pier (call 62).
      const [logs, rails] = LINE2_STATIONS[Q7]!.bill;
      until(s, () => rail(w).depot === logs && rail(w).depotRails === rails, 6000, 'Q7 kit unloaded at the Pier');
      for (const kind of [0, 2])
        for (let guard = 0; kind ? rail(w).depotRails : rail(w).depot; guard++) {
          need(guard < 8, 'Q7 depot emptied');
          const pid = guard % 2 ? 'b' : 'a';
          const n = act(s, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake');
          need(n > 0, 'Q7 depot taken');
          need(act(s, pid, 'rail.deposit', { station: 'Q7', kind, n }) === n, 'Q7 took materials');
        }
      until(s, () => qjob(w, Q7).completion === 1, 6000, 'Q7 laid');
      // The wagon home at the Village, the Works rack full for its next load.
      until(
        s,
        () =>
          works(w).rack === WORKS.rackCap &&
          trains(w).some((r) => r.wagon && r.phase === TRAIN_PHASE.STAND && r.at === 0),
        6000,
        'the wagon at the Village, the rack full',
      );
      break;
    }
    case 'gap-footed':
      setFootings(s, () => aperture(w).set < WORKS.ring, 'the gap footed');
      need(aperture(w).cw === 0 && aperture(w).brace === 1, 'the leaf raised on its pawl, no weight hung');
      break;
    case 'leaf-raised':
      until(s, () => aperture(w).rack === WORKS.counterweight, 12000, 'the counterweight footings racked');
      until(
        s,
        () => trains(w).some((r) => r.wagon && !(r.phase === TRAIN_PHASE.STAND && r.at === 4)),
        2000,
        'the wagon away',
      );
      break;
    case 'ring-joined':
      need(act(s, 'a', 'rail.brace', { revision: 1 }) === 1, 'the leaf braced');
      setFootings(s, () => aperture(w).cw < WORKS.counterweight, 'the counterweight hung');
      need(aperture(w).brace === 0, 'the leaf down');
      need(act(s, 'a', 'rail.strike', { id: 2 }) === 1, 'the rivet struck');
      need(aperture(w).joined >= 0, 'the ring joined');
      need(account(w, 'a')!.foot === 0, 'nothing left on a back');
      advanceWorks(s, 100);
      break;
  }
  return s;
}
