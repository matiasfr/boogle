// The rail loop as one typed graph (docs/brainstorms/loop-graph.md): every beat, gate, ability and bill of the
// production route, what it requires, what it costs and which in-world cue telegraphs it. Bills, counts and
// positions are imported from the sim's layout catalogs, never copied; only `requires` and `cue` are hand-authored,
// each with its source. Encodes today's Home (not the proposed layout B). Read-only over src/: no runtime import.
import fs from 'node:fs';
import path from 'node:path';
import { RAILWAY_CAPACITY, RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import { insideSplitRock } from '../../src/entities/railway/works-shape.ts';
import { LINE1_STATIONS, LINE1_ROCKS, LINE1_GREAT_TREE, LINE1_JUMP_DEVICE } from '../../src/sim/railway-line-layout.ts';
import {
  LINE2_STATIONS,
  LINE2_AXE,
  LINE2_FORGE,
  LINE2_PACK,
  LINE2_YOKE,
  depotOffset,
  type Line2Station,
  LINE2_LEVER,
  LINE2_HOOK,
  LINE2_SEA,
  LINE2_GLIDE,
  LINE2_BOILER,
  LINE2_OLD_TRAIN,
  LINE2_KIT,
  line2Routes,
} from '../../src/sim/railway-line2-layout.ts';
import {
  WORKS,
  WORKS_SEAMS,
  WORKS_BREAKER,
  WORKS_KILN,
  WORKS_RACK,
  WORKS_ROCKS,
  SHED_STALL,
  SHED_TABLE,
  PIER_STOP,
  PIER_RACK,
  PIER_FRAME,
} from '../../src/sim/railway-works-layout.ts';
import {
  RING_BRACE,
  RING_HEAD,
  RING_RIVET,
  RING_STEEL_WORKS,
  RING_STEEL_YARD,
  STEEL,
} from '../../src/sim/railway-ring-layout.ts';
import {
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  legFrame,
  legRack,
  rowHalt,
  type RouteLeg,
} from '../../src/sim/railway-route.ts';

import { garageRow, polarAt } from '../../src/entities/railway/garage-geo.ts';
const garageSite = garageRow();
const garagePost = polarAt(garageSite.table, garageSite.geo.post);

export type NodeId =
  | 'wake'
  | 'T1'
  | 'T2'
  | 'beam'
  | 'T3'
  | 'jump'
  | 'forge'
  | 'axe'
  | 'pack'
  | 'Q1'
  | 'yoke'
  | 'Q2'
  | 'hook'
  | 'Q3'
  | 'lever'
  | 'Q4'
  | 'sea'
  | 'Q5'
  | 'glider'
  | 'boiler'
  | 'trains'
  | 'Q6'
  | 'pier'
  | 'breaker'
  | 'slab'
  | 'throat'
  | 'kiln'
  | 'stall'
  | 'cradle'
  | 'table'
  | 'upgrade'
  | 'crossing'
  | 'Q7'
  | 'bents'
  | 'brace'
  | 'weights'
  | 'rivet'
  | 'steelkit'
  | 'steelworks'
  | 'steelhome'
  | 'install'
  | SectionId
  | 'gorge'
  | 'pick'
  | 'incline-gate'
  | 'seeds';
/** The greybox legs' sections (ROUTE_SECTIONS). */
export type SectionId = 'stack-1' | 'stack-2' | 'stack-3' | 'stack-4' | 'incline-1' | 'incline-2' | 'bay-1' | 'bay-2';

/** World centimetres, as the catalogs pin them. `y` only where the catalog gives a height. */
export type Point = { x: number; z: number; y?: number };
/** `decided`: the design names this order (cite it). `free`: the owner chose either order. `unruled`: no ruling. */
export type EdgeStatus = 'decided' | 'free' | 'unruled';
/** Who refuses the wrong order today: the sim's rules, the world (geometry, an ability the sim doesn't track), or
 * nobody. Authored from reading the code; `npm run loop -- run` probes the `rules` and `none` claims. */
export type EnforcedBy = 'rules' | 'world' | 'none';
export type Edge = {
  on: NodeId;
  status: EdgeStatus;
  /** `start` (default): this node can't begin before `on` is done. `finish`: it can begin, but not complete. */
  scope?: 'start' | 'finish';
  by: EnforcedBy;
  source: string;
};
/** A prompt-only cue reports as "no cue"; a cue decided but not built doesn't count as present. `unknown`: not
 * confirmed by reading the code. */
export type Cue = {
  kind: 'world' | 'prompt-only' | 'unknown';
  state: 'decided' | 'on-main' | 'observed' | 'unknown';
  what: string;
  source: string;
};
export type Material = 'logs' | 'stone' | 'rails' | 'beam' | 'boiler' | 'footings';
/** Where a bill's material comes from: by hand from a point, or brought by the cart, the kit train or the wagon to a
 * rack beside the frame (the last carry is then rack to frame). A vehicle supply names `foot`: where a player would
 * fetch it on foot if the vehicle isn't there (the nearest trees, the forge rack, the Works rack). */
export type HandSupply = { by: 'hand'; from: readonly Point[]; per: number; label: string };
export type Supply =
  HandSupply | { by: 'cart' | 'train' | 'wagon' | 'stocked'; rack: Point; label: string; foot: HandSupply };
/** A mark (src/adapters/railway-marks.ts) that says the node was reached: the `nth` match, or the last one. */
export type Reached = {
  mark: string;
  data?: Record<string, string | number>;
  nth?: number | 'last';
  /** Other marks the same moment emits (never activity). */
  also?: string[];
};
export type LoopNode = {
  id: NodeId;
  label: string;
  area: 'line 1' | 'line 2' | 'works' | 'route';
  at: Point;
  bill: Partial<Record<Material, number>>;
  supply: Partial<Record<Material, Supply>>;
  /** The rail actions this node owns (generic carrying ops are GENERIC_OPS). */
  ops: string[];
  reached: Reached;
  /** RAIL_STOPS keys (dev/look/segments.ts) that stop the bot at this node. */
  stops: string[];
  requires: Edge[];
  cue: Cue[];
  optional?: boolean;
  /** Never set here: every node of NODES is built and played through the rules. The route past them is modelled as
   * stand-ins, which carry `standIn: true` (dev/loop/standins.ts). */
  standIn?: never;
};

/** General actions for any current node, and optional town buys that never gate the route. */
export const GENERIC_OPS = [
  'rail.buy', // B1: outside route order and bills.
  'rail.sack', // C1: returning players pour away fares outside route order and bills.
  'rail.chop',
  'rail.take',
  'rail.rackTake',
  'rail.drop',
  'rail.deposit',
  'rail.mine',
  'rail.beamDrop',
  'rail.forgeTake',
  'rail.depotTake',
  'rail.depotRailTake',
  'rail.boilerDrop',
  'rail.call',
  'rail.footTake',
  // The halt yards (docs/plans/halt-yard.md): Leave it here and Pick up at a bay, outside route order and bills.
  'rail.haltPut',
  'rail.haltTake',
] as const;
/** Rail actions whose nodes are not built yet: the meeting on the Original Island (the route's last leg, area 9, a
 * stand-in in dev/loop/standins.ts). Named here, not owned by a node. */
export const PENDING_OPS = ['rail.arrive'] as const;
/** The greybox legs' reached marks that the play record does not carry yet (greybox-leg2.md, step 5, as built): no
 * progress mark names a laid section or the arrival at High Gorge (src/adapters/railway-marks.ts), and the pickup and
 * barrier marks have no beat (dev/playtest/beats.ts). Both files belong to later work; test/loop-graph.test.ts holds
 * these out of its two checks, and fails once a mark is both emitted and a beat, so the entry comes out. */
export const PENDING_MARKS: readonly string[] = [
  'route section laid',
  'High Gorge reached',
  'route pickup taken',
  'route barrier opened',
];
/** Marks that are activity, attributed to the node current at the time (dev/loop/trace.ts). */
export const ACTIVITY_MARKS: readonly RegExp[] = [
  /^chop$/,
  /^mined$/,
  /^deposit$/,
  /^depot pick up$/,
  /^cart called$/,
  /^train called$/,
  /^train ride$/,
  /^footing shouldered$/,
  /^steel kit taken$/,
  /^works fed$/,
  // The halt yards: putting spares in a bay and taking them out again.
  /^yard (left|taken)$/,
  // The greybox route's frame feed (rail.legStock): each section's carries, as `deposit` is a station's.
  /^leg frame fed$/,
  /^stretch funded [TQ]\d$/,
];

/** Walking pace, metres per second: the economy model's `walkMps` (dev/economy/campaign-kit.ts). */
export const WALK_MPS = 5.6;

/** Detour factors per node, written by `npm run loop -- calibrate` (dev/loop/calibrate.ts) from human sessions: what
 * a player really walked for a node over the straight-line prediction. */
export type Detour = { median: number; min: number; max: number; n: number };
export type DetourFile = {
  note: string;
  written: string;
  sessions: string[];
  excluded: Record<string, number>;
  nodes: Partial<Record<NodeId, Detour>>;
};
/** A factor needs this many sessions; fewer stays uncalibrated, and says so. */
export const DETOUR_MIN_N = 2;
export const DETOUR_FILE = path.join(import.meta.dirname, 'detour.json');
function readDetour(): DetourFile | null {
  try {
    return JSON.parse(fs.readFileSync(DETOUR_FILE, 'utf8')) as DetourFile;
  } catch {
    return null;
  }
}
export const DETOUR = readDetour();
/** The median detour for a node when at least DETOUR_MIN_N sessions measured it, else null (uncalibrated). */
export function detourOf(id: NodeId): Detour | null {
  const d = DETOUR?.nodes[id];
  return d && d.n >= DETOUR_MIN_N ? d : null;
}

const station1 = (id: string) => LINE1_STATIONS.find((s) => s.id === id)!;
const station2 = (id: string) => LINE2_STATIONS.find((s) => s.id === id)!;
const p = (q: { x: number; z: number; y?: number }): Point => (q.y === undefined ? { x: q.x, z: q.z } : q);
// The trees that grew through the split rock's bowl and walls are cleared locally while the Works stands
// (src/entities/railway/sources.ts), so nobody can chop them: they are no one's log source.
const TREES: readonly Point[] = RAILWAY_SOURCES.filter(([, x, z]) => !insideSplitRock({ x: x / 100, z: z / 100 })).map(
  ([, x, z]) => ({ x, z }),
);
const FORGE_RACK: Point = { x: LINE2_FORGE.rackX, z: LINE2_FORGE.rackZ };
const trees: HandSupply = { by: 'hand', from: TREES, per: T1.sourceYield, label: 'standing trees' };
const forgeRails: HandSupply = { by: 'hand', from: [FORGE_RACK], per: LINE2_FORGE.rackMax, label: 'forge rack' };
const rocks = (list: readonly { x: number; z: number; initial: number }[], label: string): HandSupply => ({
  by: 'hand',
  from: list.map(p),
  per: Math.min(...list.map((r) => r.initial)),
  label,
});
const one = (q: Point, label: string): HandSupply => ({ by: 'hand', from: [q], per: 1, label });
const depotRack = (s: Line2Station, by: 'cart' | 'train', foot: HandSupply): Supply => ({
  by,
  rack: { x: s.x + depotOffset(s), z: s.z },
  label: `${by} to the rack (modeled offset ${depotOffset(s) / 100} m)`,
  foot,
});
const dec = (on: NodeId, by: EnforcedBy, source: string, scope?: 'finish'): Edge => ({
  on,
  status: 'decided',
  by,
  source,
  ...(scope ? { scope } : {}),
});
// Where each cited rule lives since the systems split by domain (docs/plans/ecs-migration-railway.md, M3).
const RULES_QUERIES = 'src/sim/railway-queries.ts';
const RULES_LINE1 = 'src/sim/railway-sys-line1.ts';
const RULES_LINE2 = 'src/sim/railway-sys-line2.ts';
const RULES_TRAINS = 'src/sim/railway-sys-trains.ts';
const RULES_WORKS = 'src/sim/railway-sys-works.ts';
const onMain = (kind: Cue['kind'], what: string, source: string): Cue => ({ kind, state: 'on-main', what, source });
const unbuilt = (what: string, source: string): Cue => ({ kind: 'world', state: 'decided', what, source });
const frameSign = (file: string): Cue =>
  onMain('world', 'the frame and its sign over it while it is the active stretch (have/need per material)', file);

function lineStation(id: 'T1' | 'T2' | 'T3', requires: Edge[], stops: string[], extra: Partial<LoopNode> = {}) {
  const s = station1(id);
  const bill: LoopNode['bill'] = { logs: s.bill[0] };
  const supply: LoopNode['supply'] = { logs: trees };
  if (s.bill[1]) {
    bill.stone = s.bill[1];
    supply.stone = rocks(LINE1_ROCKS, 'line one rocks');
  }
  // The beam is on T3's bill; its carry is the beam node's (no supply here, so it isn't counted twice).
  if (s.beam) bill.beam = s.beam;
  const node: LoopNode = {
    id,
    label: `Station ${id.slice(1)} (${id})`,
    area: 'line 1',
    at: p(s),
    bill,
    supply,
    ops: [],
    reached: { mark: `stretch laid ${id}` },
    stops,
    requires,
    cue: [frameSign('src/entities/railway/view.ts:438-455; src/entities/railway/stations.ts:367 setTag')],
    ...extra,
  };
  return node;
}
function quarryStation(
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7',
  requires: Edge[],
  extra: Partial<LoopNode> = {},
) {
  const s = station2(id);
  const feed = s.feed === 'train';
  const node: LoopNode = {
    id,
    label: `Station ${Number(id.slice(1)) + 3} (${id})`,
    area: 'line 2',
    at: p(s),
    bill: { logs: s.bill[0], rails: s.bill[1] },
    supply: {
      logs: feed ? depotRack(s, 'train', trees) : s.depot ? depotRack(s, 'cart', trees) : trees,
      rails: feed ? depotRack(s, 'train', forgeRails) : s.shelf ? depotRack(s, 'cart', forgeRails) : forgeRails,
    },
    ops: [],
    reached: { mark: `stretch laid ${id}` },
    stops: [id],
    requires,
    cue: [frameSign('src/entities/railway/line2-view.ts:942-960 frame.setTag')],
    ...extra,
  };
  return node;
}

const T3_ID = station1('T3');
// A train-fed job's kit is its bill, one trip in the kit car (calls 62-63): Q6's fills the car, Q7's (20/20) fits it.
const Q6 = station2('Q6');
if (Q6.bill[0] !== LINE2_KIT.logs || Q6.bill[1] !== LINE2_KIT.rails) throw new Error('loop graph: Q6 kit != bill');
for (const s of LINE2_STATIONS)
  if (s.feed === 'train' && (s.bill[0] > LINE2_KIT.logs || s.bill[1] > LINE2_KIT.rails))
    throw new Error(`loop graph: ${s.id}'s kit (its bill) is more than the kit car holds`);
const RULES_RING = 'src/sim/railway-sys-ring.ts';
const RING_PLAN = 'docs/plans/ring-island-build1.md';
const RULES_STEEL = 'src/sim/railway-sys-steel.ts';
// The steel works' kit rides line 2's trains to the island yard (ring-island-build2, R2): rails off the forge rack, logs
// made at the Village; on foot, logs from the trees and rails from the forge rack.
const steelKit = (foot: HandSupply): Supply => ({
  by: 'train',
  rack: p(RING_STEEL_YARD),
  label: 'kit train to the island yard',
  foot,
});

// The greybox route's legs (docs/plans/greybox-route.md and greybox-leg2.md, step 5): each section is a node, fed at
// its frame off its rack; bills, frames and racks are RAIL_LEGS's. The rules: src/sim/railway-sys-route.ts (legStock,
// grant, gate), the facts src/sim/railway-queries-route.ts (legReached: a leg's `after` complete).
const RULES_ROUTE = 'src/sim/railway-sys-route.ts';
const ROUTE_QUERIES = 'src/sim/railway-queries-route.ts';
const LEG_VIEW = 'src/entities/route-greybox/leg-view.ts';
const legOf = (id: string) => RAIL_LEGS.find((l) => l.id === id)!;
const STACK = legOf('stack'),
  INCLINE = legOf('incline'),
  BAY = legOf('bay-cut');
const grantOf = (id: string) => RAIL_GRANTS.findIndex((g) => g.id === id);
/** Who brings section k's kit to its rack (src/sim/railway-queries-route.ts: MINT_LEGS, YARD_LEGS, STOCKED_LEGS). */
const KIT_BY: Record<string, (k: number) => string> = {
  stack: () => "line 2's kit car from the Village to the railhead rack",
  incline: (k) =>
    k === 0
      ? "line 2's kit car to High Gorge's rack (the kit ahead)"
      : "an ns train from High Gorge's yard to the head",
  'bay-cut': (k) =>
    k === 0 ? "stocked on the West landing's rack (the stand-in: no train)" : 'a bay train from the West landing',
};
const legNodeId = (leg: RouteLeg, k: number) => `${leg === BAY ? 'bay' : leg.id}-${k + 1}` as SectionId;
/** Each built leg's sections as nodes: the node, its RAIL_LEGS index and the section index. */
export const ROUTE_SECTIONS: readonly { id: SectionId; leg: number; section: number }[] = [STACK, INCLINE, BAY].flatMap(
  (leg) => leg.sections.map((_s, section) => ({ id: legNodeId(leg, section), leg: RAIL_LEGS.indexOf(leg), section })),
);
function legSection(leg: RouteLeg, k: number, label: string, requires: Edge[], stops: string[] = []): LoopNode {
  const sec = leg.sections[k]!;
  const supply = (foot: HandSupply): Supply => ({
    by: k === 0 && leg === BAY ? 'stocked' : 'train',
    rack: p(legRack(leg, k)),
    label: KIT_BY[leg.id]!(k),
    foot,
  });
  return {
    id: legNodeId(leg, k),
    label,
    area: 'route',
    at: p(legFrame(leg, k)),
    bill: { logs: sec.logs, rails: sec.rails },
    // No rails come on foot by then: the forge rack gives none once the cradle is fitted (railway-sys-line2.ts
    // forgeTake), so a leg's rails are its rack's even by hand.
    supply: {
      logs: supply(trees),
      rails: supply(one(p(legRack(leg, k)), "the section's rack (the forge rack gives none after the cradle)")),
    },
    ops: ['rail.legStock'],
    reached: { mark: 'route section laid', data: { leg: leg.id, section: k + 1 } },
    stops,
    requires: [
      k === 0
        ? dec(
            leg.after < 0 ? 'rivet' : legNodeId(RAIL_LEGS[leg.after]!, RAIL_LEGS[leg.after]!.sections.length - 1),
            'rules',
            `${ROUTE_QUERIES} legReached: ${leg.after < 0 ? 'Ring Island joined' : `${RAIL_LEGS[leg.after]!.id} laid`}`,
          )
        : dec(legNodeId(leg, k - 1), 'rules', `${RULES_ROUTE} legStock: the frame of the section after the last laid`),
      ...requires,
    ],
    cue: [
      onMain(
        'world',
        `section ${k + 1}'s frame with its bill sign and the rack's plate (KIT ${k + 1}) beside it`,
        `${LEG_VIEW} site`,
      ),
    ],
  };
}
const ROUTE_NODES: readonly LoopNode[] = [
  ...STACK.sections.map((_s, k) =>
    legSection(
      STACK,
      k,
      `The stack line to High Gorge, section ${k + 1} of ${STACK.sections.length}`,
      [],
      k === STACK.sections.length - 1 ? ['gorge'] : [],
    ),
  ),
  {
    id: 'gorge',
    label: "Step off at High Gorge (the stack line's end)",
    area: 'route',
    at: p(rowHalt('ring', STACK.destRowHalt)),
    bill: {},
    supply: {},
    ops: [],
    reached: { mark: 'High Gorge reached' },
    stops: [],
    requires: [dec('stack-4', 'world', `${RULES_ROUTE} lay: the last section opens the Gorge halt; reached by train`)],
    cue: [onMain('world', "High Gorge's platforms, stair and the stand-in town's board", `${LEG_VIEW} High Gorge`)],
  },
  {
    id: 'pick',
    label: 'Take the powered pick on the Gorge rim',
    area: 'route',
    at: p(RAIL_GRANTS[grantOf('pick')]!.at),
    bill: {},
    supply: {},
    ops: ['rail.grant'],
    reached: { mark: 'route pickup taken', nth: 1 },
    stops: [],
    requires: [dec('stack-4', 'rules', `${RULES_ROUTE} grant: its leg laid (legDone)`)],
    cue: [onMain('world', 'the pickup post on the north rim, at the stair head', `${LEG_VIEW} High Gorge`)],
  },
  {
    id: 'incline-gate',
    label: "Open the incline's barrier",
    area: 'route',
    at: p(RAIL_GATES[INCLINE.sections[0]!.gate!]!.at),
    bill: {},
    supply: {},
    ops: ['rail.gate'],
    reached: { mark: 'route barrier opened', nth: 1 },
    stops: [],
    requires: [dec('pick', 'rules', `${RULES_ROUTE} gate: the room holds its needs grant (the pick)`)],
    cue: [onMain('world', "the red barrier on the incline's first frame, with its plate", `${LEG_VIEW} High Gorge`)],
  },
  ...INCLINE.sections.map((_s, k) =>
    legSection(
      INCLINE,
      k,
      `The incline to Bell Rock, section ${k + 1} of ${INCLINE.sections.length}`,
      k === 0
        ? [dec('incline-gate', 'rules', `${RULES_ROUTE} legStock: refused while the frame's barrier is shut`)]
        : [],
      k === INCLINE.sections.length - 1 ? ['bell'] : [],
    ),
  ),
  {
    id: 'seeds',
    label: "Take the crystal seeds on Bell Rock's lower deck",
    area: 'route',
    at: p(RAIL_GRANTS[grantOf('seeds')]!.at),
    bill: {},
    supply: {},
    ops: ['rail.grant'],
    reached: { mark: 'route pickup taken', nth: 2 },
    stops: [],
    requires: [dec('incline-2', 'rules', `${RULES_ROUTE} grant: its leg laid (legDone)`)],
    cue: [onMain('world', "the teal seeds post on Bell Rock's lower deck", `${LEG_VIEW} Bell Rock`)],
  },
  ...BAY.sections.map((_s, k) =>
    legSection(
      BAY,
      k,
      `The bay cut from the West landing to Bell Rock, section ${k + 1} of ${BAY.sections.length}`,
      [],
      k === BAY.sections.length - 1 ? ['bay'] : [],
    ),
  ),
];

export const NODES: readonly LoopNode[] = [
  {
    id: 'wake',
    label: 'Receive the camp resident’s axe',
    area: 'line 1',
    at: p(T1.wake),
    bill: {},
    supply: {},
    ops: ['rail.wake'],
    reached: { mark: 'woke' },
    stops: ['wake'],
    requires: [],
    cue: [
      onMain('world', 'Speech bubble over the camp resident; Talk, then Take axe', 'src/entities/railway/greeter.ts'),
    ],
  },
  lineStation('T1', [dec('wake', 'rules', `${RULES_QUERIES} ready(): awake + wakeTicks`)], ['t1-done']),
  lineStation('T2', [dec('T1', 'rules', `${RULES_QUERIES} activeStation()`)], ['t2-funded', 'T2']),
  {
    id: 'beam',
    label: 'Fell the great tree and drag the beam to T3',
    area: 'line 1',
    // Reached where the beam goes: one 35 m carry from the prow tree to T3's frame, derived from the catalog.
    at: p(T3_ID),
    bill: { beam: T3_ID.beam },
    supply: { beam: one(p(LINE1_GREAT_TREE), 'the great tree') },
    ops: ['rail.beamChop', 'rail.beamTake', 'rail.beamDeposit'],
    reached: { mark: 'deposit', data: { material: 'beam' } },
    stops: [],
    requires: [dec('T2', 'rules', `${RULES_LINE1} beamNeeded(): T3 active and unfunded`)],
    cue: [
      onMain(
        'world',
        "the great tree's gold rope sling from Station 3's opening; T3's empty rope saddles",
        'src/entities/railway/great-tree-view.ts:1-3',
      ),
    ],
  },
  lineStation(
    'T3',
    [
      dec('T2', 'rules', `${RULES_QUERIES} activeStation()`),
      {
        on: 'beam',
        status: 'free',
        by: 'none',
        source: 'decisions.md 2026-11-07 the great beam: logs and beam arrive in either order',
      },
      dec('beam', 'rules', `${RULES_LINE1} fund(): the beam allocated; decisions.md 2026-11-07`, 'finish'),
    ],
    ['T3'],
  ),
  {
    id: 'jump',
    label: 'Take the second jump (first pillar device)',
    area: 'line 1',
    at: p(LINE1_JUMP_DEVICE),
    bill: {},
    supply: {},
    ops: ['rail.jump'],
    reached: { mark: 'second jump gained' },
    stops: ['jump'],
    requires: [
      {
        on: 'T3',
        status: 'decided',
        by: 'world',
        source:
          'decisions.md 2026-11-09 loop orders: the second jump comes after station 3 (the p1 lip joins once the gantry passes, src/entities/railway/tools.ts:92)',
      },
    ],
    cue: [onMain('world', 'the jump device on the first pillar', 'src/entities/railway/tools.ts:92,268-274')],
    optional: true,
  },
  {
    id: 'forge',
    label: 'Build and light the forge',
    area: 'line 2',
    at: p(LINE2_FORGE),
    bill: { logs: LINE2_FORGE.logs },
    supply: { logs: trees },
    ops: [],
    reached: { mark: 'forge lit' },
    stops: ['forge-lit'],
    requires: [dec('T3', 'rules', `${RULES_LINE2} deposit2: station F needs T3 complete`)],
    cue: [onMain('world', "the forge frame's sign while unlit", 'src/entities/railway/line2-view.ts:906')],
  },
  {
    id: 'axe',
    label: 'Take the proper axe',
    area: 'line 2',
    at: p(LINE2_AXE),
    bill: {},
    supply: {},
    ops: ['rail.axe'],
    reached: { mark: 'proper axe gained' },
    stops: [],
    requires: [dec('forge', 'rules', `${RULES_LINE1} axe: forge lit; decisions.md 2026-11-07`)],
    cue: [onMain('world', "the axe on the forge's pedestal", 'src/entities/railway/forge-rewards.ts')],
    optional: true,
  },
  {
    id: 'pack',
    label: 'Open the pack chest',
    area: 'line 2',
    at: p(LINE2_PACK),
    bill: {},
    supply: {},
    ops: ['rail.pack'],
    reached: { mark: 'pack gained' },
    stops: [],
    requires: [dec('forge', 'rules', `${RULES_LINE2} pack: the forge's first bill (${LINE2_FORGE.bills[0]} logs)`)],
    cue: [onMain('world', 'the pack chest beside the forge', 'src/entities/railway/tools.ts:81,259-266')],
    optional: true,
  },
  quarryStation('Q1', [dec('forge', 'rules', `${RULES_LINE2} deposit2: forge lit + turnTicks`)]),
  {
    id: 'yoke',
    label: 'Take the Rail yoke',
    area: 'line 2',
    at: p(LINE2_YOKE),
    bill: {},
    supply: {},
    ops: ['rail.yoke'],
    reached: { mark: 'yoke gained' },
    stops: [],
    requires: [dec('Q1', 'rules', `${RULES_LINE2} yoke: Q1's bill in (line2YokeReady: QJob.start)`)],
    cue: [unbuilt('the yoke on its block beside the forge rail rack', 'docs/plans/rail-yoke.md, step 4')],
    optional: true,
  },
  quarryStation('Q2', [dec('Q1', 'rules', `${RULES_QUERIES} qActive()`)]),
  {
    id: 'hook',
    label: 'Take the hook shot (pillar p2)',
    area: 'line 2',
    at: p(LINE2_HOOK),
    bill: {},
    supply: {},
    ops: ['rail.hook'],
    reached: { mark: 'hook shot gained' },
    stops: ['hook'],
    requires: [
      dec(
        'Q2',
        'rules',
        `${RULES_LINE2} hook: two stretches laid; line2Routes(2).hook = ${String(line2Routes(2).hook)} (the walkway)`,
      ),
    ],
    cue: [onMain('world', "the hook drum on pillar p2's top", 'src/entities/railway/line2-view.ts:368-380')],
  },
  quarryStation('Q3', [dec('Q2', 'rules', `${RULES_QUERIES} qActive()`)]),
  {
    id: 'lever',
    label: 'Pull the quarry lever',
    area: 'line 2',
    at: p(LINE2_LEVER),
    bill: {},
    supply: {},
    ops: ['rail.lever'],
    reached: { mark: 'quarry lever pulled' },
    stops: [],
    requires: [dec('Q3', 'rules', `${RULES_LINE2} lever: three stretches laid (Q3 couples the drive)`)],
    cue: [
      onMain('world', 'the quarry gate and its lever on the apron', 'src/entities/railway/line2-view.ts:393-394'),
      onMain('world', 'Q4\'s sign: "Pull the lever to start" once full', 'src/entities/railway/line2-view.ts:957-960'),
    ],
  },
  quarryStation('Q4', [
    dec('Q3', 'rules', `${RULES_QUERIES} qActive()`),
    {
      on: 'lever',
      status: 'free',
      by: 'none',
      source: 'decisions.md 2026-11-08 fill a gated stretch before its switch',
    },
    dec('lever', 'rules', `${RULES_LINE2} fundQ(): gateDown`, 'finish'),
  ]),
  {
    id: 'sea',
    label: 'Pull the sea switch (gate jamb)',
    area: 'line 2',
    at: p(LINE2_SEA),
    bill: {},
    supply: {},
    ops: ['rail.seaSwitch'],
    reached: { mark: 'sea switch pulled' },
    stops: [],
    requires: [
      dec('hook', 'world', 'docs/decisions-core-loop.md: fly first, the far jamb needs one hook pull'),
      dec('Q4', 'rules', `${RULES_LINE2} seaSwitch: four stretches laid`),
    ],
    cue: [
      onMain(
        'world',
        'the empty mount at the gate, filled by Q4 with a drum and ring',
        'src/entities/railway/sea-gate-view.ts:1,39',
      ),
      onMain('world', 'Q5\'s sign: "Pull the switch to start" once full', 'src/entities/railway/line2-view.ts:957-960'),
    ],
  },
  quarryStation('Q5', [
    dec('Q4', 'rules', `${RULES_QUERIES} qActive()`),
    dec('sea', 'rules', `${RULES_LINE2} fundQ(): gateDown`, 'finish'),
  ]),
  {
    id: 'glider',
    label: 'Take the glider (summit)',
    area: 'line 2',
    at: p(LINE2_GLIDE),
    bill: {},
    supply: {},
    ops: ['rail.glide'],
    reached: { mark: 'glider gained' },
    stops: ['glider'],
    requires: [dec('hook', 'world', 'docs/plans/glider-b-home-flow.md: on the summit deck')],
    cue: [onMain('world', 'the lit summit device facing the forge', 'src/entities/railway/glide-device-view.ts:1-5')],
    optional: true,
  },
  {
    id: 'boiler',
    label: 'Take the boiler from its pedestal',
    area: 'line 2',
    at: p(LINE2_BOILER),
    bill: {},
    supply: {},
    ops: ['rail.boilerTake'],
    reached: { mark: 'boiler taken' },
    stops: [],
    requires: [
      dec('Q5', 'rules', `${RULES_LINE2} boilerTake: on the pedestal once Q5 is laid; decisions.md 8 Nov (B5-B8)`),
    ],
    cue: [
      onMain(
        'world',
        "the forge call's plume from the chimney",
        'src/entities/railway/boiler-view.ts:47-50; forge-call.ts',
      ),
      onMain('world', 'gold motes at the cold boiler', 'src/entities/railway/boiler-view.ts:125-145'),
      unbuilt('hauled on a gold rope like the great beam', 'decisions.md 9 Nov, the boiler is hauled on a rope'),
    ],
  },
  {
    id: 'trains',
    label: 'Fit the boiler: trains run',
    area: 'line 2',
    at: p(LINE2_OLD_TRAIN),
    // The haul: one carry, pedestal to the old train.
    bill: { boiler: 1 },
    supply: { boiler: one(p(LINE2_BOILER), 'the pedestal') },
    ops: ['rail.boilerFit'],
    reached: { mark: 'trains unlocked', also: ['boiler fitted'] },
    stops: ['trains'],
    requires: [dec('boiler', 'rules', `${RULES_LINE2} boilerFit: the holder fits it`)],
    cue: [
      onMain('world', "the old train's two open brass receivers", 'src/entities/railway/train-view.ts:93'),
      onMain(
        'prompt-only',
        '"Fit the boiler" within 7 m while carrying it',
        'src/entities/railway/boiler-view.ts:184-196',
      ),
      unbuilt('the "Steam" card for whoever fits it', 'decisions.md 9 Nov, four more answers (2)'),
      // v26 (docs/plans/generic-lines.md): the ride that follows is boarded at the platform for its way.
      onMain(
        'world',
        "a lever per platform, plaqued with its end; the Quarry's up platform over the plank crossing; Far Head's up lever chained until the pier",
        'src/entities/railway/halts-view.ts spots, chained; up-platforms.ts',
      ),
    ],
  },
  quarryStation(
    'Q6',
    [
      dec('Q5', 'rules', `${RULES_QUERIES} qActive()`),
      dec(
        'trains',
        'rules',
        `decisions.md 9 Nov station 6 takes nothing by hand until trains run; ${RULES_LINE2} deposit2 and forgeTake (trainOwed)`,
      ),
    ],
    {
      cue: [
        frameSign('src/entities/railway/line2-view.ts:942-960 frame.setTag'),
        onMain(
          'world',
          'until trains run, no bill: the rack sign shows the old train hauling the kit',
          'src/entities/railway/forge-offer.ts waitsForTrain; line2-view.ts:37-44 kitComing; stock-sign.ts',
        ),
      ],
    },
  ),
  {
    id: 'pier',
    label: 'Reach the pier',
    area: 'line 2',
    at: p(PIER_STOP),
    bill: {},
    supply: {},
    ops: [],
    reached: { mark: 'pier reached' },
    stops: ['pier'],
    requires: [dec('Q6', 'world', 'Q6 lays the track to the pier (src/adapters/railway-marks.ts pierLaid)')],
    cue: [onMain('world', 'the pier show on the Q6 completion edge', 'src/entities/railway/pier-view.ts:1')],
  },
  {
    id: 'breaker',
    label: 'Take the breaker',
    area: 'works',
    at: p(WORKS_BREAKER),
    bill: {},
    supply: {},
    ops: ['rail.breaker'],
    reached: { mark: 'breaker taken' },
    stops: [],
    requires: [
      dec(
        'trains',
        'rules',
        `${RULES_LINE2} line2Wake: casts the breaker after fit and cart rest; docs/plans/rider-coach.md`,
      ),
    ],
    cue: [onMain('world', "the forge call's plume over the breaker", 'src/entities/railway/breaker-view.ts:49')],
  },
  {
    id: 'slab',
    label: 'Strike the stall slab',
    area: 'works',
    at: p(WORKS_SEAMS[0]),
    bill: {},
    supply: {},
    ops: ['rail.strike'],
    reached: { mark: 'seam struck', data: { seam: 0 } },
    stops: [],
    requires: [dec('breaker', 'rules', `${RULES_WORKS} strike: breaker taken`)],
    cue: [
      onMain('world', 'the cracked slab in the Roundhouse', 'src/entities/railway/roundhouse-view.ts:1'),
      onMain('prompt-only', '"Strike the seam" within reach', 'src/entities/railway/breaker-view.ts:212-230'),
    ],
  },
  {
    id: 'throat',
    label: 'Strike the throat',
    area: 'works',
    at: p(WORKS_SEAMS[1]),
    bill: {},
    supply: {},
    ops: [],
    reached: { mark: 'seam struck', data: { seam: 1 } },
    stops: [],
    requires: [
      dec('breaker', 'rules', `${RULES_WORKS} strike: breaker taken`),
      { on: 'slab', status: 'free', by: 'none', source: 'decisions.md 2026-11-09 loop orders: either seam first' },
    ],
    cue: [
      onMain(
        'world',
        'the throat slab across the cut',
        'src/entities/railway/works-view.ts:1; works-shape.ts THROAT_SLAB',
      ),
      onMain('prompt-only', '"Strike the seam" within reach', 'src/entities/railway/breaker-view.ts:212-230'),
    ],
  },
  {
    id: 'kiln',
    label: 'Fill and light the kiln',
    area: 'works',
    at: p(WORKS_KILN),
    bill: { logs: WORKS.kilnLogs, stone: WORKS.kilnStone },
    supply: { logs: trees, stone: rocks(WORKS_ROCKS, 'the bowl rocks') },
    ops: ['rail.kiln'],
    reached: { mark: 'kiln filled', nth: 'last' },
    stops: [],
    requires: [dec('throat', 'rules', `${RULES_WORKS} kiln: throat struck; railway-server.ts railValid rail.kiln`)],
    cue: [
      onMain(
        'world',
        'the Kiln bill at the cut (logs n/16  stone n/16), gold ghosts of the missing load, and "Fill the kiln" to any back within 4.1 m with the same bill and a plain reason',
        'src/entities/railway/works-view.ts drawBill, drawGhosts; src/entities/railway/kiln-prompt.ts',
      ),
    ],
  },
  {
    id: 'stall',
    label: 'Raise the stall (two footings)',
    area: 'works',
    at: p(SHED_STALL),
    bill: { footings: WORKS.stall },
    supply: { footings: one(p(WORKS_RACK), 'the Works rack') },
    ops: ['rail.footSet'],
    reached: { mark: 'footing set', data: { site: 0 }, nth: WORKS.stall },
    stops: [],
    requires: [
      dec('slab', 'rules', `${RULES_WORKS} footSet site 0: the stall slab struck`),
      dec('kiln', 'rules', `${RULES_WORKS} worksTick: footings are cast by the lit kiln`),
    ],
    cue: [
      onMain(
        'world',
        'the Works rack board "Footings / stall n/2 by hand" and the dashed gold square at the stall on the halts\' maps; two gold ghost footings in the sockets',
        'src/entities/railway/footing-cues.ts; src/entities/railway/works-view.ts; src/entities/railway/halts-view.ts',
      ),
    ],
  },
  {
    id: 'cradle',
    label: 'Fit the cradle (eight rails)',
    area: 'works',
    at: p(SHED_STALL),
    // The cradle takes rails only since works-late-game step 2a (WORKS.cradle 0).
    bill: { rails: WORKS.cradleRails },
    supply: { rails: forgeRails },
    ops: ['rail.cradle'],
    reached: { mark: 'cradle rails', nth: 'last' },
    stops: [],
    requires: [dec('stall', 'rules', `${RULES_WORKS} cradle: the stall stands`)],
    cue: [
      onMain(
        'world',
        'the apron bill "Footing wagon / rails n/8", eight gold rail ghosts on the cradle, motes on the forge rail rack, and "Fit the cradle" greyed to a back without rails',
        'src/entities/railway/cradle-cues.ts; src/entities/railway/works-view.ts',
      ),
    ],
  },
  {
    id: 'table',
    label: 'Turn the table for the upgrade',
    area: 'works',
    at: p(SHED_TABLE),
    bill: {},
    supply: {},
    ops: ['rail.turn'],
    reached: { mark: 'table turned', nth: 'last' },
    stops: [],
    requires: [
      dec('stall', 'rules', `${RULES_WORKS} turn: the stall stands`),
      // Owner, 10 November ("Only when ready"): the turn is refused until the cradle is fitted, and after the wagon goes.
      dec('cradle', 'rules', `${RULES_WORKS} turn: only once the cradle is fitted, before the wagon rolls out`),
      { on: 'Q6', status: 'free', by: 'none', source: 'Owner, 15 November: the Works or Q6 first; works-flow step 1' },
    ],
    cue: [
      onMain(
        'world',
        'the apron bill turns to "Turn the table", the handle wears a gold outline and motes, a ghost wagon waits on line 2',
        'src/entities/railway/cradle-cues.ts; src/entities/railway/works-view.ts',
      ),
    ],
  },
  {
    id: 'upgrade',
    label: 'Install the 20 m/s upgrade: the wagon joins line 2',
    area: 'works',
    at: { x: Math.round(garagePost.x * 100), z: Math.round(garagePost.z * 100), y: SHED_TABLE.y },
    bill: {},
    supply: {},
    ops: ['rail.install'],
    reached: { mark: 'upgrade installed' },
    stops: [],
    requires: [
      dec('table', 'rules', `${RULES_STEEL} install part 1: fitted cradle, table at line 2`),
      dec('trains', 'rules', `${RULES_TRAINS} wagonArrives: the wagon couples to line 2's train`, 'finish'),
    ],
    cue: [
      onMain(
        'world',
        'the blast pipe on its stand, the garage post orange; hold Install for the free upgrade',
        'src/entities/railway/garage-view.ts',
      ),
    ],
  },
  {
    id: 'crossing',
    label: 'Foot the crossing (pier footings)',
    area: 'works',
    at: p(PIER_FRAME),
    bill: { footings: WORKS.pier },
    supply: {
      footings: {
        by: 'wagon',
        rack: p(PIER_RACK),
        label: 'wagon, or every outbound line 2 train once the loader yard stands and wagon couples, to the pier rack',
        foot: one(p(WORKS_RACK), 'the Works rack'),
      },
    },
    ops: [],
    reached: { mark: 'footing set', data: { site: 2 }, nth: WORKS.pier },
    stops: ['crossing'],
    requires: [
      dec('Q6', 'rules', `${RULES_WORKS} footSet site 2: all stretches laid; split-rock-roundhouse.md pier after Q6`),
      dec(
        'upgrade',
        'rules',
        `${RULES_TRAINS} wagonArrives: footings ride the wagon, or every outbound line 2 train with the coupled wagon and built loader yard (up to ${WORKS.loaderCap}, only while owed)`,
      ),
    ],
    cue: [
      onMain(
        'world',
        'twelve empty footing sockets and a stake at each bent; the pier bill "Pier / footings n/12 by wagon", the Works rack board "pier n/12 by wagon" and the gold square at the pier on the halts\' maps',
        'src/entities/railway/crossing-view.ts:1-3; src/entities/railway/footing-cues.ts',
      ),
    ],
  },
  // Ring Island build 1 (v27): the rules (R3b), the views (R4) and the bot's stops (R5, dev/look/bots/railway-ring.ts).
  quarryStation(
    'Q7',
    [dec('crossing', 'rules', `${RULES_QUERIES} qActive(): Q7 opens on Works.crossing (opens: 'crossing')`)],
    {
      stops: [],
      cue: [onMain('world', "Q7's frame and the double deck over bents 1-6", 'src/entities/railway/crossing-view.ts')],
    },
  ),
  {
    id: 'bents',
    label: 'Foot the gap (fourteen bent footings)',
    area: 'line 2',
    at: p(RING_HEAD[0]!.jib),
    bill: { footings: WORKS.ring },
    supply: {
      footings: {
        by: 'wagon',
        rack: p(RING_HEAD[0]!.rack),
        label:
          'wagon, or every outbound line 2 train once the loader yard stands and wagon couples, to the railhead rack',
        foot: one(p(WORKS_RACK), 'the Works rack'),
      },
    },
    ops: [],
    reached: { mark: 'footing set', data: { site: 3 }, nth: WORKS.ring, also: ['gap footed'] },
    stops: ['railhead', 'gap-footed'],
    requires: [
      dec('Q7', 'rules', `${RULES_RING} ringFootSet: Q7 laid`),
      dec(
        'upgrade',
        'rules',
        `${RULES_TRAINS} wagonArrives: the ring's footings ride the wagon, or every outbound line 2 train with the coupled wagon and built loader yard (up to ${WORKS.loaderCap}, only while owed) to the Railhead`,
      ),
    ],
    cue: [
      onMain(
        'world',
        'the railhead, its rack and jib moving out a bent each pair',
        'src/entities/railway/railhead-view.ts',
      ),
      onMain('world', "the empty rack's tag while a load is owed", 'src/entities/railway/railhead-view.ts'),
    ],
  },
  {
    id: 'brace',
    label: 'Brace the raised leaf',
    area: 'line 2',
    at: p(RING_BRACE),
    bill: {},
    supply: {},
    ops: ['rail.brace'],
    reached: { mark: 'leaf braced' },
    stops: ['gap', 'braced'],
    requires: [dec('bents', 'rules', `${RULES_RING} brace: set === 14`)],
    cue: [
      onMain('world', 'the gold strut on the brace platform', 'src/entities/railway/leaf-view.ts'),
      onMain(
        'world',
        "the take-off board and windsock at the platform's end and the landing cloth by the strut (cloth means glide); the island ring asleep from our deck, roped to the gold pad",
        'src/entities/railway/railhead-view.ts',
      ),
    ],
  },
  {
    id: 'weights',
    label: 'Hang the counterweight (four footings)',
    area: 'line 2',
    at: p(RING_HEAD[RING_HEAD.length - 1]!.jib),
    bill: { footings: WORKS.counterweight },
    supply: {
      footings: {
        by: 'wagon',
        rack: p(RING_HEAD[RING_HEAD.length - 1]!.rack),
        label:
          'wagon, or every outbound line 2 train once the loader yard stands and wagon couples, to the railhead rack',
        foot: one(p(WORKS_RACK), 'the Works rack'),
      },
    },
    ops: [],
    reached: { mark: 'footing set', data: { site: 3 }, nth: WORKS.ring + WORKS.counterweight },
    stops: [],
    requires: [
      dec('bents', 'rules', `${RULES_RING} ringFootSet: the counterweight once set === 14`),
      { on: 'brace', status: 'free', by: 'none', source: `${RING_PLAN} call 9: brace and weights in either order` },
    ],
    cue: [
      onMain('world', "the counterweight bracket's lit outline under the plate", 'src/entities/ring-island/bracket.ts'),
    ],
  },
  {
    id: 'rivet',
    label: 'Strike the rivet (Ring Island joined)',
    area: 'line 2',
    at: p(RING_RIVET),
    bill: {},
    supply: {},
    ops: [],
    reached: { mark: 'seam struck', data: { seam: 2 }, also: ['ring joined'] },
    stops: ['ring-joined', 'ring-ride'],
    requires: [
      dec('brace', 'rules', `${RULES_RING} ringStrike: the leaf down (brace === 0)`),
      dec('weights', 'rules', `${RULES_RING} ringStrike: the leaf down (cw === 4)`),
    ],
    cue: [onMain('world', 'the gold glint over the rivet stud', 'src/entities/ring-meet/view.ts')],
  },
  // Ring Island build 2 (docs/plans/ring-island-build2.md, R5): the steel works and the install. Their stops wait for
  // the bot, which needs V1's prompts and V3's Install.
  {
    id: 'steelkit',
    label: 'The steel kit lands in the island yard',
    area: 'line 2',
    at: p(RING_STEEL_YARD),
    bill: {},
    supply: {},
    ops: [],
    reached: { mark: 'steel kit landed' },
    stops: [],
    requires: [dec('rivet', 'rules', `${RULES_STEEL} steelLoads, steelArrives: ringJoined`)],
    cue: [
      onMain(
        'world',
        "the kit's stacks in the yard and the bill sign over the works (0 of 8, 0 of 12)",
        'src/entities/ring-steel/view.ts',
      ),
    ],
  },
  {
    id: 'steelworks',
    label: `Feed the steel works (${STEEL.logs} logs, ${STEEL.rails} rails)`,
    area: 'line 2',
    at: p(RING_STEEL_WORKS),
    bill: { logs: STEEL.logs, rails: STEEL.rails },
    supply: { logs: steelKit(trees), rails: steelKit(forgeRails) },
    ops: ['rail.steel', 'rail.steelTake'],
    reached: { mark: 'steel works lit' },
    stops: ['steel-lit'],
    requires: [
      dec('rivet', 'rules', `${RULES_STEEL} steelFeed: ringJoined; railway-server.ts railValid rail.steel`),
      // Any logs and rails count, not only the yard's, but nobody carries a bill's worth 1.2 km to the island.
      dec('steelkit', 'world', `${RULES_STEEL} steelTake: the yard holds the kit; steelFeed takes any logs and rails`),
    ],
    cue: [
      onMain(
        'world',
        '"Feed the works", shown blocked with its reason to an empty back (ruling E)',
        'src/entities/ring-steel/view.ts targets',
      ),
    ],
  },
  {
    id: 'steelhome',
    label: 'The first steel home to the Roundhouse bay',
    area: 'line 2',
    at: p(SHED_TABLE),
    bill: {},
    supply: {},
    ops: [],
    reached: { mark: 'steel home' },
    stops: ['steel-home'],
    requires: [dec('steelworks', 'rules', `${RULES_STEEL} steelTick: lit; steelArrives: the kit car takes the rack`)],
    cue: [
      onMain(
        'world',
        "steel on the kit car's deck (on the train's steel car once it wears the longer boiler) and the pallet by the Roundhouse table",
        'src/entities/railway/boiler-install-view.ts',
      ),
    ],
  },
  {
    id: 'install',
    label: "Install line 2's longer boiler",
    area: 'line 2',
    at: p(SHED_TABLE),
    bill: {},
    supply: {},
    ops: ['rail.install'],
    reached: { mark: 'boiler installed' },
    stops: ['boiler-long'],
    requires: [dec('steelhome', 'rules', `${RULES_STEEL} install: Shed.steel >= 1; railway-server.ts railValid`)],
    cue: [
      onMain(
        'world',
        "the garage's lever post by the table (its knob orange, the longer boiler on its stand): Interact opens the garage on the Longer boiler, and holding Install sends rail.install",
        'src/entities/railway/garage-view.ts',
      ),
    ],
  },
  ...ROUTE_NODES,
];

export const node = (id: NodeId) => NODES.find((n) => n.id === id)!;
export const cm = (a: Point, b: Point) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2 + ((a.y ?? b.y ?? 0) - (b.y ?? a.y ?? 0)) ** 2);

/** A cue counts when it is in the world and on main (or observed); prompt-only and decided-but-unbuilt don't. */
export const hasCue = (n: LoopNode) =>
  n.cue.some((c) => c.kind === 'world' && (c.state === 'on-main' || c.state === 'observed'));

/** The room's capacity steps a node is reached with (canonical order: the pack right after the forge, the yoke right
 * after Q1, the breaker before the throat and the kiln). */
export type Upgrades = { pack: boolean; breaker: boolean; yoke: boolean };
/** Units one carry holds of a material (separate capacities): logs 8, 16 with the pack; stone 8, 16 with the breaker;
 * rails 8, 16 with the yoke; one beam, boiler or footing fills a back. */
export function carryOf(material: Material, { pack, breaker, yoke }: Upgrades) {
  if (material === 'beam' || material === 'boiler' || material === 'footings') return 1;
  if (material === 'rails') return yoke ? RAILWAY_CAPACITY.railsYoke : RAILWAY_CAPACITY.rails;
  if (material === 'stone') return breaker ? RAILWAY_CAPACITY.stoneBreaker : RAILWAY_CAPACITY.stone;
  return pack ? RAILWAY_CAPACITY.logsPack : RAILWAY_CAPACITY.logs;
}
/** Straight-line one-way metres a carry of `material` walks to the node: from the nearest sources that hold its
 * bill (trees yield `sourceYield` each, rocks their initial stone), or from the rack beside the frame. */
function carryMetres(n: LoopNode, material: Material, byHand = false) {
  const supplied = n.supply[material];
  const bill = n.bill[material] ?? 0;
  if (!supplied || !bill) return 0;
  const s = byHand && supplied.by !== 'hand' ? supplied.foot : supplied;
  if (s.by !== 'hand') return cm(s.rack, n.at) / 100;
  const k = Math.min(s.from.length, Math.max(1, Math.ceil(bill / s.per)));
  const near = [...s.from].map((q) => cm(q, n.at)).sort((a, b) => a - b);
  return near.slice(0, k).reduce((a, b) => a + b, 0) / k / 100;
}
/** One material's carries: `metres` as supplied today (from the rack when a vehicle brings it), `handMetres` if it is
 * fetched on foot (`foot` names from where; the same as `metres` for a hand supply). */
export type Grind = {
  material: Material;
  carries: number;
  metres: number;
  handMetres: number;
  by: Supply['by'];
  foot?: string;
};
export function grindOf(n: LoopNode, upgrades: Upgrades): Grind[] {
  return (Object.keys(n.supply) as Material[]).map((material) => {
    const s = n.supply[material]!;
    return {
      material,
      carries: Math.ceil((n.bill[material] ?? 0) / carryOf(material, upgrades)),
      metres: carryMetres(n, material),
      handMetres: carryMetres(n, material, true),
      by: s.by,
      ...(s.by === 'hand' ? {} : { foot: s.foot.label }),
    };
  });
}
/** Carry-metres one player walks loaded for a node when `players` share the carries evenly (one way); `byHand`: with
 * every vehicle away, each material fetched from its `foot` source. */
export const grindFor = (g: Grind[], players: number, byHand = false) =>
  g.reduce((total, r) => total + Math.ceil(r.carries / players) * (byHand ? r.handMetres : r.metres), 0);
/** Every material on the bill comes by a vehicle: without it the node is all on foot. */
export const vehicleOnly = (n: LoopNode) =>
  Object.keys(n.supply).length > 0 && Object.values(n.supply).every((s) => s.by !== 'hand');
/** Some material on the bill comes by a vehicle. */
export const vehicleFed = (n: LoopNode) => Object.values(n.supply).some((s) => s.by !== 'hand');

// ---------------------------------------------------------------- orders
const startEdges = (n: LoopNode) => n.requires.filter((e) => (e.scope ?? 'start') === 'start');
/** The orders the graph allows, as the solver proposes them: the canonical order (declaration order under every
 * edge), then one order per `free` or `unruled` edge with that edge reversed, when the decided edges permit it. */
export function proposeOrders(): { name: string; order: NodeId[]; flipped?: { from: NodeId; on: NodeId } }[] {
  const soft = NODES.flatMap((n) =>
    n.requires.filter((e) => e.status !== 'decided' && (e.scope ?? 'start') === 'start').map((e) => ({ n: n.id, e })),
  );
  const orders: { name: string; order: NodeId[]; flipped?: { from: NodeId; on: NodeId } }[] = [
    { name: 'canonical', order: topo()! },
  ];
  for (const { n, e } of soft) {
    const order = topo({ from: n, on: e.on });
    if (order) orders.push({ name: `${n} before ${e.on}`, order, flipped: { from: n, on: e.on } });
  }
  return orders;
  function topo(flip?: { from: NodeId; on: NodeId }): NodeId[] | null {
    const after = new Map<NodeId, Set<NodeId>>(NODES.map((n) => [n.id, new Set()]));
    for (const n of NODES)
      for (const e of [...startEdges(n), ...n.requires.filter((r) => r.scope === 'finish')]) {
        if (flip && n.id === flip.from && e.on === flip.on) continue;
        // A finish edge orders the canonical play only; flipping a pair drops every edge between the two.
        after.get(n.id)!.add(e.on);
      }
    if (flip) after.get(flip.on)!.add(flip.from);
    const out: NodeId[] = [];
    const left = NODES.map((n) => n.id);
    while (left.length) {
      const i = left.findIndex((id) => [...after.get(id)!].every((d) => out.includes(d)));
      if (i < 0) return null;
      out.push(left.splice(i, 1)[0]!);
    }
    return out;
  }
}
