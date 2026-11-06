// Option C: hybrid. Option A's tables and rules, stored as typed-array columns (./soa-table.ts). The rules index
// columns by row; the view drains changes exactly as Option A's does.
import { defineSoaTable } from './soa-table.ts';
import { KindView, pileMatrix, rockMatrix, treeMatrix } from './view.ts';
import {
  CHOP_WORK,
  FALL_TICKS,
  FELL_WORK,
  FNV_SEED,
  LOGS_PER_CHOP,
  PILE,
  PILE_MAX,
  ROCK,
  ROCK_STROKES,
  TAKE,
  TREE,
  cellKey,
  cellOf,
  fold,
  type PileRow,
  type RockRow,
  type Slice,
  type TreeRow,
} from './schema.ts';

export function createSoa(): Slice {
  // ---------------------------------------------------------------- state
  const trees = defineSoaTable('trees', TREE);
  const rocks = defineSoaTable('rocks', ROCK);
  const piles = defineSoaTable('piles', PILE);
  const tables = [trees, rocks, piles] as const;
  const T = trees.col,
    R = rocks.col,
    P = piles.col;
  const pileAt = new Map<number, number>();
  const reindex = () => {
    pileAt.clear();
    for (let k = 0; k < piles.len; k++) pileAt.set(cellKey(P.i[k]!, P.j[k]!, P.k[k]!), piles.ids[k]!);
  };

  // ---------------------------------------------------------------- rules
  function drop(i: number, j: number, k: number, n: number) {
    const id = pileAt.get(cellKey(i, j, k));
    const p = id === undefined ? -1 : piles.find(id);
    if (p >= 0) {
      P.n[p] = Math.min(PILE_MAX, P.n[p]! + n);
      piles.touched(id!);
    } else {
      const row = piles.insert({ i, j, k, n: Math.min(PILE_MAX, n), settle: 0 });
      pileAt.set(cellKey(i, j, k), piles.ids[row]!);
    }
  }
  function chop(id: number) {
    const t = trees.find(id);
    if (t < 0 || T.fell[t]) return;
    const logs = Math.min(LOGS_PER_CHOP, T.ceiling[t]! - T.issued[t]!);
    T.issued[t]! += logs;
    T.work[t] = Math.min(FELL_WORK, T.work[t]! + CHOP_WORK);
    if (T.work[t]! >= FELL_WORK && T.issued[t] === T.ceiling[t]) {
      T.fell[t] = 1;
      T.age[t] = 0;
    }
    trees.touched(id);
    if (logs > 0) drop(cellOf(T.x[t]!), cellOf(T.z[t]!), 0, logs);
  }
  function strike(id: number) {
    const r = rocks.find(id);
    if (r < 0) return;
    R.strokes[r]!++;
    R.shake[r] = 4;
    rocks.touched(id);
    if (R.strokes[r]! >= ROCK_STROKES) {
      const x = R.x[r]!,
        z = R.z[r]!;
      rocks.remove(id);
      drop(cellOf(x), cellOf(z), 1, 2);
    }
  }
  function take(id: number) {
    const p = piles.find(id);
    if (p < 0) return;
    P.n[p]! -= Math.min(P.n[p]!, TAKE);
    piles.touched(id);
    if (P.n[p] === 0) {
      pileAt.delete(cellKey(P.i[p]!, P.j[p]!, P.k[p]!));
      piles.remove(id);
    }
  }
  const gone: number[] = [];
  function system() {
    gone.length = 0;
    for (let t = 0; t < trees.len; t++) {
      T.age[t]!++;
      if (T.fell[t] && T.age[t]! >= FALL_TICKS) gone.push(trees.ids[t]!);
    }
    for (const id of gone) trees.remove(id);
    for (let r = 0; r < rocks.len; r++)
      if (R.shake[r]! > 0) {
        R.shake[r]!--;
        rocks.touched(rocks.ids[r]!);
      }
    for (let p = 0; p < piles.len; p++) if (P.settle[p]! < 255) P.settle[p]!++;
  }

  // ---------------------------------------------------------------- view
  const views = [new KindView(), new KindView(), new KindView()];
  const row = {} as TreeRow & RockRow & PileRow;
  const draw = [
    (t: number) => {
      Object.assign(row, { x: T.x[t], z: T.z[t], size: T.size[t], work: T.work[t], fell: T.fell[t] });
      views[0]!.write(trees.ids[t]!, treeMatrix(row));
    },
    (r: number) => {
      Object.assign(row, { x: R.x[r], z: R.z[r], r: R.r[r], strokes: R.strokes[r], shake: R.shake[r] });
      views[1]!.write(rocks.ids[r]!, rockMatrix(row));
    },
    (p: number) => {
      Object.assign(row, { i: P.i[p], j: P.j[p], n: P.n[p] });
      views[2]!.write(piles.ids[p]!, pileMatrix(row));
    },
  ];
  const view = {
    sync() {
      tables.forEach((t, k) => {
        const { added, changed, removed } = t.drain();
        for (const id of removed) views[k]!.remove(id);
        for (const id of [...added, ...changed]) {
          const at = t.find(id);
          if (at >= 0) draw[k]!(at);
        }
      });
    },
    rebuild() {
      tables.forEach((t, k) => {
        t.drain();
        views[k]!.clear();
        for (let at = 0; at < t.len; at++) draw[k]!(at);
      });
    },
  };

  return {
    name: 'C in-house SoA tables',
    count: (k) => tables[k]!.len,
    idAt: (k, n) => tables[k]!.ids[n]!,
    plantTree: (x, z, size) =>
      void trees.insert({ x, z, size, work: 0, issued: 0, ceiling: size > 1.1 ? 15 : 10, fell: 0, age: 0 }),
    placeRock: (x, z, r) => void rocks.insert({ x, z, r, strokes: 0, shake: 0 }),
    drop,
    chop,
    strike,
    take,
    system,
    tick: 0,
    hash() {
      let h = fold(FNV_SEED, this.tick);
      for (const t of tables) h = t.hash(h);
      return h;
    },
    snapshot() {
      const parts = tables.map((t) => t.serialize());
      const out = new Uint8Array(4 + parts.reduce((s, p) => s + p.length, 0));
      new DataView(out.buffer).setUint32(0, this.tick, true);
      let o = 4;
      for (const p of parts) {
        out.set(p, o);
        o += p.length;
      }
      return out;
    },
    load(snap) {
      const bytes = snap as Uint8Array;
      let o = 4;
      for (const t of tables) if ((o = t.load(bytes, o)) < 0) throw new Error('bad snapshot');
      this.tick = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true);
      reindex();
    },
    order: () => tables.flatMap((t, k) => Array.from(t.ids.subarray(0, t.len), (id) => k * 1e7 + id)),
    view,
  };
}
