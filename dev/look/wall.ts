// The hard wall-clock limit on a whole `look` run (warm-up, `--until` wait and capture, one player or two). A run that
// hangs holds the single GPU bot slot for everyone behind it, so look.ts arms a timer once it has the slot; when it
// fires the run ends with a "timeout" verdict, closes its browsers and exits TIMEOUT_EXIT. No game/runtime imports.

/** Seconds a look may run once it holds the bot slot, when `--wall` is not given. */
export const DEFAULT_WALL = 1200;
/** Distinct from a failure (1) and from a run stopped from outside (KILLED_EXIT, 3). */
export const TIMEOUT_EXIT = 4;
/** How long the timeout handler gives the browsers and servers to close before it exits anyway. */
export const CLEANUP_MS = 15_000;

/** The wall for a run: `--wall` seconds, else DEFAULT_WALL. Throws on anything that is not a positive number. */
export function wallSeconds(given: number | null): number {
  const seconds = given ?? DEFAULT_WALL;
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('--wall must be a positive number of seconds');
  return seconds;
}

/** The promise's value, or undefined if it has not settled in `ms` (a hung page must not hang the handler). */
export function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout>;
  const late = new Promise<undefined>((resolve) => (timer = setTimeout(() => resolve(undefined), ms)));
  return Promise.race([promise.catch(() => undefined), late]).finally(() => clearTimeout(timer));
}

/** Labels of the pages whose `--until` read is not true (a read that fails or hangs counts as not met). */
export async function unmetPages(
  pages: { label: string; met: () => Promise<unknown> }[],
  ms = 3000,
): Promise<string[]> {
  const read = await Promise.all(pages.map((p) => raceTimeout(p.met(), ms)));
  return pages.filter((_, i) => read[i] !== true).map((p) => p.label);
}
