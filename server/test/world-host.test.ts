// The server's world (src/host/world-host.ts): every op of every rules module is accepted when fed its replay
// generators (so a validate that needs a new env fact fails here until the server provides it), and the world saves to
// the store and resumes from it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWorldHost } from '../src/host/world-host.ts';
import { createStore } from '../src/store.ts';
import { loadHomeLand } from '../src/host/land.ts';
import { RULES } from '../../src/world/rules/index.ts';
import { mulberry32 } from '../../src/sim/rng.ts';
import { worldRoomId } from '../../src/world/namespace.ts';

type Msg = Record<string, any>;
const generators: Record<string, (r: unknown, view: unknown) => Msg | null> = Object.assign(
  {},
  ...RULES.map((m) => ('edits' in m ? m.edits : {})),
);
function stream(seed: number) {
  const next = mulberry32(seed | 0);
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return { next, int, pick: <T>(a: T[]) => a[int(0, a.length - 1)], chance: (p: number) => next() < p };
}
const home = loadHomeLand();
const settle = () => new Promise((r) => setImmediate(r));

async function makeHost(dir: string, saveMs = 2000, roomId = worldRoomId('beach')) {
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  const wh = createWorldHost({
    roomId,
    store,
    saveMs,
    tick: false,
    pidOf: (sid) => sid + 'pid',
    tuneController: (sid) => sid === 'c1',
  });
  const sent: Msg[] = [];
  wh.onSend((m) => sent.push(m));
  await settle(); // becomeHost reads the save, then marks the world ready
  return { store, wh, sent };
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-world-'));
for (const corruption of ['missing-value', 'range', 'revision'] as const) {
  test(`an invalid tuning profile refuses load without rewriting the file: ${corruption}`, async (t) => {
    const dir = tmp();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const roomId = worldRoomId('proto-tunables');
    const first = await makeHost(dir, 1, roomId);
    const snapshot = first.wh.sync.snapshot();
    await first.wh.close({ save: false });
    const tune = snapshot.data.tune as { values: Record<string, number>; revision: number };
    if (corruption === 'missing-value') delete tune.values.wagonAccel;
    else if (corruption === 'range') tune.values.yield = 61;
    else tune.revision = -1;
    const file = path.join(dir, `${roomId}.json`);
    const original = JSON.stringify({
      tick: snapshot.tick,
      writerId: 'server',
      data: snapshot,
      updatedAt: 'current-fixture',
    });
    fs.writeFileSync(file, original);
    const { wh } = await makeHost(dir, 1, roomId);
    assert.ok(wh.status().loadErrors > 0);
    assert.equal(wh.status().badSave, true);
    await assert.rejects(wh.close({ save: true }), /saved state did not load cleanly/);
    assert.equal(fs.readFileSync(file, 'utf8'), original, 'failed-load fallback never replaces the accepted save');
  });
}

test('tuning commits require the assigned controller and current revision, and persist defaults', async () => {
  const dir = tmp();
  const { wh } = await makeHost(dir, 1, worldRoomId('proto-tunables'));
  const edit = {
    op: 'tune.commit',
    i: 0,
    j: 0,
    key: 'yield',
    v: 9,
    expectedRevision: 0,
    requestId: 'proof',
  };
  const applied: Msg[] = [];
  wh.sync.onApplied((e: Msg, tick, result) => {
    if (e.op === 'tune.commit') applied.push({ e, tick, result });
  });
  wh.deliver({ t: 'w:edit', e: edit }, 'c2');
  wh.deliver({ t: 'w:edit', e: { op: 'tune.set', i: 0, j: 0, key: 'yield', v: 20 } }, 'c2');
  wh.deliver({ t: 'w:edit', e: { ...edit, expectedRevision: 1 } }, 'c1');
  for (let f = 0; f < 6; f++) wh.step(0.1);
  assert.equal(wh.rules.tune.tune.revision, 0);
  assert.equal(applied.length, 0);
  wh.deliver({ t: 'w:edit', e: edit }, 'c1');
  wh.deliver({ t: 'w:edit', e: { ...edit, requestId: 'racing', v: 10 } }, 'c1');
  for (let f = 0; f < 6; f++) wh.step(0.1);
  assert.equal(wh.rules.tune.get('yield'), 9);
  assert.equal(wh.rules.tune.tune.revision, 1);
  assert.deepEqual(
    applied.map((x) => x.result.status),
    ['applied', 'rejected'],
  );
  const hash = wh.sync.stateHashes().tune;
  await wh.close({ save: true });
  const loaded = await makeHost(dir, 1, worldRoomId('proto-tunables'));
  assert.equal(loaded.wh.rules.tune.get('yield'), 9);
  assert.equal(loaded.wh.rules.tune.tune.revision, 1);
  assert.equal(loaded.wh.sync.stateHashes().tune, hash);
  assert.equal(Object.keys(loaded.wh.sync.snapshot().data.tune as object).length, 2);
  await loaded.wh.close({ save: false });
});

test('every retained classic op is accepted from a client', async () => {
  const { wh, sent } = await makeHost(tmp(), 2000, worldRoomId('proto-beach')); // the tune ops run too
  assert.equal(wh.status().mode, 'host');
  assert.equal(wh.status().ready, true);
  const accepted = new Set<string>();
  wh.sync.onApplied((e: Msg) => void accepted.add(e.op));
  const ops = wh.sync.registry().ops as string[];
  for (const op of ops) assert.ok(generators[op], `op ${op} has no edit generator`);
  const r = stream(0x5e7);
  for (let f = 0; f < 600 && accepted.size < ops.length; f++) {
    const left = ops.filter((o) => !accepted.has(o));
    const op = r.pick(left)!;
    const e = generators[op]!(r, { rules: wh.rules, land: home.land, tick: wh.sync.world.tick });
    if (e) wh.deliver({ t: 'w:edit', e }, 'c1');
    wh.step(0.05);
    await settle();
  }
  for (let f = 0; f < 10; f++) (wh.step(0.1), await settle());
  assert.deepEqual(
    ops.filter((o) => !accepted.has(o)),
    [],
    'ops the server never accepted',
  );
  const edits = sent.filter((m) => m.t === 'w:edits').flatMap((m) => m.list);
  assert.ok(
    edits.some((x: Msg) => x.e.p === 'c1' && x.e.u === 'c1pid'),
    'stamped edits carry the sender',
  );
  await wh.close({ save: false });
});

test('tuning is refused outside a proto- room', async () => {
  const { wh } = await makeHost(tmp());
  const applied: string[] = [];
  wh.sync.onApplied((e: Msg) => void applied.push(e.op));
  wh.deliver({ t: 'w:edit', e: { op: 'tune.set', i: 0, j: 0, key: 'hard', v: 30 } }, 'c1');
  for (let f = 0; f < 6; f++) (wh.step(0.05), await settle());
  assert.deepEqual(applied, []);
  assert.equal(wh.rules.tune.get('hard'), 60);
  await wh.close({ save: false });
});

test('a w:need gets snapshot chunks addressed to that client only', async () => {
  const { wh, sent } = await makeHost(tmp());
  wh.deliver({ t: 'w:need' }, 'c2');
  const chunks = sent.filter((m) => m.t === 'w:snap');
  assert.ok(chunks.length >= 1 && chunks.every((m) => m.to === 'c2'));
  const payload = JSON.parse(
    chunks
      .sort((a, b) => a.k - b.k)
      .map((m) => m.s)
      .join(''),
  );
  assert.ok('roster' in payload.snap.data);
  await wh.close({ save: false });
});

test('the world saves as the server and a restart resumes from it', async () => {
  const dir = tmp();
  let { store, wh } = await makeHost(dir, 500);
  const named = (w: { rules: Msg }) => w.rules.roster.nameOf(w.rules.roster.indexOf('c1pid')) === 'Saved';
  wh.deliver({ t: 'w:edit', e: { op: 'who.set', i: 0, j: 0, n: 'Saved', c: 2 } }, 'c1');
  for (let f = 0; f < 12; f++) (wh.step(0.05), await settle());
  await wh.close({ save: true });
  const doc = store.readSync(worldRoomId('beach'))!;
  assert.equal(doc.writerId, 'server');
  const tick = doc.tick;
  assert.ok(tick > 0 && (doc.data as Msg).tick === tick);
  assert.equal(named(wh), true);

  // Nothing changes from here, but the tick moves on: a close still saves it.
  ({ store, wh } = await makeHost(dir));
  for (let f = 0; f < 30; f++) (wh.step(0.1), await settle());
  const later = wh.sync.world.tick;
  await wh.close({ save: true });
  assert.equal(store.readSync(worldRoomId('beach'))!.tick, later);

  ({ wh } = await makeHost(dir));
  assert.ok(wh.sync.world.tick >= later && later > tick, `resumed at ${wh.sync.world.tick}, saved ${later}`);
  assert.equal(named(wh), true);
  await wh.close({ save: false });
});
