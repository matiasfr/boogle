// npm run town-plan-sheet: a static, source-linked plan, not a second layout authority. No game state or browser.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { sourceFunction } from './source.ts';
import {
  FORGE,
  LANDING,
  ORIGIN,
  PATHS,
  ROOM_PLOTS,
  SPAWN,
  TOWN,
  TOWN_BLOCKS,
  TOWN_FOOTING,
} from '../../src/place/layout.ts';
import { CELL, H as groundHeight, NX, NZ, at, cellX, cellZ, heights, pathMask } from '../../src/place/terrain.ts';
import { SECRETS, YARD_DRESSING, padById } from '../../src/place/tech-layout.ts';
import { LAND_TREES } from '../../src/place/tree-catalog.ts';
import {
  HALL,
  ISLAND,
  ISLAND_A,
  ISLAND_C,
  STALLS,
  TABLE,
  axisPoint,
  headPoints,
  spurPoints,
  stallFrame,
} from '../../src/place/home-station.ts';
import { SHORE_PATH } from '../../src/place/shore-layout.ts';
import {
  TOWN_CENTRE,
  TOWN_GREEN,
  TOWN_GROUND,
  TOWN_PLOTS,
  TOWN_PROPS,
  TOWN_RING,
  TOWN_SLOTS,
  TOWN_STREETS,
  slotPoint,
  townBuilding,
  townLocal,
  type TownBuilding,
  type TownId,
} from '../../src/place/town-plan.ts';

type Point = { x: number; z: number };
type Building = TownBuilding & {
  id: string;
  name: string;
  when: 'arrival' | 'free' | 'bought';
  door?: Point;
  face?: number;
};
type Rect = { x: number; y: number; w: number; h: number };
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(ROOT);
const OUT = '.look/town-plan-sheet';
const SOURCES = [
  'dev/level/town-plan-sheet.ts',
  'package.json',
  'src/place/layout.ts',
  'src/place/town-plan.ts',
  'src/place/home-station.ts',
  'src/place/shore-layout.ts',
  'src/place/terrain.ts',
  'src/place/tech-layout.ts',
  'src/place/tree-catalog.ts',
  'src/place/opening-plans.ts',
  'src/place/town-blockout.ts',
  'src/content/levels/town-blockout.ts',
  'src/entities/town/workshop.ts',
  'docs/plans/town-layout.md',
  'docs/plans/home-flip.md',
];
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sourceHashes = Object.fromEntries(
  SOURCES.map((f) => [f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')]),
);
const groundHash = createHash('sha256')
  .update(new Uint8Array(heights.buffer))
  .update(new Uint8Array(pathMask.buffer))
  .update(JSON.stringify(LAND_TREES))
  .digest('hex');
const stamp = createHash('sha256').update(JSON.stringify({ sourceHashes, groundHash })).digest('hex').slice(0, 12);
const names: Record<TownId, string> = {
  house: "Pip's house",
  gate: 'Gate cottage',
  museum: 'Museum',
  shop: 'Fine Prices',
  plot1: 'Plot 1',
  plot2: 'Plot 2',
  plot3: 'Plot 3',
  plot4: 'Plot 4',
  plot5: 'Plot 5',
  plot6: 'Plot 6',
  plot7: 'Plot 7',
  plot8: 'Plot 8',
};
const color = { arrival: '#39705a', free: '#386da0', bought: '#a46b20', today: '#81878b' };
const workshopDoor = sourceFunction<{ x: number; w: number }>('src/entities/town/workshop.ts', 'WORKSHOP_DOOR', {});
const hall: Building = { ...HALL, id: 'hall', name: 'Hall', when: 'arrival', face: HALL.yaw + Math.PI };
const forge: Building = {
  ...FORGE,
  yaw: 0,
  id: 'forge',
  name: 'Forge',
  when: 'free',
  // forgePlan's existing south opening, not the centre of the south wall.
  door: { x: FORGE.x + workshopDoor.x, z: FORGE.z + FORGE.d / 2 },
};
const stalls: Building[] = STALLS.bearings.map((bearing) => {
  const f = stallFrame(bearing);
  return {
    ...f.centre,
    yaw: f.yaw + Math.PI,
    w: STALLS.width,
    d: STALLS.depth,
    id: `stall${bearing}`,
    name: `Stall ${bearing}°`,
    when: 'free',
  };
});
// openingBuildings() draws TOWN.start and the distant camps. wood/stone are unused legacy growth rows.
const today: Building[] = [
  ...TOWN.start.map((b, i) => ({
    ...b,
    w: b.w ?? 6,
    d: b.d ?? 5,
    yaw: b.yaw ?? 0,
    id: i === 0 ? 'gate' : `cottage${i + 1}`,
    name: i === 0 ? names.gate : `cottage ${i + 1}`,
    when: 'arrival' as const,
  })),
  ...Object.entries(ROOM_PLOTS).map(([id, b]) => ({
    ...b,
    id,
    name: names[id as TownId],
    when: id === 'house' ? ('arrival' as const) : ('free' as const),
  })),
  // B3: the bought plots stand as plain blocks until each is detailed.
  ...TOWN_BLOCKS.map((b) => ({
    ...b,
    name: `${names[b.id]} · block`,
    when: 'bought' as const,
  })),
  hall,
  forge,
  ...stalls,
];
const round: Building[] = [
  ...TOWN_SLOTS.map((s) => ({
    ...townBuilding(s.id),
    id: s.id,
    name: names[s.id],
    when: s.when === 'T3' ? ('free' as const) : s.when,
  })),
  hall,
  { ...forge, name: 'Forge · west door', door: TOWN_PROPS.forgeDoor, face: -Math.PI / 2 },
  ...stalls,
];
// Already built on main (#1778); both layers use the actual drawn crowns, including their forward offset.
const curioFrames: Building[] = [
  { ...TOWN_PROPS.bay.foot, id: 'bay', name: "Finders' bay", when: 'arrival' },
  { ...TOWN_PROPS.shelf.foot, id: 'shelf', name: 'Curio shelf', when: 'arrival' },
];
const door = (b: Building): Point => b.door ?? townLocal(b, 0, ((b.face === undefined ? 1 : -1) * b.d) / 2);
const moves = [
  ...(['house', 'museum', 'shop'] as const).map((id) => ({
    name: names[id],
    from: today.find((b) => b.id === id)!,
    to: round.find((b) => b.id === id)!,
  })),
  { name: names.gate, from: today.find((b) => b.id === 'gate')!, to: round.find((b) => b.id === 'gate')! },
].filter((m) => Math.hypot(m.from.x - m.to.x, m.from.z - m.to.z) > 0.05);
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const opposite = [door(round.find((b) => b.id === 'house')!), door(round.find((b) => b.id === 'shop')!)] as const;
const hallFront = door(hall),
  gateDoor = door(round.find((b) => b.id === 'gate')!);
const measures = [
  { name: "Pip's house ↔ Fine Prices doors", a: opposite[0], b: opposite[1] },
  { name: 'Hall front ↔ green centre', a: hallFront, b: TOWN_CENTRE },
  { name: 'Shore spawn (LANDING) ↔ gate door', a: LANDING, b: gateDoor },
  { name: 'Village fallback (SPAWN) ↔ gate door', a: SPAWN, b: gateDoor },
];
const missing = [
  'Plot prices, stake/board sites and clock build trigger are not in town-plan.ts.',
  'Forge west steps have no geometry in town-plan.ts; only its door is specified.',
];
const notes = [
  'All panels use the same scale; north = −z. Footprints are outside walls, not roofs.',
  'TODAY = opening cottages + rooms + forge + layout B station; all build stages.',
  'Unused TOWN.wood/stone growth rows and distant camps are excluded.',
  'Paint and height cells are baked data; dashed paths are authored centrelines.',
  'B1 streets/cottage/yard built; bay and shelf already moved on main (#1778).',
  'B2 rooms and balcony built. B3: plots 1–8 and the clock footing stand as blocks.',
  'Doors have slab-matching thresholds; yard dressing follows the gift anchor.',
  'Distances are straight, horizontal metres, not walked routes or terrain slopes.',
  'Forge frame stands on arrival; free finish at F2. Shop/museum boards: arrival.',
  'Clock footing 5 × 5 m: arrival; clock: free with trains. Hall tick: town front.',
];
const esc = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const n = (v: number) => Number(v.toFixed(2));
const text = (x: number, y: number, s: string, size = 13, fill = '#26332f', extra = '') =>
  `<text x="${n(x)}" y="${n(y)}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;
const line = (x: number, y: number, x2: number, y2: number, stroke: string, extra = '') =>
  `<path d="M${n(x)},${n(y)} L${n(x2)},${n(y2)}" fill="none" stroke="${stroke}" ${extra}/>`;
const corners = (b: TownBuilding) =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, z]) => townLocal(b, (x! * b.w) / 2, (z! * b.d) / 2));
const allPoints = [...today, ...round].flatMap(corners).concat(
  SHORE_PATH.map(([x, z]) => ({ x, z })),
  LANDING,
);
const bounds = {
  x0: Math.floor((Math.min(...allPoints.map((p) => p.x)) - 6) / 10) * 10,
  x1: Math.ceil((Math.max(...allPoints.map((p) => p.x)) + 6) / 10) * 10,
  z0: Math.floor((Math.min(...allPoints.map((p) => p.z)) - 6) / 10) * 10,
  z1: Math.ceil((Math.max(...allPoints.map((p) => p.z)) + 6) / 10) * 10,
};
const SCALE = Math.min(710 / (bounds.x1 - bounds.x0), 510 / (bounds.z1 - bounds.z0));
const W = 1600,
  H = 1740;
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + 3 && a.x + a.w + 3 > b.x && a.y < b.y + b.h + 3 && a.y + a.h + 3 > b.y;
const labelWarnings: string[] = [];

function pointToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
function pointToFoot(p: Point, b: TownBuilding) {
  const dx = p.x - b.x,
    dz = p.z - b.z,
    c = Math.cos(b.yaw),
    s = Math.sin(b.yaw);
  return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - b.w / 2), Math.max(0, Math.abs(dx * s + dz * c) - b.d / 2));
}
function segmentGap(a: Point, b: Point, c: Point, d: Point) {
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const overlaps =
    Math.max(a.x, b.x) >= Math.min(c.x, d.x) &&
    Math.max(c.x, d.x) >= Math.min(a.x, b.x) &&
    Math.max(a.z, b.z) >= Math.min(c.z, d.z) &&
    Math.max(c.z, d.z) >= Math.min(a.z, b.z);
  if (overlaps && cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0) return 0;
  return Math.min(pointToSegment(a, c, d), pointToSegment(b, c, d), pointToSegment(c, a, b), pointToSegment(d, a, b));
}
function streetGap(b: TownBuilding, line: readonly Point[]) {
  const q = corners(b);
  return Math.min(
    ...line.map((p) => pointToFoot(p, b)),
    ...line.slice(1).flatMap((p, i) => q.map((c, k) => segmentGap(c, q[(k + 1) % 4]!, line[i]!, p))),
  );
}
function footprintGap(a: TownBuilding, b: TownBuilding) {
  return Math.min(
    ...corners(a).map((p) => pointToFoot(p, b)),
    ...corners(b).map((p) => pointToFoot(p, a)),
    streetGap(a, [...corners(b), corners(b)[0]!]),
  );
}
const narrowGaps = TOWN_SLOTS.flatMap((a, i) =>
  TOWN_SLOTS.slice(i + 1).flatMap((b) => {
    const metres = footprintGap(townBuilding(a.id), townBuilding(b.id));
    return metres < 4 ? [{ a: a.id, b: b.id, metres }] : [];
  }),
);
const curioClearances = curioFrames.map((b) => {
  const near = pointToFoot(TOWN_CENTRE, b),
    far = Math.max(...corners(b).map((p) => distance(p, TOWN_CENTRE)));
  const ground = [b, ...corners(b)].map((p) => groundHeight(p.x + ORIGIN.x, p.z));
  return {
    id: b.id,
    ring: Math.max(0, near - TOWN_RING.outer, TOWN_RING.inner - far),
    dock: Math.max(0, streetGap(b, TOWN_STREETS.dock.line) - TOWN_STREETS.dock.width / 2),
    plot3: footprintGap(b, townBuilding('plot3')),
    bowl: near - TOWN_RING.inner,
    ground: [Math.min(...ground), Math.max(...ground)],
  };
});
const yardSecret = SECRETS.find((s) => s.id === 'yard');
if (!yardSecret) throw new Error('missing yard find');
const yard: Point = { x: yardSecret.x, z: yardSecret.z };
const balcony = padById('balcony');

function panel(mode: 'today' | 'round' | 'overlay', ox: number, oy: number) {
  const out: string[] = [];
  const px = ox + 30,
    py = oy + 58;
  const mw = (bounds.x1 - bounds.x0) * SCALE,
    mh = (bounds.z1 - bounds.z0) * SCALE;
  const project = (p: Point) => ({ x: px + (p.x - bounds.x0) * SCALE, y: py + (p.z - bounds.z0) * SCALE });
  const path = (pts: readonly Point[], stroke: string, width = 1, extra = '') =>
    `<polyline points="${pts
      .map((p) => {
        const q = project(p);
        return `${n(q.x)},${n(q.y)}`;
      })
      .join(' ')}" fill="none" stroke="${stroke}" stroke-width="${n(width)}" ${extra}/>`;
  const circle = (p: Point, r: number, fill: string, stroke: string, extra = '') => {
    const q = project(p);
    return `<circle cx="${n(q.x)}" cy="${n(q.y)}" r="${n(r * SCALE)}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  };
  const shape = (b: TownBuilding, fill: string, stroke: string, extra = '') =>
    `<polygon points="${corners(b)
      .map((p) => {
        const q = project(p);
        return `${n(q.x)},${n(q.y)}`;
      })
      .join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" ${extra}/>`;
  out.push(`<rect x="${ox}" y="${oy}" width="770" height="650" rx="8" fill="#fffef9" stroke="#d4d9d3"/>`);
  out.push(
    text(
      ox + 22,
      oy + 30,
      mode === 'today' ? 'TODAY' : mode === 'round' ? 'THE ROUND' : 'OVERLAY · arrows from TODAY to THE ROUND',
      18,
    ),
  );
  out.push(
    `<defs><clipPath id="clip-${mode}"><rect x="${px}" y="${py}" width="${mw}" height="${mh}"/></clipPath></defs>`,
  );
  out.push(`<g clip-path="url(#clip-${mode})">`);
  // Exact baked samples at 2 m spacing: terrain and path paint, rather than a second ground model.
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const x = cellX(i),
        z = cellZ(j);
      if (Math.hypot(x - TOWN_CENTRE.x, z - TOWN_CENTRE.z) > TOWN_GROUND.r + TOWN_GROUND.soft) continue;
      const k = at(i, j),
        h = heights[k]!,
        paint = pathMask[k]!,
        q = project({ x: x - CELL / 2, z: z - CELL / 2 });
      if (Math.abs(h - 18) > 0.05)
        out.push(
          `<rect x="${n(q.x)}" y="${n(q.y)}" width="${n(CELL * SCALE)}" height="${n(CELL * SCALE)}" fill="${h < 18 ? '#9fcad6' : '#e6b88c'}" opacity="0.6"><title>${x}, ${z}: ${h.toFixed(3)} m</title></rect>`,
        );
      if (paint > 0.05)
        out.push(
          `<rect x="${n(q.x)}" y="${n(q.y)}" width="${n(CELL * SCALE)}" height="${n(CELL * SCALE)}" fill="#e4dcc8" opacity="${n(paint * 0.85)}"/>`,
        );
    }
  out.push(circle(TOWN_CENTRE, TOWN_GROUND.r, 'none', '#849b8b', 'stroke-dasharray="5 3"'));
  out.push(circle(TOWN_CENTRE, TOWN_GROUND.green.flat, 'none', '#6596ad', 'stroke-dasharray="3 3"'));
  for (const t of LAND_TREES) out.push(circle({ x: t.x - ORIGIN.x, z: t.z }, 0.35, '#43785b', 'none'));
  for (let x = bounds.x0; x <= bounds.x1; x += 10)
    out.push(
      path(
        [
          { x, z: bounds.z0 },
          { x, z: bounds.z1 },
        ],
        '#e7ebe4',
      ),
    );
  for (let z = bounds.z0; z <= bounds.z1; z += 10)
    out.push(
      path(
        [
          { x: bounds.x0, z },
          { x: bounds.x1, z },
        ],
        '#e7ebe4',
      ),
    );
  if (mode !== 'round') {
    PATHS.forEach((p) =>
      out.push(
        path(
          p.pts.map(([x, z]) => ({ x, z })),
          '#b8bcb8',
          2,
          'stroke-dasharray="5 3"',
        ),
      ),
    );
    out.push(
      path(
        SHORE_PATH.map(([x, z]) => ({ x, z })),
        '#b8bcb8',
        2,
        'stroke-dasharray="5 3"',
      ),
    );
  }
  if (mode === 'today') out.push(shape(TOWN_FOOTING, '#e0e3e0', color.today));
  if (mode !== 'today') {
    out.push(
      circle(
        TOWN_CENTRE,
        (TOWN_RING.inner + TOWN_RING.outer) / 2,
        'none',
        '#e4dcc8',
        `stroke-width="${(TOWN_RING.outer - TOWN_RING.inner) * SCALE}" opacity="0.4"`,
      ),
    );
    out.push(circle(TOWN_CENTRE, TOWN_GREEN.radius, 'none', '#9bac91'));
    const d = TOWN_STREETS.dock;
    out.push(path([slotPoint(d.bearing, d.from), slotPoint(d.bearing, d.to)], '#e4dcc8', d.width * SCALE));
    for (const key of ['camp', 'quarry'] as const) {
      const s = TOWN_STREETS[key];
      // The complete built paths are shown on TODAY and OVERLAY; the plan marks each mouth.
      out.push(circle(slotPoint(s.bearing, s.radius), 0.7, '#fffef9', '#9f9580'));
    }
    out.push(
      shape(
        { ...TOWN_PROPS.clock, w: TOWN_PROPS.clock.footing, d: TOWN_PROPS.clock.footing, yaw: 0 },
        '#fff',
        color.arrival,
      ),
    );
  }
  const island = {
    ...axisPoint((ISLAND_A.buffers + ISLAND_A.foot) / 2, ISLAND_C),
    w: ISLAND.width,
    d: ISLAND_A.foot - ISLAND_A.buffers,
    yaw: HALL.yaw,
  };
  out.push(shape(island, '#eceeeb', '#969c98'));
  out.push(circle(TABLE, TABLE.r, '#eceeeb', '#969c98'));
  for (const road of [0, 1] as const) out.push(path(headPoints(road), '#929996', 1.8));
  out.push(path(spurPoints(), '#929996'));
  const active = [...(mode === 'today' ? today : round), ...curioFrames];
  const draw = (b: Building, ghost = false) => {
    const c = mode === 'today' || ghost ? color.today : color[b.when];
    const dash = ghost || b.when === 'bought' ? 'stroke-dasharray="4 3"' : '';
    out.push(shape(b, ghost ? 'none' : mode === 'today' ? '#e0e3e0' : '#fffef8', c, dash));
    const a = door(b),
      yaw = b.face ?? b.yaw;
    out.push(path([a, { x: a.x + Math.sin(yaw) * 2, z: a.z + Math.cos(yaw) * 2 }], c, 2));
  };
  if (mode === 'overlay') today.forEach((b) => draw(b, true));
  active.forEach((b) => draw(b));
  for (const fence of YARD_DRESSING.fences) out.push(shape({ ...fence, yaw: 0 }, '#8a6238', '#8a6238'));
  out.push(circle(YARD_DRESSING.laundry, 0.3, '#8a6238', '#8a6238'));
  out.push(
    shape(
      { x: balcony.x, z: balcony.z, yaw: 0, w: balcony.hx * 2, d: balcony.hz * 2 },
      'none',
      '#8b7049',
      'stroke-dasharray="2 2"',
    ),
  );
  if (mode === 'overlay')
    for (const m of moves) out.push(path([m.from, m.to], '#a34c67', 2, 'marker-end="url(#arrow)"'));
  if (mode === 'round') for (const m of measures) out.push(path([m.a, m.b], '#718677', 1, 'stroke-dasharray="2 3"'));
  for (const p of [LANDING, SPAWN]) out.push(circle(p, 0.65, '#37473f', '#fff'));
  out.push(circle(yard, 0.7, '#9b527b', '#fff'));
  if (mode !== 'today') {
    const q = project(TOWN_CENTRE);
    out.push(line(q.x - 5, q.y, q.x + 5, q.y, '#243e2c'), line(q.x, q.y - 5, q.x, q.y + 5, '#243e2c'));
  }
  out.push('</g>');
  // Labels are placed by a bounded collision search, never per-building hand offsets.
  const occupied: Rect[] = active.map((b) => {
    const q = corners(b).map(project),
      x = Math.min(...q.map((p) => p.x)),
      y = Math.min(...q.map((p) => p.y));
    return { x, y, w: Math.max(...q.map((p) => p.x)) - x, h: Math.max(...q.map((p) => p.y)) - y };
  });
  // Label the narrow curio crowns first, before larger future plots use their nearby free space.
  const labels = [...curioFrames, ...active.filter((b) => b.id !== 'bay' && b.id !== 'shelf')].map((b) => ({
    p: b as Point,
    name: b.name,
    c: mode === 'today' ? '#58615d' : color[b.when],
  }));
  labels.push(
    { p: yard, name: 'yard find', c: '#9b527b' },
    { p: balcony, name: 'balcony / aviator', c: '#8b7049' },
    { p: LANDING, name: 'LANDING · shore spawn', c: '#354b3c' },
    { p: SPAWN, name: 'SPAWN', c: '#354b3c' },
    { p: island, name: 'Station island', c: '#58615d' },
    { p: TABLE, name: 'Turntable', c: '#58615d' },
  );
  if (mode === 'today') labels.push({ p: TOWN_CENTRE, name: 'Footing', c: '#58615d' });
  if (mode !== 'today')
    labels.push(
      { p: TOWN_CENTRE, name: 'G · green / clock footing', c: color.arrival },
      ...(['camp', 'quarry'] as const).map((key) => ({
        p: slotPoint(TOWN_STREETS[key].bearing, TOWN_STREETS[key].radius),
        name: `${key} mouth`,
        c: '#75664e',
      })),
      { p: slotPoint(TOWN_STREETS.dock.bearing, TOWN_STREETS.dock.to), name: 'dock street', c: '#75664e' },
    );
  if (mode === 'round')
    measures.forEach((m, i) =>
      labels.push({
        p: { x: (m.a.x + m.b.x) / 2, z: (m.a.z + m.b.z) / 2 },
        name: `${String.fromCharCode(65 + i)} · ${distance(m.a, m.b).toFixed(1)} m`,
        c: '#526459',
      }),
    );
  for (const label of labels) {
    const q = project(label.p),
      w = label.name.length * 6.7 + 8,
      h = 18;
    const candidates: Rect[] = [];
    for (let r = 16; r <= 200; r += 12)
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        candidates.push({ x: q.x + Math.cos(a) * r - w / 2, y: q.y + Math.sin(a) * r - h / 2, w, h });
      }
    const at = candidates.find(
      (r) =>
        r.x >= px && r.x + w <= px + mw && r.y >= py && r.y + h <= py + mh && !occupied.some((b) => overlaps(r, b)),
    );
    if (!at) {
      labelWarnings.push(`${mode}: ${label.name}`);
      continue;
    }
    occupied.push(at);
    const cx = Math.max(at.x, Math.min(at.x + w, q.x)),
      cy = Math.max(at.y, Math.min(at.y + h, q.y));
    out.push(line(q.x, q.y, cx, cy, '#a1aaa1', 'stroke-width="0.7"'));
    out.push(`<rect x="${n(at.x)}" y="${n(at.y)}" width="${n(w)}" height="${h}" fill="#fffef9" fill-opacity="0.94"/>`);
    out.push(text(at.x + 4, at.y + 13, label.name, 13, label.c));
  }
  const sy = py + mh + 28;
  out.push(line(px, sy, px + 20 * SCALE, sy, '#26332f', 'stroke-width="3"'));
  for (const m of [0, 10, 20]) out.push(line(px + m * SCALE, sy - 4, px + m * SCALE, sy + 4, '#26332f'));
  out.push(
    text(px, sy + 20, '0'),
    text(px + 20 * SCALE, sy + 20, '20 m'),
    text(px + 130, sy + 5, '10 m grid · same scale in every panel'),
  );
  out.push(
    line(ox + 720, oy + 92, ox + 720, oy + 58, '#26332f', 'marker-end="url(#north)"'),
    text(ox + 715, oy + 52, 'N'),
  );
  return out.join('\n');
}

fs.mkdirSync(OUT, { recursive: true });
const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, sans-serif">`,
  `<title>Home town plan: today, the Round and movement overlay</title>`,
  `<desc>To scale, Place-local metres. ${esc(notes.join(' '))}</desc>`,
  `<metadata>${esc(JSON.stringify({ commit: git('rev-parse', 'HEAD'), stamp, sourceHashes }))}</metadata>`,
  '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="#a34c67"/></marker><marker id="north" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#26332f"/></marker></defs>',
  `<rect width="${W}" height="${H}" fill="#f3f5ef"/>`,
  text(30, 38, 'Home · town plan sheet', 26),
  text(
    30,
    64,
    `B1+B2 as built / later Round plan · source ${git('rev-parse', '--short', 'HEAD')} · stamp ${stamp}`,
    14,
  ),
  panel('today', 20, 86),
  panel('round', 810, 86),
  panel('overlay', 20, 754),
  text(840, 788, 'KEY & DISTANCES', 18),
];
let y = 820;
for (const [key, label] of [
  ['arrival', 'Stands on arrival · green outline'],
  ['free', 'Free from the route · blue outline'],
  ['bought', 'Bought later · dashed ochre outline'],
] as const) {
  parts.push(text(840, y, label, 15, color[key]));
  y += 27;
}
parts.push(text(840, y, 'Plots 1 & 2: staked on arrival; dashed footprints show future buildings.', 14));
y += 34;
for (const [i, m] of measures.entries()) {
  parts.push(text(840, y, `${String.fromCharCode(65 + i)} · ${m.name}: ${distance(m.a, m.b).toFixed(1)} m`, 14));
  y += 24;
}
y += 10;
parts.push(text(840, y, 'MOVES · centre to centre (arrows in overlay)', 15, '#a34c67'));
y += 26;
for (const m of moves) {
  parts.push(text(840, y, `${m.name}: ${distance(m.from, m.to).toFixed(1)} m`, 14));
  y += 23;
}
parts.push(text(840, y + 4, 'Other three opening cottages are removed, not assigned to bought plots.', 13));
y += 38;
parts.push(text(840, y, 'WALL GAPS < 4 m · including future plots', 15));
y += 26;
for (const g of narrowGaps) {
  parts.push(text(840, y, `${g.a} / ${g.b}: ${g.metres.toFixed(3)} m`, 13));
  y += 23;
}
if (!narrowGaps.length) {
  parts.push(text(840, y, 'None; every planned wall gap is at least 4 m.', 13));
  y += 23;
}
y += 10;
parts.push(text(840, y, 'CURIO CROWNS · metres clear, as built = plan', 15));
y += 26;
for (const c of curioClearances) {
  parts.push(
    text(
      840,
      y,
      `${c.id}: ring ${c.ring.toFixed(3)} · dock ${c.dock.toFixed(3)} · plot 3 ${c.plot3.toFixed(3)} · bowl ${c.bowl.toFixed(3)}`,
      13,
    ),
  );
  y += 23;
}
parts.push(
  text(
    840,
    y,
    `Bowl centre ${(18 - TOWN_GROUND.green.drop).toFixed(2)} m · flat r${TOWN_GROUND.green.flat} · bank to r${TOWN_RING.inner}`,
    13,
  ),
);
y += 23;
parts.push(text(840, y, 'Ring/dock: road edges; bowl: r14 bank edge. Blue/tan: below/above 18 m.', 13));
y += 32;
parts.push(text(840, y, 'DATA LIMITS · no guessed geometry', 15));
y += 26;
for (const s of missing) {
  parts.push(text(840, y, s, 13));
  y += 23;
}
y += 10;
for (const s of notes) {
  parts.push(text(840, y, s, 12));
  y += 21;
}
parts.push(
  text(
    30,
    1645,
    'Regenerate: npm run town-plan-sheet · geometry: src/place/{layout,home-station,town-plan,shore-layout}.ts',
    14,
  ),
);
parts.push(
  text(
    30,
    1670,
    'Green r14 m · ring r14–20 m · dock street 8 m wide · ticks show door direction · distances shown dotted in THE ROUND.',
    14,
  ),
  '</svg>',
);
if (labelWarnings.length) throw new Error(`Unplaced labels: ${labelWarnings.join(', ')}`);
const svg = `${OUT}/town-plan-sheet.svg`,
  png = `${OUT}/town-plan-sheet.png`;
fs.writeFileSync(svg, parts.join('\n'));
// sharp is already in this lockfile via the asset toolchain. Do not install a renderer when absent.
const require = createRequire(import.meta.url);
let renderer: string | undefined;
try {
  renderer = require.resolve('sharp');
} catch {
  /* SVG remains the deliverable without an installed renderer. */
}
if (renderer) {
  const { default: sharp } = await import('sharp');
  await sharp(Buffer.from(parts.join('\n')))
    .png()
    .toFile(png);
} else if (fs.existsSync(png)) fs.unlinkSync(png);
const manifest = {
  kind: 'static dev tooling; no game browser or bot',
  status: 'generated; visual inspection separate',
  commit: git('rev-parse', 'HEAD'),
  tree: git('rev-parse', 'HEAD^{tree}'),
  stamp,
  sourceHashes,
  groundHash,
  curioClearances,
  narrowGaps,
  command: 'npm run town-plan-sheet',
  artifacts: { svg: ROOT + svg, png: renderer ? ROOT + png : null },
  counts: { today: today.length, round: round.length, plots: TOWN_PLOTS.order.length },
  units: 'Place-local horizontal metres; north = -z',
  bounds,
  pixelsPerMetre: SCALE,
  measures: measures.map((m) => ({ ...m, metres: distance(m.a, m.b) })),
  missing,
  notes,
};
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ ...manifest.artifacts, manifest: ROOT + OUT + '/manifest.json', stamp }, null, 2));
