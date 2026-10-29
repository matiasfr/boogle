// World sync: tick clock + edit pipeline + state registry. See README.md for the contract.
// LOCAL-ONLY placeholder: edits are applied on this client at the next tick. The networked version
// (host stamps ticks, broadcasts edits, snapshots + hashes, late join, persistence) replaces the internals.

export const TICK_MS = 100;

export const world = { tick: 0, seed: 20261028, epochMs: 0 };

const ops = new Map();
const states = new Map();
const tickFns = [];
const appliedFns = [];
let queue = []; // [{ tick, seq, edit }]
let seq = 0;
let selfId = 'local';
let acc = 0;

export function registerOp(op, handlers) {
  ops.set(op, handlers);
}
export function registerState(key, handlers) {
  states.set(key, handlers);
}
export function onTick(fn) {
  tickFns.push(fn);
}
export function onApplied(fn) {
  appliedFns.push(fn);
}
export function setSelfId(id) {
  selfId = id;
}

export function submitEdit(edit) {
  const e = { ...edit, p: selfId };
  const h = ops.get(e.op);
  if (!h || !Number.isInteger(e.i) || !Number.isInteger(e.j)) return false;
  if (h.validate && !h.validate(e, { from: selfId, tick: world.tick })) return false;
  queue.push({ tick: world.tick + 1, seq: seq++, edit: e });
  return true;
}

function step() {
  const t = world.tick + 1;
  const due = queue.filter((q) => q.tick <= t).sort((a, b) => a.tick - b.tick || a.seq - b.seq);
  queue = queue.filter((q) => q.tick > t);
  world.tick = t;
  for (const { edit } of due) {
    ops.get(edit.op).apply(edit, t);
    for (const fn of appliedFns) fn(edit, t);
  }
  for (const fn of tickFns) fn(t);
}

// Called from the frame loop with real elapsed seconds; runs whole ticks only.
export function updateWorld(dt) {
  acc += dt * 1000;
  let n = 0;
  while (acc >= TICK_MS && n++ < 5) {
    acc -= TICK_MS;
    step();
  }
  if (n >= 5) acc = 0;
}

export function snapshot() {
  const data = {};
  for (const [k, s] of states) data[k] = s.serialize();
  return { tick: world.tick, seed: world.seed, epochMs: world.epochMs, data };
}
export function loadSnapshot(snap) {
  world.tick = snap.tick;
  world.seed = snap.seed;
  world.epochMs = snap.epochMs;
  for (const [k, s] of states) if (k in snap.data) s.load(snap.data[k]);
}
export function worldHash() {
  let h = world.tick | 0;
  for (const [, s] of states) h = (Math.imul(h ^ s.hash(), 16777619) >>> 0) | 0;
  return h >>> 0;
}
