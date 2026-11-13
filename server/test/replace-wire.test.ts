// Server-only replacement announcements: both peers, late joins and hostile client frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

type Msg = { t: string; [key: string]: unknown };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await sleep(10);
  }
  assert.fail('socket message not received');
}
function connect(base: string, room: string, self: string) {
  const ws = new WebSocket(`${base}/room/${room}?self=${self}&pid=${self}pid&key=${self}key000000000000&b=test`, [
    'boogle.1',
  ]);
  const messages: Msg[] = [];
  ws.onmessage = (event) => messages.push(JSON.parse(String(event.data)) as Msg);
  return { ws, messages };
}

test('replacement is announced to both peers and a late join before bye; clients cannot spoof it', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-replace-wire-'));
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {} }));
  const port = await svc.listen(0);
  const id = railwayRoomId('replace-wire');
  const base = `ws://127.0.0.1:${port}`;
  const a = connect(base, id, 'noticea');
  const b = connect(base, id, 'noticeb');
  try {
    await until(() => [a, b].every((client) => client.messages.some((m) => m.t === 'list')));
    const room = svc.roomHost()!.room(id)!;
    const born = a.messages.find((m) => m.t === 'welcome')!.born;
    for (const frame of [
      { t: 'replace', stage: 'ring-joined' },
      { t: 'replacing', label: 'forged', seconds: 10 },
      { t: 'm', d: { t: 'replacing', label: 'forged', seconds: 10 } },
      { t: 'm', d: { t: 'r:edit', e: { op: 'rail.replace', stage: 'ring-joined' } } },
    ])
      a.ws.send(JSON.stringify(frame));
    a.ws.send(JSON.stringify({ t: 'hb', at: 123 }));
    await until(() => a.messages.some((m) => m.t === 'hb' && m.at === 123));
    assert.equal(
      b.messages.some((m) => m.t === 'replacing' || (m.d as Msg | undefined)?.t === 'replacing'),
      false,
    );
    assert.equal(room.status().players, 2);
    room.replacing('Q4 complete', 10);
    await until(() => [a, b].every((client) => client.messages.some((m) => m.t === 'replacing')));
    for (const client of [a, b])
      assert.deepEqual(
        client.messages.find((m) => m.t === 'replacing'),
        { t: 'replacing', label: 'Q4 complete', seconds: 10 },
      );
    const c = connect(base, id, 'noticec');
    await until(() => c.messages.some((m) => m.t === 'replacing'));
    assert.equal(c.messages.find((m) => m.t === 'welcome')!.born, born);
    assert.ok(Number(c.messages.find((m) => m.t === 'replacing')!.seconds) <= 10);
    await svc.roomHost()!.offline(id, async () => ({}));
    await until(() => [a, b, c].every((client) => client.messages.some((m) => m.t === 'bye')));
    for (const client of [a, b, c])
      assert.ok(
        client.messages.findIndex((m) => m.t === 'replacing') < client.messages.findIndex((m) => m.t === 'bye'),
      );
  } finally {
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
