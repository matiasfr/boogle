// R2b.1: actual prefab operands and Q7's surviving pieces. Phase rules are the views' shared predicates,
// evaluated over every completion-bit pattern, not inferred from one saved seed or a still.
import { PLAYER_R, WALKABLE_NY } from '../../src/constants.ts';
import { CROSSING_WIDTH, LINKS, OFFSET_HALTS, ORIGIN, lineAt, upHaltReady } from '../../src/place/layout.ts';
import { stationColliders } from '../../src/place/spatial-station.ts';
import { haltRamps } from '../../src/prefab/halt-ramps.ts';
import { haltCrossing } from '../../src/prefab/halt-crossing.ts';
import { RAIL_LINES, TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';
import { LINE2_STATIONS, Q7 } from '../../src/sim/railway-line2-layout.ts';
import { RING_Q7_FRAME } from '../../src/sim/railway-ring-layout.ts';
import { createRailwayWorld, Forge, QJob, Works } from '../../src/sim/railway-components.ts';
import { qjobId } from '../../src/sim/railway-queries.ts';
import { line2Active, line2Completed } from '../../src/sim/railway-queries-line2.ts';
import { depotPieceVisible, q7Spot } from '../../src/entities/railway/q7-site.ts';
import { deckGap, type Deck } from '../../src/entities/railway/car-spacing.ts';
import { crateParts } from '../../src/render/cosmetic-parts.ts';
import { merged } from '../../src/render/part-geometry.ts';

/** Exhaustive inputs to the real view predicates, including unreachable patterns as a stronger bound.
 * Forge and crossing gates only suppress the active job; progress/start/stock cannot bypass completion. */
export function pierPhases() {
  const w = createRailwayWorld();
  let cases = 0;
  const failures: string[] = [];
  for (let bits = 0; bits < 2 ** LINE2_STATIONS.length; bits++)
    for (const lit of [-1, 0])
      for (const crossing of [-1, 0]) {
        w.mut(Forge, w.single(Forge))!.lit = lit;
        w.mut(Works, w.single(Works))!.crossing = crossing;
        for (let k = 0; k < LINE2_STATIONS.length; k++) w.mut(QJob, qjobId(w, k))!.completion = (bits >> k) & 1;
        const active = line2Active(w);
        // Ignore the main halt's additional train/visibility gate: this is a superset of when it can be solid.
        const planks = upHaltReady(5, line2Completed(w));
        for (const piece of ['depot', 'shelf'] as const)
          if (planks && active === Q7 && depotPieceVisible(active, piece))
            failures.push(`completion bits ${bits}, forge ${lit}, crossing ${crossing}: Q7 ${piece} and planks`);
        cases++;
      }
  return { cases, failures };
}

export function pierCrossingReport(assertion: (pass: boolean, text: string) => void) {
  const row = OFFSET_HALTS.findIndex((h) => h.pair === 5),
    h = OFFSET_HALTS[row]!;
  const line = LINKS[h.line]!.line;
  const at = (s: number, lat: number) => {
    const p = lineAt(line, s, { x: 0, z: 0, ux: 0, uz: 1 });
    return { x: p.x + ORIGIN.x - p.uz * lat, z: p.z + ORIGIN.z + p.ux * lat, yaw: Math.atan2(p.ux, p.uz) };
  };
  const pin = (name: string, value: number, recorded: number) =>
    assertion(Math.abs(value - recorded) <= 0.01, `${name}: ${value.toFixed(6)} m; pin ${recorded} ±0.01 m`);
  const minimum = (name: string, value: number, min: number, source: string) =>
    assertion(value >= min, `${name}: ${value.toFixed(6)} m; minimum ${min} m (${source})`);
  const stop = RAIL_LINES[1]!.halts[3]!.s / 100;
  const end = h.crossS + CROSSING_WIDTH / 2;
  for (const [name, tail, recorded] of [
    ['today, longest train', TRAIN_EXTENT.behindCm / 100, 4.2],
    ['planned R2b.3 coach train', 16.1, 0.8],
  ] as const) {
    minimum(
      `${name}: tail to planks`,
      stop - tail - end,
      0.6,
      'dev/level/ring.ts original Pier rule; docs/plans/rider-coach.md Pier audit',
    );
    pin(`${name}: tail to planks`, stop - tail - end, recorded);
  }
  pin('planks south edge s', h.crossS - CROSSING_WIDTH / 2, 707.2);
  pin('planks north edge s', end, 709.6);
  pin('head ramp station interval', h.headRamp ?? 6, 9.4);
  const ramp = haltRamps('pier-row', { row, up: true }).find((p) => p.params?.piece === 'ramp')!;
  const [ax, az, bx, bz, ya, yb] = ramp.params!.support as number[];
  const run = Math.hypot(bx! - ax!, bz! - az!),
    rise = yb! - ya!;
  const degrees = (Math.atan2(rise, run) * 180) / Math.PI;
  pin('ramp physical horizontal run', run, 9.369222);
  pin('ramp rise', rise, 0.67);
  pin('ramp slope surface length', Math.hypot(run, rise), 9.393147);
  assertion(
    degrees <= 15 && run / Math.hypot(run, rise) >= WALKABLE_NY,
    `Pier ramp ${degrees.toFixed(6)}° ≤15° and walkable (ring.ts ramp rule; WALKABLE_NY ${WALKABLE_NY})`,
  );
  assertion(Math.abs(degrees - 4.090301) <= 0.01, `ramp slope: ${degrees.toFixed(6)}°; pin 4.090301 ±0.01°`);
  assertion(Math.abs(end - (h.s0 - (h.headRamp ?? 6))) < 1e-9, 'crossing meets the ramp foot exactly in s');
  const phases = pierPhases();
  assertion(
    !phases.failures.length,
    `Q7 rack/shelf exclude walkable planks in all ${phases.cases} completion/forge/crossing states: ${phases.failures.join('; ') || 'exclusive'} (orchestrator R2b.1 phase ruling)`,
  );

  // Q7 is not a machined frame: line2-view.ts keeps it standing after completion, including loads and joins.
  // Feeder/frame kit meshes fit these horizontal envelopes (look-kit.ts stationKit; assets/src/place-kit.py).
  const f = at(710, 4.5);
  const colliders = stationColliders(
    { ...f, x: RING_Q7_FRAME.x / 100, z: RING_Q7_FRAME.z / 100, lx: Math.cos(f.yaw) * -1, lz: Math.sin(f.yaw) },
    24.34,
    true,
  );
  const pieces: (Deck & { name: string })[] = [...colliders.frame, colliders.feeder, colliders.rails!].map((p) => ({
    name: p.id,
    ...p.position,
    yaw: p.yaw,
    hx: p.shape.hx,
    back: p.shape.hz,
    front: p.shape.hz,
  }));
  const visual = haltCrossing('pier-row', { row, up: true })[0]!.params!;
  const plank = (visual.planks as number[][])[0]!;
  const edge: Deck = {
    x: plank[0]!,
    z: plank[2]!,
    yaw: visual.yaw as number,
    hx: plank[3]! / 2,
    back: plank[5]! / 2,
    front: plank[5]! / 2,
  };
  const frameGap = Math.min(...pieces.map((p) => deckGap(edge, p)));
  minimum(
    'Q7 frame including feeder to east planks',
    frameGap,
    0.6,
    'designer/orchestrator R2b.1 simultaneous-piece rule',
  );
  // Pin filled from the real oriented prefab and catalog frame, not rounded s/lat approximations.
  pin('Q7 frame including feeder to east planks', frameGap, 1.310301);

  // Every personal tier, including the opening shake's 1.14 scale and any rotation, inside a sphere about its pivot.
  // Decorative glow is not a piece of furniture. Personal boxes create no colliders.
  let radius = 0;
  for (const tier of ['common', 'rare', 'wonder'] as const) {
    const geo = merged(crateParts(tier));
    const positions = geo.getAttribute('position');
    for (let i = 0; i < positions.count; i++)
      radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)) * 1.14);
    geo.dispose();
  }
  const box = q7Spot('crate', { x: 0, y: 0, z: 0, yaw: 0 });
  // A conservative square enclosing that sphere: separating-axis gap never overstates the clearance.
  const boxEnvelope: Deck = { ...box, yaw: 0, hx: radius, back: radius, front: radius };
  const boxGap = deckGap(edge, boxEnvelope);
  minimum(
    'Q7 personal box (all tiers and shake) to east planks',
    boxGap,
    0.6,
    'designer/orchestrator R2b.1 simultaneous-piece rule',
  );
  pin('Q7 personal box (all tiers and shake) to east planks', boxGap, 1.476609);
  assertion(boxGap > 0, 'every player’s Q7 personal box stays off the planks');

  // A real-width corridor along the trestle's east side, then onto the existing east ramp's foot.
  const path = [at(h.crossS, 1.5), at(713, 1.5), at(713, 2.9)];
  let walkGap = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const corridor: Deck = {
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      hx: PLAYER_R,
      back: len / 2,
      front: len / 2,
    };
    walkGap = Math.min(walkGap, ...pieces.map((p) => deckGap(corridor, p)), deckGap(corridor, boxEnvelope));
  }
  minimum('east-end to east-ramp walking corridor', walkGap, 0, 'R2b.1 clear walk, swept PLAYER_R');
  pin('east-end to east-ramp walking corridor', walkGap, 0.853422);
}
