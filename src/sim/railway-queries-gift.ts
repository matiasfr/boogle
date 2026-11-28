import type { World } from '../ecs/index.ts';
import { Account, LegYard, QJob, Rail, Steel, Train, Works } from './railway-components.ts';
import { kitJob, ringJoined, LINE2_SLOTS, trainId } from './railway-queries.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import { STEEL } from './railway-ring-layout.ts';
import { WORKS } from './railway-works-layout.ts';
import { SEAM_THROAT } from './railway-works.ts';
import { haltYardStock } from './railway-queries-yard.ts';
import { HALT_YARDS, VILLAGE_YARD } from './railway-yard-layout.ts';
import { legBuilt, RAIL_TRAINS } from './railway-lines.ts';
import {
  giftBill,
  giftBillId,
  legDone,
  legMintLine,
  legOpen,
  legRow,
  legYard,
  STOCKED_LEGS,
} from './railway-queries-route.ts';
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
export function giftPourRoom(w: World, k: number, mark: 'gift' | 'giftRails' = 'gift') {
  const line = RAIL_LEGS[k]!.line;
  const bill = giftBill(w, line, k, mark === 'gift' ? 'logs' : 'rails');
  if (!bill) return 0;
  const frame = mark === 'giftRails' ? giftBillId(w, k) : undefined;
  const relay = legMintLine(k) !== line ? giftAboard(w, legMintLine(k), mark, frame) + legYard(w, k)[mark] : 0;
  return Math.max(0, bill - giftAboard(w, line, mark, frame) - relay);
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
    return ringJoined(w) && s.lit < 0 && !legDone(w, 0) ? Math.max(0, STEEL.logs - s.logs) : 0;
  }
  const k = kitJob(w);
  if (k < 0 || LINE2_STATIONS[k]!.kitStop !== stop) return 0;
  const j = w.get(QJob, w.lookup(QJob, k)!)!;
  return j.start < 0 ? Math.max(0, LINE2_STATIONS[k]!.bill[0] - j.stock) : 0;
}
export function workNeed(w: World, stop: number) {
  return Math.max(0, workRoom(w, stop) - workAboard(w, stop, false));
}
export function workDestination(w: World) {
  // The kiln precedes Q6 on the board. Both can receive logs after the throat opens.
  if (workNeed(w, 1)) return 1;
  const k = kitJob(w);
  const stop = k < 0 ? 5 : LINE2_STATIONS[k]!.kitStop!;
  return workNeed(w, stop) ? stop : 0;
}
/** Surplus from a refused work delivery can only leave the rack in a player's hands. */
export function rideableLogs(w: World) {
  const rail = w.get(Rail, w.single(Rail))!;
  return rail.rack - rail.returnedLogs;
}
/** The kiln has first claim on queued timber while its log bin still has room. */
export function workQueued(w: World, stop: number, stock = rideableLogs(w)) {
  const available = stop === 1 ? stock : Math.max(0, stock - workNeed(w, 1));
  return Math.min(available, workNeed(w, stop));
}
export function railGiftRides(w: World) {
  return GIFT_LEGS.some((k) => giftPourRoom(w, k, 'giftRails') > 0);
}
export function giftRides(w: World) {
  const rail = w.get(Rail, w.single(Rail))!;
  if (rail.trains >= 0) {
    const kit = kitJob(w);
    const demand = workNeed(w, 1) + workNeed(w, kit < 0 ? 5 : LINE2_STATIONS[kit]!.kitStop!);
    if (demand) return rideableLogs(w) < demand;
  }
  return GIFT_LEGS.some((k) => giftPourRoom(w, k) > 0) || conversionNeed(w) > 0;
}
export function donatedLogs(w: World) {
  let logs = 0;
  w.each([Account], (_id, a) => {
    logs += a.queuedGift;
  });
  return logs;
}
export function giftQueued(w: World) {
  const stop = workDestination(w);
  if (stop) return workQueued(w, stop);
  const room = GIFT_LEGS.reduce((sum, k) => sum + giftPourRoom(w, k), 0);
  if (room) return Math.min(rideableLogs(w), room);
  return 2 * Math.min(Math.floor(donatedLogs(w) / 2), conversionNeed(w));
}
function conversionNeed(w: World) {
  const rails = GIFT_LEGS.reduce(
    (sum, k) => sum + (giftBill(w, RAIL_LEGS[k]!.line, k) ? 0 : giftPourRoom(w, k, 'giftRails')),
    0,
  );
  const direct = haltYardStock(w, VILLAGE_YARD, 2);
  return Math.max(0, rails - direct);
}
export function giftInTransit(w: World, mark: 'gift' | 'giftRails' = 'gift') {
  let total = giftAboard(w, undefined, mark);
  w.each([LegYard], (_id, yard) => {
    total += yard[mark];
  });
  return total;
}
export function giftAboard(w: World, line?: number, mark: 'gift' | 'giftRails' = 'gift', frame?: number) {
  let n = 0;
  w.each([Train], (_id, t) => {
    if ((line === undefined || RAIL_TRAINS[t.slot]!.line === line) && (frame === undefined || t.giftBill === frame))
      n += t[mark];
  });
  return n;
}
if (RAIL_LEGS.reduce((n, leg) => n + leg.sections.length, 0) >= 255) throw new Error('route exceeds Thanks capacity');
export const thanksStep = (w: World) => RAIL_LEGS.reduce((n, _leg, k) => n + legRow(w, k).laid, 0);
export function thank(w: World, aid: number) {
  w.mut(Account, aid)!.thanks = thanksStep(w) + 1;
}
/** Rack gifts are drawn in permanent account order. A work car holds up to 32 logs and the room has
 * 256 accounts: two hex digits per attributed log fit one saved string. Unattributed stock loads last. */
export function takeGivers(w: World, count: number, take: (aid: number, index: number, n: number) => void) {
  let index = 0;
  w.each([Account], (aid, a) => {
    const n = Math.min(count, a.queuedGift);
    if (n) {
      w.mut(Account, aid)!.queuedGift -= n;
      take(aid, index, n);
      count -= n;
    }
    index++;
  });
}
export function giverList(manifest: string) {
  return (manifest.match(/../g) ?? []).map((code) => Number.parseInt(code, 16));
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
  const aboard = new Set<number>();
  if (stop)
    w.each([Train], (_id, t) => {
      if (t.workStop === stop) for (const giver of giverList(t.workGivers)) aboard.add(giver);
    });
  const demand = stop ? workNeed(w, stop) : workDestination(w) ? 0 : giftQueued(w);
  const first = stop && stop !== 1 ? workNeed(w, 1) : 0;
  let queued = 0;
  let index = 0;
  w.each([Account], (_id, a) => {
    const end = queued + a.queuedGift;
    const waiting = demand > 0 && end > queued && end > first && queued < first + demand;
    if (waiting || aboard.has(index) || (stop ? a.workThanks & (1 << stop) : a.thanks === step)) pids.push(a.pid);
    queued = end;
    index++;
  });
  return pids;
}
