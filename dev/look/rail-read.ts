// The page tools' one reader of the railway (docs/plans/ecs-m12-m13.md, sections 2 and 4): state is read as rows and
// queries on the world the views see, never off an inspection. Runs in the page: a bot imports it relatively, an eval
// with `import('/dev/look/rail-read.ts')`, typed with `typeof import('../rail-read.ts')`.
//
// A published world is never written, so take it again where you read it: `rw()` is the world now, and a value meant
// across an `await` or a press is read again after it, never held. `rw()`, `railAt()` and `railPid()` throw before the
// railway is mounted; `railRead()` is the facade or null, for `ready()`, `pending()`, `status()` and `debug()`.
// `inspectRailway()` is the view's scene walk and the session's scalars (where the scene drew the head, the hook's
// cable, the frames): re-exported so a tool needs this one module.
//
// The timed queries (a job's elapsed, used and allocation: the jobs, the phase, the panel count and stock, the counts,
// line 2's logs and rails) need the tick on a client's world, where every page tool reads, and throw without it. So the
// forms here take the world alone and supply `railAt()` themselves; the sim's own forms, with an `at` a caller could
// leave out, are not re-exported.
import type { World } from '../../src/ecs/index.ts';
import { railwayWorldRead } from '../../src/entities/railway/state.ts';
import { account } from '../../src/sim/railway-rows.ts';
import * as q from '../../src/sim/railway-queries.ts';
import * as q1 from '../../src/sim/railway-queries-line1.ts';
import * as q2 from '../../src/sim/railway-queries-line2.ts';
export { inspectRailway } from '../../src/entities/railway/state.ts';

export * from '../../src/sim/railway-rows.ts';
export * from '../../src/sim/railway-queries.ts';
export * from '../../src/sim/railway-queries-line1.ts';
export * from '../../src/sim/railway-queries-line2.ts';
export * from '../../src/sim/railway-queries-trains.ts';
export * from '../../src/sim/railway-queries-works.ts';

// The timed queries at the estimated tick (these names win over the star exports above).
export const railJobs = (w: World) => q.railJobs(w, railAt());
export const line2Jobs = (w: World) => q.line2Jobs(w, railAt());
export const railCurrentJob = (w: World) => q.railCurrentJob(w, railAt());
/** Line one's phase, the wake judged at the estimated tick too. */
export const railPhase = (w: World) => q1.railPhase(w, railAt(), railAt());
export const railPanelCount = (w: World) => q1.railPanelCount(w, railAt());
export const railPanelStock = (w: World) => q1.railPanelStock(w, railAt());
export const railCounts = (w: World) => q2.railCounts(w, railAt());
export const line2Logs = (w: World) => q2.line2Logs(w, railAt());
export const line2Rails = (w: World) => q2.line2Rails(w, railAt());
/** Line one's station k, flat: its job row and its run at the estimated tick, read now. */
export const railStation = (k: number) => {
  const { job, run } = railJobs(rw())[k]!;
  return { ...job, ...run };
};
/** Line two's station k (Q1 is 0), flat: its job row and its run at the estimated tick, read now. */
export const line2Station = (k: number) => {
  const { job, run } = line2Jobs(rw())[k]!;
  return { ...job, ...run };
};
/** This player's back now (the account row's loads), all empty before the account exists. */
export const railBack = () => {
  const a = account(rw(), railPid());
  return { carry: a?.carry ?? 0, stone: a?.stone ?? 0, rails: a?.rails ?? 0, foot: a?.foot ?? 0 };
};

/** The adapter's read facade, or null until the railway is mounted. */
export const railRead = () => railwayWorldRead();
function mounted() {
  const read = railwayWorldRead();
  if (!read) throw new Error('rail-read: the railway is not mounted');
  return read;
}
/** The world the views see now: the prediction while your actions are pending, else the confirmed one. */
export const rw = () => mounted().world();
/** The estimated server tick: the queries' `at`. */
export const railAt = () => mounted().tick();
/** This tab's player id. */
export const railPid = () => mounted().pid;
/** Waits until an action can be sent (mounted, the whole state in, the window not full); false after `ms`. */
export async function railReady(ms = 30_000) {
  const end = performance.now() + ms;
  while (!railwayWorldRead()?.ready()) {
    if (performance.now() > end) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
}
