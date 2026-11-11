// A room's close always ends (server/src/host/rooms.ts, closeRoom): a close that fails or overruns is fenced and leaves
// `closing` once every write it queued has landed, so the next join loads the room again from its file instead of being
// refused with `bye restart` until the process restarts (the live `smoke-node-2` lockout, 10 November).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createStore, type Store } from '../src/store.ts';
import { createRoomHost } from '../src/host/rooms.ts';
import type { RailwayWorldHost } from '../src/host/world-host.ts';
import { CLOSE } from '../../src/net/ws-wire.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

type Obj = Record<string, unknown>;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, label: string, ms = 4000) {
  const end = performance.now() + ms;
  while (!predicate()) {
    if (performance.now() > end) throw new Error(`timeout: ${label}`);
    await sleep(5);
  }
}
// Bound an awaited event: a lost event fails the test with the wait's name instead of hanging the run (the suite runs
// with --test-timeout=0).
const WAIT_MS = 5000;
async function within<T>(wait: Promise<T>, label: string, state: () => string, ms = WAIT_MS): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms waiting for ${label} (${state()})`)), ms);
  });
  try {
    return await Promise.race([wait, limit]);
  } finally {
    clearTimeout(timer);
  }
}
function connect(base: string, room: string, sid: string) {
  const ws = new WebSocket(`${base}/room/${room}?self=${sid}&pid=alice&key=alicekey000000000000&b=test`, ['boogle.1']);
  const messages: Obj[] = [];
  ws.onmessage = (e) => messages.push(JSON.parse(String(e.data)) as Obj);
  const closed = new Promise<number>((resolve) => {
    ws.onclose = (e) => resolve(e.code);
  });
  // The listener is attached at construction, so a close that fires before anyone awaits is still seen.
  const closedWithin = (label: string) =>
    within(closed, `${sid} close: ${label}`, () => `readyState ${ws.readyState}, messages ${messages.length}`);
  const first = async () => {
    await until(() => messages.length > 0, `${sid} first message`);
    return messages[0]!;
  };
  return { ws, closedWithin, first };
}
async function manager(store: Store, t: test.TestContext, tmp: Tmp) {
  const logs: string[] = [];
  const rooms = createRoomHost(
    {
      serverRooms: ['*'],
      roomIdleMs: 0,
      roomCloseMs: 600,
      maxHostedRooms: 8,
      upgradesPerMin: 1000,
      allowedOrigins: ['*'],
      trustProxy: false,
      maxPlayers: 8,
      serverSaveMs: 600000,
      reconnectGraceMs: 0,
      deadMs: 100000,
      housekeepMs: 50,
      log: (...args) => logs.push(args.map(String).join(' ')),
    },
    store,
  );
  const server = createServer();
  server.on('upgrade', (req, socket, head) => rooms.upgrade(req, socket, head));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const sockets: WebSocket[] = [];
  t.after(async () => {
    for (const ws of sockets) ws.close();
    await Promise.race([rooms.close({ save: false }).catch(() => {}), sleep(2000)]);
    await within(
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
      'the test server to close',
      () => 'teardown',
    );
    // Only now, with every authority closed: t.after hooks run in the order they were added, so a removal registered
    // by tmpStore (before this hook) ran while the last authority was still open and writing checkpoints.
    await tmp.remove();
  });
  const base = `ws://127.0.0.1:${address.port}`;
  return {
    rooms,
    logs,
    join(room: string, sid: string) {
      const c = connect(base, room, sid);
      sockets.push(c.ws);
      return c;
    },
  };
}
type Tmp = Awaited<ReturnType<typeof tmpStore>>;
// The removal is the manager's last teardown step (after rooms.close), and it first drains the store's lock of every
// room written: a shutdown resolves while a fenced room's queued write is still pending (see the todo test below), and
// that write's temp file landing as rm walked the directory was the ENOTEMPTY seen under load.
async function tmpStore() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-room-close-'));
  const base = createStore({ dataDir, maxRooms: 8 });
  const written = new Set<string>();
  const { write, create } = base;
  base.write = (id, ...rest) => (written.add(id), write.call(base, id, ...rest));
  base.create = (id, ...rest) => (written.add(id), create.call(base, id, ...rest));
  const remove = async () => {
    await within(
      Promise.all([...written].map((id) => base.withLock(id, async () => {}))),
      'every queued store write to land',
      () => [...written].join(', '),
    );
    await fs.rm(dataDir, { recursive: true, force: true });
  };
  return { dataDir, base, remove };
}

test('a room whose save did not load cleanly can be joined again after its idle close', async (t) => {
  const tmp = await tmpStore();
  const { dataDir, base } = tmp;
  // An unloadable save (a reshaped state, a corrupt file): the room loads a fresh fallback that is never saved, so its
  // close with save rejects. That rejection used to fence the room in `closing` for the life of the process.
  const id = 'smoke-node-2';
  const file = path.join(dataDir, `${id}.json`);
  const original = JSON.stringify({ tick: 5, writerId: 'server', data: 'not a snapshot', updatedAt: 'fixture' });
  await fs.writeFile(file, original);
  await base.init();
  const app = await manager(base, t, tmp);
  const a = app.join(id, 'first');
  assert.equal((await a.first()).t, 'welcome');
  const room = app.rooms.room(id)!;
  assert.equal(room.status().noSave, true, 'the fallback is marked no-save');
  a.ws.close();
  await a.closedWithin('idle close of the only player');
  await until(() => app.logs.some((l) => l.includes(`room ${id}: close `)), 'close failure reported');
  const b = app.join(id, 'second');
  assert.equal((await b.first()).t, 'welcome', 'the next join loads the room again');
  assert.notEqual(app.rooms.room(id), room, 'from a new authority');
  assert.equal(app.rooms.room(id)!.status().noSave, true, 'which still never saves over the unloadable file');
  assert.equal(await fs.readFile(file, 'utf8'), original, 'the save is untouched');
});

test('a close whose save stalls times out, fences the old writer and reopens once the save lands', async (t) => {
  const tmp = await tmpStore();
  const { base } = tmp;
  await base.init();
  // While `hang` is set, each write waits inside the store's per-room lock behind a gate, as a write mid-writeFile on
  // a disk that stops answering would, until release().
  let hang = true;
  const held: (() => void)[] = [];
  let writes = 0;
  const store: Store = {
    ...base,
    write(rid, ...rest) {
      writes++;
      if (hang) void base.withLock(rid, () => new Promise<void>((go) => held.push(go)));
      return base.write(rid, ...rest);
    },
  };
  const release = () => {
    hang = false;
    for (const go of held.splice(0)) go();
  };
  const app = await manager(store, t, tmp);
  // A railway room's close first awaits its startup checkpoint, then saves: a close that outlives its timeout could
  // still write afterwards, which is what the fence stops.
  const id = railwayRoomId('close-hang');
  const a = app.join(id, 'first');
  assert.equal((await a.first()).t, 'welcome');
  const room = app.rooms.room(id)!;
  let closeStarted = false;
  let closeSettled = false;
  const close = room.close;
  room.close = (o) => {
    closeStarted = true;
    return close(o).finally(() => (closeSettled = true));
  };
  await until(() => writes > 0, 'the startup checkpoint is writing');
  a.ws.close();
  await a.closedWithin('idle close of the only player');
  await until(() => closeStarted, 'the idle close is draining');
  const during = app.join(id, 'during');
  assert.equal((await during.first()).t, 'bye', 'a join racing the close is refused');
  assert.equal(await during.closedWithin('refused join'), CLOSE.RESTART);
  await until(() => app.logs.some((l) => l.includes(`room ${id}: close failed`) && l.includes('timed out')), 'timeout');
  // Its stalled write is still queued: the room stays closing until that lands, or the next authority would load an
  // older file and later save it back over the old authority's write.
  const stalled = app.join(id, 'stalled');
  assert.equal((await stalled.first()).t, 'bye', 'a join while its write is queued is refused');
  assert.equal(await stalled.closedWithin('refused join'), CLOSE.RESTART);
  assert.equal(app.rooms.room(id), room, 'the slot is held until the queued write lands');
  // The filesystem answers again: the queued write lands, the old close resumes, and its next save is refused.
  const before = writes;
  release();
  await until(() => closeSettled, 'the old close ran on');
  await until(() => app.rooms.room(id) !== room, 'the slot is freed once the queue has drained');
  assert.equal(writes, before, 'the fenced authority writes nothing more');
  assert.ok((room.world as RailwayWorldHost).status().recoveryError, 'its refused save stops it');
  const b = app.join(id, 'second');
  assert.equal((await b.first()).t, 'welcome', 'the next join loads the room again');
  assert.notEqual(app.rooms.room(id), room, 'from a new authority');
});

// From the independent review (10 November): a close that timed out with its last save stalled inside the store's
// per-room lock freed the slot at once. The next authority loaded the older file (store.readSync does not wait on
// the lock), the old save landed on top, and the new authority's next save wrote its older state back over it.
test('a join after a timed-out close never loads a file the old authority is still writing', async (t) => {
  const tmp = await tmpStore();
  const { base } = tmp;
  await base.init();
  const id = 'stale-load';
  let release = () => {};
  let stall = false;
  const store: Store = {
    ...base,
    write(rid, ...rest) {
      if (stall) void base.withLock(rid, () => new Promise<void>((go) => (release = go)));
      return base.write(rid, ...rest);
    },
  };
  const app = await manager(store, t, tmp);
  const a = app.join(id, 'first');
  assert.equal((await a.first()).t, 'welcome');
  const room = app.rooms.room(id)!;
  room.world.sync.saveNow(true);
  await until(() => base.readSync(id) !== null, 'a first good save');
  await base.withLock(id, async () => {});
  const t0 = base.readSync(id)!.tick;
  room.world.step(60); // a minute of play on the old authority
  const t1 = room.world.sync.world.tick;
  assert.ok(t1 > t0, `${t1} > ${t0}`);
  stall = true;
  a.ws.close();
  await a.closedWithin('idle close of the only player');
  await until(() => app.logs.some((l) => l.includes(`room ${id}: close failed`)), 'the close times out');
  stall = false;
  const early = app.join(id, 'early');
  assert.equal((await early.first()).t, 'bye', 'refused while the old save is queued');
  assert.equal(await early.closedWithin('refused join'), CLOSE.RESTART);
  release(); // the disk answers: the old authority's queued last save lands
  await until(() => app.rooms.room(id) !== room, 'the slot is freed once it has');
  const b = app.join(id, 'second');
  assert.equal((await b.first()).t, 'welcome');
  const next = app.rooms.room(id)!;
  const loaded = next.world.sync.world.tick;
  next.world.sync.saveNow(true);
  await base.withLock(id, async () => {});
  const after = base.readSync(id)!.tick;
  assert.ok(loaded >= t1 && after >= t1, `old play to tick ${t1}; loaded tick ${loaded}; saved back tick ${after}`);
});

test('shutdown with a save that never settles is bounded and reports the failure', async (t) => {
  const tmp = await tmpStore();
  const { base } = tmp;
  await base.init();
  let hang = false;
  const store: Store = {
    ...base,
    write(...args) {
      return hang ? new Promise(() => {}) : base.write(...args);
    },
  };
  const app = await manager(store, t, tmp);
  const a = app.join('shutdown-hang', 'first');
  assert.equal((await a.first()).t, 'welcome');
  hang = true;
  const outcome = await Promise.race([
    app.rooms.close({ save: true }).then(
      () => 'resolved',
      (error: unknown) => (error instanceof AggregateError ? 'reported' : String(error)),
    ),
    sleep(3000).then(() => 'hung'),
  ]);
  assert.equal(outcome, 'reported');
});

// Review (11 November, review/room-close-queued-write): rooms.close (shutdown) awaits only each room's bounded close,
// never the drain an idle close or offline() waits for (rooms.ts closeRoom: "Shutdown waits only for the bounded
// close"). A room whose close overruns is fenced, yet the write it queued before the fence stays in the store's per-room
// lock and lands after the shutdown has settled; with save: false the shutdown even resolves as a success. No join can
// load the room meanwhile (stopping refuses every upgrade) and index.ts exits right after, so in production that write
// is cut off instead (the file stays the old one, renames being atomic; a .tmp can be left). todo until rooms.close
// drains as well.
for (const save of [false, true]) {
  test(
    `shutdown (save ${save}) settles only after every write its rooms queued has landed`,
    { todo: true },
    async (t) => {
      const tmp = await tmpStore();
      const { base } = tmp;
      await base.init();
      const id = `shutdown-queued-${save}`;
      let release = () => {};
      let stall = false;
      const store: Store = {
        ...base,
        write(rid, ...rest) {
          // The write waits inside the store's per-room lock behind a gate, as one mid-writeFile on a stalled disk would.
          if (stall) void base.withLock(rid, () => new Promise<void>((go) => (release = go)));
          return base.write(rid, ...rest);
        },
      };
      t.after(() => release()); // runs before the manager's teardown drains the lock (hooks run in the order added)
      const app = await manager(store, t, tmp);
      const a = app.join(id, 'first');
      assert.equal((await a.first()).t, 'welcome');
      const room = app.rooms.room(id)!;
      stall = true;
      room.world.sync.saveNow(true); // the room's write, queued behind the gate before the shutdown begins
      stall = false;
      let landed = false;
      void base.withLock(id, async () => void (landed = true)); // runs once every write queued before it has settled
      const outcome = await app.rooms.close({ save }).then(
        () => 'resolved',
        (error: unknown) => (error instanceof AggregateError ? 'reported' : String(error)),
      );
      assert.ok(
        app.logs.some((l) => l.includes(`room ${id}: close failed`)),
        'the close overran and fenced its writer',
      );
      assert.equal(landed, true, `shutdown ${outcome} while the room's queued write had not landed`);
    },
  );
}
