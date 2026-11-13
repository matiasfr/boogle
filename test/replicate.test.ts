// Replication core on a toy state (docs/plans/replication.md, R0): schema, touched-entity projection, per-client
// per-cell change ticks, send-on-change with coalescing, late join, the client mirror and the prediction hooks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import {
  defineReplicated,
  validFields,
  cellOf,
  cellsNear,
  GLOBAL_CELL,
  MAX_PACKET_CHARS,
  HASH_STEPS,
  hashComponents,
  type EntityId,
  type Fields,
  type ServerPacket,
} from '../src/world/replicate.ts';
import { createReplicator, MAX_REJECTS } from '../src/world/replicate-server.ts';
import { createMirror, createPredictor, PREDICTION_WINDOW } from '../src/world/replicate-client.ts';

const treeSchema = defineReplicated('tree', { x: 'i32', z: 'i32', left: 'u8', work: 'u8', fell: 'bool' });
const roomSchema = defineReplicated('room', { tune: 'u16', name: 'str' });
type Tree = { x: number; z: number; left: number; work: number; fell: boolean };

function toyWorld(n: number, rand = mulberry32(7)) {
  const trees = new Map<number, Tree>();
  for (let k = 0; k < n; k++)
    trees.set(k, {
      x: Math.floor(rand() * 40000) - 20000,
      z: Math.floor(rand() * 40000) - 20000,
      left: 10,
      work: 0,
      fell: false,
    });
  const room = { tune: 3, name: 'toy' };
  const rep = createReplicator();
  rep.define({
    schema: treeSchema,
    ids: () => trees.keys(),
    project: (id) => {
      const t = trees.get(id as number);
      return t ? { ...t } : null;
    },
    cell: (_id, f) => cellOf(f.x as number, f.z as number),
  });
  rep.define({
    schema: roomSchema,
    ids: () => [0],
    project: () => ({ ...room }),
    cell: () => GLOBAL_CELL,
  });
  return { trees, room, rep };
}

/** What the server would show a client subscribed to `cells` ('all' for everything). */
function expected(w: ReturnType<typeof toyWorld>, cells: readonly string[] | 'all') {
  const out = new Map<string, Fields>();
  for (const [id, t] of w.trees)
    if (cells === 'all' || cells.includes(cellOf(t.x, t.z))) out.set(`tree:${id}`, { ...t });
  if (cells === 'all' || cells.includes(GLOBAL_CELL)) out.set('room:0', { ...w.room });
  return out;
}
function seen(m: ReturnType<typeof createMirror>) {
  const out = new Map<string, Fields>();
  for (const kind of ['tree', 'room']) for (const [id, f] of m.entries(kind)) out.set(`${kind}:${id}`, { ...f });
  return out;
}

test('schemas are language-neutral field tables and validate decoded values', () => {
  assert.throws(() => defineReplicated('Tree', { a: 'u8' }));
  assert.throws(() => defineReplicated('tree', { a: 'float' as 'f32' }));
  assert.ok(validFields(treeSchema, { x: 1, z: -2, left: 3, work: 0, fell: false }, false));
  assert.ok(!validFields(treeSchema, { x: 1 }, false), 'a spawn carries every field');
  assert.ok(validFields(treeSchema, { left: 2 }, true));
  assert.ok(!validFields(treeSchema, { left: 256 }, true), 'u8 range');
  assert.ok(!validFields(treeSchema, { left: 1, extra: 1 }, true), 'no undeclared fields');
  assert.ok(!validFields(treeSchema, { fell: 1 }, true), 'bool is a boolean');
  assert.deepEqual(cellsNear(0, 0, 100), [GLOBAL_CELL, '-1,-1', '-1,0', '0,-1', '0,0']);
});

test('late join sends everything whole, chunked under the message cap', () => {
  const w = toyWorld(500);
  w.rep.touchAll('tree');
  w.rep.touchAll('room');
  w.rep.commit(6);
  w.rep.addClient('late');
  const packets: ServerPacket[] = [];
  const st = w.rep.flush(7, (_c, p) => packets.push(p));
  assert.ok(packets.length > 1, 'chunked');
  for (const p of packets) assert.ok(JSON.stringify(p).length < MAX_PACKET_CHARS + 200);
  const m = createMirror([treeSchema, roomSchema]);
  // Only the last chunk says the mirror is whole: a client never acts on a partial late join.
  assert.deepEqual(
    packets.map((p) => p.w ?? 0),
    packets.map((_p, k) => (k === packets.length - 1 ? 1 : 0)),
  );
  // Every chunk but the last says more follows: the state is consistent only at the end of a send.
  assert.deepEqual(
    packets.map((p) => p.m ?? 0),
    packets.map((_p, k) => (k === packets.length - 1 ? 0 : 1)),
  );
  for (const p of packets.slice(0, -1)) assert.ok(m.apply(p) && !m.whole());
  assert.ok(m.apply(packets.at(-1)) && m.whole());
  assert.deepEqual(seen(m), expected(w, 'all'));
  assert.equal(
    st.chars,
    packets.reduce((n, p) => n + JSON.stringify(p).length, 0),
  );
  // Nothing changed: nothing sent.
  assert.equal(w.rep.flush(8, () => assert.fail('no packet when nothing changed')).packets, 0);
});

test('only touched entities are projected, and only changed fields go out', () => {
  const w = toyWorld(300);
  w.rep.touchAll('tree');
  w.rep.touchAll('room');
  w.rep.commit(1);
  w.rep.addClient('a');
  const m = createMirror([treeSchema, roomSchema]);
  w.rep.flush(1, (_c, p) => m.apply(p));
  const before = w.rep.stats.projected;
  w.trees.get(5)!.left = 8;
  w.trees.get(5)!.work = 1;
  w.trees.get(6)!.left = 9; // changed but not touched: not noticed until touched
  w.rep.touch('tree', 5);
  w.rep.touch('tree', 7); // touched but unchanged: projected, not sent
  assert.equal(w.rep.commit(2), 1);
  assert.equal(w.rep.stats.projected - before, 2);
  const packets: ServerPacket[] = [];
  w.rep.flush(2, (_c, p) => packets.push(p));
  assert.deepEqual(packets, [{ t: 's', tk: 2, c: [['tree', 5, { left: 8, work: 1 }]] }]);
  for (const p of packets) m.apply(p);
  assert.equal(m.get('tree', 5)!.left, 8);
  assert.equal(m.get('tree', 6)!.left, 10);
});

test('a backed-up client is skipped, then gets one coalesced packet with the latest values', () => {
  const w = toyWorld(50);
  w.rep.touchAll('tree');
  w.rep.touchAll('room');
  w.rep.commit(0);
  w.rep.addClient('slow');
  w.rep.addClient('fast');
  const slow = createMirror([treeSchema, roomSchema]);
  const fast = createMirror([treeSchema, roomSchema]);
  const send = (c: string, p: ServerPacket) => (c === 'slow' ? slow : fast).apply(p);
  w.rep.flush(0, send);
  let fastPackets = 0;
  for (let step = 1; step <= 30; step++) {
    w.trees.get(3)!.work = step % 7;
    w.rep.touch('tree', 3);
    w.rep.commit(step);
    const st = w.rep.flush(
      step,
      (c, p) => {
        if (c === 'fast') fastPackets++;
        send(c, p);
      },
      (c) => c !== 'slow',
    );
    assert.equal(st.skipped, 1);
  }
  assert.equal(fastPackets, 30, 'send-on-change: one packet per changed step, up to 60 Hz');
  const late: ServerPacket[] = [];
  w.rep.flush(31, (c, p) => c === 'slow' && late.push(p));
  assert.deepEqual(late, [{ t: 's', tk: 31, c: [['tree', 3, { work: 30 % 7 }]] }]);
  slow.apply(late[0]);
  assert.deepEqual(seen(slow), seen(fast));
});

test('random churn: every client mirror equals its cells of the server after a final flush', () => {
  const rand = mulberry32(42);
  const w = toyWorld(400, rand);
  w.rep.touchAll('tree');
  w.rep.touchAll('room');
  w.rep.commit(0);
  const subs: (readonly string[] | 'all')[] = ['all', cellsNear(0, 0, 9000), cellsNear(-10000, 5000, 6400)];
  const mirrors = subs.map(() => createMirror([treeSchema, roomSchema]));
  subs.forEach((cells, k) => w.rep.addClient(`c${k}`, cells));
  let nextId = 400;
  for (let step = 1; step <= 600; step++) {
    for (let n = Math.floor(rand() * 6); n > 0; n--) {
      const r = rand();
      const ids = [...w.trees.keys()];
      const id = ids[Math.floor(rand() * ids.length)]!;
      if (r < 0.5) {
        const t = w.trees.get(id)!;
        t.work = (t.work + 1) % 6;
        if (!t.work) t.left = Math.max(0, t.left - 2);
        t.fell = t.left === 0;
      } else if (r < 0.65) w.trees.delete(id);
      else if (r < 0.8) {
        const t = w.trees.get(id)!;
        t.x += Math.floor(rand() * 20000) - 10000; // may cross cells
      } else if (r < 0.95) {
        w.trees.set(nextId, { x: Math.floor(rand() * 40000) - 20000, z: 0, left: 10, work: 0, fell: false });
        w.rep.touch('tree', nextId++);
        continue;
      } else {
        w.room.tune = (w.room.tune + 1) % 100;
        w.rep.touch('room', 0);
        continue;
      }
      w.rep.touch('tree', id);
    }
    w.rep.commit(step);
    if (step === 300) {
      subs[2] = cellsNear(5000, -5000, 6400); // a client walks to other cells
      w.rep.subscribe('c2', subs[2]);
    }
    w.rep.flush(
      step,
      (c, p) => assert.ok(mirrors[Number(c.slice(1))]!.apply(p, step * 16)),
      () => rand() < 0.7, // sockets back up at random
    );
  }
  w.rep.flush(601, (c, p) => assert.ok(mirrors[Number(c.slice(1))]!.apply(p)));
  subs.forEach((cells, k) => assert.deepEqual(seen(mirrors[k]!), expected(w, cells), `client ${k}`));
});

test('the mirror refuses malformed or out-of-order packets without changing anything', () => {
  const m = createMirror([treeSchema, roomSchema]);
  const whole = { x: 0, z: 0, left: 10, work: 0, fell: false };
  assert.ok(m.apply({ t: 's', tk: 10, c: [['tree', 1, whole]] }));
  const bad: unknown[] = [
    null,
    { t: 's', tk: 9, c: [['tree', 1, { left: 1 }]] }, // older than what we hold
    { t: 's', tk: 11, c: [['tree', 2, { left: 1 }]] }, // partial for an entity we don't hold
    { t: 's', tk: 11, c: [['tree', 1, { left: 'x' }]] },
    { t: 's', tk: 11, c: [['bush', 1, { left: 1 }]] },
    { t: 's', tk: 11, x: [['tree', 1]], c: [['tree', 1, { left: 1 }]] }, // despawned, then partial
    { t: 's', tk: 11, ack: [1] },
    {
      t: 's',
      tk: 11,
      c: [
        ['tree', 1, { left: 1 }],
        ['tree', 3, { left: 1 }],
      ],
    }, // one bad entry refuses all
  ];
  for (const p of bad) assert.equal(m.apply(p), false);
  assert.deepEqual(m.get('tree', 1), whole);
  assert.equal(m.stats.refused, bad.length);
  assert.ok(m.apply({ t: 's', tk: 11, x: [['tree', 1]], c: [['tree', 1, { ...whole, left: 4 }]] }), 'respawn whole');
  assert.equal(m.get('tree', 1)!.left, 4);
  assert.equal(m.step(100), 11 + 6, 'step estimate from tk stamps');
});

// The plan's prediction test on a toy: piles and carries, take/drop actions from several clients over a laggy,
// ordered link. Every client predicts with the same pure rule; after the final acks each prediction equals the server.
type Toy = { piles: Map<EntityId, number>; carry: Map<EntityId, number> };
type Act = { op: 'take' | 'drop'; pile: number };
const pileSchema = defineReplicated('pile', { n: 'u8' });
const carrySchema = defineReplicated('carry', { n: 'u8' });
function rule(s: Toy, pid: string, a: Act) {
  const n = s.piles.get(a.pile) ?? 0;
  const c = s.carry.get(pid) ?? 0;
  if (a.op === 'take' && n > 0 && c < 8) {
    s.piles.set(a.pile, n - 1);
    s.carry.set(pid, c + 1);
    return true;
  }
  if (a.op === 'drop' && c > 0 && n < 255) {
    s.piles.set(a.pile, n + 1);
    s.carry.set(pid, c - 1);
    return true;
  }
  return false;
}

for (const players of [2, 4, 6])
  test(`prediction: ${players} clients racing for piles converge on the server's state`, () => {
    const rand = mulberry32(players * 101);
    const server: Toy = { piles: new Map([0, 1, 2].map((k) => [k, 5])), carry: new Map() };
    const rep = createReplicator();
    rep.define({
      schema: pileSchema,
      ids: () => server.piles.keys(),
      project: (id) => ({ n: server.piles.get(id) ?? 0 }),
      cell: () => GLOBAL_CELL,
    });
    rep.define({
      schema: carrySchema,
      ids: () => server.carry.keys(),
      project: (id) => (server.carry.has(id) ? { n: server.carry.get(id)! } : null),
      cell: () => GLOBAL_CELL,
    });
    rep.touchAll('pile');
    rep.commit(0);
    const pids = Array.from({ length: players }, (_, k) => `p${k}`);
    type Wire = { at: number; data: unknown };
    const up: Wire[][] = pids.map(() => []);
    const down: Wire[][] = pids.map(() => []);
    const lag = pids.map(() => 1 + Math.floor(rand() * 12)); // one-way, in steps (up to 200 ms)
    const clients = pids.map((pid) => {
      const mirror = createMirror([pileSchema, carrySchema]);
      const predictor = createPredictor<Toy, Act>({
        confirmed: () => ({
          piles: new Map([...mirror.entries('pile')].map(([id, f]) => [id, f.n as number])),
          carry: new Map([...mirror.entries('carry')].map(([id, f]) => [id, f.n as number])),
        }),
        clone: (s) => ({ piles: new Map(s.piles), carry: new Map(s.carry) }),
        apply: (s, a) => void rule(s, pid, a),
      });
      predictor.session(1, 1);
      const c = { pid, mirror, predictor, corrections: 0 };
      // Refusals drop their actions, acks drop confirmed ones, and any packet rebuilds the prediction.
      mirror.onPacket((p) => {
        for (const [e, r] of p.rej ?? []) if (predictor.reject([e, r])) c.corrections++;
        if (p.ack) predictor.confirm(p.ack);
        predictor.invalidate();
      });
      return c;
    });
    pids.forEach((pid) => rep.addClient(pid));
    const applied = new Map<string, number>();
    for (let step = 1; step <= 1200; step++) {
      // Clients act: predicted at once, sent up.
      clients.forEach((c, k) => {
        if (step > 900 || rand() > 0.15) return;
        const a: Act = { op: rand() < 0.6 ? 'take' : 'drop', pile: Math.floor(rand() * 3) };
        const id = c.predictor.act(a, step);
        if (id) up[k]!.push({ at: step + lag[k]!, data: { id, a } });
      });
      // Server: apply what arrived, in arrival order; ack or refuse; touch what the rule touched.
      clients.forEach((c, k) => {
        while (up[k]!.length && up[k]![0]!.at <= step) {
          const { id, a } = up[k]!.shift()!.data as { id: [number, number]; a: Act };
          if (rule(server, c.pid, a)) {
            rep.touch('pile', a.pile);
            rep.touch('carry', c.pid);
            rep.ack(c.pid, id[0], id[1]);
          } else rep.reject(c.pid, id[0], id[1], 'raced');
          applied.set(c.pid, id[1]);
        }
      });
      rep.commit(step);
      rep.flush(step, (cid, p) => {
        const k = pids.indexOf(cid);
        down[k]!.push({ at: step + lag[k]!, data: p });
      });
      clients.forEach((c, k) => {
        while (down[k]!.length && down[k]![0]!.at <= step) c.mirror.apply(down[k]!.shift()!.data, step);
      });
    }
    const total = (s: Toy) => [...s.piles.values(), ...s.carry.values()].reduce((a, b) => a + b, 0);
    assert.equal(total(server), 15, 'conserved');
    for (const c of clients) {
      assert.equal(c.predictor.pending().length, 0, `${c.pid} drained`);
      const p = c.predictor.state();
      assert.deepEqual(p.piles, server.piles, `${c.pid} piles`);
      assert.deepEqual(
        new Map([...p.carry].filter(([, n]) => n > 0)),
        new Map([...server.carry].filter(([, n]) => n > 0)),
      );
      assert.ok(c.predictor.stats.acted > 0);
    }
    const refused = clients.reduce((n, c) => n + c.corrections, 0);
    assert.ok(refused > 0, 'contested piles and racing drops produce refusals the predictor settles');
  });

test('the prediction window caps unconfirmed actions; a new session retires the old window', () => {
  const p = createPredictor<number[], number>({
    confirmed: () => [],
    clone: (s) => [...s],
    apply: (s, a) => void s.push(a),
  });
  assert.equal(p.act(1), null, 'no session, no prediction');
  p.session(3, 10);
  for (let k = 0; k < PREDICTION_WINDOW; k++) assert.deepEqual(p.act(k, 0), [3, 10 + k]);
  assert.equal(p.act(99), null);
  assert.deepEqual(p.state(), [0, 1, 2, 3, 4, 5, 6, 7]);
  p.confirm([3, 12]);
  assert.deepEqual(p.state(), [3, 4, 5, 6, 7]);
  assert.equal(p.reject([3, 14]), true);
  assert.equal(p.reject([3, 14]), false, 'already settled');
  assert.deepEqual(p.state(), [3, 5, 6, 7]);
  assert.equal(p.stalled(999).length, 0);
  assert.equal(p.stalled(1000).length, 4, 'pending over a second: the stall cue');
  p.session(4, 1);
  assert.deepEqual(p.state(), []);
  assert.deepEqual(p.act(1), [4, 1]);
});

test('idle hash samples share the server step after staggered joins, backpressure and resync', () => {
  const w = toyWorld(3);
  w.rep.touchAll('tree');
  w.rep.touchAll('room');
  w.rep.commit(17);
  const mirrors = new Map(['a', 'b'].map((cid) => [cid, createMirror([treeSchema, roomSchema])]));
  const hashes = new Map(['a', 'b'].map((cid) => [cid, [] as number[]]));
  const pump = (step: number, blocked = '') =>
    w.rep.flush(
      step,
      (cid, p) => {
        assert.ok(mirrors.get(cid)!.apply(p));
        if (p.h !== undefined) hashes.get(cid)!.push(p.tk);
      },
      (cid) => cid !== blocked,
    );
  w.rep.addClient('a');
  pump(17);
  w.rep.addClient('b');
  pump(18);
  assert.deepEqual(
    [...mirrors.values()].map((m) => m.lastStep()),
    [17, 18],
    'whole sends happen on different steps',
  );
  // A private receipt also advances only its recipient; neither it nor the join time sets the periodic phase.
  w.rep.ack('a', 1, 1);
  pump(19);
  for (let step = 20; step <= HASH_STEPS; step++) pump(step);
  assert.deepEqual([...hashes.values()], [[HASH_STEPS], [HASH_STEPS]], 'idle clients share a periodic sample');
  assert.deepEqual(
    [...mirrors.values()].map((m) => m.lastStep()),
    [HASH_STEPS, HASH_STEPS],
  );
  for (const m of mirrors.values()) assert.deepEqual(seen(m), expected(w, 'all'));

  // A backed-up client gets its overdue hash when writable, then returns to the common phase.
  for (let step = HASH_STEPS + 1; step <= 2 * HASH_STEPS + 3; step++) pump(step, step < 2 * HASH_STEPS + 3 ? 'b' : '');
  assert.deepEqual(
    [...hashes.values()],
    [
      [HASH_STEPS, 2 * HASH_STEPS],
      [HASH_STEPS, 2 * HASH_STEPS + 3],
    ],
  );
  // A whole refill also keeps the common phase instead of starting another client-specific timer.
  mirrors.get('a')!.refill();
  w.rep.resync('a');
  pump(2 * HASH_STEPS + 7);
  for (let step = 2 * HASH_STEPS + 8; step <= 4 * HASH_STEPS; step++) pump(step);
  assert.deepEqual(
    [...hashes.values()],
    [
      [HASH_STEPS, 2 * HASH_STEPS, 3 * HASH_STEPS, 4 * HASH_STEPS],
      [HASH_STEPS, 2 * HASH_STEPS + 3, 3 * HASH_STEPS, 4 * HASH_STEPS],
    ],
    'no extra hash-only packets between boundaries after recovery or refill',
  );
  for (const m of mirrors.values()) {
    assert.equal(m.lastStep(), 4 * HASH_STEPS);
    assert.deepEqual(seen(m), expected(w, 'all'));
    assert.equal(m.stats.diverged, 0);
  }
});

test('a hash every HASH_STEPS catches a diverged mirror; a resync refills it whole, keeping the ack', () => {
  const w = toyWorld(40);
  w.rep.touchAll('tree');
  w.rep.touchAll('room');
  w.rep.commit(1);
  w.rep.addClient('a');
  const m = createMirror([treeSchema, roomSchema]);
  const diverged: string[] = [];
  m.onDiverged((why) => diverged.push(why));
  const pump = (step: number) => w.rep.flush(step, (_c, p) => m.apply(JSON.parse(JSON.stringify(p))));
  pump(1);
  assert.ok(m.whole());
  w.rep.ack('a', 1, 5);
  w.rep.emit({ op: 'x' });
  pump(2);
  // Nothing changed for a while: the client still hears a hash, and agrees.
  pump(1 + HASH_STEPS + 1);
  assert.deepEqual(diverged, []);
  // A bug-shaped divergence: the mirror's copy drifts without a packet.
  (m.get('tree', 3) as Fields).left = 99;
  pump(1 + 2 * HASH_STEPS + 2);
  assert.deepEqual(diverged, ['hash']);
  // A refused packet is a divergence too (the server already counts it as seen).
  assert.equal(m.apply({ t: 's', tk: 999999, c: [['tree', 3, { nope: 1 }]] }), false);
  assert.deepEqual(diverged, ['hash', 'refused']);
  // The owner resets and asks again: whole state, the ack kept, no replayed events.
  m.reset();
  w.rep.resync('a');
  const sent: ServerPacket[] = [];
  w.rep.flush(1 + 2 * HASH_STEPS + 3, (_c, p) => (sent.push(p), m.apply(p)));
  assert.ok(m.whole());
  assert.deepEqual(seen(m), expected(w, 'all'));
  assert.deepEqual(sent.at(-1)!.ack, [1, 5]);
  assert.ok(sent.every((p) => !p.ev));
  const rows = [...w.trees].map(([id, t]) => ['tree', id, { ...t }] as [string, EntityId, Fields]);
  rows.push(['room', 0, { ...w.room }]);
  const schemas = new Map([
    ['tree', treeSchema],
    ['room', roomSchema],
  ]);
  assert.equal(m.hash(), hashComponents(rows, schemas));
});

test('refusals queued for a backed-up client are capped; the ack still settles the dropped ones', () => {
  const w = toyWorld(1);
  w.rep.addClient('slow');
  for (let r = 1; r <= 5000; r++) {
    w.rep.ack('slow', 1, r);
    w.rep.reject('slow', 1, r, 'refused');
  }
  const sent: ServerPacket[] = [];
  w.rep.flush(1, (_c, p) => sent.push(p));
  const rej = sent.flatMap((p) => p.rej ?? []);
  assert.equal(rej.length, MAX_REJECTS);
  assert.deepEqual(rej[0], [1, 5000 - MAX_REJECTS + 1, 'refused']);
  assert.deepEqual(sent.at(-1)!.ack, [1, 5000]);
  const m = createMirror([treeSchema, roomSchema]);
  for (const p of sent) assert.ok(m.apply(JSON.parse(JSON.stringify(p))), 'well under the mirror list limit');
});
