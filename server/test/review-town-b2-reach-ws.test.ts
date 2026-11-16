// Independent review of town-economy-visible B2's server rule against a real server: rail.buy is refused unless the
// buyer's own reported position is within 3.2 m (horizontally) of plot 1's board. POST /jump to house-ready, a real
// socket, r:edit buys from just outside, with no position, from high above, then from just inside.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WebSocket, createService, loadConfig } from './helpers/accounts.ts';
import { railwayRoomId, RAILWAY_PLAY_NS } from '../../src/world/railway-namespace.ts';
import { plot, till } from '../../src/sim/railway-rows.ts';
import { townPlotBoard } from '../../src/place/town-plan.ts';
import type { createRailwayWorldHost } from '../src/host/world-host.ts';

type Msg = Record<string, any>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('review ws: a buy 3.21 m from the board is refused and spends nothing; 3.19 m (any height) is accepted once', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-b2-reach-'));
  const svc = createService(
    loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {}, jumpBuild: 'any', housekeepMs: 50 }),
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
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/room/${id}?self=carol&pid=carolpid&key=carolpidkey0000000000&b=test`,
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
    assert.ok(session);
    let request = Number(session.next) - 1;
    const epoch = Number(session.epoch);
    const world = svc.roomHost()!.room(id)!.world as ReturnType<typeof createRailwayWorldHost>;
    await world.whenReady();
    const w = () => world.rules.railway.world();
    const status = (req: number) => world.rules.railway.outcome('carolpid', epoch, req)?.status;
    // The board as the view draws it and the prompt measures it: Place-local + 1000, in centimetres.
    const b = townPlotBoard(0);
    const bx = (b.x + 1000) * 100,
      bz = b.z * 100;
    // Along the line from the board to plot 1's door side and diagonally, as a client's rounded position.
    const at = (cm: number, angle: number, y = 1845) => [
      Math.round(bx + cm * Math.cos(angle)),
      y,
      Math.round(bz + cm * Math.sin(angle)),
    ];
    const buy = (fields: Msg) => {
      const e = { op: 'rail.buy', id: 0, ...fields, epoch, request: ++request, ms: 1000 * request };
      ws.send(JSON.stringify({ t: 'm', d: { t: 'r:edit', e } }));
      return e.request;
    };
    const before = { ...till(w()) };
    const outside = [buy({ at: at(321, Math.PI) }), buy({ at: at(321, 0.7) }), buy({})];
    await sleep(400);
    for (const q of outside) assert.equal(status(q), 'rejected', `request ${q} from outside or with no position`);
    assert.deepEqual({ ...till(w()) }, before, 'refused buys spend nothing');
    assert.equal(plot(w(), 0).at, -1);
    // From 3.19 m and 30 m up: the rule is horizontal only (the plan's claim), so a rooftop buyer is in reach.
    const inside = buy({ at: at(319, 0.7, 1845 + 3000) });
    await sleep(400);
    assert.equal(status(inside), 'accepted', 'just inside the reach');
    assert.equal(till(w()).spent, 150);
    assert.ok(plot(w(), 0).at >= 0);
    ws.close();
  } finally {
    await svc.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
