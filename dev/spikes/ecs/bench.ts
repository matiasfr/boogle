// The spike's measurements, the same in Node (./bench-node.ts) and headless Chromium (./bench-browser.ts).
import { createInHouse } from './inhouse.ts';
import { createKoota } from './koota.ts';
import { createSoa } from './soa.ts';
import { createBitecs } from './bitecs.ts';
import { bitecsOrder } from './bitecs-order.ts';
import { mulberry32, populate, step, type Slice } from './schema.ts';

export const OPTIONS: (() => Slice)[] = [createInHouse, createKoota, createSoa, createBitecs];
const now = () => performance.now();
// The ops of tick t depend only on t: any peer, however it got to t, plays the same stream.
let heat = 1;
const tickOps = (s: Slice, n: number) => step(s, mulberry32(1000 + s.tick), n, heat);

function fresh(make: () => Slice, n: number): Slice {
  const s = make();
  populate(s, mulberry32(1), n);
  s.view.rebuild();
  return s;
}
const median = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]!;
const size = (snap: string | Uint8Array) =>
  typeof snap === 'string' ? new TextEncoder().encode(snap).length : snap.length;

export type Timing = {
  option: string;
  n: number;
  heat: number;
  live: number;
  tickUs: number;
  syncUs: number;
  rebuildUs: number;
  hashUs: number;
  snapshotUs: number;
  snapshotBytes: number;
  lateJoinUs: number;
  churnPerTick: number; // spawns plus despawns per sim tick, all kinds
};

export function time(make: () => Slice, n: number, ticks = 600, repeats = 5): Timing {
  const s = fresh(make, n);
  for (let k = 0; k < 200; k++) {
    tickOps(s, n);
    s.view.sync();
  }
  let churn = 0;
  for (let k = 0; k < 100; k++) {
    const before = new Set(s.order());
    tickOps(s, n);
    s.view.sync();
    const after = s.order();
    churn += after.filter((id) => !before.delete(id)).length + before.size;
  }
  const tick: number[] = [],
    sync: number[] = [];
  for (let r = 0; r < repeats; r++) {
    let simT = 0,
      viewT = 0;
    for (let k = 0; k < ticks; k++) {
      const a = now();
      tickOps(s, n);
      const b = now();
      s.view.sync();
      viewT += now() - b;
      simT += b - a;
    }
    tick.push((simT / ticks) * 1000);
    sync.push((viewT / ticks) * 1000);
  }
  const avg = (fn: () => unknown, k: number) => {
    const a = now();
    for (let c = 0; c < k; c++) fn();
    return ((now() - a) / k) * 1000;
  };
  const snap = s.snapshot();
  const lateJoin: number[] = [];
  for (let r = 0; r < 5; r++) {
    const peer = make();
    const a = now();
    peer.load(snap);
    peer.view.rebuild();
    lateJoin.push((now() - a) * 1000);
    peer.dispose?.();
  }
  const result = {
    option: s.name,
    n,
    heat,
    live: s.order().length,
    tickUs: median(tick),
    syncUs: median(sync),
    rebuildUs: avg(() => s.view.rebuild(), 20),
    hashUs: avg(() => s.hash(), 50),
    snapshotUs: avg(() => s.snapshot(), 20),
    snapshotBytes: size(snap),
    lateJoinUs: median(lateJoin),
    churnPerTick: churn / 100,
  };
  s.dispose?.();
  return result;
}

export type Determinism = {
  option: string;
  hashes: string; // A's hash every 100 ticks
  sameHash: boolean; // A (plain), B (local churn in the same container), C (late joiner from B's snapshot at tick 300)
  sameOrder: boolean; // lockstep iteration order, A vs C
  nativeSame: boolean | null; // the library's own query order, A vs C (null: no separate native order)
};

export function determinism(make: () => Slice, n: number): Determinism {
  const a = fresh(make, n),
    b = fresh(make, n);
  const hashes: number[] = [];
  for (let k = 0; k < 300; k++) {
    tickOps(a, n);
    a.view.sync();
    if (a.tick % 100 === 0) hashes.push(a.hash());
    b.localNoise?.(50);
    tickOps(b, n);
    b.view.sync();
  }
  const c = make();
  c.load(b.snapshot());
  c.view.rebuild();
  for (let k = 0; k < 300; k++) {
    for (const s of [a, b, c]) {
      tickOps(s, n);
      s.view.sync();
    }
    if (a.tick % 100 === 0) hashes.push(a.hash());
  }
  const same = (x: number[], y: number[]) => x.length === y.length && x.every((v, k) => v === y[k]);
  const out = {
    option: a.name,
    hashes: hashes.map((h) => h.toString(16)).join(' '),
    sameHash: a.hash() === b.hash() && a.hash() === c.hash(),
    sameOrder: same(a.order(), c.order()) && same(a.order(), b.order()),
    nativeSame: a.nativeOrder ? same(a.nativeOrder(), c.nativeOrder!()) : null,
  };
  for (const s of [a, b, c]) s.dispose?.();
  return out;
}

export function runAll(sizes = [300, 3000]) {
  const det = OPTIONS.map((make) => determinism(make, 3000));
  const timings: Timing[] = [];
  for (const n of sizes) for (const make of OPTIONS) timings.push(time(make, n));
  heat = 5; // heavy churn at the largest size
  for (const make of OPTIONS) timings.push(time(make, sizes[sizes.length - 1]!));
  heat = 1;
  return {
    timings,
    determinism: det,
    crossOption: new Set(det.map((d) => d.hashes)).size === 1,
    bitecs: bitecsOrder(),
  };
}
