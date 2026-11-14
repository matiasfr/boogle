import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/rail-tune.ts';
import { booglerPose } from '../../src/world/boogler-shadow.ts';
import { findStart } from '../../src/world/boogler-brain.ts';
import { loadBooglerLand } from '../src/host/land.ts';
import { createRailwayWorldHost, type RailwayPosition } from '../src/host/world-host.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import type { ServerPacket } from '../../src/world/replicate.ts';

test('two mirrors, late join and reconnect draw the same authoritative leg immediately', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  f.host.sync.world.seed = 123;
  f.run(240);
  const leg = a.mirror.boogler.leg();
  assert.ok(leg?.speed);
  assert.deepEqual(leg, b.mirror.boogler.leg());
  const c = f.join('carol');
  f.run(3);
  const tick = f.host.sync.world.tick;
  assert.deepEqual(booglerPose(c.mirror.boogler.leg()!, tick), booglerPose(a.mirror.boogler.leg()!, tick));
  b.disconnect();
  f.run(120);
  b.reconnect();
  f.run(3);
  assert.deepEqual(b.mirror.boogler.leg(), a.mirror.boogler.leg());
  assert.equal(
    a.packets.some((p) => JSON.stringify(p).includes('booglerLeg')),
    true,
  );
});

test('checkpoint saves only position and facing, and restart restores them before a tick', async (t) => {
  const f = await fixture(t);
  f.run(240);
  const saved = f.host.sync.snapshot().data.boogler;
  assert.ok(Array.isArray(saved) && saved.length === 3);
  await f.restart();
  assert.deepEqual(f.host.sync.snapshot().data.boogler, saved);
});

test('a verified finite facing outside wire precision is normalized before projection', async (t) => {
  const f = await fixture(t);
  const snap = f.host.sync.snapshot();
  const start = findStart(loadBooglerLand());
  snap.data.boogler = [start.x, start.z, 1e13];
  assert.ok(f.host.sync.loadSnapshot(snap));
  await f.restart();
  const peer = f.join('observer');
  f.run(1);
  assert.ok(Math.abs(peer.mirror.boogler.leg()!.yaw0) < Math.PI * 2);
  assert.equal(f.host.status().badSave, false);
});

for (const [label, spot] of [
  ['wet', [0, -300, 1]],
  ['off land', [10000, 10000, 2]],
  ['blocked', [-5.26, 19.44, 0]],
] as const)
  test(`a verified ${label} saved spot falls back to findStart on load`, async (t) => {
    const f = await fixture(t);
    const land = loadBooglerLand();
    let position: readonly number[] = spot;
    if (label === 'blocked') {
      // Pick a dry blocked sample from the actual baked island, not an assumed prop coordinate.
      outer: for (let x = -80; x < 80; x++)
        for (let z = -80; z < 80; z++) {
          if (land.height(x, z) >= 0.45 && land.blocked(x, z, 0.8)) {
            position = [x, z, 0];
            break outer;
          }
        }
      assert.ok(land.blocked(position[0]!, position[1]!, 0.8));
    }
    const snap = f.host.sync.snapshot();
    snap.data.boogler = [...position];
    assert.ok(f.host.sync.loadSnapshot(snap));
    await f.restart();
    const start = findStart(land);
    assert.deepEqual(f.host.sync.snapshot().data.boogler, [start.x, start.z, 0]);
    assert.equal(f.host.status().badSave, false);
  });

test('a malformed pose load cannot overwrite the last verified checkpoint', async (t) => {
  const f = await fixture(t);
  const before = f.store.readSync(f.roomId);
  const snap = f.host.sync.snapshot();
  snap.data.boogler = ['bad', 0, 0];
  assert.equal(f.host.sync.loadSnapshot(snap), false);
  f.host.sync.saveNow(true);
  await f.host.close();
  assert.equal(f.host.status().badSave, true);
  assert.deepEqual(f.store.readSync(f.roomId), before);
});

test('v43 host reads its new namespace and starts fresh despite a v42 saved position', async (t) => {
  const f = await fixture(t);
  f.run(240);
  await f.host.close();
  const old = f.store.readSync(f.roomId)!;
  const previous = f.roomId.replace('v43', 'v42');
  const reads: string[] = [];
  const host = createRailwayWorldHost({
    roomId: f.roomId,
    tick: false,
    store: {
      ...f.store,
      readSync(id) {
        reads.push(id);
        return id === previous ? old : null;
      },
    },
  });
  t.after(() => host.close({ save: false }));
  await host.whenReady();
  const start = findStart(loadBooglerLand());
  assert.deepEqual(host.sync.snapshot().data.boogler, [start.x, start.z, 0]);
  assert.ok(reads.includes(f.roomId));
  assert.equal(reads.includes(previous), false);
});

for (const rtt of [0, 80, 200])
  test(`reaction budgets over delayed presence and replication, RTT ${rtt} ms`, async (t) => {
    const worst = { talk: 0, ride: 0, wary: 0 };
    for (const kind of ['talk', 'ride', 'wary'] as const)
      for (let phase = 0; phase < 100; phase += 10) {
        let people: RailwayPosition[] = [];
        const f = await fixture(t, { positions: () => people });
        f.host.sync.world.seed = 123;
        const a = f.join('observer');
        f.run(400 + phase / 10, 10);
        const s = f.host.status().boogler;
        assert.ok(s.walking, 'cause begins mid-walk');
        const mirror = createRailwayMirror();
        const queue: { at: number; packet: ServerPacket }[] = [];
        for (const packet of a.packets.splice(0)) mirror.mirror.apply(packet);
        let delivered = false,
          delay = 0;
        for (; delay <= 1200; delay += 10) {
          if (!delivered && delay >= rtt / 2) {
            people = [
              {
                pid: 'actor',
                x: s.x + (kind === 'ride' ? 0 : 2),
                z: s.z,
                at: f.now(),
                act: kind === 'talk' ? 1 : kind === 'ride' ? 2 : 0,
                wary: kind === 'wary' ? 1 : 0,
              },
            ];
            delivered = true;
          }
          f.run(1, 10);
          for (const packet of a.packets.splice(0)) queue.push({ at: delay + 10 + rtt / 2, packet });
          while (queue.length && queue[0]!.at <= delay + 10) mirror.mirror.apply(queue.shift()!.packet);
          const leg = mirror.boogler.leg();
          if (
            leg &&
            (kind === 'talk' ? leg.speed === 0 && leg.look === 'actor' : leg.mode === (kind === 'ride' ? 2 : 1))
          )
            break;
        }
        worst[kind] = Math.max(worst[kind], delay + 10);
        assert.ok(delay + 10 <= (kind === 'wary' ? 1000 : 300), `${kind} phase ${phase}: ${delay + 10} ms`);
      }
    console.log('BOOGLER_REACTION', JSON.stringify({ rtt, phases: 10, worstMs: worst }));
  });
