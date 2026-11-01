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
import { PATCH } from '../../src/sim/mushrooms.ts';
import { PUSH_RUN_KIND } from '../../src/sim/scripted-run.ts';

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

async function makeHost(dir: string, saveMs = 2000, roomId = 'beach') {
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  const wh = createWorldHost({ roomId, store, saveMs, tick: false, pidOf: (sid) => sid + 'pid' });
  const sent: Msg[] = [];
  wh.onSend((m) => sent.push(m));
  await settle(); // becomeHost reads the save, then marks the world ready
  return { store, wh, sent };
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-world-'));

test('every op of every rules module is accepted from a client or, host-only, from the server', async () => {
  const { wh, sent } = await makeHost(tmp(), 2000, 'v02-proto-beach'); // a playtest room: the tune ops run too
  assert.equal(wh.status().mode, 'host');
  assert.equal(wh.status().ready, true);
  // The replay test's head start: piles to take and a full Track ring so a run can start.
  for (const [i, k] of [
    [212, 0],
    [230, 0],
    [250, 1],
  ])
    wh.rules.piles.drop(i, 188, k, 64);
  wh.rules.sites.addFreight(60);
  wh.rules.tune.tune.v.run = PUSH_RUN_KIND; // the push run, so site.push has a run to push (the same on every peer: none here)

  const accepted = new Set<string>();
  wh.sync.onApplied((e: Msg) => void accepted.add(e.op));
  const ops = wh.sync.registry().ops as string[];
  for (const op of ops) assert.ok(generators[op], `op ${op} has no edit generator`);
  const hostOnly = new Set(['bank.wake']);
  const r = stream(0x5e7);
  for (let f = 0; f < 600 && accepted.size < ops.length; f++) {
    // The haul reset empties the head start and opening day's shortcut closes the route, so they go last: the
    // shortcut, then opening day and its early end, then the reset.
    const left = ops.filter((o) => !accepted.has(o));
    const late = ['open.lay', 'open.start', 'open.here', 'tune.reset', 'tune.fill']; // a fill needs an empty ring: after the reset
    const early = left.filter((o) => !late.includes(o));
    const op = early.length ? r.pick(early) : late.find((o) => left.includes(o))!;
    const e = generators[op](r, { rules: wh.rules, land: home.land, tick: wh.sync.world.tick });
    if (e) {
      if (hostOnly.has(op)) wh.sync.submitEdit(e);
      else wh.deliver({ t: 'w:edit', e }, 'c1');
    }
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

test('tuning and the haul reset are refused outside a proto- room', async () => {
  const { wh } = await makeHost(tmp());
  const applied: string[] = [];
  wh.sync.onApplied((e: Msg) => void applied.push(e.op));
  wh.deliver({ t: 'w:edit', e: { op: 'tune.set', i: 0, j: 0, key: 'hard', v: 30 } }, 'c1');
  wh.deliver({ t: 'w:edit', e: { op: 'tune.reset', i: 0, j: 0 } }, 'c1');
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
  assert.ok('mushrooms' in payload.snap.data);
  await wh.close({ save: false });
});

test('the world saves as the server and a restart resumes from it', async () => {
  const dir = tmp();
  let { store, wh } = await makeHost(dir, 500);
  let cell: [number, number] | null = null;
  for (let i = PATCH.i0; i < PATCH.i0 + PATCH.w && !cell; i++)
    for (let j = PATCH.j0; j < PATCH.j0 + PATCH.h && !cell; j++)
      if (wh.rules.mushrooms.plantOk(i, j, home)) cell = [i, j];
  assert.ok(cell);
  wh.deliver({ t: 'w:edit', e: { op: 'mush.plant', i: cell[0], j: cell[1] } }, 'c1');
  for (let f = 0; f < 12; f++) (wh.step(0.05), await settle());
  await wh.close({ save: true });
  const doc = store.readSync('beach')!;
  assert.equal(doc.writerId, 'server');
  const tick = doc.tick;
  assert.ok(tick > 0 && (doc.data as Msg).tick === tick);
  assert.equal(wh.rules.mushrooms.garden.plots.length, 1);

  // Nothing changes from here, but the tick moves on: a close still saves it (the helper bank reads it).
  ({ store, wh } = await makeHost(dir));
  for (let f = 0; f < 30; f++) (wh.step(0.1), await settle());
  const later = wh.sync.world.tick;
  await wh.close({ save: true });
  assert.equal(store.readSync('beach')!.tick, later);

  ({ wh } = await makeHost(dir));
  assert.ok(wh.sync.world.tick >= later && later > tick, `resumed at ${wh.sync.world.tick}, saved ${later}`);
  assert.equal(wh.rules.mushrooms.garden.plots.length, 1);
  await wh.close({ save: false });
});
