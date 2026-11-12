// The greybox route's catalog (docs/plans/greybox-route.md, section 2 and the design review): every leg, pickup, barrier
// and yard in one place, pure integers, derived from the generated line catalog (./railway-world-lines.ts). Nothing here
// is state: step 3 reads it to spawn `Leg`, `LegYard` and `Route` rows in catalog order, so reordering anything below is a
// WORLD_NS break (the plan's bump G1 installs all of it at once, nothing laid).
//
// Lockstep math: integers and `+ - * /`, `Math.floor`, `Math.round` and `Math.sqrt` only (docs/agents/lockstep.md).
import type { RailPlatform } from './railway-lines.ts';
import { RING_S_HEAD } from './railway-ring-layout.ts';
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
  /** A halt index on the SIM line `line` (not the catalog row): the leg's moving railhead, one per leg, appended after
   * the line's other halts in RAIL_LEGS order (line 2: after its six built halts). */
  railheadHalt: number;
  /** A halt index on the CATALOG row (`WORLD_LINES[row].halts`), not on the sim line: the halt the last section opens.
   * Step 3 maps it to the sim line's own halt index. */
  destRowHalt: number;
  /** The RAIL_LEGS index that must be complete first; -1: Ring Island joined. */
  after: number;
  /** Where its trains load: the line's Home halt, or a junction yard (a RAIL_YARDS index). */
  kit: 'home' | number;
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
// docs/world/map-prototypes.html (wall-s2, wall-s1, wall-n2, wall-n1; the centre is the land's `c` plus the map origin).
// wall-cs and wall-cn lie inside the sections that end at Canopy Town and at wall-n2; the sixth section is the deep gap
// to the stacks. test/railway-route.test.ts recomputes each from the map and the row and fails if one is over 1 m off;
// the legs' other cuts (halts) come from the row itself.
export const WALL_ISLETS = { 'wall-s2': 210027, 'wall-s1': 253697, 'wall-n2': 417718, 'wall-n1': 471680 } as const;
const WALL_S2 = WALL_ISLETS['wall-s2'];
const WALL_S1 = WALL_ISLETS['wall-s1'];
const WALL_N2 = WALL_ISLETS['wall-n2'];
const WALL_N1 = WALL_ISLETS['wall-n1'];

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
  kit: 'home' | number;
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
  },
  {
    id: 'bell-canopy',
    area: 6,
    row: 'bay',
    from: 1,
    dest: 2,
    cuts: sectionsOf(span('bay', 1, 2), 3),
    bill: BILL,
    gated: [[0, 1]],
    after: 2,
    kit: 'home',
  },
  {
    // The cave, the Saltpan, the quay. The cave's far mouth is not in the map data: the first span (West landing to the
    // Saltpan) is cut in halves.
    id: 'cave',
    area: 7,
    row: 'cave',
    from: 0,
    dest: 2,
    cuts: [...sectionsOf(span('cave', 0, 1), 2), stopCm('cave', 2)],
    bill: BILL,
    gated: [[0, 2]],
    after: 3,
    kit: 'home',
  },
  {
    id: 'wall',
    area: 8,
    row: 'cave',
    from: 2,
    dest: 4,
    cuts: [WALL_S2, WALL_S1, stopCm('cave', 3), WALL_N2, WALL_N1, stopCm('cave', 4)],
    bill: BILL,
    gated: [[5, 3]],
    after: 4,
    kit: 'home',
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
  },
];

/** Each row's halts before any railhead is appended, and the railheads taken so far (one per leg). */
const railheadOf = (() => {
  const taken: Record<string, number> = {};
  return (id: RowId): number => {
    const k = (taken[id] ??= 0);
    taken[id] = k + 1;
    // Line 2 already has its six built halts (Village to Ring Island); the other rows start from the catalog's halts.
    return (id === 'ring' ? 6 : row(id).halts.length) + k;
  };
})();

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
  railheadHalt: railheadOf(s.row),
  destRowHalt: s.dest,
  after: s.after,
  kit: s.kit,
}));

/** A section's first centimetre: the leg's start, or the section before's end. */
export const sectionFromCm = (leg: RouteLeg, k: number): number => (k === 0 ? leg.fromCm : leg.sections[k - 1]!.toCm);

/** The abilities a leg grants once its last section is laid; each stands at its leg's destination halt (a placeholder
 * position: step 4's massing moves it off the platform, the plan's change 1). The hook reel and the carry sling are
 * left out until something uses them. */
export const RAIL_GRANTS: readonly { id: string; label: string; leg: number; at: RailPlatform }[] = [
  { id: 'pick', label: 'Powered pick', leg: 0, at: haltAt('ring', 1) },
  { id: 'seeds', label: 'Crystal seeds', leg: 1, at: haltAt('ns', 1) },
  { id: 'cloth', label: 'Glider cloth', leg: 3, at: haltAt('bay', 2) },
  { id: 'lantern', label: 'Lantern', leg: 6, at: haltAt('bay', 3) },
];
const grant = (id: string) => RAIL_GRANTS.findIndex((g) => g.id === id);

/** A barrier on a section's frame (`RouteSection.gate`): it opens for anyone once the room holds the `needs` grant. It
 * stands at the frame, the section's first centimetre. */
export const RAIL_GATES: readonly { id: string; label: string; needs: number; at: RailPlatform }[] = [
  { id: 'incline', label: "The incline's first frame", needs: grant('pick'), at: haltAt('ns', 0) },
  {
    id: 'canopy',
    label: "Bell Rock to Canopy's first frame",
    needs: grant('seeds'),
    at: haltAt('bay', 1),
  },
  { id: 'plug', label: 'The sea-cave plug', needs: grant('pick'), at: haltAt('cave', 0) },
  {
    id: 'deep-span',
    label: 'The deep span to the stacks',
    needs: grant('seeds'),
    at: pointAt('cave', WALL_N1),
  },
  { id: 'notch', label: 'The Notch frame', needs: grant('cloth'), at: haltAt('bay', 2) },
  { id: 'causeway', label: "The causeway's first frame", needs: grant('lantern'), at: haltAt('ns', 1) },
];

/** A junction: trains of the `fedBy` leg unload here and the next leg's kit trains load here. `halt` is an index on the
 * line of the legs that load (the `ns` row's High Gorge). */
export const RAIL_YARDS: readonly { id: string; halt: number; fedBy: number }[] = [{ id: 'gorge', halt: 0, fedBy: 0 }];

/** Places the catalog draws once per row: the same place, a few metres apart. Sectioning and the rules treat each as one
 * place (Ring Island's halt differs by 30 m between `ring` and `bay-trestle`; West landing by 37 m between `bay` and
 * `cave`). `halts`: [row, halt index]. */
export const RAIL_PLACES: readonly { id: string; halts: readonly (readonly [string, number])[] }[] = [
  {
    id: 'ring-island',
    halts: [
      ['ring', 0],
      ['bay-trestle', 0],
    ],
  },
  {
    id: 'gorge',
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
    halts: [
      ['bay', 2],
      ['cave', 3],
    ],
  },
];

export const ROUTE = { branchFirst: 'gorge', branches: 'both', ending: 'card', upgrades: 'one' } as const;

// ---------------------------------------------------------------- step 3: what the rules read (greybox-route.md)
/** A row's centimetres against its sim line's `s`: the `ring` row counts on from the pier head at its `fromCm` (74300),
 * line 2 from RING_S_HEAD (74200), so the same place is 100 cm further along the row (the Ring Island halt: row 119100,
 * line 2's 119000). The generator measured the pier head along Place's sampled path, which ends 3.55 m short of it;
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
/** A catalog row's point `cm` along it (row cm) and a catalog halt's platform point: the sim catalog's sources. */
export const rowPoint = pointAt;
export const rowHalt = haltAt;
/** Section k's frame (placeholder: on the row at the section's first centimetre, a halt's reach; step 4 places it
 * beside the railhead with its rack): where `rail.legStock` is judged, and where the leg's rack stands. */
export function legFrame(leg: RouteLeg, k: number): RailPlatform {
  return pointAt(leg.row, sectionFromCm(leg, k));
}
/** The meeting marker on the Original Island (placeholder: at the `ns` row's last halt, 25 m round it): `rail.arrive`. */
export const RAIL_ARRIVAL: RailPlatform = { ...haltAt('ns', 2), reach: 2500 };
/** The route's named tunables (design review of 12 November, rulings 1.3 and 1.4): `layTicks`, a section's lay time
 * whatever its length (30 s); `kitLead`, the sections whose kit is owed ahead of the frame, "all remaining" (the
 * longest leg's count), never under 2. Catalog data, not room tunables: a change is a rules change, no state. */
export const LEG_TUNE = {
  layTicks: 300,
  kitLead: Math.max(...RAIL_LEGS.map((l) => l.sections.length)),
} as const;
if (LEG_TUNE.kitLead < 2) throw new Error('railway-route: kitLead under 2');
