// B1's real r:edit boundary: two players, recorded refusals, persisted spending and a mid-build restart.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { setTune } from '../../src/sim/tune.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { buildSeedWorld, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { plot, till } from '../../src/sim/railway-rows.ts';
import { plotBuilt, tillRate } from '../../src/sim/railway-queries-trade.ts';
import { TRADE, TRADE_PCT } from '../../src/sim/railway-trade-layout.ts';
import { townHas, townRead } from '../../src/sim/town-facts.ts';
import { RAIL_PREDICTED } from '../../src/world/railway-predict.ts';
import { intentOf, railwayActs } from '../../src/adapters/railway-intents.ts';

type Obj = Record<string, unknown>;
async function fixture(stage: SeedStage) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-buy-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const create = () => {
    const h = createRailwayWorldHost({
      roomId: railwayRoomId('buy'),
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

test('buy host: unstaked and unaffordable plots refuse through r:edit', async () => {
  for (const stage of ['awake', 'freight-running'] as const) {
    const f = await fixture(stage);
    try {
      const before = { ...till(f.w) };
      assert.equal(f.send({ id: 0 }).result?.status, 'rejected', stage);
      assert.deepEqual(till(f.w), before);
      assert.equal(plot(f.w, 0).at, -1);
    } finally {
      await f.close();
    }
  }
});

test('buy host: malformed ids and a player with no railway session cannot spend', async () => {
  const f = await fixture('house-ready');
  try {
    const before = { ...till(f.w) };
    for (const id of [undefined, null, '0', {}, [], -1, 0.5, 3, 16, 999999])
      assert.equal(f.send({ id }).result?.status, 'rejected', String(id));
    f.connect('no-session');
    assert.equal(f.send({ id: 0 }, 'no-session').result?.status, 'snapshot-required');
    await f.step(1);
    assert.ok(
      f.sent.some((m) => m.to === 'no-session' && JSON.stringify(m).includes('session')),
      'session refusal on the wire',
    );
    assert.deepEqual(till(f.w), before);
    assert.equal(plot(f.w, 0).at, -1);
    assert.equal(RAIL_PREDICTED.has('rail.buy'), false);
    assert.deepEqual(intentOf({ op: 'rail.buy', id: 0 }), { op: 'rail.buy', id: 0 });
    assert.equal(intentOf({ op: 'rail.buy', id: 3 }), null);
    const queued: Obj[] = [];
    const acts = railwayActs(
      (intent) => {
        queued.push(intent);
        return true;
      },
      () => f.w,
    );
    assert.equal(acts.buy(0), true);
    assert.equal(acts.buy(3), false);
    assert.deepEqual(queued, [{ op: 'rail.buy', id: 0 }]);
  } finally {
    await f.close();
  }
});

test('buy host: two r:edits in one tick and a replay spend once; save and reload before completion', async () => {
  const f = await fixture('house-ready');
  try {
    assert.equal(f.h.rules.railTune.get('railPricePct'), 50);
    const tick = f.h.sync.world.tick,
      before = till(f.w).boogles;
    const first = f.send({ id: 0 });
    assert.equal(first.result?.status, 'accepted');
    assert.equal(f.send({ id: 0 }, 'bob').result?.status, 'rejected');
    f.h.deliver({ t: 'r:edit', e: first.e }, 'alice');
    assert.equal(f.send({ id: 0 }).result?.status, 'rejected', 'already bought');
    assert.equal(f.h.sync.world.tick, tick);
    assert.equal(till(f.w).spent, 150);
    assert.equal(till(f.w).boogles, before - 150);
    const bought = { ...plot(f.w, 0) };
    assert.equal(bought.at, tick);
    assert.equal(plotBuilt(f.w, 0, tick), false);
    await f.step(40);
    for (const mirror of f.mirrors.values()) {
      assert.deepEqual(plot(mirror.world(), 0), bought, 'both players see the same bought plot');
      assert.equal(till(mirror.world()).spent, 150);
    }
    await f.restart();
    assert.deepEqual(plot(f.w, 0), bought);
    assert.equal(till(f.w).spent, 150);
    assert.ok(f.h.sync.world.tick < tick + TRADE.buildTicks, 'restart while still building');
    await f.step(tick + TRADE.buildTicks - 1 - f.h.sync.world.tick);
    assert.equal(townHas(townRead(f.w, f.h.sync.world.tick), 'town'), false);
    assert.equal(tillRate(f.w, TRADE_PCT, f.h.sync.world.tick), 28);
    await f.step(1);
    assert.equal(townHas(townRead(f.w, f.h.sync.world.tick), 'town'), true);
    assert.equal(tillRate(f.w, TRADE_PCT, f.h.sync.world.tick), 42);
    assert.equal(till(f.w).spent, 150);
    railwayCheck(f.w, f.h.sync.world.tick);
  } finally {
    await f.close();
  }
});

test('buy host: room price tuning reaches the buy rule', async () => {
  const f = await fixture('house-ready');
  try {
    setTune(f.h.rules.railTune.tune, 'railPricePct', 100);
    assert.equal(f.send({ id: 0 }).result?.status, 'rejected', '150 cannot buy at 100%');
    setTune(f.h.rules.railTune.tune, 'railPricePct', 25);
    assert.equal(f.send({ id: 0 }).result?.status, 'accepted');
    assert.equal(plot(f.w, 0).paid, 75);
    assert.equal(till(f.w).spent, 75);
  } finally {
    await f.close();
  }
});
