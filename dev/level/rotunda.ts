// level-check's "rotunda" report (docs/plans/roundhouse-rotunda.md, step 1b): Home's Roundhouse as the keep-clear
// outline the kit gives (`rotundaFootprint`), against what the level check otherwise never reads at the table: every
// running track, the town's plots, the station's yard props, and the ground the blocks stand on. The bays painted past
// each end of the arc are reported, not failed: they show what a wider arc would take.
import { ROTUNDA_KIT, ROTUNDA_PREVIEW, bayFrame, rotundaFootprint, type RotundaSite } from '../../src/place/rotunda.ts';
import { BUFFERS, PROPS, ROTUNDA_HOME, legPoints, roadAt, spurPoints, type XZ } from '../../src/place/home-station.ts';
import { LINKS, ORIGIN } from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { TOWN_SLOTS, townBuilding, townLocal } from '../../src/place/town-plan.ts';
import { GRAVITY, JUMP_SPEED, PLAYER_R } from '../../src/constants.ts';
import { TUNABLES } from '../../src/sim/tune.ts';
import { terrainCollisionTiles, surfaceHeight } from '../../src/place/terrain.ts';
import { definitions } from '../../src/prefab/catalogue.ts';
import { openScene, type Solid } from './scene.ts';

/** Metres: a running rail's centre, a town footprint, a prop from any rail, and how level the blocks' ground must be. */
const LIMITS = { rail: 3.5, town: 4, prop: 3.5, level: 0.1 };
/** The open east side a footing is carried in by and the garage stands on (design review, finding 3): no yard prop
 * stands here within `CORRIDOR.r` of the table's centre. Bearings in degrees clockwise from north. */
const CORRIDOR = { from: 95, to: 125, r: 30 };

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);
function pointSegment(p: XZ, a: XZ, b: XZ) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return dist(p, { x: a.x + t * dx, z: a.z + t * dz });
}
const cross = (a: XZ, b: XZ, p: XZ) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
function segmentGap(a: XZ, b: XZ, c: XZ, d: XZ) {
  if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}
function inside(p: XZ, polygon: readonly XZ[]) {
  let hit = false;
  for (let i = 1; i < polygon.length; i++) {
    const a = polygon[i - 1]!,
      b = polygon[i]!;
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) hit = !hit;
  }
  return hit;
}
/** The gap between a closed outline and a line (0 when they cross or one holds the other). */
function clearance(outline: readonly XZ[], line: readonly XZ[], closed = false) {
  if (line.some((p) => inside(p, outline)) || (closed && outline.some((p) => inside(p, line)))) return 0;
  let gap = Infinity;
  for (let i = 1; i < outline.length; i++)
    for (let j = 1; j < line.length; j++)
      gap = Math.min(gap, segmentGap(outline[i - 1]!, outline[i]!, line[j - 1]!, line[j]!));
  return gap;
}
const bearingOf = (site: RotundaSite, p: XZ) =>
  ((Math.atan2(p.x - site.centre.x, -(p.z - site.centre.z)) * 180) / Math.PI + 360) % 360;

export function checkRotunda(site: RotundaSite = ROTUNDA_HOME) {
  const problems: string[] = [];
  const footprint = rotundaFootprint(site, site.order.length);
  const running: { id: string; pts: XZ[] }[] = LINKS.map(({ id, line }) => ({
    id: `line ${id}`,
    pts: Array.from(line.xs, (x, i) => ({ x, z: line.zs[i]! })),
  }));
  running.push({ id: 'leg', pts: legPoints() });
  for (const road of [0, 1] as const)
    running.push({ id: `stub ${road + 1}`, pts: [roadAt(road, BUFFERS[road]), roadAt(road, 0)] });
  let rail = Infinity,
    town = Infinity;
  for (const { id, pts } of running) {
    const gap = clearance(footprint, pts);
    rail = Math.min(rail, gap);
    if (gap < LIMITS.rail) problems.push(`${id} runs ${gap.toFixed(2)} m from the rotunda (${LIMITS.rail} m asked)`);
  }
  for (const { id } of TOWN_SLOTS) {
    const b = townBuilding(id);
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ].map(([x, z]) => townLocal(b, (x! * b.w) / 2, (z! * b.d) / 2));
    const gap = clearance(footprint, corners, true);
    town = Math.min(town, gap);
    if (gap < LIMITS.town) problems.push(`${id} stands ${gap.toFixed(2)} m from the rotunda (${LIMITS.town} m asked)`);
  }
  // Yard props stand outside the outline; the stone yard also off every rail (the bays' own roads and the spur too)
  // and out of the carry lane.
  const rails = [...running.map((t) => t.pts), spurPoints()];
  for (const bay of site.order) {
    const f = bayFrame(site, bay);
    rails.push([f.rim, f.back]);
  }
  for (const [id, p] of Object.entries(PROPS))
    if (inside(p, footprint)) problems.push(`${id} stands inside the rotunda's outline`);
  const yard = PROPS.yard,
    prop = Math.min(...rails.map((line) => clearance([yard, yard], line))),
    yardBearing = bearingOf(site, yard),
    yardOut = dist(yard, site.centre);
  if (prop < LIMITS.prop) problems.push(`the yard stands ${prop.toFixed(2)} m from a rail (${LIMITS.prop} m asked)`);
  if (yardOut < CORRIDOR.r && yardBearing >= CORRIDOR.from && yardBearing <= CORRIDOR.to)
    problems.push(`the yard stands in the carry lane (${yardBearing.toFixed(0)}°, ${yardOut.toFixed(1)} m out)`);
  // The blocks stand at the site's height: the ground under every bay must be level with it.
  let off = 0;
  const groundOff = (p: XZ) => Math.abs(H(p.x + ORIGIN.x, p.z) - site.y);
  for (const bay of site.order) {
    const f = bayFrame(site, bay),
      worst = Math.max(...[...f.corners, f.centre, f.door, f.back].map(groundOff));
    off = Math.max(off, worst);
    if (worst > LIMITS.level)
      problems.push(
        `bay ${f.bearing}° stands on ground ${worst.toFixed(2)} m off ${site.y} m (${LIMITS.level} m asked)`,
      );
  }
  // What a wider arc would take: the painted bays past each end, measured, never failed.
  const lo = Math.min(...site.order),
    hi = Math.max(...site.order);
  const wider = [lo - ROTUNDA_PREVIEW, hi + ROTUNDA_PREVIEW].map((bay) => {
    const f = bayFrame(site, bay),
      outline = [...f.corners, f.corners[0]];
    return {
      bearing: f.bearing,
      rail: Math.min(...running.map((t) => clearance(outline, t.pts))),
      ground: Math.max(...f.corners.map(groundOff)),
    };
  });
  return {
    level: `rotunda/${site.id}`,
    failures: problems.length,
    problems,
    bays: site.order.length,
    arcDeg: site.order.length * ROTUNDA_KIT.bayDeg,
    rail,
    town,
    prop,
    groundOff: off,
    wider,
  };
}

export function printRotunda(r: ReturnType<typeof checkRotunda>) {
  console.log(
    `${r.level}: ${r.failures ? `${r.failures} PROBLEMS` : 'ok'}; ${r.bays} bays (${r.arcDeg}°), nearest running rail ${r.rail.toFixed(2)} m, town footprint ${r.town.toFixed(2)} m, the yard to a rail ${r.prop.toFixed(2)} m, ground within ${r.groundOff.toFixed(2)} m`,
  );
  for (const w of r.wider)
    console.log(
      `  painted bay ${w.bearing}° (not planned): ${w.rail.toFixed(2)} m from a running rail, ground within ${w.ground.toFixed(2)} m`,
    );
  for (const p of r.problems) console.log(`  ${p}`);
}

/** A bounded physical clearance proof, not a controller/timing simulation. Sweep the actual player spheres along
 * a conservative plain held-jump arc over the actual terrain and record-authored rim. A footing occupies the
 * back visually; it keeps the player's body and jump impulse, but slows walking to the solo carry tune. No air jump or sprint. */
export async function checkPitEscape() {
  const site = ROTUNDA_HOME,
    cx = site.centre.x + ORIGIN.x,
    cz = site.centre.z,
    yaw = bayFrame(site, 0).yaw;
  const solids: Solid[] = terrainCollisionTiles().map((tile, i) => ({
    id: `pit-terrain-${i}`,
    source: { file: 'src/place/terrain.ts', symbol: 'terrainCollisionTiles' },
    shape: { kind: 'heightfield', heights: tile.heights, cell: tile.cell },
    position: tile.position,
    support: 'embedded',
  }));
  for (const [i, collider] of definitions['roundhouse.table']!.colliders.entries()) {
    if (collider.shape !== 'box' && collider.shape !== 'trunk') throw new Error('Unexpected pit collider');
    const a = (collider.rot?.[0] ?? 0) + yaw;
    solids.push({
      id: `pit-ring-${i}`,
      source: { file: 'src/content/prefabs/roundhouse.ts', symbol: 'prefabs' },
      shape:
        collider.shape === 'box'
          ? { kind: 'box', hx: collider.half[0], hy: collider.half[1], hz: collider.half[2] }
          : { kind: 'cylinder', rTop: collider.r, rBottom: collider.r, h: collider.h, segments: 12 },
      position: {
        x: cx + Math.cos(yaw) * collider.at[0] + Math.sin(yaw) * collider.at[2],
        y: site.y + collider.at[1],
        z: cz - Math.sin(yaw) * collider.at[0] + Math.cos(yaw) * collider.at[2],
      },
      rotation: { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) },
      support: 'embedded',
    });
  }
  const scene = await openScene(solids),
    problems: string[] = [];
  let paths = 0;
  try {
    for (const load of ['empty', 'footing'])
      for (let bearing = 0; bearing < 360; bearing += 15) {
        const speed = load === 'footing' ? TUNABLES.find((t) => t.key === 'railFootSoloSpeed')!.def / 100 : 5.6;
        const a = (bearing * Math.PI) / 180,
          ux = Math.sin(a),
          uz = Math.cos(a);
        // Walk to the bank before jumping; the live input proof also exercises an earlier launch at r6.5.
        const startR = 7.2;
        const x = cx + ux * startR,
          z = cz + uz * startR,
          ground = surfaceHeight(x, z);
        // Rest the actual spheres against the bank; the centre-height ray alone embeds a sphere on a slope.
        const support = scene.sweep({ x, y: ground + 0.6, z }, { x, y: ground - 0.1, z });
        if (!support) throw new Error('Pit jump has no starting support');
        const y = ground + 0.6 - 0.7 * support.fraction + 0.002;
        let previous = { x, y, z },
          cleared = false;
        // Conservative held-jump envelope: omit the apex float and use the controller's heavier fall.
        for (let frame = 1; frame <= 48; frame++) {
          const t = frame / 60,
            r = startR + speed * t,
            apex = JUMP_SPEED / GRAVITY,
            rise =
              t <= apex
                ? JUMP_SPEED * t - (GRAVITY * t * t) / 2
                : (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY) - (GRAVITY * 1.7 * (t - apex) * (t - apex)) / 2;
          const next = { x: cx + ux * r, z: cz + uz * r, y: y + rise };
          const hit = scene.sweep(previous, next);
          if (hit) {
            problems.push(`${load} ${bearing}°: ${hit.blocker} blocks plain jump at frame ${frame} (${hit.fraction})`);
            break;
          }
          // The whole body is beyond the kerb and above the apron; its subsequent ground contact is landing.
          if (r > site.tableR + ROTUNDA_KIT.rim + PLAYER_R + 0.02 && next.y >= site.y) {
            cleared = true;
            break;
          }
          previous = next;
        }
        paths++;
        if (!cleared && !problems.at(-1)?.startsWith(`${load} ${bearing}°:`))
          problems.push(`${load} ${bearing}°: did not clear kerb`);
      }
  } finally {
    scene.world.free();
  }
  return {
    level: 'rotunda/pit-escape',
    failures: problems.length,
    paths,
    problems,
    coverage:
      'Swept player spheres, terrain and pit record; plain held-jump envelope, empty and footing. Live input timing is separate.',
  };
}
