// High Gorge's complete massing, compiled to JSON; array order preserves body and batch insertion.
import { defineLevel, type Placement } from '../../prefab/types.ts';
import { LINE2_END_S, line2World, line2Y } from '../../entities/railway/line2-path.ts';
import { gorgeAt, GORGE_DECK, GORGE_RIM, STAIR, TOWN_PAD } from '../../entities/route-greybox/massing.ts';
import { inclinePlacements, inclineAnalysis } from './leg2.ts';

type Box = {
  x: number;
  y: number;
  z: number;
  /** Across, up and along (its local x, y, z), metres. */
  w: number;
  h: number;
  d: number;
  yaw: number;
  /** Radians about its local x: positive lifts its +z end. */
  pitch?: number;
  colour?: string;
  solid?: boolean;
  hidden?: boolean;
};

const GREY = '#9c9ea1',
  GREY_DARK = '#6f7275',
  GREY_LIGHT = '#b4b6b8',
  STAKE = '#d8c9a0',
  // The parapets: the palest grey, so the zigzag reads against the wall's shade from an arriving train.
  PALE = '#e4e5e6';

const A = { x: 0.8565, z: 0.5162 };
const WALL = 45;
const STAIR_TOP = GORGE_DECK + STAIR.rise * STAIR.flights;
/** A box between two points (the middle of its top face runs from `a` to `b`), `w` wide and `h` thick. */
function span(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  w: number,
  h: number,
  colour: string,
  solid = true,
): Box {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    dy = b.y - a.y,
    run = Math.hypot(dx, dz),
    pitch = Math.atan2(dy, run);
  return {
    x: (a.x + b.x) / 2,
    // The top face passes through a and b: the centre is half a thickness down its own normal.
    y: (a.y + b.y) / 2 - (h / 2) * Math.cos(pitch),
    z: (a.z + b.z) / 2,
    w,
    h,
    d: Math.hypot(run, dy),
    yaw: Math.atan2(dx, dz),
    pitch,
    colour,
    solid,
  };
}

/** A level box over (a0..a1, c0..c1), from y0 up to y1. */
function levelBox(a0: number, a1: number, c0: number, c1: number, y0: number, y1: number, colour = GREY, solid = true) {
  const p = gorgeAt((a0 + a1) / 2, (c0 + c1) / 2);
  return {
    x: p.x,
    y: (y0 + y1) / 2,
    z: p.z,
    w: Math.abs(c1 - c0),
    h: y1 - y0,
    d: Math.abs(a1 - a0),
    yaw: Math.atan2(A.x, A.z),
    colour,
    solid,
  } satisfies Box;
}

function placements() {
  const out: Box[] = [];
  const E = LINE2_END_S;
  // The platforms: 40 m both sides (call 27), each 4.5 m deep, the north one the down track's (lat +1.8 to +6.3), the
  // south one the up track's (lat -10.3 to -5.8), in 8 m lengths along the row's curve, on posts in the water.
  const q0 = { x: 0, z: 0 },
    q1 = { x: 0, z: 0 };
  for (const lat of [4.05, -8.05])
    for (let s = E - 40; s < E - 1e-6; s += 8) {
      line2World(s, lat, q0);
      line2World(s + 8, lat, q1);
      const top = line2Y(E) + 0.9;
      out.push(span({ ...q0, y: top }, { ...q1, y: top }, 4.5, 0.5, GREY_LIGHT));
      out.push({
        x: q0.x,
        y: (top - 0.5 - 8) / 2,
        z: q0.z,
        w: 0.5,
        h: top - 0.5 + 8,
        d: 0.5,
        yaw: 0,
        colour: GREY_DARK,
      });
    }
  // The concourse behind the buffers, joining both platforms; the gangway from it to the foot of the stair.
  out.push(levelBox(-4, 0, -9.3, 13.3, GORGE_DECK - 0.5, GORGE_DECK, GREY));
  out.push(levelBox(-4, STAIR.a0, STAIR.inner, -9.3, GORGE_DECK - 0.5, GORGE_DECK, GREY));
  for (const c of [-9, 13, -25, -40])
    out.push(levelBox(-2.3, -1.7, c - 0.3, c + 0.3, -8, GORGE_DECK - 0.5, GREY_DARK, false));
  // The barrier's pad behind the south platform, reached over the concourse along the platform.
  out.push(levelBox(11, 19, 10.2, 16.5, GORGE_DECK - 0.5, GORGE_DECK, GREY));
  out.push(levelBox(-4, 11, 10.2, 13.3, GORGE_DECK - 0.5, GORGE_DECK, GREY));
  // The slipway from the split's water up to the gangway (nobody is stranded: a glide down may end in the water).
  out.push(span(gorgeAt(14, -29, -1.4), gorgeAt(STAIR.a0, -29, GORGE_DECK), 2.4, 0.3, GREY_LIGHT));
  // The stair: flight k rises from landing k to landing k + 1, turning at each; odd ones on the wall's strip.
  for (let k = 0; k < STAIR.flights; k++) {
    const up = k % 2 === 0,
      c0 = STAIR.inner + (up ? 0 : STAIR.w),
      mid = c0 + STAIR.w / 2,
      y0 = GORGE_DECK + STAIR.rise * k,
      y1 = y0 + STAIR.rise,
      from = up ? STAIR.a0 : STAIR.a1,
      to = up ? STAIR.a1 : STAIR.a0;
    out.push(span(gorgeAt(from, mid, y0), gorgeAt(to, mid, y1), STAIR.w, 0.4, k % 2 ? GREY : GREY_LIGHT));
    // A solid 1 m parapet on each open side (the wall closes the inner strip's other side).
    for (const edge of up ? [c0 + STAIR.w] : [c0, c0 + STAIR.w])
      out.push(span(gorgeAt(from, edge, y0 + 1), gorgeAt(to, edge, y1 + 1), 0.2, 1, PALE));
    // The landing this flight ends on: 3 m long, across both strips, with a parapet on its outer edges.
    const l0 = up ? STAIR.a1 : STAIR.a0 - 3,
      l1 = l0 + 3;
    if (k < STAIR.flights - 1) {
      out.push(levelBox(l0, l1, STAIR.inner, STAIR.inner + 2 * STAIR.w, y1 - 0.4, y1, GREY));
      out.push(
        levelBox(up ? l1 - 0.2 : l0, up ? l1 : l0 + 0.2, STAIR.inner, STAIR.inner + 2 * STAIR.w, y1, y1 + 1, GREY_DARK),
      );
      out.push(levelBox(l0, l1, STAIR.inner + 2 * STAIR.w - 0.2, STAIR.inner + 2 * STAIR.w, y1, y1 + 1, GREY_DARK));
    }
  }
  // The top: a landing off the last flight across to the rim, and the rim's level pad with the pickup post's plinth 8 m
  // back from the edge.
  out.push(levelBox(STAIR.a0 - 3, STAIR.a0, -WALL - 0.5, STAIR.inner + 2 * STAIR.w, STAIR_TOP - 0.4, STAIR_TOP, GREY));
  out.push(
    levelBox(STAIR.a0 - 3.2, STAIR.a0 - 3, -WALL, STAIR.inner + 2 * STAIR.w, STAIR_TOP, STAIR_TOP + 1, GREY_DARK),
  );
  out.push(
    levelBox(
      STAIR.a0 - 3,
      STAIR.a0,
      STAIR.inner + 2 * STAIR.w - 0.2,
      STAIR.inner + 2 * STAIR.w,
      STAIR_TOP,
      STAIR_TOP + 1,
      GREY_DARK,
    ),
  );
  out.push(levelBox(-3, 6, -WALL - 12, -WALL, GORGE_RIM, STAIR_TOP, GREY_LIGHT));
  // The stacks, as colliders under the silhouette's mesh: the wall at c ±45 and the 85 m top, boxes inside the map's
  // outlines (a ±120, 200 m back from each wall).
  for (const side of [-1, 1])
    out.push({
      ...levelBox(-120, 120, side * WALL, side * (WALL + 200), -10, GORGE_RIM),
      hidden: true,
    });
  // The stand-in town (campaign-outline, "Towns at the hubs", 4): a flat pad, two box buildings with no interior, three
  // staked plots and (in leg-view.ts) one board.
  const T = TOWN_PAD;
  out.push(levelBox(T.a0, T.a1, T.c0, T.c1, GORGE_DECK - 0.5, GORGE_DECK, GREY));
  for (const a of [T.a0 + 2, T.a1 - 2])
    for (const c of [T.c0 + 2, T.c1 - 2])
      out.push(levelBox(a - 0.3, a + 0.3, c - 0.3, c + 0.3, -8, GORGE_DECK - 0.5, GREY_DARK, false));
  out.push(levelBox(T.a0 + 1.5, T.a0 + 8.5, T.c0 + 1.5, T.c0 + 7.5, GORGE_DECK, GORGE_DECK + 4.2, GREY_LIGHT));
  out.push(levelBox(T.a0 + 1.5, T.a0 + 7.5, T.c1 - 7, T.c1 - 1.5, GORGE_DECK, GORGE_DECK + 3.4, GREY_LIGHT));
  for (let k = 0; k < 3; k++) {
    const a = T.a0 + 12,
      c = T.c0 + 2 + k * 8;
    for (const [da, dc] of [
      [0, 0],
      [5, 0],
      [0, 5],
      [5, 5],
    ] as const)
      out.push(
        levelBox(
          a + da - 0.06,
          a + da + 0.06,
          c + dc - 0.06,
          c + dc + 0.06,
          GORGE_DECK,
          GORGE_DECK + 0.9,
          STAKE,
          false,
        ),
      );
  }
  const base: Placement[] = out.map((b, i) => ({
    id: i < 10 && i % 2 === 0 ? `gorge.platform-n.${i / 2}` : `gorge.massing.${i}`,
    prefab: b.hidden ? 'greybox.collider' : b.solid === false ? 'greybox.decoration' : 'greybox.box',
    pos: [b.x, b.y, b.z],
    rot: [b.yaw, -(b.pitch ?? 0), 0],
    scale: [b.w, b.h, b.d],
    params: { colour: b.colour ?? GREY },
  }));
  const ids = new Map(inclinePlacements.map((p, i) => [p.id, `gorge.massing.${base.length + i}`]));
  return {
    placements: [...base, ...inclinePlacements.map((p) => ({ ...p, id: ids.get(p.id)! }))],
    analysis: { ...inclineAnalysis, surfaces: inclineAnalysis.surfaces.map((s) => ({ ...s, id: ids.get(s.id)! })) },
  };
}

export const levels = [defineLevel({ place: 'gorge', ...placements() })];
