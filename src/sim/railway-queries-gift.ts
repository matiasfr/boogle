import type { World } from '../ecs/index.ts';
import { Account, LegYard, Rail, Train } from './railway-components.ts';
import { legBuilt, RAIL_TRAINS } from './railway-lines.ts';
import { giftBill, legMintLine, legOpen, legRow, legYard, STOCKED_LEGS } from './railway-queries-route.ts';
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
export function giftRides(w: World) {
  return GIFT_LEGS.some((k) => giftPourRoom(w, k) > 0);
}
export const giftQueued = (w: World) => (giftRides(w) ? w.get(Rail, w.single(Rail))!.rack : 0);
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
export function worksThanks(w: World) {
  const step = thanksStep(w) + 1;
  const pids: string[] = [];
  w.each([Account], (_id, a) => {
    if (a.thanks === step) pids.push(a.pid);
  });
  return pids;
}
