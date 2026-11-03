// `node dev/economy/place-level.ts`: the level check for ?proto=place. `npm run level-check` composes today's island and
// dev/layouts from `Site`; it doesn't know this prototype's land, so this does the same honest job on it, with the same player
// limits: from spawn, what can you reach on foot, in each state of the job? And it reports how long the walks really are.
// It floods the 2 m grid of src/proto/place/terrain.ts at the player's walkable slope, plus what's solid to walk on (footbridges
// and laid track). It doesn't know about props in the way, which only the play-through (dev/look/evals/place-job.ts) tests.
import { WALKABLE_NY } from '../../src/constants.ts';
import { CELL, H, NX, NZ, PATH_SAMPLES, at as cellAt, cellX, cellZ, heights } from '../../src/proto/place/terrain.ts';
import {
  BUOYS,
  FORGE_FRAME,
  GREAT_TREE,
  GROVES,
  HEAD,
  LINES,
  LINKS,
  OAK,
  ORIGIN,
  PATHS,
  RACK,
  ROCKS,
  SCOPE,
  SPAWN,
  lineAt,
  railY,
  type Line,
  type LinePoint,
} from '../../src/proto/place/layout.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
// The player's slope limit, as a rise over one 2 m cell.
const maxRise = CELL * Math.tan(Math.acos(WALKABLE_NY));
const WATER = 0.2;
const k = (i: number, j: number) => i + j * NX;
const ij = (x: number, z: number) => [Math.round((x - cellX(0)) / CELL), Math.round((z - cellZ(0)) / CELL)] as const;

/** Extra links: a bridge or a laid track joins its cells whatever's under it. */
function linksFor(tracks: [Line, number, number][]) {
  const extra = new Map<number, number[]>();
  const join = (a: number, b: number) => {
    if (a === b) return;
    (extra.get(a) ?? extra.set(a, []).get(a)!).push(b);
    (extra.get(b) ?? extra.set(b, []).get(b)!).push(a);
  };
  for (const p of PATHS) {
    const a = p.pts[p.bridgeAt]!,
      b = p.pts[p.bridgeAt + 1]!;
    const [ai, aj] = ij(a[0], a[1]),
      [bi, bj] = ij(b[0], b[1]);
    join(k(ai, aj), k(bi, bj));
  }
  for (const [line, s0, s1] of tracks) {
    let prev = -1;
    for (let s = s0; s <= s1; s += 1) {
      lineAt(line, s, P);
      const [i, j] = ij(P.x, P.z);
      if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
      const c = k(i, j);
      if (prev >= 0) join(prev, c);
      prev = c;
    }
  }
  return extra;
}
function flood(tracks: [Line, number, number][]) {
  const extra = linksFor(tracks);
  const seen = new Uint8Array(NX * NZ);
  const [si, sj] = ij(SPAWN.x, SPAWN.z);
  const q = [k(si, sj)];
  seen[q[0]!] = 1;
  while (q.length) {
    const c = q.pop()!,
      i = c % NX,
      j = Math.floor(c / NX),
      h = heights[cellAt(i, j)]!;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const a = i + di,
        b = j + dj;
      if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const n = k(a, b);
      if (seen[n]) continue;
      const g = heights[cellAt(a, b)]!;
      if (g < WATER || Math.abs(g - h) > maxRise) continue;
      seen[n] = 1;
      q.push(n);
    }
    for (const n of extra.get(c) ?? [])
      if (!seen[n]) {
        seen[n] = 1;
        q.push(n);
      }
  }
  return seen;
}
const can = (seen: Uint8Array, x: number, z: number) => {
  // Near enough: within a couple of cells, for what stands on a wall's lip.
  const [i, j] = ij(x, z);
  for (let dj = -2; dj <= 2; dj++)
    for (let di = -2; di <= 2; di++) {
      const a = i + di,
        b = j + dj;
      if (a >= 0 && b >= 0 && a < NX && b < NZ && seen[k(a, b)]) return true;
    }
  return false;
};
let fails = 0;
function check(name: string, seen: Uint8Array, x: number, z: number) {
  const ok = can(seen, x, z);
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}`);
}
const framePos = (st: (typeof LINKS)[number]['stations'][number], l: Line, dir: number) => {
  lineAt(l, st.s - dir * 1.5, P);
  return { x: P.x - P.uz * st.side * 5.4, z: P.z + P.ux * st.side * 5.4 };
};
const [timber, quarry] = LINKS as [(typeof LINKS)[0], (typeof LINKS)[1]];

console.log(
  `\nAt the start: only the paths and footbridges (the player's slope limit: rise ${maxRise.toFixed(2)} m a cell)`,
);
const start = flood([]);
const N = LINES.north,
  E = LINES.east;
check('the machine, the long way round', start, N.xs[191]!, N.zs[191]!);
for (const st of timber.stations) {
  const q = framePos(st, N, -1);
  check(`frame ${st.id}`, start, q.x, q.z);
}
for (const g of GROVES) check(`the grove at ${g.x},${g.z}`, start, g.x, g.z);
check('the great tree', start, GREAT_TREE.x, GREAT_TREE.z);
for (const r of ROCKS) check(`the rock at ${r.x},${r.z}`, start, r.x, r.z);
check('the old oak', start, OAK.x, OAK.z);
check("the forge's frame", start, FORGE_FRAME.x, FORGE_FRAME.z);
check('the telescope', start, SCOPE.x, SCOPE.z);

console.log('\nOnce line 2 reaches Far Head');
const open = flood([
  [N, 0, N.len],
  [E, 0, quarry.stations[4]!.to],
]);
for (const st of quarry.stations) {
  const q = framePos(st, E, 1);
  check(`frame ${st.id}`, open, q.x, q.z);
  lineAt(E, st.s - 16, P);
  if (st.rack) check(`  its rack`, open, P.x - P.uz * st.side * 5.2, P.z + P.ux * st.side * 5.2);
}
for (const s of quarry.stops) {
  lineAt(E, s, P);
  check(`stop at ${s}`, open, P.x, P.z);
}
check('the forge rack', open, RACK.x, RACK.z);
const headCentre = can(start, HEAD.x, HEAD.z);
if (headCentre) {
  fails++;
  console.log(' FAIL  Far Head can be walked to before the line reaches it');
} else console.log('  ok   Far Head is out of reach until the line gets there');

console.log('\nRail grades: the steepest cell on each line');
for (const [name, l] of Object.entries(LINES)) {
  let most = 0;
  for (let s = 1; s < l.len; s++) most = Math.max(most, Math.abs(railY(l, s) - railY(l, s - 1)));
  console.log(`  ${name}: ${(most * 100).toFixed(1)}%`);
}

console.log('\nWalks, in metres and seconds at 5.6 m/s');
const pathLen = (p: number[][]) =>
  p.reduce((a, q, n) => (n ? a + Math.hypot(q[0]! - p[n - 1]![0]!, q[1]! - p[n - 1]![1]!) : 0), 0);
const long = pathLen(PATHS[0]!.pts);
const row = (name: string, m: number) => console.log(`  ${name}: ${m.toFixed(0)} m, ${(m / 5.6).toFixed(0)} s`);
row('village to the machine, the long way', long);
row('village to the machine, the new way', 191);
row('village to Far Head along line 2', quarry.stations[4]!.to);
console.log(
  `  (${PATH_SAMPLES.length} paths; ${BUOYS.n} buoys; origin ${ORIGIN.x}; land at Far Head ${H(HEAD.x + ORIGIN.x, HEAD.z).toFixed(1)} m)`,
);
console.log(fails ? `\n${fails} problem(s).` : '\nAll reachable.');
process.exit(fails ? 1 : 0);
