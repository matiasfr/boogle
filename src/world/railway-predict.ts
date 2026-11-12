// Boiler and train call ops are never predicted: the unique boiler and route decisions wait for acceptance. Nor are the
// Works' mechanism facts (rail.breaker, rail.strike, rail.turn, rail.brace) or line 2's install (rail.install, v30):
// they wait for the server.
// Replication R1b (docs/plans/replication.md, section 2): what a client predicts of its own railway actions, and the
// effect facts both ends compute for an accepted action. Headless and pure: the server runs railEffect after each
// action it applies; a client runs railPredict on a clone of its confirmed world with the very same railApply (M12: the
// predicted state is that cloned world itself; no read model is built or linked).
//
//   RAIL_PREDICTED                    the ops a client predicts (chop, mine, take, rack take, drop, deposit, forge,
//                                     depot and shelf takes, wake, lever, summit switch, pack, the kiln, footings and
//                                     the cradle, the glider take, the steel works' yard take and feed); the rest wait
//                                     for the server as in R1a
//   railPredict(w, pid, e, tick)      apply e to w (a clone) as the server would at tick, keeping thresholds for the
//                                     server: a bill it completes shows full but is funded only when confirmed, a forge it
//                                     fills is lit only when confirmed, and so are the Works' thresholds (the kiln lit,
//                                     the cradle fitted, the wagon rolling out, the crossing footed, the leaf down). A pile it creates
//                                     gets the temporary id -request
//                                     until the server's id arrives (railTempPile, the replicator's `ids` remap)
//   railEffect(s, pid, e, before)     what an accepted action's effect needs, as it stood right after that action
//   railCadence(op)                   the swing/unload cadence both ends judge on the actor's action clock
//   railWakeTick(tick, claimed)       the server's wake start: the tick the actor pressed at (its estimate), never later
//                                     than the arrival and at most WAKE_BACKDATE_TICKS before it, so the actor's
//                                     animation and the authoritative wake line up
import type { World } from '../ecs/index.ts';
import type { RailAction } from '../sim/railway.ts';
import { LINE1_STATIONS } from '../sim/railway-line-layout.ts';
import { RAILWAY_T1 as T1 } from '../sim/railway-layout.ts';
import { LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import { LINE_TIMING } from '../sim/railway-line.ts';
import { railApply } from '../sim/railway-systems.ts';
import { LINE2 } from '../sim/railway-lines.ts';
import { LINE_SLOTS } from '../sim/railway-trains.ts';
import {
  Account,
  Aperture,
  Cart,
  Train,
  Forge,
  ForgeClock,
  Job,
  JobRun,
  Pile,
  QJob,
  QJobRun,
  Rail,
  Shed,
  Steel,
  SteelClock,
  Works,
  WorksClock,
} from '../sim/railway-components.ts';

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
  'rail.depotRailTake',
  'rail.lever',
  'rail.seaSwitch',
  'rail.pack',
  'rail.kiln',
  'rail.footTake',
  'rail.footSet',
  'rail.cradle',
  'rail.glide',
  'rail.steelTake',
  'rail.steel',
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

/** Each pile's position and count, before an action (what its effect reads afterwards). */
export type PileBefore = { x: number; y: number; z: number; n: number };
export function piles(w: World) {
  const out = new Map<number, PileBefore>();
  w.each([Pile], (id, p) => out.set(id, { x: p.x, y: p.y, z: p.z, n: p.n }));
  return out;
}

/** What an accepted action's effect needs, as it stood right after that action (several can share one packet, and
 * views must not read their counts from the packet's final state): the actor's balance of the moved kind, the
 * target's count, and the pile involved with its position. */
export type RailEffect = { carried: number; level?: number; pile?: number; px?: number; py?: number; pz?: number };
export function railEffect(w: World, pid: string, e: RailAction, before: Map<number, PileBefore>): RailEffect {
  const a = w.get(Account, w.lookup(Account, pid)!)!;
  const kind =
    e.op === 'rail.mine'
      ? 1
      : e.op === 'rail.forgeTake' || e.op === 'rail.depotRailTake' || (e.op === 'rail.steelTake' && e.kind === 1)
        ? 2
        : e.op === 'rail.steelTake'
          ? 0
          : e.kind === 1 || e.kind === 2
            ? e.kind
            : 0;
  const effect: RailEffect = { carried: kind === 1 ? a.stone : kind === 2 ? a.rails : a.carry };
  // A footing: what is on your back after it (0 or 1), and the count where it went or came from.
  if (
    e.op === 'rail.footTake' ||
    e.op === 'rail.footSet' ||
    ((e.op === 'rail.drop' || e.op === 'rail.take') && e.kind === 3)
  )
    effect.carried = a.foot;
  if (e.op === 'rail.footTake' || e.op === 'rail.footSet' || e.op === 'rail.kiln' || e.op === 'rail.cradle') {
    const works = w.get(Works, w.single(Works))!,
      shed = w.get(Shed, w.single(Shed))!,
      ring = w.get(Aperture, w.single(Aperture))!;
    // Rack 2 and site 3 are the railhead's (v27): its rack, and the jib's count (bent footings, then counterweight).
    if (e.op === 'rail.footTake') effect.level = [works.rack, works.pierRack, ring.rack][e.rack!] ?? 0;
    else if (e.op === 'rail.footSet')
      effect.level = [shed.stall, shed.cradle, works.pierSet, ring.set + ring.cw][e.site!] ?? 0;
    else if (e.op === 'rail.kiln') effect.level = works.logs + works.stone;
    else {
      effect.carried = a.rails;
      effect.level = shed.cradleRails;
    }
  }
  // The steel works (v30): the yard's count of the kind taken, or the bill's fed logs and rails.
  if (e.op === 'rail.steelTake' || e.op === 'rail.steel') {
    const st = w.get(Steel, w.single(Steel))!;
    effect.level = e.op === 'rail.steel' ? st.logs + st.rails : e.kind === 1 ? st.yardRails : st.yardLogs;
  }
  if (e.op === 'rail.drop') {
    let hit = 0;
    w.each([Pile], (id, p) => {
      if (!hit && p.n > (before.get(id)?.n ?? 0)) hit = id;
    });
    const p = hit ? w.get(Pile, hit)! : undefined;
    if (p) Object.assign(effect, { pile: hit, level: p.n, px: p.x, py: p.y, pz: p.z });
  }
  if (e.op === 'rail.take') {
    const p = before.get(e.id!);
    if (p) Object.assign(effect, { pile: e.id, level: w.get(Pile, e.id!)?.n ?? 0, px: p.x, py: p.y, pz: p.z });
  }
  if (e.op === 'rail.deposit' || e.op === 'rail.beamDeposit') {
    const i = e.op === 'rail.beamDeposit' ? 2 : LINE1_STATIONS.findIndex((row) => row.id === e.station);
    const q = LINE2_STATIONS.findIndex((row) => row.id === e.station);
    if (i >= 0) {
      const id = w.lookup(Job, i)!;
      const j = w.get(Job, id)!,
        r = w.get(JobRun, id)!;
      effect.level = kind === 1 ? j.stoneStock + r.stoneAllocation + r.stoneUsed : j.stock + r.allocation + r.used;
    } else if (q >= 0) {
      const j = w.get(QJob, w.lookup(QJob, q)!)!;
      effect.level = kind === 2 ? j.railDelivered : j.delivered;
    } else if (e.station === 'F') effect.level = w.get(Forge, w.single(Forge))!.used;
  }
  return effect;
}

/** Whether the world holds a whole railway (a published world always does; the guard stays for any other caller). */
const whole = (w: World) => w.count(Rail) === 1;

export type RailPrediction = { n: number; effect: RailEffect | null };
type Saved = { job: Record<string, unknown>; run: Record<string, unknown> };
/** Apply a predicted action to a scratch world (a clone of the confirmed one) as the server would at `tick`; see the
 * header for what is held back. */
export function railPredict(w: World, pid: string, e: RailAction, tick: number): RailPrediction {
  if (!whole(w) || !RAIL_PREDICTED.has(e.op) || w.lookup(Account, pid) === undefined) return { n: 0, effect: null };
  const before = piles(w);
  const jobs = [
    ...w.ids(Job).map((id) => [Job, JobRun, id, 'delivered', 'stoneDelivered'] as const),
    ...w.ids(QJob).map((id) => [QJob, QJobRun, id, 'delivered', 'railDelivered'] as const),
  ];
  const saved: Saved[] = jobs.map(([c, r, id]) => ({ job: { ...w.get(c, id)! }, run: { ...w.get(r, id)! } }));
  const fid = w.single(Forge);
  const lit = [w.get(Forge, fid)!.lit, w.get(ForgeClock, fid)!.lastPour] as const;
  // Funding a shelf stretch sends the shelf's leftovers back to the forge rack: held back with the funding.
  const rail0 = w.get(Rail, w.single(Rail))!;
  const cartId = w.single(Cart);
  const shelf = [rail0.depotRails, w.get(Forge, fid)!.rack, rail0.shelfOut, w.get(Cart, cartId)!.rails] as const;
  // The Q6 kit's rails aboard line 2's trains (any of them may carry it).
  const kitIds = LINE_SLOTS[LINE2]!.map((k) => w.lookup(Train, k)!);
  const kitRails = kitIds.map((id) => w.get(Train, id)!.rails);
  // The Works' thresholds, held for the server like the forge's.
  const wid = w.single(Works),
    sid = w.single(Shed);
  const works0 = { lit: w.get(Works, wid)!.lit, crossing: w.get(Works, wid)!.crossing },
    cast0 = w.get(WorksClock, wid)!.lastCast;
  const shed0 = { fitted: w.get(Shed, sid)!.fitted, ready: w.get(Shed, sid)!.ready };
  // The leaf coming down under its fourth weight (v27) is the server's, like the crossing footed.
  const apId = w.single(Aperture),
    brace0 = w.get(Aperture, apId)!.brace;
  // The steel works lit by the feed that fills its bill (v30), like the kiln.
  const stId = w.single(Steel),
    steel0 = [w.get(Steel, stId)!.lit, w.get(SteelClock, stId)!.lastCast] as const;
  let heldBack = false;
  if (e.op === 'rail.drop') w.reserve(-e.request); // a stable temporary id until the server's arrives
  const result = railApply(w, pid, e, tick, LINE_TIMING);
  // Thresholds are the server's: a completed bill shows full and waits; a filled forge waits to be lit. The bill's
  // delivered counts stand, and its stock keeps what this action delivered.
  jobs.forEach(([c, r, id, delivered, second], k) => {
    const old = saved[k]!;
    const j = w.get(c, id)! as unknown as Record<string, number>;
    if ((old.job.start as number) >= 0 || j.start! < 0) return;
    heldBack = true;
    const stock = (old.job.stock as number) + j[delivered]! - (old.job[delivered] as number);
    const stock2key = second === 'stoneDelivered' ? 'stoneStock' : 'railStock';
    const stock2 = (old.job[stock2key] as number) + j[second]! - (old.job[second] as number);
    Object.assign(
      w.mut(c, id)!,
      { ...old.job, [delivered]: j[delivered], [second]: j[second] },
      {
        stock,
        [stock2key]: stock2,
      },
    );
    Object.assign(w.mut(r, id)!, old.run);
  });
  if (heldBack && w.get(Rail, w.single(Rail))!.shelfOut !== shelf[2]) {
    Object.assign(w.mut(Rail, w.single(Rail))!, { depotRails: shelf[0], shelfOut: shelf[2] });
    w.mut(Forge, fid)!.rack = shelf[1];
    w.mut(Cart, cartId)!.rails = shelf[3];
    kitIds.forEach((id, k) => {
      if (w.get(Train, id)!.rails !== kitRails[k]) w.mut(Train, id)!.rails = kitRails[k]!;
    });
  }
  if (lit[0] < 0 && w.get(Forge, fid)!.lit >= 0) {
    w.mut(Forge, fid)!.lit = lit[0];
    w.mut(ForgeClock, fid)!.lastPour = lit[1];
  }
  const works = w.get(Works, wid)!,
    shed = w.get(Shed, sid)!;
  if (works.lit !== works0.lit || works.crossing !== works0.crossing) {
    Object.assign(w.mut(Works, wid)!, works0);
    w.mut(WorksClock, wid)!.lastCast = cast0;
  }
  if (shed.fitted !== shed0.fitted || shed.ready !== shed0.ready) Object.assign(w.mut(Shed, sid)!, shed0);
  if (w.get(Aperture, apId)!.brace !== brace0) w.mut(Aperture, apId)!.brace = brace0;
  if (w.get(Steel, stId)!.lit !== steel0[0]) {
    w.mut(Steel, stId)!.lit = steel0[0];
    w.mut(SteelClock, stId)!.lastCast = steel0[1];
  }
  const n = result.status === 'accepted' ? result.accepted : 0;
  return { n, effect: n > 0 ? railEffect(w, pid, e, before) : null };
}
