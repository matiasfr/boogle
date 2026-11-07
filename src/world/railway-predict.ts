// Replication R1b (docs/plans/replication.md, section 2): what a client predicts of its own railway actions, and the
// effect facts both ends compute for an accepted action. Headless and pure: the server runs railEffect after each
// action it applies; a client runs railPredict on a scratch copy of its mirror with the very same railApply.
//
//   RAIL_PREDICTED                    the ops a client predicts (chop, mine, take, rack take, drop, deposit, forge and
//                                     depot takes, wake, lever); the rest wait for the server as in R1a
//   railPredict(s, pid, e, tick)      apply e to s (a clone) as the server would at tick, keeping thresholds for the
//                                     server: a bill it completes shows full but is funded only when confirmed, a forge it
//                                     fills is lit only when confirmed. A pile it creates gets the temporary id -request
//                                     until the server's id arrives (railTempPile, the replicator's `ids` remap)
//   railEffect(s, pid, e, before)     what an accepted action's effect needs, as it stood right after that action
//   railCadence(op)                   the swing/unload cadence both ends judge on the actor's action clock
//   railWakeTick(tick, claimed)       the server's wake start: the tick the actor pressed at (its estimate), never later
//                                     than the arrival and at most WAKE_BACKDATE_TICKS before it, so the actor's
//                                     animation and the authoritative wake line up
import { railAccount, railApply, railJobs, type RailAction, type RailPile, type Railway } from '../sim/railway.ts';
import { LINE1_STATIONS } from '../sim/railway-line-layout.ts';
import { RAILWAY_T1 as T1 } from '../sim/railway-layout.ts';
import { LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import { LINE_TIMING } from '../sim/railway-line.ts';

export const RAIL_PREDICTED: ReadonlySet<string> = new Set([
  'rail.wake',
  'rail.chop',
  'rail.mine',
  'rail.take',
  'rail.rackTake',
  'rail.drop',
  'rail.deposit',
  'rail.forgeTake',
  'rail.depotTake',
  'rail.lever',
]);
/** Swing and unload cadence on the actor's own action clock (replication revision 1): the server refuses an action
 * closer than `ms - RAIL_CADENCE_SLACK_MS` to the last of its kind, and a client predicts the same check. */
export const RAIL_CADENCE_SLACK_MS = 20;
export function railCadence(op: string) {
  const swing = op === 'rail.chop' || op === 'rail.mine' || op === 'rail.beamChop';
  return { kind: swing ? 'swing' : op, ms: swing ? T1.swingMs : T1.unloadMs };
}
/** How far before its arrival a wake may start (1 s): more than any estimate lag at playable latency. */
export const WAKE_BACKDATE_TICKS = 10;
export const railWakeTick = (tick: number, claimed: number | undefined) =>
  claimed === undefined || !Number.isSafeInteger(claimed)
    ? tick
    : Math.min(tick, Math.max(tick - WAKE_BACKDATE_TICKS, claimed));
/** The replicator's temporary id for the pile a drop created: `ids` maps it to the server's pile id. */
export const railTempPile = (epoch: number, request: number) => `p:${epoch}:${request}`;
export function railParseTempPile(temp: string): [epoch: number, request: number] | null {
  const m = /^p:(\d{1,10}):(\d{1,10})$/.exec(temp);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** What an accepted action's effect needs, as it stood right after that action (several can share one packet, and
 * views must not read their counts from the packet's final state): the actor's balance of the moved kind, the
 * target's count, and the pile involved with its position. */
export type RailEffect = { carried: number; level?: number; pile?: number; px?: number; py?: number; pz?: number };
export function railEffect(s: Railway, pid: string, e: RailAction, before: Map<number, RailPile>): RailEffect {
  const a = railAccount(s, pid)!;
  const kind = e.op === 'rail.mine' ? 1 : e.op === 'rail.forgeTake' ? 2 : e.kind === 1 || e.kind === 2 ? e.kind : 0;
  const effect: RailEffect = { carried: kind === 1 ? (a.stone ?? 0) : kind === 2 ? (a.rails ?? 0) : a.carry };
  if (e.op === 'rail.drop') {
    const pile = s.piles.find((p) => p.n > (before.get(p.id)?.n ?? 0));
    if (pile) Object.assign(effect, { pile: pile.id, level: pile.n, px: pile.x, py: pile.y ?? 0, pz: pile.z });
  }
  if (e.op === 'rail.take') {
    const pile = before.get(e.id!);
    if (pile)
      Object.assign(effect, {
        pile: pile.id,
        level: s.piles.find((p) => p.id === pile.id)?.n ?? 0,
        px: pile.x,
        py: pile.y ?? 0,
        pz: pile.z,
      });
  }
  if (e.op === 'rail.deposit' || e.op === 'rail.beamDeposit') {
    const i = e.op === 'rail.beamDeposit' ? 2 : LINE1_STATIONS.findIndex((row) => row.id === e.station);
    const q = LINE2_STATIONS.findIndex((row) => row.id === e.station);
    if (i >= 0) {
      const job = railJobs(s)[i]!;
      effect.level =
        kind === 1
          ? (job.stoneStock ?? 0) + (job.stoneAllocation ?? 0) + (job.stoneUsed ?? 0)
          : job.stock + job.allocation + job.used;
    } else if (q >= 0) {
      const job = s.line2!.jobs[q]!;
      effect.level = kind === 2 ? job.railDelivered : job.delivered;
    } else if (e.station === 'F') effect.level = s.line2!.forge.used;
  }
  return effect;
}

/** A deep copy of a railway (the predictor's scratch state). */
export const cloneRailway = (s: Railway): Railway => structuredClone(s);

type Job = Record<string, unknown>;
const JOB_FIELDS = [
  'stock',
  'allocation',
  'used',
  'start',
  'elapsed',
  'lastTick',
  'completion',
  'stoneStock',
  'stoneAllocation',
  'stoneUsed',
  'railStock',
  'railAllocation',
  'railUsed',
  'timing',
] as const;
const COUNTERS = [
  ['stock', 'delivered'],
  ['stoneStock', 'stoneDelivered'],
  ['railStock', 'railDelivered'],
] as const;

export type RailPrediction = { n: number; effect: RailEffect | null };
/** Apply a predicted action to a scratch railway as the server would at `tick`; see the header for what is held back. */
export function railPredict(s: Railway, pid: string, e: RailAction, tick: number): RailPrediction {
  if (!RAIL_PREDICTED.has(e.op) || !railAccount(s, pid)) return { n: 0, effect: null };
  const before = new Map(s.piles.map((p) => [p.id, { ...p }]));
  const jobs = [...railJobs(s), ...(s.line2?.jobs ?? [])] as unknown as Job[];
  const saved = jobs.map((job) => {
    const out: Job = {};
    for (const k of JOB_FIELDS) if (k in job) out[k] = job[k];
    for (const [, d] of COUNTERS) if (d in job) out[d] = job[d];
    return out;
  });
  const forge = s.line2?.forge;
  const lit = forge ? [forge.lit, forge.lastPour] : null;
  const nextPile = s.nextPile;
  if (e.op === 'rail.drop') s.nextPile = -e.request; // a stable temporary id until the server's arrives
  const result = railApply(s, pid, e, tick, LINE_TIMING);
  if (e.op === 'rail.drop') s.nextPile = nextPile;
  // Thresholds are the server's: a completed bill shows full and waits; a filled forge waits to be lit.
  jobs.forEach((job, k) => {
    const old = saved[k]!;
    if ((old.start as number) >= 0 || (job.start as number) < 0) return;
    for (const f of JOB_FIELDS) if (f in old) job[f] = old[f];
    for (const [stock, delivered] of COUNTERS)
      if (stock in job && delivered in job)
        job[stock] = (job[stock] as number) + (job[delivered] as number) - (old[delivered] as number);
  });
  if (forge && lit && lit[0]! < 0 && forge.lit >= 0) [forge.lit, forge.lastPour] = lit as [number, number];
  const n = result.status === 'accepted' ? result.accepted : 0;
  return { n, effect: n > 0 ? railEffect(s, pid, e, before) : null };
}
