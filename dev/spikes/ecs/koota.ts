// Option B: koota 0.6.6 behind the determinism wrapper (./koota-det.ts). State is traits (SoA stores); the rules
// walk kinds through the wrapper in id order and write the stores; the view uses koota's own change detection
// (Added / Changed / Removed queries), which is order-free and so may use the library directly.
import { createAdded, createChanged, createRemoved, getStore, trait, type Entity } from 'koota';
import { Sid, createDetWorld } from './koota-det.ts';
import { KindView, pileMatrix, rockMatrix, treeMatrix } from './view.ts';
import {
  CHOP_WORK,
  FALL_TICKS,
  FELL_WORK,
  FNV_SEED,
  LOGS_PER_CHOP,
  PILE_MAX,
  ROCK_STROKES,
  TAKE,
  cellKey,
  cellOf,
  fold,
  type PileRow,
  type RockRow,
  type Slice,
  type TreeRow,
} from './schema.ts';

// ---------------------------------------------------------------- traits
// Age and Settle are split out so ticking them doesn't wake the view: a koota habit (one trait per reason to change).
export const Tree = trait({ x: 0, z: 0, size: 0, work: 0, issued: 0, ceiling: 0, fell: 0 });
export const Age = trait({ age: 0 });
export const Rock = trait({ x: 0, z: 0, r: 0, strokes: 0, shake: 0 });
export const Pile = trait({ i: 0, j: 0, k: 0, n: 0 });
export const Settle = trait({ settle: 0 });
export const Spark = trait({ t: 0 }); // local-only, never hashed

export function createKoota(): Slice {
  const { world, kind } = createDetWorld();
  const trees = kind([
    [Tree, 'x', 'f64'],
    [Tree, 'z', 'f64'],
    [Tree, 'size', 'f64'],
    [Tree, 'work', 'u8'],
    [Tree, 'issued', 'u8'],
    [Tree, 'ceiling', 'u8'],
    [Tree, 'fell', 'u8'],
    [Age, 'age', 'u32'],
  ]);
  const rocks = kind([
    [Rock, 'x', 'f64'],
    [Rock, 'z', 'f64'],
    [Rock, 'r', 'f64'],
    [Rock, 'strokes', 'u8'],
    [Rock, 'shake', 'u8'],
  ]);
  const piles = kind([
    [Pile, 'i', 'i32'],
    [Pile, 'j', 'i32'],
    [Pile, 'k', 'u8'],
    [Pile, 'n', 'u16'],
    [Settle, 'settle', 'u8'],
  ]);
  const kinds = [trees, rocks, piles] as const;
  world.spawn(Sid, Tree, Age, Rock, Pile, Settle).destroy(); // koota registers a trait on first use; getStore needs it
  const T = getStore(world, Tree),
    A = getStore(world, Age),
    R = getStore(world, Rock),
    P = getStore(world, Pile),
    S = getStore(world, Settle);
  const pileAt = new Map<number, number>();
  const reindex = () => {
    pileAt.clear();
    piles.ents.forEach((e, k) => pileAt.set(cellKey(P.i[e.id()]!, P.j[e.id()]!, P.k[e.id()]!), piles.ids[k]!));
  };

  // ---------------------------------------------------------------- rules
  function drop(i: number, j: number, k: number, n: number) {
    const id = pileAt.get(cellKey(i, j, k));
    const e = id === undefined ? undefined : piles.get(id);
    if (e) {
      P.n[e.id()] = Math.min(PILE_MAX, P.n[e.id()]! + n);
      e.changed(Pile);
    } else {
      piles.spawn(Pile({ i, j, k, n: Math.min(PILE_MAX, n) }), Settle({ settle: 0 }));
      pileAt.set(cellKey(i, j, k), piles.ids[piles.ids.length - 1]!);
    }
  }
  function chop(id: number) {
    const e = trees.get(id);
    if (!e) return;
    const t = e.id();
    if (T.fell[t]) return;
    const logs = Math.min(LOGS_PER_CHOP, T.ceiling[t]! - T.issued[t]!);
    T.issued[t]! += logs;
    T.work[t] = Math.min(FELL_WORK, T.work[t]! + CHOP_WORK);
    if (T.work[t]! >= FELL_WORK && T.issued[t] === T.ceiling[t]) {
      T.fell[t] = 1;
      A.age[t] = 0;
    }
    e.changed(Tree);
    if (logs > 0) drop(cellOf(T.x[t]!), cellOf(T.z[t]!), 0, logs);
  }
  function strike(id: number) {
    const e = rocks.get(id);
    if (!e) return;
    const r = e.id();
    R.strokes[r]!++;
    R.shake[r] = 4;
    e.changed(Rock);
    if (R.strokes[r]! >= ROCK_STROKES) {
      const x = R.x[r]!,
        z = R.z[r]!;
      rocks.destroy(id);
      drop(cellOf(x), cellOf(z), 1, 2);
    }
  }
  function take(id: number) {
    const e = piles.get(id);
    if (!e) return;
    const p = e.id();
    P.n[p]! -= Math.min(P.n[p]!, TAKE);
    e.changed(Pile);
    if (P.n[p] === 0) {
      pileAt.delete(cellKey(P.i[p]!, P.j[p]!, P.k[p]!));
      piles.destroy(id);
    }
  }
  const gone: number[] = [];
  function system() {
    gone.length = 0;
    trees.ents.forEach((e, k) => {
      const t = e.id();
      A.age[t]!++;
      if (T.fell[t] && A.age[t]! >= FALL_TICKS) gone.push(trees.ids[k]!);
    });
    for (const id of gone) trees.destroy(id);
    for (const e of rocks.ents) {
      const r = e.id();
      if (R.shake[r]! > 0) {
        R.shake[r]!--;
        e.changed(Rock);
      }
    }
    for (const e of piles.ents) if (S.settle[e.id()]! < 255) S.settle[e.id()]!++;
  }

  // ---------------------------------------------------------------- view
  const Added = createAdded(),
    Changed = createChanged(),
    Removed = createRemoved();
  const views = [new KindView(), new KindView(), new KindView()];
  const row = {} as TreeRow & RockRow & PileRow;
  const draw = [
    (e: Entity) => {
      const t = e.id();
      Object.assign(row, { x: T.x[t], z: T.z[t], size: T.size[t], work: T.work[t], fell: T.fell[t] });
      views[0]!.write(e, treeMatrix(row));
    },
    (e: Entity) => {
      const r = e.id();
      Object.assign(row, { x: R.x[r], z: R.z[r], r: R.r[r], strokes: R.strokes[r], shake: R.shake[r] });
      views[1]!.write(e, rockMatrix(row));
    },
    (e: Entity) => {
      const p = e.id();
      Object.assign(row, { i: P.i[p], j: P.j[p], n: P.n[p] });
      views[2]!.write(e, pileMatrix(row));
    },
  ];
  const traits = [Tree, Rock, Pile] as const;
  const view = {
    sync() {
      traits.forEach((tr, k) => {
        for (const e of world.query(Removed(tr))) views[k]!.remove(e);
        for (const e of world.query(Added(tr))) draw[k]!(e);
        for (const e of world.query(Changed(tr))) if (e.has(tr)) draw[k]!(e);
      });
    },
    rebuild() {
      traits.forEach((tr, k) => {
        world.query(Removed(tr));
        world.query(Added(tr));
        world.query(Changed(tr));
        views[k]!.clear();
        for (const e of kinds[k]!.ents) draw[k]!(e);
      });
    },
  };

  let sparks: Entity[] = [];
  return {
    name: 'B koota + wrapper',
    count: (k) => kinds[k]!.ids.length,
    idAt: (k, n) => kinds[k]!.ids[n]!,
    plantTree: (x, z, size) =>
      void trees.spawn(
        Tree({ x, z, size, work: 0, issued: 0, ceiling: size > 1.1 ? 15 : 10, fell: 0 }),
        Age({ age: 0 }),
      ),
    placeRock: (x, z, r) => void rocks.spawn(Rock({ x, z, r, strokes: 0, shake: 0 })),
    drop,
    chop,
    strike,
    take,
    system,
    tick: 0,
    hash() {
      let h = fold(FNV_SEED, this.tick);
      for (const k of kinds) h = k.hash(h);
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
    order: () => kinds.flatMap((kd, k) => kd.ids.map((id) => k * 1e7 + id)),
    nativeOrder() {
      const sid = getStore(world, Sid).id as number[];
      return traits.flatMap((tr, k) => world.query(tr).map((e) => k * 1e7 + sid[e.id()]!));
    },
    localNoise(n) {
      for (let c = 0; c < n; c++) sparks.push(world.spawn(Spark({ t: c })));
      sparks = sparks.filter((e, c) => (c % 3 === 1 ? (e.destroy(), false) : true));
    },
    view,
    dispose: () => world.destroy(),
  };
}
