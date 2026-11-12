// Malformed messages over real sockets (server/src/host/hosted-room.ts): a wire value that throws when coerced never
// reaches the process, which hosts every room. From the independent review of 12 November.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

test('a handler that throws does not escape the socket listener: the room and its neighbours keep running', async () => {
  const { svc, logs, base } = await start();
  try {
    // A classic world room's edit path still coerces its op (src/world/sync.ts stamp); the listener holds it.
    const a = connect(base, worldRoomId('malformed'), 'aaa'),
      b = connect(base, worldRoomId('malformed-2'), 'bbb');
    await Promise.all([a.opened, b.opened]);
    a.send('{"t":"m","d":{"t":"w:edit","e":{"op":{"toString":0},"i":0,"j":0}}}');
    assert.equal(await alive(a, 2), true, 'the room answers its sender');
    assert.equal(await alive(b, 3), true, 'and another room');
    assert.deepEqual(threw(logs), [`room ${worldRoomId('malformed')}: dropped a message that threw TypeError`]);
  } finally {
    await svc.close();
  }
});
