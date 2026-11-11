// Split-rock Works and the Roundhouse on the real host (docs/plans/split-rock-roundhouse.md, J3g): each op judged
// where its actor stands; the kiln's casts, the wagon's load and a dropped footing survive restarts and recovery.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost, type RailwayPosition } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { LINE2_BOILER } from '../../src/sim/railway-line2-layout.ts';
import {
  SHED_TABLE,
  WORKS,
  WORKS_BREAKER,
  WORKS_KILN,
  WORKS_RACK,
  WORKS_SEAMS,
} from '../../src/sim/railway-works-layout.ts';
import { footingTotal } from '../../src/sim/railway-queries-works.ts';
import {
  account,
  act,
  advance,
  advanceWorks,
  apply,
  beam,
  boiler,
  createRailway,
  invariant,
  logs,
  piles,
  railSession,
  railwayAtTrains,
  railwayAtWorks,
  rocks,
  train,
  trains,
  works,
  worksClock,
  type Seed,
  type WorksStage,
} from '../../test/helpers/rail.ts';

type Obj = Record<string, unknown>;
type At = [number, number, number];

/** A real host on a temp store, loaded with an accepted fixture; actions go through r:edit with their actor's spot. */
async function host(name: string, fixture: Seed) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `boogle-works-${name}-`));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const people: { list: (RailwayPosition | null)[] } = { list: [] };
  const create = () => {
    const h = createRailwayWorldHost({
      roomId: railwayRoomId(`works-${name}`),
      store,
      tick: false,
      now: () => now,
      pidOf: () => 'a',
      positions: () => people.list,
    });
    h.onSend((m) => sent.push(m));
    return h;
  };
  let h = create(),
    epoch = 0,
    request = 0;
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      h.step(0.1);
    }
    await h.sync.whenDurable();
  };
  await h.whenReady();
  while (h.sync.world.tick <= fixture.t) await ticks(1);
  h.rules.railway.world().load(JSON.parse(JSON.stringify(fixture.w.snapshot())), railwayCheck);
  h.rules.railway.touchAll();
  const open = async () => {
    h.deliver({ t: 'r:open' }, 's');
    await ticks(3);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === 's')!;
    epoch = Number(session.epoch);
    request = Number(session.next) - 1;
  };
  await open();
  return {
    get h() {
      return h;
    },
    /** The room's world, read again at every use: a restart replaces it. */
    get w() {
      return h.rules.railway.world();
    },
    people,
    ticks,
    later: (ms: number) => void (now += ms),
    now: () => now,
    async action(e: Obj, at: At) {
      now += 1000;
      h.deliver({ t: 'r:edit', e: { ...e, epoch, request: ++request, at, ms: now - 1800000000000 } }, 's');
      await h.sync.whenDurable();
      assert.equal(invariant(h.rules.railway.world()), null);
      return h.rules.railway.outcome('a', epoch, request)!.status;
    },
    async restart() {
      await h.close({ save: true });
      h = create();
      await h.whenReady();
      assert.equal(invariant(h.rules.railway.world()), null);
      await open();
    },
    async done() {
      await h.close({ save: false }).catch(() => {});
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
const spot = (p: { x: number; y: number; z: number }): At => [p.x, p.y, p.z];
const fixture = (stage: WorksStage) => railwayAtWorks(stage);

test('works host: strikes, the kiln and the table judged where their actor stands', async () => {
  const r = await host('judged', fixture('works-arrive'));
  try {
    assert.equal(
      await r.action({ op: 'rail.breaker' }, [WORKS_BREAKER.x + 2000, WORKS_BREAKER.y, WORKS_BREAKER.z]),
      'rejected',
    );
    assert.equal(await r.action({ op: 'rail.breaker' }, spot(WORKS_BREAKER)), 'accepted');
    const throat = WORKS_SEAMS[1];
    // The kiln's frame is in the sealed cut: nobody reaches it before the throat is struck.
    assert.equal(await r.action({ op: 'rail.kiln' }, spot(WORKS_KILN)), 'rejected');
    assert.equal(await r.action({ op: 'rail.strike', id: 1 }, [throat.x + 2000, throat.y, throat.z]), 'rejected');
    assert.equal(await r.action({ op: 'rail.strike', id: 1 }, [throat.x, throat.y + 2000, throat.z]), 'rejected');
    assert.equal(await r.action({ op: 'rail.strike', id: 1 }, spot(throat)), 'accepted');
    assert.equal(await r.action({ op: 'rail.strike', id: 1 }, spot(throat)), 'noop');
    assert.equal(await r.action({ op: 'rail.strike', id: 0 }, spot(throat)), 'rejected', 'the stall slab is at Home');
    assert.equal(await r.action({ op: 'rail.strike', id: 0 }, spot(WORKS_SEAMS[0])), 'accepted');
    assert.equal(works(r.w).seams, 3);
    assert.equal(await r.action({ op: 'rail.kiln' }, spot(WORKS_KILN)), 'noop', 'open now; nothing on the back');
    // The table: before the stall it is the rule's to refuse; a stale revision is the judge's.
    assert.equal(await r.action({ op: 'rail.turn', to: 1, revision: 0 }, spot(SHED_TABLE)), 'noop');
    assert.equal(await r.action({ op: 'rail.turn', to: 1, revision: 3 }, spot(SHED_TABLE)), 'rejected');
  } finally {
    await r.done();
  }
  // Only when ready (owner, 10 November): the stall alone is refused by the rule; once the cradle is fitted, one turn.
  const early = await host('early', fixture('stall-done'));
  try {
    assert.equal(await early.action({ op: 'rail.turn', to: 1, revision: 0 }, spot(SHED_TABLE)), 'noop', 'not fitted');
  } finally {
    await early.done();
  }
  const s = await host('table', fixture('cradle-fitted'));
  try {
    const far: At = [SHED_TABLE.x + 2000, SHED_TABLE.y, SHED_TABLE.z];
    assert.equal(await s.action({ op: 'rail.turn', to: 1, revision: 0 }, far), 'rejected');
    assert.equal(await s.action({ op: 'rail.turn', to: 1, revision: 0 }, spot(SHED_TABLE)), 'accepted');
    assert.equal(await s.action({ op: 'rail.turn', to: 0, revision: 0 }, spot(SHED_TABLE)), 'rejected', 'stale');
    assert.equal(
      await s.action({ op: 'rail.turn', to: 0, revision: 1 }, spot(SHED_TABLE)),
      'noop',
      'never turned back once the wagon rolls out',
    );
    assert.equal(
      await s.action({ op: 'rail.footTake', rack: 0 }, [WORKS_RACK.x, WORKS_RACK.y, WORKS_RACK.z + 2000]),
      'rejected',
    );
    assert.equal(await s.action({ op: 'rail.footTake', rack: 0 }, spot(WORKS_RACK)), 'accepted');
    assert.equal(
      await s.action({ op: 'rail.footSet', site: 1 }, spot(WORKS_RACK)),
      'rejected',
      'the cradle is at Home',
    );
  } finally {
    await s.done();
  }
});

test('works host: a restart mid-cast keeps rack and poured; a restart with the wagon loaded keeps its footings', async () => {
  const lit = fixture('works-lit');
  advanceWorks(lit, WORKS.castTicks);
  const r = await host('cast', lit);
  try {
    assert.equal(await r.action({ op: 'rail.footTake', rack: 0 }, spot(WORKS_RACK)), 'accepted');
    await r.ticks(40);
    const before = { works: { ...works(r.w) }, clock: { ...worksClock(r.w) } };
    assert.equal(before.works.rack, WORKS.rackCap, 'the room came back at once');
    await r.restart();
    assert.deepEqual({ ...works(r.w) }, before.works, 'rack and poured survive');
    assert.deepEqual({ ...worksClock(r.w) }, before.clock, 'and the cast clock');
    await r.ticks(WORKS.castTicks);
    assert.equal(works(r.w).poured, before.works.poured, 'a full rack waits');
    assert.equal(footingTotal(r.w), works(r.w).poured);
  } finally {
    await r.done();
  }
  const wagon = fixture('wagon-on');
  // The wagon couples to whichever line-2 train reaches the Village first.
  const slot = trains(wagon.w).findIndex((r) => r.wagon);
  assert.ok(slot >= 0, 'the wagon is coupled');
  for (let guard = 0; train(wagon.w, slot).foot === 0; guard++) {
    assert.ok(guard < 4000, 'the wagon loads at the quarry');
    advanceWorks(wagon, 1);
  }
  const t = await host('wagon', wagon);
  try {
    const row = { ...train(t.w, slot) };
    assert.ok(row.wagon && row.foot > 0);
    await t.restart();
    assert.deepEqual({ ...train(t.w, slot) }, row);
    assert.equal(footingTotal(t.w), works(t.w).poured);
  } finally {
    await t.done();
  }
});

test('works host: an aged footing pile with nobody near goes back to the Works rack', async () => {
  const r = await host('pile', fixture('works-lit'));
  try {
    const rack = WORKS_RACK;
    const ground: At = [rack.x + 200, rack.y, rack.z];
    assert.equal(await r.action({ op: 'rail.footTake', rack: 0 }, spot(rack)), 'accepted');
    assert.equal(
      await r.action({ op: 'rail.drop', n: 1, kind: 3, x: ground[0], y: ground[1], z: ground[2] }, ground),
      'accepted',
    );
    const pile = () => piles(r.w).find((p) => p.kind === 3);
    assert.ok(pile());
    const before = works(r.w).rack;
    // Someone standing by keeps it on the ground.
    r.later(22 * 60000);
    for (let k = 0, n = piles(r.w).length; k <= n; k++) {
      r.people.list = [{ pid: 'b', x: ground[0] / 100, z: ground[2] / 100, at: r.now() + 100 }];
      await r.ticks(1);
      r.later(60000);
    }
    assert.deepEqual(
      piles(r.w).map((p) => p.kind),
      [3],
      'every other pile went back; this one is protected while someone is near',
    );
    r.people.list = [];
    // One recovered pile per pulse, lowest id first: the older piles of earlier fixtures go back before it.
    for (let k = 0; pile() && k < 128; k++) {
      r.later(60000);
      await r.ticks(1);
    }
    assert.equal(pile(), undefined);
    assert.equal(works(r.w).rack, before + 1);
    await r.restart();
    assert.equal(works(r.w).rack, before + 1);
    assert.equal(footingTotal(r.w), works(r.w).poured);
  } finally {
    await r.done();
  }
});

test("works host: a leaver's footing waits out the grace, then goes back to the Works rack", async () => {
  // The reviewer's case: the kiln casts exactly the sixteen the sites need, so a footing kept by a leaver would stop
  // the pier at eleven for good.
  const r = await host('leaver', fixture('wagon-on'));
  try {
    const now = () => works(r.w);
    const foot = () => account(r.w, 'a')!.foot;
    const grace = () => r.h.rules.tune.get('railBeamGraceS') * 1000;
    assert.equal(await r.action({ op: 'rail.footTake', rack: 0 }, spot(WORKS_RACK)), 'accepted');
    // A restart ends every session; whoever comes back within the grace still carries it.
    await r.restart();
    r.later(grace());
    await r.ticks(3);
    assert.equal(foot(), 1, 'back in a new session: still on their back');
    r.h.depart('s');
    await r.ticks(5);
    assert.equal(foot(), 1, 'an absent carrier keeps it through the grace');
    const before = { ...now() };
    r.later(grace());
    await r.ticks(3);
    assert.equal(foot(), 0);
    // Back on the Works rack, besides whatever the kiln cast meanwhile (it may run over six; the kiln then waits).
    assert.equal(now().rack, before.rack + 1 + now().poured - before.poured);
    assert.equal(footingTotal(r.w), now().poured);
    await r.restart();
    assert.equal(foot(), 0, 'a restart does not bring it back');
    assert.equal(footingTotal(r.w), now().poured);
  } finally {
    await r.done();
  }
});

test('works host: a carrier back for less than a rule tick still gets a fresh grace', async () => {
  const r = await host('brief', fixture('wagon-on'));
  try {
    const now = () => works(r.w);
    const foot = () => account(r.w, 'a')!.foot;
    const grace = () => r.h.rules.tune.get('railBeamGraceS') * 1000;
    assert.equal(await r.action({ op: 'rail.footTake', rack: 0 }, spot(WORKS_RACK)), 'accepted');
    r.h.depart('s');
    await r.ticks(1);
    r.later(grace() - 1000);
    // Back in a new session and gone again (a newer tab took over) before any rule tick saw them.
    r.h.deliver({ t: 'r:open' }, 's');
    r.h.depart('s');
    r.later(1500);
    await r.ticks(1);
    assert.equal(foot(), 1, 'the second absence has its own grace');
    const before = { ...now() };
    r.later(grace());
    await r.ticks(1);
    assert.equal(foot(), 0);
    assert.equal(now().rack, before.rack + 1 + now().poured - before.poured);
    assert.equal(footingTotal(r.w), now().poured);
  } finally {
    await r.done();
  }
});
type Host = Awaited<ReturnType<typeof host>>;
/** Away almost the whole grace, then back in a new session (r:open) and gone again before any rule tick saw them. */
async function briefReturn(r: Host) {
  r.h.depart('s');
  await r.ticks(1);
  r.later(r.h.rules.tune.get('railBeamGraceS') * 1000 - 1000);
  r.h.deliver({ t: 'r:open' }, 's');
  r.h.depart('s');
  r.later(1500);
  await r.ticks(1);
}
/** Line one at T3, open and unfunded, with the great tree felled: the beam is there to take. Sim ops only. */
function atBeam(): Seed {
  const w: Seed = { w: createRailway(), t: 40 };
  for (const pid of ['a', 'b']) railSession(w.w, pid, 1);
  apply(w.w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  logs(w, 'a', 'T1', 24);
  advance(w, 300);
  for (let i = 0; i < 8;) {
    const n = act(w, 'b', 'rail.mine', { id: rocks(w.w).findIndex((r) => r.left > 0) });
    assert.equal(act(w, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs(w, 'a', 'T2', 32);
  advance(w, 300);
  for (let i = 0; i < 12; i++) assert.equal(act(w, 'a', 'rail.beamChop'), 1);
  assert.equal(beam(w.w).state, 'available');
  return w;
}
test('works host: a boiler carrier back for less than a rule tick gets a fresh grace, then it goes to the pedestal', async () => {
  const r = await host('brief-boiler', railwayAtTrains('boiler'));
  try {
    const boilerNow = () => boiler(r.w);
    const grace = r.h.rules.tune.get('railBeamGraceS') * 1000;
    assert.equal(
      await r.action({ op: 'rail.boilerTake', revision: boilerNow().revision }, spot(LINE2_BOILER)),
      'accepted',
    );
    await briefReturn(r);
    assert.equal(invariant(r.w), null);
    assert.deepEqual([boilerNow().state, boilerNow().holder], ['held', 'a'], 'the second absence has its own grace');
    r.later(grace);
    await r.ticks(1);
    assert.deepEqual([boilerNow().state, boilerNow().holder], ['pedestal', '']);
    assert.deepEqual([boilerNow().x, boilerNow().y, boilerNow().z], spot(LINE2_BOILER));
    assert.equal(invariant(r.w), null);
  } finally {
    await r.done();
  }
});
test('works host: a beam carrier back for less than a rule tick gets a fresh grace, then it lies where they stood', async () => {
  const r = await host('brief-beam', atBeam());
  try {
    const beamNow = () => beam(r.w);
    const grace = r.h.rules.tune.get('railBeamGraceS') * 1000;
    assert.equal(
      await r.action({ op: 'rail.beamTake', revision: beamNow().revision }, [beamNow().x, 0, beamNow().z]),
      'accepted',
    );
    const stood = [beamNow().x, beamNow().y, beamNow().z];
    await briefReturn(r);
    assert.equal(invariant(r.w), null);
    assert.deepEqual([beamNow().state, beamNow().holder], ['held', 'a'], 'the second absence has its own grace');
    r.later(grace);
    await r.ticks(1);
    assert.deepEqual([beamNow().state, beamNow().holder], ['ground', '']);
    assert.deepEqual([beamNow().x, beamNow().y, beamNow().z], stood, 'where they stood');
    assert.equal(invariant(r.w), null);
  } finally {
    await r.done();
  }
});
