// The import-knot ratchet, run by `npm run registry` (docs/research/engine-architecture.md, check 9). Files whose static
// value imports form a cycle evaluate in an order nobody chose and can't load alone in a Node test. Pure: takes file
// texts, returns data; `import()` and `import type` don't count.
import { readFile } from '../scan/read.ts';
import type { Source } from './scan.ts';

// Today's knots. This list only shrinks: a file that leaves a knot loses its line here, and
// docs/plans/entity-architecture.md part 3 takes it to empty. Don't add to it; break the new cycle.
export const KNOTS: string[][] = [['src/pois/caves/decor.ts', 'src/pois/caves/index.ts']];

export type Imports = Map<string, string[]>;

export const importsOf = (files: Source[]): Imports =>
  new Map(files.map(({ path, text }) => [path, readFile(path, text).imports]));

/** Tarjan's strongly connected components of more than one file, each sorted, in a stable order. */
export function findKnots(graph: Imports): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const out: string[][] = [];
  const visit = (v: string) => {
    index.set(v, index.size);
    low.set(v, index.get(v)!);
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) continue;
      if (!index.has(w)) visit(w);
      if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, low.get(w)!));
    }
    if (low.get(v) !== index.get(v)) return;
    const part: string[] = [];
    let w: string;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      part.push(w);
    } while (w !== v);
    if (part.length > 1) out.push(part.sort());
  };
  for (const v of [...graph.keys()].sort()) if (!index.has(v)) visit(v);
  return out.sort((a, b) => a[0]!.localeCompare(b[0]!));
}

/** What the code has now against the allow-list: new members and merges fail, and so does a list that's out of date. */
export function checkKnots(knots: string[][], allowed: string[][]): string[] {
  const errors: string[] = [];
  const BREAK = 'break the cycle (a shared module, an onX hook) rather than adding to KNOTS in dev/registry/knots.ts';
  for (const knot of knots) {
    const groups = allowed.filter((g) => g.some((f) => knot.includes(f)));
    const fresh = knot.filter((f) => !allowed.flat().includes(f));
    if (!groups.length) errors.push(`new import knot: ${knot.join(', ')}; ${BREAK}`);
    else if (fresh.length)
      errors.push(`${fresh.join(', ')} joined the import knot with ${groups[0]![0]} and others; ${BREAK}`);
    if (groups.length > 1) errors.push(`import knots merged: ${groups.map((g) => g[0]).join(' and ')}; ${BREAK}`);
  }
  for (const group of allowed) {
    for (const f of group)
      if (!knots.flat().includes(f))
        errors.push(`${f} has left its import knot. Delete its line from KNOTS in dev/registry/knots.ts`);
    const parts = knots.filter((k) => k.some((f) => group.includes(f)));
    if (parts.length > 1)
      errors.push(`${group[0]}'s knot split in ${parts.length}: list each part apart in KNOTS (dev/registry/knots.ts)`);
  }
  return errors;
}
