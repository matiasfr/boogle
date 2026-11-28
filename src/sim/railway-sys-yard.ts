// The halt yards' systems (docs/plans/halt-yard.md, step 1): Leave it here and Pick up at a yard's bins, and where an
// abandoned pile's logs and stone recover to. Every transfer is a back and a yard's row inside one accepted op, so
// nothing duplicates and nothing vanishes. The server judges reach and asks the same haltYardServes as the rules, so a
// closed yard and the Village's logs and stone (taken with rail.rackTake) are refused there and give 0 here.
//
//   haltPut     rail.haltPut { yard, kind }: everything of that kind off the back into the yard, never capped
//   haltTake    rail.haltTake { yard, kind }: that kind off the yard, filling the back to its room
//   yardRecover(w, pile)   an abandoned pile of logs or stone to the nearest open yard (the supply pulse)
import { defineSystem, type World } from '../ecs/index.ts';
import {
  Account,
  Aperture,
  Beam,
  Boiler,
  HaltYard,
  Job,
  Leg,
  LegYard,
  Forge,
  Cart,
  Steel,
  Pile,
  QJob,
  Rail,
  Train,
  Works,
} from './railway-components.ts';
import { balanceOf, railId, roomOf, STONE } from './railway-queries.ts';
import { haltYardId, haltYardServes, nearestOpenYard, onRack, yardKey } from './railway-queries-yard.ts';
import { credit, pickedUp, putDown } from './railway-sys-line1.ts';
import type { Act } from './railway-sys-core.ts';
import { VILLAGE_YARD } from './railway-yard-layout.ts';

/** n of `kind` into yard k: the Village's logs and stone onto the recovery rack, the rest onto its row. */
function stock(w: World, k: number, kind: number, n: number) {
  if (onRack(k, kind)) {
    const rail = w.mut(Rail, railId(w))!;
    if (kind === STONE) rail.stoneRack += n;
    else rail.rack += n;
  } else w.mut(HaltYard, haltYardId(w, k))![yardKey(kind)] += n;
}
export const haltPut = defineSystem(
  'rail.haltPut',
  {
    reads: [Aperture, Job, QJob, Pile, Train, LegYard, Steel, Works, Cart, Forge],
    writes: [HaltYard, Rail, Account, Leg],
    phase: 'act',
    order: 80,
  },
  (w, { a: aid, e }: Act) => {
    const kind = e.kind;
    if (!haltYardServes(w, 'put', e.yard, kind)) return 0;
    const n = balanceOf(w.get(Account, aid)!, kind!);
    if (n <= 0) return 0;
    if (e.yard === VILLAGE_YARD && kind === 0) {
      w.mut(Account, aid)!.queuedGift += n;
    }
    stock(w, e.yard, kind!, n);
    credit(w.mut(Account, aid)!, kind!, -n);
    putDown(w, aid, kind!, n);

    return n;
  },
);
export const haltTake = defineSystem(
  'rail.haltTake',
  {
    reads: [Aperture, Beam, Boiler, Job, QJob, Pile, Rail, Train, Works, LegYard],
    writes: [HaltYard, Account, Leg],
    phase: 'act',
    order: 81,
  },
  (w, { a: aid, e }: Act) => {
    const kind = e.kind;
    // Never the rack's own logs and stone (haltYardServes): a take is always off the yard's row.
    if (!haltYardServes(w, 'take', e.yard, kind)) return 0;
    const id = haltYardId(w, e.yard),
      key = yardKey(kind!);
    const n = Math.min(w.get(HaltYard, id)![key], roomOf(w, w.get(Account, aid)!, kind!));
    if (n <= 0) return 0;
    w.mut(HaltYard, id)![key] -= n;
    credit(w.mut(Account, aid)!, kind!, n);
    pickedUp(w, aid, kind!, n);
    return n;
  },
);
/** An abandoned pile's logs (kind 0) or stone (1) go to the open yard nearest it ("Recovery"). */
export function yardRecover(w: World, pile: { x: number; z: number; n: number; kind: number }) {
  stock(w, nearestOpenYard(w, pile.x, pile.z), pile.kind, pile.n);
}
