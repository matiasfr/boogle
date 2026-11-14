// The up track's platforms and the plank crossings (docs/plans/generic-lines.md, step 2): a platform outside the second
// track at Quarry and Far Head, beside today's halt there, and planks across both tracks at the pair's end, the walk
// from one to the other. They drop in with today's halt beside them; the up track's trains stand here (v26), and each
// one's request lever is halts-view.ts's (no signal or board of its own). Local: the shapes come from layout.ts's
// UP_HALTS, as dev/level/timber-track.ts checks them.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { thump } from '../../render/machine-sfx.ts';
import { createHaltKit } from './halt-kit.ts';

type Box = import('../../render/boxes.ts').Box;
type Deps = {
  layout: typeof import('../../place/layout.ts');
  boxes: typeof import('../../render/boxes.ts');
  land: typeof import('../../place/land.ts');
  pieces: typeof import('../../place/pieces.ts');
};

const STONE = '#bdb8ac',
  BASE = '#9a9184',
  EDGE = '#f2d36a',
  PLANK = '#a97a45';

export function createUpPlatforms(owner: OwnedView, deps: Deps) {
  const { layout, land } = deps;
  const { box, place } = deps.boxes;
  const { ORIGIN, lineAt, railY, upLat, crossingPlanks, CROSSING_SPAN, CROSSING_WIDTH, FORMATION } = layout;
  const P = { x: 0, z: 0, ux: 0, uz: 1 };
  const at = (line: import('../../place/layout.ts').Line, s: number, l: number) => {
    lineAt(line, s, P);
    return { x: P.x - P.uz * l + ORIGIN.x, z: P.z + P.ux * l + ORIGIN.z };
  };
  const all: Box[] = [];
  type Group = {
    pair: number;
    pieces: number[];
    solids: (() => Body[])[];
    bodies: Body[];
    up: boolean;
    kit?: ReturnType<typeof createHaltKit>;
  };
  const groups: Group[] = [];
  for (const [row, h] of layout.UP_HALTS.entries()) {
    const g: Group = { pair: h.pair, pieces: [], solids: [], bodies: [], up: false };
    groups.push(g);
    const line = layout.LINKS[h.line]!.line;
    const piece = (b: Box) => {
      g.pieces.push(all.length);
      all.push(b);
    };
    // The platform, as today's halts are built (halts-view.ts makeHalt): a stone deck 2.5 m wide on a base, its edge
    // stones, a shelter with a bench at its back edge, ramps off its ends and back.
    const hw = 1.25,
      mid = (h.s0 + h.s1) / 2,
      half = (h.s1 - h.s0) / 2,
      sign = Math.sign(h.lat),
      low = Math.min(railY(line, h.s0), railY(line, h.s1)) + 0.72;
    lineAt(line, mid, P);
    const yaw = Math.atan2(P.ux, P.uz);
    const c = at(line, mid, h.lat);
    const ground = land.H(c.x, c.z);
    const part = (dl: number, dy: number, ds: number, w: number, hh: number, d: number, color: string) => {
      const b = box(c.x, c.z, place(dl, dy, ds, w, hh, d, yaw), color);
      b.y = low;
      piece(b);
    };
    const lengths = Math.ceil((half * 2) / 6);
    for (let k = 0; k < lengths; k++)
      part(0, -0.5, -half + ((k + 0.5) * half * 2) / lengths, hw * 2, 0.5, (half * 2) / lengths + 0.02, STONE);
    for (const sl of [-1, 1]) part(sl * (hw - 0.15), -0.04, 0, 0.3, 0.05, half * 2, EDGE);
    part(0, ground - low, 0, hw * 2, low - 0.5 - ground, half * 2, BASE);
    const kit = createHaltKit(owner, row, true, c.x, low, c.z, yaw);
    g.kit = kit;
    for (const [, x, y, z, w, h, d, colour] of kit.parts) part(x, y - h / 2, z, w, h, d, colour);
    const cosY = Math.cos(yaw),
      sinY = Math.sin(yaw);
    const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    const local = (dl: number, dy: number, ds: number) => ({
      x: c.x + dl * cosY + ds * sinY,
      y: low + dy,
      z: c.z - dl * sinY + ds * cosY,
    });
    g.solids.push(
      () => [land.addStatic({ kind: 'box', hx: hw, hy: 0.25, hz: half }, local(0, -0.25, 0), q, GROUP.SCENERY, owner)],
      () => [
        land.addStatic(
          { kind: 'box', hx: hw, hy: (low - 0.5 - ground) / 2 + 0.2, hz: half },
          local(0, (ground - low - 0.5) / 2, 0),
          q,
          GROUP.SCENERY,
          owner,
        ),
      ],
      () => kit.enable('bench'),
      () => kit.enable('shelter'),
    );
    // Ramps: off the start end, the far end (not at the Quarry, where the Q4 frame stands) and the back.
    const ramp = (top: { x: number; z: number }, foot: { x: number; z: number }) => {
      const footY = land.H(foot.x, foot.z) + 0.05;
      const dx = top.x - foot.x,
        dz = top.z - foot.z,
        len = Math.hypot(dx, dz),
        dy = low - footY;
      const b = box(
        (top.x + foot.x) / 2,
        (top.z + foot.z) / 2,
        place(
          0,
          0,
          0,
          hw * 2,
          0.4,
          Math.hypot(len, dy),
          Math.atan2(dx, dz),
          new THREE.Euler(-Math.atan2(dy, len), 0, 0),
        ),
        STONE,
      );
      b.y = (low + footY) / 2 - 0.4;
      piece(b);
      g.solids.push(() => [land.slab(foot.x, foot.z, top.x, top.z, footY, low, hw * 2, owner, undefined, 'grass')]);
    };
    ramp(at(line, h.s0, h.lat), at(line, h.s0 - 6, h.lat));
    if (h.endRamp) ramp(at(line, h.s1, h.lat), at(line, h.s1 + 6, h.lat));
    ramp(at(line, mid, h.lat + sign * hw), at(line, mid, h.lat + sign * 7));

    // The plank crossing over both tracks, flush with the rail tops, a flangeway beside each rail.
    const s = h.crossS;
    const edge = (d: number) => upLat(FORMATION.quarry, s + d) ?? 0;
    const top = railY(line, s) + 0.22;
    const to = h.crossTo ?? CROSSING_SPAN[1];
    for (const [l0, l1] of crossingPlanks(edge(-CROSSING_WIDTH / 2), edge(CROSSING_WIDTH / 2), to)) {
      const a = at(line, s, (l0 + l1) / 2);
      const b = box(a.x, a.z, place(0, 0, 0, l0 - l1, 0.12, CROSSING_WIDTH, yaw), PLANK);
      b.y = top - 0.12;
      piece(b);
    }
    const a0 = at(line, s, CROSSING_SPAN[0]),
      a1 = at(line, s, to);
    g.solids.push(() => [land.slab(a0.x, a0.z, a1.x, a1.z, top, top, CROSSING_WIDTH, owner, 0, 'grass')]);
  }
  const set = deps.pieces.dropSet(
    all,
    (k) => {
      const b = all[k]!;
      if (k % 4 === 0) thump(b.x, b.z);
    },
    owner,
  );
  all.forEach((_, k) => set.snap(k, false));
  const show = (g: Group, on: boolean, delay: number | null) => {
    if (g.up === on) return;
    g.up = on;
    const removed = g.kit?.disable();
    for (const b of g.bodies) if (!removed?.has(b)) owner.removeBody(b);
    g.bodies = on ? g.solids.flatMap((add) => add()) : [];
    g.pieces.forEach((k, n) => {
      if (on && delay !== null) set.drop(k, 3.4, delay + n * 0.04);
      else set.snap(k, on);
    });
  };
  return {
    /** Each group stands while today's halt beside it (`pair`, its row in the halts) does; `snap` skips the drop. */
    update(dt: number, standing: (pair: number) => boolean, snap = false) {
      for (const g of groups) show(g, standing(g.pair), snap ? null : 0.6);
      set.update(dt);
    },
    inspect: () => groups.map((g) => ({ pair: g.pair, up: g.up })),
  };
}
