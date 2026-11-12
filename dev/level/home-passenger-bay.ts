// node --import ./dev/sim/hooks.ts dev/level/home-passenger-bay.ts [--check]: the options page for where the bought
// passenger set stands at Home, docs/world/home-passenger-bay.html (docs/brainstorms/express-train.md, "Home's bay for
// the passenger set"; the owner picked A, the east bay, on 10 November). Every length on it is measured here from
// layout B's own data: the lines' heads, the spur, the table and the cart's leg (src/place/home-station.ts), the double
// formation and the town (src/place/layout.ts), the Q frames and the terrain. `--check` writes nothing and exits 1 when
// the page is stale. The page follows the artifact contract: body content only, a <title> first, inline CSS and JS.
// Home is drawn as layout B: home-b.ts must evaluate before Place's layout reads BOOGLE_HOME.
import './home-b.ts';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import * as home from '../../src/place/home-station.ts';
import * as layout from '../../src/place/layout.ts';
import * as terrain from '../../src/place/terrain.ts';
import * as spatial from '../../src/place/spatial-station.ts';

const OUT = fileURLToPath(new URL('../../docs/world/home-passenger-bay.html', import.meta.url));
if (!home.homeLayout()) throw new Error('home-b.ts did not set layout B');

type P = { x: number; z: number };
const r2 = (v: number) => Math.round(v * 100) / 100;
const path = (pts: P[], close = false) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${r2(p.x)} ${r2(p.z)}`).join('') + (close ? 'Z' : '');
const poly = (pts: P[]) => pts.map((p) => `${r2(p.x)},${r2(p.z)}`).join(' ');
const dist = (p: P, q: P) => Math.hypot(p.x - q.x, p.z - q.z);
const unit = (bearing: number): P => ({
  x: Math.sin((bearing * Math.PI) / 180),
  z: -Math.cos((bearing * Math.PI) / 180),
});
const right = (u: P): P => ({ x: -u.z, z: u.x });
const add = (p: P, u: P, k: number): P => ({ x: p.x + u.x * k, z: p.z + u.z * k });
const nearest = (p: P, pts: P[]) => Math.min(...pts.map((q) => dist(p, q)));
const m0 = (v: number) => String(Math.round(v));
const m1 = (v: number) => v.toFixed(1);
const secs = (m: number) => String(Math.round(m / 5.6));
const H = (p: P) => terrain.H(p.x + 1000, p.z);
const ap = (a: number, c: number): P => home.axisPoint(a, c);

const north = layout.LINES.north,
  east = layout.LINES.east;
const lp = { x: 0, z: 0, ux: 0, uz: 0 };
const lineP = (l: typeof east, s: number, lat = 0): P => {
  layout.lineAt(l, s, lp);
  return { x: lp.x - lp.uz * lat, z: lp.z + lp.ux * lat };
};
const road = (k: 0 | 1, s: number): P => (s < 0 ? home.roadAt(k, s) : lineP(k ? east : north, s));
const run = (f: (s: number) => P, s0: number, s1: number, step = 0.5) => {
  const out: P[] = [];
  for (let s = s0; s < s1; s += step) out.push(f(s));
  out.push(f(s1));
  return out;
};
const road1 = run((s) => road(0, s), home.BUFFERS[0], 68);
const road2 = run((s) => road(1, s), home.BUFFERS[1], 96);
const up2at = (s: number) => lineP(east, s, layout.upLat(layout.FORMATION.quarry, s)!);
const up1at = (s: number) => lineP(north, s, layout.upLat(layout.FORMATION.timber, s)!);
const up2 = run(up2at, 34, 96);
const up1 = run(up1at, 36, 68);
const eased2 = run(up2at, 34, 53.75, 0.25);
const legAt = (d: number) => home.march(home.LEG.start, home.LEG.segs, d);
const leg = run(legAt, 0, home.LEG.len, 0.25);
const spur = home.spurPoints() as P[];
const T = home.TABLE;

// ---- places
const hallBack = ap(home.HALL.a + home.HALL.d / 2, home.ISLAND_C);
const foot = ap(home.ISLAND_A.foot, home.ISLAND_C);
const stallDoor = home.stallFrame(home.STALLS.open).door as P;
const rectAt = (c: P, u: P, len: number, w: number) => {
  const r = right(u);
  return [
    add(add(c, u, -len / 2), r, -w / 2),
    add(add(c, u, len / 2), r, -w / 2),
    add(add(c, u, len / 2), r, w / 2),
    add(add(c, u, -len / 2), r, w / 2),
  ];
};
const boxYaw = (b: { x: number; z: number; w: number; d: number; yaw?: number }) => {
  const y = b.yaw ?? 0,
    c = Math.cos(y),
    s = Math.sin(y);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([i, j]) => {
    const lx = (i! * b.w) / 2,
      lz = (j! * b.d) / 2;
    return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c };
  });
};
const A = home.ISLAND_A,
  IC = home.ISLAND_C,
  half = home.ISLAND.width / 2;
const island = [ap(A.buffers, IC - half), ap(A.foot, IC - half), ap(A.foot, IC + half), ap(A.buffers, IC + half)];
const deck = [ap(A.deck0, IC - half), ap(A.deck1, IC - half), ap(A.deck1, IC + half), ap(A.deck0, IC + half)];
const hall = boxYaw(home.HALL);
const forge = boxYaw({ ...layout.FORGE, yaw: 0 });
const stalls = home.STALLS.bearings.map((b: number) => {
  const f = home.stallFrame(b);
  return { open: b === home.STALLS.open, pts: rectAt(f.centre, f.u, home.STALLS.depth, home.STALLS.width) };
});
const buf = (k: 0 | 1) => {
  const p = home.roadAt(k, home.BUFFERS[k]);
  const u = unit(p.bearing);
  return [add(p, right(u), -1.3), add(p, right(u), 1.3)];
};
const quarry = layout.LINKS.find((l: { id: string }) => l.id === 'quarry')!;
const frames = [0, 1].map((k) => {
  const f = spatial.frameBesideLine(quarry.stations[k]!, quarry.line, quarry.dir);
  const c = { x: f.x - 1000, z: f.z };
  return { c, pts: rectAt(c, { x: Math.sin(f.yaw), z: Math.cos(f.yaw) }, spatial.FRAME_W, spatial.FRAME_D) };
});
const town = [...layout.TOWN.start, ...layout.TOWN.wood.flat(), ...layout.TOWN.stone.flat()]
  .filter((p) => p.w && p.d)
  .map((p) => boxYaw({ x: p.x, z: p.z, w: p.w!, d: p.d!, yaw: p.yaw }));
const shelf = rectAt(home.SHELF_B, right(home.AXIS.d), home.SHELF_SIZE.crown * 2, 0.9);
// gorge edge: first x east of -64 where the land falls under 14 m
const VB = { x0: -103, z0: -32, x1: -13, z1: 47 };
const gorge: P[] = [];
for (let z = VB.z0; z <= VB.z1; z += 1) {
  let x = -64;
  while (x < VB.x1 && H({ x, z }) > 14) x += 0.5;
  gorge.push({ x, z });
}
gorge.push({ x: VB.x1, z: VB.z1 }, { x: VB.x1, z: VB.z0 });
const sector = (() => {
  const r = 26,
    p0 = add(T, unit(130), r),
    p1 = add(T, unit(250), r);
  return `M${r2(T.x)} ${r2(T.z)}L${r2(p0.x)} ${r2(p0.z)}A${r} ${r} 0 0 1 ${r2(p1.x)} ${r2(p1.z)}Z`;
})();
const shunt = home.shuntPath(9.6).pts as P[];
const train1 = run((s) => road(0, s), 1.3, 22.2);
const train2 = run((s) => road(1, s), 4.3, 25.2);

// ---- option A: the east bay, the outbound track carried straight back
const u54 = up2at(54),
  u60 = up2at(60);
const bu: P = { x: (u60.x - u54.x) / 6, z: (u60.z - u54.z) / 6 };
const bayAt = (sp: number) => add(u54, bu, sp - 54);
const BUF_A = 28,
  JOIN = 54;
const bayA = [bayAt(BUF_A), bayAt(JOIN)];
const bufA = [add(bayAt(BUF_A), right(bu), -1.3), add(bayAt(BUF_A), right(bu), 1.3)];
const setA = {
  coach: rectAt(bayAt(BUF_A + 0.3 + 1.6), bu, 3.2, 2.2),
  engine: rectAt(bayAt(BUF_A + 4.1 + 2.34), bu, 4.68, 2.2),
  long: rectAt(bayAt(BUF_A + 0.3 + 6.35), bu, 12.7, 2.6),
};
const off = (sp: number, o: number) => add(bayAt(sp), right(bu), o);
const platA = [off(28.3, 1.65), off(40, 1.65), off(40, 3.05), off(36, 4.25), off(28.3, 4.25)];
const rampA = [off(28.3, 4.25), off(28.3, 6.0), off(30.8, 6.0), off(30.8, 4.25)];
const doorA = off(29.9, 2.4);
const cA = bayAt(BUF_A + 0.3 + 4.25);
const legCross = leg.filter((p) => nearest(p, run(bayAt, BUF_A, JOIN, 0.25)) < 3).length * 0.25;
const perp = (p: P) => Math.abs((p.x - u54.x) * bu.z - (p.z - u54.z) * bu.x);
const nearBay = run(bayAt, BUF_A, JOIN, 0.25).reduce((b, p) => (dist(p, T) < dist(b, T) ? p : b));
const bearingFrom = (c: P, p: P) => ((Math.atan2(p.x - c.x, -(p.z - c.z)) * 180) / Math.PI + 360) % 360;
const a = {
  footToBuf: dist(foot, bayAt(BUF_A)),
  track: JOIN - BUF_A,
  gap85: nearest(bayAt(BUF_A + 8.8), eased2),
  gap127: nearest(bayAt(BUF_A + 13), eased2),
  gap127road2: nearest(bayAt(BUF_A + 13), road2),
  bufRoad1: nearest(bayAt(BUF_A), road1),
  rampRoad1: nearest(off(25.3, 1.65), road1),
  hall: dist(hallBack, foot) + dist(foot, doorA),
  round: dist(stallDoor, doorA),
  roundByFoot: dist(stallDoor, foot) + dist(foot, doorA),
  sight: dist(hallBack, cA),
  sightOff: Math.abs(home.toAxis(cA).c - IC),
  table: dist(T, nearBay),
  tableBearing: bearingFrom(T, nearBay),
  q2: perp(frames[1]!.c),
  legCross,
  ground: [28, 32, 36, 40, 44, 48, 54].map((sp) => r2(H(bayAt(sp)))),
};
// ---- option B: the cart's track
const carB = (d: number, len: number, w = 2.2) => {
  const p = legAt(d);
  return rectAt(p, unit(p.bearing), len, w);
};
const setB = {
  engine: carB(17 + 2.34, 4.68),
  coach: carB(17 + 5.28 + 1.6, 3.2),
  coach2: carB(17 + 5.28 + 3.7 + 1.6, 3.2),
};
const markS = 17,
  markA = markS - home.ROAD2_S;
const islandSpot = ap(markA, IC + 1.2);
const atPlat = {
  coach: rectAt(road(1, markS), home.AXIS.d, 3.2, 2.2),
  engine: rectAt(road(1, markS + 1.6 + 0.6 + 2.34), home.AXIS.d, 4.68, 2.2),
};
const cB = legAt(21.25);
const b = {
  d0: 17,
  d1: 25.5,
  d2: 29.7,
  road1at: nearest(legAt(17), road1),
  road2at85: Math.min(nearest(legAt(25.5), road2), nearest(legAt(25.5), up2)),
  road2at127: Math.min(nearest(legAt(29.7), road2), nearest(legAt(29.7), up2)),
  hall: dist(hallBack, islandSpot),
  round: dist(stallDoor, ap(markA, home.ROAD_GAP)),
  roundByFoot: dist(stallDoor, foot) + dist(foot, islandSpot),
  roll: home.LEG.len - 23.88 + (home.LEG.to - markS),
  sight: dist(hallBack, cB),
  ground: [16, 20, 24, 28].map((d) => r2(H(legAt(d)))),
  legLen: home.LEG.len,
};
// ---- option C: West landing (the blockout's two halts, world cm in src/sim/railway-world-lines.ts)
const WL = [
  { x: 788.69 - 1000, z: -5.76 },
  { x: 804.27 - 1000, z: 88.88 },
];
const c = {
  near: Math.min(...WL.map((w) => dist(w, home.HALL))),
  far: Math.max(...WL.map((w) => dist(w, home.HALL))),
  round: Math.min(...WL.map((w) => dist(w, stallDoor))),
};
const wlDir = (() => {
  const w = WL[1]!;
  const k = Math.hypot(w.x - home.HALL.x, w.z - home.HALL.z);
  return { x: (w.x - home.HALL.x) / k, z: (w.z - home.HALL.z) / k };
})();

const sightTri = (pts: P[]) => {
  const ang = (p: P) => Math.atan2(p.z - hallBack.z, p.x - hallBack.x);
  const lo = pts.reduce((m, p) => (ang(p) < ang(m) ? p : m)),
    hi = pts.reduce((m, p) => (ang(p) > ang(m) ? p : m));
  return poly([hallBack, lo, hi]);
};
const mid = (p: P, q: P): P => ({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 });
const T_ = (p: P, text: string, cls = 't', extra = '') =>
  `<text x="${r2(p.x)}" y="${r2(p.z)}" class="${cls}" ${extra}>${text}</text>`;
/** A label lying along the station's axis (bearing 70°, so 20° anticlockwise on the page), centred on `p`. */
const along = (p: P, text: string, cls = 's') =>
  T_(p, text, cls, `text-anchor="middle" transform="rotate(-20 ${r2(p.x)} ${r2(p.z)})"`);
const walkLabel = ap(15, -5.4);
const tableRow = (rows: [string, string][]) =>
  rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('\n');

const svg = `
<svg viewBox="${VB.x0} ${VB.z0} ${VB.x1 - VB.x0} ${VB.z1 - VB.z0}" role="img" aria-labelledby="map-title">
<title id="map-title">Home under layout B, to scale, north up, with the chosen bay option drawn over it</title>
<rect x="${VB.x0}" y="${VB.z0}" width="${VB.x1 - VB.x0}" height="${VB.z1 - VB.z0}" fill="var(--land)"/>
<polygon points="${poly(gorge)}" fill="var(--sea)"/>
${town.map((t: P[]) => `<polygon points="${poly(t)}" class="town"/>`).join('\n')}
<path d="${sector}" class="keep"/>
<polygon points="${poly(forge)}" class="bld"/>
<polygon points="${poly(hall)}" class="bld hall"/>
<polygon points="${poly(shelf)}" class="shelf"/>
<polygon points="${poly(island)}" class="plat ramp"/>
<polygon points="${poly(deck)}" class="plat"/>
${stalls.map((s: { open: boolean; pts: P[] }) => `<polygon points="${poly(s.pts)}" class="${s.open ? 'bld' : 'ruin'}"/>`).join('\n')}
<circle cx="${r2(T.x)}" cy="${r2(T.z)}" r="${T.r}" class="tt"/>
<path d="${path(shunt)}" class="shunt"/>
<path d="${path(up1)}" class="rail up"/>
<path d="${path(up2)}" class="rail up"/>
<path d="${path(road1)}" class="rail"/>
<path d="${path(road2)}" class="rail"/>
<path d="${path(spur)}" class="rail"/>
<path d="${path(leg)}" class="rail leg"/>
<path d="${path(buf(0))}" class="buffer"/>
<path d="${path(buf(1))}" class="buffer"/>
${frames.map((f) => `<polygon points="${poly(f.pts)}" class="frame"/>`).join('\n')}
<path d="${path(train1)}" class="svc"/>
<path d="${path(train2)}" class="svc svc2"/>

<g class="o-a">
<polygon points="${sightTri([...setA.coach, ...setA.engine])}" class="sight"/>
<polygon points="${poly(rampA)}" class="plat ramp new"/>
<polygon points="${poly(platA)}" class="plat new"/>
<path d="${path(bayA)}" class="rail bay"/>
<path d="${path(bufA)}" class="buffer bay"/>
<polygon points="${poly(setA.long)}" class="long"/>
<polygon points="${poly(setA.coach)}" class="car"/>
<polygon points="${poly(setA.engine)}" class="car eng"/>
<path d="${path([hallBack, foot, doorA])}" class="walk"/>
<path d="${path([stallDoor, doorA])}" class="walk w2"/>
<circle cx="${r2(u54.x)}" cy="${r2(u54.z)}" r="1" class="join"/>
<circle cx="${r2(frames[1]!.c.x)}" cy="${r2(frames[1]!.c.z)}" r="2.6" class="clash"/>
${T_({ x: -44.5, z: -8.5 }, 'East bay', 't b')}
${T_(add(u54, { x: 1, z: 0 }, 1.9), 'joins line 2', 's')}
${T_(add(legAt(10), { x: 1, z: 0 }, 2), "cart's track (lifted)", 's')}
${along(walkLabel, `${m0(a.hall)} m · ${secs(a.hall)} s<tspan class="x"> from the hall</tspan>`, 's w')}
${T_(add(mid(stallDoor, doorA), { x: 1, z: 0 }, 1.2), `${m0(a.round)} m · ${secs(a.round)} s`, 's w')}
${T_(add(frames[1]!.c, { x: 1, z: 0 }, 3.2), 'Q2 frame: in the way', 's f')}
</g>

<g class="o-b">
<polygon points="${sightTri([...setB.coach, ...setB.engine])}" class="sight"/>
<path d="${path(run(legAt, 0, home.LEG.len, 0.5))}" class="rail bay"/>
<polygon points="${poly(setB.coach2)}" class="long"/>
<polygon points="${poly(setB.coach)}" class="car"/>
<polygon points="${poly(setB.engine)}" class="car eng"/>
<polygon points="${poly(atPlat.coach)}" class="car ghost"/>
<polygon points="${poly(atPlat.engine)}" class="car ghost"/>
<path d="${path([hallBack, ap(markA, IC), islandSpot])}" class="walk"/>
<path d="${path([stallDoor, ap(markA, home.ROAD_GAP + 1.3)])}" class="walk w2"/>
${T_(add(legAt(10), { x: 1, z: 0 }, 2), "The cart's track", 't b')}
${along(walkLabel, `${m0(b.hall)} m · ${secs(b.hall)} s<tspan class="x"> from the hall</tspan>`, 's w')}
${T_({ x: -63.3, z: 10.2 }, `${m0(b.round)} m · ${secs(b.round)} s`, 's w')}
${T_({ x: -43, z: -8 }, 'when called, it rolls in', 's')}
${T_({ x: -43, z: -5.6 }, 'to platform 2 to load', 's')}
</g>

<g class="o-c">
<path d="${path([add(home.HALL, wlDir, 7), add(home.HALL, wlDir, 12.5)])}" class="walk arrow" marker-end="url(#ah)"/>
${T_({ x: -102.3, z: 20.6 }, 'to West landing', 's w')}
${T_({ x: -46, z: -14 }, 'No bay at Home', 't b')}
${T_({ x: -46, z: -11.1 }, 'it stands at West landing,', 's')}
${T_({ x: -46, z: -8.6 }, `${m0(c.near)}–${m0(c.far)} m west of here,`, 's')}
${T_({ x: -46, z: -6.1 }, `${secs(c.near)}–${secs(c.far)} s on foot`, 's')}
${along(ap(19, -5.4), 'service-train express only')}
${T_(add(legAt(10), { x: 1, z: 0 }, 2), "cart's track", 's')}
</g>

<defs><marker id="ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6Z" fill="var(--accent)"/></marker></defs>
${T_(ap(home.HALL.a, IC - 3.6), 'Hall', 't in', 'text-anchor="middle" dominant-baseline="middle"')}
${T_(layout.FORGE, 'Forge', 't in', 'text-anchor="middle" dominant-baseline="middle"')}
${T_({ x: -102.3, z: 3.3 }, 'Square', 's')}
${T_(add(road(0, 50), { x: 1, z: 0 }, 2), 'Line 1 to Camp', 't')}
${T_({ x: -14.5, z: 35 }, 'Line 2, the ring', 't', 'text-anchor="end"')}
${along(ap(11.8, -2.3), 'platform 1', 's x')}
${along(ap(19.5, 10.9), 'platform 2', 's x')}
${T_(add(T, { x: 0, z: 1 }, 21.6), 'Roundhouse', 't', 'text-anchor="middle"')}
${T_(add(T, { x: 0, z: 1 }, 24.2), '(train upgrade screen)', 's', 'text-anchor="middle"')}
${T_({ x: -67.5, z: 33.5 }, 'kept clear for', 's k', 'text-anchor="end"')}
${T_({ x: -67.5, z: 35.9 }, 'a bigger Roundhouse', 's k', 'text-anchor="end"')}
${T_(add(frames[0]!.c, { x: 0, z: 1 }, 3.1), 'Q1', 's x', 'text-anchor="middle"')}
${T_({ x: -19, z: -27 }, 'gorge', 's x', 'text-anchor="middle"')}
${T_({ x: -80.5, z: 14.6 }, 'engine spur', 's x')}

<g class="scale"><path d="M-101.5 45h10" class="rail"/><path d="M-101.5 44.2v1.6M-91.5 44.2v1.6" class="rail"/>${T_({ x: -96.5, z: 43.4 }, '10 m', 's', 'text-anchor="middle"')}
<path d="M-86 45.8v-4.2m-1.2 1.6l1.2-1.6 1.2 1.6" class="rail" fill="none"/>${T_({ x: -84.2, z: 43.6 }, 'N', 's')}</g>
</svg>`;

const css = `
:root { color-scheme: light; --bg: #f4f2e9; --panel: #fffdf5; --ink: #233d3c; --muted: #5d716f; --border: #c4cdc3;
  --sea: #cfe3e1; --land: #dfe5cd; --chalk: #cfd3c2; --plat: #f1e3b8; --flag: #b3261e; --mark: #c2410c; --good: #2f7d4a;
  --warn: #a15c00; --accent: #2f5f9e; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --bg: #132322; --panel: #1b2e2c;
  --ink: #eef2e2; --muted: #a9bdb4; --border: #3f5951; --sea: #12292b; --land: #2c4032; --chalk: #46584a; --plat: #7a6a3c;
  --flag: #ff8a80; --mark: #fdba74; --good: #86d39b; --warn: #f5c26b; --accent: #8fb8ff; } }
:root[data-theme="dark"] { color-scheme: dark; --bg: #132322; --panel: #1b2e2c; --ink: #eef2e2; --muted: #a9bdb4;
  --border: #3f5951; --sea: #12292b; --land: #2c4032; --chalk: #46584a; --plat: #7a6a3c; --flag: #ff8a80; --mark: #fdba74;
  --good: #86d39b; --warn: #f5c26b; --accent: #8fb8ff; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); }
body { font: 15px/1.5 system-ui, sans-serif; padding: 20px max(14px, env(safe-area-inset-right, 0px)) 40px max(14px, env(safe-area-inset-left, 0px)); overflow-x: hidden; }
main { max-width: 980px; margin: auto; min-width: 0; }
h1 { font: 700 25px/1.2 Georgia, serif; margin: 0 0 8px; }
h2 { font: 700 19px/1.3 Georgia, serif; margin: 28px 0 8px; }
p, li { max-width: 78ch; }
.muted { color: var(--muted); }
.bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 8px; }
button { font: inherit; font-size: 14px; padding: 8px 12px; min-height: 40px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel); color: var(--ink); cursor: pointer; }
button[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.map { background: var(--land); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.map svg { display: block; width: 100%; height: auto; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 8px 2px 0; font-size: 13px; color: var(--muted); }
.legend i { display: inline-block; width: 18px; height: 0; border-top: 3px solid var(--ink); vertical-align: middle; margin-right: 6px; }
.legend i.bay { border-color: var(--mark); } .legend i.walk { border-top: 2px dotted var(--accent); }
.legend i.keep { border-top: 2px dashed var(--flag); } .legend i.car { height: 9px; border: 0; background: var(--mark); border-radius: 2px; }
.legend i.long { height: 9px; border: 1.5px dashed var(--mark); border-radius: 2px; }
.table { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 10px 0; border: 1px solid var(--border); border-radius: 8px; }
table { border-collapse: collapse; width: 100%; background: var(--panel); font-size: 14px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
tr:last-child > * { border-bottom: 0; }
.facts th { width: 30%; font-weight: 650; }
.cmp td, .cmp th { min-width: 120px; }
.cmp th:first-child { min-width: 100px; }
.pick { background: var(--panel); border: 2px solid var(--good); border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
.pick p { margin: 4px 0; }
.rail { fill: none; stroke: var(--ink); stroke-width: 0.6; stroke-linecap: round; stroke-linejoin: round; }
.rail.up { stroke-width: 0.4; opacity: 0.65; }
.rail.bay { stroke: var(--mark); stroke-width: 0.9; }
.buffer { fill: none; stroke: var(--ink); stroke-width: 1; }
.buffer.bay { stroke: var(--mark); }
.bld { fill: var(--panel); stroke: var(--ink); stroke-width: 0.25; }
.ruin { fill: none; stroke: var(--ink); stroke-width: 0.25; stroke-dasharray: 0.8 0.6; }
.in { stroke: var(--panel); }
circle.tt { fill: var(--panel); stroke: var(--ink); stroke-width: 0.3; }
.town { fill: var(--chalk); opacity: 0.7; }
.shelf { fill: var(--muted); }
.plat { fill: var(--plat); stroke: var(--ink); stroke-width: 0.15; }
.plat.ramp { opacity: 0.55; }
.plat.new { stroke: var(--mark); stroke-width: 0.3; }
.keep { fill: var(--flag); fill-opacity: 0.07; stroke: var(--flag); stroke-width: 0.25; stroke-dasharray: 1.2 0.8; }
.frame { fill: var(--muted); }
.shunt { fill: none; stroke: var(--muted); stroke-width: 0.25; stroke-dasharray: 0.3 0.6; }
.svc { fill: none; stroke: var(--ink); stroke-width: 2.2; opacity: 0.16; }
.car { fill: var(--mark); stroke: var(--ink); stroke-width: 0.15; }
.car.eng { fill: var(--ink); }
.car.ghost { fill: none; stroke: var(--mark); stroke-width: 0.3; stroke-dasharray: 0.7 0.5; }
.long { fill: none; stroke: var(--mark); stroke-width: 0.3; stroke-dasharray: 0.9 0.6; }
.walk { fill: none; stroke: var(--accent); stroke-width: 0.45; stroke-dasharray: 0.2 1; stroke-linecap: round; }
.walk.arrow { stroke-dasharray: none; stroke-width: 0.6; }
.sight { fill: var(--accent); opacity: 0.1; }
.join { fill: none; stroke: var(--mark); stroke-width: 0.3; }
.clash { fill: none; stroke: var(--flag); stroke-width: 0.3; }
svg text { font-family: system-ui, sans-serif; fill: var(--ink); paint-order: stroke; stroke: var(--land); stroke-width: 0.5px; stroke-linejoin: round; }
.t { font-size: 1.7px; font-weight: 600; }
.s { font-size: 1.35px; }
.t.b { fill: var(--mark); } .s.w { fill: var(--accent); } .s.f, .s.k { fill: var(--flag); }
@media (max-width: 640px) { .t { font-size: 2.5px; } .s { font-size: 2.1px; } .x { display: none; } h1 { font-size: 22px; } }
#page[data-opt="a"] .o-b, #page[data-opt="a"] .o-c, #page[data-opt="b"] .o-a, #page[data-opt="b"] .o-c,
#page[data-opt="c"] .o-a, #page[data-opt="c"] .o-b { display: none; }
#page[data-opt="a"] .leg { stroke-dasharray: 0.5 0.9; opacity: 0.45; }
#page[data-opt="b"] .svc2 { display: none; }

`;

const factsA: [string, string][] = [
  [
    'Where it leaves and ends',
    `A dead-straight ${m0(a.track)} m track across the open ground past the end of the island. It ends at buffers ${m0(a.footToBuf)} m beyond the island's end ramp, and joins line 2's outbound track 54 m out along line 2, where line 2 has just become double. It is that outbound track carried straight back toward the station.`,
  ],
  [
    'Points and curves, against the track rules',
    `No new curve and no new points to bend through. The bay is the straight; the curve that already swings platform 2's road onto the outbound track (18 m radius, leaving at up to 16.7°) becomes the points. That curve misses the 7° rule for every train at Home today; the bay adds nothing to it. No kink. It ends, so it gets buffers and an end board: a marked terminal.`,
  ],
  [
    'Where the train stands',
    `Engine and one coach (8.5 m): from 0.3 m off the buffers, the coach at the buffer end beside its platform, the engine facing out. Longest that fits: 12.7 m, the longer-boiler engine and two coaches (eight seats), with ${m1(a.gap127)} m between track centres at its nose (the level check calls under 2.3 m too close). An end-game engine (10.7 to 14 m) with a coach does not fit.`,
  ],
  [
    'Walk to its door',
    `From the hall: ${m0(a.hall)} m, ${secs(a.hall)} s, straight down the island and off its end ramp. From the Roundhouse's open stall: ${m0(a.round)} m, ${secs(a.round)} s across line 2's track, or ${m0(a.roundByFoot)} m, ${secs(a.roundByFoot)} s round the island's end.`,
  ],
  [
    'What you see from the hall',
    `Standing under the line map you look straight down the island. The train is dead ahead, ${m0(a.sight)} m away, side-on in the gap between the two platforms' trains, its doors toward you. It is the thing at the end of the view.`,
  ],
  [
    'What it does to the running lines',
    `Leaving, it rolls straight onto the outbound track. It never stands at a platform or on the single track in front of them, so it can wait with its doors open for the full 20 s while service trains come and go beside it. It takes the next gap on the outbound track; if a service train is already pulling out, it follows it. Coming home it arrives at platform 2 like any train, lets riders off on the island, then backs into the bay from the outbound track (15 to 20 s, my estimate). It should never hold a service train longer than any train ahead would. Line 1 is untouched; the set cannot reach Camp from here.`,
  ],
  [
    'What it displaces',
    `The square, the shelf, the wagon's roll-out and the ground kept clear for a bigger Roundhouse: nothing (its nearest point is ${m0(a.table)} m from the table, on the far side of line 2). It does take two things. The cart's old track crosses it, so that track is lifted once the cart has stopped running. And Q2's old delivery frame stands ${m1(a.q2)} m from the bay's centre line, so it is cleared or moved about 2 m.`,
  ],
  [
    'What it costs to build',
    `${m0(a.track)} m of new track, one buffer stop, one short low platform (about 12 m, the island's own parts) and a ramp, and up to ${m1(18.3 - Math.min(...a.ground))} m of fill under the buffer end, where the ground dips. No world reset of its own: the track is only drawn, and where the set stands rides the reset the passenger train itself needs.`,
  ],
  [
    'Alone and together',
    `Alone: a ${secs(a.hall)} s walk, sit down, Go now. Together: the 20 s is always whole, and a friend who arrives late on a service train steps off on the island 10 to 20 m from the bay.`,
  ],
];
const factsB: [string, string][] = [
  [
    'Where it leaves and ends',
    `No new track. The set stands on the cart's track: the ${m0(b.legLen)} m link the cart uses from line 1 (54 m out) round into platform 2's road (26 m out). The cart stops running after Q6, long before a passenger train is bought. The link has no buffers and needs none: it runs through, joined at both ends.`,
  ],
  [
    'Points and curves, against the track rules',
    `Nothing new. The link is a 15 m curve, the same as the engine spur: far under the 60 m rule for running lines (and the 40 m one for slow loops), like everything else in Home's station. No kink.`,
  ],
  [
    'Where the train stands',
    `On the curve, ${b.d0} to ${b.d1} m along the link: the only stretch far enough from both lines (its first 16 m run within 3.3 m of line 1). The 12.7 m set fits too (to ${b.d2} m, ${m1(b.road2at127)} m from line 2). It stands bent round a 15 m curve with no platform beside it: you do not board it there.`,
  ],
  [
    'Walk to its door',
    `You board at platform 2 on the island: ${m0(b.hall)} m, ${secs(b.hall)} s from the hall, the shortest of the three. From the Roundhouse's open stall: ${m0(b.round)} m, ${secs(b.round)} s across the track (not through a standing train), or ${m0(b.roundByFoot)} m, ${secs(b.roundByFoot)} s round the island's end.`,
  ],
  [
    'What you see from the hall',
    `The same view down the island: the train is parked ${m0(b.sight)} m away past the island's end, side-on. When you call it, it rolls ${m0(b.roll)} m round the curve into platform 2 beside you (about 6 s): a small arrival of its own.`,
  ],
  [
    'What it does to the running lines',
    `It loads at platform 2, so for the roll-in, the wait and the pull-out (about 35 s) it holds line 2's only platform road and the single track in front of it. The express rule ends the wait early rather than hold a train, so with three trains on the ring the full 20 s will often be cut short (my estimate: to 10 to 15 s; not simulated). It never holds a service train, but it has no place of its own to wait. Line 1 is untouched, and from here the set could also leave for Camp.`,
  ],
  [
    'What it displaces',
    `Nothing. The square, the shelf, the wagon's roll-out and the Roundhouse's ground are all clear, and the cart's track stays as planned.`,
  ],
  ['What it costs to build', `No new track and no platform. No world reset of its own.`],
  [
    'Alone and together',
    `Everyone is already on the island where it loads, so the walk is the best of the three. But the wait for friends is the least certain: it shrinks whenever a service train is due.`,
  ],
];
const factsC: [string, string][] = [
  [
    'Where it leaves and ends',
    `Nothing is built at Home. The passenger train's Home berth is West landing, the ring's other end, where two terminals with buffers are already planned side by side.`,
  ],
  [
    'Points and curves, against the track rules',
    `Nothing at Home. West landing is not drawn yet, so its bay can be drawn to the rules from the start (a 40 m bay road, 65 m of parallel track, 7° points).`,
  ],
  ['Where the train stands', `At West landing. Any length its bay is drawn for.`],
  [
    'Walk to its door',
    `From the hall: ${m0(c.near)} to ${m0(c.far)} m through the village, ${secs(c.near)} to ${secs(c.far)} s in a straight line (longer by the real path, which is not laid out). From the Roundhouse: about ${m0(c.round)} m, ${secs(c.round)} s.`,
  ],
  [
    'What you see from the hall',
    `Nothing. The hall's board either sends you on foot ("from West landing") or gives you the first stage's express: the next service train with a headboard, at platform 2.`,
  ],
  [
    'What it does to the running lines',
    `Nothing changes at Home. From the hall the only express is the service train with a headboard, its wait cut short by traffic, exactly as before the purchase.`,
  ],
  ['What it displaces', `Nothing.`],
  [
    'What it costs to build',
    `Nothing at Home. West landing's bay is part of drawing that station (stage 6 of the map), so the purchase may show nothing near Home until then.`,
  ],
  [
    'Alone and together',
    `Friends at Home have nothing of their own to gather round: the train they bought is a ${secs(c.near)} s walk away, out of sight.`,
  ],
];

const html = `<title>Home's bay for the passenger train</title>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Three measured options for where the bought passenger train stands at Home, drawn to scale on layout B." />
<style>${css}</style>
<main id="page" data-opt="a">
<h1>Where does the bought passenger train stand at Home?</h1>
<p>The express comes in two stages: first the ordinary train with a headboard, later a passenger train the room buys, "kept ready at each big station". On 10 November you ruled that at Home it does not stand in the Roundhouse: "the Roundhouse stays the upgrade screen only; find it a bay elsewhere". This page draws Home as layout B (the one-station Home you picked on 9 November, not yet live) to scale from the layout code, with three answers. Pick a tab.</p>
<div class="bar" role="group" aria-label="Option">
<button type="button" data-pick="a" aria-pressed="true">A · East bay</button>
<button type="button" data-pick="b" aria-pressed="false">B · The cart's track</button>
<button type="button" data-pick="c" aria-pressed="false">C · No bay at Home</button>
</div>
<div class="map">${svg}</div>
<div class="legend">
<span><i></i>track (thin: line's second track)</span>
<span><i class="bay"></i>the option's track</span>
<span><i class="car"></i>engine and one coach, 8.5 m</span>
<span><i class="long"></i>longest set, 12.7 m</span>
<span><i class="walk"></i>walk, at 5.6 m/s</span>
<span><i class="keep"></i>kept clear for a bigger Roundhouse</span>
</div>
<p class="muted">North is up. Grey bars on the platform roads are service trains standing at their marks. The blue wedge is what a player in the hall's back doorway sees of the train.</p>

<section class="o-a">
<h2>A · East bay: off the end of the island</h2>
<p>A short straight bay in the open ground where the two lines part, past the island's end. The train stands on its own track with its own small platform, and leaves straight onto line 2 without using a platform road.</p>
<div class="table"><table class="facts">${tableRow(factsA)}</table></div>
</section>
<section class="o-b">
<h2>B · The cart's track: no new track</h2>
<p>The cart's link between the two lines falls idle when the cart retires. The train is kept there and rolls into platform 2 when called.</p>
<div class="table"><table class="facts">${tableRow(factsB)}</table></div>
</section>
<section class="o-c">
<h2>C · No bay at Home</h2>
<p>The honest do-nothing: the passenger train lives at West landing, and from the hall the first stage's express is all there is.</p>
<div class="table"><table class="facts">${tableRow(factsC)}</table></div>
</section>

<h2>Side by side</h2>
<div class="table"><table class="cmp">
<tr><th></th><th>A · East bay</th><th>B · The cart's track</th><th>C · No bay at Home</th></tr>
<tr><th scope="row">New track</th><td>${m0(a.track)} m, straight, buffers</td><td>0 m</td><td>0 m at Home</td></tr>
<tr><th scope="row">New platform</th><td>Yes, about 12 m</td><td>No (loads at platform 2)</td><td>No</td></tr>
<tr><th scope="row">Hall to its door</th><td>${m0(a.hall)} m · ${secs(a.hall)} s</td><td>${m0(b.hall)} m · ${secs(b.hall)} s</td><td>${m0(c.near)}–${m0(c.far)} m · ${secs(c.near)}–${secs(c.far)} s</td></tr>
<tr><th scope="row">Roundhouse to its door</th><td>${m0(a.round)} m · ${secs(a.round)} s</td><td>${m0(b.round)} m · ${secs(b.round)} s</td><td>about ${m0(c.round)} m · ${secs(c.round)} s</td></tr>
<tr><th scope="row">Seen from the hall</th><td>Yes, ${m0(a.sight)} m, dead ahead</td><td>Yes, ${m0(b.sight)} m, then it rolls in</td><td>No</td></tr>
<tr><th scope="row">Longest set</th><td>12.7 m</td><td>12.7 m, on a curve</td><td>Whatever West landing is drawn for</td></tr>
<tr><th scope="row">New curves</th><td>None</td><td>None (stands on the 15 m link)</td><td>None</td></tr>
<tr><th scope="row">Full 20 s wait for friends</th><td>Always</td><td>Often cut to 10–15 s (estimate)</td><td>As the first stage</td></tr>
<tr><th scope="row">Holds a service train</th><td>No</td><td>No, it leaves early instead</td><td>No</td></tr>
<tr><th scope="row">Displaces</th><td>The cart's track; Q2's old frame</td><td>Nothing</td><td>Nothing</td></tr>
<tr><th scope="row">Roundhouse's kept ground</th><td>Clear (${m0(a.table)} m away)</td><td>Clear</td><td>Clear</td></tr>
<tr><th scope="row">World reset of its own</th><td>No</td><td>No</td><td>No</td></tr>
</table></div>

<h2>Looked at and ruled out</h2>
<ul>
<li><b>In the Roundhouse, out by the engine spur.</b> Your ruling. Measured as well: the track behind the spur's points is ${m1(home.SPUR.s - home.BUFFERS[1])} m and an engine with one coach is 8.5 m, so it could not have turned back there without moving the buffers into the hall.</li>
<li><b>A bay beside the hall, south of platform 2's road.</b> It would be 5 m from the hall, but the engine spur swings across that ground 16 m along, and joining the two would need a 7 m curve or a moved table. It also sits on the ground kept free to relay the spur wider when the Roundhouse grows, with Q1's frame in the way.</li>
<li><b>North of line 1's road.</b> That is the forge's goods side: the boiler stand is 3.4 m from the track, with the dock and crane beside it.</li>
<li><b>A through track across the gap, line 1 to line 2's outbound track, no buffers.</b> It can be drawn at about 55 m radius, near the 60 m rule, but only about 7 m of it is far enough from both lines to stand a train on, and the set is 8.5 m.</li>
<li><b>The rule for designed stations (a 40 m bay road with 65 m of parallel track).</b> Home's two roads are parallel for 22 and 25 m before they curve apart. Home is the exception whichever option you pick.</li>
</ul>

<h2>Recommendation</h2>
<div class="pick">
<p><b>A, the east bay.</b> It is the only place at Home where the train can stand with its doors open for the full 20 s without sitting on a running line, in plain view down the island from the hall, and it touches nothing kept for the Roundhouse.</p>
<p class="muted">B is the fallback if the cart's track has to stay. C is not competitive: it leaves the hall with nothing to see or board after the purchase.</p>
</div>

<h2>What I could not confirm</h2>
<ul>
<li>Whether the cart's track stays as track after the cart retires. The plans say the cart stops serving after Q6; they do not say the rails are lifted.</li>
<li>What becomes of Q2's delivery frame once its job is done.</li>
<li>That outbound trains really run on the left-hand track from 54 m out. The layout draws it there (the double-track work); I read the drawing, not how trains are posed on it. A depends on it.</li>
<li>Every time above that is marked as an estimate. They come from distances; no simulation runs a train that belongs to no line yet.</li>
<li>West landing's layout. It is not drawn; its distances are straight lines to the blockout's two halts.</li>
<li>The ground under the bay is from the terrain data (level within about 0.9 m of the rails), not from a look in the game. Layout B is not live, and the level check does not know the spur, the cart's track or a bay.</li>
<li>If the joining curve on line 2 is later eased over 30 m instead of 20 (the rail map's proposal), A's join moves from 54 m to 64 m out. The bay still works, but where a standing train clears the next track should be measured again.</li>
</ul>
<p class="muted">Drawn from <code>src/place/home-station.ts</code>, <code>src/place/layout.ts</code> and the terrain by <code>dev/level/home-passenger-bay.ts</code>. Design only: nothing here is built. Brief: <code>docs/brainstorms/express-train.md</code>.</p>
</main>
<script>
(() => {
  const page = document.getElementById('page');
  const picks = [...document.querySelectorAll('[data-pick]')];
  const set = (o) => {
    page.dataset.opt = o;
    for (const b of picks) b.setAttribute('aria-pressed', String(b.dataset.pick === o));
  };
  for (const b of picks)
    b.addEventListener('click', () => {
      set(b.dataset.pick);
      try { history.replaceState(null, '', '#' + b.dataset.pick); } catch {}
    });
  const h = location.hash.slice(1);
  if (h === 'a' || h === 'b' || h === 'c') set(h);
})();
</script>
`;
// Formatted as the repo's Prettier would, so the page passes format:check without an ignore entry.
const page = await prettier.format(html, { ...(await prettier.resolveConfig(OUT)), filepath: OUT });
if (process.argv.includes('--check')) {
  if (fs.readFileSync(OUT, 'utf8') !== page) {
    console.error('docs/world/home-passenger-bay.html is stale: rerun dev/level/home-passenger-bay.ts');
    process.exit(1);
  }
} else fs.writeFileSync(OUT, page);
