// Seeds for garage step 4's per-line trade (docs/plans/garage-step4.md, step 3), on ./railway-seed-legs.ts's `bay-mid`
// (./railway-seeds.ts is the catalog and how to add a stage). Accepted sim ops and ticks only, no direct state writes:
// the steel seed's own steps light the works and bring its steel home, then the table's chips and installs fit each
// line, and the trains take the fit at their own depots. Dev data: a stage changes no rule and needs no WORLD_NS bump.
//
//   trade-ready    bay-mid with the works lit and all 12 of its steel home: both trades open, nothing fitted
//   trade-fitted   `ns` on the Quick boiler and `bay` on the Strong, every serving train of each wearing it; the bay
//                  line's copy on the table
//   trade-held     trade-fitted run on: the bay cut laid, the Canopy gate open, and a Strong bay train holding at
//                  Bell Rock's railhead with leg 3's second section's kit aboard (the hold's cue), its first on the rack
import { act, advance, type Seed } from './railway-seed-route.ts';
import { invariant, need, restore } from './railway-drive.ts';
import { legStagesOn, railwayAtLegs } from './railway-seed-legs.ts';
import { steelHomeOn } from './railway-seed-steel.ts';
import { line, shed, train } from './railway-rows.ts';
import { upgradePool, tableFree } from './railway-queries-works.ts';
import { legKitDrop, legRow } from './railway-queries-route.ts';
import { legRailheadHold } from './railway-sys-route-kit.ts';
import { servingSlots } from './railway-trains.ts';
import { RAIL_LEGS, ROW_LINE } from './railway-route.ts';
import { STEEL } from './railway-ring-layout.ts';
import { RAIL_TRAINS } from './railway-lines.ts';
import { TRAIN_PHASE } from './railway-train.ts';

export const GARAGE_STAGES = ['trade-ready', 'trade-fitted', 'trade-held'] as const;
export type GarageStage = (typeof GARAGE_STAGES)[number];

const NS = ROW_LINE.ns,
  BAY = ROW_LINE.bay,
  CANOPY = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy');
/** The install parts of the trade (src/sim/railway-works-layout.ts installPart): Quick, Strong. */
const QUICK = 5,
  STRONG = 6;

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<GarageStage, Seed>();
/** The railway at a trade stage, each built on the one before it (`bay-mid` first). */
export function railwayAtGarage(stage: GarageStage): Seed {
  const k = GARAGE_STAGES.indexOf(stage);
  need(k >= 0, stage);
  let base = cache.get(stage);
  if (!base) {
    base = build(k ? railwayAtGarage(GARAGE_STAGES[k - 1]!) : railwayAtLegs('bay-mid'), stage);
    const broken = invariant(base.w);
    need(broken === null, `${stage}: ${broken}`);
    cache.set(stage, base);
  }
  return { w: restore(base.w), t: base.t };
}

function until(s: Seed, ok: () => boolean, max: number, what: string) {
  for (let guard = 0; !ok(); guard++) {
    need(guard < max, what);
    advance(s, 1);
  }
}
/** `line`'s copy brought to the table and fitted with `part`, by accepted ops, each after the table's hold. */
function fit(s: Seed, l: number, part: number) {
  until(s, () => s.t >= tableFree(s.w), 200, 'the table free for a bring');
  need(act(s, 'a', 'rail.bring', { line: l, revision: shed(s.w).bringRev }) === 1, `line ${l} brought`);
  until(s, () => s.t >= tableFree(s.w), 200, 'the table free for an install');
  need(act(s, 'a', 'rail.install', { line: l, part, revision: line(s.w, l).rev }) === 1, `line ${l} part ${part}`);
}
const wearing = (s: Seed, l: number, row: number) =>
  servingSlots((j) => train(s.w, j), l).every((j) => train(s.w, j).boiler === row);

function build(s: Seed, stage: GarageStage): Seed {
  const w = s.w;
  switch (stage) {
    case 'trade-ready':
      steelHomeOn(s);
      until(s, () => upgradePool(w) >= STEEL.total, 8000, 'all the steel home');
      break;
    case 'trade-fitted':
      fit(s, NS, QUICK);
      fit(s, BAY, STRONG);
      until(s, () => wearing(s, NS, 4) && wearing(s, BAY, 5), 6000, 'every ns train Quick and bay train Strong');
      need(shed(w).tableLine === BAY && upgradePool(w) === STEEL.total - 2, 'the bay copy on the table, 2 spent');
      break;
    case 'trade-held':
      legStagesOn(s, 'bay-mid', 'canopy-open');
      until(
        s,
        () =>
          RAIL_TRAINS.some((t, j) => {
            const r = train(w, j);
            return (
              t.line === BAY &&
              r.boiler === 5 &&
              r.phase === TRAIN_PHASE.STAND &&
              r.at === legKitDrop(w, BAY, CANOPY) &&
              r.legKit &&
              r.logs + r.rails > 0 &&
              legRailheadHold(w, j, s.t) === 'hold'
            );
          }),
        8000,
        'a Strong bay train holding at Bell Rock with the next kit aboard',
      );
      need(legRow(w, CANOPY).laid === 0, "leg 3's first section still to lay");
      break;
  }
  return s;
}
