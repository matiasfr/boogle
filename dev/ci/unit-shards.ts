// Full CI only; local/ship modes and the nightly's three native Node shards keep their settings.
// Whole-file seconds rounded up from CI (docs/research/ci-unit-shard-time.md).
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

// Node's CLI schedules the files alphabetically even when given a differently ordered argv.
function finishTime(files: string[], weight: (file: string) => number) {
  const workers = Array<number>(CI_UNIT_CONCURRENCY).fill(0);
  for (const file of files.sort()) {
    const first = workers.indexOf(Math.min(...workers));
    workers[first]! += weight(file);
  }
  return Math.max(...workers);
}

/** Place expensive files first. Compare when the candidate shard's final worker would finish;
 * break ties by total work, then shard index, so empty worker slots fill evenly. */
export function unitShards(
  files: readonly string[],
  total: number,
  weight = (file: string) => unitWeight(file) ?? 1,
): string[][] {
  if (!Number.isInteger(total) || total < 1) throw new Error('unit shard total must be a positive integer');
  const bins = Array.from({ length: total }, () => ({ seconds: 0, files: [] as string[] }));
  for (const file of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
    let best = bins[0]!;
    let earliest = Infinity;
    for (const bin of bins) {
      const finish = finishTime([...bin.files, file], weight);
      if (finish < earliest || (finish === earliest && bin.seconds < best.seconds)) {
        best = bin;
        earliest = finish;
      }
    }
    best.files.push(file);
    best.seconds += weight(file);
  }
  return bins.map((bin) => bin.files.sort());
}
