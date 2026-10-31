// Snapshot buffer for Owner and Host state: keep the last few timestamped samples from a peer and find the pair to
// interpolate between. Pure (no three.js), so it is unit-tested.
//
//   const snaps = createSnaps();
//   snaps.push(time, sample)   time in local ms (net.js converts the sender's clock); samples are any objects
//   snaps.sample(t)            -> null when empty, else { a, b, u, over }: lerp a -> b by u; over = ms past b
//   snaps.clear(), snaps.length
//
// Sample at now - INTERP_MS so there is usually a sample on each side; `over` lets fast things extrapolate.
export type Sample = { time: number; [k: string]: unknown };
export function createSnaps<S extends object = Record<string, unknown>>(max = 40) {
  const list: (S & { time: number })[] = [];
  return {
    get length() {
      return list.length;
    },
    push(time: number, sample: S) {
      const s = sample as S & { time: number };
      s.time = time;
      list.push(s);
      if (list.length > max) list.shift();
    },
    clear() {
      list.length = 0;
    },
    sample(t: number) {
      if (!list.length) return null;
      while (list.length > 2 && list[1].time <= t) list.shift();
      const a = list[0],
        b = list[1];
      if (!b || t <= a.time) return { a, b: a, u: 0, over: Math.max(0, t - a.time) };
      return { a, b, u: Math.min(1, (t - a.time) / Math.max(1, b.time - a.time)), over: Math.max(0, t - b.time) };
    },
  };
}
