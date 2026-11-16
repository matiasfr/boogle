// Independent review of B1 against a real server: POST /jump to house-ready, two players on real sockets, r:edit
// buys (malformed, competing, replayed), then everyone leaves with the house still building and the next join's away
// credit lands on a pending purchase.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WebSocket, createService, loadConfig } from './helpers/accounts.ts';
import { railwayRoomId, RAILWAY_PLAY_NS } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { plot, till } from '../../src/sim/railway-rows.ts';
import { TRADE } from '../../src/sim/railway-trade-layout.ts';
import { townHas, townRead } from '../../src/sim/town-facts.ts';
import type { createRailwayWorldHost } from '../src/host/world-host.ts';

type Msg = Record<string, any>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('review ws: a real server refuses bad buys, spends once for racing and replayed buys, and builds after a pause', async () => {
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
      const msgs: Msg[] = [];
      ws.onmessage = (e) => msgs.push(JSON.parse(String(e.data)));
      await new Promise<void>((res) => (ws.onopen = () => res()));
      let session: Msg | undefined;
      for (let k = 0; k < 200 && !session; k++) {
        ws.send(JSON.stringify({ t: 'm', d: { t: 'r:open' } }));
        await sleep(50);
        session = msgs.findLast((m) => m.t === 'm' && m.d?.t === 'r:session')?.d;
      }
      assert.ok(session, `${self} has a session`);
      let request = Number(session.next) - 1;
      const epoch = Number(session.epoch);
      const edit = (fields: Msg) => {
        const e = { op: 'rail.buy', at: [90460, 1800, 3520], ...fields, epoch, request: ++request, ms: 100 * request };
        ws.send(JSON.stringify({ t: 'm', d: { t: 'r:edit', e } }));
        return e;
      };
      return {
        ws,
        msgs,
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
    const bad = [{ id: '0' }, { id: -1 }, { id: 0.5 }, { id: 16 }, { id: {} }, {}, { id: 1e300 }].map((f) => a.edit(f));
    await sleep(300);
    for (const e of bad) assert.equal(status(a.pid, e.epoch, e.request), 'rejected', JSON.stringify(e));
    assert.deepEqual({ ...till(w()) }, before);
    const far = a.edit({ id: 0, at: [0, 1800, 0] });
    await sleep(150);
    assert.equal(status(a.pid, far.epoch, far.request), 'rejected', 'real r:edit outside the board reach');
    assert.deepEqual({ ...till(w()) }, before, 'far buy spends nothing');
    assert.equal(plot(w(), 0).at, -1);
    // Alice and Bob press plot 1 back to back; Alice's buy is re-sent.
    const first = a.edit({ id: 0 });
    const rival = b.edit({ id: 0 });
    a.raw(first);
    await sleep(300);
    assert.equal(status(a.pid, first.epoch, first.request), 'accepted');
    assert.equal(status(b.pid, rival.epoch, rival.request), 'rejected');
    assert.deepEqual([till(w()).spent, till(w()).boogles], [150, before.boogles - 150]);
    const bought = { ...plot(w(), 0) };
    assert.ok(bought.at >= 0 && bought.paid === 150);
    // Everyone leaves while it builds; the room pauses, then the next join credits the time away.
    a.ws.close();
    b.ws.close();
    for (let k = 0; k < 60 && !world.paused(); k++) await sleep(50);
    assert.equal(world.paused(), true, 'paused while the house is building');
    assert.ok(world.sync.world.tick < bought.at + TRADE.buildTicks, 'still building at the pause');
    const c = await connect('alice');
    assert.equal(world.paused(), false);
    assert.deepEqual({ ...plot(w(), 0) }, bought, 'the credit leaves the purchase alone');
    assert.equal(till(w()).spent, 150);
    for (let k = 0; k < 200 && world.sync.world.tick < bought.at + TRADE.buildTicks; k++) await sleep(100);
    assert.equal(townHas(townRead(w(), world.sync.world.tick), 'town'), true, 'the house counts once built');
    const t = till(w());
    assert.equal(t.boogles, t.landed + t.poured - t.spent);
    railwayCheck(w(), world.sync.world.tick);
    c.ws.close();
  } finally {
    await svc.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
