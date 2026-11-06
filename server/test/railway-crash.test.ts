// Real process death at publication/replacement/recovery boundaries; the crash target never closes gracefully.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_SUPPLY, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { LINE1_INITIAL } from '../../src/sim/railway-line-layout.ts';
import type { RecoveryEnvelope } from '../../src/world/sync.ts';
import { isPlayableRailwayRoom, isLineRailwayRoom, railwayRoomId } from '../../src/world/railway-namespace.ts';

type Boundary = {
  boundary: 'published' | 'replacement' | 'recovery-checkpoint';
  roomId: string;
  pid: string;
  request: number;
  published: number;
  before: { stock: number; carry: number; total: number };
  tick: number;
  temporary?: string;
  resumedAt?: number;
  originalTimestamp?: number;
};

for (const roomId of ['t1v01-proto-crash', railwayRoomId('crash')])
  for (const boundary of ['published', 'replacement', 'recovery-checkpoint'] as const) {
    const point =
      boundary === 'published'
        ? 'after publication before application'
        : boundary === 'replacement'
          ? 'during checkpoint replacement'
          : 'after startup checkpoint before offline resume';
    test(`SIGKILL ${point} preserves every accepted T1 unit: ${roomId}`, async (t) => {
      const line1 = isLineRailwayRoom(roomId);
      const initial = line1 ? LINE1_INITIAL[0] : RAILWAY_SUPPLY;
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
      assert.equal(evidence.roomId, roomId);
      assert.equal(evidence.before.stock, 22);
      assert.equal(evidence.before.carry, 2);
      assert.equal(evidence.before.total, initial);
      assert.ok(evidence.published > 20);
      if (boundary === 'replacement') assert.ok((await fs.stat(evidence.temporary!)).size > 0);
      const exited = once(child, 'exit');
      assert.equal(child.kill('SIGKILL'), true);
      const [code, signal] = await exited;
      assert.equal(code, null);
      assert.equal(signal, 'SIGKILL');

      const store = createStore({ dataDir, maxRooms: 4 });
      await store.init();
      const document = store.readSync(evidence.roomId)!;
      const before = document.data as RecoveryEnvelope;
      const offline = boundary === 'recovery-checkpoint';
      if (offline) {
        assert.equal(Date.parse(document.updatedAt), evidence.originalTimestamp, 'startup did not consume absent time');
        assert.equal(before.tail.length, 0);
      } else {
        assert.equal(before.tail.length, 1, 'the future final deposit was durably stored');
        assert.equal(before.tail[0]!.e.op, 'rail.deposit');
      }
      assert.equal(before.checkpoint.tick, evidence.tick);
      const restored = createRailwayWorldHost({
        roomId: evidence.roomId,
        store,
        tick: false,
        now: () => evidence.resumedAt ?? 1000000,
      });
      await restored.whenReady();
      assert.deepEqual(
        restored.sync.registry().states,
        isPlayableRailwayRoom(roomId)
          ? ['gifts', 'roster', 'stacks', 'piles', 'sites', 'sources', 'bank', 'tune', 'opening', 'railway']
          : ['roster', 'railway'],
      );
      if (isPlayableRailwayRoom(roomId)) {
        assert.equal(restored.rules.railway.railway.falls?.yaw[0], 0.5);
        assert.equal(restored.rules.railway.railway.falls?.collapsed[0], false);
      }
      assert.deepEqual(restored.rules.railway.counts(), {
        source: initial - 24,
        carry: 0,
        loose: 0,
        rack: 0,
        produced: 0,
        stock: 0,
        allocation: offline ? 0 : 24,
        used: offline ? 24 : 0,
        total: initial,
        delivered: 24,
        score: 24 * RAILWAY_T1.deliveryScore + (offline ? RAILWAY_T1.completionScore : 0),
        completion: offline ? 1 : 0,
        starterRails: RAILWAY_T1.starterRails,
        ...(line1
          ? {
              stone: {
                source: 24,
                carry: 0,
                loose: 0,
                stock: 0,
                allocation: 0,
                used: 0,
                rack: 0,
                produced: 0,
                delivered: 0,
                total: 24,
              },
            }
          : {}),
      });
      assert.equal(restored.rules.railway.phase(), offline ? (line1 ? 'idle' : 'done') : 'deposit');
      if (offline)
        assert.ok(restored.rules.railway.railway.resumeMarker > 2147483647, 'real calendar marker stays valid');
      assert.deepEqual(restored.rules.railway.outcome(evidence.pid, 1, evidence.request), {
        pid: evidence.pid,
        epoch: 1,
        request: evidence.request,
        status: 'accepted',
        accepted: 2,
      });
      const snapshot = restored.sync.snapshot();
      const hash = restored.sync.worldHash();
      await restored.close();
      const again = createRailwayWorldHost({
        roomId: evidence.roomId,
        store,
        tick: false,
        now: () => evidence.resumedAt ?? 1000000,
      });
      await again.whenReady();
      assert.deepEqual(again.sync.snapshot(), snapshot, 'second return neither spends nor completes twice');
      assert.equal(again.sync.worldHash(), hash);
      await again.close();
      console.log(
        `[rail-crash] ${roomId} ${boundary}: SIGKILL, ${evidence.published} published stamps, ${initial} units conserved, 24 ${offline ? 'used' : 'allocated'}, terminal receipt 2`,
      );
    });
  }
