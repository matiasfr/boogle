type PageClock = { game: number; tick: number };
type Sample = { server: { game: number } | null; pages: PageClock[] };

// Compare simulation with the clock actually driving it. Requested warp speed is
// a separate harness capacity measurement, not elapsed simulation time.
export function worldClockDeficit(first: Sample, sample: Sample, peer: number, tickMs: number) {
  const a = first.pages[peer]!;
  const b = sample.pages[peer]!;
  const elapsed = first.server && sample.server ? sample.server.game - first.server.game : b.game - a.game;
  return elapsed - ((b.tick - a.tick) * tickMs) / 1000;
}
