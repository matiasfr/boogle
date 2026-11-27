// The Works' and the Roundhouse's derived facts on the world (docs/plans/ecs-migration-railway.md, M8). Pure reads.
//
//   footingTotal(w)    every footing's home: Works rack, backs, ground piles, train decks, pier rack, stall, cradle, sea,
//                      and Ring Island's railhead rack, bents and counterweight (v27)
//   pierNeed(w)        footings the pier still wants that are not already set, racked there or aboard trains
//   worksStage(w)      a label for views and the bot
//   upgradePool(w)     the steel every upgrade may spend: all hub stores of steel added together; today only Home's
//                      Roundhouse bay, landed less spent (docs/plans/shared-pool.md, section 3)
//   tableFree(w)       the first tick the garage table takes an install or a bring (garage step 4's hold)
//   tableBusy(w, tick) the table refuses an install or a bring now: the roll-out, or that hold
import type { World } from '../ecs/index.ts';
import { RAIL_LEGS } from './railway-route.ts';
import { legDone } from './railway-queries-route.ts';
import { railInt } from './railway.ts';
import { BRING_TICKS, WORKS, steelPool } from './railway-works-layout.ts';
import { SEAM_THROAT, type WorksStage } from './railway-works.ts';
import { Account, Aperture, Line, Pile, Shed, Train, Works } from './railway-components.ts';
import { apertureId, FOOT, pierOwed, shedId, wagonSlot, worksId } from './railway-queries.ts';

/** Footings aboard every carrier, including loader decks; the conserved total is independent of carrier role. */
const carrierFoot = (w: World) => {
  let n = 0;
  w.each([Train], (_id, r) => (n += r.foot));
  return n;
};
export function footingTotal(w: World) {
  const works = w.get(Works, worksId(w))!,
    shed = w.get(Shed, shedId(w))!;
  let backs = 0,
    piles = 0;
  w.each([Account], (_id, a) => (backs += a.foot));
  w.each([Pile], (_id, p) => (piles += p.kind === FOOT ? p.n : 0));
  const ring = w.get(Aperture, apertureId(w))!;
  return (
    works.rack +
    works.pierRack +
    works.pierSet +
    shed.stall +
    shed.cradle +
    backs +
    piles +
    carrierFoot(w) +
    ring.rack +
    ring.set +
    ring.cw
  );
}
export const pierNeed = (w: World) => Math.max(0, pierOwed(w, carrierFoot(w))); // after Q7 carriers bring the ring's
export function worksStage(w: World): WorksStage {
  const works = w.get(Works, worksId(w))!,
    shed = w.get(Shed, shedId(w))!;
  if (works.breaker === 0) return 'dormant';
  if (works.crossing >= 0) return 'crossing';
  let wagon = false;
  w.each([Train], (_id, r) => (wagon ||= r.wagon));
  if (wagon) return 'wagon';
  if (shed.fitted >= 0) return 'fitted';
  if (shed.stall === WORKS.stall) return 'stall';
  if (works.lit >= 0) return 'lit';
  if (works.seams & SEAM_THROAT) return 'open';
  return 'breaker';
}
/** The one world-wide steel pool an upgrade checks its price against (docs/plans/shared-pool.md, section 3). Screens
 * count this; a store's stack shows only what lies in that store (`steelPool` of its own row). */
export const upgradePool = (w: World) => steelPool(w.get(Shed, shedId(w))!);
/** The garage table's hold (garage step 4): the first tick a rail.install or rail.bring is accepted, BRING_TICKS after
 * the last bring and WORKS.upgradeTicks after any line's last install (`Line.fitted`, which every part sets). */
export function tableFree(w: World, site: number) {
  const h = w.get(Shed, shedId(w))!;
  const brought = site === 1 ? h.quayBrought : h.brought;
  let free = brought >= 0 ? brought + BRING_TICKS : 0;
  w.each([Line], (_id, l) => {
    if (l.fitted >= 0) free = Math.max(free, l.fitted + WORKS.upgradeTicks);
  });
  return free;
}
/** The garage table refuses an install or a bring now (garage step 4): the wagon's roll-out holds it, or tableFree's
 * hold has not run out. */
export function tableBusy(w: World, tick: number, site: number) {
  const h = w.get(Shed, shedId(w))!;
  return (site === 0 && h.ready >= 0 && wagonSlot(w) < 0) || tick < tableFree(w, site);
}
const QUAY_LEG = RAIL_LEGS.findIndex((leg) => leg.id === 'cave');
export function tableOpen(w: World, site: unknown): site is number {
  return railInt(site, 1) && (site === 0 || legDone(w, QUAY_LEG));
}
