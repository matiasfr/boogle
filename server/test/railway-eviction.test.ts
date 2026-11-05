// Retained stop-condition witness: the idle-eviction schedule that removes a room before its close drains.
// This deliberately constructs the overlapping hosts permitted by rooms.ts before its unverified closing fence.
// Do not turn the expected carry into zero: a published chop must survive this recovery boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost, type RailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_ROOM } from '../../src/world/railway-namespace.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import type { Queued } from '../../src/world/sync.ts';

test('idle eviction must drain the old authority before a replacement can overwrite its published tail', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-rail-eviction-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const base = createStore({ dataDir, maxRooms: 4 });
  await base.init();
  let noteWrite: (() => void) | null = null;
  const store = {
    ...base,
    write: (...args: Parameters<typeof base.write>) => {
      noteWrite?.();
      noteWrite = null;
      return base.write(...args);
    },
  };
  let now = 1800000000000;
  let pose = { x: T1.x / 100, z: T1.z / 100, at: now };
  const hosts: RailwayWorldHost[] = [];
  const create = () => {
    const host = createRailwayWorldHost({
      roomId: RAILWAY_ROOM,
      store,
      tick: false,
      now: () => now,
      monotonicNow: () => now,
      pidOf: () => 'alice',
      positionOf: () => pose,
    });
    hosts.push(host);
    return host;
  };
  t.after(async () => {
    for (const host of hosts) await host.close({ save: false });
  });
  const old = create();
  await old.whenReady();
  const published: Queued[] = [];
  old.onSend((message) => {
    if (message.t === 'w:edits') published.push(...(message.list as Queued[]));
  });
  const step = async (ticks: number) => {
    for (let i = 0; i < ticks; i++) {
      await old.sync.whenDurable();
      now += 100;
      pose.at = now;
      old.step(0.1);
    }
    await old.sync.whenDurable();
  };
  old.deliver({ t: 'r:open' }, 'a');
  await old.sync.whenDurable();
  await step(3);
  old.deliver({ t: 'r:edit', e: { op: 'rail.wake', epoch: 1, request: 1 } }, 'a');
  await old.sync.whenDurable();
  await step(T1.wakeTicks + 3);
  old.sync.saveNow(true);
  await old.sync.whenDurable();

  const source = RAILWAY_SOURCES[0]!;
  pose = { x: source[1] / 100, z: source[2] / 100, at: now };
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  // Hold the existing per-room storage lock. Both replacements queue through the actual Store.write order.
  const blocked = base.withLock(RAILWAY_ROOM, () => gate);
  const writing = new Promise<void>((resolve) => (noteWrite = resolve));
  old.deliver({ t: 'r:edit', e: { op: 'rail.chop', id: source[0], epoch: 1, request: 2 } }, 'a');
  await writing;
  const closing = old.close();
  // Original idle sweep: rooms.delete(id); room.close(); a reconnect immediately loads the same id here.
  const replacement = create();
  release!();
  await blocked;
  await closing;
  await replacement.whenReady();
  const replacementCarry = replacement.rules.railway.account('alice')!.carry;
  await replacement.close();
  const restored = create();
  await restored.whenReady();
  const publishedChop = published.find((q) => q.e.op === 'rail.chop' && q.e.request === 2);
  const observed = {
    scenario: 'idle removal before old close drains, followed by overlapping replacement host',
    originalBase: '66a984389cba9b9d030c5c1cdb34224b26f937c6',
    room: RAILWAY_ROOM,
    expectedCarry: T1.strokeYield,
    publishedChop: publishedChop ?? null,
    replacementCarry,
    restoredCarry: restored.rules.railway.account('alice')!.carry,
    restoredOutcome: restored.rules.railway.outcome('alice', 1, 2),
    restoredCounts: restored.rules.railway.counts(),
    restoredSnapshot: restored.sync.snapshot(),
    note: 'Overlapping-host witness retained at the stop condition; any later room-routing fence is unverified here.',
  };
  const evidence = new URL('../../.look/core-t1-spine/', import.meta.url);
  await fs.mkdir(evidence, { recursive: true });
  await fs.writeFile(new URL('eviction-failure.json', evidence), JSON.stringify(observed, null, 2));
  console.log(
    `[rail-eviction] published=${!!publishedChop}, expected=${T1.strokeYield}, restored=${observed.restoredCarry}`,
  );
  assert.ok(publishedChop, 'the future chop was published only after its recovery write completed');
  assert.equal(observed.restoredCarry, T1.strokeYield, 'every durably published chop must restore exactly once');
});
