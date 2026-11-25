// The route past the built graph, as STAND-INS (docs/plans/campaign-outline.md, section 5, step 1): area 9 of
// the campaign outline, each a bill, its legs and a gate, and nothing else. No mechanic is invented and none of this is
// played through the rules: `npm run loop -- run` plays the built graph (dev/loop/graph.ts NODES, which hold areas 4
// and 5 since greybox leg 2's step 5 and area 6 since leg 3's step 7) and MODELS these on top of it, at the rate the
// built route itself played. Every
// stand-in carries `standIn: true`; a built node never does.
//   bill   the main-route bill the economy model charges the area's steps (dev/economy/ring-sim.ts): the bill its
//          allowance was sized on, not a designed bill
//   legs   the real lengths of the track the area builds, from the generated line catalog (src/sim/railway-world-lines.ts)
//   gate   what the area grants (`grants`) and which later area needs it (`requires[].needs`), a built node's too
// The owner has not ruled on the outline's later areas, so the one switch (`Variant`) is a factor on every bill. Both
// branches, High Gorge and Canopy Town, are built: neither can be cut or reordered here.
import { WORLD_LINES } from '../../src/sim/railway-world-lines.ts';
import { ROUTE as MODEL_ROUTE, type Material as ModelMaterial } from '../economy/ring-data.ts';
import { defaultSettings, rideS, simulate } from '../economy/ring-sim.ts';
import { NODES, type NodeId } from './graph.ts';

export type StandInId = 'ending';
export type StandInMaterial = 'logs' | 'stone' | 'rails' | 'footings' | 'steel' | 'copper' | 'fibre' | 'crystal';
export type Leg = { id: string; line: string; km: number };
/** Every stand-in edge is the outline's default, not a ruling. `needs`: the grant of `on` that opens this area. */
export type StandInEdge = { on: NodeId | StandInId; needs?: string; source: string };
export type StandIn = {
  id: StandInId;
  /** The flag tools and the test read: modelled, not built, not played. */
  standIn: true;
  /** The outline's area number (section 3). */
  area: number;
  label: string;
  /** The economy model's solo allowance for the area, minutes (docs/plans/world-blockout.md, Areas). */
  allowanceMin: number;
  /** The model's route steps whose bills this area stands in for. */
  modelSteps: string[];
  bill: Partial<Record<StandInMaterial, number>>;
  legs: Leg[];
  grants: string[];
  requires: StandInEdge[];
};
export type Variant = {
  /** A factor on every stand-in bill (1.5: the sensitivity row). */
  bills: number;
};
/** The outline's default: the bills as the model sized them. */
export const DEFAULT_VARIANT: Variant = { bills: 1 };

const MATERIAL_OF: Record<ModelMaterial, StandInMaterial> = {
  W: 'logs',
  St: 'stone',
  R: 'rails',
  C: 'footings',
  S: 'steel',
  Fi: 'fibre',
  U: 'copper',
  X: 'crystal',
};
const OUTLINE = 'docs/plans/campaign-outline.md section 3';
/** The route's slots past the built graph, in the outline's order: `stage` is world-lines.ts's build stage (High Gorge
 * first), `steps` the model's. */
const SLOTS = [{ id: 'ending', area: 9, stage: 8, allowanceMin: 18, steps: ['final'] }] as const;
const PLACE: Record<StandInId, { label: string; grants: string[] }> = {
  ending: { label: 'Lantern Notch, the causeway, the Original Island', grants: ['the ending'] },
};
/** The grants of built nodes a stand-in's gate names (dev/loop/graph.ts; src/sim/railway-route.ts RAIL_GRANTS). */
const BUILT_GRANTS: Partial<Record<NodeId, string>> = {
  pick: 'powered pick',
  seeds: 'crystal seeds',
  cloth: 'glider cloth',
};
/** The glide to the Notch in the outline. */
const GATES: Partial<Record<StandInId, StandInEdge[]>> = {
  ending: [{ on: 'cloth', needs: 'glider cloth', source: `${OUTLINE}: the glide from Canopy's ledge to the Notch` }],
};

/** The stand-in route for a variant, in play order. */
export function standInRoute(v: Variant = DEFAULT_VARIANT): { nodes: StandIn[] } {
  const model = simulate({ branchFirst: 'gorge' }, [1]);
  const nodes: StandIn[] = [];
  let last: NodeId | StandInId = NODES[NODES.length - 1]!.id;
  for (const s of SLOTS) {
    const id: StandInId = s.id;
    const bill: StandIn['bill'] = {};
    for (const key of s.steps)
      for (const f of model.steps.find((st) => st.key === key)!.flows)
        if (f.demand > 0) {
          const m = MATERIAL_OF[f.material];
          bill[m] = (bill[m] ?? 0) + Math.ceil(f.demand * v.bills);
        }
    const legs = WORLD_LINES.flatMap((line) =>
      line.legs
        .filter((leg) => leg.stage[0] === s.stage)
        .map((leg) => ({ id: leg.id, line: line.name, km: (leg.toCm - leg.fromCm) / 1e5 })),
    );
    const requires: StandInEdge[] = [
      { on: last, source: `${OUTLINE}: the route's order (default, unruled)` },
      ...(GATES[id] ?? []),
    ];
    nodes.push({
      id,
      standIn: true,
      area: s.area,
      label: PLACE[id].label,
      allowanceMin: s.allowanceMin,
      modelSteps: [...s.steps],
      bill,
      legs,
      grants: PLACE[id].grants,
      requires,
    });
    last = id;
  }
  for (const [i, n] of nodes.entries()) {
    if (!n.legs.length) throw new Error(`stand-ins: ${n.id} builds no leg`);
    for (const e of n.requires) {
      const at = nodes.findIndex((x) => x.id === e.on);
      if (at < 0 ? !NODES.some((x) => x.id === e.on) : at >= i)
        throw new Error(`stand-ins: ${n.id} needs ${e.on}, which is not before it`);
      const grants = at < 0 ? [BUILT_GRANTS[e.on as NodeId]] : nodes[at]!.grants;
      if (e.needs && !grants.includes(e.needs)) throw new Error(`stand-ins: ${e.on} does not grant "${e.needs}"`);
    }
  }
  return { nodes };
}

export const isStandIn = (n: { standIn?: boolean }): n is StandIn => n.standIn === true;
export const unitsOf = (s: StandIn) => Object.values(s.bill).reduce((a, b) => a + b, 0);
export const legKm = (s: StandIn) => s.legs.reduce((a, l) => a + l.km, 0);

// ---------------------------------------------------------------- the model: built rates applied to stand-in bills
/** Seconds per bill unit, measured on a played run of the built graph: a footing (one per back, cast by the kiln and
 * brought by the wagon) and every other unit (everything else the built route asks, spread over its other units). */
export type BuiltRate = { footingS: number; otherS: number };
type Played = { ticks: number; nodes: readonly { id: NodeId; tick: number; startTick: number }[] };
export function builtRate(run: Played): BuiltRate {
  let footings = 0,
    others = 0,
    footingTicks = 0;
  for (const n of NODES) {
    const t = run.nodes.find((x) => x.id === n.id)!;
    if (n.bill.footings) {
      footings += n.bill.footings;
      footingTicks += t.tick - t.startTick;
    }
    for (const [m, units] of Object.entries(n.bill)) if (m !== 'footings' && m in n.supply) others += units;
  }
  return { footingS: footingTicks / 10 / footings, otherS: (run.ticks - footingTicks) / 10 / others };
}
/** Trains at the first service step, with the economy model's start, stop, dwell and boarding (ring-sim.ts rideS). */
const RIDE_MPS = 20;
/** Modelled seconds for a stand-in: its bill at the built rates, and one ride out and back over its new legs for each
 * of its model steps (the model's `rides`). `packFootings`: the floor, with footings carried like any other unit. */
export function standInSeconds(s: StandIn, rate: BuiltRate, packFootings = false) {
  const footings = s.bill.footings ?? 0;
  const haul = footings * (packFootings ? rate.otherS : rate.footingS) + (unitsOf(s) - footings) * rate.otherS;
  const rides = s.modelSteps.reduce((n, key) => n + 2 * MODEL_ROUTE.find((r) => r.key === key)!.rides, 0);
  return { haul, ride: rides * rideS(defaultSettings(), legKm(s), RIDE_MPS) };
}

// ---------------------------------------------------------------- the whole route
/** The built areas, by the node that ends each in the canonical order. Ring Island's area ends with build 2's install,
 * so the steel loop counts in it; High Gorge's ends with the pick, Bell Rock's with the bay cut laid, Canopy Town's with
 * the cloth taken. The allowances of areas 4 to 6 are the economy model's, as their stand-ins had them. */
const BUILT_AREAS: readonly { area: number; label: string; ends: NodeId; allowanceMin: number }[] = [
  { area: 1, label: 'Home', ends: 'pier', allowanceMin: 36 },
  { area: 2, label: 'Split-rock Works', ends: 'crossing', allowanceMin: 36 },
  { area: 3, label: 'Ring Island, builds 1 and 2', ends: 'install', allowanceMin: 36 },
  { area: 4, label: 'High Gorge', ends: 'pick', allowanceMin: 72 },
  { area: 5, label: 'Bell Rock and the bay shortcut', ends: 'bay-2', allowanceMin: 30 },
  { area: 6, label: 'Canopy Town', ends: 'cloth', allowanceMin: 42 },
  { area: 7, label: 'Sea cave, Saltpan, Port Quay', ends: 'cave-3', allowanceMin: 48 },
  { area: 8, label: 'The White Wall line', ends: 'wall-6', allowanceMin: 48 },
];
export type RouteRow = { area: number; label: string; standIn: boolean; allowanceMin: number; seconds: number[] };
/** Seconds per area for each played run (one per player count): built areas as played, stand-ins modelled. */
export function wholeRoute(runs: readonly Played[], v: Variant = DEFAULT_VARIANT, packFootings = false) {
  const { nodes } = standInRoute(v);
  const reached = (run: Played, id: NodeId) => run.nodes.find((x) => x.id === id)!.tick / 10;
  const rows: RouteRow[] = BUILT_AREAS.map((a, k) => ({
    area: a.area,
    label: a.label,
    standIn: false,
    allowanceMin: a.allowanceMin,
    seconds: runs.map((run) => reached(run, a.ends) - (k ? reached(run, BUILT_AREAS[k - 1]!.ends) : 0)),
  }));
  const rates = runs.map(builtRate);
  for (const s of nodes)
    rows.push({
      area: s.area,
      label: s.label,
      standIn: true,
      allowanceMin: s.allowanceMin,
      seconds: rates.map((rate) => {
        const t = standInSeconds(s, rate, packFootings);
        return t.haul + t.ride;
      }),
    });
  const total = runs.map((_r, k) => rows.reduce((a, row) => a + row.seconds[k]!, 0));
  return { rows, total, rates, nodes };
}

const TARGET_MIN = Number(defaultSettings().targetHours) * 60;
const hm = (seconds: number) => {
  const m = Math.round(seconds / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
const min = (seconds: number) => String(Math.round(seconds / 60));
const variantName = (v: Variant) => `bills x${v.bills}`;
export function variantOf(args: readonly string[]): Variant {
  const value = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const bills = Number(value('--bills') ?? DEFAULT_VARIANT.bills);
  // Both branches are built and played (greybox leg 2's step 5, leg 3's step 7): neither flag has a stand-in to move.
  if (args.includes('--branch-first')) throw new Error('--branch-first: High Gorge is built, so it comes first');
  if (args.includes('--one-branch')) throw new Error('--one-branch: Canopy Town is built, so it cannot be cut');
  if (!(bills > 0)) throw new Error('--bills: a factor above 0');
  return { bills };
}

/** The section `npm run loop -- run` prints after the built tables. `calibrated`: the same runs with human detours. */
export function wholeRouteLines(
  players: readonly number[],
  runs: readonly Played[],
  calibrated: readonly Played[],
  v: Variant,
) {
  const base = wholeRoute(runs, v);
  const cols = (seconds: readonly number[], f = min) => seconds.map((x) => f(x).padStart(7)).join('');
  const out = [
    '',
    `Whole route to the ending: areas 1-8 PLAYED above, area 9 modelled as a STAND-IN (dev/loop/standins.ts).`,
    `Variant: ${variantName(v)}. A stand-in is its bill at the built route's own rate plus rides over its real legs:`,
    `no puzzles, discovery, confusion or ending. Minutes; the target is ${TARGET_MIN}.`,
    `  #  area                                              kind      units  legs km ${players.map((n) => `${n}p`.padStart(7)).join('')}  allowance`,
  ];
  for (const row of base.rows) {
    const s = base.nodes.find((n) => n.area === row.area);
    out.push(
      `  ${row.area}  ${row.label.padEnd(49)} ${(row.standIn ? 'stand-in' : 'played').padEnd(9)} ${(s ? String(unitsOf(s)) : '-').padStart(5)} ${(s ? legKm(s).toFixed(2) : '-').padStart(8)} ${cols(row.seconds)} ${String(row.allowanceMin).padStart(10)}`,
    );
  }
  const allowance = base.rows.reduce((a, r) => a + r.allowanceMin, 0);
  out.push(
    `     ${'total, minutes'.padEnd(75)} ${cols(base.total)} ${String(allowance).padStart(10)}`,
    `     ${'total, h:mm'.padEnd(75)} ${cols(base.total, hm)}`,
    `     ${`share of the ${TARGET_MIN}-minute target`.padEnd(75)} ${cols(
      base.total.map((t) => (t / 60 / TARGET_MIN) * 100),
      (x) => `${Math.round(x)}%`,
    )}`,
    `  Built rates, seconds per bill unit (${players.map((n) => `${n}p`).join(' / ')}): a footing ${base.rates.map((r) => r.footingS.toFixed(1)).join(' / ')}; any other unit ${base.rates.map((r) => r.otherS.toFixed(2)).join(' / ')}.`,
  );
  const row = (name: string, w: ReturnType<typeof wholeRoute>) => out.push(`  ${name.padEnd(78)} ${cols(w.total, hm)}`);
  out.push('', `Sensitivity, whole route h:mm (${players.map((n) => `${n}p`).join(', ')}):`);
  row(`as above (${variantName(v)})`, base);
  if (calibrated.length === runs.length)
    row('walking at human detours (dev/loop/detour.json), stand-ins at that rate', wholeRoute(calibrated, v));
  const alt = { bills: v.bills * 1.5 };
  row(variantName(alt), wholeRoute(runs, alt));
  row('floor: footings carried like any other unit (the economy model reads them so)', wholeRoute(runs, v, true));
  return { lines: out, data: base };
}

/** `npm run loop` and `-- node <id>`: the stand-ins as data. */
export function standInLines(v: Variant = DEFAULT_VARIANT, only?: string) {
  const { nodes } = standInRoute(v);
  const out: string[] = [];
  for (const s of nodes.filter((n) => !only || n.id === only)) {
    out.push(
      `${s.id} (STAND-IN, area ${s.area}): ${s.label}`,
      `  bill (model steps ${s.modelSteps.join(', ')}): ${Object.entries(s.bill)
        .map(([m, n]) => `${n} ${m}`)
        .join(' + ')} = ${unitsOf(s)} units; allowance ${s.allowanceMin} min`,
      `  legs: ${s.legs.map((l) => `${l.id} ${l.km.toFixed(2)} km (${l.line})`).join(', ')} = ${legKm(s).toFixed(2)} km`,
      `  grants: ${s.grants.join(', ')}`,
      `  requires: ${s.requires.map((e) => `${e.on}${e.needs ? ` (its ${e.needs})` : ''}`).join(', ')}`,
    );
  }
  return out;
}
export const STAND_IN_IDS: readonly string[] = Object.keys(PLACE);
