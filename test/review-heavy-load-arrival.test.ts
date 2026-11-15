// Independent f83e49fa8 review: offset sweeps, JSON reload and late-client replication.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FixtureLine, standingAt } from './helpers/rail-rows.ts';
import { RAIL_LINES, LINE2 } from '../src/sim/railway-lines.ts';
import { TRAIN_PHASE, TRAIN, trainArrives, reqOnly } from '../src/sim/railway-train.ts';
import { endMoved, trainStepLine, lineSpacing, cycleTicks } from '../src/sim/railway-trains.ts';
import { ringRivetSequence } from './helpers/railway-rivet-sequence.ts';
import { apply, invariant, restore } from '../src/sim/railway-drive.ts';
import { advance, type Seed } from '../src/sim/railway-seed-route.ts';
import { account, trains, piles, trees, rail } from '../src/sim/railway-rows.ts';
import { legRow } from '../src/sim/railway-queries-route.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { createSync } from '../src/world/sync.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { installRailRules } from './helpers/rail-rules.ts';
import { homeLand } from './helpers/land.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createRailwayMirror, RAIL_SCHEMAS } from '../src/world/railway-replicate.ts';

for (const count of [1, 2]) {
  test(`review: ${count} trains, every stub-extension offset -80..80 preserves routing, spacing and JSON reload`, () => {
    // Catalog geometry and stop ownership, isolated from freight/hold policy.
    const line = { ...RAIL_LINES[LINE2]!, id: `review-${count}`, trains: count, fleet: undefined };
    for (const stop of [6, 7, 8]) {
      const before = line.halts.slice(0, stop + 1).map((h) => h.s);
      const after = line.halts.slice(0, stop + 2).map((h) => h.s);
      const initial = new FixtureLine(before, 0, 0, line);
      initial.rows = Array.from({ length: count }, (_, k) => standingAt(before, 0, 0, -10000 - k * 100));
      initial.rows[0] = {
        ...standingAt(before, stop - 1, 0),
        phase: TRAIN_PHASE.RUN,
        to: stop,
        from: before[stop - 1]!,
        dest: before[stop]!,
        depart: 0,
        logs: 20,
        rails: 20,
      };
      const arrival = trainArrives(initial.rows[0]!, line);
      for (let offset = -80; offset <= 80; offset++) {
        const f = new FixtureLine(before, 0, 0, line);
        f.rows = structuredClone(initial.rows);
        if (count === 2) {
          // Second loaded train follows on the same approach; the ordinary block rule holds it short.
          f.rows[1] = {
            ...standingAt(before, stop - 1, 0, 0),
            at: -1,
            to: -1,
            from: before[stop - 1]! - 10000,
            dest: before[stop - 1]! - 10000,
            logs: 20,
            rails: 20,
          };
        }
        let extended = false,
          reached = false;
        for (let tick = 1; tick < arrival + 2 * cycleTicks(line, after); tick++) {
          if (tick === arrival + offset) {
            f.stops = after;
            endMoved(f.io(), line, stop, tick);
            // lay()'s existing standing-stub behavior; arrival itself is trainStepLine's production code.
            for (const r of f.rows)
              if (r.phase === TRAIN_PHASE.STAND && r.at === stop && r.track === 1)
                Object.assign(r, { track: 0, origin: 0, depart: tick, req: reqOnly(r.req, after.length, 1) });
            extended = true;
          }
          if (tick === arrival - 1 || tick === arrival || tick === arrival + 1) f.restore();
          trainStepLine(f.io(), line, tick);
          assert.equal(f.broken(), null, `${count}/${stop}/${offset} at ${tick}`);
          assert.equal(
            lineSpacing((k) => f.rows[k]!, line, f.stops, tick),
            null,
            `${count}/${stop}/${offset} spacing ${tick}`,
          );
          if (extended && f.rows[0]!.phase === TRAIN_PHASE.STAND && f.rows[0]!.at === stop + 1) {
            reached = true;
            break;
          }
          if (extended && offset <= TRAIN.dwellTicks)
            assert.equal(f.rows[0]!.track, 0, `${count}/${stop}/${offset}: no homeward detour before the new head`);
        }
        assert.ok(reached, `${count}/${stop}/${offset}: original loaded train reaches new head`);
      }
    }
  });
}

function stock(s: Seed) {
  for (const pid of ['a', 'b'])
    for (const op of ['rail.depotTake', 'rail.depotRailTake', 'rail.legStock']) {
      const a = account(s.w, pid)!;
      apply(s.w, pid, { op, epoch: a.epoch, request: a.request + 1, leg: 0 }, s.t);
    }
}
const prefix = ringRivetSequence();
while (legRow(prefix.w, 0).laid < 1) {
  if (legRow(prefix.w, 0).start < 0) stock(prefix);
  advance(prefix, 1);
}

function lateJoin(s: Seed) {
  const sync = createSync(),
    replication = createReplicator();
  const rules = installRailRules(sync, homeLand(), replication);
  const api = installRailway(sync, rules, replication);
  api.world().load(s.w.snapshot());
  api.touchAll();
  const mirror = createRailwayMirror();
  replication.addClient('late');
  replication.commit(1);
  let chars = 0,
    packets = 0,
    largest = 0;
  replication.flush(1, (_cid, _p, json) => {
    chars += json.length;
    packets++;
    largest = Math.max(largest, json.length);
    assert.ok(mirror.mirror.apply(JSON.parse(json), 0));
  });
  for (const c of RAIL_SCHEMAS)
    for (const id of s.w.ids(c)) assert.deepEqual(mirror.confirmed().get(c, id), s.w.get(c, id), `${c.kind}/${id}`);
  return { chars, packets, largest };
}

for (let delay = 0; delay <= 64; delay++) {
  test(`review: real mixed-overfill funding delay ${delay}, reload and late join at second lay`, () => {
    const s: Seed = { w: restore(prefix.w), t: prefix.t };
    let due = -1,
      checked = false;
    const begin = s.t;
    while (legRow(s.w, 0).laid < 4 && s.t - begin < 8000) {
      const g = legRow(s.w, 0);
      if (g.laid === 1 && due < 0) {
        // Wait until both builders can fund, as the original regression, then shift the accepted commands.
        if (s.t >= begin + 560) due = s.t + delay;
      }
      if (g.start < 0 && (g.laid !== 1 || (due >= 0 && s.t >= due))) stock(s);
      if (g.laid === 1 && g.start >= 0 && s.t === g.start + TRAIN.dwellTicks) s.w = restore(s.w);
      if (g.laid === 1 && g.start >= 0 && s.t === g.start + 299) {
        s.w = restore(s.w);
        lateJoin(s);
        checked = true;
      }
      advance(s, 1);
      if (checked && g.laid === 1 && legRow(s.w, 0).laid === 2) assert.equal(invariant(s.w), null);
    }
    assert.ok(checked, 'reload and late join actually exercised');
    assert.equal(legRow(s.w, 0).laid, 4, 'Gorge opens');
    assert.equal(invariant(s.w), null);
    assert.equal(restore(s.w).hash(), s.w.hash());
    assert.ok(trains(s.w).filter((r) => r.phase !== TRAIN_PHASE.SHED).length >= 3);
  });
}

test('review: 2048 one-log drop attempts conserve cargo through reload and chunked late join', (t) => {
  const s = buildSeedWorld('awake');
  const send = (op: string, fields: Record<string, number | boolean> = {}) => {
    const a = account(s.w, 'a')!;
    return apply(s.w, 'a', { op, epoch: a.epoch, request: a.request + 1, ...fields }, s.t).accepted;
  };
  for (let i = 0; i < 2048; i++) {
    if (!account(s.w, 'a')!.carry) {
      const k = trees(s.w).findIndex((r) => r.left > 0);
      assert.ok(send('rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }));
    }
    // Fill all 128 rows, top them up locally to eight, then try overflowing each full pile.
    assert.equal(send('rail.drop', { n: 1, kind: 0, x: 90000 + (i % 128), z: 0, y: 0 }), i < 1024 ? 1 : 0);
  }
  assert.equal(piles(s.w).length, 128, 'loose rows stop at the validated pile capacity');
  assert.equal(rail(s.w).rack, 0, 'Drop never recovers cargo remotely');
  assert.equal(
    piles(s.w).reduce((sum, p) => sum + p.n, rail(s.w).rack),
    1024,
  );
  assert.equal(account(s.w, 'a')!.carry, 2, 'refused drops leave the harvested cargo on the carrier');
  assert.equal(invariant(s.w), null);
  s.w = restore(s.w);
  const wire = lateJoin(s);
  t.diagnostic(
    JSON.stringify({
      piles: piles(s.w).length,
      recovered: rail(s.w).rack,
      saveBytes: JSON.stringify(s.w.snapshot()).length,
      ...wire,
    }),
  );
});
