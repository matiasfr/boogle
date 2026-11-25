// The greybox route's catalog (docs/plans/greybox-route.md, section 2 and the design review): every leg, pickup, barrier
// and yard in one place, pure integers, derived from the generated line catalog (./railway-world-lines.ts). Nothing here
// is state: step 3 reads it to spawn `Leg`, `LegYard` and `Route` rows in catalog order, so reordering anything below is a
// WORLD_NS break (the plan's bump G1 installs all of it at once, nothing laid).
//
// Lockstep math: integers and `+ - * /`, `Math.floor`, `Math.round` and `Math.sqrt` only (docs/agents/lockstep.md).
import type { RailPlatform } from './railway-lines.ts';
import { railInt } from './railway.ts';
import { RING_END, RING_S_HEAD, ringAt } from './railway-ring-layout.ts';
import { WORLD_LINES, type WorldLine } from './railway-world-lines.ts';

/** One section of a leg: it lays when `logs` + `rails` are fed to its frame; `gate` (a RAIL_GATES index) shuts the frame. */
export type RouteSection = { toCm: number; logs: number; rails: number; gate?: number };
export type RouteLeg = {
  id: string;
  /** The campaign outline's area number, 4 to 9. */
  area: number;
  /** The catalog row it grows on (a WORLD_LINES id). */
  row: RowId;
  /** The sim line it grows on (an index into RAIL_LINES once step 3 appends the rows in `ROW_LINE`'s order). */
  line: number;
  /** Where the leg starts, cm along its line (the previous halt's stop). */
  fromCm: number;
  sections: readonly RouteSection[];
  /** A halt index on the SIM line `line` (not the catalog row): the leg's first head, the halt after its from halt
   * (simHalt). A leg whose rules are not built points at a halt with no `leg` tag, so legBuilt stays false for it. */
  railheadHalt: number;
  /** A halt index on the CATALOG row (`WORLD_LINES[row].halts`), not on the sim line: the halt the last section opens.
   * Step 3 maps it to the sim line's own halt index. */
  destRowHalt: number;
  /** The RAIL_LEGS index that must be complete first; -1: Ring Island joined. */
  after: number;
  alsoAfter?: number;
  /** Where its trains load: the line's Home halt, or a junction yard (a RAIL_YARDS index). */
  kit: 'home' | number;
  kitAhead?: true;
};

/** The sim line of each catalog row. Line 2 is the existing one; step 3 appends `ns`, `bay` and `cave` after it in this
 * order. `bay-trestle` is not a sim row (the greybox never builds it). */
// `ring` is LINE2: railway-lines.ts reads this file to build its rows, so this file imports only its types and the
// literal is checked there.
export const ROW_LINE = { ring: 1, ns: 2, bay: 3, cave: 4 } as const;
export type RowId = keyof typeof ROW_LINE;

const row = (id: RowId): WorldLine => {
  const r = WORLD_LINES.find((l) => l.id === id);
  if (!r) throw new Error(`no catalog row ${id}`);
  return r;
};
/** A catalog halt's stop, cm along its line. */
const stopCm = (id: RowId, halt: number): number => row(id).stops[halt]!;

/** `n` equal sections of a leg, on whole centimetres: the `toCm` of each. The last is exactly `toCm`; the others are
 * floored, so lengths differ by at most 1 cm. */
export function sectionsOf(leg: { fromCm: number; toCm: number }, n: number): number[] {
  const len = leg.toCm - leg.fromCm;
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(len) || len < n) throw new Error(`sectionsOf(${len}, ${n})`);
  const out: number[] = [];
  for (let i = 1; i < n; i++) out.push(leg.fromCm + Math.floor((len * i) / n));
  out.push(leg.toCm);
  return out;
}

/** A line sampled every 10 m of arc: flat integer [x, z, y] triples from the first vertex to the last (the last sample is
 * the end, so the final step is 10 m or less). Straight between vertices; `Math.sqrt` of an integer sum is the only
 * irrational step, and it is correctly rounded on every engine. */
export function pathOf(pts: readonly (readonly [number, number, number])[]): number[] {
  const STEP = 1000;
  const out: number[] = [];
  if (pts.length === 0) return out;
  out.push(pts[0]![0], pts[0]![1], pts[0]![2]);
  let carry = 0; // arc since the last sample
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const dy = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    let at = STEP - carry; // arc along this span of the next sample
    while (at < len) {
      out.push(
        Math.round(a[0] + (dx * at) / len),
        Math.round(a[1] + (dz * at) / len),
        Math.round(a[2] + (dy * at) / len),
      );
      at += STEP;
    }
    carry = len - (at - STEP);
  }
  const end = pts[pts.length - 1]!;
  if (out[out.length - 3] !== end[0] || out[out.length - 2] !== end[1] || out[out.length - 1] !== end[2])
    out.push(end[0], end[1], end[2]);
  return out;
}

/** A catalog row's point `cm` along its line (arc length from its first vertex, which is at `fromCm`), as a platform. */
function pointAt(id: RowId, cm: number): RailPlatform {
  const r = row(id);
  let want = cm - r.fromCm;
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1]!;
    const b = r.pts[i]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    if (want <= len || i === r.pts.length - 1) {
      const t = len === 0 ? 0 : want / len;
      return {
        x: Math.round(a[0] + dx * t),
        z: Math.round(a[1] + dz * t),
        y: Math.round(a[2] + (b[2] - a[2]) * t),
        reach: HALT_REACH,
      };
    }
    want -= len;
  }
  throw new Error(`row ${id} has no points`);
}
const HALT_REACH = 1260;
/** A catalog halt's own platform point. */
const haltAt = (id: RowId, k: number): RailPlatform => {
  const h = row(id).halts[k]!;
  return { x: h.x, z: h.z, y: h.y, reach: h.reach };
};

// ---- the cuts: sections end at a place (design review, change 4)
// The White Wall's islets, as the cm along the `cave` row where the row passes closest to the islet's centre in
// docs/world/map-prototypes.html (wall-s2, wall-s1, wall-n2). Wall-n1 uses its outline's closest tip instead.
// wall-cs and wall-cn lie inside the sections that end at Canopy Town and at wall-n2; the sixth section is the deep gap
// to the stacks. test/railway-route.test.ts recomputes each from the map and the row and fails if one is over 1 m off;
// the legs' other cuts (halts) come from the row itself.
export const WALL_ISLETS = { 'wall-s2': 210553, 'wall-s1': 254177, 'wall-n2': 391369, 'wall-n1': 459379 } as const;
const WALL_S2 = WALL_ISLETS['wall-s2'];
const WALL_S1 = WALL_ISLETS['wall-s1'];
const WALL_N2 = WALL_ISLETS['wall-n2'];
const WALL_N1 = WALL_ISLETS['wall-n1'];
// Midway across the strait's level deck; 33 m beyond the top of the climb onto Canopy isle.
export const CANOPY_STRAIT = 174323,
  CANOPY_EDGE = 214613;
/** A temporary head stops 10 m short of the laid deck's end. */
export const HEAD_BACK_CM = 1000;

const BILL = { logs: 20, rails: 20 } as const; // one train load, Q7's bill (call 21)
const BILL_END = { logs: 6, rails: 6 } as const; // the ending's two

type Spec = {
  id: string;
  area: number;
  row: RowId;
  from: number; // halt index on the row
  dest: number; // halt index on the row
  cuts: readonly number[]; // each section's toCm; the last is the destination's stop
  bill: { logs: number; rails: number };
  /** [section, RAIL_GATES index]: a shut frame. */
  gated: readonly (readonly [number, number])[];
  after: number;
  alsoAfter?: number;
  kit: 'home' | number;
  kitAhead?: true;
  /** Its rules are built: its sim line holds a halt for each head (railway-lines.ts), so simHalt counts them. */
  built?: true;
};
const span = (id: RowId, a: number, b: number) => ({ fromCm: stopCm(id, a), toCm: stopCm(id, b) });
const SPECS: readonly Spec[] = [
  {
    id: 'stack',
    area: 4,
    row: 'ring',
    from: 0,
    dest: 1,
    cuts: sectionsOf(span('ring', 0, 1), 4),
    bill: BILL,
    gated: [],
    after: -1,
    kit: 'home',
    built: true,
  },
  {
    id: 'incline',
    area: 5,
    row: 'ns',
    from: 0,
    dest: 1,
    cuts: sectionsOf(span('ns', 0, 1), 2),
    bill: BILL,
    gated: [[0, 0]],
    after: 0,
    kit: 0,
    built: true,
  },
  {
    id: 'bay-cut',
    area: 5,
    row: 'bay',
    from: 0,
    dest: 1,
    cuts: sectionsOf(span('bay', 0, 1), 2),
    bill: BILL,
    gated: [],
    after: 1,
    kit: 'home',
    built: true,
  },
  {
    id: 'bell-canopy',
    area: 6,
    row: 'bay',
    from: 1,
    dest: 2,
    cuts: [CANOPY_STRAIT, CANOPY_EDGE, stopCm('bay', 2)],
    bill: BILL,
    gated: [[0, 1]],
    after: 2,
    kit: 'home',
    built: true,
  },
  {
    // The cave, the Saltpan, the quay. The cave's far mouth is not in the map data: the first span (West landing to the
    // Saltpan) is cut in halves.
    id: 'cave',
    area: 7,
    row: 'cave',
    from: 0,
    dest: 2,
    cuts: [sectionsOf(span('cave', 0, 1), 2)[0]!, stopCm('cave', 1) + HEAD_BACK_CM, stopCm('cave', 2)],
    bill: BILL,
    gated: [[0, 2]],
    after: 2,
    kit: 'home',
    built: true,
  },
  {
    id: 'wall',
    area: 8,
    row: 'cave',
    from: 2,
    dest: 4,
    cuts: [WALL_S2, WALL_S1, stopCm('cave', 3) + HEAD_BACK_CM, WALL_N2, WALL_N1, stopCm('cave', 4)],
    bill: BILL,
    gated: [[5, 3]],
    after: 4,
    alsoAfter: 3,
    kit: 'home',
    built: true,
  },
  {
    id: 'notch-tunnel',
    area: 9,
    row: 'bay',
    from: 2,
    dest: 3,
    cuts: [stopCm('bay', 3)],
    bill: BILL_END,
    gated: [[0, 4]],
    after: 5,
    kit: 'home',
    built: true,
  },
  {
    id: 'causeway',
    area: 9,
    row: 'ns',
    from: 1,
    dest: 2,
    cuts: [stopCm('ns', 2)],
    bill: BILL_END,
    gated: [[0, 5]],
    after: 6,
    kit: 0,
    built: true,
    kitAhead: true,
  },
];

/** Where a row's first catalog halt stands on its sim line: line 2's Ring Island halt is its sixth (Village to Ring
 * Island are built before the row); the other rows are lines of their own. */
const SIM_BASE: Readonly<Record<RowId, number>> = { ring: 5, ns: 0, bay: 0, cave: 0 };
/** How many extra stops a built leg inserts before a catalog halt. A head on a named halt shares its slot. */
export function insertedHeadsBefore(stops: readonly number[], cuts: readonly number[], halt: number) {
  return cuts.slice(0, -1).filter((end) => {
    const head = end - HEAD_BACK_CM;
    return head < stops[halt]! && !stops.includes(head);
  }).length;
}
/** A catalog halt's index on its row's sim line (docs/plans/greybox-leg2.md, step 1): a sim line's halts are its row's
 * catalog halts in order, with each built leg's heads (one a section but the last) after its from halt. A leg not yet
 * built then points (simHalt of its from halt, + 1) at the next catalog halt, untagged, until its rules insert heads. */
export function simHalt(id: RowId, catalogHalt: number): number {
  let k = SIM_BASE[id] + catalogHalt;
  const stops = row(id).stops;
  for (const sp of SPECS) {
    if (!sp.built || sp.row !== id || sp.from >= catalogHalt) continue;
    k += insertedHeadsBefore(stops, sp.cuts, catalogHalt);
  }
  return k;
}

export const RAIL_LEGS: readonly RouteLeg[] = SPECS.map((s) => ({
  id: s.id,
  area: s.area,
  row: s.row,
  line: ROW_LINE[s.row],
  fromCm: stopCm(s.row, s.from),
  sections: s.cuts.map((toCm, k) => {
    const g = s.gated.find((x) => x[0] === k);
    return g ? { toCm, ...s.bill, gate: g[1] } : { toCm, ...s.bill };
  }),
  railheadHalt: simHalt(s.row, s.from) + 1,
  destRowHalt: s.dest,
  after: s.after,
  alsoAfter: s.alsoAfter,
  kit: s.kit,
  ...(s.kitAhead ? { kitAhead: s.kitAhead } : {}),
}));

/** A section's first centimetre: the leg's start, or the section before's end. */
export const sectionFromCm = (leg: RouteLeg, k: number): number => (k === 0 ? leg.fromCm : leg.sections[k - 1]!.toCm);

// ---- Garage step 4 (docs/plans/garage-step4.md): the per-line Quick or Strong trade. Catalog data, no state.
/** The sim lines the room fits with Quick (row 4) or Strong (row 5) at Home's Roundhouse. */
export const TRADE_LINES: readonly number[] = [ROW_LINE.ns, ROW_LINE.bay];
export const isTradeLine = (line: unknown): line is number => TRADE_LINES.includes(line as number);
/** A trade line's first leg (a RAIL_LEGS index), by line: the incline, the bay cut. */
export const TRADE_LEG: Readonly<Record<number, number>> = Object.fromEntries(
  TRADE_LINES.map((line) => [line, RAIL_LEGS.findIndex((l) => l.line === line)]),
);
/** The sections of a trade line's TRADE_LEG laid before its trade opens: the incline's whole length on `ns`; one on
 * `bay`, the bay cut's first lay (owner, 24 November, d-2026-11-24-garage-step4-strong-window: Strong's window). */
export const TRADE_OPENS: Readonly<Record<number, number>> = {
  [ROW_LINE.ns]: RAIL_LEGS[TRADE_LEG[ROW_LINE.ns]!]!.sections.length,
  [ROW_LINE.bay]: 1,
};

/** The pinned cloth post and its surveyed distance to the Notch frame, in cm (greybox-leg6.md, Level findings). */
export const CANOPY_CLOTH = { x: -109199, z: -29401, barrierGapCm: 2472 } as const;

/** The abilities a leg grants once its last section is laid; each stands at its leg's destination halt (a placeholder
 * position: step 4's massing moves it off the platform, the plan's change 1). The hook reel and the carry sling are
 * left out until something uses them. */
export const RAIL_GRANTS: readonly { id: string; label: string; leg: number; at: RailPlatform }[] = [
  // The north stack's rim, 82 m over the Gorge's halt (step 4's review, k: call 92).
  { id: 'pick', label: 'Powered pick', leg: 0, at: { x: -7435, z: -203262, y: 8500, reach: 400 } },
  // Bell Rock's reserved seeds spot on the lower deck (src/content/levels/leg2.ts, marks.seeds: ne.at(-4, -15)).
  { id: 'seeds', label: 'Crystal seeds', leg: 1, at: { x: -6473, z: -85491, y: 490, reach: 400 } },
  { id: 'cloth', label: 'Glider cloth', leg: 3, at: { x: CANOPY_CLOTH.x, z: CANOPY_CLOTH.z, y: 1390, reach: 400 } },
  { id: 'lantern', label: 'Lantern', leg: 6, at: { x: -162000, z: -98600, y: 600, reach: 400 } },
];
const grant = (id: string) => RAIL_GRANTS.findIndex((g) => g.id === id);

/** A frame's and a rack's reach (the design review of step 4, b: 4 m, not a halt's 12.6). */
export const LEG_SITE_REACH = 400;
/** A barrier opens at its frame when the section is current and the room holds its grant. */
export const RAIL_GATES: readonly { id: string; label: string; needs: number; at: RailPlatform }[] = [
  // At the incline's first frame on incline-s (greybox-leg2.md, step 1): t 24, 1 m in from its edge.
  { id: 'incline', label: "The incline's first frame", needs: grant('pick'), at: rowSide('ns', 2400, -480, 90, 400) },
  {
    // The first frame stands past the bay-cut buffers on the outward platform.
    id: 'canopy',
    label: "Bell Rock to Canopy's first frame",
    needs: grant('seeds'),
    at: rowSide('bay', 122900, 480, 90, 400),
  },
  { id: 'plug', label: 'The sea-cave plug', needs: grant('pick'), at: rowSide('cave', 1200, -980, 90, 400) },
  {
    id: 'deep-span',
    label: 'The deep span to the stacks',
    needs: grant('seeds'),
    at: legFrame(RAIL_LEGS[5]!, 5),
  },
  {
    id: 'notch',
    label: 'The Notch frame',
    needs: grant('cloth'),
    at: rowSide('bay', stopCm('bay', 2) + 300, 480, 90, LEG_SITE_REACH),
  },
  {
    id: 'causeway',
    label: "The causeway's first frame",
    needs: grant('lantern'),
    at: rowSide('ns', stopCm('ns', 1) + 300, 480, 90, LEG_SITE_REACH),
  },
];

/** A junction: trains of the `fedBy` leg unload here and the next leg's kit trains load here. `halt` is an index on the
 * line of the legs that load (the `ns` row's High Gorge). */
export const RAIL_YARDS: readonly { id: string; halt: number; fedBy: number }[] = [{ id: 'gorge', halt: 0, fedBy: 0 }];

/** Places the catalog draws once per row: the same place, a few metres apart. Sectioning and the rules treat each as one
 * place (Ring Island's halt differs by 30 m between `ring` and `bay-trestle`; West landing by 37 m between `bay` and
 * `cave`). `halts`: [row, halt index]. */
export const RAIL_PLACES: readonly { id: string; boundCm?: number; halts: readonly (readonly [string, number])[] }[] = [
  {
    id: 'ring-island',
    halts: [
      ['ring', 0],
      ['bay-trestle', 0],
    ],
  },
  {
    id: 'gorge',
    boundCm: 6500,
    halts: [
      ['ring', 1],
      ['ns', 0],
      ['cave', 4],
    ],
  },
  {
    id: 'bell-rock',
    halts: [
      ['ns', 1],
      ['bay', 1],
      ['bay-trestle', 1],
    ],
  },
  {
    id: 'west-landing',
    halts: [
      ['bay', 0],
      ['cave', 0],
    ],
  },
  {
    id: 'canopy',
    boundCm: 30000,
    halts: [
      ['bay', 2],
      ['cave', 3],
    ],
  },
];

export const ROUTE = { branchFirst: 'gorge', branches: 'both', ending: 'card', upgrades: 'one' } as const;

// ---------------------------------------------------------------- step 3: what the rules read (greybox-route.md)
/** A row's centimetres against its sim line's `s`: the `ring` row counts on from the pier head at its `fromCm` (74300),
 * line 2 from RING_S_HEAD (74200), so the same place is 100 cm further along the row. Ring Island's physical
 * construction origin (`legStartS`) is row 119100 / line 2 s 119000 cm; its service mark is separate. The generator
 * measured the pier head along Place's sampled path, which ends 3.55 m short of it;
 * line 2's s is the ring layout's (s = RING_S_HEAD + u). The rules shift the row instead of regenerating the catalog
 * (step 2's, tested against the map) or moving line 2's built halts; test/railway-route-rules.test.ts ties the shift to
 * both. The other rows are their own lines and count from 0. */
export const ROW_SHIFT: Readonly<Record<RowId, number>> = {
  ring: row('ring').fromCm - RING_S_HEAD,
  ns: 0,
  bay: 0,
  cave: 0,
};
/** Cm along a leg's sim line of `cm` along its row. */
export const legS = (leg: Pick<RouteLeg, 'row'>, cm: number) => cm - ROW_SHIFT[leg.row];
/** The departure halt's stop mark, distinct from the physical start of track construction.
 * Ring's coach advances the mark while the laid sections, frame and rack keep their coordinates. */
export const legStartS = (leg: RouteLeg) => (leg.row === 'ring' ? RING_END.s : legS(leg, leg.fromCm));
/** A catalog row's point `cm` along it (row cm) and a catalog halt's platform point: the sim catalog's sources. */
export const rowPoint = pointAt;
export const rowHalt = haltAt;
/** The point `lat` cm to the right (going out) of a row's centre at `cm` along it, `up` cm over its deck. */
export function rowSide(id: RowId, cm: number, lat: number, up: number, reach: number): RailPlatform {
  const p = pointAt(id, cm),
    q = pointAt(id, cm + 100),
    dx = q.x - p.x,
    dz = q.z - p.z,
    len = Math.sqrt(dx * dx + dz * dz);
  return { x: Math.round(p.x - (dz * lat) / len), z: Math.round(p.z + (dx * lat) / len), y: p.y + up, reach };
}
/** Line 2's kit car standing at High Gorge: 7.1 m behind the train's along (src/entities/railway/cars.ts, the coach
 * train's `kit` offset), so the incline's first rack stands abreast of it. */
const GORGE_KIT_CAR_CM = 710;
/** Each built leg's first frame and rack, by RAIL_LEGS id (step 4's review, b; greybox-leg2.md, step 1). */
const FIRST_SITE: Readonly<Record<string, { frame: RailPlatform; rack: RailPlatform }>> = {
  // Ring Island's west platform (u 453 and u 446).
  stack: {
    frame: { ...ringAt(45300, -830), y: 890, reach: LEG_SITE_REACH },
    rack: { ...ringAt(44600, -840), y: 890, reach: LEG_SITE_REACH },
  },
  // The frame on incline-s at t 24 (the barrier's spot); the rack on line 2's south platform (lat -5.8 to -10.3, the up
  // track's: src/content/levels/gorge.ts) abreast of its kit car at the Gorge stop, 2.5 m off that car's track (lat -4).
  incline: {
    frame: rowSide('ns', 2400, -480, 90, LEG_SITE_REACH),
    rack: rowSide('ring', stopCm('ring', 1) - GORGE_KIT_CAR_CM, -650, 90, LEG_SITE_REACH),
  },
  // The West landing's apron (leg2.ts: s 4 to 16, lat 7.8 to 11.8), 6 m apart.
  'bay-cut': {
    frame: rowSide('bay', 1200, 980, 90, LEG_SITE_REACH),
    rack: rowSide('bay', 600, 980, 90, LEG_SITE_REACH),
  },
  'bell-canopy': {
    frame: RAIL_GATES[1]!.at,
    rack: rowSide('bay', 121900, 480, 90, LEG_SITE_REACH),
  },
  cave: {
    frame: RAIL_GATES[2]!.at,
    rack: rowSide('cave', 600, -980, 90, LEG_SITE_REACH),
  },
  wall: {
    frame: rowSide('cave', stopCm('cave', 2) + 1200, 480, 90, LEG_SITE_REACH),
    rack: rowSide('cave', stopCm('cave', 2) + 200, 480, 90, LEG_SITE_REACH),
  },
  'notch-tunnel': { frame: RAIL_GATES[4]!.at, rack: rowSide('bay', stopCm('bay', 2) - 700, 480, 90, LEG_SITE_REACH) },
  causeway: { frame: RAIL_GATES[5]!.at, rack: rowSide('ns', stopCm('ns', 1) - 700, 480, 90, LEG_SITE_REACH) },
};
if (
  Object.keys(FIRST_SITE).join() !==
  SPECS.filter((sp) => sp.built)
    .map((sp) => sp.id)
    .join()
)
  throw new Error('railway-route: every built leg names its first frame and rack, in order');
/** Section k's frame, where `rail.legStock` is judged: a built leg's first is its FIRST_SITE; the others stand 8 m short
 * of the railhead (the section's first centimetre), 4.8 m to the right going out, 90 cm over the deck (step 4's
 * review, b), on any row. An unbuilt leg's first is a placeholder at its row's first centimetre. */
export function legFrame(leg: RouteLeg, k: number): RailPlatform {
  if (k === 0) return FIRST_SITE[leg.id]?.frame ?? { ...pointAt(leg.row, leg.fromCm), reach: LEG_SITE_REACH };
  return rowSide(leg.row, sectionFromCm(leg, k) - 800, 480, 90, LEG_SITE_REACH);
}
/** Section k's rack (the depot racks' take, once the Q jobs are done): a built leg's first is its FIRST_SITE; the
 * others abreast of the kit car at the head's stop, 18 m short of the railhead, 4.8 m right. */
export function legRack(leg: RouteLeg, k: number): RailPlatform {
  if (k === 0) return FIRST_SITE[leg.id]?.rack ?? legFrame(leg, 0);
  return rowSide(leg.row, sectionFromCm(leg, k) - 1800, 480, 90, LEG_SITE_REACH);
}
/** The meeting marker on the north beach, 12 m beyond the platform ends. */
export const RAIL_ARRIVAL: RailPlatform = { x: 370, z: -10460, y: 228, reach: 400 };
/** The route's named tunables (design review of 12 November, rulings 1.3 and 1.4): `layTicks`, a section's lay time
 * whatever its length (30 s); `kitLead`, the sections whose kit is owed ahead of the frame, "all remaining" (the
 * longest leg's count), never under 2. Catalog data, not room tunables: a change is a rules change, no state. */
export const LEG_TUNE = {
  layTicks: 300,
  kitLead: Math.max(...RAIL_LEGS.map((l) => l.sections.length)),
} as const;
if (LEG_TUNE.kitLead < 2) throw new Error('railway-route: kitLead under 2');

/** Every place the route names (its pickups, barriers, the meeting, each leg's frames and racks), as platforms. */
export const RAIL_ROUTE_POINTS: readonly RailPlatform[] = [
  ...RAIL_GRANTS.map((g) => g.at),
  ...RAIL_GATES.map((g) => g.at),
  RAIL_ARRIVAL,
  ...RAIL_LEGS.flatMap((l) => l.sections.flatMap((_s, k) => [legFrame(l, k), legRack(l, k)])),
];
/** What an actor or a dropped thing may stand beyond the farthest catalog point, cm (a walk off the edge of a pad). */
export const RAIL_POSITION_MARGIN = 20000;
/** The bound on each axis of a railway position, cm: an action's `at`, a drop's or a beam's x/y/z, a pile's, an effect's.
 * The farthest of the route's points and the catalog rows' vertices, plus the margin, so a new leg or pickup cannot
 * fall outside it (the pick's rim is 2032 m out). Validation only: positions travel and save as JSON integers and the
 * components' x/y/z are 'int', so no field is narrower. */
export const RAIL_POSITION_MAX =
  Math.max(
    ...RAIL_ROUTE_POINTS.flatMap((p) => [Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)]),
    ...WORLD_LINES.flatMap((l) => l.pts.flatMap((p) => [Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2])])),
  ) + RAIL_POSITION_MARGIN;
/** A whole-centimetre railway coordinate inside RAIL_POSITION_MAX. */
export const railPos = (v: unknown): v is number => railInt(v, RAIL_POSITION_MAX, -RAIL_POSITION_MAX);
