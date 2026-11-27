// B1's real r:edit boundary: two players, recorded refusals, persisted spending and a mid-build restart.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { townPlotBoard } from '../../src/place/town-plan.ts';
import { Till } from '../../src/sim/railway-components.ts';
import { WebSocket, createService, loadConfig } from './helpers/accounts.ts';
import { setTune } from '../../src/sim/tune.ts';
import { railwayRoomId, RAILWAY_PLAY_NS } from '../../src/world/railway-namespace.ts';
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
      const board = townPlotBoard(fields.id === 1 || fields.id === 2 ? fields.id : 0);
      const e = {
        op: 'rail.buy',
        ...fields,
        epoch: s.epoch,
        request: ++s.request,
        at: [Math.round((board.x + 1000) * 100), 1800, Math.round(board.z * 100)],
        ms: 100,
      };
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

test('buy host: malformed ids and a player with no railway session cannot spend', async () => {
  const f = await fixture('house-ready');
  try {
    const balance = f.w.mut(Till, f.w.single(Till))!;
    balance.boogles += 5000;
    balance.landed += 5000;
    const before = { ...till(f.w) };
    assert.equal(f.send({ id: 2 }).result?.status, 'rejected', 'even a funded board cannot sell an unstaked plot');
    for (const id of [undefined, null, '0', {}, [], -1, 0.5, 3, 16, 999999])
      assert.equal(f.send({ id }).result?.status, 'rejected', String(id));
    f.connect('no-session');
    assert.equal(f.send({ id: 0, kind: 1 }, 'no-session').result?.status, 'snapshot-required');
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
    const first = f.send({ id: 0, kind: 1 });
    assert.equal(first.result?.status, 'accepted');
    assert.equal(f.send({ id: 0, kind: 2 }, 'bob').result?.status, 'rejected');
    f.h.deliver({ t: 'r:edit', e: first.e }, 'alice');
    assert.equal(f.send({ id: 0, kind: 1 }).result?.status, 'rejected', 'already bought');
    assert.equal(f.h.sync.world.tick, tick);
    assert.equal(till(f.w).spent, 150);
    assert.equal(till(f.w).boogles, before - 150);
    const bought = { ...plot(f.w, 0) };
    assert.equal(bought.at, tick);
    assert.equal(bought.kind, 1);
    assert.equal(plotBuilt(f.w, 0, tick), false);
    await f.step(40);
    for (const mirror of f.mirrors.values()) {
      assert.deepEqual(plot(mirror.world(), 0), bought, 'both players see the same bought plot');
      assert.equal(till(mirror.world()).spent, 150);
    }
    await f.restart();
    assert.equal(f.send({ id: 0, kind: 1 }).result?.status, 'rejected', 'reopened session cannot repurchase');
    const since = f.sent.length;
    f.h.deliver({ t: 'r:edit', e: first.e }, 'alice');
    await f.step(1);
    assert.ok(
      f.sent
        .slice(since)
        .some(
          (packet) =>
            packet.to === 'alice' &&
            Array.isArray(packet.rej) &&
            packet.rej.some(
              (row) =>
                Array.isArray(row) && row[0] === first.e.epoch && row[1] === first.e.request && row[2] === 'session',
            ),
        ),
      'old purchase epoch receives a session refusal',
    );
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

test('buy host: two players race different plots in one tick with money for one; spent once', async () => {
  const f = await fixture('house-ready');
  try {
    const w = f.w,
      b = w.mut(Till, w.single(Till))!,
      extra = 450 - b.boogles;
    b.boogles += extra;
    b.landed += extra;
    const tick = f.h.sync.world.tick;
    assert.equal(f.send({ id: 1 }, 'alice').result?.status, 'accepted');
    assert.equal(f.send({ id: 0, kind: 2 }, 'bob').result?.status, 'rejected');
    assert.equal(f.h.sync.world.tick, tick, 'one tick');
    assert.deepEqual([till(f.w).boogles, till(f.w).spent, plot(f.w, 0).at, plot(f.w, 1).paid], [50, 400, -1, 400]);
    await f.step(5);
    railwayCheck(f.w, f.h.sync.world.tick);
  } finally {
    await f.close();
  }
});

type Msg = Record<string, any>;
function message(ws: WebSocket, matches: (packet: Msg) => boolean) {
  return new Promise<Msg>((resolve) => {
    const receive = (event: MessageEvent) => {
      const packet = JSON.parse(String(event.data));
      if (matches(packet)) {
        ws.removeEventListener('message', receive);
        resolve(packet);
      }
    };
    ws.addEventListener('message', receive);
  });
}

for (const kind of [1, 2])
  test(`buy sockets: a real server records kind ${kind}, spends once for racing and replayed buys, and builds after a pause`, async (t) => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-buy-ws-'));
    const svc = createService(
      loadConfig(
        { DATA_DIR: dataDir, SERVER_ROOMS: '*', ROOM_PAUSE_MS: '300' },
        { log: () => {}, jumpBuild: 'any', reconnectGraceMs: 100, housekeepMs: 50 },
      ),
    );
    const port = await svc.listen(0);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/jump`, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: JSON.stringify({ stage: 'house-ready', ns: RAILWAY_PLAY_NS }),
      });
      assert.equal(r.status, 200);
      const id = railwayRoomId(((await r.json()) as { room: string }).room);
      const connect = async (self: string) => {
        const ws = new WebSocket(
          `ws://127.0.0.1:${port}/room/${id}?self=${self}&pid=${self}pid&key=${self}pidkey0000000000&b=test`,
          ['boogle.1'],
        );
        await message(ws, (packet) => packet.t === 'welcome');
        await (svc.roomHost()!.room(id)!.world as ReturnType<typeof createRailwayWorldHost>).whenReady();
        const opened = message(ws, (packet) => packet.d?.t === 'r:session');
        ws.send(JSON.stringify({ t: 'm', d: { t: 'r:open' } }));
        const session = (await opened).d;
        let request = Number(session.next) - 1;
        const epoch = Number(session.epoch);
        const edit = (fields: Msg) => {
          const e = {
            op: 'rail.buy',
            at: [90460, 1800, 3520],
            ...fields,
            epoch,
            request: ++request,
            ms: 100 * request,
          };
          ws.send(JSON.stringify({ t: 'm', d: { t: 'r:edit', e } }));
          return e;
        };
        return {
          ws,
          ack: (request: number) => message(ws, (packet) => packet.d?.ack?.[0] === epoch && packet.d.ack[1] >= request),
          edit,
          pid: `${self}pid`,
          epoch,
          raw: (e: Msg) => ws.send(JSON.stringify({ t: 'm', d: { t: 'r:edit', e } })),
        };
      };
      const a = await connect('alice'),
        b = await connect('bob');
      const world = svc.roomHost()!.room(id)!.world as ReturnType<typeof createRailwayWorldHost>;
      await world.whenReady();
      const w = () => world.rules.railway.world();
      const status = (pid: string, epoch: number, request: number) =>
        world.rules.railway.outcome(pid, epoch, request)?.status;
      assert.equal(world.rules.railTune.get('railPricePct'), 50);
      const before = { ...till(w()) };
      assert.ok(before.boogles >= 150, 'house-ready holds the first price');
      // Malformed ids over the wire.
      const bad = [{ id: '0' }, { id: -1 }, { id: 0.5 }, { id: 16 }, { id: {} }, {}, { id: 1e300 }].map((f) =>
        a.edit(f),
      );
      await a.ack(bad.at(-1)!.request);
      for (const e of bad) assert.equal(status(a.pid, e.epoch, e.request), 'rejected', JSON.stringify(e));
      assert.deepEqual({ ...till(w()) }, before);
      const far = a.edit({ id: 0, kind, at: [0, 1800, 0] });
      await a.ack(far.request);
      assert.equal(status(a.pid, far.epoch, far.request), 'rejected', 'real r:edit outside the board reach');
      assert.deepEqual({ ...till(w()) }, before, 'far buy spends nothing');
      assert.equal(plot(w(), 0).at, -1);
      // Alice and Bob press plot 1 back to back; Alice's buy is re-sent.
      const first = a.edit({ id: 0, kind });
      const rival = b.edit({ id: 0, kind });
      a.raw(first);
      await Promise.all([a.ack(first.request), b.ack(rival.request)]);
      assert.deepEqual([status(a.pid, first.epoch, first.request), status(b.pid, rival.epoch, rival.request)].sort(), [
        'accepted',
        'rejected',
      ]);
      assert.deepEqual([till(w()).spent, till(w()).boogles], [150, before.boogles - 150]);
      const bought = { ...plot(w(), 0) };
      assert.ok(bought.at >= 0 && bought.paid === 150);
      assert.equal(bought.kind, kind);
      // Everyone leaves while it builds; the room pauses, then the next join credits the time away.
      let notifyPaused!: () => void;
      const paused = new Promise<void>((resolve) => {
        notifyPaused = resolve;
      });
      const pause = world.pause.bind(world);
      t.mock.method(world, 'pause', () => {
        pause();
        notifyPaused();
      });
      a.ws.close();
      b.ws.close();
      await paused;
      assert.equal(world.paused(), true, 'paused while the house is building');
      assert.ok(world.sync.world.tick < bought.at + TRADE.buildTicks, 'still building at the pause');
      const c = await connect('alice');
      assert.equal(world.paused(), false);
      assert.deepEqual({ ...plot(w(), 0) }, bought, 'the credit leaves the purchase alone');
      assert.equal(till(w()).spent, 150);
      if (world.sync.world.tick < bought.at + TRADE.buildTicks)
        await message(c.ws, () => world.sync.world.tick >= bought.at + TRADE.buildTicks);
      assert.equal(townHas(townRead(w(), world.sync.world.tick), 'town'), true, 'the house counts once built');
      const balance = till(w());
      assert.equal(balance.boogles, balance.landed + balance.poured - balance.spent);
      railwayCheck(w(), world.sync.world.tick);
      c.ws.close();
    } finally {
      await svc.close();
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  });

test('buy host: room price tuning reaches the buy rule', async () => {
  const f = await fixture('house-ready');
  try {
    setTune(f.h.rules.railTune.tune, 'railPricePct', 100);
    assert.equal(f.send({ id: 0, kind: 1 }).result?.status, 'rejected', '150 cannot buy at 100%');
    setTune(f.h.rules.railTune.tune, 'railPricePct', 25);
    assert.equal(f.send({ id: 0, kind: 1 }).result?.status, 'accepted');
    assert.equal(plot(f.w, 0).paid, 75);
    assert.equal(till(f.w).spent, 75);
  } finally {
    await f.close();
  }
});
