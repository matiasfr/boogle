// The rail loop (docs/plans/find-the-fun.md step 6; loaded by src/features/proto-net.ts behind ?proto=net, on the line
// of dev/layouts/net-line.json). Gut question: when the village steps up, do you want to go connect the next camp?
// After Death Stranding's auto-pavers and monorails (docs/decisions.md, 2026-11-02): connect a camp and its
// goods get on the line by themselves, the town grows from what arrives, and the grown town gives back what extends
// your reach: a faster train, and the rail filling the next work site (docs/research/carrying-and-logistics-play.md,
// finding 2 and rec 7). `&v=haul` never fills it: you still haul every section by hand, to tell which part is the fun.
// `&v=depot` never fills it either: the wagon stocks trackside depots and you carry from those (./depot.ts).
// Serves DESIGN.md 1 (Toys before chores) and 9 (Leave something for the next visitor).
//
// What's shared and what isn't: laid sections are the room's (`rules.sites`), the section cost and the train's pace are
// `tune.set` and a filled ring is `tune.fill` (all accepted in `proto-` rooms). Everything else (crates, camps' piles,
// the town's stage) is counted in this tab and kept in localStorage per room, so a reload keeps your place. No counters
// or progress bars: the heap, the load and the buildings are the readout.
import { scene } from '../../render/scene.ts';
import './net.css';
import * as THREE from 'three/webgpu';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { submitEdit, onApplied, world, worldStatus } from '../../world/sync.ts';
import { getRoomId } from '../../netplay/net.ts';
import { isProtoRoom, paceIn } from '../../sim/tune.ts';
import { ROUTE, TRACK, RING_R, ringAt } from '../../sim/route.ts';
import { groundHeight } from '../../island/terrain.ts';
import { wagonApi } from '../wagon/index.ts';
import { protoV } from '../flags.ts';
import { protoCount } from '../count.ts';
import { createTimetable } from './timetable.ts';
import { drawRails } from './rails.ts';
import { updateTown, resetTown } from './town.ts';
import { createDepots } from './depot.ts';
import { CAMPS, campAt, stopAt, wakeCamp, sleepCamps, updateCamps, buildFrontier } from './camps.ts';
import {
  deck,
  deckCount,
  deckFree,
  drawHeaps,
  hopOff,
  hopOn,
  hopTo,
  heap,
  nextSlot,
  topSlot,
  updateCrates,
  clearCrates,
  type Heap,
  type Kind,
} from '../../render/crates.ts';

const { sites } = rules.sites;
const { tune } = rules.tune;
const FILLS = protoV('net') !== 'haul' && protoV('net') !== 'depot'; // step 6's second gift: the variants never get it

const TUNE = {
  cost: 24, // logs a section costs: a handful of takes
  cruise: [65, 100], // cm per tick before and after the first step-up (6.5 to 10 m/s)
  accel: 20, // ticks to reach it
  stepWood: 6, // wood crates at the village: stage 1
  stepStone: 6, // stone crates at the village: stage 2
  fill: 4, // crates into the open ring before it counts as full
  pileEvery: 1.8, // s per crate a working camp makes
  pileMax: 14,
  stagger: 0.2, // s between crates of one drop
  firstHop: 0.5, // s after the wagon stands
};

// ---------------------------------------------------------------- the wagon's new timetable and feel
wagonApi.setTimetable(
  createTimetable(
    () => sites.open,
    () => paceIn(tune),
  ),
);
// The joints and the chuffs say how fast you're going. Softer than the wagon's lively feel, whose rock grows with speed
// and whose smoke hides the view at 10 m/s.
Object.assign(wagonApi.FEEL, { rock: 0.012, bounce: 0.03, puffs: 0.7, puffSize: 1, shake: 0.6 });
const rear = wagonApi.cars[wagonApi.cars.length - 1]!;
const load = deck(rear.rock.children[0]!, (v) => void (rear.dipV += v), scene);

// ---------------------------------------------------------------- local state, kept per room
const KEY = `boogle-net-v1:${getRoomId()}`;
type Saved = { stage: number; wood: number; stone: number; heap: Kind[]; piles: Kind[][] };
const village = heap(stopAt(0).x + 4.2, stopAt(0).z + 3, 4);
const piles = CAMPS.map((c) => heap(c.pile.x, c.pile.z, 3));
const depots = protoV('net') === 'depot' ? createDepots(load, () => drawHeaps(allHeaps, scene)) : null;
const allHeaps: Heap[] = [village, ...piles, ...(depots?.heaps ?? [])];
const s = { stage: 0, wood: 0, stone: 0 };
function restore() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null') as Saved | null;
    if (!j) return;
    s.stage = j.stage | 0;
    s.wood = j.wood | 0;
    s.stone = j.stone | 0;
    village.list = j.heap ?? [];
    j.piles?.forEach((list, k) => piles[k] && (piles[k]!.list = list));
  } catch {
    // no storage, or an old shape: start fresh
  }
}
function save() {
  try {
    const j: Saved = { ...s, heap: village.list, piles: piles.map((p) => p.list) };
    localStorage.setItem(KEY, JSON.stringify(j));
  } catch {
    // private mode: a reload starts the town over
  }
}
restore();

// ---------------------------------------------------------------- the beats
let ready = false,
  snap = true, // the next town draw snaps instead of playing
  woke = 0, // camps awake (a camp k wakes when section k-1 is laid), as drawn
  built: number[] = CAMPS.map(() => Infinity), // performance.now() when each camp starts working
  wasOpen = 0,
  madeAt = 0;
let filling = -1; // the ring the rail has dropped its crates in

function startOver() {
  clearCrates(load);
  s.stage = s.wood = s.stone = 0;
  village.list = [];
  for (const p of piles) p.list = [];
  depots?.reset();
  drawHeaps(allHeaps, scene);
  sleepCamps();
  resetTown();
  snap = true;
  woke = 0;
  built = CAMPS.map(() => Infinity);
  wasOpen = 0;
  filling = -1;
  save();
}
onApplied((e: { op: string }) => e.op === 'tune.reset' && startOver());

// Camps stand once the line reaches them; a live arrival is construction you can watch, a reload just stands.
function wake(open: number, running: number, live: boolean) {
  // the whistle at the section's end counts as arriving: the machine is there
  const reached = Math.max(open, running);
  for (; woke < reached; woke++) {
    const k = woke + 1; // stop
    const camp = campAt(k);
    if (!camp) continue;
    const secs = wakeCamp(camp, live);
    built[CAMPS.indexOf(camp)] = performance.now() + secs * 1000;
    depots?.wake(k, live);
  }
}

// A working camp makes a crate every so often: it hops out of the door onto the pile.
const doorAt = new THREE.Vector3(),
  landAt = new THREE.Vector3();
function make(now: number) {
  if (now < madeAt) return;
  madeAt = now + (TUNE.pileEvery * 1000) / Math.max(1, CAMPS.filter((_, k) => now > built[k]!).length);
  let best = -1;
  CAMPS.forEach((c, k) => {
    if (now <= built[k]! || piles[k]!.list.length >= TUNE.pileMax) return;
    if (best < 0 || piles[k]!.list.length < piles[best]!.list.length) best = k;
  });
  if (best < 0) return;
  const c = CAMPS[best]!,
    p = piles[best]!;
  doorAt.set(c.door.x, groundHeight(c.door.x, c.door.z) + 0.6, c.door.z);
  nextSlot(p, landAt);
  hopTo(
    c.kind,
    doorAt,
    landAt,
    0,
    () => {
      p.list.push(c.kind);
      drawHeaps(allHeaps, scene);
      save();
    },
    scene,
  );
}

// ---------------------------------------------------------------- the wagon at a stop
let dwell = -1, // the stop it stands at, this dwell (-1: moving)
  jobs: { at: number; run: () => void }[] = [],
  dwellT = 0;
const ground = new THREE.Vector3();

function arrive(stop: number, leaves: number) {
  dwellT = 0;
  jobs = [];
  let t = TUNE.firstHop;
  if (stop === 0) {
    // Goods hop off into the heap; the town counts them.
    load.held.forEach((c, k) => {
      if (!c || c.kind === 'fill') return;
      const kind = c.kind;
      jobs.push({
        at: (t += TUNE.stagger),
        run: () => {
          nextSlot(village, ground);
          hopOff(load, k, ground, 0, () => land(kind));
        },
      });
    });
    // Once the village has stepped up, the rail fills the next site: the town's own crates ride out to the railhead.
    if (FILLS) jobs.push({ at: t + 0.7, run: sendFill });
    if (depots) jobs.push({ at: t + 0.7, run: () => depots.atVillage(topSlot(village, ground)) });
  } else {
    if (FILLS && stop === sites.open) jobs.push({ at: t, run: dropFill });
    const camp = campAt(stop);
    if (camp && leaves < 0) jobs.push({ at: t + TUNE.stagger * TUNE.fill + 0.4, run: () => loadGoods(camp.stop) });
  }
}
function sendFill() {
  const open = sites.open;
  if (s.stage < 1 || open >= ROUTE.length || rules.sites.room(open, TRACK) <= 0 || deckCount(load, 'fill')) return;
  if (filling === open) return;
  topSlot(village, ground);
  for (let k = 0; k < TUNE.fill; k++) hopOn(load, 'fill', ground, k * TUNE.stagger);
}
function dropFill() {
  const open = sites.open;
  if (open >= ROUTE.length || !deckCount(load, 'fill') || rules.sites.room(open, TRACK) <= 0) return;
  filling = open;
  const r = ringAt(open, TRACK);
  let left = deckCount(load, 'fill'),
    n = 0;
  load.held.forEach((c, k) => {
    if (c?.kind !== 'fill') return;
    const a = (n / TUNE.fill) * Math.PI * 2;
    const to = new THREE.Vector3(r.x + Math.cos(a) * RING_R * 0.4, 0, r.z + Math.sin(a) * RING_R * 0.4);
    to.y = groundHeight(to.x, to.z) + 0.4;
    hopOff(load, k, to, n++ * TUNE.stagger, () => {
      if (--left) return;
      submitEdit({ op: 'tune.fill', i: 0, j: 0 });
      protoCount('rail fills');
    });
  });
}
function loadGoods(stop: number) {
  const k = CAMPS.findIndex((c) => c.stop === stop);
  if (k < 0) return;
  const p = piles[k]!;
  let n = 0;
  while (p.list.length && deckFree(load) >= 0) {
    topSlot(p, ground);
    const kind = p.list.pop()!;
    hopOn(load, kind, ground, n++ * TUNE.stagger);
  }
  if (n) {
    drawHeaps(allHeaps, scene);
    save();
  }
}
// A crate landed on the village's heap. The town grows when enough have come; the stage is checked each frame.
function land(kind: Kind) {
  village.list.push(kind);
  if (kind === 'wood') s.wood++;
  if (kind === 'stone') s.stone++;
  drawHeaps(allHeaps, scene);
  save();
}
function stageWanted(): number {
  let st = s.stage;
  if (st === 0 && s.wood >= TUNE.stepWood) st = 1;
  if (st === 1 && s.stone >= TUNE.stepStone) st = 2;
  if (st === 2 && sites.open >= ROUTE.length) st = 3; // the line reaches the frontier: the town at its biggest
  return st;
}

// ---------------------------------------------------------------- the room's numbers, set on load
let lastSet = 0;
function tuneRoom(now: number) {
  if (now - lastSet < 1000) return;
  const want: [string, number][] = [
    ['cost0', TUNE.cost],
    ['wagonAccel', TUNE.accel],
    ['wagonCruise', TUNE.cruise[s.stage >= 1 ? 1 : 0]!],
  ];
  for (const [key, v] of want)
    if (tune.v[key as keyof typeof tune.v] !== v) {
      if (key === 'cost0' && !rules.sites.sites.list[sites.open]) continue;
      submitEdit({ op: 'tune.set', i: 0, j: 0, key, v });
      lastSet = now;
    }
}

// ---------------------------------------------------------------- the frame
const proto = isProtoRoom(getRoomId());
onFrame(
  ({ dt, now }) => {
    if (!ready) {
      if (!worldStatus().ready || world.tick <= 0) return;
      ready = true;
      buildFrontier();
      // A room started over elsewhere, or a browser that was never here.
      if (sites.open === 0 && s.stage > 0) startOver();
      woke = 0;
      wake(sites.open, 0, false);
      wasOpen = sites.open;
      drawHeaps(allHeaps, scene);
    }
    if (proto) tuneRoom(now);
    // Sections
    const open = sites.open;
    const site = sites.list[open];
    const run = site && site.t0 >= 0 ? rules.sites.run(open, world.tick) : null;
    const running = run?.name === 'whistle' ? open + 1 : 0;
    wake(open, running, true);
    if (open > wasOpen) protoCount('links', open - wasOpen);
    wasOpen = open;
    drawRails();
    updateCamps(dt, open);
    make(now);
    updateCrates(dt);
    // The wagon's stops
    const w = wagonApi.state;
    depots?.update(now, w);
    const stop = w ? w.stop : -1;
    if (stop >= 0 && stop !== dwell) arrive(stop, w!.dir);
    dwell = stop;
    if (stop >= 0) {
      dwellT += dt;
      for (let k = jobs.length - 1; k >= 0; k--)
        if (dwellT >= jobs[k]!.at) {
          jobs[k]!.run();
          jobs.splice(k, 1);
        }
    }
    // The town
    const st = stageWanted();
    if (st !== s.stage) {
      s.stage = st;
      save();
      protoCount('step-ups');
    }
    updateTown(s.stage, dt, snap);
    snap = false;
  },
  { phase: 'update', order: 10 }, // after the wagon places its cars (6), animates them (8) and shows its freight (9)
);

// ---------------------------------------------------------------- the panel
const box = document.createElement('div');
box.className = 'net-proto';
const btn = (text: string, fn: () => void) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('click', fn);
  box.append(b);
  return b;
};
btn('Start over', () => submitEdit({ op: 'tune.reset', i: 0, j: 0 }));
const skip = btn('Skip the haul', () => submitEdit({ op: 'tune.fill', i: 0, j: 0 }));
(document.querySelector('.hud') ?? document.body).append(box);
onFrame(
  () => {
    skip.disabled = !proto || sites.open >= ROUTE.length || rules.sites.room(sites.open, TRACK) <= 0;
  },
  { phase: 'late', order: 123 },
);

// For the look evals (a look eval is fine; no scenario: test diet).
window.__net = {
  s,
  TUNE,
  village,
  piles,
  load,
  FILLS,
  depots,
  fill: () => submitEdit({ op: 'tune.fill', i: 0, j: 0 }),
  lay: () => submitEdit({ op: 'site.run', i: 0, j: 0, s: sites.open }),
  /** Fakes crates delivered, to look at a stage without waiting. */
  give: (kind: Kind, n: number) => {
    for (let k = 0; k < n; k++) land(kind);
  },
};
