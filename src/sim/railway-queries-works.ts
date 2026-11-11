// The Works' and the Roundhouse's derived facts on the world (docs/plans/ecs-migration-railway.md, M8): the world twins
// of the read model's helpers in ./railway-works.ts. Pure reads.
//
//   footingTotal(w)    every footing's home: Works rack, backs, ground piles, the wagon, pier rack, stall, cradle, sea,
//                      and Ring Island's railhead rack, bents and counterweight (v27)
//   pierNeed(w)        footings the pier still wants that are not already set, racked there or aboard the wagon
//   worksStage(w)      a label for views and the bot
import type { World } from '../ecs/index.ts';
import { WORKS } from './railway-works-layout.ts';
import { SEAM_THROAT, type WorksStage } from './railway-works.ts';
import { Account, Aperture, Pile, Shed, Train, Works } from './railway-components.ts';
import { apertureId, FOOT, pierOwed, shedId, worksId } from './railway-queries.ts';

/** Footings aboard any train (the wagon). */
const wagonFoot = (w: World) => {
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
    wagonFoot(w) +
    ring.rack +
    ring.set +
    ring.cw
  );
}
export const pierNeed = (w: World) => Math.max(0, pierOwed(w, wagonFoot(w))); // after Q7 the wagon carries the ring's
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
