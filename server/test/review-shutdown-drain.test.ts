// Review of fix/shutdown-drain (11 November, review/shutdown-drain). Each test states a defect found in review and
// fails while it stands.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createStore, type Store } from '../src/store.ts';
import { createRoomHost } from '../src/host/rooms.ts';
import { createService, loadConfig } from '../src/server.ts';

type Obj = Record<string, unknown>;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, label: string, ms = 4000) {
  const end = performance.now() + ms;
  while (!predicate()) {
    if (performance.now() > end) throw new Error(`timeout: ${label}`);
    await sleep(5);
  }
}
function connect(base: string, room: string, sid: string) {
  const ws = new WebSocket(`${base}/room/${room}?self=${sid}&pid=alice&key=alicekey000000000000&b=test`, ['boogle.1']);
  const messages: Obj[] = [];
  ws.onmessage = (e) => messages.push(JSON.parse(String(e.data)) as Obj);
  // Like src/net/ws-room.ts, this client does not close on `bye`: it waits for the server's close.
  return {
    ws,
    messages,
    welcome: () =>
      until(
        () => messages.some((m) => m.t === 'welcome'),
        `${sid} welcome: ${JSON.stringify(messages.map((m) => m.t))}`,
      ),
  };
}
const outcomeOf = (p: Promise<void>) =>
  p.then(
    () => ({ outcome: 'resolved', error: undefined as unknown }),
    (error: unknown) => ({ outcome: 'reported', error }),
  );

// P1 (fixed in 5dfe9e807): index.ts's hard exit (now 9000 ms) must not beat the per-room report. A room whose save hangs
// never closes its players' sockets itself (hosted-room.ts closes them after world.close settles), and the client waits
// for the server's close, so before the fix server.ts's HTTP close waited its full 5 s force and the report reached
// index.ts at about 12.5 s. The bound is the real budget (rooms 7.5 s + HTTP force 1 s, under 9 s), not a tighter one.
const HARD_EXIT_MS = 9000; // index.ts
test('a stalled write with a player connected is reported to index.ts before its hard exit', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-review-drain-'));
  const id = 'review-stall-svc';
  const realWrite = fs.writeFile;
  let stall = false;
  const parked: (() => void)[] = [];
  // The store writes through this same module object (store.ts: fs.writeFile), so a write of this room hangs as one on a
  // stalled disk would.
  (fs as { writeFile: unknown }).writeFile = (file: unknown, ...rest: unknown[]) => {
    if (stall && String(file).includes(id)) return new Promise<void>((go) => parked.push(go));
    return (realWrite as (...a: unknown[]) => Promise<void>)(file, ...rest);
  };
  t.after(async () => {
    (fs as { writeFile: unknown }).writeFile = realWrite;
    for (const go of parked) go();
    await sleep(200);
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const logs: string[] = [];
  let detailAt = Infinity; // when the room host's error, naming the room, reached the log
  const cfg = loadConfig(
    { DATA_DIR: dataDir, SERVER_ROOMS: '*', PORT: '0' },
    {
      log: (...a: unknown[]) => {
        const line = a.map(String).join(' ');
        logs.push(line);
        if (line.includes('rooms failed to close') && line.includes(id))
          detailAt = Math.min(detailAt, performance.now());
      },
    },
  );
  const svc = createService(cfg);
  const port = await svc.listen(0);
  const c = connect(`ws://127.0.0.1:${port}`, id, 'first');
  t.after(() => c.ws.close());
  await c.welcome();
  stall = true;
  const start = performance.now();
  const { outcome } = await outcomeOf(svc.close({ save: true }));
  const reportedAt = performance.now() - start;
  assert.equal(outcome, 'reported');
  assert.ok(
    detailAt - start < HARD_EXIT_MS,
    `the room's detail reached the log after ${Math.round(detailAt - start)} ms (hard exit at ${HARD_EXIT_MS} ms)`,
  );
  assert.ok(
    reportedAt < HARD_EXIT_MS,
    `the report reached index.ts after ${Math.round(reportedAt)} ms; its hard exit fires at ${HARD_EXIT_MS} ms`,
  );
});

// P3: the deadline's error names every room in the snapshot, including ones whose writes already landed, so the
// report cannot say which room still had a write queued.
test('the deadline names only the rooms whose writes are still queued', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-review-drain-'));
  const base = createStore({ dataDir, maxRooms: 8 });
  await base.init();
  const gates = new Map<string, () => void>();
  let stall = false;
  const store: Store = {
    ...base,
    write(rid, ...rest) {
      if (stall) void base.withLock(rid, () => new Promise<void>((go) => gates.set(rid, go)));
      return base.write(rid, ...rest);
    },
  };
  const logs: string[] = [];
  const quick = 'review-lands';
  const stuck = 'review-stuck';
  const rooms = createRoomHost(
    {
      serverRooms: ['*'],
      roomIdleMs: 100000,
      maxHostedRooms: 8,
      roomCloseMs: 600,
      upgradesPerMin: 1000,
      allowedOrigins: ['*'],
      trustProxy: false,
      maxPlayers: 8,
      serverSaveMs: 600000,
      reconnectGraceMs: 0,
      deadMs: 100000,
      housekeepMs: 50,
      log: (...args) => {
        const line = args.map(String).join(' ');
        logs.push(line);
        // The quick room's disk answers the moment its close is fenced.
        if (line.includes(`room ${quick}: close failed`)) gates.get(quick)?.();
      },
    },
    store,
  );
  const server = createServer();
  server.on('upgrade', (req, socket, head) => rooms.upgrade(req, socket, head));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const clients = [quick, stuck].map((r) =>
    connect(`ws://127.0.0.1:${address.port}`, r, r === quick ? 'first' : 'second'),
  );
  t.after(async () => {
    for (const c of clients) c.ws.close();
    for (const go of gates.values()) go();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const r of [quick, stuck]) await base.withLock(r, async () => {});
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  for (const c of clients) await c.welcome();
  stall = true;
  for (const r of [quick, stuck]) rooms.room(r)!.world.sync.saveNow(true);
  stall = false;
  let quickLanded = false;
  void base.withLock(quick, async () => void (quickLanded = true));
  const { outcome, error } = await outcomeOf(rooms.close({ save: false }));
  assert.equal(outcome, 'reported');
  assert.equal(quickLanded, true, 'the quick room drained before the deadline');
  const late = (error as AggregateError).errors.map(String).find((e) => e.includes('writes still queued'));
  assert.ok(late, 'a deadline error');
  assert.ok(late.includes(stuck), late);
  assert.ok(!late.includes(quick), `names ${quick}, whose write landed: ${late}`);
});

// P3: a restore that began before the shutdown is `closing` through offline(), but its own write is queued only after
// its backup copy; the shutdown's drain, queued at the snapshot, can settle first and index.ts exits 0 mid-restore.
test('shutdown waits for a restore that offline() is still running', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-review-drain-'));
  const store = createStore({ dataDir, maxRooms: 8 });
  await store.init();
  const id = 'review-restore';
  await store.write(id, { tick: 1, writerId: 'x', data: {}, updatedAt: new Date().toISOString() });
  const rooms = createRoomHost(
    {
      serverRooms: ['*'],
      roomIdleMs: 100000,
      maxHostedRooms: 8,
      roomCloseMs: 600,
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
    store,
  );
  let wrote = false;
  const restoring = rooms.offline(id, async () => {
    await sleep(50); // admin.ts restore: keep(id) copies a backup before the write
    await store.write(id, { tick: 2, writerId: 'x', data: {}, updatedAt: new Date().toISOString() });
    wrote = true;
    return {};
  });
  t.after(async () => {
    await restoring;
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  await sleep(0);
  const { outcome } = await outcomeOf(rooms.close({ save: true }));
  assert.equal(wrote, true, `shutdown ${outcome} while offline()'s restore had not written`);
});
