// High Gorge's complete massing, compiled to JSON; array order preserves body and batch insertion.
import { defineLevel } from '../../prefab/types.ts';
import { add, sub, mul, layoutData, type Scalar } from '../../prefab/authoring.ts';
import { GORGE_DECK, GORGE_RIM, STAIR, TOWN_PAD } from '../../entities/route-greybox/massing.ts';
import { inclineLayout } from './leg2.ts';

const GREY = '#9c9ea1',
  GREY_DARK = '#6f7275',
  GREY_LIGHT = '#b4b6b8',
  STAKE = '#d8c9a0',
  // The parapets: the palest grey, so the zigzag reads against the wall's shade from an arriving train.
  PALE = '#e4e5e6';

const A = { x: 0.8565, z: 0.5162 };
const WALL = 45;
const STAIR_TOP = add(GORGE_DECK, mul(STAIR.rise, STAIR.flights));
const basis = { o: { x: -103, z: -1988 }, u: A, v: { x: -0.5162, z: 0.8565 } };
const gorgeAt = (a: number, c: number, y: Scalar = 0) => ({ compute: 'point', frame: basis, at: [a, c], y });
/** A box between two points (the middle of its top face runs from `a` to `b`), `w` wide and `h` thick. */
function span(a: unknown, b: unknown, w: number, h: number, colour: string, solid = true) {
  return { compute: 'span', a, b, w, h, colour, solid };
}
function levelBox(a0: Scalar, a1: number, c0: number, c1: number, y0: Scalar, y1: Scalar, colour = GREY, solid = true) {
  return { compute: 'slab', frame: basis, bounds: [a0, a1, c0, c1], y0, y1, colour, solid };
}

function placements() {
  const out: unknown[] = [];
  // The platforms: 40 m both sides (call 27), each 4.5 m deep, the north one the down track's (lat +1.8 to +6.3), the
  // south one the up track's (lat -10.3 to -5.8), in 8 m lengths along the row's curve, on posts in the water.
  for (const lat of [4.05, -8.05])
    for (let offset = -40; offset < 0; offset += 8) {
      const q0 = { compute: 'line2Point', offset, lat },
        q1 = { compute: 'line2Point', offset: offset + 8, lat };
      const top: Scalar = { compute: 'line2EndY', offset: 0.9 };
      out.push(span({ ...q0, y: top }, { ...q1, y: top }, 4.5, 0.5, GREY_LIGHT));
      out.push({
        ...q0,
        y: mul(sub(sub(top, 0.5), 8), 0.5),
        w: 0.5,
        h: add(sub(top, 0.5), 8),
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
      y0 = add(GORGE_DECK, mul(STAIR.rise, k)),
      y1 = add(y0, STAIR.rise),
      from = up ? STAIR.a0 : STAIR.a1,
      to = up ? STAIR.a1 : STAIR.a0;
    out.push(span(gorgeAt(from, mid, y0), gorgeAt(to, mid, y1), STAIR.w, 0.4, k % 2 ? GREY : GREY_LIGHT));
    // A solid 1 m parapet on each open side (the wall closes the inner strip's other side).
    for (const edge of up ? [c0 + STAIR.w] : [c0, c0 + STAIR.w])
      out.push(span(gorgeAt(from, edge, add(y0, 1)), gorgeAt(to, edge, add(y1, 1)), 0.2, 1, PALE));
    // The landing this flight ends on: 3 m long, across both strips, with a parapet on its outer edges.
    const l0 = up ? STAIR.a1 : STAIR.a0 - 3,
      l1 = l0 + 3;
    if (k < STAIR.flights - 1) {
      out.push(levelBox(l0, l1, STAIR.inner, STAIR.inner + 2 * STAIR.w, sub(y1, 0.4), y1, GREY));
      out.push(
        levelBox(
          up ? l1 - 0.2 : l0,
          up ? l1 : l0 + 0.2,
          STAIR.inner,
          STAIR.inner + 2 * STAIR.w,
          y1,
          add(y1, 1),
          GREY_DARK,
        ),
      );
      out.push(levelBox(l0, l1, STAIR.inner + 2 * STAIR.w - 0.2, STAIR.inner + 2 * STAIR.w, y1, add(y1, 1), GREY_DARK));
    }
  }
  // The top: a landing off the last flight across to the rim, and the rim's level pad with the pickup post's plinth 8 m
  // back from the edge.
  out.push(
    levelBox(STAIR.a0 - 3, STAIR.a0, -WALL - 0.5, STAIR.inner + 2 * STAIR.w, sub(STAIR_TOP, 0.4), STAIR_TOP, GREY),
  );
  out.push(
    levelBox(
      sub(STAIR.a0, 3.2),
      STAIR.a0 - 3,
      -WALL,
      STAIR.inner + 2 * STAIR.w,
      STAIR_TOP,
      add(STAIR_TOP, 1),
      GREY_DARK,
    ),
  );
  out.push(
    levelBox(
      STAIR.a0 - 3,
      STAIR.a0,
      STAIR.inner + 2 * STAIR.w - 0.2,
      STAIR.inner + 2 * STAIR.w,
      STAIR_TOP,
      add(STAIR_TOP, 1),
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
  return { place: 'gorge', placements: [], layout: layoutData({ kind: 'gorge', boxes: out, incline: inclineLayout }) };
}
export const levels = [defineLevel(placements())];
