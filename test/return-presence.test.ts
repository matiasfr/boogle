// A recent return's pose hold and blocked storage, from the independent review's probes (14 November): this tab's
// real presence builder (src/netplay/net.ts, run from source with a fake clock) publishes no pose while the return is
// pending, and nothing about the return record throws where the browser blocks storage.
import fs from 'node:fs';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from '../dev/level/source.ts';
import * as fields from '../src/netplay/presence-fields.ts';
import { createSnaps } from '../src/netplay/snaps.ts';
import { returnKey, storedReturn, writeReturn } from '../src/place/return-settle.ts';
import { localStore, readReturnMinutes } from '../src/place/return-tuning.ts';

type Packet = { v: number; p: number[] | null; n: string | null; c: number | null; r: number | null; s: number | null };
type Net = {
  setLocalPresence(local: unknown): void;
  holdPresencePose(fn: () => boolean): void;
  sendPresence(): void;
  net: { room: unknown };
  upsertPeer(peer: { peer: string; presence: unknown }): void;
  remotes: Map<string, { entered: boolean }>;
};
type Settle = { source(fn: () => boolean): void; pending(now?: number): boolean; done(): void };
// Repo-rooted literals, so the test selection's walk follows them (dev/ci/unit-select.ts).
const SETTLE = fs.readFileSync('src/place/return-settle.ts', 'utf8');
const NET = fs.readFileSync('src/netplay/net.ts', 'utf8');
const ARRIVAL = fs.readFileSync('src/entities/railway/arrival.ts', 'utf8');
const COVER = fs.readFileSync('src/features/return-cover.ts', 'utf8');

function tab() {
  let now = 0;
  const document = { hidden: false, addEventListener() {} };
  const performance = { now: () => now };
  const settle = sourceModule<{ returnSettle: Settle }>(SETTLE, { performance }).returnSettle;
  const net = sourceModule<Net>(
    NET.replaceAll('import.meta.env', '{}'),
    {
      performance,
      document,
      onFrame() {},
      ...fields,
      createSnaps,
      r2: (x: number) => Math.round(x * 100) / 100,
      finiteArr: (p: unknown, n: number) => Array.isArray(p) && p.length === n && p.every(Number.isFinite),
      sanitizeName: (x: unknown) => (typeof x === 'string' ? x : ''),
      DEFAULT_NAME: 'Buddy',
      COLORS: ['red', 'blue'],
    },
    ['setLocalPresence', 'holdPresencePose', 'sendPresence', 'net', 'upsertPeer', 'remotes'],
  );
  const packets: Packet[] = [];
  net.net.room = {
    presence(p: Packet) {
      packets.push(structuredClone(p));
      return Promise.resolve();
    },
  };
  const local = {
    entered: false,
    name: 'A',
    colorIdx: 1,
    body: { position: { x: 929, y: 20, z: 4 } },
    yaw: 1,
    swimming: false,
    coyote: 1,
  };
  net.setLocalPresence(local);
  settle.source(() => true);
  net.holdPresencePose(() => settle.pending());
  return { net, settle, local, packets, document, time: (t: number) => void (now = t) };
}

test('the hold keeps the pose unpublished before and after entry; the first pose sent is the return spot', () => {
  const a = tab();
  a.net.sendPresence();
  a.local.entered = true;
  a.time(1);
  a.net.sendPresence();
  for (const p of a.packets) for (const key of ['p', 'n', 'c', 'r', 's'] as const) assert.equal(p[key], null);
  a.local.body.position = { x: -84.3, y: 4.35, z: -1980.3 };
  a.settle.done();
  a.time(200);
  a.net.sendPresence();
  assert.deepEqual(a.packets.at(-1)!.p, [-84.3, 4.35, -1980.3]);
  assert.equal(a.packets.at(-1)!.n, 'A');
});
test('a peer drops the old pose during the hold and is given only the final one', () => {
  const a = tab();
  a.local.entered = true;
  a.net.upsertPeer({ peer: 'A', presence: { v: 1, t: 0, p: [929, 20, 4], n: 'A' } });
  a.time(1);
  a.net.sendPresence();
  a.net.upsertPeer({ peer: 'A', presence: a.packets.at(-1) });
  assert.equal(a.net.remotes.get('A')!.entered, false);
  a.local.body.position = { x: 1000, y: 12, z: 100 };
  a.settle.done();
  a.time(200);
  a.net.sendPresence();
  a.net.upsertPeer({ peer: 'A', presence: a.packets.at(-1) });
  assert.equal(a.net.remotes.get('A')!.entered, true);
});
test('a hidden tab or an arrival that never comes cannot keep the pose held past 20 seconds', () => {
  const a = tab();
  a.local.entered = true;
  a.net.sendPresence();
  a.document.hidden = true;
  a.time(10000);
  a.net.sendPresence();
  assert.equal(a.packets.at(-1)!.v, 0);
  assert.equal(a.packets.at(-1)!.p, null);
  a.time(20001);
  a.net.sendPresence();
  assert.ok(a.packets.at(-1)!.p);
  assert.equal(a.packets.at(-1)!.v, 0);
});
test('a return that ends at Home releases the same hold', () => {
  const a = tab();
  a.local.entered = true;
  a.net.sendPresence();
  a.settle.done();
  a.time(600);
  a.net.sendPresence();
  assert.deepEqual(a.packets.at(-1)!.p, [929, 20, 4]);
});

/** Runs `fn` in a browser whose policy blocks storage: reading the global itself throws. */
function blockedStorage(fn: () => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Blocked storage', 'SecurityError');
    },
  });
  try {
    fn();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  }
}
const key = returnKey('room', 'pid');
test('blocked storage reads as no record, skips the save in silence and never holds the cover', () => {
  blockedStorage(() => {
    assert.throws(() => localStorage, 'the fixture blocks the global');
    assert.equal(localStore(), null);
    assert.deepEqual(storedReturn(localStore(), key, 1000), { spot: null, had: false });
    assert.equal(readReturnMinutes(localStore()), 30);
    assert.equal(writeReturn(key, { x: 1, y: 2, z: 3, yaw: 0, at: 1000 }), false);
    // The boot-time reader (src/features/return-cover.ts): even one that throws leaves nothing pending.
    const settle = sourceModule<{ returnSettle: Settle }>(SETTLE, { performance: { now: () => 0 } }).returnSettle;
    settle.source(() => !!storedReturn(localStorage, key, 1000).spot);
    assert.equal(settle.pending(0), false);
  });
  const full = {
    setItem() {
      throw new DOMException('Full', 'QuotaExceededError');
    },
  };
  assert.equal(writeReturn(key, { x: 1, y: 2, z: 3, yaw: 0, at: 1000 }, full), false);
});
test("the arrival's own record reader and writer run with storage blocked", () => {
  // The exact source of arrival.ts's reader and writer, not an imitation of their guards.
  const source = ARRIVAL;
  const from = source.indexOf('const readSavedPose ='),
    to = source.indexOf('let savedPose = readSavedPose();', from);
  assert.ok(from > 0 && to > from);
  const reader = sourceModule<{ readSavedPose(): unknown }>(
    'let hadRecord = false;' + source.slice(from, to),
    { storedReturn, localStore, poseKey: key, Date },
    ['readSavedPose'],
  );
  assert.ok(/if \(!writeReturn\(poseKey, savedPose\)\) return;/.test(source), 'saves go through the guarded writer');
  assert.ok(!/\blocalStorage\b/.test(source.replace(/\/\/.*$/gm, '')), 'arrival.ts never names the global');
  blockedStorage(() => {
    assert.doesNotThrow(() => reader.readSavedPose());
    assert.equal(reader.readSavedPose(), null);
  });
  assert.ok(!/\blocalStorage\b/.test(COVER.replace(/\/\/.*$/gm, '')), 'return-cover.ts never names the global');
});

test('reload returns in place over two real sockets: the watcher is never sent a Home pose', async () => {
  const { createService, loadConfig } = await import('../server/src/server.ts');
  const { railwayRoomId } = await import('../src/world/railway-namespace.ts');
  const { sourceFunction } = await import('../dev/level/source.ts');
  const { readReturnSpot, createReturnSearch, haltLandings } = await import('../src/place/return-spot.ts');
  type Msg = { t: string; id?: string; d: { p?: unknown } };
  type Socket = {
    ws: { close(): void };
    closed: Promise<unknown>;
    msgs: Msg[];
    send(m: unknown): void;
    next(match: (m: Msg) => boolean): Promise<Msg>;
  };
  const connect = sourceFunction<(base: string, room: string, id: string, pid?: string) => Socket>(
    'server/test/host.test.ts',
    'connect',
    {},
  );
  const dataDir = fs.mkdtempSync(`${os.tmpdir()}/boogle-return-`);
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log() {} }));
  const port = await svc.listen(0),
    base = `ws://127.0.0.1:${port}`,
    room = railwayRoomId('return-review');
  const sockets: Socket[] = [];
  const posed = (m: Msg): m is Msg & { d: { p: number[] } } => m.t === 'p' && m.id === 'after' && Array.isArray(m.d.p);
  try {
    const b = connect(base, room, 'watcher');
    sockets.push(b);
    await b.next((m) => m.t === 'welcome');
    const a = connect(base, room, 'before', 'sameplayer');
    sockets.push(a);
    await a.next((m) => m.t === 'welcome');
    const spot = { x: -84.31939, y: 3.9, z: -1980.308825, yaw: 0.7, at: 1000 };
    a.send({ t: 'p', s: 1, d: { p: [spot.x, spot.y + 0.45, spot.z], v: 1, t: 1 } });
    await b.next((m) => m.t === 'p' && m.id === 'before');
    a.ws.close();
    await a.closed;
    const rejoined = connect(base, room, 'after', 'sameplayer');
    sockets.push(rejoined);
    await rejoined.next((m) => m.t === 'welcome');
    const tabA = tab();
    tabA.local.entered = true;
    let seq = 0;
    tabA.net.net.room = {
      presence(p: Packet) {
        rejoined.send({ t: 'p', s: ++seq, d: structuredClone(p) });
        return Promise.resolve();
      },
    };
    const start = b.msgs.length;
    tabA.net.sendPresence(); // entered at the spawn, the return still pending
    await b.next((m) => m.t === 'p' && m.id === 'after');
    const search = createReturnSearch(readReturnSpot(structuredClone(spot), 2000, 1800000), haltLandings());
    const probes = { settled: () => true, standable: () => true, near: () => null };
    search.step(0, probes);
    const landed = search.step(0.02, probes);
    assert.equal(landed.kind, 'land');
    if (landed.kind !== 'land') return;
    tabA.local.body.position = { ...landed.at, y: landed.at.y + 0.45 };
    tabA.time(200);
    tabA.settle.done();
    tabA.net.sendPresence();
    const first = await b.next(posed);
    assert.ok(posed(first) && Math.hypot(first.d.p[0]! - spot.x, first.d.p[2]! - spot.z) < 2);
    assert.ok(!b.msgs.slice(start).some((m) => posed(m) && Math.hypot(m.d.p[0]! - 929, m.d.p[2]! - 4) < 30));
  } finally {
    for (const s of sockets) s.ws.close();
    await svc.close({ save: false });
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
