// Greybox leg 3's level report (docs/plans/greybox-leg3.md, steps 1 and 6): the catalog's named marks on the Canopy
// line, then Canopy's placed colliders (content/built/levels/canopy.json) on height grids, walked and swum with the
// controller's limits (./flood.ts, MOVER), and the baked numbers in src/content/levels/leg3.ts re-baked from the map.
//   node --import ./dev/sim/hooks.ts dev/level/route-leg3.ts           the report
//   node --import ./dev/sim/hooks.ts dev/level/route-leg3.ts --bake    rewrite leg3.ts's baked block
import fs from 'node:fs';
import { consistOf, offsetOf } from '../../src/entities/railway/cars.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { inside, layout, parseMapPage } from '../../src/sickle/map-data.ts';
import {
  legFrame,
  legRack,
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  rowPoint,
  rowSide,
} from '../../src/sim/railway-route.ts';
import { rowWorld } from '../../src/entities/railway/row-path.ts';
import * as L3 from '../../src/content/levels/leg3.ts';
import artifact from '../../content/built/prefabs.json' with { type: 'json' };
import { validateArtifact, loadLevelArtifact } from '../../src/prefab/validate.ts';
import { flood } from './flood.ts';
import { MOVER } from './mover.ts';
import { heightAt, reserveVolume, resolvePlacedColliders, volumesOverlap } from './prefab-colliders.ts';
import { AREA_CENTRES, ARRIVAL, coverNear } from '../../src/entities/route-greybox/leg2-layout.ts';

const records = (() => {
  const value: unknown = artifact;
  validateArtifact(value);
  return value;
})();

export function checkLeg3() {
  const leg = RAIL_LEGS.find((l) => l.id === 'bell-canopy')!;
  const entries: { message: string; passed: boolean }[] = [];
  const check = (message: string, passed: boolean) => entries.push({ message, passed });
  const apart = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z) / 100;
  const mark = (s: number, lat: number) => rowSide('bay', s, lat, 90, 400);
  const rack = legRack(leg, 0),
    frame = legFrame(leg, 0);
  const kit = offsetOf(consistOf({ line: leg.line, wagon: false, steel: false }), 'kit');
  const carDistance = apart(rack, mark(leg.fromCm + 100 * kit, 200)),
    carry = apart(rack, frame);
  check(
    `Bell Rock rack to kit car ${carDistance.toFixed(2)} m, rack to frame ${carry.toFixed(2)} m`,
    carDistance < 9 && carry < 15,
  );
  const map = readMap(),
    { land } = map;
  for (const [i, sec] of leg.sections.slice(0, -1).entries()) {
    const stop = sec.toCm - 1000;
    check(
      `Head ${i + 1} platform level at ${rowPoint('bay', stop).y / 100} m`,
      rowPoint('bay', stop - 1250).y === rowPoint('bay', stop + 1250).y,
    );
  }
  const p = rowPoint('bay', leg.sections[1]!.toCm - 1000),
    isle = land.find((l) => l.id === 'canopy-isle')!;
  const fraction = Math.hypot(
    (p.x / 100 - ORIGIN.x - isle.c![0]) / isle.r![0],
    (p.z / 100 - ORIGIN.z - isle.c![1]) / isle.r![1],
  );
  check(`Forest head at ${fraction.toFixed(2)} of the isle ellipse radius`, fraction < 1);
  const stop = leg.sections.at(-1)!.toCm;
  for (const id of ['wall-cn', 'wall-cs']) {
    const wall = land.find((l) => l.id === id)!,
      angle = (wall.rot! * Math.PI) / 180;
    const radius = wall.r![0] * (id === 'wall-cn' ? 1 : -1);
    const tip = {
      x: 100 * (ORIGIN.x + wall.c![0] + radius * Math.cos(angle)),
      z: 100 * (ORIGIN.z + wall.c![1] + radius * Math.sin(angle)),
    };
    let nearest = Infinity;
    for (let s = stop - 2000; s <= stop + 2000; s += 25)
      for (const lat of [-780, -380, 380, 780]) nearest = Math.min(nearest, apart(mark(s, lat), tip));
    check(`Canopy platforms to ${id} tip ${nearest.toFixed(2)} m`, nearest > 3.8 + 1.1);
  }
  const distance = apart(RAIL_GRANTS.find((g) => g.id === 'cloth')!.at, RAIL_GATES.find((g) => g.id === 'notch')!.at);
  check(`Cloth to Notch barrier ${distance.toFixed(2)} m`, Math.abs(distance - 10) < 0.1);
  entries.push(...canopyEntries(map));
  return { level: 'route leg 3', entries, failures: entries.filter((e) => !e.passed).length };
}

// ---------------------------------------------------------------- the bake (src/content/levels/leg3.ts)
type Land = ReturnType<typeof layout>['land'][number];
type Terrain = ReturnType<typeof layout>['terrain'][number];
type P = { x: number; z: number };
const LANDS = ['canopy-isle', 'wall-cn', 'wall-cs'] as const;
const r2 = (v: number) => Math.round(v * 100) / 100,
  r4 = (v: number) => Math.round(v * 1e4) / 1e4;
/** The page's layout (docs/world/map-prototypes.html, option A), read once per report or bake. */
const readMap = () =>
  layout(
    parseMapPage(fs.readFileSync(new URL('../../docs/world/map-prototypes.html', import.meta.url), 'utf8')),
    'sickle',
    'A',
  );
const side = (p: P, q: P, r: P) => Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x));
const crosses = (a: P, b: P, c: P, d: P) => side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
/** Every number leg3.ts keeps, from the map and the drawn row (railway/row-path.ts). */
export function bakeCanopy(land: readonly Land[], terrain: readonly Terrain[]) {
  const rings = Object.fromEntries(
    LANDS.map((id) => [
      id,
      land.find((l) => l.id === id)!.outline.map(([x, z]) => ({ x: r2(x + ORIGIN.x), z: r2(z + ORIGIN.z) })),
    ]),
  ) as Record<(typeof LANDS)[number], P[]>;
  const centre = (ring: readonly P[]): [number, number] => [
    r2(ring.reduce((n, p) => n + p.x, 0) / ring.length),
    r2(ring.reduce((n, p) => n + p.z, 0) / ring.length),
  ];
  const centres = Object.fromEntries(LANDS.map((id) => [id, centre(rings[id])])) as Record<
    (typeof LANDS)[number],
    [number, number]
  >;
  // The beach: off each isle edge, outward, 40 m; not inside an islet, not across the row's deck (s 2040 to 2140, and
  // 6 m either side of it).
  const islets = ['wall-cn', 'wall-cs'].map((id) => land.find((l) => l.id === id)!.outline),
    isle = rings['canopy-isle'],
    [cx, cz] = centres['canopy-isle'],
    q = { x: 0, z: 0 },
    rows = [-6, 0, 6].map((e) => [{ ...rowWorld(3, 2040, e, q) }, { ...rowWorld(3, 2140, e, q) }] as const);
  const beach: [number, number, number, number, number][] = [];
  isle.forEach((a, i) => {
    const b = isle[(i + 1) % isle.length]!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    let nx = (b.z - a.z) / len,
      nz = -(b.x - a.x) / len;
    if (nx * (mid.x - cx) + nz * (mid.z - cz) < 0) [nx, nz] = [-nx, -nz];
    if (islets.some((w) => inside([mid.x - ORIGIN.x, mid.z - ORIGIN.z], w))) return;
    const far = (p: P) => ({ x: p.x + nx * 40, z: p.z + nz * 40 }),
      quad = [a, b, far(b), far(a)];
    if (rows.some(([p, r]) => quad.some((c, k) => crosses(p, r, c, quad[(k + 1) % 4]!)))) return;
    beach.push([i, r2(mid.x + nx * 20), r2(mid.z + nz * 20), r4(Math.atan2(nx, nz)), r2(len + 1)]);
  });
  // The forest's trunks as the horizon draws them (sickle-backdrop/view.ts), each 0.5 m into the isle's 12 m top.
  const forest = terrain.find((t) => t.kind === 'forest' && t.land === 'canopy-isle')!,
    trunks: [string, number, number, number, number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    trunks.push([
      `trunk-${i}`,
      r2(forest.c![0] + ORIGIN.x + Math.cos(a) * forest.r![0] * 0.65),
      r2(forest.c![1] + ORIGIN.z + Math.sin(a) * forest.r![1] * 0.65),
      12,
      44,
      32.5,
    ]);
  }
  const motherTop = (forest.motherH ?? 150) - 30;
  for (const [i, [x, z]] of (forest.mothers ?? []).entries())
    trunks.push([`mother-${i}`, r2(x + ORIGIN.x), r2(z + ORIGIN.z), 10, motherTop, motherTop - 11.5]);
  // The bank's chords past the straight (s 2413) to the drawn end (the buffers' face s 2423.93, the end 2425.73).
  const at = [2413, 2416, 2420, 2423.93, 2425.73].map((s) => {
    rowWorld(3, s, 0, q);
    return { x: r2(q.x), z: r2(q.z) };
  });
  const curve = at.slice(1).map((b, i) => {
    const a = at[i]!;
    return [a.x, a.z, b.x, b.z, r2(Math.hypot(b.x - a.x, b.z - a.z))];
  });
  return { rings, centres, beach, trunks, curve };
}
function bakedText(b: ReturnType<typeof bakeCanopy>) {
  const list = (rows: readonly (readonly (string | number)[])[]) =>
    rows.map((r) => `  [${r.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(', ')}],`).join('\n');
  return [
    "/** The map's smoothed outlines (docs/world/map-prototypes.html, option A's `land` rings), world x, z pairs. */",
    'export const CANOPY_LANDS = {',
    ...LANDS.map((id) => `  '${id}': [${b.rings[id].flatMap((p) => [p.x, p.z]).join(', ')}],`),
    '} as const;',
    "/** Each ring's centroid: its collider's top is a fan from here (each ring is star-shaped about it). */",
    'export const CANOPY_CENTRES = {',
    ...LANDS.map((id) => `  '${id}': [${b.centres[id].join(', ')}],`),
    '} as const;',
    '/** The beach: [isle edge, centre x, z, yaw (outward), width]. */',
    'export const CANOPY_BEACH = [',
    list(b.beach),
    '] as const;',
    "/** The forest's trunks (the map's `forest` on the isle, as the horizon draws them): [id, x, z, width, top, h]. */",
    'export const CANOPY_TRUNKS = [',
    list(b.trunks),
    '] as const;',
    '/** The drawn row past s 2413 (railway/row-path.ts, smoothed through the kink): [ax, az, bx, bz, length]. */',
    'export const CANOPY_CURVE = [',
    list(b.curve),
    '] as const;',
  ].join('\n');
}
const BAKED = /\/\/ <baked>[^\n]*\n[^\n]*\n([\s\S]*?)\/\/ <\/baked>\n/;

// ---------------------------------------------------------------- Canopy's colliders
const SEA = -6;
/** The largest difference between two nested lists of numbers and strings (Infinity on a shape or string mismatch). */
const off = (a: readonly unknown[], b: readonly unknown[]): number =>
  a.length !== b.length
    ? Infinity
    : Math.max(
        0,
        ...a.map((v, i) =>
          Array.isArray(v)
            ? off(v, b[i] as unknown[])
            : typeof v === 'number'
              ? Math.abs(v - (b[i] as number))
              : v === b[i]
                ? 0
                : Infinity,
        ),
      );
function canopyEntries(map: ReturnType<typeof layout>) {
  const entries: { message: string; passed: boolean }[] = [];
  const check = (message: string, passed: boolean) => entries.push({ message, passed });
  const f1 = (v: number) => v.toFixed(1);
  const fresh = bakeCanopy(map.land, map.terrain);
  // The baked numbers: each within 0.01 of a fresh bake (the map or the row moved: re-bake).
  const worst = Math.max(
    ...LANDS.map((id) =>
      off(
        L3.CANOPY_LANDS[id],
        fresh.rings[id].flatMap((p) => [p.x, p.z]),
      ),
    ),
    ...LANDS.map((id) => off(L3.CANOPY_CENTRES[id], fresh.centres[id])),
    off(L3.CANOPY_BEACH, fresh.beach),
    off(L3.CANOPY_TRUNKS, fresh.trunks),
    off(L3.CANOPY_CURVE, fresh.curve),
  );
  check(
    `leg3.ts's baked outlines, beach, trunks and curve match a fresh bake (worst ${worst.toFixed(3)} m)`,
    worst <= 0.011,
  );
  for (const id of LANDS) {
    const ring = L3.landPoints(id),
      [cx, cz] = L3.CANOPY_CENTRES[id];
    const star = ring.every((a, i) => {
      const b = ring[(i + 1) % ring.length]!;
      return (a.x - cx) * (b.z - cz) - (a.z - cz) * (b.x - cx) > 0;
    });
    check(`${id}'s outline is star-shaped about its centre (its collider's top is a fan)`, star);
  }

  // The level: its boxes and the lands' prisms on two grids, the halt's at 0.5 m and the whole isle's at 2 m.
  const level = loadLevelArtifact(
    JSON.parse(fs.readFileSync('content/built/levels/canopy.json', 'utf8')),
    records.prefabs,
  );
  const A = level.analysis as unknown as L3.Leg3Analysis,
    M = A.marks,
    resolved = resolvePlacedColliders(level, records.prefabs),
    triangles = resolved.colliders.flatMap((c) => c.volume.triangles),
    walls = resolved.colliders
      .filter((c) => c.definition.shape === 'trimesh')
      .slice(1)
      .flatMap((c) => c.volume.triangles);
  const grid = (o: P, half: number, cell: number) => {
    const n = Math.round((2 * half) / cell) + 1,
      h = new Float32Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        h[i * n + j] = heightAt(triangles, { x: o.x - half + i * cell, z: o.z - half + j * cell }) ?? SEA;
    const node = (p: P) => {
      const i = Math.round((p.x - o.x + half) / cell),
        j = Math.round((p.z - o.z + half) / cell);
      if (i < 0 || j < 0 || i >= n || j >= n) throw new Error(`route-leg3: (${f1(p.x)}, ${f1(p.z)}) is off the grid`);
      return i * n + j;
    };
    return { g: { n, cell, h }, node };
  };
  const reached = (seen: Uint8Array, node: (p: P) => number, rows: [string, P][]) => {
    const missed = rows.filter(([, p]) => !seen[node(p)]).map(([name]) => name);
    return { ok: !missed.length, text: missed.length ? `NOT ${missed.join(', ')}` : rows.map(([n]) => n).join(', ') };
  };
  const halt = grid(A.origin, 70, 0.5);
  const fromOut = reached(flood(halt.g, MOVER, [halt.node(M.platformOut)]), halt.node, [
    ['the homeward platform', M.platformHome],
    ['the deck', M.deck],
    ['the cloth post', M.cloth],
    ['the Notch barrier', M.notch],
    ["the stand-in town's room", M.town],
  ]);
  check(`Canopy on foot from the outward platform: ${fromOut.text}`, fromOut.ok);
  const fromGround = reached(flood(halt.g, MOVER, [halt.node(M.town)]), halt.node, [
    ['the outward platform', M.platformOut],
    ['the homeward platform', M.platformHome],
    ['the cloth post', M.cloth],
  ]);
  check(`Canopy on foot from the isle's ground: ${fromGround.text}`, fromGround.ok);
  const isle = grid({ x: -1085, z: -300 }, 480, 2);
  const walking = { ...MOVER, jumpHeight: 0 };
  for (const reverse of [false, true]) {
    const seen = flood(isle.g, walking, [isle.node(M.deck)], { reverse });
    for (const [name, p] of [
      ['outward', M.wallOut],
      ['homeward', M.wallHome],
    ] as const)
      check(
        `Wall ${name} platform ${reverse ? 'to' : 'from'} the bay homeward deck on foot`,
        Math.abs(isle.g.h[isle.node(p)]! - 13.9) < 0.01 && !!seen[isle.node(p)],
      );
  }
  for (const [name, at] of [
    ['east', { x: -650, z: -300 }],
    ['north-east', { x: -820, z: -680 }],
    ['west', { x: -1510, z: -300 }],
    ['south-east', { x: -850, z: 60 }],
  ] as const) {
    const water = isle.g.h[isle.node(at)]! <= SEA,
      got = reached(flood(isle.g, MOVER, [isle.node(at)], { swim: true }), isle.node, [
        ['the isle inland', M.inland],
        ["head 2's ground (north)", M.head2North],
        ["head 2's ground (south)", M.head2South],
        ['Canopy Town', M.platformOut],
        ['Wall outward platform', M.wallOut],
        ['Wall homeward platform', M.wallHome],
      ]);
    check(`a swimmer in the sea ${name} of the isle${water ? '' : ' (NOT open water)'}: ${got.text}`, got.ok && water);
  }
  // Nothing of the halt stands in a chalk islet; each reserve is clear of the level's boxes and of the islets.
  const halts = new Set(A.surfaces.filter((s) => /^(platform|deck)/.test(s.name)).map((s) => s.id));
  const inWall = resolved.colliders
    .filter((c) => halts.has(c.placement.id))
    .filter((c) => c.volume.triangles.some((t) => [t.a, t.b, t.c].some((p) => (heightAt(walls, p) ?? SEA) > p.y)))
    .map((c) => c.placement.id);
  check(
    `Canopy's platforms and deck stand clear of both chalk islets${inWall.length ? `: NOT ${inWall.join(', ')}` : ''}`,
    !inWall.length,
  );
  const boxes = resolved.colliders.filter((c) => c.definition.shape === 'box');
  const wallIn = (r: L3.Leg3Analysis['reserves'][number]) => {
    const s = Math.sin(r.yaw),
      c = Math.cos(r.yaw);
    for (let a = -r.d / 2 + 0.25; a < r.d / 2; a += 0.5)
      for (let b = -r.w / 2 + 0.25; b < r.w / 2; b += 0.5)
        if ((heightAt(walls, { x: r.x + s * a + c * b, z: r.z + c * a - s * b }) ?? SEA) > r.y0 + 0.01) return true;
    return false;
  };
  const bad = A.reserves.flatMap((r) => {
    const v = reserveVolume(r),
      hit = [
        ...new Set(boxes.filter((b) => volumesOverlap(b.volume, v)).map((b) => b.placement.id)),
        ...(wallIn(r) ? ['a chalk islet'] : []),
      ];
    return hit.length ? [`${hit.join(', ')} in "${r.id}"`] : [];
  });
  check(
    bad.length
      ? `Canopy's reserves: ${bad.join('; ')}`
      : `Canopy's reserves are clear: ${A.reserves.map((r) => r.id).join(', ')}`,
    !bad.length,
  );
  // The floods above assume every collider is there: Canopy mounts within coverNear of its centre (route-greybox
  // index.ts), so every solid's farthest point (boxes, the isle and both islets' prisms) must lie ARRIVAL inside it.
  const near = coverNear(level.placements, records.prefabs, AREA_CENTRES.canopy),
    c = AREA_CENTRES.canopy,
    reach = Math.max(
      ...resolved.colliders
        .flatMap((k) => k.volume.triangles.flatMap((t) => [t.a, t.b, t.c]))
        .map((p) => Math.hypot(p.x - c.x, p.z - c.z)),
    );
  check(
    `Canopy mounts within ${near} m of its centre: its farthest solid point is ${f1(reach)} m out (needs ${near - ARRIVAL} at most)`,
    reach <= near - ARRIVAL + 0.01,
  );
  return entries;
}

if (import.meta.main) {
  if (process.argv.includes('--bake')) {
    const map = readMap();
    const file = 'src/content/levels/leg3.ts',
      source = fs.readFileSync(file, 'utf8'),
      found = source.match(BAKED);
    if (!found) throw new Error('route-leg3: no baked block in leg3.ts');
    const [first, second] = found[0].split('\n');
    const text = bakedText(bakeCanopy(map.land, map.terrain));
    fs.writeFileSync(
      file,
      source.replace(BAKED, () => `${first}\n${second}\n${text}\n// </baked>\n`),
    );
    console.log(`route-leg3: baked ${file}; run prettier on it`);
  } else {
    const report = checkLeg3();
    for (const e of report.entries) console.log(`  ${e.passed ? 'ok' : 'FAIL'}  ${e.message}`);
    process.exitCode = report.failures ? 1 : 0;
  }
}
