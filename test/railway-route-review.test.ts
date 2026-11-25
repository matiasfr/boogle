// Independent review of greybox leg 1 step 3 on Ring Island build 2 (branch greybox/leg1-step3-v2, world v32): tests
// that fail on the defects the review found. Each drives the real rules from the `ring-joined` seed by accepted ops.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Account, Leg, Steel } from '../src/sim/railway-components.ts';
import { checkRoute } from '../src/sim/railway-check-route.ts';
import { LINE2, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import { trains } from '../src/sim/railway-rows.ts';
import { legHeldRoom, legKitNeed, legKitSurplus, legRow, legYard } from '../src/sim/railway-queries-route.ts';
import { steelNeed } from '../src/sim/railway-queries.ts';
import {
  act,
  advance,
  apply,
  buildSeedWorld,
  chopTo,
  invariant,
  restore,
  unaudited,
  type Seed,
} from './helpers/rail.ts';

const STACK = 0;
const N = RAIL_LEGS[STACK]!.sections.length;
const JOINED = buildSeedWorld('ring-joined');
const fresh = (): Seed => unaudited({ w: restore(JOINED.w), t: JOINED.t });
const acc = (s: Seed, pid: string) => s.w.get(Account, s.w.lookup(Account, pid)!)!;
const press = (s: Seed, pid: string, o: string, f: Record<string, unknown> = {}) => {
  const a = acc(s, pid);
  return apply(s.w, pid, { op: o, epoch: a.epoch, request: a.request + 1, ...f } as never, s.t).accepted;
};
/** Player `pid` takes what the leg's rack holds and feeds the frame. */
function stock(s: Seed, pid: string) {
  press(s, pid, 'rail.depotTake', { leg: STACK });
  press(s, pid, 'rail.depotRailTake', { leg: STACK });
  press(s, pid, 'rail.legStock', { leg: STACK });
}
/** Player a feeds the leg from its rack every tick until `laid` sections are laid. */
function playTo(s: Seed, laid: number, max = 9000) {
  for (let k = 0; legRow(s.w, STACK).laid < laid; k++) {
    assert.ok(k < max, `the leg reaches ${laid} laid (tick ${s.t})`);
    if (legRow(s.w, STACK).start < 0) stock(s, 'a');
    advance(s, 1);
  }
}

test('a full last rack survives a hand feed and save, but cannot exceed its section bill', () => {
  const s = fresh();
  playTo(s, N - 1);
  for (let wait = 0; legRow(s.w, STACK).rackLogs !== 20; wait++) {
    assert.ok(wait < 9000);
    advance(s, 1);
  }
  chopTo(s, 'b', 8);
  assert.equal(press(s, 'b', 'rail.legStock', { leg: STACK }), 8);
  assert.equal(legHeldRoom(s.w, STACK).logs, 12);
  assert.equal(legRow(restore(s.w), STACK).rackLogs, 20);
  s.w.mut(Leg, s.w.lookup(Leg, STACK)!)!.rackLogs++;
  assert.throws(() => checkRoute(s.w), /leg rack/);
  assert.ok(invariant(s.w));
});

// Finding 1. A leg's kit is loaded for the whole leg ahead (kitLead), so the last section's kit is aboard a train long
// before its frame opens. Logs a player brings from elsewhere (chopped, or the steel yard's) and feeds to the last
// frame make that many of the kit's surplus: the train unloads only what the section lacks (legRackNeed), the rest
// stays aboard, marked `legKit`, and once the leg is complete nothing ever takes it: no leg is open (legKitArrive,
// legKitLoad return), the works refuses a marked train (steelLoads, steelArrives) and it makes no stone stop
// (freightStop: cargo aboard that is not "waiting"). Build 2's review fixed the same thing for the works' kit
// ("kit still aboard with the works finished: nowhere takes it"); the assertion edited in 46e5ed84f now skips marked
// cargo, so it no longer sees this.
// From leg 2 (docs/plans/greybox-leg2.md, step 2) the stack's completion opens the incline, which takes the kit that
// rides on (it is fungible: logs and rails), so what is left riding, racked or in the Gorge yard is the incline's, owed
// to it, and no train carries surplus that nowhere takes.
test('review: logs brought to the last frame leave no leg kit riding the trains that nowhere takes, once the leg is complete', () => {
  const s = fresh();
  playTo(s, N - 1);
  // The whole leg's kit is loaded: nothing more is owed.
  for (let k = 0; legKitNeed(s.w, STACK).logs + legKitNeed(s.w, STACK).rails > 0; k++) {
    assert.ok(k < 3000, 'the last kit loaded');
    advance(s, 1);
  }
  const marked = () => trains(s.w).reduce((n, r) => n + (r.legKit ? r.logs + r.rails : 0), 0);
  const kit0 =
    marked() +
    legRow(s.w, STACK).rackLogs +
    legRow(s.w, STACK).rackRails +
    legRow(s.w, STACK).logs +
    legRow(s.w, STACK).rails;
  // A player brings four logs of their own to the last frame.
  chopTo(s, 'b', 4);
  const brought = acc(s, 'b').carry;
  assert.ok(brought > 0, 'b carries logs of their own');
  assert.equal(press(s, 'b', 'rail.legStock', { leg: STACK }), brought, 'the last frame takes them');
  playTo(s, N, 12000);
  advance(s, 3000);
  assert.equal(invariant(s.w), null);
  const surplus = trains(s.w).flatMap((_r, slot) => {
    const out = legKitSurplus(s.w, slot);
    return out.logs + out.rails ? [`train ${slot}: ${out.logs} logs, ${out.rails} rails`] : [];
  });
  const held = (key: 'logs' | 'rails') =>
    trains(s.w).reduce((n, r) => n + (r.legKit ? r[key] : 0), 0) +
    (key === 'logs' ? legRow(s.w, 1).rackLogs : legRow(s.w, 1).rackRails) +
    legYard(s.w, 1)[key];
  const room = legHeldRoom(s.w, 1);
  assert.deepEqual(
    { surplus, logs: held('logs') <= room.logs, rails: held('rails') <= room.rails },
    { surplus: [], logs: true, rails: true },
    `leg kit left with the leg complete (${kit0} units were in hand for the last section, ${brought} brought): all of it the incline's`,
  );
});

// Finding 2 (the builder's known leftover, item 6). legKitNeed counts every log and rail on every back as the leg's
// kit. The steel yard's rails on a back are the works' (steelNeed owes them again, so a train brings them twice), but
// the leg reads them as its own and loads that many fewer, for as long as they are held: the last section's frame
// stays short and the leg never completes, though its own rack is fed every tick. An account is never removed, so a
// player who leaves holding them stalls the leg until they come back.
test("review: the steel yard's rails on a back do not short a leg fed from its own rack", () => {
  const s = fresh();
  const steel = () => s.w.get(Steel, s.w.single(Steel))!;
  for (let k = 0; steel().yardRails === 0; k++) {
    assert.ok(k < 4000, 'the steel kit in the yard');
    advance(s, 1);
  }
  const held = act(s, 'b', 'rail.steelTake', { kind: 1 });
  assert.ok(held > 0, "b lifts the works' rails");
  assert.ok(steelNeed(s.w).rails > 0, 'the works owes them again: they are its kit, not the leg');
  // b stands holding them (or has left the room); a feeds the leg from its rack every tick.
  for (let k = 0; k < 15000 && legRow(s.w, STACK).laid < N; k++) {
    if (legRow(s.w, STACK).start < 0) stock(s, 'a');
    advance(s, 1);
  }
  assert.equal(invariant(s.w), null);
  const row = legRow(s.w, STACK);
  assert.equal(
    row.laid,
    N,
    `the leg stalls at ${row.laid} laid with ${row.logs} logs and ${row.rails} rails fed, ${legRow(s.w, STACK).rackRails} racked, ` +
      `${trains(s.w).reduce((n, r, slot) => n + (RAIL_TRAINS[slot]!.line === LINE2 && r.legKit ? r.rails : 0), 0)} aboard ` +
      `and ${legRow(s.w, STACK).loadedRails} ever loaded, while b holds ${acc(s, 'b').rails} of the works' rails`,
  );
});
