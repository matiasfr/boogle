// Frozen on origin/main 20004bc6e, before the host split. Compare the entire ordered JSONL byte stream.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { setImmediate } from 'node:timers/promises';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { booglerPose } from '../../src/world/boogler-shadow.ts';
import { RAIL_ACTIONS } from '../../src/world/railway-server.ts';

test('host reproduces the pre-split room trace byte for byte', async (t) => {
  let now = 1800000000000;
  t.mock.method(performance, 'now', () => now);
  t.mock.method(Date, 'now', () => now);
  t.mock.timers.enable({ apis: ['setInterval'] });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-host-trace-'));
  const store = createStore({ dataDir: dir, maxRooms: 1 });
  await store.init();
  const lines: string[] = [];
  const record = (kind: string, value: unknown) => lines.push(JSON.stringify([kind, value]));
  const players = new Set<string>();
  const make = (tick = false) => {
    const host = createRailwayWorldHost({
      roomId: railwayRoomId('proto-host-trace'),
      tick,
      awake: false,
      now: () => now,
      pidOf: (sid) => sid,
      tuneController: (sid) => sid === 'alice',
      hasPlayers: () => players.size > 0,
      positions: () => [...players].map((pid) => ({ pid, x: 0, y: 2, z: 0, at: now })),
      store: {
        ...store,
        async write(id, doc, options) {
          record('checkpoint', doc);
          return store.write(id, doc, options);
        },
      },
    });
    host.onSend((message) => record('message', message));
    return host;
  };
  let host = make();
  t.after(async () => {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  const sample = (label: string) => {
    record('status', { label, status: host.status(), stats: host.stats });
    host.replication.flush(host.sync.roomStep(), (sid, packet) => record('replica', { sid, packet }));
  };
  const settled = async () => {
    await setImmediate();
    await host.sync.whenDurable();
    await setImmediate();
  };
  const sessions = new Map<string, { epoch: number; request: number }>();
  const join = (sid: string) => {
    players.add(sid);
    host.wake();
    host.replication.addClient(sid);
    host.deliver({ t: 'r:open' }, sid);
    const message = JSON.parse(lines.at(-1)!)[1];
    assert.equal(message.t, 'r:session');
    sessions.set(sid, { epoch: message.epoch, request: message.next });
    sample('join ' + sid);
  };
  const command = async (sid: string, fields: Record<string, unknown>, accepted: boolean | null = true) => {
    const session = sessions.get(sid)!;
    const request = session.request;
    const before = lines.length;
    record('input', { sid, fields });
    host.deliver({ t: 'r:edit', e: { ...session, at: [0, 0, 0], ms: now - 1800000000000, ...fields } }, sid);
    session.request++;
    sample('pending ' + fields.op);
    await settled();
    sample('settled ' + fields.op);
    // A golden containing only admission failures would not exercise commands or their durable checkpoints.
    const records = lines.slice(before).map((line) => JSON.parse(line));
    const receipts = records.filter(([kind, row]) => kind === 'replica' && row.sid === sid);
    const has = (key: 'ok' | 'rej') =>
      receipts.some(([, row]) => row.packet[key]?.some((r: number[]) => r[1] === request));
    if (accepted !== null)
      assert.equal(has(accepted ? 'ok' : 'rej'), true, `${fields.op}: expected ${accepted ? 'acceptance' : 'refusal'}`);
    if (accepted && (fields.op === 'who.set' || fields.op === 'tune.commit')) {
      const write = records.findIndex(([kind]) => kind === 'checkpoint');
      const receipt = records.findIndex(
        ([kind, row]) =>
          kind === 'replica' && row.sid === sid && row.packet.ok?.some((r: number[]) => r[1] === request),
      );
      assert.ok(write >= 0 && receipt > write, 'durable receipt follows its checkpoint');
    }
  };
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      host.step(0.1);
      await settled();
      sample('tick');
    }
  };
  const depart = (sid: string) => {
    host.depart(sid);
    host.replication.removeClient(sid);
    players.delete(sid);
    sample('depart ' + sid);
  };
  await host.whenReady();
  sample('ready');
  join('alice');
  join('bob');
  await command('alice', { op: 'who.set', n: 'Alice', c: 2 });
  await command('bob', { op: 'who.set', n: 'Bob', c: 3 });
  await command('alice', { op: 'who.set', n: 'Too soon', c: 1 }, false);
  await command('alice', { op: 'tune.set', key: 'railBeamGraceS', v: 5 });
  await command('alice', {
    op: 'tune.commit',
    key: 'railBeamGraceS',
    v: 6,
    requestId: 'trace',
    expectedRevision: host.rules.railTune.tune.revision,
  });
  await command('alice', { op: 'seat.sit', id: 'trace-chair' });
  await command('bob', { op: 'seat.sit', id: 'trace-chair' }, false);
  await command('alice', { op: 'seat.stand' });
  const state = host.status().boogler;
  const pose = state.leg ? booglerPose(state.leg, host.sync.roomStep() / 6) : state;
  const at = [Math.round(pose.x * 100), 0, Math.round(pose.z * 100)];
  await command('alice', { op: 'boogler.gift', kind: 0, at });
  await command('alice', { op: 'boogler.puff', end: 7.5, at });
  await command('alice', { op: 'boogler.puff', end: 7.5, at }, false);
  await command('alice', { op: 'rail.wake', at: [RAILWAY_T1.wake.x, 0, RAILWAY_T1.wake.z] });
  // Every registered railway command traverses admission too; unavailable route actions are expected refusals.
  for (const op of RAIL_ACTIONS) await command('bob', { op }, null);
  for (const message of [{ t: 'r:clock', at: 42 }, { t: 'r:resync' }, { t: 'r:open' }]) host.deliver(message, 'bob');
  await ticks(1200);
  depart('alice');
  await ticks(50);
  join('alice');
  await ticks(1000);
  depart('alice');
  depart('bob');
  host.pause();
  await settled();
  const pausedTick = host.sync.world.tick;
  await ticks(300);
  assert.equal(host.sync.world.tick, pausedTick);
  now += 3600000;
  join('bob');
  await ticks(1000);
  host.sync.saveNow(true);
  await settled();
  sample('checkpoint');
  await host.close();
  players.clear();
  now += 60000;
  host = make(true);
  await host.whenReady();
  sample('restart');
  join('alice');
  join('bob');
  await ticks(1000);
  // Exercise the actual 60 Hz timer, including its maintenance-on-rule-tick condition and cost counters.
  for (let i = 0; i < 1000; i++) {
    now += 17;
    t.mock.timers.tick(17);
    await settled();
    sample('timer');
  }
  await host.close();
  sample('closed');
  const actual = lines.join('\n') + '\n';
  const fixture = new URL('./fixtures/world-host-trace.jsonl.gz', import.meta.url);
  assert.equal(actual, gunzipSync(await fs.readFile(fixture)).toString());
  t.diagnostic(
    `${lines.length} ordered records; 4550 active ticks, 300 paused attempts; all status fields, checkpoint documents and replica packets (including hashes)`,
  );
});
