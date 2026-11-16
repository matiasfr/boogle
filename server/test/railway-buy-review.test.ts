// Independent review of B1 through the real r:edit path: different plots raced in one tick, a buy re-sent after a
// restart under a new session epoch, and the old epoch's edit replayed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { buildSeedWorld, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { Till } from '../../src/sim/railway-components.ts';
import { plot, till } from '../../src/sim/railway-rows.ts';

type Obj = Record<string, unknown>;
async function fixture(stage: SeedStage) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-buy-review-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const create = () => {
    const h = createRailwayWorldHost({
      roomId: railwayRoomId('buy-review'),
      store,
      tick: false,
      now: () => now,
      pidOf: (sid) => sid,
      saveMs: 1000000000,
    });
    h.onSend((m) => sent.push(m));
    return h;
  };
  let h = create();
  const mirrors = new Map<string, ReturnType<typeof createRailwayMirror>>();
  const connect = (sid: string) => {
    const mirror = createRailwayMirror();
    mirrors.set(sid, mirror);
    h.replication.addClient(sid);
    return mirror;
  };
  await h.whenReady();
  const seed = buildSeedWorld(stage);
  const step = async (n: number) => {
    for (let k = 0; k < n; k++) {
      now += 100;
      h.step(0.1);
      h.replication.commit(h.sync.roomStep());
      h.replication.flush(h.sync.roomStep(), (sid, _p, json) => {
        const packet = JSON.parse(json);
        sent.push({ ...packet, to: sid });
        assert.ok(mirrors.get(sid)!.mirror.apply(packet, 0));
      });
    }
    await h.sync.whenDurable();
  };
  await step(seed.t);
  h.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
  h.rules.railway.touchAll();
  const sessions = new Map<string, { epoch: number; request: number }>();
  const open = (sid: string) => {
    h.deliver({ t: 'r:open' }, sid);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === sid)!;
    assert.ok(session);
    sessions.set(sid, { epoch: Number(session.epoch), request: Number(session.next) - 1 });
  };
  connect('alice');
  connect('bob');
  open('alice');
  open('bob');
  return {
    get h() {
      return h;
    },
    get w() {
      return h.rules.railway.world();
    },
    sent,
    step,
    connect,
    mirrors,
    send(fields: Obj, sid = 'alice') {
      const s = sessions.get(sid) ?? { epoch: 1, request: 0 };
      const e = { op: 'rail.buy', ...fields, epoch: s.epoch, request: ++s.request, at: [90460, 1800, 3520], ms: 100 };
      h.deliver({ t: 'r:edit', e }, sid);
      return { e, result: h.rules.railway.outcome(sid, s.epoch, s.request) };
    },
    async restart() {
      await h.close({ save: true });
      h = create();
      await h.whenReady();
      for (const sid of mirrors.keys()) connect(sid);
      open('alice');
      open('bob');
    },
    async close() {
      await h.close({ save: false });
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

test('review host: two players race different plots in one tick with money for one; spent once', async () => {
  const f = await fixture('house-ready');
  try {
    const w = f.w,
      b = w.mut(Till, w.single(Till))!,
      extra = 450 - b.boogles;
    b.boogles += extra;
    b.landed += extra;
    const tick = f.h.sync.world.tick;
    assert.equal(f.send({ id: 1 }, 'alice').result?.status, 'accepted');
    assert.equal(f.send({ id: 0 }, 'bob').result?.status, 'rejected');
    assert.equal(f.h.sync.world.tick, tick, 'one tick');
    assert.deepEqual([till(f.w).boogles, till(f.w).spent, plot(f.w, 0).at, plot(f.w, 1).paid], [50, 400, -1, 400]);
    await f.step(5);
    railwayCheck(f.w, f.h.sync.world.tick);
  } finally {
    await f.close();
  }
});

test('review host: a buy re-sent after a restart under the new epoch, and the old edit replayed, spend once', async () => {
  const f = await fixture('house-ready');
  try {
    const first = f.send({ id: 0 });
    assert.equal(first.result?.status, 'accepted');
    await f.step(2);
    await f.restart();
    // The client never heard its ack and sends the same buy again, now as request 1 of the new epoch.
    assert.equal(f.send({ id: 0 }).result?.status, 'rejected', 'already bought');
    const sent = f.sent.length;
    f.h.deliver({ t: 'r:edit', e: first.e }, 'alice'); // the old epoch's edit, late
    await f.step(1);
    assert.ok(
      f.sent.slice(sent).some((m) => JSON.stringify(m).includes('session')),
      'the old epoch is refused as a session',
    );
    assert.deepEqual([till(f.w).spent, plot(f.w, 0).paid], [150, 150]);
    railwayCheck(f.w, f.h.sync.world.tick);
  } finally {
    await f.close();
  }
});
