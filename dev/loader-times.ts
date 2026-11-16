// Rerun: node --import ./test/helpers/rail-no-audit.ts dev/loader-times.ts
// Headless rules; carry intervals are assumptions, not a walking bot measurement.
import { RAIL_TRAINS, LINE2 } from '../src/sim/railway-lines.ts';
import { createRailwayWorld } from '../src/sim/railway-components.ts';
import assert from 'node:assert/strict';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { act, advance } from '../src/sim/railway-seed-route.ts';
import { Aperture, Works } from '../src/sim/railway-components.ts';
import { plot, trains, till } from '../src/sim/railway-rows.ts';
import { worksId } from '../src/sim/railway-queries.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { TRAIN_PHASE } from '../src/sim/railway-train.ts';

const LINE2_SLOTS = RAIL_TRAINS.flatMap((r, k) => (r.line === LINE2 ? [k] : []));
for (const stage of ['yard-ready', 'yard-built'] as const) {
  const s = buildSeedWorld(stage);
  console.log(stage, 'tick', s.t, 'yard', plot(s.w, 1).at);
}
const bases = new Map<string, ReturnType<typeof buildSeedWorld>>();
function seed(stage: 'yard-wagon' | 'yard-deck' | 'wagon-on' | 'deck-laid') {
  let base = bases.get(stage);
  if (!base) {
    base = buildSeedWorld(stage);
    bases.set(stage, base);
  }
  const w = createRailwayWorld();
  w.load(JSON.parse(JSON.stringify(base.w.snapshot())));
  return { w, t: base.t };
}
for (const stage of ['yard-wagon', 'yard-deck'] as const)
  for (const yard of [false, true])
    for (const every of [0, 44, 15]) {
      const results: number[] = [];
      for (const offset of [0, 100, 200]) {
        const source = yard ? stage : stage === 'yard-wagon' ? 'wagon-on' : 'deck-laid';
        const s = seed(source);
        if (offset === 0 && every === 0) {
          const wk = s.w.get(Works, worksId(s.w))!;
          assert.equal(wk.rack, WORKS.rackCap, 'naturally full Works rack');
          assert.ok(wk.lit >= 0, 'kiln lit through accepted ops');
          assert.equal(wk.pierRack, 0, 'empty pier rack');
          assert.equal(s.w.get(Aperture, s.w.single(Aperture))!.rack, 0, 'empty railhead rack');
          console.log(
            JSON.stringify({
              kind: 'accepted-ops-start',
              source,
              tick: s.t,
              rack: wk.rack,
              lit: wk.lit,
              pierRack: wk.pierRack,
              pierSet: wk.pierSet,
              aperture: s.w.get(Aperture, s.w.single(Aperture)),
              trains: trains(s.w)
                .filter((r, k) => LINE2_SLOTS.includes(k) && r.phase !== TRAIN_PHASE.SHED)
                .map(({ slot, phase, at, to, wagon, foot }) => ({ slot, phase, at, to, wagon, foot })),
            }),
          );
          assert.equal(plot(s.w, 1).at >= 0, yard, 'seed yard purchase');
        }
        advance(s, offset); // phase sweep, cargo may move during the wait; clock starts afterwards
        const start = s.t;
        let last = start - every;
        for (let guard = 0; guard < 12000; guard++) {
          const wk = s.w.get(Works, worksId(s.w))!;
          const ap = s.w.get(Aperture, s.w.single(Aperture))!;
          if (stage === 'yard-wagon' ? wk.pierSet === WORKS.pier : ap.cw === WORKS.counterweight) break;
          if (s.t - last >= every) {
            const rack = stage === 'yard-wagon' ? wk.pierRack : ap.rack;
            if (rack) {
              assert.equal(act(s, 'a', 'rail.footTake', { rack: stage === 'yard-wagon' ? 1 : 2 }), 1);
              assert.equal(act(s, 'a', 'rail.footSet', { site: stage === 'yard-wagon' ? 2 : 3 }), 1);
              last = s.t;
            }
          }
          if (ap.set === WORKS.ring && ap.brace === 1) assert.equal(act(s, 'a', 'rail.brace', { revision: 1 }), 1);
          advance(s, 1);
          assert.ok(guard < 11999, 'timing timeout');
        }
        results.push((s.t - start) / 10);
      }
      console.log(
        JSON.stringify({ kind: 'accepted-ops-time', stage, yard, carrySeconds: every / 10, seconds: results }),
      );
    }
// SYNTHETIC ONLY: direct writes below deliberately bypass progression and conservation.
// Kept apart from accepted-ops-time rows; this isolates persistent empty-rack scheduling.
// Controlled empty-rack comparison. Disable casting by leaving rack empty and kiln off.
// No carrying: owed persists. Same seed and train phase in each paired run.
for (const owed of [true, false]) {
  const s = seed('yard-wagon');
  const wk = s.w.mut(Works, worksId(s.w))!;
  wk.rack = 0;
  wk.lit = -1;
  if (!owed) wk.pierSet = WORKS.pier;
  const arrivals = new Map<number, number[]>();
  let prev = trains(s.w).map((r) => r.phase);
  let money = 0;
  let gross = 0;
  for (let i = 0; i < 18000; i++) {
    advance(s, 1);
    if (i === 5999) {
      money = till(s.w).landed;
      gross = till(s.w).landed + till(s.w).lost;
    }
    trains(s.w).forEach((r, k) => {
      if (
        LINE2_SLOTS.includes(k) &&
        r.at === 0 &&
        r.phase === TRAIN_PHASE.STAND &&
        prev[k] === TRAIN_PHASE.RUN &&
        i >= 6000
      ) {
        const a = arrivals.get(k) ?? [];
        a.push(s.t);
        arrivals.set(k, a);
      }
    });
    prev = trains(s.w).map((r) => r.phase);
  }
  console.log(
    JSON.stringify({
      kind: 'synthetic-empty-rack',
      owed,
      faresPerMin: (till(s.w).landed - money) / 20,
      grossFaresPerMin: (till(s.w).landed + till(s.w).lost - gross) / 20,
      cyclesSeconds: [...arrivals].map(([slot, a]) => ({ slot, seconds: a.slice(1).map((v, i) => (v - a[i]!) / 10) })),
    }),
  );
}
