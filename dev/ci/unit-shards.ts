// Full CI only; local/ship modes and the nightly's three native Node shards keep their settings.
// Whole-file seconds, rounded, 16 November CI; new golden splits scaled from local runs (see research report).
// Missing/new files cost 1s until measured. Every discovered file is assigned, regardless of this table.
export const CI_UNIT_SHARDS = 8;
export const CI_UNIT_CONCURRENCY = 3;
import SECONDS from './unit-weights.json' with { type: 'json' };

/** Undefined means unmeasured: still assigned, but the timing reporter warns. */
export function unitWeight(file: string): number | undefined {
  const key = file
    .replaceAll('\\', '/')
    .replace(/^test\//, '')
    .replace(/\.test\.ts$/, '');
  return (SECONDS as Readonly<Record<string, number>>)[key];
}

/** Longest first, onto the lightest shard; ties use the path and then the shard index. No files are dropped. */
export function unitShards(files: readonly string[], total: number): string[][] {
  if (!Number.isInteger(total) || total < 1) throw new Error('unit shard total must be a positive integer');
  const weight = (file: string) => unitWeight(file) ?? 1;
  const bins = Array.from({ length: total }, () => ({ seconds: 0, files: [] as string[] }));
  for (const file of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
    const bin = bins.reduce((a, b) => (a.seconds <= b.seconds ? a : b));
    bin.files.push(file);
    bin.seconds += weight(file);
  }
  return bins.map((bin) => bin.files.sort());
}
