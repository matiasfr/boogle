// Line one's derived facts on the world (docs/plans/ecs-migration-railway.md, M8): the world twins of the read model's
// helpers in ./railway-line.ts and ./railway.ts, same names, a world first. Pure reads; `at` is the job clock's tick
// (./railway-queries.ts, jobProgress), absent for the run rows.
//
//   railMaxDuration, railLineOpen          the active station's whole schedule; T3 laid
//   railPanelCount, railPanelStock         rail pairs laid on line one, and still on the machine's stack
//   railBeamChoppable, railAxeAvailable    a stroke at the great tree bites; the forge's axe is there to take
//   railPhase(w, tick?, at?)               asleep, waking, idle, deposit, feeding, laying or done
//   treeGrowth, freeCarryIgnoringBig       a felled tree's growth stage; room on a back, a big load aside (M10)
import type { World } from '../ecs/index.ts';
import { RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_RAIL_PAIRS, LINE1_STATIONS } from './railway-line-layout.ts';
import { linePanelCount } from './railway-line-schedule.ts';
import { REGROW_MINUTES } from './railway-supply.ts';
import { Beam, Forge, Job, Rail, Tree } from './railway-components.ts';
import {
  activeStation,
  beamId,
  carried,
  carryMax,
  forgeId,
  jobId,
  railAccount,
  railId,
  railJobs,
  scheduleOf,
} from './railway-queries.ts';

/** The active station's whole schedule, in ticks. */
export const railMaxDuration = (w: World) =>
  scheduleOf(LINE1_STATIONS[activeStation(w)]!, w.get(Job, jobId(w, activeStation(w)))!).totalTicks;
/** T3 is laid: line one is open. */
export const railLineOpen = (w: World) => !!w.get(Job, jobId(w, 2))!.completion;
/** Rail pairs laid on line one (whole contacts from accepted elapsed ticks). */
export const railPanelCount = (w: World, at?: number) =>
  railJobs(w, at).reduce(
    (count, { job: j, run }, slot) => count + (j.start < 0 ? 0 : linePanelCount(LINE1_STATIONS[slot]!, run.elapsed, j)),
    0,
  );
/** Rail pairs still on the machine's stack. */
export const railPanelStock = (w: World, at?: number) => LINE1_RAIL_PAIRS - railPanelCount(w, at);
/** Whether a stroke at the great tree bites (wake aside): Station 3 is open, unfunded, and the tree still stands. */
export const railBeamChoppable = (w: World) =>
  activeStation(w) === 2 && w.get(Job, jobId(w, 2))!.start < 0 && w.get(Beam, beamId(w))!.state === 'standing';
/** The proper axe is the lit forge's first made thing. */
export const railAxeAvailable = (w: World) => w.get(Forge, forgeId(w))!.lit >= 0 && !w.get(Rail, railId(w))!.axe;
/** Line one's phase now. `tick` judges the wake (default: T1's last tick, as the read model's did). */
export function railPhase(
  w: World,
  tick?: number,
  at?: number,
): 'asleep' | 'waking' | 'idle' | 'deposit' | 'feeding' | 'laying' | 'done' {
  const jobs = railJobs(w, at);
  const slot = activeStation(w),
    { job: j, run } = jobs[slot]!;
  const t = tick ?? jobs[0]!.run.lastTick;
  if (j.completion) return 'done';
  if (j.start < 0) {
    const awake = w.get(Rail, railId(w))!.awake;
    return awake < 0 ? 'asleep' : t < awake + T1.wakeTicks ? 'waking' : 'idle';
  }
  const schedule = scheduleOf(LINE1_STATIONS[slot]!, j);
  return run.elapsed < Math.ceil(j.depositMs / 100)
    ? 'deposit'
    : run.elapsed < schedule.depositTicks + schedule.feedTicks
      ? 'feeding'
      : 'laying';
}
/** Tree `slot`'s growth stage: the minutes its age is past REGROW_MINUTES (0 while it stands or waits to regrow, or
 * for no such tree). The read model's `growth[k]`. */
export function treeGrowth(w: World, slot: number) {
  const id = w.lookup(Tree, slot);
  return id === undefined ? 0 : Math.max(0, w.get(Tree, id)!.age - REGROW_MINUTES);
}
/** What `pid`'s back has room for by count alone: carryMax less what it carries (the whole back for no account).
 * Unlike `free` (./railway-queries.ts), it ignores the big-load rule, so it is not 0 while a beam, the boiler or a
 * footing is held: the "Your back is full" prompt tells those apart. The read model's `freeCarry`. */
export function freeCarryIgnoringBig(w: World, pid: string) {
  const a = railAccount(w, pid);
  return Math.max(0, carryMax(w) - (a ? carried(a) : 0));
}
