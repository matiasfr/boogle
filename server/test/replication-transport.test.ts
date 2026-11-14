// Replication R0 over real sockets: the hosted room flushes what changed at the end of a 60 Hz step, sends a late
// joiner everything whole, and sends only changed fields after that. No game state uses it yet; a toy projection does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import { defineReplicated, GLOBAL_CELL } from '../../src/world/replicate.ts';

type Msg = Record<string, any>;
const FAST = { reconnectGraceMs: 200, housekeepMs: 50, log: () => {} };

function connect(base: string, room: string, self: string) {
  const ws = new WebSocket(`${base}/room/${room}?self=${self}&pid=${self}pid&key=${self}key00000000000&b=test`, [
    'boogle.1',
  ]);
  const msgs: Msg[] = [];
  ws.onmessage = (e) => msgs.push(JSON.parse(String(e.data)));
  const next = async (pred: (m: Msg) => boolean, from = 0, ms = 2000) => {
    const end = Date.now() + ms;
    for (;;) {
      const m = msgs.slice(from).find(pred);
      if (m) return m;
      if (Date.now() > end) throw new Error(`${self}: no match`);
      await new Promise((r) => setTimeout(r, 5));
    }
  };
  return { ws, msgs, next };
}
const isS = (m: Msg) => m.t === 'm' && m.d?.t === 's';

test('a hosted room sends replicated changes at the end of a step, whole to a late joiner', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-rep-'));
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: 'beach' }, FAST));
  const base = `ws://127.0.0.1:${await svc.listen(0)}`;
  const a = connect(base, 'beach', 'alpha');
  try {
    await a.next((m) => m.t === 'welcome');
    const room = svc.roomHost()!.room('beach')!;
    const lamp = defineReplicated('lamp', { on: 'bool', hue: 'u8' });
    const lamps = new Map([[1, { on: false, hue: 3 }]]);
    room.replication.define({
      schema: lamp,
      ids: () => lamps.keys(),
      project: (id) => (lamps.has(id as number) ? { ...lamps.get(id as number)! } : null),
      cell: () => GLOBAL_CELL,
    });
    const sentAt = Date.now();
    room.replication.touch('lamp', 1);
    // A joiner's first send is its (here empty) whole state, marked w; the lamp follows on its own.
    const first = await a.next((m) => isS(m) && !!(m.d as { c?: unknown }).c);
    assert.deepEqual(first.d.c, [['lamp', 1, { on: false, hue: 3 }]]);
    assert.ok(Number.isSafeInteger(first.d.tk) && first.d.tk > 0, 'stamped with the room step');
    assert.ok(Date.now() - sentAt < 200, 'out within a few steps, not a 20 Hz tick later');

    const b = connect(base, 'beach', 'bravo');
    try {
      const whole = await b.next(isS);
      assert.deepEqual(whole.d.c, [['lamp', 1, { on: false, hue: 3 }]], 'late join: everything whole');
      assert.equal(whole.d.w, 1, 'and marked as the end of the whole state');
      lamps.get(1)!.on = true;
      const fromA = a.msgs.length,
        fromB = b.msgs.length;
      room.replication.touch('lamp', 1);
      const [pa, pb] = await Promise.all([a.next(isS, fromA), b.next(isS, fromB)]);
      assert.deepEqual(pa.d.c, [['lamp', 1, { on: true }]], 'only the changed field');
      assert.deepEqual(pb.d.c, [['lamp', 1, { on: true }]]);
    } finally {
      b.ws.close();
    }
  } finally {
    a.ws.close();
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
