// Pairs the two pages' `LAGTRACE` rows from dev/look/evals/railhead-lag.ts by wall time: the difference in
// `railheadView.shownU` between the pages at the same Date.now (page 2 interpolated at each page-1 row), and where
// each page drew the friend against the platform it drew.
//   node dev/look/lag-trace.ts <look's stdout, saved to a file>
import { readFileSync } from 'node:fs';
import { PLATFORM, SIDE } from '../../src/entities/railway/railhead-shape.ts';

/** As the eval pushes it: wall ms, shownU, haul phase, settled, own carry.on, the friend [along, off, over] (m). */
type Friend = [number, number, number];
type Row = [number, number, number, 0 | 1, string | null, Friend | null];
/** Drawn on the platform: along it, within its half-width (plus 0.35 m for the avatar), standing on its top. */
const onPlatform = ([along, off, over]: Friend) =>
  along >= 0 && along <= PLATFORM.len && off <= (SIDE.lat1 - SIDE.lat0) / 2 + 0.35 && over > -0.6 && over < 2.5;
const file = process.argv[2];
if (!file) {
  console.error('usage: node dev/look/lag-trace.ts <look output file>');
  process.exit(2);
}
const pages: Record<string, Row[]> = { p1: [], p2: [] };
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m = /LAGTRACE (p[12]) (\[.*\])\s*$/.exec(line);
  if (m) pages[m[1]!]!.push(...(JSON.parse(m[2]!) as Row[]));
}
const [a, b] = [pages.p1!, pages.p2!];
if (!a.length || !b.length) throw new Error(`no trace: p1 ${a.length} rows, p2 ${b.length}`);
a.sort((x, y) => x[0] - y[0]);
b.sort((x, y) => x[0] - y[0]);
/** Page 2's shownU at wall time t, when it has rows within 120 ms either side. */
const at = (t: number) => {
  const k = b.findIndex((r) => r[0] >= t);
  if (k <= 0) return null;
  const [r0, r1] = [b[k - 1]!, b[k]!];
  if (t - r0[0] > 120 || r1[0] - t > 120) return null;
  return r0[1] + ((r1[1] - r0[1]) * (t - r0[0])) / Math.max(1, r1[0] - r0[0]);
};
const u0 = a[0]![1],
  u1 = a[a.length - 1]![1];
const pairs: { t: number; d: number; u: number; speed: number; phase: number }[] = [];
for (let i = 1; i < a.length; i++) {
  const r = a[i]!;
  const u2 = at(r[0]);
  if (u2 === null) continue;
  const prev = a[i - 1]!;
  pairs.push({
    t: r[0],
    d: u2 - r[1],
    u: r[1],
    speed: ((r[1] - prev[1]) * 1000) / Math.max(1, r[0] - prev[0]),
    phase: r[2],
  });
}
const stats = (xs: number[]) => {
  const s = xs.map(Math.abs).sort((x, y) => x - y);
  return { n: s.length, median: s[s.length >> 1] ?? NaN, peak: s[s.length - 1] ?? NaN };
};
const moving = pairs.filter((p) => p.u > u0 + 0.05 && p.u < u1 - 0.05);
const fmt = (o: { n: number; median: number; peak: number }) =>
  `${o.n} pairs, median ${o.median.toFixed(3)} m, peak ${o.peak.toFixed(3)} m`;
const t0 = a[0]![0];
console.log(`p1 ${a.length} rows, p2 ${b.length} rows, ${((a[a.length - 1]![0] - t0) / 1000).toFixed(1)} s`);
console.log(`shownU p1 from ${u0} to ${u1}`);
console.log(`|p2 - p1| whole trace: ${fmt(stats(pairs.map((p) => p.d)))}`);
console.log(`|p2 - p1| while p1's deck moves: ${fmt(stats(moving.map((p) => p.d)))}`);
const ahead = moving.filter((p) => p.d > 0.005).length,
  behind = moving.filter((p) => p.d < -0.005).length;
console.log(`  while moving, page 2's deck ahead of page 1's in ${ahead} pairs, behind in ${behind}`);
const worst = [...pairs].sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 5);
for (const w of worst)
  console.log(
    `  at ${((w.t - t0) / 1000).toFixed(2)} s phase ${w.phase} u ${w.u.toFixed(2)} speed ${w.speed.toFixed(2)} m/s: p2 - p1 ${w.d.toFixed(3)} m`,
  );
// The difference by speed band, to see whether it grows with speed.
for (const [lo, hi] of [
  [0, 0.5],
  [0.5, 2],
  [2, 4],
  [4, 99],
] as const) {
  const band = moving.filter((p) => Math.abs(p.speed) >= lo && Math.abs(p.speed) < hi);
  if (band.length) console.log(`  speed ${lo} to ${hi} m/s: ${fmt(stats(band.map((p) => p.d)))}`);
}
for (const [name, rows] of Object.entries(pages)) {
  const seen = rows.filter((r) => r[5]);
  const off = seen.filter((r) => !onPlatform(r[5]!));
  const range = (k: 0 | 1 | 2) => {
    const xs = seen.map((r) => r[5]![k]);
    return `${Math.min(...xs).toFixed(2)} to ${Math.max(...xs).toFixed(2)}`;
  };
  const decks = [...new Set(rows.map((r) => r[4]))].join(', ');
  console.log(
    `${name} draws the friend: ${seen.length} of ${rows.length} rows, on the platform in ${seen.length - off.length}; along ${range(0)} m, off the middle ${range(1)} m, over the top ${range(2)} m; own carry.on: ${decks}`,
  );
  for (const r of off.slice(0, 5))
    console.log(`  off at ${((r[0] - t0) / 1000).toFixed(2)} s u ${r[1]} phase ${r[2]}: ${JSON.stringify(r[5])}`);
}
