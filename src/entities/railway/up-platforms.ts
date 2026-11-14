// The up track's platforms and the plank crossings (docs/plans/generic-lines.md, step 2): a platform outside the second
// track at Quarry and Far Head, beside today's halt there, and planks across both tracks at the pair's end, the walk
// from one to the other. They drop in with today's halt beside them; the up track's trains stand here (v26), and each
// one's request lever is halts-view.ts's (no signal or board of its own). Local: the shapes come from layout.ts's
// UP_HALTS, as dev/level/timber-track.ts checks them.
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import { thump } from '../../render/machine-sfx.ts';
import { createHaltKit } from './halt-kit.ts';

type Box = import('../../render/boxes.ts').Box;
type Deps = {
  layout: typeof import('../../place/layout.ts');
  boxes: typeof import('../../render/boxes.ts');
  pieces: typeof import('../../place/pieces.ts');
};

export function createUpPlatforms(owner: OwnedView, deps: Deps) {
  const { layout } = deps;
  const { box, place } = deps.boxes;
  const { ORIGIN, lineAt, railY } = layout;
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
    const mid = (h.s0 + h.s1) / 2,
      low = Math.min(railY(line, h.s0), railY(line, h.s1)) + 0.72;
    lineAt(line, mid, P);
    const yaw = Math.atan2(P.ux, P.uz);
    const c = at(line, mid, h.lat);
    const part = (dl: number, dy: number, ds: number, w: number, hh: number, d: number, color: string) => {
      const b = box(c.x, c.z, place(dl, dy, ds, w, hh, d, yaw), color);
      b.y = low;
      piece(b);
    };
    const kit = createHaltKit(owner, row, true, c.x, low, c.z, yaw);
    g.kit = kit;
    for (const [, x, y, z, w, h, d, colour] of kit.parts) part(x, y - h / 2, z, w, h, d, colour);
    g.solids.push(
      () => kit.enable('deck'),
      () => kit.enable('bench'),
      () => kit.enable('shelter'),
    );
    kit.rampBoxes.forEach(piece);
    g.solids.push(() => kit.enable('ramp'));

    kit.crossingBoxes.forEach(piece);
    g.solids.push(() => kit.enable('crossing'));
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
