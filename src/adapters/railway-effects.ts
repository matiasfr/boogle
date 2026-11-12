// What the railway's actions did, as the session hands them to the views (docs/plans/ecs-m12-m13.md, M12f): an
// accepted action (yours predicted, or anyone's from the server) and a correction of one, plus the wire reads that
// build them. The session's settle and submit play them; nothing here does.
import { railInt, RAILWAY_MAX_INT } from '../sim/railway.ts';
import { RAIL_TRAINS } from '../sim/railway-lines.ts';
import { line2Trains as line2TrainsIn } from '../sim/railway-queries-line2.ts';
import { trainStops } from '../sim/railway-queries-trains.ts';
import {
  aperture,
  line as lineRow,
  rail as railRow,
  shed as shedRow,
  train as trainRow,
  works as worksRow,
} from '../sim/railway-rows.ts';
import { LINE_HALTS, reqHas } from '../sim/railway-train.ts';
import type { World } from '../ecs/index.ts';
import { CARRY_MAX, type RailwayIntent } from './railway-intents.ts';

export type RailwayAccepted = Readonly<
  RailwayIntent & {
    pid: string;
    /** Set on your own predicted actions; the server's events leave it out. */
    epoch?: number;
    request: number;
    accepted: number;
    status: 'accepted';
    /** The rule tick it was shown at (yours) or the packet's (everyone else's). */
    tick: number;
    /** Right after this action: the actor's balance of the moved kind, the target's count, and the pile involved
     * (with its position, for a take whose pile may be gone by the packet's end). */
    carried?: number;
    level?: number;
    pile?: number;
    px?: number;
    py?: number;
    pz?: number;
    /** Your own action, shown at once from the prediction (the server's confirmation of it plays nothing). */
    predicted?: boolean;
    /** Of `accepted`, the pieces a correction in the same packet already flies to this actor from someone's back. */
    returned?: number;
  }
>;
/** A predicted action that turned out to give less than it showed. `event` is what was shown. */
export type RailwayCorrection = Readonly<{
  event: RailwayAccepted;
  /** What the action really moved (or, still pending, now moves on the newer mirror). */
  kept: number;
  /** Pieces to return: shown minus kept. */
  lost: number;
  reason: 'refused' | 'noop' | 'contested' | 'session';
  /** Who got them instead, when their accepted action arrived in the same packet. */
  winner?: string;
}>;

/** What an event's own action left behind (src/world/railway-predict.ts RailEffect): several events can share one
 * packet, so effects read these rather than the packet's final state. */
export const effectOf = (v: Record<string, unknown>) => {
  const out: { carried?: number; level?: number; pile?: number; px?: number; py?: number; pz?: number } = {};
  if (railInt(v.carried, CARRY_MAX)) out.carried = v.carried;
  if (railInt(v.level, RAILWAY_MAX_INT)) out.level = v.level;
  if (railInt(v.pile, RAILWAY_MAX_INT, 1)) out.pile = v.pile;
  for (const k of ['px', 'py', 'pz'] as const) if (railInt(v[k], 200000, -200000)) out[k] = v[k];
  return out;
};
export const accepted = (v: Record<string, unknown>) =>
  typeof v.pid === 'string' && railInt(v.request, RAILWAY_MAX_INT, 1) && railInt(v.accepted, CARRY_MAX, 1);
/** Two actions competed for the same pieces: the same tree, rock, pile or rack. */
export function sameTarget(a: RailwayAccepted, b: RailwayAccepted) {
  if (a.op !== b.op) return false;
  if (a.op === 'rail.chop' || a.op === 'rail.mine') return a.id === (b as typeof a).id;
  if (a.op === 'rail.take') return a.pile === b.pile || a.id === (b as typeof a).id;
  if (a.op === 'rail.rackTake') return (a.kind ?? 0) === ((b as typeof a).kind ?? 0);
  if (a.op === 'rail.footTake') return a.rack === (b as typeof a).rack;
  return a.op === 'rail.forgeTake' || a.op === 'rail.depotTake' || a.op === 'rail.depotRailTake';
}
/** Ops whose whole result is one shared flag: when it holds anyway (someone else woke the machine), losing the race
 * gives nothing back. Read on the confirmed world's rows. */
export const holds = (w: World, op: string, event?: RailwayIntent) =>
  op === 'rail.boilerFit'
    ? line2TrainsIn(w)
    : op === 'rail.call' && event?.op === 'rail.call'
      ? (() => {
          // A lever ask is the line's (`Line.req`), a rider's its own train's.
          const h = LINE_HALTS[event.id];
          const req = !h
            ? undefined
            : event.train === undefined
              ? lineRow(w, h.line)?.req
              : event.train >= 0 && event.train < RAIL_TRAINS.length
                ? trainRow(w, event.train)?.req
                : undefined;
          return req !== undefined && reqHas(req, h!.stop, event.dir, trainStops(w, h!.line).length);
        })()
      : op === 'rail.wake'
        ? railRow(w).awake >= 0
        : op === 'rail.lever'
          ? railRow(w).lever
          : op === 'rail.seaSwitch'
            ? railRow(w).sea
            : op === 'rail.pack'
              ? railRow(w).pack
              : op === 'rail.glide'
                ? railRow(w).glide
                : op === 'rail.strike' && event?.op === 'rail.strike'
                  ? event.id === 2
                    ? aperture(w).joined >= 0
                    : !!(worksRow(w).seams & (event.id ? 2 : 1))
                  : op === 'rail.brace'
                    ? aperture(w).brace !== 1
                    : op === 'rail.turn' && event?.op === 'rail.turn'
                      ? shedRow(w).table === event.to
                      : false;
