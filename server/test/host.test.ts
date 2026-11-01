// The server host over real sockets (docs/plans/server-host.md, step 7): joining, refusals, relay, the world, saving
// and the PeerJS host-id guard. Clients are Node's global WebSocket, as a browser's would be.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.js';
import { loadHomeLand } from '../src/host/land.ts';
import { PATCH } from '../../src/sim/mushrooms.ts';

type Msg = Record<string, any>;
const FAST = { reconnectGraceMs: 200, leadHiddenMs: 300, housekeepMs: 50, log: () => {} };

async function start(env: Record<string, string> = {}, dataDir?: string) {
  dataDir ??= await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-host-'));
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: 'beach', ...env }, FAST));
  const port = await svc.listen(0);
  return { svc, dataDir, base: `ws://127.0.0.1:${port}` };
}

// pid: the player (default one per self; '' leaves it out); key: its browser's secret (default one per pid).
function connect(base: string, room: string, self: string, pid = self + 'pid', key = pid + 'key0000000000') {
  const q = (pid ? `&pid=${pid}` : '') + (key ? `&key=${key}` : '');
  const ws = new WebSocket(`${base}/room/${room}?self=${self}${q}&b=test`, ['boogle.1']);
  const msgs: Msg[] = [];
  const waiters = new Set<() => void>();
  ws.onmessage = (e) => {
    msgs.push(JSON.parse(String(e.data)));
    for (const w of waiters) w();
  };
  const closed = new Promise<number>((r) => (ws.onclose = (e) => r(e.code)));
  const c = {
    ws,
    msgs,
    closed,
    send: (m: Msg) => ws.send(JSON.stringify(m)),
    // The first message (from `from` on) that matches, within ms.
    next(pred: (m: Msg) => boolean, ms = 2000, from = 0): Promise<Msg> {
      return new Promise((resolve, reject) => {
        const check = () => {
          const m = msgs.slice(from).find(pred);
          if (!m) return;
          waiters.delete(check);
          clearTimeout(t);
          resolve(m);
        };
        const t = setTimeout(() => (waiters.delete(check), reject(new Error(`${self}: no match in ${ms} ms`))), ms);
        waiters.add(check);
        check();
      });
    },
  };
  return c;
}
const is = (t: string) => (m: Msg) => m.t === t;
const isWorld = (t: string) => (m: Msg) => m.t === 'm' && m.d?.t === t;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('join: welcome then list, presence relays with ids, left after a close, the lead moves', async () => {
  const { svc, base } = await start();
  try {
    const a = connect(base, 'beach', 'aaa');
    const w = await a.next(is('welcome'));
    assert.deepEqual([w.v, w.max, w.lead, typeof w.boot], [1, 8, 'aaa', 'string']);
    assert.deepEqual(await a.next(is('list')), { t: 'list', peers: [], last: true });
    assert.ok(a.msgs.indexOf(w) < a.msgs.findIndex(is('list')));
    a.send({ t: 'p', s: 1, d: { v: 1, x: 3 } });
    await sleep(50);
    const b = connect(base, 'beach', 'bbb');
    const list = await b.next(is('list'));
    assert.deepEqual(list.peers, [{ id: 'aaa', s: 1, d: { v: 1, x: 3 } }]);
    b.send({ t: 'p', s: 1, d: { v: 1, x: 4 } });
    assert.deepEqual(await a.next(is('p')), { t: 'p', id: 'bbb', s: 1, d: { v: 1, x: 4 } });
    a.send({ t: 'hb', at: 42 });
    assert.equal((await a.next((m) => m.t === 'hb' && m.at === 42)).at, 42);
    a.ws.close();
    assert.deepEqual(await b.next(is('lead')), { t: 'lead', id: 'bbb' });
    assert.equal((await b.next(is('left'))).id, 'aaa');
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('refusals: unhosted room, bad ids, a full room (a known id still gets in)', async () => {
  const { svc, base } = await start({ MAX_PLAYERS: '2' });
  try {
    const other = connect(base, 'other', 'aaa');
    assert.deepEqual(await other.next(is('peer')), { t: 'peer' });
    assert.equal(await other.closed, 4000);
    for (const [room, self, pid, key] of [
      ['beach', 'server'],
      ['beach', 'Bad!'],
      ['Bad!', 'aaa'],
      ['%E0%A4%A', 'aaa'], // a malformed escape: refused, not a crash of the upgrade listener
      ['beach', 'aaa', ''], // no pid
      ['beach', 'aaa', 'Bad!'],
      ['beach', 'aaa', 'aaapid', ''], // no key
      ['beach', 'aaa', 'aaapid', 'short'],
    ]) {
      const x = connect(base, room, self, pid, key);
      assert.deepEqual(await x.next(is('bad')), { t: 'bad' });
      assert.equal(await x.closed, 4400);
    }
    const a = connect(base, 'beach', 'aaa');
    const b = connect(base, 'beach', 'bbb');
    await Promise.all([a.next(is('welcome')), b.next(is('welcome'))]);
    b.ws.close();
    await b.closed;
    const c = connect(base, 'beach', 'ccc');
    assert.deepEqual(await c.next(is('full')), { t: 'full', max: 2 });
    assert.equal(await c.closed, 4008);
    const b2 = connect(base, 'beach', 'bbb');
    await b2.next(is('welcome'));
    // The same id again replaces the old socket, with no left for it.
    const b3 = connect(base, 'beach', 'bbb');
    await b3.next(is('welcome'));
    assert.equal(await b2.closed, 4009);
    await sleep(300);
    assert.ok(!a.msgs.some((m) => m.t === 'left' && m.id === 'bbb'), 'bbb came back within the grace period');
    a.ws.close();
    b3.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('one player, two tabs: the newer one wins and the older leaves at once', async () => {
  const { svc, base } = await start();
  try {
    const a = connect(base, 'beach', 'aaa', 'samepid');
    const b = connect(base, 'beach', 'bbb');
    await Promise.all([a.next(is('list')), b.next(is('list'))]);
    a.send({ t: 'p', s: 1, d: { v: 1 } });
    await b.next((m) => m.t === 'p' && m.id === 'aaa');
    const a2 = connect(base, 'beach', 'ccc', 'samepid'); // a second tab, or a reload's new session
    await a2.next(is('welcome'));
    assert.deepEqual(await a.next(is('elsewhere')), { t: 'elsewhere' });
    assert.equal(await a.closed, 4010);
    assert.equal((await b.next(is('left'), 300)).id, 'aaa', 'no grace period for the older tab');
    // A session waiting out its grace period goes too: a reload replaces it at once.
    a2.ws.close();
    await sleep(50);
    const a3 = connect(base, 'beach', 'ddd', 'samepid');
    await a3.next(is('welcome'));
    assert.equal((await b.next((m) => m.t === 'left' && m.id === 'ccc', 300)).id, 'ccc');
    // A replaced session that comes back (a socket that was reconnecting) is turned away; it never takes over.
    const back = connect(base, 'beach', 'ccc', 'samepid');
    assert.deepEqual(await back.next(is('elsewhere')), { t: 'elsewhere' });
    assert.equal(await back.closed, 4010);
    // Someone else with that pid (copied from presence) but not its key can't take the player over.
    const thief = connect(base, 'beach', 'eee', 'samepid', 'notthekey000000000');
    assert.deepEqual(await thief.next(is('taken')), { t: 'taken' });
    assert.equal(await thief.closed, 4011);
    await sleep(100);
    assert.ok(!a3.msgs.some(is('elsewhere')), 'the player keeps playing');
    a3.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('relay: messages reach the others with from; oversize and host-only types do not', async () => {
  const { svc, base } = await start();
  try {
    const a = connect(base, 'beach', 'aaa');
    const b = connect(base, 'beach', 'bbb');
    await Promise.all([a.next(is('list')), b.next(is('list'))]);
    a.send({ t: 'm', d: { t: 'honk', big: 'x'.repeat(16001) } });
    a.send({ t: 'm', d: { t: 'w:c', ht: 5 } });
    a.send({ t: 'm', d: { t: 'honk', n: 1 } });
    const got = await b.next(isWorld('honk'));
    assert.deepEqual(got, { t: 'm', from: 'aaa', d: { t: 'honk', n: 1 } });
    assert.ok(!b.msgs.some((m) => m.from === 'aaa' && m.d?.t === 'w:c'));
    a.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('world: a joiner gets the snapshot alone; an edit comes back stamped to everyone; it saves and resumes', async () => {
  const { svc, base, dataDir } = await start({ SERVER_SAVE_MS: '300' });
  const home = loadHomeLand();
  let cell = [0, 0];
  for (let i = PATCH.i0; i < PATCH.i0 + PATCH.w && !cell[0]; i++)
    for (let j = PATCH.j0; j < PATCH.j0 + PATCH.h && !cell[0]; j++) if (home.canPlantAt(i, j)) cell = [i, j];
  let saved = 0;
  try {
    const a = connect(base, 'beach', 'aaa');
    await a.next(isWorld('w:snap'));
    const b = connect(base, 'beach', 'bbb');
    const chunks: Msg[] = [];
    const first = await b.next((m) => isWorld('w:snap')(m) && m.d.to === 'bbb');
    for (let k = 0; k < first.d.n; k++)
      chunks.push((await b.next((m) => isWorld('w:snap')(m) && m.d.to === 'bbb' && m.d.k === k)).d);
    assert.ok('mushrooms' in JSON.parse(chunks.map((c) => c.s).join('')).snap.data);
    assert.equal(first.from, 'server');
    assert.ok(!a.msgs.some((m) => m.d?.t === 'w:snap' && m.d.to === 'bbb'));

    a.send({ t: 'm', d: { t: 'w:edit', e: { op: 'mush.plant', i: cell[0], j: cell[1] } } });
    const stamped = (m: Msg) =>
      isWorld('w:edits')(m) &&
      m.d.list.some((x: Msg) => x.e.op === 'mush.plant' && x.e.p === 'aaa' && x.e.u === 'aaapid');
    await Promise.all([a.next(stamped), b.next(stamped)]);
    await sleep(700);
    const doc = JSON.parse(await fs.readFile(path.join(dataDir, 'beach.json'), 'utf8'));
    assert.equal(doc.writerId, 'server');
    assert.deepEqual(doc.data.data.mushrooms.p.slice(0, 2), cell); // { v: 2, p: [i, j, g, ...] }

    const closedA = a.closed;
    await svc.close({ save: true });
    assert.ok(a.msgs.some(is('bye')));
    assert.equal(await closedA, 1012);
    saved = JSON.parse(await fs.readFile(path.join(dataDir, 'beach.json'), 'utf8')).tick;
  } catch (e) {
    await svc.close({ save: false });
    throw e;
  }
  const again = await start({}, dataDir);
  try {
    const world = again.svc.roomHost()!.room('beach')!.world;
    await sleep(20);
    assert.ok(world.sync.world.tick >= saved, `resumed at ${world.sync.world.tick}, saved ${saved}`);
    assert.equal(world.rules.mushrooms.garden.plots.length, 1);
  } finally {
    await again.svc.close({ save: false });
  }
});

test('SERVER_ROOMS=*: a room loads on its first join, unloads with a save when idle, reloads, and loaded rooms are capped', async () => {
  const { svc, base, dataDir } = await start({ SERVER_ROOMS: '*', ROOM_IDLE_MS: '300', MAX_HOSTED_ROOMS: '2' });
  const http = base.replace('ws', 'http');
  try {
    const host = svc.roomHost()!;
    assert.equal(host.rooms(), 0);
    const st = await (await fetch(`${http}/rooms/any-room/host`)).json();
    assert.deepEqual([st.mode, st.players, st.max], ['server', 0, 8]);
    const a = connect(base, 'one', 'aaa');
    await a.next(is('welcome'));
    const b = connect(base, 'two', 'bbb');
    await b.next(is('welcome'));
    assert.equal(host.rooms(), 2);
    const c = connect(base, 'three', 'ccc');
    assert.deepEqual(await c.next(is('full')), { t: 'full', max: 8, rooms: true });
    assert.equal(await c.closed, 4008);

    const tick = host.room('one')!.world.sync.world.tick;
    a.ws.close();
    // grace (200 ms) + idle (300 ms) + the 1 s sweep
    for (let k = 0; k < 40 && host.room('one'); k++) await sleep(100);
    assert.equal(host.room('one'), undefined, 'the idle room unloaded');
    const saved = JSON.parse(await fs.readFile(path.join(dataDir, 'one.json'), 'utf8'));
    assert.ok(saved.tick >= tick && saved.writerId === 'server');

    const a2 = connect(base, 'one', 'aaa');
    await a2.next(is('welcome'));
    assert.ok(host.room('one')!.world.sync.world.tick >= saved.tick, 'reloaded from its save');
    a2.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});
