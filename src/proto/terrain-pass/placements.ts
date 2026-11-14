// What the live catalogs place on or beside Home's ground, as footprints the terrain pass must not move the drawn
// ground under (docs/plans/terrain-pass.md; review of 14 November: the jump course's platform p1 stands on ungraded
// rock, and the drawn ground a metre from it sank 0.12 m). The terrain's own record of what it graded (terrain.ts
// GRADED) covers buildings, rail beds and paths; this list is the placements that take no grading: the ancient
// technology (platforms, pillars, devices, gates, posts, secrets, the service walks), halts and their decks, station
// frames and props, the town's and rooms' plots by name. Pure numbers, read from the layout at load: a placement that
// moves, moves here with it. A new catalog has to be added below; dev/terrain-pass/census.ts looks for ones that
// were not, among the bodies of the running game.
import {
  BANK_CART,
  FORGE,
  FORGE_FRAME,
  HALTS,
  LINES,
  LINKS,
  ORIGIN,
  PATHS,
  ROOM_PLOTS,
  SPIRE,
  TOWN,
  UP_HALTS,
  lineAt,
  type LinePoint,
} from '../../place/layout.ts';
import { FINDERS_B, PROPS, SHELF_B, SHELF_SIZE, TABLE } from '../../place/home-station.ts';
import { SHORE_COAST, SHORE_HOP, SHORE_LANDING } from '../../place/shore-layout.ts';
import { FRAME_D, FRAME_W, frameBesideLine } from '../../place/spatial-station.ts';
import {
  DEVICES,
  FINDERS,
  GATES,
  GATE_SLAB,
  GLIDE_RAMP,
  LEVER,
  PADS,
  PILLARS,
  POSTS,
  SECRETS,
  SERVICE_ROUTES,
  SERVICE_WIDTH,
} from '../../place/tech-layout.ts';

/** A placement's footprint as a disc, Place-local metres: `r` reaches its furthest corner (no margin). */
export type Placement = { id: string; x: number; z: number; r: number };

const box = (id: string, x: number, z: number, w: number, d: number): Placement => ({
  id,
  x,
  z,
  r: Math.hypot(w, d) / 2,
});

/** Every catalogued placement on Home. Each entry is one thing a player stands on or beside. */
export function placements(): Placement[] {
  const out: Placement[] = [];
  // The ancient technology (tech-layout.ts).
  for (const p of PADS) out.push(box(`pad ${p.id}`, p.x, p.z, 2 * p.hx, 2 * p.hz));
  for (const p of PILLARS) {
    out.push({ id: `pillar ${p.id}`, x: p.x, z: p.z, r: p.r });
    if (p.lipTo) out.push({ id: `pillar ${p.id} lip`, x: p.lipTo.x, z: p.lipTo.z, r: 2 });
  }
  for (const [id, d] of Object.entries(DEVICES)) out.push({ id: `device ${id}`, x: d.x, z: d.z, r: 1.5 });
  out.push(box('glide ramp', GLIDE_RAMP.x, GLIDE_RAMP.z, 2 * GLIDE_RAMP.hx, 2 * GLIDE_RAMP.hz));
  for (const [id, g] of Object.entries(GATES))
    out.push({ id: `gate ${id}`, x: g.x, z: g.z, r: GATE_SLAB.w / 2 + GATE_SLAB.pillar });
  out.push({ id: 'lever', x: LEVER.x, z: LEVER.z, r: 1 });
  POSTS.forEach((p, n) => out.push({ id: `post ${n}`, x: p.x, z: p.z, r: 0.8 }));
  for (const s of SECRETS) out.push({ id: `secret ${s.id}`, x: s.x, z: s.z, r: 1 });
  out.push({ id: 'finders', x: FINDERS.x, z: FINDERS.z, r: 2 });
  for (const [id, route] of Object.entries(SERVICE_ROUTES))
    route.slice(0, -1).forEach((a, k) => {
      const b = route[k + 1]!,
        steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
      for (let n = 0; n <= steps; n++)
        out.push({
          id: `service walk ${id}`,
          x: a.x + ((b.x - a.x) * n) / steps,
          z: a.z + ((b.z - a.z) * n) / steps,
          r: SERVICE_WIDTH / 2,
        });
    });
  // The spire's lowest drum (land.ts buildSpire: 11 m at its foot), which stands on its islet.
  out.push({ id: 'spire', x: SPIRE.x, z: SPIRE.z, r: 11 });
  // The town, its rooms and the camps, by name (their pads are in GRADED too).
  const plots = [
    ...TOWN.start.map((p, n) => ({ id: `town start ${n} ${p.type}`, p })),
    ...TOWN.wood.flatMap((tier, t) => tier.map((p, n) => ({ id: `town wood ${t}.${n} ${p.type}`, p }))),
    ...TOWN.stone.flatMap((tier, t) => tier.map((p, n) => ({ id: `town stone ${t}.${n} ${p.type}`, p }))),
    ...TOWN.camps.flatMap((camp, c) => [
      ...camp.asleep.map((p, n) => ({ id: `camp ${c} asleep ${n} ${p.type}`, p })),
      ...camp.awake.map((p, n) => ({ id: `camp ${c} awake ${n} ${p.type}`, p })),
    ]),
  ];
  for (const { id, p } of plots) out.push(box(id, p.x, p.z, p.w ?? 6, p.d ?? 6));
  for (const [id, p] of Object.entries(ROOM_PLOTS)) out.push(box(`room ${id}`, p.x, p.z, p.w, p.d));
  out.push(box('forge', FORGE.x, FORGE.z, FORGE.w, FORGE.d));
  out.push(box('forge frame', FORGE_FRAME.x, FORGE_FRAME.z, FRAME_D, FRAME_W));
  // The home station (home-station.ts) and the bank cart.
  for (const [id, p] of Object.entries(PROPS)) out.push({ id: `station ${id}`, x: p.x, z: p.z, r: 2 });
  out.push({ id: 'turntable', x: TABLE.x, z: TABLE.z, r: TABLE.r });
  for (const [id, p] of [
    ['curio shelf', SHELF_B],
    ['finders bay', FINDERS_B],
  ] as const)
    out.push({ id, x: p.x, z: p.z, r: Math.hypot(SHELF_SIZE.crown, SHELF_SIZE.front) });
  out.push({ id: 'bank cart', x: BANK_CART.x, z: BANK_CART.z, r: 2.5 });
  if (SHORE_COAST) {
    out.push({ id: 'shore landing', x: SHORE_LANDING.x, z: SHORE_LANDING.z, r: 12 });
    out.push({ id: 'shore hop', x: SHORE_HOP.x, z: SHORE_HOP.z + 7, r: SHORE_HOP.bottom });
  }
  // Along the lines: each station's frame, and every halt's deck from s0 to s1, `lat` to the side.
  for (const link of LINKS)
    for (const spec of link.stations) {
      const f = frameBesideLine(spec, link.line, link.dir);
      out.push(box(`station frame ${spec.id}`, f.x - ORIGIN.x, f.z - ORIGIN.z, FRAME_D, FRAME_W));
    }
  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const lines = Object.values(LINES);
  for (const halt of [...HALTS, ...UP_HALTS])
    for (let s = halt.s0; s <= halt.s1; s += 1) {
      lineAt(lines[halt.line]!, s, P);
      out.push({ id: `halt ${halt.name}`, x: P.x - P.uz * halt.lat, z: P.z + P.ux * halt.lat, r: 2.5 });
    }
  // Each footbridge's two abutments.
  PATHS.forEach((path, n) => {
    for (const p of [path.pts[path.bridgeAt]!, path.pts[path.bridgeAt + 1]!])
      out.push({ id: `footbridge ${n} abutment`, x: p[0], z: p[1], r: 2.5 });
  });
  return out;
}
