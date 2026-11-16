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
  const metrics: { name: string; value: number; minimum: number; strict: boolean; margin: number; source: string }[] =
    [];
  const pins: { name: string; value: number; recorded: number; tolerance: number; remaining: number }[] = [];
  function pin(name: string, value: number, recorded: number) {
    const tolerance = 0.01,
      remaining = tolerance - Math.abs(value - recorded);
    pins.push({ name, value, recorded, tolerance, remaining });
    if (remaining < 0) problems.push(`${name}: pin ${recorded} ± ${tolerance} m, measured ${value} m`);
  }
  const ruling =
    'R1b orchestrator ruling, 16 November 2026 (docs/plans/rider-coach.md, R1b acceptance minima and pins)';
  function minimum(name: string, value: number, min: number, source = ruling, strict = false) {
    metrics.push({ name, value, minimum: min, strict, margin: value - min, source });
    if (strict ? value <= min : value + 1e-9 < min)
      problems.push(`${name}: ${value} m < ${min} m (margin ${value - min} m)`);
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
  minimum('tail past spur points', tail - SPUR.s, 0, ruling, true);
  pin('tail past spur points', tail - SPUR.s, 0.05);
  minimum(
    'boards behind tail',
    tail - (CROSSING.s + CROSSING.len / 2),
    1,
    'test/home-station.test.ts: board crossing, boards at least 1 m behind train',
  );
  pin('boards behind tail', tail - (CROSSING.s + CROSSING.len / 2), 1.95);
  pin('nose past idle leg points', nose - LEG.to, 2.35);
  minimum(
    'arc allowance remaining (max 3.5)',
    3.5 - (nose - HEADS[1].segs[0].len),
    0,
    'docs/plans/rider-coach.md R1b: engine at most 3.5 m into arc',
  );
  minimum(
    'merge block ahead of reach',
    FORMATION.quarry.from - (COACH_STOP + TRAIN_EXTENT.aheadCm / 100),
    0,
    'src/sim/railway-lines.ts TRAIN_EXTENT.aheadCm: forward safety reach before merge block',
    true,
  );
  pin('merge block ahead of reach', FORMATION.quarry.from - (COACH_STOP + TRAIN_EXTENT.aheadCm / 100), 4.15);
  const straight = march(HEADS[1].start, [{ len: 1000 }], nose),
    bent = roadAt(1, nose);
  const offLine = Math.hypot(straight.x - bent.x, straight.z - bent.z);
  pin('nose s', nose, 28.35);
  pin('nose into arc', nose - HEADS[1].segs[0].len, 3.35);
  pin('nose off line', offLine, 0.3114362900980901);
  for (const v of PLANNED_HOME_CONSIST.slice(1))
    minimum(`${v.role} short of arc`, HEADS[1].segs[0].len - (COACH_STOP + v.d + v.hz), 0);
  for (const v of PLANNED_HOME_CONSIST.slice(1, 3)) {
    minimum(`${v.role} deck start`, COACH_STOP + v.d - v.hz - (ISLAND_A.deck0 + ROAD2_S), 0, ruling, true);
    minimum(`${v.role} deck end`, ISLAND_A.deck1 + ROAD2_S - (COACH_STOP + v.d + v.hz), 0, ruling, true);
  }
  for (const [name, recorded] of [
    ['players deck start', 14.34671419114904],
    ['players deck end', 0.45328580885095704],
    ['coach deck start', 10.946714191149042],
    ['coach deck end', 4.15328580885096],
  ] as const)
    pin(name, metrics.find((m) => m.name === name)!.value, recorded);
  for (const o of obstacles) {
    minimum(
      `standing/${o.id}`,
      Math.min(...decks.map((d) => deckGap(d, o))),
      o.id === 'island and ramps' ? 0.55 : 0.25,
      o.id === 'island and ramps'
        ? 'docs/plans/rider-coach.md Home on merit: every car to platform edge 0.55 by design'
        : 'docs/plans/rider-coach.md R1b: static set clearance 0.25 m',
    );
    let gap = Infinity;
    // Sample at 0.25 m plus exact joins and end points.
    const end = CART_ROAD.forgeCm / 100 + 120;
    const samples = [142 + LEG.len, CART_ROAD.forgeCm / 100, end];
    for (let d = 142; d < end; d += 0.25) samples.push(d);
    for (const d of samples) {
      const s = Math.min(d, end),
        p = cartRoadAt(s, LINES),
        a = cartRoadAt(Math.max(0, s - 1.1), LINES),
        b = cartRoadAt(s + 1.1, LINES);
      gap = Math.min(gap, deckGap(box(p.x, p.z, Math.atan2(b.x - a.x, b.z - a.z), CART.hx, CART.hz), o));
    }
    minimum(`operating/${o.id}`, gap, 0.25, 'docs/plans/rider-coach.md R1b: operating static set clearance 0.25 m');
  }
  minimum(
    'engine/island',
    deckGap(decks[0]!, obstacles[0]!),
    0.55,
    'docs/plans/rider-coach.md Home on merit: every car to platform edge 0.55 by design',
  );
  pin('engine/island', deckGap(decks[0]!, obstacles[0]!), 0.5794398184781144);
  minimum(
    'engine/leg lever',
    deckGap(decks[0]!, obstacles[2]!),
    1,
    'docs/research/rider-car-fit.md: Parked layer at Pier, 1 m body/furniture rule; R1b orchestrator ruling',
  );
  pin('engine/leg lever', deckGap(decks[0]!, obstacles[2]!), 1.1341593429538008);
  return {
    level: 'home-cart',
    failures: problems.length,
    problems,
    designMinima: metrics,
    pins,
    thinMargins: {
      tailPastSpur: tail - SPUR.s,
      islandAboveMinimum: deckGap(decks[0]!, obstacles[0]!) - 0.55,
      passengerDeckFarEnd: metrics.find((m) => m.name === 'players deck end')!.value,
    },
    nose,
    tail,
    intoArc: nose - HEADS[1].segs[0].len,
    offLine,
    noseToMerge: FORMATION.quarry.from - nose,
    coverage:
      'R1a exclusive operating cart and standing planned coach train; planar body envelopes. Excluded: no 3D undercarriage/wheel contact certificate for spur or idle leg turnout blades, wing/check/closure rails, frog, timbers or tie plates (planar bodies would overlap their running surfaces). Trees use trunk boxes only: crown, branch and foliage contact at engine/coach roof height, wind sway, hardwood-specific crown shapes and root seats are not certified. Dynamic players, dropped cargo, loading motion and future train movement are excluded.',
  };
}
