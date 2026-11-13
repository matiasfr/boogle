// Real host, request history, replicator and atomic store. Only this fixture defines classic server commands.
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { createServerOps } from '../../src/world/server-ops.ts';
import { canSet, setWho } from '../../src/sim/roster.ts';
import { RAILWAY_WINDOW } from '../../src/sim/railway.ts';
import { RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import type { RecoveryEnvelope } from '../../src/world/sync.ts';
import type { ServerPacket } from '../../src/world/replicate.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (why: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

// Astra's two durability races, also exercised with a live railway action failing after mutation.
for (const waiting of [false, true])
  for (const railway of [false, true])
    test(`${waiting ? 'waiting' : 'queued'} durability preserves the good save after a fatal ${railway ? 'railway' : 'classic'} apply`, async (t) => {
      const f = await fixture(t);
      const before = await f.store.read(f.roomId);
      const writes = f.writes.length;
      const old = waiting ? f.holdNextWrite() : null;
      if (old) {
        f.host.sync.saveNow(true);
        await old.entered.promise;
      }
      f.host.ops.define('test.crash.pending', {
        validate: () => true,
        apply: () => {
          setWho(f.host.rules.roster.roster, 'alice', 'Partial', 2);
          throw new Error('partial apply');
        },
      });
      if (railway) {
        const act = f.host.rules.railway.act;
        t.mock.method(f.host.rules.railway, 'act', (...args: Parameters<typeof act>) => {
          act(...args); // real rail.wake mutates before this injected failure
          throw new Error('partial railway apply');
        });
      }
      f.edit(1, { op: 'test.rename' });
      if (waiting) await setImmediate(); // the durability callback is suspended on the older write
      // Observe persistence even if the old live path leaks the exception to its caller.
      let escaped: unknown;
      try {
        f.edit(
          2,
          railway ? { op: 'rail.wake', at: [RAILWAY_T1.wake.x, 0, RAILWAY_T1.wake.z] } : { op: 'test.crash.pending' },
        );
      } catch (error) {
        escaped = error;
      }
      old?.gate.resolve();
      await f.settled();
      const saved = (await f.store.read(f.roomId))!.data as RecoveryEnvelope;
      assert.deepEqual(
        saved.checkpoint.data.roster,
        (before!.data as RecoveryEnvelope).checkpoint.data.roster,
        'fatal apply must not be captured by the pending durable callback',
      );
      assert.equal(f.writes.length, writes + (waiting ? 1 : 0), 'only the already-captured safe write may finish');
      assert.equal(escaped, undefined);
      assert.equal(f.host.status().ready, false);
      assert.deepEqual(f.flush(), { ack: [], rej: [], ok: [] });
      await assert.rejects(f.host.close(), /storage/);
    });

async function fixture(t: TestContext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-server-ops-'));
  const store = createStore({ dataDir: dir, maxRooms: 1 });
  await store.init();
  const roomId = railwayRoomId('proto-ops');
  let hold: { gate: ReturnType<typeof deferred<void>>; entered: ReturnType<typeof deferred<RecoveryEnvelope>> } | null =
    null;
  const writes: RecoveryEnvelope[] = [];
  const host = createRailwayWorldHost({
    roomId,
    tick: false,
    now: () => 1800000000000,
    pidOf: (sid) => (sid === 'a' || sid === 'a2' ? 'alice' : sid === 'b' ? 'bob' : null),
    tuneController: (sid) => sid === 'a',
    store: {
      ...store,
      async write(id, doc, options) {
        const held = hold;
        hold = null;
        writes.push(doc.data as RecoveryEnvelope);
        if (held) {
          held.entered.resolve(doc.data as RecoveryEnvelope);
          await held.gate.promise;
        }
        return store.write(id, doc, options);
      },
    },
  });
  t.after(async () => {
    // Failure cases deliberately poison recovery; their test asserts that failure before cleanup.
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  });
  await host.whenReady();
  const sent: Record<string, unknown>[] = [];
  host.onSend((message) => sent.push(message));
  for (const sid of ['a', 'a2', 'b']) host.replication.addClient(sid);
  let applies = 0;
  for (const [op, durable] of [
    ['test.rename', true],
    ['test.note', false],
  ] as const) {
    host.ops.define(op, {
      durable,
      validate: (e, ctx) =>
        ctx.protoRoom === true &&
        ctx.tuneController(ctx.from) &&
        ctx.actor.reach(0, 0, 10) &&
        canSet(host.rules.roster.roster, e.u, e.n, e.c),
      apply: (e) => {
        applies++;
        return setWho(host.rules.roster.roster, e.u, e.n as string, e.c as number);
      },
    });
  }
  host.deliver({ t: 'r:open' }, 'a');
  assert.deepEqual(sent.at(-1), { t: 'r:session', to: 'a', epoch: 1, next: 1 });
  function edit(request: number, fields: Record<string, unknown> = {}, from = 'a') {
    host.deliver(
      { t: 'r:edit', e: { op: 'test.note', epoch: 1, request, at: [0, 0, 0], ms: 0, n: 'Ana', c: 2, ...fields } },
      from,
    );
  }
  function flush(sid = 'a') {
    const packets: ServerPacket[] = [];
    host.replication.flush(host.sync.roomStep(), (cid, packet) => {
      if (cid === sid) packets.push(packet);
    });
    return {
      ack: packets.flatMap((p) => (p.ack ? [p.ack] : [])),
      rej: packets.flatMap((p) => p.rej ?? []),
      ok: packets.flatMap((p) => p.ok ?? []),
    };
  }
  async function settled() {
    await setImmediate(); // start the coordinator's owned save promise
    await host.sync.whenDurable();
    await setImmediate(); // deliver its receipt
  }
  return {
    host,
    store,
    roomId,
    writes,
    sent,
    edit,
    flush,
    settled,
    applies: () => applies,
    holdNextWrite() {
      const h = { gate: deferred<void>(), entered: deferred<RecoveryEnvelope>() };
      hold = h;
      return h;
    },
  };
}

test('server ops validate authenticated identity, return results, and reject unknown/throwing validation', () => {
  const ops = createServerOps();
  const ctx = {
    from: 'socket',
    tick: 12,
    env: {},
    protoRoom: true,
    tuneController: () => true,
    actor: { reach: () => true, height: () => true, cadence: () => true },
  };
  ops.define('probe', {
    validate: (e) => e.u === 'alice' && e.p === 'socket',
    apply: (e, tick) => ({ pid: e.u, tick }),
  });
  assert.equal(ops.has('probe'), true);
  assert.equal(ops.has('missing'), false);
  assert.throws(() => ops.define('probe', { validate: () => true, apply: () => null }));
  assert.deepEqual(ops.run('alice', { op: 'probe', u: 'forged', p: 'forged' }, ctx), {
    status: 'accepted',
    result: { pid: 'alice', tick: 12 },
    durable: false,
  });
  ops.define('throws', {
    validate: () => {
      throw new Error('bad fields');
    },
    apply: () => assert.fail('applied malformed input'),
  });
  for (const op of ['missing', 'throws', { toString: false }])
    assert.equal(ops.run('alice', { op }, ctx).status, 'rejected');
});

test('duplicate delivery applies once; gaps and old sessions do not consume the next request', async (t) => {
  const f = await fixture(t);
  f.edit(2);
  assert.deepEqual(f.flush().rej, [[1, 2, 'order']]);
  f.edit(1, { epoch: 2 });
  assert.deepEqual(f.flush().rej, [[2, 1, 'session']]);
  f.edit(1, { u: 'bob', p: 'b' });
  assert.deepEqual(f.flush().ok, [[1, 1, 1]]);
  f.edit(1, { n: 'Changed' });
  assert.deepEqual(f.flush().ok, [[1, 1, 1]]);
  assert.equal(f.applies(), 1);
  assert.deepEqual(f.host.sync.snapshot().data.roster, [['alice', 'Ana', 2]]);
  f.edit(2, { n: 'Next', op: 'rail.unknown' });
  assert.deepEqual(f.flush().rej, [[1, 2, 'refused']]);
  assert.equal(f.host.rules.railway.account('alice')?.request, 2);
});

test('malformed fields, missing actor facts and throwing validation are recorded refusals', async (t) => {
  const f = await fixture(t);
  f.host.ops.define('test.throw', {
    validate: () => {
      throw new Error('malformed');
    },
    apply: () => assert.fail('apply'),
  });
  for (const [i, fields] of [{ n: { toString: false } }, { at: null }, { ms: -1 }, { op: 'test.throw' }].entries()) {
    assert.doesNotThrow(() => f.edit(i + 1, fields));
    assert.deepEqual(f.flush().rej, [[1, i + 1, 'refused']]);
  }
  assert.doesNotThrow(() => f.edit(5, { op: { toString: false } })); // uncorrelatable shape is dropped, as before
  assert.equal(f.host.rules.railway.account('alice')?.request, 4);
  assert.equal(f.applies(), 0);
});

test('durable ack and ok wait for the write, including duplicates and later rail refusals', async (t) => {
  const f = await fixture(t);
  const held = f.holdNextWrite();
  f.edit(1, { op: 'test.rename' });
  const envelope = await held.entered.promise;
  assert.deepEqual(envelope.checkpoint.data.roster, [['alice', 'Ana', 2]]);
  f.edit(1, { op: 'test.rename' });
  f.edit(2, { op: 'rail.chop', id: -1 });
  f.edit(2, { op: 'rail.chop', id: -1 });
  f.edit(3, { op: 'rail.wake', at: [RAILWAY_T1.wake.x, 0, RAILWAY_T1.wake.z] });
  assert.deepEqual(f.flush(), { ack: [], rej: [], ok: [] });
  f.host.deliver({ t: 'r:open' }, 'a');
  assert.equal(f.sent.at(-1)?.state, 'starting');
  assert.equal(f.applies(), 1);
  held.gate.resolve();
  await f.settled();
  assert.deepEqual(f.flush(), {
    ack: [[1, 3]],
    rej: [[1, 2, 'refused']],
    ok: [
      [1, 1, 1],
      [1, 3, 1],
    ],
  });
  const saved = (await f.store.read(f.roomId))!.data as RecoveryEnvelope;
  assert.deepEqual(saved.checkpoint.data.roster, [['alice', 'Ana', 2]]);
  // The persisted request history and state restore together; replay cannot apply this request twice.
  const reload = createRailwayWorldHost({ roomId: f.roomId, store: f.store, tick: false, now: () => 1800000000000 });
  await reload.whenReady();
  assert.equal(reload.rules.railway.outcome('alice', 1, 1)?.status, 'accepted');
  assert.deepEqual(reload.sync.snapshot().data.roster, saved.checkpoint.data.roster);
  await reload.close({ save: false });
});

test('an older checkpoint cannot satisfy durability for a command applied after its capture', async (t) => {
  const f = await fixture(t);
  const old = f.holdNextWrite();
  f.host.sync.saveNow(true);
  await old.entered.promise;
  const current = f.holdNextWrite();
  f.edit(1, { op: 'test.rename' });
  assert.deepEqual(f.flush().ack, []);
  old.gate.resolve();
  const envelope = await current.entered.promise;
  assert.deepEqual(envelope.checkpoint.data.roster, [['alice', 'Ana', 2]]);
  assert.deepEqual(f.flush().ack, []);
  current.gate.resolve();
  await f.settled();
  assert.deepEqual(f.flush().ack, [[1, 1]]);
});

test('two durable commands hold each receipt until a checkpoint includes it', async (t) => {
  const f = await fixture(t);
  const first = f.holdNextWrite();
  f.edit(1, { op: 'test.rename' });
  await first.entered.promise;
  const second = f.holdNextWrite();
  f.edit(2, { op: 'test.rename', n: 'Second' });
  first.gate.resolve();
  const envelope = await second.entered.promise;
  assert.deepEqual(envelope.checkpoint.data.roster, [['alice', 'Second', 2]]);
  assert.deepEqual(f.flush().ack, [[1, 1]]);
  second.gate.resolve();
  await f.settled();
  assert.deepEqual(f.flush().ack, [[1, 2]]);
});

test('failed durable write emits storage, never ack/ok, preserves the last save and stops the room', async (t) => {
  const f = await fixture(t);
  const before = await f.store.read(f.roomId);
  const held = f.holdNextWrite();
  f.edit(1, { op: 'test.rename' });
  await held.entered.promise;
  f.edit(2, { n: 'Later' });
  held.gate.reject(new Error('disk full'));
  await assert.rejects(f.settled(), /disk full/);
  await setImmediate();
  assert.deepEqual(f.flush(), { ack: [], rej: [], ok: [] });
  assert.deepEqual(f.sent.at(-1), { t: 'r:state', to: 'a', state: 'storage', epoch: 1, request: 1 });
  assert.deepEqual(await f.store.read(f.roomId), before);
  assert.equal(f.host.status().ready, false);
  f.edit(3, { n: 'Never' });
  assert.equal(f.sent.at(-1)?.state, 'storage');
  assert.equal(f.applies(), 2);
  await assert.rejects(f.host.close(), /storage/);
});

test('a departed session cannot publish a held receipt into its replacement', async (t) => {
  const f = await fixture(t);
  const held = f.holdNextWrite();
  f.edit(1, { op: 'test.rename' });
  await held.entered.promise;
  f.host.depart('a');
  f.host.deliver({ t: 'r:open' }, 'a2');
  assert.equal(f.sent.at(-1)?.epoch, 2);
  held.gate.resolve();
  await f.settled();
  assert.deepEqual(f.flush().ack, []);
  assert.deepEqual(f.flush('a2').ack, []);
  f.edit(1);
  assert.deepEqual(f.flush().rej, [[1, 1, 'session']]);
});

test('production admits rail tune commands while roster and haul retain the classic registry', async (t) => {
  const f = await fixture(t);
  for (const op of ['tune.set', 'tune.commit', 'who.set']) {
    assert.equal(f.host.ops.has(op), op !== 'who.set');
    assert.ok(f.host.sync.registry().ops.includes(op));
  }
  f.edit(1, { op: 'who.set' });
  assert.deepEqual(f.flush().rej, [[1, 1, 'refused']]);
  assert.equal(f.applies(), 0);
});

test('an account epoch replaced under a live session is refused before classic apply', async (t) => {
  const f = await fixture(t);
  // The same replacement a loaded account can cause, without changing the coordinator's live session.
  assert.equal(f.host.rules.railway.session('alice', 2), true);
  f.edit(1);
  assert.deepEqual(f.flush().rej, [[1, 1, 'session']]);
  assert.equal(f.applies(), 0);
  f.host.deliver({ t: 'r:open' }, 'a');
  assert.deepEqual(f.sent.at(-1), { t: 'r:session', to: 'a', epoch: 3, next: 1 });
});

test('a held write bounds pending receipts to the existing action window without consuming overflow', async (t) => {
  const f = await fixture(t);
  const held = f.holdNextWrite();
  f.edit(1, { op: 'test.rename' });
  await held.entered.promise;
  for (let request = 2; request <= RAILWAY_WINDOW; request++) f.edit(request, { n: `Name${request}` });
  f.edit(RAILWAY_WINDOW + 1, { n: 'Overflow' });
  assert.deepEqual(f.flush(), { ack: [], rej: [[1, RAILWAY_WINDOW + 1, 'order']], ok: [] });
  assert.equal(f.applies(), RAILWAY_WINDOW);
  held.gate.resolve();
  await f.settled();
  assert.deepEqual(f.flush().ack, [[1, RAILWAY_WINDOW]]);
  f.edit(RAILWAY_WINDOW + 1, { n: 'Next' });
  assert.deepEqual(f.flush().ok, [[1, RAILWAY_WINDOW + 1, 1]]);
});

test('close drains a held command write before detaching recovery', async (t) => {
  const f = await fixture(t);
  const held = f.holdNextWrite();
  f.edit(1, { op: 'test.rename' });
  await held.entered.promise;
  let closed = false;
  const closing = f.host.close().then(() => {
    closed = true;
  });
  await setImmediate();
  assert.equal(closed, false);
  assert.deepEqual(f.flush().ack, []);
  held.gate.resolve();
  await closing;
  assert.deepEqual(f.flush().ack, [[1, 1]]);
  const saved = (await f.store.read(f.roomId))!.data as RecoveryEnvelope;
  assert.deepEqual(saved.checkpoint.data.roster, [['alice', 'Ana', 2]]);
});

test('an apply exception after mutation stops publication and cannot be saved on close', async (t) => {
  const f = await fixture(t);
  const before = await f.store.read(f.roomId);
  f.host.ops.define('test.crash', {
    validate: () => true,
    apply: () => {
      setWho(f.host.rules.roster.roster, 'alice', 'Partial', 2);
      throw new Error('apply failed after mutation');
    },
  });
  assert.doesNotThrow(() => f.edit(1, { op: 'test.crash' }));
  assert.equal(f.sent.at(-1)?.state, 'storage');
  assert.deepEqual(f.flush(), { ack: [], rej: [], ok: [] });
  const tick = f.host.status().tick;
  f.host.step(0.3);
  f.host.pause();
  f.host.wake();
  assert.equal(f.host.status().tick, tick);
  await assert.rejects(f.host.close(), /storage/);
  assert.deepEqual(await f.store.read(f.roomId), before);
});
