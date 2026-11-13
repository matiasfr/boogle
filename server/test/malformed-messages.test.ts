// Malformed messages over real sockets (server/src/host/hosted-room.ts): a wire value that throws when coerced never
// reaches the process, which hosts every room. From the independent review of 12 November.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { createService, loadConfig } from '../src/server.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { worldRoomId } from '../../src/world/namespace.ts';

type Msg = Record<string, any>;
async function start() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-malformed-'));
  const logs: string[] = [];
  const log = (...a: unknown[]) => logs.push(a.map(String).join(' '));
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { housekeepMs: 50, log }));
  const port = await svc.listen(0);
  return { svc, logs, base: 'ws://127.0.0.1:' + port };
}
function connect(base: string, room: string, self: string) {
  const ws = new WebSocket(`${base}/room/${room}?self=${self}&pid=${self}pid&key=${self}pidkey0000000000&b=test`, [
    'boogle.1',
  ]);
  const msgs: Msg[] = [];
  ws.onmessage = (e) => msgs.push(JSON.parse(String(e.data)));
  const opened = new Promise<void>((r) => (ws.onopen = () => r()));
  return { ws, msgs, opened, send: (m: string) => ws.send(m) };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** The room still answers this socket: a heartbeat comes back. */
async function alive(s: ReturnType<typeof connect>, at: number) {
  s.send(JSON.stringify({ t: 'hb', at }));
  for (let k = 0; k < 40 && !s.msgs.some((m) => m.t === 'hb' && m.at === at); k++) await sleep(25);
  return s.msgs.some((m) => m.t === 'hb' && m.at === at);
}
const threw = (logs: string[]) => logs.filter((l) => l.includes('dropped a message that threw'));

test('legacy and malformed classic messages cannot change or crash a railway room', async () => {
  const { svc, logs, base } = await start();
  try {
    const room = railwayRoomId('classic-retired');
    const a = connect(base, room, 'aaa'),
      b = connect(base, room, 'bbb');
    await Promise.all([a.opened, b.opened]);
    assert.equal(await alive(a, 50), true);
    const world = svc.roomHost()!.room(room)!.world;
    assert.ok('whenReady' in world && typeof world.whenReady === 'function');
    await world.whenReady(); // A heartbeat proves socket liveness, not checkpoint startup completion.
    const before = world.sync.snapshot().data;
    for (const type of ['w:edit', 'w:edits', 'w:hash', 'w:need', 'w:snap', 'w:rejected'])
      for (const e of [null, [], { op: { toString: 0 } }, { op: 'who.set', n: 'Forged', c: 1 }])
        a.send(JSON.stringify({ t: 'm', d: { t: type, e, list: e, snap: e, ht: 999999, tick: 999999 } }));
    assert.equal(await alive(a, 51), true);
    assert.equal(await alive(b, 52), true);
    assert.deepEqual(world.sync.snapshot().data, before);
    assert.equal(world.status().ready, true);
    assert.deepEqual(threw(logs), []);
    assert.equal(
      b.msgs.some((m) => m.from === 'aaa' && String(m.d?.t).startsWith('w:')),
      false,
    );
  } finally {
    await svc.close();
  }
});

test('railway: a message type that throws when coerced is dropped before anything coerces it', async () => {
  const { svc, logs, base } = await start();
  try {
    const a = connect(base, railwayRoomId('malformed'), 'aaa');
    await a.opened;
    for (const t of ['{"toString":0}', '{"toString":0,"valueOf":0}', '[{"toString":0}]'])
      a.send(`{"t":"m","d":{"t":${t}}}`);
    assert.equal(await alive(a, 1), true);
    assert.deepEqual(threw(logs), [], 'refused by validation, not caught by the listener');
  } finally {
    await svc.close();
  }
});

test('a malformed retired command is ignored: the room and its neighbours keep running', async () => {
  const { svc, logs, base } = await start();
  try {
    const a = connect(base, worldRoomId('malformed'), 'aaa'),
      b = connect(base, worldRoomId('malformed-2'), 'bbb');
    await Promise.all([a.opened, b.opened]);
    a.send('{"t":"m","d":{"t":"w:edit","e":{"op":{"toString":0},"i":0,"j":0}}}');
    assert.equal(await alive(a, 2), true, 'the room answers its sender');
    assert.equal(await alive(b, 3), true, 'and another room');
    assert.deepEqual(threw(logs), [], 'retired commands never enter an op coercion path');
    // An operator sees the refused legacy message in the drop counter, without an exception log.
    const status = await (await fetch(`${base.replace('ws:', 'http:')}/rooms/${worldRoomId('malformed')}/host`)).json();
    assert.equal(status.dropped, 1);
  } finally {
    await svc.close();
  }
});

// A raw upgrade, so the frames after it can be ones no WebSocket client would send.
async function raw(port: number, target: string) {
  const s = net.connect(port, '127.0.0.1');
  s.on('error', () => {});
  await new Promise((r) => s.on('connect', r));
  s.write(
    `GET ${target} HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
      `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n` +
      `Sec-WebSocket-Protocol: boogle.1\r\n\r\n`,
  );
  await sleep(100);
  return s;
}
const BAD_FRAMES = {
  oversized: Buffer.from([0x81, 0xff, 0, 0, 0, 0, 0, 1, 0x86, 0xa0, 1, 2, 3, 4]), // masked text, 100000 bytes declared
  unmasked: Buffer.from([0x81, 0x01, 0x41]),
  'bad opcode': Buffer.from([0x83, 0x80, 1, 2, 3, 4]),
};

test('a refused socket that sends a bad frame never reaches the process; another room still answers', async () => {
  const { svc, base } = await start();
  const port = Number(new URL(base).port);
  try {
    const room = worldRoomId('refused');
    const other = connect(base, worldRoomId('refused-2'), 'zzz');
    await other.opened;
    const holder = await raw(port, `/room/${room}?self=bbb&pid=bbbpid&key=bbbpidkey0000000000&b=t`);
    const refusals = {
      'refused in the upgrade (bad self)': `/room/${room}?self=&pid=aaapid&key=aaapidkey0000000000&b=t`,
      'refused in join (pid taken)': `/room/${room}?self=ccc&pid=bbbpid&key=otherkey00000000000&b=t`,
    };
    let at = 10;
    for (const [why, target] of Object.entries(refusals))
      for (const [kind, frame] of Object.entries(BAD_FRAMES)) {
        const s = await raw(port, target);
        s.write(frame);
        await sleep(100);
        s.destroy();
        assert.equal(await alive(other, at++), true, `${why}, ${kind}`);
      }
    holder.destroy();
  } finally {
    await svc.close();
  }
});
