// What stands on the place's two lines, built once: the machine, the track, the frames, the trains, the turntable and the
// village's heaps. Nothing here decides anything: ./run.ts runs the machine, ./cargo.ts the trains. Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { flat } from '../../render/flat.ts';
import { drawHeaps, heap, type Heap, type Kind } from '../../render/crates.ts';
import { removeBody, type Body, type Shape } from '../../physics/engine.ts';
import { H, addStatic, addStatics } from './land.ts';
import { GOODS, type Goods } from './layout.ts';
import {
  DOCK,
  FORGE_BILLS,
  FORGE_FRAME,
  HEAP,
  LINKS,
  TURNTABLE,
  TUNE,
  VILLAGE,
  YARD,
  lineAt,
  railY,
  toWorld,
  type LinePoint,
} from './layout.ts';
import { count, job, sharedSlice } from './job.ts';
import { besideLine, buildMachine, buildTrack, buildTrain, thud, type Track, type TrainRun } from './rail.ts';
import { addFoot } from './sites.ts';
import { buildStation, frameBesideLine, type StationRun } from './stations.ts';
import { campSmoke } from './town.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const FLAT = (color: string) => flat(color, 0.9);

export const machine = buildMachine();
const thudAt = (_k: number, kind: string, x: number, y: number, z: number) => thud(machine, kind, x, y, z);

export type LineRun = {
  k: number;
  spec: (typeof LINKS)[number];
  track: Track;
  stations: StationRun[];
  stage: number; // the station whose turn it is; stations.length once the line's done
  open: boolean; // it's through: you can walk it
  train: TrainRun;
  pile: Heap;
  smoke: { x: number; y: number; z: number };
  madeAt: number;
};
export const lines: LineRun[] = LINKS.map((spec, k) => {
  const { line } = spec;
  // Survey stakes beside the line: where it'll go. Thin, and solid.
  const stakes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), FLAT('#f0752c'), 80);
  const o = new THREE.Object3D();
  const stakeShapes: Shape[] = [];
  let n = 0;
  for (let s = 22; s < line.len - 8 && n < 80; s += 11) {
    const q = besideLine(line, s, 5.5),
      y = H(q.x, q.z);
    if (railY(line, s) - y > 2) continue; // over the gorge, or the sea
    stakeShapes.push({ kind: 'box', hx: 0.07, hy: 0.75, hz: 0.07, offset: { x: q.x, y: y + 0.75, z: q.z } });
    o.position.set(q.x, y + 0.75, q.z);
    o.updateMatrix();
    stakes.setMatrixAt(n++, o.matrix);
  }
  stakes.count = n;
  stakes.frustumCulled = false;
  scene.add(stakes);
  addStatics(stakeShapes, { x: 0, y: 0, z: 0 });
  // The camp's pile, by the stop nearest it: the far one on line 1, the quarry on line 2.
  const pileS = spec.stops[spec.stops.length - (k === 0 ? 1 : 2)]! - 3.7;
  const pileAt = besideLine(line, pileS, -5);
  return {
    k,
    spec,
    track: buildTrack(spec, thudAt),
    stations: spec.stations.map((q) => buildStation(q, frameBesideLine(q, line, spec.dir))),
    stage: 0,
    open: false,
    train: buildTrain(line, spec.stops, spec.id),
    pile: heap(pileAt.x, pileAt.z, 3, H(pileAt.x, pileAt.z)),
    smoke: campSmoke(k),
    madeAt: 0,
  };
});
export const L1 = lines[0]!,
  L2 = lines[1]!;

// The forge's frame, by its north wall: its feeder runs into the wall.
export const forgeFrame = buildStation(FORGE_BILLS[0]!, {
  x: toWorld(FORGE_FRAME.x),
  z: FORGE_FRAME.z,
  yaw: Math.PI / 2,
  lx: 0,
  lz: -1,
});
export const forgeBill = () => FORGE_BILLS[Math.min(job.forgeBill, FORGE_BILLS.length - 1)]!;

// The frame by a station's id, for a message from another tab.
export function frameById(id: unknown): StationRun | null {
  if (id === forgeFrame.spec.id) return forgeFrame;
  for (const l of lines) for (const st of l.stations) if (st.spec.id === id) return st;
  return null;
}

// ---------------------------------------------------------------- the turntable
// Where line 1 ends and line 2 begins: a low disc that turns with the machine.
export const TX = toWorld(TURNTABLE.x),
  TZ = TURNTABLE.z,
  TY = railY(L1.spec.line, 0);
export const disc = new THREE.Group();
disc.position.set(TX, H(TX, TZ), TZ);
const discBase = new THREE.Mesh(new THREE.CylinderGeometry(TURNTABLE.r, TURNTABLE.r, 0.24, 20), FLAT('#7f7a70'));
discBase.position.y = TY + 0.0 - disc.position.y;
discBase.receiveShadow = true;
disc.add(discBase);
const discBars = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, TURNTABLE.r * 2 - 0.3), FLAT('#5c5046'));
discBars.position.y = TY + 0.13 - disc.position.y;
disc.add(discBars);
// A simple rim and paired rails make the graybox read as a turntable, within its existing footprint.
const discRim = new THREE.Mesh(
  new THREE.RingGeometry(TURNTABLE.r - 0.28, TURNTABLE.r, 20).rotateX(-Math.PI / 2),
  FLAT('#b2ad9f'),
);
discRim.position.y = TY + 0.14 - disc.position.y;
discRim.receiveShadow = true;
disc.add(discRim);
for (const side of [-1, 1]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, TURNTABLE.r * 2 - 0.6), FLAT('#3f4145'));
  rail.position.set(side * 0.63, TY + 0.21 - disc.position.y, 0);
  rail.castShadow = true;
  disc.add(rail);
}
scene.add(disc);
addStatic(
  { kind: 'cylinder', rTop: TURNTABLE.r, rBottom: TURNTABLE.r, h: 0.24, segments: 12 },
  { x: TX, y: TY, z: TZ },
);
addFoot(TX, TZ, 0, TURNTABLE.r * 0.8, TURNTABLE.r * 0.8);
lineAt(L1.spec.line, 0, P);
export const heading = { line1: Math.atan2(-P.ux, -P.uz), line2: 0 };
lineAt(L2.spec.line, 0, P);
heading.line2 = Math.atan2(P.ux, P.uz);

// ---------------------------------------------------------------- the village's heaps, solid as far as they're stacked
export const dock = heap(toWorld(DOCK.x), DOCK.z, 3, VILLAGE.y);
export const hub = heap(toWorld(HEAP.x), HEAP.z, 4, VILLAGE.y);
export const yard = heap(toWorld(YARD.x), YARD.z, 4, VILLAGE.y);
export const allHeaps: Heap[] = [dock, hub, yard, L1.pile, L2.pile];
addFoot(dock.x, dock.z, 0, 1.8, 1.8);
addFoot(hub.x, hub.z, 0, 2.2, 2.2);
addFoot(yard.x, yard.z, 0, 2.2, 2.2);
// A box round each pyramid, remade when its size changes; a crate's 0.85 m. (crates.ts stacks `base` x `base`, one smaller on
// top, and past its top another beside it.)
const heapBodies = new Map<Heap, { n: number; body: Body | null }>();
const CRATE = 0.85;
export function solidHeaps() {
  for (const h of allHeaps) {
    let e = heapBodies.get(h);
    if (!e) heapBodies.set(h, (e = { n: 0, body: null }));
    if (e.n === h.list.length) continue;
    e.n = h.list.length;
    if (e.body) removeBody(e.body);
    e.body = null;
    if (!e.n) continue;
    const size = (h.base * (h.base + 1) * (2 * h.base + 1)) / 6;
    const more = Math.floor((e.n - 1) / size);
    let left = more ? 0 : e.n,
      side = h.base,
      layers = more ? h.base : 0;
    while (left > 0) {
      left -= side * side;
      side--;
      layers++;
    }
    const across = (h.base * CRATE) / 2,
      wide = (more * (h.base + 0.5) * CRATE) / 2;
    e.body = addStatic(
      { kind: 'box', hx: across + wide, hy: (layers * 0.82) / 2, hz: across },
      { x: h.x + wide, y: (h.y ?? 0) + (layers * 0.82) / 2, z: h.z },
    );
  }
}
export const stepsOf = (n: number) => (n >= TUNE.stepAt[1]! ? 2 : n >= TUNE.stepAt[0]! ? 1 : 0);
const pileOf = (n: unknown, kind: Kind, max = 200): Kind[] => Array.from({ length: count(n, max) ? n : 0 }, () => kind);

// ---------------------------------------------------------------- their share of the save and the snapshot
sharedSlice('lines', {
  get: () =>
    lines.map((l) => ({
      stage: l.stage,
      open: l.open,
      pile: l.pile.list.length,
      have: l.stations.map((st) => GOODS.map((g) => st.have[g] + st.coming[g])),
    })),
  set: (v) => {
    const a = Array.isArray(v) ? v : [];
    lines.forEach((l, k) => {
      const q = (a[k] ?? {}) as { stage?: unknown; open?: unknown; pile?: unknown; have?: unknown };
      l.stage = count(q.stage, l.stations.length) ? q.stage : 0;
      l.open = q.open === true;
      l.pile.list = pileOf(q.pile, l.spec.kind as Kind);
      l.stations.forEach((st, n) => {
        const h = (Array.isArray(q.have) ? q.have[n] : null) as unknown[] | null;
        GOODS.forEach((g: Goods, m) => {
          st.have[g] = count(h?.[m], 400) ? (h[m] as number) : 0;
          st.coming[g] = 0;
        });
      });
    });
  },
});
sharedSlice('heaps', {
  get: () => ({ hub: hub.list.length, dock: dock.list.length, yard: yard.list.length }),
  set: (v) => {
    const j = (v ?? {}) as { hub?: unknown; dock?: unknown; yard?: unknown };
    hub.list = pileOf(j.hub, 'wood');
    dock.list = pileOf(j.dock, 'wood');
    yard.list = pileOf(j.yard, 'stone');
    drawHeaps(allHeaps);
  },
});
sharedSlice('forgeFrame', {
  get: () => GOODS.map((g) => forgeFrame.have[g] + forgeFrame.coming[g]),
  set: (v) => {
    const h = Array.isArray(v) ? v : [];
    GOODS.forEach((g: Goods, m) => {
      forgeFrame.have[g] = count(h[m], 400) ? (h[m] as number) : 0;
      forgeFrame.coming[g] = 0;
    });
  },
});
