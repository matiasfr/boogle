// Real process death; the crash target never closes gracefully. The railway is Server kind (replication R1a): a crash
// goes back to the last checkpoint (the owner accepted up to 2 s of rollback), never to a torn or half-spent state.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { LINE1_INITIAL } from '../../src/sim/railway-line-layout.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railCounts } from '../../src/sim/railway-queries-line2.ts';
import { railClock, trees } from '../../test/helpers/rail.ts';

type Boundary = {
  boundary: 'after-checkpoint' | 'replacement' | 'recovery-checkpoint';
  roomId: string;
  pid: string;
  request: number;
  before: { stock: number; carry: number; total: number };
  checkpointTick: number;
  temporary?: string;
  resumedAt?: number;
  originalTimestamp?: number;
};

const roomId = railwayRoomId('crash');
for (const boundary of ['after-checkpoint', 'replacement', 'recovery-checkpoint'] as const) {
  const point =
    boundary === 'after-checkpoint'
      ? 'after an applied action, before the next checkpoint'
      : boundary === 'replacement'
        ? 'during checkpoint replacement'
        : 'after the startup checkpoint, before the offline resume';
  test(`SIGKILL ${point} restores a whole checkpoint with every unit conserved`, async (t) => {
    const initial = LINE1_INITIAL[0];
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-rail-crash-'));
    t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
    const child = fork(new URL('./fixtures/railway-crash-child.ts', import.meta.url), [dataDir, boundary, roomId], {
      execArgv: [],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    t.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    });
    let errors = '';
    child.stderr?.on('data', (chunk: Buffer) => (errors += chunk.toString()));
    const evidence = await new Promise<Boundary>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`crash child timed out: ${errors}`)), 10000);
      child.once('message', (message: Boundary) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        reject(new Error(`crash child exited before boundary (${code}/${signal}): ${errors}`));
      });
    });
    assert.equal(evidence.boundary, boundary);
    assert.equal(evidence.before.stock, 22);
    assert.equal(evidence.before.carry, 2);
    assert.equal(evidence.before.total, initial);
    if (boundary === 'replacement') assert.ok((await fs.stat(evidence.temporary!)).size > 0);
    const exited = once(child, 'exit');
    assert.equal(child.kill('SIGKILL'), true);
    const [code, signal] = await exited;
    assert.equal(code, null);
    assert.equal(signal, 'SIGKILL');

    const store = createStore({ dataDir, maxRooms: 4 });
    await store.init();
    const document = store.readSync(roomId)!;
    const offline = boundary === 'recovery-checkpoint';
    if (offline)
      assert.equal(Date.parse(document.updatedAt), evidence.originalTimestamp, 'startup did not consume absent time');
    else assert.equal(document.tick, evidence.checkpointTick, 'the last whole checkpoint is what is on disk');
    const restored = createRailwayWorldHost({ roomId, store, tick: false, now: () => evidence.resumedAt ?? 1000000 });
    await restored.whenReady();
    assert.equal(trees(restored.rules.railway.world())[0]!.yaw, 0.5);
    const counts = railCounts(restored.rules.railway.world());
    // The final deposit was after the checkpoint: a crash takes it back, whole (two logs back on the back).
    assert.equal(counts.total, initial, 'every unit conserved');
    assert.equal(counts.stock, offline ? 0 : 22);
    assert.equal(counts.carry, offline ? 0 : 2);
    assert.equal(counts.delivered, offline ? 24 : 22);
    assert.equal(counts.completion, offline ? 1 : 0, 'the absent time completes the funded job once');
    assert.equal(
      restored.rules.railway.outcome(evidence.pid, 1, evidence.request)?.status ?? null,
      offline ? 'accepted' : null,
    );
    if (offline)
      assert.ok(
        railClock(restored.rules.railway.world()).resumeMarker > 2147483647,
        'real calendar marker stays valid',
      );
    const snapshot = restored.sync.snapshot();
    await restored.close();
    const again = createRailwayWorldHost({ roomId, store, tick: false, now: () => evidence.resumedAt ?? 1000000 });
    await again.whenReady();
    assert.deepEqual(again.sync.snapshot(), snapshot, 'a second return neither spends nor completes twice');
    await again.close();
    console.log(
      `[rail-crash] ${boundary}: SIGKILL, ${initial} units conserved, ${offline ? 'T1 completed offline once' : 'rolled back to the checkpoint'}`,
    );
  });
}
