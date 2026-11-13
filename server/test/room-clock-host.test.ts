// The 60 Hz room clock on the world hosts (src/world/room-clock.ts, sync.stepWorld): lockstep's clock and hash
// messages keep their tick timing, and steps a durable write holds back are not counted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createWorldHost, createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { worldRoomId } from '../../src/world/namespace.ts';
import { RULE_STEPS } from '../../src/world/room-clock.ts';

type Obj = Record<string, unknown>;

test('w:c every 2 ticks and w:hash every 20 ticks, ticks every 6 steps, on a world host', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-clock-'));
  const store = createStore({ dataDir: dir, maxRooms: 4 });
  await store.init();
  const host = createWorldHost({ roomId: worldRoomId('clock'), store, tick: false });
  const sent: Obj[] = [];
  host.onSend((m) => sent.push(m));
  const steps: number[] = [];
  host.sync.onStep((s) => steps.push(s));
  try {
    const t0 = host.sync.world.tick;
    for (let k = 0; k < 200; k++) host.step(0.05); // 10 s in 50 ms timer slices: 600 steps
    assert.equal(host.sync.world.tick - t0, 100);
    assert.equal(steps.length, 600);
    assert.deepEqual(
      steps.slice(0, 7),
      Array.from({ length: 7 }, (_, k) => t0 * RULE_STEPS + k + 1),
    );
    for (let k = 1; k < steps.length; k++) assert.equal(steps[k], steps[k - 1]! + 1, 'the step counter never repeats');
    const clocks = sent.filter((m) => m.t === 'w:c').map((m) => m.ht as number);
    assert.deepEqual(
      clocks,
      Array.from({ length: 50 }, (_, k) => t0 + 2 * (k + 1)),
    );
    const hashes = sent.filter((m) => m.t === 'w:hash').map((m) => m.tick as number);
    assert.deepEqual(
      hashes,
      [20, 40, 60, 80, 100].map((n) => t0 + n),
    );
  } finally {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a durable write holds the railway room clock: blocked steps are not counted', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-clock-held-'));
  const store = createStore({ dataDir: dir, maxRooms: 4 });
  await store.init();
  const host = createRailwayWorldHost({ roomId: railwayRoomId('clock'), store, tick: false, pidOf: () => 'alice' });
  const steps: number[] = [];
  host.sync.onStep((s) => steps.push(s));
  try {
    await host.whenReady();
    host.step(0.1);
    await host.sync.whenDurable();
    const tick = host.sync.world.tick;
    const step = host.sync.roomStep();
    const seen = steps.length;
    // The retained classic tail still blocks its clock. No production client op enters it after step 4.
    host.sync.registerOp('test.tail', { apply: () => null });
    assert.equal(host.sync.receiveEdit({ op: 'test.tail', i: 0, j: 0 }, 'a'), true);
    host.step(0.5);
    await Promise.resolve();
    assert.equal(host.sync.worldStatus().recoveryPending, true);
    host.step(0.5);
    assert.equal(host.sync.world.tick, tick, 'no tick while the stamp is unpublished');
    assert.equal(host.sync.roomStep(), step, 'and no step: blocked time does not count');
    assert.equal(steps.length, seen, 'nor any end-of-step flush');
    await host.sync.whenDurable();
    host.step(0.1);
    assert.equal(host.sync.world.tick, tick + 1, 'counting resumes after the write');
    assert.equal(host.sync.roomStep(), step + RULE_STEPS);
    // A periodic checkpoint alone holds nothing: the room keeps stepping and flushing while it is written.
    const before = host.sync.roomStep();
    const flushed = steps.length;
    assert.equal(host.sync.saveNow(true), true);
    assert.equal(host.sync.worldStatus().recoveryPending, true);
    host.step(0.1);
    assert.equal(host.sync.roomStep(), before + RULE_STEPS, 'steps count during the write');
    assert.equal(steps.length, flushed + RULE_STEPS, 'and each one flushes');
    await host.sync.whenDurable();
  } finally {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  }
});
