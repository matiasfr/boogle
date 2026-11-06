// Option A: the stricter in-house GameEntity. Lockstep state is three declared tables (plain rows in id order); the
// rules are plain functions over them; the view drains each table's changes. In the game, the view would be one
// `place-harvest` kind (defineKind, update phase) and the system would run on the fixed clock's simTick.
import { defineTable } from './table.ts';
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
  type Slice,
} from './schema.ts';

export function createInHouse(): Slice {
  // ---------------------------------------------------------------- state
  const trees = defineTable('trees', TREE);
  const rocks = defineTable('rocks', ROCK);
  const piles = defineTable('piles', PILE);
  const tables = [trees, rocks, piles] as const;
  const pileAt = new Map<number, number>(); // derived: cell and kind -> pile id; rebuilt on load
  const reindex = () => {
    pileAt.clear();
    for (const p of piles.rows) pileAt.set(cellKey(p.i, p.j, p.k), p.id);
  };

  // ---------------------------------------------------------------- rules
  function drop(i: number, j: number, k: number, n: number) {
    const id = pileAt.get(cellKey(i, j, k));
    const p = id === undefined ? undefined : piles.get(id);
    if (p) {
      p.n = Math.min(PILE_MAX, p.n + n);
      piles.touched(p);
    } else pileAt.set(cellKey(i, j, k), piles.insert({ i, j, k, n: Math.min(PILE_MAX, n), settle: 0 }).id);
  }
  function chop(id: number) {
    const t = trees.get(id);
    if (!t || t.fell) return;
    const logs = Math.min(LOGS_PER_CHOP, t.ceiling - t.issued);
    t.issued += logs;
    t.work = Math.min(FELL_WORK, t.work + CHOP_WORK);
    if (t.work >= FELL_WORK && t.issued === t.ceiling) {
      t.fell = 1;
      t.age = 0;
    }
    trees.touched(t);
    if (logs > 0) drop(cellOf(t.x), cellOf(t.z), 0, logs);
  }
  function strike(id: number) {
    const r = rocks.get(id);
    if (!r) return;
    r.strokes++;
    r.shake = 4;
    rocks.touched(r);
    if (r.strokes >= ROCK_STROKES) {
      rocks.remove(r.id);
      drop(cellOf(r.x), cellOf(r.z), 1, 2);
    }
  }
  function take(id: number) {
    const p = piles.get(id);
    if (!p) return;
    p.n -= Math.min(p.n, TAKE);
    piles.touched(p);
    if (p.n === 0) {
      piles.remove(p.id);
      pileAt.delete(cellKey(p.i, p.j, p.k));
    }
  }
  const gone: number[] = [];
  function system() {
    gone.length = 0;
    for (const t of trees.rows) {
      t.age++;
      if (t.fell && t.age >= FALL_TICKS) gone.push(t.id);
    }
    for (const id of gone) trees.remove(id);
    for (const r of rocks.rows)
      if (r.shake > 0) {
        r.shake--;
        rocks.touched(r);
      }
    for (const p of piles.rows) if (p.settle < 255) p.settle++;
  }

  // ---------------------------------------------------------------- view
  const views = [new KindView(), new KindView(), new KindView()];
  const draw = [
    (id: number) => views[0]!.write(id, treeMatrix(trees.get(id)!)),
    (id: number) => views[1]!.write(id, rockMatrix(rocks.get(id)!)),
    (id: number) => views[2]!.write(id, pileMatrix(piles.get(id)!)),
  ];
  const view = {
    sync() {
      tables.forEach((t, k) => {
        const { added, changed, removed } = t.drain();
        for (const id of removed) views[k]!.remove(id);
        for (const id of added) if (t.get(id)) draw[k]!(id);
        for (const id of changed) draw[k]!(id);
      });
    },
    rebuild() {
      tables.forEach((t, k) => {
        t.drain();
        views[k]!.clear();
        for (const r of t.rows) draw[k]!(r.id);
      });
    },
  };

  return {
    name: 'A in-house tables',
    count: (k) => tables[k]!.rows.length,
    idAt: (k, n) => tables[k]!.rows[n]!.id,
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
      return JSON.stringify({
        tick: this.tick,
        trees: trees.serialize(),
        rocks: rocks.serialize(),
        piles: piles.serialize(),
      });
    },
    load(snap) {
      const j = JSON.parse(snap as string) as Record<string, unknown>;
      if (!trees.load(j.trees) || !rocks.load(j.rocks) || !piles.load(j.piles)) throw new Error('bad snapshot');
      this.tick = j.tick as number;
      reindex();
    },
    order: () => tables.flatMap((t, k) => t.rows.map((r) => k * 1e7 + r.id)),
    view,
  };
}
