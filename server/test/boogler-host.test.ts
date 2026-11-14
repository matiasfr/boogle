import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost, type RailwayPosition } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { booglerActivity, booglerVisitors } from '../src/host/boogler-presence.ts';
import { createBooglerShadow, booglerPose } from '../../src/world/boogler-shadow.ts';
import { loadBooglerLand } from '../src/host/land.ts';
import { mulberry32 } from '../../src/sim/rng.ts';
import { stepBooglerWalk } from '../../src/world/boogler-walk.ts';
import { createService, loadConfig } from '../src/server.ts';

async function fixture(t: TestContext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogler-shadow-'));
  let now = 10000,
    occupied = true;
  let people: (RailwayPosition | null)[] = [];
  const host = createRailwayWorldHost({
    roomId: railwayRoomId('shadow'),
    store: createStore({ dataDir: dir, maxRooms: 1 }),
    tick: false,
    now: () => now,
    positions: () => people,
    hasPlayers: () => occupied,
  });
  await host.whenReady();
  t.after(async () => {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  return {
    host,
    people: (p: typeof people) => {
      people = p;
    },
    occupied: (v: boolean) => {
      occupied = v;
    },
    run(n = 1) {
      for (let i = 0; i < n; i++) {
        now += 100;
        host.step(0.1);
      }
    },
    now: () => now,
  };
}

test('authority walks, attends talk, flees and rides; only pose is saved', async (t) => {
  const f = await fixture(t);
  f.run(30);
  const s = f.host.status().boogler!;
  assert.ok(s.walking);
  f.people([{ x: s.x, z: s.z, at: f.now(), ...booglerActivity([1, 0, 99, 99]) }]);
  f.run();
  assert.equal(f.host.status().boogler!.walking, false);
  f.people([{ x: s.x + 2, z: s.z, at: f.now(), ...booglerActivity([0, 1]) }]);
  f.run();
  assert.equal(f.host.status().boogler!.mode, 1);
  const fleeing = f.host.status().boogler!;
  assert.ok(fleeing.tx < fleeing.x, 'flee away from claimant');
  f.people([{ x: fleeing.x, z: fleeing.z, at: f.now(), ...booglerActivity([2, 0]) }]);
  f.run();
  assert.equal(f.host.status().boogler!.mode, 2);
  assert.equal(f.host.status().boogler!.leg!.speed, 2.3);
  assert.deepEqual(f.host.sync.snapshot().data.boogler, [
    f.host.status().boogler.x,
    f.host.status().boogler.z,
    f.host.status().boogler.yaw,
  ]);
});

test('empty sockets and paused rooms do no brain work, and resume has no catch-up walk', async (t) => {
  const f = await fixture(t);
  f.occupied(false);
  f.run(30);
  assert.equal(f.host.status().boogler.leg!.speed, 0);
  assert.equal(f.host.status().booglerMeter.ticks, 0);
  f.occupied(true);
  f.run(30);
  const before = f.host.status().boogler!;
  f.occupied(false);
  f.run(100);
  assert.deepEqual(f.host.sync.snapshot().data.boogler, [before.x, before.z, before.yaw]);
  assert.equal(f.host.status().boogler.leg!.speed, 0);
  f.occupied(true);
  f.run();
  const after = f.host.status().boogler!;
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) <= 0.151);
  f.host.pause();
  const paused = f.host.status();
  f.run(100);
  assert.deepEqual(f.host.status().boogler, paused.boogler);
  assert.deepEqual(f.host.status().booglerMeter, paused.booglerMeter);
});

test('malformed fields, stale poses and nonfinite positions fail closed; finite extremes clamp', () => {
  for (const bg of [null, {}, 'ride', [NaN, Infinity], [1.5, true], [-1, -1], [3, 2], [1e99, 1e99]])
    assert.deepEqual(booglerActivity(bg), { act: 0, wary: 0 });
  for (const x of [NaN, Infinity, -Infinity])
    assert.deepEqual(booglerVisitors([{ x, z: 0, at: 10, act: 1, wary: 1 }], 10), []);
  for (const at of [NaN, Infinity, -2000, 11]) assert.deepEqual(booglerVisitors([{ x: 0, z: 0, at }], 10), []);
  const extreme = booglerVisitors([{ x: 1e308, z: -1e308, at: 10 }], 10)[0]!;
  assert.ok(Number.isFinite(extreme.x * extreme.x + extreme.z * extreme.z));
  assert.ok(Math.abs(extreme.x) < 1000);
  assert.deepEqual(booglerActivity(undefined), { act: 0, wary: 0 }, 'missing means off');
});

test('fixed seed and ticks replay on baked land despite cosmetic RNG and hostile visitors', () => {
  const land = loadBooglerLand();
  const a = createBooglerShadow(land, mulberry32(123), 0),
    b = createBooglerShadow(land, mulberry32(123), 0);
  const cosmetic = mulberry32(99);
  for (let tick = 1; tick <= 20000; tick++) {
    const s = a.snapshot();
    const visitors = tick % 400 < 200 ? booglerVisitors([{ x: s.x + 2, z: s.z, at: tick, wary: 1 }], tick) : [];
    a.step(tick, visitors);
    for (let frame = 0; frame < tick % 8; frame++) cosmetic();
    b.step(tick, visitors);
    assert.deepEqual(a.snapshot(), b.snapshot());
    const p = a.snapshot();
    assert.ok(land.height(p.x, p.z) >= 0.45);
    assert.equal(land.blocked(p.x, p.z, 0.8), false);
    assert.ok(Math.hypot(p.x - s.x, p.z - s.z) <= 0.341);
  }
});

test('continuous leg is independent of presentation frame rate and keeps the arrival margin', () => {
  const leg = { x0: 0, z0: 0, yaw0: 0, x1: 10, z1: 0, start: 10, speed: 3.4, mode: 1 };
  const final = booglerPose(leg, 30);
  for (const hz of [30, 60, 120]) {
    for (let frame = 0; frame < hz * 2; frame++) booglerPose(leg, 10 + (frame / hz) * 10);
    assert.deepEqual(booglerPose(leg, 30), final);
  }
  assert.equal(booglerPose(leg, 1000).x, 9.7);
  assert.equal(booglerPose(leg, 1000).walking, false);
});

test('continuous travel agrees with a 1 ms integration at all three speeds and four heading errors', () => {
  for (const speed of [1.5, 2.3, 3.4])
    for (const degrees of [0, 60, 120, 180]) {
      const leg = { x0: 0, z0: 0, yaw0: (degrees * Math.PI) / 180, x1: 0, z1: -20, start: 0, speed, mode: 0 };
      const state = { x: 0, z: 0, yaw: leg.yaw0, tx: 0, tz: -20 };
      for (let i = 0; i < 2000; i++) stepBooglerWalk(state, 0.001, speed, () => false);
      const p = booglerPose(leg, 20);
      assert.ok(Math.hypot(p.x - state.x, p.z - state.z) < 0.01);
      assert.ok(Math.abs(p.yaw - state.yaw) < 0.005);
    }
});

test('server seed and rule cadence are independent of wall time and frame-sized advances', async (t) => {
  const a = await fixture(t),
    b = await fixture(t);
  a.host.sync.world.seed = b.host.sync.world.seed = 12345;
  a.run(100);
  for (let frame = 0; frame < 600; frame++) b.host.step(1 / 60);
  assert.equal(a.host.status().booglerMeter.ticks, 100);
  assert.equal(b.host.status().booglerMeter.ticks, 100);
  assert.deepEqual(a.host.status().boogler, b.host.status().boogler);
  assert.notEqual(a.now(), b.now());
});

test('flee cadence is exactly eight rule ticks', () => {
  const brain = createBooglerShadow(loadBooglerLand(), mulberry32(123), 0);
  for (let tick = 1; tick <= 9; tick++) {
    const p = brain.snapshot();
    brain.step(tick, [{ x: p.x + 2, z: p.z, act: 0, wary: true }]);
    assert.equal(brain.snapshot().fleeCheck, tick === 9 ? 0.8 : (9 - tick) / 10);
  }
});

test('real relayed bg reaches authority; malformed and missing fields heal; legs reach both clients', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogler-relay-'));
  const svc = createService(loadConfig({ DATA_DIR: dir, SERVER_ROOMS: '*' }, { log: () => {} }));
  const port = await svc.listen(0);
  const id = railwayRoomId('shadow-relay');
  const sockets: WebSocket[] = [];
  t.after(async () => {
    for (const ws of sockets) ws.close();
    await svc.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  const messages: Record<string, unknown>[] = [];
  for (const name of ['alice', 'bob']) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/room/${id}?self=${name}&pid=${name}pid&key=${name}key0000000000`, [
      'boogle.1',
    ]);
    sockets.push(ws);
    await new Promise<void>((resolve) =>
      ws.addEventListener('message', function welcome(e) {
        const m = JSON.parse(String(e.data));
        messages.push(m);
        if (m.t === 'welcome') {
          ws.removeEventListener('message', welcome);
          resolve();
        }
      }),
    );
    ws.addEventListener('message', (e) => messages.push(JSON.parse(String(e.data))));
  }
  const room = svc.roomHost()!.room(id)!;
  const world = room.world as ReturnType<typeof createRailwayWorldHost>;
  await world.whenReady();
  const wait = async (predicate: () => boolean) => {
    for (let i = 0; i < 100 && !predicate(); i++) await new Promise((r) => setTimeout(r, 20));
    assert.ok(predicate());
  };
  await wait(() => world.status().boogler !== null);
  const p = world.status().boogler!;
  let sequence = 0;
  const send = (bg: unknown, position: unknown = [p.x, 2, p.z]) =>
    sockets[0]!.send(
      JSON.stringify({
        t: 'p',
        s: ++sequence,
        d: { p: position, bg, g: { p: [p.x, p.z], r: 0, w: 0, m: 0 } },
      }),
    );
  send([1, 0, 99999, -999]);
  await wait(() => world.status().boogler!.wait >= 1);
  send([0, 1]);
  await wait(() => world.status().boogler!.mode === 1);
  send({ act: 'bad' }, [null, {}, 'bad']);
  await wait(() => world.status().boogler!.mode === 0);
  send(null);
  await wait(() => world.status().booglerMeter.ticks > 0);
  assert.ok(
    messages.some((m) => m.t === 'p' && m.id === 'alice'),
    'original presence still relayed',
  );
  assert.equal(JSON.stringify(world.sync.snapshot()).includes('boogler'), true);
  const packets = messages.filter((m) => m.t === 'm').map((m) => JSON.stringify(m.d));
  assert.equal(
    packets.some((m) => m.includes('boogler')),
    true,
    'authoritative leg on the wire',
  );
});
