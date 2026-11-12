// Ring Island's steel works and the install on the real host (docs/plans/ring-island-build2.md, R4, v31): the yard
// take judged at the yard, the feed at the works' doorway, the install at the Roundhouse table; malformed kinds, lines,
// parts and revisions refused without a throw, and a stale install a noop.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { RING_STEEL_WORKS, RING_STEEL_YARD, STEEL } from '../../src/sim/railway-ring-layout.ts';
import { SHED_TABLE } from '../../src/sim/railway-works-layout.ts';
import { railwayAtSteel, type SteelStage } from '../../src/sim/railway-seed-steel.ts';
import { buildSeedWorld, invariant, line, steel, type Seed } from '../../test/helpers/rail.ts';
import { rail } from '../../src/sim/railway-rows.ts';
import { RAIL_LEGS, legRack } from '../../src/sim/railway-route.ts';
import { legKitNeed, legRow } from '../../src/sim/railway-queries-route.ts';

type Obj = Record<string, unknown>;
type At = [number, number, number];

/** A real host on a temp store, loaded with an accepted fixture; actions go through r:edit with their actor's spot. */
async function host(name: string, fixture: Seed, players: Record<string, string> = { s: 'a' }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `boogle-steel-${name}-`));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const h = createRailwayWorldHost({
    roomId: railwayRoomId(`steel-${name}`),
    store,
    tick: false,
    now: () => now,
    pidOf: (sid) => players[sid] ?? null,
    positions: () => [],
  });
  h.onSend((m) => sent.push(m));
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
  const sessions: Record<string, { epoch: number; request: number }> = {};
  for (const sid of Object.keys(players)) {
    h.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === sid)!;
    sessions[sid] = { epoch: Number(session.epoch), request: Number(session.next) - 1 };
  }
  return {
    get w() {
      return h.rules.railway.world();
    },
    ticks,
    later(ms: number) {
      now += ms;
    },
    depart: (sid: string) => h.depart(sid),
    grace: () => h.rules.tune.get('railBeamGraceS') * 1000,
    async action(e: Obj, at: At, sid = 's') {
      const x = sessions[sid]!;
      now += 1000;
      h.deliver({ t: 'r:edit', e: { ...e, epoch: x.epoch, request: ++x.request, at, ms: now - 1800000000000 } }, sid);
      await h.sync.whenDurable();
      assert.equal(invariant(h.rules.railway.world()), null);
      return h.rules.railway.outcome(players[sid]!, x.epoch, x.request)?.status;
    },
    async done() {
      await h.close({ save: false }).catch(() => {});
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
const spot = (p: { x: number; y: number; z: number }): At => [p.x, p.y, p.z];
const away = (p: { x: number; y: number; z: number }): At => [p.x + 2000, p.y, p.z];
const fixture = (stage: SteelStage) => railwayAtSteel(stage);
const install = (revision: unknown = 0, line = 1, part = 1) => ({ op: 'rail.install', line, part, revision });

test('steel host: the yard take at the yard, the feed at the works, each refused from elsewhere', async () => {
  const r = await host('reach', fixture('steel-kit'));
  try {
    assert.equal(
      await r.action({ op: 'rail.steelTake', kind: 1 }, spot(RING_STEEL_WORKS)),
      'rejected',
      'not at the yard',
    );
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 1 }, away(RING_STEEL_YARD)), 'rejected');
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 1 }, spot(RING_STEEL_YARD)), 'accepted');
    assert.ok(steel(r.w).yardRails < STEEL.rails, 'rails off the yard');
    assert.equal(await r.action({ op: 'rail.steel' }, spot(RING_STEEL_YARD)), 'rejected', 'not at the works');
    assert.equal(await r.action({ op: 'rail.steel' }, away(RING_STEEL_WORKS)), 'rejected');
    assert.equal(await r.action({ op: 'rail.steel' }, spot(RING_STEEL_WORKS)), 'accepted');
    assert.ok(steel(r.w).rails > 0, 'fed into the bill');
    assert.equal(await r.action({ op: 'rail.steel' }, spot(RING_STEEL_WORKS)), 'noop', 'an empty back');
    // No steel in the bay yet: the install is the rule's noop at the table.
    assert.equal(await r.action(install(), spot(SHED_TABLE)), 'noop');
  } finally {
    await r.done();
  }
});

// The greybox route (the step 3 review's P2-2): a leg counts the units lifted off its rack as held for its frame. A
// leaver holding them keeps them counted through the grace, then the host's leaver check releases them, so the leg
// loads them again and is never stalled by someone who is gone.
test("route host: a leaver's leg rack rails stay counted through the grace, then are owed again", async () => {
  const r = await host('leg-leaver', buildSeedWorld('ring-joined'), { s: 'a', t: 'b' });
  try {
    for (let k = 0; rail(r.w).depotRails === 0; k++) {
      assert.ok(k < 4000, 'the first kit racked');
      await r.ticks(1);
    }
    const rack = legRack(RAIL_LEGS[0]!, legRow(r.w, 0).laid);
    assert.equal(await r.action({ op: 'rail.depotRailTake' }, spot(rack), 't'), 'accepted');
    const held = legRow(r.w, 0).heldRails;
    assert.ok(held > 0, 'held on b');
    r.depart('t');
    await r.ticks(5);
    assert.equal(legRow(r.w, 0).heldRails, held, 'an absent carrier keeps them counted through the grace');
    r.later(r.grace());
    await r.ticks(3);
    assert.equal(legRow(r.w, 0).heldRails, 0, 'past the grace: owed again');
    assert.ok(legKitNeed(r.w, 0).rails >= held, 'the leg loads them again');
  } finally {
    await r.done();
  }
});

test('steel host: malformed kinds, lines, parts and revisions refused without a throw', async () => {
  const r = await host('malformed', fixture('steel-home'));
  try {
    for (const kind of [2, -1, 0.5, '1', null, undefined])
      assert.equal(await r.action({ op: 'rail.steelTake', kind }, spot(RING_STEEL_YARD)), 'rejected', `kind ${kind}`);
    for (const l of [0, 2, -1, '1', null])
      assert.equal(await r.action(install(0, l as number), spot(SHED_TABLE)), 'rejected', `line ${l}`);
    for (const part of [0, 2, '1', null])
      assert.equal(await r.action(install(0, 1, part as number), spot(SHED_TABLE)), 'rejected', `part ${part}`);
    for (const revision of [2, -1, 0.5, '0', null, undefined])
      assert.equal(
        await r.action({ op: 'rail.install', line: 1, part: 1, revision }, spot(SHED_TABLE)),
        'rejected',
        `revision ${revision}`,
      );
    assert.equal(line(r.w, 1).boiler, 0, 'nothing installed');
    // The room still answers.
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 0 }, spot(RING_STEEL_YARD)), 'noop', 'the yard empty');
  } finally {
    await r.done();
  }
});

test('steel host: the install at the table, once, two players pressing on the same revision', async () => {
  const r = await host('install', fixture('steel-home'), { s: 'alice', t: 'bob' });
  try {
    assert.equal(await r.action(install(), away(SHED_TABLE)), 'rejected', 'not at the table');
    assert.equal(await r.action(install(), spot(SHED_TABLE), 's'), 'accepted');
    assert.deepEqual([line(r.w, 1).boiler, line(r.w, 1).fitted >= 0], [1, true], 'line 2 fitted');
    assert.equal(await r.action(install(), spot(SHED_TABLE), 't'), 'noop', 'the second press saw a stale fit');
    assert.equal(await r.action(install(1), spot(SHED_TABLE), 't'), 'noop', 'already the longer boiler');
  } finally {
    await r.done();
  }
});
