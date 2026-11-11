// Material admitted after a stalled host must not inherit the old supply minute gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { railCounts } from '../../src/sim/railway-queries-line2.ts';
import { account, invariant, piles, railClock } from '../../test/helpers/rail.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

test('a fresh drop applies after the missed maintenance and starts at age zero', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-order-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  let position = { x: RAILWAY_T1.x / 100, z: RAILWAY_T1.z / 100 };
  const messages: Record<string, unknown>[] = [];
  const host = createRailwayWorldHost({
    roomId: railwayRoomId('supply-order'),
    store,
    tick: false,
    now: () => now,
    pidOf: () => 'supplier',
    positions: () => [{ ...position, at: now }],
  });
  host.onSend((message) => messages.push(message));
  host.replication.addClient('session');
  const refusals = () => {
    const rej: unknown[] = [];
    host.replication.flush(host.sync.roomStep(), (_cid, packet) => rej.push(...(packet.rej ?? [])));
    return rej;
  };
  // A client action carries where its actor stands (cm) and its action clock (ms).
  const send = (e: Record<string, unknown>) => {
    const at = [Math.round(position.x * 100), 0, Math.round(position.z * 100)];
    host.deliver({ t: 'r:edit', e: { ...e, epoch: 1, at, ms: now - 1800000000000 } }, 'session');
  };
  const ticks = async (n: number) => {
    for (let k = 0; k < n; k++) {
      await host.sync.whenDurable();
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  try {
    await host.whenReady();
    host.deliver({ t: 'r:open' }, 'session');
    await ticks(3);
    send({ op: 'rail.wake', request: 1 });
    await ticks(3 + RAILWAY_T1.wakeTicks);
    const source = RAILWAY_SOURCES[0]!;
    position = { x: source[1] / 100, z: source[2] / 100 };
    send({ op: 'rail.chop', request: 2, id: source[0], yaw: 0, collapsed: false });
    await ticks(3);
    assert.equal(account(host.rules.railway.world(), 'supplier')!.carry, 2);
    const marker = railClock(host.rules.railway.world()).supplyMarker;
    now += 21 * 60000;
    const drop = { op: 'rail.drop', request: 3, x: source[1], z: source[2], y: 3000, n: 2 };
    // Arrival before the next host step, with a genuinely fresh pose: the missed maintenance applies first (it is
    // a direct server rule now, not a stamp waiting for a tick), then the drop.
    send(drop);
    assert.deepEqual(refusals(), []);
    assert.ok(railClock(host.rules.railway.world()).supplyMarker >= marker + 21);
    assert.equal(host.rules.railway.outcome('supplier', 1, 3)?.status, 'accepted');
    assert.equal(piles(host.rules.railway.world())[0]!.age, 0);
    assert.equal(railCounts(host.rules.railway.world()).rack, 0);
    assert.equal(railCounts(host.rules.railway.world()).loose, 2);
    assert.equal(invariant(host.rules.railway.world()), null);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});
