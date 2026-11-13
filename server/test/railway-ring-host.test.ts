// Ring Island's gap on the real host (docs/plans/ring-island-build1.md, R3b, v27): each ring op judged where its actor
// stands against where the railhead stands now (its rack, its jib and its lever's platform move out bent by bent), the
// brace at the gold strut, the rivet over the joint; malformed fields and a stale brace refused without a throw.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { RAIL_HALTS } from '../../src/sim/railway-lines.ts';
import { RING_BRACE, RING_HEAD, RING_RIVET } from '../../src/sim/railway-ring-layout.ts';
import { railwayAtRing, type RingStage } from '../../src/sim/railway-seed-ring.ts';
import { aperture, buildSeedWorld, chopTo, invariant, type Seed } from '../../test/helpers/rail.ts';
import { legOpen } from '../../src/sim/railway-queries-route.ts';
import { RAIL_LEGS, legFrame } from '../../src/sim/railway-route.ts';

type Obj = Record<string, unknown>;
type At = [number, number, number];

/** A real host on a temp store, loaded with an accepted fixture; actions go through r:edit with their actor's spot. */
async function host(
  name: string,
  fixture: Seed,
  players: Record<string, string> = { s: 'a' },
  roomName = `ring-${name}`,
  reload = false,
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `boogle-ring-${name}-`));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const create = () =>
    createRailwayWorldHost({
      roomId: railwayRoomId(roomName),
      store,
      tick: false,
      now: () => now,
      pidOf: (sid) => players[sid] ?? null,
      positions: () => [],
    });
  let h = create();
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
  if (reload) {
    await h.close({ save: true });
    assert.ok(await store.read(railwayRoomId(roomName)), 'the seed saved through the real host');
    h = create();
    await h.whenReady();
  }
  h.onSend((m) => sent.push(m));
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
const fixture = (stage: RingStage) => railwayAtRing(stage);
const RAILHEAD = RAIL_HALTS.findIndex((h) => h.name === 'Railhead');

test('shared boogle host loaded from a ring-joined save accepts rail.legStock', async () => {
  const seed = buildSeedWorld('ring-joined');
  chopTo(seed, 'a', 1);
  const r = await host('shared', seed, { s: 'a' }, 'boogle', true);
  try {
    assert.ok(legOpen(r.w, 0));
    assert.equal(await r.action({ op: 'rail.legStock', leg: 0 }, spot(legFrame(RAIL_LEGS[0]!, 0))), 'accepted');
  } finally {
    await r.done();
  }
});

test('ring host: the rack, the jib and the lever judged where the railhead stands now', async () => {
  const r = await host('reach', fixture('gap-footed'));
  try {
    const first = RING_HEAD[0]!,
      now = RING_HEAD[RING_HEAD.length - 1]!; // set 14: the railhead at bent 13
    assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(first.rack)), 'rejected', "bent 6's old rack");
    assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(now.rack)), 'accepted');
    assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(first.jib)), 'rejected', "bent 6's old jib");
    assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(now.jib)), 'accepted');
    assert.equal(aperture(r.w).cw, 1, 'the first counterweight hung');
    // The lever home on the Railhead's down platform: where the head is now, not bent 6.
    const call = { op: 'rail.call', id: RAILHEAD, dir: -1 };
    assert.equal(await r.action(call, spot(first.platform)), 'rejected', "bent 6's old platform");
    assert.equal(await r.action(call, spot(now.platform)), 'accepted');
    // The brace at the gold strut; the rivet over the joint, refused by the rule until the leaf is down.
    const far: At = [RING_BRACE.x + 2000, RING_BRACE.y, RING_BRACE.z];
    assert.equal(await r.action({ op: 'rail.brace', revision: 1 }, far), 'rejected');
    assert.equal(await r.action({ op: 'rail.brace', revision: 1 }, spot(RING_BRACE)), 'accepted');
    assert.equal(await r.action({ op: 'rail.brace', revision: 1 }, spot(RING_BRACE)), 'noop', 'braced already');
    assert.equal(await r.action({ op: 'rail.strike', id: 2 }, spot(RING_RIVET)), 'noop', 'the leaf still up');
    assert.equal(
      await r.action({ op: 'rail.strike', id: 2 }, [RING_RIVET.x + 2000, RING_RIVET.y, RING_RIVET.z]),
      'rejected',
    );
  } finally {
    await r.done();
  }
});

test('ring host: malformed rack, site, id and revision, and a stale brace, refused without a throw', async () => {
  const r = await host('malformed', fixture('leaf-raised'));
  try {
    const head = RING_HEAD[RING_HEAD.length - 1]!;
    for (const rack of [3, -1, 1.5, '2', null])
      assert.equal(await r.action({ op: 'rail.footTake', rack }, spot(head.rack)), 'rejected', `rack ${rack}`);
    for (const site of [4, -1, 2.5, '3', null])
      assert.equal(await r.action({ op: 'rail.footSet', site }, spot(head.jib)), 'rejected', `site ${site}`);
    for (const id of [3, -1, 1.5, '2', null])
      assert.equal(await r.action({ op: 'rail.strike', id }, spot(RING_RIVET)), 'rejected', `id ${id}`);
    for (const revision of [0, 2, -1, '1', null, undefined])
      assert.equal(
        await r.action({ op: 'rail.brace', revision }, spot(RING_BRACE)),
        'rejected',
        `a stale or malformed brace (${revision})`,
      );
    assert.equal(aperture(r.w).brace, 1, 'the leaf still raised');
    // The room still answers.
    assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(head.rack)), 'accepted');
  } finally {
    await r.done();
  }
});

// R4c with two players (the P1 of 11 November): the brace from one player at the gold strut and the counterweight from
// another at the jib, each judged where its own actor stands; in either order the leaf is down on the last of them.
for (const braceFirst of [true, false])
  test(`ring host: one player braces, another hangs the counterweight, ${braceFirst ? 'brace' : 'weights'} first`, async () => {
    const r = await host(`two-${braceFirst}`, fixture('leaf-raised'), { s: 'alice', t: 'bob' });
    try {
      const head = RING_HEAD[RING_HEAD.length - 1]!;
      const brace = () => r.action({ op: 'rail.brace', revision: 1 }, spot(RING_BRACE), 's');
      const hang = async (k: number) => {
        assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(head.rack), 't'), 'accepted', `take ${k}`);
        assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(head.jib), 't'), 'accepted', `hang ${k}`);
      };
      // Each judged at its own actor's spot: bob's press at the strut from the jib is out of reach.
      assert.equal(
        await r.action({ op: 'rail.brace', revision: 1 }, spot(head.jib), 't'),
        'rejected',
        'not at the strut',
      );
      if (braceFirst) assert.equal(await brace(), 'accepted');
      for (let k = 1; k <= 4; k++) await hang(k);
      if (!braceFirst) {
        assert.deepEqual([aperture(r.w).cw, aperture(r.w).brace], [4, 1], 'four hung on the pawl');
        assert.equal(await brace(), 'accepted');
      }
      const a = aperture(r.w);
      assert.deepEqual([a.cw, a.brace, a.rack, a.joined], [4, 0, 0, -1], 'down, the rivet not struck');
      assert.equal(await brace(), 'noop', 'a second pull moves nothing');
    } finally {
      await r.done();
    }
  });
