// Option D: bitECS 0.4.0 behind the determinism wrapper (./bitecs-det.ts). Components are SoA typed arrays indexed
// by eid, made per world; the rules walk kinds through the wrapper in stamped-id order; the view drains the
// wrapper's change lists (bitECS has no Changed query).
import { addComponent, addEntity, query, removeEntity } from 'bitecs';
import { component, createDetWorld } from './bitecs-det.ts';
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

export function createBitecs(): Slice {
  const { world, kind, Sid, dispose } = createDetWorld();
  // ---------------------------------------------------------------- components (per world)
  const Tree = component({ x: 'f64', z: 'f64', size: 'f64', work: 'u8', issued: 'u8', ceiling: 'u8', fell: 'u8' });
  const Age = component({ age: 'u32' });
  const Rock = component({ x: 'f64', z: 'f64', r: 'f64', strokes: 'u8', shake: 'u8' });
  const Pile = component({ i: 'i32', j: 'i32', k: 'u8', n: 'u16' });
  const Settle = component({ settle: 'u8' });
  const Spark = { t: new Float32Array(1 << 16) }; // local-only, never hashed
  const T = Tree,
    A = Age,
    R = Rock,
    P = Pile,
    S = Settle;
  const trees = kind([
    [T, 'x', 'f64'],
    [T, 'z', 'f64'],
    [T, 'size', 'f64'],
    [T, 'work', 'u8'],
    [T, 'issued', 'u8'],
    [T, 'ceiling', 'u8'],
    [T, 'fell', 'u8'],
    [A, 'age', 'u32'],
  ]);
  const rocks = kind([
    [R, 'x', 'f64'],
    [R, 'z', 'f64'],
    [R, 'r', 'f64'],
    [R, 'strokes', 'u8'],
    [R, 'shake', 'u8'],
  ]);
  const piles = kind([
    [P, 'i', 'i32'],
    [P, 'j', 'i32'],
    [P, 'k', 'u8'],
    [P, 'n', 'u16'],
    [S, 'settle', 'u8'],
  ]);
  const kinds = [trees, rocks, piles] as const;
  const pileAt = new Map<number, number>();
  const reindex = () => {
    pileAt.clear();
    piles.ents.forEach((e, k) => pileAt.set(cellKey(P.i[e]!, P.j[e]!, P.k[e]!), piles.ids[k]!));
  };

  // ---------------------------------------------------------------- rules
  function drop(i: number, j: number, k: number, n: number) {
    const id = pileAt.get(cellKey(i, j, k));
    const p = id === undefined ? undefined : piles.get(id);
    if (p !== undefined) {
      P.n[p] = Math.min(PILE_MAX, P.n[p]! + n);
      piles.touched(p);
    } else {
      piles.spawn([i, j, k, Math.min(PILE_MAX, n), 0]);
      pileAt.set(cellKey(i, j, k), piles.ids[piles.ids.length - 1]!);
    }
  }
  function chop(id: number) {
    const t = trees.get(id);
    if (t === undefined || T.fell[t]) return;
    const logs = Math.min(LOGS_PER_CHOP, T.ceiling[t]! - T.issued[t]!);
    T.issued[t]! += logs;
    T.work[t] = Math.min(FELL_WORK, T.work[t]! + CHOP_WORK);
    if (T.work[t]! >= FELL_WORK && T.issued[t] === T.ceiling[t]) {
      T.fell[t] = 1;
      A.age[t] = 0;
    }
    trees.touched(t);
    if (logs > 0) drop(cellOf(T.x[t]!), cellOf(T.z[t]!), 0, logs);
  }
  function strike(id: number) {
    const r = rocks.get(id);
    if (r === undefined) return;
    R.strokes[r]!++;
    R.shake[r] = 4;
    rocks.touched(r);
    if (R.strokes[r]! >= ROCK_STROKES) {
      const x = R.x[r]!,
        z = R.z[r]!; // read before remove: bitECS reuses the eid at the next spawn
      rocks.remove(id);
      drop(cellOf(x), cellOf(z), 1, 2);
    }
  }
  function take(id: number) {
    const p = piles.get(id);
    if (p === undefined) return;
    P.n[p]! -= Math.min(P.n[p]!, TAKE);
    piles.touched(p);
    if (P.n[p] === 0) {
      pileAt.delete(cellKey(P.i[p]!, P.j[p]!, P.k[p]!));
      piles.remove(id);
    }
  }
  const gone: number[] = [];
  function system() {
    gone.length = 0;
    trees.ents.forEach((t, k) => {
      A.age[t]!++;
      if (T.fell[t] && A.age[t]! >= FALL_TICKS) gone.push(trees.ids[k]!);
    });
    for (const id of gone) trees.remove(id);
    for (const r of rocks.ents)
      if (R.shake[r]! > 0) {
        R.shake[r]!--;
        rocks.touched(r);
      }
    for (const p of piles.ents) if (S.settle[p]! < 255) S.settle[p]!++;
  }

  // ---------------------------------------------------------------- view
  const views = [new KindView(), new KindView(), new KindView()];
  const row = {} as TreeRow & RockRow & PileRow;
  const draw = [
    (t: number) => {
      Object.assign(row, { x: T.x[t], z: T.z[t], size: T.size[t], work: T.work[t], fell: T.fell[t] });
      views[0]!.write(Sid.id[t]!, treeMatrix(row));
    },
    (r: number) => {
      Object.assign(row, { x: R.x[r], z: R.z[r], r: R.r[r], strokes: R.strokes[r], shake: R.shake[r] });
      views[1]!.write(Sid.id[r]!, rockMatrix(row));
    },
    (p: number) => {
      Object.assign(row, { i: P.i[p], j: P.j[p], n: P.n[p] });
      views[2]!.write(Sid.id[p]!, pileMatrix(row));
    },
  ];
  const view = {
    sync() {
      kinds.forEach((kd, k) => {
        const { added, changed, removed } = kd.drain();
        for (const id of removed) views[k]!.remove(id);
        for (const id of [...added, ...changed]) {
          const e = kd.get(id);
          if (e !== undefined) draw[k]!(e);
        }
      });
    },
    rebuild() {
      kinds.forEach((kd, k) => {
        kd.drain();
        views[k]!.clear();
        for (const e of kd.ents) draw[k]!(e);
      });
    },
  };

  let sparks: number[] = [];
  return {
    name: 'D bitECS + wrapper',
    count: (k) => kinds[k]!.ids.length,
    idAt: (k, n) => kinds[k]!.ids[n]!,
    plantTree: (x, z, size) => void trees.spawn([x, z, size, 0, 0, size > 1.1 ? 15 : 10, 0, 0]),
    placeRock: (x, z, r) => void rocks.spawn([x, z, r, 0, 0]),
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
    nativeOrder: () => [Tree, Rock, Pile].flatMap((c, k) => Array.from(query(world, [c]), (e) => k * 1e7 + Sid.id[e]!)),
    localNoise(n) {
      for (let c = 0; c < n; c++) {
        const e = addEntity(world);
        addComponent(world, e, Spark);
        sparks.push(e);
      }
      sparks = sparks.filter((e, c) => (c % 3 === 1 ? (removeEntity(world, e), false) : true));
    },
    view,
    dispose,
  };
}
