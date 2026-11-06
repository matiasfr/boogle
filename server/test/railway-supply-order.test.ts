// Material admitted after a stalled host must not inherit the old supply minute gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { railwayInvariant } from '../../src/sim/railway.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

test('fresh drop waits for missed maintenance before admission, then starts at age zero', async () => {
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
    assert.equal(host.rules.railway.account('supplier')!.carry, 2);
    const marker = host.rules.railway.railway.supply!.marker;
    now += 21 * 60000;
    const drop = { op: 'rail.drop', request: 3, x: source[1], z: source[2], y: 3000, n: 2 };
    send(drop); // Arrival before the next host step, with a genuinely fresh pose.
    assert.equal(messages.at(-1)?.state, 'starting');
    assert.equal(host.rules.railway.account('supplier')!.request, 2, 'refusal does not advance the request watermark');
    assert.equal(host.rules.railway.railway.piles.length, 0);
    await ticks(3);
    assert.ok(host.rules.railway.railway.supply!.marker >= marker + 21);
    send(drop); // The same request is still admissible after the accepted maintenance event.
    await ticks(3);
    assert.equal(host.rules.railway.outcome('supplier', 1, 3)?.status, 'accepted');
    assert.equal(host.rules.railway.railway.piles[0]!.age, 0);
    assert.equal(host.rules.railway.counts().rack, 0);
    assert.equal(host.rules.railway.counts().loose, 2);
    assert.equal(railwayInvariant(host.rules.railway.railway), null);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});
