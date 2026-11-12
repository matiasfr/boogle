// node dev/level/world-blockout.ts [--check]: the whole-map blockout's two derived files, from the Sickle Isles JSON in
// docs/world/map-prototypes.html and Place's real line 2 (docs/plans/world-blockout.md):
//   src/sickle/world-lines.ts    every future line as a pinned catalog in the sim's own shape (world cm, stops, halts)
//   docs/world/world-blockout.html  the top-down map and its tables, for the owner's review
// `--check` writes nothing and exits 1 if either file is stale (test/world-lines.test.ts runs the same comparison).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import {
  HALTS,
  LINES,
  LINKS,
  ORIGIN,
  ROOM_PLOTS,
  SPIRE,
  TOWN,
  TURNTABLE,
  FORGE,
  lineAt,
  railY,
} from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { GATES, GATE_SLAB, PILLARS } from '../../src/place/tech-layout.ts';
import { FRAME_D, FRAME_W, frameBesideLine } from '../../src/place/spatial-station.ts';
import { layout, parseMapPage, polyLen, smoothRing, type XZ } from '../../src/sickle/map-data.ts';
import { createGround } from '../../src/proto/greybox/ground.ts';
import { RING_CONES } from '../../src/proto/greybox/ground.ts';
import { FAR } from '../../src/place/layout.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CATALOG = 'src/sickle/world-lines.ts';
const PAGE = 'docs/world/world-blockout.html';
const STILLS = 'docs/world/world-blockout';

type Leg = { id: string; reverse?: boolean };
type HaltSpec = { name: string; place?: string; at?: 'end' | 'start'; nearPt?: XZ };
type Service = { id: string; name: string; extends?: 1; legs: Leg[]; halts: HaltSpec[]; note: string };
type Turn = 'crossover' | 'loop' | null;

/** Every corridor is double track (owner, 10 November): two tracks on 4 m centres. The gauge is the village's: rails 0.5 m
 * either side of the centre (src/entities/railway/track.ts), on a 3.6 m deck, so the formation is 7.6 m wide. Halts get a
 * platform outside each track. */
export const FORMATION = { tracks: 2, centresCm: 400, gaugeCm: 100, deckCm: 760, platformCm: 580, loopCm: 4000 };
/** How each line's ends turn a train back without reversing it: a scissors crossover just short of the terminus
 * platform, or a single-track balloon loop past it where the island has room. Null: the line runs on (line 2's end). */
const TURNBACKS: Record<string, [start: Turn, end: Turn]> = {
  ring: [null, 'crossover'],
  stack: ['crossover', 'crossover'],
  bay: ['crossover', 'loop'],
  'bay-trestle': ['crossover', 'crossover'],
  cave: ['crossover', 'loop'],
  wall: ['crossover', 'crossover'],
  notch: ['crossover', 'loop'],
  causeway: ['crossover', 'loop'],
};

/** The future lines as train services: which map links each runs over, in order, and where it stops. */
export const SERVICES: Service[] = [
  {
    id: 'ring',
    name: 'Line 2 to Ring Island',
    extends: 1,
    legs: [{ id: 'ringx' }],
    halts: [
      { name: 'Ring Island halt', nearPt: [414, -820] },
      { name: 'Ring top', place: 'ring' },
    ],
    note: "Line 2's own extension over the bow (Ring Island build 1 lays it to the island halt; the climb to the Ring top junction comes with the branch).",
  },
  {
    id: 'stack',
    name: 'Stack line',
    legs: [{ id: 'ledge' }, { id: 'incline', reverse: true }],
    halts: [
      { name: 'Ring top', place: 'ring' },
      { name: 'High Gorge', place: 'gorge' },
      { name: 'Bell Rock', place: 'bell' },
    ],
    note: 'Ring Island out to the split stack, then down the incline to Bell Rock, so the Gorge comes home through the hub.',
  },
  {
    id: 'bay',
    name: 'Bay line',
    legs: [{ id: 'bay-cut' }, { id: 'bell-canopy' }],
    halts: [
      { name: 'West landing (bay)', place: 'home' },
      { name: 'Bell Rock', place: 'bell' },
      { name: 'Canopy Town', place: 'canopy' },
    ],
    note: "Home's West landing straight across the bay to Bell Rock (the shortcut), on through the cleft to Canopy Town.",
  },
  {
    id: 'bay-trestle',
    name: 'Bay trestle',
    legs: [{ id: 'ring-bell' }],
    halts: [
      { name: 'Ring top', place: 'ring' },
      { name: 'Bell Rock', place: 'bell' },
    ],
    note: 'Only built when Canopy Town is the first branch; otherwise the shortcut makes it unnecessary.',
  },
  {
    id: 'cave',
    name: 'Cave line',
    legs: [{ id: 'seacave' }, { id: 'salt-quay' }, { id: 'lift' }],
    halts: [
      { name: 'West landing (cave)', place: 'home' },
      { name: 'Saltpan Halt', place: 'saltpan' },
      { name: 'Port Quay', place: 'quay' },
      { name: 'High Port', place: 'port' },
    ],
    note: 'Through the sea cave the powered pick opens, past the Saltpan, along the breakwater, and up the crane lift.',
  },
  {
    id: 'wall',
    name: 'White Wall line',
    legs: [{ id: 'wall-s' }, { id: 'wall-n' }],
    halts: [
      { name: 'High Port', place: 'port' },
      { name: 'Canopy Town', place: 'canopy' },
      { name: 'High Gorge', place: 'gorge' },
    ],
    note: 'Along the foot of the chalk; its last span, on crystal collars, closes the ring.',
  },
  {
    id: 'notch',
    name: 'Notch line',
    legs: [{ id: 'notch-tunnel' }],
    halts: [
      { name: 'Canopy Town', place: 'canopy' },
      { name: 'Lantern Notch', place: 'notch' },
    ],
    note: 'Out to the sea arch whose lantern lights the causeway.',
  },
  {
    id: 'causeway',
    name: 'Lantern causeway',
    legs: [{ id: 'final' }],
    halts: [
      { name: 'Bell Rock', place: 'bell' },
      { name: 'Original Island', place: 'original' },
    ],
    note: "The last line, over the shallows to The Boogler's island.",
  },
];

/** The greybox ride round the whole network: Home, Ring Island, the Gorge, the Wall, High Port and back through the cave. */
export const FULL_LOOP: Leg[] = [
  { id: 'l2a' },
  { id: 'l2b' },
  { id: 'ringx' },
  { id: 'ledge' },
  { id: 'wall-n', reverse: true },
  { id: 'wall-s', reverse: true },
  { id: 'lift', reverse: true },
  { id: 'salt-quay', reverse: true },
  { id: 'seacave', reverse: true },
];

const html = fs.readFileSync(ROOT + 'docs/world/map-prototypes.html', 'utf8');
const MAP = parseMapPage(html);
const A = layout(MAP, 'sickle', 'A');
const B = layout(MAP, 'sickle', 'B');
const ground = createGround(A);
const lineOf = (id: string) => {
  const l = A.lines.find((x) => x.id === id);
  if (!l) throw new Error(`no map line ${id}`);
  return l;
};
const stageIn = (id: string, pick: 'A' | 'B') => {
  const l = (pick === 'A' ? A : B).lines.find((x) => x.id === id)!;
  const s = l.stage;
  return typeof s === 'number' || s === null ? s : s.c === pick ? s.s[0] : s.s[1];
};
const cm = (m: number) => Math.round(m * 100);
const LINE2_CM = cm(LINES.east.len);
const SPEED = { cruise: 200, step: 250, accel: 3.5 }; // cm a tick (20, 25 m/s), cm a tick² (the sim's TRAIN)

type Built = {
  id: string;
  name: string;
  extends: number | null;
  fromCm: number;
  lengthCm: number;
  pts: [number, number, number][];
  legs: { id: string; reverse: boolean; fromCm: number; toCm: number; stage: [number | null, number | null] }[];
  stops: number[];
  halts: { name: string; stop: number; x: number; z: number; y: number; reach: number }[];
  ends: { at: 'start' | 'end'; kind: 'crossover' | 'loop'; sCm: number; x: number; z: number; y: number }[];
  note: string;
};

function build(svc: Service): Built {
  const pts: [number, number, number][] = [];
  const legs: Built['legs'] = [];
  const along: number[] = [];
  const fromCm = svc.extends ? LINE2_CM : 0;
  let s = fromCm;
  for (const leg of svc.legs) {
    const line = lineOf(leg.id);
    const path = ground.linePath(line, false);
    if (leg.reverse) path.reverse();
    const start = s;
    for (const [x, y, z] of path) {
      const p: [number, number, number] = [cm(x), cm(z), cm(y)];
      const last = pts.at(-1);
      if (last && last[0] === p[0] && last[1] === p[1]) continue;
      if (last) s += Math.round(Math.hypot(p[0] - last[0], p[1] - last[1]));
      pts.push(p);
      along.push(s);
    }
    legs.push({
      id: leg.id,
      reverse: !!leg.reverse,
      fromCm: start,
      toCm: s,
      stage: [stageIn(leg.id, 'A'), stageIn(leg.id, 'B')],
    });
  }
  const at = (sCm: number) => {
    let i = 1;
    while (i < along.length - 1 && along[i]! < sCm) i++;
    const t = (sCm - along[i - 1]!) / Math.max(1, along[i]! - along[i - 1]!);
    const a = pts[i - 1]!,
      b = pts[i]!;
    return [0, 1, 2].map((k) => Math.round(a[k]! + (b[k]! - a[k]!) * t)) as [number, number, number];
  };
  const nearest = (x: number, z: number) => {
    let best = { d: Infinity, s: 0 };
    for (let k = 0; k <= s - fromCm; k += 100) {
      const p = at(fromCm + k);
      const d = Math.hypot(p[0] - x, p[1] - z);
      if (d < best.d) best = { d, s: fromCm + k };
    }
    return best.s;
  };
  // A halt at a place stands at the line's nearest point to it (Home's at the line's own end), 20 m in from either end
  // so its platform fits.
  const stops = svc.halts.map((h, stop) => {
    const p = A.places.find((x) => x.id === h.place);
    const v = h.nearPt
      ? nearest(cm(h.nearPt[0] + 1000), cm(h.nearPt[1]))
      : h.place === 'home'
        ? stop === 0
          ? fromCm
          : s
        : nearest(cm(p!.at[0] + 1000), cm(p!.at[1]));
    return Math.max(fromCm + 2000, Math.min(s - 2000, v));
  });
  const halts = svc.halts.map((h, stop) => {
    const [x, z, y] = at(stops[stop]!);
    return { name: h.name, stop, x, z, y, reach: 1260 };
  });
  // The crossover's middle stands 35 m inside the terminus halt (clear of its 40 m platforms); a loop's centre stands
  // one radius to the side of the line's end, so the circle touches the line there and a train runs round it and back.
  const ends: Built['ends'] = [];
  (['start', 'end'] as const).forEach((side, k) => {
    const kind = TURNBACKS[svc.id]![k];
    if (!kind) return;
    const tip = side === 'start' ? fromCm : s;
    const stop = stops[side === 'start' ? 0 : stops.length - 1]!;
    if (kind === 'crossover') {
      const sCm = side === 'start' ? stop + 3500 : stop - 3500;
      const [x, z, y] = at(sCm);
      ends.push({ at: side, kind, sCm, x, z, y });
    } else {
      const [x0, z0, y] = at(tip),
        [x1, z1] = at(side === 'start' ? tip + 500 : tip - 500);
      const len = Math.hypot(x0 - x1, z0 - z1) || 1;
      const r = FORMATION.loopCm;
      ends.push({
        at: side,
        kind,
        sCm: tip,
        x: Math.round(x0 - ((z0 - z1) / len) * r),
        z: Math.round(z0 + ((x0 - x1) / len) * r),
        y,
      });
    }
  });
  return {
    id: svc.id,
    name: svc.name,
    extends: svc.extends ?? null,
    fromCm,
    lengthCm: s - fromCm,
    pts,
    legs,
    stops,
    halts,
    ends,
    note: svc.note,
  };
}
export const BUILT = SERVICES.map(build);

// ---------------------------------------------------------------- the second track beside today's line 1 and line 2
// The live lines stay put: for each, which side a second track 4 m off would go, and where it meets something. Sampled
// every 2 m: a halt's platform on that side, a building, the turntable, the forge or the Needle Bell within reach, or
// ground beside that is far off the rail (a cutting or bank over 2.5 m; a cliff or gorge over 6 m).
type Clash = { fromCm: number; toCm: number; reason: string };
function secondTrack(lineIndex: 0 | 1) {
  const line = lineIndex === 0 ? LINES.north : LINES.east;
  const p = { x: 0, z: 0, ux: 0, uz: 0 };
  const off = FORMATION.centresCm / 100;
  const plots = [...TOWN.start, ...TOWN.wood.flat(), ...TOWN.stone.flat(), ...TOWN.camps.flatMap((c) => c.awake)];
  const things = [
    ...plots.map((b) => ({ x: b.x, z: b.z, r: Math.max(b.w ?? 5, b.d ?? 5) / 2 + 1.5, what: 'a building' })),
    ...Object.values(ROOM_PLOTS).map((b) => ({ x: b.x, z: b.z, r: Math.max(b.w, b.d) / 2 + 1.5, what: 'a building' })),
    { x: FORGE.x, z: FORGE.z, r: Math.max(FORGE.w, FORGE.d) / 2 + 1.5, what: 'the forge' },
    { x: TURNTABLE.x, z: TURNTABLE.z, r: TURNTABLE.r + 2, what: 'the turntable' },
    { x: SPIRE.x, z: SPIRE.z, r: 14, what: 'the Needle Bell' },
    // The pillars, the gates' jambs and the station frames, which the survey missed before the second track was built
    // (orchestrator, 10 November): each with the bed's 1.3 m half width added.
    ...PILLARS.map((q) => ({ x: q.x, z: q.z, r: q.r + 1.3, what: `pillar ${q.id}` })),
    ...Object.entries(GATES).flatMap(([id, g]) =>
      [-1, 1].map((side) => {
        const px = (side * (GATE_SLAB.w + GATE_SLAB.pillar)) / 2;
        return { x: g.x + Math.cos(g.yaw) * px, z: g.z - Math.sin(g.yaw) * px, r: 0.8 + 1.3, what: `the ${id} gate` };
      }),
    ),
    ...LINKS.flatMap((link) =>
      link.stations.map((spec) => {
        const f = frameBesideLine(spec, link.line, link.dir);
        return { x: f.x - ORIGIN.x, z: f.z, r: Math.hypot(FRAME_D, FRAME_W) / 2 + 1.3, what: `the ${spec.id} frame` };
      }),
    ),
    // line 2's works beside the track (frames, racks, levers), pinned in the map JSON from the railway catalog
    ...A.works
      .filter((w) => w.kind !== 'halt' && w.id !== 'bents' && w.id !== 'turntable')
      .map((w) => ({ x: w.at[0], z: w.at[1], r: 2.5, what: `the ${w.name.replace(/ \(.*\)$/, '')}` })),
  ];
  const sides = ([-1, 1] as const).map((side) => {
    const clashes: Clash[] = [];
    for (let s = 0; s <= line.len; s += 2) {
      lineAt(line, s, p);
      // the side normal: -1 is left of the line's drawn direction, +1 right
      const x = p.x - p.uz * off * side,
        z = p.z + p.ux * off * side;
      const y = railY(line, s);
      const centre = H(p.x + ORIGIN.x, p.z + ORIGIN.z),
        beside = H(x + ORIGIN.x, z + ORIGIN.z);
      const onGround = Math.abs(y - centre) < 1.5;
      let reason = '';
      const halt = HALTS.find(
        (h) => h.line === lineIndex && s >= h.s0 - 2 && s <= h.s1 + 2 && Math.sign(h.lat) === side,
      );
      if (halt) reason = `the ${halt.name} platform`;
      const thing = things.find((t) => Math.hypot(t.x - x, t.z - z) < t.r);
      if (!reason && thing) reason = thing.what;
      if (!reason && onGround && Math.abs(beside - y) > 6)
        reason = beside > y ? 'a rock face over 6 m' : 'a drop over 6 m';
      if (!reason && onGround && Math.abs(beside - y) > 2.5) reason = beside > y ? 'a cutting' : 'a bank';
      if (!reason) continue;
      const last = clashes.at(-1);
      const cmAt = Math.round(s * 100);
      if (last && last.reason === reason && cmAt - last.toCm <= 400) last.toCm = cmAt;
      else clashes.push({ fromCm: cmAt, toCm: cmAt, reason });
    }
    const metres = clashes.reduce((n, c) => n + (c.toCm - c.fromCm) / 100 + 2, 0);
    return { side, clashes, metres };
  });
  const best = sides[0]!.metres <= sides[1]!.metres ? sides[0]! : sides[1]!;
  const other = best === sides[0] ? sides[1]! : sides[0]!;
  // Where the chosen side is blocked, is the other side free there?
  const clashes = best.clashes.map((c) => ({
    ...c,
    otherFree: !other.clashes.some((o) => o.fromCm <= c.toCm + 200 && o.toCm >= c.fromCm - 200),
  }));
  return { line: lineIndex, side: best.side, metres: Math.round(best.metres), clashes, other: other.clashes };
}
export const LIVE_SECOND = [secondTrack(0), secondTrack(1)];

// ---------------------------------------------------------------- the catalog file
function catalog() {
  const rows = BUILT.map((l) => {
    const pts = l.pts.map((p) => `[${p.join(', ')}]`).join(', ');
    const legs = l.legs
      .map(
        (g) =>
          `{ id: '${g.id}', reverse: ${g.reverse}, fromCm: ${g.fromCm}, toCm: ${g.toCm}, stage: [${g.stage.map(String).join(', ')}] }`,
      )
      .join(',\n      ');
    const halts = l.halts
      .map(
        (h) =>
          `{ name: ${JSON.stringify(h.name)}, stop: ${h.stop}, x: ${h.x}, z: ${h.z}, y: ${h.y}, reach: ${h.reach} }`,
      )
      .join(',\n      ');
    return `  {
    id: '${l.id}',
    name: ${JSON.stringify(l.name)},
    extends: ${l.extends},
    fromCm: ${l.fromCm},
    lengthCm: ${l.lengthCm},
    speed: ${SPEED.cruise},
    accel: ${SPEED.accel},
    stops: [${l.stops.join(', ')}],
    halts: [
      ${halts},
    ],
    ends: [${l.ends.map((e) => `{ at: '${e.at}', kind: '${e.kind}', sCm: ${e.sCm}, x: ${e.x}, z: ${e.z}, y: ${e.y} }`).join(', ')}],
    legs: [
      ${legs},
    ],
    pts: [${pts}],
  },`;
  });
  return `// GENERATED by dev/level/world-blockout.ts from docs/world/map-prototypes.html (Sickle Isles) and Place's line 2: do
// not edit; change the map JSON or the services there and rerun. test/world-lines.test.ts fails when it is stale.
// Every future line in the sim's own shape (docs/plans/world-blockout.md, "Future lines as data"): world centimetres,
// x east and z south, \`y\` the deck; \`stops\` are cm along the line like TRAIN_STOPS (an extension counts on from the
// line it extends), \`halts\` like LINE_HALTS, \`speed\` cm a tick and \`accel\` cm a tick² like TRAIN. Pure integers and
// no imports, so src/sim can take this file unchanged (git mv) when the server runs these lines. Today only the
// client's blockout reads it: the rails it describes are visual, not sim state.

/** Every corridor is double track: two tracks on \`centresCm\` centres either side of the line's points, each of
 * \`gaugeCm\` gauge, on a \`deckCm\` formation. A halt has a platform at \`platformCm\` either side of the centre; a loop
 * has radius \`loopCm\`. */
export const FORMATION = ${JSON.stringify(FORMATION)} as const;

export type WorldHalt = { name: string; stop: number; x: number; z: number; y: number; reach: number };
/** A line end's turnback: a scissors crossover centred at \`sCm\`, or a balloon loop centred at (x, z) leaving at \`sCm\`. */
export type WorldEnd = { at: 'start' | 'end'; kind: 'crossover' | 'loop'; sCm: number; x: number; z: number; y: number };
export type WorldLeg = {
  /** The map link (docs/world/map-prototypes.html) this stretch runs over, and whether against its drawn direction. */
  id: string;
  reverse: boolean;
  fromCm: number;
  toCm: number;
  /** The progression stage it is built at: [High Gorge first, Canopy Town first]; null never. */
  stage: [number | null, number | null];
};
export type WorldLine = {
  id: string;
  name: string;
  /** null: its own train; 1: an extension of line 2 (TRAIN_STOPS[1]), counted on from \`fromCm\`. */
  extends: number | null;
  fromCm: number;
  lengthCm: number;
  speed: number;
  accel: number;
  stops: readonly number[];
  halts: readonly WorldHalt[];
  ends: readonly WorldEnd[];
  legs: readonly WorldLeg[];
  /** Track vertices, [x, z, y] world cm; each consecutive pair is one straight span. */
  pts: readonly (readonly [number, number, number])[];
};

export const WORLD_LINES: readonly WorldLine[] = [
${rows.join('\n')}
];

/** Today's single-track line 1 (0) and line 2 (1), left where they are: the side (-1 left of the drawn direction, +1
 * right) a second track would take, and the stretches where it meets something (cm along the line). \`otherFree\`: the
 * other side is clear there. The plan's notes, not a change to the live lines. */
export type SecondTrack = {
  line: 0 | 1;
  side: -1 | 1;
  clashes: readonly { fromCm: number; toCm: number; reason: string; otherFree: boolean }[];
};
export const LIVE_SECOND_TRACK: readonly SecondTrack[] = ${JSON.stringify(LIVE_SECOND.map(({ line, side, clashes }) => ({ line, side, clashes })))};
`;
}

// ---------------------------------------------------------------- numbers for the plan and the page
/** The service ladder's first two steps (docs/game-design/sickle-greybox.md): cruise, acceleration, dwell a stop. */
const LADDER: Record<number, [accel: number, dwell: number]> = { 20: [3.5, 5], 25: [4.5, 4] };
/** Rest-to-rest seconds for `stops` legs over `m` metres (every leg here is long enough to reach cruise). */
const ride = (m: number, mps: number, stops = 1) => m / mps + stops * (mps / LADDER[mps]![0] + LADDER[mps]![1]);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const km = (m: number) => (m / 1000).toFixed(2);
const legLen = (id: string) => polyLen(lineOf(id).pts);
const LOOP_M = FULL_LOOP.reduce((s, l) => s + legLen(l.id), 0);
const ALL_FUTURE = A.lines.filter((l) => l.kind !== 'built').reduce((s, l) => s + polyLen(l.pts), 0);
const BUILT_M = A.lines.filter((l) => l.kind === 'built' && l.id !== 'l1').reduce((s, l) => s + polyLen(l.pts), 0);

function legRows() {
  return A.lines
    .filter((l) => l.kind !== 'built')
    .map((l) => {
      const m = polyLen(l.pts);
      const svc = BUILT.find((b) => b.legs.some((g) => g.id === l.id));
      const st = [stageIn(l.id, 'A'), stageIn(l.id, 'B')].map((v) => (v === null ? 'never' : v)).join(' / ');
      return {
        id: l.id,
        name: l.name,
        from: l.from,
        to: l.to,
        m,
        svc: svc?.name ?? '',
        st,
        t20: ride(m, 20),
        t25: ride(m, 25),
      };
    });
}

// ---------------------------------------------------------------- the page
const AREAS: [string, string, string, string, string, string, string][] = [
  [
    'Home (Threefold Reach)',
    'home',
    'The Needle Bell, the forge chimney, the turntable',
    'Logs, stone, rails',
    'Chop, haul, lay track; the great beam',
    '0.6',
    '0–0.6',
  ],
  [
    'Split-rock Works',
    'splitrock',
    'The split quarry face and kiln stack',
    'Footings',
    'Strike seams with the breaker; carry footings',
    '0.6',
    '0.6–1.2',
  ],
  [
    'Ring Island',
    'ring',
    'The broken ring and its floating shard',
    'Steel (the longer boiler first)',
    'The Meet: glide the gap, brace the leaf, strike the rivet',
    '0.6',
    '1.2–1.8',
  ],
  [
    'First branch: High Gorge or Canopy Town',
    'gorge',
    'The split stack / the mother trees over the Wall',
    'Copper / fibre',
    'Powered pick and hook reel / carry sling and glider cloth',
    '1.2',
    '1.8–3.0',
  ],
  [
    'Bell Rock and the bay shortcut',
    'bell',
    'The granite pinnacle in the shallows',
    'Crystal seeds (by hand)',
    'Hook practice; the shortcut home',
    '0.5',
    '3.0–3.5',
  ],
  [
    'Second branch',
    'canopy',
    'The other of the pair',
    'The other material',
    "The other branch's tool",
    '0.7',
    '3.5–4.2',
  ],
  [
    'The sea cave, Saltpan and High Port',
    'port',
    'The 75 m lit crane on the cliff edge',
    'Town services; the faster engine; seed cradle',
    'Break the cave (powered pick); slide the salt flats; crane lift',
    '0.8',
    '4.2–5.0',
  ],
  [
    'White Wall line (the ring closes)',
    'wall',
    'Six 120 m chalk islets read as one wall',
    'Crystal collars carry the last span',
    'Collar the deep gap; the first lap',
    '0.8',
    '5.0–5.8',
  ],
  [
    'Lantern Notch, the causeway, the Original Island',
    'notch',
    'The sea arch; the causeway lamps; the classic island',
    'The ending',
    'Glide from the Canopy ledge; light the lantern; ride to The Boogler',
    '0.3',
    '5.8–6.1',
  ],
];
const SIGHTS: [string, string, string, string][] = [
  [
    'Home hilltop / telescope',
    'Ring Island shard and the raised leaf',
    'ring',
    'minute one; the leaf from the Split-rock finale',
  ],
  ['Home, south-west skyline', 'High Port crane, lit', 'port', 'minute one; reached at 4.2 h'],
  ['West landing', 'The sea cave in the sandstone face, 65 m', 'cave', 'minute one; opened at 4.2 h'],
  ['Home across the bay', "The Original Island (The Boogler's)", 'original', 'minute one; reached last'],
  ['Pier head', 'The raised leaf, 280 m; the White Wall beyond', 'ring', 'from 1.0 h'],
  ['Ring top (aperture)', 'The Gorge split, end-on', 'gorge', 'from 1.8 h'],
  ['Ring top', "Canopy's mother trees over the Wall", 'canopy', 'from 1.8 h'],
  ['Bay line train', 'The sunken causeway pointing at the Original Island', 'original', 'from 3.0 h'],
  ['Canopy Town west shore', 'The Notch ledge', 'notch', 'first Canopy visit; used at 5.8 h'],
  ['High Port, the Notch', 'The mainland city (never reached)', 'city', 'from 4.2 h'],
];
const DOUBLE_BACKS: [string, string, string, string][] = [
  [
    'Ring Island upper gallery ("the Closest Pew")',
    "The first branch's ability (hook reel or glider cloth)",
    'about 3.0 h',
    'Line 2 to Ring Island',
  ],
  ["Split-rock's upper seam", 'The powered pick or the carry sling', 'about 3.5 h', 'Bay line home, then line 2'],
  [
    "Home's sea cave (the West landing's sandstone face)",
    'The powered pick (High Gorge)',
    'about 4.2 h',
    'Bay line home; then the cave line opens',
  ],
  [
    "The first branch's hidden section (the falls cave / the Notch ledge)",
    "The second branch's ability",
    'about 4.6 h',
    'Bay line, Bell Rock, stack line',
  ],
  [
    'Ring Island again: the train threads the ring',
    'The closed ring and the express fitting',
    'about 5.8 h',
    'White Wall line round to the stacks',
  ],
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COLOURS: Record<string, string> = {
  ring: '#3f7fd8',
  stack: '#e89b2f',
  bay: '#d8412f',
  'bay-trestle': '#c58f8f',
  cave: '#22b39a',
  wall: '#c9a514',
  notch: '#e85cab',
  causeway: '#9157d6',
};
function svg() {
  const [x0, z0, w, h] = [-3000, -2350, 3700, 3800];
  const P = (p: XZ) => `${p[0].toFixed(0)},${p[1].toFixed(0)}`;
  const out: string[] = [];
  out.push(
    `<svg viewBox="${x0} ${z0} ${w} ${h}" role="img" aria-label="Top-down blockout of the whole Boogle map" xmlns="http://www.w3.org/2000/svg">`,
  );
  out.push(`<rect x="${x0}" y="${z0}" width="${w}" height="${h}" fill="var(--sea)"/>`);
  for (let gx = Math.ceil(x0 / 500) * 500; gx < x0 + w; gx += 500)
    out.push(
      `<line x1="${gx}" y1="${z0}" x2="${gx}" y2="${z0 + h}" stroke="var(--grid)" stroke-width="${gx % 1000 ? 2 : 5}"/>`,
    );
  for (let gz = Math.ceil(z0 / 500) * 500; gz < z0 + h; gz += 500)
    out.push(
      `<line x1="${x0}" y1="${gz}" x2="${x0 + w}" y2="${gz}" stroke="var(--grid)" stroke-width="${gz % 1000 ? 2 : 5}"/>`,
    );
  // the coast-texture box the live sea can bake today (2048 texels at 1 m, round Home's shores)
  out.push(
    `<rect x="${-250 - 120}" y="${-372 - 120}" width="2048" height="2048" fill="none" stroke="var(--gate)" stroke-width="6" stroke-dasharray="40 24"/>`,
    `<text x="${-250 - 100}" y="${1556}" class="note">2,048 m at 1 m a texel: the sea's coast texture today</text>`,
  );
  for (const g of A.land) {
    if (g.horizon) continue;
    const pts = g.id === 'home-land' ? smoothRing(g.poly!, 3) : g.outline;
    const cls = g.id === 'home-land' ? 'existing' : g.module === 'chalk' ? 'chalk' : 'land';
    out.push(
      `<polygon class="${cls}" points="${pts.map(P).join(' ')}"><title>${esc(g.biome ?? g.id)}</title></polygon>`,
    );
  }
  // the classic island and Ring Island's cones (live geometry)
  out.push(
    `<circle class="existing" cx="-1000" cy="0" r="110"><title>The Original Island (classic island, live)</title></circle>`,
  );
  for (const [dx, dz, r] of RING_CONES)
    out.push(
      `<circle class="existing ring" cx="${FAR.x + dx}" cy="${FAR.z + dz}" r="${r * 0.62}"><title>Ring Island cone (live)</title></circle>`,
    );
  // built rails (Place's real line 1 and line 2)
  for (const line of [LINES.north, LINES.east]) {
    const pts: string[] = [];
    for (let i = 0; i < line.xs.length; i += 5) pts.push(`${line.xs[i]!.toFixed(0)},${line.zs[i]!.toFixed(0)}`);
    out.push(`<polyline class="built" points="${pts.join(' ')}"/>`);
  }
  for (const l of BUILT) {
    const c = COLOURS[l.id] ?? '#888';
    const dash = l.id === 'bay-trestle' ? ' stroke-dasharray="40 30"' : '';
    out.push(
      `<polyline class="line" stroke="${c}"${dash} points="${l.pts.map((p) => `${(p[0] / 100 - 1000).toFixed(0)},${(p[1] / 100).toFixed(0)}`).join(' ')}"><title>${esc(l.name)}: ${km(l.lengthCm / 100)} km</title></polyline>`,
    );
  }
  // sightlines (telegraphing), from the map's own sights
  for (const s of A.sights) {
    const a = A.places.find((p) => p.id === s.from)!.at,
      b = A.places.find((p) => p.id === s.to)!.at;
    out.push(
      `<line class="sight" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><title>${esc(s.note)}</title></line>`,
    );
  }
  for (const g of A.gates)
    out.push(
      `<rect class="gate" x="${g.at[0] - 28}" y="${g.at[1] - 28}" width="56" height="56" transform="rotate(45 ${g.at[0]} ${g.at[1]})"><title>${esc(g.name)}: ${esc(g.needs ?? '')}</title></rect>`,
    );
  for (const l of BUILT)
    for (const h of l.halts)
      out.push(
        `<circle class="halt" cx="${(h.x / 100 - 1000).toFixed(0)}" cy="${(h.z / 100).toFixed(0)}" r="26"><title>${esc(h.name)} (${esc(l.name)})</title></circle>`,
      );
  // turnbacks: a loop is its circle, a crossover a small X
  for (const l of BUILT)
    for (const e of l.ends) {
      const x = e.x / 100 - 1000,
        z = e.z / 100;
      out.push(
        e.kind === 'loop'
          ? `<circle class="loop" cx="${x.toFixed(0)}" cy="${z.toFixed(0)}" r="${FORMATION.loopCm / 100}"><title>${esc(l.name)}: turning loop</title></circle>`
          : `<path class="cross" d="M${(x - 22).toFixed(0)},${(z - 22).toFixed(0)}L${(x + 22).toFixed(0)},${(z + 22).toFixed(0)}M${(x - 22).toFixed(0)},${(z + 22).toFixed(0)}L${(x + 22).toFixed(0)},${(z - 22).toFixed(0)}"><title>${esc(l.name)}: crossover</title></path>`,
      );
    }
  for (const p of A.places) {
    if (p.id === 'camp') continue;
    const big = p.kind === 'main' || p.kind === 'branch' || p.kind === 'ending' || p.id === 'home';
    out.push(`<text class="${big ? 'place' : 'stop'}" x="${p.at[0] + 45}" y="${p.at[1] - 40}">${esc(p.name)}</text>`);
  }
  out.push(`<text class="place" x="-2950" y="2100">Mainland (backdrop) →</text>`);
  out.push(
    `<g class="scale"><line x1="-2850" y1="-2250" x2="-1850" y2="-2250"/><text x="-2850" y="-2275">1 km</text></g>`,
  );
  out.push('</svg>');
  return out.join('\n');
}

function page() {
  const legs = legRows();
  const legTable = legs
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.from)} → ${esc(r.to)}</td><td>${esc(r.svc)}</td><td>${r.st}</td><td>${km(r.m)}</td><td>${mmss(r.t20)}</td><td>${mmss(r.t25)}</td></tr>`,
    )
    .join('\n');
  const lineTable = BUILT.map(
    (l) =>
      `<tr><td><span class="key" style="background:${COLOURS[l.id]}"></span>${esc(l.name)}</td><td>${l.halts.map((h) => esc(h.name)).join(' · ')}</td><td>${km(l.lengthCm / 100)}</td><td>${mmss(ride(l.lengthCm / 100, 20, l.halts.length - 1))}</td><td>${mmss(ride(l.lengthCm / 100, 25, l.halts.length - 1))}</td></tr>`,
  ).join('\n');
  const areaTable = AREAS.map(
    (a) =>
      `<tr><td>${esc(a[0])}</td><td>${esc(a[2])}</td><td>${esc(a[3])}</td><td>${esc(a[4])}</td><td>${a[5]} h</td><td>${a[6]}</td></tr>`,
  ).join('\n');
  const sightTable = SIGHTS.map((s) => `<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td><td>${esc(s[3])}</td></tr>`).join(
    '\n',
  );
  const turnTable = BUILT.map(
    (l) =>
      `<tr><td>${esc(l.name)}</td><td>${l.ends.map((e) => `${e.at === 'start' ? esc(l.halts[0]!.name) : esc(l.halts.at(-1)!.name)}: ${e.kind === 'loop' ? 'turning loop' : 'crossover'}`).join('; ')}</td></tr>`,
  ).join('\n');
  const liveName = ['Line 1', 'Line 2'];
  const secondTable = LIVE_SECOND.flatMap((t) =>
    t.clashes.map(
      (c) =>
        `<tr><td>${liveName[t.line]}, ${t.side < 0 ? 'left' : 'right'} side</td><td>${(c.fromCm / 100).toFixed(0)}–${(c.toCm / 100).toFixed(0)} m</td><td>${esc(c.reason)}</td><td>${c.otherFree ? 'yes' : 'no'}</td></tr>`,
    ),
  ).join('\n');
  const dbTable = DOUBLE_BACKS.map(
    (d) => `<tr><td>${esc(d[0])}</td><td>${esc(d[1])}</td><td>${d[2]}</td><td>${esc(d[3])}</td></tr>`,
  ).join('\n');
  const stills = fs.existsSync(ROOT + STILLS)
    ? fs
        .readdirSync(ROOT + STILLS)
        .filter((f) => /\.(png|jpe?g)$/.test(f))
        .sort()
        .map(
          (f) =>
            `<figure><img src="world-blockout/${f}" alt="${esc(f.replace(/\.\w+$/, '').replace(/-/g, ' '))}" loading="lazy"/><figcaption>${esc(
              f
                .replace(/^\d+-/, '')
                .replace(/\.\w+$/, '')
                .replace(/-/g, ' '),
            )}</figcaption></figure>`,
        )
        .join('\n')
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>World Blockout</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<!-- GENERATED by dev/level/world-blockout.ts from docs/world/map-prototypes.html: rerun it, don't edit by hand. -->
<style>
  :root { color-scheme: light; --bg: #f4f2e9; --panel: #fffdf5; --ink: #233d3c; --muted: #536a68; --border: #bfcac0;
    --sea: #dcebe9; --grid: #c7dcda; --land: #d4ddbf; --chalk: #ece9df; --existing: #214f4a; --rail: #b75436;
    --gate: #a65126; --sight: #3f7fd8; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { color-scheme: dark; --bg: #142524;
    --panel: #1c302e; --ink: #eff2df; --muted: #b4c6bc; --border: #49625a; --sea: #193b3e; --grid: #244b4e;
    --land: #435b43; --chalk: #8d8b80; --existing: #d9e9cd; --rail: #f3a07c; --gate: #f9b076; --sight: #8fb8ff; } }
  :root[data-theme='dark'] { color-scheme: dark; --bg: #142524; --panel: #1c302e; --ink: #eff2df; --muted: #b4c6bc;
    --border: #49625a; --sea: #193b3e; --grid: #244b4e; --land: #435b43; --chalk: #8d8b80; --existing: #d9e9cd;
    --rail: #f3a07c; --gate: #f9b076; --sight: #8fb8ff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 system-ui, sans-serif; padding: 24px 16px 32px; }
  main { max-width: 1300px; margin: auto; min-width: 0; }
  h1 { font: 700 28px/1.2 Georgia, serif; margin: 0 0 6px; }
  h2 { font: 700 19px/1.3 Georgia, serif; margin: 28px 0 8px; }
  p, li { max-width: 80ch; }
  .muted { color: var(--muted); }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0; }
  .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px; }
  .stat b { display: block; font-size: 22px; }
  .map { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 8px; }
  svg { width: 100%; height: auto; display: block; }
  svg .land { fill: var(--land); stroke: var(--muted); stroke-width: 4; }
  svg .chalk { fill: var(--chalk); stroke: var(--muted); stroke-width: 4; }
  svg .existing { fill: var(--land); stroke: var(--existing); stroke-width: 9; }
  svg .ring { fill-opacity: 0.6; }
  svg .built { fill: none; stroke: var(--existing); stroke-width: 14; stroke-linecap: round; }
  svg .line { fill: none; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; }
  svg .sight { stroke: var(--sight); stroke-width: 5; stroke-dasharray: 12 22; opacity: 0.8; }
  svg .gate { fill: var(--gate); }
  svg .halt { fill: var(--panel); stroke: var(--ink); stroke-width: 8; }
  svg .loop { fill: none; stroke: var(--ink); stroke-width: 7; }
  svg .cross { fill: none; stroke: var(--ink); stroke-width: 9; }
  svg text { fill: var(--ink); font: 600 64px system-ui, sans-serif; paint-order: stroke; stroke: var(--panel); stroke-width: 12px; }
  svg text.stop { font-size: 48px; font-weight: 500; }
  svg text.note { font-size: 42px; fill: var(--gate); }
  svg .scale line { stroke: var(--ink); stroke-width: 10; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 4px; font-size: 13px; }
  .key { display: inline-block; width: 22px; height: 6px; border-radius: 3px; vertical-align: middle; margin-right: 6px; }
  .table { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; background: var(--panel); font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { font-weight: 650; }
  td:nth-last-child(-n+3) { white-space: nowrap; }
  .stills { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 12px; }
  figure { margin: 0; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  figure img { width: 100%; display: block; }
  figcaption { padding: 6px 10px; font-size: 13px; color: var(--muted); }
</style>
</head>
<body>
<main>
<h1>World blockout</h1>
<p class="muted">The whole map, rough, so the connections work before each area is built in depth (owner, 10 November).
Sickle Isles geography from <a href="map-prototypes.html">map-prototypes.html</a>, today's Home, Far Head and pier,
the crossing toward Ring Island, and every future line as a train service. Place-local metres, north up, 500 m grid.
The plan: <a href="../plans/world-blockout.md">docs/plans/world-blockout.md</a>.</p>
<div class="stats">
  <div class="stat"><b>9</b>areas, Home to the ending</div>
  <div class="stat"><b>${BUILT.length}</b>future lines, ${BUILT.reduce((n, l) => n + l.halts.length, 0)} halt stops</div>
  <div class="stat"><b>${km(ALL_FUTURE)} km</b>future track (+${km(BUILT_M)} km line 2 built)</div>
  <div class="stat"><b>${km(LOOP_M)} km</b>the full loop, ${mmss(LOOP_M / 20)} at 20 m/s</div>
  <div class="stat"><b>6.1 h</b>to the ending, solo (model)</div>
</div>
<div class="map">
${svg()}
<div class="legend">
  ${BUILT.map((l) => `<span><span class="key" style="background:${COLOURS[l.id]}"></span>${esc(l.name)}</span>`).join('\n  ')}
  <span><span class="key" style="background:var(--existing)"></span>Built today (line 1, line 2)</span>
  <span><span class="key" style="background:var(--sight)"></span>Seen before reached</span>
  <span><span class="key" style="background:var(--gate)"></span>Gate</span>
</div>
</div>

<h2>Areas</h2>
<div class="table"><table><thead><tr><th>Area</th><th>Landmark</th><th>Produces</th><th>New verb</th><th>Hours</th><th>Solo clock</th></tr></thead>
<tbody>${areaTable}</tbody></table></div>

<h2>Lines</h2>
<p class="muted">Ride time = cruise, plus starting and stopping (3.5 m/s² at 20 m/s, 4.5 at 25) and the dwell (5 s, 4 s) at every stop; boarding not included.</p>
<div class="table"><table><thead><tr><th>Line</th><th>Halts</th><th>km</th><th>End to end, 20 m/s</th><th>25 m/s</th></tr></thead>
<tbody>${lineTable}</tbody></table></div>

<h2>Legs</h2>
<div class="table"><table><thead><tr><th>Leg</th><th>From → to</th><th>Line</th><th>Stage (Gorge first / Canopy first)</th><th>km</th><th>20 m/s</th><th>25 m/s</th></tr></thead>
<tbody>${legTable}</tbody></table></div>

<h2>Double track</h2>
<p class="muted">Every corridor is two tracks on ${FORMATION.centresCm / 100} m centres (the gauge is Place's 1 m, on a 3.6 m deck: a
${FORMATION.deckCm / 100} m formation), bridges, cuttings, tunnels and the pier crossing included. Every halt has a platform outside
each track. Each terminus turns a train back without reversing: a crossover (✕) inside the platforms, or a
${FORMATION.loopCm / 100} m-radius turning loop (○) where the island has room.</p>
<div class="table"><table><thead><tr><th>Line</th><th>Turnbacks</th></tr></thead><tbody>${turnTable}</tbody></table></div>
<p class="muted">Today's single-track line 1 and line 2 stay where they are. A second track 4 m off them meets these:</p>
<div class="table"><table><thead><tr><th>Where</th><th>Along the line</th><th>Meets</th><th>Other side free</th></tr></thead><tbody>${secondTable}</tbody></table></div>

<h2>Seen before it's reached</h2>
<div class="table"><table><thead><tr><th>From</th><th>What</th><th>When</th></tr></thead><tbody>${sightTable}</tbody></table></div>

<h2>Doubling back</h2>
<div class="table"><table><thead><tr><th>Where</th><th>With</th><th>When (solo)</th><th>The ride back</th></tr></thead><tbody>${dbTable}</tbody></table></div>

<h2>The 3D greybox</h2>
<p class="muted">Dev: <code>?greybox=sickle</code> (rides along every line, the full loop). Live client: <code>?blockout=world</code> (walkable massing, visual track).</p>
<div class="stills">
${stills}
</div>
</main>
</body>
</html>
`;
}

// Written as Prettier leaves them, so the format hook never makes a generated file look stale.
const pretty = async (file: string, text: string) =>
  prettier.format(text, { ...(await prettier.resolveConfig(ROOT + file)), filepath: ROOT + file });
const outputs: [string, string][] = [
  [CATALOG, await pretty(CATALOG, catalog())],
  [PAGE, await pretty(PAGE, page())],
];
const check = process.argv.includes('--check');
let stale = false;
for (const [file, text] of outputs) {
  const now = fs.existsSync(ROOT + file) ? fs.readFileSync(ROOT + file, 'utf8') : '';
  if (now === text) continue;
  stale = true;
  if (check) console.log(`stale: ${file} (node dev/level/world-blockout.ts)`);
  else fs.writeFileSync(ROOT + file, text);
}
if (process.argv.includes('--numbers')) {
  for (const t of LIVE_SECOND)
    console.log('second track', t.line, t.side, JSON.stringify(t.clashes), 'other side:', JSON.stringify(t.other));
  console.log('loop km', km(LOOP_M), 'future km', km(ALL_FUTURE), 'built l2 km', km(BUILT_M));
  for (const r of legRows())
    console.log([r.id, r.name, r.from, r.to, r.svc, r.st, km(r.m), mmss(r.t20), mmss(r.t25)].join(' | '));
  for (const l of BUILT)
    console.log(
      l.id,
      km(l.lengthCm / 100),
      mmss(ride(l.lengthCm / 100, 20, l.halts.length - 1)),
      mmss(ride(l.lengthCm / 100, 25, l.halts.length - 1)),
      l.halts.map((h) => `${h.name}@${(h.y / 100).toFixed(1)}m`).join(', '),
      'stops',
      l.stops.join(','),
    );
}
if (check && stale) process.exit(1);
