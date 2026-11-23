// Frozen on origin/main 20004bc6e, before the host split. Compare the entire ordered JSONL byte stream.
// 2026-11-14 rotunda 1a: only the 205 checkpoint envelope namespaces and their checksums repinned for v45;
// their serialized snapBytes counters follow checksum width. All inputs, snapshots, state hashes and packets stay.
// v45 departure origin: 205 train checkpoints gain seven zero origins; only hashes/checksums and 5,667
// snapBytes samples change. All 8,596 ordered records, inputs, messages and replica packets are preserved.
// v46 traveller: 205 checkpoints gain Aperture.moved/from and v46 namespaces, hashes and checksums; 5,667 snapBytes
// samples follow. All 8,596 ordered records, inputs, messages and packets stay. Regenerate with HOST_TRACE_RECORD=1.
// v47 prow tree: beam x/y/z defaults and checkpoint namespaces change; hashes, checksums and snapBytes follow.
// The record order, inputs and command results remain pinned.
// v48 authentication cutover: only 205 checkpoint namespaces/checksums and 2,518 snapBytes samples change.
// All 8,596 ordered records retain identical inputs, simulation state, hashes, messages and replica packets.
// v48 heavy load: only 205 namespace/checksum envelopes and 2,518 snapBytes samples change.
// All 8,596 ordered records, inputs, state hashes, command results and replication packets remain pinned.
// v49 integration: main had already used v48 for authentication. Only namespace/checksum envelopes and
// serialized byte counters change; the 380 boiler-speed trace from main is retained.
// v50 terrain catalog: remove twelve ordinary sources; retained tree values and other state stay exact after
// entity-ID remapping. 205 namespace/hash/checksum envelopes and 5,667 snapBytes samples follow; inputs/results
// and replica packets stay exact. Audit and own-writer regeneration: docs/plans/terrain-clean.md#heavy-load-rebase-2026-11-15.
// v51 breaker fit: this trace never fits the boiler, so only 205 checkpoint namespaces/checksums and 1,842
// snapBytes samples change. All state, hashes, inputs/results and packets stay exact. Audit and namespace-only
// control: docs/plans/works-flow-step1.md#server-host-trace-follow-up--15-november-2026.
// v53 garage upgrade: the trace never turns the table. A namespace-only v52 control still matches all 8,596 records.
// Only 205 checkpoint namespaces/checksums and 2,313 snapBytes samples change; all state, hashes, inputs/results,
// messages and replica packets stay exact. See docs/plans/garage-choices.md, step 1 as built.
// v54 town buy: checkpoints gain three unbought Plot rows, price percent 50 and v54 envelopes; hashes/bytes and
// dynamic entity IDs follow. The action sweep adds four records for a refused buy (no id), shifting Bob's later
// requests by one. Existing outcome payloads and all other simulation columns stay exact: 8,600 records.
// v55 loader yard: this trace buys no yard. Only 205 namespace/checksum envelopes and 2,528 snapBytes samples
// change; all 8,600 ordered records keep their state, hashes, inputs, results and replica packets.
// v58 town sack: the action sweep adds four records for a refused rail.sack, so Bob's later request ids,
// acks and his account sequence move by one, each checkpoint holds one more outcome row and stats.actions is 18.
// Otherwise only 205 namespace/hash/checksum envelopes and 5,657 snapBytes samples change: 8,604 records.
// v59 garage steel: 205 checkpoints append zero Line.cradle/Shed.spent columns and change namespace/hash/checksum;
// 5,671 snapBytes samples follow. All old columns, inputs, messages and replica packets stay exact. The v58-only
// namespace control still differs by the new columns/hashes/bytes (not a byte-identical control). See garage-choices
// step 3 as built for the 54-seed and 8,604-record audit, performed before the fixture's own writer regenerated it.
// v60 separate capacities: the rules change passed this trace unchanged at v59 (a byte-identical control); under v60
// only 205 checkpoint namespaces/checksums and 2,683 snapBytes samples change. All 8,604 records keep their state,
// hashes, inputs, results and replica packets (keyed audit before the writer regenerated it).
// v61 railhead re-route: the trace never pairs a bent. 205 checkpoints append a zero Aperture.stop column and change
// namespace/hash/checksum; 5,671 snapBytes samples follow. All 8,604 records keep every old column, input, result,
// message and replica packet (keyed comparison with the v60 fixture; docs/plans/railhead-reroute.md, step 1 as built).
// v62 greybox leg 2: the trace never reaches the route. 205 checkpoints gain four shed train rows (slots 7 to 10, in
// the shed at their lines' first halts) whose entity ids push every later component's id column on by 4; the 7 old
// train rows equal the v61 fixture in every column and every other column is exact. 205 namespace/hash/checksum
// envelopes and 5,671 snapBytes samples follow. All 8,604 records keep their inputs, results, messages and replica
// packets (keyed comparison with the v61 fixture before the writer regenerated it; docs/plans/greybox-leg2.md).
// v63 departure ease (G31/G32): the trace funds no stretch. 205 checkpoints change only railTune's railDepartureTicks
// and the 3 job and 7 qjob rows' default departureTicks (20 -> 50), with namespace/hash/checksum; 3,016 snapBytes
// samples follow. All 8,604 records keep their inputs, results, messages and replica packets (keyed comparison with the
// v62 fixture before the writer regenerated it).
// v64 Rail yoke (docs/plans/rail-yoke.md, step 1): the action sweep adds four records for a refused rail.yoke (one
// input, its pending and settled status, its rejection packet), so Bob's later request ids, acks (20 replica packets),
// account request and r:session `next` move by one, each checkpoint after it holds one more outcome row (the
// railway's next id follows) and stats.actions counts one more. 205 checkpoints append a false Rail.yoke column and
// change namespace/hash/checksum; 5,671 snapBytes samples follow. Every other column, input, result and message is exact (keyed comparison with the
// v63 fixture before the writer regenerated it).
// v65 halt yards (docs/plans/halt-yard.md, step 1): the action sweep adds eight records for a refused rail.haltPut and
// rail.haltTake (each its input, pending and settled status and rejection packet), the last two ops of the sweep, so
// only Bob's final account request (45 -> 47), one ack and his r:session `next` (46 -> 48) move, each checkpoint after
// them holds two more outcome rows and stats.actions counts two more. 205 checkpoints gain four all-zero HaltYard rows
// (820 in all) spawned after the catalog, which push every later entity id on by 4 (the railway's next id by 6 with the
// two outcomes); with ids remapped every other row is exact. Namespace/hash/checksum envelopes and 5,673 snapBytes
// samples follow; no recovery lands in a halt yard. Keyed comparison with the v64 fixture before the writer regenerated
// it: 8,616 records.
// v66 greybox leg 3: against v65, each of 205 checkpoints adds one shed bay train (slot 11), shifts later entity
// ids by one, and records serviceStand=false on all 12 trains (2,460 values). railTune drops railTrainHoldCap and
// railTrainHoldPct. Namespace, hash, checksum and 5,677 snapBytes samples follow. The intermediate v66 fixture
// instead had one extra bay train (slot 12). Keyed comparisons against both fixtures account for all 8,616 records:
// 57 inputs, 2,220 messages and 457 replica packets match exactly. Dispatch never moves a train in this trace.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
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
  if (process.env.HOST_TRACE_RECORD === '1') await fs.writeFile(fixture, gzipSync(actual));
  assert.equal(actual, gunzipSync(await fs.readFile(fixture)).toString());
  t.diagnostic(
    `${lines.length} ordered records; 4550 active ticks, 300 paused attempts; all status fields, checkpoint documents and replica packets (including hashes)`,
  );
});
