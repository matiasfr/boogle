// Server clock broadcasts survive classic transport retirement; checkpoints do not stall room steps.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createWorldHost } from '../src/host/world-host.ts';
import { worldRoomId } from '../../src/world/namespace.ts';
import { RULE_STEPS } from '../../src/world/room-clock.ts';
import { fixture } from './helpers/rail-tune.ts';

test('w:c every 2 ticks, ticks every 6 steps, with no classic hashes', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-clock-'));
  const store = createStore({ dataDir: dir, maxRooms: 4 });
  await store.init();
  const host = createWorldHost({ roomId: worldRoomId('clock'), store, tick: false });
  t.after(async () => {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  const sent: Record<string, unknown>[] = [];
  host.onSend((m) => sent.push(m));
  const steps: number[] = [];
  host.sync.onStep((s) => steps.push(s));
  const t0 = host.sync.world.tick;
  for (let k = 0; k < 200; k++) host.step(0.05);
  assert.equal(host.sync.world.tick - t0, 100);
  assert.equal(steps.length, 600);
  assert.deepEqual(
    steps,
    Array.from({ length: 600 }, (_, k) => t0 * RULE_STEPS + k + 1),
  );
  assert.deepEqual(
    sent.map((m) => m.t),
    Array(50).fill('w:c'),
  );
  assert.deepEqual(
    sent.map((m) => m.ht),
    Array.from({ length: 50 }, (_, k) => t0 + 2 * (k + 1)),
  );
});

test('a checkpoint leaves the room clock running while a durable receipt waits for it', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  const held = f.holdNextWrite();
  a.adapter.act('who.set', { n: 'Pending', c: 1 });
  f.run();
  await held.entered.promise;
  const step = f.host.sync.roomStep();
  const flushed: number[] = [];
  f.host.sync.onStep((s) => flushed.push(s));
  f.host.step(0.1);
  assert.equal(f.host.sync.roomStep(), step + RULE_STEPS);
  assert.equal(flushed.length, RULE_STEPS);
  assert.equal(a.accepted.length, 0, 'clock advancement does not publish the durable receipt early');
  held.gate.resolve();
  await f.settled();
  assert.equal(a.accepted.length, 1);
});
