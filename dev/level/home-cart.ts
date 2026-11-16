// R1b: planned stock, never a production consist. R1a (railway-check-line2.ts) proves these phases exclusive:
// trains on implies cart at rest (hidden); nothing uses the leg after the trains wake.
import {
  AXIS,
  BUFFERS,
  CROSSING,
  HEADS,
  ISLAND,
  ISLAND_A,
  ISLAND_C,
  LEG,
  PROPS,
  ROAD2_S,
  SPUR,
  axisPoint,
  cartRoadAt,
  march,
  roadAt,
} from '../../src/place/home-station.ts';
import { CART, FORMATION, LINES, LINKS, lineAt } from '../../src/place/layout.ts';
import { frameBesideLine, stationColliders } from '../../src/place/spatial-station.ts';
import { TREE_SOURCES } from '../../src/place/tree-sources.ts';
import { ENGINE, ENGINE_LONG_AHEAD } from '../../src/entities/railway/engine.ts';
import { STEEL_CAR, TRAILER, TRAIN_OFFSETS, WAGON_CAR, steelCarOffset } from '../../src/entities/railway/cars.ts';
import { deckAt, deckGap, type Deck } from '../../src/entities/railway/car-spacing.ts';
import { CART_ROAD } from '../../src/sim/railway-cart.ts';
import { TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';

export const COACH_STOP = 21.65;
const pitch = 3.4;
// Long engine, players, 2.90 x 1.60 coach, kit, footing wagon, steel. Freight stays at today's places.
export const PLANNED_HOME_CONSIST = [
  {
    role: 'engine',
    d: TRAIN_OFFSETS[0]! + ENGINE_LONG_AHEAD / 2,
    hx: ENGINE.hx,
    hz: ENGINE.hz + ENGINE_LONG_AHEAD / 2,
  },
  { role: 'players', d: 0, ...TRAILER },
  { role: 'coach', d: -(TRAILER.hz + 0.5 + 1.45), hx: 0.8, hz: 1.45 },
  { role: 'kit', d: TRAIN_OFFSETS[2]! - pitch, ...TRAILER },
  { role: 'wagon', d: TRAIN_OFFSETS[3]! - pitch, ...WAGON_CAR },
  { role: 'steel', d: steelCarOffset(true) - pitch, ...STEEL_CAR },
];
const box = (x: number, z: number, yaw: number, hx: number, hz: number): Deck => ({
  x,
  z,
  yaw,
  hx,
  back: hz,
  front: hz,
});
const blank = () => box(0, 0, 0, 0, 0);
const at = (s: number, out: { x: number; z: number }) =>
  Object.assign(out, lineAt(LINES.east, s, { x: 0, z: 0, ux: 0, uz: 0 }));
export function checkHomeCart() {
  const problems: string[] = [];
  const metrics: { name: string; value: number; minimum: number; margin: number }[] = [];
  function minimum(name: string, value: number, min: number) {
    metrics.push({ name, value, minimum: min, margin: value - min });
    if (value + 1e-9 < min) problems.push(`${name}: ${value} m < ${min} m (margin ${value - min} m)`);
  }
  const yaw = Math.atan2(AXIS.d.x, AXIS.d.z);
  const mid = axisPoint((BUFFERS[0] + ISLAND_A.foot) / 2, ISLAND_C);
  // Entire island footprint, including both ramps and apron: conservative at every height.
  const obstacles = [
    { id: 'island and ramps', ...box(mid.x, mid.z, yaw, ISLAND.width / 2, (ISLAND_A.foot - BUFFERS[0]) / 2) },
  ];
  function side(road: 0 | 1, s: number, lat: number) {
    const p = roadAt(road, s),
      b = (p.bearing * Math.PI) / 180;
    return { x: p.x + Math.cos(b) * lat, z: p.z + Math.sin(b) * lat };
  }
  for (const [id, p] of [
    ['leg line 1 lever', side(0, LEG.from + 1.5, -2.4)],
    ['leg line 2 lever', side(1, LEG.to + 1.5, 2.4)],
    ['spur lever', side(1, SPUR.s - 1.5, 2.4)],
  ] as const)
    obstacles.push({ id, ...box(p.x, p.z, yaw, 0.25, 0.4) });
  obstacles.push({ id: 'forge rack full', ...box(PROPS.rack.x, PROPS.rack.z, PROPS.rack.yaw, 1.35, 1.3) });
  for (const spec of LINKS[1]!.stations.slice(0, 2)) {
    const f = frameBesideLine(spec, LINES.east, 1),
      c = stationColliders(f, 0, true);
    for (const p of [...c.frame, c.feeder, ...(c.rails ? [c.rails] : [])])
      obstacles.push({
        id: `${spec.id}/${p.id}`,
        ...box(p.position.x - 1000, p.position.z, p.yaw, p.shape.hx, p.shape.hz),
      });
    if (spec.id === 'Q2') {
      const x = f.x - 1000 - Math.sin(f.yaw) * 6 - Math.cos(f.yaw) * spec.side * 8;
      const z = f.z - Math.cos(f.yaw) * 6 + Math.sin(f.yaw) * spec.side * 8,
        y = f.yaw - Math.PI / 2;
      obstacles.push({ id: 'Q2 rack full', ...box(x, z, y, 1.2, 0.87) });
      obstacles.push({
        id: 'Q2 sign',
        ...box(
          x - 1.2 * Math.cos(y) - 1.55 * Math.sin(y),
          z + 1.2 * Math.sin(y) - 1.55 * Math.cos(y),
          y + Math.PI / 2,
          0.65,
          0.06,
        ),
      });
    }
  }
  for (const t of TREE_SOURCES.filter((t) => !t.cleared))
    obstacles.push({ id: `tree ${t.index} trunk`, ...box(t.x - 1000, t.z, 0, 0.46 * t.size, 0.46 * t.size) });
  const decks = PLANNED_HOME_CONSIST.map((v) =>
    deckAt(at, COACH_STOP + v.d, { ...v, back: v.hz, front: v.hz }, blank()),
  );
  const engine = PLANNED_HOME_CONSIST[0]!,
    nose = COACH_STOP + engine.d + engine.hz;
  const tail = COACH_STOP + PLANNED_HOME_CONSIST.at(-1)!.d - STEEL_CAR.hz;
  minimum('tail past spur points', tail - SPUR.s, 0.05);
  minimum('boards behind tail', tail - (CROSSING.s + CROSSING.len / 2), 1.95);
  minimum('nose past idle leg points', nose - LEG.to, 2.35);
  minimum('arc allowance remaining (max 3.5)', 3.5 - (nose - HEADS[1].segs[0].len), 0.15);
  minimum('merge block ahead of reach', FORMATION.quarry.from - (COACH_STOP + TRAIN_EXTENT.aheadCm / 100), 4.15);
  const straight = march(HEADS[1].start, [{ len: 1000 }], nose),
    bent = roadAt(1, nose);
  const offLine = Math.hypot(straight.x - bent.x, straight.z - bent.z);
  for (const v of PLANNED_HOME_CONSIST.slice(1))
    minimum(`${v.role} short of arc`, HEADS[1].segs[0].len - (COACH_STOP + v.d + v.hz), 0);
  for (const v of PLANNED_HOME_CONSIST.slice(1, 3)) {
    minimum(
      `${v.role} deck start`,
      COACH_STOP + v.d - v.hz - (ISLAND_A.deck0 + ROAD2_S),
      v.role === 'players' ? 14.35 : 10.95,
    );
    minimum(
      `${v.role} deck end`,
      ISLAND_A.deck1 + ROAD2_S - (COACH_STOP + v.d + v.hz),
      v.role === 'players' ? 0.45 : 4.15,
    );
  }
  for (const o of obstacles) {
    minimum(`standing/${o.id}`, Math.min(...decks.map((d) => deckGap(d, o))), 0.25);
    let gap = Infinity;
    // Include both end points, the leg's joins, road 2 s 0, and the out-run to s 120.
    const end = CART_ROAD.forgeCm / 100 + 120;
    for (let d = 142; d <= end + 0.25; d += 0.25) {
      const s = Math.min(d, end),
        p = cartRoadAt(s, LINES),
        a = cartRoadAt(Math.max(0, s - 1.1), LINES),
        b = cartRoadAt(s + 1.1, LINES);
      gap = Math.min(gap, deckGap(box(p.x, p.z, Math.atan2(b.x - a.x, b.z - a.z), CART.hx, CART.hz), o));
    }
    minimum(`operating/${o.id}`, gap, 0.25);
  }
  minimum('engine/island', deckGap(decks[0]!, obstacles[0]!), 0.58);
  minimum('engine/leg lever', deckGap(decks[0]!, obstacles[2]!), 1.13);
  return {
    level: 'home-cart',
    failures: problems.length,
    problems,
    metrics,
    nose,
    tail,
    intoArc: nose - HEADS[1].segs[0].len,
    offLine,
    noseToMerge: FORMATION.quarry.from - nose,
    coverage:
      'R1a exclusive operating cart and standing planned coach train; planar body envelopes. Running rails, sleepers and turnout rails lie below the bodies and are running surfaces, not lateral obstacles. Trees use standing trunk envelopes; canopy and dynamic cargo are not certified.',
  };
}
