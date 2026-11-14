// The voice signal relay (server/src/host/hosted-room.ts, src/net/rtc-wire.ts) against hostile clients, over real
// sockets: from the independent review of voice chat (9 November). host.test.ts has the plain relay case.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WebSocket as WsSocket } from 'ws';
import { createService, loadConfig } from '../src/server.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { worldRoomId } from '../../src/world/namespace.ts';

type Msg = Record<string, any>;
const FAST = { reconnectGraceMs: 200, housekeepMs: 50, log: () => {} };
async function start() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-voice-relay-'));
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, FAST));
  const port = await svc.listen(0);
  return { svc, port, base: 'ws://127.0.0.1:' + port };
}
const roomUrl = (base: string, room: string, self: string) =>
  `${base}/room/${room}?self=${self}&pid=${self}pid&key=${self}pidkey0000000000&b=test`;
function connect(base: string, room: string, self: string) {
  const ws = new WebSocket(roomUrl(base, room, self), ['boogle.1']);
  const msgs: Msg[] = [];
  ws.onmessage = (e) => msgs.push(JSON.parse(String(e.data)));
  const opened = new Promise<void>((r) => (ws.onopen = () => r()));
  return { ws, msgs, opened, send: (m: Msg | string) => ws.send(typeof m === 'string' ? m : JSON.stringify(m)) };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isRtc = (m: Msg) => m.t === 'm' && m.d?.t === 'rtc';
const inVoice = { t: 'p', s: 1, d: { v: 1, t: 1, vc: 1 } };

for (const kind of ['railway', 'world'] as const)
  test(`${kind}: hostile rtc frames never crash, reach the world, fan out or cross rooms; the game budget is untouched`, async () => {
    const { svc, base } = await start();
    try {
      const id = kind === 'railway' ? railwayRoomId('rv') : worldRoomId('rv');
      const other = kind === 'railway' ? railwayRoomId('rv2') : worldRoomId('rv2');
      const a = connect(base, id, 'aaa'),
        b = connect(base, id, 'bbb'),
        c = connect(base, id, 'ccc'),
        x = connect(base, other, 'bbb');
      await Promise.all([a.opened, b.opened, c.opened, x.opened]);
      for (const s of [a, b, c, x]) s.send(inVoice);
      await sleep(150);
      const deep =
        '{"t":"m","d":{"t":"rtc","to":"bbb","k":"ice","n":1,"c":' +
        '{"c":'.repeat(2500) +
        '1' +
        '}'.repeat(2500) +
        '}}';
      const hostile: (Msg | string)[] = [
        deep,
        '{"t":"m","d":{"t":"rtc","to":"bbb","k":"offer","n":1,"sdp":"' + 'x'.repeat(15000) + '"}}',
        ('{"t":"m","d":{"t":"rtc","to":"bbb","k":"offer","n":1,"sdp":"' + 'x'.repeat(70000) + '"}}').slice(0, 60000),
        { t: 'm', d: { t: 'rtc' } },
        { t: 'm', d: { t: 'rtc', to: 123, k: 'bye', n: 1 } },
        { t: 'm', d: { t: 'rtc', to: ['bbb'], k: 'bye', n: 1 } },
        { t: 'm', d: { t: 'rtc', to: '__proto__', k: 'bye', n: 1 } },
        { t: 'm', d: { t: 'rtc', to: 'constructor', k: 'bye', n: 1 } },
        { t: 'm', d: { t: 'rtc', to: 'server', k: 'bye', n: 1 } },
        { t: 'm', d: { t: 'rtc', to: 'aaa', k: 'bye', n: 1 } },
        { t: 'm', d: { t: 'rtc', to: 'bbb', k: 'bye', n: 1e99 } },
        { t: 'm', d: { t: 'rtc', to: 'bbb', k: 'ice', n: 1, c: { candidate: 5 } } },
        { t: 'm', d: { t: 'rtc', to: 'bbb', k: 'w:edit', n: 1, e: { op: 'who.set', n: 'x', c: 1 } } },
        '{"t":"m","d":{"t":"rtc","to":"bbb","k":"bye","n":1,"__proto__":{"k":"offer"}}}',
      ];
      for (const h of hostile) a.send(h);
      // One valid signal with smuggled fields: only the clean copy arrives, only at bbb in this room.
      a.send({
        t: 'm',
        d: { t: 'rtc', to: 'bbb', k: 'bye', n: 7, e: { op: 'tune.set' }, w: 1, from: 'ccc' },
        from: 'ccc',
      });
      await sleep(200);
      const got = b.msgs.filter(isRtc);
      assert.deepEqual(
        got.map((m) => m.d),
        [
          { t: 'rtc', to: 'bbb', k: 'bye', n: 1 }, // the __proto__ own-key one is a plain bye
          { t: 'rtc', to: 'bbb', k: 'bye', n: 7 },
        ],
      );
      assert.ok(got.every((m) => m.from === 'aaa'));
      assert.ok(!c.msgs.some(isRtc) && !a.msgs.some(isRtc) && !x.msgs.some(isRtc), 'no fan-out, echo or cross-room');
      // A flood from two sockets at one target, then the game still gets its whole budget from the flooder.
      for (let i = 0; i < 400; i++) {
        a.send({ t: 'm', d: { t: 'rtc', to: 'bbb', k: 'ice', n: 1, c: { candidate: 'c' + i } } });
        c.send({ t: 'm', d: { t: 'rtc', to: 'bbb', k: 'ice', n: 1, c: { candidate: 'c' + i } } });
      }
      for (let i = 0; i < 90; i++) a.send({ t: 'm', d: { t: 'honk', v: 1 } });
      await sleep(400);
      const relayed = b.msgs.filter(isRtc).length - 2;
      assert.ok(relayed > 0 && relayed <= 2 * 60 + 2 * 20, 'relayed ' + relayed);
      const honks = b.msgs.filter((m) => m.t === 'm' && m.d?.t === 'honk').length;
      assert.equal(honks, 90, 'game messages after an rtc flood: ' + honks + '/90');
      a.send({ t: 'hb', at: 42 });
      await sleep(100);
      assert.ok(
        a.msgs.some((m) => m.t === 'hb' && m.at === 42),
        'room alive',
      );
      for (const s of [a, b, c, x]) s.ws.close();
    } finally {
      await svc.close({ save: false });
    }
  });

test('CONSENT: the server relays a voice signal only between tabs whose presence says they are in voice', async () => {
  const { svc, base } = await start();
  try {
    const id = railwayRoomId('rv3');
    const a = connect(base, id, 'aaa'),
      b = connect(base, id, 'bbb');
    await Promise.all([a.opened, b.opened]);
    await sleep(100);
    const offer = { t: 'm', d: { t: 'rtc', to: 'bbb', k: 'offer', n: 1, sdp: "v=0 (carries aaa's addresses)" } };
    b.send({ t: 'p', s: 1, d: { v: 1, t: 1 } }); // in the room, never pressed Join voice
    a.send({ t: 'p', s: 1, d: { v: 1, t: 1 } }); // the sender is not in voice either
    await sleep(100);
    a.send(offer);
    await sleep(100);
    assert.equal(b.msgs.filter(isRtc).length, 0, 'neither in voice');
    a.send({ ...inVoice, s: 2 }); // only the sender in voice: a hidden listener's offer would look like this
    await sleep(100);
    a.send(offer);
    b.send({ t: 'm', d: { t: 'rtc', to: 'aaa', k: 'offer', n: 1, sdp: 'v=0' } }); // the listener calling in
    await sleep(100);
    assert.equal(b.msgs.filter(isRtc).length, 0, 'the target is not in voice');
    assert.equal(a.msgs.filter(isRtc).length, 0, 'the sender is not in voice');
    b.send({ ...inVoice, s: 2 });
    await sleep(100);
    a.send(offer);
    await sleep(100);
    assert.equal(b.msgs.filter(isRtc).length, 1, 'both in voice');
    a.ws.close();
    b.ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

test('BACKPRESSURE: voice signals are not queued without bound onto a socket that is backed up', async () => {
  const { svc, base } = await start();
  let maxBuffered = 0;
  const send = WsSocket.prototype.send;
  WsSocket.prototype.send = function (this: WsSocket & { _isServer?: boolean }, data: unknown, ...rest: unknown[]) {
    if (this._isServer && typeof data === 'string' && data.includes('"t":"rtc"'))
      maxBuffered = Math.max(maxBuffered, this.bufferedAmount);
    return (send as (...a: unknown[]) => void).call(this, data, ...rest);
  } as typeof send;
  const sockets: WsSocket[] = [];
  try {
    const url = (self: string) => roomUrl(base, railwayRoomId('bp'), self);
    const victim = new WsSocket(url('vvv'), ['boogle.1']);
    sockets.push(victim);
    await new Promise((r) => victim.once('open', r));
    victim.send(JSON.stringify(inVoice));
    await sleep(100);
    (victim as unknown as { _socket: { pause(): void } })._socket.pause(); // a client that stops reading
    const senders: WsSocket[] = [];
    for (let i = 0; i < 6; i++) {
      const s = new WsSocket(url('snd' + i), ['boogle.1']);
      sockets.push(s);
      await new Promise((r) => s.once('open', r));
      s.send(JSON.stringify(inVoice));
      senders.push(s);
    }
    await sleep(100);
    const sdp = 'x'.repeat(12000);
    for (let round = 0; round < 12; round++) {
      for (const s of senders)
        for (let i = 0; i < 60; i++)
          s.send(JSON.stringify({ t: 'm', d: { t: 'rtc', to: 'vvv', k: 'offer', n: 1, sdp } }));
      await sleep(250);
    }
    assert.ok(maxBuffered > 0, 'the senders were relayed at all');
    assert.ok(
      maxBuffered <= 64 * 1024 + 13000,
      'queued ' + Math.round(maxBuffered / 1024) + ' KB onto one backed-up socket',
    );
  } finally {
    WsSocket.prototype.send = send;
    for (const s of sockets) s.terminate();
    await svc.close({ save: false });
  }
});
