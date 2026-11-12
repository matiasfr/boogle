// The railway's core systems (docs/plans/ecs-migration-railway.md, section 2): the request history around every op
// (rail.receipt, rail.remember), the machine's wake, a player's session, and the wire's job clock (the tick's last
// system, also run after an applied action and a resume).
import { defineSystem, type World } from '../ecs/index.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import type { LineTiming } from './railway-line-schedule.ts';
import { railInt, RAILWAY_MAX_INT, RAILWAY_OUTCOMES } from './railway.ts';
import type { RailAction, RailResult } from './railway.ts';
import { Account, Beam, Boiler, Job, JobRun, Outcome, QJob, QJobRun, Rail, RAIL_STATUS } from './railway-components.ts';
import { beamId, boilerHeld, boilerId, held, railId } from './railway-queries.ts';

/** The tick systems' one input: the tick, the room's railTrainHeadPct (the trains' headway hold) and its trade
 * tunables (slice 5 R3: railFarePct, railRiderPct). */
export type Tick = { tick: number; headPct: number; farePct: number; riderPct: number };
/** What an op system is given: the actor's account id, the action, the tick and the room's timing. */
export type Act = { a: number; e: RailAction; tick: number; timing: LineTiming };
// ---------------------------------------------------------------- the request history
export const receipt = defineSystem(
  'rail.receipt',
  { reads: [Outcome, Account], phase: 'act', order: 0 },
  (w, q: { pid: string; epoch: number; request: number }): RailResult | null => {
    let old: RailResult | null = null;
    w.each([Outcome], (_id, r) => {
      if (!old && r.pid === q.pid && r.epoch === q.epoch && r.request === q.request)
        old = { ...r, status: RAIL_STATUS[r.status]! };
    });
    if (old) return old;
    const id = w.lookup(Account, q.pid);
    const a = id === undefined ? undefined : w.get(Account, id);
    if (!a || q.epoch !== a.epoch || q.request <= a.request)
      return { pid: q.pid, epoch: q.epoch, request: q.request, status: 'snapshot-required', accepted: 0 };
    return null;
  },
);
export const remember = defineSystem(
  'rail.remember',
  { writes: [Account, Outcome], phase: 'act', order: 100 },
  (w, q: { a: number; e: RailAction; n: number; rejected: boolean }): RailResult => {
    const a = w.mut(Account, q.a)!;
    a.request = q.e.request;
    const status = q.rejected ? 'rejected' : q.n ? 'accepted' : 'noop';
    const r: RailResult = { pid: a.pid, epoch: q.e.epoch, request: q.e.request, status, accepted: q.n };
    w.spawn([Outcome, { ...r, status: RAIL_STATUS.indexOf(status) }]);
    if (w.count(Outcome) + 1 > RAILWAY_OUTCOMES) w.despawn(w.ids(Outcome)[0]!);
    return { ...r };
  },
);
export const wake = defineSystem('rail.wake', { writes: [Rail], phase: 'act', order: 1 }, (w, { tick }: Act) => {
  const rail = w.get(Rail, railId(w))!;
  if (rail.awake >= 0) return 0;
  w.mut(Rail, railId(w))!.awake = tick;
  return 1;
});
export const session = defineSystem(
  'rail.session',
  { writes: [Account, Beam, Boiler], phase: 'session', order: 0 },
  (w, { pid, epoch }: { pid: string; epoch: number }) => {
    if (!okPid(pid) || !railInt(epoch, RAILWAY_MAX_INT, 1)) return false;
    const id = w.lookup(Account, pid);
    if (id !== undefined) {
      const old = w.get(Account, id)!;
      if (epoch !== old.epoch + 1) return false;
      Object.assign(w.mut(Account, id)!, { epoch, request: 0 });
      // A player who comes back (a reconnect, a reload) still carries the beam they held: it moves to the new session.
      if (boilerHeld(w, pid)) w.mut(Boiler, boilerId(w))!.epoch = epoch;
      if (held(w, pid)) w.mut(Beam, beamId(w))!.epoch = epoch;
      return true;
    }
    if (epoch !== 1 || w.count(Account) >= MAX_PLAYERS) return false;
    w.spawn([Account, { pid, carry: 0, stone: 0, rails: 0, epoch, request: 0 }]);
    return true;
  },
);
export const railSession = (w: World, pid: string, epoch: number): boolean => w.run(session, { pid, epoch });
/** The wire's job clock: `ahead` and `end` follow from what the tick advanced (written only when they change). */
export const jobClock = defineSystem<Tick | undefined>(
  'rail.jobClock',
  { reads: [JobRun, QJobRun], writes: [Job, QJob], phase: 'tick', order: 5 },
  (w) => {
    const settle = (c: typeof Job | typeof QJob, run: typeof JobRun | typeof QJobRun, id: number) => {
      const j = w.get(c, id)!,
        r = w.get(run, id)!;
      const ahead = j.start >= 0 ? r.elapsed - (r.lastTick - j.start) : 0;
      const end = j.completion ? r.lastTick : -1;
      if (j.ahead !== ahead || j.end !== end) Object.assign(w.mut(c, id)!, { ahead, end });
    };
    for (const id of w.ids(Job)) settle(Job, JobRun, id);
    for (const id of w.ids(QJob)) settle(QJob, QJobRun, id);
  },
);
/** After an action the server applied (not in a prediction, whose job clocks are the mirror's). */
export const railSettle = (w: World) => w.run(jobClock, undefined);
