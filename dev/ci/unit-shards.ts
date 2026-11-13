// Full CI only; local/ship modes and the nightly's three native Node shards keep their settings.
// Measured whole-file seconds, rounded, 13 November: docs/research/ci-unit-shard-time.md.
// Missing/new files cost 1s until measured. Every discovered file is assigned, regardless of this table.
export const CI_UNIT_SHARDS = 8;
const SECONDS: Readonly<Record<string, number>> = {
  'bot-queue': 2,
  'change-class': 3,
  'coast-regions': 3,
  'ecs-budget': 2,
  'railway-adapter': 11,
  'railway-boiler': 27,
  'railway-cart': 24,
  'railway-check-ring': 39,
  'railway-check': 45,
  'railway-golden-0': 15,
  'railway-golden-1': 16,
  'railway-golden-2': 18,
  'railway-golden-3': 20,
  'railway-golden-4': 26,
  'railway-golden-5': 20,
  'railway-golden-6': 22,
  'railway-golden-7': 12,
  'railway-golden-8': 158,
  'railway-install': 103,
  'railway-line-authority': 7,
  'railway-line2': 101,
  'railway-m10a-review': 41,
  'railway-m10a-views': 13,
  'railway-m10c-review': 44,
  'railway-m10d-review': 16,
  'railway-m10e-review': 10,
  'railway-m10f-review': 19,
  'railway-m11-review': 73,
  'railway-m12-review': 44,
  'railway-m12': 109,
  'railway-ops': 23,
  'railway-r3a-adversarial': 76,
  'railway-r3b2-review': 219,
  'railway-r4a-views': 38,
  'railway-r4b-views': 40,
  'railway-r4c-leaf': 38,
  'railway-read-session': 5,
  'railway-replicate': 67,
  'railway-ring': 139,
  'railway-route-review': 38,
  'railway-route-rules': 270,
  'railway-set-down': 10,
  'railway-steel-review': 63,
  'railway-steel': 79,
  'railway-supply': 3,
  'railway-tick-order': 57,
  'railway-trade': 62,
  'railway-train': 144,
  'railway-trains': 85,
  'railway-works': 63,
  'review-m12e': 12,
  'review-stamp': 2,
  'review-v25': 18,
  'review-v26': 22,
  'town-facts': 25,
  'unit-modes': 2,
  'unit-select-review': 2,
  'unit-select': 3,
  'welcome-railway': 15,
  'world-lines': 2,
};

/** Longest first, onto the lightest shard; ties use the path and then the shard index. No files are dropped. */
export function unitShards(files: readonly string[], total: number): string[][] {
  if (!Number.isInteger(total) || total < 1) throw new Error('unit shard total must be a positive integer');
  const weight = (file: string) =>
    SECONDS[
      file
        .replaceAll('\\', '/')
        .replace(/^test\//, '')
        .replace(/\.test\.ts$/, '')
    ] ?? 1;
  const bins = Array.from({ length: total }, () => ({ seconds: 0, files: [] as string[] }));
  for (const file of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
    const bin = bins.reduce((a, b) => (a.seconds <= b.seconds ? a : b));
    bin.files.push(file);
    bin.seconds += weight(file);
  }
  return bins.map((bin) => bin.files.sort());
}
