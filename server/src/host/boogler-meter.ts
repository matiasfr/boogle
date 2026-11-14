// Bounded elapsed cost of authoritative decisions, excluding replication and diagnostic aggregation.
export function createBooglerMeter() {
  let ticks = 0,
    ms = 0,
    maxMs = 0;
  return {
    measure(cost: number) {
      ticks++;
      ms += cost;
      maxMs = Math.max(maxMs, cost);
    },
    report: () => ({
      ticks,
      totalMs: ms,
      meanMs: ticks ? ms / ticks : 0,
      maxMs,
      msPerRoomSecond: ticks ? (ms / ticks) * 10 : 0,
    }),
  };
}
