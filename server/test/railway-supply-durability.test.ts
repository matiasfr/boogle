// Accepted rack transfers and staged renewal survive the existing store/host/manager process boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import type { RailwayWorldHost } from '../src/host/world-host.ts';
import { createRoomHost } from '../src/host/rooms.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { LINE1_INITIAL } from '../../src/sim/railway-line-layout.ts';
import { railCounts } from '../../src/sim/railway-queries-line2.ts';
import { invariant, trees } from '../../test/helpers/rail.ts';
import type { TuneApi } from '../../src/world/rules/tune.ts';
import { SUPPLY_SOURCE, supplyFixture } from './fixtures/railway-supply-fixture.ts';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, label: string) {
  const deadline = performance.now() + 8000;
  while (!predicate()) {
    if (performance.now() > deadline) throw new Error(`timeout: ${label}`);
    await sleep(10);
  }
}
function assertSupply(host: RailwayWorldHost, stage: number) {
  const w = host.rules.railway.world();
  const counts = railCounts(w);
  const initial = LINE1_INITIAL[0];
  assert.equal(trees(w)[SUPPLY_SOURCE]!.age, stage);
  assert.equal(counts.rack, 10);
  assert.equal(counts.loose, 0);
  assert.equal(counts.carry, 0);
  assert.equal(counts.produced, stage === 35 ? 10 : 0);
  assert.equal(counts.source, initial - (stage === 35 ? 0 : 10));
  assert.equal(counts.total, initial + counts.produced);
  assert.equal(invariant(w), null);
}

test('only controlled T1 proto commits accept the two supply tunes, which survive restart and govern conserved progress', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-tune-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const f = await supplyFixture(dir, railwayRoomId('proto-supply-tune'), false);
  const tune = () => {
    assert.ok('tune' in f.host.rules);
    return f.host.rules.tune as TuneApi;
  };
  const refusals: Record<string, unknown>[] = [];
  f.host.onSend((message) => {
    if (message.t === 'w:rejected') refusals.push(message);
  });
  let request = 0;
  const set = async (key: string, v: number, patch: Record<string, unknown> = {}) => {
    const requestId = `supply-tune-${++request}`;
    f.host.deliver(
      {
        t: 'w:edit',
        e: {
          op: 'tune.commit',
          i: 0,
          j: 0,
          key,
          v,
          expectedRevision: tune().tune.revision,
          requestId,
          ...patch,
        },
      },
      'supplysession',
    );
    await f.ticks(4);
    return requestId;
  };
  try {
    f.host.sync.setEnv({ tuneController: () => false });
    const denied = await set('railRegrowMinutes', 1);
    assert.equal(tune().get('railRegrowMinutes'), 31);
    assert.ok(refusals.some((r) => r.requestId === denied && r.to === 'supplysession'));
    f.host.sync.setEnv({ tuneController: (sid: string) => sid === 'supplysession' });
    const stale = await set('railRegrowMinutes', 1, { expectedRevision: 42 });
    assert.equal(tune().get('railRegrowMinutes'), 31);
    assert.ok(refusals.some((r) => r.requestId === stale));
    await set('railRegrowMinutes', 1);
    await set('railRecoveryMinutes', 2);
    assert.equal(tune().get('railRegrowMinutes'), 1);
    assert.equal(tune().get('railRecoveryMinutes'), 2);
    await set('railRegrowMinutes', 0);
    await set('railRecoveryMinutes', 1441);
    assert.equal(tune().get('railRegrowMinutes'), 1, 'bounds remain enforced');
    assert.equal(tune().get('railRecoveryMinutes'), 2);
    const oldCost = tune().get('cost0');
    await set('cost0', oldCost + 1);
    assert.equal(tune().get('cost0'), oldCost, 'the T1 allow-list does not open unrelated tuning');
    assert.equal(tune().tune.revision, 2, 'only the two accepted commits increment revision');
    f.advance(1);
    await f.ticks(4);
    assert.equal(f.stage(), 31);
    assert.equal(railCounts(f.host.rules.railway.world()).rack, 0);
    await f.restart();
    assert.equal(tune().get('railRegrowMinutes'), 1);
    assert.equal(tune().get('railRecoveryMinutes'), 2);
    assert.equal(f.stage(), 31, 'restart keeps earned progress without an extra growth stage');
    f.advance(1);
    await f.ticks(12); // Recovery remains one pile per durable stamp; both bounded piles must apply.
    assertSupply(f.host, 32);
    await f.toStage(35);
    assertSupply(f.host, 35);
  } finally {
    await f.host.close({ save: false });
  }
  const ordinary = await supplyFixture(dir, railwayRoomId('supply-no-tune'), false);
  try {
    ordinary.host.deliver(
      { t: 'w:edit', e: { op: 'tune.set', i: 0, j: 0, key: 'railRegrowMinutes', v: 1 } },
      'supplysession',
    );
    await ordinary.ticks(4);
    assert.ok('tune' in ordinary.host.rules);
    assert.equal(
      (ordinary.host.rules.tune as TuneApi).get('railRegrowMinutes'),
      31,
      'normal rooms retain the existing tuning policy',
    );
  } finally {
    await ordinary.host.close({ save: false });
  }
});

test('occupied room protects nearby drops while slow renewal ignores visibility and nearby peers', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-observers-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const f = await supplyFixture(dir, railwayRoomId('supply-observers'), false);
  try {
    const source = RAILWAY_SOURCES[SUPPLY_SOURCE]!;
    const x = source[1] / 100,
      z = source[2] / 100;
    const far = (at = f.now()) => ({
      x: x + 100,
      z,
      at,
    });
    f.advance(21);
    f.observe([{ x, z, at: f.now() }]);
    await f.ticks(12);
    assert.equal(railCounts(f.host.rules.railway.world()).rack, 0, 'nearby observer keeps all drops in place');
    assert.equal(railCounts(f.host.rules.railway.world()).loose, 10);
    f.observe([far(f.now() - 2001)]);
    await f.ticks(4);
    assert.equal(railCounts(f.host.rules.railway.world()).rack, 0, 'stale observer cannot authorize cleanup');
    f.observe([far()]);
    await f.ticks(12);
    assert.equal(railCounts(f.host.rules.railway.world()).rack, 10, 'fresh distant observer permits ordinary recovery');
    f.advance(10);
    f.observe([{ x, z, at: f.now() }]);
    await f.ticks(4);
    assert.equal(f.stage(), 31);
    f.advance(1);
    f.observe([{ x, z, at: f.now() }]);
    await f.ticks(4);
    assert.equal(f.stage(), 32, 'a nearby player does not block the shoot');
    f.advance(1);
    f.observe([null]);
    await f.ticks(4);
    assert.equal(f.stage(), 33, 'unknown player pose does not block the next growth stage');
    f.advance(1);
    f.observe([far(f.now() - 2001)]);
    await f.ticks(4);
    assert.equal(f.stage(), 34, 'stale player pose does not block the next growth stage');
    f.advance(1);
    f.observe([{ x, z, at: f.now() }]);
    await f.ticks(4);
    assertSupply(f.host, 35);
    await f.restart();
    assertSupply(f.host, 35);
  } finally {
    await f.host.close({ save: false });
  }
});

test('accepted rack and each young-growth stage survive durable restart without replay production', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-stages-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const roomId = railwayRoomId('supply-stages');
  const f = await supplyFixture(dir, roomId);
  try {
    for (const stage of [32, 33, 34, 35]) {
      await f.toStage(stage);
      assertSupply(f.host, stage);
      f.host.sync.saveNow(true);
      await f.host.sync.whenDurable();
      await f.restart();
      assertSupply(f.host, stage);
    }
  } finally {
    await f.host.close({ save: false });
  }
});

test('real idle eviction and rejoin retain the accepted recovery rack and regrown source', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-supply-eviction-'));
  const roomId = railwayRoomId('supply-eviction');
  const f = await supplyFixture(dir, roomId);
  await f.toStage(35);
  assertSupply(f.host, 35);
  await f.host.close();
  const rooms = createRoomHost(
    {
      serverRooms: ['*'],
      roomIdleMs: 0,
      maxHostedRooms: 4,
      upgradesPerMin: 1000,
      allowedOrigins: ['*'],
      trustProxy: false,
      maxPlayers: 8,
      serverSaveMs: 600000,
      reconnectGraceMs: 0,
      deadMs: 100000,
      housekeepMs: 50,
      log: () => {},
    },
    f.store,
  );
  const server = createServer();
  server.on('upgrade', (request, socket, head) => rooms.upgrade(request, socket, head));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  const clients: WebSocket[] = [];
  t.after(async () => {
    for (const client of clients) client.close();
    await rooms.close({ save: false });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  });
  async function connect(sid: string) {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/room/${roomId}?self=${sid}&pid=visitor&key=supplykey000000000000&b=test`,
      ['boogle.1'],
    );
    clients.push(ws);
    let welcome = false;
    ws.onmessage = (event) => {
      welcome ||= (JSON.parse(String(event.data)) as { t: string }).t === 'welcome';
    };
    await until(() => welcome, 'supply manager welcome');
    const room = rooms.room(roomId)!;
    const world = room.world as RailwayWorldHost;
    await world.whenReady();
    assertSupply(world, 35);
    return { ws, room };
  }
  const first = await connect('supplyfirst');
  first.ws.close();
  await until(() => !rooms.room(roomId), 'supply idle eviction');
  const second = await connect('supplysecond');
  assert.notEqual(second.room, first.room, 'rejoin uses a recovered replacement authority');
  assertSupply(second.room.world as RailwayWorldHost, 35);
});
