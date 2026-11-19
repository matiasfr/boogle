// The halt yards' facts (docs/plans/halt-yard.md, step 1; the catalog in ./railway-yard-layout.ts): pure reads that
// the yard's systems, the server's validation, the witnesses, the save check and the effects share.
//
//   haltYardId(w, k)                 the HaltYard row of slot k
//   haltYardOpen(w, k)               the yard takes and gives: the Village always, the others once their stretch is laid
//   haltYardServes(w, op, k, kind)   an op the yard takes now: open, a kind it holds, and at the Village only rails taken
//   onRack(k, kind), yardKey(kind)   where a bin lives: the Village's logs and stone on the rack, the rest on the row
//   haltYardStock(w, k, kind)        what a bin holds
//   nearestOpenYard(w, x, z)         the open yard nearest a point: squared integer distance, ties to the lower slot
//   haltYardTotals(w)                the rows' logs, stone and rails, for the conserved counts (never the rack's)
import type { World } from '../ecs/index.ts';
import { HaltYard, Job, QJob, Rail } from './railway-components.ts';
import { RAILS } from './railway-line2-layout.ts';
import { HALT_YARDS, VILLAGE_YARD } from './railway-yard-layout.ts';
import { jobId, qjobId, railId, STONE } from './railway-queries.ts';
import { railInt } from './railway.ts';

export const haltYardId = (w: World, k: number) => w.lookup(HaltYard, k)!;
/** Whether slot k names a yard and it is open. */
export function haltYardOpen(w: World, k: unknown): k is number {
  if (!railInt(k, HALT_YARDS.length - 1)) return false;
  const opens = HALT_YARDS[k]!.opens;
  if (!opens) return true;
  const row = opens.line === 1 ? w.get(Job, jobId(w, opens.slot)) : w.get(QJob, qjobId(w, opens.slot));
  return !!row!.completion;
}
/** The Village's logs and stone are the recovery rack's own (Rail.rack, Rail.stoneRack), taken with rail.rackTake. */
export const onRack = (k: number, kind: number) => k === VILLAGE_YARD && kind !== RAILS;
/** Whether yard k takes `op` of `kind` now (the server's validation and the rules both ask): an open yard, logs (0),
 * stone (1) or rails (2), and never a haltTake of the rack's own logs or stone. */
export function haltYardServes(w: World, op: 'put' | 'take', k: unknown, kind: unknown): k is number {
  return haltYardOpen(w, k) && railInt(kind, RAILS) && !(op === 'take' && onRack(k, kind));
}
/** The row field a kind is kept in: 0 logs, 1 stone, 2 rails (RAILS). */
export const yardKey = (kind: number) => (kind === RAILS ? 'rails' : kind === STONE ? 'stone' : 'logs');
/** What yard k's bin of `kind` holds. */
export function haltYardStock(w: World, k: number, kind: number) {
  if (onRack(k, kind)) {
    const rail = w.get(Rail, railId(w))!;
    return kind === STONE ? rail.stoneRack : rail.rack;
  }
  return w.get(HaltYard, haltYardId(w, k))![yardKey(kind)];
}
/** The open yard nearest (x, z), by squared integer distance, ties to the lower slot; the Village is always open. */
export function nearestOpenYard(w: World, x: number, z: number) {
  let best = VILLAGE_YARD,
    far = Infinity;
  HALT_YARDS.forEach((y, k) => {
    const dx = y.x - x,
      dz = y.z - z,
      d = dx * dx + dz * dz;
    if (d < far && haltYardOpen(w, k)) {
      best = k;
      far = d;
    }
  });
  return best;
}
/** Every row's logs, stone and rails (the Village's logs and stone stay on the rack, counted as the rack). */
export function haltYardTotals(w: World) {
  const out = { logs: 0, stone: 0, rails: 0 };
  w.each([HaltYard], (_id, y) => {
    out.logs += y.logs;
    out.stone += y.stone;
    out.rails += y.rails;
  });
  return out;
}
