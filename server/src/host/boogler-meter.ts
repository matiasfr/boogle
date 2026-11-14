// Bounded diagnostic comparison only. The untrusted lead pose cannot feed shadow state or randomness.
export type LeadBoogler = { value: unknown; at: number };
export function createBooglerMeter() {
  const samples: { gap: number; agrees: boolean }[] = [];
  let next = 0,
    ticks = 0,
    ms = 0,
    maxMs = 0;
  return {
    measure(
      cost: number,
      shadow: { x: number; z: number; mode: number; walking: boolean },
      lead: LeadBoogler | null,
      now: number,
    ) {
      ticks++;
      ms += cost;
      maxMs = Math.max(maxMs, cost);
      if (!lead || !Number.isFinite(lead.at) || lead.at > now || now - lead.at >= 2000) return;
      const g = lead.value as { p?: unknown; m?: unknown; w?: unknown } | null;
      if (
        !g ||
        !Array.isArray(g.p) ||
        !Number.isFinite(g.p[0]) ||
        !Number.isFinite(g.p[1]) ||
        Math.abs(g.p[0]) > 10000 ||
        Math.abs(g.p[1]) > 10000 ||
        (g.m !== 0 && g.m !== 1 && g.m !== 2) ||
        (g.w !== 0 && g.w !== 1)
      )
        return;
      samples[next] = {
        gap: Math.hypot(shadow.x - g.p[0], shadow.z - g.p[1]),
        agrees: shadow.mode === g.m && shadow.walking === !!g.w,
      };
      next = (next + 1) % 600;
    },
    report() {
      const gaps = samples.map((s) => s.gap).sort((a, b) => a - b);
      const n = gaps.length;
      return {
        ticks,
        totalMs: ms,
        meanMs: ticks ? ms / ticks : 0,
        maxMs,
        msPerRoomSecond: ticks ? (ms / ticks) * 10 : 0,
        window: 'last 600 matched rule ticks; decision = mode and walking',
        samples: n,
        medianGapM: n ? (gaps[Math.floor((n - 1) / 2)]! + gaps[Math.floor(n / 2)]!) / 2 : null,
        worstGapM: n ? gaps[n - 1]! : null,
        decisionAgreement: n ? samples.filter((s) => s.agrees).length / n : null,
      };
    },
  };
}
