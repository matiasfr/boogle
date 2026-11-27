import type { World } from '../ecs/index.ts';
import { Account, Rail, Train } from './railway-components.ts';
import { legBuilt, RAIL_TRAINS } from './railway-lines.ts';
import { giftBill, legMintChain, legOpen, legRow, STOCKED_LEGS } from './railway-queries-route.ts';
import { RAIL_LEGS } from './railway-route.ts';

export const GIFT_LEGS = RAIL_LEGS.flatMap((leg, k) => (legBuilt(k) && leg.kit === 'home' ? [k] : []));
export function giftLegs(w: World, line: number) {
  return GIFT_LEGS.filter(
    (k) => RAIL_LEGS[k]!.line === line && legOpen(w, k) && (!STOCKED_LEGS.includes(k) || legRow(w, k).laid > 0),
  );
}
export function giftPourRoom(w: World, k: number) {
  const line = RAIL_LEGS[k]!.line;
  return Math.max(0, giftBill(w, line, k) - giftAboard(w, line));
}
const lines = [...new Set(GIFT_LEGS.map((k) => RAIL_LEGS[k]!.line))];
export function giftRides(w: World) {
  return lines.some((line) => {
    const legs = giftLegs(w, line);
    if (!legs.length) return false;
    if (legs.some((k) => giftPourRoom(w, k) > 0)) return true;
    const ch = legMintChain(w, line);
    const first = ch.owed.findIndex((owed) => owed.logs + owed.rails > 0);
    return first >= 0 && legs.includes(ch.legs[first]!) && ch.owed[first]!.logs > 0;
  });
}
export const giftQueued = (w: World) => (giftRides(w) ? w.get(Rail, w.single(Rail))!.rack : 0);
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
