// R2b: production stock and stop. R1a (railway-check-line2.ts) proves these phases exclusive:
// trains on implies cart at rest (hidden); nothing uses the leg after the trains wake.
import {
  AXIS,
  BUFFERS,
  CROSSING,
  HEADS,
  HALL,
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
import { CART, FORMATION, LINES, LINKS, ORIGIN } from '../../src/place/layout.ts';
import { frameBesideLine, stationColliders } from '../../src/place/spatial-station.ts';
import { TREE_SOURCES } from '../../src/place/tree-sources.ts';
import { ENGINE_LONG_AHEAD } from '../../src/entities/railway/engine.ts';
import { STEEL_CAR, consistOf } from '../../src/entities/railway/cars.ts';
import {
  CAR_BUFFERS,
  ENGINE_BUFFERS,
  trainPlaces,
  deckAt,
  deckGap,
  type Deck,
} from '../../src/entities/railway/car-spacing.ts';
import { line2At } from '../../src/entities/railway/line2-path.ts';
import { CART_ROAD } from '../../src/sim/railway-cart.ts';
import { LINE2, RAIL_LINES, TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';

import clearancePins from './home-cart-pins.json' with { type: 'json' };

// Renderer-local dimensions have no headless exported records. test/home-cart.test.ts guards these
// against their production construction sites; derive envelopes here rather than repeat derived sizes.
export const HOME_STATIC = {
  lever: { w: 0.5, d: 0.8, along: 1.5, lat: 2.4 },
  forge: { postX: 1.25, postZ: 1.2, postW: 0.2, beamW: 2.7 },
  depot: { postX: 1.1, postZ: 0.8, postW: 0.14, bearerW: 0.2, along: 6, out: 8 },
  sign: { w: 1.3, border: 0.06, depth: 0.08, post: 0.12, x: -1.2, z: -1.55 },
  tree: { pine: 0.46, hardwood: 0.95, barkRelief: 0.13 },
};

export const COACH_STOP = RAIL_LINES[LINE2]!.halts[0]!.s / 100;
const consist = consistOf({ line: LINE2, wagon: true, steel: true });
// Symmetric envelopes for the along-track scalar checks. Keep R1b's measurement names and pins.
export const HOME_CONSIST = consist.map(({ role, spec, offset }) => ({
  ...spec,
  role: role === 'player' ? 'players' : role === 'rider' ? 'coach' : role,
  d: offset + (role === 'engine' ? ENGINE_LONG_AHEAD / 2 : 0),
  hz: spec.hz + (role === 'engine' ? ENGINE_LONG_AHEAD / 2 : 0),
}));
const vehicles = consist.map(({ role, spec, offset }) => ({
  d: offset,
  hx: spec.hx,
  back: spec.hz,
  front: spec.hz + (role === 'engine' ? ENGINE_LONG_AHEAD : 0),
  buffers: role === 'engine' ? ENGINE_BUFFERS : CAR_BUFFERS,
}));
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
  Object.assign(out, line2At(s, { x: 0, z: 0, ux: 0, uz: 0 }, true));
export function checkHomeCart(options: { stop?: number; obstacle?: (id: string, envelope: Deck) => Deck } = {}) {
  const stop = options.stop ?? COACH_STOP;
  const { lever, forge, depot, sign, tree } = HOME_STATIC;
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
    ['leg line 1 lever', side(0, LEG.from + lever.along, -lever.lat)],
    ['leg line 2 lever', side(1, LEG.to + lever.along, lever.lat)],
    ['spur lever', side(1, SPUR.s - lever.along, lever.lat)],
  ] as const)
    obstacles.push({ id, ...box(p.x, p.z, HALL.yaw, lever.w / 2, lever.d / 2) });
  obstacles.push({
    id: 'forge rack full',
    ...box(
      PROPS.rack.x,
      PROPS.rack.z,
      PROPS.rack.yaw,
      Math.max(forge.postX + forge.postW / 2, forge.beamW / 2),
      forge.postZ + forge.postW / 2,
    ),
  });
  for (const spec of LINKS[1]!.stations.slice(0, 2)) {
    const f = frameBesideLine(spec, LINES.east, 1),
      c = stationColliders(f, 0, true);
    for (const p of [...c.frame, c.feeder, ...(c.rails ? [c.rails] : [])])
      obstacles.push({
        id: `${spec.id}/${p.id}`,
        ...box(p.position.x - ORIGIN.x, p.position.z, p.yaw, p.shape.hx, p.shape.hz),
      });
    if (spec.id === 'Q2') {
      const x = f.x - ORIGIN.x - Math.sin(f.yaw) * depot.along - Math.cos(f.yaw) * spec.side * depot.out;
      const z = f.z - Math.cos(f.yaw) * depot.along + Math.sin(f.yaw) * spec.side * depot.out,
        y = f.yaw - Math.PI / 2;
      obstacles.push({
        id: 'Q2 rack full',
        ...box(x, z, y, depot.postX + depot.bearerW / 2, depot.postZ + depot.postW / 2),
      });
      obstacles.push({
        id: 'Q2 sign',
        ...box(
          x + sign.x * Math.cos(y) + sign.z * Math.sin(y),
          z - sign.x * Math.sin(y) + sign.z * Math.cos(y),
          y + Math.PI / 2,
          sign.w / 2 + sign.border,
          Math.max(sign.depth / 2 + 0.004, sign.post / 2),
        ),
      });
    }
  }
  for (const t of TREE_SOURCES.filter((t) => !t.cleared))
    obstacles.push({
      id: `tree ${t.index} trunk`,
      ...box(
        t.x - ORIGIN.x,
        t.z,
        0,
        (t.hardwood ? tree.hardwood * (1 + tree.barkRelief) : tree.pine) * t.size,
        (t.hardwood ? tree.hardwood * (1 + tree.barkRelief) : tree.pine) * t.size,
      ),
    });
  if (options.obstacle) for (const o of obstacles) Object.assign(o, options.obstacle(o.id, { ...o }));
  const places = trainPlaces(at, stop, vehicles, [], false);
  const decks = vehicles.map((v, i) => deckAt(at, places[i]!, v, blank()));
  const engine = HOME_CONSIST[0]!,
    nose = stop + engine.d + engine.hz;
  const tail = stop + HOME_CONSIST.at(-1)!.d - STEEL_CAR.hz;
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
    FORMATION.quarry.from - (stop + TRAIN_EXTENT.aheadCm / 100),
    0,
    'src/sim/railway-lines.ts TRAIN_EXTENT.aheadCm: forward safety reach before merge block',
    true,
  );
  pin('merge block ahead of reach', FORMATION.quarry.from - (stop + TRAIN_EXTENT.aheadCm / 100), 4.15);
  const straight = march(HEADS[1].start, [{ len: 1000 }], nose),
    bent = roadAt(1, nose);
  const offLine = Math.hypot(straight.x - bent.x, straight.z - bent.z);
  pin('nose s', nose, 28.35);
  pin('nose into arc', nose - HEADS[1].segs[0].len, 3.35);
  pin('nose off line', offLine, 0.3114362900980901);
  for (const v of HOME_CONSIST.slice(1))
    minimum(`${v.role} short of arc`, HEADS[1].segs[0].len - (stop + v.d + v.hz), 0);
  for (const v of HOME_CONSIST.slice(1, 3)) {
    minimum(`${v.role} deck start`, stop + v.d - v.hz - (ISLAND_A.deck0 + ROAD2_S), 0, ruling, true);
    minimum(`${v.role} deck end`, ISLAND_A.deck1 + ROAD2_S - (stop + v.d + v.hz), 0, ruling, true);
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
  pin('engine/island', deckGap(decks[0]!, obstacles[0]!), clearancePins['engine/island']);
  minimum(
    'engine/leg lever',
    deckGap(decks[0]!, obstacles[2]!),
    1,
    'docs/research/rider-car-fit.md: Parked layer at Pier, R1b orchestrator 1 m lever ruling by analogy with Pier parked-layer rule (not an established trackside furniture rule)',
  );
  pin('engine/leg lever', deckGap(decks[0]!, obstacles[2]!), clearancePins['engine/leg lever']);
  // R2b re-pin, orchestrator 16 November: real asymmetric long engine and production axle pose replace R1b's
  // symmetric planned envelope. No minimum changed; tail/spur and player far-end margins stay pinned.
  // Fixed records, never recomputed from today's geometry: each minimum has an independent drift pin.
  const recorded: Record<string, number> = clearancePins;
  for (const m of metrics) {
    if (!(m.name in recorded)) problems.push(`Missing clearance pin: ${m.name}`);
    else if (!pins.some((p) => p.name === m.name)) pin(m.name, m.value, recorded[m.name]!);
  }
  for (const name of Object.keys(recorded))
    if (!metrics.some((m) => m.name === name)) problems.push(`Stale clearance pin: ${name}`);
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
      'R1a exclusive operating cart and standing production coach train. Sampled planar-envelope check: 0.25 m cart samples plus joins and endpoints, no height discrimination and no continuous swept volume. Excluded: no 3D undercarriage/wheel contact certificate for spur or idle leg turnout blades, wing/check/closure rails, frog, timbers or tie plates (planar bodies would overlap their running surfaces). Trees use trunk boxes only: crown, branch and foliage contact at engine/coach roof height, wind sway, hardwood-specific crown shapes and root seats are not certified. Dynamic players, dropped cargo, loading motion and future train movement are excluded.',
  };
}
