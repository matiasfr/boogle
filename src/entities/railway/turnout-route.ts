// Which road each junction's points lie for (docs/plans/turnouts.md, (c) "Blades and the route"), as a pure function of
// accepted rows: the trains on lines 1 and 2, the shunt and the cart. ./turnout-blades.ts throws the blades to it. Local,
// the same on every tab; no three.js.
import { CART_FORGE, LEG } from '../../place/home-station.ts';
import type { Junction } from '../../place/junctions.ts';
import { FORMATION, LINKS, offsetLat } from '../../place/layout.ts';
import { KIT, type Turnout } from '../../place/turnout.ts';
import { LINE2, RAIL_TRAINS } from '../../sim/railway-lines.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { runningLine, trainStops } from '../../sim/railway-queries-trains.ts';
import { train, type ReadWorld } from '../../sim/railway-rows.ts';
import { TRAIN_PHASE, trainAlong } from '../../sim/railway-train.ts';
import { cartAt } from './cart-tag.ts';
import { endMergeM, line2Lat } from './line2-path.ts';
import { shuntOnSpur, shuntTargets, type ShuntPath } from './shunt-path.ts';

/** A train as its points see it: its line (LINKS' index), where it is (metres along the line), the way it runs (+1
 * up, -1 down, 0 standing) and its lateral off the line along its whole way (train-view.ts `latOf`). */
export type PointsTrain = { line: number; s: number; dir: -1 | 0 | 1; lat: (s: number) => number };
/** What the points read: the trains, whether the shunt is on the spur's side of its points, and the cart's distance
 * along its road (home-station.ts cartRoadAt; null while it is not out). */
export type RouteRows = { trains: readonly PointsTrain[]; shunt: boolean; cart: number | null };

/** A train sets a junction's points from this far off (metres to its toe or zone), or while any of it is over them. */
const NEAR = 60;
/** Half a train's length about its `s`, generous both ways (cars.ts consistBounds: about 13 m behind, 5 ahead). */
const TRAIN_HALF = 13;
/** The cart sets the leg's points from this far off either end of the leg. */
const LEG_NEAR = 20;
const LEG_FROM = CART_FORGE - LEG.len - LEG.to;

/**
 * The road a junction's points lie for: 0 the through road, 1 the diverging road (docs/plans/turnouts.md, (c)). J1 lies
 * for the spur while the shunt is on its side of the points; the leg's two (J2, J3) while the cart is on the leg or
 * within 20 m of it. A line's lies for the nearest train that runs through its toe: one over it (the toe to where
 * the roads are clear), else one coming to it within 60 m; the road is whether that train's lateral is off the through
 * road's just past the frog. With none they rest for the through road (sprung points).
 */
export function routeOf(point: { j: Junction; t: Turnout }, rows: RouteRows): 0 | 1 {
  const { j, t } = point;
  if (j.when === 'leg') {
    const d = rows.cart;
    return d !== null && d >= LEG_FROM - LEG_NEAR && d <= LEG_FROM + LEG.len + LEG_NEAR ? 1 : 0;
  }
  if (j.kind === 'spur') return rows.shunt ? 1 : 0;
  const line = LINKS.findIndex((l) => l.id === j.line),
    off = j.off ?? 0,
    z0 = Math.min(j.s, j.s + j.dir * t.clearD),
    z1 = Math.max(j.s, j.s + j.dir * t.clearD),
    past = j.s + j.dir * (t.frogD + 1);
  let best = Infinity,
    route: 0 | 1 = 0;
  for (const tr of rows.trains) {
    // A train that does not run through the toe (on the other track there) takes neither road.
    if (tr.line !== line || Math.abs(tr.lat(j.s) - off) > KIT.gauge / 2) continue;
    const lo = tr.s - TRAIN_HALF,
      hi = tr.s + TRAIN_HALF;
    const gap = hi >= z0 && lo <= z1 ? 0 : tr.dir > 0 && hi < z0 ? z0 - hi : tr.dir < 0 && lo > z1 ? lo - z1 : Infinity;
    if (gap > NEAR || gap >= best) continue;
    best = gap;
    route = Math.abs(tr.lat(past) - off) > KIT.gauge / 2 ? 1 : 0;
  }
  return route;
}

/** The trains on lines 1 and 2 as their points see them, at `tick` (as train-view.ts places and sets them across). */
export function pointsTrains(w: ReadWorld, tick: number): PointsTrain[] {
  const stops2 = trainStops(w, LINE2),
    merge2 = endMergeM(stops2),
    on2 = line2Trains(w);
  return RAIL_TRAINS.flatMap((_, slot): PointsTrain[] => {
    // The points follow every train on their running line.
    const line = runningLine(w, slot);
    if (line > LINE2 || (line === LINE2 && !on2)) return [];
    const row = train(w, slot);
    if (row.phase === TRAIN_PHASE.SHED) return [];
    const formation = FORMATION[LINKS[line]!.id];
    return [
      {
        line: line,
        s: trainAlong(row, line, tick) / 100,
        dir: row.phase === TRAIN_PHASE.STAND ? 0 : row.track ? -1 : 1,
        lat:
          line === LINE2
            ? (s) => line2Lat(row, s, stops2, merge2)
            : (s) => (row.track ? (offsetLat(formation, s) ?? 0) : 0),
      },
    ];
  });
}

/** The rows the points read at `tick`; before the first whole state, nothing (they rest for the through road). */
export function routeRows(w: ReadWorld, tick: number, whole: boolean, shunt: ShuntPath): RouteRows {
  if (!whole) return { trains: [], shunt: false, cart: null };
  return {
    trains: pointsTrains(w, tick),
    shunt: shuntOnSpur(shunt, shuntTargets(shunt, w, tick)),
    cart: cartAt(w, tick),
  };
}
