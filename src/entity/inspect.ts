// What's in the world right now, for agents: an engine with no editor has no inspector panel, so this is that panel, as
// data. `window.boogle.inspect()` in a page, `npm run inspect` from a shell (dev/sim/inspect.ts), and the same call in a
// headless run. Everything it returns survives JSON.stringify unchanged. It allocates when called and costs nothing
// otherwise: no hook, no per-frame work.
//
// Each kind has its phases and orders, its entities, and what prof (src/loop.ts) measured for its `<kind> <phase>` rows
// over the last 240 frames. A run shorter than that reads low, because prof's window averages over all 240. An entity can
// add its state with describe() (src/entity/entity.ts).
import { prof } from '../loop.ts';
import { entityKinds, type GameEntity } from './entity.ts';
import { ENTITY_PHASES, type EntityPhase } from './walker.ts';

/** x, y, z. A coordinate that isn't finite reads null, so a NaN body shows as what it is and stays JSON. */
export type Position = (number | null)[];
export type Cost = { avg: number; p95: number; max: number }; // ms per frame

export type EntityReport = {
  id: string;
  alive: boolean; // false between despawn and the end of the phase, when it leaves this list
  mesh: Position | null; // the mesh's world position; null is no mesh
  bodies: number;
  body: Position | null; // the first body's position
  state?: Record<string, unknown>; // what its describe() returned
};
export type KindReport = {
  kind: string;
  count: number; // alive
  ms: number | null; // avg per frame over its phases; null until one has run
  phases: { phase: EntityPhase; order: number; cost: Cost | null }[];
  entities: EntityReport[];
};
export type InspectReport = { frames: number; frame: Cost | null; kinds: KindReport[] };

const round = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);

// Plain data whatever describe() hands back: numbers rounded, a Vector3 as its x, y and z. A describe that throws, or
// returns something JSON can't hold, must not cost the agent the rest of the report.
function describeEntity(e: GameEntity): Record<string, unknown> {
  try {
    const json = JSON.stringify(e.describe!(), (_, v: unknown) => (typeof v === 'number' ? round(v) : v));
    return JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    return { describeFailed: String(err) };
  }
}

function report(e: GameEntity): EntityReport {
  const body = e.bodies?.[0]?.position;
  let mesh: Position | null = null;
  if (e.mesh) {
    e.mesh.updateWorldMatrix(true, false); // what getWorldPosition does; this file stays free of three.js values
    const m = e.mesh.matrixWorld.elements;
    mesh = [round(m[12]!), round(m[13]!), round(m[14]!)];
  }
  const out: EntityReport = {
    id: e.id,
    alive: e.alive,
    mesh,
    bodies: e.bodies?.length ?? 0,
    body: body ? [round(body.x), round(body.y), round(body.z)] : null,
  };
  if (e.describe) out.state = describeEntity(e);
  return out;
}

export function inspect(): InspectReport {
  const costs = new Map<string, Cost>();
  for (const { name, avg, p95, max } of prof.table(Infinity)) costs.set(name, { avg, p95, max });
  const kinds = entityKinds().map(({ kind, orders, entities }) => {
    const phases = ENTITY_PHASES.filter((phase) => orders[phase] !== undefined).map((phase) => ({
      phase,
      order: orders[phase]!,
      cost: costs.get(`${kind} ${phase}`) ?? null,
    }));
    const timed = phases.filter((p) => p.cost);
    return {
      kind,
      count: entities.filter((e) => e.alive).length,
      ms: timed.length ? round(timed.reduce((sum, p) => sum + p.cost!.avg, 0)) : null,
      phases,
      entities: entities.map(report),
    };
  });
  return { frames: prof.last.frames, frame: costs.get('frame') ?? null, kinds };
}
