// `?proto=net&v=depot`: the network helps you haul instead of hauling for you (docs/decisions.md, "leaning:
// junctions unlock the network"; open question 11), after Death Stranding's auto-pavers fed from nearby stock. Connect a
// camp and a depot goes up beside the line just laid; the wagon brings the town's yellow crates out and throws them off
// as it passes; one press takes a whole section's load on your back, and you carry it to the open ring. Depot 2 stands
// much nearer its ring than depot 1 does, so each junction makes the next haul easier
// (docs/research/compounding-infrastructure.md, summary 1, recs 1 and 5: a depot that lets you build at the frontier, one
// bundle in at most 30 s; carrying-and-logistics-play.md, rec 12: quantity as a physical heap). Serves DESIGN.md 1.
//
// Sync: no new state or ops, after the haul prototype's sandbar (../haul/wave.ts). The far palms' bundles move here
// (`haulHooks.moved`), so a load is several `src.take`s at once, counted and refilled by the same lockstep sources.
// What's on your back stays logs; the crates are Local, counted in this tab, and a reload finds a standing depot stocked.
import { scene } from '../../render/scene.ts';
import * as THREE from 'three/webgpu';
import { rules } from '../../world/game-world.ts';
import { onApplied, submitEdit } from '../../world/sync.ts';
import { net } from '../../netplay/net.ts';
import { identity } from '../../player/identity.ts';
import { me } from '../../player/player.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { haulHooks } from '../../player/haul-hooks.ts';
import { cellX, cellZ, groundHeight } from '../../island/terrain.ts';
import { fly } from '../../render/haul-pieces.ts';
import { ROUTE, TRACK } from '../../sim/route.ts';
import { YIELD } from '../../sim/sources.ts';
import { materialOf } from '../../sim/materials.ts';
import type { WagonState } from '../../sim/wagon.ts';
import { wagonApi } from '../wagon/index.ts';
import { P, poles, stopAt, wakeCamp, type Camp, type Piece } from './camps.ts';
import {
  deckCount,
  deckFree,
  heap,
  hopOff,
  hopOn,
  hopTo,
  nextSlot,
  topSlot,
  type Deck,
  type Heap,
  type Kind,
} from '../../render/crates.ts';

const DEPOT_TUNE = {
  sites: [
    { back: 56, side: 5.5, cap: 9, drop: 3, starter: 0 }, // beside section 0, 56 m short of the ring at Camp 1
    { back: 28, side: -5.5, cap: 14, drop: 4, starter: 3 }, // beside section 1, 28 m short of Camp 2's ring, and it goes up stocked: the easier trip
  ],
  crateTakes: 2, // src.takes (of 4 logs) a crate gives: 8 logs
  loadCrates: 3, // crates one press takes: 24 logs, a whole section
  palmsWithin: 45, // m from the first stop a palm keeps its bundle; the others' move to the depots
  carried: 4, // yellow crates the wagon takes out of the village per trip
  reach: 4.5, // m from the stack's middle
  throwAt: 6, // m from abeam of the depot, the wagon throws its crates
};

const DECK = '#6b4a2b',
  POST = '#c9a86a',
  FLAG = '#ff7a2f';
// Level on a plinth (the hill runs under it). Open, so you can see the stack from the line and from the path to the ring;
// the flag reads from up the track.
const PIECES: Piece[] = [
  ...poles(5.4, 5.4, 4),
  P(1, 0, -1.3, 0, 5.4, 1.42, 5.4, DECK),
  P(3, 2.6, 0.12, -2.6, 0.3, 7, 0.3, POST),
  P(3, 1.5, 6.1, -2.6, 2, 1.2, 0.12, FLAG),
];

type Depot = {
  camp: Camp;
  heap: Heap;
  cap: number;
  drop: number;
  starter: number;
  at: THREE.Vector2;
  up: number;
  near: boolean;
};
const depots: Depot[] = DEPOT_TUNE.sites.map((d, k) => {
  const a = ROUTE[k]!,
    b = stopAt(k + 1);
  const len = Math.hypot(b.x - a.x, b.z - a.z),
    ux = (b.x - a.x) / len,
    uz = (b.z - a.z) / len;
  const lx = b.x - ux * d.back,
    lz = b.z - uz * d.back;
  const x = lx - uz * d.side,
    z = lz + ux * d.side;
  const camp: Camp = {
    stop: k + 1,
    kind: 'wood',
    x,
    z,
    yaw: 0,
    pieces: PIECES,
    pile: { x, z },
    door: { x, z },
    stack: null,
    from: { x: lx, z: lz },
    flat: true,
  };
  return {
    camp,
    heap: heap(x, z, 3),
    cap: d.cap,
    drop: d.drop,
    starter: d.starter,
    at: new THREE.Vector2(lx, lz),
    up: Infinity,
    near: false,
  };
});

// ---------------------------------------------------------------- the moved bundles
const pool: number[] = [];
function claim() {
  const list = rules.sources.list();
  if (!list.length || pool.length) return pool.length > 0;
  // Every bundle away from the village: the first section is hauled from the palms, the rest from the depots.
  const home = stopAt(0);
  list.forEach((p, id) => {
    if (Math.hypot(cellX(p.i) - home.x, cellZ(p.j) - home.z) > DEPOT_TUNE.palmsWithin) pool.push(id);
  });
  haulHooks.moved = (id) => pool.includes(id);
  rules.sources.sources.rev++; // the palms redraw without them (rev is for views: neither saved nor hashed)
  return true;
}
const poolCharges = () => pool.reduce((t, id) => t + rules.sources.charges(id), 0);

/** `load` is the wagon's rear flatbed; `redraw` after a heap changes. */
export function createDepots(load: Deck, redraw: () => void) {
  let from: Depot | null = null, // the depot the takes under way come from
    pendingAt = -1e9,
    taken = 0; // takes since the last crate came off
  const top = new THREE.Vector3();

  registerInteractable(() => {
    if (!me.body || !claim()) return NO_TARGETS;
    const pos = me.body.interpolatedPosition;
    const now = performance.now();
    const open = rules.sites.sites.open;
    const pid = identity.pid;
    if (open >= ROUTE.length || !pid || now - pendingAt < 1500) return NO_TARGETS;
    let out: Interactable[] | null = null;
    for (const d of depots) {
      if (now < d.up || Math.hypot(d.heap.x - pos.x, d.heap.z - pos.z) > DEPOT_TUNE.reach) continue;
      topSlot(d.heap, top);
      const t = { id: `depot${d.camp.stop}`, verb: 'Take logs', at: new THREE.Vector3(top.x, top.y + 0.8, top.z) };
      // At most what the open ring still wants: a load is one section, not the next one too.
      const want = rules.sites.room(open, TRACK) - rules.stacks.count(pid);
      const room = rules.stacks.room(pid, materialOf(rules.sites.age()));
      const crates = Math.min(d.heap.list.length, DEPOT_TUNE.loadCrates);
      const n = Math.min(
        crates * DEPOT_TUNE.crateTakes,
        Math.ceil(want / YIELD),
        Math.floor(room / YIELD),
        poolCharges(),
      );
      if (!d.heap.list.length) (out ??= []).push({ ...t, blocked: 'No crates yet' });
      else if (n <= 0) (out ??= []).push({ ...t, blocked: 'Full load' });
      else
        (out ??= []).push({
          ...t,
          run: () => {
            let sent = 0;
            for (const id of pool)
              for (let c = rules.sources.charges(id); c > 0 && sent < n; c--)
                if (submitEdit({ op: 'src.take', i: 0, j: 0, id })) sent++;
            if (sent) {
              from = d;
              pendingAt = now;
            }
          },
        });
    }
    return out ?? NO_TARGETS;
  });

  // The crates come off the stack as their logs land on your back: a submitted take can still be rejected.
  onApplied((e: { op: string; p: string; id: number }, _tick: number, r: { n?: number } | null) => {
    if (e.op !== 'src.take' || !pool.includes(e.id) || !r?.n || !from) return;
    if (e.p !== (net.room?.selfId ?? 'local')) return;
    topSlot(from.heap, top);
    fly(top, r.n);
    if (++taken >= DEPOT_TUNE.crateTakes) {
      taken = 0;
      from.heap.list.pop();
      redraw();
    }
  });

  const rearAt = new THREE.Vector3(),
    to = new THREE.Vector3();
  const frame = wagonApi.cars[wagonApi.cars.length - 1]!.rock;
  /** The wagon throws yellow crates off as it passes the depot that serves the open ring. */
  function stock(d: Depot) {
    frame.getWorldPosition(rearAt);
    const dist = Math.hypot(rearAt.x - d.at.x, rearAt.z - d.at.y);
    if (dist > DEPOT_TUNE.throwAt * 2) d.near = false;
    if (d.near || dist > DEPOT_TUNE.throwAt) return;
    d.near = true;
    let n = 0;
    load.held.forEach((c, k) => {
      const have = d.heap.list.length + n;
      if (c?.kind !== 'fill' || n >= d.drop || have >= d.cap) return;
      nextSlot({ ...d.heap, list: new Array<Kind>(have) }, to); // its own slot, though the ones before it are in the air
      hopOff(load, k, to, n++ * 0.14, () => {
        d.heap.list.push('fill');
        redraw();
      });
    });
  }

  return {
    list: depots,
    pool,
    heaps: depots.map((d) => d.heap),
    /** Stop k connected: its depot goes up (`live`), or just stands, stocked (a reload). */
    wake(k: number, live: boolean) {
      const d = depots[k - 1];
      if (!d) return;
      const secs = wakeCamp(d.camp, live);
      d.up = performance.now() + secs * 1000;
      if (!live) d.heap.list = new Array<Kind>(d.cap).fill('fill');
      else if (d.starter) {
        // The junction pays off at once: its first load lands with the last of the build, from the line beside it.
        const line = to.set(d.at.x, groundHeight(d.at.x, d.at.y) + 1, d.at.y).clone();
        for (let n = 0; n < d.starter; n++) {
          nextSlot({ ...d.heap, list: new Array<Kind>(n) }, to);
          hopTo(
            'fill',
            line,
            to,
            secs - 1 + n * 0.2,
            () => {
              d.heap.list.push('fill');
              redraw();
            },
            scene,
          );
        }
      }
    },
    /** At the village: yellow crates hop on from `at`, for the depot that wants them or the next one to go up. */
    atVillage(at: THREE.Vector3) {
      const open = rules.sites.sites.open;
      if (!open || open >= ROUTE.length) return;
      const n = DEPOT_TUNE.carried - deckCount(load, 'fill');
      for (let k = 0; k < n && deckFree(load) >= 0; k++) hopOn(load, 'fill', at, k * 0.2);
    },
    reset() {
      for (const d of depots) {
        d.up = Infinity;
        d.near = false;
        d.heap.list = [];
      }
      from = null;
      taken = 0;
    },
    update(now: number, w: WagonState | null) {
      claim();
      if (!w || w.stop >= 0) return;
      const d = depots[rules.sites.sites.open - 1];
      if (d && now > d.up) stock(d);
    },
  };
}
