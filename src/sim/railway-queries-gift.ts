import type { World } from '../ecs/index.ts';
import { Account, Cart, LegYard, QJob, Rail, Steel, Train, Works } from './railway-components.ts';
import { depotNeed, kitJob, steelNeed, ringJoined, LINE2_SLOTS, trainId } from './railway-queries.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import { STEEL } from './railway-ring-layout.ts';
import { WORKS } from './railway-works-layout.ts';
import { SEAM_THROAT } from './railway-works.ts';
import { haltYardStock } from './railway-queries-yard.ts';
import { HALT_YARDS } from './railway-yard-layout.ts';
import { legBuilt, RAIL_TRAINS } from './railway-lines.ts';
import { giftBill, legDone, legMintLine, legOpen, legRow, legYard, STOCKED_LEGS } from './railway-queries-route.ts';
import { RAIL_LEGS } from './railway-route.ts';

export const GIFT_LEGS = RAIL_LEGS.flatMap((_leg, k) => (legBuilt(k) ? [k] : []));
export function giftLegs(w: World, line: number) {
  return GIFT_LEGS.filter(
    (k) =>
      (legMintLine(k) === line || RAIL_LEGS[k]!.line === line) &&
      legOpen(w, k) &&
      (!STOCKED_LEGS.includes(k) || legRow(w, k).laid > 0),
  );
}
export function giftPourRoom(w: World, k: number) {
  const line = RAIL_LEGS[k]!.line;
  const bill = giftBill(w, line, k);
  if (!bill) return 0;
  const relay = legMintLine(k) !== line ? giftAboard(w, legMintLine(k)) + legYard(w, k).gift : 0;
  return Math.max(0, bill - giftAboard(w, line) - relay);
}
// Destinations are the existing Line 2 stops. Zero is an unmarked car.
export const QUARRY_YARD = HALT_YARDS.findIndex((y) => y.id === 'quarry');
export const workSite = ['', 'kiln', 'Q6', 'Q7', '', 'steelworks'] as const;
export function workAboard(w: World, stop: number, includeReturns = true) {
  let n = 0;
  for (const slot of LINE2_SLOTS) {
    const t = w.get(Train, trainId(w, slot))!;
    if ((includeReturns ? Math.abs(t.workStop) : t.workStop) === stop) n += t.workLogs;
  }
  return n;
}
/** Physical room on arrival, before outstanding reservations. */
export function workRoom(w: World, stop: number) {
  if (w.get(Rail, w.single(Rail))!.trains < 0) return 0;
  if (stop === 1) {
    const kiln = w.get(Works, w.single(Works))!;
    return kiln.lit < 0 && kiln.seams & SEAM_THROAT
      ? Math.max(0, WORKS.kilnLogs - kiln.logs - haltYardStock(w, QUARRY_YARD, 0))
      : 0;
  }
  if (stop === 5) {
    const s = w.get(Steel, w.single(Steel))!;
    return ringJoined(w) && s.lit < 0 && !legDone(w, 0) ? Math.max(0, STEEL.logs - s.logs - s.yardLogs) : 0;
  }
  const k = kitJob(w);
  if (k < 0 || LINE2_STATIONS[k]!.kitStop !== stop) return 0;
  const j = w.get(QJob, w.lookup(QJob, k)!)!;
  return j.start < 0
    ? Math.max(
        0,
        LINE2_STATIONS[k]!.bill[0] - j.stock - w.get(Rail, w.single(Rail))!.depot - w.get(Cart, w.single(Cart))!.logs,
      )
    : 0;
}
export function workNeed(w: World, stop: number) {
  const room = workRoom(w, stop);
  if (!room) return 0;
  if (stop === 1) return Math.max(0, room - workAboard(w, stop, false));
  if (stop === 5) return steelNeed(w).logs;
  const k = kitJob(w);
  return depotNeed(w, k, w.get(QJob, w.lookup(QJob, k)!)!).logs;
}
export function workDestination(w: World) {
  // The kiln precedes Q6 on the board. Both can receive logs after the throat opens.
  if (workNeed(w, 1)) return 1;
  const k = kitJob(w);
  const stop = k < 0 ? 5 : LINE2_STATIONS[k]!.kitStop!;
  return workNeed(w, stop) ? stop : 0;
}
/** The kiln has first claim on queued timber while its log bin still has room. */
export function workQueued(w: World, stop: number, stock = w.get(Rail, w.single(Rail))!.rack) {
  const available = stop === 1 ? stock : Math.max(0, stock - workNeed(w, 1));
  return Math.min(available, workNeed(w, stop));
}
export function giftRides(w: World) {
  const rail = w.get(Rail, w.single(Rail))!;
  if (rail.trains >= 0) {
    const kit = kitJob(w);
    const demand = workNeed(w, 1) + workNeed(w, kit < 0 ? 5 : LINE2_STATIONS[kit]!.kitStop!);
    if (demand) return rail.rack < demand;
  }
  return GIFT_LEGS.some((k) => giftPourRoom(w, k) > 0);
}
export function giftQueued(w: World) {
  const stop = workDestination(w);
  if (stop) return workQueued(w, stop);
  const room = GIFT_LEGS.reduce((sum, k) => sum + giftPourRoom(w, k), 0);
  return Math.min(w.get(Rail, w.single(Rail))!.rack, room);
}
export function giftInTransit(w: World) {
  let total = giftAboard(w);
  w.each([LegYard], (_id, yard) => {
    total += yard.gift;
  });
  return total;
}
export function giftAboard(w: World, line?: number) {
  let n = 0;
  w.each([Train], (_id, t) => {
    if (line === undefined || RAIL_TRAINS[t.slot]!.line === line) n += t.gift;
  });
  return n;
}
if (RAIL_LEGS.reduce((n, leg) => n + leg.sections.length, 0) >= 255) throw new Error('route exceeds Thanks capacity');
export const thanksStep = (w: World) => RAIL_LEGS.reduce((n, _leg, k) => n + legRow(w, k).laid, 0);
export function thank(w: World, aid: number) {
  w.mut(Account, aid)!.thanks = thanksStep(w) + 1;
}
export function workBillOpen(w: World, stop: number) {
  if (stop === 1) return w.get(Works, w.single(Works))!.lit < 0;
  if (stop === 5) return w.get(Steel, w.single(Steel))!.lit < 0 && !legDone(w, 0);
  const j = w.get(QJob, w.lookup(QJob, stop + 3)!)!;
  return j.start < 0 && !j.completion;
}
export function worksThanks(w: World, stop = 0) {
  if (stop && !workBillOpen(w, stop)) return [];
  const step = thanksStep(w) + 1;
  const pids: string[] = [];
  w.each([Account], (_id, a) => {
    if (stop ? a.workThanks & (1 << stop) : a.thanks === step) pids.push(a.pid);
  });
  return pids;
}
