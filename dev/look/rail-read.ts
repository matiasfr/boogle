// The page tools' one reader of the railway (docs/plans/ecs-m12-m13.md, sections 2 and 4): state is read as rows and
// queries on the world the views see, never off an inspection. Runs in the page: a bot imports it relatively, an eval
// with `import('/dev/look/rail-read.ts')`, typed with `typeof import('../rail-read.ts')`.
//
// A published world is never written, so take it again where you read it: `rw()` is the world now, and a value meant
// across an `await` or a press is read again after it, never held. `rw()`, `railAt()` and `railPid()` throw before the
// railway is mounted; `railRead()` is the facade or null, for `ready()`, `pending()`, `status()` and `debug()`.
// `inspectRailway()` is the view's scene walk and the session's scalars (where the scene drew the head, the hook's
// cable, the frames): re-exported so a tool needs this one module.
import { railwayWorldRead } from '../../src/entities/railway/state.ts';
export { inspectRailway } from '../../src/entities/railway/state.ts';

export * from '../../src/sim/railway-rows.ts';
export * from '../../src/sim/railway-queries.ts';
export * from '../../src/sim/railway-queries-line1.ts';
export * from '../../src/sim/railway-queries-line2.ts';
export * from '../../src/sim/railway-queries-trains.ts';
export * from '../../src/sim/railway-queries-works.ts';
// Both export `job` and `qjob`: the rows' (the row at a slot) win here; the queries' are the entity ids.
export { job, qjob } from '../../src/sim/railway-rows.ts';

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
