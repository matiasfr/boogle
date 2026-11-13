// Exercise tuning admission through the real playable host and its durable recovery store.
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
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
import type { RailTuneApi } from '../../src/world/rules/tune.ts';

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
      return host.rules.railTune as RailTuneApi;
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

test('rail tuning never enters the classic recovery tail or persists arbitrary padding', async () => {
  const f = await fixture();
  try {
    f.host.replication.addClient('controller');
    f.host.deliver({ t: 'r:open' }, 'controller');
    for (let request = 1; request <= 8; request++) {
      f.host.deliver(
        {
          t: 'r:edit',
          e: {
            ...commit(`burst-${request}`, request - 1),
            epoch: 1,
            request,
            at: [0, 0, 0],
            ms: 0,
            pad: 'x'.repeat(500),
          },
        },
        'controller',
      );
    }
    await setImmediate();
    await f.ticks();
    await f.host.close(); // drains every accepted durable write
    const recovery = f.recovery();
    assert.equal(recovery.tail.length, 0);
    assert.ok(!JSON.stringify(recovery).includes('"pad"'));
    await f.restart();
    assert.equal(f.tune().get('railRegrowMinutes'), 2);
    assert.equal(f.tune().tune.revision, 8);
    assert.equal(f.host.status().ready, true);
  } finally {
    await f.close();
  }
});

test('full roster keeps bounded recovery; rail commit accepts 65–80 unit ids without the old tail limit', async (t) => {
  const f = await fixture();
  try {
    const sid = (k: number) => `p${k.toString(36).padStart(31, '0')}`;
    for (let k = 0; k < MAX_PLAYERS; k++) {
      f.host.deliver({ t: 'r:open' }, sid(k));
      f.host.deliver(
        {
          t: 'r:edit',
          e: { op: 'who.set', n: '\ud800'.repeat(NAME_MAX), c: 0, epoch: 1, request: 1, at: [0, 0, 0], ms: 0 },
        },
        sid(k),
      );
      if (k % 32 === 31) await f.ticks();
    }
    assert.equal(f.host.rules.roster.roster.pids.length, MAX_PLAYERS);
    f.host.replication.addClient(sid(0));
    f.host.deliver({ t: 'r:open' }, sid(0));
    for (const [k, length] of [65, 80, 81].entries()) {
      f.host.deliver(
        { t: 'r:edit', e: { ...commit('x'.repeat(length), k), epoch: 1, request: k + 2, at: [0, 0, 0], ms: 0 } },
        sid(0),
      );
    }
    await setImmediate();
    await f.ticks();
    assert.equal(f.tune().tune.revision, 2);
    await f.host.close();
    const recovery = f.recovery();
    assert.equal(recovery.tail.filter(({ e }) => typeof e.op === 'string' && e.op.startsWith('tune.')).length, 0);
    t.diagnostic(`full roster: ${Buffer.byteLength(JSON.stringify(recovery))}/${MAX_RECOVERY_BYTES} bytes`);
    await f.restart();
    assert.equal(f.tune().tune.revision, 2);
    assert.equal(f.host.rules.roster.roster.pids.length, MAX_PLAYERS);
  } finally {
    await f.close();
  }
});
