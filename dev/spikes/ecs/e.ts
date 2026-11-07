// Option E: the real store (src/ecs/, docs/plans/ecs-e.md). The slice's three kinds are E components, every op is a
// system with declared access, and the view drains world.changes(). Local-only churn (localNoise) goes in its own
// world, as E prescribes: a stamped id counter shared with local entities would make ids history-dependent.
import { createWorld, defineComponent, defineSystem, type World } from '../../../src/ecs/index.ts';
import { KindView, pileMatrix, rockMatrix, treeMatrix } from './view.ts';
import {
  CHOP_WORK,
  FALL_TICKS,
  FELL_WORK,
  LOGS_PER_CHOP,
  PILE_MAX,
  ROCK_STROKES,
  TAKE,
  cellKey,
  cellOf,
  type PileRow,
  type RockRow,
  type Slice,
  type TreeRow,
} from './schema.ts';

const Tree = defineComponent('tree', {
  x: 'f64',
  z: 'f64',
  size: 'f64',
  work: 'u8',
  issued: 'u8',
  ceiling: 'u8',
  fell: 'u8',
});
// What the system advances every tick and the view never draws lives in its own component, so a tick does not mark
// the drawn ones changed (the ECS idiom: change detection is per component).
const TreeAge = defineComponent('treeAge', { age: 'u32' }, { track: false });
const Settle = defineComponent('settle', { settle: 'u8' }, { track: false });
const Rock = defineComponent('rock', { x: 'f64', z: 'f64', r: 'f64', strokes: 'u8', shake: 'u8' });
const Pile = defineComponent(
  'pile',
  { cell: 'int', i: 'i32', j: 'i32', k: 'u8', n: 'u16', settle: 'u8' },
  { key: 'cell' },
);
const Tick = defineComponent('tick', { n: 'int' }, { track: false });
const KINDS = [Tree, Rock, Pile] as const;
const ALL = [...KINDS, TreeAge, Settle];

type Drop = { i: number; j: number; k: number; n: number };
function dropInto(w: World, { i, j, k, n }: Drop) {
  const cell = cellKey(i, j, k);
  const id = w.lookup(Pile, cell);
  const p = id === undefined ? undefined : w.mut(Pile, id);
  if (p) p.n = Math.min(PILE_MAX, p.n + n);
  else w.spawn([Pile, { cell, i, j, k, n: Math.min(PILE_MAX, n) }], [Settle, {}]);
}
const drop = defineSystem('drop', { writes: [Pile, Settle], phase: 'op', order: 0 }, dropInto);
const chop = defineSystem('chop', { writes: [Tree, TreeAge, Pile, Settle], phase: 'op', order: 1 }, (w, id: number) => {
  const t = w.mut(Tree, id);
  if (!t || t.fell) return;
  const logs = Math.min(LOGS_PER_CHOP, t.ceiling - t.issued);
  t.issued += logs;
  t.work = Math.min(FELL_WORK, t.work + CHOP_WORK);
  if (t.work >= FELL_WORK && t.issued === t.ceiling) {
    t.fell = 1;
    w.mut(TreeAge, id)!.age = 0;
  }
  if (logs > 0) dropInto(w, { i: cellOf(t.x), j: cellOf(t.z), k: 0, n: logs });
});
const strike = defineSystem('strike', { writes: [Rock, Pile, Settle], phase: 'op', order: 2 }, (w, id: number) => {
  const r = w.mut(Rock, id);
  if (!r) return;
  r.strokes++;
  r.shake = 4;
  if (r.strokes >= ROCK_STROKES) {
    w.despawn(id);
    dropInto(w, { i: cellOf(r.x), j: cellOf(r.z), k: 1, n: 2 });
  }
});
const take = defineSystem('take', { writes: [Pile, Settle], phase: 'op', order: 3 }, (w, id: number) => {
  const p = w.mut(Pile, id);
  if (!p) return;
  p.n -= Math.min(p.n, TAKE);
  if (p.n === 0) w.despawn(id);
});
const plant = defineSystem(
  'plant',
  { writes: [Tree, TreeAge], phase: 'op', order: 4 },
  (w, t: [number, number, number]) => {
    w.spawn([Tree, { x: t[0], z: t[1], size: t[2], ceiling: t[2] > 1.1 ? 15 : 10 }], [TreeAge, {}]);
  },
);
const place = defineSystem('place', { writes: [Rock], phase: 'op', order: 5 }, (w, r: [number, number, number]) => {
  w.spawn([Rock, { x: r[0], z: r[1], r: r[2] }]);
});
// The fixed-clock system: ages every tree, removes fallen trunks, settles shakes and piles.
const system = defineSystem('system', { writes: [Tree, TreeAge, Rock, Settle], phase: 'tick', order: 0 }, (w) => {
  w.each(
    [Tree, TreeAge],
    (id, t, age) => {
      age.age++;
      if (t.fell && age.age >= FALL_TICKS) w.despawn(id);
    },
    [TreeAge],
  );
  w.each([Rock], (id, r) => {
    if (r.shake > 0) w.mut(Rock, id)!.shake--;
  });
  w.each(
    [Settle],
    (_id, p) => {
      if (p.settle < 255) p.settle++;
    },
    [Settle],
  );
});

export function createE(): Slice {
  let w = createWorld([...ALL, Tick]);
  const local = createWorld([Tree]);
  w.spawn([Tick, { n: 0 }]);
  const tickId = () => w.single(Tick);
  const views = [new KindView(), new KindView(), new KindView()];
  const draw = (k: number, id: number) => {
    const c = KINDS[k]!;
    const row = w.get(c, id);
    if (!row) return views[k]!.remove(id);
    views[k]!.write(
      id,
      k === 0
        ? treeMatrix(row as unknown as TreeRow)
        : k === 1
          ? rockMatrix(row as unknown as RockRow)
          : pileMatrix(row as unknown as PileRow),
    );
  };
  return {
    name: 'E store (src/ecs)',
    count: (k) => w.count(KINDS[k]!),
    idAt: (k, n) => w.ids(KINDS[k]!)[n]!,
    plantTree: (x, z, size) => w.run(plant, [x, z, size]),
    placeRock: (x, z, r) => w.run(place, [x, z, r]),
    drop: (i, j, k, n) => w.run(drop, { i, j, k, n }),
    chop: (id) => w.run(chop, id),
    strike: (id) => w.run(strike, id),
    take: (id) => w.run(take, id),
    system: () => w.run(system, undefined),
    get tick() {
      return w.get(Tick, tickId())!.n;
    },
    set tick(n: number) {
      w.mut(Tick, tickId())!.n = n;
    },
    hash: () => w.hash(),
    snapshot: () => JSON.stringify(w.snapshot()),
    load(snap) {
      const next = createWorld([...ALL, Tick]);
      next.load(JSON.parse(snap as string));
      w = next;
    },
    order: () => KINDS.flatMap((c, k) => w.ids(c).map((id) => k * 1e7 + id)),
    localNoise(n) {
      for (let k = 0; k < n; k++) local.spawn([Tree, { x: k }]);
      for (const id of [...local.ids(Tree)]) local.despawn(id);
    },
    view: {
      sync() {
        KINDS.forEach((c, k) => {
          for (const id of w.changes(c)) draw(k, id);
        });
      },
      rebuild() {
        for (const c of KINDS) w.changes(c);
        views.forEach((v) => v.clear());
        KINDS.forEach((c, k) => {
          for (const id of w.ids(c)) draw(k, id);
        });
      },
    },
  };
}
