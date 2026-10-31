// Replay: a host and two clients on the real rules and the home land play a seeded stream of every registered op
// (each rules module's `edits` generators, about a fifth of it junk). Midway the host dies and a client takes over,
// then a late joiner loads a snapshot over the wire (after a toss), and at the end a fresh tab reloads a JSON
// snapshot. Every live peer must hash every state the same at every tick they share, every module's invariants must
// hold, and a second run with the same seed must give the same results. See src/world/rules/README.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { RULES, installRules } from '../src/world/rules/index.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.mjs';
import { makeNet, run, live } from './helpers/net.mjs';

const SEED = 0xb2b3;
const RECORD_EVERY = 10; // ticks between recorded state hashes

function strHash(s) {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return h >>> 0;
}
function stream(seed) {
  const next = mulberry32(seed | 0);
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  return { next, int, pick: (a) => a[int(0, a.length - 1)], chance: (p) => next() < p };
}
const generators = Object.assign({}, ...RULES.map((m) => m.edits ?? {}));

// One tab. Its env (the host-only canPlantAt) differs per peer: it must not reach shared state.
function makePeer(seed, net, id, host) {
  const salt = strHash(id);
  const s = createSync({ env: { canPlantAt: (i, j) => (i * 7 + j * 13 + salt) % 5 !== 0 } });
  const rules = installRules(s, homeLand());
  const x = { id, s, rules, r: stream(seed ^ salt), applied: new Map(), hashes: new Map() };
  s.onApplied((e) => x.applied.set(e.op, (x.applied.get(e.op) ?? 0) + 1));
  s.onAfterTick((t) => {
    if (t % RECORD_EVERY === 0 && !x.hashes.has(t)) x.hashes.set(t, JSON.stringify(s.stateHashes()));
  });
  if (net) {
    x.p = net.add(id, host);
    s.attachWorld(x.p.room, { roomId: 'replay', storage: null, now: () => 1000 });
  } else {
    s.setSelfId(id);
    x.p = { alive: true };
  }
  return x;
}

function checkInvariants(x) {
  for (const m of RULES) {
    const why = m.invariants?.(x.rules[m.name], x.rules);
    assert.equal(why ?? null, null, `${x.id}: ${m.name} invariant broken at tick ${x.s.world.tick}: ${why}`);
  }
}

async function replay(seed) {
  const net = makeNet();
  const peers = [makePeer(seed, net, 'h', true), makePeer(seed, net, 'c1', false), makePeer(seed, net, 'c2', false)];
  // A head start, the same on every peer before tick 1 (clients replace it with the host's snapshot anyway): piles of
  // logs and ore to take, and the first site's Track ring full so a run can start (pours go to the Helper ring).
  for (const x of peers) {
    for (const [i, k] of [
      [212, 0],
      [230, 0],
      [250, 1],
    ])
      x.rules.piles.drop(i, 188, k, 64);
    x.rules.sites.addFreight(60);
  }
  const master = stream(seed);
  const ops = peers[0].s.registry().ops;
  for (const op of ops)
    assert.ok(generators[op], `op ${op} has no edit generator (export const edits in its rules module)`);
  for (const op of Object.keys(generators)) assert.ok(ops.includes(op), `generator for unregistered op ${op}`);

  let submitted = 0;
  // `frames` frames of 50 ms; on each, a random live peer submits one generated edit of a random op (or `only`).
  async function play(frames, only) {
    for (let f = 0; f < frames; f++) {
      const x = master.pick(live(peers));
      const op = only ?? master.pick(ops);
      const e = generators[op](x.r, { rules: x.rules, land: homeLand(), tick: x.s.world.tick });
      if (e) {
        x.s.submitEdit(e);
        submitted++;
      }
      await run(net, peers, 1);
    }
  }

  await run(net, peers, 6); // the host is up and both clients hold its snapshot
  await play(40);
  net.killHost(); // c1 takes over; c2 follows it once the old host has been silent long enough
  await run(net, peers, 64);
  await play(30);
  await play(8, 'gift.toss'); // a toss lands before the joiner copies the state fresh
  assert.ok(
    peers.some((x) => x.p.alive && x.applied.get('gift.toss')),
    'no toss applied before the joiner',
  );
  peers.push(makePeer(seed, net, 'late', false));
  await play(30);
  await run(net, peers, 10); // settle: every stamped edit applied everywhere

  // A fresh tab reloads the new host's snapshot through JSON and ticks alone, in step with the room.
  const host = live(peers).find((x) => x.p.host);
  const tab = makePeer(seed, null, 'tab');
  assert.equal(tab.s.loadSnapshot(JSON.parse(JSON.stringify(host.s.snapshot()))), true);
  await run(net, peers, 2 * 2 * RECORD_EVERY); // 20 ticks: two recorded ones
  while (tab.s.world.tick < host.s.world.tick) tab.s.updateWorld(0.1);

  const alive = [...live(peers), tab];
  for (const x of alive) checkInvariants(x);
  for (const x of live(peers)) {
    const st = x.s.worldStatus();
    assert.equal(st.hashBad, 0, `${x.id} saw a hash mismatch: ${JSON.stringify(st.lastBad)}`);
  }
  // Every peer (the dead host too, until it died) recorded the same state hashes at every tick it shares with the host.
  for (const x of [...peers, tab]) {
    let shared = 0;
    for (const [t, h] of x.hashes)
      if (host.hashes.has(t)) {
        shared++;
        assert.equal(h, host.hashes.get(t), `${x.id} and ${host.id} differ at tick ${t}`);
      }
    assert.ok(shared >= 2, `${x.id} shares only ${shared} recorded ticks with the host`);
  }
  const applied = new Set(peers.flatMap((x) => [...x.applied.keys()]));
  for (const op of ops) assert.ok(applied.has(op), `the host never accepted a ${op}`);
  return {
    submitted,
    applied: Object.fromEntries([...host.applied].sort()),
    hashes: [...host.hashes],
    final: host.s.stateHashes(),
  };
}

test('a seeded stream of every op stays in step across host loss, a late joiner and a snapshot reload', async () => {
  const a = await replay(SEED);
  const b = await replay(SEED);
  assert.deepEqual(b, a, 'the same seed gave different results');
});
