// Exercise tuning admission through the real playable host and its durable recovery store.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { MAX_RECOVERY_BYTES, type RecoveryEnvelope } from '../../src/world/sync.ts';
import { MAX_PLAYERS, NAME_MAX } from '../../src/sim/roster.ts';
import { invariant } from '../../test/helpers/rail.ts';
import type { TuneApi } from '../../src/world/rules/tune.ts';

type Obj = Record<string, unknown>;
async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-tuning-budget-'));
  const store = createStore({ dataDir: dir, maxRooms: 4 });
  await store.init();
  const roomId = railwayRoomId('proto-tuning-budget');
  let clock = 1793906400000;
  const sent: Obj[] = [];
  const create = () => {
    const host = createRailwayWorldHost({
      roomId,
      store,
      tick: false,
      saveMs: 1000000000,
      now: () => clock,
      pidOf: (sid) => sid,
      tuneController: () => true,
    });
    host.onSend((message) => sent.push(message));
    return host;
  };
  let host = create();
  await host.whenReady();
  return {
    get host() {
      return host;
    },
    sent,
    store,
    roomId,
    tune() {
      assert.ok('tune' in host.rules);
      return host.rules.tune as TuneApi;
    },
    recovery() {
      const recovery = store.readSync(roomId)?.data as RecoveryEnvelope | undefined;
      assert.ok(recovery);
      assert.ok(Buffer.byteLength(JSON.stringify(recovery)) <= MAX_RECOVERY_BYTES);
      return recovery;
    },
    async ticks(n = 6) {
      for (let k = 0; k < n; k++) {
        await host.sync.whenDurable();
        clock += 100;
        host.step(0.1);
      }
      await host.sync.whenDurable();
      assert.equal(invariant(host.rules.railway.world()), null);
    },
    async restart() {
      await host.close({ save: false });
      host = create();
      await host.whenReady();
    },
    async close() {
      try {
        await host.close({ save: false });
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    },
  };
}

function commit(requestId: string, expectedRevision = 0): Obj {
  return {
    op: 'tune.commit',
    i: 0,
    j: 0,
    key: 'railRegrowMinutes',
    v: 2,
    expectedRevision,
    requestId,
  };
}

test('playable tuning strips padded burst fields before durable admission', async () => {
  const f = await fixture();
  try {
    for (let k = 0; k < 64; k++) {
      const e = { ...commit(`burst-${k}`), pad: '' };
      e.pad = 'x'.repeat(990 - JSON.stringify(e).length);
      assert.ok(JSON.stringify(e).length < 1000);
      f.host.deliver({ t: 'w:edit', e }, 'controller');
    }
    await assert.doesNotReject(f.host.sync.whenDurable());
    const recovery = f.recovery();
    assert.ok(!JSON.stringify(recovery).includes('"pad"'));
    assert.equal(recovery.tail.filter(({ e }) => e.op === 'tune.commit').length, 64);
    assert.equal(f.host.status().ready, true);
    // Restart with accepted work still pending: replay once, then persist the applied revision.
    await f.restart();
    await f.ticks();
    assert.equal(f.tune().get('railRegrowMinutes'), 2);
    assert.equal(f.tune().tune.revision, 1);
    await f.restart();
    assert.equal(f.host.status().ready, true);
    assert.equal(f.tune().tune.revision, 1);
  } finally {
    await f.close();
  }
});

test('full roster tuning refuses oversized ids and tail pressure before stamping, then recovers', async (t) => {
  const f = await fixture();
  try {
    const sid = (k: number) => `p${k.toString(36).padStart(31, '0')}`;
    for (let k = 0; k < MAX_PLAYERS; k++) {
      f.host.deliver({ t: 'w:edit', e: { op: 'who.set', i: 0, j: 0, n: '\uffff'.repeat(NAME_MAX), c: 0 } }, sid(k));
      if (k % 32 === 31) await f.ticks();
    }
    assert.equal(f.host.rules.roster.roster.pids.length, MAX_PLAYERS);
    const initialSeq = f.recovery().seq;
    const ids = new Set<string>();
    for (let k = 0; k < 64; k++) {
      const requestId = `${k.toString(36).padStart(2, '0')}${'\ud800'.repeat(62)}`;
      ids.add(requestId);
      const e = commit(requestId);
      assert.equal(requestId.length, 64);
      assert.ok(JSON.stringify(e).length < 1000);
      f.host.deliver({ t: 'w:edit', e }, sid(0));
    }
    await assert.doesNotReject(f.host.sync.whenDurable());
    const recovery = f.recovery();
    const accepted = recovery.tail.filter(({ e }) => e.op === 'tune.commit');
    const refused = f.sent.filter((m) => m.t === 'w:rejected' && ids.has(m.requestId as string));
    assert.ok(accepted.length > 0);
    // Since the 128 KB budget (6 November) the 64-entry tail cap binds before bytes even at a full roster;
    // the byte refusal itself is covered by sync-recovery's oversized-state test.
    assert.ok(Buffer.byteLength(JSON.stringify(recovery)) <= MAX_RECOVERY_BYTES);
    assert.equal(accepted.length + refused.length, 64);
    assert.ok(refused.every((m) => m.reason === 'recovery-budget'));
    assert.equal(recovery.seq, initialSeq + accepted.length);
    assert.ok(accepted.every(({ e }) => !refused.some((m) => m.requestId === e.requestId)));
    t.diagnostic(
      `full roster: ${accepted.length} accepted, ${refused.length} refused, ${Buffer.byteLength(JSON.stringify(recovery))}/${MAX_RECOVERY_BYTES} bytes`,
    );
    assert.equal(f.host.status().ready, true);

    await f.restart();
    await f.ticks();
    assert.equal(f.tune().tune.revision, 1);
    f.host.deliver({ t: 'w:edit', e: { ...commit('retry', 1), v: 3 } }, sid(0));
    await f.host.sync.whenDurable();
    await f.ticks();
    assert.equal(f.tune().tune.revision, 2);
    assert.equal(f.tune().get('railRegrowMinutes'), 3);
    await f.restart();
    assert.equal(f.host.status().ready, true);
    assert.equal(f.host.rules.roster.roster.pids.length, MAX_PLAYERS);
    assert.equal(f.tune().tune.revision, 2);
    assert.equal(f.tune().get('railRegrowMinutes'), 3);
    assert.equal(invariant(f.host.rules.railway.world()), null);
    const beforeLongId = f.recovery().seq;
    const tooLong = '\ud800'.repeat(65);
    f.host.deliver({ t: 'w:edit', e: commit(tooLong, 2) }, sid(0));
    await f.host.sync.whenDurable();
    assert.equal(f.recovery().seq, beforeLongId);
    assert.ok(
      f.sent.some((m) => m.t === 'w:rejected' && m.requestId === tooLong && m.reason === 'request-id-too-long'),
    );
  } finally {
    await f.close();
  }
});
