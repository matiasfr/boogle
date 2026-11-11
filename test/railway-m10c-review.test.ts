// Review of M10 c (branch ecs/m10c-line2): line 2's views read rows and queries through the read facade. What stays of
// the review, with the server's rows as the oracle (`serverWorld()`) now that `inspect()` is not one: a stale boiler
// press is refused, forgeTake's bundle aim follows the back's rails, line 2's active stretch moves for a client on
// the frame the server's row moves it (plus its lag), and waitsForTrainOn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedWorld } from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { account, boiler, rail, type ReadWorld } from '../src/sim/railway-rows.ts';
import { qjobId } from '../src/sim/railway-queries.ts';
import { QJob } from '../src/sim/railway-components.ts';
import { line2Active } from '../src/sim/railway-queries-line2.ts';
import { waitsForTrainOn } from '../src/entities/railway/forge-offer.ts';
import type { World } from '../src/ecs/index.ts';

// ---------------------------------------------------------------- the press closures keep the revision seen
// boiler-view.ts targets(): `const { revision, holder } = b` when the prompt is built (the row is live). A stale
// press is refused by the server's revision check: the prompt's revision is sent, and the boiler stays where it is.
test("boiler-view's press closure sends the revision seen when its prompt was built, and a stale one changes nothing", () => {
  const r = railRoom(buildSeedWorld('boiler'));
  const a = r.join('a', 'a', 2);
  const b = r.join('b', 'b', 2);
  r.ready();
  r.run(5);
  const promptRevision = boiler(a.adapter.read.world()).revision;
  assert.ok(b.adapter.takeBoiler(boiler(b.adapter.read.world()).revision), 'b takes the boiler');
  r.run(30);
  const served = { ...boiler(r.serverWorld()) };
  assert.equal(served.holder, 'b', 'the server has b holding it');
  assert.notEqual(served.revision, promptRevision, 'the boiler moved on while the prompt stood');
  assert.equal(boiler(a.adapter.read.world()).revision, served.revision, "a's rows follow the server's");
  // a presses the stale prompt: it sends `promptRevision`, and the server does not accept it.
  a.adapter.takeBoiler(promptRevision);
  r.run(30);
  assert.deepEqual({ ...boiler(r.serverWorld()) }, served, 'the stale press changed nothing');
  assert.equal(boiler(a.adapter.read.world()).holder, 'b');
});

// ---------------------------------------------------------------- forgeTake's bundle aim
// line2-view.ts accepted(), rail.forgeTake: the flight's aim reads the back's rails live, each frame, from that
// frame's world (`account(read.world(), pid).rails`). A second take (or a deposit or a correction) during the 0.3 s
// flight changes them; the aim follows, and once the server has answered it is the server's count.
test("line2-view's forgeTake flight aims at the back's rails as they change during it, the server's once settled", () => {
  const tried: string[] = [];
  for (const stage of [
    'q1-done',
    'q2-arriving',
    'q3-done',
    'q4-arriving',
    'q4-done',
    'q5-carry',
    'works-lit',
  ] as const) {
    const r = railRoom(buildSeedWorld(stage));
    const a = r.join('a', 'a', 4);
    r.ready();
    r.run(5);
    let flights = 0;
    a.adapter.onAccepted((e) => void (e.op === 'rail.forgeTake' && e.pid === a.pid && flights++));
    const aim = () => account(a.adapter.read.world(), a.pid)?.rails ?? 0;
    const took = a.adapter.forgeTake();
    const railsOnTake = aim();
    r.run(3);
    // Within the flight: a second take, else one rail set down (both change the back's rails).
    const changed = took && (a.adapter.forgeTake() || a.adapter.drop(T1.x + 150, 3000, T1.z + 150, 1, 2 as 0 | 1 | 2));
    tried.push(`${stage}: took ${took}, changed ${changed}`);
    if (!took || !changed) continue;
    assert.notEqual(aim(), railsOnTake, `${stage}: the aim moved with the back's rails during the flight`);
    r.run(40);
    assert.equal(a.adapter.read.pending(), 0, `${stage}: both answered`);
    assert.ok(flights > 0, `${stage}: a forge take was accepted`);
    assert.equal(aim(), account(r.serverWorld(), a.pid)?.rails ?? 0, `${stage}: the aim is the server's count`);
    return;
  }
  assert.fail(`no seed let the back's rails change during a forge take's flight: ${tried.join('; ')}`);
});

// ---------------------------------------------------------------- the active stretch moves on the server's frame
// A packet writes the mirror in place; a passive client (no pending action, so world() is the confirmed mirror) must
// show line 2's active stretch the frame the server's row moves it, plus the lag of its link and no more, never
// before: the server's value at each step is recorded, and the client's must be one of the last `lag + 2`.
function follows(server: number[], seen: number[], lag: number, label: string) {
  for (let i = 0; i < seen.length; i++)
    assert.ok(
      server.slice(Math.max(0, i - lag - 2), i + 1).includes(seen[i]!),
      `${label}: frame ${i} shows ${seen[i]}`,
    );
  const moved = (xs: number[]) => xs.findIndex((v) => v !== xs[0]);
  const s = moved(server),
    c = moved(seen);
  assert.ok(s >= 0, `${label}: the server's active stretch moved in the run`);
  assert.ok(c >= s && c - s <= lag + 2, `${label}: the client saw it ${c - s} frames after the server (lag ${lag})`);
}

// Q5 laid by the server's rule (q5-finishing is 450 ticks short): the active stretch moves from 4 by a packet, on two
// lags, while the passive clients press nothing.
test("the active stretch as Q5 is laid by the rule: a client shows it the frame the server's row moves, plus its lag", () => {
  const r = railRoom(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 3);
  const b = r.join('b', 'b', 0);
  r.ready();
  const server: number[] = [],
    seen = new Map([
      [a, [] as number[]],
      [b, [] as number[]],
    ]);
  const frame = (c: typeof a) => {
    if (c === a) server.push(line2Active(r.serverWorld()));
    seen.get(c)!.push(line2Active(c.adapter.read.world()));
  };
  for (let k = 0; k < 3300 && !(server.length && server[server.length - 1] !== 4); k++) r.run(1, { each: frame });
  r.run(60, { each: frame });
  follows(server, seen.get(a)!, 3, 'a');
  follows(server, seen.get(b)!, 0, 'b');
});

// The crossing completed by an action (b sets the pier's last footing): Works.crossing is written by rail.footSet, not
// by a rule tick, so its packet can land between two estimated ticks. The active stretch goes -1 -> 6 (Q7 opens at the
// crossing) on a's confirmed mirror, written in place.
for (const delay of [0, 1, 2, 3, 4, 5])
  test(`Q7 goes active the frame the server's row does when b completes the crossing by a press (a on lag ${delay})`, () => {
    const r = railRoom(buildSeedWorld('crossing-finishing'));
    const a = r.join('a', 'a', delay);
    const b = r.join('b', 'b', 1);
    r.ready();
    r.run(7);
    const server: number[] = [],
      seen: number[] = [];
    const frame = (c: typeof a) => {
      if (c !== a) return;
      server.push(line2Active(r.serverWorld()));
      seen.push(line2Active(a.adapter.read.world()));
    };
    // Step b's two carries apart so their packets land at different phases of a's tick.
    for (let set = 0; set < 2; set++) {
      assert.ok(b.adapter.shoulderFooting(1), `b shoulders footing ${set + 1}`);
      r.run(4 + set, { each: frame });
      assert.ok(b.adapter.setFooting(2), `b sets footing ${set + 1}`);
      r.run(9, { each: frame });
    }
    r.run(60, { each: frame });
    assert.equal(line2Active(r.serverWorld()), 6, 'Q7 is the active stretch once the crossing is complete');
    assert.equal(line2Active(a.adapter.read.world()), 6, 'and a shows it');
    follows(server, seen, delay, `crossing lag ${delay}`);
  });

// ---------------------------------------------------------------- waitsForTrainOn
test('waitsForTrainOn: a train-fed active stretch with no bill waits for the train until the trains run or the bill starts', () => {
  const w = buildSeedWorld('glide-earned').w as World;
  const rw = w as unknown as ReadWorld;
  const active = line2Active(rw);
  assert.equal(active, 5, 'the Pier stretch is active');
  assert.equal(rail(rw).trains, -1, 'the trains are not running');
  assert.equal(waitsForTrainOn(rw), true, 'its kit is the train');
  assert.equal(waitsForTrainOn(rw, active), true, 'the caller may pass the active stretch it has');
  assert.equal(waitsForTrainOn(rw, 0), false, 'a hand-fed stretch never waits');
  w.mut(QJob, qjobId(w, active))!.start = 0;
  assert.equal(waitsForTrainOn(rw), false, 'once funded (a start tick) it does not wait');
});

test('waitsForTrainOn: the same stretch waits for no train once the trains run', () => {
  const rw = buildSeedWorld('trains-on').w as unknown as ReadWorld;
  assert.ok(rail(rw).trains >= 0, 'the trains run');
  assert.equal(line2Active(rw), 5);
  assert.equal(waitsForTrainOn(rw), false);
});
