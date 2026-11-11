// Split-rock Works and the smallest Roundhouse (docs/plans/split-rock-roundhouse.md, "The rules"): the stage labels
// and seam bits. The rules are systems in ./railway-sys-works.ts, the facts queries in ./railway-queries-works.ts and
// the invariants ./railway-check-works.ts.
export const WORKS_STAGES = ['dormant', 'breaker', 'open', 'lit', 'stall', 'fitted', 'wagon', 'crossing'] as const;
export type WorksStage = (typeof WORKS_STAGES)[number];
export const SEAM_STALL = 1;
export const SEAM_THROAT = 2;
