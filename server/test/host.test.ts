// The server host over real sockets (docs/plans/server-host.md, step 7): joining, refusals, relay, the world, saving
// and the PeerJS host-id guard. Clients are Node's global WebSocket, as a browser's would be.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import { worldRoomId } from '../../src/world/namespace.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { HALF } from '../../src/world/grid.ts';

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

for (const disconnected of [false, true]) {
  for (const changed of ['pid', 'key'] as const) {
    test(`a ${disconnected ? 'grace' : 'live'} session id cannot replace its bound ${changed}`, async () => {
      const { svc, base } = await start();
      const self = 'victimsession';
      const original = connect(base, 'beach', self, 'victimpid');
      try {
        await original.next(is('welcome'));
        if (disconnected) {
          original.ws.close();
          await original.closed;
        }
        const intruder = connect(
          base,
          'beach',
          self,
          changed === 'pid' ? 'anotherpid' : 'victimpid',
          changed === 'key' ? 'differentkey0000000000' : 'victimpidkey0000000000',
        );
        try {
          const reply = await intruder.next((m) => m.t === 'welcome' || m.t === 'taken');
          assert.equal(reply.t, 'taken', 'reusing the public session id must preserve its bound player and secret');
          assert.equal(await intruder.closed, 4011);
          if (!disconnected) assert.equal(original.ws.readyState, WebSocket.OPEN);
          const rejoined = connect(base, 'beach', self, 'victimpid');
          try {
            await rejoined.next(is('welcome'));
          } finally {
            rejoined.ws.close();
          }
        } finally {
          intruder.ws.close();
        }
      } finally {
        original.ws.close();
        await svc.close({ save: false });
      }
    });
  }
}

test('classic rail-demo and production demo select distinct hosts and saves', async () => {
  const { svc, base } = await start({ SERVER_ROOMS: '*' });
  try {
    const productionRoom = railwayRoomId('demo');
    const classicRoom = worldRoomId('rail-demo');
    assert.notEqual(productionRoom, classicRoom);
    const production = connect(base, productionRoom, 'production');
    const classic = connect(base, classicRoom, 'classic');
    await Promise.all([production.next(is('welcome')), classic.next(is('welcome'))]);
    const productionHost = svc.roomHost()!.room(productionRoom)!.world;
    const classicHost = svc.roomHost()!.room(classicRoom)!.world;
    assert.notEqual(productionHost, classicHost);
    assert.ok(((productionHost.sync.snapshot().data.railway as Msg).c as Msg).beam, 'the railway saves its world');
    assert.equal(classicHost.sync.snapshot().data.railway, undefined);
    assert.ok(classicHost.sync.snapshot().data.gifts);
    assert.equal(svc.roomHost()!.rooms(), 2);
    production.ws.close();
    classic.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

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
      const x = connect(base, room!, self!, pid!, key!);
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
    a.send({ t: 'm', d: { t: 'w:rejected', to: 'bbb', op: 'tune.commit', requestId: 'forged' } });
    a.send({ t: 'm', d: { t: 'honk', n: 1 } });
    const got = await b.next(isWorld('honk'));
    assert.deepEqual(got, { t: 'm', from: 'aaa', d: { t: 'honk', n: 1 } });
    assert.ok(!b.msgs.some((m) => m.from === 'aaa' && m.d?.t === 'w:c'));
    assert.ok(!b.msgs.some((m) => m.d?.t === 'w:rejected'));
    a.send({ t: 'm', d: { t: 'w:edit', e: { op: 'tune.commit', i: 0, j: 0, requestId: 'refused' } } });
    assert.deepEqual(await a.next(isWorld('w:rejected')), {
      t: 'm',
      from: 'server',
      d: { t: 'w:rejected', to: 'aaa', op: 'tune.commit', requestId: 'refused' },
    });
    assert.ok(!b.msgs.some((m) => m.d?.t === 'w:rejected'), 'receipts are routed only to their requester');
    a.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('production railway relays bounded social cues without opening material or host-only paths', async () => {
  const { svc, base } = await start({ SERVER_ROOMS: '*' });
  try {
    const roomId = railwayRoomId('social');
    const a = connect(base, roomId, 'aaa');
    const b = connect(base, roomId, 'bbb');
    await Promise.all([a.next(is('list')), b.next(is('list'))]);
    // Main expanded the cosmetic world envelope to 4096 m for Place; stay outside that real bound.
    a.send({ t: 'm', d: { t: 'ping', x: 0, y: 0, z: 4097, k: 'look' } });
    a.send({ t: 'm', d: { t: 'honk', big: 'x'.repeat(16001) } });
    a.send({ t: 'm', d: { t: 'w:c', ht: 5 } });
    a.send({ t: 'm', d: { t: 'r:result', status: 'accepted' } });
    a.send({ t: 'm', d: { t: 'placeCoop', n: 8 } });
    a.send({ t: 'm', d: { t: 'ping', x: 1.23, y: 2.34, z: -3.45, k: 'look', material: { n: 8 } } });
    a.send({ t: 'm', d: { t: 'honk', v: 2, material: { n: 8 } } });
    assert.deepEqual(await b.next(isWorld('ping')), {
      t: 'm',
      from: 'aaa',
      d: { t: 'ping', x: 1.2, y: 2.3, z: -3.4, k: 'look' },
    });
    assert.deepEqual(await b.next(isWorld('honk')), { t: 'm', from: 'aaa', d: { t: 'honk', v: 2 } });
    assert.deepEqual(
      b.msgs.filter((m) => m.from === 'aaa').map((m) => m.d.t),
      ['ping', 'honk'],
    );
    assert.ok(!a.msgs.some((m) => m.from === 'aaa'));
    a.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('production railway relays a bag of mushrooms, clean and bounded', async () => {
  const { svc, base } = await start({ SERVER_ROOMS: '*' });
  try {
    const roomId = railwayRoomId('mush');
    const a = connect(base, roomId, 'aaa');
    const b = connect(base, roomId, 'bbb');
    await Promise.all([a.next(is('list')), b.next(is('list'))]);
    const isMush = isWorld('mush');
    for (const s of [
      [], // nothing
      [1, 2, 3], // odd
      Array.from({ length: 12 }, () => 1), // more than a bag's five spots
      [1, '2'],
      [1, null],
      [HALF, 0], // off the island
      'x'.repeat(100),
    ])
      a.send({ t: 'm', d: { t: 'mush', s } });
    a.send({ t: 'm', d: { t: 'mush' } });
    a.send({ t: 'm', d: { t: 'mush', s: [1.23, -4.56, 7, 8], material: { n: 8 } } });
    assert.deepEqual(await b.next(isMush), { t: 'm', from: 'aaa', d: { t: 'mush', s: [1.2, -4.6, 7, 8] } });
    await sleep(100);
    assert.equal(b.msgs.filter(isMush).length, 1, 'only the well-formed bag was relayed');
    assert.ok(!a.msgs.some(isMush), 'nothing echoes to the sender');
    // A flood is cut at the room's message burst, like any other game message.
    for (let i = 0; i < 300; i++) a.send({ t: 'm', d: { t: 'mush', s: [i % 50, 0] } });
    await sleep(300);
    const relayed = b.msgs.filter(isMush).length - 1;
    assert.ok(relayed >= 90 && relayed <= 130, `relayed ${relayed} of 300`);
    a.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('review: hostile mush frames never crash the room and nothing relayed is off the island', async () => {
  const { svc, base } = await start({ SERVER_ROOMS: '*' });
  try {
    const roomId = railwayRoomId('mush-hostile');
    const a = connect(base, roomId, 'aaa');
    const b = connect(base, roomId, 'bbb');
    await Promise.all([a.next(is('list')), b.next(is('list'))]);
    const isMush = isWorld('mush');
    // Raw frames JSON.stringify could not produce: Infinity, -0, huge exponents, prototype keys, array-likes.
    for (const raw of [
      '{"t":"m","d":{"t":"mush","s":[1e999,0]}}',
      '{"t":"m","d":{"t":"mush","s":[-1e999,0]}}',
      '{"t":"m","d":{"t":"mush","s":{"length":2,"0":1,"1":2}}}',
      '{"t":"m","d":{"t":"mush","s":[[1],[2]]}}',
      '{"t":"m","d":{"t":"mush","s":["1","2"]}}',
      '{"t":"m","d":{"t":"mush","s":[true,false]}}',
      '{"t":"m","d":{"t":"mush","__proto__":{"s":[1,2]}}}',
      '{"t":"m","d":{"t":"mush","s":"12"}}',
      '{"t":"m","d":{"t":"mush","s":null}}',
      '{"t":"m","d":null}',
      '{"t":"m","d":"mush"}',
      '{"t":"m","d":[{"t":"mush","s":[1,2]}]}',
    ])
      a.ws.send(raw);
    a.ws.send('{"t":"m","d":{"t":"mush","s":[-0,3],"__proto__":{"evil":1},"constructor":{"x":1}}}');
    const got = await b.next(isMush);
    assert.deepEqual(JSON.parse(JSON.stringify(got.d)), { t: 'mush', s: [0, 3] }, 'only the clean copy is relayed');
    // A value just under HALF passes the bound but rounds onto it: receivers (|v| < HALF) would reject the relay.
    a.send({ t: 'm', d: { t: 'mush', s: [HALF - 0.04, 0] } });
    a.send({ t: 'm', d: { t: 'mush', s: [-(HALF - 0.04), 0] } });
    await sleep(150);
    for (const m of b.msgs.filter(isMush))
      for (const v of m.d.s) assert.ok(Math.abs(v) < HALF, `relayed ${v} is off the island after rounding`);
    // The room is still up for everyone.
    a.send({ t: 'm', d: { t: 'mush', s: [5, 5] } });
    await b.next((m) => isMush(m) && m.d.s[0] === 5);
    a.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('voice signals go only to the tab they name, bounded, and never into the world', async () => {
  const { svc, base } = await start({ SERVER_ROOMS: '*' });
  try {
    const roomId = railwayRoomId('voice');
    const a = connect(base, roomId, 'aaa');
    const b = connect(base, roomId, 'bbb');
    const c = connect(base, roomId, 'ccc');
    await Promise.all([a.next(is('list')), b.next(is('list')), c.next(is('list'))]);
    for (const s of [a, b, c]) s.send({ t: 'p', s: 1, d: { v: 1, t: 1, vc: 1 } }); // all three pressed Join voice
    const heardFrom = (id: string) => (m: Msg) => m.t === 'p' && m.id === id;
    await Promise.all([a.next(heardFrom('bbb')), a.next(heardFrom('ccc')), b.next(heardFrom('aaa'))]);
    const isRtc = (m: Msg) => m.t === 'm' && m.d?.t === 'rtc';
    a.send({ t: 'm', d: { t: 'rtc', to: 'nobody', k: 'bye', n: 1 } }); // no such tab
    a.send({ t: 'm', d: { t: 'rtc', to: 'aaa', k: 'bye', n: 1 } }); // itself
    a.send({ t: 'm', d: { t: 'rtc', to: 'bbb', k: 'offer', n: 1, sdp: 'x'.repeat(12001) } }); // oversized sdp
    a.send({ t: 'm', d: { t: 'rtc', to: 'bbb', k: 'shout', n: 1 } }); // unknown kind
    a.send({ t: 'm', d: { t: 'rtc', to: 'server', k: 'bye', n: 1 } });
    a.send({ t: 'm', d: { t: 'rtc', to: 'bbb', k: 'offer', n: 2, sdp: 'v=0', w: { op: 'tune.set' } } });
    assert.deepEqual(await b.next(isRtc), {
      t: 'm',
      from: 'aaa',
      d: { t: 'rtc', to: 'bbb', k: 'offer', n: 2, sdp: 'v=0' },
    });
    // A flood is cut at the burst, and game messages still pass after it.
    for (let i = 0; i < 200; i++)
      a.send({
        t: 'm',
        d: { t: 'rtc', to: 'bbb', k: 'ice', n: 2, c: { candidate: 'c' + i, sdpMid: '0', sdpMLineIndex: 0 } },
      });
    a.send({ t: 'm', d: { t: 'honk', v: 1 } });
    await b.next(isWorld('honk'));
    await c.next(isWorld('honk'));
    const got = b.msgs.filter(isRtc).length;
    assert.ok(got > 40 && got <= 62, `relayed ${got}`);
    assert.ok(!c.msgs.some(isRtc), 'the third tab heard none of it');
    assert.ok(!a.msgs.some(isRtc), 'nothing echoes to the sender');
    a.ws.close();
    b.ws.close();
    c.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

for (const room of [worldRoomId('resume'), 'ws-current-test', 'v01-configured']) {
  test(`world: real saved item and tick survive cleanup-on restart: ${room}`, async () => {
    const env = { SERVER_SAVE_MS: '300', SERVER_ROOMS: room === 'v01-configured' ? room : '*', REPORT_TOKEN: 't' };
    const { svc, base, dataDir } = await start(env);
    assert.equal(svc.config.saveCleanup, 'trash');
    const toss = { op: 'gift.toss', i: 230, j: 205, k: 1, y: -1, n: 7, l: [0, 100, 0, 0, 0, 0] }; // a frisbee on the beach
    let saved = 0;
    try {
      const a = connect(base, room, 'aaa');
      await a.next(isWorld('w:snap'));
      const b = connect(base, room, 'bbb');
      const chunks: Msg[] = [];
      const first = await b.next((m) => isWorld('w:snap')(m) && m.d.to === 'bbb');
      for (let k = 0; k < first.d.n; k++)
        chunks.push((await b.next((m) => isWorld('w:snap')(m) && m.d.to === 'bbb' && m.d.k === k)).d);
      assert.ok('gifts' in JSON.parse(chunks.map((c) => c.s).join('')).snap.data);
      assert.equal(first.from, 'server');
      assert.ok(!a.msgs.some((m) => m.d?.t === 'w:snap' && m.d.to === 'bbb'));

      a.send({ t: 'm', d: { t: 'w:edit', e: toss } });
      const stamped = (m: Msg) =>
        isWorld('w:edits')(m) &&
        m.d.list.some((x: Msg) => x.e.op === 'gift.toss' && x.e.p === 'aaa' && x.e.u === 'aaapid');
      await Promise.all([a.next(stamped), b.next(stamped)]);
      await sleep(700);
      const doc = JSON.parse(await fs.readFile(path.join(dataDir, `${room}.json`), 'utf8'));
      assert.equal(doc.writerId, 'server');
      assert.ok('gifts' in doc.data.data);

      const closedA = a.closed;
      await svc.close({ save: true });
      assert.ok(a.msgs.some(is('bye')));
      assert.equal(await closedA, 1012);
      saved = JSON.parse(await fs.readFile(path.join(dataDir, `${room}.json`), 'utf8')).tick;
    } catch (e) {
      await svc.close({ save: false });
      throw e;
    }
    const again = await start(env, dataDir);
    try {
      const back = connect(again.base, room, 'after');
      await back.next(isWorld('w:snap'));
      const world = again.svc.roomHost()!.room(room)!.world;
      await sleep(20);
      assert.ok(world.sync.world.tick >= saved, `resumed at ${world.sync.world.tick}, saved ${saved}`);
      assert.ok('gifts' in world.rules, 'ordinary rooms retain the classic registry');
      assert.ok(world.rules.gifts.gifts.items.some((it: Msg) => it.i === toss.i && it.j === toss.j));
      const response = await fetch(`${again.base.replace('ws', 'http')}/admin/saves`, {
        headers: { authorization: 'Bearer t' },
      });
      const inv = await response.json();
      assert.equal(inv.current.count, 1);
      assert.deepEqual(inv.lastCleanup.moved, []);
      assert.deepEqual(inv.lastCleanup.errors, []);
    } finally {
      await again.svc.close({ save: false });
    }
  });
}

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

test('admin: reset backs the save up and starts the room fresh; restore brings the backup back', async () => {
  const room = worldRoomId('wipe');
  const { svc, base, dataDir } = await start({ SERVER_SAVE_MS: '100', SERVER_ROOMS: '*', REPORT_TOKEN: 't' });
  const http = base.replace('ws', 'http');
  const admin = (p: string, method = 'POST', token = 't') =>
    fetch(`${http}/admin/rooms${p}`, { method, headers: { authorization: `Bearer ${token}` } });
  const toss = { op: 'gift.toss', i: 230, j: 205, k: 1, y: -1, n: 7, l: [0, 100, 0, 0, 0, 0] };
  const tossed = () =>
    svc
      .roomHost()!
      .room(room)!
      .world.rules.gifts.gifts.items.some((it: Msg) => it.i === toss.i && it.j === toss.j);
  try {
    assert.equal((await admin(`/${room}/reset`, 'POST', 'wrong')).status, 401);
    assert.equal((await admin('/v01-old/reset')).status, 400);
    const a = connect(base, room, 'aaa');
    const born = (await a.next(is('welcome'))).born;
    assert.match(born, /^[a-z0-9]{1,16}$/);
    await a.next(isWorld('w:snap'));
    a.send({ t: 'm', d: { t: 'w:edit', e: toss } });
    await a.next((m) => isWorld('w:edits')(m) && m.d.list.some((x: Msg) => x.e.op === 'gift.toss'));
    // The edit applies on a later tick and the save follows it; under a loaded test run that takes a while.
    const until = async (what: string, ok: () => unknown) => {
      for (let k = 0; k < 100 && !(await ok()); k++) await sleep(50);
      assert.ok(await ok(), what);
    };
    await until('the toss applied', tossed);
    await until('the room saved it', async () =>
      (await fs.readFile(path.join(dataDir, `${room}.json`), 'utf8').catch(() => '')).includes('"gifts"'),
    );
    await sleep(250); // one more checkpoint, so the save on disk holds the frisbee
    const list = await (await admin('', 'GET')).json();
    assert.deepEqual(
      list.rooms.map((r: Msg) => [r.id, r.loaded, r.players]),
      [[room, true, 1]],
    );

    // Players present: refused without force, and nothing changed.
    const refused = await admin(`/${room}/reset`);
    assert.equal(refused.status, 409);
    assert.equal((await refused.json()).players, 1);
    assert.ok(tossed());

    const reset = await (await admin(`/${room}/reset?force=1`)).json();
    assert.equal(reset.kicked, 1);
    assert.equal(await a.closed, 1012);
    assert.deepEqual(await fs.readdir(path.join(dataDir, '.backups')), [reset.backup]);
    assert.ok(!(await fs.readdir(dataDir)).includes(`${room}.json`));
    const b = connect(base, room, 'bbb');
    const reborn = (await b.next(is('welcome'))).born;
    assert.notEqual(reborn, born, 'a reset room is a new world to its players');
    await b.next(isWorld('w:snap'));
    assert.ok(!tossed(), 'the reset room is a fresh world');
    b.ws.close();
    await b.closed;
    await sleep(400); // past the reconnect grace: the room is empty

    const restored = await (await admin(`/${room}/restore?backup=${reset.backup}`)).json();
    assert.equal(restored.restored, reset.backup);
    const c = connect(base, room, 'ccc');
    assert.equal((await c.next(is('welcome'))).born, born, 'the restored world is the one that was backed up');
    await c.next(isWorld('w:snap'));
    assert.ok(tossed(), 'the restored room has the frisbee again');
    assert.equal((await (await admin('', 'GET')).json()).backups.length, 2);
    assert.equal((await admin(`/${room}/restore?backup=nope`)).status, 404);
  } finally {
    await svc.close({ save: false });
  }
});
