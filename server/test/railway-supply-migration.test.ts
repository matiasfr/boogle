// Real accepted v0 fixture generated and restored by 3e37f124. Its published carry of two must survive.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore, type RoomDoc } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import type { RecoveryEnvelope } from '../../src/world/sync.ts';
import { createTune, serializeTune } from '../../src/sim/tune.ts';
import { createTune as createTuneV0 } from '../../src/sim/tune-v0.ts';
import { createTune as createTuneSupplyV1 } from '../../src/sim/tune-supply-v1.ts';

const fixture = async (profile: 'v0' | 'supply-v1' = 'v0') =>
  JSON.parse(
    await fs.readFile(new URL(`./fixtures/railway-${profile}-recovery.json`, import.meta.url), 'utf8'),
  ) as RoomDoc & {
    data: RecoveryEnvelope;
  };

function checksum(data: RecoveryEnvelope) {
  const { checksum: _old, ...body } = data;
  const text = JSON.stringify(body);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  data.checksum = h;
}

test('supply upgrade verifies and atomically replaces a published version-0 T1 chop, then restarts', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-migration-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  const saved = await fixture();
  const roomId = 't1v02-migration';
  assert.equal((await store.write(roomId, saved)).status, 200);
  const opts = { roomId, store, tick: false, now: () => Date.parse(saved.updatedAt) };
  let host = createRailwayWorldHost(opts);
  try {
    await host.whenReady();
    assert.equal(host.status().ready, true);
    assert.equal(host.rules.railway.account('legacyplayer')?.carry, 2);
    assert.equal(host.rules.railway.counts().total, 3880);
    assert.equal(host.rules.railway.counts().rack, 0);
    assert.equal(host.rules.railway.counts().produced, 0);
    const upgraded = store.readSync(roomId)!.data as RecoveryEnvelope;
    assert.equal(upgraded.checkpoint.vers.railway, 1);
    assert.notEqual(upgraded.hash, saved.data.hash, 'supply state is included in the new world hash');
    assert.notEqual(upgraded.checksum, saved.data.checksum);
    assert.equal(upgraded.seq, saved.data.seq);
    assert.deepEqual(upgraded.tail, []);
    for (const key of Object.keys(saved.data.checkpoint.data).filter((key) => key !== 'railway' && key !== 'tune'))
      assert.deepEqual(upgraded.checkpoint.data[key], saved.data.checkpoint.data[key]);
    assert.equal(upgraded.checkpoint.vers.tune, 2);
    const expectedTune = createTune();
    Object.assign(expectedTune.v, createTuneV0().v);
    assert.deepEqual(upgraded.checkpoint.data.tune, serializeTune(expectedTune));
    await host.close({ save: false });
    host = createRailwayWorldHost(opts);
    await host.whenReady();
    assert.equal(host.rules.railway.account('legacyplayer')?.carry, 2);
    assert.equal(host.rules.railway.counts().total, 3880);
    assert.deepEqual(store.readSync(roomId)!.data, upgraded, 'a migrated checkpoint never migrates again');
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('v0 migration drains the accepted tail with frozen rules before adding supply', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-tail-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  const saved = await fixture();
  saved.data.seq++;
  saved.data.tail = [
    {
      tick: saved.tick + 3,
      seq: saved.data.seq,
      e: {
        op: 'rail.chop',
        i: 0,
        j: 0,
        p: 'oldsession',
        u: 'legacyplayer',
        epoch: 1,
        request: 3,
        id: 0,
        yaw: 0,
        collapsed: false,
      },
    },
  ];
  checksum(saved.data);
  const roomId = 't1v02-tail';
  await store.write(roomId, saved);
  const host = createRailwayWorldHost({ roomId, store, tick: false, now: () => Date.parse(saved.updatedAt) });
  try {
    await host.whenReady();
    assert.equal(host.rules.railway.account('legacyplayer')?.carry, 4);
    assert.equal(host.rules.railway.counts().total, 3880);
    assert.equal(host.rules.railway.counts().produced, 0);
    assert.equal((store.readSync(roomId)!.data as RecoveryEnvelope).checkpoint.tick, saved.tick + 3);
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});

for (const profile of ['v0', 'supply-v1'] as const)
  for (const damage of [
    'checksum',
    'hash',
    'registry',
    'state',
    'tail',
    'tune-version',
    'namespace',
    'catalog',
  ] as const)
    test(`corrupt ${profile} ${damage} is rejected without changing one byte of the accepted file`, async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-corrupt-'));
      const store = createStore({ dataDir: dir, maxRooms: 2 });
      await store.init();
      const saved = await fixture(profile);
      if (damage === 'checksum') saved.data.checksum ^= 1;
      if (damage === 'hash') saved.data.hash ^= 1;
      if (damage === 'registry') saved.data.checkpoint.vers.roster = 1;
      if (damage === 'tune-version') saved.data.checkpoint.vers.tune = 1;
      if (damage === 'namespace') saved.data.namespace = 't1v03';
      if (damage === 'catalog') saved.data.catalog = '2';
      if (damage === 'state') (saved.data.checkpoint.data.railway as Record<string, unknown>).stock = 1;
      if (damage === 'tail') saved.data.tail = [{ tick: saved.tick, seq: 1, e: { op: 'rail.chop' } }];
      if (damage !== 'checksum') checksum(saved.data);
      const roomId = 't1v02-corrupt';
      await store.write(roomId, saved);
      const file = path.join(dir, `${roomId}.json`);
      const before = await fs.readFile(file);
      const host = createRailwayWorldHost({ roomId, store, tick: false, now: () => Date.parse(saved.updatedAt) });
      try {
        await assert.rejects(host.whenReady(), /recovery/);
        assert.equal(host.status().ready, false);
        assert.match(host.status().recoveryError!, /recovery/);
        const messages: Record<string, unknown>[] = [];
        host.onSend((message) => messages.push(message));
        host.deliver({ t: 'w:need' }, 'observer');
        assert.equal(messages.at(-1)?.state, 'storage');
        assert.deepEqual(await fs.readFile(file), before);
      } finally {
        await host.close({ save: false }).catch(() => {});
        assert.deepEqual(await fs.readFile(file), before);
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

for (const profile of ['v0', 'supply-v1'] as const)
  for (const refuse of [false, true])
    test(`${profile} upgrade stays unavailable until atomic replacement ${refuse ? 'is refused' : 'succeeds'}`, async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-atomic-'));
      const store = createStore({ dataDir: dir, maxRooms: 2 });
      await store.init();
      const saved = await fixture(profile);
      const roomId = 't1v02-atomic';
      await store.write(roomId, saved);
      const file = path.join(dir, `${roomId}.json`);
      const before = await fs.readFile(file);
      let unblock!: () => void;
      const gate = new Promise<void>((resolve) => {
        unblock = resolve;
      });
      let started!: () => void;
      const writing = new Promise<void>((resolve) => {
        started = resolve;
      });
      const delayed = {
        ...store,
        async write(id: string, doc: RoomDoc) {
          assert.equal((doc.data as RecoveryEnvelope).checkpoint.vers.railway, 1);
          started();
          await gate;
          return refuse ? { status: 507 as const, body: { error: 'test refusal' } } : store.write(id, doc);
        },
      };
      const host = createRailwayWorldHost({
        roomId,
        store: delayed,
        tick: false,
        now: () => Date.parse(saved.updatedAt),
      });
      try {
        await writing;
        assert.equal(host.status().ready, false);
        assert.deepEqual(await fs.readFile(file), before);
        unblock();
        if (refuse) {
          await assert.rejects(host.whenReady(), /write refused/);
          assert.equal(host.status().ready, false);
          assert.deepEqual(await fs.readFile(file), before);
        } else {
          await host.whenReady();
          assert.equal(host.status().ready, true);
          if (profile === 'v0') assert.equal(host.rules.railway.account('legacyplayer')?.carry, 2);
          else {
            assert.equal(host.rules.railway.counts().rack, 10);
            assert.equal(host.rules.railway.counts().produced, 10);
          }
          assert.equal((store.readSync(roomId)!.data as RecoveryEnvelope).checkpoint.vers.railway, 1);
        }
      } finally {
        unblock();
        await host.close({ save: false }).catch(() => {});
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

// Generated with the pinned 236f689a registry using accepted session, tuning, wake, chop/drop and supply
// requests. Source 5 is exhausted, ten logs are recovered, stage 34 is durable; the accepted tail regrows it.
test('supply-v1 recovery verifies its old hash and accepted tail before upgrading tuning, then restarts', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-v1-migration-'));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  const saved = await fixture('supply-v1');
  assert.equal(saved.data.checkpoint.vers.railway, 1);
  assert.equal(saved.data.checkpoint.vers.tune, 0);
  assert.deepEqual(saved.data.checkpoint.data.tune, { railRegrowMinutes: 3, railRecoveryMinutes: 2 });
  assert.equal(saved.data.tail.length, 1);
  assert.equal(saved.data.tail[0]!.e.op, 'rail.supply');
  const roomId = 't1v02-supply-v1';
  assert.equal((await store.write(roomId, saved)).status, 200);
  const opts = { roomId, store, tick: false, now: () => Date.parse(saved.updatedAt) };
  let host = createRailwayWorldHost(opts);
  const assertSupply = () => {
    assert.equal(host.status().ready, true);
    const state = host.rules.railway.railway;
    assert.equal(state.sources[5], 10);
    assert.equal(state.supply!.ages[5], 35);
    assert.equal(host.rules.railway.counts().rack, 10);
    assert.equal(host.rules.railway.counts().produced, 10);
    assert.equal(host.rules.railway.counts().source, 3880);
    assert.equal(host.rules.railway.counts().total, 3890);
  };
  try {
    await host.whenReady();
    assertSupply();
    const upgraded = store.readSync(roomId)!.data as RecoveryEnvelope;
    assert.equal(upgraded.checkpoint.vers.railway, 1);
    assert.equal(upgraded.checkpoint.vers.tune, 2);
    assert.equal(upgraded.checkpoint.tick, saved.tick + 3);
    assert.equal(upgraded.seq, saved.data.seq);
    assert.deepEqual(upgraded.tail, []);
    assert.notEqual(upgraded.hash, saved.data.hash);
    assert.notEqual(upgraded.checksum, saved.data.checksum);
    const tune = createTune();
    Object.assign(tune.v, createTuneSupplyV1().v);
    tune.v.railRegrowMinutes = 3;
    tune.v.railRecoveryMinutes = 2;
    assert.deepEqual(upgraded.checkpoint.data.tune, serializeTune(tune));
    for (const key of Object.keys(saved.data.checkpoint.data).filter((key) => key !== 'railway' && key !== 'tune'))
      assert.deepEqual(upgraded.checkpoint.data[key], saved.data.checkpoint.data[key]);
    await host.close({ save: false });
    host = createRailwayWorldHost(opts);
    await host.whenReady();
    assertSupply();
    assert.deepEqual(store.readSync(roomId)!.data, upgraded, 'upgraded supply never migrates or regrows twice');
  } finally {
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
});
